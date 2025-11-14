// Firebase v9+ modular compat import
// This is more robust than relying on side-effect imports and the global `window` object.
import firebase from "firebase/compat/app";
import "firebase/compat/database";

// Your Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyB1n_1okTZg8zTpxQexVbVqEqcrKAYq9Ho",
  authDomain: "facultybiometrcattendance.firebaseapp.com",
  databaseURL: "https://facultybiometrcattendance-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "facultybiometrcattendance",
  storageBucket: "facultybiometrcattendance.firebasestorage.app",
  messagingSenderId: "1060264187584",
  appId: "1:1060264187584:web:7589519ff42f223f937f25"
};

// Initialize Firebase safely
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

export { db };