import { Ionicons } from "@expo/vector-icons";
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
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
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

export default function CommissionsScreen({ navigation }) {
  const currentUser = auth.currentUser;
  const [activeTab, setActiveTab] = useState("active");
  const [activeCommissions, setActiveCommissions] = useState([]);
  const [completedCommissions, setCompletedCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("artistId", "==", currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const active = [];
        const completed = [];

        snapshot.docs.forEach((d) => {
          const item = { id: d.id, ...d.data() };
          if (item.status === "accepted") {
            active.push(item);
          } else if (item.status === "completed") {
            completed.push(item);
          }
        });

        setActiveCommissions(active);
        setCompletedCommissions(completed);
        setLoading(false);
      },
      (error) => {
        console.log("Error fetching commissions:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleDeliverArtwork = async (item) => {
    Alert.alert(
      "Deliver Artwork",
      `Mark "${item.package}" as completed and send delivery notification to ${item.clientName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deliver & Complete",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "orders", item.id), {
                status: "completed",
                completedAt: serverTimestamp(),
              });

              await addDoc(collection(db, "notifications"), {
                recipientId: item.clientId,
                title: "Artwork Delivered! 🎨",
                message: `@${item.artistName} has completed and delivered your artwork for "${item.package}".`,
                type: "order_delivered",
                createdAt: serverTimestamp(),
              });

              Alert.alert("Delivered!", "Commission marked as completed.");
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  };

  const currentList =
    activeTab === "active" ? activeCommissions : completedCommissions;

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
          <Text style={styles.headerTitle}>Commissions Tracker</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "active" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("active")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "active" && styles.tabTextActive,
              ]}
            >
              Active ({activeCommissions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "completed" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("completed")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "completed" && styles.tabTextActive,
              ]}
            >
              Completed ({completedCommissions.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0284C7"
              style={{ marginTop: 40 }}
            />
          ) : currentList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={48}
                color="#94A3B8"
              />
              <Text style={styles.emptyTitle}>
                {activeTab === "active"
                  ? "No Active Commissions"
                  : "No Completed Commissions"}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === "active"
                  ? "Accepted orders from clients will appear here."
                  : "Delivered commissions will be archived here."}
              </Text>
            </View>
          ) : (
            currentList.map((item) => (
              <View key={item.id} style={styles.commissionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>
                      Client: {item.clientName}
                    </Text>
                    <Text style={styles.projectType}>{item.package}</Text>
                  </View>
                  <Text style={styles.priceBadge}>{item.price}</Text>
                </View>

                {item.brief ? (
                  <View style={styles.briefBox}>
                    <Text style={styles.briefLabel}>Client Brief:</Text>
                    <Text style={styles.briefText}>{item.brief}</Text>
                  </View>
                ) : null}

                {item.referenceImageUri ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.briefLabel}>Reference Image:</Text>
                    <Image
                      source={{ uri: item.referenceImageUri }}
                      style={styles.refImagePreview}
                    />
                  </View>
                ) : null}

                {activeTab === "active" ? (
                  <>
                    <Text style={styles.progressLabel}>
                      Project Status: In Progress
                    </Text>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[styles.progressBarFill, { width: "70%" }]}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.submitArtBtn}
                      onPress={() => handleDeliverArtwork(item)}
                    >
                      <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color="#FFF"
                      />
                      <Text style={styles.submitArtText}>
                        Deliver Final Artwork
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.completedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#16A34A"
                    />
                    <Text style={styles.completedBadgeText}>
                      Completed & Delivered
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
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
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#E0F2FE",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: "#FFFFFF", elevation: 2 },
  tabText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  tabTextActive: { color: "#0284C7" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  commissionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: "800", color: "#0A2540" },
  projectType: {
    fontSize: 13,
    color: "#0284C7",
    marginTop: 2,
    fontWeight: "600",
  },
  priceBadge: { fontSize: 16, fontWeight: "800", color: "#16A34A" },
  briefBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  briefLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
  },
  briefText: { fontSize: 13, color: "#334155", lineHeight: 18 },
  refImagePreview: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    marginTop: 4,
    resizeMode: "cover",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#0284C7" },
  submitArtBtn: {
    flexDirection: "row",
    backgroundColor: "#0284C7",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitArtText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
  },
  completedBadgeText: { color: "#16A34A", fontWeight: "800", fontSize: 13 },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#FFF",
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A2540",
    marginTop: 10,
  },
  emptySub: { fontSize: 13, color: "#64748B", marginTop: 4 },
});
