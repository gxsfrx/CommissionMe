import { FontAwesome5 } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GetStartedScreen({ navigation }) {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.centerContent}>
        <View style={styles.logoBadge}>
          <FontAwesome5 name="paint-brush" size={36} color="#29B6F6" />
        </View>
        <Text style={styles.appTitle}>CommissionMe</Text>
        <Text style={styles.appSubtitle}>Digital Art Marketplace</Text>
        <Text style={styles.descriptionText}>
          Your journey into the world of custom digital arts starts here
        </Text>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("SignIn")}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <Text style={styles.linkText}>
            Already have an account?{" "}
            <Text
              style={styles.linkBold}
              onPress={() => navigation.navigate("SignIn")}
            >
              Sign in
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#EBF6FF",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  appTitle: { fontSize: 28, fontWeight: "700", color: "#0A2540" },
  appSubtitle: { fontSize: 16, color: "#6B7280", marginTop: 4 },
  descriptionText: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  actionSection: {
    width: "100%",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#29B6F6",
    borderRadius: 12,
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  linkText: { color: "#6B7280", fontSize: 14 },
  linkBold: { color: "#0284C7", fontWeight: "600" },
});
