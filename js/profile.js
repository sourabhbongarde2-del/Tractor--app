// profile.js — Business profile (name, owner, UPI) + language switcher + app info
import{addDoc,updateDoc,doc,db,col,uid,today,toast,lock,unlock,adBannerHTML,gProf,setProf,friendlyErr,LANG,CU}from'./core.js';

export async function pgProf(area){
  const pr=gProf();
  const ad1=await adBannerHTML('profile-top');
  area.innerHTML=`
  <div class="sh"><span class="st2">👤 प्रोफाइल</span></div>
  ${ad1}
  <div style="max-width:480px">
    <div class="card" style="margin-bottom:12px;text-align:center;padding:20px">
      <div class="pav">${(CU?.displayName||CU?.email||'U').charAt(0).toUpperCase()}</div>
      <div style="font-weight:700;font-size:.95rem">${CU?.displayName||'User'}</div>
      <div style="font-size:.75rem;color:var(--tx3)">${CU?.email||''}</div>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div class="ch"><span class="ct2">🏢 व्यवसाय माहिती</span></div>
      <input type="hidden" id="pDId" value="${pr._id||''}"/>
      <div class="fr2">
        <div class="fg"><label class="fl">व्यवसायाचे नाव *</label><input class="fc" id="pBz" value="${pr.businessName||''}"/></div>
        <div class="fg"><label class="fl">मालकाचे नाव</label><input class="fc" id="pOw" value="${pr.ownerName||''}"/></div>
      </div>
      <div class="fr2">
        <div class="fg"><label class="fl">मोबाइल</label><input class="fc" type="tel" id="pPh" value="${pr.phone||''}"/></div>
        <div class="fg"><label class="fl">UPI ID</label><input class="fc" id="pUp" placeholder="yourname@upi" value="${pr.upiId||''}"/></div>
      </div>
      ${pr.upiId?`<div class="fg"><label class="fl">UPI QR</label><div id="pQR" style="margin-top:5px"></div></div>`:''}
      <button class="btn bp bfw" onclick="window.saveProf()"><i class="fas fa-save"></i> प्रोफाइल सेव्ह करा</button>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div class="ch"><span class="ct2">🌐 भाषा</span></div>
      <div style="display:flex;gap:7px">
        <button class="btn ${LANG==='mr'?'bp':'bg2'}" onclick="setLang('mr')">मराठी</button>
        <button class="btn ${LANG==='hi'?'bp':'bg2'}" onclick="setLang('hi')">हिंदी</button>
        <button class="btn ${LANG==='en'?'bp':'bg2'}" onclick="setLang('en')">English</button>
      </div>
    </div>
    <div class="card" style="background:var(--surf2);border:1px solid var(--bdr2)">
      <div style="text-align:center;font-size:.74rem;color:var(--tx3);line-height:2">
        <div style="font-family:var(--fd);font-size:.95rem;font-weight:800;color:var(--brand);margin-bottom:4px">TractorWala v4.0</div>
        Developed by <b>Sourabh Bongarde</b><br>
        📧 sourabhbongarde2@gmail.com<br>📞 7875817356<br>
        <div style="margin-top:6px;font-size:.68rem">© Bongarde Software Solutions Pvt. Ltd.</div>
      </div>
    </div>
  </div>`;

  if(pr.upiId){
    setTimeout(()=>{
      const el=document.getElementById('pQR');if(!el)return;
      try{new QRCode(el,{text:`upi://pay?pa=${pr.upiId}&pn=${encodeURIComponent(pr.businessName||'TractorWala')}`,width:86,height:86,colorDark:'#166534'});}catch(_){}
    },100);
  }
}
window.saveProf=async function(){
  if(!lock('saveProf'))return;
  const did=document.getElementById('pDId').value;
  const d={uid:uid(),businessName:document.getElementById('pBz').value.trim(),ownerName:document.getElementById('pOw').value.trim(),phone:document.getElementById('pPh').value.trim(),upiId:document.getElementById('pUp').value.trim(),updatedAt:today()};
  try{
    if(did)await updateDoc(doc(db,'profiles',did),d);
    else{const ref=await addDoc(col('profiles'),{...d,createdAt:today()});d._id=ref.id;}
    setProf({...gProf(),...d});toast('प्रोफाइल सेव्ह ✅');window.render('profile');
  }catch(e){toast(friendlyErr(e),'err');}
  finally{unlock('saveProf');}
};
