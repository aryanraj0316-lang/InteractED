// app/(tabs)/messages.jsx  ─  InteractED Chat (Upgraded)
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, ScrollView, RefreshControl, Alert, Dimensions,
} from 'react-native';
import { Search, Plus, X, ArrowLeft, Send, Users, MessageCircle } from 'lucide-react-native';
import { apiRequest } from '../../utils/api';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

// ── Colour palette for avatars ────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#4C6EF5','#E64980','#F08C00','#2F9E44','#7048E8','#D9480F',
  '#1098AD','#C92A2A','#5C7CFA','#099268',
];
const getAvatarColor = (name = '') =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ── Avatar component ──────────────────────────────────────────────────────────
function Avatar({ name = '?', size = 46, style }) {
  const bg = getAvatarColor(name);
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

// ── Individual chat room screen ───────────────────────────────────────────────
function ChatRoom({ room, myId, myName, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiRequest(`/api/chat/rooms/${room.id}/messages`);
      if (Array.isArray(data)) {
        setMessages(data);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 50);
      }
    } catch (_) {}
  }, [room.id]);

  useEffect(() => {
    fetchMessages();
    // Poll every 3 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const optimistic = {
      id: `tmp-${Date.now()}`, content: text.trim(),
      senderId: myId, sender: { name: myName }, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    setSending(true);
    try {
      await apiRequest(`/api/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: optimistic.content }),
      });
      fetchMessages(); // sync confirmed state
    } catch {
      Alert.alert('Failed to send message');
    } finally { setSending(false); }
  };

  const displayName = room.isGroup ? room.name : (room.members?.find(m => m.userId !== myId)?.user?.name || 'Chat');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F7F9FC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={room_s.header}>
        <TouchableOpacity onPress={onBack} style={room_s.backBtn}>
          <ArrowLeft size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Avatar name={displayName} size={38} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={room_s.roomName} numberOfLines={1}>{displayName}</Text>
          {room.isGroup && <Text style={room_s.memberCount}>{room.members?.length || 0} members</Text>}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={room_s.msgList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item, index }) => {
          const isMe = item.senderId === myId;
          const showSender = !isMe && room.isGroup && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
          return (
            <View style={[room_s.msgRow, isMe && { flexDirection: 'row-reverse' }]}>
              {!isMe && <Avatar name={item.sender?.name || '?'} size={30} style={{ marginRight: 8, alignSelf: 'flex-end' }} />}
              <View style={{ maxWidth: '72%' }}>
                {showSender && <Text style={room_s.senderName}>{item.sender?.name}</Text>}
                <View style={[room_s.bubble, isMe ? room_s.bubbleMe : room_s.bubbleThem]}>
                  <Text style={[room_s.bubbleTxt, isMe && { color: '#fff' }]}>{item.content}</Text>
                </View>
                <Text style={[room_s.time, isMe && { textAlign: 'right' }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={room_s.inputRow}>
        <TextInput
          style={room_s.input}
          placeholder="Type a message..."
          placeholderTextColor="#ADB5BD"
          value={text}
          onChangeText={setText}
          multiline
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[room_s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── New chat / group creation modal ──────────────────────────────────────────
function NewChatModal({ visible, onClose, onCreated, myId }) {
  const [peers, setPeers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      setLoading(true);
      apiRequest('/api/users').then(data => {
        setPeers(Array.isArray(data) ? data.filter(u => u.id !== myId) : []);
      }).catch(() => {}).finally(() => setLoading(false));
      setSelected([]); setGroupName(''); setSearch('');
    }
  }, [visible]);

  const toggle = (user) => {
    setSelected(prev =>
      prev.find(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
    );
  };

  const create = async () => {
    if (selected.length === 0) { Alert.alert('Select at least one person'); return; }
    const isGroup = selected.length > 1;
    if (isGroup && !groupName.trim()) { Alert.alert('Enter a group name'); return; }
    setCreating(true);
    try {
      const room = await apiRequest('/api/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({
          isGroup,
          name: isGroup ? groupName.trim() : undefined,
          memberIds: selected.map(u => u.id),
        }),
      });
      onCreated(room);
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not create chat');
    } finally { setCreating(false); }
  };

  const filtered = peers.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.rollNo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={nc.container}>
        <View style={nc.topBar}>
          <Text style={nc.heading}>New {selected.length > 1 ? 'Group' : 'Chat'}</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color="#666" /></TouchableOpacity>
        </View>

        {selected.length > 1 && (
          <TextInput style={nc.groupInput} placeholder="Group name" placeholderTextColor="#ADB5BD" value={groupName} onChangeText={setGroupName} />
        )}

        {/* Selected chips */}
        {selected.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={nc.chipRow} contentContainerStyle={{ gap: 8 }}>
            {selected.map(u => (
              <TouchableOpacity key={u.id} style={nc.chip} onPress={() => toggle(u)}>
                <Text style={nc.chipTxt}>{u.name}</Text>
                <X size={12} color="#fff" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={nc.searchBox}>
          <Search size={16} color="#ADB5BD" />
          <TextInput style={nc.searchInput} placeholder="Search peers..." placeholderTextColor="#ADB5BD" value={search} onChangeText={setSearch} />
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 30 }} color="#007AFF" /> : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => {
              const sel = selected.find(u => u.id === item.id);
              return (
                <TouchableOpacity style={[nc.peerRow, sel && nc.peerRowSel]} onPress={() => toggle(item)} activeOpacity={0.7}>
                  <Avatar name={item.name} size={42} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={nc.peerName}>{item.name}</Text>
                    <Text style={nc.peerRoll}>{item.rollNo}</Text>
                  </View>
                  {sel && <View style={nc.checkDot}><Text style={{ color: '#fff', fontSize: 10 }}>✓</Text></View>}
                </TouchableOpacity>
              );
            }}
          />
        )}

        <TouchableOpacity
          style={[nc.createBtn, selected.length === 0 && { opacity: 0.4 }]}
          onPress={create} disabled={selected.length === 0 || creating}
        >
          {creating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={nc.createTxt}>{selected.length > 1 ? 'Create Group' : 'Start Chat'}</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Main Messages List ────────────────────────────────────────────────────────
export default function Messages() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [newChatVisible, setNewChatVisible] = useState(false);
  const [myId, setMyId] = useState(null);
  const [myName, setMyName] = useState('Me');
  const [search, setSearch] = useState('');

  const loadRooms = useCallback(async () => {
    try {
      const data = await apiRequest('/api/chat/rooms');
      if (Array.isArray(data)) setRooms(data);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      const id  = await SecureStore.getItemAsync('userId');
      const name = await SecureStore.getItemAsync('userName');
      setMyId(Number(id));
      setMyName(name || 'Me');
      loadRooms();
    };
    init();
  }, []);

  const onRefresh = () => { setRefreshing(true); loadRooms(); };

  const getRoomDisplay = (room) => {
    if (room.isGroup) return { name: room.name, sub: `${room.members?.length || 0} members` };
    const other = room.members?.find(m => m.userId !== myId)?.user;
    return { name: other?.name || 'Chat', sub: other?.rollNo || '' };
  };

  const getLastMsg = (room) => room.messages?.[0]?.content || 'No messages yet';
  const getUnread = (room) => room.unreadCount || 0;

  const filtered = rooms.filter(r => {
    const { name } = getRoomDisplay(r);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  if (activeRoom) {
    return (
      <ChatRoom
        room={activeRoom}
        myId={myId}
        myName={myName}
        onBack={() => { setActiveRoom(null); loadRooms(); }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setNewChatVisible(true)}>
          <Plus size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Search size={16} color="#ADB5BD" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#ADB5BD"
          value={search} onChangeText={setSearch}
        />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color="#007AFF" /> : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MessageCircle size={48} color="#DEE2E6" strokeWidth={1.5} />
              <Text style={styles.emptyTxt}>No conversations yet</Text>
              <Text style={styles.emptySubTxt}>Tap + to start a chat or create a group</Text>
            </View>
          }
          renderItem={({ item }) => {
            const { name, sub } = getRoomDisplay(item);
            const unread = getUnread(item);
            return (
              <TouchableOpacity style={styles.chatItem} onPress={() => setActiveRoom(item)} activeOpacity={0.75}>
                <View style={{ position: 'relative' }}>
                  <Avatar name={name} size={52} />
                  {item.isGroup && (
                    <View style={styles.groupBadge}>
                      <Users size={9} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.chatContent}>
                  <View style={styles.chatTopRow}>
                    <Text style={styles.chatName} numberOfLines={1}>{name}</Text>
                    {item.messages?.[0] && (
                      <Text style={styles.chatTime}>
                        {new Date(item.messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                  <View style={styles.chatBottomRow}>
                    <Text style={[styles.chatMsg, unread > 0 && styles.chatMsgBold]} numberOfLines={1}>{getLastMsg(item)}</Text>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}><Text style={styles.unreadTxt}>{unread}</Text></View>
                    )}
                  </View>
                  {sub ? <Text style={styles.chatSub}>{sub}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <NewChatModal
        visible={newChatVisible}
        onClose={() => setNewChatVisible(false)}
        onCreated={(room) => { setRooms(prev => [room, ...prev]); setActiveRoom(room); }}
        myId={myId}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 12 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', letterSpacing: -1 },
  newBtn: { backgroundColor: '#EEF4FF', padding: 10, borderRadius: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, marginHorizontal: 24, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },
  chatContent: { flex: 1, marginLeft: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F7', paddingBottom: 14 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 8 },
  chatTime: { fontSize: 12, color: '#ADB5BD' },
  chatBottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  chatMsg: { flex: 1, fontSize: 14, color: '#868E96', marginRight: 8 },
  chatMsgBold: { color: '#1A1A1A', fontWeight: '600' },
  chatSub: { fontSize: 11, color: '#ADB5BD', marginTop: 2 },
  unreadBadge: { backgroundColor: '#007AFF', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  groupBadge: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTxt: { fontSize: 18, fontWeight: '700', color: '#495057', marginTop: 16 },
  emptySubTxt: { fontSize: 14, color: '#ADB5BD', textAlign: 'center', marginTop: 6 },
});

const room_s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  backBtn: { marginRight: 12, padding: 4 },
  roomName: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  memberCount: { fontSize: 12, color: '#ADB5BD' },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  senderName: { fontSize: 11, color: '#ADB5BD', fontWeight: '700', marginBottom: 3, marginLeft: 2 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '100%' },
  bubbleMe: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#F2F2F7', borderBottomLeftRadius: 4 },
  bubbleTxt: { fontSize: 15, color: '#1A1A1A', lineHeight: 20 },
  time: { fontSize: 11, color: '#ADB5BD', marginTop: 3, marginHorizontal: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7', gap: 10 },
  input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1A1A1A', maxHeight: 120 },
  sendBtn: { backgroundColor: '#007AFF', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});

const nc = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  groupInput: { marginHorizontal: 24, borderWidth: 1.5, borderColor: '#E9ECEF', borderRadius: 14, padding: 14, fontSize: 15, color: '#1A1A1A', marginBottom: 12 },
  chipRow: { paddingHorizontal: 24, marginBottom: 12, maxHeight: 40 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  chipTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, marginHorizontal: 24, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  peerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  peerRowSel: { backgroundColor: '#EEF4FF' },
  peerName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  peerRoll: { fontSize: 13, color: '#ADB5BD' },
  checkDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  createBtn: { margin: 24, backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  createTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});