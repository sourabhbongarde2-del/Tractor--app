// admin.js — Hidden Admin Panel logic. Generates unlock codes, manages users
// (view all customers, enable/disable accounts, edit trial dates manually).
// Sirf admin (sourabhbongarde2@gmail.com) ka Google login is panel me kaam karega -
// koi aur email login kare to Firestore rules khud reject kar denge (server-side check),
// yeh client-side check sirf turant UI feedback ke liye hai.
import{auth,db,gp,collection,addDoc,getDocs,doc,updateDoc,getDoc,setDoc,signInWithPopup,signOut,onAuthStateChanged,friendlyErr}from'./firebase-config.js';

const ADMIN_EMAIL='sourabhbongarde2@gmail.com';

window.adminLogin=async()=>{
  try{await signInWithPopup(auth,gp);}catch(e){toast(friendlyErr(e),'err');}
};
window.adminLogout=async()=>{await signOut(auth);};

function toast(msg,type='ok'){
  const c=document.getElementById('admToast');
  const d=document.createElement('div');
  d.className='adm-toast '+type;
  d.textContent=msg;
  c.appendChild(d);
  setTimeout(()=>d.remove(),3500);
}
function fmtDate(iso){
  if(!iso)return'—';
  try{return new Date(iso).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}catch{return iso;}
}
function daysLeft(iso){
  if(!iso)return 0;
  const diff=new Date(iso).getTime()-Date.now();
  return Math.max(0,Math.ceil(diff/86400000));
}

function genCode(){
  // Readable, typo-resistant code: TW-XXXX-XXXX (uppercase letters+digits, no confusing chars like 0/O/1/I)
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s='';
  for(let i=0;i<8;i++){if(i===4)s+='-';s+=chars[Math.floor(Math.random()*chars.length)];}
  return 'TW-'+s;
}

onAuthStateChanged(auth,async u=>{
  const loginView=document.getElementById('admLogin');
  const panelView=document.getElementById('admPanel');
  if(!u){
    loginView.classList.remove('h');panelView.classList.add('h');
    return;
  }
  if(u.email!==ADMIN_EMAIL){
    loginView.classList.add('h');panelView.classList.add('h');
    document.getElementById('admDenied').classList.remove('h');
    document.getElementById('admDeniedEmail').textContent=u.email;
    return;
  }
  document.getElementById('admDenied').classList.add('h');
  loginView.classList.add('h');
  panelView.classList.remove('h');
  document.getElementById('admEmail').textContent=u.email;
  await loadCodes();
  await loadUsers();
  await loadSettings();
});

// ---- Tabs ----
window.admSwitchTab=function(tab){
  document.getElementById('admTabCodes').classList.toggle('on',tab==='codes');
  document.getElementById('admTabUsers').classList.toggle('on',tab==='users');
  document.getElementById('admTabSettings').classList.toggle('on',tab==='settings');
  document.getElementById('admPaneCodes').classList.toggle('h',tab!=='codes');
  document.getElementById('admPaneUsers').classList.toggle('h',tab!=='users');
  document.getElementById('admPaneSettings').classList.toggle('h',tab!=='settings');
};

// ---- Settings (settings/global doc) ----
// "Free Trial + Lock" system poore app ke liye ON/OFF karta hai. OFF hote hi
// (default state, naya deployment) app sabke liye free ho jata hai - koi trial
// banner ya lock screen nahi dikhta.
async function loadSettings(){
  const statusEl=document.getElementById('admLockStatusText');
  const toggle=document.getElementById('admLockToggle');
  try{
    const snap=await getDoc(doc(db,'settings','global'));
    const enabled=snap.exists()?!!snap.data().trialLockEnabled:false;
    toggle.checked=enabled;
    statusEl.textContent=enabled?'🔒 ON — Trial + Payment Lock सुरू आहे':'🟢 OFF — App सर्वांसाठी सध्या मोफत आहे';
  }catch(e){statusEl.textContent=friendlyErr(e);}
}
window.admToggleLockSystem=async function(checked){
  const statusEl=document.getElementById('admLockStatusText');
  const toggle=document.getElementById('admLockToggle');
  toggle.disabled=true;
  try{
    await setDoc(doc(db,'settings','global'),{trialLockEnabled:checked,updatedAt:new Date().toISOString()},{merge:true});
    statusEl.textContent=checked?'🔒 ON — Trial + Payment Lock सुरू आहे':'🟢 OFF — App सर्वांसाठी सध्या मोफत आहे';
    toast(checked?'✅ Trial/Lock System चालू केले':'✅ App आता सर्वांसाठी मोफत केले');
  }catch(e){
    toggle.checked=!checked; // revert on failure
    toast(friendlyErr(e),'err');
  }finally{toggle.disabled=false;}
};

