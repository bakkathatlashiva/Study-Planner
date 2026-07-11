import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCukWz58ttu56Ywq3e5Bi1RFpYlWx3IM_g",
  authDomain: "study-planner-45e66.firebaseapp.com",
  projectId: "study-planner-45e66",
  storageBucket: "study-planner-45e66.firebasestorage.app",
  messagingSenderId: "262381768373",
  appId: "1:262381768373:web:9cf0b175e61eef0decf8fc",
  measurementId: "G-BZ9QTZE6MH",
};

const app = initializeApp(firebaseConfig);

// Initialize Analytics only when the browser supports it (avoids SSR/module-load crashes)
isSupported().then((yes) => {
  if (yes) getAnalytics(app);
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
