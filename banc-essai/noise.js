// Sons qui NE sont PAS des notes de piano : manipulation du téléphone, chocs, frottements, claquements, voix
'use strict';const {rng}=require('./synth');
function addEvent(x,sr,R,kind,t0,lvl){const s=Math.floor(t0*sr);
  const put=(i,v)=>{if(s+i<x.length&&s+i>=0)x[s+i]+=v};
  if(kind==='thump'){let y=0;const n=Math.floor(.12*sr);for(let i=0;i<n;i++){const w=(R()*2-1);y+=.02*(w-y);put(i,lvl*8*y*Math.exp(-i/(.03*sr)))}}
  if(kind==='rustle'){let y=0,z=0;const n=Math.floor((.1+R()*.3)*sr);for(let i=0;i<n;i++){const w=R()*2-1;y+=.3*(w-y);z=w-y;put(i,lvl*.8*z*Math.sin(Math.PI*i/n))}}
  if(kind==='tap'){for(let i=0;i<Math.floor(.004*sr);i++)put(i,lvl*2*(R()*2-1)*Math.exp(-i/(.001*sr)))}
  if(kind==='clap'){let y=0;for(let i=0;i<Math.floor(.03*sr);i++){y+=.5*((R()*2-1)-y);put(i,lvl*2*y*Math.exp(-i/(.006*sr)))}}
  if(kind==='knock'){const fs=[180+R()*700,400+R()*1200,900+R()*1500];for(const f of fs){const a=lvl*(.4+R()*.6),d=.015+R()*.05;for(let i=0;i<Math.floor(.15*sr);i++)put(i,a*Math.sin(2*Math.PI*f*i/sr)*Math.exp(-i/(d*sr)))}}
  if(kind==='voice'){const f0=110+R()*120,dur=.2+R()*.35,n=Math.floor(dur*sr),gl=(R()*2-1)*.25;
    for(let i=0;i<n;i++){const t=i/sr,f=f0*(1+gl*t/dur),env=Math.sin(Math.PI*i/n);let v=0;for(let h=1;h<=12;h++){const fh=h*f,fm=Math.exp(-Math.pow((fh-700)/300,2))+.6*Math.exp(-Math.pow((fh-1200)/400,2))+.3;v+=fm/h*Math.sin(2*Math.PI*fh*t+h)}put(i,lvl*.5*env*v)}}
  if(kind==='slide'){const n=Math.floor(.4*sr);let y=0;for(let i=0;i<n;i++){const w=R()*2-1;y+=.05*(w-y);put(i,lvl*3*y*(.5+.5*Math.sin(i/sr*2*Math.PI*6)))}}
}
function renderNoise(kinds,{sr=48000,seed=1,lvl=.08,gap=.7,floor=.002}={}){const R=rng(seed);const evs=[];let t=1;for(const k of kinds){evs.push({k,t});t+=gap+R()*.3}
  const x=new Float32Array(Math.ceil((t+1)*sr));for(let i=0;i<x.length;i++)x[i]=(R()*2-1)*floor;
  for(const e of evs)addEvent(x,sr,R,e.k,e.t,lvl*(.4+R()*1.2));return {x,evs}}
module.exports={renderNoise};
