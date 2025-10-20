// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBI3wvjEESM-NuN2zpNurhUhFGKvXg-d8k",
  authDomain: "dpproject-bafa1.firebaseapp.com",
  projectId: "dpproject-bafa1",
  storageBucket: "dpproject-bafa1.firebasestorage.app",
  messagingSenderId: "658951426341",
  appId: "1:658951426341:web:8ef10ad74c36edf1248acc",
  measurementId: "G-WXJXY0T7XH"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // If using auth

export { db, auth };