import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
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

export default function WalletScreen({ navigation }) {
  const [walletBalance, setWalletBalance] = useState(0.0);
  const [isAddFundsVisible, setIsAddFundsVisible] = useState(false);
  const [amountToAdd, setAmountToAdd] = useState("");

  const handleAddFunds = () => {
    const num = parseFloat(amountToAdd);
    if (isNaN(num) || num <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    setWalletBalance((prev) => prev + num);
    setAmountToAdd("");
    setIsAddFundsVisible(false);
    Alert.alert("Success", `$${num.toFixed(2)} added to your wallet!`);
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
          <Text style={styles.headerTitle}>Digital Wallet</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Balance Card */}
          <View style={styles.walletCard}>
            <Text style={styles.walletCardLabel}>Available Balance</Text>
            <Text style={styles.walletCardAmount}>
              ${walletBalance.toFixed(2)}
            </Text>
            <TouchableOpacity
              style={styles.addFundsBtn}
              onPress={() => setIsAddFundsVisible(true)}
            >
              <Ionicons name="add-circle" size={18} color="#0284C7" />
              <Text style={styles.addFundsBtnText}>Add Funds</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Add Funds Dialog Modal */}
        <Modal
          visible={isAddFundsVisible}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.overlay}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add Wallet Funds</Text>
              <Text style={styles.dialogSub}>Enter amount to add:</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={amountToAdd}
                onChangeText={setAmountToAdd}
              />
              <View style={styles.dialogButtons}>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: "#E2E8F0" }]}
                  onPress={() => setIsAddFundsVisible(false)}
                >
                  <Text style={{ color: "#475569", fontWeight: "700" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: "#0284C7" }]}
                  onPress={handleAddFunds}
                >
                  <Text style={{ color: "#FFF", fontWeight: "700" }}>Add</Text>
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
  walletCard: {
    backgroundColor: "#0284C7",
    borderRadius: 20,
    padding: 24,
    elevation: 3,
  },
  walletCardLabel: { color: "#BAE6FD", fontSize: 13, fontWeight: "600" },
  walletCardAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    marginVertical: 10,
  },
  addFundsBtn: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
  },
  addFundsBtnText: { color: "#0284C7", fontWeight: "700", fontSize: 14 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  dialogCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20 },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0A2540",
    marginBottom: 4,
  },
  dialogSub: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  dialogInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  dialogButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  dialogBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
});
