'use strict';
const $=id=>document.getElementById(id);
const {SUBJECTS,SICON,SHUE,DIFFNAME,stream}=EduQ;
const GAME='goalfall';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const easeOut=t=>1-Math.pow(1-t,3);
const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const RM=matchMedia('(prefers-reduced-motion: reduce)');let reduced=RM.matches;
try{RM.addEventListener('change',e=>{reduced=e.matches})}catch(e){}
const FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}

/* ======================= SETTINGS ======================= */
const MODES=[{id:'p10',name:'10 shots',kind:'p',n:10},{id:'p20',name:'20 shots',kind:'p',n:20},{id:'t60',name:'60 sec',kind:'t',n:60},{id:'t90',name:'90 sec',kind:'t',n:90}];
/* invented club colours only. keeper: always a contrasting kit with gloves */
const KITS=[
 {id:'ruby',name:'Red stripes',style:'stripes',shirt:'#d7263d',second:'#ffffff',trim:'#ffffff',shorts:'#191c24',socks:'#d7263d',number:'10',numColor:'#191c24',
  gk:{style:'plain',shirt:'#ffd23f',trim:'#191c24',shorts:'#191c24',socks:'#ffd23f',gloves:'#f4f4f4',number:'1',numColor:'#191c24'}},
 {id:'ocean',name:'Blue hoops',style:'hoops',shirt:'#1b4db3',second:'#ffffff',trim:'#ffffff',shorts:'#ffffff',socks:'#1b4db3',number:'7',numColor:'#ffffff',
  gk:{style:'plain',shirt:'#ff7a1a',trim:'#1b1f2a',shorts:'#1b1f2a',socks:'#ff7a1a',gloves:'#ffffff',number:'1',numColor:'#1b1f2a'}},
 {id:'sunset',name:'Orange halves',style:'halves',shirt:'#ff7f11',second:'#1f2a44',trim:'#ffffff',shorts:'#1f2a44',socks:'#ff7f11',number:'9',numColor:'#ffffff',
  gk:{style:'plain',shirt:'#36c3f0',trim:'#0f2233',shorts:'#0f2233',socks:'#36c3f0',gloves:'#ffd23f',number:'1',numColor:'#0f2233'}},
 {id:'violet',name:'Purple sash',style:'sash',shirt:'#f4f4f6',second:'#6a3fc4',trim:'#6a3fc4',shorts:'#6a3fc4',socks:'#f4f4f6',number:'8',numColor:'#6a3fc4',
  gk:{style:'plain',shirt:'#b7f34a',trim:'#23301a',shorts:'#23301a',socks:'#b7f34a',gloves:'#23301a',number:'1',numColor:'#23301a'}},
 {id:'forest',name:'Green & gold',style:'plain',shirt:'#1f7a4a',second:'#f2c14e',trim:'#f2c14e',shorts:'#ffffff',socks:'#1f7a4a',number:'11',numColor:'#f2c14e',
  gk:{style:'plain',shirt:'#e23b4a',trim:'#1a1a1a',shorts:'#1a1a1a',socks:'#e23b4a',gloves:'#ffffff',number:'1',numColor:'#ffffff'}}];
const BALLS=[{id:'classic',name:'Classic'},{id:'swirl',name:'Swirl'},{id:'neon',name:'Neon'},{id:'starry',name:'Starry'}];
const cfg={subject:'english',topic:'irregular',diffs:{},mode:'p10',kit:'ruby',ball:'classic'};
try{const s=JSON.parse(localStorage.getItem('goalfall-cfg')||'{}');for(const k of Object.keys(cfg))if(s[k]!=null)cfg[k]=s[k]}catch(e){}
const saveCfg=()=>{try{localStorage.setItem('goalfall-cfg',JSON.stringify(cfg))}catch(e){}};
/* settings from the portal live here and are never written to cfg (contract: don't save over the player's own) */
let ov=null;
const curSubject=()=>{const id=ov?ov.subject:cfg.subject;return SUBJECTS.find(s=>s.id===id)||SUBJECTS[0]};
const curTopic=()=>{const s=curSubject(),id=ov?ov.topic:cfg.topic;return s.topics.find(t=>t.id===id)||s.topics[0]};
const topicDiff=tp=>cfg.diffs[tp.id]||tp.d;
const DIFF=()=>ov?(ov.level||curTopic().d):topicDiff(curTopic());
const MODE=()=>MODES.find(m=>m.id===(ov&&ov.mode?ov.mode:cfg.mode))||MODES[0];
const curKit=()=>KITS.find(k=>k.id===cfg.kit)||KITS[0];
const curBall=()=>BALLS.find(b=>b.id===cfg.ball)||BALLS[0];
const bestKey=(id,d,m)=>`goalfall-best-${id||curTopic().id}-d${d||DIFF()}-${m||MODE().id}`;
const getBest=(id,d,m)=>{try{return +localStorage.getItem(bestKey(id,d,m))||0}catch(e){return 0}};
function logResult(r){
  try{const k='edu-results',a=JSON.parse(localStorage.getItem(k)||'[]');a.push(r);localStorage.setItem(k,JSON.stringify(a.slice(-200)))}catch(e){}
  try{if(window.parent&&window.parent!==window)window.parent.postMessage({type:'edu-result',result:r},'*')}catch(e){}
}

/* ======================= AUDIO (synthesised, no files) ======================= */
const A={on:true,ctx:null,master:null,noise:null,amb:null,ambG:null};
try{const s=JSON.parse(localStorage.getItem('goalfall-audio')||'{}');if(s.on===false)A.on=false}catch(e){}
function au(){
  if(A.ctx)return A.ctx;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  try{A.ctx=new C()}catch(e){return null}
  const c=A.ctx;A.master=c.createGain();A.master.gain.value=A.on?.9:0;A.master.connect(c.destination);
  const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);
  let b0=0,b1=0,b2=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=.997*b0+w*.029591;b1=.985*b1+w*.032534;b2=.95*b2+w*.048056;d[i]=(b0+b1+b2+w*.1)*.9}
  A.noise=b;
  // stadium murmur
  const src=c.createBufferSource();src.buffer=b;src.loop=true;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=650;f.Q.value=.6;
  A.ambG=c.createGain();A.ambG.gain.value=.05;src.connect(f).connect(A.ambG).connect(A.master);src.start();
  return c}
function unlock(){const c=au();if(c&&c.state==='suspended')c.resume()}
addEventListener('pointerdown',unlock,{passive:true});addEventListener('keydown',unlock);
function nz(t0,dur,type,freq,q,gain,attack,f2){const c=A.ctx;if(!c)return;const s=c.createBufferSource();s.buffer=A.noise;
  const f=c.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(freq,t0);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t0+dur);f.Q.value=q;
  const g=c.createGain();g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(gain,t0+(attack||.005));g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  s.connect(f).connect(g).connect(A.master);s.start(t0,Math.random()*1.5);s.stop(t0+dur+.05)}
function tone(t0,dur,type,f1,f2,gain,attack){const c=A.ctx;if(!c)return;const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f1,t0);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+dur);const g=c.createGain();g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(gain,t0+(attack||.004));g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);o.connect(g).connect(A.master);o.start(t0);o.stop(t0+dur+.05)}
const S={
  kick(){const c=au();if(!c)return;const t=c.currentTime;tone(t,.16,'sine',160,42,.9);nz(t,.05,'highpass',1800,.7,.35);nz(t,.12,'lowpass',500,.7,.3)},
  net(){const c=au();if(!c)return;const t=c.currentTime;nz(t,.42,'bandpass',2600,.8,.32,.01,700);tone(t,.12,'sine',90,60,.25)},
  board(){const c=au();if(!c)return;const t=c.currentTime;tone(t,.08,'triangle',520,300,.25);nz(t,.06,'bandpass',1200,2,.2)},
  glove(){const c=au();if(!c)return;const t=c.currentTime;tone(t,.1,'sine',230,110,.5);nz(t,.07,'bandpass',900,1.2,.35)},
  cheer(big){const c=au();if(!c)return;const t=c.currentTime,dur=big?3:2.4;
    nz(t,dur,'bandpass',1100,.7,big?.5:.4,.18);nz(t+.05,dur*.8,'bandpass',2400,.9,.18,.25);
    for(let i=0;i<(big?26:16);i++)nz(t+.2+Math.random()*1.6,.05,'bandpass',1500+Math.random()*1500,1.5,.12);
    if(A.ambG){A.ambG.gain.cancelScheduledValues(t);A.ambG.gain.setValueAtTime(.05,t);A.ambG.gain.linearRampToValueAtTime(.12,t+.3);A.ambG.gain.linearRampToValueAtTime(.05,t+dur)}},
  ooh(){const c=au();if(!c)return;const t=c.currentTime;nz(t,1.3,'bandpass',520,2.2,.35,.15,300);nz(t,1.1,'bandpass',900,1.5,.12,.2,500)},
  whistle(n){const c=au();if(!c)return;let t=c.currentTime+.02;(n||[.28]).forEach(d=>{
    [2650,2710].forEach(f=>{const o=c.createOscillator();o.type='sine';o.frequency.value=f;const lfo=c.createOscillator();lfo.frequency.value=32;
      const lg=c.createGain();lg.gain.value=.06;const g=c.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.02);
      g.gain.setValueAtTime(.12,t+d-.04);g.gain.exponentialRampToValueAtTime(0.0001,t+d);lfo.connect(lg).connect(g.gain);o.connect(g).connect(A.master);
      o.start(t);lfo.start(t);o.stop(t+d+.05);lfo.stop(t+d+.05)});t+=d+.12})},
  streak(){const c=au();if(!c)return;const t=c.currentTime;[523,659,784,1047].forEach((f,i)=>tone(t+i*.07,.22,'triangle',f,0,.22))},
  step(){const c=au();if(!c)return;const t=c.currentTime;[0,.16].forEach(o=>{tone(t+o,.07,'sine',140,70,.25);nz(t+o,.05,'lowpass',500,.7,.18)})},
  tap(){const c=au();if(!c)return;tone(c.currentTime,.05,'triangle',700,500,.12)},
  bounce(s){const c=au();if(!c)return;const t=c.currentTime,g=Math.min(.5,.08+s*.06);tone(t,.09,'sine',120,60,g);nz(t,.04,'lowpass',700,.7,g*.5)},
  post(s){const c=au();if(!c)return;const t=c.currentTime;[880,1320,2210].forEach((f,i)=>tone(t,1.1-i*.25,'sine',f,f*.98,.18/(i+1),.002));nz(t,.03,'highpass',3000,.7,.3)}
};
function setSound(on){A.on=on;if(A.master)A.master.gain.value=on?.9:0;try{localStorage.setItem('goalfall-audio',JSON.stringify({on}))}catch(e){}paintAudio()}
function paintAudio(){['mute','sndT','sndT2'].forEach(id=>$(id).setAttribute('aria-pressed',A.on))}
$('mute').onclick=()=>{unlock();setSound(!A.on)};$('sndT').onclick=$('sndT2').onclick=()=>{unlock();setSound(!A.on)};


/* ======================= RENDERER (physically based, ACES tone mapping, real shadows) ======================= */
const V3=THREE.Vector3;
const R=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
const SMALL=Math.min(screen.width,screen.height)<600;
let DPR=Math.min(devicePixelRatio||1,SMALL?2:1.75);R.setPixelRatio(DPR);
R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
R.domElement.id='gl';document.body.prepend(R.domElement);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(38,1,.1,900);
/* keep it smooth on mid-range phones: if frames run slow, render at a lower resolution, then drop soft shadows (the UI stays sharp) */
const perf={n:0,sum:0,done:false,step:0};
function perfSample(dt){if(perf.done||document.hidden||state==='menu')return;perf.n++;perf.sum+=dt;if(perf.n<90)return;const avg=perf.sum/perf.n;perf.n=0;perf.sum=0;
  if(avg>1/45){if(DPR>1){DPR=Math.max(1,DPR-.35);R.setPixelRatio(DPR);R.setSize(innerWidth,innerHeight)}
    else if(perf.step===0){perf.step=1;sun.shadow.mapSize.set(1024,1024);sun.shadow.map&&sun.shadow.map.dispose();sun.shadow.map=null;R.shadowMap.type=THREE.PCFShadowMap}
    else perf.done=true}else if(avg<=1/56)perf.done=true}
