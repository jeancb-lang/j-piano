'use strict';
const {scenarios,runDet,evalGeneral,SR}=require('./bench');const {audioFor}=require('./cache');
const which=process.argv[2]||'./det_new';const mod=require(which);const Det=mod.NoteDetector||mod.OldDet;
const params=process.argv[3]?JSON.parse(process.argv[3]):null;
class D2 extends Det{constructor(sr){super(sr,params)}}
const S=scenarios();const agg={};const T={tp:0,n:0,fp:0,lat:0};const missBy={};
for(const s of S){const a=audioFor(s);const d=runDet(params?D2:Det,a,()=>({}));const r=evalGeneral(s.events,d,false);
  const g=agg[s.cond]||(agg[s.cond]={tp:0,n:0,fp:0,lat:0});g.tp+=r.tp;g.n+=r.n;g.fp+=r.fp;g.lat+=r.lat*r.tp;T.tp+=r.tp;T.n+=r.n;T.fp+=r.fp;T.lat+=r.lat*r.tp;
  const k=s.mel;const mb=missBy[k]||(missBy[k]={tp:0,n:0,fp:0});mb.tp+=r.tp;mb.n+=r.n;mb.fp+=r.fp}
for(const [k,g] of Object.entries(agg))console.log(k.padEnd(8),'reconnues',(100*g.tp/g.n).toFixed(0).padStart(3)+'%','fausses',String(g.fp).padStart(3),'latence',(g.lat/Math.max(1,g.tp)).toFixed(0)+'ms');
console.log('par morceau:',Object.entries(missBy).map(([k,g])=>`${k} ${(100*g.tp/g.n).toFixed(0)}%/${g.fp}`).join('  '));
console.log('TOTAL    reconnues',(100*T.tp/T.n).toFixed(1)+'%',`(${T.tp}/${T.n})`,'fausses',T.fp,'latence',(T.lat/T.tp).toFixed(0)+'ms');
