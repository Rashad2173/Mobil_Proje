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
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

const DEFAULT_CATEGORIES = ['Ders', 'Kodlama', 'Proje', 'Kitap'];

export default function TimerScreen() {
  const isFocused = useIsFocused();

  // Kategoriler
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [addCategoryVisible, setAddCategoryVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Süre
  const [sessionDuration, setSessionDuration] = useState(25 * 60);
  const [remainingTime, setRemainingTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Dikkat dağınıklığı
  const [distractionCount, setDistractionCount] = useState(0);
  const appState = useRef(AppState.currentState);

  // Seans bilgisi
  const [hasSessionRun, setHasSessionRun] = useState(false);

  // Görevler
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Modallar
  const [taskSelectVisible, setTaskSelectVisible] = useState(false);
  const [taskCompleteVisible, setTaskCompleteVisible] = useState(false);

  // ------------------------------------------------
  // Kategorileri yükle
  // ------------------------------------------------
  const loadCategories = async () => {
    try {
      const json = await AsyncStorage.getItem('categories');
      if (json) {
        const data = JSON.parse(json);
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch (e) {
      console.log('Kategoriler yüklenirken hata:', e);
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  const saveCategories = async (cats) => {
    try {
      await AsyncStorage.setItem('categories', JSON.stringify(cats));
    } catch (e) {
      console.log('Kategoriler kaydedilirken hata:', e);
    }
  };

  // Yeni kategori ekle
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert('Hata', 'Kategori adı boş olamaz.');
      return;
    }
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Hata', 'Bu kategori zaten mevcut.');
      return;
    }

    const updatedCategories = [...categories, trimmed];
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
    setNewCategoryName('');
    setAddCategoryVisible(false);
    Alert.alert('Başarılı', `"${trimmed}" kategorisi eklendi.`);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // ------------------------------------------------
  // Görevleri yükle
  // ------------------------------------------------
  const loadTasks = async () => {
    try {
      const json = await AsyncStorage.getItem('tasks');
      const data = json ? JSON.parse(json) : [];
      const safeData = Array.isArray(data) ? data : [];
      const activeTasks = safeData.filter(t => !t.completed);
      setTasks(activeTasks);
    } catch (e) {
      console.log('Görevler okunurken hata:', e);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadTasks();
    }
  }, [isFocused]);

  // ------------------------------------------------
  // SEANSI KAYDETME
  // forcedActualSeconds: dışarıdan "gerçek odak saniyesi" gönderirsek onu kullanır
  // yoksa sessionDuration - remainingTime üzerinden hesaplar
  // ------------------------------------------------
  const saveSession = async (reason = 'finished', forcedActualSeconds = null) => {
    try {
      if (!hasSessionRun) return;
      if (!selectedCategory) return;

      const baseElapsed =
        forcedActualSeconds != null
          ? forcedActualSeconds
          : sessionDuration - remainingTime;

      const elapsedSeconds = Number(baseElapsed) || 0;
      if (elapsedSeconds <= 0) return;

      const now = new Date();
      const iso = now.toISOString();
      const dateOnly = iso.split('T')[0];

      const selectedTask = tasks.find(t => t.id === selectedTaskId);

      const newSession = {
        id: Date.now().toString(),
        date: dateOnly,
        endTime: iso,
        category: selectedCategory,
        targetSeconds: sessionDuration,
        actualSeconds: elapsedSeconds,
        distractionCount,
        endReason: reason,
        linkedTaskId: selectedTaskId || null,
        linkedTaskName: selectedTask ? selectedTask.name : null,
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

  // ------------------------------------------------
  // Timer mantığı
  // ------------------------------------------------
  useEffect(() => {
    let interval = null;

    if (isRunning) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);

            // 🔹 Süre bittiği için "tam hedef süre kadar çalıştı" diye kaydediyoruz
            saveSession('finished', sessionDuration);

            if (selectedTaskId) {
              setTaskCompleteVisible(true);
            }
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

  // ------------------------------------------------
  // AppState ile dikkat dağınıklığı
  // ------------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const prevState = appState.current;
      appState.current = nextState;

      if (!isRunning) return;

      if (
        prevState === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        setDistractionCount(prev => prev + 1);
        setIsRunning(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // ------------------------------------------------
  // Yardımcılar
  // ------------------------------------------------
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleChangeDuration = (deltaMinutes) => {
    if (isRunning) return;

    const newSeconds = sessionDuration + deltaMinutes * 60;
    if (newSeconds < 5 * 60 || newSeconds > 120 * 60) return;

    setSessionDuration(newSeconds);
    setRemainingTime(newSeconds);
    setHasSessionRun(false);
    setDistractionCount(0);
  };

  const startTimer = () => {
    if (remainingTime === 0) {
      setRemainingTime(sessionDuration);
    }
    setHasSessionRun(true);
    setIsRunning(true);
  };

  const handleStart = () => {
    if (!selectedCategory) {
      Alert.alert('Kategori seçilmedi', 'Lütfen önce bir kategori seç.');
      return;
    }

    if (!hasSessionRun && tasks.length > 0 && !selectedTaskId) {
      setTaskSelectVisible(true);
      return;
    }

    startTimer();
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = async () => {
    // 🔹 Burada forcedActualSeconds kullanmıyoruz,
    // sessionDuration - remainingTime üzerinden "ne kadar ilerledi" hesaplanıyor.
    await saveSession('reset');

    setIsRunning(false);
    setRemainingTime(sessionDuration);
    setDistractionCount(0);
    setHasSessionRun(false);

    if (selectedTaskId) {
      setTaskCompleteVisible(true);
    } else {
      setSelectedTaskId(null);
    }
  };

  const currentMinutes = Math.floor(sessionDuration / 60);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Görevi tamamla
  const completeTaskNow = async () => {
    try {
      const json = await AsyncStorage.getItem('tasks');
      const data = json ? JSON.parse(json) : [];
      const allTasks = Array.isArray(data) ? data : [];

      const updatedAll = allTasks.map(t =>
        t.id === selectedTaskId ? { ...t, completed: true } : t
      );

      await AsyncStorage.setItem('tasks', JSON.stringify(updatedAll));

      const active = updatedAll.filter(t => !t.completed);
      setTasks(active);

      setTaskCompleteVisible(false);
      setSelectedTaskId(null);

      console.log('Görev tamamlandı!');
    } catch (e) {
      console.log('Görev güncellenemedi:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Odaklanma Zamanlayıcısı</Text>

        {/* Kategori Seçimi */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kategori Seç</Text>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
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

            {/* Kategori Ekle Butonu */}
            <TouchableOpacity
              style={styles.addCategoryButton}
              onPress={() => setAddCategoryVisible(true)}
              disabled={isRunning}
            >
              <Text style={styles.addCategoryText}>+ Kategori Ekle</Text>
            </TouchableOpacity>
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

        {/* Seans Özeti */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Seans Özeti</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kategori</Text>
            <Text style={styles.summaryValue}>
              {selectedCategory ? selectedCategory : 'Seçilmedi'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bağlı Görev</Text>
            <Text style={styles.summaryValue}>
              {selectedTask ? selectedTask.name : 'Seçilmedi'}
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

      {/* Kategori Ekleme Modalı */}
      <Modal
        visible={addCategoryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCategoryVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Yeni Kategori Ekle</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Kategori adı girin..."
              placeholderTextColor="#9ca3af"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setAddCategoryVisible(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.modalBtnText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleAddCategory}
              >
                <Text style={styles.modalBtnText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Görev Seçme Modalı */}
      <Modal
        visible={taskSelectVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTaskSelectVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Bu seans için görev seç</Text>

            {tasks.length === 0 ? (
              <Text style={styles.modalEmptyText}>
                Aktif görev bulunamadı. Görevler sekmesinden görev ekleyebilirsin.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 260 }}>
                {tasks.map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.modalTaskItem,
                      selectedTaskId === task.id && styles.modalTaskItemSelected,
                    ]}
                    onPress={() => setSelectedTaskId(task.id)}
                  >
                    <Text style={styles.modalTaskTitle}>{task.name}</Text>
                    {task.description ? (
                      <Text style={styles.modalTaskDesc}>{task.description}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setTaskSelectVisible(false);
                  setSelectedTaskId(null);
                  startTimer();
                }}
              >
                <Text style={styles.modalBtnText}>Görev seçmeden başlat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  (tasks.length > 0 && !selectedTaskId) && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (tasks.length > 0 && !selectedTaskId) return;
                  setTaskSelectVisible(false);
                  startTimer();
                }}
              >
                <Text style={styles.modalBtnText}>Seçilen görevle başlat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Görev Tamamlama Modalı */}
      <Modal
        visible={taskCompleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskCompleteVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Görev Tamamlandı mı?</Text>

            <Text style={styles.modalConfirmText}>
              {selectedTask
                ? `"${selectedTask.name}" görevini tamamladınız mı?`
                : 'Bu seansa bağlı bir görev vardı, tamamladınız mı?'}
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setTaskCompleteVisible(false);
                  setSelectedTaskId(null);
                }}
              >
                <Text style={styles.modalBtnText}>Hayır</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={completeTaskNow}
              >
                <Text style={styles.modalBtnText}>Evet, tamamlandı</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#e5e7eb',
  },
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
  addCategoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#10b981',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  addCategoryText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#e5e7eb',
    fontSize: 15,
    marginBottom: 16,
  },
  modalEmptyText: {
    color: '#9ca3af',
    marginBottom: 16,
  },
  modalTaskItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  modalTaskItemSelected: {
    borderColor: '#4f46e5',
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  modalTaskTitle: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 15,
  },
  modalTaskDesc: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 3,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#475569',
    alignItems: 'center',
  },
  modalPrimaryButton: {
    flex: 1,
    marginLeft: 6,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  modalConfirmText: {
    color: '#e5e7eb',
    fontSize: 14,
    marginBottom: 12,
  },
});