function canvasTex(w,h,draw,srgb){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);
  t.anisotropy=Math.min(8,R.capabilities.getMaxAnisotropy());if(srgb!==false)t.colorSpace=THREE.SRGBColorSpace;return t}
const std=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));
const bas=(c,o)=>new THREE.MeshBasicMaterial(Object.assign({color:c},o||{}));
const rnd=(a,b)=>a+Math.random()*(b-a);

/* ======================= WORLD SIZES (real football dimensions, metres) ======================= */
const GW=7.32,GH=2.44,POST=.06,BR=.11,NDT=.85,NDB=2.0;
const SPOT=new V3(0,BR,11);
const BX=[-GW/3,0,GW/3];
/* answer boards: three signs standing on the crossbar, one over each third of the goal */
const SW=2.36,SH=1.32,SY=GH+.14;
const ZCOL=['#2f9bff','#a45cff','#ff9824'];/* zone colours: 1 blue, 2 purple, 3 orange */

/* ======================= SKY, SUN, ENVIRONMENT LIGHT ======================= */
const sky=new Sky();sky.scale.setScalar(4000);
{const u=sky.material.uniforms;u.turbidity.value=2.2;u.rayleigh.value=2.4;u.mieCoefficient.value=.003;u.mieDirectionalG.value=.8}
const SUN_DIR=new V3(.42,.62,.66).normalize();sky.material.uniforms.sunPosition.value.copy(SUN_DIR);
{const pm=new THREE.PMREMGenerator(R),es=new THREE.Scene();es.add(sky);scene.environment=pm.fromScene(es,.03).texture;pm.dispose()}
scene.add(sky);scene.environmentIntensity=.55;
scene.fog=new THREE.Fog(0xc9dcef,90,420);
const sun=new THREE.DirectionalLight(0xfff1dc,2.7);sun.castShadow=true;
sun.shadow.mapSize.set(SMALL?1024:2048,SMALL?1024:2048);
{const c=sun.shadow.camera;c.left=-11;c.right=11;c.top=15;c.bottom=-15;c.near=5;c.far=120}
sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.radius=3;
sun.target.position.set(0,0,6);sun.position.copy(sun.target.position).addScaledVector(SUN_DIR,60);scene.add(sun,sun.target);
scene.add(new THREE.HemisphereLight(0xd6e8ff,0x3f5f2a,.55));

/* ======================= PITCH: grain texture + mowing stripes in the shader ======================= */
const grassTex=canvasTex(512,512,(x,w,h)=>{x.fillStyle='#4f8f2f';x.fillRect(0,0,w,h);
  for(let i=0;i<26000;i++){const g=90+Math.random()*70|0,r=50+Math.random()*40|0,b=20+Math.random()*30|0;x.strokeStyle=`rgba(${r},${g+40},${b},${.25+Math.random()*.4})`;
    const px=Math.random()*w,py=Math.random()*h,l=2+Math.random()*5,a=-Math.PI/2+(Math.random()-.5)*.9;x.lineWidth=.6+Math.random()*.8;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}});
grassTex.wrapS=grassTex.wrapT=THREE.RepeatWrapping;grassTex.repeat.set(70,70);
const grassRough=canvasTex(256,256,(x,w,h)=>{const d=x.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const v=200+Math.random()*55;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0)},false);
grassRough.wrapS=grassRough.wrapT=THREE.RepeatWrapping;grassRough.repeat.set(140,140);
const pitchM=std(0xffffff,{map:grassTex,roughnessMap:grassRough,roughness:1});
pitchM.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWp;')
   .replace('#include <map_fragment>','#include <map_fragment>\nfloat st=step(.5,fract(vWp.z/11.0));float wear=smoothstep(2.2,0.,length(vWp.xz-vec2(0.,11.)))*.25+smoothstep(1.2,0.,abs(vWp.z-.4))*smoothstep(4.,0.,abs(vWp.x))*.18;\ndiffuseColor.rgb*=mix(.86,1.08,st);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.42,.38,.26),wear);')};
const pitch=new THREE.Mesh(new THREE.PlaneGeometry(160,140),pitchM);pitch.rotation.x=-Math.PI/2;pitch.position.z=20;pitch.receiveShadow=true;scene.add(pitch);
const lineM=std(0xf3f5f2,{roughness:.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
function line(x,z,w,d){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),lineM);m.rotation.x=-Math.PI/2;m.position.set(x,.004,z);m.receiveShadow=true;scene.add(m)}
const LW=.12;line(0,0,68,LW);line(0,5.5,18.32,LW);line(-9.16,2.75,LW,5.5);line(9.16,2.75,LW,5.5);line(0,16.5,40.32,LW);line(-20.16,8.25,LW,16.5);line(20.16,8.25,LW,16.5);
{const m=new THREE.Mesh(new THREE.CircleGeometry(.11,24),lineM);m.rotation.x=-Math.PI/2;m.position.set(0,.005,SPOT.z);scene.add(m);
 const a=Math.acos(5.5/9.15),g=new THREE.RingGeometry(9.15-LW/2,9.15+LW/2,64,1,Math.PI/2-a,2*a),r=new THREE.Mesh(g,lineM);r.rotation.x=-Math.PI/2;r.position.set(0,.004,SPOT.z);r.rotation.z=Math.PI;scene.add(r)}

/* ======================= GOAL FRAME ======================= */
const postM=std(0xffffff,{roughness:.32});
{const pg=new THREE.CylinderGeometry(POST,POST,GH+POST,20);[-1,1].forEach(s=>{const p=new THREE.Mesh(pg,postM);p.position.set(s*(GW/2+POST),(GH+POST)/2,0);p.castShadow=true;scene.add(p)});
 const bar=new THREE.Mesh(new THREE.CylinderGeometry(POST,POST,GW+POST*4,20),postM);bar.rotation.z=Math.PI/2;bar.position.set(0,GH+POST,0);bar.castShadow=true;scene.add(bar);
 const sm=std(0x8b939e,{roughness:.5,metalness:.4}),sg=new THREE.CylinderGeometry(.022,.022,1,8);
 const strut=(a,b)=>{const m=new THREE.Mesh(sg,sm);const d=b.clone().sub(a);m.scale.y=d.length();m.position.copy(a).add(b).multiplyScalar(.5);
   m.quaternion.setFromUnitVectors(new V3(0,1,0),d.normalize());m.castShadow=true;scene.add(m)};
 [-1,1].forEach(s=>{const x=s*(GW/2+POST);strut(new V3(x,GH+POST,-.05),new V3(x,GH-.12,-NDT));strut(new V3(x,GH-.12,-NDT),new V3(x,0,-NDB))});
 strut(new V3(-GW/2,0.02,-NDB),new V3(GW/2,0.02,-NDB))}

/* ======================= NET: a real cloth (verlet), the ball pushes into it ======================= */
const netAlpha=canvasTex(64,64,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);x.strokeStyle='#fff';x.lineWidth=4;
  x.beginPath();x.moveTo(0,h/2);x.lineTo(w/2,0);x.lineTo(w,h/2);x.lineTo(w/2,h);x.closePath();x.stroke()},false);
netAlpha.wrapS=netAlpha.wrapT=THREE.RepeatWrapping;
const CELL=.13;
function netMat(rx,ry){const t=netAlpha.clone();t.needsUpdate=true;t.repeat.set(rx,ry);return std(0xffffff,{alphaMap:t,transparent:true,depthWrite:false,side:THREE.DoubleSide,roughness:1,opacity:.95})}
const NX=34,NY=20,cloth={p:[],q:[],pin:[],rest:[],c:[]};
{const pts=[];for(let j=0;j<=NY;j++){const v=j/NY;let y,z;
   if(v<.3){const u=v/.3;y=GH+POST-(.12)*u;z=-NDT*u}else{const u=(v-.3)/.7;y=(GH-.12)*(1-u);z=-NDT-(NDB-NDT)*u}
   for(let i=0;i<=NX;i++){const x=-GW/2-POST+(GW+2*POST)*i/NX;const p=new V3(x,y,z);cloth.p.push(p);cloth.q.push(p.clone());cloth.rest.push(p.clone());cloth.pin.push(j===0||j===NY||i===0||i===NX)}}
 const id=(i,j)=>j*(NX+1)+i;for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){if(i<NX)cloth.c.push([id(i,j),id(i+1,j),0]);if(j<NY)cloth.c.push([id(i,j),id(i,j+1),0])}
 cloth.c.forEach(c=>c[2]=cloth.p[c[0]].distanceTo(cloth.p[c[1]]))}
const netGeo=new THREE.PlaneGeometry(1,1,NX,NY);
{const uv=netGeo.attributes.uv;for(let k=0;k<uv.count;k++){uv.setXY(k,uv.getX(k),1-uv.getY(k))}}
const netBack=new THREE.Mesh(netGeo,netMat((GW)/CELL,(NDB+GH)/CELL));netBack.frustumCulled=false;netBack.castShadow=true;scene.add(netBack);
function writeNet(){const a=netGeo.attributes.position.array;for(let k=0;k<cloth.p.length;k++){const p=cloth.p[k];a[k*3]=p.x;a[k*3+1]=p.y;a[k*3+2]=p.z}
  netGeo.attributes.position.needsUpdate=true;netGeo.computeVertexNormals()}
/* PlaneGeometry vertices run top row first, left to right, same order as the cloth grid */
writeNet();
[-1,1].forEach(s=>{const g=new THREE.BufferGeometry(),x=s*(GW/2+POST);
  g.setAttribute('position',new THREE.Float32BufferAttribute([x,GH+POST,0, x,GH-.12,-NDT, x,0,-NDB, x,0,0],3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute([0,GH/CELL, NDT/CELL,(GH-.12)/CELL, NDB/CELL,0, 0,0],2));g.setIndex([0,1,3,1,2,3]);g.computeVertexNormals();
  const m=new THREE.Mesh(g,netMat(1,1));m.material.alphaMap.repeat.set(1,1);scene.add(m)});
let netActive=0;
function stepCloth(h){if(netActive<=0)return;netActive-=h;const P=cloth.p,Qp=cloth.q,damp=.985,g=-9.81*h*h;
  for(let k=0;k<P.length;k++){if(cloth.pin[k])continue;const p=P[k],q=Qp[k];const vx=(p.x-q.x)*damp,vy=(p.y-q.y)*damp,vz=(p.z-q.z)*damp;q.copy(p);p.x+=vx;p.y+=vy+g;p.z+=vz;
    // a little pull back to its hanging shape so it settles like a real net
    p.lerp(cloth.rest[k],.012)}
  for(let it=0;it<6;it++){for(const [a,b,L] of cloth.c){const pa=P[a],pb=P[b];const dx=pb.x-pa.x,dy=pb.y-pa.y,dz=pb.z-pa.z,d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-6;
      if(d<=L)continue;const f=(d-L)/d*.5,fa=cloth.pin[a]?0:(cloth.pin[b]?2:1),fb=cloth.pin[b]?0:(cloth.pin[a]?2:1);
      pa.x+=dx*f*fa;pa.y+=dy*f*fa;pa.z+=dz*f*fa;pb.x-=dx*f*fb;pb.y-=dy*f*fb;pb.z-=dz*f*fb}
    if(ballInNet())collideNet()}
  for(let k=0;k<P.length;k++){const p=P[k];if(p.y<.01)p.y=.01}
  writeNet()}
const ballInNet=()=>B.p.z<.3&&Math.abs(B.p.x)<GW/2+.4&&B.p.y<GH+.4;
let netTouch=0;
function collideNet(){const P=cloth.p,r=BR+.035,c=B.p;let n=0;
  for(let k=0;k<P.length;k++){if(cloth.pin[k])continue;const p=P[k];const dx=p.x-c.x,dy=p.y-c.y,dz=p.z-c.z,d2=dx*dx+dy*dy+dz*dz;
    if(d2<r*r){const d=Math.sqrt(d2)||1e-6,k2=(r-d)/d;p.x+=dx*k2;p.y+=dy*k2;p.z+=dz*k2;n++}}
  netTouch=n}

/* ======================= ANSWER SIGNS on the crossbar (HTML text sits on top, see #boards) ======================= */
const boards=BX.map((x,i)=>{const g=new THREE.Group();g.position.set(x,SY,-.02);scene.add(g);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(SW+.16,SH+.16,.1),std(0x0b1222,{roughness:.45,metalness:.4}));frame.position.y=SH/2;frame.castShadow=true;g.add(frame);
  /* glowing LED rim in the zone colour */
  const rimM=std(0x000000,{emissive:new THREE.Color(ZCOL[i]),emissiveIntensity:2.2,toneMapped:true});
  [[SW+.12,.05,0,SH+.04],[SW+.12,.05,0,-.04],[.05,SH+.12,-SW/2-.04,SH/2],[.05,SH+.12,SW/2+.04,SH/2]].forEach(([w,h,x2,y2])=>{const r=new THREE.Mesh(new THREE.BoxGeometry(w,h,.11),rimM);r.position.set(x2,y2===SH/2?SH/2:y2,0);g.add(r)});
  const faceM=std(0xffffff,{roughness:.55,emissive:0xffffff,emissiveIntensity:.32});const face=new THREE.Mesh(new THREE.PlaneGeometry(SW,SH),faceM);face.position.set(0,SH/2,.056);g.add(face);
  const lm=std(0x5c6470,{metalness:.5,roughness:.4}),lg=new THREE.CylinderGeometry(.03,.03,SY-GH+.04,8);[-1,1].forEach(s=>{const l=new THREE.Mesh(lg,lm);l.position.set(s*SW*.36,-(SY-GH)/2+.02,0);g.add(l)});
  /* result panel: flat, untoned colour so green / red read at full strength */
  const resM=new THREE.MeshBasicMaterial({color:0x16a34a,toneMapped:false,transparent:true,opacity:0});const res=new THREE.Mesh(new THREE.PlaneGeometry(SW,SH),resM);res.position.set(0,SH/2,.062);g.add(res);
  return{g,faceM,rimM,resM,wob:0,i}});
