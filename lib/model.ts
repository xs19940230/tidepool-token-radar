// Snapshot-only valuation. No protocol-name overrides and no network access.
const DAY = 86_400_000;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const median = (xs: number[]) => {
  const a = [...xs].sort((a,b)=>a-b), m = a.length >> 1;
  return a.length ? (a[m] + a[(a.length-1)>>1])/2 : 1;
};
export function statusOf(p: any, watch: Set<string>) {
  if (p.gecko_id || p.symbol) return 'recorded';
  if (watch.has(p.slug)) return 'watchlist';
  if (/Bridge|Staking|Restaking|Restaked|CEX|Wrapper|Anchor BTC/.test(p.category || '') || /\b(wrapped|staked|staking)\b|\s(v\d+(\.\d+)?|\d+\.\d+)$/i.test(p.name) || /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/i.test(p.name)) return 'related';
  return 'research';
}
function planFor(p: any, status: string) {
  const chain = ['Base','Arbitrum','Optimism','Solana','Polygon'].find(c=>p.chains.includes(c)) || p.chains[0] || 'a verified supported chain';
  const gas = chain === 'Ethereum' ? '$5–30' : '$0.50–5';
  const restricted = /RWA|CEX|CeDeFi|OTC|Insurance|Capital Allocator|Risk Curators|Chain|Payments|Card|Token Locker/.test(p.category || '') || status === 'related';
  const goal = status === 'recorded' ? 'Existing-token activity only; verify current incentives, never assume a future distribution.' : 'The snapshot records no token; verify token status and eligibility before spending. No airdrop is promised.';
  const intro = `${p.name}: resolve the official app from its DefiLlama record (${p.slug}), check ${chain} support, contracts and current terms. ${goal} Allow 15–20 minutes; cost $0.`;
  if (restricted) return {chain, capital:'$0 until verified', fees:'$0 research', duration:'45–50 min', mode:'Verify access first', steps:[intro,
    `Read ${p.name}'s product, access and withdrawal documentation for ${p.category || 'this category'}. Check jurisdiction, minimums, lockups and whether retail use is supported. Spend 15 minutes; commit $0 while any answer is unclear.`,
    `Only if access is verified, choose a supported product on ${chain}; inspect its live deposit and exit quotes with no signature. Budget 10 minutes and $0 for the preview. Skip deposits if minimums exceed your own limit; this snapshot does not certify an available vault.`,
    `Recheck ${p.name}'s official announcements after 7 days (5 minutes, $0); record verified eligibility rules and an exit deadline before any future activity. This is an access-research plan, not evidence of points or rewards.`]};
  let action = 'Preview a $25 supported deposit or product action; check caps, redemption rules and the exact assets received. Use a small test only after the live app confirms support.';
  let exit = 'Preview the withdrawal, confirm any cooldown, then close the test position; stop if the exit path is unclear.';
  if (/Lending|CDP|Collateral/.test(p.category || '')) {
    action = 'If the live app supports it, supply $25 of a supported stable asset; inspect the receipt and withdrawal quote. Keep borrowing disabled: leverage is unnecessary for a test.';
    exit = 'Withdraw the test supply after 7 days; check the account has no debt, remaining approval or stranded receipt.';
  } else if (/Dexs|Liquidity|Farm|Yield/.test(p.category || '')) {
    action = 'Preview one $10 swap on a deep supported pair; cap slippage at 0.5% and inspect price impact before approval. Skip thin pairs and do not repeat swaps just to manufacture volume.';
    exit = 'After 7 days review the receipt and any officially documented activity criteria; exit the residual asset if desired. Avoid LP exposure unless you understand impermanent loss.';
  } else if (/Derivatives|Options|Synthetics|Leveraged|Prediction/.test(p.category || '')) {
    action = 'Use a demo or read-only market preview first; inspect collateral, liquidation and settlement rules. Allocate $0 to leveraged or outcome positions in this illustrative plan.';
    exit = 'After 7 days recheck official eligibility documentation; keep the plan read-only unless a suitable non-leveraged product and its exit are verified.';
  }
  return {chain, capital:/Derivatives|Options|Synthetics|Leveraged|Prediction/.test(p.category||'')?'$0 demo':'$25 test cap', fees:gas, duration:'7 days · 45 min', mode:'Small test, then review', steps:[intro,
    `${p.name} on ${chain}: ${action} Allow 10 minutes; reserve ${gas} total for network and protocol fees (planning assumption, not a live quote). Never bridge just for this plan.`,
    `Keep a local log of the ${p.name} transaction, date, fees and any verified program terms. Review once after 7 days for 5 minutes; no extra transactions or capital are required while waiting.`,
    `${exit} Allow 10 minutes; include exit fees in the ${gas} budget and account for price loss. Capital is at risk; rewards may be zero.`]};
}
export function buildBoard(snapshot: any) {
  const watch = new Set<string>(snapshot.watchlist);
  const peers = snapshot.protocols.filter((p:any)=>p.tvl_usd>0 && p.mcap_usd>0 && (p.gecko_id || p.symbol));
  const ratios = peers.map((p:any)=>clamp(p.mcap_usd/p.tvl_usd,0.1,4));
  const globalRatio = median(ratios);
  const groups: Record<string,number[]> = {};
  peers.forEach((p:any)=>(groups[p.category || 'Other'] ||= []).push(clamp(p.mcap_usd/p.tvl_usd,0.1,4)));
  const rows = snapshot.protocols.map((p:any)=>{
    const status = statusOf(p,watch), categoryPeers = groups[p.category || 'Other'] || [];
    const n = categoryPeers.length, weight = n/(n+6);
    const baseRatio = median(categoryPeers)*weight + globalRatio*(1-weight);
    const ageDays = p.listed_at ? Math.max(0,Math.floor((Date.parse(snapshot.as_of)-Date.parse(p.listed_at))/DAY)) : null;
    const growthFactor = p.change_7d === null ? 1 : 1+clamp(p.change_7d,-50,50)/200;
    const ageFactor = ageDays === null ? 1 : .85+.3*Math.min(1,Math.log1p(ageDays)/Math.log1p(1095));
    const value = Math.max(1,Math.round(p.tvl_usd*baseRatio*growthFactor*ageFactor));
    return {...p,status,age_days:ageDays,implied_value_usd:value,low_usd:Math.round(value*.5),high_usd:Math.round(value*1.8),
      model:{base_ratio:baseRatio,peer_median:n?median(categoryPeers):null,peer_n:n,global_ratio:globalRatio,global_n:peers.length,weight,growth_factor:growthFactor,age_factor:ageFactor},
      plan:planFor(p,status)};
  }).sort((a:any,b:any)=>b.implied_value_usd-a.implied_value_usd || a.slug.localeCompare(b.slug));
  let candidateRank=0;
  rows.forEach((r:any,i:number)=>{r.rank=i+1;r.candidate_rank=['watchlist','research'].includes(r.status)?++candidateRank:null;r.farm_steps=r.plan.steps;});
  return {as_of:snapshot.as_of,source:snapshot.source,floor_usd:snapshot.floor_usd,watchlist:snapshot.watchlist,global_ratio:globalRatio,peer_count:peers.length,rows};
}
