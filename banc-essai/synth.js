// Piano simulé réaliste, capté par un micro de téléphone dans une pièce.
'use strict';
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hz=m=>440*Math.pow(2,(m-69)/12);
function renderNote(out,e,sr,R,o){
  const f0=hz(e.m),v=e.v;
  const B=1.2e-4*Math.pow(2,(e.m-60)/18);              // inharmonicité des cordes
  const nStr=e.m<34?1:e.m<50?2:3;
  const det=[];for(let s=0;s<nStr;s++)det.push((R()*2-1)*(0.4+R()*1.6)); // cents
  const T0=(2.8*Math.pow(2,-(e.m-48)/20)+.25)*(o.sustainK||1);    // durée de résonance
  const start=Math.floor(e.t*sr),rel=start+Math.floor(e.dur*sr);
  const maxLen=Math.floor(Math.min(7,T0*5)*sr);
  const end=Math.min(out.length,o.pedal?start+maxLen:Math.min(start+maxLen,rel+Math.floor(.3*sr)));
  const gain=Math.pow(v,1.6)*(o.noteGain||1);
  for(let n=1;n<=40;n++){
    const fn=n*f0*Math.sqrt(1+B*n*n);if(fn>9500)break;
    let amp=(1/Math.pow(n,1.05))*Math.exp(-(n-1)*0.32*(1.25-v)); // jeu doux = son plus sourd
    amp*=1+0.35*(R()*2-1);                                         // timbre irrégulier
    if(n%7===0)amp*=.25;                                           // point de frappe du marteau
    const tau1=T0/(1+.18*n),tau2=tau1*4.5,mix=.65;
    for(let s=0;s<nStr;s++){
      const f=fn*Math.pow(2,det[s]/1200),w=2*Math.PI*f/sr,ph=R()*2*Math.PI;
      let c=Math.cos(ph),si=Math.sin(ph);const cw=Math.cos(w),sw=Math.sin(w);
      const a=gain*amp/nStr,d1=Math.exp(-1/(tau1*sr)),d2=Math.exp(-1/(tau2*sr)),dr=Math.exp(-1/(.05*sr));
      let e1=mix,e2=1-mix,damp=1;
      for(let i=start;i<end;i++){
        if(!o.pedal&&i>rel)damp*=dr;
        out[i]+=a*si*(e1+e2)*damp;
        e1*=d1;e2*=d2;
        const nc=c*cw-si*sw;si=si*cw+c*sw;c=nc;
        if(((i-start)&4095)===0){const r=Math.hypot(c,si);c/=r;si/=r}
      }
    }
  }
  // bruit du marteau
  const hl=Math.floor(.008*sr);let lp=0;
  for(let i=0;i<hl&&start+i<out.length;i++){lp+=.35*((R()*2-1)-lp);out[start+i]+=gain*.25*lp*Math.exp(-i/(hl/4))}
}
function reverb(x,sr,wet){
  const combs=[1557,1617,1491,1422].map(d=>Math.floor(d*sr/44100)),fb=.78,y=new Float32Array(x.length);
  for(const d of combs){const buf=new Float32Array(d);let k=0,lp=0;for(let i=0;i<x.length;i++){const o=buf[k];lp=o*.8+lp*.2;buf[k]=x[i]+lp*fb;y[i]+=o*.25;k=(k+1)%d}}
  for(const d of [225,556].map(d=>Math.floor(d*sr/44100))){const buf=new Float32Array(d);let k=0;for(let i=0;i<y.length;i++){const b=buf[k],v=y[i];const o=-v+b;buf[k]=v+b*.5;y[i]=o;k=(k+1)%d}}
  for(let i=0;i<x.length;i++)x[i]+=wet*y[i];
}
function micColor(x,sr,hp,lpF){let px=0,py=0;const a=1/(1+2*Math.PI*hp/sr);
  for(let i=0;i<x.length;i++){const y=a*(py+x[i]-px);px=x[i];py=y;x[i]=y}
  let l=0;const b=1-Math.exp(-2*Math.PI*lpF/sr);for(let i=0;i<x.length;i++){l+=b*(x[i]-l);x[i]=l}}
function addNoise(x,sr,R,level,kind){
  let b0=0,b1=0,b2=0;
  for(let i=0;i<x.length;i++){const w=R()*2-1;b0=.997*b0+w*.03;b1=.985*b1+w*.03;b2=.95*b2+w*.03;let n=(b0+b1+b2)*level*3;
    if(kind==='hum')n+=level*(.6*Math.sin(2*Math.PI*50*i/sr)+.3*Math.sin(2*Math.PI*100*i/sr)+.2*Math.sin(2*Math.PI*150*i/sr));
    if(kind==='voice'){const t=i/sr,f=140+30*Math.sin(t*3.1);n+=level*2*(Math.sin(t*1.7)>0.2?1:0)*(Math.sin(2*Math.PI*f*t)+.5*Math.sin(4*Math.PI*f*t)+.3*Math.sin(6*Math.PI*f*t))}
    x[i]+=n}}
function render(events,opt={}){
  const sr=opt.sr||48000,R=rng(opt.seed||1),tail=opt.tail??1.2;
  const len=Math.ceil((Math.max(...events.map(e=>e.t+e.dur))+tail)*sr);
  const x=new Float32Array(len);
  for(const e of events)renderNote(x,e,sr,R,opt);
  reverb(x,sr,opt.wet??.18);
  micColor(x,sr,opt.hp??140,opt.lp??7000);
  // niveau final : pic RMS visé
  let mx=0;for(let i=0;i<x.length;i+=256){let s=0;for(let j=i;j<Math.min(i+2048,x.length);j++)s+=x[j]*x[j];mx=Math.max(mx,Math.sqrt(s/2048))}
  const k=(opt.level||.06)/(mx||1);for(let i=0;i<x.length;i++)x[i]*=k;
  addNoise(x,sr,R,opt.noise??.002,opt.noiseKind||'pink');
  return x;
}
module.exports={render,hz,rng};
