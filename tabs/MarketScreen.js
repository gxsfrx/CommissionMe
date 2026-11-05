import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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

export default function MarketScreen({ navigation }) {
  const currentUser = auth.currentUser;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarks, setBookmarks] = useState([]);

  const [artistDetailsCache, setArtistDetailsCache] = useState({});

  const [selectedService, setSelectedService] = useState(null);
  const [isOrderModalVisible, setIsOrderModalVisible] = useState(false);
  const [briefText, setBriefText] = useState("");
  const [refImageUri, setRefImageUri] = useState(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [paymentType, setPaymentType] = useState("full");

  const [viewArtist, setViewArtist] = useState(null);
  const [artistArtworks, setArtistArtworks] = useState([]);
  const [artistLoading, setArtistLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setBookmarks(docSnap.data().bookmarks || []);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const servicesRef = collection(db, "services");
    const q = query(servicesRef, orderBy("createdAt", "desc"));

    const unsubscribeServices = onSnapshot(
      q,
      async (snapshot) => {
        const publishedServices = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setServices(publishedServices);
        setLoading(false);
      },
      (error) => {
        console.log("Error fetching marketplace services:", error);
        setLoading(false);
      },
    );

    return () => unsubscribeServices();
  }, []);

  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const newCache = {};
      snapshot.docs.forEach((docSnap) => {
        const uData = docSnap.data();
        newCache[docSnap.id] = {
          username: uData.username || uData.email?.split("@")[0] || "user",
          avatarUri: uData.avatarUri || null,
        };
      });
      setArtistDetailsCache(newCache);
    });

    return () => unsubscribeUsers();
  }, []);

  const getArtistUsername = (item) => {
    if (item?.artistName && item.artistName !== "artist")
      return item.artistName;
    if (item?.userId && artistDetailsCache[item.userId]?.username) {
      return artistDetailsCache[item.userId].username;
    }
    return "user";
  };

  const getArtistAvatar = (item) => {
    if (item?.userId && artistDetailsCache[item.userId]?.avatarUri) {
      return artistDetailsCache[item.userId].avatarUri;
    }
    if (item?.artistAvatarUri) return item.artistAvatarUri;
    return null;
  };

  const toggleBookmark = async (serviceId) => {
    if (!currentUser) return;
    const isBookmarked = bookmarks.includes(serviceId);
    const updatedBookmarks = isBookmarked
      ? bookmarks.filter((id) => id !== serviceId)
      : [...bookmarks, serviceId];

    setBookmarks(updatedBookmarks);
    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        { bookmarks: updatedBookmarks },
        { merge: true },
      );
    } catch (e) {
      console.log("Error updating bookmark:", e);
    }
  };

  const filteredServices = services.filter((item) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const titleMatch = item.title?.toLowerCase().includes(term);
    const descMatch = item.description?.toLowerCase().includes(term);
    const artistName = getArtistUsername(item).toLowerCase();
    return titleMatch || descMatch || artistName.includes(term);
  });

  const handleOpenArtistProfile = async (artistId) => {
    if (!artistId) return;
    setArtistLoading(true);

    try {
      const userDocRef = doc(db, "users", artistId);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        setViewArtist(userSnap.data());
      } else {
        setViewArtist({ username: "user", role: "ARTIST" });
      }

      const artworksQuery = query(
        collection(db, "artworks"),
        where("userId", "==", artistId),
      );

      const unsubscribeArtworks = onSnapshot(artworksQuery, (snap) => {
        const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setArtistArtworks(posts);
        setArtistLoading(false);
      });
    } catch (error) {
      console.log("Error loading artist profile:", error);
      setArtistLoading(false);
    }
  };

  const handleSendMessage = (artistName) => {
    setSelectedService(null);
    setViewArtist(null);
    navigation.navigate("MainTabs", {
      screen: "Messages",
      params: { recipient: artistName },
    });
  };

  const handlePickReferenceImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Needed", "Please grant gallery permissions.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setRefImageUri(result.assets[0].uri);
    }
  };

  const handleSubmitOrder = async () => {
    if (!briefText.trim()) {
      Alert.alert(
        "Brief Required",
        "Please describe what artwork you would like to order.",
      );
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to place an order.");
      return;
    }

    setSubmittingOrder(true);
    try {
      const artistName = getArtistUsername(selectedService);
      const myUsername = currentUser.email?.split("@")[0] || "client";

      const numericPrice =
        typeof selectedService.price === "number"
          ? selectedService.price
          : parseFloat(
              String(selectedService.price || "0").replace(/[^0-9.]/g, ""),
            ) || 0;

      await addDoc(collection(db, "orders"), {
        serviceId: selectedService.id,
        package: selectedService.title,
        price: `$${numericPrice}`,
        artistId: selectedService.userId,
        artistName: artistName,
        clientId: currentUser.uid,
        clientName: `@${myUsername}`,
        brief: briefText.trim(),
        referenceImageUri: refImageUri || null,
        status: "pending",
        paymentType: paymentType,
        depositPaid: true,
        finalPaid: paymentType === "full",
        paymentStatus: paymentType === "full" ? "fully_paid" : "deposit_paid",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: selectedService.userId,
        title: "New Commission Order!",
        message: `@${myUsername} placed a ${
          paymentType === "half" ? "50% deposit" : "full payment"
        } order for "${selectedService.title}" ($${numericPrice}).`,
        type: "order_request",
        read: false,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Request Sent!",
        `Your commission request for "${selectedService.title}" has been sent to @${artistName}!`,
      );

      setBriefText("");
      setRefImageUri(null);
      setPaymentType("full");
      setIsOrderModalVisible(false);
      setSelectedService(null);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const currentPrice = selectedService
    ? typeof selectedService.price === "number"
      ? selectedService.price
      : parseFloat(
          String(selectedService.price || "0").replace(/[^0-9.]/g, ""),
        ) || 0
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.logoText}>CommissionMe</Text>
          <TouchableOpacity
            style={styles.purchasesButton}
            onPress={() => navigation.navigate("MyPurchases")}
          >
            <Ionicons name="bag-handle-outline" size={18} color="#0284C7" />
            <Text style={styles.purchasesText}>My Purchases</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Turn your ideas{"\n"}into real art
            </Text>
            <Text style={styles.heroSubtitle}>
              Connect directly with talented creators. Share your brief and
              receive unique custom pieces.
            </Text>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for artists, commissions..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0284C7" />
            </View>
          ) : filteredServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <FontAwesome5
                name="palette"
                size={48}
                color="#9CA3AF"
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyTitle}>No Available Services</Text>
              <Text style={styles.emptySubtitle}>
                There are currently no active art commissions available matching
                your query. Check back soon!
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredServices.map((item) => {
                const username = getArtistUsername(item);
                const avatar = getArtistAvatar(item);
                const isBookmarked = bookmarks.includes(item.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.serviceCard}
                    activeOpacity={0.85}
                    onPress={() => setSelectedService(item)}
                  >
                    <View style={{ position: "relative" }}>
                      {item.imageUri ? (
                        <Image
                          source={{ uri: item.imageUri }}
                          style={styles.serviceImage}
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <FontAwesome5
                            name="palette"
                            size={32}
                            color="#0284C7"
                          />
                        </View>
                      )}

                      {/* Bookmark Icon */}
                      <TouchableOpacity
                        style={styles.bookmarkBtnOnCard}
                        onPress={() => toggleBookmark(item.id)}
                      >
                        <Ionicons
                          name={isBookmarked ? "heart" : "heart-outline"}
                          size={18}
                          color={isBookmarked ? "#EF4444" : "#0A2540"}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardDetails}>
                      <TouchableOpacity
                        style={styles.artistRow}
                        onPress={() => handleOpenArtistProfile(item.userId)}
                      >
                        <View style={styles.artistAvatarSmall}>
                          {avatar ? (
                            <Image
                              source={{ uri: avatar }}
                              style={styles.avatarImg}
                            />
                          ) : (
                            <Ionicons name="person" size={12} color="#0284C7" />
                          )}
                        </View>
                        <Text style={styles.artistNameTag} numberOfLines={1}>
                          @{username}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.titlePriceInlineRow}>
                        <Text style={styles.priceTagInline}>${item.price}</Text>
                        <Text
                          style={styles.serviceTitleInline}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>

                      {item.description ? (
                        <Text style={styles.serviceDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {selectedService && (
          <Modal
            visible={true}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSelectedService(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.detailCard}>
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setSelectedService(null)}
                >
                  <Ionicons name="close" size={22} color="#0A2540" />
                </TouchableOpacity>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ position: "relative" }}>
                    {selectedService.imageUri ? (
                      <Image
                        source={{ uri: selectedService.imageUri }}
                        style={styles.detailImage}
                      />
                    ) : (
                      <View style={styles.detailImagePlaceholder}>
                        <FontAwesome5
                          name="palette"
                          size={48}
                          color="#0284C7"
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.detailBookmarkBtn}
                      onPress={() => toggleBookmark(selectedService.id)}
                    >
                      <Ionicons
                        name={
                          bookmarks.includes(selectedService.id)
                            ? "heart"
                            : "heart-outline"
                        }
                        size={22}
                        color={
                          bookmarks.includes(selectedService.id)
                            ? "#EF4444"
                            : "#0A2540"
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailTitle}>
                        {selectedService.title}
                      </Text>

                      <TouchableOpacity
                        style={styles.detailArtistRow}
                        onPress={() => {
                          const artistId = selectedService.userId;
                          setSelectedService(null);
                          handleOpenArtistProfile(artistId);
                        }}
                      >
                        <Text style={styles.byText}>By </Text>
                        <View style={styles.artistAvatarMedium}>
                          {getArtistAvatar(selectedService) ? (
                            <Image
                              source={{
                                uri: getArtistAvatar(selectedService),
                              }}
                              style={styles.avatarImg}
                            />
                          ) : (
                            <Ionicons name="person" size={13} color="#0284C7" />
                          )}
                        </View>
                        <Text style={styles.detailArtistTag}>
                          @{getArtistUsername(selectedService)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.detailPrice}>
                      ${selectedService.price}
                    </Text>
                  </View>

                  <View style={styles.paypalBanner}>
                    <Ionicons name="logo-paypal" size={18} color="#003087" />
                    <Text style={styles.paypalBannerText}>
                      Protected with PayPal Buyer & Creator Guarantee
                    </Text>
                  </View>

                  <Text style={styles.sectionLabel}>Description</Text>
                  <Text style={styles.detailDescription}>
                    {selectedService.description ||
                      "No detailed description provided."}
                  </Text>

                  <View style={styles.actionBtnRow}>
                    <TouchableOpacity
                      style={styles.messageBtn}
                      onPress={() =>
                        handleSendMessage(getArtistUsername(selectedService))
                      }
                    >
                      <Ionicons
                        name="chatbubbles-outline"
                        size={18}
                        color="#0284C7"
                      />
                      <Text style={styles.messageBtnText}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.requestOrderBtn}
                      onPress={() => setIsOrderModalVisible(true)}
                    >
                      <Text style={styles.requestOrderText}>Request Order</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* ARTIST PROFILE MODAL */}
        {viewArtist && (
          <Modal
            visible={true}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setViewArtist(null)}
          >
            <SafeAreaView style={styles.artistProfileSafeArea}>
              <View style={styles.modalHeaderRow}>
                <TouchableOpacity
                  style={styles.closeModalBtnHeader}
                  onPress={() => setViewArtist(null)}
                >
                  <Ionicons name="close" size={24} color="#0A2540" />
                </TouchableOpacity>
                <Text style={styles.modalHeaderTitle}>Artist Profile</Text>
                <View style={{ width: 38 }} />
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={styles.profileCard}>
                  {viewArtist.bannerUri ? (
                    <Image
                      source={{ uri: viewArtist.bannerUri }}
                      style={styles.bannerImage}
                    />
                  ) : (
                    <View style={styles.bannerHeader} />
                  )}

                  <View style={styles.avatarContainer}>
                    {viewArtist.avatarUri ? (
                      <Image
                        source={{ uri: viewArtist.avatarUri }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Ionicons name="person" size={40} color="#0284C7" />
                    )}
                  </View>

                  <Text style={styles.usernameText}>
                    @{viewArtist.username || "user"}
                  </Text>

                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>
                      Role: {viewArtist.role || "ARTIST"}
                    </Text>
                  </View>

                  {viewArtist.bio ? (
                    <Text style={styles.bioText}>{viewArtist.bio}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={styles.messageArtistBtn}
                    onPress={() =>
                      handleSendMessage(viewArtist.username || "user")
                    }
                  >
                    <Ionicons
                      name="chatbubbles-outline"
                      size={18}
                      color="#FFF"
                    />
                    <Text style={styles.messageArtistBtnText}>
                      Message Artist
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>
                  Portfolio & Artworks ({artistArtworks.length})
                </Text>

                {artistLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#0284C7"
                    style={{ marginVertical: 20 }}
                  />
                ) : artistArtworks.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <MaterialCommunityIcons
                      name="image-outline"
                      size={40}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyTitle}>No Artworks Uploaded</Text>
                  </View>
                ) : (
                  <View style={styles.portfolioGrid}>
                    {artistArtworks.map((art) => (
                      <View key={art.id} style={styles.portfolioCard}>
                        <Image
                          source={{ uri: art.imageUri }}
                          style={styles.portfolioImg}
                        />
                        <Text style={styles.artTitle} numberOfLines={1}>
                          {art.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}

        <Modal
          visible={isOrderModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsOrderModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.orderBriefCard}>
              <Text style={styles.briefModalTitle}>Commission Brief</Text>
              <Text style={styles.briefModalSub}>
                Describe your project requirements for @
                {getArtistUsername(selectedService)}:
              </Text>

              <TextInput
                style={styles.briefInput}
                placeholder="e.g., Full-body character design, blue eyes, anime style..."
                placeholderTextColor="#A1A1AA"
                multiline
                numberOfLines={4}
                value={briefText}
                onChangeText={setBriefText}
              />

              {/* Upload Reference Image Field */}
              <Text style={styles.sectionLabel}>
                Reference Image (Optional)
              </Text>
              <TouchableOpacity
                style={styles.refImagePickerBox}
                onPress={handlePickReferenceImage}
              >
                {refImageUri ? (
                  <Image
                    source={{ uri: refImageUri }}
                    style={styles.refImagePreview}
                  />
                ) : (
                  <View style={styles.refImagePlaceholder}>
                    <Ionicons name="image-outline" size={20} color="#0284C7" />
                    <Text style={styles.refImageText}>
                      Attach Reference Photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Payment Option Selection */}
              <Text style={styles.sectionLabel}>Payment Option</Text>
              <View style={styles.paymentOptionRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    paymentType === "full" && styles.paymentOptionCardSelected,
                  ]}
                  onPress={() => setPaymentType("full")}
                >
                  <Ionicons
                    name={
                      paymentType === "full"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={16}
                    color={paymentType === "full" ? "#0284C7" : "#64748B"}
                  />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={styles.paymentOptionTitle}>Full Upfront</Text>
                    <Text style={styles.paymentOptionSub}>
                      ${currentPrice.toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    paymentType === "half" && styles.paymentOptionCardSelected,
                  ]}
                  onPress={() => setPaymentType("half")}
                >
                  <Ionicons
                    name={
                      paymentType === "half"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={16}
                    color={paymentType === "half" ? "#0284C7" : "#64748B"}
                  />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={styles.paymentOptionTitle}>50% Deposit</Text>
                    <Text style={styles.paymentOptionSub}>
                      ${(currentPrice / 2).toFixed(2)} now
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.paypalBox}>
                <Ionicons name="logo-paypal" size={20} color="#003087" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.paypalBoxTitle}>Pay via PayPal</Text>
                  <Text style={styles.paypalBoxSub}>
                    Escrow hold until final art delivery
                  </Text>
                </View>
              </View>

              <View style={styles.briefBtnRow}>
                <TouchableOpacity
                  style={styles.briefCancelBtn}
                  onPress={() => setIsOrderModalVisible(false)}
                >
                  <Text style={styles.briefCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.briefSubmitBtn}
                  onPress={handleSubmitOrder}
                  disabled={submittingOrder}
                >
                  {submittingOrder ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.briefSubmitText}>Send Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
    paddingTop: 4,
    paddingBottom: 10,
  },
  logoText: { fontSize: 20, fontWeight: "800", color: "#0A2540" },
  purchasesButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  purchasesText: {
    color: "#0284C7",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 6,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  heroSection: { alignItems: "center", marginTop: 8, marginBottom: 20 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0A2540",
    textAlign: "center",
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: "100%",
    elevation: 2,
  },
  searchInput: { marginLeft: 10, fontSize: 14, color: "#111827", flex: 1 },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 2,
    marginBottom: 16,
  },
  serviceImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkBtnOnCard: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  cardDetails: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  artistAvatarSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", resizeMode: "cover" },
  artistNameTag: { fontSize: 11, fontWeight: "700", color: "#0284C7" },

  titlePriceInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  priceTagInline: {
    fontSize: 14,
    fontWeight: "900",
    color: "#16A34A",
  },
  serviceTitleInline: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#0A2540",
  },

  serviceDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
    position: "relative",
  },
  closeModalBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailImage: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    marginBottom: 14,
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  detailImagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  detailBookmarkBtn: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#FFF",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  detailTitle: { fontSize: 20, fontWeight: "800", color: "#0A2540" },
  detailArtistRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  byText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  artistAvatarMedium: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 5,
  },
  detailArtistTag: { fontSize: 13, fontWeight: "700", color: "#0284C7" },
  detailPrice: { fontSize: 22, fontWeight: "900", color: "#16A34A" },
  paypalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  paypalBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#003087",
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 20,
  },
  actionBtnRow: { flexDirection: "row", gap: 10 },
  messageBtn: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#0284C7",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  messageBtnText: { color: "#0284C7", fontWeight: "700", fontSize: 14 },
  requestOrderBtn: {
    flex: 1,
    backgroundColor: "#0284C7",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  requestOrderText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  artistProfileSafeArea: { flex: 1, backgroundColor: "#EBF6FF" },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  closeModalBtnHeader: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#0A2540" },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingBottom: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    overflow: "hidden",
  },
  bannerHeader: { width: "100%", height: 100, backgroundColor: "#BAE6FD" },
  bannerImage: { width: "100%", height: 100, resizeMode: "cover" },
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
    fontSize: 20,
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
  messageArtistBtn: {
    flexDirection: "row",
    backgroundColor: "#0284C7",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    alignItems: "center",
  },
  messageArtistBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 12,
  },
  portfolioGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  portfolioCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 8,
    elevation: 2,
  },
  portfolioImg: { width: "100%", height: 130, borderRadius: 12 },
  artTitle: { fontSize: 13, fontWeight: "700", color: "#0A2540", marginTop: 6 },

  orderBriefCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20 },
  briefModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 4,
  },
  briefModalSub: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 14,
    lineHeight: 18,
  },
  briefInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    height: 80,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  refImagePickerBox: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  refImagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  refImagePlaceholder: { flexDirection: "row", alignItems: "center", gap: 6 },
  refImageText: { fontSize: 12, fontWeight: "700", color: "#0284C7" },

  paymentOptionRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  paymentOptionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
  },
  paymentOptionCardSelected: {
    borderColor: "#0284C7",
    backgroundColor: "#F0F9FF",
  },
  paymentOptionTitle: { fontSize: 12, fontWeight: "800", color: "#0A2540" },
  paymentOptionSub: { fontSize: 11, fontWeight: "700", color: "#16A34A" },

  paypalBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  paypalBoxTitle: { fontSize: 13, fontWeight: "800", color: "#003087" },
  paypalBoxSub: { fontSize: 11, color: "#64748B" },
  briefBtnRow: { flexDirection: "row", gap: 10 },
  briefCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  briefCancelText: { color: "#475569", fontWeight: "700" },
  briefSubmitBtn: {
    flex: 1,
    backgroundColor: "#0284C7",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  briefSubmitText: { color: "#FFFFFF", fontWeight: "700" },
});
