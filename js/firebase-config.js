// firebase-config.js — Firebase initialize + auth/db + friendly error messages
// Same Firebase project use ho raha hai jo pehle se tha (koi naya project nahi banaya)
// Yeh aur saari js/ files ES modules hain, isliye import/export se ek dusre se connect hoti hain.

import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{getFirestore,collection,addDoc,getDocs,updateDoc,deleteDoc,doc,query,where,enableIndexedDbPersistence}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const FB_CFG={apiKey:"AIzaSyDjfVQEw5XT3lK7gb6oM5JQ84UNEeVNz1I",authDomain:"tractor--app.firebaseapp.com",projectId:"tractor--app",storageBucket:"tractor--app.firebasestorage.app",messagingSenderId:"864431539732",appId:"1:864431539732:web:39bcde2318404733ee8901"};
const fba=initializeApp(FB_CFG);

export const auth=getAuth(fba);
export const db=getFirestore(fba);
export const gp=new GoogleAuthProvider();

// Offline support: data cache me rehta hai, net slow/jaane par bhi app khulta hai
try{enableIndexedDbPersistence(db);}catch(_){/* multi-tab open ya unsupported browser - ignore */}

export{collection,addDoc,getDocs,updateDoc,deleteDoc,doc,query,where,signInWithPopup,signOut,onAuthStateChanged};

export function friendlyErr(e){
  const m=(e&&e.message)||'';
  if(m.includes('permission')||m.includes('Permission'))return'⚠️ परवानगी नाही. पुन्हा Login करा.';
  if(m.includes('network')||m.includes('Network')||m.includes('unavailable'))return'⚠️ इंटरनेट कनेक्शन तपासा.';
  if(m.includes('Not authenticated'))return'⚠️ कृपया पुन्हा Login करा.';
  return'⚠️ काहीतरी चुकले. पुन्हा प्रयत्न करा.';
}
