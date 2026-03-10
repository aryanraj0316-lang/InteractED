// app/(tabs)/index.jsx  ─  InteractED Home (Upgraded)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions, Alert,
  Modal, TextInput, Animated, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Bell, Clock, AlertTriangle, BookOpen, ChevronRight,
  PlusCircle, ShieldCheck, X, Send, Megaphone, Info, Calendar,
} from 'lucide-react-native';
import { apiRequest } from '../../utils/api';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { key: 'URGENT',  label: '🔴 Urgent',  color: '#FF3B30', bg: '#FFF0EE' },
  { key: 'INFO',    label: 'ℹ️ Info',     color: '#007AFF', bg: '#EEF4FF' },
  { key: 'EVENT',   label: '📅 Event',   color: '#34C759', bg: '#EDFAF3' },
];

// ── Full-content announcement modal ──────────────────────────────────────────
function NoticeDetailModal({ notice, onClose }) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
  }, []);
  if (!notice) return null;
  const cat = CATEGORIES.find(c => c.key === notice.category) || CATEGORIES[1];
  return (
    <View style={detail.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={detail.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View style={[detail.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={detail.handle} />
        <View style={[detail.catBadge, { backgroundColor: cat.bg }]}>
          <Text style={[detail.catText, { color: cat.color }]}>{cat.label}</Text>
        </View>
        <Text style={detail.title}>{notice.title}</Text>
        <Text style={detail.meta}>{notice.author?.name} · {notice.author?.role?.replace('_', ' ')}</Text>
        <View style={detail.divider} />
        <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
          <Text style={detail.body}>{notice.content}</Text>
        </ScrollView>
        <TouchableOpacity style={detail.closeBtn} onPress={onClose}>
          <Text style={detail.closeTxt}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Broadcast creation modal ─────────────────────────────────────────────────
function BroadcastModal({ visible, onClose, onSuccess, accent = '#007AFF' }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('INFO');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing fields', 'Please fill in both title and content.'); return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category }),
      });
      setTitle(''); setContent(''); setCategory('INFO');
      onSuccess();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Broadcast failed');
    } finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={bcast.backdrop} />
        </TouchableWithoutFeedback>
        <View style={bcast.sheet}>
          <View style={bcast.topRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Megaphone size={20} color={accent} />
              <Text style={bcast.heading}>Broadcast</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X size={22} color="#999" /></TouchableOpacity>
          </View>

          {/* Category picker */}
          <Text style={bcast.label}>CATEGORY</Text>
          <View style={bcast.catRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[bcast.catChip, { backgroundColor: category === c.key ? c.bg : '#F2F2F7', borderColor: category === c.key ? c.color : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setCategory(c.key)}
              >
                <Text style={[bcast.catChipTxt, { color: category === c.key ? c.color : '#999' }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={bcast.label}>TITLE</Text>
          <TextInput style={bcast.input} placeholder="Announcement title" placeholderTextColor="#C7C7CC" value={title} onChangeText={setTitle} />

          <Text style={bcast.label}>MESSAGE</Text>
          <TextInput
            style={[bcast.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Write your message here..."
            placeholderTextColor="#C7C7CC"
            value={content} onChangeText={setContent} multiline
          />

          <TouchableOpacity
            style={[bcast.sendBtn, { backgroundColor: accent }, submitting && { opacity: 0.6 }]}
            onPress={submit} disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Send size={16} color="#fff" /><Text style={bcast.sendTxt}>Send Broadcast</Text></>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfessionalHome() {
  const [data, setData] = useState({ assignments: [], announcements: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState('USER');
  const [isVerified, setIsVerified] = useState(false);
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  // Bell pulse animation
  const bellAnim = useRef(new Animated.Value(1)).current;

  const fetchData = async () => {
    try {
      const [assigns, announ] = await Promise.all([
        apiRequest('/api/assignments'),
        apiRequest('/api/announcements'),
      ]);
      setData({
        assignments: Array.isArray(assigns) ? assigns : [],
        announcements: Array.isArray(announ) ? announ : [],
      });
      const userRole = await SecureStore.getItemAsync('userRole');
      const verifiedStatus = await SecureStore.getItemAsync('userVerified');
      setRole(userRole || 'USER');
      setIsVerified(verifiedStatus === 'true');
    } catch (e) {
      console.error('Home Data Sync Error:', e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Pulse bell when there are announcements
  useEffect(() => {
    if (data.announcements.length > 0) {
      Animated.sequence([
        Animated.timing(bellAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 1,   duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [data.announcements.length]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const formatDeadline = (date) => {
    const diff = new Date(date) - new Date();
    const days = Math.floor(diff / 86400000);
    if (days < 0) return 'Submission Closed';
    if (days === 0) return 'Due Today';
    if (days === 1) return 'Due Tomorrow';
    return `${days} days remaining`;
  };

  const getCatStyle = (cat) => CATEGORIES.find(c => c.key === cat) || CATEGORIES[1];

  if (loading) return (
    <View style={styles.loader}><ActivityIndicator size="large" color="#007AFF" /></View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
      >
        {/* Header */}
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
          <Animated.View style={{ transform: [{ scale: bellAnim }] }}>
            <TouchableOpacity style={styles.notiBtn}>
              <Bell size={22} color="#1a1a1a" />
              {data.announcements.length > 0 && <View style={styles.dot} />}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Assignments */}
        {data.assignments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Deadlines</Text>
              <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

        {/* Noticeboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Noticeboard</Text>
            {data.announcements.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillTxt}>{data.announcements.length}</Text>
              </View>
            )}
          </View>
          {data.announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={40} color="#CCC" strokeWidth={1} />
              <Text style={styles.emptyText}>The noticeboard is currently empty.</Text>
            </View>
          ) : (
            data.announcements.map((item) => {
              const cat = getCatStyle(item.category);
              return (
                <TouchableOpacity key={item.id} style={styles.noticeCard} onPress={() => setSelectedNotice(item)} activeOpacity={0.75}>
                  <View style={[styles.noticeIcon, { backgroundColor: cat.bg }]}>
                    {item.category === 'URGENT' ? <AlertTriangle size={20} color={cat.color} />
                     : item.category === 'EVENT'  ? <Calendar size={20} color={cat.color} />
                     : <Info size={20} color={cat.color} />}
                  </View>
                  <View style={styles.noticeContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.noticeAuthor, { color: cat.color }]}>{item.author?.name} · {item.author?.role?.replace('_', ' ')}</Text>
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                    </View>
                    <Text style={styles.noticeTitle}>{item.title}</Text>
                    <Text style={styles.noticeSnippet} numberOfLines={2}>{item.content}</Text>
                  </View>
                  <ChevronRight size={18} color="#CCC" />
                </TouchableOpacity>
              );
            })
          )}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB for elevated roles */}
      {(role === 'ADMIN' || role === 'CLASS_REP') && (
        <TouchableOpacity style={styles.fab} onPress={() => setBroadcastVisible(true)}>
          <PlusCircle size={24} color="#FFF" />
          <Text style={styles.fabText}>Broadcast</Text>
        </TouchableOpacity>
      )}

      <BroadcastModal
        visible={broadcastVisible}
        onClose={() => setBroadcastVisible(false)}
        onSuccess={fetchData}
      />

      {selectedNotice && (
        <NoticeDetailModal notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, paddingTop: 60 },
  welcomeText: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', letterSpacing: -1 },
  statusText: { fontSize: 13, color: '#007AFF', fontWeight: '700', marginTop: -2, textTransform: 'uppercase', letterSpacing: 0.5 },
  notiBtn: { backgroundColor: '#F2F2F7', padding: 12, borderRadius: 15 },
  dot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3030', borderWidth: 2, borderColor: '#fff' },
  section: { paddingHorizontal: 25, marginTop: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  viewAll: { color: '#007AFF', fontWeight: '600' },
  countPill: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countPillTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  assignCard: { backgroundColor: '#F8F9FA', width: width * 0.65, padding: 20, borderRadius: 24, marginRight: 15, borderWidth: 1, borderColor: '#F2F2F7', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  priorityTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  priorityText: { fontSize: 10, fontWeight: '900' },
  assignSubject: { fontSize: 11, color: '#007AFF', fontWeight: '800', textTransform: 'uppercase' },
  assignTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginVertical: 4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  timerText: { fontSize: 12, color: '#666', marginLeft: 6, fontWeight: '600' },
  noticeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#F2F2F7' },
  noticeIcon: { padding: 12, borderRadius: 15, marginRight: 15 },
  noticeContent: { flex: 1 },
  noticeAuthor: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  catDot: { width: 4, height: 4, borderRadius: 2 },
  catLabel: { fontSize: 10, fontWeight: '700' },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  noticeSnippet: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },
  emptyContainer: { alignItems: 'center', padding: 40, backgroundColor: '#F8F9FA', borderRadius: 24, marginTop: 10 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 25, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 28, borderRadius: 35, elevation: 10, shadowColor: '#007AFF', shadowOpacity: 0.4, shadowRadius: 15 },
  fabText: { color: '#FFF', fontWeight: '900', marginLeft: 10, fontSize: 15, textTransform: 'uppercase' },
});

const bcast = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  heading: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  label: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 0.5, marginBottom: 8 },
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  catChipTxt: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1.5, borderColor: '#E9ECEF', borderRadius: 14, padding: 14, fontSize: 15, color: '#1A1A1A', marginBottom: 18 },
  sendBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  sendTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

const detail = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 200, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '75%' },
  handle: { width: 40, height: 4, backgroundColor: '#DEE2E6', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  catText: { fontSize: 12, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 6, lineHeight: 28 },
  meta: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 16, textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#F1F3F5', marginBottom: 16 },
  body: { fontSize: 15, color: '#333', lineHeight: 24 },
  closeBtn: { marginTop: 24, backgroundColor: '#F8F9FA', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  closeTxt: { fontSize: 15, fontWeight: '700', color: '#666' },
});