function boardTint(i,kind){const b=boards[i],m=b.faceM;
  /* solid result colours: bright green for the right answer, strong red for a wrong pick */
  m.color.set(0xffffff);m.emissive.set(0xffffff);m.emissiveIntensity=.32;b.resM.color.set(kind==='right'?0x14a44d:0xdc2f36);b.resM.opacity=kind?1:0;
  b.rimM.emissive.set(kind==='right'?'#3dff8a':kind==='wrong'?'#ff5a5a':ZCOL[i]);b.rimM.emissiveIntensity=kind?3.6:2.2;if(kind)b.pop=1}
function hitBoard(i,v){boards[i].wob=v}
function stepBoards(dt){boards.forEach((b,i)=>{b.wob*=Math.exp(-dt*5);b.g.rotation.z=Math.sin(t*28)*b.wob*.01;
    if(b.pop>0){b.pop=Math.max(0,b.pop-dt*2.2);const u=1-b.pop,s=1+Math.sin(Math.min(1,u*1.6)*Math.PI)*.1*(reduced?0:1);b.g.scale.set(s,s,1)}else b.g.scale.set(1,1,1);if(state==='aim')b.rimM.emissiveIntensity=aimZone===i?4.5:2.2+Math.sin(t*3+i)*.4})}
/* target glow on the goal mouth while aiming */
const tgtTex=canvasTex(128,128,(x)=>{const g=x.createRadialGradient(64,64,10,64,64,62);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.72,'rgba(255,255,255,.0)');g.addColorStop(.8,'rgba(255,255,255,.9)');g.addColorStop(.9,'rgba(255,255,255,.0)');x.fillStyle=g;x.fillRect(0,0,128,128)});
const targets=BX.map(x=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),bas(0x7fe3ff,{map:tgtTex,transparent:true,depthWrite:false,opacity:0,toneMapped:false}));m.position.set(x,1.2,-.35);scene.add(m);return m});
let aimZone=-1;

/* ======================= STADIUM: concrete tiers, plastic seats, roof, floodlights, LED boards ======================= */
const concM=std(0xb9bec6,{roughness:.95}),concD=std(0x8e959f,{roughness:.95});
const stand=new THREE.Group();scene.add(stand);
const ROWS=16,RH=.42,RD=.82;
function standBlock(len,cx,cz,ry,dist){const g=new THREE.Group();g.position.set(cx,0,cz);g.rotation.y=ry;stand.add(g);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(len,1.2,.3),concD);wall.position.set(0,.6,0);wall.receiveShadow=true;g.add(wall);
  for(let r=0;r<ROWS;r++){const m=new THREE.Mesh(new THREE.BoxGeometry(len,RH,RD),r%2?concM:concD);m.position.set(0,1.2+r*RH-RH/2,-.3-RD/2-r*RD);m.receiveShadow=true;g.add(m)}
  const topY=1.2+ROWS*RH,backZ=-.3-ROWS*RD;
  const back=new THREE.Mesh(new THREE.BoxGeometry(len,7,.4),concD);back.position.set(0,topY+2.2,backZ-.2);g.add(back);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(len,.35,ROWS*RD+4),std(0x4b5563,{roughness:.6,metalness:.5}));roof.position.set(0,topY+6.2,backZ/2+1.4);roof.castShadow=true;g.add(roof);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(len,.7,.25),std(0xe8ebef,{roughness:.5}));edge.position.set(0,topY+6.0,3.3);g.add(edge);
  for(let x=-len/2+6;x<len/2;x+=12){const c=new THREE.Mesh(new THREE.BoxGeometry(.35,6.4,.35),std(0x9aa3ad,{metalness:.5,roughness:.4}));c.position.set(x,topY+2.9,backZ+.4);g.add(c)}
  return{g,len,topY,backZ}}
const STANDS=[standBlock(120,0,-6.5,0),standBlock(64,-28,22,Math.PI/2),standBlock(64,28,22,-Math.PI/2)];
/* seats + crowd: instanced; seats colour pattern, fans in many shirt colours, bobbing in the vertex shader */
const SEATS=[];
STANDS.forEach((s,si)=>{for(let r=0;r<ROWS;r++)for(let x=-s.len/2+.6;x<s.len/2-.6;x+=.52){
  const lp=new V3(x,1.2+r*RH,-.3-RD*.35-r*RD),wp=lp.applyAxisAngle(new V3(0,1,0),s.g.rotation.y).add(s.g.position);SEATS.push({p:wp,ry:s.g.rotation.y,home:si===0&&Math.abs(x)<16,r})}});
const NS=SEATS.length,seatG=new THREE.BoxGeometry(.44,.42,.4);seatG.translate(0,.21,0);
const seatM=new THREE.InstancedMesh(seatG,std(0xffffff,{roughness:.5}),NS);
const crowdU={uT:{value:0},uA:{value:.03}};
function crowdMat(o){const m=std(0xffffff,Object.assign({roughness:.85},o||{}));m.onBeforeCompile=sh=>{sh.uniforms.uT=crowdU.uT;sh.uniforms.uA=crowdU.uA;
  sh.vertexShader='attribute vec2 aPh;\nuniform float uT;\nuniform float uA;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat jmp=max(0.,sin(uT*aPh.y+aPh.x));transformed.y+=jmp*uA;')};return m}
const FANS=SEATS.filter(s=>Math.random()<(s.home?.92:.72)),NF=FANS.length;
/* a seated fan: body (torso, arms, thighs) + head, two instanced meshes */
function fanBody(){const parts=[];const add=(g,x,y,z)=>{g.translate(x,y,z);parts.push(g.toNonIndexed())};
  add(new THREE.CylinderGeometry(.16,.19,.56,8),0,.64,0);add(new THREE.CylinderGeometry(.05,.05,.48,6),-.23,.62,.05);add(new THREE.CylinderGeometry(.05,.05,.48,6),.23,.62,.05);
  add(new THREE.CylinderGeometry(.075,.075,.42,6).rotateX(Math.PI/2),-.09,.38,.2);add(new THREE.CylinderGeometry(.075,.075,.42,6).rotateX(Math.PI/2),.09,.38,.2);
  return BufferGeometryUtils.mergeGeometries(parts)}
const fBody=fanBody(),fHead=new THREE.SphereGeometry(.12,10,8);fHead.translate(0,1.06,.02);
const fans=new THREE.InstancedMesh(fBody,crowdMat(),NF),heads=new THREE.InstancedMesh(fHead,crowdMat({roughness:.6}),NF);
{const m=new THREE.Matrix4(),q=new THREE.Quaternion(),one=new V3(1,1,1),col=new THREE.Color(),ph=new Float32Array(NF*2);
 const SKIN=[0xf1c9a5,0xe0ac7e,0xc68642,0x8d5524,0xffdbac,0xa86b3c,0x6b4423];
 SEATS.forEach((s,i)=>{q.setFromAxisAngle(new V3(0,1,0),s.ry);m.compose(s.p,q,one);seatM.setMatrixAt(i,m);col.set(((i*13)%41)<3?0xe6e9ee:(s.r%8<4?0x1e5fd6:0x1a4fb8));seatM.setColorAt(i,col)});
 FANS.forEach((s,i)=>{q.setFromAxisAngle(new V3(0,1,0),s.ry+rnd(-.15,.15));m.compose(new V3(s.p.x,s.p.y+.05,s.p.z),q,new V3(1,rnd(.92,1.08),1));fans.setMatrixAt(i,m);heads.setMatrixAt(i,m);
   ph[i*2]=Math.random()*6.28;ph[i*2+1]=6+Math.random()*5;col.set(SKIN[(Math.random()*SKIN.length)|0]);heads.setColorAt(i,col)});
 const at=new THREE.InstancedBufferAttribute(ph,2);fBody.setAttribute('aPh',at);fHead.setAttribute('aPh',at)}
seatM.receiveShadow=true;fans.frustumCulled=heads.frustumCulled=false;stand.add(seatM,fans,heads);
const SHIRTS=['#d7263d','#1b4db3','#f2c14e','#f4f4f4','#2e8b57','#ff7f11','#6a4c93','#1f2a44','#e55c9c','#2bb3e0','#14b8a6','#3b3b3b','#9fb4c7','#c0392b'];
function paintCrowd(){const kit=curKit(),col=new THREE.Color();FANS.forEach((p,i)=>{const fan=p.home?Math.random()<.55:Math.random()<.12;col.set(fan?(Math.random()<.8?kit.shirt:kit.trim):SHIRTS[(Math.random()*SHIRTS.length)|0]);fans.setColorAt(i,col)});fans.instanceColor.needsUpdate=true}
let excite=0;
function stepCrowd(dt){crowdU.uT.value+=dt*(reduced?.3:.3+excite*.7);crowdU.uA.value=reduced?.02:.02+excite*.32}
/* LED advertising boards (invented copy only) */
const ledTex=canvasTex(2048,64,()=>{});
function paintLed(mode){const k=curKit(),x=ledTex.image.getContext('2d'),W=2048,H=64;
  x.font='800 42px "Barlow Condensed",Arial Narrow,sans-serif';x.textBaseline='middle';x.textAlign='center';
  if(mode==='goal'){for(let i=0;i<8;i++){x.fillStyle=i%2?'#ffd23f':k.shirt;x.fillRect(i*W/8,0,W/8,H);x.fillStyle=i%2?'#1a1200':'#ffffff';x.fillText('GOAL!',i*W/8+W/16,H/2+2)}}
  else if(mode==='save'){for(let i=0;i<8;i++){x.fillStyle=i%2?'#0b1830':'#1c2a48';x.fillRect(i*W/8,0,W/8,H);x.fillStyle='#ffffff';x.fillText(i%2?'SAVED':'OOOH!',i*W/8+W/16,H/2+2)}}
  else{const words=['GOALFALL','READ · AIM · SCORE','EDUGAMES','LEARN BY PLAYING'];
    words.forEach((w,i)=>{const x0=i*W/4;x.fillStyle=i%2?k.shirt:'#0b1830';x.fillRect(x0,0,W/4,H);x.fillStyle=i%2?(k.numColor||'#fff'):'#3fd0ff';x.fillText(w,x0+W/8,H/2+2)})}
  ledTex.needsUpdate=true}
