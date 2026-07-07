// work-entry.js — Naya kaam record karne ka page.
// Naya: ek hi farmer ka 2-3 kaam same time pe ek session me add kar sakte ho (multi-row
// billing). Edit mode me (existing kaam edit karte waqt) simple single-row form dikhta hai,
// kyunki edit ek specific document ko target karta hai, multi-add wahan applicable nahi.
import{getDocs,addDoc,updateDoc,doc,db,uq,col,uid,today,fmt,toast,lock,unlock,adBannerHTML,autoBackup,friendlyErr,invalidateCache}from'./core.js';
import{editWID,setEditWID}from'./core.js';

let _rates=[],_farmers=[];
let _rows=[mkRow()]; // multi-work rows ka in-memory state

function mkRow(){
  return{id:'r'+Math.random().toString(36).slice(2,9),workType:'',customWT:'',unit:'तास',qty:'',rate:'',date:today(),note:''};
}

export async function pgWE(area){
  const[rS,sS,ad1]=await Promise.all([getDocs(uq('rates')),getDocs(uq('shetkari')),adBannerHTML('work-entry-top')]);
  _rates=[];_farmers=[];
  rS.forEach(d=>_rates.push({...d.data(),_id:d.id}));
  sS.forEach(d=>_farmers.push({...d.data(),_id:d.id}));

  if(editWID){await renderEditMode(area);return;}

  _rows=[mkRow()];
  area.innerHTML=`
  <div class="sh"><span class="st2">🚜 नवीन काम नोंद</span></div>
  ${ad1}
  <div class="card" style="max-width:680px;margin-bottom:11px">
    <div class="fr2">
      <div class="fg" style="margin:0">
        <label class="fl">ग्राहकाचे नाव *</label>
        <div style="display:flex;gap:6px">
          <input class="fc" id="wNm" list="fList" placeholder="नाव टाका / निवडा" oninput="window.autoFarmer()" onfocus="this.select()"/>
          <button type="button" class="btn bg2 bic" id="wContactBtn" title="Phone Contacts मधून घ्या" onclick="window.pickContact()"><i class="fas fa-address-book"></i></button>
        </div>
        <datalist id="fList">${_farmers.map(f=>`<option value="${f.name}" data-m="${f.mobile||''}"></option>`).join('')}</datalist>
      </div>
      <div class="fg" style="margin:0"><label class="fl">मोबाइल</label><input class="fc" type="tel" id="wMb" placeholder="मोबाइल नंबर"/></div>
    </div>
  </div>

  <div id="rowsWrap"></div>

  <div class="card" style="max-width:680px;margin-top:11px">
    <div class="we-actions-row" style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <button class="btn bg2" onclick="window.addWorkRow()" style="flex:1 1 auto;min-width:0"><i class="fas fa-plus"></i> आणखी काम जोडा</button>
      <div style="text-align:right;flex-shrink:0">
        <div class="sl">एकूण रक्कम (सर्व काम)</div>
        <div class="tot-box" id="wGrandTot" style="margin-top:2px">₹ 0</div>
      </div>
    </div>
    <button class="btn bp blg bfw" id="wSaveBtn" onclick="window.saveAllWork()"><i class="fas fa-save"></i> <span id="wSaveBtnTxt">सेव्ह करा</span></button>
  </div>`;

  renderRows();
  // contact-picker button sirf jaha API support hai wahi dikhao (Android Chrome) - warna chhup jayega
  if(!('contacts' in navigator && 'ContactsManager' in window)){
    document.getElementById('wContactBtn').classList.add('h');
  }
}

