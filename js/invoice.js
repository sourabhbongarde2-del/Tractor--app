// invoice.js — Invoice page: Naya flow - farmer-list dikhta hai (kaam-dropdown ke jagah),
// farmer click karo to unke unpaid kaam checkboxes ke saath dikhte hain, multi-select karke
// ek consolidated invoice ban jata hai (sirf jo kaam select kiye unka). Single-work direct
// invoice bhi available hai Work List/Dashboard se "Invoice" button dabane par.
// PDF/Image download aur WhatsApp-ready flow (PDF auto-downloads + WA number+message
// pre-filled; browsers don't allow auto-attaching files to WhatsApp - file manually
// attach karni padti hai jo already download ho chuki hoti hai).
import{getDocs,uq,fmt,fmtD,balOf,paidOf,waNum,today,toast,gProf,friendlyErr,adBannerHTML,ensureQRCode,ensurePdfLibs}from'./core.js';
import{invWID,setInvWID}from'./core.js';

let _selectedWorkIds=new Set();

export async function pgInv(area){
  const ad1=await adBannerHTML('invoice-top');

  // Agar kisi specific kaam ka seedha invoice chahiye (Work List/Dashboard se "Invoice"
  // button dabaya), to woh single-work view dikhana hai farmer-list ke jagah.
  if(invWID){
    area.innerHTML=`<div class="sh"><span class="st2">🧾 Invoice</span></div>${ad1}<div id="invArea"><div class="spin"></div></div>`;
    await buildSingleInv(invWID);
    setInvWID(null);
    return;
  }

  const snap=await getDocs(uq('works'));
  let works=[];snap.forEach(d=>works.push({...d.data(),_id:d.id}));

  // Farmer-wise group banao taaki list me dikha sakein kis farmer ka kitna baki hai
  const grp={};
  works.forEach(w=>{
    const k=w.customerName||'—';
    if(!grp[k])grp[k]={name:k,mobile:w.mobile||'',totalWorks:0,totalBiz:0,totalPaid:0,unpaidCount:0};
    grp[k].totalWorks++;grp[k].totalBiz+=(w.total||0);grp[k].totalPaid+=paidOf(w);
    if(!grp[k].mobile&&w.mobile)grp[k].mobile=w.mobile;
    if(balOf(w)>0.01)grp[k].unpaidCount++;
  });
  const farmers=Object.values(grp).sort((a,b)=>(b.totalBiz-b.totalPaid)-(a.totalBiz-a.totalPaid));

  area.innerHTML=`
  <div class="sh"><span class="st2">🧾 Invoice बनवा</span></div>
  ${ad1}
  <div class="card" style="margin-bottom:11px">
    <div class="sw"><i class="fas fa-search"></i><input class="fc" id="invFarmerS" placeholder="शेतकरी शोधा..." oninput="window.invFilterFarmers(this.value)"/></div>
  </div>
  <div id="invFarmerList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px"></div>
  <div id="invArea"></div>`;

  window._invFarmers=farmers;
  renderFarmerList(farmers);
}

function renderFarmerList(farmers){
  const list=document.getElementById('invFarmerList');
  if(!list)return;
  if(farmers.length===0){
    list.innerHTML=`<div class="empty"><i class="fas fa-tractor"></i><p>अजून कोणतेही काम नाही</p></div>`;
    return;
  }
  list.innerHTML=farmers.map(f=>{
    const due=f.totalBiz-f.totalPaid;
    return`<div class="pi" style="cursor:pointer;padding:11px" onclick="window.invOpenFarmer('${f.name.replace(/'/g,"\\'")}')">
      <div style="width:34px;height:34px;border-radius:50%;background:var(--brand-l);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-weight:800;font-size:.85rem;color:var(--brand);flex-shrink:0">${f.name.charAt(0).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.86rem">${f.name}</div>
        <div style="font-size:.68rem;color:var(--tx3)">${f.totalWorks} काम${f.mobile?' · 📞 '+f.mobile:''}</div>
      </div>
      <div style="text-align:right">
        ${due>0.01?`<span class="bx bxa">${f.unpaidCount} काम बाकी</span><div style="font-weight:800;font-size:.85rem;color:var(--amber-d);margin-top:2px">₹${fmt(due)}</div>`:`<span class="bx bxg">✅ पूर्ण</span>`}
      </div>
      <i class="fas fa-chevron-right" style="color:var(--tx3);font-size:.75rem;flex-shrink:0"></i>
    </div>`;
  }).join('');
}
window.invFilterFarmers=function(v){
  const all=window._invFarmers||[];
  const fil=v?all.filter(f=>f.name.toLowerCase().includes(v.toLowerCase())):all;
  renderFarmerList(fil);
};

