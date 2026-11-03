import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
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

export default function BookmarksScreen({ navigation }) {
  const currentUser = auth.currentUser;
  const [bookmarkedServices, setBookmarkedServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, async (uSnap) => {
      if (uSnap.exists()) {
        const ids = uSnap.data().bookmarks || [];
        const fetched = [];

        for (const id of ids) {
          try {
            const sSnap = await getDoc(doc(db, "services", id));
            if (sSnap.exists()) {
              fetched.push({ id: sSnap.id, ...sSnap.data() });
            }
          } catch (e) {
            console.log("Error fetching bookmarked service:", e);
          }
        }
        setBookmarkedServices(fetched);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#0A2540" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bookmarks</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0284C7"
              style={{ marginTop: 40 }}
            />
          ) : bookmarkedServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="bookmark-outline"
                size={50}
                color="#9CA3AF"
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyTitle}>No Bookmarks Saved</Text>
              <Text style={styles.emptySubtitle}>
                Save your favorite artists or commission services here to easily
                find them later!
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {bookmarkedServices.map((item) => (
                <View key={item.id} style={styles.serviceCard}>
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.serviceImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <FontAwesome5 name="palette" size={32} color="#0284C7" />
                    </View>
                  )}
                  <View style={styles.cardDetails}>
                    <Text style={styles.artistTag}>
                      @{item.artistName || "artist"}
                    </Text>
                    <Text style={styles.serviceTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.priceTag}>${item.price}</Text>
                  </View>
                </View>
              ))}
            </View>
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
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    elevation: 2,
  },
  serviceImage: { width: "100%", height: 120, resizeMode: "cover" },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardDetails: { padding: 10 },
  artistTag: { fontSize: 11, fontWeight: "700", color: "#0284C7" },
  serviceTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0A2540",
    marginVertical: 2,
  },
  priceTag: { fontSize: 14, fontWeight: "900", color: "#16A34A" },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 2,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