function renderRows(){
  const wrap=document.getElementById('rowsWrap');
  wrap.innerHTML=_rows.map((r,i)=>`
  <div class="card we-row-card" data-row="${r.id}">
    <div class="we-row-head">
      <span class="we-row-num">काम #${i+1}</span>
      <span class="we-row-amt" data-rowtot>₹ ${fmt((parseFloat(r.qty)||0)*(parseFloat(r.rate)||0))}</span>
      ${_rows.length>1?`<button class="btn br bic bxs" onclick="window.removeWorkRow('${r.id}')"><i class="fas fa-trash"></i></button>`:''}
    </div>
    <div class="fr2">
      <div class="fg" style="margin-bottom:8px"><label class="fl">काम प्रकार *</label>
        <select class="fc" data-f="workType" onchange="window.rowChange('${r.id}','workType',this.value);window.autoRate('${r.id}')">
          <option value="">— काम निवडा —</option>
          ${_rates.map(rt=>`<option value="${rt.workType}" data-r="${rt.rate}" data-u="${rt.unit}" ${r.workType===rt.workType?'selected':''}>${rt.workType} (₹${fmt(rt.rate)}/${rt.unit})</option>`).join('')}
          <option value="__o__" ${r.workType==='__o__'?'selected':''}>इतर (स्वतः टाका)</option>
        </select></div>
      <div class="fg" style="margin-bottom:8px"><label class="fl">युनिट *</label>
        <select class="fc" data-f="unit" onchange="window.rowChange('${r.id}','unit',this.value)">
          ${['तास','एकर','गुंठा','ट्रिप'].map(u=>`<option ${r.unit===u?'selected':''}>${u}</option>`).join('')}
        </select></div>
    </div>
    <div class="fg ${r.workType==='__o__'?'':'h'}" data-custwt style="margin-bottom:8px"><label class="fl">काम नाव *</label><input class="fc" data-f="customWT" value="${r.customWT}" oninput="window.rowChange('${r.id}','customWT',this.value)" placeholder="काम नाव लिहा"/></div>
    <div class="fr3">
      <div class="fg" style="margin-bottom:8px"><label class="fl">प्रमाण *</label>
        <div class="stepper-wrap">
          <button type="button" class="btn bg2 bic" onclick="window.stepRowQty('${r.id}',-1)"><i class="fas fa-minus"></i></button>
          <input class="fc" type="number" data-f="qty" step="0.1" min="0" value="${r.qty}" oninput="window.rowChange('${r.id}','qty',this.value)" placeholder="0"/>
          <button type="button" class="btn bg2 bic" onclick="window.stepRowQty('${r.id}',1)"><i class="fas fa-plus"></i></button>
        </div></div>
      <div class="fg" style="margin-bottom:8px"><label class="fl">दर ₹ *</label><input class="fc" type="number" data-f="rate" value="${r.rate}" oninput="window.rowChange('${r.id}','rate',this.value)" placeholder="₹"/></div>
      <div class="fg" style="margin-bottom:8px"><label class="fl">तारीख</label><input class="fc" type="date" data-f="date" value="${r.date}" onchange="window.rowChange('${r.id}','date',this.value)"/></div>
    </div>
    <div class="fg" style="margin-bottom:0"><input class="fc" data-f="note" value="${r.note}" oninput="window.rowChange('${r.id}','note',this.value)" placeholder="📝 नोट (वैकल्पिक)"/></div>
  </div>`).join('');
  updateGrandTotal();
}

function updateGrandTotal(){
  const tot=_rows.reduce((s,r)=>s+(parseFloat(r.qty)||0)*(parseFloat(r.rate)||0),0);
  const el=document.getElementById('wGrandTot');if(el)el.textContent='₹ '+fmt(tot);
}

window.rowChange=function(id,field,val){
  const r=_rows.find(x=>x.id===id);if(!r)return;
  r[field]=val;
  // Row ka total + custWT field ka show/hide turant update karo bina poora re-render kiye
  // (taaki input focus na chhute typing karte waqt)
  const rowEl=document.querySelector(`[data-row="${id}"]`);
  if(rowEl){
    const totEl=rowEl.querySelector('[data-rowtot]');
    if(totEl)totEl.textContent='₹ '+fmt((parseFloat(r.qty)||0)*(parseFloat(r.rate)||0));
    if(field==='workType'){
      rowEl.querySelector('[data-custwt]').classList.toggle('h',val!=='__o__');
    }
  }
  updateGrandTotal();
};
window.autoRate=function(id){
  const r=_rows.find(x=>x.id===id);if(!r)return;
  const rowEl=document.querySelector(`[data-row="${id}"]`);
  const sel=rowEl.querySelector('select[data-f="workType"]');
  const o=sel.selectedOptions[0];
  if(o?.dataset.r){
    r.rate=o.dataset.r;r.unit=o.dataset.u||'तास';
    rowEl.querySelector('input[data-f="rate"]').value=r.rate;
    rowEl.querySelector('select[data-f="unit"]').value=r.unit;
    window.rowChange(id,'rate',r.rate);
  }
};
window.stepRowQty=function(id,dir){
  const r=_rows.find(x=>x.id===id);if(!r)return;
  let v=parseFloat(r.qty)||0;
  v=Math.max(0,Math.round((v+dir*0.1)*100)/100);
  r.qty=v;
  const rowEl=document.querySelector(`[data-row="${id}"]`);
  rowEl.querySelector('input[data-f="qty"]').value=v;
  window.rowChange(id,'qty',v);
};
window.addWorkRow=function(){
  const nr=mkRow();
  // Pehli row ki date copy kar dete hain convenience ke liye (same-day multi-kaam common case hai)
  if(_rows.length)nr.date=_rows[_rows.length-1].date;
  _rows.push(nr);
  renderRows();
  toast(`काम #${_rows.length} जोडले`,'ok',1500);
};
window.removeWorkRow=function(id){
  if(_rows.length<=1)return;
  _rows=_rows.filter(r=>r.id!==id);
  renderRows();
};

