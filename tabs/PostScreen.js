import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

// Base64 Cloudinary Upload Helper
const uploadToCloudinary = async (base64Img) => {
  if (!base64Img) return null;

  const CLOUD_NAME = "zwrleblh";
  const UPLOAD_PRESET = "unsigned_preset";

  const fileData = `data:image/jpeg;base64,${base64Img}`;

  const data = new FormData();
  data.append("file", fileData);
  data.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: data,
      },
    );

    const result = await response.json();
    if (result.secure_url) {
      return result.secure_url;
    } else {
      console.log("Cloudinary error response:", result);
      return null;
    }
  } catch (error) {
    console.log("Cloudinary upload catch error:", error);
    return null;
  }
};

export default function PostScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [publishing, setPublishing] = useState(false);

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Permission to access photo library is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Enables cropper UI
      quality: 0.7,
      base64: true,
      // aspect removed so cropping is free-form instead of locked to landscape
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const handlePublish = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to publish artwork.");
      return;
    }
    if (!imageBase64) {
      Alert.alert("Missing Image", "Please upload an artwork image.");
      return;
    }
    if (!title.trim() || !category.trim() || !description.trim()) {
      Alert.alert(
        "Missing Fields",
        "Please fill in all fields before publishing.",
      );
      return;
    }

    setPublishing(true);

    try {
      // 1. Upload base64 image to Cloudinary
      const uploadedCloudUrl = await uploadToCloudinary(imageBase64);

      if (!uploadedCloudUrl) {
        Alert.alert(
          "Upload Error",
          "Failed to upload image to cloud storage. Please try again.",
        );
        setPublishing(false);
        return;
      }

      // 2. Save document in Firestore with permanent cloud URL
      await addDoc(collection(db, "artworks"), {
        userId: user.uid,
        imageUri: uploadedCloudUrl,
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Your artwork post has been published!");
      setImageUri(null);
      setImageBase64(null);
      setTitle("");
      setCategory("");
      setDescription("");

      navigation.navigate("Account");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Create New Post</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.inputLabel}>Artwork Image</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={38}
                  color="#0284C7"
                />
                <Text style={styles.uploadTitle}>Tap to select from phone</Text>
                <Text style={styles.uploadSubtitle}>PNG, JPG or WEBP</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Cyberpunk Character Portrait"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Digital Art, Anime, 3D Render"
            placeholderTextColor="#9CA3AF"
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your artwork or commission details..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={styles.publishButton}
            onPress={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name="paper-plane"
                  size={18}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.publishButtonText}>Publish Post</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EBF6FF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 20 : 0,
  },
  container: { flex: 1 },
  headerRow: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0A2540" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  uploadBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#BAE6FD",
    borderStyle: "dashed",
    borderRadius: 16,
    height: 240, // Increased preview box height for portrait artwork
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "contain" },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0284C7",
    marginTop: 8,
  },
  uploadSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  textArea: { minHeight: 100 },
  publishButton: {
    backgroundColor: "#0284C7",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  publishButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
