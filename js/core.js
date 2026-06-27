// core.js — Shared state, helpers, ad banners, toast, nav/render router, auth wiring.
// Sab page-files (dashboard.js, work-entry.js, etc.) yahan se helpers import karte hain.

import{auth,db,gp,collection,addDoc,getDocs,updateDoc,deleteDoc,doc,query,where,signInWithPopup,signOut,onAuthStateChanged,friendlyErr}from'./firebase-config.js';
import{ensureLicense,licenseStatus,redeemCode,fmtDate}from'./license.js';

export{auth,db,collection,addDoc,getDocs,updateDoc,deleteDoc,doc,query,where,friendlyErr};

// ---- Global state ----
export let CU=null,LANG=localStorage.getItem('tw_lang')||'mr',DARK=localStorage.getItem('tw_dark')==='true';
export let PROF=null,PAGE='dashboard',editWID=null,invWID=null,khFarmerName=null;
export function setEditWID(v){editWID=v;}
export function setInvWID(v){invWID=v;}
export function setKhFarmerName(v){khFarmerName=v;}
if(DARK)document.documentElement.setAttribute('data-theme','dark');

// ---- i18n ----
export const TX={
  mr:{lChip:'शेतकऱ्यांसाठी #1 ऍप',lH1a:'आपला ट्रॅक्टर',lH1b:'व्यवसाय डिजिटल करा',lSub:'काम, खर्च, पेमेंट — सर्व एकाच ठिकाणी.',lBtn:'Google ने Login करा',
    lSt1:'सेटअप फी',lSt2:'डेटा सुरक्षित',lSt3:'कधीही वापरा',lFlowTtl:'असे चालते',
    lf1:'काम नोंदवा',lf1d:'शेतकरी, काम व दर टाका',lf2:'पेमेंट ट्रॅक करा',lf2d:'बाकी आपोआप दिसते',lf3:'रिपोर्ट पाठवा',lf3d:'WhatsApp / PDF वर',
    dashboard:'डॅशबोर्ड','work-entry':'काम नोंद','work-list':'काम यादी','rate-card':'दर कार्ड',expenses:'खर्च',payments:'पेमेंट',invoice:'Invoice',shetkari:'शेतकरी DB',khata:'शेतकरी खाता',reports:'अहवाल',backup:'Backup',profile:'प्रोफाइल'},
  hi:{lChip:'किसानों के लिए #1 ऐप',lH1a:'अपना ट्रैक्टर',lH1b:'व्यापार डिजिटल करें',lSub:'काम, खर्च, भुगतान — सब एक जगह।',lBtn:'Google से Login करें',
    lSt1:'सेटअप फीस',lSt2:'डेटा सुरक्षित',lSt3:'कभी भी इस्तेमाल करें',lFlowTtl:'ऐसे काम करता है',
    lf1:'काम दर्ज करें',lf1d:'किसान, काम व दर डालें',lf2:'भुगतान ट्रैक करें',lf2d:'बाकी अपने-आप दिखेगी',lf3:'रिपोर्ट भेजें',lf3d:'WhatsApp / PDF पर',
    dashboard:'डैशबोर्ड','work-entry':'काम दर्ज','work-list':'काम सूची','rate-card':'दर कार्ड',expenses:'खर्च',payments:'भुगतान',invoice:'Invoice',shetkari:'किसान DB',khata:'किसान खाता',reports:'रिपोर्ट',backup:'Backup',profile:'प्रोफाइल'},
  en:{lChip:'#1 App for Farmers',lH1a:'Digitize Your',lH1b:'Tractor Business',lSub:'Work, expenses, payments — all in one place.',lBtn:'Login with Google',
    lSt1:'Setup Fee',lSt2:'Data Secure',lSt3:'Use Anytime',lFlowTtl:'How It Works',
    lf1:'Log the Work',lf1d:'Add farmer, work & rate',lf2:'Track Payments',lf2d:'Balance shown automatically',lf3:'Send Report',lf3d:'Via WhatsApp / PDF',
    dashboard:'Dashboard','work-entry':'Add Work','work-list':'Work List','rate-card':'Rate Card',expenses:'Expenses',payments:'Payments',invoice:'Invoice',shetkari:'Farmer DB',khata:'Farmer Khata',reports:'Reports',backup:'Backup',profile:'Profile'}
};
export const t=k=>(TX[LANG]||TX.mr)[k]||k;

