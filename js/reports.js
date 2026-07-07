// reports.js — Reports page (6-month trend, top customers) + daily/monthly share functions
// (shareDailyWA/dlDailyPDF are used from Dashboard too, so they live here as globals)
import{getDocs,uq,fmt,fmtD,ym,today,paidOf,toast,adBannerHTML,friendlyErr,ensurePdfLibs,gProf}from'./core.js';
import{invHeaderHTML,invFooterHTML}from'./invoice.js';

// ---- Shared professional PDF renderer for all report types ----
// Invoice ne jo "brand-consistent" .inv template banaya tha (header with logo/business
// name, styled summary box, tables, footer with developer credit) - reports bhi wahi
// exact same visual language use karte hain ab, taaki poori app me har PDF export
// professional aur consistent dikhe. Pehle yeh sirf jsPDF.text() se haath se likha
// jata tha (plain lines, koi table/branding nahi) - ab html2canvas se asli styled HTML
// capture hoti hai, jaisa Invoice PDF banta hai.
async function exportReportPDF(bodyHTML,tag,dateLabel,periodLabel,filename){
  await ensurePdfLibs();
  const pr=gProf();
  const repNo='REP'+Date.now().toString().slice(-6);
  const holder=document.createElement('div');
  holder.style.cssText='position:fixed;left:-9999px;top:0;width:680px;background:#fff';
  holder.innerHTML=`<div class="inv">${invHeaderHTML(pr,tag,repNo,dateLabel,periodLabel)}<div class="inv-body">${bodyHTML}</div>${invFooterHTML(pr)}</div>`;
  document.body.appendChild(holder);
  try{
    const canvas=await html2canvas(holder,{scale:2,backgroundColor:'#ffffff',useCORS:true,allowTaint:true,logging:false});
    const{jsPDF}=window.jspdf;
    const pdf=new jsPDF('p','mm','a4');
    const pageW=210,pageH=297;
    const imgW=pageW;
    const pxPerMM=canvas.width/imgW;
    const pageHeightPx=pageH*pxPerMM;
    if(canvas.height<=pageHeightPx){
      pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,imgW,canvas.height/pxPerMM);
    }else{
      // Content ek A4 page se lamba hai (jaise bahut saare work-rows) - canvas ko
      // page-height ke hisaab se slice karke multiple pages banate hain
      let renderedPx=0,first=true;
      while(renderedPx<canvas.height){
        const sliceH=Math.min(pageHeightPx,canvas.height-renderedPx);
        const sliceCanvas=document.createElement('canvas');
        sliceCanvas.width=canvas.width;sliceCanvas.height=sliceH;
        sliceCanvas.getContext('2d').drawImage(canvas,0,renderedPx,canvas.width,sliceH,0,0,canvas.width,sliceH);
        if(!first)pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,imgW,sliceH/pxPerMM);
        renderedPx+=sliceH;first=false;
      }
    }
    pdf.save(filename);
    toast('PDF ✅');
  }catch(e){toast(friendlyErr(e),'err');}
  finally{document.body.removeChild(holder);}
}

// Summary box HTML (reuse invoice ki .inv-sm styling) - har report type me common
function summaryBoxHTML(rev,exp,cnt,cntLabel){
  return`<div class="inv-sm" style="width:100%;margin-left:0">
    <div class="inv-sr"><span>एकूण उत्पन्न</span><span>₹${fmt(rev)}</span></div>
    <div class="inv-sr"><span>एकूण खर्च</span><span>₹${fmt(exp)}</span></div>
    <div class="inv-sr"><span>${cntLabel||'एकूण काम'}</span><span>${cnt}</span></div>
    <div class="inv-sr big"><span>नफा / तोटा</span><span>₹${fmt(rev-exp)}</span></div>
  </div>`;
}
// Breakdown box (work-type ya expense-category) - do-column grid, invoice ki .inv-bd
// grid style reuse karke
function breakdownBoxHTML(title,arr,color){
  if(!arr.length)return'';
  const max=Math.max(...arr.map(x=>x[1]),1);
  return`<div class="inv-box" style="margin-bottom:16px">
    <div class="inv-lbl" style="margin-bottom:8px">${title}</div>
    ${arr.map(([nm,v])=>`<div style="display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0;color:#333"><span>${nm}</span><span style="font-weight:700;color:${color}">₹${fmt(v)}</span></div>`).join('')}
  </div>`;
}
// Work-detail table (range/daily reports me) - invoice ki .inv-tbl reuse
function workTableHTML(works){
  if(!works||!works.length)return'';
  return`<table class="inv-tbl">
    <thead><tr><th>तारीख</th><th>शेतकरी</th><th>काम</th><th class="r">रक्कम</th></tr></thead>
    <tbody>${works.map(w=>`<tr><td>${fmtD(w.date)}</td><td>${w.customerName||''}</td><td>${w.workType||''}</td><td class="r">₹${fmt(w.total)}</td></tr>`).join('')}</tbody>
  </table>`;
}

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
  window._rp.wtArr=wtArr;window._rp.ecArr=ecArr;

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
  const dateLabel=new Date().toLocaleDateString('mr-IN',{month:'long',year:'numeric'});
  const body=summaryBoxHTML(d.mRev,d.mExp,d.cnt)+
    `<div class="inv-bd" style="grid-template-columns:1fr 1fr">
      ${breakdownBoxHTML('🚜 कामाच्या प्रकारानुसार',d.wtArr||[],'#166534')}
      ${breakdownBoxHTML('💸 खर्च वर्गवारीनुसार',d.ecArr||[],'#dc2626')}
    </div>`;
  await exportReportPDF(body,'मासिक अहवाल','',dateLabel,`Monthly_${ym()}.pdf`);
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
  const dateLabel=new Date().toLocaleDateString('mr-IN');
  const periodLabel=`${fmtD(d.from)} — ${fmtD(d.to)}`;
  const body=summaryBoxHTML(d.rev,d.exp,d.cnt)+workTableHTML(d.works);
  await exportReportPDF(body,'कालावधी अहवाल',dateLabel,periodLabel,`Report_${d.from}_to_${d.to}.pdf`);
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
    const dateLabel=new Date().toLocaleDateString('mr-IN');
    const body=summaryBoxHTML(rev,exp,tw.length)+workTableHTML(tw);
    await exportReportPDF(body,'दैनिक अहवाल',dateLabel,'',`Daily_${td}.pdf`);
  }catch(e){toast(friendlyErr(e),'err');}
};
