// payments.js — Payments page (pending/done tabs) + the universal "add payment" modal
// (openPayMo/addPay/delPay are used from Dashboard, Work List, and here, so they live here
//  and attach to window so other page modules can call them.)
import{getDocs,updateDoc,doc,db,uq,fmt,fmtD,balOf,paidOf,waNum,today,toast,lock,unlock,gProf,autoBackup,friendlyErr,adBannerHTML}from'./core.js';

export async function pgPay(area){
  const[snap,ad1]=await Promise.all([getDocs(uq('works')),adBannerHTML('payments-top')]);
  let all=[];snap.forEach(d=>all.push({...d.data(),_id:d.id}));
  all.sort((a,b)=>(b.date||'')>(a.date||'')?1:-1);
  const pend=all.filter(w=>balOf(w)>0.01);
  const done=all.filter(w=>balOf(w)<=0.01);

  area.innerHTML=`
  <div class="sh"><span class="st2">💰 पेमेंट</span></div>
  ${ad1}
  <div class="tabs">
    <button class="tab on" id="tP" onclick="window.swPTab('p')">⏳ बाकी (${pend.length})</button>
    <button class="tab" id="tD" onclick="window.swPTab('d')">✅ पूर्ण (${done.length})</button>
  </div>
  <div id="payTabA">${renderPL(pend,'p')}</div>`;
}
function renderPL(ws,type){
  if(!ws.length)return`<div class="empty"><i class="fas fa-${type==='p'?'clock':'check-circle'}"></i><p>${type==='p'?'बाकी पेमेंट नाही':'पूर्ण झालेले दाखवत आहे'}</p></div>`;
  return`<div style="display:flex;flex-direction:column;gap:9px">${ws.map(w=>{
    const b=balOf(w),p=paidOf(w),pct=w.total?Math.min(100,p/w.total*100):100;
    return`<div class="card" style="padding:13px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <div><div style="font-weight:700;font-size:.9rem;cursor:pointer;color:var(--brand)" onclick="window.openKhataByName('${w.customerName.replace(/'/g,"\\'")}')">${w.customerName}</div>
        <div style="font-size:.72rem;color:var(--tx3)">${w.workType} · ${fmtD(w.date)} ${w.mobile?'· 📞'+w.mobile:''}</div></div>
        <div style="text-align:right"><div style="font-size:.68rem;color:var(--tx3)">₹${fmt(w.total)}</div>
        <div style="font-weight:800;font-size:.95rem;color:${b>0?'var(--amber-d)':'var(--g700)'}">${b>0?'₹'+fmt(b)+' बाकी':'✅ पूर्ण'}</div></div>
      </div>
      <div class="pg"><div class="pgb" style="width:${pct}%"></div></div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">
        ${type==='p'?`<button class="btn bp bsm" onclick="window.openPayMo('${w._id}')"><i class="fas fa-plus"></i> पेमेंट</button>`:''}
        ${w.mobile?`<a href="https://wa.me/${waNum(w.mobile)}?text=${encodeURIComponent(`🙏 नमस्कार ${w.customerName} जी,\n\n🚜 ${gProf().businessName||'TractorWala'} – पेमेंट स्मरणपत्र\n\n📋 काम: ${w.workType}\n💰 एकूण: ₹${fmt(w.total)}\n⚠️ बाकी: ₹${fmt(b)}\n\nकृपया लवकर पेमेंट करावे. 🙏\n— ${gProf().businessName||'TractorWala'}`)}" target="_blank" class="btn bwa bsm"><i class="fab fa-whatsapp"></i> WA</a>
        <a href="tel:${w.mobile}" class="btn bcl bsm"><i class="fas fa-phone"></i> कॉल</a>`:''}
        <button class="btn bg2 bsm" onclick="window.openInv('${w._id}')"><i class="fas fa-file-invoice"></i> Invoice</button>
      </div>
    </div>`;}).join('')}</div>`;
}
window.swPTab=function(tb){
  document.getElementById('tP').classList.toggle('on',tb==='p');
  document.getElementById('tD').classList.toggle('on',tb==='d');
  getDocs(uq('works')).then(snap=>{
    let all=[];snap.forEach(d=>all.push({...d.data(),_id:d.id}));
    document.getElementById('payTabA').innerHTML=renderPL(tb==='p'?all.filter(w=>balOf(w)>0.01):all.filter(w=>balOf(w)<=0.01),tb);
  }).catch(e=>toast(friendlyErr(e),'err'));
};

