import { Ionicons } from "@expo/vector-icons";
import {
  collection,
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

export default function DashboardScreen({ navigation }) {
  const [role, setRole] = useState("CLIENT");
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const [totalEarnings, setTotalEarnings] = useState(0.0);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setRole(docSnap.data().role || "CLIENT");
        }
        setLoading(false);
      },
      (error) => {
        console.log("Error fetching user role:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || role !== "ARTIST") return;

    const q = query(
      collection(db, "orders"),
      where("artistId", "==", currentUser.uid),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let earningsSum = 0;
      let active = 0;
      let completed = 0;

      snapshot.docs.forEach((docSnap) => {
        const order = docSnap.data();
        if (order.status === "accepted") {
          active += 1;
        } else if (order.status === "completed") {
          completed += 1;
          const cleanPrice =
            parseFloat(String(order.price || "0").replace(/[^0-9.]/g, "")) || 0;
          earningsSum += cleanPrice;
        }
      });

      setTotalEarnings(earningsSum);
      setActiveCount(active);
      setCompletedCount(completed);
    });

    return () => unsubscribe();
  }, [currentUser, role]);

  const handleConfirmUpgrade = async () => {
    if (!agreed) {
      Alert.alert(
        "Agreement Required",
        "Please agree to the Creator Terms & Services.",
      );
      return;
    }

    setUpgrading(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { role: "ARTIST" });
      setIsModalVisible(false);
      Alert.alert(
        "Congratulations!",
        "Your account has been upgraded to Artist.",
      );
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setUpgrading(false);
    }
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

  if (role !== "ARTIST") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.restrictedCard}>
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={28} color="#0284C7" />
            </View>

            <Text style={styles.cardTitle}>Artist Dashboard Restricted</Text>
            <Text style={styles.cardSubtitle}>
              This section is reserved for verified creators. To manage
              commissions and sell your work, apply to become an artist.
            </Text>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setAgreed(false);
                setIsModalVisible(true);
              }}
            >
              <Text style={styles.applyButtonText}>Become an Artist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.navigate("Market")}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ARTIST VERIFICATION MODAL */}
        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.verificationModalCard}>
              <View style={styles.questionBadge}>
                <Text style={styles.questionText}>?</Text>
              </View>

              <Text style={styles.modalTitle}>Artist Account Verification</Text>
              <Text style={styles.modalSubText}>
                By upgrading to an Artist Account, you agree to fulfill client
                commissions, uphold portfolio originality, and follow our
                marketplace seller guidelines.
              </Text>

              <View style={styles.termsBox}>
                <Text style={styles.termsTitle}>
                  Creator Terms & Guidelines:
                </Text>
                <Text style={styles.bulletItem}>
                  • Deliver custom artwork on agreed deadlines.
                </Text>
                <Text style={styles.bulletItem}>
                  • Post original art without copyright violation.
                </Text>
                <Text style={styles.bulletItem}>
                  • Maintain professional client communication.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.checkbox, agreed && styles.checkboxChecked]}
                >
                  {agreed && (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the Creator Terms & Services
                </Text>
              </TouchableOpacity>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalConfirmBtn,
                    agreed ? styles.confirmActive : styles.confirmDisabled,
                  ]}
                  onPress={handleConfirmUpgrade}
                  disabled={!agreed || upgrading}
                >
                  {upgrading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirm Upgrade</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.dashHeaderTitle}>Artist Dashboard</Text>
        <Text style={styles.dashHeaderSub}>
          Manage your active commissions and services
        </Text>

        {/* Total Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsLabel}>TOTAL EARNINGS</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          <Text style={styles.earningsAmount}>${totalEarnings.toFixed(2)}</Text>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{activeCount}</Text>
              <Text style={styles.statLabel}>Active Commissions</Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Creator Management Grid */}
        <Text style={styles.sectionHeaderTitle}>Creator Management</Text>

        <View style={styles.gridRow}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate("Commissions")}
          >
            <View style={[styles.gridIconBox, { backgroundColor: "#E0F2FE" }]}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color="#0284C7"
              />
            </View>
            <Text style={styles.gridCardTitle}>Commissions</Text>
            <Text style={styles.gridCardSub}>Track milestones & requests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate("Orders")}
          >
            <View style={[styles.gridIconBox, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="cart-outline" size={22} color="#D97706" />
            </View>
            <Text style={styles.gridCardTitle}>Orders</Text>
            <Text style={styles.gridCardSub}>
              Manage incoming client orders
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate("Services")}
          >
            <View style={[styles.gridIconBox, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="pricetag-outline" size={22} color="#16A34A" />
            </View>
            <Text style={styles.gridCardTitle}>Services & Pricing</Text>
            <Text style={styles.gridCardSub}>Edit your art packages</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate("Payouts")}
          >
            <View style={[styles.gridIconBox, { backgroundColor: "#F3E8FF" }]}>
              <Ionicons name="wallet-outline" size={22} color="#9333EA" />
            </View>
            <Text style={styles.gridCardTitle}>Payouts</Text>
            <Text style={styles.gridCardSub}>View earnings & history</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 20 : 0,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Restricted State
  restrictedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    alignItems: "center",
    elevation: 4,
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A2540",
    textAlign: "center",
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  applyButton: {
    backgroundColor: "#0284C7",
    borderRadius: 25,
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  applyButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  cancelButton: { paddingVertical: 8 },
  cancelButtonText: { color: "#6B7280", fontSize: 15, fontWeight: "600" },

  // Verification Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  verificationModalCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  questionBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  questionText: { fontSize: 24, fontWeight: "700", color: "#64748B" },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  termsBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 14,
  },
  termsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
  },
  bulletItem: { fontSize: 12, color: "#475569", lineHeight: 18 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: { backgroundColor: "#0284C7", borderColor: "#0284C7" },
  checkboxLabel: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  modalButtonsRow: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: { color: "#475569", fontWeight: "700", fontSize: 14 },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmActive: { backgroundColor: "#0284C7" },
  confirmDisabled: { backgroundColor: "#CBD5E1" },
  modalConfirmText: { color: "#FFF", fontWeight: "700", fontSize: 14 },

  dashboardContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  dashHeaderTitle: { fontSize: 26, fontWeight: "900", color: "#1E1B4B" },
  dashHeaderSub: {
    fontSize: 14,
    color: "#4338CA",
    marginTop: 2,
    marginBottom: 20,
  },
  earningsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#16A34A" },
  liveText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  earningsAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: "#1E1B4B",
    marginVertical: 10,
  },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statBox: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#0284C7" },
  statLabel: { fontSize: 12, color: "#64748B", marginTop: 2 },
  verticalDivider: { width: 1, height: 30, backgroundColor: "#F1F5F9" },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E1B4B",
    marginBottom: 12,
  },
  gridRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    elevation: 2,
  },
  gridIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  gridCardSub: { fontSize: 12, color: "#64748B", lineHeight: 16 },
});
