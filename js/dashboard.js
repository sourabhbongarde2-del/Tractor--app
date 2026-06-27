// dashboard.js — Home/Dashboard page
import{getDocs,uq,today,ym,fmt,fmtD,balOf,waNum,adBannerHTML,gProf,friendlyErr}from'./core.js';

export async function pgDash(area){
  try{
    const[wS,eS]=await Promise.all([getDocs(uq('works')),getDocs(uq('expenses'))]);
    const works=[],exps=[];
    wS.forEach(d=>works.push({...d.data(),_id:d.id}));
    eS.forEach(d=>exps.push({...d.data(),_id:d.id}));

    const td=today(),mn=ym()+'-01';
    const mW=works.filter(w=>w.date&&w.date>=mn);
    const mE=exps.filter(e=>e.date&&e.date>=mn);
    const tW=works.filter(w=>w.date===td);
    const tE=exps.filter(e=>e.date===td);

    const mRev=mW.reduce((s,w)=>s+(w.total||0),0);
    const mExp=mE.reduce((s,e)=>s+(e.amount||0),0);
    const tRev=tW.reduce((s,w)=>s+(w.total||0),0);
    const tExp=tE.reduce((s,e)=>s+(e.amount||0),0);
    const pendW=works.filter(w=>balOf(w)>0.01);
    const totPend=pendW.reduce((s,w)=>s+balOf(w),0);
    const recent=works.sort((a,b)=>(b.date||'')>(a.date||'')?1:-1).slice(0,5);

    const ad1=await adBannerHTML('dashboard-top');
    area.innerHTML=`
    <div class="qa-grid">
      <button class="qa green" onclick="nav('work-entry')"><i class="fas fa-plus-circle"></i><span>+ नवीन काम</span></button>
      <button class="qa amber" onclick="nav('expenses')"><i class="fas fa-receipt"></i><span>+ खर्च नोंद</span></button>
      <button class="qa blue" onclick="nav('payments')"><i class="fas fa-money-bill-wave"></i><span>पेमेंट पहा</span></button>
      <button class="qa teal" onclick="nav('invoice')"><i class="fas fa-file-invoice"></i><span>Invoice</span></button>
    </div>
    ${ad1}

    <div class="sg">
      <div class="st g"><div class="si g"><i class="fas fa-rupee-sign"></i></div><div class="sb2"><div class="sl">महिना उत्पन्न</div><div class="sv">₹${fmt(mRev)}</div><div class="ss">${mW.length} काम</div></div></div>
      <div class="st r"><div class="si r"><i class="fas fa-arrow-down"></i></div><div class="sb2"><div class="sl">महिना खर्च</div><div class="sv">₹${fmt(mExp)}</div><div class="ss">${mE.length} नोंदी</div></div></div>
      <div class="st ${mRev-mExp>=0?'b':'r'}"><div class="si ${mRev-mExp>=0?'b':'r'}"><i class="fas fa-chart-line"></i></div><div class="sb2"><div class="sl">महिना नफा</div><div class="sv">₹${fmt(mRev-mExp)}</div><div class="ss">${mRev-mExp>=0?'📈 फायदा':'⚠️ तोटा'}</div></div></div>
      <div class="st a"><div class="si a"><i class="fas fa-clock"></i></div><div class="sb2"><div class="sl">बाकी पेमेंट</div><div class="sv">₹${fmt(totPend)}</div><div class="ss">${pendW.length} ग्राहक</div></div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:12px">
      <div class="card">
        <div class="ch">
          <span class="ct2">📅 आजचा सारांश</span>
          <div style="display:flex;gap:5px">
            <button class="btn bwa bxs" onclick="shareDailyWA()"><i class="fab fa-whatsapp"></i></button>
            <button class="btn bp bxs" onclick="dlDailyPDF()"><i class="fas fa-file-pdf"></i></button>
          </div>
        </div>
        <div class="rc">
          <div class="rr head"><span>मद</span><span>रक्कम</span></div>
          <div class="rr"><span>उत्पन्न</span><span>₹${fmt(tRev)}</span></div>
          <div class="rr"><span>खर्च</span><span>₹${fmt(tExp)}</span></div>
          <div class="rr"><span>नफा</span><span>₹${fmt(tRev-tExp)}</span></div>
        </div>
      </div>
      <div class="card">
        <div class="ch"><span class="ct2">⏳ बाकी पेमेंट</span><button class="btn bp bxs" onclick="nav('payments')">सर्व</button></div>
        ${pendW.length===0?`<div class="empty"><i class="fas fa-check-circle" style="color:var(--g500)"></i><p>सर्व पेमेंट पूर्ण! 🎉</p></div>`:
        pendW.slice(0,4).map(w=>`<div class="pi" style="margin-bottom:6px;cursor:pointer" onclick="openPayMo('${w._id}')">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.customerName}</div>
            <div style="font-size:.68rem;color:var(--tx3)">${w.workType} · ${fmtD(w.date)}</div>
          </div>
          <span class="pa" style="flex-shrink:0">₹${fmt(balOf(w))}</span>
          ${w.mobile?`<a href="https://wa.me/${waNum(w.mobile)}?text=${encodeURIComponent(`🙏 नमस्कार ${w.customerName} जी,\n\n🚜 ${gProf().businessName||'TractorWala'} – पेमेंट स्मरणपत्र\n\n📋 काम: ${w.workType}\n📅 तारीख: ${fmtD(w.date)}\n⚠️ बाकी रक्कम: ₹${fmt(balOf(w))}\n\nकृपया लवकरात लवकर पेमेंट करावे.\n\n🙏 धन्यवाद!\n— ${gProf().businessName||'TractorWala'}`)}" target="_blank" class="btn bwa bic bxs" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i></a>`:''}
        </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="ch"><span class="ct2">🕒 अलीकडील काम</span><button class="btn bp bsm" onclick="nav('work-list')">सर्व पहा</button></div>
      ${recent.length===0?`<div class="empty"><i class="fas fa-tractor"></i><p>अजून काम नाही.<br><button class="btn bp bsm" style="margin-top:8px" onclick="nav('work-entry')">+ पहिले काम जोडा</button></p></div>`:`
      <div class="tw"><table>
        <thead><tr><th>ग्राहक</th><th>काम</th><th>एकूण</th><th>स्थिती</th><th>क्रिया</th></tr></thead>
        <tbody>${recent.map(w=>{const b=balOf(w);return`<tr class="${b>0?'prow':''}">
          <td><b style="font-size:.82rem;cursor:pointer;color:var(--brand)" onclick="window.openKhataByName('${w.customerName.replace(/'/g,"\\'")}')">${w.customerName}</b><br><small style="color:var(--tx3);font-size:.65rem">${w.mobile||''}</small></td>
          <td style="font-size:.78rem;color:var(--tx2)">${w.workType}<br><small>${w.quantity} ${w.unit}</small></td>
          <td><b style="font-size:.85rem">₹${fmt(w.total)}</b></td>
          <td><span class="bx ${b>0?'bxa':'bxg'}">${b>0?`₹${fmt(b)} बाकी`:'✅'}</span></td>
          <td><div style="display:flex;gap:3px">
            <button class="btn ba bic bxs" onclick="openPayMo('${w._id}')" title="Payment"><i class="fas fa-rupee-sign"></i></button>
            <button class="btn bg2 bic bxs" onclick="openInv('${w._id}')" title="Invoice"><i class="fas fa-file-invoice"></i></button>
          </div></td>
        </tr>`;}).join('')}</tbody>
      </table></div>`}
    </div>`;
  }catch(e){area.innerHTML=`<div class="card"><p style="color:var(--red)">⚠️ ${friendlyErr(e)}</p></div>`;}
}