// ---- Universal "add payment" modal (used from Dashboard / Work List / Payments / Khata) ----
window.openPayMo=async function(wid){
  const mo=document.getElementById('payMo');
  const body=document.getElementById('payMoBody');
  mo.classList.remove('h');
  body.innerHTML='<div class="spin"></div>';
  try{
    const snap=await getDocs(uq('works'));
    let w=null;snap.forEach(d=>{if(d.id===wid)w={...d.data(),_id:d.id};});
    if(!w){body.innerHTML='<p>काम सापडले नाही</p>';return;}
    const paid=paidOf(w),bal=balOf(w),pct=w.total?Math.min(100,paid/w.total*100):100;
    body.innerHTML=`
    <div style="background:var(--surf2);border-radius:var(--r8);padding:12px;margin-bottom:14px;border:1px solid var(--bdr2)">
      <div style="font-weight:700;font-size:.92rem;margin-bottom:8px">${w.customerName} <span style="font-size:.72rem;color:var(--tx3);font-weight:400">· ${w.workType} · ${fmtD(w.date)}</span></div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px">
        <div><div class="sl">एकूण</div><div style="font-weight:800;font-size:.95rem">₹${fmt(w.total)}</div></div>
        <div><div class="sl">भरले</div><div style="font-weight:800;font-size:.95rem;color:var(--g700)">₹${fmt(paid)}</div></div>
        <div><div class="sl">बाकी</div><div style="font-weight:800;font-size:.95rem;color:${bal>0?'var(--amber-d)':'var(--g700)'}">₹${fmt(bal)}</div></div>
      </div>
      <div class="pg"><div class="pgb" style="width:${pct}%"></div></div>
    </div>
    ${(w.payments||[]).length>0?`
    <div style="margin-bottom:14px">
      <div style="font-size:.72rem;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">पेमेंट इतिहास</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${(w.payments||[]).map((px,i)=>`<div class="pi">
          <i class="fas fa-check-circle" style="color:var(--g500);flex-shrink:0;font-size:.9rem"></i>
          <div style="flex:1"><div class="pa">₹${fmt(px.amount)}</div>${px.note?`<div style="font-size:.68rem;color:var(--tx3)">${px.note}</div>`:''}</div>
          <div class="pd">${fmtD(px.date)}</div>
          <button class="btn br bic bxs" onclick="window.delPay('${wid}',${i})"><i class="fas fa-trash"></i></button>
        </div>`).join('')}
      </div>
    </div>`:''}
    ${bal>0.01?`
    <div style="border-top:1px solid var(--bdr);padding-top:13px">
      <div style="font-size:.8rem;font-weight:700;margin-bottom:10px;color:var(--tx1)">नवीन पेमेंट जोडा</div>
      <div class="fr2">
        <div class="fg"><label class="fl">रक्कम (₹) *</label><input class="fc" type="number" id="npAmt" placeholder="₹" max="${bal}"/></div>
        <div class="fg"><label class="fl">तारीख</label><input class="fc" type="date" id="npDt" value="${today()}"/></div>
      </div>
      <div class="fg"><label class="fl">नोट</label><input class="fc" id="npNt" placeholder="वैकल्पिक"/></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn bp" onclick="window.addPay('${wid}',false)"><i class="fas fa-plus"></i> पेमेंट जोडा</button>
        <button class="btn ba" onclick="window.addPay('${wid}',true)"><i class="fas fa-check"></i> पूर्ण (₹${fmt(bal)})</button>
        ${w.mobile?`<a href="https://wa.me/${waNum(w.mobile)}?text=${encodeURIComponent(`🙏 नमस्कार ${w.customerName} जी,\n\n🚜 ${gProf().businessName||'TractorWala'} पेमेंट स्मरणपत्र\n\n📋 काम: ${w.workType}\n💰 एकूण: ₹${fmt(w.total)}\n✅ भरले: ₹${fmt(paid)}\n⚠️ बाकी: ₹${fmt(bal)}\n\nकृपया लवकर पेमेंट करावे. 🙏\n— ${gProf().businessName||'TractorWala'}`)}" target="_blank" class="btn bwa" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i> WA स्मरण</a>`:''}
      </div>
    </div>`:`<div style="text-align:center;padding:16px;color:var(--g700);font-weight:800"><i class="fas fa-check-circle" style="font-size:2rem;display:block;margin-bottom:6px"></i>पेमेंट पूर्ण! 🎉</div>`}`;
  }catch(e){body.innerHTML=`<p style="color:var(--red)">${friendlyErr(e)}</p>`;}
};
window.addPay=async function(wid,full){
  if(!lock('addPay'+wid))return; // double-tap guard: rokta hai ek hi payment do baar add hone se
  try{
    const snap=await getDocs(uq('works'));
    let w=null;snap.forEach(d=>{if(d.id===wid)w={...d.data()};});
    if(!w)return;
    const bal=balOf(w);
    const amt=full?bal:parseFloat(document.getElementById('npAmt')?.value)||0;
    if(amt<=0){toast('रक्कम आवश्यक','err');return;}
    if(amt>bal+0.01){toast(`जास्तीत जास्त ₹${fmt(bal)}`,'warn');return;}
    const px={amount:amt,date:document.getElementById('npDt')?.value||today(),note:document.getElementById('npNt')?.value||''};
    const newPayments=[...(w.payments||[]),px];
    await updateDoc(doc(db,'works',wid),{payments:newPayments,updatedAt:today()});
    autoBackup('update','works',{...w,_id:wid,payments:newPayments});
    toast('पेमेंट जोडले ✅');window.updBadge();window.openPayMo(wid);
    // Khata page khud ko refresh kare agar khula hai (alag function, khata.js define karta hai)
    if(window._khataRefresh)window._khataRefresh();
    const PAGE=window._currentPage;
    if(PAGE==='work-list'||PAGE==='payments')window.render(PAGE);
  }catch(e){toast(friendlyErr(e),'err');}
  finally{unlock('addPay'+wid);}
};
window.delPay=async function(wid,idx){
  if(!confirm('पेमेंट हटवायचे?'))return;
  try{
    const snap=await getDocs(uq('works'));let w=null;
    snap.forEach(d=>{if(d.id===wid)w={...d.data()};});
    if(!w)return;
    const ps=[...(w.payments||[])];ps.splice(idx,1);
    await updateDoc(doc(db,'works',wid),{payments:ps});
    autoBackup('update','works',{...w,_id:wid,payments:ps});
    toast('पेमेंट हटवले');window.updBadge();window.openPayMo(wid);
    if(window._khataRefresh)window._khataRefresh();
  }catch(e){toast(friendlyErr(e),'err');}
};
