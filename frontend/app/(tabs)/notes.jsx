import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal
} from "react-native";

import { Picker } from "@react-native-picker/picker";

const API_URL = "http://10.64.244.177:5000";

export default function Notes() {

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  const [subject, setSubject] = useState("Physics");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  // ---------------- LOAD NOTES ----------------
  const loadNotes = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");

      const res = await fetch(`${API_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);

    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to load notes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  // ---------------- OPEN FILE ----------------
  const openFile = async (url, filename) => {
    try {

      const fileUri = FileSystem.documentDirectory + filename;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      let finalUri = fileUri;

      if (!fileInfo.exists) {
        console.log("Downloading:", url);

        const download = await FileSystem.downloadAsync(url, fileUri);

        finalUri = download.uri;
      }

      await IntentLauncher.startActivityAsync(
        "android.intent.action.VIEW",
        {
          data: finalUri,
          flags: 1,
          type: getMimeType(filename)
        }
      );

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Could not open file");
    }
  };

  // ---------------- MIME TYPE ----------------
  const getMimeType = (filename) => {

    const ext = filename.split(".").pop().toLowerCase();

    const types = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    };

    return types[ext] || "application/octet-stream";
  };

  // ---------------- PICK FILE ----------------
  const pickFile = async () => {

    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });

    if (!result.canceled) {
      setSelectedFile(result.assets[0]);
    }

  };

  // ---------------- UPLOAD NOTE ----------------
  const uploadNote = async () => {

    if (!selectedFile) {
      Alert.alert("Please select a file first");
      return;
    }

    try {

      setUploading(true);

      const token = await SecureStore.getItemAsync("userToken");

      const formData = new FormData();

      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/octet-stream"
      });

      // Upload file
      const uploadRes = await fetch(`${API_URL}/api/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const uploadData = await uploadRes.json();

      // Save note
      await fetch(`${API_URL}/api/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          title: title || selectedFile.name,
          description,
          fileUrl: uploadData.fileUrl,
          fileName: selectedFile.name
        })
      });

      Alert.alert("Success", "Note uploaded");

      setModalVisible(false);
      setSelectedFile(null);
      setTitle("");
      setDescription("");

      loadNotes();

    } catch (err) {

      console.log(err);
      Alert.alert("Upload failed");

    } finally {

      setUploading(false);

    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4c6ef5" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        <Text style={styles.header}>Class Notes</Text>

        {notes.length === 0 && (
          <Text style={styles.empty}>No notes uploaded yet</Text>
        )}

        {notes.map((note) => (

          <TouchableOpacity
            key={note.id}
            style={styles.noteCard}
            onPress={() => openFile(note.fileUrl, note.fileName)}
          >

            <View style={styles.subjectBadge}>
              <Text style={styles.subjectText}>{note.subject}</Text>
            </View>

            <Text style={styles.title}>{note.title}</Text>

            {note.description && (
              <Text style={styles.desc}>{note.description}</Text>
            )}

            {note.uploader && (
              <Text style={styles.uploader}>
                Uploaded by {note.uploader.name} ({note.uploader.rollNo})
              </Text>
            )}

          </TouchableOpacity>

        ))}

      </ScrollView>

      {/* Upload Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={modalVisible} animationType="slide">

        <ScrollView style={styles.modal}>

          <Text style={styles.modalTitle}>Upload Notes</Text>

          <Text style={styles.label}>Subject</Text>

          <View style={styles.dropdown}>
            <Picker
              selectedValue={subject}
              onValueChange={(value) => setSubject(value)}
            >
              <Picker.Item label="Physics" value="Physics" />
              <Picker.Item label="Chemistry" value="Chemistry" />
              <Picker.Item label="Mathematics" value="Mathematics" />
              <Picker.Item label="Biology" value="Biology" />
              <Picker.Item label="Computer Science" value="Computer Science" />
              <Picker.Item label="English" value="English" />
            </Picker>
          </View>

          <TextInput
            placeholder="Title (optional)"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            placeholder="Description (optional)"
            style={styles.input}
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
            <Text style={styles.fileText}>
              {selectedFile ? selectedFile.name : "Select File"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={uploadNote}
            disabled={uploading}
          >
            <Text style={styles.uploadText}>
              {uploading ? "Uploading..." : "Upload Notes"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setModalVisible(false)}
          >
            <Text style={{ color: "#888" }}>Cancel</Text>
          </TouchableOpacity>

        </ScrollView>

      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    padding: 20
  },

  header: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 50,
    marginBottom: 20
  },

  empty: {
    color: "#777",
    fontSize: 16
  },

  noteCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3
  },

  subjectBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#eef3ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },

  subjectText: {
    color: "#4c6ef5",
    fontWeight: "600",
    fontSize: 12
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8
  },

  desc: {
    marginTop: 6,
    color: "#666"
  },

  uploader: {
    marginTop: 12,
    fontSize: 12,
    color: "#888"
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 65,
    height: 65,
    backgroundColor: "#4c6ef5",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center"
  },

  fabText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "bold"
  },

  modal: {
    flex: 1,
    padding: 25,
    backgroundColor: "#fff"
  },

  modalTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 25
  },

  label: {
    fontWeight: "600",
    marginBottom: 5
  },

  dropdown: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 15
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15
  },

  fileBtn: {
    backgroundColor: "#f1f3f5",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20
  },

  fileText: {
    textAlign: "center",
    fontWeight: "500"
  },

  uploadBtn: {
    backgroundColor: "#4c6ef5",
    padding: 16,
    borderRadius: 10
  },

  uploadText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },

  cancelBtn: {
    marginTop: 20,
    alignItems: "center"
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }

});