// ---- Farmer pe click karne ke baad: unke sirf UNPAID kaam checkbox-list me dikhao ----
window.invOpenFarmer=async function(name){
  const area=document.getElementById('invArea');
  document.getElementById('invFarmerList').style.display='none';
  document.querySelector('.sw')?.parentElement?.classList.add('h');
  area.innerHTML='<div class="spin"></div>';
  _selectedWorkIds=new Set();
  try{
    const snap=await getDocs(uq('works'));
    let works=[];
    snap.forEach(d=>{const w=d.data();if(w.customerName===name)works.push({...w,_id:d.id});});
    const unpaid=works.filter(w=>balOf(w)>0.01).sort((a,b)=>(b.date||'')>(a.date||'')?1:-1);
    const mobile=works.find(w=>w.mobile)?.mobile||'';

    if(unpaid.length===0){
      area.innerHTML=`<div class="card"><div class="empty"><i class="fas fa-check-circle" style="color:var(--g500)"></i><p><b>${name}</b> चे सर्व पेमेंट पूर्ण आहे! 🎉<br>Invoice बनवण्यासाठी बाकी काम नाही.</p></div>
      <button class="btn bg2 bfw" style="margin-top:10px" onclick="window.invBackToList()"><i class="fas fa-arrow-left"></i> शेतकरी यादीवर परत</button></div>`;
      return;
    }

    // Sab unpaid kaam by-default select kiye hue dikhao (sabse common case: sara baki ek invoice me)
    unpaid.forEach(w=>_selectedWorkIds.add(w._id));
    window._invFarmerWorks=unpaid;
    window._invFarmerName=name;
    window._invFarmerMobile=mobile;
    renderFarmerWorkPicker();
  }catch(e){area.innerHTML=`<div class="card"><p style="color:var(--red)">${friendlyErr(e)}</p></div>`;}
};
window.invBackToList=function(){
  document.getElementById('invFarmerList').style.display='';
  document.querySelector('#invFarmerS')?.parentElement?.classList.remove('h');
  document.getElementById('invArea').innerHTML='';
};

