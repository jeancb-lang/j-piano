/*DET-BEGIN*/
// ===== Détecteur de notes J Piano =====
// 1) repère l'ATTAQUE d'une note (flux spectral : énergie qui apparaît d'un coup),
// 2) regarde quelles fréquences sont NOUVELLES par rapport à juste avant (ignore les notes qui résonnent encore),
// 3) cherche la note dont la série d'harmoniques explique le mieux ce nouveau son,
// 4) si on sait quelle note est attendue, vérifie surtout celle-là.
class NoteDetector{
  constructor(sr,opt){this.sr=sr;this.P=Object.assign({hop:Math.round(sr/60),onK:1.6,onD:.5,ratio:.62,minIOI:70,anaDelay:2,gate:2.2,fbClar:.93,fbN:6,lo:33,tolK:.004,nWin:600,baseK:1.0,oddK:.15,lowChk:1.0,reK:.08,rePk:.35,reMin:150,wd:.86,norm:.5,oct:.9},opt||{});
    this.N1=2048;this.N2=4096;this.f1=this._fft(this.N1);this.f2=this._fft(this.N2);
    this.w1=this._hann(this.N1);this.w2=this._hann(this.N2);
    this.prevL=[];this.flux=[];this.fluxHist=[];this.spec2=[];this.NR=[];this.pending=[];this.lastOnT=-1e9;this.lastEv=-1;this.lastEvT=-1e9;
    this.cand=-1;this.candN=0;this.fr=0;this.bin2=sr/this.N2;
    const kmax=Math.floor(5200/this.bin2);this.kmax=kmax}
  _hann(n){const w=new Float32Array(n);for(let i=0;i<n;i++)w[i]=.5-.5*Math.cos(2*Math.PI*i/(n-1));return w}
  _fft(n){const lev=Math.log2(n),rev=new Uint32Array(n);for(let i=0;i<n;i++){let r=0;for(let b=0;b<lev;b++)r|=((i>>b)&1)<<(lev-1-b);rev[i]=r}
    const cs=new Float32Array(n/2),sn=new Float32Array(n/2);for(let i=0;i<n/2;i++){cs[i]=Math.cos(2*Math.PI*i/n);sn[i]=-Math.sin(2*Math.PI*i/n)}
    return {n,rev,cs,sn,re:new Float32Array(n),im:new Float32Array(n),mag:new Float32Array(n/2)}}
  _mag(F,x,w){const {n,rev,cs,sn,re,im,mag}=F,off=x.length-n;
    for(let i=0;i<n;i++){const j=rev[i];re[j]=x[off+i]*w[i];im[j]=0}
    for(let s=2;s<=n;s<<=1){const h=s>>1,st=n/s;for(let i=0;i<n;i+=s)for(let k=0;k<h;k++){const t=k*st,a=i+k,b=a+h;
      const tr=re[b]*cs[t]-im[b]*sn[t],ti=re[b]*sn[t]+im[b]*cs[t];re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}
    for(let k=0;k<n/2;k++)mag[k]=Math.hypot(re[k],im[k]);return mag}
  // Hauteur "classique" (MPM) pour les notes jouées sans attaque nette
  _mpm(x){const N=1024,sr=this.sr/2,off=x.length-2048,y=this._ds||(this._ds=new Float32Array(N));
    for(let i=0;i<N;i++)y[i]=.5*(x[off+2*i]+x[off+2*i+1]);
    const maxLag=Math.min(N-2,Math.floor(sr/55)),minLag=Math.floor(sr/2300),sq=this._sq||(this._sq=new Float64Array(N+1));
    for(let i=0;i<N;i++)sq[i+1]=sq[i]+y[i]*y[i];const n=this._ns||(this._ns=new Float32Array(N));
    for(let t=0;t<=maxLag;t++){let r=0;const L=N-t;for(let j=0;j<L;j++)r+=y[j]*y[j+t];const m=sq[L]+sq[N]-sq[t];n[t]=m>0?2*r/m:0}
    let t=1;while(t<=maxLag&&n[t]>0)t++;let best=null,g=0;const pk=[];
    while(t<=maxLag){while(t<=maxLag&&n[t]<=0)t++;let b=-1,bi=-1;while(t<=maxLag&&n[t]>0){if(n[t]>b){b=n[t];bi=t}t++}if(bi>minLag){pk.push([bi,b]);if(b>g)g=b}}
    for(const p of pk)if(p[1]>=.9*g){best=p;break}if(!best)return null;
    const i=best[0],a=n[i-1],b=n[i],c=n[i+1],d=a-2*b+c,T=d?i+.5*(a-c)/d:i;return {m:69+12*Math.log2(sr/T/440),clar:best[1]}}
  // Saillance d'une note dans le spectre "nouveau" D : somme pondérée de ses harmoniques
  _sal(D,m){const f=440*Math.pow(2,(m-69)/12),bh=this.bin2,P=this.P;let s=0,w=1,ws=0;const B=1.2e-4*Math.pow(2,(m-60)/18);
    for(let h=1;h<=24;h++){const fh=h*f*Math.sqrt(1+B*h*h),k=fh/bh;if(k>=this.kmax)break;const tol=Math.max(.6,k*P.tolK);
      let v=0;for(let j=Math.max(1,Math.round(k-tol));j<=Math.round(k+tol);j++)if(D[j]>v)v=D[j];s+=w*v;ws+=w;w*=P.wd}
    return ws?s/Math.pow(ws,P.norm):0}
  // énergie aux harmoniques impaires / paires d'une note (distingue une note de son octave)
  _oe(D,m){const f=440*Math.pow(2,(m-69)/12),bh=this.bin2;let od=0,ev=0;const B=1.2e-4*Math.pow(2,(m-60)/18);
    for(let h=1;h<=8;h++){const k=h*f*Math.sqrt(1+B*h*h)/bh;if(k>=this.kmax)break;const tol=Math.max(.6,k*this.P.tolK);let v=0;
      for(let j=Math.max(1,Math.round(k-tol));j<=Math.round(k+tol);j++)if(D[j]>v)v=D[j];if(h&1)od+=v;else ev+=v}
    return {od,ev}}
  _real(D,m){const q=this._oe(D,m);return q.od>=this.P.oddK*q.ev} // la note a bien ses harmoniques impaires
  _analyse(pend,o){const D=this._D||(this._D=new Float32Array(this.N2/2)),cur=this.spec2[this.spec2.length-1],base=pend.base;
    for(let k=0;k<this.N2/2;k++){const d=cur[k]-this.P.baseK*base[k];D[k]=d>0?d:0}
    const lo=o.lo||this.P.lo,hi=o.hi||100;let best=-1,bs=0;const S=new Float32Array(hi+13);
    for(let m=lo;m<=hi;m++){S[m]=this._sal(D,m);if(S[m]>bs){bs=S[m];best=m}}
    if(bs<=0)return null;
    // erreurs d'octave : préférer la note grave si elle explique aussi bien (fondamentale faible au micro)
    if(best-12>=lo&&S[best-12]>this.P.oct*bs&&this._real(D,best-12)){best-=12;bs=S[best]}
    while(best+12<=hi&&!this._real(D,best)&&S[best+12]>.5*bs){best+=12;bs=S[best]}
    const exp=o.expected;
    if(exp&&exp.length){let pick=null,ps=0;
      for(const e of exp){const cands=o.octFree?[e-24,e-12,e,e+12,e+24]:[e];
        for(const c of cands){if(c<lo||c>hi)continue;const s=S[c];
          // la note attendue doit dominer ses voisines d'un demi-ton
          const nb=Math.max(S[c-1]||0,S[c+1]||0);
          const okOct=o.octFree||(this._real(D,c)&&!(this.P.lowChk&&c-12>=lo&&this._real(D,c-12)&&S[c-12]>this.P.lowChk*s));
          if(s>=this.P.ratio*bs&&s>1.25*nb&&okOct&&s>ps){pick=c;ps=s}}}
      if(pick!==null&&this._restrike(D,base,pick,pend.t))return {m:pick,via:'cible',conf:ps/bs};if(pick!==null)return null}
    if(!this._restrike(D,base,best,pend.t))return null;
    return {m:best,via:'attaque',conf:1}}
  // même note que la précédente : il faut une vraie nouvelle frappe (l'énergie de la note remonte nettement)
  _restrike(D,base,m,t){if(!this.P.reK||((m-this.lastEv)%12+12)%12!==0||t-this.lastEvT>1500)return true;
    if(t-this.lastEvT<this.P.reMin)return false;
    const cur=this.spec2[this.spec2.length-1],sc=this._sal(cur,m),nb=this._sal(base,m);
    // vraie nouvelle frappe : l'énergie de la note revient près de celle de la frappe précédente, et elle augmente
    return sc>=this.P.rePk*(this.lastPk||0)&&(nb<=0||this._sal(D,m)>=this.P.reK*nb)}
  process(x,t,o){o=o||{};const ev=[];this.fr++;
    // niveau et bruit de fond
    let rms=0;for(let i=x.length-2048;i<x.length;i++)rms+=x[i]*x[i];rms=Math.sqrt(rms/2048);
    this.NR.push(rms);if(this.NR.length>this.P.nWin)this.NR.shift();let noise=Infinity;for(const v of this.NR)if(v<noise)noise=v;
    const TH=Math.max(o.calTH||0,.0009,noise*this.P.gate);this.rms=rms;this.TH=TH;
    // flux spectral (attaques)
    const M1=this._mag(this.f1,x,this.w1),L=new Float32Array(M1.length);for(let k=0;k<L.length;k++)L[k]=Math.log1p(M1[k]*400);
    let fl=0;const p1=this.prevL[this.prevL.length-1],p2=this.prevL[this.prevL.length-2];
    if(p1){const kx=Math.min(L.length,Math.floor(6000/(this.sr/this.N1)));for(let k=2;k<kx;k++){const r=p2?Math.max(p1[k],p2[k]):p1[k];const d=L[k]-r;if(d>0)fl+=d}}
    this.prevL.push(L);if(this.prevL.length>3)this.prevL.shift();
    this.flux.push(fl);if(this.flux.length>3)this.flux.shift();
    const sorted=this.fluxHist.slice().sort((a,b)=>a-b),med=sorted.length?sorted[sorted.length>>1]:fl;
    this.fluxHist.push(fl);if(this.fluxHist.length>40)this.fluxHist.shift();
    // spectre fin (4096) gardé quelques images pour la comparaison avant/après
    const M2=this._mag(this.f2,x,this.w2);this.spec2.push(Float32Array.from(M2));if(this.spec2.length>8)this.spec2.shift();
    // pic de flux à l'image précédente = attaque
    const [a,b,c]=this.flux.length===3?this.flux:[0,0,0];
    const thr=med*this.P.onK+this.P.onD;
    // attaque ; une attaque nettement plus forte juste après une fausse (bruit) passe quand même
    if(b>thr&&b>=a&&b>c&&rms>TH*.8&&(t-this.lastOnT>this.P.minIOI||b>1.4*(this.lastOnF||0))){this.lastOnT=t;this.lastOnF=b;
      const base=this.spec2[Math.max(0,this.spec2.length-1-(1+this.P.anaDelay+1))];
      this.pending.push({due:this.fr+this.P.anaDelay,base,t})}
    // analyse des attaques en attente
    for(let i=this.pending.length-1;i>=0;i--){const p=this.pending[i];if(this.fr<p.due)continue;this.pending.splice(i,1);
      const r=this._analyse(p,o);if(r){ev.push(r);this.lastEv=r.m;this.lastEvT=t;this.lastPk=this._sal(this.spec2[this.spec2.length-1],r.m)}}
    // secours : note tenue sans attaque nette (MPM stable)
    if(rms>TH*1.5&&!this.pending.length){const q=this._mpm(x);
      if(q&&q.clar>this.P.fbClar){const m=Math.round(q.m);if(m===this.cand)this.candN++;else{this.cand=m;this.candN=1}
        if(this.candN===this.P.fbN&&m!==this.lastEv&&t-this.lastEvT>250&&t-this.lastOnT>250){
          let mm=m;const exp=o.expected;if(exp&&exp.length&&o.octFree){for(const e of exp)if(((e-m)%12+12)%12===0)mm=e}
          ev.push({m:mm,via:'tenue',conf:q.clar});this.lastEv=m;this.lastEvT=t}}
      else this.candN=0}
    else if(rms<TH)this.candN=0;
    // niveau de chaque note tenue (pour savoir si la touche est encore enfoncée)
    let hold=null;if(o.hold&&o.hold.length){const cur=this.spec2[this.spec2.length-1];hold=o.hold.map(m=>this._sal(cur,m))}
    return {events:ev,rms,TH,hold}}
}
/*DET-END*/
if(typeof module!=='undefined')module.exports={NoteDetector};