// ---- Unlock Codes ----
window.generateCode=async function(){
  const email=document.getElementById('admCustEmail').value.trim().toLowerCase();
  const days=parseInt(document.getElementById('admDays').value)||30;
  if(!email||!email.includes('@')){toast('योग्य Email टाका','err');return;}
  const btn=document.getElementById('admGenBtn');
  btn.disabled=true;
  try{
    const code=genCode();
    const validUntil=new Date();validUntil.setDate(validUntil.getDate()+days);
    await addDoc(collection(db,'unlockCodes'),{
      email,code,
      createdAt:new Date().toISOString(),
      validUntil:validUntil.toISOString(),
      validDays:days,
      used:false,usedAt:null,usedBy:null
    });
    toast('✅ Code तयार झाला: '+code);
    document.getElementById('admCustEmail').value='';
    await loadCodes();
  }catch(e){toast(friendlyErr(e),'err');}
  finally{btn.disabled=false;}
};

async function loadCodes(){
  const list=document.getElementById('admCodesList');
  list.innerHTML='<div class="adm-spin"></div>';
  try{
    const snap=await getDocs(collection(db,'unlockCodes'));
    let codes=[];snap.forEach(d=>codes.push({...d.data(),_id:d.id}));
    codes.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    if(codes.length===0){list.innerHTML='<p class="adm-empty">अजून कोणताही code नाही.</p>';return;}
    list.innerHTML=codes.map(c=>{
      const expired=new Date(c.validUntil).getTime()<Date.now();
      const status=c.used?'वापरला गेला':(expired?'कालबाह्य':'अव्वल (वापरायचा बाकी)');
      const statusClass=c.used?'used':(expired?'expired':'active');
      return`<div class="adm-code-row ${statusClass}">
        <div class="adm-code-main">
          <b class="adm-code-text">${c.code}</b>
          <span class="adm-code-email">${c.email}</span>
        </div>
        <div class="adm-code-meta">
          <span>${c.validDays} दिवस</span>
          <span>संपेल: ${new Date(c.validUntil).toLocaleDateString('en-IN')}</span>
          <span class="adm-badge ${statusClass}">${status}</span>
        </div>
        <button class="adm-copy-btn" onclick="navigator.clipboard.writeText('${c.code}');this.textContent='Copied!'">Copy</button>
      </div>`;
    }).join('');
  }catch(e){list.innerHTML=`<p class="adm-empty" style="color:#dc2626">${friendlyErr(e)}</p>`;}
}
window.refreshCodes=loadCodes;

// ---- Users (licenses collection) ----
let _usersCache=[];
async function loadUsers(){
  const list=document.getElementById('admUsersList');
  list.innerHTML='<div class="adm-spin"></div>';
  try{
    const snap=await getDocs(collection(db,'licenses'));
    _usersCache=[];snap.forEach(d=>_usersCache.push({...d.data(),_uid:d.id}));
    _usersCache.sort((a,b)=>(b.trialStart||'').localeCompare(a.trialStart||''));
    document.getElementById('admUserCount').textContent=_usersCache.length;
    renderUsers(_usersCache);
  }catch(e){list.innerHTML=`<p class="adm-empty" style="color:#dc2626">${friendlyErr(e)}</p>`;}
}
window.refreshUsers=loadUsers;

