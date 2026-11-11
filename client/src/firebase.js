// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth,GoogleAuthProvider } from "firebase/auth";
//imort { GoogleAuthProvider } from "firebase/auth" ;
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByMS2VdDSi_aeZNyPlCBhZ_8hZ9fID8nk",
  authDomain: "mockai-d36b0.firebaseapp.com",
  projectId: "mockai-d36b0",
  storageBucket: "mockai-d36b0.firebasestorage.app",
  messagingSenderId: "177979944712",
  appId: "1:177979944712:web:c6dab8be796692eb9746bd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider=new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);