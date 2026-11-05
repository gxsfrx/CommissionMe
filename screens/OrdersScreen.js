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

export default function OrdersScreen({ navigation }) {
  const currentUser = auth.currentUser;
  const [orders, setOrders] = useState([]);
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
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.log("Error fetching orders:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Handle Accept Order
  const handleAcceptOrder = async (order) => {
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: order.clientId,
        title: "Order Accepted! 🎉",
        message: `@${order.artistName || "Artist"} accepted your request for "${order.package}". Check your purchases tab!`,
        type: "order_accepted",
        read: false,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Order Accepted",
        "The order has been moved to Active Commissions.",
      );
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleDeclineOrder = async (order) => {
    Alert.alert(
      "Decline Request",
      "Are you sure you want to decline this order request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "orders", order.id), {
                status: "declined",
                updatedAt: serverTimestamp(),
              });

              await addDoc(collection(db, "notifications"), {
                recipientId: order.clientId,
                title: "Order Declined",
                message: `@${order.artistName || "Artist"} was unable to accept your request for "${order.package}".`,
                type: "order_declined",
                read: false,
                createdAt: serverTimestamp(),
              });
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      </SafeAreaView>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending");

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
          <Text style={styles.headerTitle}>Incoming Orders</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {pendingOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cart-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Pending Orders</Text>
              <Text style={styles.emptySub}>
                When clients place commission requests for your packages, they
                will show up here.
              </Text>
            </View>
          ) : (
            pendingOrders.map((item) => (
              <View key={item.id} style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>
                      Client: {item.clientName}
                    </Text>
                    <Text style={styles.pkgTitle}>{item.package}</Text>
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

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => handleDeclineOrder(item)}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptOrder(item)}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={styles.acceptText}>Accept Order</Text>
                  </TouchableOpacity>
                </View>
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
  orderCard: {
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
  clientName: { fontSize: 15, fontWeight: "800", color: "#0A2540" },
  pkgTitle: {
    fontSize: 13,
    color: "#0284C7",
    marginTop: 2,
    fontWeight: "700",
  },
  priceBadge: { fontSize: 16, fontWeight: "800", color: "#16A34A" },
  briefBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
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
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
    borderRadius: 12,
    paddingVertical: 10,
    gap: 4,
  },
  declineText: { color: "#EF4444", fontWeight: "700", fontSize: 13 },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 10,
    gap: 4,
  },
  acceptText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
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
  emptySub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
