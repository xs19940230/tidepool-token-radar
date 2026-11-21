import {readFileSync,writeFileSync,mkdirSync,cpSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBoard} from './lib/model.ts';
import {buildDossier} from './vendor/makefun-board.ts';

const root=fileURLToPath(new URL('.',import.meta.url));
function argument(name:string,fallback:string) {
  const i=process.argv.indexOf('--'+name);
  return i>=0 ? process.argv[i+1] : fallback;
}
let input=argument('input','/input/snapshot.json');
if(!input.endsWith('.json')) input=join(input,'snapshot.json');
const out=resolve(argument('output',process.env.MAKEFUN_OUTPUT_DIR || '/output'));
const snapshot=JSON.parse(readFileSync(input,'utf8'));
const radar=buildBoard(snapshot);
if(radar.rows.length<100 || new Set(radar.rows.map((r:any)=>r.slug)).size!==radar.rows.length) throw Error('Invalid board size or duplicate slugs');
for(const slug of snapshot.watchlist) if(!radar.rows.some((r:any)=>r.slug===slug)) throw Error('Missing watchlist protocol: '+slug);
for(const [i,row] of radar.rows.entries()) {
  if(row.rank!==i+1 || !Number.isSafeInteger(row.implied_value_usd) || row.implied_value_usd<1 || row.implied_value_usd>1e14) throw Error('Invalid rank or valuation');
  if(i>0 && row.implied_value_usd>radar.rows[i-1].implied_value_usd) throw Error('Values out of order');
  if(row.farm_steps.length<3 || row.farm_steps.length>12 || row.farm_steps.some((s:string)=>s.trim().length<20 || s.trim().length>600)) throw Error('Invalid plan: '+row.slug);
}
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'board.json'),JSON.stringify({model:'Tidepool / snapshot-relative value v1',rows:radar.rows})+'\n');
// External data keeps the dossier source small; JSON is escaped for safe script parsing.
writeFileSync(join(out,'data.js'),'window.RADAR='+JSON.stringify(radar).replace(/</g,'\\u003c')+';\n');
cpSync(join(root,'dashboard'),join(out,'dashboard'),{recursive:true});
// Include the actual scoring and plan code in the judge's source dossier.
writeFileSync(join(out,'dashboard','model-source.txt'),readFileSync(join(root,'lib','model.ts')));
if(existsSync(join(root,'screenshots'))) cpSync(join(root,'screenshots'),join(out,'screenshots'),{recursive:true});
if(!process.argv.includes('--preview')) {
  writeFileSync(join(out,'dossier.json'),buildDossier(out,{text_max_bytes:65536,screenshots:{max:4,max_bytes:524288},dashboard:{max_files:400,max_bytes:4194304}}));
}
console.log(`Tidepool: ${radar.rows.length} protocols; ${snapshot.watchlist.length}/${snapshot.watchlist.length} watchlist coverage. Output: ${out}`);
