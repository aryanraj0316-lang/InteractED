import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ShieldCheck, Lock, User as UserIcon } from 'lucide-react-native';
import { apiRequest } from '../utils/api';

export default function LoginScreen() {
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!rollNo || !password) {
      return Alert.alert("Error", "Enter roll number and password.");
    }

    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', 'POST', { rollNo, password });

      if (!data?.token || !data?.user) {
        return Alert.alert("Login Failed", data?.error || "Invalid credentials.");
      }

      // ✅ STORE TOKEN & USER INFO
      await SecureStore.setItemAsync('userToken', data.token);
      await SecureStore.setItemAsync('userRole', data.user.role || 'USER');
      await SecureStore.setItemAsync('userName', data.user.name || 'Student');
      await SecureStore.setItemAsync('userId', data.user.id.toString());
      await SecureStore.setItemAsync('userVerified', data.user.isVerified ? 'true' : 'false');

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert("Connection Error", error.message || "Server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.header}>
          <ShieldCheck size={50} color="#007AFF" />
          <Text style={styles.title}>InteractED</Text>
          <Text style={styles.subtitle}>Secure Academic Gateway</Text>
        </View>

        {/* ROLL NUMBER INPUT */}
        <View style={styles.inputBox}>
          <UserIcon size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Roll Number"
            value={rollNo}
            onChangeText={setRollNo}
            autoCapitalize="none"
          />
        </View>

        {/* PASSWORD INPUT */}
        <View style={styles.inputBox}>
          <Lock size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* LOGIN BUTTON */}
        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Authorize Access</Text>}
        </TouchableOpacity>

        {/* SIGNUP LINK */}
        <TouchableOpacity
          onPress={() => router.push('/signup')}
          activeOpacity={0.7}
          style={{ marginTop: 30, alignItems: 'center' }}
        >
          <Text style={styles.signupText}>Don’t have an account?</Text>
          <Text style={styles.signupLink}>Create one</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 30 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F2F2F7'
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  btn: { backgroundColor: '#007AFF', padding: 20, borderRadius: 15, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  signupText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  signupLink: { marginTop: 4, fontSize: 15, color: '#007AFF', fontWeight: '700', letterSpacing: 0.3 },
});
