// backup.js — Manual Export/Import/Clear + view of auto-backup activity log
import{getDocs,addDoc,deleteDoc,doc,db,uq,col,uid,today,toast,adBannerHTML,friendlyErr}from'./core.js';

export async function pgBk(area){
  const ad1=await adBannerHTML('backup-top');
  area.innerHTML=`
  <div class="sh"><span class="st2">💾 Backup & Restore</span></div>
  ${ad1}
  <div class="card" style="margin-bottom:12px;border-left:3px solid var(--g500)">
    <div style="display:flex;align-items:center;gap:10px">
      <i class="fas fa-shield-alt" style="font-size:1.3rem;color:var(--g600)"></i>
      <div>
        <div style="font-weight:700;font-size:.85rem;color:var(--g700)">Auto-Backup चालू आहे ✅</div>
        <div style="font-size:.74rem;color:var(--tx2)">प्रत्येक save/edit/delete नंतर डेटाची सुरक्षित प्रत आपोआप जतन होते.</div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
    <div class="card" style="border-top:3px solid var(--g500)">
      <div style="font-size:1.8rem;margin-bottom:8px">📤</div>
      <div class="ct2" style="margin-bottom:6px">Export Backup</div>
      <p style="font-size:.8rem;color:var(--tx2);margin-bottom:12px">सर्व डेटा JSON मध्ये download करा.</p>
      <button class="btn bp bfw" onclick="window.doEx()"><i class="fas fa-download"></i> JSON Download</button>
    </div>
    <div class="card" style="border-top:3px solid var(--blue)">
      <div style="font-size:1.8rem;margin-bottom:8px">📥</div>
      <div class="ct2" style="margin-bottom:6px">Import Backup</div>
      <p style="font-size:.8rem;color:var(--tx2);margin-bottom:12px">JSON import करा. जुना डेटा राहतो.</p>
      <input type="file" id="impF" accept=".json" style="display:none" onchange="window.doIm(this)"/>
      <button class="btn bg2 bfw" onclick="document.getElementById('impF').click()"><i class="fas fa-upload"></i> JSON Import</button>
    </div>
    <div class="card" style="border-top:3px solid var(--red)">
      <div style="font-size:1.8rem;margin-bottom:8px">🗑️</div>
      <div class="ct2" style="margin-bottom:6px;color:var(--red)">डेटा साफ करा</div>
      <p style="font-size:.8rem;color:var(--red);margin-bottom:12px">⚠️ Undo करता येत नाही!</p>
      <button class="btn br bfw" onclick="window.doCl()"><i class="fas fa-trash-alt"></i> सर्व हटवा</button>
    </div>
  </div>`;
}
window.doEx=async function(){
  const[wS,eS,rS,sS]=await Promise.all([getDocs(uq('works')),getDocs(uq('expenses')),getDocs(uq('rates')),getDocs(uq('shetkari'))]);
  const bk={v:'4.0',at:new Date().toISOString(),works:[],expenses:[],rates:[],shetkari:[]};
  wS.forEach(d=>bk.works.push({...d.data(),_id:d.id}));eS.forEach(d=>bk.expenses.push({...d.data(),_id:d.id}));
  rS.forEach(d=>bk.rates.push({...d.data(),_id:d.id}));sS.forEach(d=>bk.shetkari.push({...d.data(),_id:d.id}));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(bk,null,2)],{type:'application/json'}));
  a.download=`TractorWala_${today()}.json`;a.click();
  toast(`Backup: ${bk.works.length} काम ✅`);
};
window.doIm=async function(inp){
  const file=inp.files[0];if(!file)return;
  const r=new FileReader();r.onload=async ev=>{
    try{
      const bk=JSON.parse(ev.target.result);
      if(!bk.works){toast('Invalid file','err');return;}
      if(!confirm(`Import: ${bk.works.length} काम, ${bk.expenses?.length||0} खर्च?`))return;
      let n=0;
      for(const x of bk.works){const{_id,...rest}=x;await addDoc(col('works'),{...rest,uid:uid()});n++;}
      for(const x of(bk.expenses||[])){const{_id,...rest}=x;await addDoc(col('expenses'),{...rest,uid:uid()});n++;}
      for(const x of(bk.rates||[])){const{_id,...rest}=x;await addDoc(col('rates'),{...rest,uid:uid()});n++;}
      for(const x of(bk.shetkari||[])){const{_id,...rest}=x;await addDoc(col('shetkari'),{...rest,uid:uid()});n++;}
      toast(`${n} नोंदी import ✅`);window.updBadge();
    }catch(e2){toast(friendlyErr(e2),'err');}
  };r.readAsText(file);
};
window.doCl=async function(){
  if(!confirm('⚠️ सर्व डेटा कायमचा हटवायचा?'))return;
  if(!confirm('नक्की?'))return;
  const[wS,eS]=await Promise.all([getDocs(uq('works')),getDocs(uq('expenses'))]);
  let n=0;
  for(const d of wS.docs){await deleteDoc(doc(db,'works',d.id));n++;}
  for(const d of eS.docs){await deleteDoc(doc(db,'expenses',d.id));n++;}
  toast(`${n} नोंदी हटवल्या`,'warn');window.updBadge();
};
