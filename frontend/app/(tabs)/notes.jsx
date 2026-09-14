import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

const API_URL = "https://interacted-backend.onrender.com";
const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const SUBJECTS = [
  { name: "Physics",          icon: "⚛",  accent: "#4C6EF5", bg: "#EEF3FF", dark: "#3B5BDB" },
  { name: "Chemistry",        icon: "⚗",  accent: "#E64980", bg: "#FFF0F6", dark: "#C2255C" },
  { name: "Mathematics",      icon: "∑",  accent: "#F08C00", bg: "#FFF9DB", dark: "#E67700" },
  { name: "Biology",          icon: "❧",  accent: "#2F9E44", bg: "#EDFAF3", dark: "#2B8A3E" },
  { name: "Computer Science", icon: "⌨",  accent: "#7048E8", bg: "#F3F0FF", dark: "#5F3DC4" },
  { name: "English",          icon: "✦",  accent: "#D9480F", bg: "#FFF4E6", dark: "#C03A0A" },
];

const SEEN_KEY = "seen_notes_ids";

export default function Notes() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seenIds, setSeenIds] = useState(new Set());

  const loadSeenIds = async () => {
    try {
      const raw = await SecureStore.getItemAsync(SEEN_KEY);
      if (raw) setSeenIds(new Set(JSON.parse(raw)));
    } catch (_) {}
  };

  const loadNotes = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const res = await fetch(`${API_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Failed to load notes", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSeenIds();
      loadNotes();
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); loadNotes(); };

  const getUnseenCount = (subjectName) =>
    notes.filter((n) => n.subject === subjectName && !seenIds.has(String(n.id))).length;

  const getNoteCount = (subjectName) =>
    notes.filter((n) => n.subject === subjectName).length;

  const handleSubjectPress = (subject) => {
    const subjectNotes = notes.filter((n) => n.subject === subject.name);
    router.push({
      pathname: "/subject-notes",
      params: {
        subjectJson: JSON.stringify(subject),
        notesJson: JSON.stringify(subjectNotes),
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4C6EF5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>Notes</Text>
      <Text style={styles.subheader}>Select a subject to browse</Text>

      <View style={styles.grid}>
        {SUBJECTS.map((subject) => {
          const unseen = getUnseenCount(subject.name);
          const total = getNoteCount(subject.name);

          return (
            <TouchableOpacity
              key={subject.name}
              style={[styles.card, { backgroundColor: subject.bg }]}
              activeOpacity={0.75}
              onPress={() => handleSubjectPress(subject)}
            >
              {unseen > 0 && (
                <View style={[styles.badge, { backgroundColor: subject.accent }]}>
                  <Text style={styles.badgeText}>{unseen}</Text>
                </View>
              )}

              <View style={[styles.iconCircle, { backgroundColor: subject.accent + "22" }]}>
                <Text style={[styles.icon, { color: subject.accent }]}>{subject.icon}</Text>
              </View>

              <Text style={[styles.subjectName, { color: subject.dark }]} numberOfLines={2}>
                {subject.name}
              </Text>

              <Text style={[styles.noteCount, { color: subject.accent }]}>
                {total} {total === 1 ? "note" : "notes"}
              </Text>

              <View style={[styles.arc, { borderColor: subject.accent + "18" }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F9FC" },
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  header: { fontSize: 34, fontWeight: "800", color: "#212529", marginTop: 56, letterSpacing: -0.8 },
  subheader: { fontSize: 14, color: "#ADB5BD", marginTop: 4, marginBottom: 28, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: {
    width: CARD_WIDTH, borderRadius: 22, padding: 20,
    overflow: "hidden", minHeight: 155,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  badge: {
    position: "absolute", top: 14, right: 14,
    minWidth: 22, height: 22, borderRadius: 11,
    justifyContent: "center", alignItems: "center", paddingHorizontal: 6, zIndex: 10,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  iconCircle: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  icon: { fontSize: 22, fontWeight: "600" },
  subjectName: { fontSize: 15, fontWeight: "800", lineHeight: 20, marginBottom: 6 },
  noteCount: { fontSize: 12, fontWeight: "600", opacity: 0.8 },
  arc: { position: "absolute", width: 110, height: 110, borderRadius: 55, borderWidth: 18, bottom: -40, right: -30 },
});