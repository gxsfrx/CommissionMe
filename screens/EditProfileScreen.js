import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
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

export default function EditProfileScreen({ navigation }) {
  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile States
  const [bannerUri, setBannerUri] = useState(null);
  const [bannerBase64, setBannerBase64] = useState(null);

  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState(null);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  // Social Links States
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [portfolio, setPortfolio] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const docRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setUsername(
            data.username ||
              (currentUser.email ? currentUser.email.split("@")[0] : ""),
          );
          setBio(data.bio || "");
          setBannerUri(data.bannerUri || null);
          setAvatarUri(data.avatarUri || null);
          setInstagram(data.socials?.instagram || "");
          setTwitter(data.socials?.twitter || "");
          setPortfolio(data.socials?.portfolio || "");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  const pickImage = async (
    setImageUriState,
    setImageBase64State,
    aspect = [1, 1],
  ) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Permission to access photo library is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect,
      quality: 0.7,
      base64: true, // Enabled base64 output
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUriState(result.assets[0].uri);
      setImageBase64State(result.assets[0].base64);
    }
  };

  const handleSave = async () => {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      Alert.alert("Error", "Username cannot be empty.");
      return;
    }

    if (cleanUsername.includes(" ")) {
      Alert.alert("Error", "Username cannot contain spaces.");
      return;
    }

    setSaving(true);

    try {
      let finalBannerUrl = bannerUri;
      let finalAvatarUrl = avatarUri;

      // 1. If user picked a new banner image, upload base64 to Cloudinary
      if (bannerBase64) {
        const uploadedBanner = await uploadToCloudinary(bannerBase64);
        if (uploadedBanner) {
          finalBannerUrl = uploadedBanner;
        } else {
          Alert.alert("Upload Warning", "Could not upload new banner image.");
        }
      }

      // 2. If user picked a new avatar image, upload base64 to Cloudinary
      if (avatarBase64) {
        const uploadedAvatar = await uploadToCloudinary(avatarBase64);
        if (uploadedAvatar) {
          finalAvatarUrl = uploadedAvatar;
        } else {
          Alert.alert("Upload Warning", "Could not upload new avatar image.");
        }
      }

      // 3. Save permanent URLs and profile updates to Firestore
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        username: cleanUsername,
        bio: bio.trim(),
        bannerUri: finalBannerUrl || "",
        avatarUri: finalAvatarUrl || "",
        socials: {
          instagram: instagram.trim(),
          twitter: twitter.trim(),
          portfolio: portfolio.trim(),
        },
      });

      Alert.alert("Success", "Profile updated successfully!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#0A2540" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner & Avatar Upload Card */}
          <View style={styles.imageSectionCard}>
            {/* Banner Image / Picker */}
            <TouchableOpacity
              style={styles.bannerPicker}
              onPress={() => pickImage(setBannerUri, setBannerBase64, [3, 1])}
            >
              {bannerUri ? (
                <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Ionicons name="camera-outline" size={26} color="#0284C7" />
                  <Text style={styles.uploadBannerText}>Upload Banner</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Avatar Image / Picker */}
            <TouchableOpacity
              style={styles.avatarPicker}
              onPress={() => pickImage(setAvatarUri, setAvatarBase64, [1, 1])}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={22} color="#0284C7" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Fields Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="e.g. alexrivera"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell clients or artists about yourself..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Social Links Sub-Section */}
            <Text style={styles.sectionHeading}>Social Links</Text>

            <View style={styles.socialInputRow}>
              <FontAwesome5
                name="instagram"
                size={18}
                color="#E1306C"
                style={styles.socialIcon}
              />
              <TextInput
                style={styles.socialInput}
                placeholder="Instagram handle or URL"
                placeholderTextColor="#9CA3AF"
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.socialInputRow}>
              <FontAwesome5
                name="twitter"
                size={18}
                color="#1DA1F2"
                style={styles.socialIcon}
              />
              <TextInput
                style={styles.socialInput}
                placeholder="Twitter/X handle or URL"
                placeholderTextColor="#9CA3AF"
                value={twitter}
                onChangeText={setTwitter}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.socialInputRow}>
              <Ionicons
                name="globe-outline"
                size={18}
                color="#0284C7"
                style={styles.socialIcon}
              />
              <TextInput
                style={styles.socialInput}
                placeholder="Portfolio URL (e.g. ArtStation, personal site)"
                placeholderTextColor="#9CA3AF"
                value={portfolio}
                onChangeText={setPortfolio}
                autoCapitalize="none"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
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
  loadingSafeArea: {
    flex: 1,
    backgroundColor: "#EBF6FF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#0A2540",
  },
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0A2540" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  imageSectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  bannerPicker: {
    width: "100%",
    height: 110,
    backgroundColor: "#BAE6FD",
  },
  bannerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  bannerPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
    marginTop: 4,
  },
  avatarPicker: {
    marginTop: -35,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E0F2FE",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  textArea: { minHeight: 80 },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0A2540",
    marginTop: 20,
    marginBottom: 10,
  },
  socialInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  socialIcon: { marginRight: 10 },
  socialInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  saveButton: {
    backgroundColor: "#0284C7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
