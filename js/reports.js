// reports.js — Reports page (6-month trend, top customers) + daily/monthly share functions
// (shareDailyWA/dlDailyPDF are used from Dashboard too, so they live here as globals)
import{getDocs,uq,fmt,ym,today,paidOf,toast,adBannerHTML,friendlyErr}from'./core.js';

export async function pgRep(area){
  const[wS,eS,ad1]=await Promise.all([getDocs(uq('works')),getDocs(uq('expenses')),adBannerHTML('reports-top')]);
  let works=[],exps=[];
  wS.forEach(d=>works.push({...d.data(),_id:d.id}));
  eS.forEach(d=>exps.push({...d.data(),_id:d.id}));

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
