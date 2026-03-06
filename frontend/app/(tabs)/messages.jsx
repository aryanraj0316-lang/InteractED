import { View, Text, FlatList, StyleSheet } from 'react-native';

const CHATS = [
  { id: '1', name: 'Sarah Johnson', msg: 'Did you get the notes?', count: 2 },
  { id: '2', name: 'Web Dev Team', msg: 'Project deadline extended!', count: 0 },
];

export default function Messages() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messages</Text>
      <FlatList 
        data={CHATS}
        renderItem={({ item }) => (
          <View style={styles.chatItem}>
            <View style={styles.avatar}><Text>{item.name[0]}</Text></View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.msg}>{item.msg}</Text>
            </View>
            {item.count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{item.count}</Text></View>}
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  name: { fontWeight: 'bold', fontSize: 16 },
  msg: { color: '#666' },
  badge: { backgroundColor: '#007AFF', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10 }
});