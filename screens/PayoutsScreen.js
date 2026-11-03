import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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

export default function PayoutsScreen({ navigation }) {
  const currentUser = auth.currentUser;
  const [payoutBalance, setPayoutBalance] = useState(0.0);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("artistId", "==", currentUser.uid),
      where("status", "==", "completed"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          const cleanPrice =
            parseFloat(String(data.price || "0").replace(/[^0-9.]/g, "")) || 0;
          total += cleanPrice;
          return { id: d.id, cleanPrice, ...data };
        });

        setPayoutBalance(total);
        setCompletedOrders(list);
        setLoading(false);
      },
      (error) => {
        console.log("Error calculating payouts:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleCashout = () => {
    if (payoutBalance <= 0) {
      Alert.alert(
        "Insufficient Balance",
        "Minimum payout threshold is $10.00 USD.",
      );
      return;
    }
    Alert.alert(
      "Payout Requested",
      `Your request to withdraw $${payoutBalance.toFixed(
        2,
      )} USD via PayPal has been submitted!`,
    );
  };

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
          <Text style={styles.headerTitle}>Artist Payouts</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Earnings Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available for Cashout</Text>
            <Text style={styles.balanceAmount}>
              ${payoutBalance.toFixed(2)}
            </Text>

            <TouchableOpacity style={styles.cashoutBtn} onPress={handleCashout}>
              <Ionicons name="cash-outline" size={18} color="#9333EA" />
              <Text style={styles.cashoutBtnText}>Request Payout</Text>
            </TouchableOpacity>
          </View>

          {/* Connected Payout Method */}
          <Text style={styles.sectionTitle}>Payout Method</Text>
          <View style={styles.methodCard}>
            <Ionicons name="logo-paypal" size={28} color="#003087" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.methodName}>PayPal Account</Text>
              <Text style={styles.methodDetail}>
                {currentUser?.email || "artist.commissions@example.com"}
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.editBtnText}>Connected</Text>
            </TouchableOpacity>
          </View>

          {/* History */}
          <Text style={styles.sectionTitle}>Earnings History</Text>

          {loading ? (
            <ActivityIndicator size="small" color="#0284C7" />
          ) : completedOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Earned Income Yet</Text>
              <Text style={styles.emptySub}>
                When you deliver completed commissions, funds will settle here.
              </Text>
            </View>
          ) : (
            completedOrders.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View>
                  <Text style={styles.historyPkg}>{item.package}</Text>
                  <Text style={styles.historyClient}>
                    From {item.clientName}
                  </Text>
                </View>
                <Text style={styles.historyPrice}>
                  +${item.cleanPrice.toFixed(2)}
                </Text>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  balanceCard: {
    backgroundColor: "#9333EA",
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
  },
  balanceLabel: { color: "#F3E8FF", fontSize: 13, fontWeight: "600" },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    marginVertical: 10,
  },
  cashoutBtn: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
  },
  cashoutBtnText: { color: "#9333EA", fontWeight: "800", fontSize: 14 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 10,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    marginBottom: 20,
  },
  methodName: { fontSize: 15, fontWeight: "800", color: "#0A2540" },
  methodDetail: { fontSize: 12, color: "#64748B", marginTop: 2 },
  editBtnText: { color: "#16A34A", fontWeight: "700", fontSize: 13 },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 30,
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
  historyCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    elevation: 1,
  },
  historyPkg: { fontSize: 14, fontWeight: "800", color: "#0A2540" },
  historyClient: { fontSize: 12, color: "#64748B", marginTop: 2 },
  historyPrice: { fontSize: 15, fontWeight: "900", color: "#16A34A" },
});
