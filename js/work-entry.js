// work-entry.js — Naya kaam record karne ka page
import{getDocs,addDoc,updateDoc,doc,db,uq,col,uid,today,fmt,toast,lock,unlock,adBannerHTML,autoBackup,friendlyErr}from'./core.js';
import{editWID,setEditWID}from'./core.js';

export async function pgWE(area){
  const[rS,sS,ad1]=await Promise.all([getDocs(uq('rates')),getDocs(uq('shetkari')),adBannerHTML('work-entry-top')]);
  const rates=[],farmers=[];
  rS.forEach(d=>rates.push({...d.data(),_id:d.id}));
  sS.forEach(d=>farmers.push({...d.data(),_id:d.id}));

  area.innerHTML=`
  <div class="sh"><span class="st2">🚜 ${editWID?'काम संपादित':'नवीन काम नोंद'}</span></div>
  ${ad1}
  <div class="card" style="max-width:600px">
    <div class="fr2">
      <div class="fg"><label class="fl">ग्राहकाचे नाव *</label>
        <input class="fc" id="wNm" list="fList" placeholder="नाव टाका / निवडा" oninput="autoFarmer()"/>
        <datalist id="fList">${farmers.map(f=>`<option value="${f.name}" data-m="${f.mobile||''}"></option>`).join('')}</datalist></div>
      <div class="fg"><label class="fl">मोबाइल</label><input class="fc" type="tel" id="wMb" placeholder="मोबाइल नंबर"/></div>
    </div>
    <div class="fg"><label class="fl">काम प्रकार *</label>
      <select class="fc" id="wWT" onchange="autoRate()">
        <option value="">— काम निवडा —</option>
        ${rates.map(r=>`<option value="${r.workType}" data-r="${r.rate}" data-u="${r.unit}">${r.workType} (₹${fmt(r.rate)}/${r.unit})</option>`).join('')}
        <option value="__o__">इतर (स्वतः टाका)</option>
      </select></div>
    <div class="fg h" id="custWTG"><label class="fl">काम नाव *</label><input class="fc" id="wCWT" placeholder="काम नाव लिहा"/></div>
    <div class="fr3">
      <div class="fg"><label class="fl">युनिट *</label>
        <select class="fc" id="wUn" onchange="calcT()"><option>तास</option><option>एकर</option><option>गुंठा</option><option>ट्रिप</option></select></div>
      <div class="fg"><label class="fl">प्रमाण *</label>
        <div class="stepper-wrap">
          <button type="button" class="btn bg2 bic" onclick="stepQty(-1)"><i class="fas fa-minus"></i></button>
          <input class="fc" type="number" id="wQty" step="0.1" min="0" placeholder="0" oninput="calcT()"/>
          <button type="button" class="btn bg2 bic" onclick="stepQty(1)"><i class="fas fa-plus"></i></button>
        </div></div>
      <div class="fg"><label class="fl">दर ₹ *</label><input class="fc" type="number" id="wRt" placeholder="₹" oninput="calcT()"/></div>
    </div>
    <div class="fr2">
      <div class="fg"><label class="fl">एकूण रक्कम</label><div class="tot-box" id="wTot">₹ 0</div></div>
      <div class="fg"><label class="fl">तारीख *</label><input class="fc" type="date" id="wDt" value="${today()}"/></div>
    </div>
    <div class="fg"><label class="fl">नोट (वैकल्पिक)</label><textarea class="fc" id="wNt" rows="2" placeholder="अतिरिक्त माहिती"></textarea></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn bp blg" id="wSaveBtn" onclick="saveWork()"><i class="fas fa-save"></i> सेव्ह करा</button>
      <button class="btn bg2" onclick="resetWF()"><i class="fas fa-redo"></i> रिसेट</button>
      ${editWID?`<button class="btn br" onclick="window.cancelEditW()"><i class="fas fa-times"></i> रद्द</button>`:''}
    </div>
  </div>`;

  document.getElementById('wWT').addEventListener('change',function(){
    document.getElementById('custWTG').classList.toggle('h',this.value!=='__o__');
  });

  if(editWID){
    try{
      const snap=await getDocs(uq('works'));
      snap.forEach(d=>{
        if(d.id!==editWID)return;
        const w=d.data();
        document.getElementById('wNm').value=w.customerName||'';
        document.getElementById('wMb').value=w.mobile||'';
        document.getElementById('wUn').value=w.unit||'तास';
        document.getElementById('wQty').value=w.quantity||0;
        document.getElementById('wRt').value=w.rate||0;
        document.getElementById('wDt').value=w.date||today();
        document.getElementById('wNt').value=w.notes||'';
        document.getElementById('wTot').textContent='₹ '+fmt(w.total||0);
        const sel=document.getElementById('wWT');
        let found=false;
        Array.from(sel.options).forEach(o=>{if(o.value===w.workType)found=true;});
        if(found){sel.value=w.workType;}
        else{sel.value='__o__';document.getElementById('custWTG').classList.remove('h');document.getElementById('wCWT').value=w.workType||'';}
      });
    }catch(e){}
  }
}

