import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildBoard} from './lib/model.ts';
import {buildDossier} from './vendor/makefun-board.ts';

const input=process.argv[2]||'../input/snapshot.json',out=resolve(process.argv[3]||'../out');
const snapshot=JSON.parse(readFileSync(input)),expected=buildBoard(snapshot);
const actual=JSON.parse(readFileSync(join(out,'board.json'))).rows;
assert.deepEqual(actual,expected.rows,'Saved board differs from model');
assert.deepEqual(buildBoard(snapshot),expected,'Model is not deterministic');
assert.equal(actual.length,snapshot.protocols.length);
assert.equal(new Set(actual.map(r=>r.slug)).size,actual.length);
assert(snapshot.watchlist.every(s=>actual.find(r=>r.slug===s&&r.status==='watchlist')));
for(const [i,r] of actual.entries()){
  assert.equal(r.rank,i+1);
  assert(Number.isSafeInteger(r.implied_value_usd)&&r.implied_value_usd>0&&r.implied_value_usd<=1e14);
  if(i)assert(actual[i-1].implied_value_usd>=r.implied_value_usd);
  assert(r.farm_steps.length>=3&&r.farm_steps.length<=12);
  r.farm_steps.forEach(s=>assert(s.trim().length>=20&&s.trim().length<=600));
}
const missing=structuredClone(snapshot);
missing.protocols=missing.protocols.map(p=>({...p,change_7d:null,listed_at:null,mcap_usd:null}));
assert(buildBoard(missing).rows.every(r=>Number.isFinite(r.implied_value_usd)&&r.model.growth_factor===1&&r.model.age_factor===1));
const files=readdirSync(join(out,'dashboard'));
assert(files.includes('index.html')&&files.some(f=>f.endsWith('.css'))&&files.some(f=>f.endsWith('.js')));
assert(files.length<=400);
assert(files.every(f=>/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(f)));
let bytes=0;
for(const f of files){
  const p=join(out,'dashboard',f);assert(statSync(p).isFile());bytes+=statSync(p).size;
  const s=readFileSync(p,'utf8');
  if(f.endsWith('.css'))assert(!/https?:\/\//i.test(s));
  if(f.endsWith('.html'))assert(!/\b[\w-]+\s*=\s*["'][^"']*https?:\/\//i.test(s));
  if(f.endsWith('.js'))assert(!/(?:import\s*\(|require\s*\(|\bfrom\s*)["']https?:\/\//i.test(s));
}
assert(bytes<65536);
const shots=readdirSync(join(out,'screenshots'));assert.equal(shots.length,3);
for(const f of shots){
  const b=readFileSync(join(out,'screenshots',f));assert(b.length<=524288);
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert(Math.max(w,h)<=1440&&Math.min(w,h)>=800);
}
const dossier=readFileSync(join(out,'dossier.json'));
assert(dossier.equals(Buffer.from(buildDossier(out,{text_max_bytes:65536}))),'Canonical dossier mismatch');
assert(dossier.length<=1572864);
const d=JSON.parse(dossier);assert(!d.text.includes('lines are not shown'));
console.log(`PASS: ${actual.length} rows; ${snapshot.watchlist.length}/${snapshot.watchlist.length} watchlist; ranks, steps, determinism, null fallbacks, offline source, 3 screenshots and canonical dossier.`);
console.log(`Dashboard ${bytes} bytes; dossier ${dossier.length} bytes; sha256 ${createHash('sha256').update(dossier).digest('hex')}`);
