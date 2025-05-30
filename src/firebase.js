// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAYAbK11Z6hVqj3YmuQSfjN-XcG_F-Gpi0",
  authDomain: "room-scheduler-for-ub.firebaseapp.com",
  databaseURL: "https://room-scheduler-for-ub-default-rtdb.firebaseio.com",
  projectId: "room-scheduler-for-ub",
  storageBucket: "room-scheduler-for-ub.firebasestorage.app",
  messagingSenderId: "868281629535",
  appId: "1:868281629535:web:8e2b689a0bd8dc02b294ea",
  measurementId: "G-WD2NV6K909"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Only initialize analytics if supported (browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, analytics, database };