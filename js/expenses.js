// expenses.js — Kharch (expenses) page
import{getDocs,addDoc,updateDoc,deleteDoc,doc,db,uq,col,uid,today,fmt,fmtD,flDates,toast,lock,unlock,adBannerHTML,autoBackup,friendlyErr}from'./core.js';

let exF='month',exS='',exSt='',exEn='';

export async function pgEx(area){
  const[snap,ad1]=await Promise.all([getDocs(uq('expenses')),adBannerHTML('expenses-top')]);
  let all=[];snap.forEach(d=>all.push({...d.data(),_id:d.id}));
  window._regSet(all);
  all.sort((a,b)=>(b.date||'')>(a.date||'')?1:-1);
  let fil=flDates(all,exF,exSt,exEn);
  if(exS)fil=fil.filter(e=>(e.description||'').toLowerCase().includes(exS.toLowerCase())||(e.category||'').toLowerCase().includes(exS.toLowerCase()));
  const tot=fil.reduce((s,e)=>s+(e.amount||0),0);
  const cats={};fil.forEach(e=>{cats[e.category||'इतर']=(cats[e.category||'इतर']||0)+(e.amount||0);});
  const catArr=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const maxC=catArr[0]?catArr[0][1]:1;

  area.innerHTML=`
  <div class="sh"><span class="st2">💸 खर्च</span><button class="btn bp" onclick="window.openExM()"><i class="fas fa-plus"></i> नवीन खर्च</button></div>
  ${ad1}
  <div class="card" style="margin-bottom:11px">
    <div class="fb">
      ${['all','today','week','month','custom'].map(f=>`<button class="fn ${exF===f?'on':''}" onclick="window.exSetF('${f}')">${{all:'सर्व',today:'आज',week:'आठवडा',month:'महिना',custom:'सानुकूल'}[f]}</button>`).join('')}
    </div>
    ${exF==='custom'?`<div class="fr2" style="margin-bottom:10px">
      <div class="fg" style="margin:0"><input type="date" class="fc" value="${exSt}" onchange="window.exSetRange(this.value,null)"/></div>
      <div class="fg" style="margin:0"><input type="date" class="fc" value="${exEn}" onchange="window.exSetRange(null,this.value)"/></div>
    </div>`:''}
    <div class="sw"><i class="fas fa-search"></i><input class="fc" placeholder="खर्च / श्रेणी शोधा..." value="${exS}" oninput="window.exSetS(this.value)"/></div>
  </div>
  <div class="sg" style="margin-bottom:11px">
    <div class="st r"><div class="si r"><i class="fas fa-rupee-sign"></i></div><div class="sb2"><div class="sl">एकूण खर्च</div><div class="sv">₹${fmt(tot)}</div></div></div>
    <div class="st g"><div class="si g"><i class="fas fa-list"></i></div><div class="sb2"><div class="sl">नोंदी</div><div class="sv">${fil.length}</div></div></div>
    <div class="st b"><div class="si b"><i class="fas fa-tags"></i></div><div class="sb2"><div class="sl">श्रेणी</div><div class="sv">${catArr.length}</div></div></div>
    <div class="st a"><div class="si a"><i class="fas fa-chart-bar"></i></div><div class="sb2"><div class="sl">सर्वात जास्त</div><div class="sv" style="font-size:.9rem">${catArr[0]?catArr[0][0]:'—'}</div></div></div>
  </div>
  ${catArr.length>0?`<div class="card" style="margin-bottom:11px">
    <div class="ch"><span class="ct2">📊 श्रेणीनुसार</span></div>
    ${catArr.map(([c,a])=>`<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px"><span style="font-weight:600">${c}</span><span style="font-weight:700;color:var(--red)">₹${fmt(a)} <small style="opacity:.7">(${tot?Math.round(a/tot*100):0}%)</small></span></div>
      <div class="pg"><div class="pgb red" style="width:${a/maxC*100}%"></div></div>
    </div>`).join('')}
  </div>`:''}
  <div class="card">
    ${fil.length===0?`<div class="empty"><i class="fas fa-receipt"></i><p>कोणताही खर्च नाही<br><button class="btn bp bsm" onclick="window.openExM()" style="margin-top:8px">+ खर्च जोडा</button></p></div>`:`
    <div class="tw"><table>
      <thead><tr><th>वर्णन</th><th>श्रेणी</th><th>रक्कम</th><th>तारीख</th><th></th></tr></thead>
      <tbody>${fil.map(e=>`<tr>
        <td><b style="font-size:.82rem">${e.description}</b>${e.notes?`<br><small style="color:var(--tx3);font-size:.68rem">${e.notes}</small>`:''}</td>
        <td><span class="bx bxb">${e.category||'इतर'}</span></td>
        <td><b style="color:var(--red)">₹${fmt(e.amount)}</b></td>
        <td style="font-size:.72rem">${fmtD(e.date)}</td>
        <td><div style="display:flex;gap:3px">
          <button class="btn bg2 bic bxs" onclick="window.openExM(_regGet('${e._id}'))"><i class="fas fa-edit"></i></button>
          <button class="btn br bic bxs" onclick="window.delEx('${e._id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>`}
  </div>
  <div class="mo h" id="exM">
    <div class="md">
      <div class="mh"><span class="mt" id="exMT">नवीन खर्च</span><button class="mx" onclick="closeM('exM')"><i class="fas fa-times"></i></button></div>
      <div class="mb">
        <input type="hidden" id="exId"/>
        <div class="fg"><label class="fl">वर्णन *</label><input class="fc" id="exDe" placeholder="खर्चाचे वर्णन"/></div>
        <div class="fr2">
          <div class="fg"><label class="fl">श्रेणी *</label>
            <input class="fc" id="exCa" list="exCL" placeholder="श्रेणी"/>
            <datalist id="exCL"><option value="डिझेल"><option value="दुरुस्ती"><option value="टायर"><option value="मजुरी"><option value="खते"><option value="बियाणे"><option value="तेल"><option value="इतर"></datalist></div>
          <div class="fg"><label class="fl">रक्कम ₹ *</label><input class="fc" type="number" id="exAm" placeholder="₹"/></div>
        </div>
        <div class="fr2">
          <div class="fg"><label class="fl">तारीख</label><input class="fc" type="date" id="exDt" value="${today()}"/></div>
          <div class="fg"><label class="fl">नोट</label><input class="fc" id="exNt" placeholder="वैकल्पिक"/></div>
        </div>
      </div>
      <div class="mf"><button class="btn bg2" onclick="closeM('exM')">रद्द</button><button class="btn bp" onclick="window.saveEx()"><i class="fas fa-save"></i> सेव्ह</button></div>
    </div>
  </div>`;
}
window.exSetF=function(f){exF=f;window.render('expenses');};
window.exSetRange=function(s,e){if(s!==null)exSt=s;if(e!==null)exEn=e;window.render('expenses');};
window.exSetS=function(v){exS=v;window.render('expenses');};

window.openExM=function(e=null){
  document.getElementById('exM').classList.remove('h');
  document.getElementById('exId').value=e?._id||'';
  document.getElementById('exMT').textContent=e?'खर्च संपादित':'नवीन खर्च';
  document.getElementById('exDe').value=e?.description||'';
  document.getElementById('exCa').value=e?.category||'';
  document.getElementById('exAm').value=e?.amount||'';
  document.getElementById('exDt').value=e?.date||today();
  document.getElementById('exNt').value=e?.notes||'';
};
window.saveEx=async function(){
  if(!lock('saveEx'))return;
  const id=document.getElementById('exId').value;
  const de=document.getElementById('exDe').value.trim();
  const am=parseFloat(document.getElementById('exAm').value)||0;
  if(!de||!am){toast('वर्णन आणि रक्कम आवश्यक','err');unlock('saveEx');return;}
  const d={uid:uid(),description:de,category:document.getElementById('exCa').value.trim()||'इतर',amount:am,date:document.getElementById('exDt').value||today(),notes:document.getElementById('exNt').value.trim(),updatedAt:today()};
  try{
    if(id){await updateDoc(doc(db,'expenses',id),d);autoBackup('update','expenses',{...d,_id:id});}
    else{const ref=await addDoc(col('expenses'),{...d,createdAt:today()});autoBackup('create','expenses',{...d,_id:ref.id});}
    window.closeM('exM');toast('खर्च सेव्ह ✅');window.render('expenses');
  }catch(e){toast(friendlyErr(e),'err');}
  finally{unlock('saveEx');}
};
window.delEx=async function(id){
  if(!confirm('हा खर्च हटवायचा?'))return;
  try{await deleteDoc(doc(db,'expenses',id));autoBackup('delete','expenses',{_id:id});toast('हटवला');window.render('expenses');}catch(e){toast(friendlyErr(e),'err');}
};
