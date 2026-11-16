'use strict';
const {scenarios,render,SR,HOP}=require('./bench');const {audioFor}=require('./cache');
const mod=require(process.argv[2]||'./det_new');const Det=mod.NoteDetector;
const params=process.argv[3]?JSON.parse(process.argv[3]):{};const octFree=!!params.octFree;
class D2 extends Det{constructor(sr){super(sr,params)}}
const SRX=+(process.env.SR||SR);function rs(a){if(SRX===SR)return a;const r=SR/SRX,o=new Float32Array(Math.floor(a.length/r));for(let i=0;i<o.length;i++){const x=i*r,j=Math.floor(x),f=x-j;o[i]=a[j]*(1-f)+(a[j+1]||0)*f}return o}
function game(audio0,played,expectedSeq){const audio=rs(audio0);const d=new D2(SRX),fr=d.N2;const HOPX=Math.round(HOP*SRX/SR);let ptr=0;const st={ok:0,miss:0,wrongFlag:0,falseAcc:0,lat:0};
  for(let end=fr;end<=audio.length;end+=HOPX){const t=end/SRX*1000;
    while(ptr<played.length-1&&t>played[ptr+1].t*1000-30){st.miss++;ptr++}
    if(ptr>=played.length)break;
    const r=d.process(audio.subarray(end-fr,end),t,{expected:[expectedSeq[ptr]],octFree});
    for(const e of r.events){if(ptr>=played.length)break;const exp=expectedSeq[ptr];const hit=octFree?((e.m-exp)%12+12)%12===0:e.m===exp;
      const on=played[ptr].t*1000;
      if(hit){if(played[ptr].m===exp||(octFree&&((played[ptr].m-exp)%12+12)%12===0)){if(t>=on-10&&t<=on+400){st.ok++;st.lat+=t-on}else st.falseAcc++}else st.falseAcc++;ptr++}
      else if(played[ptr].m===exp&&t>=on-10&&t<=on+400)st.wrongFlag++}}
  st.miss+=played.length-ptr-0;return st}
const tot={ok:0,miss:0,n:0,wrongFlag:0,falseAcc:0,lat:0},by={};
for(const s of scenarios()){const a=audioFor(s);const r=game(a,s.events,s.events.map(e=>e.m));
  r.miss=s.events.length-r.ok-r.falseAcc;for(const k of ['ok','miss','wrongFlag','falseAcc','lat'])tot[k]+=r[k];tot.n+=s.events.length;
  const b=by[s.cond]||(by[s.cond]={ok:0,n:0,wf:0,fa:0});b.ok+=r.ok;b.n+=s.events.length;b.wf+=r.wrongFlag;b.fa+=r.falseAcc}
for(const [k,b] of Object.entries(by))console.log(k.padEnd(8),'validées',(100*b.ok/b.n).toFixed(0).padStart(3)+'%','  fausses erreurs',b.wf,'  validées à tort',b.fa);
console.log('BONNES NOTES : validées',(100*tot.ok/tot.n).toFixed(1)+'%',`(${tot.ok}/${tot.n})`,'| fausses erreurs',tot.wrongFlag,'| validées à tort',tot.falseAcc,'| latence',(tot.lat/tot.ok).toFixed(0)+'ms');
// Fausses notes : on attend la mélodie, mais le joueur joue décalé
const {rng,seq,MEL}=require('./bench');const shifts=[1,-1,2,-2,7,5,12,-12];const wr={};let wrT=0,wrN=0;
for(const sh of shifts){let acc=0,n=0;
  for(const mel of ['ode','sauts','chroma']){const R=rng(77+sh);const ev=seq(MEL[mel],{bpm:90,leg:.8,v:.7,R});
    const played=ev.map(e=>({...e,m:e.m+sh}));const a=render(played,{seed:5+sh,noise:.002,level:.05});
    const d=new D2(SR),fr=d.N2;let ptr=0;
    for(let end=fr;end<=a.length;end+=HOP){const t=end/SR*1000;while(ptr<ev.length-1&&t>ev[ptr+1].t*1000)ptr++;
      const exp=ev[ptr].m;const r=d.process(a.subarray(end-fr,end),t,{expected:[exp],octFree});
      for(const e of r.events){const hit=octFree?((e.m-exp)%12+12)%12===0:e.m===exp;if(hit)acc++}}
    n+=ev.length}
  wr[sh]=`${acc}/${n}`;if(!(octFree&&Math.abs(sh)===12)){wrT+=acc;wrN+=n}}
console.log('FAUSSES NOTES acceptées à tort, par écart (demi-tons):',JSON.stringify(wr),'→ total',wrT+'/'+wrN);
