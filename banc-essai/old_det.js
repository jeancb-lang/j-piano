// Copie fidèle du détecteur actuel de l'appli (pour mesurer le point de départ)
'use strict';
function autoCorr(buf,sr){let N=buf.length,r1=0,r2=N-1;const th=.2;
  for(let i=0;i<N/2;i++)if(Math.abs(buf[i])<th){r1=i;break}
  for(let i=1;i<N/2;i++)if(Math.abs(buf[N-i])<th){r2=N-i;break}
  const b=buf.subarray(r1,r2);N=b.length;const maxLag=Math.min(N-2,Math.floor(sr/60));if(maxLag<4)return -1;
  const c=new Float32Array(maxLag+1);for(let l=0;l<=maxLag;l++){let s=0;for(let j=0;j<N-l;j++)s+=b[j]*b[j+l];c[l]=s}
  let d=0;while(d<maxLag&&c[d]>c[d+1])d++;let mv=-1,mp=-1;for(let i=d;i<=maxLag;i++)if(c[i]>mv){mv=c[i];mp=i}
  if(mp<1||mp>=maxLag||mv<c[0]*.3)return -1;const x1=c[mp-1],x2=c[mp],x3=c[mp+1],a=(x1+x3-2*x2)/2,bb=(x3-x1)/2;return sr/(a?mp-bb/(2*a):mp)}
class OldDet{constructor(sr){this.sr=sr;this.NR=[];this.M={ring:[],armed:0,cand:-1,candN:0,last:-1}}
 process(buf,now,o){const M=this.M,ev=[];let rms=0;for(const x of buf)rms+=x*x;rms=Math.sqrt(rms/buf.length);
  this.NR.push(rms);if(this.NR.length>150)this.NR.shift();let noise=Infinity;for(const v of this.NR)if(v<noise)noise=v;
  const sens=o.sens??6;const TH=o.calTH?Math.max(o.calTH,noise*2):Math.max(.002+(10-sens)*.0012,noise*2.5);
  const envPrev=(M.env||0)*.9;M.env=Math.max(rms,envPrev);
  let hf=0;for(let i=1;i<buf.length;i++){const d=buf[i]-buf[i-1];hf+=d*d}hf=Math.sqrt(hf/buf.length);
  const hfPrev=(M.hfEnv||0)*.85;M.hfEnv=Math.max(hf,hfPrev);
  if(rms<TH*.7){M.last=-1;M.armed=0;M.candN=0;return ev}
  if(rms>TH&&(rms>envPrev*1.25||hf>hfPrev*1.3)){if(M.armed<=0)M.candN=0;M.armed=12}
  if(rms<TH)return ev;
  const f=autoCorr(buf,this.sr);if(f<50||f>2200){if(M.armed>0)M.armed--;return ev}
  const m=Math.round(69+12*Math.log2(f/440));
  if(m===M.cand)M.candN++;else{M.cand=m;M.candN=1}
  const gap=now-(M.lastT||0);
  if((m!==M.last&&M.candN>=4&&gap>90)||(m===M.last&&M.armed>0&&M.candN>=3&&gap>200)){M.last=m;M.lastT=now;M.armed=0;ev.push({m})}
  if(M.armed>0)M.armed--;return ev}}
module.exports={OldDet};
