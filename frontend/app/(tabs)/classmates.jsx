import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ShieldCheck, User, Star } from 'lucide-react-native';
import { apiRequest } from '../../utils/api';
import * as SecureStore from 'expo-secure-store';

export default function ClassmateDirectory() {
  const [users, setUsers] = useState([]);
  const [myRole, setMyRole] = useState('USER');
  const [myId, setMyId] = useState(null);

  const fetchUsers = async () => {
    const data = await apiRequest('/api/users');
    setUsers(data || []);
    const role = await SecureStore.getItemAsync('userRole');
    const id = await SecureStore.getItemAsync('userId');
    setMyRole(role);
    setMyId(id);
  };

  useEffect(() => { fetchUsers(); }, []);

  const promoteUser = (userId, name) => {
    Alert.alert(
      "Appoint Class Rep",
      `Are you sure you want to give ${name} Class Representative powers?`,
      [
        { text: "Cancel" },
        { text: "Appoint", onPress: async () => {
            const res = await apiRequest(`/admin/promote/${userId}`, 'PATCH', {}, { userId: myId });
            if (!res.error) fetchUsers();
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Class Directory</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={[styles.avatar, { backgroundColor: item.role === 'ADMIN' ? '#007AFF' : '#F2F2F7' }]}>
              {item.role === 'ADMIN' ? <ShieldCheck size={20} color="#FFF" /> : <User size={20} color="#666" />}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userRoll}>{item.rollNo} • {item.role}</Text>
            </View>
            {myRole === 'ADMIN' && item.role === 'USER' && (
              <TouchableOpacity onPress={() => promoteUser(item.id, item.name)} style={styles.promoteBtn}>
                <Star size={16} color="#007AFF" />
                <Text style={styles.promoteText}>Appoint</Text>
              </TouchableOpacity>
            )}
            {item.role === 'CLASS_REP' && (
              <View style={styles.repBadge}><Text style={styles.repText}>REP</Text></View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 25, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: '800', marginBottom: 25 },
  userCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF' },
  avatar: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  userRoll: { fontSize: 12, color: '#999', marginTop: 2 },
  promoteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  promoteText: { color: '#007AFF', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  repBadge: { backgroundColor: '#007AFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  repText: { color: '#FFF', fontSize: 10, fontWeight: '900' }
});