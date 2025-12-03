// src/screens/TimerScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AppState,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ['Ders', 'Kodlama', 'Proje', 'Kitap'];

export default function TimerScreen() {
  // Süreyi saniye cinsinden tutalım (default: 25 dakika)
  const [sessionDuration, setSessionDuration] = useState(25 * 60);
  const [remainingTime, setRemainingTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // AppState ile takip edeceğimiz dikkat dağınıklığı sayısı
  const [distractionCount, setDistractionCount] = useState(0);

  // AppState durumunu takip etmek için
  const appState = useRef(AppState.currentState);

  // Bu seans sırasında hiç çalıştı mı? (Kaydetmek için)
  const [hasSessionRun, setHasSessionRun] = useState(false);

  // -------------------------
  // SEANSI KAYDETME (AsyncStorage)
  // -------------------------
  const saveSession = async (reason = 'finished') => {
    try {
      // Hiç çalışmamışsa kaydetmeye gerek yok
      if (!hasSessionRun) return;
      if (!selectedCategory) return;

      const elapsedSeconds = sessionDuration - remainingTime;
      if (elapsedSeconds <= 0) return;

      const now = new Date();
      const iso = now.toISOString();
      const dateOnly = iso.split('T')[0]; // "2025-01-05" gibi

      const newSession = {
        id: Date.now().toString(),
        date: dateOnly,
        endTime: iso,
        category: selectedCategory,
        targetSeconds: sessionDuration,
        actualSeconds: elapsedSeconds,
        distractionCount,
        endReason: reason, // 'finished' veya 'reset'
      };

      const existingJson = await AsyncStorage.getItem('sessions');
      const existingData = existingJson ? JSON.parse(existingJson) : [];
      const existingSessions = Array.isArray(existingData) ? existingData : [];

      const updatedSessions = [...existingSessions, newSession];

      await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));

      console.log('Seans kaydedildi:', newSession);
    } catch (error) {
      console.log('Seans kaydedilirken hata:', error);
    }
  };

  // -------------------------
  // GERÇEK TIMER MANTIĞI
  // -------------------------
  useEffect(() => {
    let interval = null;

    if (isRunning) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            // Süre bitti → seansı kaydet
            saveSession('finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // -------------------------
  // APPSTATE İLE DİKKAT DAĞINIKLIĞI TAKİBİ
  // -------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const prevState = appState.current;
      appState.current = nextState;

      // Timer çalışmıyorsa ilgilenmiyoruz
      if (!isRunning) return;

      // Uygulama aktiften arka plana/inactive'e geçiyorsa = dikkat dağınıklığı
      if (
        prevState === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        setDistractionCount(prev => prev + 1); // bir kez dağınıklık say
        setIsRunning(false);                   // sayacı durdur
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // 00:00 formatı için
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleChangeDuration = (deltaMinutes) => {
    if (isRunning) return; // Çalışırken süre değiştirmeyelim

    const newSeconds = sessionDuration + deltaMinutes * 60;
    // Minimum 5 dakika, maksimum 120 dakika
    if (newSeconds < 5 * 60 || newSeconds > 120 * 60) return;

    setSessionDuration(newSeconds);
    setRemainingTime(newSeconds);
    setHasSessionRun(false);
    setDistractionCount(0);
  };

  const handleStart = () => {
    if (!selectedCategory) {
      Alert.alert('Kategori seçilmedi', 'Lütfen önce bir kategori seç.');
      return;
    }

    if (remainingTime === 0) {
      setRemainingTime(sessionDuration);
    }

    setHasSessionRun(true);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = async () => {
    // Eğer seans gerçekten başlamışsa, önce kaydet
    await saveSession('reset');

    setIsRunning(false);
    setRemainingTime(sessionDuration);
    setDistractionCount(0);
    setHasSessionRun(false);
  };

  const currentMinutes = Math.floor(sessionDuration / 60);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* EKRAN İÇİ BAŞLIK */}
        <Text style={styles.title}>Odaklanma Zamanlayıcısı</Text>

        {/* Kategori Seçimi */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kategori Seç</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat && styles.categoryButtonSelected,
                ]}
                onPress={() => setSelectedCategory(cat)}
                disabled={isRunning} // çalışırken kategori değişmesin
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat && styles.categoryTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Timer Kartı */}
        <View style={[styles.card, styles.timerCard]}>
          <View style={styles.timerContainer}>
            <View style={styles.timerOuterCircle}>
              <View style={styles.timerInnerCircle}>
                <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
                <Text style={styles.timerSubText}>
                  Hedef: {currentMinutes} dk
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Süre Ayarlama */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Süre Ayarla (dakika)</Text>
          <View style={styles.durationControls}>
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => handleChangeDuration(-5)}
              disabled={isRunning}
            >
              <Text style={styles.durationButtonText}>- 5</Text>
            </TouchableOpacity>

            <Text style={styles.durationLabel}>
              {currentMinutes} dk
            </Text>

            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => handleChangeDuration(5)}
              disabled={isRunning}
            >
              <Text style={styles.durationButtonText}>+ 5</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kontrol Butonları */}
        <View style={styles.card}>
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.startButton,
                isRunning && styles.controlButtonDisabled,
              ]}
              onPress={handleStart}
              disabled={isRunning}
            >
              <Text style={styles.controlButtonText}>
                {isRunning ? 'Devam ediyor' : 'Başlat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.pauseButton,
                !isRunning && styles.controlButtonDisabled,
              ]}
              onPress={handlePause}
              disabled={!isRunning}
            >
              <Text style={styles.controlButtonText}>Duraklat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={styles.controlButtonText}>Sıfırla</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seans Özeti Kartı */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Seans Özeti</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kategori</Text>
            <Text style={styles.summaryValue}>
              {selectedCategory ? selectedCategory : 'Seçilmedi'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dikkat Dağınıklığı</Text>
            <Text
              style={[
                styles.summaryValue,
                distractionCount === 0
                  ? styles.summaryValueGood
                  : styles.summaryValueWarning,
              ]}
            >
              {distractionCount === 0
                ? '🎯 Hiç dağılmadın'
                : `${distractionCount} kez`}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Safe Area
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // iPhone üst kısmı da koyu olsun
  },

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

  // Ekran başlığı
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

  // Başlıklar
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#e5e7eb',
  },

  // Kategori
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  categoryButtonSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  categoryText: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  categoryTextSelected: {
    color: '#f9fafb',
    fontWeight: '600',
  },

  // Timer
  timerCard: {
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timerOuterCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 8,
    borderColor: 'rgba(79, 70, 229, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerInnerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  timerText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#e5e7eb',
  },
  timerSubText: {
    marginTop: 4,
    fontSize: 13,
    color: '#9ca3af',
  },

  // Süre Ayarlama
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    marginHorizontal: 10,
    backgroundColor: '#020617',
  },
  durationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  durationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
  },

  // Kontrol Butonları
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#22c55e',
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
  },
  resetButton: {
    backgroundColor: '#ef4444',
  },
  controlButtonDisabled: {
    opacity: 0.6,
  },
  controlButtonText: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: 14,
  },

  // Seans Özeti
  summaryCard: {
    marginTop: 6,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    color: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  summaryValueGood: {
    color: '#22c55e',
  },
  summaryValueWarning: {
    color: '#f97316',
  },
});
