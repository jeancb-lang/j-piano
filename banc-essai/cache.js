// met en cache l'audio simulé pour itérer vite
'use strict';const fs=require('fs'),path=require('path');const {render}=require('./synth');
const DIR='/tmp/bench_cache';fs.mkdirSync(DIR,{recursive:true});
function audioFor(s){const f=path.join(DIR,s.id.replace(/[^\w]/g,'_')+'_'+s.opt.seed+'.f32');
  if(fs.existsSync(f)){const b=fs.readFileSync(f);return new Float32Array(b.buffer,b.byteOffset,b.length/4)}
  const a=render(s.events,s.opt);fs.writeFileSync(f,Buffer.from(a.buffer));return a}
module.exports={audioFor};
