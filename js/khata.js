// khata.js — Farmer Khata (ledger) page — NEW
// Farmer ke naam pe click karne se yahan aata hai: total kaam, total jama, baki rakam,
// sab kaam ki list, aur seedha payment add karne ka form. Date-range consolidated
// invoice bhi yahin se banta hai (1-tap button).
import{getDocs,uq,fmt,fmtD,balOf,paidOf,waNum,today,toast,adBannerHTML,gProf,setKhFarmerName,friendlyErr,updateDoc,doc,db,autoBackup,lock,unlock,invalidateCache}from'./core.js';

export async function pgKhata(area){
  const name=window._khataName;
  if(!name){
    await renderFarmerPicker(area);
    return;
  }
  await renderKhata(area,name);
  // Khata page khula rehte hue payment add/delete ho to khud refresh ho jaye
  window._khataRefresh=()=>renderKhata(area,name);
}

// Jab bottom-nav se seedha "खाता" pe click kare bina kisi farmer select kiye,
// to list dikhao jisse choose kar sake (sirf khali message dikhana kaafi nahi tha)
async function renderFarmerPicker(area){
  area.innerHTML='<div class="spin"></div>';
  try{
    const snap=await getDocs(uq('shetkari'));
    let farmers=[];snap.forEach(d=>farmers.push({...d.data(),_id:d.id}));
    farmers.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    area.innerHTML=`
    <div class="sh"><span class="st2">📖 शेतकरी खाता</span></div>
    <div class="card">
      <div class="ch"><span class="ct2">कोणत्या शेतकऱ्याचे खाते पहायचे आहे?</span></div>
      ${farmers.length===0?`<div class="empty"><i class="fas fa-user-slash"></i><p>अजून कोणताही शेतकरी नाही<br><button class="btn bp bsm" style="margin-top:8px" onclick="window.nav('shetkari')">+ शेतकरी जोडा</button></p></div>`:
      `<div class="sw" style="margin-bottom:12px"><i class="fas fa-search"></i><input class="fc" id="khPickS" placeholder="नाव शोधा..." oninput="window.khFilterPicker(this.value)"/></div>
      <div id="khPickList" style="display:flex;flex-direction:column;gap:6px">
        ${farmers.map(f=>`<div class="pi" style="cursor:pointer" onclick="window.openKhataByName('${f.name.replace(/'/g,"\\'")}')">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--brand-l);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-weight:800;font-size:.82rem;color:var(--brand);flex-shrink:0">${(f.name||'?').charAt(0).toUpperCase()}</div>
          <div style="flex:1"><div style="font-weight:700;font-size:.84rem">${f.name}</div>${f.village?`<div style="font-size:.66rem;color:var(--tx3)">📍 ${f.village}</div>`:''}</div>
          <i class="fas fa-chevron-right" style="color:var(--tx3);font-size:.78rem"></i>
        </div>`).join('')}
      </div>`}
    </div>`;
    window._khPickAll=farmers;
  }catch(e){area.innerHTML=`<div class="card"><p style="color:var(--red)">⚠️ ${friendlyErr(e)}</p></div>`;}
}
window.khFilterPicker=function(v){
  const all=window._khPickAll||[];
  const fil=v?all.filter(f=>(f.name||'').toLowerCase().includes(v.toLowerCase())):all;
  document.getElementById('khPickList').innerHTML=fil.map(f=>`<div class="pi" style="cursor:pointer" onclick="window.openKhataByName('${f.name.replace(/'/g,"\\'")}')">
    <div style="width:32px;height:32px;border-radius:50%;background:var(--brand-l);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-weight:800;font-size:.82rem;color:var(--brand);flex-shrink:0">${(f.name||'?').charAt(0).toUpperCase()}</div>
    <div style="flex:1"><div style="font-weight:700;font-size:.84rem">${f.name}</div>${f.village?`<div style="font-size:.66rem;color:var(--tx3)">📍 ${f.village}</div>`:''}</div>
    <i class="fas fa-chevron-right" style="color:var(--tx3);font-size:.78rem"></i>
  </div>`).join('')||`<div class="empty"><p>सापडले नाही</p></div>`;
};

