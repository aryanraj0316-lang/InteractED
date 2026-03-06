import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { User, LogOut, ShieldCheck, ChevronRight, Settings, BellRing, Info } from "lucide-react-native";

export default function ProfileScreen() {
  const [role, setRole] = useState("USER");
  const [name, setName] = useState("User");
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const storedRole = await SecureStore.getItemAsync("userRole");
      const storedName = await SecureStore.getItemAsync("userName");
      const storedVerified = await SecureStore.getItemAsync("userVerified");

      if (storedRole) setRole(storedRole);
      if (storedName) setName(storedName);
      if (storedVerified === "true") setIsVerified(true);
    };
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("userToken");
          await SecureStore.deleteItemAsync("userRole");
          await SecureStore.deleteItemAsync("userName");
          await SecureStore.deleteItemAsync("userVerified");
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <User size={60} color="#FFF" strokeWidth={2.5} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
          <Text style={styles.userName}>{name}</Text>
          {isVerified && (
            <View style={{ marginLeft: 8 }}>
              <ShieldCheck size={16} color="#34C759" />
            </View>
          )}
        </View>

        <View style={[styles.roleBadge, { backgroundColor: role === "ADMIN" ? "#E3F2FD" : "#F2F2F7" }]}>
          <Text style={[styles.roleText, { color: role === "ADMIN" ? "#007AFF" : "#666" }]}>{role.toUpperCase()}</Text>
        </View>
      </View>

      {/* Account Settings */}
      <Text style={styles.groupLabel}>Account Settings</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={{ padding: 10, borderRadius: 12, marginRight: 15, backgroundColor: "#E3F2FD" }}>
              <Settings size={20} color="#007AFF" />
            </View>
            <Text style={styles.menuLabel}>Preferences</Text>
          </View>
          <ChevronRight size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={{ padding: 10, borderRadius: 12, marginRight: 15, backgroundColor: "#FFF9E6" }}>
              <BellRing size={20} color="#FF9500" />
            </View>
            <Text style={styles.menuLabel}>Notifications</Text>
          </View>
          <ChevronRight size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Support & About */}
      <Text style={styles.groupLabel}>Support & About</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={{ padding: 10, borderRadius: 12, marginRight: 15, backgroundColor: "#F2F2F7" }}>
              <Info size={20} color="#666" />
            </View>
            <Text style={styles.menuLabel}>App Version</Text>
          </View>
          <Text style={{ fontSize: 14, color: "#BBB", fontWeight: "600" }}>v1.0.4</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
          <View style={styles.menuLeft}>
            <View style={{ padding: 10, borderRadius: 12, marginRight: 15, backgroundColor: "#FFE5E5" }}>
              <LogOut size={20} color="#FF3B30" />
            </View>
            <Text style={[styles.menuLabel, { color: "#FF3B30" }]}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={{ textAlign: "center", marginTop: 10, color: "#DDD", fontSize: 11, fontWeight: "600" }}>
        Powered by InteractED Engine
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  contentContainer: { padding: 25, paddingTop: 60 },
  headerCard: { backgroundColor: "#FFF", borderRadius: 30, padding: 35, alignItems: "center", marginBottom: 30, elevation: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, borderWidth: 1, borderColor: "#F2F2F7" },
  avatarContainer: { backgroundColor: "#007AFF", width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 15, borderWidth: 5, borderColor: "#F2F2F7" },
  userName: { fontSize: 26, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.5 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  roleText: { fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  groupLabel: { fontSize: 13, fontWeight: "700", color: "#999", textTransform: "uppercase", marginBottom: 12, marginLeft: 5, letterSpacing: 1 },
  menuContainer: { backgroundColor: "#FFF", borderRadius: 24, overflow: "hidden", marginBottom: 25, borderWidth: 1, borderColor: "#F2F2F7" },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderBottomWidth: 1, borderBottomColor: "#F8F9FA" },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  menuLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
});
