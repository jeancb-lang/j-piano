'use strict';
// 1) bruits non-piano : rien ne doit être accepté, quelle que soit la note demandée
// 2) fausses notes, avec ET sans « octave libre »
const {renderNoise}=require('./noise');const {render,rng}=require('./synth');const {seq,MEL}=require('./bench');
const mod=require(process.argv[2]||'./det_new');const params=process.argv[3]?JSON.parse(process.argv[3]):{};
class D2 extends mod.NoteDetector{constructor(sr){super(sr,params)}}
const SR=+(process.env.SR||48000),HOP=1024;
function rs(a){if(SR===48000)return a;const r=48000/SR,o=new Float32Array(Math.floor(a.length/r));for(let i=0;i<o.length;i++){const x=i*r,j=Math.floor(x),f=x-j;o[i]=a[j]*(1-f)+(a[j+1]||0)*f}return o}
const kinds=['thump','rustle','tap','clap','knock','voice','slide'];let acc=0,tot=0;const by={};
for(const octFree of [false,true])for(let seed=1;seed<=6;seed++){const list=[];for(let i=0;i<28;i++)list.push(kinds[i%kinds.length]);
  const {x}=renderNoise(list,{seed,lvl:.04+.03*seed});const a=rs(x);const d=new D2(SR);const R=rng(seed+100);let exp=48+Math.floor(R()*36);
  for(let end=4096;end<=a.length;end+=HOP){const t=end/SR*1000;if(Math.random()<.01)exp=48+Math.floor(R()*36);
    const r=d.process(a.subarray(end-4096,end),t,{expected:[exp],octFree});
    for(const e of r.events){const ok=octFree?((e.m-exp)%12+12)%12===0:e.m===exp;if(ok){acc++;const k='oct'+(octFree?1:0);by[k]=(by[k]||0)+1}}}
  tot+=list.length}
console.log('BRUITS acceptés comme bonne note :',acc,'sur',tot,'bruits',JSON.stringify(by));
const shifts=[1,-1,2,-2,3,4,5,7,9,12,-12];
for(const octFree of [false,true]){const wr={};let wa=0,wn=0;
  for(const sh of shifts){if(octFree&&Math.abs(sh)===12)continue;let a1=0,n=0;
    for(const mel of ['ode','sauts','chroma','gamme']){const R=rng(77+sh);const ev=seq(MEL[mel],{bpm:90,leg:.8,v:.7,R});
      const played=ev.map(e=>({...e,m:e.m+sh}));const a=rs(render(played,{seed:5+sh,noise:.002,level:.05}));const d=new D2(SR);let ptr=0;
      for(let end=4096;end<=a.length;end+=HOP){const t=end/SR*1000;while(ptr<ev.length-1&&t>ev[ptr+1].t*1000)ptr++;const exp=ev[ptr].m;
        const r=d.process(a.subarray(end-4096,end),t,{expected:[exp],octFree});for(const e of r.events){if(octFree?((e.m-exp)%12+12)%12===0:e.m===exp)a1++}}
      n+=ev.length}
    wr[sh]=a1+'/'+n;wa+=a1;wn+=n}
  console.log('FAUSSES NOTES acceptées (octave libre '+(octFree?'OUI':'non')+') :',wa+'/'+wn,JSON.stringify(wr))}
