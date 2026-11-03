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

export default function MyPurchasesScreen({ navigation }) {
  const currentUser = auth.currentUser;
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const purchasesQuery = query(
      collection(db, "orders"),
      where("clientId", "==", currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      purchasesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPurchases(list);
        setLoading(false);
      },
      (error) => {
        console.log("Error loading purchases:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Handle paying remaining 50% balance
  const handlePayBalance = async (item) => {
    Alert.alert(
      "Confirm Payment",
      `Would you like to settle the remaining balance for "${item.package}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          onPress: async () => {
            setPayingId(item.id);
            try {
              // 1. Update order status in Firestore
              const orderRef = doc(db, "orders", item.id);
              await updateDoc(orderRef, {
                finalPaid: true,
                paymentStatus: "fully_paid",
                status: "completed",
                updatedAt: serverTimestamp(),
              });

              // 2. Send notification to the artist
              await addDoc(collection(db, "notifications"), {
                recipientId: item.artistId,
                title: "Final Payment Received! 💳",
                message: `@${item.clientName || "Client"} paid the remaining balance for "${item.package}".`,
                type: "payment_received",
                read: false,
                createdAt: serverTimestamp(),
              });

              Alert.alert(
                "Payment Successful!",
                "Your final payment has been processed. The commission is now fully settled.",
              );
            } catch (error) {
              Alert.alert("Payment Failed", error.message);
            } finally {
              setPayingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#0A2540" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Purchases</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0284C7"
              style={{ marginTop: 40 }}
            />
          ) : purchases.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="receipt-outline"
                size={54}
                color="#9CA3AF"
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyTitle}>No Purchases Yet</Text>
              <Text style={styles.emptySubtitle}>
                When you commission an artist or purchase custom artwork, your
                orders and receipts will appear here.
              </Text>

              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.browseButtonText}>Browse Marketplace</Text>
              </TouchableOpacity>
            </View>
          ) : (
            purchases.map((item) => {
              // Payment helper states
              const isHalfPayment = item.paymentType === "half";
              const isDepositPaid = item.depositPaid ?? true;
              const isFinalPaid = item.finalPaid === true;
              const numericPrice =
                typeof item.price === "number"
                  ? item.price
                  : parseFloat(
                      String(item.price || "0").replace(/[^0-9.]/g, ""),
                    ) || 0;
              const remainingBalance = (numericPrice / 2).toFixed(2);

              return (
                <View key={item.id} style={styles.purchaseCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.artistTag}>@{item.artistName}</Text>
                      <Text style={styles.pkgTitle}>{item.package}</Text>
                    </View>
                    <Text style={styles.priceTag}>
                      {typeof item.price === "number"
                        ? `$${item.price}`
                        : item.price}
                    </Text>
                  </View>

                  {/* Payment Breakdown Bar */}
                  <View style={styles.paymentInfoRow}>
                    <View style={styles.paymentBadge}>
                      <Ionicons name="card-outline" size={12} color="#0284C7" />
                      <Text style={styles.paymentBadgeText}>
                        {isHalfPayment ? "50/50 Split" : "Full Upfront"}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.paymentStatusText,
                        isFinalPaid || (!isHalfPayment && isDepositPaid)
                          ? styles.paidText
                          : styles.unpaidText,
                      ]}
                    >
                      {isFinalPaid || (!isHalfPayment && isDepositPaid)
                        ? "Fully Paid"
                        : "50% Deposit Paid"}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Status:</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === "accepted" ||
                        item.status === "completed"
                          ? styles.statusAccepted
                          : item.status === "declined"
                            ? styles.statusDeclined
                            : styles.statusPending,
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {item.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Action Button: Pay remaining 50% Balance if order is accepted but not fully paid */}
                  {isHalfPayment &&
                    !isFinalPaid &&
                    item.status === "accepted" && (
                      <TouchableOpacity
                        style={styles.payBalanceButton}
                        onPress={() => handlePayBalance(item)}
                        disabled={payingId === item.id}
                      >
                        {payingId === item.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Ionicons
                              name="wallet-outline"
                              size={16}
                              color="#FFF"
                            />
                            <Text style={styles.payBalanceButtonText}>
                              Pay Remaining Balance (${remainingBalance})
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                </View>
              );
            })
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0A2540" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  purchaseCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  artistTag: { fontSize: 13, color: "#0284C7", fontWeight: "700" },
  pkgTitle: { fontSize: 16, fontWeight: "800", color: "#0A2540", marginTop: 2 },
  priceTag: { fontSize: 17, fontWeight: "900", color: "#16A34A" },

  // Payment row styles
  paymentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paymentBadgeText: { fontSize: 11, fontWeight: "700", color: "#0284C7" },
  paymentStatusText: { fontSize: 12, fontWeight: "800" },
  paidText: { color: "#16A34A" },
  unpaidText: { color: "#D97706" },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  statusLabel: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusAccepted: { backgroundColor: "#DCFCE7" },
  statusDeclined: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 11, fontWeight: "800", color: "#1E293B" },

  // Settle balance button styles
  payBalanceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  payBalanceButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    elevation: 2,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
});
