// rate-card.js — Dar Card (rate management) page
import{getDocs,addDoc,updateDoc,deleteDoc,doc,db,uq,col,uid,today,fmt,toast,lock,unlock,adBannerHTML,autoBackup,friendlyErr,ONB,refreshOnboardState,nav}from'./core.js';

export async function pgRC(area){
  const[snap,ad1]=await Promise.all([getDocs(uq('rates')),adBannerHTML('rate-card-top')]);
  const rates=[];snap.forEach(d=>rates.push({...d.data(),_id:d.id}));
  window._regSet(rates);
  const stepChip=(ONB.checked&&ONB.profileDone&&!ONB.rateDone)?`<span class="bx" style="background:var(--amber);color:#000;font-weight:800;margin-left:8px">पायरी 2/2</span>`:'';
  area.innerHTML=`
  <div class="sh"><span><span class="st2">💳 दर कार्ड</span>${stepChip}</span><button class="btn bp" onclick="openRM()"><i class="fas fa-plus"></i> नवीन दर</button></div>
  ${ad1}
  <div class="card">
    ${rates.length===0?`<div class="empty"><i class="fas fa-tags"></i><p>अजून कोणताही दर नाही<br><button class="btn bp bsm" onclick="openRM()" style="margin-top:8px">+ दर जोडा</button></p></div>`:`
    <div class="tw"><table>
      <thead><tr><th>काम प्रकार</th><th>युनिट</th><th>दर ₹</th><th>नोट</th><th>क्रिया</th></tr></thead>
      <tbody>${rates.map(r=>`<tr>
        <td><b>${r.workType}</b></td>
        <td><span class="bx bxb">${r.unit}</span></td>
        <td><b style="color:var(--g700)">₹${fmt(r.rate)}</b></td>
        <td style="color:var(--tx3);font-size:.75rem">${r.notes||'—'}</td>
        <td><div style="display:flex;gap:4px">
          <button class="btn bg2 bic bxs" onclick="openRM(_regGet('${r._id}'))"><i class="fas fa-edit"></i></button>
          <button class="btn br bic bxs" onclick="delRate('${r._id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>`}
  </div>
  <div class="mo h" id="rateM">
    <div class="md"><div class="mh"><span class="mt" id="rateMT">नवीन दर</span><button class="mx" onclick="closeM('rateM')"><i class="fas fa-times"></i></button></div>
    <div class="mb">
      <input type="hidden" id="rId"/>
      <div class="fg"><label class="fl">काम प्रकार *</label><input class="fc" id="rWT" placeholder="उदा: नांगरणी, पेरणी"/></div>
      <div class="fr2">
        <div class="fg"><label class="fl">युनिट *</label><select class="fc" id="rUn"><option>तास</option><option>एकर</option><option>गुंठा</option><option>ट्रिप</option></select></div>
        <div class="fg"><label class="fl">दर ₹ *</label><input class="fc" type="number" id="rAm" placeholder="₹"/></div>
      </div>
      <div class="fg"><label class="fl">नोट</label><input class="fc" id="rNt" placeholder="वैकल्पिक"/></div>
    </div>
    <div class="mf"><button class="btn bg2" onclick="closeM('rateM')">रद्द</button><button class="btn bp" onclick="saveRate()"><i class="fas fa-save"></i> सेव्ह</button></div>
    </div>
  </div>`;
}
window.openRM=function(r=null){
  document.getElementById('rateM').classList.remove('h');
  document.getElementById('rId').value=r?._id||'';
  document.getElementById('rateMT').textContent=r?'दर संपादित':'नवीन दर';
  document.getElementById('rWT').value=r?.workType||'';
  document.getElementById('rUn').value=r?.unit||'तास';
  document.getElementById('rAm').value=r?.rate||'';
  document.getElementById('rNt').value=r?.notes||'';
};
window.saveRate=async function(){
  if(!lock('saveRate'))return;
  const id=document.getElementById('rId').value;
  const wt=document.getElementById('rWT').value.trim();
  const am=parseFloat(document.getElementById('rAm').value)||0;
  if(!wt||!am){toast('काम प्रकार आणि दर आवश्यक','err');unlock('saveRate');return;}
  const d={uid:uid(),workType:wt,unit:document.getElementById('rUn').value,rate:am,notes:document.getElementById('rNt').value.trim(),updatedAt:today()};
  try{
    if(id){await updateDoc(doc(db,'rates',id),d);autoBackup('update','rates',{...d,_id:id});}
    else{const ref=await addDoc(col('rates'),{...d,createdAt:today()});autoBackup('create','rates',{...d,_id:ref.id});}
    window.closeM('rateM');toast('दर सेव्ह ✅');
    const wasOnboarding=ONB.checked&&!ONB.rateDone;
    await refreshOnboardState();
    if(wasOnboarding&&ONB.rateDone){
      toast('🎉 सर्व सेट झाले! आता तुम्ही संपूर्ण ॲप वापरू शकता','ok',4500);
      nav('dashboard');
    }else{
      window.render('rate-card');
    }
  }catch(e){toast(friendlyErr(e),'err');}
  finally{unlock('saveRate');}
};
window.delRate=async function(id){
  if(!confirm('दर हटवायचा?'))return;
  try{await deleteDoc(doc(db,'rates',id));autoBackup('delete','rates',{_id:id});toast('हटवला');window.render('rate-card');}catch(e){toast(friendlyErr(e),'err');}
};
