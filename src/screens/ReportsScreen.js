// src/screens/ReportsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

// TimerScreen'deki kategorilerle uyumlu olsun:
const CATEGORIES = ['Ders', 'Kodlama', 'Proje', 'Kitap'];

export default function ReportsScreen() {
  const isFocused = useIsFocused();

  const [sessions, setSessions] = useState([]);
  const [todayTotalSeconds, setTodayTotalSeconds] = useState(0);
  const [allTimeTotalSeconds, setAllTimeTotalSeconds] = useState(0);
  const [totalDistractions, setTotalDistractions] = useState(0);

  const [period, setPeriod] = useState('weekly');
  const [sessionFilter, setSessionFilter] = useState('Tümü');

  const [chartLabels, setChartLabels] = useState([]);
  const [chartFocusMinutes, setChartFocusMinutes] = useState([]);
  const [chartDistractions, setChartDistractions] = useState([]);

  const [categoryPieData, setCategoryPieData] = useState([]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const json = await AsyncStorage.getItem('sessions');
        const data = json ? JSON.parse(json) : [];

        const safeData = Array.isArray(data) ? data : [];
        setSessions(safeData);
        calculateStats(safeData);
        prepareCategoryPie(safeData, period);
      } catch (error) {
        console.log('Seanslar okunurken hata:', error);
      }
    };

    if (isFocused) {
      loadSessions();
    }
  }, [isFocused, period]);

  useEffect(() => {
    prepareCharts(sessions, period);
    prepareCategoryPie(sessions, period);
  }, [sessions, period]);

  const calculateStats = (data) => {
    if (!Array.isArray(data)) return;

    const todayStr = new Date().toISOString().split('T')[0];

    let todaySeconds = 0;
    let allSeconds = 0;
    let distractions = 0;

    data.forEach(session => {
      const actual = Number(session.actualSeconds) || 0;
      const dCount = Number(session.distractionCount) || 0;

      allSeconds += actual;
      distractions += dCount;

      if (session.date === todayStr) {
        todaySeconds += actual;
      }
    });

    setTodayTotalSeconds(todaySeconds);
    setAllTimeTotalSeconds(allSeconds);
    setTotalDistractions(distractions);
  };

  const getAllowedDays = (mode) => {
  // TimerScreen ile TAM AYNI mantık: önce bugünün ISO tarih string'i
  const todayIso = new Date().toISOString().split('T')[0]; // "2025-12-04"

  const [year, month, day] = todayIso.split('-').map((n) => parseInt(n, 10));

  // Bu tarihi baz alarak UTC günü üzerinden geri gideceğiz
  const todayUtc = new Date(Date.UTC(year, month - 1, day)); // 00:00 UTC

  const days = [];
  const range = mode === 'weekly' ? 6 : 29; // 7 veya 30 gün

  for (let i = range; i >= 0; i--) {
    const d = new Date(todayUtc);
    d.setUTCDate(todayUtc.getUTCDate() - i);

    const iso = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const label = `${d.getUTCDate()}.${d.getUTCMonth() + 1}`; // "5.1" gibi

    days.push({ iso, label });
  }

  return days;
};

  const prepareCharts = (data, mode) => {
    if (!Array.isArray(data)) return;

    const days = getAllowedDays(mode);
    const focusArr = [];
    const distractionArr = [];

    days.forEach(day => {
      let daySeconds = 0;
      let dayDistractions = 0;

      data.forEach(session => {
        if (session.date === day.iso) {
          const actual = Number(session.actualSeconds) || 0;
          const dCount = Number(session.distractionCount) || 0;

          daySeconds += actual;
          dayDistractions += dCount;
        }
      });

      focusArr.push(Math.round(daySeconds / 60));
      distractionArr.push(dayDistractions);
    });

    setChartLabels(days.map(d => d.label));
    setChartFocusMinutes(focusArr);
    setChartDistractions(distractionArr);
  };

  // 🔹 DÜZELTME: Pie Chart için kategoriye göre toplam odak süresi
  const prepareCategoryPie = (data, mode) => {
    if (!Array.isArray(data)) {
      setCategoryPieData([]);
      return;
    }

    const days = getAllowedDays(mode);
    const allowedIsoSet = new Set(days.map(d => d.iso));

    // Her kategori için toplam süreyi hesapla
    const categoryTotals = {};
    
    CATEGORIES.forEach(cat => {
      categoryTotals[cat] = 0;
    });

    data.forEach(session => {
      // Kategori kontrolü
      if (!session.category || !CATEGORIES.includes(session.category)) {
        return;
      }
      
      // Tarih kontrolü
      if (!session.date || !allowedIsoSet.has(session.date)) {
        return;
      }

      const actualSeconds = Number(session.actualSeconds) || 0;
      categoryTotals[session.category] += actualSeconds;
    });

    // Sıfır olmayanları filtrele ve pie data formatına çevir
    const colors = ['#4f46e5', '#22c55e', '#eab308', '#ec4899', '#0ea5e9'];
    
    const pieData = CATEGORIES
      .map((cat, index) => ({
        name: cat,
        population: Math.round(categoryTotals[cat] / 60), // dakikaya çevir
        color: colors[index % colors.length],
        legendFontColor: '#e5e7eb',
        legendFontSize: 13,
      }))
      .filter(item => item.population > 0); // Sadece 0'dan büyük olanları al

    // Debug için
    console.log('📊 Pie Chart Data:', pieData);
    console.log('📊 Category Totals:', categoryTotals);

    setCategoryPieData(pieData);
  };

  const formatDuration = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours} sa ${remainingMinutes} dk`;
    }
    return `${minutes} dk`;
  };

  const renderSessionItem = ({ item }) => {
    const targetSeconds = Number(item.targetSeconds) || 0;
    const actualSeconds = Number(item.actualSeconds) || 0;
    const distraction = Number(item.distractionCount) || 0;

    const targetMinutes = Math.round(targetSeconds / 60);
    const actualMinutes = Math.round(actualSeconds / 60);

    let completionRate = 0;
    if (targetSeconds > 0) {
      completionRate = Math.round((actualSeconds / targetSeconds) * 100);
      if (completionRate > 999) completionRate = 999;
    }

    const reachedTarget = targetSeconds > 0 && actualSeconds >= targetSeconds;

    return (
      <View style={styles.sessionItem}>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionDate}>{item.date}</Text>
          <Text style={styles.sessionCategory}>{item.category}</Text>
        </View>

        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Hedef Süre:</Text>
          <Text style={styles.sessionValue}>
            {targetMinutes > 0 ? `${targetMinutes} dk` : '-'}
          </Text>
        </View>

        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Gerçek Odak Süresi:</Text>
          <Text style={styles.sessionValue}>
            {`${actualMinutes} dk`}
          </Text>
        </View>

        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Tamamlama Oranı:</Text>
          <Text style={styles.sessionValue}>
            {targetSeconds > 0 ? `%${completionRate}` : '-'}
          </Text>
        </View>

        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Hedef Durumu:</Text>
          <Text
            style={[
              styles.sessionValue,
              reachedTarget ? styles.sessionValueGood : styles.sessionValueWarning,
            ]}
          >
            {reachedTarget ? 'Hedefe ulaştın ✅' : 'Hedefe ulaşamadın ❌'}
          </Text>
        </View>

        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Dikkat dağınıklığı:</Text>
          <Text style={styles.sessionValue}>
            {distraction}
          </Text>
        </View>

        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Bitiş sebebi:</Text>
          <Text style={styles.sessionValue}>
            {item.endReason === 'reset' ? 'Manuel bitirildi' : 'Süre doldu'}
          </Text>
        </View>
      </View>
    );
  };

  const chartConfig = {
    backgroundGradientFrom: '#020617',
    backgroundGradientTo: '#020617',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(229, 231, 235, ${opacity})`,
    barPercentage: 0.6,
    propsForBackgroundLines: {
      stroke: 'rgba(148, 163, 184, 0.3)',
    },
  };

  const periodTitlePrefix =
    period === 'weekly' ? 'Son 7 Gün' : 'Son 30 Gün';

  const safeSessionsArray = Array.isArray(sessions) ? sessions : [];

  const baseChartWidth = screenWidth - 32;
  const dynamicChartWidth = Math.max(baseChartWidth, chartLabels.length * 40);

  const filteredSessions = safeSessionsArray.filter(session => {
    if (sessionFilter === 'Tümü') return true;
    return session.category === sessionFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Raporlar</Text>

        {/* Genel İstatistikler */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Genel İstatistikler</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Bugün Toplam Süre</Text>
              <Text style={styles.statValue}>
                {formatDuration(todayTotalSeconds)}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tüm Zamanlar</Text>
              <Text style={styles.statValue}>
                {formatDuration(allTimeTotalSeconds)}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Toplam Dikkat Dağınıklığı</Text>
              <Text style={styles.statValue}>{totalDistractions}</Text>
            </View>
          </View>
        </View>

        {/* Haftalık / Aylık Seçim */}
        <View style={[styles.card, styles.toggleCard]}>
          <Text style={styles.cardTitle}>Zaman Aralığı (Grafikler)</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                period === 'weekly' && styles.toggleButtonActive,
              ]}
              onPress={() => setPeriod('weekly')}
            >
              <Text
                style={[
                  styles.toggleText,
                  period === 'weekly' && styles.toggleTextActive,
                ]}
              >
                Haftalık
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                period === 'monthly' && styles.toggleButtonActive,
              ]}
              onPress={() => setPeriod('monthly')}
            >
              <Text
                style={[
                  styles.toggleText,
                  period === 'monthly' && styles.toggleTextActive,
                ]}
              >
                Aylık
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Odaklanma Süresi Grafiği */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {periodTitlePrefix} – Odaklanma Süresi (dk)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <BarChart
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    data: chartFocusMinutes,
                  },
                ],
              }}
              width={dynamicChartWidth}
              height={220}
              fromZero
              yAxisLabel=""
              yAxisSuffix=" dk"
              verticalLabelRotation={45}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          </ScrollView>
        </View>

        {/* Dikkat Dağınıklığı Grafiği */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {periodTitlePrefix} – Dikkat Dağınıklığı
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <BarChart
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    data: chartDistractions,
                  },
                ],
              }}
              width={dynamicChartWidth}
              height={220}
              fromZero
              yAxisLabel=""
              verticalLabelRotation={45}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
              }}
              style={styles.chart}
            />
          </ScrollView>
        </View>

        {/* Kategoriye Göre Odaklanma – Pie Chart */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Kategoriye Göre Odaklanma ({periodTitlePrefix})
          </Text>
          {categoryPieData.length === 0 ? (
            <Text style={styles.emptyText}>
              Bu zaman aralığında kategori bazlı gösterilecek veri yok.
            </Text>
          ) : (
            <View>
              <PieChart
                data={categoryPieData}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 0]}
                hasLegend={true}
              />
              {/* Debug bilgisi (isteğe bağlı) */}
              <View style={styles.debugContainer}>
                {categoryPieData.map((item, index) => (
                  <Text key={index} style={styles.debugText}>
                    {item.name}: {item.population} dk
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Seans Listesi + Filtre */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kayıtlı Seanslar</Text>

          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  sessionFilter === 'Tümü' && styles.filterButtonActive,
                ]}
                onPress={() => setSessionFilter('Tümü')}
              >
                <Text
                  style={[
                    styles.filterText,
                    sessionFilter === 'Tümü' && styles.filterTextActive,
                  ]}
                >
                  Tümü
                </Text>
              </TouchableOpacity>

              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterButton,
                    sessionFilter === cat && styles.filterButtonActive,
                  ]}
                  onPress={() => setSessionFilter(cat)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      sessionFilter === cat && styles.filterTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {filteredSessions.length === 0 ? (
            <Text style={styles.emptyText}>
              Bu filtreye uygun kayıtlı seans yok.
            </Text>
          ) : (
            <FlatList
              data={filteredSessions.slice().reverse()}
              keyExtractor={(item) => item.id}
              renderItem={renderSessionItem}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    color: '#e5e7eb',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#e5e7eb',
  },
  statsContainer: {
    marginTop: 4,
  },
  statCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31, 41, 55, 0.8)',
  },
  statLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    color: '#e5e7eb',
  },
  toggleCard: {
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#020617',
    marginHorizontal: 4,
  },
  toggleButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  toggleText: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#f9fafb',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#e5e7eb',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  listContent: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  sessionItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.9)',
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  sessionCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4f46e5',
  },
  sessionLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  sessionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  sessionValueGood: {
    color: '#22c55e',
  },
  sessionValueWarning: {
    color: '#f97316',
  },
  chart: {
    borderRadius: 12,
    marginBottom: 4,
  },
  filterContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#020617',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  filterText: {
    fontSize: 13,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#f9fafb',
  },
  debugContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
});