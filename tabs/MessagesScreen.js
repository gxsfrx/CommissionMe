import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function MessagesScreen({ route, navigation }) {
  const currentUser = auth.currentUser;
  const recipientParam = route?.params?.recipient;

  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messagesList, setMessagesList] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [notificationsList, setNotificationsList] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchUser = async () => {
      try {
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          setCurrentUsername(
            uDoc.data().username || currentUser.email?.split("@")[0] || "User",
          );
        } else {
          setCurrentUsername(currentUser.email?.split("@")[0] || "User");
        }
      } catch (e) {
        console.log("Error fetching user profile:", e);
      }
    };
    fetchUser();
  }, [currentUser]);

  // 2. Real-time listener for chats
  useEffect(() => {
    if (!currentUser) {
      setLoadingChats(false);
      return;
    }

    const chatsRef = collection(db, "chats");
    const chatsQuery = query(
      chatsRef,
      where("participants", "array-contains", currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setConversations(list);
        setLoadingChats(false);
      },
      (error) => {
        console.log("Error fetching chats:", error);
        setLoadingChats(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const notifQuery = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      notifQuery,
      (snapshot) => {
        const notifs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        notifs.sort((a, b) => {
          const tA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const tB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return tB - tA;
        });

        setNotificationsList(notifs);
      },
      (error) => {
        console.log("Error fetching notifications:", error);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const hasUnreadNotifs = notificationsList.some((n) => n.read !== true);

  const handleMarkAsRead = async (notificationId) => {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );

    try {
      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (e) {
      console.log("Error marking notification as read in Firestore:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notificationsList.filter((n) => n.read !== true);

    setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));

    for (const notif of unreadNotifs) {
      try {
        await updateDoc(doc(db, "notifications", notif.id), { read: true });
      } catch (e) {
        console.log("Error marking all read in Firestore:", e);
      }
    }
  };

  useEffect(() => {
    if (recipientParam && currentUser) {
      startOrCreateConversation(recipientParam);
    }
  }, [recipientParam, currentUser]);

  const startOrCreateConversation = async (targetUsername) => {
    if (!currentUser) return;

    try {
      let targetUid = null;

      const usersRef = collection(db, "users");
      const qUser = query(usersRef, where("username", "==", targetUsername));
      const userSnap = await getDocs(qUser);

      if (!userSnap.empty) {
        targetUid = userSnap.docs[0].id;
      }

      const otherParticipantId = targetUid || targetUsername;
      const chatId = [currentUser.uid, otherParticipantId].sort().join("_");
      const chatDocRef = doc(db, "chats", chatId);

      const myName =
        currentUsername || currentUser.email?.split("@")[0] || "User";

      await setDoc(
        chatDocRef,
        {
          chatId,
          participants: [currentUser.uid, otherParticipantId],
          participantNames: {
            [currentUser.uid]: myName,
            [otherParticipantId]: targetUsername,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setActiveChat({
        chatId,
        recipientName: targetUsername,
        recipientUid: otherParticipantId,
      });
    } catch (error) {
      console.log("Error creating conversation:", error);
    }
  };

  useEffect(() => {
    if (!activeChat?.chatId) return;

    const messagesRef = collection(db, "chats", activeChat.chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setMessagesList(msgs);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChat?.chatId) return;

    const text = inputText.trim();
    setInputText("");

    try {
      await addDoc(collection(db, "chats", activeChat.chatId, "messages"), {
        text,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        createdAt: serverTimestamp(),
      });

      const myName =
        currentUsername || currentUser.email?.split("@")[0] || "User";

      await setDoc(
        doc(db, "chats", activeChat.chatId),
        {
          chatId: activeChat.chatId,
          participants: [currentUser.uid, activeChat.recipientUid],
          participantNames: {
            [currentUser.uid]: myName,
            [activeChat.recipientUid]: activeChat.recipientName,
          },
          lastMessage: text,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.log("Error sending message:", e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => {
              if (activeChat) {
                setActiveChat(null);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#0A2540" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {activeChat
              ? `@${activeChat.recipientName}`
              : "Messages & Notifications"}
          </Text>

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => setIsNotificationsVisible(true)}
          >
            <Ionicons name="notifications-outline" size={20} color="#0A2540" />
            {hasUnreadNotifs && <View style={styles.notifBadgeDot} />}
          </TouchableOpacity>
        </View>

        {activeChat ? (
          <View style={styles.chatContainer}>
            <ScrollView
              contentContainerStyle={styles.chatScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.systemNoticeBox}>
                <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
                <Text style={styles.systemNoticeText}>
                  Chat initialized with @{activeChat.recipientName}. Discuss
                  your commission safely!
                </Text>
              </View>

              {messagesList.map((msg) => {
                const isMe = msg.senderId === currentUser?.uid;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubble,
                      isMe ? styles.myBubble : styles.theirBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMe ? styles.myText : styles.theirText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder={`Message @${activeChat.recipientName}...`}
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* CONVERSATIONS LIST */
          <ScrollView
            contentContainerStyle={
              conversations.length === 0
                ? styles.emptyScroll
                : styles.listScroll
            }
            showsVerticalScrollIndicator={false}
          >
            {loadingChats ? (
              <ActivityIndicator size="large" color="#0284C7" />
            ) : conversations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={56}
                  color="#9CA3AF"
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>
                  When you start a conversation with an artist or client, your
                  chats will appear here!
                </Text>
              </View>
            ) : (
              conversations.map((chat) => {
                let partnerName = "User";
                if (chat.participantNames) {
                  const otherUid = chat.participants?.find(
                    (id) => id !== currentUser?.uid,
                  );
                  partnerName =
                    chat.participantNames[otherUid] ||
                    Object.values(chat.participantNames).find(
                      (n) => n !== currentUsername,
                    ) ||
                    "User";
                }

                return (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.chatListItem}
                    onPress={() =>
                      setActiveChat({
                        chatId: chat.id,
                        recipientName: partnerName,
                        recipientUid: chat.participants?.find(
                          (id) => id !== currentUser?.uid,
                        ),
                      })
                    }
                  >
                    <View style={styles.avatarCircle}>
                      <Ionicons name="person" size={20} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.chatNameText}>@{partnerName}</Text>
                      <Text style={styles.chatLastMsg} numberOfLines={1}>
                        {chat.lastMessage || "Click to open conversation"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}

        <Modal
          visible={isNotificationsVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsNotificationsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.notifModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Notifications</Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {hasUnreadNotifs && (
                    <TouchableOpacity onPress={handleMarkAllAsRead}>
                      <Text style={styles.markAllText}>Mark all as read</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setIsNotificationsVisible(false)}
                    style={styles.closeNotifBtn}
                  >
                    <Ionicons name="close" size={20} color="#0A2540" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
                {notificationsList.length === 0 ? (
                  <View style={styles.notifItem}>
                    <View style={styles.notifIconCircle}>
                      <Ionicons
                        name="color-palette"
                        size={18}
                        color="#0284C7"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle}>
                        Welcome to CommissionMe!
                      </Text>
                      <Text style={styles.notifSub}>
                        Explore the marketplace to discover artists or manage
                        your creator account.
                      </Text>
                    </View>
                  </View>
                ) : (
                  notificationsList.map((item) => {
                    const isUnread = item.read !== true;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        style={[
                          styles.notifItem,
                          isUnread && styles.notifItemUnread,
                        ]}
                        onPress={() => handleMarkAsRead(item.id)}
                      >
                        <View
                          style={[
                            styles.notifIconCircle,
                            isUnread && styles.notifIconCircleUnread,
                          ]}
                        >
                          <Ionicons
                            name={
                              item.type === "order_request"
                                ? "cart-outline"
                                : "notifications-outline"
                            }
                            size={18}
                            color={isUnread ? "#0284C7" : "#64748B"}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={styles.notifTitleRow}>
                            <Text
                              style={[
                                styles.notifTitle,
                                isUnread && styles.notifTitleUnread,
                              ]}
                            >
                              {item.title}
                            </Text>

                            {isUnread && (
                              <TouchableOpacity
                                style={styles.markSingleBtn}
                                onPress={() => handleMarkAsRead(item.id)}
                              >
                                <Ionicons
                                  name="checkmark-done"
                                  size={14}
                                  color="#0284C7"
                                />
                                <Text style={styles.markSingleText}>
                                  Mark read
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text style={styles.notifSub}>{item.message}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0A2540" },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  notifBadgeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  listScroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyContainer: { alignItems: "center" },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  chatListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  chatNameText: { fontSize: 15, fontWeight: "800", color: "#0A2540" },
  chatLastMsg: { fontSize: 13, color: "#64748B", marginTop: 2 },
  chatContainer: { flex: 1 },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  systemNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E0F2FE",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  systemNoticeText: {
    fontSize: 12,
    color: "#0369A1",
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#0284C7",
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 2,
    elevation: 1,
  },
  messageText: { fontSize: 14, lineHeight: 19 },
  myText: { color: "#FFFFFF" },
  theirText: { color: "#1E293B" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  notifModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#0A2540" },
  markAllText: { fontSize: 12, fontWeight: "700", color: "#0284C7" },
  closeNotifBtn: { padding: 4 },
  notifItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "flex-start",
    marginBottom: 6,
  },
  notifItemUnread: {
    backgroundColor: "#F0F9FF",
    borderLeftWidth: 3,
    borderLeftColor: "#0284C7",
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  notifIconCircleUnread: {
    backgroundColor: "#E0F2FE",
  },
  notifTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTitle: { fontSize: 14, fontWeight: "600", color: "#475569" },
  notifTitleUnread: { fontWeight: "800", color: "#0F172A" },
  markSingleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  markSingleText: { fontSize: 11, fontWeight: "700", color: "#0284C7" },
  notifSub: { fontSize: 12, color: "#64748B", marginTop: 2, lineHeight: 16 },
});
