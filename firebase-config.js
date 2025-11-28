// firebase-config.js — moduł ECMAScript (Twoja konfiguracja)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAakiYjQDl2OJMCX2RApsdsMHdMC8gv3vo",
  authDomain: "lsowebproject.firebaseapp.com",
  projectId: "lsowebproject"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