window.cancelEditW=function(){setEditWID(null);window.resetWF();window.render('work-entry');};

window.autoFarmer=function(){
  const v=document.getElementById('wNm').value;
  let opt=null;
  try{opt=document.querySelector(`#fList option[value="${CSS.escape(v)}"]`);}catch(_){}
  const mob=document.getElementById('wMb');
  if(opt&&opt.dataset.m&&!mob.value)mob.value=opt.dataset.m;
};
window.autoRate=function(){
  const o=document.getElementById('wWT').selectedOptions[0];
  if(o?.dataset.r){document.getElementById('wRt').value=o.dataset.r;document.getElementById('wUn').value=o.dataset.u||'तास';}
  window.calcT();
};
window.calcT=function(){
  const q=parseFloat(document.getElementById('wQty')?.value)||0;
  const r=parseFloat(document.getElementById('wRt')?.value)||0;
  const el=document.getElementById('wTot');if(el)el.textContent='₹ '+fmt(q*r);
};
window.stepQty=function(dir){
  const el=document.getElementById('wQty');if(!el)return;
  let v=parseFloat(el.value)||0;
  const step=parseFloat(el.step)||0.1;
  v=Math.max(0,Math.round((v+dir*step)*100)/100);
  el.value=v;window.calcT();
};
window.resetWF=function(){
  setEditWID(null);
  ['wNm','wMb','wQty','wRt','wNt','wCWT'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const sel=document.getElementById('wWT');if(sel)sel.value='';
  const un=document.getElementById('wUn');if(un)un.value='तास';
  const dt=document.getElementById('wDt');if(dt)dt.value=today();
  const tot=document.getElementById('wTot');if(tot)tot.textContent='₹ 0';
  document.getElementById('custWTG')?.classList.add('h');
};
window.saveWork=async function(){
  if(!lock('saveWork'))return; // double-tap guard: rokta hai ek hi kaam do baar save hone se
  const btn=document.getElementById('wSaveBtn');if(btn)btn.disabled=true;
  try{
  const wt=document.getElementById('wWT').value==='__o__'?document.getElementById('wCWT')?.value.trim():document.getElementById('wWT').value;
  const cust=document.getElementById('wNm').value.trim();
  const mob=document.getElementById('wMb').value.trim();
  const unit=document.getElementById('wUn').value;
  const qty=parseFloat(document.getElementById('wQty').value)||0;
  const rate=parseFloat(document.getElementById('wRt').value)||0;
  const date=document.getElementById('wDt').value;
  const note=document.getElementById('wNt').value.trim();
  if(!cust){toast('ग्राहकाचे नाव आवश्यक','err');return;}
  if(!wt){toast('काम प्रकार आवश्यक','err');return;}
  if(!qty||!rate){toast('प्रमाण आणि दर आवश्यक','err');return;}
  if(!date){toast('तारीख निवडा','err');return;}
  const data={uid:uid(),customerName:cust,mobile:mob,workType:wt,unit,quantity:qty,rate,total:qty*rate,date,notes:note,updatedAt:today()};
  try{
    if(editWID){
      const snap=await getDocs(uq('works'));let pays=[];
      snap.forEach(d=>{if(d.id===editWID)pays=d.data().payments||[];});
      await updateDoc(doc(db,'works',editWID),{...data,payments:pays});
      autoBackup('update','works',{...data,payments:pays,_id:editWID});
      toast('काम अपडेट ✅');setEditWID(null);
    }else{
      const ref=await addDoc(col('works'),{...data,payments:[],createdAt:today()});
      autoBackup('create','works',{...data,payments:[],_id:ref.id});
      if(cust&&mob){
        try{
          const ss=await getDocs(uq('shetkari'));
          // Naam match case-insensitive aur extra spaces ignore karke (jaise "Ramesh" aur "ramesh " ek hi gane jayenge)
          const custKey=cust.trim().toLowerCase().replace(/\s+/g,' ');
          let exists=false;ss.forEach(d=>{const n=(d.data().name||'').trim().toLowerCase().replace(/\s+/g,' ');if(n===custKey)exists=true;});
          if(!exists)await addDoc(col('shetkari'),{uid:uid(),name:cust,mobile:mob,village:'',land:0,notes:'',createdAt:today()});
        }catch(_){}
      }
      toast('काम सेव्ह ✅');
    }
    window.resetWF();window.updBadge();
  }catch(e){toast(friendlyErr(e),'err');}
  }finally{unlock('saveWork');if(btn)btn.disabled=false;}
};
