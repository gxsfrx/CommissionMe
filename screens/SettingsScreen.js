import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

export default function SettingsScreen({ navigation }) {
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  const [userRole, setUserRole] = useState("CLIENT");

  const currentUser = auth.currentUser;

  // Real-time listener to check if user role is artist or client
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role || "CLIENT");
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: "SignIn" }],
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const isArtist = userRole === "ARTIST";

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
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            {/* My Purchases */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("MyPurchases")}
            >
              <Ionicons name="bag-handle-outline" size={20} color="#0284C7" />
              <Text style={styles.settingText}>My Purchases</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Wallet Screen */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("Wallet")}
            >
              <Ionicons name="wallet-outline" size={20} color="#16A34A" />
              <Text style={styles.settingText}>Wallet</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Become Artist / Artist Dashboard (Dynamic) */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                navigation.navigate("MainTabs", { screen: "Dashboard" })
              }
            >
              <MaterialCommunityIcons
                name={isArtist ? "view-dashboard-outline" : "palette-outline"}
                size={20}
                color={isArtist ? "#0284C7" : "#D97706"}
              />
              <Text style={styles.settingText}>
                {isArtist ? "Artist Dashboard" : "Become Artist"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() => setIsPrivacyVisible(true)}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#9333EA"
              />
              <Text style={styles.settingText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Solid Blue Log Out Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* PRIVACY POLICY MODAL */}
        <Modal
          visible={isPrivacyVisible}
          animationType="slide"
          transparent={false}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setIsPrivacyVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color="#0A2540" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Privacy Policy</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.policyTitle}>
                CommissionMe Privacy Policy
              </Text>
              <Text style={styles.policyUpdated}>
                Last updated: October 2026
              </Text>

              <Text style={styles.policyHeading}>1. Data We Collect</Text>
              <Text style={styles.policyParagraph}>
                We collect essential account details such as your username,
                email, and commission brief requests to facilitate custom
                digital art transactions.
              </Text>

              <Text style={styles.policyHeading}>2. Artwork Ownership</Text>
              <Text style={styles.policyParagraph}>
                Your reference images and purchased digital artworks remain
                private between you and the artist according to commission
                agreement terms.
              </Text>

              <Text style={styles.policyHeading}>3. Security</Text>
              <Text style={styles.policyParagraph}>
                All account data, wallet transactions, and cloud files are
                protected using encrypted Google Firebase authentication.
              </Text>
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    elevation: 2,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: "#0284C7",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  logoutText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  modalSafeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#0A2540" },
  modalContent: { padding: 20 },
  policyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 4,
  },
  policyUpdated: { fontSize: 12, color: "#64748B", marginBottom: 16 },
  policyHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0284C7",
    marginTop: 14,
    marginBottom: 4,
  },
  policyParagraph: { fontSize: 14, color: "#334155", lineHeight: 20 },
});
