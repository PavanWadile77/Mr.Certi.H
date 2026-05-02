// Firebase Configuration for Mr.Certi
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBuTV1Yeh77iWt8nJ8V09gUNUhagyhg4iY",
  authDomain: "mr-certi.firebaseapp.com",
  projectId: "mr-certi",
  storageBucket: "mr-certi.firebasestorage.app",
  messagingSenderId: "60676407665",
  appId: "1:60676407665:web:1113311464e6b6dc45b6d0",
  measurementId: "G-CRDZXN6TYD"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, analytics };
