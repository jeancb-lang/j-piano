'use strict';
const {render}=require('./synth');const {NoteDetector}=require('./det_new');const SR=48000,HOP=1024;
// note tenue 2,5 s vs lâchée après 0,4 s ; on suit le niveau de la note
function track(m,dur,opt){const a=render([{m,t:.5,dur,v:.7}],{seed:m*7+Math.round(dur*10),noise:.002,level:.05,...opt});
  const d=new NoteDetector(SR);const out=[];for(let end=4096;end<=a.length;end+=HOP){const t=end/SR;const r=d.process(a.subarray(end-4096,end),t*1000,{hold:[m]});out.push([t,r.hold[0]])}return out}
// critère : chute rapide = niveau / niveau 150 ms avant
function released(tr,from,K,A=.3){let pk=0,cnt=0;const sm=i=>(tr[i][1]+tr[Math.max(0,i-1)][1]+tr[Math.max(0,i-2)][1])/3;
  for(let i=0;i<tr.length;i++){const [t]=tr[i];if(t<from)continue;const v=sm(i);if(t<from+.15){pk=Math.max(pk,v);continue}
  const j=i-Math.round(.15*SR/HOP);const pv=j>=0?sm(j):0;
  if(pv>0&&v/pv<K&&v<A*pk){if(++cnt>=2)return t}else cnt=0}return null}
for(const [K,A] of [[.45,.3],[.5,.25],[.55,.35],[.6,.3]]){let fa=0,miss=0,lat=0,n=0;
  for(const opt of [{},{wet:.35,level:.02},{noise:.006}])for(const m of [43,48,55,60,64,67,72,79,84,91]){
    const held=track(m,2.5,opt),rel=track(m,.4,opt);const r1=released(held,.55,K,A),r2=released(rel,.55,K,A);n++;
    if(r1!==null&&r1<2.9)fa++;if(r2===null||r2>1.3)miss++;else lat+=r2-.9}
  console.log('seuil',K,A,'| tenue prise pour lâchée:',fa+'/'+n,'| lâcher non vu:',miss+'/'+n,'| délai moyen',(lat/(n-miss)*1000).toFixed(0)+'ms')}
