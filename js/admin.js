// admin.js — Hidden Admin Panel logic. Generates unlock codes for customers.
// Sirf admin (sourabhbongarde2@gmail.com) ka Google login is panel me kaam karega -
// koi aur email login kare to Firestore rules khud reject kar denge (server-side check),
// yeh client-side check sirf turant UI feedback ke liye hai.
import{auth,db,gp,collection,addDoc,getDocs,doc,query,where,signInWithPopup,signOut,onAuthStateChanged,friendlyErr}from'./firebase-config.js';

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
});

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
