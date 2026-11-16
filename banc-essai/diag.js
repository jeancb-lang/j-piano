'use strict';
const {scenarios,runDet}=require('./bench');const {audioFor}=require('./cache');
const mod=require(process.argv[2]||'./det_new');const Det=mod.NoteDetector;const filt=process.argv[3]||'';
const params=process.argv[4]?JSON.parse(process.argv[4]):null;class D2 extends Det{constructor(sr){super(sr,params)}}
const off={},nodet={n:0},byRange={};let extra={};
for(const s of scenarios()){if(filt&&!s.id.includes(filt))continue;const d=runDet(D2,audioFor(s),()=>({}));const used=new Set();
  for(const n of s.events){const on=n.t*1000;let bi=-1;for(let i=0;i<d.length;i++){if(used.has(i))continue;if(d[i].t>=on-10&&d[i].t<=on+220){bi=i;if(d[i].m===n.m)break}}
    const rg=n.m<48?'grave':n.m<72?'medium':'aigu';const R=byRange[rg]||(byRange[rg]={ok:0,n:0});R.n++;
    if(bi<0){nodet.n++;continue}used.add(bi);const o=d[bi].m-n.m;off[o]=(off[o]||0)+1;if(!o)R.ok++}
  for(let i=0;i<d.length;i++)if(!used.has(i)){const k=d[i].via;extra[k]=(extra[k]||0)+1}}
console.log('écart détecté-joué (demi-tons):',JSON.stringify(off));console.log('aucune détection:',nodet.n);
console.log('par registre:',Object.entries(byRange).map(([k,r])=>`${k} ${(100*r.ok/r.n).toFixed(0)}% (${r.n})`).join('  '));
console.log('détections en trop par voie:',JSON.stringify(extra));
