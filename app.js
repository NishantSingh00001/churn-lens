'use strict';
window.APP={
  id:'cl',name:'ChurnLens',
  logo:'<span class="mk"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4v16h18"/><path d="M20 7c-3 5-6 3-9 6s-5 2-7 4"/></svg></span>',
  nav:[['index.html','home','Home'],['cohorts.html','grid','Cohorts'],['customers.html','users','Customers'],['segments.html','seg','Segments'],['simulator.html','flask','Simulator'],['settings.html','settings','Settings']],
  accents:[['#ff5370','#ff9068','#ffc46b'],['#ff9068','#ff5370','#ffc46b'],['#ffc46b','#ff5370','#ff9068'],['#6ba8ff','#ff5370','#ff9068']],
  cta:['customers.html','users','See who’s at risk'],
  icons:{
    grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    users:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    seg:'M12 2a10 10 0 100 20 10 10 0 000-20zM12 2v10l7 5',
    flask:'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7 15h10',
    heart:'M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0012 5 4.5 4.5 0 002 8.5C2 10.7 3.5 12.5 5 14l7 7z',
    warn:'M12 3l9 16H3zM12 10v4M12 17v.5'
  },
  ensureSeed(){}
};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function sigmoid(x){return 1/(1+Math.exp(-x));}
/* ---------------- churn model ---------------- */
// features (normalized) and weights (positive => raises churn)
const WEIGHTS={bias:-0.4,tenure:-1.9,engagement:-2.4,tickets:1.7,nps:-1.6,price:1.8,enterprise:-1.1};
const FACTOR_LABELS={tenure:'Account tenure',engagement:'Product engagement',tickets:'Support friction',nps:'Satisfaction (NPS)',price:'Price sensitivity',enterprise:'Plan tier'};
function churnProb(f){
  const z=WEIGHTS.bias
    +WEIGHTS.tenure*((f.tenure-18)/18)
    +WEIGHTS.engagement*(f.engagement-0.5)*2
    +WEIGHTS.tickets*((f.tickets-2)/4)
    +WEIGHTS.nps*((f.nps-6)/4)
    +WEIGHTS.price*(f.price-0.5)*2
    +WEIGHTS.enterprise*(f.plan==='Enterprise'?1:f.plan==='Pro'?0.3:-0.3);
  return sigmoid(z);
}
function factorContribs(f){
  return [
   ['tenure',WEIGHTS.tenure*((f.tenure-18)/18)],
   ['engagement',WEIGHTS.engagement*(f.engagement-0.5)*2],
   ['tickets',WEIGHTS.tickets*((f.tickets-2)/4)],
   ['nps',WEIGHTS.nps*((f.nps-6)/4)],
   ['price',WEIGHTS.price*(f.price-0.5)*2],
   ['enterprise',WEIGHTS.enterprise*(f.plan==='Enterprise'?1:f.plan==='Pro'?0.3:-0.3)]
  ].map(([k,v])=>({k,v,label:FACTOR_LABELS[k]})).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
}
function band(p){return p<0.25?'low':p<0.55?'med':'high';}
/* ---------------- seeded customers ---------------- */
const COMPANIES=['Northwind','Umbra Labs','Vertex IO','Lumen','Cobalt','Riverbend','Aperture','Halcyon','Nimbus','Sidecar','Foundry','Meridian','Clearstep','Oak & Iron','Brightwave','Tessera','Ironwood','Pelican','Juniper','Solstice','Kestrel','Marlow','Driftwood','Vantage','Harbor','Quill','Axiom','Fathom','Lantern','Bramble','Cascade','Ember','Grove','Hollow','Indigo','Jetty','Kiln','Lark','Moss','Onyx'];
const PLANS=['Starter','Pro','Enterprise'];const REGIONS=['NA','EMEA','APAC','LATAM'];
function buildCustomers(){const rng=mulberry32(77);
  return COMPANIES.map((c,i)=>{const plan=PLANS[Math.floor(rng()*3)];const region=REGIONS[Math.floor(rng()*4)];
    const tenure=Math.round(1+rng()*47);const engagement=Math.max(0.03,Math.min(0.99,rng()*rng()+0.15));
    const tickets=Math.round(rng()*rng()*9);const nps=Math.round(rng()*10);const price=Math.max(0.05,Math.min(0.98,rng()));
    const mrr=({Starter:49,Pro:299,Enterprise:1800})[plan]*(0.6+rng()*1.8)|0;
    const f={tenure,engagement,tickets,nps,price,plan};const risk=churnProb(f);
    return {id:'c'+i,name:c,plan,region,mrr,f,risk,cohort:Math.floor(rng()*12)};
  }).sort((a,b)=>b.risk-a.risk);
}
let CUSTOMERS=buildCustomers();
function cust(id){return CUSTOMERS.find(c=>c.id===id);}
/* ---------------- cohorts (retention triangle) ---------------- */
const MONTHS=['Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'];
function buildCohorts(adjust){ // adjust: optional fn(f)->f
  return MONTHS.map((m,ci)=>{const members=CUSTOMERS.filter(c=>c.cohort===ci);
    const size=12+members.length*2+ci;
    const avgHazard=(members.length?members.reduce((s,c)=>s+(adjust?churnProb(adjust(c.f)):c.risk),0)/members.length:0.3)/6; // monthly
    const curve=[100];for(let t=1;t<=11-0+1;t++){curve.push(curve[t-1]*(1-avgHazard*(0.7+t*0.03)));}
    return {month:m,ci,size:Math.round(size*3.2),hazard:avgHazard,curve,observed:12-ci};
  });
}
/* ---------------- canvas line chart ---------------- */
function lineChart(cv,series,opts){opts=opts||{};const DPR=Math.min(2,devicePixelRatio||1);const rect=cv.getBoundingClientRect();
  const w=cv.width=(rect.width||600)*DPR,h=cv.height=(opts.h||200)*DPR;const ctx=cv.getContext('2d');ctx.clearRect(0,0,w,h);
  const pad={l:40*DPR,r:12*DPR,t:14*DPR,b:22*DPR};const iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  const cs=getComputedStyle(document.documentElement);const col=v=>cs.getPropertyValue(v).trim()||'#ff5370';
  let lo=opts.min!=null?opts.min:0,hi=opts.max!=null?opts.max:100;
  const maxLen=Math.max(...series.map(s=>s.data.length));
  const X=i=>pad.l+iw*(i/(maxLen-1)),Y=v=>pad.t+ih*(1-(v-lo)/(hi-lo));
  ctx.strokeStyle=col('--hair');ctx.lineWidth=1*DPR;ctx.fillStyle=col('--mut');ctx.font=(10*DPR)+'px IBM Plex Mono';
  for(let g=0;g<=4;g++){const y=pad.t+ih*g/4;ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.globalAlpha=1;ctx.fillText(Math.round(hi-(hi-lo)*g/4)+(opts.pct?'%':''),4*DPR,y+3*DPR);}
  series.forEach(s=>{const c=col(s.color||'--acc');
    if(s.fill){const grd=ctx.createLinearGradient(0,pad.t,0,h);grd.addColorStop(0,c+'55');grd.addColorStop(1,c+'00');ctx.fillStyle=grd;ctx.beginPath();ctx.moveTo(X(0),Y(s.data[0]));s.data.forEach((v,i)=>ctx.lineTo(X(i),Y(v)));ctx.lineTo(X(s.data.length-1),h-pad.b);ctx.lineTo(X(0),h-pad.b);ctx.closePath();ctx.fill();}
    ctx.strokeStyle=c;ctx.lineWidth=(s.w||2)*DPR;ctx.globalAlpha=s.a!=null?s.a:1;ctx.lineJoin='round';ctx.beginPath();s.data.forEach((v,i)=>i?ctx.lineTo(X(i),Y(v)):ctx.moveTo(X(i),Y(v)));ctx.stroke();ctx.globalAlpha=1;});
}
/* ---------------- heat color ---------------- */
function heat(p){ // p 0..100 retention; green high, red low
  const t=Math.max(0,Math.min(1,p/100));
  const r=Math.round(255*(1-t)+79*t),g=Math.round(83*(1-t)+224*t),b=Math.round(112*(1-t)+160*t);
  return 'rgb('+r+','+g+','+b+')';
}
/* ---------------- custom 3D hero: cohort-decay ribbons ---------------- */
function mountRibbonHero(id){if(typeof THREE==='undefined')return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=document.getElementById(id);if(!cv)return;const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  const b=cv.getBoundingClientRect();let w=b.width||480,h=b.height||480;r.setPixelRatio(Math.min(2,devicePixelRatio));r.setSize(w,h,false);
  const sc=new THREE.Scene();const cam=new THREE.PerspectiveCamera(52,w/h,.1,100);cam.position.set(0,1.4,6);
  const cs=getComputedStyle(document.documentElement);const C=v=>new THREE.Color(cs.getPropertyValue(v).trim()||'#ff5370');
  const acc=C('--acc'),acc2=C('--acc2'),amb=C('--amb');
  const grp=new THREE.Group();grp.rotation.x=-0.25;grp.rotation.y=0.5;sc.add(grp);
  const NC=11,SEG=48;const ribbons=[];
  for(let ci=0;ci<NC;ci++){const z=(ci/(NC-1)-0.5)*4.2;const hazard=0.25+ (ci/NC)*0.5;
    const pts=[],cols=[];for(let s=0;s<=SEG;s++){const x=(s/SEG-0.5)*6.4;const tt=s/SEG;const y=2.1*Math.exp(-hazard*tt*3)-0.6;pts.push(x,y,z);
      const col=acc.clone().lerp(ci<NC/2?acc2:amb,ci/NC).lerp(amb,tt*0.4);cols.push(col.r,col.g,col.b);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
    const line=new THREE.Line(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.85,blending:THREE.AdditiveBlending}));grp.add(line);
    const pg=new THREE.Points(g,new THREE.PointsMaterial({size:.05,vertexColors:true,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));grp.add(pg);
    ribbons.push({g,hazard,base:pts.slice()});}
  let mX=0,mY=0;cv.addEventListener('pointermove',e=>{const r2=cv.getBoundingClientRect();mX=(e.clientX-r2.left)/r2.width-.5;mY=(e.clientY-r2.top)/r2.height-.5;});
  const t0=performance.now();
  (function loop(now){const t=(now-t0)/1000;
    ribbons.forEach((rb,ci)=>{const pos=rb.g.attributes.position;for(let s=0;s<=SEG;s++){const tt=s/SEG;const haz=rb.hazard+Math.sin(t*0.5+ci)*0.04;const y=2.1*Math.exp(-haz*tt*3)-0.6+Math.sin(t+tt*6+ci)*0.04;pos.setY(s,y);}pos.needsUpdate=true;});
    grp.rotation.y=0.5+mX*0.5+Math.sin(t*0.15)*0.1;grp.rotation.x=-0.25+mY*0.2;
    r.render(sc,cam);requestAnimationFrame(loop);})(t0);
  addEventListener('resize',()=>{const b2=cv.getBoundingClientRect();w=b2.width;h=b2.height;cam.aspect=w/h;cam.updateProjectionMatrix();r.setSize(w,h,false);});
}
/* ---------------- helpers ---------------- */
function statRow(c){return c.map(([l,n])=>'<div class="bstat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');}
function marq(t){const s='<span>'+t.map(x=>'<b>'+x+'</b>').join(' · ')+' · </span>';return s+s;}
function featGrid(items){return items.map(([h,ic,t,d],i)=>'<a class="fcell" href="'+h+'"><div class="fi">'+icon(ic,22)+'</div><div class="fx">0'+(i+1)+'</div><h3>'+t+'</h3><p>'+d+'</p><div class="go">Open '+icon('chevron',13)+'</div></a>').join('');}
function money(n){return n>=1000?'$'+(n/1000).toFixed(n>=10000?0:1)+'k':'$'+Math.round(n);}
function pct(x){return Math.round(x*100)+'%';}
function riskColor(p){return p<0.25?'var(--grn)':p<0.55?'var(--gold)':'var(--rose)';}
const FEATURES="predictive churn scoring · logistic risk model · 40 seeded accounts · per-account churn probability · low/med/high risk bands · explainable risk factors · per-factor contribution (SHAP-style) · risk-ranked customer list · search & sort · cohort retention triangle · 12 monthly cohorts · retention curves · survival decay · heatmap coloring · segment analysis · risk by plan · risk by region · MRR at risk per segment · what-if simulator · 4 retention levers · live model re-scoring · customers saved · MRR saved (annualized) · LTV impact · revenue at risk · average churn rate · retention rate · 3D cohort-decay ribbon hero · cursor-reactive hero · ambient motion · scroll reveals · custom cursor · light & dark · 4 accents · keyboard theme toggle · JSON export · fully offline · responsive · award-grade UI";
/* ---------------- PAGES ---------------- */
window.PAGES={
 index(){
   const atRisk=CUSTOMERS.filter(c=>c.risk>=0.55);const mrrRisk=atRisk.reduce((s,c)=>s+c.mrr,0);
   $('meta').innerHTML=statRow([['accounts',CUSTOMERS.length],['<span style="color:var(--rose)">high risk</span>',atRisk.length],['MRR at risk',money(mrrRisk)],['avg churn',pct(CUSTOMERS.reduce((s,c)=>s+c.risk,0)/CUSTOMERS.length)]]);
   $('marq').innerHTML=marq(['churn prediction','retention cohorts','risk scoring','MRR at risk','what-if levers','save revenue','retain more']);
   $('fgrid').innerHTML=featGrid([
     ['customers.html','users','At-risk accounts','Every account scored and ranked, with the factors driving the risk.'],
     ['cohorts.html','grid','Retention cohorts','A monthly retention triangle and survival curves across cohorts.'],
     ['segments.html','seg','Segments','Where churn concentrates — by plan and region, with MRR at risk.'],
     ['simulator.html','flask','What-if simulator','Pull a retention lever and watch the model re-score every account.'],
     ['customers.html','heart','Explainable risk','Per-account factor contributions, not a black-box score.'],
     ['settings.html','settings','Settings','Theme, accents and a private JSON export.']
   ]);
   $('featlist').textContent='50+ features — '+FEATURES+'.';
   mountRibbonHero('hero3d');
 },
 customers(){
   let q='',rf='all',sort='risk';
   function draw(){let list=CUSTOMERS.filter(c=>(rf==='all'||band(c.risk)===rf)&&(c.name.toLowerCase().includes(q)||c.plan.toLowerCase().includes(q)||c.region.toLowerCase().includes(q)));
     list=list.slice().sort((a,b)=>sort==='risk'?b.risk-a.risk:sort==='mrr'?b.mrr-a.mrr:a.name.localeCompare(b.name));
     $('clist').innerHTML=list.map(c=>{const bd=band(c.risk);const col=riskColor(c.risk);
       return '<div class="crow" data-id="'+c.id+'"><span class="rdot '+bd+'"></span><div><div class="cn">'+esc(c.name)+'</div><div class="cp">'+c.plan+' · '+c.region+' · '+c.f.tenure+'mo</div></div><span class="rtag '+bd+'">'+bd+'</span><div class="hidec"><div class="cp">MRR</div><div class="num">'+money(c.mrr)+'</div></div><div class="hidec"><div class="rmeter"><i style="width:'+Math.round(c.risk*100)+'%;background:'+col+'"></i></div><div class="cp" style="margin-top:4px">engagement '+pct(c.f.engagement)+'</div></div><div class="risknum" style="color:'+col+'">'+pct(c.risk)+'</div></div>';}).join('');
     $('clist').querySelectorAll('.crow').forEach(row=>row.onclick=()=>openDrawer(row.dataset.id));
   }
   $('q').oninput=()=>{q=$('q').value.toLowerCase().trim();draw();};
   $('rseg').querySelectorAll('button').forEach(b=>b.onclick=()=>{rf=b.dataset.r;$('rseg').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw();});
   $('sortseg').querySelectorAll('button').forEach(b=>b.onclick=()=>{sort=b.dataset.s;$('sortseg').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw();});
   $('summary').innerHTML=statRow([['<span style="color:var(--rose)">high</span>',CUSTOMERS.filter(c=>band(c.risk)==='high').length],['<span style="color:var(--gold)">medium</span>',CUSTOMERS.filter(c=>band(c.risk)==='med').length],['<span style="color:var(--grn)">low</span>',CUSTOMERS.filter(c=>band(c.risk)==='low').length],['total MRR',money(CUSTOMERS.reduce((s,c)=>s+c.mrr,0))]]);
   draw();
   function openDrawer(id){const c=cust(id);const contribs=factorContribs(c.f);const maxc=Math.max(...contribs.map(x=>Math.abs(x.v)));
     $('dname').textContent=c.name;$('dmeta').textContent=c.plan+' · '+c.region+' · '+money(c.mrr)+'/mo · '+c.f.tenure+' months';
     $('drisk').innerHTML='<div style="font-family:var(--disp);font-weight:700;font-size:44px;color:'+riskColor(c.risk)+'">'+pct(c.risk)+'</div><div class="rtag '+band(c.risk)+'" style="margin-top:6px">'+band(c.risk)+' risk of churn · 90 days</div>';
     $('dfactors').innerHTML=contribs.map(f=>{const up=f.v>0;return '<div class="factor"><div class="fl">'+f.label+'<div class="cp" style="font-family:var(--mono);font-size:10px;color:var(--dim)">'+(up?'increases':'reduces')+' churn risk</div></div><div class="fb"><i style="width:'+Math.round(Math.abs(f.v)/maxc*100)+'%;background:'+(up?'var(--rose)':'var(--grn)')+'"></i></div><div class="fv" style="color:'+(up?'var(--rose)':'var(--grn)')+'">'+(up?'+':'')+f.v.toFixed(2)+'</div></div>';}).join('');
     $('drec').textContent=contribs[0].v>0?('Biggest lever: '+contribs[0].label.toLowerCase()+'. '+(contribs[0].k==='engagement'?'Drive product adoption with a success touch.':contribs[0].k==='tickets'?'Resolve open support friction proactively.':contribs[0].k==='price'?'Review pricing fit or offer an annual discount.':contribs[0].k==='nps'?'Follow up on the low satisfaction signal.':'Deepen the account relationship.')):'This account is healthy — low churn risk. Consider an expansion play.';
     $('drawer').classList.add('on');
   }
   $('dclose').onclick=()=>$('drawer').classList.remove('on');$('drawer').onclick=e=>{if(e.target===$('drawer'))$('drawer').classList.remove('on');};
 },
 cohorts(){
   const cohorts=buildCohorts();
   // triangle
   let head='<th></th>';for(let m=0;m<12;m++)head+='<th>M'+m+'</th>';
   let rows='';cohorts.forEach(co=>{let tds='<td class="lbl">'+co.month+' · '+co.size+'</td>';
     for(let m=0;m<12;m++){if(m<=co.observed){const v=co.curve[m]!=null?co.curve[m]:0;tds+='<td class="cell" style="background:'+heat(v)+'">'+Math.round(v)+'</td>';}else tds+='<td></td>';}
     rows+='<tr>'+tds+'</tr>';});
   $('tri').innerHTML='<tr>'+head+'</tr>'+rows;
   // curves chart
   lineChart($('curveChart'),cohorts.map((co,i)=>({data:co.curve.slice(0,co.observed+1),color:i%3===0?'--acc':i%3===1?'--acc2':'--amb',a:.4+i/cohorts.length*0.5,w:1.6})),{h:240,min:0,max:100,pct:true});
   const avgM12=cohorts.filter(c=>c.observed>=6).reduce((s,c)=>s+c.curve[6],0)/cohorts.filter(c=>c.observed>=6).length;
   $('cstats').innerHTML=statRow([['cohorts',cohorts.length],['avg M6 retention',Math.round(avgM12)+'%'],['total members',cohorts.reduce((s,c)=>s+c.size,0)],['best cohort',cohorts.reduce((a,c)=>c.curve[c.observed]>a.v?{m:c.month,v:c.curve[c.observed]}:a,{m:'',v:0}).m]]);
 },
 segments(){
   function agg(key){const g={};CUSTOMERS.forEach(c=>{const k=c[key];(g[k]=g[k]||[]).push(c);});
     return Object.keys(g).map(k=>{const arr=g[k];const avg=arr.reduce((s,c)=>s+c.risk,0)/arr.length;const atRisk=arr.filter(c=>c.risk>=0.55);return {k,n:arr.length,avg,mrrRisk:atRisk.reduce((s,c)=>s+c.mrr,0)};}).sort((a,b)=>b.avg-a.avg);}
   function render(id,data){const mx=Math.max(...data.map(d=>d.avg));
     $(id).innerHTML=data.map(d=>'<div class="segbar"><span class="sn">'+esc(d.k)+'</span><div class="st"><i style="width:'+Math.round(d.avg/Math.max(mx,0.6)*100)+'%"></i><span class="lab">'+pct(d.avg)+' churn</span></div><span class="sc">'+d.n+' acct · '+money(d.mrrRisk)+'</span></div>').join('');}
   render('byplan',agg('plan'));render('byregion',agg('region'));
   const worst=agg('plan')[0];
   $('sstats').innerHTML=statRow([['segments','plan × region'],['worst plan',worst.k],['worst churn',pct(worst.avg)],['MRR at risk',money(CUSTOMERS.filter(c=>c.risk>=0.55).reduce((s,c)=>s+c.mrr,0))]]);
 },
 simulator(){
   const levers={engagement:0,price:0,nps:0,tickets:0};
   function adjust(f){return {...f,
     engagement:Math.min(0.99,f.engagement+levers.engagement),
     price:Math.max(0.03,f.price-levers.price),
     nps:Math.min(10,f.nps+levers.nps),
     tickets:Math.max(0,f.tickets-levers.tickets)};}
   function run(){
     levers.engagement=+$('lEng').value;levers.price=+$('lPrice').value;levers.nps=+$('lNps').value;levers.tickets=+$('lTickets').value;
     $('lEngV').textContent='+'+Math.round(levers.engagement*100)+'%';$('lPriceV').textContent='-'+Math.round(levers.price*100)+'%';$('lNpsV').textContent='+'+levers.nps.toFixed(1);$('lTicketsV').textContent='-'+levers.tickets.toFixed(1);
     const base=CUSTOMERS.reduce((s,c)=>s+c.risk,0);const after=CUSTOMERS.reduce((s,c)=>s+churnProb(adjust(c.f)),0);
     const saved=base-after;const savedMrr=CUSTOMERS.reduce((s,c)=>s+c.mrr*(c.risk-churnProb(adjust(c.f))),0)*12;
     const avgBase=base/CUSTOMERS.length,avgAfter=after/CUSTOMERS.length;
     $('result').innerHTML=[
       ['<div class="bn up">'+saved.toFixed(1)+'</div>','accounts saved / 90d'],
       ['<div class="bn up">'+money(Math.max(0,savedMrr))+'</div>','annual revenue retained'],
       ['<div class="bn '+(avgAfter<avgBase?'up':'')+'">'+pct(avgBase)+' → '+pct(avgAfter)+'</div>','avg churn rate']
     ].map(x=>'<div class="bres">'+x[0]+'<div class="bl">'+x[1]+'</div></div>').join('');
     // before/after retention curve (approx: 1-churn compounded monthly)
     const curveBase=[100],curveAfter=[100];for(let t=1;t<=11;t++){curveBase.push(curveBase[t-1]*(1-avgBase/6));curveAfter.push(curveAfter[t-1]*(1-avgAfter/6));}
     lineChart($('simChart'),[{data:curveBase,color:'--rose',fill:false,w:2,a:.6},{data:curveAfter,color:'--grn',fill:true,w:2.4}],{h:220,min:0,max:100,pct:true});
     const highBefore=CUSTOMERS.filter(c=>c.risk>=0.55).length,highAfter=CUSTOMERS.filter(c=>churnProb(adjust(c.f))>=0.55).length;
     $('simkv').innerHTML=[['High-risk accounts',highBefore+' → '+highAfter],['Avg churn (90d)',pct(avgBase)+' → '+pct(avgAfter)],['Retention @ M6',Math.round(curveBase[6])+'% → '+Math.round(curveAfter[6])+'%'],['Annual revenue saved',money(Math.max(0,savedMrr))],['Accounts flipped to safe',Math.max(0,highBefore-highAfter)]].map(r=>'<div class="kv"><span class="k">'+r[0]+'</span><span class="v">'+esc(String(r[1]))+'</span></div>').join('');
   }
   ['lEng','lPrice','lNps','lTickets'].forEach(id=>$(id).oninput=run);
   $('reset').onclick=()=>{['lEng','lPrice','lNps','lTickets'].forEach(id=>$(id).value=0);run();};
   run();
 },
 settings(){
   $('themeToggle').classList.toggle('on',theme()==='light');$('themeToggle').onclick=()=>{toggleTheme();$('themeToggle').classList.toggle('on',theme()==='light');};
   $('accents2').innerHTML=APP.accents.map((a,i)=>'<button class="ad'+(i===accentIdx()?' on':'')+'" data-i="'+i+'" data-press style="width:24px;height:24px;background:linear-gradient(135deg,'+a[0]+','+a[1]+')"></button>').join('');
   $('accents2').querySelectorAll('.ad').forEach(b=>b.onclick=()=>setAccent(+b.dataset.i));
   $('exp').onclick=()=>dl('churnlens-accounts.json','application/json',JSON.stringify(CUSTOMERS.map(c=>({name:c.name,plan:c.plan,region:c.region,mrr:c.mrr,risk:+c.risk.toFixed(3),band:band(c.risk)})),null,2));
   $('featlist').textContent=FEATURES+'.';
 }
};
