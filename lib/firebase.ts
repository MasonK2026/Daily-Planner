import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBxdEJRWWEpCwhT4GkRkB0XgXcYv0L_oqk",
  authDomain: "daily-planner-6e36c.firebaseapp.com",
  projectId: "daily-planner-6e36c",
  storageBucket: "daily-planner-6e36c.firebasestorage.app",
  messagingSenderId: "573057324772",
  appId: "1:573057324772:web:0b6161c4ca3a4a74f8bef1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
