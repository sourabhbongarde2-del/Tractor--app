// license.js — 7-day free trial + monthly unlock system.
// Security model: Firestore Security Rules (server-side, Google ke server pe evaluate
// hote hain) enforce karte hain ki koi bhi customer apna unlockedUntil date khud nahi
// badal sakta - sirf ek REAL, unused, unke email ke naam wale code se hi unlock ho sakta
// hai. Yeh client-side code sirf UI/UX ke liye hai (date dikhana, lock-screen banana) -
// asli security rules me hai, isliye browser console se bypass nahi ho sakta.

import{db,collection,addDoc,getDocs,doc,query,where,getDoc,setDoc,updateDoc,writeBatch}from'./firebase-config.js';

const TRIAL_DAYS=7;

// ---- Global app settings (settings/global) ----
// Admin Panel se "Free Trial + Lock System" poore app ke liye ON/OFF kiya ja sakta hai.
// Jab tak Admin isko ON na kare, app sabke liye FREE rehta hai (koi trial-banner, koi
// lock-screen nahi) - naya deployment / document na hone par bhi yeh safe (free) rehta hai.
export async function getGlobalSettings(){
  try{
    const snap=await getDoc(doc(db,'settings','global'));
    if(snap.exists())return{trialLockEnabled:false,monthlyPrice:300,...snap.data()};
  }catch(e){/* network issue waghera - fail-safe: app free hi rakhte hain */}
  return{trialLockEnabled:false,monthlyPrice:300};
}

function daysFromNow(n){
  const d=new Date();d.setDate(d.getDate()+n);
  return d.toISOString();
}
function fmtDate(iso){
  if(!iso)return'—';
  try{return new Date(iso).toLocaleDateString('mr-IN',{day:'2-digit',month:'short',year:'numeric'});}catch{return iso;}
}
function daysLeft(iso){
  if(!iso)return 0;
  const diff=new Date(iso).getTime()-Date.now();
  return Math.max(0,Math.ceil(diff/86400000));
}

// Pehli baar login hone par license document banata hai (agar nahi hai), ya existing
// document return karta hai. Yeh sirf ek baar create hota hai - dusri baar customer
// isko delete/reset nahi kar sakta (rules me delete allow hi nahi hai).
export async function ensureLicense(uid,email){
  const ref=doc(db,'licenses',uid);
  const snap=await getDoc(ref);
  if(snap.exists())return{_id:uid,...snap.data()};
  const trialStart=new Date().toISOString();
  const trialEnd=daysFromNow(TRIAL_DAYS);
  const data={email,trialStart,trialEnd,unlockedUntil:null,lastCode:null,lastUnlockAt:null};
  await setDoc(ref,data);
  return{_id:uid,...data};
}

// Status check: trial chal raha hai, expire ho gaya, ya paid-unlock active hai.
// Admin agar 'disabled:true' kar de to account turant block ho jata hai - chahe
// trial/paid kuch bhi ho. Yeh Admin Panel ke "Disable" button se control hota hai.
export function licenseStatus(lic){
  if(lic.disabled===true){
    return{active:false,mode:'disabled',expiresAt:null,daysLeft:0};
  }
  const now=Date.now();
  if(lic.unlockedUntil && new Date(lic.unlockedUntil).getTime()>now){
    return{active:true,mode:'paid',expiresAt:lic.unlockedUntil,daysLeft:daysLeft(lic.unlockedUntil)};
  }
  if(lic.trialEnd && new Date(lic.trialEnd).getTime()>now){
    return{active:true,mode:'trial',expiresAt:lic.trialEnd,daysLeft:daysLeft(lic.trialEnd)};
  }
  return{active:false,mode:'expired',expiresAt:lic.unlockedUntil||lic.trialEnd,daysLeft:0};
}

// Customer code daalta hai - yahan se redeem hota hai. Do writes ek saath (batch) -
// 1) unlockCodes/{codeId} document me used:true mark hota hai
// 2) licenses/{uid} document me unlockedUntil us code ke validUntil se set hota hai
// Dono writes Security Rules se cross-verify hote hain (dekho firestore.rules) - agar
// koi bhi condition fail ho (galat email, already used code, galat date) to POORA batch
// reject ho jata hai, kuch bhi save nahi hota.
export async function redeemCode(uid,email,codeStr){
  const q=query(collection(db,'unlockCodes'),where('code','==',codeStr.trim().toUpperCase()));
  const snap=await getDocs(q);
  if(snap.empty)throw new Error('NOT_FOUND');
  const codeDoc=snap.docs[0];
  const cd=codeDoc.data();
  if(cd.email!==email)throw new Error('WRONG_EMAIL');
  if(cd.used)throw new Error('ALREADY_USED');
  if(new Date(cd.validUntil).getTime()<Date.now())throw new Error('CODE_EXPIRED');

  const batch=writeBatch(db);
  batch.update(doc(db,'unlockCodes',codeDoc.id),{used:true,usedAt:new Date().toISOString(),usedBy:uid});
  batch.update(doc(db,'licenses',uid),{unlockedUntil:cd.validUntil,lastCode:codeDoc.id,lastUnlockAt:new Date().toISOString()});
  await batch.commit();
  return cd.validUntil;
}

export{fmtDate,daysLeft};
