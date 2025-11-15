// Firebase v8-style compat import (works for browser modules)
// We import for side-effects only and then use the global `firebase` object
// created by the UMD scripts. This avoids ES module import issues.
import "firebase/compat/app";
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

// Access the firebase object from the window, which is created by the side-effect imports
const firebase = (window as any).firebase;

if (!firebase) {
    throw new Error("Firebase is not available on the window object. Check the firebase script imports in index.html.");
}

// Initialize Firebase safely
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

export { db };