import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration using your project credentials
const firebaseConfig = {
  apiKey: "AIzaSyDwqD1KgYKIc4YJEiaxYyc-mvnSlAo19eE",
  authDomain: "commissionme-80664.firebaseapp.com",
  projectId: "commissionme-80664",
  storageBucket: "commissionme-80664.firebasestorage.app",
  messagingSenderId: "614569890020",
  appId: "1:614569890020:web:38a985a18e1e9352489cf1",
  measurementId: "G-34RK8BL0ZB",
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
