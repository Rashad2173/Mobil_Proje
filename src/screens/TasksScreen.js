
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

export default function TasksScreen() {
  const isFocused = useIsFocused();

  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  // Görevleri yükle
  const loadTasks = async () => {
    try {
      const json = await AsyncStorage.getItem('tasks');
      const data = json ? JSON.parse(json) : [];
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Görevler okunurken hata:', e);
    }
  };

  // İlk açılış + ekrana her odaklanıldığında görevleri yenile
  useEffect(() => {
    if (isFocused) {
      loadTasks();
    }
  }, [isFocused]);

  const saveTasks = async (newTasks) => {
    setTasks(newTasks);
    await AsyncStorage.setItem('tasks', JSON.stringify(newTasks));
  };

  // Yeni görev ekle
  const handleAddTask = () => {
    if (!taskName.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      name: taskName.trim(),
      description: taskDescription.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [...tasks, newTask];
    saveTasks(updated);

    setTaskName('');
    setTaskDescription('');
    setModalVisible(false);
  };

  // Görev tamamlandı / geri al
  const toggleComplete = (id) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  };

  // Görev item
  const renderTask = ({ item }) => (
    <TouchableOpacity
      style={[styles.taskItem, item.completed && styles.completedTask]}
      onPress={() => toggleComplete(item.id)}
    >
      <Text style={styles.taskTitle}>
        {item.completed ? '✅ ' : '🕓 '} {item.name}
      </Text>
      {item.description ? (
        <Text style={styles.taskDesc}>{item.description}</Text>
      ) : null}
    </TouchableOpacity>
  );

  const activeTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <Text style={styles.title}>Görevler</Text>

        {/* Yeni görev ekle butonu */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Yeni Görev</Text>
        </TouchableOpacity>

        {/* Aktif Görevler */}
        <Text style={styles.sectionTitle}>Aktif Görevler</Text>
        {activeTasks.length === 0 ? (
          <Text style={styles.emptyText}>Aktif görev yok.</Text>
        ) : (
          <FlatList
            data={activeTasks}
            keyExtractor={(item) => item.id}
            renderItem={renderTask}
          />
        )}

        {/* Tamamlanan Görevler */}
        <Text style={styles.sectionTitle}>Tamamlanan Görevler</Text>
        {doneTasks.length === 0 ? (
          <Text style={styles.emptyText}>Henüz tamamlanan yok.</Text>
        ) : (
          <FlatList
            data={doneTasks}
            keyExtractor={(item) => item.id}
            renderItem={renderTask}
          />
        )}

        {/* Görev ekleme modalı */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Yeni Görev</Text>

              <TextInput
                style={styles.input}
                placeholder="Görev adı..."
                placeholderTextColor="#777"
                value={taskName}
                onChangeText={setTaskName}
              />

              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Açıklama (isteğe bağlı)"
                placeholderTextColor="#777"
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalAdd}
                  onPress={handleAddTask}
                >
                  <Text style={styles.modalBtnText}>Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
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
    padding: 16,
    backgroundColor: '#020617',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    color: '#e5e7eb',
  },

  addButton: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  addButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
    color: '#e5e7eb',
  },

  taskItem: {
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  completedTask: {
    opacity: 0.5,
  },
  taskTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  taskDesc: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },

  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 10,
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#334155',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    backgroundColor: '#475569',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalAdd: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