function renderFarmerWorkPicker(){
  const area=document.getElementById('invArea');
  const works=window._invFarmerWorks||[];
  const name=window._invFarmerName;
  const selTotal=works.filter(w=>_selectedWorkIds.has(w._id)).reduce((s,w)=>s+balOf(w),0);
  area.innerHTML=`
  <div class="card" style="margin-bottom:11px">
    <div class="sh" style="margin-bottom:10px">
      <span class="st2">👤 ${name}</span>
      <button class="btn bg2 bsm" onclick="window.invBackToList()"><i class="fas fa-arrow-left"></i> मागे</button>
    </div>
    <p style="font-size:.78rem;color:var(--tx2);margin-bottom:10px">ज्या कामांचे Invoice बनवायचे आहे ते निवडा (सर्व बाकी काम आधीच निवडलेले आहेत):</p>
    <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px">
      ${works.map(w=>{const b=balOf(w);const checked=_selectedWorkIds.has(w._id);
        return`<label class="pi" style="cursor:pointer;align-items:flex-start">
          <input type="checkbox" ${checked?'checked':''} onchange="window.invToggleWork('${w._id}')" style="margin-top:3px;width:16px;height:16px;flex-shrink:0"/>
          <div style="flex:1">
            <div style="font-weight:700;font-size:.84rem">${w.workType}</div>
            <div style="font-size:.68rem;color:var(--tx3)">${fmtD(w.date)} · ${w.quantity} ${w.unit}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:.7rem;color:var(--tx3)">₹${fmt(w.total)}</div>
            <div style="font-weight:800;font-size:.82rem;color:var(--amber-d)">₹${fmt(b)} बाकी</div>
          </div>
        </label>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--surf2);border-radius:var(--r8);padding:10px 13px;margin-bottom:12px">
      <span style="font-size:.8rem;font-weight:700">निवडलेली रक्कम</span>
      <span style="font-family:var(--fd);font-size:1.1rem;font-weight:800;color:var(--amber-d)" id="invSelTotal">₹${fmt(selTotal)}</span>
    </div>
    <button class="btn bp bfw" id="invGenBtn" onclick="window.buildConsolidatedFromSelection()" ${_selectedWorkIds.size===0?'disabled':''}>
      <i class="fas fa-file-invoice"></i> Invoice बनवा (${_selectedWorkIds.size} काम)
    </button>
  </div>
  <div id="invDocArea"></div>`;
}
window.invToggleWork=function(wid){
  if(_selectedWorkIds.has(wid))_selectedWorkIds.delete(wid);
  else _selectedWorkIds.add(wid);
  const works=window._invFarmerWorks||[];
  const selTotal=works.filter(w=>_selectedWorkIds.has(w._id)).reduce((s,w)=>s+balOf(w),0);
  document.getElementById('invSelTotal').textContent='₹'+fmt(selTotal);
  const btn=document.getElementById('invGenBtn');
  if(btn){btn.disabled=_selectedWorkIds.size===0;btn.innerHTML=`<i class="fas fa-file-invoice"></i> Invoice बनवा (${_selectedWorkIds.size} काम)`;}
};

function invHeaderHTML(pr,tag,invNo,dateLabel,periodLabel){
  return`<div class="inv-top">
    <div class="inv-brand">
      <div class="inv-lg"><img src="assets/logo/logo.svg" alt="logo" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas fa-tractor\\'></i>'"/></div>
      <div>
        <div class="inv-bn">${pr.businessName||'TractorWala'}</div>
        ${pr.ownerName?`<div class="inv-bn-sub">${pr.ownerName}${pr.phone?' · 📞 '+pr.phone:''}</div>`:''}
      </div>
    </div>
    <div class="inv-meta">
      <span class="inv-tag">${tag}</span>
      <div class="inv-no">#${invNo}</div>
      <div class="inv-dt">📅 ${dateLabel}</div>
      ${periodLabel?`<div class="inv-period">${periodLabel}</div>`:''}
    </div>
  </div>`;
}
function invFooterHTML(pr){
  // Developer credit — har invoice (text/image/PDF teeno) me hamesha present, jaisa maanga gaya
  return`<div class="inv-foot">
    <div class="biz">${pr.phone?'📞 '+pr.phone+' · ':''}${pr.businessName||'TractorWala'}</div>
    <div class="inv-credit">Developed by <b>Sourabh Bongarde</b> · Bongarde Software Solutions Pvt. Ltd. · sourabhbongarde2@gmail.com · 7875817356</div>
  </div>`;
}

// ---- Consolidated invoice from selected checkboxes ----
window.buildConsolidatedFromSelection=function(){
  const allWorks=window._invFarmerWorks||[];
  const works=allWorks.filter(w=>_selectedWorkIds.has(w._id)).sort((a,b)=>(a.date||'')>(b.date||'')?1:-1);
  if(works.length===0)return;
  const name=window._invFarmerName,mobile=window._invFarmerMobile;
  const pr=gProf();
  const totBiz=works.reduce((s,w)=>s+(w.total||0),0);
  const totPaidOnSelected=works.reduce((s,w)=>s+paidOf(w),0);
  const totDue=works.reduce((s,w)=>s+balOf(w),0);
  const invNo='TW'+Date.now().toString().slice(-6);
  const dates=works.map(w=>w.date).filter(Boolean).sort();
  const periodLabel=dates.length?`${fmtD(dates[0])} — ${fmtD(dates[dates.length-1])}`:'';
  const upiStr=pr.upiId?`upi://pay?pa=${encodeURIComponent(pr.upiId)}&pn=${encodeURIComponent(pr.businessName||'TractorWala')}&am=${totDue}&cu=INR`:'';

  const docArea=document.getElementById('invDocArea');
  docArea.innerHTML=`
  <div class="card" style="margin-bottom:11px;max-width:680px">
    <div style="font-size:.78rem;font-weight:700;color:var(--tx2);margin-bottom:9px;text-transform:uppercase;letter-spacing:.5px">Invoice पाठवा</div>
    <div style="display:flex;gap:7px;flex-wrap:wrap">
      <button class="btn ba bsm" onclick="window.shareInvPDFWA()"><i class="fab fa-whatsapp"></i> WhatsApp वर पाठवा</button>
      <button class="btn bp bsm" onclick="window.dlInvPDF()"><i class="fas fa-file-pdf"></i> PDF Download</button>
      <button class="btn bg2 bsm" onclick="window.dlInvImg()"><i class="fas fa-image"></i> Image Download</button>
    </div>
  </div>
  <div class="inv" id="invDoc">
    ${invHeaderHTML(pr,works.length>1?'STATEMENT':'INVOICE',invNo,fmtD(today()),periodLabel?'📆 कालावधी: '+periodLabel:'')}
    <div class="inv-body">
      <div class="inv-bd">
        <div class="inv-box">
          <div class="inv-lbl">शेतकरी</div>
          <div class="inv-val">${name}</div>
          ${mobile?`<div class="inv-sub">📞 ${mobile}</div>`:''}
        </div>
        <div class="inv-box">
          <div class="inv-lbl">निवडलेले काम</div>
          <div class="inv-val">${works.length} नोंदी</div>
          ${periodLabel?`<div class="inv-sub">कालावधी: ${periodLabel}</div>`:''}
        </div>
      </div>
      <table class="inv-tbl">
        <thead><tr><th>#</th><th>तारीख</th><th>काम</th><th>प्रमाण</th><th class="r">एकूण ₹</th><th class="r">बाकी ₹</th></tr></thead>
        <tbody>${works.map((w,i)=>{const b=balOf(w);return`<tr>
          <td>${i+1}</td><td>${fmtD(w.date)}</td><td>${w.workType}</td><td>${w.quantity} ${w.unit}</td>
          <td class="r"><b>₹${fmt(w.total)}</b></td><td class="r">₹${fmt(b)}</td>
        </tr>`;}).join('')}</tbody>
      </table>
      <div class="inv-sm">
        <div class="inv-sr"><span>निवडलेल्या कामांची एकूण रक्कम (${works.length})</span><span>₹${fmt(totBiz)}</span></div>
        ${totPaidOnSelected>0?`<div class="inv-sr paid"><span>✅ यापूर्वी भरले</span><span>₹${fmt(totPaidOnSelected)}</span></div>`:''}
        <div class="inv-sr big" style="color:#dc2626"><span>⚠️ बाकी रक्कम</span><span>₹${fmt(totDue)}</span></div>
      </div>
      ${upiStr?`<div class="inv-pay">
        <div class="inv-pay-qr" id="invQR"></div>
        <div class="inv-pay-txt"><b>UPI ने पेमेंट करा:</b><br>${pr.upiId}<br><b style="color:#166534">रक्कम: ₹${fmt(totDue)}</b></div>
      </div>`:''}
      <div class="inv-thanks"><p>🙏 ${pr.businessName||'TractorWala'} मध्ये आपले स्वागत! पुन्हा या.</p></div>
    </div>
    ${invFooterHTML(pr)}
  </div>`;

  if(upiStr){
    ensureQRCode().then(()=>{
      setTimeout(()=>{
        const qrEl=document.getElementById('invQR');if(!qrEl)return;
        if(typeof QRCode==='undefined'){console.error('QRCode library not loaded');return;}
        try{new QRCode(qrEl,{text:upiStr,width:80,height:80,colorDark:'#166534',colorLight:'#fff'});}
        catch(err){console.error('QR generation failed:',err);}
      },150);
    }).catch(()=>{/* QR load fail ho jaye to bhi invoice bina QR ke dikh jaayega */});
  }
  window._iW={customerName:name,mobile,workType:`${works.length} काम${periodLabel?' ('+periodLabel+')':''}`,quantity:'',unit:'',rate:'',total:totBiz,date:today(),notes:''};
  window._iB=totDue;window._iP=totPaidOnSelected;
  docArea.scrollIntoView({behavior:'smooth',block:'start'});
};