window.autoFarmer=function(){
  const v=document.getElementById('wNm').value;
  let opt=null;
  try{opt=document.querySelector(`#fList option[value="${CSS.escape(v)}"]`);}catch(_){}
  const mob=document.getElementById('wMb');
  if(opt&&opt.dataset.m&&!mob.value)mob.value=opt.dataset.m;
};

// ---- Phone Contacts import (Android Chrome only - Contact Picker API) ----
window.pickContact=async function(){
  try{
    if(!('contacts' in navigator && 'ContactsManager' in window)){
      toast('हे फीचर या ब्राउझरमध्ये उपलब्ध नाही','warn');return;
    }
    const props=['name','tel'];
    const contacts=await navigator.contacts.select(props,{multiple:false});
    if(!contacts||contacts.length===0)return;
    const c=contacts[0];
    const name=(c.name&&c.name[0])||'';
    const tel=(c.tel&&c.tel[0])||'';
    if(name)document.getElementById('wNm').value=name;
    if(tel)document.getElementById('wMb').value=tel.replace(/[^0-9+]/g,'');
    toast('Contact आयात केले ✅');
  }catch(e){
    // User ne permission deny ki ya picker cancel kiya - error dikhana zaroori nahi
  }
};

// ---- Save ALL rows (multi-work) as separate 'works' documents ----
window.saveAllWork=async function(){
  if(!lock('saveAllWork'))return;
  const btn=document.getElementById('wSaveBtn');const btnTxt=document.getElementById('wSaveBtnTxt');
  if(btn)btn.disabled=true;
  try{
    const cust=document.getElementById('wNm').value.trim();
    const mob=document.getElementById('wMb').value.trim();
    if(!cust){toast('ग्राहकाचे नाव आवश्यक','err');return;}

    // Pehle sab rows validate karo, koi bhi invalid ho to kuch save mat karo (sab-ya-kuch-nahi)
    const valid=[];
    for(let i=0;i<_rows.length;i++){
      const r=_rows[i];
      const wt=r.workType==='__o__'?r.customWT.trim():r.workType;
      const qty=parseFloat(r.qty)||0,rate=parseFloat(r.rate)||0;
      if(!wt){toast(`काम #${i+1}: काम प्रकार आवश्यक`,'err');return;}
      if(!qty||!rate){toast(`काम #${i+1}: प्रमाण आणि दर आवश्यक`,'err');return;}
      if(!r.date){toast(`काम #${i+1}: तारीख आवश्यक`,'err');return;}
      valid.push({uid:uid(),customerName:cust,mobile:mob,workType:wt,unit:r.unit,quantity:qty,rate,total:qty*rate,date:r.date,notes:r.note.trim(),payments:[],createdAt:today(),updatedAt:today()});
    }

    if(btnTxt)btnTxt.textContent=valid.length>1?`सेव्ह होत आहे... (0/${valid.length})`:'सेव्ह होत आहे...';
    let saved=0;
    for(const data of valid){
      const ref=await addDoc(col('works'),data);
      autoBackup('create','works',{...data,_id:ref.id});
      saved++;
      if(btnTxt&&valid.length>1)btnTxt.textContent=`सेव्ह होत आहे... (${saved}/${valid.length})`;
    }

    // Farmer DB me naya customer add karo (agar already nahi hai) - naam case/space-insensitive match
    if(cust&&mob){
      try{
        const ss=await getDocs(uq('shetkari'));
        const custKey=cust.trim().toLowerCase().replace(/\s+/g,' ');
        let exists=false;ss.forEach(d=>{const n=(d.data().name||'').trim().toLowerCase().replace(/\s+/g,' ');if(n===custKey)exists=true;});
        if(!exists)await addDoc(col('shetkari'),{uid:uid(),name:cust,mobile:mob,village:'',land:0,notes:'',createdAt:today()});
      }catch(_){}
    }

    toast(valid.length>1?`${valid.length} काम सेव्ह ✅`:'काम सेव्ह ✅');
    _rows=[mkRow()];
    document.getElementById('wNm').value='';document.getElementById('wMb').value='';
    renderRows();
    window.updBadge();
  }catch(e){toast(friendlyErr(e),'err');}
  finally{unlock('saveAllWork');if(btn)btn.disabled=false;if(btnTxt)btnTxt.textContent='सेव्ह करा';}
};