function userStatusInfo(u){
  if(u.disabled===true)return{label:'Disabled',cls:'expired'};
  const now=Date.now();
  if(u.unlockedUntil && new Date(u.unlockedUntil).getTime()>now)return{label:`Paid (${daysLeft(u.unlockedUntil)}d left)`,cls:'active'};
  if(u.trialEnd && new Date(u.trialEnd).getTime()>now)return{label:`Trial (${daysLeft(u.trialEnd)}d left)`,cls:'active'};
  return{label:'Expired',cls:'expired'};
}

function renderUsers(users){
  const list=document.getElementById('admUsersList');
  if(users.length===0){list.innerHTML='<p class="adm-empty">अजून कोणताही user नाही.</p>';return;}
  list.innerHTML=users.map(u=>{
    const st=userStatusInfo(u);
    return`<div class="adm-user-row ${st.cls}">
      <div class="adm-user-main">
        <b class="adm-user-email">${u.email||'—'}</b>
        <span class="adm-badge ${st.cls}">${st.label}</span>
      </div>
      <div class="adm-user-meta">
        <span>Trial: ${fmtDate(u.trialStart)} → ${fmtDate(u.trialEnd)}</span>
        ${u.unlockedUntil?`<span>Paid until: ${fmtDate(u.unlockedUntil)}</span>`:''}
      </div>
      <div class="adm-user-acts">
        <button class="adm-copy-btn" onclick="window.admEditUser('${u._uid}')"><i class="fas fa-edit"></i> Edit</button>
        ${u.disabled===true
          ?`<button class="adm-btn adm-btn-sm" onclick="window.admToggleDisable('${u._uid}',false)">Enable</button>`
          :`<button class="adm-btn adm-btn-sm adm-btn-danger" onclick="window.admToggleDisable('${u._uid}',true)">Disable</button>`}
      </div>
    </div>`;
  }).join('');
}

window.admFilterUsers=function(v){
  const fil=v?_usersCache.filter(u=>(u.email||'').toLowerCase().includes(v.toLowerCase())):_usersCache;
  renderUsers(fil);
};

window.admToggleDisable=async function(uid,disable){
  if(!confirm(disable?'Yeh account disable karna hai? User turant lock ho jayega.':'Yeh account enable karna hai?'))return;
  try{
    await updateDoc(doc(db,'licenses',uid),{disabled:disable});
    toast(disable?'Account disabled':'Account enabled');
    await loadUsers();
  }catch(e){toast(friendlyErr(e),'err');}
};

// ---- Edit user (trial dates) modal ----
window.admEditUser=function(uid){
  const u=_usersCache.find(x=>x._uid===uid);
  if(!u)return;
  document.getElementById('admEditUid').value=uid;
  document.getElementById('admEditEmail').textContent=u.email||'—';
  document.getElementById('admEditTrialStart').value=(u.trialStart||'').slice(0,10);
  document.getElementById('admEditTrialEnd').value=(u.trialEnd||'').slice(0,10);
  document.getElementById('admEditUnlockedUntil').value=u.unlockedUntil?u.unlockedUntil.slice(0,10):'';
  document.getElementById('admEditModal').classList.remove('h');
};
window.admCloseEditModal=function(){document.getElementById('admEditModal').classList.add('h');};
window.admSaveUserEdit=async function(){
  const uid=document.getElementById('admEditUid').value;
  const trialStart=document.getElementById('admEditTrialStart').value;
  const trialEnd=document.getElementById('admEditTrialEnd').value;
  const unlockedUntilRaw=document.getElementById('admEditUnlockedUntil').value;
  if(!trialStart||!trialEnd){toast('Trial start/end dono bharo','err');return;}
  const btn=document.getElementById('admSaveEditBtn');
  btn.disabled=true;
  try{
    const data={
      trialStart:new Date(trialStart+'T00:00:00').toISOString(),
      trialEnd:new Date(trialEnd+'T23:59:59').toISOString(),
      unlockedUntil:unlockedUntilRaw?new Date(unlockedUntilRaw+'T23:59:59').toISOString():null
    };
    await updateDoc(doc(db,'licenses',uid),data);
    toast('✅ User update झाला');
    window.admCloseEditModal();
    await loadUsers();
  }catch(e){toast(friendlyErr(e),'err');}
  finally{btn.disabled=false;}
};