window.setLang=function(l){
  LANG=l;localStorage.setItem('tw_lang',l);
  ['lChip','lH1a','lH1b','lSub','lBtn','lSt1','lSt2','lSt3','lFlowTtl'].forEach(id=>{
    const el=document.getElementById(id);if(el&&TX[l][id])el.textContent=TX[l][id];
  });
  [1,2,3].forEach(n=>{
    const elT=document.getElementById('lf'+n);const txt=TX[l]['lf'+n];
    const elD=document.getElementById('lf'+n+'d');const dtx=TX[l]['lf'+n+'d'];
    if(elT&&txt)elT.textContent=txt;
    if(elD&&dtx)elD.textContent=dtx;
  });
  ['mr','hi','en'].forEach(x=>{document.getElementById('l'+x)?.classList.toggle('on',x===l);});
  if(PAGE)render(PAGE);
};

// ---- Core helpers ----
export const uid=()=>CU?.uid;
export const col=c=>collection(db,c);
export const uq=c=>{if(!uid())throw new Error('Not authenticated');return query(col(c),where('uid','==',uid()));};
export const fmt=n=>new Intl.NumberFormat('en-IN').format(Math.round(n||0));
export const fmtD=d=>{if(!d)return'—';try{return new Date(d+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'});}catch{return d;}};
export const today=()=>new Date().toISOString().split('T')[0];
export const ym=()=>today().slice(0,7);

export function flDates(arr,f,s,e){
  if(f==='all')return arr;
  if(f==='today')return arr.filter(i=>i.date===today());
  if(f==='week'){const d=new Date();d.setDate(d.getDate()-6);const ss=d.toISOString().split('T')[0];return arr.filter(i=>i.date&&i.date>=ss);}
  if(f==='month')return arr.filter(i=>i.date&&i.date.startsWith(ym()));
  if(f==='custom'&&s&&e)return arr.filter(i=>i.date&&i.date>=s&&i.date<=e);
  return arr;
}
export const paidOf=w=>(w.payments||[]).reduce((s,x)=>s+(x.amount||0),0);
export const balOf=w=>(w.total||0)-paidOf(w);
// Normalizes any mobile number to a clean 91XXXXXXXXXX format for WhatsApp links
export const waNum=m=>{
  if(!m)return'';
  let d=String(m).replace(/[^0-9]/g,'');
  if(d.length===10)d='91'+d;
  else if(d.length===12&&d.startsWith('91')){/* already correct */}
  else if(d.length>10)d=d.slice(-10);
  if(d.length===10)d='91'+d;
  return d;
};
// Case/space-insensitive key for matching farmer names ("Ramesh" === "ramesh ")
export const nameKey=s=>(s||'').trim().toLowerCase().replace(/\s+/g,' ');

// ---- Safe lookup registry ----
// Records ko by id store karte hain taaki onclick attributes me JSON.stringify(...)
// seedha na daalna pade - naam/notes me ' ya special characters hone par wo pattern
// HTML attribute todta tha aur record edit/click nahi hota tha.
window._reg={};
window._regSet=function(arr){arr.forEach(x=>{if(x&&x._id)window._reg[x._id]=x;});return arr;};
window._regGet=function(id){return window._reg[id]||null;};

// ---- Toast ----
window.toast=function(msg,type='ok',ms=3000){
  const c=document.getElementById('toast-c');
  const d=document.createElement('div');d.className='toast '+type;
  d.innerHTML=`<i class="fas fa-${type==='ok'?'check-circle':type==='err'?'times-circle':'exclamation-circle'}"></i>${msg}`;
  c.appendChild(d);setTimeout(()=>d.remove(),ms);
};
export const toast=window.toast;

// ---- Double-submit guard ----
// Usage: if(!lock('saveWork'))return; ... finally unlock('saveWork');
const _busy=new Set();
export function lock(key){if(_busy.has(key))return false;_busy.add(key);return true;}
export function unlock(key){_busy.delete(key);}

// ---- Ad banners (Blinkit-style, every page) ----
let _adsCache=null;
async function loadAds(){
  if(_adsCache)return _adsCache;
  try{
    const r=await fetch('assets/add/ads-config.json');
    const j=await r.json();
    _adsCache=(j.banners||[]).filter(b=>b.active);
  }catch(_){_adsCache=[];}
  return _adsCache;
}
export async function adBannerHTML(placement){
  const ads=await loadAds();
  const list=ads.filter(a=>a.placement===placement);
  if(list.length===0)return'';
  if(list.length===1){
    const b=list[0];
    const inner=`<img src="${b.image}" alt="ad" onerror="this.closest('.ad-strip').style.display='none'"/><span class="ad-tag">Ad</span>`;
    return b.link?`<a class="ad-strip" href="${b.link}" target="_blank" rel="noopener">${inner}</a>`:`<div class="ad-strip">${inner}</div>`;
  }
  const cid='adc_'+placement.replace(/[^a-z0-9]/gi,'');
  const slides=list.map((b,i)=>{
    const inner=`<img src="${b.image}" alt="ad" onerror="this.style.display='none'"/>`;
    return b.link
      ?`<a class="adc-slide" href="${b.link}" target="_blank" rel="noopener" style="opacity:${i===0?1:0}">${inner}</a>`
      :`<div class="adc-slide" style="opacity:${i===0?1:0}">${inner}</div>`;
  }).join('');
  const dots=list.map((_,i)=>`<span class="adc-dot ${i===0?'on':''}"></span>`).join('');
  setTimeout(()=>initAdCarousel(cid,list.length),0);
  return `<div class="ad-strip adc" id="${cid}"><span class="ad-tag">Ad</span>${slides}<div class="adc-dots">${dots}</div></div>`;
}
const _adcTimers={};
function initAdCarousel(cid,count){
  const el=document.getElementById(cid);
  if(!el||_adcTimers[cid])return;
  let idx=0;
  _adcTimers[cid]=setInterval(()=>{
    const node=document.getElementById(cid);
    if(!node){clearInterval(_adcTimers[cid]);delete _adcTimers[cid];return;}
    const slides=node.querySelectorAll('.adc-slide');
    const dots=node.querySelectorAll('.adc-dot');
    slides[idx].style.opacity=0;dots[idx]?.classList.remove('on');
    idx=(idx+1)%count;
    slides[idx].style.opacity=1;dots[idx]?.classList.add('on');
  },4000);
}

// ---- Auto-backup ----
// Har save/edit/delete ke baad chhota JSON snapshot 'backups' collection me likh dete hain
// (background me, silently). Failure bhi silently ignore hota hai - kabhi user ka save
// block nahi karna, backup sirf ek extra safety hai.
export async function autoBackup(action,collectionName,data){
  try{
    await addDoc(col('backups'),{
      uid:uid(),action,collection:collectionName,
      snapshot:JSON.stringify(data).slice(0,9000), // Firestore 1MB doc limit ke andar rakhne ke liye
      at:new Date().toISOString()
    });
  }catch(_){/* backup fail hua to bhi silently ignore - asal save kabhi block nahi hona chahiye */}
}

// ---- Nav / render router ----
// Pages lazily import() hote hain - taaki ek page ka code doosre page load hone tak na aaye.
const PAGE_MODULES={
  dashboard:()=>import('./dashboard.js').then(m=>m.pgDash),
  'work-entry':()=>import('./work-entry.js').then(m=>m.pgWE),
  'work-list':()=>import('./work-list.js').then(m=>m.pgWL),
  'rate-card':()=>import('./rate-card.js').then(m=>m.pgRC),
  expenses:()=>import('./expenses.js').then(m=>m.pgEx),
  payments:()=>import('./payments.js').then(m=>m.pgPay),
  invoice:()=>import('./invoice.js').then(m=>m.pgInv),
  shetkari:()=>import('./shetkari.js').then(m=>m.pgShk),
  khata:()=>import('./khata.js').then(m=>m.pgKhata),
  reports:()=>import('./reports.js').then(m=>m.pgRep),
  backup:()=>import('./backup.js').then(m=>m.pgBk),
  profile:()=>import('./profile.js').then(m=>m.pgProf)
};

export function nav(page){
  PAGE=page;
  window._currentPage=page;
  document.querySelectorAll('.nb[data-p],.bnav-btn[data-p]').forEach(b=>b.classList.toggle('on',b.dataset.p===page));
  document.getElementById('pageTtl').textContent=t(page)||page;
  render(page);
}
window.nav=nav;

export async function render(page){
  const area=document.getElementById('ct');
  area.innerHTML='<div class="spin"></div>';
  try{
    const loader=PAGE_MODULES[page]||PAGE_MODULES.dashboard;
    const pgFn=await loader();
    await pgFn(area);
  }catch(e){
    console.error(e);
    area.innerHTML=`<div class="card"><p style="color:var(--red)">${friendlyErr(e)}</p></div>`;
  }
}
window.render=render;

window.sbOpen=()=>{document.getElementById('sb').classList.add('on');document.getElementById('sbOv').classList.add('on');};
window.sbClose=()=>{document.getElementById('sb').classList.remove('on');document.getElementById('sbOv').classList.remove('on');};
window.toggleDark=()=>{DARK=!DARK;localStorage.setItem('tw_dark',DARK);document.documentElement.setAttribute('data-theme',DARK?'dark':'light');};
window.closeM=id=>document.getElementById(id)?.classList.add('h');
// Shared nav helper - called from Dashboard, Work List, Payments, Khata - sab jagah se
window.openInv=id=>{setInvWID(id);nav('invoice');};

// ---- Profile ----
export async function loadProf(){
  try{
    const snap=await getDocs(uq('profiles'));
    if(snap.empty){
      const ref=await addDoc(col('profiles'),{uid:uid(),businessName:'माझा ट्रॅक्टर',ownerName:CU.displayName||'',phone:'',upiId:'',createdAt:today()});
      PROF={_id:ref.id,businessName:'माझा ट्रॅक्टर',ownerName:CU.displayName||'',phone:'',upiId:''};
    }else{PROF={_id:snap.docs[0].id,...snap.docs[0].data()};}
  }catch(e){PROF={businessName:'TractorWala',ownerName:'',phone:'',upiId:''};}
}
export function setProf(p){PROF=p;}
export const gProf=()=>PROF||{businessName:'TractorWala',ownerName:'',phone:'',upiId:''};

export async function updBadge(){
  try{
    const snap=await getDocs(uq('works'));let c=0;
    snap.forEach(d=>{if(balOf(d.data())>0.01)c++;});
    ['pendBadge','pendBadge2'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){el.textContent=c;el.classList.toggle('h',c===0);}
    });
  }catch(e){}
}
window.updBadge=updBadge;

// ---- Auth wiring ----
window.doLogin=async()=>{try{await signInWithPopup(auth,gp);}catch(e){toast(friendlyErr(e),'err');}};
window.doLogout=async()=>{
  if(!confirm('बाहेर पडायचे आहे का?'))return;
  await signOut(auth);CU=null;PROF=null;editWID=null;
  document.getElementById('app').classList.add('h');
  document.getElementById('land').classList.remove('h');
};
onAuthStateChanged(auth,async u=>{
  if(u){
    CU=u;
    document.getElementById('land').classList.add('h');

    // Trial/unlock check - server-side Security Rules enforce ki yeh status sahi hai,
    // koi bhi browser console se bypass nahi kar sakta.
    let lic;
    try{lic=await ensureLicense(u.uid,u.email);}catch(e){
      // Agar license check hi fail ho jaye (network issue waghera), app ko block karna
      // zyada surakshit hai loading me atka rehne se - lekin user ko clear reason dikhao
      document.getElementById('app').classList.add('h');
      document.getElementById('lockScreen').classList.remove('h');
      document.getElementById('lockMsg').textContent='⚠️ License तपासताना अडचण आली. इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.';
      return;
    }
    const st=licenseStatus(lic);
    window._licStatus=st;window._licData=lic;

    if(!st.active){
      document.getElementById('app').classList.add('h');
      showLockScreen();
      return;
    }
    document.getElementById('lockScreen').classList.add('h');
    document.getElementById('app').classList.remove('h');
    document.getElementById('sbNm').textContent=u.displayName||'User';
    document.getElementById('sbEm').textContent=u.email||'';
    document.getElementById('sbAv').textContent=(u.displayName||u.email||'U').charAt(0).toUpperCase();
    showTrialBanner(st);
    await loadProf();
    nav('dashboard');
    updBadge();
  }
});

function showTrialBanner(st){
  const el=document.getElementById('trialBanner');
  if(!el)return;
  if(st.mode==='trial'){
    el.classList.remove('h');
    el.innerHTML=`⏳ Free Trial: <b>${st.daysLeft} दिवस</b> उरले आहेत (संपेल: ${fmtDate(st.expiresAt)})`;
  }else if(st.mode==='paid'&&st.daysLeft<=3){
    el.classList.remove('h');
    el.innerHTML=`⚠️ Subscription <b>${st.daysLeft} दिवसात</b> संपेल (${fmtDate(st.expiresAt)}). वेळेत रिन्यू करा.`;
  }else{
    el.classList.add('h');
  }
}

function showLockScreen(){
  const mo=document.getElementById('lockScreen');
  mo.classList.remove('h');
  document.getElementById('lockMsg').textContent='तुमचा 7-दिवसांचा मोफत ट्रायल संपला आहे. कृपया ₹300/महिना पेमेंट करून सुरू ठेवा.';
}
window.redeemUnlockCode=async function(){
  const inp=document.getElementById('lockCodeInp');
  const code=inp?.value.trim();
  if(!code){toast('Code टाका','err');return;}
  const btn=document.getElementById('lockRedeemBtn');
  if(btn)btn.disabled=true;
  try{
    const validUntil=await redeemCode(CU.uid,CU.email,code);
    toast('✅ Unlock झाले! धन्यवाद.');
    document.getElementById('lockScreen').classList.add('h');
    document.getElementById('app').classList.remove('h');
    window._licStatus={active:true,mode:'paid',expiresAt:validUntil,daysLeft:30};
    showTrialBanner(window._licStatus);
    await loadProf();
    nav('dashboard');
    updBadge();
  }catch(e){
    const m=e.message;
    const msgs={
      NOT_FOUND:'⚠️ हा Code सापडला नाही. बरोबर टाकला आहे का तपासा.',
      WRONG_EMAIL:'⚠️ हा Code तुमच्या खात्यासाठी नाही.',
      ALREADY_USED:'⚠️ हा Code आधीच वापरला गेला आहे.',
      CODE_EXPIRED:'⚠️ हा Code कालबाह्य झाला आहे. नवीन Code मागवा.'
    };
    toast(msgs[m]||friendlyErr(e),'err');
  }finally{if(btn)btn.disabled=false;}
};

document.querySelectorAll('.nb[data-p],.bnav-btn[data-p]').forEach(b=>{
  b.addEventListener('click',()=>{
    // Khata pe seedha nav button se gaye (kisi specific farmer se nahi) to farmer-picker fresh dikhana hai
    if(b.dataset.p==='khata')window._khataName=null;
    nav(b.dataset.p);window.sbClose();
  });
});

// payments.js (openPayMo) aur khata.js (openKhataByName) ke window functions
// Dashboard, Work List, Shetkari, Reports — sab jagah se onclick me call hote hain,
// isliye inhe turant load karte hain (lazy import() ka wait nahi karte), warna agar
// user pehli baar Dashboard pe hi click kare to function abhi tak define nahi hua hoga.
// reports.js bhi isi wajah se eager hai - shareDailyWA/dlDailyPDF Dashboard se call hote hain.
import('./payments.js');
import('./khata.js');
import('./reports.js');

setLang(LANG);

// App khula rehte hue bhi agar subscription expire ho jaye (jaise user ne raat 11:59 PM
// pe app khola tha aur raat 12 baj gaye), to bina refresh kiye bhi automatically lock ho
// jaye - isliye har 5 minute me license status dobara check karte hain.
setInterval(async()=>{
  if(!CU)return;
  try{
    const lic=await ensureLicense(CU.uid,CU.email);
    const st=licenseStatus(lic);
    window._licStatus=st;
    if(!st.active){
      document.getElementById('app').classList.add('h');
      showLockScreen();
    }
  }catch(_){/* network issue - silently skip, next interval try karega */}
},5*60*1000);