let ledFlash=0;function flashLed(mode){paintLed(mode);ledFlash=2.6}
ledTex.wrapS=THREE.RepeatWrapping;ledTex.repeat.set(3,1);
const ledM=std(0x000000,{emissive:0xffffff,emissiveMap:ledTex,emissiveIntensity:1.6,roughness:.4});
{const b=new THREE.Mesh(new THREE.BoxGeometry(70,.95,.15),[concD,concD,concD,concD,ledM,concD]);b.position.set(0,.48,-4.2);b.castShadow=true;scene.add(b);
 [-1,1].forEach(s=>{const sb=new THREE.Mesh(new THREE.BoxGeometry(.15,.95,40),[ledM,ledM,concD,concD,concD,concD]);sb.position.set(s*24,.48,16);scene.add(sb)})}
/* big stadium scoreboard (live goals, points, streak) */
const jbTex=canvasTex(1024,320,()=>{});jbTex.minFilter=THREE.LinearFilter;
const JB={msg:'',msgT:0};
function paintJumbo(){const x=jbTex.image.getContext('2d'),W=1024,H=320,k=curKit();
  x.fillStyle='#050b16';x.fillRect(0,0,W,H);
  const g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,k.shirt);g.addColorStop(1,'#0e9fc0');x.fillStyle=g;x.fillRect(0,0,W,56);
  x.fillStyle='#fff';x.font='800 40px "Barlow Condensed",Arial Narrow,sans-serif';x.textBaseline='middle';x.textAlign='left';x.fillText('GOALFALL',24,30);
  x.textAlign='right';x.fillText((typeof MODE==='function'&&MODE().kind==='t')?('TIME '+Math.max(0,Math.ceil(timeLeft||0))):('SHOT '+Math.min((shots||0)+1,MODE?MODE().n:10)+' / '+(MODE?MODE().n:10)),W-24,30);
  if(JB.msg){x.textAlign='center';x.font='italic 800 170px "Barlow Condensed",Arial Narrow,sans-serif';x.fillStyle=JB.msg==='GOAL!'?'#ffd23f':'#ffffff';x.fillText(JB.msg,W/2,190)}
  else{const cols=[['GOALS',`${goals||0}/${shots||0}`],['POINTS',`${pts||0}`],['STREAK',`${streak||0}${(streak||0)>=3?(streak>=5?' ×3':' ×2'):''}`]];
    cols.forEach(([l,v],i)=>{const cx=W/6+i*W/3;x.textAlign='center';x.fillStyle='#8fb3d9';x.font='700 34px "Barlow Condensed",Arial Narrow,sans-serif';x.fillText(l,cx,100);
      x.fillStyle=i===2&&(streak||0)>=3?'#ffd23f':'#ffffff';x.font='800 120px "Barlow Condensed",Arial Narrow,sans-serif';x.fillText(v,cx,200)})}
  x.fillStyle='rgba(255,255,255,.05)';for(let yy=0;yy<H;yy+=4)x.fillRect(0,yy,W,1);jbTex.needsUpdate=true}
{const g=new THREE.Group();g.position.set(0,9.3,-13.5);scene.add(g);JB.g=g;
 const bezel=new THREE.Mesh(new THREE.BoxGeometry(10.6,3.6,.5),std(0x10151d,{metalness:.5,roughness:.4}));bezel.castShadow=true;g.add(bezel);
 const scr=new THREE.Mesh(new THREE.PlaneGeometry(10,3.125),std(0x000000,{emissive:0xffffff,emissiveMap:jbTex,emissiveIntensity:1.5,roughness:.3}));scr.position.z=.26;g.add(scr);
 [-1,1].forEach(s=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.4,6,.4),std(0x6b7480,{metalness:.6,roughness:.4}));leg.position.set(s*4,-4.4,-.3);g.add(leg)})}
/* floodlight masts */
[[-38,-24],[38,-24],[-40,46],[40,46]].forEach(([x,z])=>{const g=new THREE.Group();g.position.set(x,0,z);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.3,.55,34,10),std(0x9aa3ad,{metalness:.6,roughness:.35}));mast.position.y=17;g.add(mast);
  const head=new THREE.Mesh(new THREE.BoxGeometry(7,3.6,.5),std(0x2a2f38,{metalness:.5,roughness:.4}));head.position.y=35;head.lookAt(new V3(-x*.6,0,10-z));g.add(head);
  const lamps=new THREE.Mesh(new THREE.PlaneGeometry(6.4,3),std(0x000000,{emissive:0xfff6dd,emissiveIntensity:2.2}));lamps.position.copy(head.position);lamps.quaternion.copy(head.quaternion);lamps.translateZ(.27);g.add(lamps);
  scene.add(g)});

/* ======================= BALL: physical model ======================= */
function drawBall(x,id,W,H){const k=curKit();
  const ico=[];const p=(1+Math.sqrt(5))/2;[[0,1,p],[0,-1,p],[0,1,-p],[0,-1,-p],[1,p,0],[-1,p,0],[1,-p,0],[-1,-p,0],[p,0,1],[-p,0,1],[p,0,-1],[-p,0,-1]].forEach(v=>{
    const l=Math.hypot(...v);ico.push([Math.atan2(v[0],v[2]),Math.asin(v[1]/l)])});
  const at=(lon,lat)=>[(lon/(2*Math.PI)+.5)*W,(.5-lat/Math.PI)*H];
  const blob=(lon,lat,r,col)=>{x.fillStyle=col;for(const dl of [-2*Math.PI,0,2*Math.PI]){const [cx,cy]=at(lon+dl,lat);x.beginPath();
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2;x.lineTo(cx+Math.cos(a)*r/Math.max(.35,Math.cos(lat)),cy+Math.sin(a)*r)}x.closePath();x.fill()}};
  if(id==='classic'){x.fillStyle='#fbfbfb';x.fillRect(0,0,W,H);ico.forEach(([a,b])=>blob(a,b,H*.11,'#1b2230'))}
  else if(id==='neon'){x.fillStyle='#e8ff3a';x.fillRect(0,0,W,H);ico.forEach(([a,b])=>blob(a,b,H*.075,'#0f1d33'));x.fillStyle='#ff4fa3';x.fillRect(0,H*.47,W,H*.06)}
  else if(id==='swirl'){x.fillStyle='#ffffff';x.fillRect(0,0,W,H);x.lineWidth=H*.09;x.lineCap='round';
    [[k.shirt,0],[ '#0f1d33',Math.PI]].forEach(([c,o])=>{x.strokeStyle=c;x.beginPath();for(let i=0;i<=64;i++){const u=i/64;x.lineTo(u*W,H*.5+Math.sin(u*Math.PI*4+o)*H*.26)}x.stroke()})}
  else{x.fillStyle='#14214a';x.fillRect(0,0,W,H);x.fillStyle='#ffd23f';x.fillRect(0,H*.45,W,H*.1);
    for(let i=0;i<26;i++){const [cx,cy]=[Math.random()*W,Math.random()*H];x.fillStyle=i%3?'#ffffff':'#ffd23f';x.beginPath();for(let j=0;j<10;j++){const a=j/10*Math.PI*2-Math.PI/2,r=j%2?H*.025:H*.06;x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}x.fill()}}}
const ballTex=canvasTex(512,256,()=>{});
function paintBall(){drawBall(ballTex.image.getContext('2d'),curBall().id,512,256);ballTex.needsUpdate=true}
const ball=new THREE.Mesh(new THREE.SphereGeometry(BR,32,24),std(0xffffff,{map:ballTex,roughness:.38,metalness:0}));ball.castShadow=true;scene.add(ball);
/* state: position, velocity, spin (rad/s). Forces: gravity, quadratic drag, Magnus lift (spin × velocity) */
const B={p:SPOT.clone(),v:new V3(),w:new V3(),mode:'rest',held:null,hits:0};
const GRAV=9.81,KD=.0135,KM=.0058;
const _a=new V3(),_c=new V3(),_d=new V3(),_e=new V3();
function ballAccel(v,w,out){const s=v.length();out.set(0,-GRAV,0).addScaledVector(v,-KD*s).add(_c.crossVectors(w,v).multiplyScalar(KM));return out}
/* where does a ball launched with v0 and spin w get to after time T (free flight) */
function simFree(p0,v0,w,T,out){const p=p0.clone(),v=v0.clone(),h=1/240;for(let s=0;s<T;s+=h){ballAccel(v,w,_a);v.addScaledVector(_a,h);p.addScaledVector(v,h)}out.copy(p);return out}
/* aim solver: find the launch velocity that reaches `target` in `T` seconds with this spin */
function solveShot(p0,target,T,w){const v0=new V3().subVectors(target,p0).divideScalar(T);v0.y+=.5*GRAV*T;const pT=new V3();
  for(let i=0;i<8;i++){simFree(p0,v0,w,T,pT);_d.subVectors(target,pT);if(_d.length()<.005)break;v0.addScaledVector(_d,1/T)}return v0}
/* goal frame collision: posts and crossbar as capsules */
const FRAME=[[new V3(-GW/2-POST,0,0),new V3(-GW/2-POST,GH+POST,0)],[new V3(GW/2+POST,0,0),new V3(GW/2+POST,GH+POST,0)],[new V3(-GW/2-POST,GH+POST,0),new V3(GW/2+POST,GH+POST,0)]];
function closestOnSeg(a,b,p,out){_d.subVectors(b,a);const t=clamp(_e.subVectors(p,a).dot(_d)/_d.lengthSq(),0,1);return out.copy(a).addScaledVector(_d,t)}
let onBallEvent=()=>{};
function ballStep(h){
  if(B.mode==='held'){if(B.held)B.held(B.p);return}
  if(B.mode!=='live')return;
  const p=B.p,v=B.v,w=B.w,prevZ=p.z;
  ballAccel(v,w,_a);
  if(netTouch>0){_a.addScaledVector(v,-14);/* the net soaks up the ball's energy */}
  v.addScaledVector(_a,h);p.addScaledVector(v,h);w.multiplyScalar(1-.25*h);
  // ground: bounce with energy loss, friction turns slide into roll
  if(p.y<BR){p.y=BR;if(v.y<-.4){if(v.y<-1.6)onBallEvent('bounce',-v.y);v.y=-v.y*.52;v.x*=.86;v.z*=.86;w.multiplyScalar(.6)}else{v.y=0;v.x*=1-1.4*h;v.z*=1-1.4*h;
      w.set(v.z/BR,0,-v.x/BR)}}
  // posts / crossbar
  for(const [a,b] of FRAME){closestOnSeg(a,b,p,_c);_e.subVectors(p,_c);const d=_e.length(),r=BR+POST;
    if(d<r){_e.divideScalar(d||1);p.copy(_c).addScaledVector(_e,r);const vn=v.dot(_e);if(vn<0){v.addScaledVector(_e,-1.65*vn);v.multiplyScalar(.85);onBallEvent('post',-vn)}}}
  // keeper body (only when the keeper is meant to touch the ball)
  if(KEEPER&&KEEPER.solid)KEEPER.collide(p,v);
  // goal line crossed inside the frame → goal
  if(prevZ>=-BR&&p.z<-BR&&Math.abs(p.x)<GW/2-BR*.5&&p.y<GH)onBallEvent('goal');
  // walls of the goal (side nets) and the back of the stadium
  if(p.z<0&&p.z>-NDB-.3&&Math.abs(p.x)<GW/2+.3){if(Math.abs(p.x)>GW/2-BR){p.x=Math.sign(p.x)*(GW/2-BR);v.x*=-.2}if(p.z<-NDB+BR){p.z=-NDB+BR;v.z=Math.abs(v.z)*.15}if(p.y>GH-BR&&prevZ<0){p.y=GH-BR;v.y=-Math.abs(v.y)*.2}}
  if(p.z<-4.1+BR&&prevZ>=-4.1+BR){p.z=-4.1+BR;v.z=Math.abs(v.z)*.4;onBallEvent('bounce',3)}
  // rolling rotation
  _c.copy(w).multiplyScalar(h);const ang=_c.length();if(ang>1e-6){_q.setFromAxisAngle(_c.divideScalar(ang),ang);ball.quaternion.premultiply(_q)}
}
const _q=new THREE.Quaternion();
function stepBall(dt){const n=Math.max(1,Math.ceil(dt/(1/360)));const h=dt/n;for(let i=0;i<n;i++){ballStep(h);stepCloth(h)}
  ball.position.copy(B.p)}
