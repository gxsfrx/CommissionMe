import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { registerRootComponent } from "expo";
import BookmarksScreen from "./screens/BookmarksScreen";
import CommissionsScreen from "./screens/CommissionsScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import GetStartedScreen from "./screens/GetStartedScreen";
import MyPurchasesScreen from "./screens/MyPurchasesScreen";
import OrdersScreen from "./screens/OrdersScreen";
import PayoutsScreen from "./screens/PayoutsScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ServicesScreen from "./screens/ServicesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import SignInScreen from "./screens/SignInScreen";
import WalletScreen from "./screens/WalletScreen";
import AccountScreen from "./tabs/AccountScreen";
import DashboardScreen from "./tabs/DashboardScreen";
import MarketScreen from "./tabs/MarketScreen";
import MessagesScreen from "./tabs/MessagesScreen";
import PostScreen from "./tabs/PostScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#0284C7",
        tabBarInactiveTintColor: "#4B5563",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          height: 100,
          paddingTop: 10,
          paddingBottom: 40,
          borderTopColor: "#E5E7EB",
          borderTopWidth: 1,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarIcon: ({ color }) => {
          let iconName = "bag-handle";
          if (route.name === "Market") iconName = "bag-handle";
          else if (route.name === "Messages") iconName = "chatbubbles";
          else if (route.name === "Post") iconName = "add-circle";
          else if (route.name === "Dashboard") iconName = "grid";
          else if (route.name === "Account") iconName = "person";

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Market" component={MarketScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Post" component={PostScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="GetStarted"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="GetStarted" component={GetStartedScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="MyPurchases" component={MyPurchasesScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Commissions" component={CommissionsScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="Payouts" component={PayoutsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

registerRootComponent(App);
