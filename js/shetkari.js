// shetkari.js — Shetkari DB (farmer directory) page
import{getDocs,addDoc,updateDoc,deleteDoc,doc,db,uq,col,uid,today,waNum,toast,lock,unlock,adBannerHTML,gProf,autoBackup,friendlyErr}from'./core.js';

let shkS='';

export async function pgShk(area){
  const[snap,ad1]=await Promise.all([getDocs(uq('shetkari')),adBannerHTML('shetkari-top')]);
  let all=[];snap.forEach(d=>all.push({...d.data(),_id:d.id}));
  window._regSet(all);
  const fil=shkS?all.filter(f=>(f.name||'').toLowerCase().includes(shkS.toLowerCase())||(f.mobile||'').includes(shkS)||(f.village||'').toLowerCase().includes(shkS.toLowerCase())):all;
  area.innerHTML=`
  <div class="sh"><span class="st2">🌾 शेतकरी DB (${all.length})</span><button class="btn bp" onclick="window.openShkM()"><i class="fas fa-plus"></i> नवीन</button></div>
  ${ad1}
  <div class="card" style="margin-bottom:11px"><div class="sw"><i class="fas fa-search"></i><input class="fc" placeholder="नाव / मोबाइल / गाव..." value="${shkS}" oninput="window.shkSetS(this.value)"/></div></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">
    ${fil.length===0?`<div class="empty" style="grid-column:1/-1"><i class="fas fa-users"></i><p>कोणताही शेतकरी सापडला नाही${shkS?'':` — <button class="btn bp bsm" onclick="window.openShkM()" style="margin-top:8px">+ जोडा</button>`}</p></div>`:
    fil.map(f=>`<div class="card" style="padding:13px;border-left:3px solid var(--g400)">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">
        <div style="width:40px;height:40px;border-radius:50%;background:var(--brand-l);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:1rem;font-weight:800;color:var(--brand);flex-shrink:0">${(f.name||'?').charAt(0).toUpperCase()}</div>
        <div style="min-width:0"><div style="font-weight:700;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
        <div style="font-size:.68rem;color:var(--tx3)">📍 ${f.village||'—'}${f.land?' · '+f.land+' एकर':''}</div></div>
      </div>
      ${f.mobile?`<div style="font-size:.78rem;color:var(--tx2);margin-bottom:8px">📞 ${f.mobile}</div>`:''}
      ${f.notes?`<div style="font-size:.72rem;color:var(--tx3);margin-bottom:8px;line-height:1.4">${f.notes}</div>`:''}
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn bp bxs" onclick="window.openKhataByName('${f.name.replace(/'/g,"\\'")}')"><i class="fas fa-book"></i> खाता पहा</button>
        ${f.mobile?`<a href="tel:${f.mobile}" class="btn bcl bxs"><i class="fas fa-phone"></i> कॉल</a>
        <a href="https://wa.me/${waNum(f.mobile)}?text=${encodeURIComponent(`🙏 नमस्कार ${f.name} जी!\n\n${gProf().businessName||'TractorWala'} तर्फे\nकाही काम असल्यास संपर्क करा.\n\nधन्यवाद! 🚜`)}" target="_blank" class="btn bwa bxs"><i class="fab fa-whatsapp"></i> WA</a>`:''}
        <button class="btn bg2 bxs" onclick="window.openShkM(_regGet('${f._id}'))"><i class="fas fa-edit"></i></button>
        <button class="btn br bxs" onclick="window.delShk('${f._id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('')}
  </div>
  <div class="mo h" id="shkM">
    <div class="md">
      <div class="mh"><span class="mt" id="shkMT">नवीन शेतकरी</span><button class="mx" onclick="closeM('shkM')"><i class="fas fa-times"></i></button></div>
      <div class="mb">
        <input type="hidden" id="shkId"/>
        <div class="fr2">
          <div class="fg"><label class="fl">नाव *</label><input class="fc" id="shkNm" placeholder="नाव"/></div>
          <div class="fg"><label class="fl">मोबाइल</label><input class="fc" type="tel" id="shkMb" placeholder="मोबाइल"/></div>
        </div>
        <div class="fr2">
          <div class="fg"><label class="fl">गाव</label><input class="fc" id="shkVl" placeholder="गाव"/></div>
          <div class="fg"><label class="fl">जमीन (एकर)</label><input class="fc" type="number" id="shkLd" placeholder="एकर"/></div>
        </div>
        <div class="fg"><label class="fl">नोट</label><textarea class="fc" id="shkNt" rows="2" placeholder="वैकल्पिक"></textarea></div>
      </div>
      <div class="mf"><button class="btn bg2" onclick="closeM('shkM')">रद्द</button><button class="btn bp" onclick="window.saveShk()"><i class="fas fa-save"></i> सेव्ह</button></div>
    </div>
  </div>`;
}
window.shkSetS=function(v){shkS=v;window.render('shetkari');};

window.openShkM=function(f=null){
  document.getElementById('shkM').classList.remove('h');
  document.getElementById('shkId').value=f?._id||'';
  document.getElementById('shkMT').textContent=f?'शेतकरी संपादित':'नवीन शेतकरी';
  document.getElementById('shkNm').value=f?.name||'';
  document.getElementById('shkMb').value=f?.mobile||'';
  document.getElementById('shkVl').value=f?.village||'';
  document.getElementById('shkLd').value=f?.land||'';
  document.getElementById('shkNt').value=f?.notes||'';
};
window.saveShk=async function(){
  if(!lock('saveShk'))return;
  const id=document.getElementById('shkId').value;
  const nm=document.getElementById('shkNm').value.trim();
  if(!nm){toast('नाव आवश्यक','err');unlock('saveShk');return;}
  const d={uid:uid(),name:nm,mobile:document.getElementById('shkMb').value.trim(),village:document.getElementById('shkVl').value.trim(),land:parseFloat(document.getElementById('shkLd').value)||0,notes:document.getElementById('shkNt').value.trim(),updatedAt:today()};
  try{
    if(id){await updateDoc(doc(db,'shetkari',id),d);autoBackup('update','shetkari',{...d,_id:id});}
    else{const ref=await addDoc(col('shetkari'),{...d,createdAt:today()});autoBackup('create','shetkari',{...d,_id:ref.id});}
    window.closeM('shkM');toast('शेतकरी सेव्ह ✅');window.render('shetkari');
  }catch(e){toast(friendlyErr(e),'err');}
  finally{unlock('saveShk');}
};
window.delShk=async function(id){
  if(!confirm('हा शेतकरी हटवायचा?'))return;
  try{await deleteDoc(doc(db,'shetkari',id));autoBackup('delete','shetkari',{_id:id});toast('हटवले');window.render('shetkari');}catch(e){toast(friendlyErr(e),'err');}
};
