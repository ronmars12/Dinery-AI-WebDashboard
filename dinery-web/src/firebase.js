// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDD_z6ttWXWXaWvnU6j3Q4EppN37DdUmuA",
  authDomain: "dinery-9c261.firebaseapp.com",
  projectId: "dinery-9c261",
  databaseURL:"https://dinery-9c261-default-rtdb.firebaseio.com/",
  storageBucket: "dinery-9c261.firebasestorage.app",
  messagingSenderId: "1090174647446",
  appId: "1:1090174647446:web:35b79590cc01403e13d6b7",
  measurementId: "G-DC3WWMRYYX"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app); 