function resetBallTo(p){B.mode='rest';B.held=null;B.p.copy(p);B.v.set(0,0,0);B.w.set(0,0,0);ball.position.copy(p);ball.quaternion.identity();netTouch=0;
  for(let k=0;k<cloth.p.length;k++){cloth.p[k].copy(cloth.rest[k]);cloth.q[k].copy(cloth.rest[k])}writeNet()}

let charsReady=true;

/* ======================= KEEPER: a blocky (voxel-style) goalkeeper with pixel-art textures ======================= */
const _y=new V3(0,1,0);
function pixTex(w,h,draw){const t=canvasTex(w,h,draw);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapLinearFilter;t.generateMipmaps=true;return t}
const PX=16;
/* kit pattern on a 16px canvas */
function kitFill(x,w,h,k,flip){x.fillStyle=k.shirt;x.fillRect(0,0,w,h);const s=k.second||k.trim;x.fillStyle=s;
  if(k.style==='stripes')for(let i=1;i<w;i+=4)x.fillRect(i,0,2,h);
  else if(k.style==='hoops')for(let j=2;j<h;j+=5)x.fillRect(0,j,w,2);
  else if(k.style==='halves')x.fillRect(flip?0:w/2,0,w/2,h);
  else if(k.style==='sash')for(let j=0;j<h;j++){const c=Math.round((flip?j:h-1-j)*w/h);x.fillRect(c-2,j,4,1)}}
function makeKeeper(){
  const K={root:new THREE.Group(),hips:new THREE.Group(),parts:{},mats:[]};scene.add(K.root);K.root.add(K.hips);
  const box=(w,h,d,y)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(0,y,0);return g};
  const mats=()=>{const m=[0,1,2,3,4,5].map(()=>std(0xffffff,{roughness:.75}));K.mats.push(m);return m};
  // proportions (metres): blocky but readable from 11 m
  const HIP=.86;K.HIP=HIP;K.hips.position.y=HIP;
  const torso=new THREE.Mesh(box(.56,.72,.3,.36),mats());K.hips.add(torso);K.parts.torso=torso;
  const neck=new THREE.Group();neck.position.y=.72;K.hips.add(neck);K.neck=neck;
  const head=new THREE.Mesh(box(.46,.46,.46,.23),mats());neck.add(head);K.parts.head=head;
  K.arms=[1,-1].map(s=>{const g=new THREE.Group();g.position.set(s*.4,.66,0);K.hips.add(g);const a=new THREE.Mesh(box(.22,.74,.24,-.33),mats());g.add(a);K.parts[s>0?'armL':'armR']=a;
    const hand=new THREE.Object3D();hand.position.y=-.72;g.add(hand);g.hand=hand;return g});
  K.legs=[1,-1].map(s=>{const g=new THREE.Group();g.position.set(s*.14,0,0);K.hips.add(g);const l=new THREE.Mesh(box(.26,.86,.28,-.43),mats());g.add(l);K.parts[s>0?'legL':'legR']=l;return g});
  Object.values(K.parts).forEach(m=>{m.castShadow=true;m.receiveShadow=true});
  K.shadow=(()=>{const t=canvasTex(64,64,x=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64)});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.012;scene.add(m);return m})();
  return K}
const KEEPER_BODY=makeKeeper();
/* repaint the keeper's pixel textures from a kit spec. box face order: +x, -x, +y, -y, +z (front), -z (back) */
function paintKeeperKit(k){const B=KEEPER_BODY,P=B.parts;
  const SKIN='#d9a07a',HAIR='#3a2a1e',GL=k.gloves||'#ffffff',SH=k.shorts,SO=k.socks,BT='#16181d';
  const face=(id,fn)=>pixTex(PX,PX,(x,w,h)=>fn(x,w,h));
  const setBox=(mesh,f)=>{const ms=mesh.material;for(let i=0;i<6;i++){if(ms[i].map)ms[i].map.dispose();ms[i].map=f(i);ms[i].needsUpdate=true}};
  // head: hair on top and back, face on the front, headband in the kit trim
  setBox(P.head,i=>face(i,(x,w,h)=>{x.fillStyle=SKIN;x.fillRect(0,0,w,h);x.fillStyle=HAIR;
    if(i===2){x.fillRect(0,0,w,h);return}if(i===3){return}
    x.fillRect(0,0,w,4);if(i===5){x.fillRect(0,0,w,11)}if(i<2){x.fillRect(i===0?0:12,4,4,5)}
    x.fillStyle=k.trim;x.fillRect(0,3,w,2);
    if(i===4){x.fillStyle='#fff';x.fillRect(3,7,3,2);x.fillRect(10,7,3,2);x.fillStyle='#1e2a3a';x.fillRect(4,7,2,2);x.fillRect(11,7,2,2);
      x.fillStyle=HAIR;x.fillRect(3,6,3,1);x.fillRect(10,6,3,1);x.fillStyle='#b97d5d';x.fillRect(7,9,2,2);x.fillStyle='#8a4b3a';x.fillRect(5,12,6,1)}}));
  // torso: kit pattern, collar, crest on the front, number 1 on the back
  setBox(P.torso,i=>pixTex(PX,20,(x,w,h)=>{kitFill(x,w,h,k,i===5);x.fillStyle=k.trim;x.fillRect(0,0,w,1);
    if(i===4){x.fillRect(5,0,6,2);x.fillStyle=k.trim;x.fillRect(10,4,3,3);x.fillStyle=k.shirt;x.fillRect(11,5,1,1)}
    if(i===5){x.fillStyle=k.numColor||'#fff';x.fillRect(7,4,2,10);x.fillRect(6,5,1,1);x.fillRect(6,13,4,1)}
    x.fillStyle=SH;x.fillRect(0,h-1,w,1)}));
  // arms: long keeper sleeves, big gloves
  [P.armL,P.armR].forEach(a=>setBox(a,i=>pixTex(8,24,(x,w,h)=>{x.fillStyle=k.shirt;x.fillRect(0,0,w,h);if(k.style==='hoops'){x.fillStyle=k.second||k.trim;for(let j=2;j<16;j+=5)x.fillRect(0,j,w,2)}
    x.fillStyle=k.trim;x.fillRect(0,15,w,1);x.fillStyle=GL;x.fillRect(0,16,w,8);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,19,w,1);if(i===3){x.fillStyle=GL;x.fillRect(0,0,w,h)}})));
  // legs: shorts, socks with a band, boots
  [P.legL,P.legR].forEach(l=>setBox(l,i=>pixTex(8,28,(x,w,h)=>{x.fillStyle=SH;x.fillRect(0,0,w,9);x.fillStyle=SKIN;x.fillRect(0,9,w,4);
    x.fillStyle=SO;x.fillRect(0,13,w,12);x.fillStyle=k.trim;x.fillRect(0,13,w,2);x.fillStyle=BT;x.fillRect(0,25,w,3);if(i===3){x.fillStyle=BT;x.fillRect(0,0,w,h)}})))}

/* ---------- keeper animation (procedural): ready stance, dives, catch, reactions ---------- */
const KP={zone:-1,u:0,f:0,x0:0,t:0,dur:.6,delay:0,started:false,active:false,catch:false,react:'',rt:0};
const KEEPER={base:new V3(0,0,.35),solid:false,
  hands(out){const B=KEEPER_BODY;B.root.updateMatrixWorld(true);B.arms[0].hand.getWorldPosition(_c);B.arms[1].hand.getWorldPosition(_d);return out.copy(_c).add(_d).multiplyScalar(.5)},
  collide(){}};
function poseKeeper(){const B=KEEPER_BODY,{zone,x0}=KP,u=easeOut(clamp(KP.u,0,1)),f=easeInOut(clamp(KP.f,0,1));const HIP=B.HIP;
  let hx=x0,hy=HIP-.14,roll=0,armZ=.55,armX=-.55,legZ=.22,legX=0,lean=.18,yaw=0,nod=0;
  if(zone===0||zone===2){const s=zone===0?-1:1;hx=lerp(x0,s*1.55,u);hy=lerp(HIP-.14,1.12,Math.sin(u*Math.PI/2))-f*.72;roll=-s*(1.38*u+.18*f);armZ=lerp(.55,Math.PI-.18,u);armX=lerp(-.55,0,u);legZ=.22+.25*u;lean=.18*(1-u)}
  else if(zone===1){hx=lerp(x0,0,u);hy=HIP-.14+.08*u;armZ=lerp(.55,.25,u);armX=lerp(-.55,-1.45,u);legZ=.22-.1*u;lean=.18+.15*u}
  /* reactions after the shot */
  if(KP.react==='cheer'){const j=Math.abs(Math.sin(KP.rt*7))*.18*Math.max(0,1-KP.rt/2.4);hx=x0;hy=HIP+j;roll=0;armZ=Math.PI-.35;armX=0;legZ=.12;lean=0}
  if(KP.react==='down'){nod=.45}
  B.root.position.set(hx,0,KEEPER.base.z);B.hips.position.y=Math.max(.36,hy);B.hips.rotation.set(lean,yaw,roll);B.neck.rotation.x=nod;
  B.arms[0].rotation.set(armX,0,armZ);B.arms[1].rotation.set(armX,0,-armZ);
  B.legs[0].rotation.set(legX,0,legZ);B.legs[1].rotation.set(legX,0,-legZ);
  B.shadow.position.set(hx,.012,KEEPER.base.z);const sc=1-clamp(hy-HIP,0,1)*.5;B.shadow.scale.set(sc,sc,sc)}
function keeperIdle(dt){const w=1+Math.min(streak||0,8)*.18;KP.x0=Math.sin(t*w*.9)*.35;KP.zone=-1;KP.u=0;KP.f=0;poseKeeper();
  const B=KEEPER_BODY,b=Math.abs(Math.sin(t*w*2.4));B.hips.position.y=B.HIP-.16+b*.05;B.arms[0].rotation.z=.55+b*.06;B.arms[1].rotation.z=-.55-b*.06}
/* where the gloves are at the moment of a full stretch to this zone */
function gloveAt(zone,x0){const keep={...KP};Object.assign(KP,{zone,u:1,f:0,x0,react:''});poseKeeper();const out=KEEPER.hands(new V3());Object.assign(KP,keep);poseKeeper();return out}
KEEPER.ready=()=>{Object.assign(KP,{zone:-1,u:0,f:0,x0:0,active:false,catch:false,react:'',rt:0,started:false});KEEPER.solid=false;poseKeeper()};
KEEPER.plan=(zone,delay,dur)=>{Object.assign(KP,{zone,u:0,f:0,x0:KEEPER_BODY.root.position.x,delay,dur,t:0,started:false,active:true,react:''})};
function stepKeeper(dt){
  if(KP.react){KP.rt+=dt}
  if(KP.active){KP.t+=dt;if(KP.t>=KP.delay){KP.started=true;if(KP.u<1)KP.u=Math.min(1,KP.u+dt/KP.dur);else KP.f=Math.min(1,KP.f+dt/.45)}poseKeeper()}
  else if(KP.react)poseKeeper();
  else keeperIdle(dt)}

/* ======================= CAMERA: the shooter's eyes behind the ball; follows the shot; net-cam replay on goals ======================= */
let VW=innerWidth,VH=innerHeight,side=false;
const view={q:{x:0,y:0,w:0,h:0},ballPx:{x:0,y:0},area:null};
const CAM={pos:new V3(0,1.55,SPOT.z+3.4),look:new V3(0,1.35,0),mode:'aim',t:0,shake:0,proj:null};
const camLook=new V3();
function framePts(){const pts=[];BX.forEach(x=>{pts.push(new V3(x-SW/2-.1,SY+SH+.1,0),new V3(x+SW/2+.1,SY+SH+.1,0))});pts.push(new V3(-GW/2-.3,0,0),new V3(GW/2+.3,0,0),SPOT.clone().setY(0));return pts}
function fitCamera(){cam.position.copy(CAM.pos);cam.lookAt(CAM.look);cam.updateMatrixWorld();
  const inv=cam.matrixWorldInverse;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  framePts().forEach(p=>{const q=p.clone().applyMatrix4(inv);const tx=q.x/-q.z,ty=q.y/-q.z;x0=Math.min(x0,tx);x1=Math.max(x1,tx);y0=Math.min(y0,ty);y1=Math.max(y1,ty)});
  const a=view.area,k=Math.min((a.b-a.t)/(y1-y0),(a.r-a.l)/(x1-x0));
  const free=(a.b-a.t)-k*(y1-y0),yTop=a.t+free*(side?.45:.3);
  cam.aspect=VW/VH;cam.fov=2*Math.atan((VH/2)/k)*180/Math.PI;cam.updateProjectionMatrix();
  const e=cam.projectionMatrix.elements;e[9]=(yTop-VH/2+k*y1)/(VH/2);e[8]=(VW/2+k*(x0+x1)/2-(a.l+a.r)/2)/(VW/2);cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  CAM.proj=cam.projectionMatrix.clone();CAM.fov=cam.fov}
