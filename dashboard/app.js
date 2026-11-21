(() => {
  'use strict';
  const data=window.RADAR;
  if(!data){document.querySelector('main').textContent='Data missing. Run main.ts and open out/dashboard/index.html.';return;}
  const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(1)+'M':'$'+Math.round(n).toLocaleString('en-US');
  const exact=n=>'$'+n.toLocaleString('en-US'), pct=n=>n===null?'Unreported':(n>=0?'+':'')+n.toFixed(2)+'%';
  const isCandidate=r=>r.status==='watchlist'||r.status==='research';
  const statusText={watchlist:'Official watchlist',research:'Research candidate',recorded:'Token recorded',related:'Related product'};
  let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem('tidepool-saved')||'[]'));}catch{}
  let scope='candidates', sort='implied_value_usd', ascending=false, page=1, shortlist=false, selected=null;
  const pageSize=7;
  const all=data.rows, candidates=all.filter(isCandidate);
  document.querySelectorAll('.snapshot-date').forEach(e=>e.textContent=data.as_of);
  $('side-date').textContent=data.as_of+' · UTC';
  $('stat-all').textContent=all.length;
  $('nav-count').textContent=candidates.length;
  $('stat-candidates').textContent=candidates.length;
  $('stat-watch').textContent=data.watchlist.length+' / '+data.watchlist.length;
  $('stat-tvl').textContent=money(candidates.reduce((a,r)=>a+r.tvl_usd,0));
  $('tab-candidates').textContent=candidates.length;
  $('tab-watch').textContent=data.watchlist.length;
  $('source-text').textContent='Source: '+data.source+'. Snapshot floor: '+exact(data.floor_usd)+'. Calibration: '+data.peer_count+' token-recorded protocols with reported market cap. Global median multiple: '+data.global_ratio.toFixed(3)+'×.';
  const options=(id,arr)=>[...new Set(arr)].filter(Boolean).sort().forEach(x=>$(id).add(new Option(x,x)));
  options('chain',all.flatMap(r=>r.chains)); options('category',all.map(r=>r.category));
  function filtered(){
    const q=$('search').value.trim().toLowerCase(), chain=$('chain').value,cat=$('category').value,growth=$('growth').value;
    return all.filter(r=>(!shortlist||saved.has(r.slug))&&(scope==='all'||scope==='candidates'&&isCandidate(r)||r.status===scope)
      &&(!q||[r.name,r.slug,r.symbol].join(' ').toLowerCase().includes(q))&&(!chain||r.chains.includes(chain))&&(!cat||r.category===cat)
      &&(!growth||growth==='positive'&&r.change_7d!==null&&r.change_7d>0||growth==='negative'&&r.change_7d!==null&&r.change_7d<0||growth==='unknown'&&r.change_7d===null))
      .sort((a,b)=>{const av=a[sort],bv=b[sort];if(av===null&&bv===null)return a.rank-b.rank;if(av===null)return 1;if(bv===null)return -1;const d=typeof av==='string'?av.localeCompare(bv):av-bv;return (ascending?d:-d)||a.rank-b.rank;});
  }
  function render(){
    const list=filtered(),pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.min(page,pages);
    $('result-count').textContent=list.length+' protocols';
    $('saved-count').textContent=saved.size;
    $('scope-note').textContent=shortlist?'Your locally saved protocols. Saved on this browser only.':scope==='recorded'?'Existing token records · compare observed market cap in each detail view.':'Implied values are model scenarios, not market prices.';
    $('rows').innerHTML=list.slice((page-1)*pageSize,page*pageSize).map(r=>`<tr><td title="Global value rank ${r.rank}">${r.rank}</td><td><div class="protocol"><span class="avatar">${esc(r.name.split(/\s|-/).map(x=>x[0]).slice(0,2).join(''))}</span><div><button class="protocol-link" data-detail="${esc(r.slug)}">${esc(r.name)}</button><span class="sub">${esc(r.category||'Unclassified')} · ${esc(r.plan.chain)}${r.status==='watchlist'?'<span class="tag">WATCH</span>':''}</span></div></div></td><td class="value">${money(r.implied_value_usd)}<span class="sub">${money(r.low_usd)} – ${money(r.high_usd)}</span></td><td>${money(r.tvl_usd)}</td><td class="${r.change_7d>0?'positive':r.change_7d<0?'negative':''}">${pct(r.change_7d)}</td><td>${r.age_days===null?'—':r.age_days+'d'}<span class="sub">${r.listed_at?'since '+r.listed_at:'date unreported'}</span></td><td class="plan-cell">${esc(r.plan.capital)}<span class="sub">${esc(r.plan.duration)}</span></td><td><button class="bookmark ${saved.has(r.slug)?'saved':''}" data-save="${esc(r.slug)}" aria-label="${saved.has(r.slug)?'Remove':'Save'} ${esc(r.name)}" aria-pressed="${saved.has(r.slug)}">${saved.has(r.slug)?'◆':'◇'}</button></td></tr>`).join('');
    $('empty').hidden=list.length>0;
    $('range').textContent=list.length?`${(page-1)*pageSize+1}–${Math.min(page*pageSize,list.length)} of ${list.length} · # is global value rank`:'0 results';
    $('page').textContent=`${page} / ${pages}`;$('prev').disabled=page===1;$('next').disabled=page>=pages;
    document.querySelectorAll('[data-sort]').forEach(b=>b.closest('th').setAttribute('aria-sort',b.dataset.sort===sort?(ascending?'ascending':'descending'):'none'));
    document.querySelectorAll('[data-scope]').forEach(b=>{b.classList.toggle('selected',b.dataset.scope===scope);b.setAttribute('aria-pressed',b.dataset.scope===scope);});
    $('saved-nav').classList.toggle('active',shortlist);$('radar-nav').classList.toggle('active',!shortlist);$('model-nav').classList.remove('active');
  }
  function save(slug){saved.has(slug)?saved.delete(slug):saved.add(slug);try{localStorage.setItem('tidepool-saved',JSON.stringify([...saved]));}catch{}render();if(selected)detail(selected);}
  function view(name){$('board-view').hidden=name!=='board';$('detail-view').hidden=name!=='detail';$('method-view').hidden=name!=='method';if(name!=='detail')selected=null;window.scrollTo(0,0);}
  function detail(slug){
    const r=all.find(r=>r.slug===slug);if(!r)return;selected=slug;const m=r.model;
    view('detail');
    $('detail-view').innerHTML=`<button class="back" id="detail-back">Back to radar · keep filters</button><div class="detail-heading"><span class="avatar">${esc(r.name.slice(0,2))}</span><div><div class="badge">${statusText[r.status]} · GLOBAL RANK #${r.rank}</div><h1>${esc(r.name)}</h1><p>${esc(r.category||'Unclassified')} · ${r.chains.length} supported chain${r.chains.length===1?'':'s'} · ${esc(r.plan.chain)} plan</p></div><button class="outline" data-save="${esc(slug)}">${saved.has(slug)?'Saved to shortlist':'Save to shortlist'}</button></div>
      <section class="stats detail-stats"><div><span>IMPLIED TOKEN VALUE</span><strong>${money(r.implied_value_usd)}</strong><small>Conditional base scenario</small></div><div><span>PROTOCOL TVL</span><strong>${money(r.tvl_usd)}</strong><small>Snapshot assets, not revenue</small></div><div><span>7D TVL CHANGE</span><strong class="${r.change_7d>0?'positive':'negative'}">${pct(r.change_7d)}</strong><small>${r.change_7d===null?'Neutral factor imputed':'Measured in sealed snapshot'}</small></div><div><span>TIME TRACKED</span><strong>${r.age_days===null?'—':r.age_days+'d'}</strong><small>Since ${esc(r.listed_at||'unreported date')}</small></div></section>
      ${r.status==='recorded'?`<div class="notice">Token recorded: ${esc(r.symbol||r.gecko_id)}. Observed circulating market cap: ${r.mcap_usd===null?'unreported':exact(r.mcap_usd)}. This protocol is separated from launch candidates.</div>`:''}
      <div class="detail-grid"><article class="panel"><h2>Inside the valuation</h2><p>Snapshot-relative circulating-cap scenario · not FDV</p><div class="equation">${money(r.tvl_usd)} × ${m.base_ratio.toFixed(3)} × ${m.growth_factor.toFixed(3)} × ${m.age_factor.toFixed(3)}<br>= ${exact(r.implied_value_usd)}</div><dl class="breakdown"><div><dt>Peer TVL multiple<span>${m.peer_n} category peers · ${(m.weight*100).toFixed(0)}% category weight</span></dt><dd>${m.base_ratio.toFixed(3)}×</dd></div><div><dt>7-day growth factor<span>Clipped to −50% / +50%; missing = neutral</span></dt><dd>${m.growth_factor.toFixed(3)}×</dd></div><div><dt>Tracking maturity<span>Log-scaled; capped at 3 years</span></dt><dd>${m.age_factor.toFixed(3)}×</dd></div><div><dt>Calibration baseline<span>${m.global_n} peers; category median ${m.peer_median===null?'unavailable':m.peer_median.toFixed(3)+'×'}</span></dt><dd>${m.global_ratio.toFixed(3)}× global</dd></div></dl><div class="scenario"><span>LOW · 0.5×<b>${money(r.low_usd)}</b></span><span>BASE<b>${money(r.implied_value_usd)}</b></span><span>HIGH · 1.8×<b>${money(r.high_usd)}</b></span></div><p>Sensitivity assumptions, not confidence intervals. Tracking age does not prove time without a token.</p></article>
      <article class="panel"><h2>A practical research plan</h2><p>${esc(r.plan.mode)} · verify live terms before acting</p><div class="plan-summary"><span>${esc(r.plan.capital)}</span><span>${esc(r.plan.fees)} est. fees</span><span>${esc(r.plan.duration)}</span></div><ol class="steps">${r.farm_steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></article></div><div class="detail-note"><b>Record caveat:</b> ${r.status==='recorded'?'A token is recorded; no new launch is implied.':'No token is recorded in this snapshot; a token may exist outside this record. No launch or reward is confirmed.'} ${r.status==='research'?'Parent relationships are unavailable; verify independence. ':''}<br><b>Chains:</b> ${esc(r.chains.join(', ')||'unreported')}. <b>Source key:</b> ${esc(r.slug)} · ${data.as_of}.</div>`;
    $('detail-back').onclick=()=>{view('board');render();};
  }
  function reset(){ $('filters').reset();page=1;render(); }
  document.addEventListener('click',e=>{
    const d=e.target.closest('[data-detail]'),s=e.target.closest('[data-save]'),t=e.target.closest('[data-sort]'),f=e.target.closest('[data-scope]');
    if(d)detail(d.dataset.detail);if(s)save(s.dataset.save);
    if(t){if(sort===t.dataset.sort)ascending=!ascending;else{sort=t.dataset.sort;ascending=sort==='name'||sort==='rank';}page=1;render();}
    if(f){scope=f.dataset.scope;page=1;render();}
  });
  $('filters').onsubmit=e=>e.preventDefault();
  $('filters').addEventListener('input',()=>{page=1;render();});
  $('filters').addEventListener('change',()=>{page=1;render();});
  $('filters').addEventListener('reset',()=>{setTimeout(()=>{page=1;render();},0);});
  $('empty-reset').onclick=reset;
  $('prev').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
  $('radar-nav').onclick=()=>{shortlist=false;view('board');render();};
  $('saved-nav').onclick=()=>{shortlist=true;scope='all';view('board');render();};
  function method(){view('method');$('model-nav').classList.add('active');$('radar-nav').classList.remove('active');$('saved-nav').classList.remove('active');}
  $('model-nav').onclick=method;$('method-link').onclick=method;
  $('method-back').onclick=()=>{view('board');render();};
  document.querySelector('.brand').onclick=e=>{e.preventDefault();view('board');render();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){view('board');render();}});
  $('export').onclick=()=>{
    const keys=['rank','slug','name','status','implied_value_usd','low_usd','high_usd','tvl_usd','change_7d','age_days','farm_steps'];
    const csvCell=v=>'"'+String(Array.isArray(v)?v.join(' | '):v??'').replace(/^([=+@-])/,'\t$1').replace(/"/g,'""')+'"';
    const csv=[keys.join(','),...filtered().map(r=>keys.map(k=>csvCell(r[k])).join(','))].join('\r\n');
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='tidepool-'+data.as_of+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  render();
})();
