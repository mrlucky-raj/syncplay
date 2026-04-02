import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDaWP9bCiwR4tKA9gZeEI7sGspfZgAJj8c",
  authDomain: "jarvis-406b5.firebaseapp.com",
  databaseURL: "https://jarvis-406b5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jarvis-406b5",
  storageBucket: "jarvis-406b5.firebasestorage.app",
  messagingSenderId: "636278644217",
  appId: "1:636278644217:web:4999aac536c149f7907128"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Sign in anonymously to access the database if rules require auth
signInAnonymously(auth).catch((error) => {
  console.error("Anonymous auth failed:", error);
});
