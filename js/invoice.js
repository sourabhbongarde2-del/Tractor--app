// invoice.js — Modern invoice design, single-work + date-range consolidated invoice,
// PDF/Image download, and WhatsApp-ready flow (PDF auto-downloads + WA opens with
// number+message pre-filled; browsers don't allow auto-attaching files to WhatsApp,
// so the file has to be attached manually once it's downloaded).
import{getDocs,uq,fmt,fmtD,balOf,paidOf,waNum,today,toast,gProf,friendlyErr,adBannerHTML}from'./core.js';
import{invWID,setInvWID}from'./core.js';

export async function pgInv(area){
  const[snap,ad1]=await Promise.all([getDocs(uq('works')),adBannerHTML('invoice-top')]);
  let works=[];snap.forEach(d=>works.push({...d.data(),_id:d.id}));
  works.sort((a,b)=>(b.date||'')>(a.date||'')?1:-1);

  area.innerHTML=`
  <div class="sh"><span class="st2">🧾 Invoice बनवा</span></div>
  ${ad1}
  <div class="card" style="margin-bottom:14px;max-width:640px">
    <div class="fg" style="margin:0">
      <label class="fl">काम निवडा</label>
      <select class="fc" id="invSel" onchange="window.buildInv()">
        <option value="">— काम निवडा —</option>
        ${works.map(w=>`<option value="${w._id}" ${invWID===w._id?'selected':''}>${w.customerName} | ${w.workType} | ₹${fmt(w.total)} | ${fmtD(w.date)}</option>`).join('')}
      </select>
    </div>
  </div>
  <div id="invArea"></div>`;
  if(invWID){setTimeout(()=>{document.getElementById('invSel').value=invWID;window.buildInv();setInvWID(null);},80);}
}

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

// ---- Single-work invoice ----
window.buildInv=async function(){
  const wid=document.getElementById('invSel')?.value;
  const area=document.getElementById('invArea');
  if(!area||!wid){if(area)area.innerHTML='';return;}
  area.innerHTML='<div class="spin"></div>';
  try{
    const snap=await getDocs(uq('works'));
    let w=null;snap.forEach(d=>{if(d.id===wid)w={...d.data(),_id:d.id};});
    if(!w){area.innerHTML='';return;}
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
      setTimeout(()=>{try{new QRCode(document.getElementById('invQR'),{text:upiStr,width:80,height:80,colorDark:'#166534',colorLight:'#fff'});}catch(_){}},100);
    }
    window._iW=w;window._iB=bal;window._iP=paid;
  }catch(e){area.innerHTML=`<div class="card"><p style="color:var(--red)">${friendlyErr(e)}</p></div>`;}
};

