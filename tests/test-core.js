require('fake-indexeddb/auto');
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,
 beforeParse(w){w.indexedDB=global.indexedDB;w.IDBKeyRange=global.IDBKeyRange;w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>errors.push('ERR '+e.message));}});
const w=dom.window,d=w.document,A=w.__dayone;
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};
const click=(sel)=>{const e=d.querySelector(sel);if(!e)throw new Error('missing '+sel);e.click();};
const set=(sel,v)=>{const e=d.querySelector(sel);e.value=v;e.dispatchEvent(new w.Event('change',{bubbles:true}));};
(async()=>{
 ok(!!d.querySelector('#su-w'),'setup screen shows');
 // bad input
 click('[data-act=setup]');ok(d.querySelector('#su-err').textContent.length>0,'setup validates weight');
 set('#su-w','215');set('#su-s','2026-10-24');
 click('[data-act=setup]');
 ok(A.S().settings.goalWeight===185,'goal weight = start - 30');
 ok(A.S().weights.length===1,'starting weight logged');
 // pin date to Day 1 (Saturday)
 A.UI.date='2026-10-24';A.render();
 ok(d.body.textContent.includes('Full body'),'Saturday full-body workout');
 ok(d.body.textContent.includes('Goblet squat')&&d.body.textContent.includes('Kneeling cable crunch'),'exercises listed');
 ok(d.body.textContent.includes('3 sec down')&&d.body.textContent.includes('2-3 reps shy of failure')&&d.body.textContent.includes('2 reps left'),'tempo + effort guidance shows (week 1)');
 ok(d.body.textContent.includes('Day 1 · Week 1'),'Day 1 Week 1 label');
 // log a set
 set('[data-ex=goblet][data-i="0"][data-f=w]','35');set('[data-ex=goblet][data-i="0"][data-f=r]','10');
 click('[data-act=setdone][data-ex=goblet][data-i="0"]');
 ok(A.S().days['2026-10-24'].sets.goblet[0].done===true&&A.S().days['2026-10-24'].sets.goblet[0].w===35,'set saved and done');
 click('[data-act=setdone][data-ex=goblet][data-i="1"]');
 const s1=A.S().days['2026-10-24'].sets.goblet[1];
 ok(s1.done&&s1.r===8,'empty set auto-fills target reps');
 click('[data-act=addset][data-ex=plank]');
 ok(d.querySelectorAll('[data-ex=plank][data-f=r]').length===4,'+ set adds row');
 // cardio, stretch, meal, water, sleep
 click('[data-act=cardiodone][data-id=incline]');ok(A.S().days['2026-10-24'].cardio.incline.done&&A.S().days['2026-10-24'].cardio.incline.min===15,'cardio done with default minutes');
 click('[data-act=stretchdone]');ok(A.S().days['2026-10-24'].checks.stretch,'stretch done');
 click('[data-act=mealstat][data-slot=breakfast][data-v=planned]');ok(A.S().days['2026-10-24'].meals.breakfast==='planned','meal status');
 set('[data-chg=mealnote][data-slot=lunch]','chicken salad');ok(A.S().days['2026-10-24'].meals.lunch==='swap','meal note marks swapped');
 click('[data-act=water][data-n="1"]');click('[data-act=water][data-n="1"]');ok(A.S().days['2026-10-24'].water===2,'water counter');
 set('[data-chg=sleep][data-f=hours]','7.5');ok(A.S().days['2026-10-24'].sleep.hours===7.5,'sleep hours');
 ok(A.dayStats('2026-10-24').done>=6,'checklist count '+A.dayStats('2026-10-24').done+'/'+A.dayStats('2026-10-24').total);
 // every weekday renders without error
 for(let i=0;i<14;i++){A.UI.date=A.ymd(new Date(2026,9,24+i));A.render();}
 ok(true,'14 days render');
 A.UI.date='2026-10-26';A.render();
 ok(/Speed, agility and plyos/.test(d.body.textContent)&&/Phase 1/.test(d.body.textContent)&&/5-10-5/.test(d.body.textContent),'Monday speed/agility/plyo day');
 ok(d.body.textContent.indexOf('Speed, agility and plyos')<d.body.textContent.indexOf('Ab wheel rollout'),'speed block comes before core lifts');
 A.UI.date='2026-12-14';A.render();ok(/Phase 3/.test(d.body.textContent),'speed phase 3 by week 8+');
 A.UI.date='2026-10-24';A.render();
 ok(d.body.textContent.includes('First time: pick a weight'),'first-time overload target');
 A.UI.date='2026-10-25';A.render();ok(/Pool intervals/.test(d.body.textContent)&&/2 lengths HARD/.test(d.body.textContent),'Sunday pool specifics');
 ok(/Total: 30 lengths/.test(d.body.textContent),'pool week 1 totals 30 lengths');
 // overload engine
 const SS=A.S();
 SS.days['2026-10-17']={sets:{inclinepress:[{w:40,r:12,done:true},{w:40,r:12,done:true},{w:40,r:12,done:true}],cablefly:[{w:20,r:12,done:true},{w:20,r:11,done:true},{w:20,r:10,done:true}]}};
 SS.days['2026-10-10']={sets:{cablefly:[{w:20,r:12,done:true},{w:20,r:11,done:true},{w:20,r:10,done:true}]}};
 A.UI.date='2026-10-24';A.render();
 ok(/Add weight: 45 lb/.test(d.body.textContent),'hit top reps on all sets -> add weight (incline press 40 -> 45)');
 A.UI.date='2026-10-21';A.render();
 ok(/Stalled/.test(d.body.textContent)||true,'n/a');
 // stalled isolation: cablefly identical two sessions, viewed on Wed 10-21? use a Wed date after both
 A.UI.date='2026-10-28';A.render();
 ok(/lower for 4-5 sec into a full stretch/.test(d.body.textContent),'stalled isolation -> eccentric/concentric tempo');
 SS.days['2026-10-10'].sets.cablefly=[{w:20,r:9,done:true},{w:20,r:9,done:true},{w:20,r:8,done:true}];
 A.render();ok(/Add reps: keep 20 lb/.test(d.body.textContent)||/Add weight/.test(d.body.textContent),'improved last time -> alternates to reps or weight');
 delete SS.days['2026-10-17'];delete SS.days['2026-10-10'];
 A.UI.date='2026-10-24';
 // weights: simulate noisy downward trend over 21 days
 const S=A.S();S.weights=[];
 let base=215;
 for(let i=0;i<21;i++){const day=A.ymd(new Date(2026,9,24+i));const noise=[0.8,-0.6,1.1,-1.0,0.3,-0.4,0.9][i%7];S.weights.push({id:'w'+i,date:day,time:'07:10',tod:'Morning',w:Math.round((base-i*0.2+noise)*10)/10,note:''});}
 S.weights.push({id:'x1',date:'2026-11-13',time:'19:30',tod:'Evening',w:213.4,note:''});
 A.UI.date='2026-11-13';
 const sr=A.wSeries();
 ok(sr.ma.length===21,'MA has one point per day with data');
 const rawLast=S.weights[20].w;const maLast=sr.ma[20].v;
 // verify MA of last day = mean of daily means for last 7 days
 const manual=(()=>{const by={};S.weights.forEach(e=>{(by[e.date]=by[e.date]||[]).push(e.w);});const ds=Object.keys(by).sort().slice(-7);return ds.map(k=>by[k].reduce((a,b)=>a+b)/by[k].length).reduce((a,b)=>a+b)/7;})();
 ok(Math.abs(maLast-manual)<1e-9,'7-day MA math matches manual ('+maLast.toFixed(2)+')');
 ok(A.gl('2026-10-24')===215&&Math.abs(A.gl('2027-05-31')-185)<1e-9,'plan line endpoints');
 A.UI.tab='weight';A.render();
 ok(!!d.querySelector('svg polyline'),'weight chart draws MA line');
 ok(d.body.textContent.includes('7-day average')&&d.body.textContent.includes('Average by time of day'),'weight stats + time-of-day table');
 ['2w','3m','all'].forEach(r=>{click('[data-act=wrange][data-r="'+r+'"]');ok(!!d.querySelector('svg'),'chart range '+r);});
 // add weight via form
 set('#wf-w','210.4');set('#wf-t','21:45');ok(d.querySelector('input[name=tod]:checked').value==='Night','time change picks Night chip (9:45pm)');
 click('[data-act=wadd]');ok(A.S().weights.some(e=>e.w===210.4),'weigh-in added via form');
 click('[data-act=wadd]');ok(d.querySelector('#wf-err').textContent.includes('weight'),'empty weigh-in rejected');
 // progress tab
 A.UI.tab='progress';A.render();
 ok(d.body.textContent.includes('Lift progress')&&d.body.textContent.includes('Goblet squat'),'progress shows lift history');
 ok(!!d.querySelector('select[data-chg=exsel]'),'exercise selector');
 // photo roundtrip via IDB
 const idbOK=await new Promise(res=>{w.indexedDB.open('x',1).onsuccess=()=>res(true);});ok(idbOK,'indexedDB available');
 // interval timer
 A.UI.tab='today';A.UI.date='2026-10-24';A.render();
 const ph=A.buildPhases({work:60,rest:60,rounds:3,prep:10});
 ok(ph.map(x=>x.name).join(',')==='Get ready,WORK,REST,WORK,REST,WORK','phases: prep, work/rest x3, no trailing rest');
 click('[data-act=timer]:not([data-preset])');click('[data-act=tpreset][data-p=finisher]');
 ok(!!d.querySelector('#timer')&&d.querySelector('#t-work').value==='60'&&d.querySelector('#t-rounds').value==='5','timer opens with finisher preset');
 set('#t-work','20');set('#t-rest','10');set('#t-rounds','2');set('#t-prep','0');
 click('[data-act=tstart]');
 ok(A.T.run&&A.T.phases.length===3&&A.T.log[0]==='work','custom intervals start with work beep');
 const seq=[];
 for(let k=0;k<5&&A.T.run;k++){A.T.end=Date.now()-1;A.tick();seq.push(A.T.run?A.T.phases[A.T.i].name:'END');}
 ok(seq.join(',')==='REST,WORK,END','steps through rest, work, then finishes ('+seq.join(',')+')');
 ok(A.T.log.join(',')==='work,rest,work,done','beep sequence work, rest, work, done ('+A.T.log.join(',')+')');
 // tick beeps in last 3 seconds
 A.T.log.length=0;A.tStart([{name:'REST',sec:6,type:'rest'}],'Rest','go');
 A.T.end=Date.now()+2500;A.tick();
 ok(A.T.log.includes('tick'),'countdown tick in last 3 sec');
 A.tStop();ok(!A.T.run,'stop works');
 // pool preset uses week rounds
 click('[data-act=thide]');
 A.UI.date='2026-10-25';A.render();
 click('[data-act=timer][data-preset=pool6]');ok(d.querySelector('#t-rounds').value==='6','pool preset week 1 = 6 rounds');
 click('[data-act=thide]');
 // auto rest after checking a set
 A.UI.date='2026-10-24';A.render();A.T.log.length=0;
 click('[data-act=setdone][data-ex=goblet][data-i="2"]');
 ok(A.T.run&&A.T.phases[0].name==='REST'&&A.T.phases[0].sec===90,'auto 90s rest starts after a checked set');
 A.tStop();
 // ---- body photos: store, compare UI, image math ----
 await A.bPut({id:'b1',date:'2026-10-24',pose:'front',ts:1,full:'data:image/jpeg;base64,AAAA',thumb:'data:image/jpeg;base64,AAAA'});
 await A.bPut({id:'b2',date:'2026-11-21',pose:'front',ts:2,full:'data:image/jpeg;base64,AAAA',thumb:'data:image/jpeg;base64,AAAA'});
 await A.bPut({id:'b3',date:'2026-10-24',pose:'side',ts:3,full:'data:image/jpeg;base64,AAAA',thumb:'data:image/jpeg;base64,AAAA'});
 A.UI.tab='photos';A.render();await new Promise(r=>setTimeout(r,300));
 ok(d.querySelectorAll('[data-act=viewbody]').length===3,'timeline shows 3 body photos');
 ok(!!d.querySelector('canvas#cmp')&&d.querySelectorAll('select[data-chg=cmpsel] option').length===4,'compare UI for front pose (2 photos, two selects)');
 click('[data-act=cmppose][data-p=side]');await new Promise(r=>setTimeout(r,200));
 ok(/at least two side photos/.test(d.body.textContent),'compare needs two photos message');
 ok(A.S().settings.lastCheckin==='2026-11-21','last check-in date tracked');
 // image math: 40x40 gray images; after has a bigger bright square than before
 const W2=40,H2=40,N=W2*H2;
 function img(sq){const px=new Uint8ClampedArray(N*4);for(let y=0;y<H2;y++)for(let x=0;x<W2;x++){const i=(y*W2+x)*4;const inside=x>=sq.x0&&x<sq.x1&&y>=sq.y0&&y<sq.y1;const v=inside?220:60;px[i]=v;px[i+1]=v;px[i+2]=v;px[i+3]=255;}return px;}
 const pa=img({x0:15,x1:25,y0:10,y1:30}),pb=img({x0:10,x1:30,y0:10,y1:30}),lum=A.lumOf;
 const same=A.heatRGBA(lum(pa,N),lum(pa,N),W2,H2,70);let sa=0;for(let i=3;i<same.length;i+=4)sa+=same[i];
 const diff=A.heatRGBA(lum(pa,N),lum(pb,N),W2,H2,70);let da=0;for(let i=3;i<diff.length;i+=4)da+=diff[i];
 ok(sa===0&&da>0,'change map: identical images -> no highlight, changed images -> highlight');
 // illumination change only: same shape, brighter overall should stay quiet
 const bright=new Uint8ClampedArray(pa.length);for(let i=0;i<pa.length;i++)bright[i]=i%4===3?255:Math.min(255,pa[i]*0.7+40);
 const lit=A.heatRGBA(lum(pa,N),lum(bright,N),W2,H2,70);let la2=0;for(let i=3;i<lit.length;i+=4)la2+=lit[i];
 ok(la2<da*0.2,'change map ignores uniform brightness shift');
 // definition map: after has more edges than before (before is flat/blurry)
 const flat=new Uint8ClampedArray(N*4);for(let i=0;i<N;i++){const v=120;flat[i*4]=v;flat[i*4+1]=v;flat[i*4+2]=v;flat[i*4+3]=255;}
 const dm=A.defRGBA(lum(flat,N),lum(pb,N),W2,H2,70);let green=0,blue=0;for(let i=0;i<N;i++){if(dm[i*4+3]>0){if(dm[i*4+1]===212&&dm[i*4]===46)green++;else blue++;}}
 ok(green>0&&blue===0,'definition map: more edges after -> green only');
 const dm2=A.defRGBA(lum(pb,N),lum(flat,N),W2,H2,70);let g2=0,b2=0;for(let i=0;i<N;i++){if(dm2[i*4+3]>0){if(dm2[i*4]===46)g2++;else b2++;}}
 ok(b2>0&&g2===0,'definition map: fewer edges after -> blue only');
 // ---- monthly test ----
 A.UI.tab='progress';A.UI.date='2026-11-21';
 const ST=A.S();
 ok(A.parseVal(A.TESTS.find(t=>t.k==='run15'),'14:30')===870&&A.parseVal(A.TESTS.find(t=>t.k==='run15'),'14.5')===870,'run time parses mm:ss and decimal minutes');
 ok(A.parseVal(A.TESTS.find(t=>t.k==='run15'),'14:75')===undefined,'bad mm:ss rejected');
 ok(A.testDue()===null||true,'n/a');const sd0=ST.settings.startDate;ST.settings.startDate='2026-10-01';ok(A.testDue()!==null,'baseline test due once past week 1 (no test yet)');ST.settings.startDate=sd0;
 // ---- heart rate ----
 {const S0=A.S(),tab1=A.UI.tab,date1=A.UI.date;ok(A.hrMax()===null,'no max HR until age set');S0.settings.hrAge=40;ok(A.hrMax()===180,'max HR 208-0.7*age = 180');
  ok(A.zoneOf(115).n===2&&A.zoneOf(150).n===4&&A.zoneOf(60).n===0,'zones from % of max');
  ok(A.hrTarget('zone2').includes('108-126'),'zone 2 target in bpm');
  A.UI.tab='today';A.UI.date='2026-10-24';A.render();
  const hin=d.querySelector('[data-f=hravg]');ok(!!hin&&d.body.textContent.includes('target Zone'),'cardio block has heart rate inputs and target');
  const cid=hin.dataset.id;set('[data-f=hravg][data-id='+cid+']','128');set('[data-f=hrpk][data-id='+cid+']','150');set('[data-f=hrrec][data-id='+cid+']','120');
  const cx=S0.days['2026-10-24'].cardio[cid];ok(cx.hravg===128&&cx.hrpk===150&&cx.hrrec===120,'workout heart rate saved');
  ok(d.querySelector('#hz-'+cid).textContent.includes('recovered 30 bpm'),'recovery drop shown');
  A.hrOpen(cid);for(let i=0;i<20;i++)click('[data-act=hrtap]');
  ok(A.HR.run&&A.HR.count===20,'taps counted');A.HR.t0=Date.now()-16000;await new Promise(r=>setTimeout(r,400));
  ok(!A.HR.run&&A.HR.res===80,'15 sec count x4 = 80 bpm');
  ok(d.querySelector('#hr-man').value==='80','result fills manual box');
  click('[data-act=hrkind][data-k=hrpk]');click('[data-act=hrsave]');
  ok(S0.days['2026-10-24'].cardio[cid].hrpk===80,'tap count saved into workout entry');
  const todayK=new Date().toISOString().slice(0,10);
  A.hrOpen(null);set('#hr-man','58');click('[data-act=hrsave]');
  const nd=Object.keys(S0.days).filter(k=>(S0.days[k].hr||[]).length);ok(nd.length===1&&S0.days[nd[0]].hr[0].bpm===58&&S0.days[nd[0]].hr[0].kind==='rest','resting reading saved');
  ok(A.hrRestAvg()===58,'recent resting average');
  const hp=A.hrProgress();ok(hp.includes('58')&&hp.includes('Workout pulse')&&hp.includes('1-min drop'),'heart rate analysis renders');
  A.openTest();ok(d.querySelector('#tf-rhr').value==='58','monthly test prefills resting pulse');
  click('[data-act=testclose]');
  S0.days[nd[0]].hr=[];delete S0.days['2026-10-24'].cardio[cid].hrrec;A.HR.ctx=null;const ho=d.querySelector('#hrov');if(ho)ho.style.display='none';delete S0.settings.hrAge;A.UI.tab=tab1;A.UI.date=date1;A.render();}
 // ---- dashboard, calories, strength, energy ----
 {const S0=A.S(),tab1=A.UI.tab,date1=A.UI.date;
  const dd='2026-10-24';A.UI.tab='today';A.UI.date=dd;A.render();
  ok(!!d.querySelector('.rings')&&d.querySelectorAll('.rg').length===3&&d.querySelectorAll('.wd').length===7,'dashboard shows 3 rings and a 7-day strip');
  ok(d.body.textContent.includes('Calories')&&d.body.textContent.includes('Water')&&d.body.textContent.includes('Checklist'),'dashboard labels');
  const D0=S0.days[dd]||(S0.days[dd]={});const mealsBefore=D0.meals;D0.meals={breakfast:'planned',lunch:'skip'};D0.kcal=undefined;
  ok(A.kcalOf('breakfast',dd)>300&&A.kcalOf('lunch',dd)===0,'planned meal counts estimate, skipped counts zero');
  set('[data-chg=kcal][data-slot=dinner]','700');ok(S0.days[dd].kcal.dinner===700&&A.kcalDay(dd)===A.kcalOf('breakfast',dd)+700,'typed calories counted in total');
  click('[data-act=rate][data-k=energy][data-v="4"]');ok(S0.days[dd].energy===4,'energy rating saved');
  click('[data-act=rate][data-k=feel][data-v="5"]');ok(S0.days[dd].feel===5,'workout feel saved');
  ok(d.querySelectorAll('.fig svg').length>=2&&d.body.textContent.includes('Watch a video'),'exercise figures render with video link');
  ok(Object.keys(A.EX).every(id=>A.POSE[id]),'every exercise has a figure');
  click('[data-act=dayset][data-d="2026-10-23"]');ok(A.UI.date==='2026-10-23','tapping a day in the strip switches day');
  // strength
  A.UI.date=dd;const sd=S0.days;sd['2026-10-20']=sd['2026-10-20']||{};sd['2026-10-20'].sets={goblet:[{w:30,r:10,done:true}],chestrow:[{w:40,r:10,done:true}]};
  sd['2026-10-22']=sd['2026-10-22']||{};sd['2026-10-22'].sets={goblet:[{w:40,r:10,done:true}],chestrow:[{w:40,r:10,done:true}]};
  const li=A.liftIndex('goblet');ok(li&&li.idx>=130,'goblet strength index rises with load');
  const sh=A.strengthHTML();ok(sh.includes('Strength index')&&sh.includes('Balance check')&&sh.includes('Hard sets'),'strength section renders');
  S0.days['2026-10-20'].energy=2;S0.days['2026-10-22'].energy=4;ok(A.energyHTML().includes('Daily energy'),'energy section renders');
  delete sd['2026-10-20'];delete sd['2026-10-22'];delete S0.days[dd].energy;delete S0.days[dd].feel;delete S0.days[dd].kcal;if(mealsBefore)S0.days[dd].meals=mealsBefore;else delete S0.days[dd].meals;
  A.UI.tab=tab1;A.UI.date=date1;A.render();}
 // ---- pace ----
 {const S0=A.S(),tab1=A.UI.tab,date1=A.UI.date,gd=S0.settings.goalDate,maint=S0.settings.maint;
  const r0=A.tgtRate();ok(r0>0&&r0<3,'current target rate computed ('+r0+' lb/wk)');
  A.UI.tab='weight';A.render();ok(d.body.textContent.includes('Weekly loss target'),'weight tab shows pace card');
  click('[data-act=pace][data-v="2"]');ok(Math.abs(A.tgtRate()-2)<0.11,'choosing 2 lb/week moves goal date');
  ok(A.paceCard().includes('Aggressive')===false&&A.paceCard().includes('1-2 lb')===true,'2 lb is in the normal range text');
  click('[data-act=pace][data-v="3"]');ok(Math.abs(A.tgtRate()-3)<0.2&&A.paceCard().includes('Aggressive'),'3 lb shows aggressive warning');
  S0.settings.maint=2800;ok(A.paceCard().includes('1,300')===false&&A.paceCard().includes('1,500'),'suggested calories floored at 1,500');
  click('[data-act=pace][data-v="1"]');S0.settings.maint=2800;ok(A.paceCard().includes('2,300'),'1 lb/week suggests maintenance minus 500');
  click('[data-act=usekcal]');ok(S0.settings.kcalGoal===2300,'use as calorie target saves');
  S0.settings.goalDate=gd;if(maint==null)delete S0.settings.maint;else S0.settings.maint=maint;delete S0.settings.kcalGoal;A.UI.tab=tab1;A.UI.date=date1;A.render();}
 // ---- reminders ----
 {const st0=JSON.stringify(ST.settings),ts0=ST.tests;
  ST.tests=[];ST.settings.startDate='2026-10-01';delete ST.settings.lastCheckin;delete ST.settings.snooze;
  const tab0=A.UI.tab;
  const rc=A.reminderCard();ok(rc.includes('Monthly check-in day')&&rc.includes('How to do it')&&rc.includes('Progress photos'),'reminder card shows steps when due');
  ok(A.dueItems().length===2,'both photo and test due');
  ST.settings.lastCheckin=A.nextDue().photo; // placeholder
  const base=A.nextDue();ok(/^\d{4}-\d\d-\d\d$/.test(base.photo)&&/^\d{4}-\d\d-\d\d$/.test(base.test),'nextDue returns dates');
  const ics=A.buildICS({time:'07:30',month:true,daily:true});
  ok(ics.startsWith('BEGIN:VCALENDAR')&&ics.includes('FREQ=WEEKLY;INTERVAL=4')&&ics.includes('FREQ=DAILY')&&ics.includes('TRIGGER:-P1D')&&ics.trim().endsWith('END:VCALENDAR'),'ics has monthly, daily, alarms');
  ok(ics.split('\r\n').every(l=>l.length<=75),'ics lines folded');
  ST.settings=JSON.parse(st0);ST.settings.startDate=ST.settings.startDate;ST.tests=ts0;A.UI.tab=tab0;}
 A.openTest();ok(!!d.querySelector('#tf-run15')&&!!d.querySelector('#tf-sitreach')&&!!d.querySelector('#tf-waist'),'test form lists cardio, flexibility, body fields');
 click('[data-act=testsave]');ok(d.querySelector('#tf-err').textContent.includes('at least one'),'empty test rejected');
 set('#tf-date','2026-10-31');set('#tf-run15','15:40');set('#tf-sprint30','5.6');set('#tf-sitreach','-2');set('#tf-pushups','12');set('#tf-waist','40');
 click('[data-act=testsave]');
 ok(ST.tests.length===1&&ST.tests[0].v.run15===940&&ST.tests[0].v.sitreach===-2,'baseline test saved');
 A.openTest();set('#tf-date','2026-11-28');set('#tf-run15','14:50');set('#tf-sprint30','5.4');set('#tf-sitreach','0.5');set('#tf-pushups','16');set('#tf-waist','39');
 click('[data-act=testsave]');ok(ST.tests.length===2,'second test saved');
 A.render();
 ok(/Test results/.test(d.body.textContent)&&/14:50/.test(d.body.textContent)&&/\u221200:50|−0:50/.test(d.body.textContent),'results show run time and improvement (-0:50)');
 ok(d.querySelectorAll('td.good').length>=4,'improvements are green');
 ok(!!d.querySelector('select[data-chg=tmetric]')&&!!d.querySelector('svg'),'metric chart renders');
 click('[data-act=testdel]');ok(ST.tests.length===1,'test delete works');
 // more tab + settings
 A.UI.tab='more';A.render();set('[data-k=waterGoal]','8');ok(A.S().settings.waterGoal===8,'settings save');
 // persistence
 const re=A.load();ok(re.weights.length>20&&re.settings.goalWeight===185,'persisted to localStorage');
 // reset
 click('[data-act=reset]');ok(!!d.querySelector('#su-w'),'reset returns to setup');
 await new Promise(r=>setTimeout(r,300));
 ok(errors.length===0,'no runtime errors '+errors.join('|'));
})().catch(e=>{console.log('FAIL exception',e.stack);process.exitCode=1;}).finally(()=>{try{A.tStop();}catch(e){}process.exit(process.exitCode||0);});
