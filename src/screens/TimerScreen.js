// src/screens/TimerScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // GÜN 6: SEANSI KAYDETME (AsyncStorage)
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
      const existingSessions = existingJson ? JSON.parse(existingJson) : [];

      const updatedSessions = [...existingSessions, newSession];

      await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));

      console.log('Seans kaydedildi:', newSession);
    } catch (error) {
      console.log('Seans kaydedilirken hata:', error);
    }
  };

  // -------------------------
  // GÜN 4: GERÇEK TIMER MANTIĞI
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
  }, [isRunning]); // saveSession fonksiyonu closure ile son değerleri görebilir

  // -------------------------
  // GÜN 5: APPSTATE İLE DİKKAT DAĞINIKLIĞI TAKİBİ
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
        setDistractionCount(prev => prev + 1); // bir kez dahağınıklık say
        setIsRunning(false);                    // sayacı durdur
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Odaklanma Zamanlayıcısı</Text>

      {/* Kategori Seçimi */}
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
            disabled={isRunning}
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

      {/* Süre Gösterimi */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
      </View>

      {/* Süre Ayarlama */}
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
          {Math.floor(sessionDuration / 60)} dk
        </Text>

        <TouchableOpacity
          style={styles.durationButton}
          onPress={() => handleChangeDuration(5)}
          disabled={isRunning}
        >
          <Text style={styles.durationButtonText}>+ 5</Text>
        </TouchableOpacity>
      </View>

      {/* Kontrol Butonları */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, styles.startButton]}
          onPress={handleStart}
        >
          <Text style={styles.controlButtonText}>
            {isRunning ? 'Devam ediyor' : 'Başlat'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.pauseButton]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  categoryText: {
    fontSize: 14,
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4b5563',
    marginHorizontal: 12,
  },
  durationButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#16a34a',
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
  },
  resetButton: {
    backgroundColor: '#ef4444',
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValueGood: {
    color: '#16a34a',
  },
  summaryValueWarning: {
    color: '#dc2626',
  },
});