async function renderKhata(area,name){
  area.innerHTML='<div class="spin"></div>';
  try{
    const[wS,sS,ad1]=await Promise.all([getDocs(uq('works')),getDocs(uq('shetkari')),adBannerHTML('khata-top')]);
    let works=[],farmer=null;
    wS.forEach(d=>{const w=d.data();if(w.customerName===name)works.push({...w,_id:d.id});});
    sS.forEach(d=>{if(d.data().name===name)farmer={...d.data(),_id:d.id};});
    works.sort((a,b)=>(b.date||'')>(a.date||'')?1:-1);

    const totBiz=works.reduce((s,w)=>s+(w.total||0),0);
    const totPaid=works.reduce((s,w)=>s+paidOf(w),0);
    const totDue=totBiz-totPaid;
    const mobile=farmer?.mobile||works.find(w=>w.mobile)?.mobile||'';
    const unpaidWorks=works.filter(w=>balOf(w)>0.01);

    area.innerHTML=`
    <div class="sh"><span class="st2">👤 ${name}</span><button class="btn bg2 bsm" onclick="window.nav('shetkari')"><i class="fas fa-arrow-left"></i> मागे</button></div>
    ${ad1}
    <div class="kh-hero">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
        <div class="kh-av">${name.charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight:800;font-size:1.05rem">${name}</div>
          <div style="font-size:.74rem;opacity:.8">${mobile?'📞 '+mobile:'मोबाइल नाही'}${farmer?.village?' · 📍 '+farmer.village:''}</div>
        </div>
      </div>
      <div class="kh-sg">
        <div class="kh-sc"><b>₹${fmt(totBiz)}</b><span>एकूण काम</span></div>
        <div class="kh-sc"><b style="color:#bbf7d0">₹${fmt(totPaid)}</b><span>जमा</span></div>
        <div class="kh-sc"><b style="color:${totDue>0.01?'#fde68a':'#bbf7d0'}">₹${fmt(totDue)}</b><span>बाकी</span></div>
      </div>
    </div>

    <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px">
      ${totDue>0.01?`<button class="btn bp" onclick="window.khOpenQuickPay()"><i class="fas fa-rupee-sign"></i> पेमेंट जमा करा</button>`:''}
      <button class="btn bg2" onclick="window.khOpenMore()"><i class="fas fa-ellipsis-h"></i> अधिक</button>
    </div>

    <div class="card">
      <div class="ch"><span class="ct2">📋 सर्व काम (${works.length})</span></div>
      ${works.length===0?`<div class="empty"><i class="fas fa-tractor"></i><p>अजून कोणतेही काम नाही</p></div>`:
      works.map(w=>{const b=balOf(w);return`<div class="kh-wrow">
        <div class="kh-wic"><i class="fas fa-tractor"></i></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.84rem">${w.workType}</div>
          <div style="font-size:.68rem;color:var(--tx3)">${fmtD(w.date)} · ${w.quantity} ${w.unit}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800;font-size:.85rem">₹${fmt(w.total)}</div>
          <div style="font-size:.66rem;color:${b>0.01?'var(--amber-d)':'var(--g600)'}">${b>0.01?'₹'+fmt(b)+' बाकी':'✅ पूर्ण'}</div>
        </div>
        <div style="display:flex;gap:3px;margin-left:6px">
          <button class="btn ba bic bxs" onclick="window.openPayMo('${w._id}')" title="Payment"><i class="fas fa-rupee-sign"></i></button>
          <button class="btn bg2 bic bxs" onclick="window.openInv('${w._id}')" title="Invoice"><i class="fas fa-file-invoice"></i></button>
        </div>
      </div>`;}).join('')}
    </div>

    <!-- "अधिक" (More) - kam-frequency actions (call, WhatsApp reminder, invoice-range) ek
         chhote sheet me - taaki upar ka action row saaf/simple rahe -->
    <div class="mo h" id="khMoreM">
      <div class="md">
        <div class="mh"><span class="mt">अधिक पर्याय</span><button class="mx" onclick="closeM('khMoreM')"><i class="fas fa-times"></i></button></div>
        <div class="mb" style="display:flex;flex-direction:column;gap:8px">
          ${mobile?`<a href="tel:${mobile}" class="btn bcl" style="justify-content:flex-start"><i class="fas fa-phone"></i> कॉल करा</a>`:''}
          ${mobile&&totDue>0.01?`<a href="https://wa.me/${waNum(mobile)}?text=${encodeURIComponent(`🙏 नमस्कार ${name} जी,\n\n🚜 ${gProf().businessName||'TractorWala'} – खाते स्मरणपत्र\n\n💰 एकूण काम: ₹${fmt(totBiz)}\n✅ जमा: ₹${fmt(totPaid)}\n⚠️ बाकी: ₹${fmt(totDue)}\n\nकृपया लवकरात लवकर पेमेंट करावे. 🙏\n— ${gProf().businessName||'TractorWala'}`)}" target="_blank" class="btn bwa" style="justify-content:flex-start"><i class="fab fa-whatsapp"></i> स्मरण पाठवा (WhatsApp)</a>`:''}
          ${totDue>0.01?`<button class="btn ba" style="justify-content:flex-start" onclick="closeM('khMoreM');window.khSwitchToSpecificPay()"><i class="fas fa-list"></i> ठराविक कामासाठी पेमेंट करा</button>`:''}
          <button class="btn bg2" style="justify-content:flex-start" onclick="closeM('khMoreM');window.khOpenInvoiceRange()"><i class="fas fa-file-invoice"></i> कालावधीचे Invoice बनवा</button>
        </div>
      </div>
    </div>

    <!-- Payment modal: ek-saath kisi bhi ek pending kaam pe payment add karne ke liye
         (specific-work list) - "अधिक" sheet se ya Quick Pay ke link se khulta hai -->
    <div class="mo h" id="khPayAllM">
      <div class="md">
        <div class="mh"><span class="mt">पेमेंट जमा करा</span><button class="mx" onclick="closeM('khPayAllM')"><i class="fas fa-times"></i></button></div>
        <div class="mb" id="khPayAllBody"></div>
      </div>
    </div>

    <!-- Quick direct-amount payment (PRIMARY payment flow ata): seedha rakkam टाकून जमा —
         कुठल्या specific कामासाठी ते निवडायची गरज नाही, सिस्टम आपोआप सर्वात जुन्या बाकी
         कामापासून वापरते (FIFO). ठराविक कामासाठी हवं असल्यास खालचा link वापरा. -->
    <div class="mo h" id="khQuickPayM">
      <div class="md">
        <div class="mh"><span class="mt">💰 पेमेंट जमा करा</span><button class="mx" onclick="closeM('khQuickPayM')"><i class="fas fa-times"></i></button></div>
        <div class="mb">
          <p style="font-size:.78rem;color:var(--tx2);margin-bottom:12px">रक्कम टाका — ती आपोआप सर्वात जुन्या बाकी कामापासून सुरुवात करून जमा केली जाईल. एकूण बाकी: <b>₹${fmt(totDue)}</b></p>
          <div class="fr2">
            <div class="fg"><label class="fl">रक्कम (₹) *</label><input class="fc" type="number" id="khQpAmt" placeholder="₹" max="${totDue}"/></div>
            <div class="fg"><label class="fl">तारीख</label><input class="fc" type="date" id="khQpDt" value="${today()}"/></div>
          </div>
          <div class="fg"><label class="fl">नोट</label><input class="fc" id="khQpNt" placeholder="वैकल्पिक"/></div>
          <div style="text-align:center;margin-top:4px">
            <span style="font-size:.74rem;color:var(--g600);text-decoration:underline;cursor:pointer" onclick="window.khSwitchToSpecificPay()">किंवा ठराविक कामासाठी पेमेंट करा →</span>
          </div>
        </div>
        <div class="mf">
          <button class="btn bg2" onclick="closeM('khQuickPayM')">रद्द</button>
          <button class="btn bp" id="khQpBtn" onclick="window.khSubmitQuickPay()"><i class="fas fa-check"></i> जमा करा</button>
        </div>
      </div>
    </div>

    <!-- Date-range consolidated invoice modal -->
    <div class="mo h" id="khInvRangeM">
      <div class="md">
        <div class="mh"><span class="mt">कालावधीचे Invoice</span><button class="mx" onclick="closeM('khInvRangeM')"><i class="fas fa-times"></i></button></div>
        <div class="mb">
          <div class="fg"><label class="fl">सुरुवात तारीख</label><input class="fc" type="date" id="khInvSt"/></div>
          <div class="fg"><label class="fl">शेवट तारीख</label><input class="fc" type="date" id="khInvEn" value="${today()}"/></div>
        </div>
        <div class="mf">
          <button class="btn bg2" onclick="closeM('khInvRangeM')">रद्द</button>
          <button class="btn bp" onclick="window.khGenerateRangeInvoice()"><i class="fas fa-file-invoice"></i> Invoice बनवा</button>
        </div>
      </div>
    </div>`;

    window._khataWorks=works;
    window._khataUnpaid=unpaidWorks;
  }catch(e){
    area.innerHTML=`<div class="card"><p style="color:var(--red)">⚠️ ${friendlyErr(e)}</p></div>`;
  }
}