window.shareInvWA=function(){
  const w=window._iW,pr=gProf(),b=window._iB,p=window._iP;if(!w)return;
  const msg=`🚜 *${pr.businessName||'TractorWala'} – Invoice*\n━━━━━━━━━━━━━\n👤 ग्राहक: *${w.customerName}*\n📞 ${w.mobile||'—'}\n\n📋 काम: ${w.workType}\n📐 ${w.quantity} ${w.unit} × ₹${fmt(w.rate)}\n━━━━━━━━━━━━━\n💰 एकूण: *₹${fmt(w.total)}*\n✅ भरले: ₹${fmt(p)}\n⚠️ बाकी: *₹${fmt(b)}*\n${pr.upiId?`\n💳 UPI: ${pr.upiId}`:''}${pr.phone?`\n📞 ${pr.phone}`:''}\n━━━━━━━━━━━━━\n📅 ${fmtD(w.date)}\n🙏 धन्यवाद! ${pr.businessName||'TractorWala'}\n\nDeveloped by Sourabh Bongarde · Bongarde Software Solutions Pvt. Ltd.`;
  window.open(`https://api.whatsapp.com/send?${w.mobile?'phone='+waNum(w.mobile)+'&':''}text=${encodeURIComponent(msg)}`,'_blank');
};
window.dlInvPDF=async function(){
  const el=document.getElementById('invDoc');if(!el){toast('काम निवडा','warn');return;}
  toast('PDF तयार होत आहे...','warn',2000);
  try{
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
  const el=document.getElementById('invDoc');if(!el){toast('काम निवडा','warn');return;}
  try{
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

// ---- Date-range CONSOLIDATED invoice (Khata page se, ek farmer ka sara kaam ek bill me) ----
window.openConsolidatedInvoice=async function(farmerName,startDate,endDate){
  // Khata page se aaya hai, lekin invoice page pe navigate karke wahi render karte hain
  window._consolidatedReq={farmerName,startDate,endDate};
  window.nav('invoice');
  setTimeout(()=>buildConsolidatedInv(),120);
};
async function buildConsolidatedInv(){
  const req=window._consolidatedReq;if(!req)return;
  const area=document.getElementById('ct');
  const invSelCard=document.querySelector('#invSel')?.closest('.card');
  const invArea=document.getElementById('invArea');
  if(!invArea)return;
  invArea.innerHTML='<div class="spin"></div>';
  if(invSelCard)invSelCard.style.display='none';
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
    const pr=gProf();
    const mobile=works.find(w=>w.mobile)?.mobile||'';
    const totBiz=works.reduce((s,w)=>s+(w.total||0),0);
    const totPaid=works.reduce((s,w)=>s+paidOf(w),0);
    const totDue=totBiz-totPaid;
    const invNo='TW'+Date.now().toString().slice(-6);
    const periodLabel=req.startDate?`${fmtD(req.startDate)} — ${fmtD(req.endDate)}`:`सुरुवातीपासून — ${fmtD(req.endDate)}`;
    const upiStr=pr.upiId?`upi://pay?pa=${encodeURIComponent(pr.upiId)}&pn=${encodeURIComponent(pr.businessName||'TractorWala')}&am=${totDue}&cu=INR`:'';

    invArea.innerHTML=`
    <div class="card" style="margin-bottom:11px;max-width:680px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="font-size:.78rem;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px">एकत्रित Invoice पाठवा</div>
        <button class="btn bg2 bxs" onclick="window.nav('khata')"><i class="fas fa-arrow-left"></i> खाता वर परत</button>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:9px">
        <button class="btn ba bsm" onclick="window.shareInvPDFWA()"><i class="fab fa-whatsapp"></i> WhatsApp वर पाठवा</button>
        <button class="btn bp bsm" onclick="window.dlInvPDF()"><i class="fas fa-file-pdf"></i> PDF Download</button>
        <button class="btn bg2 bsm" onclick="window.dlInvImg()"><i class="fas fa-image"></i> Image Download</button>
      </div>
    </div>
    <div class="inv" id="invDoc">
      ${invHeaderHTML(pr,'STATEMENT',invNo,fmtD(today()),'📆 कालावधी: '+periodLabel)}
      <div class="inv-body">
        <div class="inv-bd">
          <div class="inv-box">
            <div class="inv-lbl">शेतकरी</div>
            <div class="inv-val">${req.farmerName}</div>
            ${mobile?`<div class="inv-sub">📞 ${mobile}</div>`:''}
          </div>
          <div class="inv-box">
            <div class="inv-lbl">एकूण काम</div>
            <div class="inv-val">${works.length} नोंदी</div>
            <div class="inv-sub">कालावधी: ${periodLabel}</div>
          </div>
        </div>
        <table class="inv-tbl">
          <thead><tr><th>#</th><th>तारीख</th><th>काम</th><th>प्रमाण</th><th class="r">एकूण ₹</th><th class="r">बाकी ₹</th></tr></thead>
          <tbody>${works.map((w,i)=>{const b=balOf(w);return`<tr class="${b>0.01?'unpaid':''}">
            <td>${i+1}</td><td>${fmtD(w.date)}</td><td>${w.workType}</td><td>${w.quantity} ${w.unit}</td>
            <td class="r"><b>₹${fmt(w.total)}</b></td><td class="r">${b>0.01?'₹'+fmt(b):'✅'}</td>
          </tr>`;}).join('')}</tbody>
        </table>
        <div class="inv-sm">
          <div class="inv-sr"><span>एकूण काम (${works.length})</span><span>₹${fmt(totBiz)}</span></div>
          ${totPaid>0?`<div class="inv-sr paid"><span>✅ एकूण भरले</span><span>₹${fmt(totPaid)}</span></div>`:''}
          <div class="inv-sr big" style="color:${totDue>0.01?'#dc2626':'#166534'}"><span>${totDue>0.01?'⚠️ एकूण बाकी':'✅ पूर्ण भरले'}</span><span>₹${fmt(totDue)}</span></div>
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
      setTimeout(()=>{try{new QRCode(document.getElementById('invQR'),{text:upiStr,width:80,height:80,colorDark:'#166534',colorLight:'#fff'});}catch(_){}},100);
    }
    // shareInvWA/dlInvPDF/dlInvImg sab window._iW use karte hain - consolidated ke liye
    // ek "virtual work" object bana dete hain jisme combined totals ho
    window._iW={customerName:req.farmerName,mobile,workType:`${works.length} काम (${periodLabel})`,quantity:'',unit:'',rate:'',total:totBiz,date:today(),notes:''};
    window._iB=totDue;window._iP=totPaid;
  }catch(e){invArea.innerHTML=`<div class="card"><p style="color:var(--red)">${friendlyErr(e)}</p></div>`;}
}
