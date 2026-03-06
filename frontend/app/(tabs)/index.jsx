import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, RefreshControl, 
  TouchableOpacity, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { Bell, Clock, AlertTriangle, BookOpen, ChevronRight, PlusCircle, ShieldCheck } from 'lucide-react-native';
import { apiRequest } from '../../utils/api';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

export default function ProfessionalHome() {
  const [data, setData] = useState({ assignments: [], announcements: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState('USER');
  const [isVerified, setIsVerified] = useState(false);

  const fetchData = async () => {
    try {
      // Fetching all academic data in parallel for speed
      const [assigns, announ] = await Promise.all([
        apiRequest('/assignments'),
        apiRequest('/announcements')
      ]);
      
      setData({ 
        assignments: Array.isArray(assigns) ? assigns : [], 
        announcements: Array.isArray(announ) ? announ : [] 
      });

      // CRITICAL: Fetching fresh role and verification status from SecureStore
      const userRole = await SecureStore.getItemAsync('userRole');
      const verifiedStatus = await SecureStore.getItemAsync('userVerified');
      
      setRole(userRole || 'USER');
      setIsVerified(verifiedStatus === 'true');

    } catch (e) {
      console.error("Home Data Sync Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

    useEffect(() => { 
    fetchData(); 
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const formatDeadline = (date) => {
    const diff = new Date(date) - new Date();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return "Submission Closed";
    if (days === 0) return "Due Today";
    if (days === 1) return "Due Tomorrow";
    return `${days} days remaining`;
  };

  const handleCreatePress = () => {
    if (role === 'CLASS_REP' || role === 'ADMIN') {
      // You can trigger your Modal or Navigation here
      Alert.alert("Authorized", `Welcome ${role}. Opening Broadcast Console...`);
    }
  };

  if (loading) return (
    <View style={styles.loader}><ActivityIndicator size="large" color="#007AFF" /></View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
      >
        {/* Dynamic Header with Verification Badge */}
        <View style={styles.header}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.welcomeText}>InteractED</Text>
              {isVerified && <ShieldCheck size={18} color="#34C759" style={{ marginLeft: 8, marginTop: 5 }} />}
            </View>
            <Text style={styles.statusText}>
              {role === 'ADMIN' ? 'Administrator Console' : role === 'CLASS_REP' ? 'Representative Dashboard' : 'Student Portal'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notiBtn}>
            <Bell size={22} color="#1a1a1a" />
            {data.announcements.length > 0 && <View style={styles.dot} />}
          </TouchableOpacity>
        </View>

        {/* CONDITIONAL: Assignments Section */}
        {data.assignments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Deadlines</Text>
              <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {data.assignments.map((item) => (
                <View key={item.id} style={styles.assignCard}>
                  <View style={[styles.priorityTag, { backgroundColor: item.priority === 'HIGH' ? '#FFE5E5' : '#E3F2FD' }]}>
                    <Text style={[styles.priorityText, { color: item.priority === 'HIGH' ? '#FF3B30' : '#007AFF' }]}>{item.priority}</Text>
                  </View>
                  <Text style={styles.assignSubject}>{item.subject}</Text>
                  <Text style={styles.assignTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.timerRow}>
                    <Clock size={12} color="#666" />
                    <Text style={styles.timerText}>{formatDeadline(item.deadline)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* CONDITIONAL: Noticeboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Noticeboard</Text>
          </View>
          {data.announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={40} color="#CCC" strokeWidth={1} />
              <Text style={styles.emptyText}>The noticeboard is currently empty.</Text>
            </View>
          ) : (
            data.announcements.map((item) => (
              <TouchableOpacity key={item.id} style={styles.noticeCard}>
                <View style={styles.noticeIcon}>
                  <AlertTriangle size={20} color="#007AFF" />
                </View>
                <View style={styles.noticeContent}>
                  <Text style={styles.noticeAuthor}>{item.author.name} • {item.author.role.replace('_', ' ')}</Text>
                  <Text style={styles.noticeTitle}>{item.title}</Text>
                  <Text style={styles.noticeSnippet} numberOfLines={2}>{item.content}</Text>
                </View>
                <ChevronRight size={18} color="#CCC" />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* DYNAMIC FAB: Visible only for elevated roles */}
      {(role === 'ADMIN' || role === 'CLASS_REP') && (
        <TouchableOpacity style={styles.fab} onPress={handleCreatePress}>
          <PlusCircle size={24} color="#FFF" />
          <Text style={styles.fabText}>Broadcast</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, paddingTop: 60 },
  welcomeText: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', letterSpacing: -1 },
  statusText: { fontSize: 13, color: '#007AFF', fontWeight: '700', marginTop: -2, textTransform: 'uppercase', letterSpacing: 0.5 },
  notiBtn: { backgroundColor: '#F2F2F7', padding: 12, borderRadius: 15 },
  dot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3030', borderWidth: 2, borderColor: '#ffffff' },
  section: { paddingHorizontal: 25, marginTop: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  viewAll: { color: '#007AFF', fontWeight: '600' },
  horizontalScroll: { paddingLeft: 0 },
  assignCard: { backgroundColor: '#F8F9FA', width: width * 0.65, padding: 20, borderRadius: 24, marginRight: 15, borderWidth: 1, borderColor: '#F2F2F7', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  priorityTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  priorityText: { fontSize: 10, fontWeight: '900' },
  assignSubject: { fontSize: 11, color: '#007AFF', fontWeight: '800', textTransform: 'uppercase' },
  assignTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginVertical: 4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  timerText: { fontSize: 12, color: '#666', marginLeft: 6, fontWeight: '600' },
  noticeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#F2F2F7' },
  noticeIcon: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 15, marginRight: 15 },
  noticeContent: { flex: 1 },
  noticeAuthor: { fontSize: 10, color: '#007AFF', fontWeight: '800', textTransform: 'uppercase' },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  noticeSnippet: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },
  emptyContainer: { alignItems: 'center', padding: 40, backgroundColor: '#F8F9FA', borderRadius: 24, marginTop: 10 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 25, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 28, borderRadius: 35, elevation: 10, shadowColor: '#007AFF', shadowOpacity: 0.4, shadowRadius: 15 },
  fabText: { color: '#FFF', fontWeight: '900', marginLeft: 10, fontSize: 15, textTransform: 'uppercase' }
});