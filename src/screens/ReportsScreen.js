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
import { BarChart } from 'react-native-chart-kit';
import { useIsFocused } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
  const isFocused = useIsFocused(); // ekran o an aktif mi?

  const [sessions, setSessions] = useState([]);
  const [todayTotalSeconds, setTodayTotalSeconds] = useState(0);
  const [allTimeTotalSeconds, setAllTimeTotalSeconds] = useState(0);
  const [totalDistractions, setTotalDistractions] = useState(0);

  // Haftalık / Aylık seçim
  const [period, setPeriod] = useState('weekly'); // 'weekly' | 'monthly'

  // Grafik verisi
  const [chartLabels, setChartLabels] = useState([]);
  const [chartFocusMinutes, setChartFocusMinutes] = useState([]);
  const [chartDistractions, setChartDistractions] = useState([]);

  // Ekran odaklandığında seansları yeniden yükle
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const json = await AsyncStorage.getItem('sessions');
        const data = json ? JSON.parse(json) : [];

        const safeData = Array.isArray(data) ? data : [];
        setSessions(safeData);
        calculateStats(safeData);
      } catch (error) {
        console.log('Seanslar okunurken hata:', error);
      }
    };

    if (isFocused) {
      loadSessions();
    }
  }, [isFocused]);

  // period veya sessions değişince grafiği yeniden hazırla
  useEffect(() => {
    prepareCharts(sessions, period);
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

  // Haftalık (7 gün) veya Aylık (30 gün) grafik verisi
  const prepareCharts = (data, mode) => {
    if (!Array.isArray(data)) return;

    const today = new Date();
    const days = [];

    // weekly -> son 7 gün, monthly -> son 30 gün
    const range = mode === 'weekly' ? 6 : 29;

    for (let i = range; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split('T')[0]; // "2025-01-05"
      const label = `${d.getDate()}.${d.getMonth() + 1}`; // "5.1" gibi
      days.push({ iso, label });
    }

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

      focusArr.push(Math.round(daySeconds / 60)); // dakikaya çevir
      distractionArr.push(dayDistractions);
    });

    setChartLabels(days.map(d => d.label));
    setChartFocusMinutes(focusArr);
    setChartDistractions(distractionArr);
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
    return (
      <View style={styles.sessionItem}>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionDate}>{item.date}</Text>
          <Text style={styles.sessionCategory}>{item.category}</Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Süre:</Text>
          <Text style={styles.sessionValue}>
            {formatDuration(Number(item.actualSeconds) || 0)}
          </Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Dikkat dağınıklığı:</Text>
          <Text style={styles.sessionValue}>
            {Number(item.distractionCount) || 0}
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

  return (
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
        <Text style={styles.cardTitle}>Zaman Aralığı</Text>
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
        <BarChart
          data={{
            labels: chartLabels,
            datasets: [
              {
                data: chartFocusMinutes,
              },
            ],
          }}
          width={screenWidth - 32}
          height={220}
          fromZero
          yAxisLabel=""
          yAxisSuffix=" dk"
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </View>

      {/* Dikkat Dağınıklığı Grafiği */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {periodTitlePrefix} – Dikkat Dağınıklığı
        </Text>
        <BarChart
          data={{
            labels: chartLabels,
            datasets: [
              {
                data: chartDistractions,
              },
            ],
          }}
          width={screenWidth - 32}
          height={220}
          fromZero
          yAxisLabel=""
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
          }}
          style={styles.chart}
        />
      </View>

      {/* Seans Listesi */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Kayıtlı Seanslar</Text>
        {safeSessionsArray.length === 0 ? (
          <Text style={styles.emptyText}>
            Henüz kayıtlı seans yok. Önce bir odaklanma seansı başlat.
          </Text>
        ) : (
          <FlatList
            data={safeSessionsArray.slice().reverse()} // en son seans en üstte
            keyExtractor={(item) => item.id}
            renderItem={renderSessionItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Genel
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

  // Kart
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

  // Genel istatistikler
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

  // Toggle
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

  // Başlıklar
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

  // Seans item
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

  // Grafik
  chart: {
    borderRadius: 12,
    marginBottom: 4,
  },
});