function cutTo(mode){CAM.mode=mode;CAM.t=0;if(mode==='aim'){cam.position.copy(CAM.pos);camLook.copy(CAM.look);if(CAM.proj){cam.fov=CAM.fov;cam.projectionMatrix.copy(CAM.proj);cam.projectionMatrixInverse.copy(CAM.proj).invert()}}}
function netCam(){/* behind the net, looking back at the ball in the bulging net and the crowd */CAM.mode='net';CAM.t=0;
  const bx=clamp(B.p.x,-GW/2+.6,GW/2-.6);cam.position.set(bx*.35-Math.sign(bx||1)*.9,1.45,-NDB-3.4);camLook.set(B.p.x,Math.max(.3,B.p.y)+.2,B.p.z+.3);
  cam.fov=48;cam.aspect=VW/VH;cam.updateProjectionMatrix()}
function stepCamera(dt){CAM.t+=dt;
  if(CAM.mode==='aim'){cam.position.copy(CAM.pos);camLook.copy(CAM.look);if(state==='menu'&&!reduced){cam.position.x+=Math.sin(t*.15)*.6;cam.position.y+=Math.sin(t*.11)*.08}}
  else if(CAM.mode==='windup'&&!reduced){const u=easeInOut(clamp(CAM.t/.32,0,1));cam.position.copy(CAM.pos);cam.position.z-=.55*u;cam.position.y-=.12*Math.sin(u*Math.PI*2)*.5;camLook.copy(CAM.look)}
  else if(CAM.mode==='shot'&&!reduced){const u=easeInOut(clamp(CAM.t/1.0,0,1));
    _c.set(CAM.pos.x+B.p.x*.08,CAM.pos.y-.04,CAM.pos.z-.55-.9*u);cam.position.lerp(_c,1-Math.exp(-dt*8));
    _d.copy(CAM.look);_d.x+=B.p.x*.16*u;_d.y+=(B.p.y-1.3)*.1*u;camLook.lerp(_d,1-Math.exp(-dt*6))}
  else if(CAM.mode==='back'){const k=1-Math.exp(-dt*5);cam.position.lerp(CAM.pos,k);camLook.lerp(CAM.look,k)}
  else if(CAM.mode==='net'){camLook.lerp(_c.set(B.p.x,Math.max(.3,B.p.y)+.2,B.p.z+.3),1-Math.exp(-dt*3));cam.position.y+=dt*.06;cam.position.z+=dt*.25}
  if(CAM.shake>0&&!reduced){CAM.shake=Math.max(0,CAM.shake-dt*1.2);cam.position.x+=(Math.random()-.5)*CAM.shake*.05;cam.position.y+=(Math.random()-.5)*CAM.shake*.04}
  cam.lookAt(camLook);cam.updateMatrixWorld()}

/* ======================= LAYOUT ======================= */
function layout(){
  VW=innerWidth;VH=innerHeight;R.setSize(VW,VH);
  const pc=getComputedStyle($('probe')),sat=parseFloat(pc.paddingTop)||0,sab=parseFloat(pc.paddingBottom)||0,sal=parseFloat(pc.paddingLeft)||0,sar=parseFloat(pc.paddingRight)||0;
  side=VW>VH&&VH<560;
  const hudH=58;let q,area;
  if(side){const w=clamp(VW*.33,210,360);q={x:Math.max(12,sal+8),y:sat+hudH+6,w,h:VH-sat-hudH-6-sab-12};
    area={l:q.x+w+10,r:VW-Math.max(10,sar),t:sat+hudH+4,b:VH-sab-14}}
  else{const land=VW>VH;const w=Math.min(VW-24,820);const h=land?clamp(VH*.2,90,170):clamp(VH*.19,108,210);
    q={x:(VW-w)/2,y:sat+hudH+8,w,h};area={l:Math.max(6,sal),r:VW-Math.max(6,sar),t:q.y+h+12,b:VH-sab-(land?14:Math.max(18,VH*.04))}}
  view.q=q;view.area=area;const st=document.documentElement.style;st.setProperty('--qx',q.x+'px');st.setProperty('--qy',q.y+'px');st.setProperty('--qw',q.w+'px');st.setProperty('--qh',q.h+'px');
  const keep=CAM.mode;fitCamera();if(keep==='aim'||keep==='windup')cutTo('aim');else{cam.projectionMatrix.copy(CAM.proj)}
  const gy=toScreen(_c.set(0,0,0)).y,by=toScreen(SPOT).y;st.setProperty('--by',((gy+by)/2)+'px');st.setProperty('--bl',area.l+'px');st.setProperty('--br',(VW-area.r)+'px');
  fitAll()}
const _sp=new V3();
function toScreen(v){_sp.copy(v).project(cam);return{x:(_sp.x+1)/2*VW,y:(1-_sp.y)/2*VH,z:_sp.z}}
/* ======================= TEXT FITTING (never cut, shrink then wrap) ======================= */
function fitText(t,boxH,max,min){t.classList.remove('tight');let s=max;t.style.fontSize=s+'px';
  const over=()=>t.scrollWidth>t.clientWidth+1||t.offsetHeight>boxH+1;
  let lo=min,hi=max;while(hi-lo>.5){s=(lo+hi)/2;t.style.fontSize=s+'px';if(over())hi=s;else lo=s}
  s=lo;t.style.fontSize=s+'px';if(t.scrollWidth>t.clientWidth+1)t.classList.add('tight');return s}
const bdEls=[0,1,2].map(i=>$('bd'+i)),bdRect=[{},{},{}];
const _w=new V3();
function placeBoards(force){for(let i=0;i<3;i++){const x=BX[i],cz=.03,y0=SY+boards[i].g.position.y-SY;
    const a=toScreen(_w.set(x-SW/2,SY+SH,cz)),c=toScreen(_w.set(x+SW/2,SY,cz));const r={x:a.x,y:a.y,w:c.x-a.x,h:c.y-a.y},vis=a.z<1&&c.z<1&&r.w>8;
    const o=bdRect[i],moved=force||Math.abs(o.x-r.x)>.5||Math.abs(o.y-r.y)>.5,resized=force||Math.abs((o.w||0)-r.w)>3||Math.abs((o.h||0)-r.h)>3;
    bdEls[i].style.visibility=vis?'':'hidden';
    if(vis&&(moved||resized)){const e=bdEls[i];e.style.width=r.w+'px';e.style.minHeight=r.h+'px';e.style.transform=`translate(${r.x}px,${r.y}px)`;Object.assign(o,r);if(resized)fitBoard(i)}}}
function fitBoard(i){const e=bdEls[i],r=bdRect[i],t=e.querySelector('.t');if(!r.w)return;const px=Math.max(6,r.w*.07),py=Math.max(8,r.h*.12);
  e.style.padding=`${py}px ${px}px`;fitText(t,r.h-2*py,clamp(r.h*.42,14,46),clamp(r.h*.16,10,12))}
function fitQuestion(){const q=view.q,t=$('qtext'),img=!$('qimg').hidden,tag=$('qtag').textContent?14:0;
  fitText(t,(q.h-20-tag)*(img?.42:1),clamp(q.h*(img?.2:.3),20,side?40:52),side?14:16)}
function fitAll(){placeBoards(true);fitQuestion()}
addEventListener('resize',()=>requestAnimationFrame(layout));
addEventListener('orientationchange',()=>setTimeout(layout,250));
if(window.visualViewport)visualViewport.addEventListener('resize',()=>requestAnimationFrame(layout));
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{paintLed();fitAll()});


/* ======================= QUESTIONS ======================= */
const qid=Q=>{const m=Q.q.replace(/\s*=\s*\?\s*$/,'').trim().match(/^(-?\d+)\s*([×+])\s*(-?\d+)$/);return(m?[m[1],m[3]].sort().join(m[2]):Q.q)+'|'+Q.answer+'|'+(Q.img||'')};
let next=null,seen=new Set(),Q=null;
function nextQ(){let q,d=0;do{q=next();d++}while(seen.has(qid(q))&&d<40);seen.add(qid(q));return q}
function showQuestion(q){const qt=$('qtext'),im=$('qimg'),box=$('qbox');
  box.classList.add('swap');
  setTimeout(()=>{qt.textContent='';if(q.code){qt.append(el('span','code',q.code))}qt.append(q.q);
    if(q.img){im.src=q.img;im.hidden=false}else{im.hidden=true;im.removeAttribute('src')}
    $('qtag').textContent=q.tag||'';fitQuestion();box.classList.remove('swap')},reduced?0:140);
  bdEls.forEach((e,i)=>{e.className='bd';e.querySelector('.tick').textContent='✓';e.querySelector('.t').textContent=q.ans[i];boardTint(i,'');fitBoard(i)})}

/* ======================= GAME STATE ======================= */
let state='menu',pausedFrom=null,stT=0,t=0;
let shots=0,goals=0,pts=0,streak=0,bestStreak=0,missed=[],timeLeft=0,timeUsed=0,runStart=0,dotsHist=[];
const shot={zone:-1,ok:false,v0:new V3(),w:new V3(),T:.6,ft:0,live:false,resolved:false,kd:null,kdelay:0,kts:1,catch:false,target:new V3()};
let afterT=0,afterDur=2,introT=0,hintShown=false,slow=1,slowT=0;

function paintHud(){const m=MODE();$('score').textContent=pts;if(!JB.msg)paintJumbo();
  if(m.kind==='p'){$('clock').innerHTML=`Shot <b>${Math.min(shots+1,m.n)}</b>/${m.n}`;$('clockChip').classList.remove('low')}
  else{const s=Math.max(0,Math.ceil(timeLeft));$('clock').innerHTML=`<b>${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}</b>`;$('clockChip').classList.toggle('low',s<=10)}
  const mult=streak>=5?3:streak>=3?2:1,mc=$('multChip');$('multN').textContent=mult;if(mult>1&&!mc.classList.contains('on'))mc.classList.add('on');if(mult===1)mc.classList.remove('on')}
function paintDots(){const m=MODE(),box=$('dots');box.innerHTML='';if(m.kind!=='p')return;
  for(let i=0;i<m.n;i++){const d=el('i');if(i<dotsHist.length)d.className=dotsHist[i]?'g':'m';else if(i===dotsHist.length)d.className='now';box.append(d)}}
function show(id,on){$(id).classList.toggle('off',!on)}
const PANELS=['scrHome','stepSubj','stepTopic','scrKit','scrBall','pauseP','over'];
function panel(id){PANELS.forEach(x=>$(x).hidden=x!==id);$('sheet').hidden=!id;$('sheet').classList.toggle('dark',id==='pauseP'||id==='over')}
function resetActors(){resetBallTo(SPOT);KEEPER.ready();boards.forEach((b,i)=>{b.wob=0;boardTint(i,'')});slow=1;slowT=0}

function start(){
  unlock();shots=goals=pts=streak=bestStreak=0;missed=[];dotsHist=[];seen=new Set();
  const m=MODE();timeLeft=m.kind==='t'?m.n:0;timeUsed=0;runStart=performance.now();
  next=stream(curTopic(),DIFF(),EMBED_REG?{regions:EMBED_REG}:undefined);
  panel(null);show('hud',true);show('qbox',false);show('boards',false);show('banner',false);paintHud();paintDots();
  resetActors();cutTo('aim');
  state='intro';introT=0;const c=$('count');c.textContent='Ready…';show('count',true);excite=.3;layout()}
