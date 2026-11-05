import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

export default function SignInScreen({ navigation }) {
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier || !password) {
      Alert.alert("Error", "Please enter your email/username and password.");
      return;
    }

    setLoading(true);
    try {
      let targetEmail = cleanIdentifier;

      if (!cleanIdentifier.includes("@")) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", cleanIdentifier));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          Alert.alert("Sign In Failed", "Username not found.");
          setLoading(false);
          return;
        }

        const userData = querySnapshot.docs[0].data();
        targetEmail = userData.email;
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        targetEmail,
        password,
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        Alert.alert(
          "Email Not Verified",
          "Please check your inbox and verify your email address before signing in.",
          [{ text: "OK" }],
        );
        // Sign them out right away so they don't remain logged in unverified
        await auth.signOut();
        setLoading(false);
        return;
      }

      navigation.navigate("MainTabs");
    } catch (error) {
      Alert.alert("Sign In Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.centerContent}>
        <View style={styles.logoBadge}>
          <FontAwesome5 name="paint-brush" size={36} color="#29B6F6" />
        </View>
        <Text style={styles.screenTitle}>Welcome Back</Text>
        <Text style={styles.screenSubTitle}>Sign in to CommissionMe</Text>

        <View style={styles.cardForm}>
          <Text style={styles.label}>Email/Username</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com or username"
            placeholderTextColor="#999"
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.linkText}>
          Don't have an account?{" "}
          <Text
            style={styles.linkBold}
            onPress={() => navigation.navigate("Register")}
          >
            Register
          </Text>
        </Text>
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
  centerContent: { alignItems: "center" },
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
  screenTitle: { fontSize: 26, fontWeight: "700", color: "#0A2540" },
  screenSubTitle: { fontSize: 14, color: "#6B7280", marginBottom: 20 },
  cardForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  eyeIcon: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: "#29B6F6",
    borderRadius: 12,
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  linkText: { color: "#6B7280", fontSize: 14 },
  linkBold: { color: "#0284C7", fontWeight: "600" },
});
