import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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

export default function ServicesScreen({ navigation }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [artistProfile, setArtistProfile] = useState(null);

  const [selectedServiceImage, setSelectedServiceImage] = useState(null);

  const [packageName, setPackageName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setArtistProfile(userDoc.data());
      }
    };
    fetchProfile();

    const servicesQuery = query(
      collection(db, "services"),
      where("userId", "==", currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      servicesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setPackages(list);
        setLoading(false);
      },
      (error) => {
        console.log("Error loading services:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      quality: 0.7,
      base64: true, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const handleSavePackage = async () => {
    if (!packageName.trim() || !startingPrice.trim()) {
      Alert.alert(
        "Required Fields",
        "Please enter a package name and starting price.",
      );
      return;
    }

    setSaving(true);
    try {
      let cloudImageUrl = null;

      if (imageBase64) {
        cloudImageUrl = await uploadToCloudinary(imageBase64);
        if (!cloudImageUrl) {
          Alert.alert(
            "Upload Error",
            "Failed to upload sample artwork image to cloud storage.",
          );
          setSaving(false);
          return;
        }
      }

      const username =
        artistProfile?.username ||
        (currentUser?.email ? currentUser.email.split("@")[0] : "artist");

      await addDoc(collection(db, "services"), {
        userId: currentUser.uid,
        artistName: username,
        artistAvatarUri: artistProfile?.avatarUri || null,
        title: packageName.trim(),
        price: parseFloat(startingPrice) || 0,
        description: description.trim(),
        imageUri: cloudImageUrl,
        acceptsPaypal: true,
        createdAt: serverTimestamp(),
      });

      setPackageName("");
      setStartingPrice("");
      setDescription("");
      setImageUri(null);
      setImageBase64(null);
      setIsModalVisible(false);
      Alert.alert(
        "Success",
        "Your commission service package is now published!",
      );
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = (id) => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to remove this service package?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "services", id));
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#0A2540" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services & Pricing</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoTitle}>Commission Packages</Text>
            <Text style={styles.infoSub}>
              Set up custom tier options (e.g., Headshot, Bust-Up, Full Body) so
              clients know what to expect. Tap an image to view it in full size.
            </Text>
          </View>

          {/* Create New Package Button */}
          <TouchableOpacity
            style={styles.addPkgCardBtn}
            onPress={() => setIsModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={22} color="#0284C7" />
            <Text style={styles.addPkgText}>Create New Package</Text>
          </TouchableOpacity>

          {/* Published Services List */}
          {packages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="pricetag-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Services Created</Text>
              <Text style={styles.emptySub}>
                Tap 'Create New Package' above to list your first commission
                option!
              </Text>
            </View>
          ) : (
            packages.map((pkg) => (
              <View key={pkg.id} style={styles.pkgCard}>
                {pkg.imageUri && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setSelectedServiceImage(pkg.imageUri)}
                  >
                    <Image
                      source={{ uri: pkg.imageUri }}
                      style={styles.pkgCoverImage}
                    />
                    <View style={styles.zoomHintBadge}>
                      <Ionicons name="expand-outline" size={14} color="#FFF" />
                      <Text style={styles.zoomHintText}>Tap to view full</Text>
                    </View>
                  </TouchableOpacity>
                )}
                <View style={styles.pkgContent}>
                  <View style={styles.pkgTop}>
                    <Text style={styles.pkgName}>{pkg.title}</Text>
                    <Text style={styles.pkgPrice}>${pkg.price}</Text>
                  </View>

                  {pkg.description ? (
                    <Text style={styles.pkgDesc}>{pkg.description}</Text>
                  ) : null}

                  <View style={styles.paypalRow}>
                    <Ionicons name="logo-paypal" size={14} color="#003087" />
                    <Text style={styles.paypalText}>
                      Accepts PayPal Payments
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteService(pkg.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>Remove Service</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* 1. Create Package Modal */}
        <Modal visible={isModalVisible} animationType="fade" transparent={true}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalHeaderTitle}>
                  New Commission Package
                </Text>

                <Text style={styles.inputLabel}>Package Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Full Body Character"
                  placeholderTextColor="#A1A1AA"
                  value={packageName}
                  onChangeText={setPackageName}
                />

                <Text style={styles.inputLabel}>Starting Price ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 50"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="numeric"
                  value={startingPrice}
                  onChangeText={setStartingPrice}
                />

                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Include details like commercial rights, resolution, turnaround time..."
                  placeholderTextColor="#A1A1AA"
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />

                <Text style={styles.inputLabel}>Sample Artwork Image</Text>
                <TouchableOpacity
                  style={styles.imagePickerBox}
                  onPress={handlePickImage}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.pickedImagePreview}
                    />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={28}
                        color="#0284C7"
                      />
                      <Text style={styles.imagePickerText}>
                        Upload Sample Artwork
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Save Package Button */}
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSavePackage}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Package</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelTextBtn}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.cancelTextBtnLabel}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* 2. Full-Size Image Viewer Modal */}
        {selectedServiceImage && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedServiceImage(null)}
          >
            <View style={styles.fullImageViewerOverlay}>
              <TouchableOpacity
                style={styles.closeFullImageBtn}
                onPress={() => setSelectedServiceImage(null)}
              >
                <Ionicons name="close-circle" size={36} color="#FFF" />
              </TouchableOpacity>
              <Image
                source={{ uri: selectedServiceImage }}
                style={styles.fullImageViewerImage}
              />
            </View>
          </Modal>
        )}
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  infoBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
  },
  infoSub: { fontSize: 13, color: "#64748B", lineHeight: 18 },
  addPkgCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#0284C7",
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 8,
  },
  addPkgText: { color: "#0284C7", fontWeight: "800", fontSize: 15 },
  pkgCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 2,
    marginBottom: 14,
    position: "relative",
  },
  pkgCoverImage: { width: "100%", height: 150, resizeMode: "cover" },
  zoomHintBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  zoomHintText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  pkgContent: { padding: 16 },
  pkgTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pkgName: { fontSize: 16, fontWeight: "800", color: "#0A2540" },
  pkgPrice: { fontSize: 18, fontWeight: "900", color: "#16A34A" },
  pkgDesc: { fontSize: 13, color: "#475569", lineHeight: 18, marginBottom: 8 },
  paypalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  paypalText: { fontSize: 12, color: "#003087", fontWeight: "700" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
  },
  deleteBtnText: { color: "#EF4444", fontSize: 12, fontWeight: "700" },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 36,
    backgroundColor: "#FFF",
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A2540",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    maxHeight: "85%",
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 14,
  },
  multilineInput: {
    height: 70,
    textAlignVertical: "top",
  },
  imagePickerBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  pickedImagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePickerPlaceholder: { alignItems: "center", gap: 4 },
  imagePickerText: { fontSize: 12, fontWeight: "700", color: "#0284C7" },
  saveBtn: {
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  cancelTextBtn: { alignItems: "center", paddingVertical: 8 },
  cancelTextBtnLabel: { color: "#64748B", fontWeight: "700", fontSize: 15 },
  fullImageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  closeFullImageBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullImageViewerImage: {
    width: "100%",
    height: "80%",
    resizeMode: "contain",
  },
});