// ---- Single-work direct invoice (Work List/Dashboard "Invoice" button se) ----
async function buildSingleInv(wid){
  const area=document.getElementById('invArea');
  area.innerHTML='<div class="spin"></div>';
  try{
    const snap=await getDocs(uq('works'));
    let w=null;snap.forEach(d=>{if(d.id===wid)w={...d.data(),_id:d.id};});
    if(!w){area.innerHTML=`<div class="empty"><p>काम सापडले नाही</p></div>`;return;}
    const pr=gProf();
    const paid=paidOf(w),bal=balOf(w);
    const invNo='TW'+Date.now().toString().slice(-6);
    const upiStr=pr.upiId?`upi://pay?pa=${encodeURIComponent(pr.upiId)}&pn=${encodeURIComponent(pr.businessName||'TractorWala')}&am=${bal}&cu=INR`:'';

    area.innerHTML=`
    <div class="card" style="margin-bottom:11px;max-width:680px">
      <div style="font-size:.78rem;font-weight:700;color:var(--tx2);margin-bottom:9px;text-transform:uppercase;letter-spacing:.5px">Invoice पाठवा</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn ba bsm" onclick="window.shareInvPDFWA()"><i class="fab fa-whatsapp"></i> WhatsApp वर पाठवा</button>
        <button class="btn bp bsm" onclick="window.dlInvPDF()"><i class="fas fa-file-pdf"></i> PDF Download</button>
        <button class="btn bg2 bsm" onclick="window.dlInvImg()"><i class="fas fa-image"></i> Image Download</button>
        <button class="btn bg2 bsm" onclick="window.shareInvWA()"><i class="fab fa-whatsapp"></i> सिर्फ Text</button>
      </div>
    </div>
    <div class="inv" id="invDoc">
      ${invHeaderHTML(pr,'INVOICE',invNo,fmtD(w.date),'')}
      <div class="inv-body">
        <div class="inv-bd">
          <div class="inv-box">
            <div class="inv-lbl">ग्राहक</div>
            <div class="inv-val">${w.customerName}</div>
            ${w.mobile?`<div class="inv-sub">📞 ${w.mobile}</div>`:''}
          </div>
          <div class="inv-box">
            <div class="inv-lbl">काम तपशील</div>
            <div class="inv-val">${w.workType}</div>
            <div class="inv-sub">${w.quantity} ${w.unit} × ₹${fmt(w.rate)}</div>
          </div>
        </div>
        <table class="inv-tbl">
          <thead><tr><th>#</th><th>काम</th><th>युनिट</th><th>प्रमाण</th><th class="r">दर ₹</th><th class="r">एकूण ₹</th></tr></thead>
          <tbody><tr><td>1</td><td>${w.workType}</td><td>${w.unit}</td><td>${w.quantity}</td><td class="r">₹${fmt(w.rate)}</td><td class="r"><b>₹${fmt(w.total)}</b></td></tr></tbody>
        </table>
        <div class="inv-sm">
          <div class="inv-sr"><span>उपएकूण</span><span>₹${fmt(w.total)}</span></div>
          ${paid>0?`<div class="inv-sr paid"><span>✅ भरले</span><span>₹${fmt(paid)}</span></div>`:''}
          <div class="inv-sr big" style="color:${bal>0?'#dc2626':'#166534'}"><span>${bal>0?'⚠️ बाकी':'✅ पूर्ण'}</span><span>₹${fmt(bal)}</span></div>
        </div>
        ${upiStr?`<div class="inv-pay">
          <div class="inv-pay-qr" id="invQR"></div>
          <div class="inv-pay-txt"><b>UPI ने पेमेंट करा:</b><br>${pr.upiId}<br><b style="color:#166534">रक्कम: ₹${fmt(bal)}</b></div>
        </div>`:''}
        ${w.notes?`<div class="inv-note"><b>📝 नोट:</b> ${w.notes}</div>`:''}
        <div class="inv-thanks"><p>🙏 ${pr.businessName||'TractorWala'} मध्ये आपले स्वागत! पुन्हा या.</p></div>
      </div>
      ${invFooterHTML(pr)}
    </div>`;

    if(upiStr){
      ensureQRCode().then(()=>{
        setTimeout(()=>{
          const qrEl=document.getElementById('invQR');if(!qrEl)return;
          if(typeof QRCode==='undefined'){console.error('QRCode library not loaded');return;}
          try{new QRCode(qrEl,{text:upiStr,width:80,height:80,colorDark:'#166534',colorLight:'#fff'});}
          catch(err){console.error('QR generation failed:',err);}
        },150);
      }).catch(()=>{/* QR load fail ho jaye to bhi invoice bina QR ke dikh jaayega */});
    }
    window._iW=w;window._iB=bal;window._iP=paid;
  }catch(e){area.innerHTML=`<div class="card"><p style="color:var(--red)">${friendlyErr(e)}</p></div>`;}
}

