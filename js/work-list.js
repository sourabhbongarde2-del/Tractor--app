// work-list.js — Kaam Yaadi (work list) page, flat + grouped-by-customer views
import{getDocs,deleteDoc,doc,db,uq,fmt,fmtD,balOf,paidOf,waNum,flDates,adBannerHTML,gProf,toast,autoBackup,friendlyErr,setEditWID}from'./core.js';

let wlF='month',wlS='',wlSt='',wlEn='',wlView='flat';

export async function pgWL(area){
  const snap=await getDocs(uq('works'));
  let works=[];snap.forEach(d=>works.push({...d.data(),_id:d.id}));
  works.sort((a,b)=>(b.date||'')>(a.date||'')?1:-1);
  let fil=flDates(works,wlF,wlSt,wlEn);
  if(wlS)fil=fil.filter(w=>
    (w.customerName||'').toLowerCase().includes(wlS.toLowerCase())||
    (w.workType||'').toLowerCase().includes(wlS.toLowerCase())||
    (w.mobile||'').includes(wlS)
  );
  const totR=fil.reduce((s,w)=>s+(w.total||0),0);
  const totP=fil.reduce((s,w)=>s+paidOf(w),0);

  const custNames=[...new Set(works.map(w=>w.customerName).filter(Boolean))].sort();
  const ad2=await adBannerHTML('work-list-top');

  area.innerHTML=`
  <div class="sh"><span class="st2">📋 काम यादी</span><button class="btn bp" onclick="nav('work-entry')"><i class="fas fa-plus"></i> नवीन</button></div>
  ${ad2}
  <div class="card" style="margin-bottom:11px">
    <div class="fb">
      ${['all','today','week','month','custom'].map(f=>`<button class="fn ${wlF===f?'on':''}" onclick="window.wlSetF('${f}')">${{all:'सर्व',today:'आज',week:'आठवडा',month:'महिना',custom:'सानुकूल'}[f]}</button>`).join('')}
    </div>
    ${wlF==='custom'?`<div class="fr2" style="margin-bottom:10px">
      <div class="fg" style="margin:0"><input type="date" class="fc" value="${wlSt}" onchange="window.wlSetRange(this.value,null)"/></div>
      <div class="fg" style="margin:0"><input type="date" class="fc" value="${wlEn}" onchange="window.wlSetRange(null,this.value)"/></div>
    </div>`:''}
    <div class="sw"><i class="fas fa-search"></i><input class="fc" list="wlCustList" placeholder="ग्राहक / काम / मोबाइल शोधा..." value="${wlS}" oninput="window.wlSetS(this.value)"/>
      <datalist id="wlCustList">${custNames.map(n=>`<option value="${n}"></option>`).join('')}</datalist></div>
    <div class="tabs" style="max-width:320px;margin-top:10px;margin-bottom:0">
      <button class="tab ${wlView==='flat'?'on':''}" onclick="window.wlSetView('flat')"><i class="fas fa-list"></i> सर्व काम</button>
      <button class="tab ${wlView==='grouped'?'on':''}" onclick="window.wlSetView('grouped')"><i class="fas fa-users"></i> ग्राहकानुसार</button>
    </div>
  </div>
  <div class="sg" style="margin-bottom:11px">
    <div class="st g"><div class="si g"><i class="fas fa-rupee-sign"></i></div><div class="sb2"><div class="sl">उत्पन्न</div><div class="sv">₹${fmt(totR)}</div></div></div>
    <div class="st b"><div class="si b"><i class="fas fa-check"></i></div><div class="sb2"><div class="sl">मिळाले</div><div class="sv">₹${fmt(totP)}</div></div></div>
    <div class="st a"><div class="si a"><i class="fas fa-clock"></i></div><div class="sb2"><div class="sl">बाकी</div><div class="sv">₹${fmt(totR-totP)}</div></div></div>
    <div class="st g"><div class="si g"><i class="fas fa-list"></i></div><div class="sb2"><div class="sl">काम</div><div class="sv">${fil.length}</div></div></div>
  </div>
  <div class="card">
    ${wlView==='grouped'?renderWLGrouped(fil):renderWLFlat(fil)}
  </div>`;
}

window.wlSetF=function(f){wlF=f;window.render('work-list');};
window.wlSetRange=function(s,e){if(s!==null)wlSt=s;if(e!==null)wlEn=e;window.render('work-list');};
window.wlSetS=function(v){wlS=v;window.render('work-list');};
window.wlSetView=function(v){wlView=v;window.render('work-list');};

