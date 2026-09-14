import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "../utils/api";
import * as SecureStore from 'expo-secure-store';

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = async () => {
    if (!name || !rollNo || !password) {
      return Alert.alert("Error", "Please fill all fields");
    }

    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/register", "POST",{
        name,
        rollNo,
        password,
      });

      if (data?.error === "User already exists") {
        Alert.alert("Error", "User already exists");
      } else {
        Alert.alert("Success", "Account created successfully!");
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userRole', data.user.role || 'USER');
        await SecureStore.setItemAsync('userName', data.user.name || 'Student');
        await SecureStore.setItemAsync('userId', data.user.id.toString());
        await SecureStore.setItemAsync('userVerified', data.user.isVerified ? 'true' : 'false');
        router.replace("/(tabs)");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Join InteractED</Text>
      <Text style={styles.sub}>Create an account for your class</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Roll Number"
        value={rollNo}
        onChangeText={setRollNo}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.signupLink}
      >
        <Text style={styles.signupText}>
          Already have an account?{" "}
          <Text style={styles.bold}>Login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#FFF",
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
  },
  sub: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#F2F2F2",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  signupLink: {
    marginTop: 25,
    alignItems: "center",
  },
  signupText: {
    color: "#666",
    fontSize: 14,
  },
  bold: {
    color: "#007AFF",
    fontWeight: "bold",
  },
});
