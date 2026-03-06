import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function Notes() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Notes</Text>
      <View style={styles.noteCard}>
        <Text style={styles.tag}>Data Structures</Text>
        <Text style={styles.title}>Trees & Graphs</Text>
        <Text style={styles.desc}>Complete notes on binary trees, AVL trees...</Text>
      </View>
      <View style={styles.noteCard}>
        <Text style={styles.tag}>Database</Text>
        <Text style={styles.title}>Normalization Guide</Text>
        <Text style={styles.desc}>Comprehensive guide covering 1NF, 2NF, 3NF...</Text>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  noteCard: { padding: 20, backgroundColor: '#f9f9f9', borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  tag: { color: '#FF9500', fontWeight: 'bold', fontSize: 12, marginBottom: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  desc: { color: '#666', lineHeight: 20 }
});