window.shareInvWA=function(){
  const w=window._iW,pr=gProf(),b=window._iB,p=window._iP;if(!w)return;
  const msg=`🚜 *${pr.businessName||'TractorWala'} – Invoice*\n━━━━━━━━━━━━━\n👤 ग्राहक: *${w.customerName}*\n📞 ${w.mobile||'—'}\n\n📋 काम: ${w.workType}\n📐 ${w.quantity} ${w.unit} × ₹${fmt(w.rate)}\n━━━━━━━━━━━━━\n💰 एकूण: *₹${fmt(w.total)}*\n✅ भरले: ₹${fmt(p)}\n⚠️ बाकी: *₹${fmt(b)}*\n${pr.upiId?`\n💳 UPI: ${pr.upiId}`:''}${pr.phone?`\n📞 ${pr.phone}`:''}\n━━━━━━━━━━━━━\n📅 ${fmtD(w.date)}\n🙏 धन्यवाद! ${pr.businessName||'TractorWala'}\n\nDeveloped by Sourabh Bongarde · Bongarde Software Solutions Pvt. Ltd.`;
  window.open(`https://api.whatsapp.com/send?${w.mobile?'phone='+waNum(w.mobile)+'&':''}text=${encodeURIComponent(msg)}`,'_blank');
};
window.dlInvPDF=async function(){
  const el=document.getElementById('invDoc');if(!el){toast('Invoice आधी तयार करा','warn');return;}
  toast('PDF तयार होत आहे...','warn',2000);
  try{
    await ensurePdfLibs();
    const c=await html2canvas(el,{scale:2,backgroundColor:'#ffffff',useCORS:true,allowTaint:true,logging:false});
    const{jsPDF}=window.jspdf,pdf=new jsPDF('p','mm','a4');
    const pw=pdf.internal.pageSize.getWidth();
    pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,pw,pw*c.height/c.width);
    pdf.save(`Invoice_${(window._iW?.customerName||'TW').replace(/\s+/g,'_')}_${today()}.pdf`);
    toast('PDF डाउनलोड ✅');
    return true;
  }catch(e){toast('⚠️ PDF बनवताना अडचण आली. पुन्हा प्रयत्न करा.','err');return false;}
};
window.dlInvImg=async function(){
  const el=document.getElementById('invDoc');if(!el){toast('Invoice आधी तयार करा','warn');return;}
  try{
    await ensurePdfLibs();
    const c=await html2canvas(el,{scale:2,backgroundColor:'#ffffff',useCORS:true,allowTaint:true,logging:false});
    const a=document.createElement('a');a.href=c.toDataURL('image/png');
    a.download=`Invoice_${(window._iW?.customerName||'TW').replace(/\s+/g,'_')}_${today()}.png`;a.click();
    toast('Image डाउनलोड ✅');
  }catch(e){toast(friendlyErr(e),'err');}
};
// WhatsApp + PDF flow: PDF pehle download hoti hai, fir WhatsApp number+message ke saath khulta hai.
// Koi bhi browser/website seedha WhatsApp attachment me file daal nahi sakti (security restriction
// sabhi browsers me hai) - isliye PDF ek baar manually attach karni padegi jo already download ho chuki hogi.
window.shareInvPDFWA=async function(){
  const ok=await window.dlInvPDF();
  if(!ok)return;
  toast('PDF डाउनलोड झाली — आता WhatsApp उघडत आहे, कृपया डाउनलोड झालेली PDF manually attach करा 📎','warn',5000);
  setTimeout(()=>{
    const w=window._iW,pr=gProf(),b=window._iB;if(!w)return;
    const msg=`🚜 *${pr.businessName||'TractorWala'}* – Invoice\n👤 ${w.customerName} | ${w.workType}\n💰 ₹${fmt(w.total)} | बाकी ₹${fmt(b)}\n\n📎 कृपया सोबत पाठवलेली PDF attach करा (ती आता डाउनलोड झाली आहे)\n\n🙏 धन्यवाद! ${pr.businessName||'TractorWala'}`;
    window.open(`https://api.whatsapp.com/send?${w.mobile?'phone='+waNum(w.mobile)+'&':''}text=${encodeURIComponent(msg)}`,'_blank');
  },1500);
};