function renderWLFlat(fil){
  if(fil.length===0)return`<div class="empty"><i class="fas fa-search"></i><p>कोणतेही काम सापडले नाही</p></div>`;
  return`<div class="tw"><table>
    <thead><tr><th>ग्राहक</th><th>काम</th><th>प्रमाण</th><th>एकूण</th><th>बाकी</th><th>तारीख</th><th></th></tr></thead>
    <tbody>${fil.map(w=>{const b=balOf(w);return`<tr class="${b>0?'prow':''}">
      <td><b style="font-size:.82rem;cursor:pointer;color:var(--brand)" onclick="window.openKhataByName('${w.customerName.replace(/'/g,"\\'")}')">${w.customerName}</b><br><small style="color:var(--tx3);font-size:.65rem">${w.mobile||''}</small></td>
      <td style="font-size:.78rem">${w.workType}</td>
      <td style="font-size:.75rem">${w.quantity} ${w.unit}</td>
      <td><b>₹${fmt(w.total)}</b></td>
      <td><span class="bx ${b>0?'bxa':'bxg'}" style="font-size:.66rem">₹${fmt(b)}</span></td>
      <td style="font-size:.72rem;white-space:nowrap">${fmtD(w.date)}</td>
      <td><div style="display:flex;gap:3px;flex-wrap:nowrap">
        <button class="btn bg2 bic bxs" onclick="window.editW('${w._id}')" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="btn ba bic bxs" onclick="window.openPayMo('${w._id}')" title="Payment"><i class="fas fa-rupee-sign"></i></button>
        <button class="btn bg2 bic bxs" onclick="window.openInv('${w._id}')" title="Invoice"><i class="fas fa-file-invoice"></i></button>
        <button class="btn br bic bxs" onclick="window.delW('${w._id}')" title="Delete"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;}).join('')}</tbody>
  </table></div>`;
}
function renderWLGrouped(fil){
  if(fil.length===0)return`<div class="empty"><i class="fas fa-search"></i><p>कोणतेही काम सापडले नाही</p></div>`;
  const grp={};
  fil.forEach(w=>{
    const k=w.customerName||'—';
    if(!grp[k])grp[k]={works:0,total:0,paid:0,mobile:w.mobile||'',last:w.date};
    grp[k].works++;grp[k].total+=(w.total||0);grp[k].paid+=paidOf(w);
    if(!grp[k].mobile&&w.mobile)grp[k].mobile=w.mobile;
    if(w.date>grp[k].last)grp[k].last=w.date;
  });
  const rows=Object.entries(grp).sort((a,b)=>(b[1].total-b[1].paid)-(a[1].total-a[1].paid));
  return`<div class="tw"><table>
    <thead><tr><th>ग्राहक</th><th>काम</th><th>एकूण</th><th>भरले</th><th>बाकी</th><th>शेवटचे काम</th><th></th></tr></thead>
    <tbody>${rows.map(([name,g])=>{const b=g.total-g.paid;return`<tr class="${b>0.01?'prow':''}">
      <td><b style="font-size:.85rem;cursor:pointer;color:var(--brand)" onclick="window.openKhataByName('${name.replace(/'/g,"\\'")}')">${name}</b><br><small style="color:var(--tx3);font-size:.65rem">${g.mobile||''}</small></td>
      <td><span class="bx bxb">${g.works} काम</span></td>
      <td><b>₹${fmt(g.total)}</b></td>
      <td style="color:var(--g700)">₹${fmt(g.paid)}</td>
      <td><span class="bx ${b>0.01?'bxa':'bxg'}">${b>0.01?'₹'+fmt(b)+' बाकी':'✅ पूर्ण'}</span></td>
      <td style="font-size:.72rem;white-space:nowrap">${fmtD(g.last)}</td>
      <td><div style="display:flex;gap:3px;flex-wrap:nowrap">
        <button class="btn bp bsm" onclick="window.openKhataByName('${name.replace(/'/g,"\\'")}')"><i class="fas fa-eye"></i> खाता</button>
        ${g.mobile&&b>0.01?`<a href="https://wa.me/${waNum(g.mobile)}?text=${encodeURIComponent(`🙏 नमस्कार ${name} जी,\n\n🚜 ${gProf().businessName||'TractorWala'} – एकूण बाकी पेमेंट स्मरणपत्र\n\n💰 एकूण व्यवसाय: ₹${fmt(g.total)}\n✅ भरले: ₹${fmt(g.paid)}\n⚠️ एकूण बाकी: ₹${fmt(b)}\n\nकृपया लवकरात लवकर पेमेंट करावे. 🙏\n— ${gProf().businessName||'TractorWala'}`)}" target="_blank" class="btn bwa bic bxs" title="WA"><i class="fab fa-whatsapp"></i></a>`:''}
      </div></td>
    </tr>`;}).join('')}</tbody>
  </table></div>`;
}
window.editW=id=>{setEditWID(id);window.nav('work-entry');};
window.delW=async function(id){
  if(!confirm('हे काम कायमचे हटवायचे?'))return;
  try{await deleteDoc(doc(db,'works',id));autoBackup('delete','works',{_id:id});toast('हटवले');window.updBadge();window.render('work-list');}catch(e){toast(friendlyErr(e),'err');}
};