function nextShot(){
  const m=MODE();if(m.kind==='p'&&shots>=m.n)return end('full');if(m.kind==='t'&&timeLeft<=0)return end('time');
  if(CAM.mode!=='aim')cut();
  Q=nextQ();resetActors();cutTo('aim');
  showQuestion(Q);show('qbox',true);show('boards',true);show('banner',false);paintHud();paintDots();
  state='aim';stT=0;
  if(!hintShown){hintShown=true;const h=$('hint');h.textContent=FINE?'Click the right answer, or press 1 · 2 · 3':'Swipe from the ball to the right answer';show('hint',true)}}
function cut(){if(reduced)return;const f=$('flash');f.style.transition='none';f.style.background='#000';f.style.opacity=.85;requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transition='opacity .35s';f.style.opacity=0}))}

function shoot(zone){
  if(state!=='aim'||zone<0||zone>2)return;state='shot';show('hint',false);clearAim();
  const ok=zone===Q.correct,lvl=Math.min(streak,8)/8,x0=KEEPER_BODY.root.position.x;
  Object.assign(shot,{zone,ok,ft:0,live:false,resolved:false,catch:false,windup:reduced?.06:.34});
  let T,target;
  if(ok){/* goal: anywhere in that third; the keeper commits the wrong way (quicker as the streak grows, never right) */
    const xr=zone===1?[-.6,.6]:(zone===0?[-GW/2+.45,-GW/2+2.0]:[GW/2-2.0,GW/2-.45]);
    target=new V3(rnd(xr[0],xr[1]),rnd(.45,GH-.45),-.35);T=.66-.1*lvl;
    shot.kz=zone===0?2:zone===2?0:(Math.random()<.5?0:2);shot.kdur=.62-.2*lvl;shot.kdelay=Math.max(0,.14-.1*lvl)}
  else{/* save: the ball flies exactly into the keeper's gloves */
    shot.kz=zone;target=gloveAt(zone,x0);target.z+=.18;T=.62-.06*lvl;shot.kdur=T-.06;shot.kdelay=.06;shot.catch=zone===1||Math.random()<.35}
  const curl=zone===1?rnd(-8,8):(zone===0?rnd(10,22):-rnd(10,22));
  shot.w.set(rnd(-6,4),curl,0);shot.T=T;shot.target.copy(target);shot.v0.copy(solveShot(SPOT,target,T,shot.w));
  CAM.mode='windup';CAM.t=0;S.step&&S.step()}
function onStrike(){B.mode='live';B.v.copy(shot.v0);B.w.copy(shot.w);shot.live=true;shot.ft=0;S.kick();CAM.shake=.3;excite=.45;CAM.mode='shot';CAM.t=0;
  KEEPER.plan(shot.kz,shot.kdelay,shot.kdur);KEEPER.solid=!shot.ok}
onBallEvent=(kind,s)=>{
  if(kind==='bounce'){S.bounce(s);return}
  if(kind==='post'){S.post(s);return}
  if(shot.resolved)return;
  if(kind==='goal'){if(!shot.ok)return;shot.resolved=true;netActive=4;S.net();if(!reduced){slow=.3;slowT=.75}resolve(true)}
  else if(kind==='save'){shot.resolved=true;KEEPER.solid=false;S.glove();
    if(shot.catch){B.mode='held';B.held=p=>{KEEPER.hands(p);p.z+=.14}}
    else{const s=shot.zone===0?-1:shot.zone===2?1:(Math.random()<.5?-1:1);B.v.set(s*rnd(2.5,4.5),rnd(1.2,2.6),rnd(3.5,6.5));B.w.set(rnd(-25,25),rnd(-25,25),rnd(-25,25))}
    if(!reduced){slow=.45;slowT=.35}resolve(false)}};
function resolve(ok){
  shots++;timeUsed=(performance.now()-runStart)/1000;dotsHist.push(ok);const z=shot.zone;
  if(ok){goals++;streak++;bestStreak=Math.max(bestStreak,streak);const mult=streak>=5?3:streak>=3?2:1,add=10*mult;pts+=add;
    lastAns={q:Q.img?'This flag':Q.q,img:Q.img||null,answer:Q.answer,picked:Q.answer,ok:1,tag:Q.tag||null};
    bdEls[z].classList.add('right');boardTint(z,'right');hitBoard(z,1);bdEls.forEach((e,i)=>{if(i!==z)e.classList.add('dimmed')});
    setTimeout(()=>{banner('goal','GOAL!',mult>1?`+${add}  ·  ×${mult} streak`:`+${add}`);S.cheer(streak>=3)},reduced?0:380);excite=1;
    if(streak===3||streak===5)setTimeout(()=>{const s=$('streak');s.textContent=streak===3?'3 in a row! Points ×2':'5 in a row! Points ×3';s.classList.remove('show','off');void s.offsetWidth;s.classList.add('show');S.streak()},900);
    afterDur=MODE().kind==='t'||reduced?1.8:3.0}
  else{streak=0;const picked=Q.ans[z];missed.push({q:Q.img?'This flag':Q.q,img:Q.img,answer:Q.answer,picked});
    lastAns=Object.assign({},missed[missed.length-1],{ok:0,tag:Q.tag||null});
    bdEls[z].classList.add('wrong');bdEls[z].querySelector('.tick').textContent='✗';boardTint(z,'wrong');bdEls[Q.correct].classList.add('right');boardTint(Q.correct,'right');
    bdEls.forEach((e,i)=>{if(i!==z&&i!==Q.correct)e.classList.add('dimmed')});
    banner('save','Saved!',`Answer: ${Q.answer}`);setTimeout(()=>{if(CAM.mode==='shot')CAM.mode='back'},reduced?0:450);S.ooh();excite=.35;afterDur=2.5}
  flashLed(ok?'goal':'save');JB.msg=ok?'GOAL!':'SAVED';paintJumbo();
  setTimeout(()=>{if(state!=='after')return;if(ok){KP.react='down';KP.rt=0}else if(shot.catch){KP.active=false;KP.react='cheer';KP.rt=0;B.held=p=>{KEEPER.hands(p);p.y+=.12}}},ok?900:700);
  paintHud();paintDots();
  toParent({type:'edu-progress',game:GAME,score:pts,right:goals,asked:shots,goals,shots});
  state='after';afterT=0}
let bannerTO=0;
function banner(kind,big,small){const b=$('banner');b.className='';b.classList.add(kind);b.querySelector('b').textContent=big;b.querySelector('small').textContent=small||'';void b.offsetWidth;b.classList.add('show');
  clearTimeout(bannerTO);bannerTO=setTimeout(()=>b.classList.add('hide'),kind==='goal'?1500:1900)}

function end(cause){
  if(state==='over')return;state='over';show('hint',false);clearAim();
  const m=MODE(),best0=getBest(),isBest=pts>best0&&pts>0;if(isBest){try{localStorage.setItem(bestKey(),pts)}catch(e){}}
  timeUsed=Math.round((performance.now()-runStart)/100)/10;
  logResult({game:GAME,subject:curSubject().id,topic:curTopic().id,topicName:curTopic().name,level:DIFF(),
    score:pts,right:goals,asked:shots,bestStreak,missed:missed.map(m=>({q:m.q,answer:m.answer,picked:m.picked})),
    goals,shots,mode:m.id,cause,timeUsed,at:new Date().toISOString()});
  if(cause!=='quit')S.whistle([.22,.22,.7]);
  setTimeout(()=>{
    $('rCause').textContent={full:'Full time',time:"Time's up",quit:'Run ended'}[cause]||'Full time';
    $('rGoals').textContent=goals;$('rShots').textContent=shots;$('rScore').textContent=pts;$('rStreak').textContent=bestStreak;
    $('rRate').textContent=shots?Math.round(goals/shots*100)+'%':'–';
    const pb=$('rBest');pb.textContent=isBest?'New best!':`Best ${Math.max(best0,pts)} pts`;pb.classList.toggle('best',isBest);
    $('rTopic').textContent=`${curSubject().name} · ${curTopic().name} · ${DIFFNAME[DIFF()]} · ${m.name}`;
    const rv=$('review');rv.innerHTML='';
    if(missed.length){rv.append(el('h3',null,'Worth another look'));const ol=el('ol');
      missed.forEach(x=>{const li=el('li'),q=el('div','q');if(x.img){const im=el('img');im.src=x.img;im.alt='';q.append(im)}q.append(x.q);
        const a=el('div','a');a.append(el('s',null,x.picked),el('b',null,x.answer));li.append(q,a);ol.append(li)});rv.append(ol)}
    else if(shots)rv.append(el('p','perfect','Every shot in the net. Perfect run!'));
    show('hud',false);show('qbox',false);show('boards',false);show('banner',false);panel('over')},cause==='quit'?0:1300)}

function toMenu(){ov=null;state='menu';show('hud',false);show('qbox',false);show('boards',false);show('banner',false);show('hint',false);show('count',false);
  resetActors();cutTo('aim');go('stepTopic')}
function pause(){if(!['aim','shot','after','intro'].includes(state))return;pausedFrom=state;state='paused';clearAim();
  $('pScore').textContent=pts;$('pLine').textContent=`${curTopic().name} · ${goals}/${shots} goals`;panel('pauseP');paintAudio()}
function resume(){if(state!=='paused')return;panel(null);state=pausedFrom;clock.getDelta()}
$('startBtn').onclick=start;$('againBtn').onclick=start;$('menuBtn').onclick=toMenu;
$('pause').onclick=pause;$('resumeBtn').onclick=resume;$('quitBtn').onclick=()=>{state='after';end('quit')};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
/* ======================= INPUT: swipe / drag from the ball, tap a board, keys 1-3 ======================= */
const touch=$('touch');let drag=null;
function zoneAtX(x){const c=bdRect.map(r=>r.x+r.w/2);if(x<(c[0]+c[1])/2)return 0;if(x<(c[1]+c[2])/2)return 1;return 2}
function swipeZone(d){const dx=d.x-d.x0,dy=d.y-d.y0;if(dy>-24||Math.hypot(dx,dy)<34)return -1;
  const yb=bdRect[1].y+bdRect[1].h/2,k=(yb-d.y0)/dy;const xa=d.y0>yb?d.x0+dx*k:d.x;return zoneAtX(xa)}
function tapZone(x,y){for(let i=0;i<3;i++){const r=bdRect[i];if(x>=r.x-6&&x<=r.x+r.w+6&&y>=r.y-10&&y<=r.y+Math.max(r.h,bdEls[i].offsetHeight)+10)return i}
  const top=bdRect[1].y-10,bot=view.ballPx.y-30;if(y>top&&y<bot)return zoneAtX(x);return -1}
function clearAim(){aimZone=-1;show('aim',false);bdEls.forEach(e=>e.classList.remove('aim'));drag=null}
function drawAim(z,px,py){const b=view.ballPx;aimZone=z;if(z<0){show('aim',false);bdEls.forEach(e=>e.classList.remove('aim'));return}
  const r=bdRect[z],tx=r.x+r.w/2,ty=r.y+r.h*.62,cx=(b.x+tx)/2+(z===1?0:(z===0?40:-40)),cy=Math.min(b.y,ty)+(Math.abs(b.y-ty))*.25;
  $('aimPath').setAttribute('d',`M${b.x} ${b.y-14} Q${cx} ${cy} ${tx} ${ty}`);$('aimDot').setAttribute('cx',tx);$('aimDot').setAttribute('cy',ty);
  show('aim',true);bdEls.forEach((e,i)=>e.classList.toggle('aim',i===z))}
touch.addEventListener('pointerdown',e=>{if(state!=='aim')return;drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,t0:performance.now()};try{touch.setPointerCapture(e.pointerId)}catch(_){}});
touch.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.x=e.clientX;drag.y=e.clientY;if(state!=='aim')return;
  const z=swipeZone(drag);drawAim(z)});
const upH=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;d.x=e.clientX;d.y=e.clientY;clearAim();if(state!=='aim')return;
  const moved=Math.hypot(d.x-d.x0,d.y-d.y0);let z=-1;if(moved<14)z=tapZone(d.x,d.y);else z=swipeZone(d);if(z>=0)shoot(z)};