// Naam se Khata page kholne ka entry point — sab page (work-list, payments, shetkari, dashboard) yahi use karte hain
window.openKhataByName=function(name){
  window._khataName=name;
  setKhFarmerName(name);
  window.nav('khata');
};

// "अधिक" sheet khol do - call/WhatsApp/invoice-range yahan hain (kam-frequency actions)
window.khOpenMore=function(){
  document.getElementById('khMoreM').classList.remove('h');
};

// Quick-Pay se "ठराविक कामासाठी" link दाबल्यावर - quick-pay band karke specific-work list khol do
window.khSwitchToSpecificPay=function(){
  window.closeM('khQuickPayM');
  window.khOpenPayAll();
};

// "पेमेंट जमा करा" — agar farmer ka ek hi pending kaam hai to seedha uska payment modal khol do,
// zyada hone par list dikhao jisse se choose kar sake.
window.khOpenPayAll=function(){
  const unpaid=window._khataUnpaid||[];
  const mo=document.getElementById('khPayAllM');
  const body=document.getElementById('khPayAllBody');
  if(unpaid.length===0){toast('कोणतेही बाकी काम नाही','warn');return;}
  if(unpaid.length===1){
    window.closeM('khPayAllM');
    window.openPayMo(unpaid[0]._id);
    return;
  }
  mo.classList.remove('h');
  body.innerHTML=`<p style="font-size:.8rem;color:var(--tx2);margin-bottom:10px">कोणत्या कामासाठी पेमेंट जमा करायचे आहे ते निवडा:</p>
  <div style="display:flex;flex-direction:column;gap:7px">
    ${unpaid.map(w=>`<div class="pi" style="cursor:pointer" onclick="window.closeM('khPayAllM');window.openPayMo('${w._id}')">
      <div style="flex:1"><div style="font-weight:700;font-size:.82rem">${w.workType}</div><div style="font-size:.66rem;color:var(--tx3)">${fmtD(w.date)}</div></div>
      <span class="pa">₹${fmt(balOf(w))}</span>
    </div>`).join('')}
  </div>`;
};

