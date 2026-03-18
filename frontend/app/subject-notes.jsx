import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";

import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput, Modal,
  Animated, TouchableWithoutFeedback,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { API_URL } from "../utils/api";
const SEEN_KEY = "seen_notes_ids";

// ── Bottom sheet ──────────────────────────────────────────────────────────────
function FileActionSheet({ visible, onClose, onOpen, onDownload, filename, accent }) {
  const slideAnim = useRef(new Animated.Value(320)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 320, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={sheet.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[sheet.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[sheet.container, { transform: [{ translateY: slideAnim }] }]}>
        <View style={sheet.handle} />
        <Text style={sheet.filename} numberOfLines={1}>{filename}</Text>
        <Text style={sheet.subtitle}>Choose an action</Text>
        <View style={sheet.divider} />

        <TouchableOpacity style={sheet.actionRow} onPress={onOpen} activeOpacity={0.7}>
          <View style={[sheet.iconBox, { backgroundColor: accent + "18" }]}>
            <Text style={[sheet.iconText, { color: accent }]}>↗</Text>
          </View>
          <View style={sheet.actionText}>
            <Text style={sheet.actionTitle}>Open</Text>
            <Text style={sheet.actionDesc}>View in built-in reader</Text>
          </View>
          <Text style={sheet.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={sheet.actionRow} onPress={onDownload} activeOpacity={0.7}>
          <View style={[sheet.iconBox, { backgroundColor: "#EDFAF3" }]}>
            <Text style={[sheet.iconText, { color: "#2F9E44" }]}>↓</Text>
          </View>
          <View style={sheet.actionText}>
            <Text style={sheet.actionTitle}>Download</Text>
            <Text style={sheet.actionDesc}>Save to device storage</Text>
          </View>
          <Text style={sheet.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={sheet.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={sheet.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SubjectNotes() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const subject = JSON.parse(params.subjectJson);

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeNote, setActiveNote] = useState(null);

  useEffect(() => { loadNotes(); }, []);

  const markAllSeen = async (noteList) => {
    try {
      const raw = await SecureStore.getItemAsync(SEEN_KEY);
      const existing = raw ? new Set(JSON.parse(raw)) : new Set();
      noteList.forEach((n) => existing.add(String(n.id)));
      await SecureStore.setItemAsync(SEEN_KEY, JSON.stringify([...existing]));
    } catch (_) {}
  };

  const loadNotes = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const res = await fetch(`${API_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const filtered = Array.isArray(data)
        ? data.filter((n) => n.subject === subject.name)
        : [];
      setNotes(filtered);
      markAllSeen(filtered);
    } catch (err) {
      Alert.alert("Error", "Failed to load notes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadNotes(); };

  const handleNotePress = (note) => { setActiveNote(note); setSheetVisible(true); };

  const handleOpen = async () => {
    setSheetVisible(false);
    if (!activeNote?.fileUrl) return;
    try { await WebBrowser.openBrowserAsync(activeNote.fileUrl); }
    catch { Alert.alert("Error", "Could not open file."); }
  };

  const handleDownload = async () => {
    setSheetVisible(false);
    if (!activeNote?.fileUrl) return;
    const { fileUrl, fileName } = activeNote;
    const safeFilename = fileName || "downloaded_file";
    const fileUri = FileSystem.documentDirectory + safeFilename;
    setDownloading(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true });
      const download = await FileSystem.downloadAsync(fileUrl, fileUri);
      if (download.status !== 200) throw new Error(`HTTP ${download.status}`);
      const info = await FileSystem.getInfoAsync(download.uri);
      if (!info.exists || info.size === 0) throw new Error("File is empty.");
      const isPdf = safeFilename.toLowerCase().endsWith(".pdf");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri, {
          mimeType: isPdf ? "application/pdf" : "*/*",
          UTI: isPdf ? "com.adobe.pdf" : "public.data",
        });
      } else {
        Alert.alert("Downloaded", `${safeFilename} saved!`);
      }
    } catch (error) {
      Alert.alert("Download Failed", error.message);
    } finally {
      setDownloading(false);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled && result.assets?.length > 0) setSelectedFile(result.assets[0]);
  };

  const uploadNote = async () => {
    if (!selectedFile) { Alert.alert("Please select a file first"); return; }
    try {
      setUploading(true);
      const token = await SecureStore.getItemAsync("userToken");
      const formData = new FormData();
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/octet-stream",
      });
      const uploadRes = await fetch(`${API_URL}/api/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.fileUrl) throw new Error("File URL missing");

      const noteRes = await fetch(`${API_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: subject.name,
          title: title || selectedFile.name,
          description,
          fileUrl: uploadData.fileUrl,
          fileName: selectedFile.name,
        }),
      });
      if (!noteRes.ok) {
        const e = await noteRes.json();
        throw new Error(e.error || "Failed to save note");
      }
      Alert.alert("Success", "Note uploaded!");
      setModalVisible(false);
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      loadNotes();
    } catch (err) {
      Alert.alert("Upload Failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FC" }}>

      {downloading && (
        <View style={styles.downloadOverlay}>
          <View style={styles.downloadBox}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.downloadText}>Downloading...</Text>
          </View>
        </View>
      )}

      {/* Colored header */}
      <View style={[styles.headerBand, { backgroundColor: subject.bg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: subject.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: subject.accent + "22" }]}>
          <Text style={[styles.headerIconText, { color: subject.accent }]}>{subject.icon}</Text>
        </View>
        <Text style={[styles.headerTitle, { color: subject.dark }]}>{subject.name}</Text>
        <Text style={[styles.headerCount, { color: subject.accent }]}>
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={subject.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {notes.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptyDesc}>Tap + to upload the first one</Text>
            </View>
          )}

          {notes.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={styles.noteCard}
              onPress={() => handleNotePress(note)}
              activeOpacity={0.75}
            >
              <View style={[styles.leftBar, { backgroundColor: subject.accent }]} />
              <View style={[styles.fileTypePill, { backgroundColor: subject.accent + "15" }]}>
                <Text style={[styles.fileTypeText, { color: subject.accent }]}>
                  {note.fileName?.split(".").pop()?.toUpperCase() || "FILE"}
                </Text>
              </View>
              <Text style={styles.noteTitle}>{note.title}</Text>
              {note.description ? <Text style={styles.noteDesc}>{note.description}</Text> : null}
              <View style={styles.cardFooter}>
                {note.uploader ? (
                  <Text style={styles.uploader}>{note.uploader.name} · {note.uploader.rollNo}</Text>
                ) : null}
                <View style={[styles.tapHint, { backgroundColor: subject.accent + "12" }]}>
                  <Text style={[styles.tapHintText, { color: subject.accent }]}>Tap to open</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: subject.accent, shadowColor: subject.accent }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <FileActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onOpen={handleOpen}
        onDownload={handleDownload}
        filename={activeNote?.fileName || activeNote?.title || "File"}
        accent={subject.accent}
      />

      <Modal visible={modalVisible} animationType="slide">
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 60 }}>
          <Text style={[styles.modalTitle, { color: subject.dark }]}>
            Upload to {subject.name}
          </Text>

          <Text style={styles.label}>Title</Text>
          <TextInput placeholder="Optional" style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor="#ADB5BD" />

          <Text style={styles.label}>Description</Text>
          <TextInput placeholder="Optional" style={[styles.input, { height: 80, textAlignVertical: "top" }]} value={description} onChangeText={setDescription} multiline placeholderTextColor="#ADB5BD" />

          <TouchableOpacity style={styles.fileBtn} onPress={pickFile} activeOpacity={0.7}>
            {selectedFile ? (
              <View>
                <Text style={styles.fileBtnLabel}>Selected file</Text>
                <Text style={[styles.fileBtnName, { color: subject.accent }]} numberOfLines={1}>{selectedFile.name}</Text>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <Text style={styles.fileBtnPlus}>+</Text>
                <Text style={styles.fileBtnLabel}>Select a file</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadBtn, { backgroundColor: subject.accent }, uploading && { opacity: 0.6 }]}
            onPress={uploadNote}
            disabled={uploading}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadText}>{uploading ? "Uploading..." : "Upload"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtnRow} onPress={() => setModalVisible(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBand: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  backBtn: { marginBottom: 16 },
  backArrow: { fontSize: 24, fontWeight: "600" },
  headerIcon: { width: 52, height: 52, borderRadius: 15, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  headerIconText: { fontSize: 24 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6, marginBottom: 2 },
  headerCount: { fontSize: 13, fontWeight: "600" },
  list: { padding: 16, paddingBottom: 120 },
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#495057" },
  emptyDesc: { fontSize: 14, color: "#ADB5BD", marginTop: 4 },
  noteCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, paddingLeft: 22, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: "hidden" },
  leftBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  fileTypePill: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7, marginBottom: 8 },
  fileTypeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  noteTitle: { fontSize: 16, fontWeight: "700", color: "#212529", marginBottom: 4 },
  noteDesc: { fontSize: 13, color: "#868E96", lineHeight: 18, marginBottom: 6 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  uploader: { fontSize: 12, color: "#ADB5BD", fontWeight: "500" },
  tapHint: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tapHintText: { fontSize: 11, fontWeight: "600" },
  downloadOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: "flex-end", paddingBottom: 110, alignItems: "center" },
  downloadBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#212529", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, gap: 10, elevation: 8 },
  downloadText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  fab: { position: "absolute", bottom: 32, right: 22, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabText: { color: "#fff", fontSize: 30, fontWeight: "300", marginTop: -2 },
  modal: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 24 },
  modalTitle: { fontSize: 26, fontWeight: "800", marginTop: 56, marginBottom: 28, letterSpacing: -0.5 },
  label: { fontSize: 12, fontWeight: "700", color: "#868E96", marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" },
  input: { borderWidth: 1.5, borderColor: "#E9ECEF", borderRadius: 12, padding: 14, fontSize: 15, color: "#212529", marginBottom: 20 },
  fileBtn: { borderWidth: 2, borderColor: "#E9ECEF", borderStyle: "dashed", borderRadius: 14, padding: 24, alignItems: "center", marginBottom: 20 },
  fileBtnPlus: { fontSize: 28, color: "#ADB5BD", marginBottom: 4 },
  fileBtnLabel: { fontSize: 13, color: "#ADB5BD", fontWeight: "600" },
  fileBtnName: { fontSize: 14, fontWeight: "700", marginTop: 4, textAlign: "center" },
  uploadBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 12 },
  uploadText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.3 },
  cancelBtnRow: { alignItems: "center", paddingVertical: 12 },
  cancelBtnText: { color: "#ADB5BD", fontSize: 15, fontWeight: "600" },
});

const sheet = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  container: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: 36, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  handle: { width: 40, height: 4, backgroundColor: "#DEE2E6", borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 20 },
  filename: { fontSize: 16, fontWeight: "700", color: "#212529", marginBottom: 2 },
  subtitle: { fontSize: 13, color: "#ADB5BD", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#F1F3F5", marginBottom: 16 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 },
  iconBox: { width: 46, height: 46, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  iconText: { fontSize: 20, fontWeight: "600" },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: "700", color: "#212529" },
  actionDesc: { fontSize: 13, color: "#ADB5BD", marginTop: 1 },
  chevron: { fontSize: 22, color: "#DEE2E6" },
  cancelBtn: { marginTop: 8, backgroundColor: "#F8F9FA", borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#868E96" },
});