touch.addEventListener('pointerup',upH);touch.addEventListener('pointercancel',()=>clearAim());
touch.addEventListener('pointermove',e=>{if(drag||state!=='aim'||e.pointerType!=='mouse')return;const z=tapZone(e.clientX,e.clientY);bdEls.forEach((el_,i)=>el_.classList.toggle('aim',i===z));touch.style.cursor=z>=0?'pointer':'default'});
addEventListener('keydown',e=>{if(e.repeat)return;
  if(e.code==='Escape'||e.code==='KeyP'){state==='paused'?resume():pause();return}
  if(state==='over'&&e.code==='Enter'&&!(EMBED&&EMBED.lock)&&!$('over').hidden){start();return}
  if(state!=='aim')return;
  const map={Digit1:0,Digit2:1,Digit3:2,Numpad1:0,Numpad2:1,Numpad3:2,ArrowLeft:0,ArrowUp:1,ArrowRight:2};
  if(e.code in map){e.preventDefault();shoot(map[e.code])}});

/* ======================= MENU ======================= */
function kitSvg(k){const id='p'+k.id,s=k.second||k.trim;
  const pat={stripes:`<pattern id="${id}" width="10" height="64" patternUnits="userSpaceOnUse"><rect width="10" height="64" fill="${k.shirt}"/><rect x="5" width="5" height="64" fill="${s}"/></pattern>`,
    hoops:`<pattern id="${id}" width="64" height="12" patternUnits="userSpaceOnUse"><rect width="64" height="12" fill="${k.shirt}"/><rect y="6" width="64" height="6" fill="${s}"/></pattern>`,
    halves:`<linearGradient id="${id}"><stop offset=".5" stop-color="${k.shirt}"/><stop offset=".5" stop-color="${s}"/></linearGradient>`,
    sash:`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset=".38" stop-color="${k.shirt}"/><stop offset=".38" stop-color="${s}"/><stop offset=".6" stop-color="${s}"/><stop offset=".6" stop-color="${k.shirt}"/></linearGradient>`,
    plain:`<linearGradient id="${id}"><stop stop-color="${k.shirt}"/></linearGradient>`}[k.style||'plain'];
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>${pat}</defs><path d="M22 8 12 12 3 24l9 7 4-4v29h32V27l4 4 9-7-9-12-10-4c-1 5-5 8-10 8s-9-3-10-8z" fill="url(#${id})" stroke="#0f1d33" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 8c1 5 5 8 10 8s9-3 10-8" fill="none" stroke="${k.trim}" stroke-width="3"/><path d="M14 46h36" stroke="none"/><text x="32" y="44" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="15" fill="${k.numColor}" stroke="${k.shirt}" stroke-width=".6">${k.number}</text></svg>`}
function ballCanvas(id,size){const c=document.createElement('canvas');c.width=c.height=size*2;const x=c.getContext('2d'),S2=size*2;
  const off=document.createElement('canvas');off.width=256;off.height=128;drawBall(off.getContext('2d'),id,256,128);
  x.save();x.beginPath();x.arc(size,size,size-2,0,7);x.clip();x.drawImage(off,64,16,128,96,0,0,S2,S2);
  const g=x.createRadialGradient(size*.7,size*.6,size*.1,size,size,size);g.addColorStop(0,'rgba(255,255,255,.25)');g.addColorStop(.7,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.35)');x.fillStyle=g;x.fillRect(0,0,S2,S2);x.restore();
  x.lineWidth=3;x.strokeStyle='#0f1d33';x.beginPath();x.arc(size,size,size-2,0,7);x.stroke();return c}
function renderSubjects(){const box=$('subjects');box.innerHTML='';
  SUBJECTS.forEach(s=>{const b=el('button','tile');b.type='button';b.id='subj-'+s.id;b.style.setProperty('--h',SHUE[s.id]);
    const ic=el('span','sicon');ic.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${SICON[s.id]||''}</svg>`;
    const tx=el('span','tx');tx.append(el('strong',null,s.name),el('span',null,`${s.topics.filter(x=>!x.unit).length} topics`));b.append(ic,tx);
    b.onclick=()=>{if(cfg.subject!==s.id){cfg.subject=s.id;cfg.topic=s.topics[0].id}saveCfg();S.tap();go('stepTopic')};box.append(b)})}
function renderTopics(){const s=curSubject(),tp0=curTopic();cfg.topic=tp0.id;$('subName').textContent=s.name;
  const box=$('topics');box.innerHTML='';
  {const o=document.getElementById('topTabs');if(o)o.remove();const tb=EduQ.topicTabs&&EduQ.topicTabs(s,tp0,id=>{cfg.topic=id;saveCfg();renderTopics()});if(tb){tb.id='topTabs';box.before(tb)}}
  (EduQ.topicsOf?EduQ.topicsOf(s,tp0):s.topics).forEach(tp=>{const b=el('button','row');b.type='button';b.id='topic-'+tp.id;b.setAttribute('aria-pressed',tp.id===cfg.topic);
    const tx=el('span','tx');tx.append(el('strong',null,tp.name),el('span',null,tp.regions&&EduQ.regionLabel?EduQ.regionLabel(EduQ.getRegions(tp.id)):tp.bl));
    b.append(el('span','radio'),tx);const bs=getBest(tp.id,topicDiff(tp),cfg.mode);if(bs)b.append(el('span','best',`best ${bs}`));
    b.onclick=()=>{cfg.topic=tp.id;saveCfg();renderTopics()};box.append(b)});
  {const old=document.getElementById('regPick');if(old)old.remove();const pk=EduQ.regionPicker&&EduQ.regionPicker(tp0,{onChange:renderTopics});if(pk){pk.id='regPick';box.after(pk)}}
  $('startBtn').textContent='Kick off';
  const dd=topicDiff(tp0);document.querySelectorAll('#diffSeg button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.d===dd));
  const ms=$('modeSeg');ms.innerHTML='';MODES.forEach(m=>{const b=el('button',null,m.name);b.type='button';b.setAttribute('aria-pressed',m.id===cfg.mode);b.onclick=()=>{cfg.mode=m.id;saveCfg();renderTopics()};ms.append(b)})}
document.querySelectorAll('#diffSeg button').forEach(b=>b.onclick=()=>{cfg.diffs[curTopic().id]=+b.dataset.d;saveCfg();renderTopics()});
function renderKits(){const box=$('kits');box.innerHTML='';KITS.forEach(k=>{const b=el('button','opt');b.type='button';b.setAttribute('aria-pressed',k.id===cfg.kit);
  b.innerHTML=kitSvg(k);b.append(el('span',null,k.name));b.onclick=()=>{cfg.kit=k.id;saveCfg();applyLooks();renderKits()};box.append(b)})}
function renderBalls(){const box=$('balls');box.innerHTML='';BALLS.forEach(k=>{const b=el('button','opt');b.type='button';b.setAttribute('aria-pressed',k.id===cfg.ball);
  b.append(ballCanvas(k.id,36),el('span',null,k.name));b.onclick=()=>{cfg.ball=k.id;saveCfg();applyLooks();renderBalls()};box.append(b)})}
function paintHome(){const k=curKit(),b=curBall();$('kitSw').innerHTML=kitSvg(k);$('kitName').textContent=k.name;
  const bs=$('ballSw');bs.innerHTML='';bs.append(ballCanvas(b.id,22));$('ballName').textContent=b.name;paintAudio()}
function go(id){panel(id);({scrHome:paintHome,stepSubj:renderSubjects,stepTopic:renderTopics,scrKit:renderKits,scrBall:renderBalls})[id]();
  const sc=$(id).querySelector('.scroll');if(sc)sc.scrollTop=0}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){S.tap();go(b.dataset.go)}});
function applyLooks(){paintBall();paintCrowd();paintLed();paintKits();document.documentElement.style.setProperty('--kit',curKit().shirt);paintHome()}
/* ======================= PORTAL EMBED (edugames contract v1) =======================
   Opened by the portal as ?topic=<id>&level=1-3&mode=p10|p20|t60|t90&lock=1 → settings come from the portal and the run starts at once.
   lock=1 (class mode): no replay, no topic menu. Posts edu-ready on load, edu-progress after every shot, edu-result at the end. */
const EMBED=(()=>{const p=new URLSearchParams(location.search);if(!p.get('topic'))return null;
  return{topic:p.get('topic'),level:+p.get('level')||0,mode:p.get('mode')||'',lock:p.get('lock')==='1'}})();
/* continents from the portal (class mode); no regions param = all continents */
const EMBED_REG=EMBED?(EduQ.parseRegions?EduQ.parseRegions(new URLSearchParams(location.search).get('regions'))||EduQ.REGIONS.map(r=>r.id):null):null;
let lastAns=null;/* the last answer rides on the next edu-progress, for the portal's mistakes report */
const toParent=m=>{try{if(m&&m.type==='edu-progress'&&lastAns){m.last=lastAns;lastAns=null}if(window.parent!==window)window.parent.postMessage(m,'*')}catch(e){}};
function applyEmbed(){if(!EMBED)return false;const s=SUBJECTS.find(s=>s.topics.some(t=>t.id===EMBED.topic));if(!s)return false;
  /* kept in `ov`, never saved into the player's own settings */
  ov={subject:s.id,topic:EMBED.topic,level:[1,2,3].includes(EMBED.level)?EMBED.level:0,mode:MODES.some(m=>m.id===EMBED.mode)?EMBED.mode:'p10'};
  if(EMBED.lock){$('againBtn').hidden=true;$('menuBtn').hidden=true;$('overActions').prepend(el('p','sent','Result sent to your teacher.'))}
  return true}

/* ======================= LOOP ======================= */
const clock=new THREE.Clock();
function paintKits(){paintKeeperKit(curKit());paintJumbo()}
function update(dtR){
  t+=dtR;
  if(slowT>0){slowT-=dtR;if(slowT<=0)slow=1}
  const sm=slow<1?slow:1,dt=dtR*sm;
  if(state==='intro'){introT+=dtR;if(charsReady){if(introT>.6)$('count').textContent='Kick off!';if(introT>1.3){show('count',false);S.whistle([.35]);nextShot()}}else introT=Math.min(introT,.3)}
  const timed=MODE().kind==='t';
  if(timed&&(state==='aim'||state==='shot')){timeLeft-=dtR;if(Math.ceil(timeLeft)!==Math.ceil(timeLeft+dtR))paintHud();if(state==='aim'&&timeLeft<=0){timeLeft=0;paintHud();end('time')}}
  if(state==='aim')stT+=dtR;
  if(state==='shot'&&!shot.live&&shot.windup>0){shot.windup-=dtR;if(shot.windup<=0)onStrike()}
  if(shot.live){shot.ft+=dt;
    if(!shot.resolved&&!shot.ok&&shot.ft>=shot.T-.004)onBallEvent('save');
    if(!shot.resolved&&shot.ft>shot.T+1.6){shot.resolved=true;resolve(shot.ok)}}
  if(state==='after'){afterT+=dtR;
    if(afterT>.9&&CAM.mode==='shot')CAM.mode='back';
    if(afterT>afterDur)nextShot()}
  stepKeeper(dt);
  if(ledFlash>0){ledFlash-=dtR;if(ledFlash<=0){paintLed();JB.msg='';paintJumbo()}}
  stepBall(dt);stepBoards(dtR);
  excite=Math.max(0,excite-dtR*.3);stepCrowd(dtR);
  ledTex.offset.x=(ledTex.offset.x+dtR*.01)%1;
  targets.forEach((m,i)=>{const on=(state==='aim'&&aimZone===i)?.85:0;m.material.opacity+=(on-m.material.opacity)*Math.min(1,dtR*10)});
  stepCamera(dt);
  placeBoards(false);
  const bp=toScreen(SPOT);view.ballPx=bp;
  if(!$('hint').classList.contains('off'))$('hint').style.top=(bp.y-80)+'px'}
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(state!=='paused'){update(dt);perfSample(dt)}R.render(scene,cam)}
window.__step=s=>{for(let i=0;i<s*60;i++)update(1/60);R.render(scene,cam)};/* used by automated tests */

paintAudio();applyLooks();layout();resetActors();go('scrHome');
if(applyEmbed())start();toParent({type:'edu-ready',game:GAME});
frame();