// "थेट रक्कम जमा करा" modal khol do — koi specific kaam choose karne ki zaroorat nahi
window.khOpenQuickPay=function(){
  document.getElementById('khQpAmt').value='';
  document.getElementById('khQpNt').value='';
  document.getElementById('khQuickPayM').classList.remove('h');
};

// Ek hi rakkam le kar farmer ke sab pending kaam me FIFO (sabse purane pehle) tarike se
// baant deta hai - jaise ek asli khata book me hota hai. Har kaam ka payments[] array
// update hota hai, isliye baaki poora app (reports, invoice, balance) automatically
// sahi dikhta hai - koi naya data-model banane ki zaroorat nahi padi.
window.khSubmitQuickPay=async function(){
  if(!lock('khQuickPay'))return;
  const btn=document.getElementById('khQpBtn');
  if(btn)btn.disabled=true;
  try{
    const amtInput=parseFloat(document.getElementById('khQpAmt')?.value)||0;
    if(amtInput<=0){toast('रक्कम आवश्यक','err');return;}
    const date=document.getElementById('khQpDt')?.value||today();
    const note=document.getElementById('khQpNt')?.value||'';
    const name=window._khataName;

    // Taaza data mangwao - taaki kisi doosre tab/device se abhi-abhi hui payment miss na ho
    invalidateCache('works'); // FIFO allocation ke liye guaranteed-fresh data chahiye, cache se nahi
    const snap=await getDocs(uq('works'));
    let works=[];
    snap.forEach(d=>{const w=d.data();if(w.customerName===name)works.push({...w,_id:d.id});});
    works=works.filter(w=>balOf(w)>0.01);
    works.sort((a,b)=>(a.date||'')>(b.date||'')?1:-1); // sabse jauna kaam pehle (FIFO)

    if(works.length===0){toast('कोणतेही बाकी काम नाही','warn');return;}

    const totalDue=works.reduce((s,w)=>s+balOf(w),0);
    let remaining=amtInput;
    if(remaining>totalDue+0.01){
      toast(`जास्तीत जास्त ₹${fmt(totalDue)} (एकूण बाकी) जमा करता येईल`,'warn');
      remaining=totalDue;
    }

    for(const w of works){
      if(remaining<=0.01)break;
      const bal=balOf(w);
      const alloc=Math.min(bal,remaining);
      const px={amount:alloc,date,note:note||'थेट जमा (खाते)'};
      const newPayments=[...(w.payments||[]),px];
      await updateDoc(doc(db,'works',w._id),{payments:newPayments,updatedAt:today()});
      autoBackup('update','works',{...w,payments:newPayments});
      remaining-=alloc;
    }

    toast('✅ पेमेंट जमा झाले');
    window.closeM('khQuickPayM');
    window.updBadge();
    if(window._khataRefresh)window._khataRefresh();
  }catch(e){toast(friendlyErr(e),'err');}
  finally{unlock('khQuickPay');if(btn)btn.disabled=false;}
};

window.khOpenInvoiceRange=function(){
  document.getElementById('khInvRangeM').classList.remove('h');
};
window.khGenerateRangeInvoice=function(){
  const st=document.getElementById('khInvSt').value;
  const en=document.getElementById('khInvEn').value;
  if(!en){toast('शेवट तारीख निवडा','err');return;}
  window.closeM('khInvRangeM');
  // invoice.js ka consolidated-invoice entry point — farmer naam + date range pass karte hain
  window.openConsolidatedInvoice(window._khataName,st||'',en);
};