// ---- Date-range CONSOLIDATED invoice (Khata page se bhi call hota hai - poora khata, date-range select karke) ----
window.openConsolidatedInvoice=async function(farmerName,startDate,endDate){
  window._consolidatedReq={farmerName,startDate,endDate};
  window.nav('invoice');
  setTimeout(()=>buildConsolidatedFromKhata(),150);
};
async function buildConsolidatedFromKhata(){
  const req=window._consolidatedReq;if(!req)return;
  const farmerListEl=document.getElementById('invFarmerList');
  if(farmerListEl)farmerListEl.style.display='none';
  document.querySelector('#invFarmerS')?.parentElement?.classList.add('h');
  const invArea=document.getElementById('invArea');
  if(!invArea)return;
  invArea.innerHTML='<div class="spin"></div>';
  try{
    const snap=await getDocs(uq('works'));
    let works=[];
    snap.forEach(d=>{const w=d.data();if(w.customerName===req.farmerName)works.push({...w,_id:d.id});});
    if(req.startDate)works=works.filter(w=>w.date&&w.date>=req.startDate);
    if(req.endDate)works=works.filter(w=>w.date&&w.date<=req.endDate);
    works.sort((a,b)=>(a.date||'')>(b.date||'')?1:-1);

    if(works.length===0){
      invArea.innerHTML=`<div class="empty"><i class="fas fa-file-invoice"></i><p>या कालावधीत कोणतेही काम सापडले नाही</p></div>
      <button class="btn bg2" style="margin-top:10px" onclick="window.nav('khata')"><i class="fas fa-arrow-left"></i> खाता वर परत जा</button>`;
      return;
    }
    // Yahan saara kaam (paid+unpaid) dikhana hai kyunki Khata se "poore period ka statement" maanga gaya tha
    window._invFarmerWorks=works;
    _selectedWorkIds=new Set(works.map(w=>w._id));
    window._invFarmerName=req.farmerName;
    window._invFarmerMobile=works.find(w=>w.mobile)?.mobile||'';
    invArea.innerHTML=`<div id="invDocArea"></div>`;
    window.buildConsolidatedFromSelection();
    // Khata-flow ke upar ek "मागे" button bhi chahiye jo seedha khata pe le jaye
    const docArea=document.getElementById('invDocArea');
    const backBtn=document.createElement('div');
    backBtn.innerHTML=`<button class="btn bg2" style="margin-bottom:11px" onclick="window.nav('khata')"><i class="fas fa-arrow-left"></i> खाता वर परत</button>`;
    docArea.parentElement.insertBefore(backBtn,docArea);
  }catch(e){invArea.innerHTML=`<div class="card"><p style="color:var(--red)">${friendlyErr(e)}</p></div>`;}
}
