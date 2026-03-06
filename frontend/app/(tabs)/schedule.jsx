import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';
import { apiRequest } from '../../utils/api';

export default function ScheduleScreen() {
  const [exams, setExams] = useState([]);

  useEffect(() => {
    const fetchExams = async () => {
      const data = await apiRequest('/exams');
      if (Array.isArray(data)) setExams(data);
    };
    fetchExams();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Exam Schedule</Text>
      <FlatList
        data={exams}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.examCard}>
            <View style={styles.dateBox}>
              <Text style={styles.dateText}>{new Date(item.date).getDate()}</Text>
              <Text style={styles.monthText}>{new Date(item.date).toLocaleString('default', { month: 'short' })}</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.subject}>{item.subject}</Text>
              <View style={styles.row}>
                <MapPin size={12} color="#666" />
                <Text style={styles.infoText}>Room: {item.room} | {item.time}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 20 },
  header: { fontSize: 26, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  examCard: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 15, padding: 15, marginBottom: 12 },
  dateBox: { backgroundColor: '#007AFF', padding: 10, borderRadius: 10, alignItems: 'center', minWidth: 60 },
  dateText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  monthText: { color: '#FFF', fontSize: 12, textTransform: 'uppercase' },
  details: { marginLeft: 15, justifyContent: 'center' },
  subject: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  infoText: { color: '#666', fontSize: 13, marginLeft: 5 }
});