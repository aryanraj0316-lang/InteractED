import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiRequest } from '../../utils/api';

export default function CreateAnnouncement() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handlePost = async () => {
    if (!title || !content) return Alert.alert("Error", "Please fill all fields");

    const response = await apiRequest('/api/announcements', 'POST', { title, content });
    
    if (response.id) {
      Alert.alert("Success", "Announcement posted to InteractED!");
      setTitle('');
      setContent('');
    } else {
      Alert.alert("Error", "You don't have permission to post.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Post Update</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Title (e.g., Exam Postponed)" 
        value={title}
        onChangeText={setTitle}
      />
      <TextInput 
        style={[styles.input, styles.textArea]} 
        placeholder="Details..." 
        multiline
        value={content}
        onChangeText={setContent}
      />
      <TouchableOpacity style={styles.button} onPress={handlePost}>
        <Text style={styles.buttonText}>Broadcast to Class</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFF' },
  header: { fontSize: 22, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#DDD', padding: 15, borderRadius: 10, marginBottom: 15 },
  textArea: { height: 120, textAlignVertical: 'top' },
  button: { backgroundColor: '#007AFF', padding: 18, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});