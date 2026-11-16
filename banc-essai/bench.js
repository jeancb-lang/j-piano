'use strict';
const {render,rng}=require('./synth');
const SR=48000,HOP=+(process.env.HOP||Math.round(SR/60)),FR=2048;
// ---------- scénarios ----------
function seq(notes,{bpm=100,leg=.85,v=.75,vj=.15,t0=.6,R}){const out=[];let t=t0;const b=60/bpm;
  for(const [m,d] of notes){out.push({m,t,dur:Math.max(.08,d*b*leg),v:Math.min(1,Math.max(.15,v+(R()*2-1)*vj))});t+=d*b*(1+(R()*2-1)*.03)}return out}
const P=s=>s.trim().split(/\s+/).map(tok=>{const [n,d]=tok.split('/');const r=n.match(/^([A-G])(#?)(\d)$/);return [{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[r[1]]+(r[2]?1:0)+12*(+r[3]+1),d?+d:1]});
const MEL={
 clair:P('C4 C4 C4 D4 E4/2 D4/2 C4 E4 D4 D4 C4/4'),
 ode:P('E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4/1.5 D4/.5 D4/2'),
 jacques:P('C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4/2 E4 F4 G4/2'),
 elise:P('E5/.5 D#5/.5 E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5 A4/1.5 C4/.5 E4/.5 A4/.5 B4/1.5'),
 gamme:P('C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6'),
 grave:P('C2 E2 G2 C3 E3 G3 A2 F2 D2 B1 G2 C3'),
 aigu:P('C6 E6 G6 C7 B6 G6 E6 D6 C6'),
 chroma:P('C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5'),
 repet:P('C4 C4 C4 C4 G4 G4 G4 G4 E4 E4 E4 E4'),
 sauts:P('C4 G4 C5 E4 C5 G3 A4 F4 D5 B3'),
};
function scenarios(){const L=[];let seed=1;
  const conds=[
    {name:'calme',noise:.0015,level:.06},
    {name:'doux',noise:.0015,level:.02,v:.4},
    {name:'bruit',noise:.006,level:.05},
    {name:'TV/voix',noise:.003,level:.05,noiseKind:'voice'},
    {name:'pédale',noise:.002,level:.06,pedal:true},
    {name:'loin',noise:.002,level:.015,wet:.35},
  ];
  for(const c of conds)for(const [k,mel] of Object.entries(MEL))for(const bpm of [80,120]){
    const R=rng(seed);L.push({id:`${c.name}/${k}/${bpm}`,cond:c.name,mel:k,events:seq(mel,{bpm,leg:c.pedal?1:.8,v:c.v??.75,R}),opt:{...c,seed:seed++}})}
  return L}
// ---------- exécution ----------
function runDet(Det,audio,ctxFn){const d=new Det(SR),evs=[];const fr=d.N2||FR;
  for(let end=fr;end<=audio.length;end+=HOP){const t=end/SR*1000;const o=ctxFn?ctxFn(t):{};const r=d.process(audio.subarray(end-fr,end),t,o);for(const e of (r.events||r))evs.push({...e,t})}
  return evs}
function evalGeneral(truth,dets,octFree){const used=new Set();let tp=0,lat=0;const miss=[];
  for(const n of truth){const on=n.t*1000;let best=-1;
    for(let i=0;i<dets.length;i++){if(used.has(i))continue;const d=dets[i];const ok=octFree?((d.m-n.m)%12+12)%12===0:d.m===n.m;
      if(ok&&d.t>=on-10&&d.t<=on+220){best=i;break}}
    if(best>=0){used.add(best);tp++;lat+=dets[best].t-on}else miss.push(n.m)}
  return {tp,n:truth.length,fp:dets.length-used.size,lat:tp?lat/tp:0,miss}}
module.exports={scenarios,runDet,evalGeneral,render,SR,HOP,FR,seq,P,MEL,rng};
if(require.main===module){
  const Det=require(process.argv[2]||'./old_det').OldDet||require(process.argv[2]).NoteDetector;
  const S=scenarios();const agg={};let T={tp:0,n:0,fp:0};
  for(const s of S){const a=render(s.events,s.opt);const d=runDet(Det,a,()=>({}));const r=evalGeneral(s.events,d,false);
    const g=agg[s.cond]||(agg[s.cond]={tp:0,n:0,fp:0,lat:0});g.tp+=r.tp;g.n+=r.n;g.fp+=r.fp;g.lat+=r.lat*r.tp;T.tp+=r.tp;T.n+=r.n;T.fp+=r.fp}
  for(const [k,g] of Object.entries(agg))console.log(k.padEnd(8),'reconnues',(100*g.tp/g.n).toFixed(0)+'%','fausses',g.fp,'latence',(g.lat/Math.max(1,g.tp)).toFixed(0)+'ms');
  console.log('TOTAL   ','reconnues',(100*T.tp/T.n).toFixed(1)+'%',`(${T.tp}/${T.n})`,'fausses',T.fp);
}