// ---- Edit mode: existing kaam edit karna - simple single-row form (multi-add yahan nahi) ----
async function renderEditMode(area){
  area.innerHTML=`
  <div class="sh"><span class="st2">🚜 काम संपादित</span></div>
  <div class="card" style="max-width:600px">
    <div class="fr2">
      <div class="fg"><label class="fl">ग्राहकाचे नाव *</label>
        <input class="fc" id="wNm" list="fList" placeholder="नाव टाका / निवडा" oninput="window.autoFarmer()"/>
        <datalist id="fList">${_farmers.map(f=>`<option value="${f.name}" data-m="${f.mobile||''}"></option>`).join('')}</datalist></div>
      <div class="fg"><label class="fl">मोबाइल</label><input class="fc" type="tel" id="wMb" placeholder="मोबाइल नंबर"/></div>
    </div>
    <div class="fg"><label class="fl">काम प्रकार *</label>
      <select class="fc" id="wWT" onchange="window.autoRateEdit()">
        <option value="">— काम निवडा —</option>
        ${_rates.map(r=>`<option value="${r.workType}" data-r="${r.rate}" data-u="${r.unit}">${r.workType} (₹${fmt(r.rate)}/${r.unit})</option>`).join('')}
        <option value="__o__">इतर (स्वतः टाका)</option>
      </select></div>
    <div class="fg h" id="custWTG"><label class="fl">काम नाव *</label><input class="fc" id="wCWT" placeholder="काम नाव लिहा"/></div>
    <div class="fr3">
      <div class="fg"><label class="fl">युनिट *</label>
        <select class="fc" id="wUn" onchange="window.calcTEdit()"><option>तास</option><option>एकर</option><option>गुंठा</option><option>ट्रिप</option></select></div>
      <div class="fg"><label class="fl">प्रमाण *</label>
        <div class="stepper-wrap">
          <button type="button" class="btn bg2 bic" onclick="window.stepQtyEdit(-1)"><i class="fas fa-minus"></i></button>
          <input class="fc" type="number" id="wQty" step="0.1" min="0" placeholder="0" oninput="window.calcTEdit()"/>
          <button type="button" class="btn bg2 bic" onclick="window.stepQtyEdit(1)"><i class="fas fa-plus"></i></button>
        </div></div>
      <div class="fg"><label class="fl">दर ₹ *</label><input class="fc" type="number" id="wRt" placeholder="₹" oninput="window.calcTEdit()"/></div>
    </div>
    <div class="fr2">
      <div class="fg"><label class="fl">एकूण रक्कम</label><div class="tot-box" id="wTot">₹ 0</div></div>
      <div class="fg"><label class="fl">तारीख *</label><input class="fc" type="date" id="wDt" value="${today()}"/></div>
    </div>
    <div class="fg"><label class="fl">नोट (वैकल्पिक)</label><textarea class="fc" id="wNt" rows="2" placeholder="अतिरिक्त माहिती"></textarea></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn bp blg" id="wSaveBtn" onclick="window.saveEditWork()"><i class="fas fa-save"></i> अपडेट करा</button>
      <button class="btn br" onclick="window.cancelEditW()"><i class="fas fa-times"></i> रद्द</button>
    </div>
  </div>`;

  document.getElementById('wWT').addEventListener('change',function(){
    document.getElementById('custWTG').classList.toggle('h',this.value!=='__o__');
  });

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
window.cancelEditW=function(){setEditWID(null);window.render('work-entry');};
window.autoRateEdit=function(){
  const o=document.getElementById('wWT').selectedOptions[0];
  if(o?.dataset.r){document.getElementById('wRt').value=o.dataset.r;document.getElementById('wUn').value=o.dataset.u||'तास';}
  window.calcTEdit();
};
window.calcTEdit=function(){
  const q=parseFloat(document.getElementById('wQty')?.value)||0;
  const r=parseFloat(document.getElementById('wRt')?.value)||0;
  const el=document.getElementById('wTot');if(el)el.textContent='₹ '+fmt(q*r);
};
window.stepQtyEdit=function(dir){
  const el=document.getElementById('wQty');if(!el)return;
  let v=parseFloat(el.value)||0;
  v=Math.max(0,Math.round((v+dir*0.1)*100)/100);
  el.value=v;window.calcTEdit();
};
window.saveEditWork=async function(){
  if(!lock('saveEditWork'))return;
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
    invalidateCache('works'); // payments[] preserve karke overwrite karte hain - stale read se ek payment silently gum ho sakta hai
    const snap=await getDocs(uq('works'));let pays=[];
    snap.forEach(d=>{if(d.id===editWID)pays=d.data().payments||[];});
    await updateDoc(doc(db,'works',editWID),{...data,payments:pays});
    autoBackup('update','works',{...data,payments:pays,_id:editWID});
    toast('काम अपडेट ✅');setEditWID(null);
    window.render('work-entry');window.updBadge();
  }catch(e){toast(friendlyErr(e),'err');}
  finally{unlock('saveEditWork');if(btn)btn.disabled=false;}
};

