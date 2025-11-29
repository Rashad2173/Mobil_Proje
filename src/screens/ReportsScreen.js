// src/screens/ReportsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ReportsScreen() {
  const [sessions, setSessions] = useState([]);
  const [todayTotalSeconds, setTodayTotalSeconds] = useState(0);
  const [allTimeTotalSeconds, setAllTimeTotalSeconds] = useState(0);
  const [totalDistractions, setTotalDistractions] = useState(0);

  // Ekran açıldığında seansları yükle
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
          <Text style={styles.sessionLabel}>
            Süre:
          </Text>
          <Text style={styles.sessionValue}>
            {formatDuration(item.actualSeconds || 0)}
          </Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>
            Dikkat dağınıklığı:
          </Text>
          <Text style={styles.sessionValue}>
            {item.distractionCount || 0}
          </Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionLabel}>
            Bitiş sebebi:
          </Text>
          <Text style={styles.sessionValue}>
            {item.endReason === 'reset' ? 'Manuel bitirildi' : 'Süre doldu'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
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
});
