// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import dotenv from 'dotenv';
dotenv.config();

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.APIKEY,
  authDomain: process.env.AUTHDOMAUN,
  projectId: "mshashazwinepe-8489d",
  storageBucket: process.env.STORAGEBUCKET,
  messagingSenderId: "1020679564289",
  appId: "1:1020679564289:web:93a9c669415deeaf42a400"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
