// reports.js — Reports page (6-month trend, top customers) + daily/monthly share functions
// (shareDailyWA/dlDailyPDF are used from Dashboard too, so they live here as globals)
import{getDocs,uq,fmt,fmtD,ym,today,paidOf,toast,adBannerHTML,friendlyErr,ensurePdfLibs}from'./core.js';

export async function pgRep(area){
  const[wS,eS,ad1]=await Promise.all([getDocs(uq('works')),getDocs(uq('expenses')),adBannerHTML('reports-top')]);
  let works=[],exps=[];
  wS.forEach(d=>works.push({...d.data(),_id:d.id}));
  eS.forEach(d=>exps.push({...d.data(),_id:d.id}));
  // Custom-range report (neeche) isi already-fetched data pe kaam karega - dobara
  // Firestore query nahi maarni padegi, seedha yahan se filter hoga
  window._repWorks=works;window._repExps=exps;

  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setMonth(d.getMonth()-i);
    const k=d.toISOString().slice(0,7);
    const lb=d.toLocaleDateString('mr-IN',{month:'short',year:'2-digit'});
    const mw=works.filter(w=>w.date?.startsWith(k));
    const me=exps.filter(e=>e.date?.startsWith(k));
    months.push({k,lb,rev:mw.reduce((s,w)=>s+(w.total||0),0),exp:me.reduce((s,e)=>s+(e.amount||0),0),cnt:mw.length});
  }
  const maxR=Math.max(...months.map(m=>m.rev),1);
  const cm=ym();
  const mW=works.filter(w=>w.date?.startsWith(cm));
  const mE=exps.filter(e=>e.date?.startsWith(cm));
  const mRev=mW.reduce((s,w)=>s+(w.total||0),0);
  const mExp=mE.reduce((s,e)=>s+(e.amount||0),0);
  window._rp={mRev,mExp,mProfit:mRev-mExp,cnt:mW.length};

  const cust={};works.forEach(w=>{
    if(!cust[w.customerName])cust[w.customerName]={tot:0,paid:0,cnt:0};
    cust[w.customerName].tot+=(w.total||0);cust[w.customerName].paid+=paidOf(w);cust[w.customerName].cnt++;
  });
  const custArr=Object.entries(cust).sort((a,b)=>b[1].tot-a[1].tot).slice(0,8);

  // Kaam-prakar (work-type) nusaar kamaai - kaunsa kaam sabse zyada revenue deta hai
  const wt={};works.forEach(w=>{
    const k=w.workType||'इतर';
    wt[k]=(wt[k]||0)+(w.total||0);
  });
  const wtArr=Object.entries(wt).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxWt=Math.max(...wtArr.map(x=>x[1]),1);

  // Kharch category nusaar - kis cheez pe sabse zyada kharch ho raha hai
  const ec={};exps.forEach(e=>{
    const k=e.category||'इतर';
    ec[k]=(ec[k]||0)+(e.amount||0);
  });
  const ecArr=Object.entries(ec).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxEc=Math.max(...ecArr.map(x=>x[1]),1);

  // All-time outstanding summary - sab customers ka total business/collected/due
  const allBiz=works.reduce((s,w)=>s+(w.total||0),0);
  const allPaid=works.reduce((s,w)=>s+paidOf(w),0);
  const allDue=allBiz-allPaid;
  const custWithDue=Object.values(cust).filter(c=>c.tot-c.paid>0.01).length;

  area.innerHTML=`
  <div class="sh"><span class="st2">📊 अहवाल</span></div>
  ${ad1}
  <div class="rc" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      <div><div style="font-size:.7rem;opacity:.6;text-transform:uppercase;letter-spacing:.5px">मासिक अहवाल</div>
      <div style="font-family:var(--fd);font-size:1rem;font-weight:800">${new Date().toLocaleDateString('mr-IN',{month:'long',year:'numeric'})}</div></div>
      <div style="display:flex;gap:6px">
        <button class="btn bwa bsm" onclick="window.shareMonWA()"><i class="fab fa-whatsapp"></i> WA</button>
        <button class="btn bsm" style="background:rgba(255,255,255,.18);color:#fff" onclick="window.dlMonPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
      </div>
    </div>
    <div class="rr head"><span>मद</span><span>रक्कम</span></div>
    <div class="rr"><span>एकूण उत्पन्न</span><span>₹${fmt(mRev)}</span></div>
    <div class="rr"><span>एकूण खर्च</span><span>₹${fmt(mExp)}</span></div>
    <div class="rr"><span>एकूण काम</span><span>${mW.length}</span></div>
    <div class="rr"><span>नफा / तोटा</span><span>₹${fmt(mRev-mExp)}</span></div>
  </div>

  <div class="card" style="margin-bottom:12px">
    <div class="ch"><span class="ct2">🗓️ सानुकूल कालावधी अहवाल</span></div>
    <div class="fr2">
      <div class="fg"><label class="fl">सुरुवात तारीख</label><input class="fc" type="date" id="repFrom"/></div>
      <div class="fg"><label class="fl">शेवट तारीख</label><input class="fc" type="date" id="repTo" value="${today()}"/></div>
    </div>
    <button class="btn bp bfw" onclick="window.genRangeReport()"><i class="fas fa-chart-bar"></i> अहवाल तयार करा</button>
    <div id="repRangeResult" style="margin-top:12px"></div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px;margin-bottom:12px">
    <div class="card">
      <div class="ch"><span class="ct2">💼 एकूण थकबाकी (सर्व काळ)</span></div>
      <div class="rr"><span>एकूण व्यवसाय</span><span>₹${fmt(allBiz)}</span></div>
      <div class="rr"><span>एकूण जमा</span><span>₹${fmt(allPaid)}</span></div>
      <div class="rr"><span>एकूण बाकी</span><span style="color:${allDue>0.01?'var(--amber-d)':'var(--g600)'}">₹${fmt(allDue)}</span></div>
      <div class="rr"><span>बाकी असलेले शेतकरी</span><span>${custWithDue}</span></div>
    </div>
    <div class="card">
      <div class="ch"><span class="ct2">🚜 कामाच्या प्रकारानुसार उत्पन्न</span></div>
      ${wtArr.length===0?`<div class="empty"><i class="fas fa-tractor"></i><p>डेटा नाही</p></div>`:
      wtArr.map(([nm,v])=>`<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px"><span style="font-weight:700">${nm}</span><span style="color:var(--g700);font-weight:700">₹${fmt(v)}</span></div>
        <div class="pg"><div class="pgb" style="width:${v/maxWt*100}%"></div></div>
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="ch"><span class="ct2">💸 खर्च वर्गवारीनुसार</span></div>
      ${ecArr.length===0?`<div class="empty"><i class="fas fa-receipt"></i><p>डेटा नाही</p></div>`:
      ecArr.map(([nm,v])=>`<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px"><span style="font-weight:700">${nm}</span><span style="color:var(--red);font-weight:700">₹${fmt(v)}</span></div>
        <div class="pg"><div class="pgb" style="width:${v/maxEc*100}%;background:var(--red)"></div></div>
      </div>`).join('')}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px">
    <div class="card">
      <div class="ch"><span class="ct2">📈 ६ महिने ट्रेंड</span></div>
      ${months.map(m=>`<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px">
          <span style="font-weight:700">${m.lb}</span>
          <span style="color:var(--g700);font-weight:700">₹${fmt(m.rev)} <small style="opacity:.6">(${m.cnt})</small></span>
        </div>
        <div class="pg"><div class="pgb" style="width:${m.rev/maxR*100}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:.68rem;color:var(--tx3)"><span>खर्च: ₹${fmt(m.exp)}</span><span>नफा: ₹${fmt(m.rev-m.exp)}</span></div>
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="ch"><span class="ct2">🏆 शीर्ष ग्राहक</span></div>
      ${custArr.length===0?`<div class="empty"><i class="fas fa-users"></i><p>डेटा नाही</p></div>`:
      custArr.map(([nm,d])=>`<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--bdr);cursor:pointer" onclick="window.openKhataByName('${nm.replace(/'/g,"\\'")}')">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--brand-l);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-weight:800;font-size:.85rem;color:var(--brand);flex-shrink:0">${nm.charAt(0).toUpperCase()}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nm}</div><div style="font-size:.66rem;color:var(--tx3)">${d.cnt} काम</div></div>
        <div style="text-align:right;flex-shrink:0"><div style="font-weight:700;font-size:.84rem;color:var(--g700)">₹${fmt(d.tot)}</div><span class="bx ${d.tot-d.paid>0.01?'bxa':'bxg'}" style="font-size:.63rem">₹${fmt(d.tot-d.paid)} बाकी</span></div>
      </div>`).join('')}
    </div>
  </div>`;
}
window.shareMonWA=function(){
  const d=window._rp||{};
  const msg=`📊 *TractorWala – मासिक अहवाल*\n📅 ${new Date().toLocaleDateString('mr-IN',{month:'long',year:'numeric'})}\n━━━━━━━━━━━━━\n💰 उत्पन्न: ₹${fmt(d.mRev)}\n💸 खर्च: ₹${fmt(d.mExp)}\n📈 नफा: *₹${fmt(d.mProfit)}*\n🚜 काम: ${d.cnt}\n━━━━━━━━━━━━━\n🚜 TractorWala – Digital Business Manager`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank');
};
window.dlMonPDF=async function(){
  const d=window._rp||{};
  await ensurePdfLibs();
  const{jsPDF}=window.jspdf,pdf=new jsPDF();
  pdf.setFillColor(22,101,52);pdf.rect(0,0,210,22,'F');
  pdf.setTextColor(255,255,255);pdf.setFontSize(15);pdf.setFont('helvetica','bold');
  pdf.text('TractorWala - Monthly Report',14,14);
  pdf.setTextColor(0,0,0);pdf.setFontSize(11);pdf.setFont('helvetica','normal');
  pdf.text(`Month: ${new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}`,14,33);
  pdf.setFillColor(240,253,244);pdf.rect(14,39,182,36,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(12);
  pdf.setTextColor(22,101,52);pdf.text(`Revenue: Rs.${fmt(d.mRev)}`,20,50);
  pdf.setTextColor(220,38,38);pdf.text(`Expense: Rs.${fmt(d.mExp)}`,20,60);
  pdf.setTextColor(0);pdf.text(`Profit: Rs.${fmt(d.mProfit)} | Works: ${d.cnt}`,20,70);
  pdf.setFontSize(8);pdf.setTextColor(150);pdf.text('Developed by Sourabh Bongarde - Bongarde Software Solutions Pvt. Ltd. - sourabhbongarde2@gmail.com | 7875817356',14,278);
  pdf.save(`Monthly_${ym()}.pdf`);toast('PDF ✅');
};

// ---- Custom date-range report: works/expenses fetched once on page-load (window._repWorks/
// _repExps), filtered client-side yahan - koi extra Firestore query nahi karni padti ---
window.genRangeReport=function(){
  const from=document.getElementById('repFrom').value;
  const to=document.getElementById('repTo').value;
  if(!from||!to){toast('दोन्ही तारखा निवडा','err');return;}
  if(from>to){toast('सुरुवात तारीख शेवट तारखेपेक्षा आधी असावी','err');return;}
  const works=(window._repWorks||[]).filter(w=>w.date>=from&&w.date<=to);
  const exps=(window._repExps||[]).filter(e=>e.date>=from&&e.date<=to);
  const rev=works.reduce((s,w)=>s+(w.total||0),0);
  const exp=exps.reduce((s,e)=>s+(e.amount||0),0);
  window._rangeRep={from,to,rev,exp,profit:rev-exp,cnt:works.length,works};
  const el=document.getElementById('repRangeResult');
  if(works.length===0&&exps.length===0){
    el.innerHTML=`<p class="adm-empty" style="text-align:center;color:var(--tx3);font-size:.8rem;padding:10px 0">या कालावधीत कोणताही डेटा नाही.</p>`;
    return;
  }
  el.innerHTML=`
    <div class="rc">
      <div class="rr head"><span>मद</span><span>रक्कम</span></div>
      <div class="rr"><span>एकूण उत्पन्न</span><span>₹${fmt(rev)}</span></div>
      <div class="rr"><span>एकूण खर्च</span><span>₹${fmt(exp)}</span></div>
      <div class="rr"><span>एकूण काम</span><span>${works.length}</span></div>
      <div class="rr"><span>नफा / तोटा</span><span>₹${fmt(rev-exp)}</span></div>
    </div>
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
      <button class="btn bwa bsm" onclick="window.shareRangeWA()"><i class="fab fa-whatsapp"></i> WA</button>
      <button class="btn bp bsm" onclick="window.dlRangePDF()"><i class="fas fa-file-pdf"></i> PDF</button>
      <button class="btn bg2 bsm" onclick="window.dlRangeCSV()"><i class="fas fa-file-csv"></i> Excel (CSV)</button>
    </div>`;
};
window.shareRangeWA=function(){
  const d=window._rangeRep||{};
  const msg=`📊 *TractorWala – कालावधी अहवाल*\n📅 ${fmtD(d.from)} ते ${fmtD(d.to)}\n━━━━━━━━━━━━━\n💰 उत्पन्न: ₹${fmt(d.rev)}\n💸 खर्च: ₹${fmt(d.exp)}\n📈 नफा: *₹${fmt(d.profit)}*\n🚜 काम: ${d.cnt}\n━━━━━━━━━━━━━\n🚜 TractorWala – Digital Business Manager`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank');
};
window.dlRangePDF=async function(){
  const d=window._rangeRep||{};
  await ensurePdfLibs();
  const{jsPDF}=window.jspdf,pdf=new jsPDF();
  pdf.setFillColor(22,101,52);pdf.rect(0,0,210,22,'F');
  pdf.setTextColor(255,255,255);pdf.setFontSize(15);pdf.setFont('helvetica','bold');
  pdf.text('TractorWala - Period Report',14,14);
  pdf.setTextColor(0,0,0);pdf.setFontSize(11);pdf.setFont('helvetica','normal');
  pdf.text(`Period: ${d.from} to ${d.to}`,14,33);
  pdf.setFillColor(240,253,244);pdf.rect(14,39,182,36,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(12);
  pdf.setTextColor(22,101,52);pdf.text(`Revenue: Rs.${fmt(d.rev)}`,20,50);
  pdf.setTextColor(220,38,38);pdf.text(`Expense: Rs.${fmt(d.exp)}`,20,60);
  pdf.setTextColor(0);pdf.text(`Profit: Rs.${fmt(d.profit)} | Works: ${d.cnt}`,20,70);
  let y=88;
  if(d.works&&d.works.length){
    pdf.setFontSize(10);pdf.text('Work Details:',14,80);
    d.works.forEach(w=>{
      if(y>270){pdf.addPage();y=20;}
      pdf.setFont('helvetica','normal');
      pdf.text(`• ${w.date} | ${w.customerName} | ${w.workType} | Rs.${fmt(w.total)}`,14,y);
      y+=7;
    });
  }
  pdf.setFontSize(8);pdf.setTextColor(150);pdf.text('Developed by Sourabh Bongarde - Bongarde Software Solutions Pvt. Ltd. - sourabhbongarde2@gmail.com | 7875817356',14,290);
  pdf.save(`Report_${d.from}_to_${d.to}.pdf`);toast('PDF ✅');
};
window.dlRangeCSV=function(){
  const d=window._rangeRep||{};
  const rows=[['Date','Customer','Work Type','Quantity','Unit','Rate','Total','Paid','Due']];
  (d.works||[]).forEach(w=>{
    const paid=paidOf(w);
    rows.push([w.date,w.customerName,w.workType,w.quantity,w.unit,w.rate||'',w.total||0,paid,(w.total||0)-paid]);
  });
  const csv=rows.map(r=>r.map(v=>{
    const s=String(v??'');
    return /[,"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
  }).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`Report_${d.from}_to_${d.to}.csv`;
  document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
  toast('CSV ✅');
};
window.shareDailyWA=async function(){
  try{
    const[wS,eS]=await Promise.all([getDocs(uq('works')),getDocs(uq('expenses'))]);
    let w=[],e=[];wS.forEach(d=>w.push(d.data()));eS.forEach(d=>e.push(d.data()));
    const td=today();
    const tw=w.filter(x=>x.date===td),te=e.filter(x=>x.date===td);
    const rev=tw.reduce((s,x)=>s+(x.total||0),0),exp=te.reduce((s,x)=>s+(x.amount||0),0);
    const msg=`📊 *TractorWala – आजचा अहवाल*\n📅 ${new Date().toLocaleDateString('mr-IN')}\n━━━━━━━━━━━━━\n💰 उत्पन्न: ₹${fmt(rev)}\n💸 खर्च: ₹${fmt(exp)}\n📈 नफा: *₹${fmt(rev-exp)}*\n🚜 काम: ${tw.length}\n━━━━━━━━━━━━━\n🚜 TractorWala`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank');
  }catch(e){toast(friendlyErr(e),'err');}
};
window.dlDailyPDF=async function(){
  try{
    const[wS,eS]=await Promise.all([getDocs(uq('works')),getDocs(uq('expenses'))]);
    let w=[],e=[];wS.forEach(d=>w.push(d.data()));eS.forEach(d=>e.push(d.data()));
    const td=today();const tw=w.filter(x=>x.date===td),te=e.filter(x=>x.date===td);
    const rev=tw.reduce((s,x)=>s+(x.total||0),0),exp=te.reduce((s,x)=>s+(x.amount||0),0);
    await ensurePdfLibs();
    const{jsPDF}=window.jspdf,pdf=new jsPDF();
    pdf.setFillColor(22,101,52);pdf.rect(0,0,210,22,'F');
    pdf.setTextColor(255,255,255);pdf.setFontSize(15);pdf.setFont('helvetica','bold');
    pdf.text('TractorWala - Daily Report',14,14);
    pdf.setTextColor(0);pdf.setFontSize(11);pdf.setFont('helvetica','normal');
    pdf.text(`Date: ${td}`,14,32);
    pdf.setFillColor(240,253,244);pdf.rect(14,37,182,32,'F');
    pdf.setFont('helvetica','bold');pdf.setFontSize(12);
    pdf.setTextColor(22,101,52);pdf.text(`Revenue: Rs.${fmt(rev)}`,20,48);
    pdf.setTextColor(220,38,38);pdf.text(`Expense: Rs.${fmt(exp)}`,20,57);
    pdf.setTextColor(0);pdf.text(`Profit: Rs.${fmt(rev-exp)} | Works: ${tw.length}`,20,66);
    if(tw.length){
      pdf.setFontSize(10);pdf.text('Work Details:',14,82);
      let y=90;tw.forEach(x=>{if(y>260)return;pdf.setFont('helvetica','normal');pdf.text(`• ${x.customerName} | ${x.workType} | ${x.quantity} ${x.unit} | Rs.${fmt(x.total)}`,14,y);y+=7;});
    }
    pdf.setFontSize(8);pdf.setTextColor(150);pdf.text('Developed by Sourabh Bongarde - Bongarde Software Solutions Pvt. Ltd. - sourabhbongarde2@gmail.com',14,278);
    pdf.save(`Daily_${td}.pdf`);toast('PDF ✅');
  }catch(e){toast(friendlyErr(e),'err');}
};
