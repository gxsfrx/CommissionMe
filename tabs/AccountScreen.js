import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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

export default function AccountScreen({ navigation }) {
  const [userData, setUserData] = useState({
    username: "user",
    role: "CLIENT",
  });
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPost, setSelectedPost] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    });

    const postsQuery = query(
      collection(db, "artworks"),
      where("userId", "==", currentUser.uid),
    );

    const unsubscribePosts = onSnapshot(
      postsQuery,
      (snapshot) => {
        const userPosts = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setArtworks(userPosts);
        setLoading(false);
      },
      (error) => {
        console.log("Error loading posts:", error);
        setLoading(false);
      },
    );

    return () => {
      unsubscribeUser();
      unsubscribePosts();
    };
  }, [currentUser]);

  const openSocialLink = (url) => {
    if (!url) return;
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(formattedUrl).catch(() =>
      Alert.alert("Error", "Unable to open link."),
    );
  };

  const openPostModal = (post) => {
    setSelectedPost(post);
    setEditTitle(post.title);
    setEditCategory(post.category);
    setEditDescription(post.description);
    setIsEditing(false);
  };

  const closePostModal = () => {
    setSelectedPost(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editCategory.trim() || !editDescription.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      const postRef = doc(db, "artworks", selectedPost.id);
      await updateDoc(postRef, {
        title: editTitle,
        category: editCategory,
        description: editDescription,
      });

      setSelectedPost({
        ...selectedPost,
        title: editTitle,
        category: editCategory,
        description: editDescription,
      });
      setIsEditing(false);
      Alert.alert("Updated", "Your post has been updated.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleDeletePost = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this artwork?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "artworks", selectedPost.id));
              closePostModal();
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            {/* Custom Banner Image or Default Light Sky Blue */}
            {userData.bannerUri ? (
              <Image
                source={{ uri: userData.bannerUri }}
                style={styles.bannerImage}
              />
            ) : (
              <View style={styles.bannerHeader} />
            )}

            {/* Top Right Settings Button Overlay */}
            <TouchableOpacity
              style={styles.settingsBannerButton}
              onPress={() => navigation.navigate("Settings")}
            >
              <Ionicons name="settings-outline" size={20} color="#0A2540" />
            </TouchableOpacity>

            {/* Custom Avatar Image or Default Icon */}
            <View style={styles.avatarContainer}>
              {userData.avatarUri ? (
                <Image
                  source={{ uri: userData.avatarUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={40} color="#0284C7" />
              )}
            </View>

            {/* Dynamic Username */}
            <Text style={styles.usernameText}>
              @
              {userData.username ||
                (currentUser?.email ? currentUser.email.split("@")[0] : "user")}
            </Text>

            {/* Role Badge */}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                Role: {userData.role || "CLIENT"}
              </Text>
            </View>

            {/* Bio Section */}
            {userData.bio ? (
              <Text style={styles.bioText}>{userData.bio}</Text>
            ) : null}

            {/* Social Links Row */}
            {userData.socials &&
            (userData.socials.instagram ||
              userData.socials.twitter ||
              userData.socials.portfolio) ? (
              <View style={styles.socialsRow}>
                {userData.socials.instagram ? (
                  <TouchableOpacity
                    style={styles.socialBadge}
                    onPress={() => openSocialLink(userData.socials.instagram)}
                  >
                    <FontAwesome5 name="instagram" size={16} color="#E1306C" />
                  </TouchableOpacity>
                ) : null}

                {userData.socials.twitter ? (
                  <TouchableOpacity
                    style={styles.socialBadge}
                    onPress={() => openSocialLink(userData.socials.twitter)}
                  >
                    <FontAwesome5 name="twitter" size={16} color="#1DA1F2" />
                  </TouchableOpacity>
                ) : null}

                {userData.socials.portfolio ? (
                  <TouchableOpacity
                    style={styles.socialBadge}
                    onPress={() => openSocialLink(userData.socials.portfolio)}
                  >
                    <Ionicons name="globe-outline" size={18} color="#0284C7" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* Quick Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate("EditProfile")}
              >
                <Text style={styles.actionBtnText}>Edit profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate("Dashboard")}
              >
                <Text style={styles.actionBtnText}>Artist dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate("Bookmarks")}
              >
                <Text style={styles.actionBtnText}>Bookmarks</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section Header */}
          <View style={styles.artworksHeaderRow}>
            <Text style={styles.sectionTitle}>
              My Artworks ({artworks.length})
            </Text>
            <TouchableOpacity
              style={styles.newPostButton}
              onPress={() => navigation.navigate("Post")}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.newPostText}>New Post</Text>
            </TouchableOpacity>
          </View>

          {/* Artworks List / Empty State */}
          {artworks.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons
                  name="image-outline"
                  size={40}
                  color="#6B7280"
                />
              </View>
              <Text style={styles.emptyTitle}>No art posts yet</Text>
              <Text style={styles.emptySubtitle}>
                Share your first commission or artwork to build your portfolio!
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {artworks.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.artCard}
                  onPress={() => openPostModal(item)}
                >
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.artImage}
                  />
                  <Text style={styles.artTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.artCategory} numberOfLines={1}>
                    {item.category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* View / Edit / Delete Modal */}
        {selectedPost && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={closePostModal}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalIconBtn}
                    onPress={closePostModal}
                  >
                    <Ionicons name="close" size={24} color="#374151" />
                  </TouchableOpacity>

                  <View style={styles.modalActionsRight}>
                    <TouchableOpacity
                      style={styles.modalIconBtn}
                      onPress={() => setIsEditing(!isEditing)}
                    >
                      <Ionicons name="pencil" size={20} color="#0284C7" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalIconBtn}
                      onPress={handleDeletePost}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Image
                    source={{ uri: selectedPost.imageUri }}
                    style={styles.modalImage}
                  />

                  {!isEditing ? (
                    <View style={styles.modalDetails}>
                      <Text style={styles.modalTitleText}>
                        {selectedPost.title}
                      </Text>
                      <Text style={styles.modalCategoryBadge}>
                        {selectedPost.category}
                      </Text>
                      <Text style={styles.modalDescription}>
                        {selectedPost.description}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.modalEditForm}>
                      <Text style={styles.editLabel}>Edit Title</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editTitle}
                        onChangeText={setEditTitle}
                      />

                      <Text style={styles.editLabel}>Edit Category</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editCategory}
                        onChangeText={setEditCategory}
                      />

                      <Text style={styles.editLabel}>Edit Description</Text>
                      <TextInput
                        style={[styles.editInput, { minHeight: 80 }]}
                        value={editDescription}
                        onChangeText={setEditDescription}
                        multiline
                      />

                      <TouchableOpacity
                        style={styles.saveEditBtn}
                        onPress={handleSaveEdit}
                      >
                        <Text style={styles.saveEditBtnText}>Save Changes</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
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
  loadingSafeArea: { flex: 1, backgroundColor: "#EBF6FF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#0A2540",
  },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingBottom: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    overflow: "hidden",
    position: "relative",
  },
  bannerHeader: { width: "100%", height: 100, backgroundColor: "#BAE6FD" },
  bannerImage: { width: "100%", height: 100, resizeMode: "cover" },
  settingsBannerButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  avatarContainer: {
    marginTop: -35,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E0F2FE",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  usernameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleText: { color: "#0284C7", fontWeight: "700", fontSize: 12 },
  bioText: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    lineHeight: 18,
  },
  socialsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  socialBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FAFAFA",
  },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  artworksHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0A2540" },
  newPostButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newPostText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 2,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    elevation: 2,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  artCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 8,
    elevation: 2,
  },
  artImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    resizeMode: "cover",
  },
  artTitle: { fontSize: 14, fontWeight: "700", color: "#0A2540", marginTop: 8 },
  artCategory: { fontSize: 12, color: "#0284C7", marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyModelBetween: "space-between",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalActionsRight: { flexDirection: "row", gap: 8 },
  modalIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    marginBottom: 12,
    resizeMode: "contain",
    backgroundColor: "#F8FAFC",
  },
  modalDetails: { paddingHorizontal: 4 },
  modalTitleText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 6,
  },
  modalCategoryBadge: {
    fontSize: 13,
    color: "#0284C7",
    fontWeight: "600",
    marginBottom: 10,
  },
  modalDescription: { fontSize: 14, color: "#475569", lineHeight: 20 },
  modalEditForm: { marginTop: 8 },
  editLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  saveEditBtn: {
    backgroundColor: "#0284C7",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  saveEditBtnText: { color: "#FFF", fontWeight: "700" },
});
