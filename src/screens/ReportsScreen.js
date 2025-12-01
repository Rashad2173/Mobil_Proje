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

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
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

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const json = await AsyncStorage.getItem('sessions');
        const data = json ? JSON.parse(json) : [];
        setSessions(data);
        calculateStats(data);
      } catch (error) {
        console.log('Seanslar okunurken hata:', error);
      }
    };

    loadSessions();
  }, []);

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
      const actual = session.actualSeconds || 0;
      const dCount = session.distractionCount || 0;

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
          daySeconds += session.actualSeconds || 0;
          dayDistractions += session.distractionCount || 0;
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
            {formatDuration(item.actualSeconds || 0)}
          </Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>Dikkat dağınıklığı:</Text>
          <Text style={styles.sessionValue}>
            {item.distractionCount || 0}
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
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    barPercentage: 0.6,
  };

  const periodTitlePrefix =
    period === 'weekly' ? 'Son 7 Gün' : 'Son 30 Gün';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Raporlar</Text>

      {/* Genel İstatistikler */}
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

      {/* Haftalık / Aylık Seçim */}
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

      {/* Grafikler */}
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

      {/* Seans Listesi */}
      <Text style={styles.sectionTitle}>Kayıtlı Seanslar</Text>
      {sessions.length === 0 ? (
        <Text style={styles.emptyText}>
          Henüz kayıtlı seans yok. Önce bir odaklanma seansı başlat.
        </Text>
      ) : (
        <FlatList
          data={sessions.slice().reverse()} // en son seans en üstte
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
  },
  toggleButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  toggleText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  sessionItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
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
  },
  sessionCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4f46e5',
  },
  sessionLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  sessionValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 8,
    marginBottom: 8,
  },
});
