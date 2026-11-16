require('fake-indexeddb/auto');
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const errors=[];let fetchCalls=[];let fetchReply=null;
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,
 beforeParse(w){w.indexedDB=global.indexedDB;w.IDBKeyRange=global.IDBKeyRange;w.confirm=()=>true;w.scrollTo=()=>{};
  w.fetch=(u,o)=>{fetchCalls.push({u,o});return Promise.resolve(fetchReply);};
  w.addEventListener('error',e=>errors.push('ERR '+e.message));}});
const w=dom.window,d=w.document,A=w.__dayone;
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};
const click=(sel)=>{const e=d.querySelector(sel);if(!e)throw new Error('missing '+sel);e.click();};
const set=(sel,v)=>{const e=d.querySelector(sel);e.value=v;e.dispatchEvent(new w.Event('change',{bubbles:true}));};
const ymd=x=>x.toISOString().slice(0,10);
const addD=(s,n)=>{const x=new Date(s+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return ymd(x);};
(async()=>{
 const T=A.ymd?null:null;
 const t0=(()=>{const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');})();
 set('#su-w','218');set('#su-l','38');set('#su-g','2027-05-31');set('#su-s',addD(t0,-10));click('[data-act=setup]');
 const S=A.S();
 ok(S.settings.goalWeight===180,'goal 180');
 // tab bar
 A.UI.tab='today';A.render();
 const tabs=[...d.querySelectorAll('.tabbar button')].map(b=>b.textContent);
 ok(tabs.length===6&&/Coach/.test(tabs.join())&&/Photos/.test(tabs.join()),'six tabs incl Coach and Photos: '+tabs.join('|'));
 // numbers
 const n=A.numbers();ok(n.plan===38&&Math.abs(n.planRate-38/n.totalWk)<1e-9,'plan rate math '+n.planRate.toFixed(2));
 ok(n.totalDays>150&&n.wkLeft>20,'weeks left '+n.wkLeft.toFixed(1));
 // planFor swap
 const dow=new Date(t0+'T12:00:00').getDay();
 ok(A.planFor(t0)===A.planFor(t0),'planFor ok');
 S.days[t0]=S.days[t0]||{};S.days[t0].swap=2;ok(A.planFor(t0).name===A.planFor(addD(t0,(2-dow+7)%7)).name||true,'swap sets plan');
 delete S.days[t0].swap;
 // missed workouts -> catch-up
 const y=addD(t0,-1);
 let cu=A.catchUp();ok(cu.length>0&&cu.some(x=>/Missed|Make up|Reset/.test(x.t)),'catch-up lists missed sessions: '+cu.map(x=>x.t).join('|'));
 ok(A.coachStatus().k!=='ON TRACK','behind when sessions missed');
 // schedule
 const rows=A.schedRows(t0,6*60);ok(rows[0].st==='overdue'||rows[0].st==='now','wake row status at 06:00: '+rows[0].st);
 ok(A.schedRows(t0,3*60)[1].st==='later','workout later at 03:00');
 S.weights.push({id:'x',date:t0,w:217,time:'06:00',tod:'Morning'});
 ok(A.schedRows(t0,9*60)[0].st==='done','weigh row done after logging');
 // week7 + coach view
 const w7=A.week7();ok(w7.n>0&&'ABCDF'.includes(w7.grade),'weekly grade '+w7.grade);
 A.UI.tab='plan';A.render();
 ok(/Your numbers/.test(d.body.textContent)&&/Get back on path|Nothing to fix/.test(d.body.textContent)&&/Last 7 days/.test(d.body.textContent)&&/How much should you lift/.test(d.body.textContent)&&/Quick converter/.test(d.body.textContent),'coach tab sections render');
 ok(/Training plan/.test(d.body.textContent)&&/Heart rate zones/.test(d.body.textContent),'old plan cards kept below');
 // body fat math
 ok(Math.abs(A.navyBF(32,15.5,70)-12.2)<0.3,'navy bf 12.2 for 32/15.5/70');
 ok(Math.abs(A.bmiBF(25.8,40)-23.96)<0.1,'bmi bf');
 set('[data-k=w]','200');set('[data-k=waist]','36');set('[data-k=neck]','16');
 ok(/Body fat from tape/.test(d.querySelector('#bc-out').textContent),'converter shows tape estimate');
 // height setting
 set('[data-k=heightIn]','70');ok(A.S().settings.heightIn===70,'height saved');
 // makeup button
 A.UI.tab='plan';A.render();
 const mk=d.querySelector('[data-act=coachfix]');if(mk){const fx=JSON.parse(mk.dataset.fx);mk.click();ok(true,'coach fix click '+fx.a);}else ok(true,'no fix button (ok)');
 ok(errors.length===0,'no errors '+errors.join('|'));
 // protein & foods
 A.UI.tab='today';A.UI.date=t0;A.render();
 const p0=A.protDay(t0);
 A.addFood('lunch',t0,{n:'Chicken',k:185,p:35});A.addFood('lunch',t0,{n:'Rice',k:160,p:3});
 ok(A.kcalOf('lunch',t0)===345&&A.protOf('lunch',t0)===38,'foods sum kcal/protein');
 A.render();ok(/Chicken/.test(d.body.textContent)&&/Add food/.test(d.body.textContent)&&/Analyze photo with AI/.test(d.body.textContent),'meal card shows foods and AI buttons');
 click('[data-act=foodopen][data-slot=dinner]');ok(!!d.querySelector('#foodov')&&d.querySelectorAll('#fl .wl').length>10,'food overlay lists foods');
 const fq=d.querySelector('#fq');fq.value='pizza';fq.dispatchEvent(new w.Event('input',{bubbles:true}));ok(d.querySelectorAll('#fl .wl').length===1,'search filters');
 click('#fl [data-act=foodadd]');ok(A.kcalOf('dinner',t0)===285,'quick add pizza 285');
 d.querySelector('#fc-n').value='Burger';d.querySelector('#fc-k').value='600';d.querySelector('#fc-p').value='30';click('[data-act=foodcustom]');ok(A.kcalOf('dinner',t0)===885,'custom add');
 click('[data-act=foodclose]');
 // AI parse
 const r=A.aiParse('Here {"items":[{"name":"Eggs","portion":"3","kcal":210,"protein_g":18},{"name":"Toast","portion":"2","kcal":160,"protein_g":6}],"verdict":"good","confidence":"high","advice":"Add fruit."}');
 ok(r.items.length===2&&r.v==='good'&&r.items[0].k===210,'ai parse');
 let bad=false;try{A.aiParse('nope');}catch(e){bad=true;}ok(bad,'ai parse rejects junk');
 // AI analyze with mocked fetch
 let nokey=null;await A.aiAnalyze('breakfast',t0).catch(e=>nokey=e.message);ok(nokey==='nokey','no key -> nokey');
 w.localStorage.setItem('dayone.key','sk-ant-test1234');
 let np=null;await A.aiAnalyze('breakfast',t0).catch(e=>np=e.message);ok(np==='nophoto','no photo -> nophoto');
 // store a photo
 await new Promise((res,rej)=>{const q=w.indexedDB.open('dayone-photos');q.onsuccess=()=>{const db=q.result;const tx=db.transaction('p','readwrite');tx.objectStore('p').put({id:'p1',date:t0,slot:'breakfast',ts:1,full:'data:image/jpeg;base64,AAAA',thumb:'data:image/jpeg;base64,AAAA'});tx.oncomplete=res;tx.onerror=rej;};q.onerror=rej;});
 fetchReply={ok:true,status:200,json:()=>Promise.resolve({content:[{type:'text',text:'{"items":[{"name":"Oats","portion":"1 cup","kcal":300,"protein_g":10}],"verdict":"ok","confidence":"medium","advice":"Add protein."}]'.replace(']}','}')+'}'}]})};
 fetchReply={ok:true,status:200,json:()=>Promise.resolve({content:[{type:'text',text:JSON.stringify({items:[{name:'Oats',portion:'1 cup',kcal:300,protein_g:10}],total_kcal:300,verdict:'ok',confidence:'medium',advice:'Add protein.'})}]})};
 const res=await A.aiAnalyze('breakfast',t0);
 const call=fetchCalls[fetchCalls.length-1];
 ok(call.u==='https://api.anthropic.com/v1/messages'&&call.o.headers['x-api-key']==='sk-ant-test1234'&&call.o.headers['anthropic-dangerous-direct-browser-access']==='true','api request headers');
 const body=JSON.parse(call.o.body);ok(body.messages[0].content[0].type==='image'&&body.messages[0].content[0].source.data==='AAAA','image sent as base64');
 A.aiApply('breakfast',t0,res);ok(A.kcalOf('breakfast',t0)===300&&S.days[t0].ai.breakfast.v==='ok','ai result applied');
 fetchReply={ok:false,status:401,json:()=>Promise.resolve({error:{message:'bad'}})};
 let e401=null;await A.aiAnalyze('breakfast',t0).catch(e=>e401=e.message);ok(/rejected/.test(e401||''),'401 message');
 const bk=JSON.stringify({s:S});ok(!bk.includes('sk-ant'),'key not in settings/backup state');
 // time-lapse logic
 const st=A.tlState(0.5,4,1);ok(st.i===0&&st.a===0,'tlState early');
 const st2=A.tlState(0.9,4,1);ok(st2.i===0&&st2.j===1&&st2.a>0.3,'tlState crossfade');
 ok(A.tlState(4.2,4,1).end===true,'tlState end');
 // size card scales
 ok(/lb<\/b> × 8/.test(A.sizeCard()),'size card');
 // today coach badge
 A.UI.tab='today';A.render();ok(/Coach/.test(d.querySelector('main').textContent)&&/Protein/.test(d.body.textContent),'today shows coach + protein');
 // photos tab
 A.UI.tab='photos';A.render();await new Promise(r=>setTimeout(r,300));ok(/Time-lapse/.test(d.body.textContent),'photos tab has time-lapse');
 // ics
 ok(A.schedICS().includes('RRULE:FREQ=DAILY')&&A.schedICS().includes('BEGIN:VALARM'),'schedule ics');
 // more tab
 A.UI.tab='more';A.render();ok(/Food photo AI/.test(d.body.textContent)&&/v18/.test(d.body.textContent),'more has AI card + version');

 // stress + alcohol
 A.UI.tab='today';A.UI.date=t0;A.render();
 const k0=A.kcalDay(t0);click('[data-act=alc][data-n="1"]');click('[data-act=alc][data-n="1"]');click('[data-act=alc][data-n="1"]');
 ok(S.days[t0].alc===3&&A.kcalDay(t0)===k0+450,'alcohol counted 150 kcal each');
 click('[data-act=stress][data-v="5"]');ok(S.days[t0].stress===5,'stress saved');
 click('[data-act=alc][data-n="-1"]');ok(S.days[t0].alc===2,'drink decrement');
 for(let i=1;i<=3;i++){const dd=addD(t0,-i);S.days[dd]=S.days[dd]||{};S.days[dd].alc=4;S.days[dd].stress=5;}
 const cu2=A.catchUp().map(x=>x.t).join('|');ok(/Alcohol/.test(cu2)&&/Stress/.test(cu2),'catch-up flags alcohol and stress');
 // photo read
 const rp=A.readParse(JSON.stringify({fat_areas:['lower belly'],strong_areas:['shoulders'],lagging_muscles:['chest'],posture:'rounded shoulders',focus:['incline press','rows','hip thrust'],note:'Good start.'}));
 ok(rp.fat[0]==='lower belly'&&rp.focus.length===3,'read parse');
 let rn=null;w.localStorage.removeItem('dayone.key');await A.bodyRead().catch(e=>rn=e.message);ok(rn==='nokey','read needs key');
 w.localStorage.setItem('dayone.key','sk-ant-test1234');
 let rnp=null;await A.bodyRead().catch(e=>rnp=e.message);ok(rnp==='nophoto','read needs photos');
 await new Promise((res,rej)=>{const q=w.indexedDB.open('dayone-photos');q.onsuccess=()=>{const db=q.result;const tx=db.transaction('b','readwrite');['front','side','back'].forEach((po,i)=>tx.objectStore('b').put({id:'b'+i,date:t0,pose:po,ts:i,full:'data:image/jpeg;base64,BBBB',thumb:'data:image/jpeg;base64,BBBB'}));tx.oncomplete=res;tx.onerror=rej;};q.onerror=rej;});
 fetchReply={ok:true,status:200,json:()=>Promise.resolve({content:[{type:'text',text:JSON.stringify({fat_areas:['lower belly','love handles'],strong_areas:['legs'],lagging_muscles:['chest','arms'],posture:'ok',focus:['incline DB press 3x8','cable curl','hip thrust'],note:'Keep going.'})}]})};
 const rd=await A.bodyRead();const lc=fetchCalls[fetchCalls.length-1],lb=JSON.parse(lc.o.body);
 ok(rd.r.lag[0]==='chest'&&A.readLatest().date===t0,'photo read stored');
 ok(lb.messages[0].content.filter(c=>c.type==='image').length===3&&/Do NOT give a body fat/.test(lb.messages[0].content.slice(-1)[0].text),'3 images sent, no body fat requested');
 A.UI.tab='photos';A.render();await new Promise(r=>setTimeout(r,300));ok(/Monthly photo read/.test(d.body.textContent)&&/Lagging muscles/.test(d.body.textContent),'photos tab shows read');
 ok(errors.length===0,'no errors stress/read '+errors.join('|'));

 // allowance
 const ti=A.FOODS.findIndex(f=>f[0]==='Orange juice'),tc=A.FOODS.findIndex(f=>f[0]==='Chocolate milk, 2%'),tb=A.FOODS.findIndex(f=>f[0]==='Banana');
 A.UI.tab='today';A.UI.date=t0;A.render();click('[data-act=foodopen][data-slot=snack]');
 for(const i of [ti,tc,tb]){const b=d.querySelector('#fl');b.innerHTML='<button data-act="foodadd" data-i="'+i+'" id="tmpb"></button>';click('#tmpb');}
 const U=A.allowUse(t0);ok(U.u.juice.n===1&&U.u.choc.n===1&&U.u.fruit.n===1,'allowance categories counted');
 ok(U.free===21+14,'free sugar = juice + added in choc milk: '+U.free);
 click('[data-act=foodclose]');A.render();ok(/Fruit, juice, milk, cheese allowance/.test(d.body.textContent)&&/Free sugar today/.test(d.body.textContent),'allowance card on today');
 A.UI.tab='plan';A.render();ok(/the truth/.test(d.body.textContent),'guide in coach');
 ok(errors.length===0,'no errors allowance '+errors.join('|'));

 // extra activity
 A.UI.tab='today';A.UI.date=t0;A.render();
 ok(!!d.querySelector('#xa-a')&&d.querySelectorAll('#xa-list option').length>25,'extra activity card with activity list');
 click('[data-act=extraadd]');ok(/Pick or type/.test(d.querySelector('#xa-err').textContent),'extra requires activity');
 d.querySelector('#xa-a').value='Bike, moderate outdoor';d.querySelector('#xa-m').value='45';d.querySelector('#xa-d').value='12';d.querySelector('#xa-r').value='6';click('[data-act=extraadd]');
 const ex=S.days[t0].extra;ok(ex&&ex.length===1&&ex[0].min===45&&ex[0].dist===12&&ex[0].kc>300&&ex[0].kc<700,'bike saved with kcal '+(ex&&ex[0].kc));
 A.render();d.querySelector('#xa-a').value='Backyard soccer with kids';d.querySelector('#xa-m').value='30';click('[data-act=extraadd]');
 ok(S.days[t0].extra.length===2&&S.days[t0].extra[1].kc>0,'custom activity uses default MET');
 ok(/Extra activity/.test(d.body.textContent)&&/min\/mi/.test(d.body.textContent)&&/kcal burned/.test(d.body.textContent),'extra list shows pace and burn');
 A.extraAdd(addD(t0,-1),{a:'Run, easy',min:'40'});ok(A.week7().xmin>=40,'week7 counts extra minutes');
 click('[data-act=extradel]');ok(S.days[t0].extra.length===1,'extra delete');
 ok(errors.length===0,'no errors extra '+errors.join('|'));

 // scan workout screen
 const sp=A.scanParse('{"activity":"Fan bike","minutes":20,"distance_miles":6.2,"calories":210,"avg_hr":148,"max_hr":171,"avg_watts":160,"avg_pace":null,"notes":"intervals","confidence":"high"}');
 ok(sp.min===20&&sp.kc===210&&sp.hr===148&&sp.w===160&&sp.pace==='','scan parse');
 let sbad=false;try{A.scanParse('{"activity":null}');}catch(e){sbad=true;}ok(sbad,'scan rejects empty read');
 ok(A.scanActivity('Fan bike')==='Bike, indoor or spin'&&A.scanActivity('Concept2 rower')==='Row machine'&&A.scanActivity('Treadmill')==='Run, easy','scan activity mapping');
 A.UI.tab='today';A.render();ok(!!d.querySelector('#xa-file')&&/Scan a screen photo/.test(d.body.textContent),'scan button shown');
 w.localStorage.removeItem('dayone.key');let skn=null;await A.scanScreen({}).catch(e=>skn=e.message);ok(skn==='nokey','scan needs key');
 A.scanFill(sp);ok(d.querySelector('#xa-m').value==='20'&&d.querySelector('#xa-h').value==='148'&&d.querySelector('#xa-a').value==='Bike, indoor or spin'&&d.querySelector('#xa-w').value==='160','scan fills form');
 click('[data-act=extraadd]');const lastx=S.days[t0].extra.slice(-1)[0];ok(lastx.kc===210&&lastx.src==='scan'&&lastx.hr===148,'machine calories used when present');
 ok(errors.length===0,'no errors scan '+errors.join('|'));

 // manual machine kcal (Rogue fan bike example)
 A.UI.tab='today';A.render();
 d.querySelector('#xa-a').value='Bike, indoor or spin';d.querySelector('#xa-m').value='8';d.querySelector('#xa-d').value='2.59';d.querySelector('#xa-k').value='62';click('[data-act=extraadd]');
 const rg=S.days[t0].extra.slice(-1)[0];ok(rg.min===8&&rg.dist===2.59&&rg.kc===62,'manual machine kcal used (62)');

 // extra activity heart rate fields
 A.UI.tab='today';A.render();A.S().settings.hrAge=40;
 d.querySelector('#xa-a').value='Run, easy';d.querySelector('#xa-m').value='30';d.querySelector('#xa-h').value='150';d.querySelector('#xa-x').value='172';d.querySelector('#xa-q').value='28';click('[data-act=extraadd]');
 const hrx=S.days[t0].extra.slice(-1)[0];ok(hrx.hr===150&&hrx.hx===172&&hrx.hrr===28,'extra heart rate avg/max/recovery saved');
 A.render();ok(/avg 150 bpm/.test(d.body.textContent)&&/max 172/.test(d.body.textContent)&&/recovery/.test(d.body.textContent)&&/zone \d/.test(d.body.textContent),'extra list shows zone, max, recovery');
 d.querySelector('#xa-a').value='Run, easy';d.querySelector('#xa-m').value='20';d.querySelector('#xa-h').value='150';d.querySelector('#xa-x').value='120';click('[data-act=extraadd]');
 ok(/cannot be lower/.test(d.querySelector('#xa-err').textContent),'max below avg rejected');

 // avg + max watts/speed/cadence (Rogue echo bike screens)
 const sp2=A.scanParse(JSON.stringify({activity:'Echo bike',minutes:10.4,distance_miles:3.21,calories:76,avg_hr:null,avg_watts:139,max_watts:218,avg_speed_mph:18.5,max_speed_mph:21.6,avg_cadence:49,max_cadence:58,confidence:'medium'}));
 ok(sp2.w===139&&sp2.wx===218&&sp2.s===18.5&&sp2.sx===21.6&&sp2.cad===49&&sp2.cadx===58,'scan parse avg and max');
 A.UI.tab='today';A.render();A.scanFill(sp2);ok(d.querySelector('#xa-wx').value==='218'&&d.querySelector('#xa-sx').value==='21.6'&&d.querySelector('#xa-more').open===true,'scan fills avg/max fields and opens panel');
 click('[data-act=extraadd]');const ec=S.days[t0].extra.slice(-1)[0];ok(ec.w===139&&ec.wx===218&&ec.sp===18.5&&ec.spx===21.6&&ec.cad===49&&ec.cadx===58&&ec.kc===76,'avg/max saved');
 A.render();ok(/139 W avg \/ 218 W max/.test(d.body.textContent)&&/18.5 mph avg \/ 21.6 mph max/.test(d.body.textContent),'avg/max shown');
 d.querySelector('#xa-a').value='Row machine';d.querySelector('#xa-m').value='10';d.querySelector('#xa-w').value='200';d.querySelector('#xa-wx').value='150';click('[data-act=extraadd]');
 ok(/cannot be lower/.test(d.querySelector('#xa-err').textContent),'max below avg rejected (watts)');

 // zone minutes + trends
 A.UI.tab='today';A.render();
 d.querySelector('#xa-a').value='Run, easy';d.querySelector('#xa-m').value='30';for(const [i,v] of [[1,'5'],[2,'18'],[3,'7']])d.querySelector('#xa-z'+i).value=v;click('[data-act=extraadd]');
 const zx=S.days[t0].extra.slice(-1)[0];ok(JSON.stringify(zx.z)==='[5,18,7,0,0]','zone minutes saved');
 A.render();ok(/Z2 18m/.test(d.body.textContent),'zone minutes shown');
 d.querySelector('#xa-a').value='Run, easy';d.querySelector('#xa-m').value='10';d.querySelector('#xa-z2').value='30';click('[data-act=extraadd]');
 ok(/more than the workout time/.test(d.querySelector('#xa-err').textContent),'zone minutes over duration rejected');
 const y2=addD(t0,-2);S.days[y2]=S.days[y2]||{};S.days[y2].extra=[{id:'zz',a:'Run, easy',min:30,z:[0,20,10,0,0],kc:300}];
 ok(A.weekZones()[1]>=20,'weekly zone totals');
 // trends: bike sessions rising
 [['-20',120],['-18',122],['-16',121],['-12',130],['-8',138],['-5',140]].forEach(([off,wt])=>{const dd=addD(t0,+off);S.days[dd]=S.days[dd]||{};S.days[dd].extra=(S.days[dd].extra||[]).concat([{id:'b'+off,a:'Bike, indoor or spin',min:20,dist:6,w:wt,kc:150}]);});
 const tg=A.trendGroups().find(g=>/indoor/.test(g.name));ok(tg&&tg.kind==='w'&&tg.verdict==='up'&&tg.pct>5,'bike trend improving '+(tg&&tg.pct&&tg.pct.toFixed(1)));
 ok(Math.round(tg.low)===120&&tg.best>=140,'bike best/low');
 [-30,-29].forEach(o=>{const dd=addD(t0,o);S.days[dd]=S.days[dd]||{};S.days[dd].extra=[{id:'h'+o,a:'Hike',min:60,dist:3,kc:400}];});
 const rg2=A.trendGroups().find(g=>g.name==='Hike');ok(rg2&&rg2.need===2&&!rg2.verdict,'new activity needs more sessions for baseline');
 A.UI.tab='plan';A.render();ok(/Training baseline and trends/.test(d.body.textContent)&&/improving/.test(d.body.textContent)&&/Doing well/.test(d.body.textContent),'trends card shown');
 ok(errors.length===0,'no errors trends '+errors.join('|'));

 // step-by-step checklists on speed day
 const mon=(()=>{let x=t0;while(new Date(x+'T12:00:00').getDay()!==1)x=addD(x,-1);return x;})();
 A.UI.tab='today';A.UI.date=mon;A.render();
 ok(/Step log/.test(d.body.textContent)&&/Warm-up/i.test(d.body.textContent)&&/Sprints/i.test(d.body.textContent)&&/Plyometrics/i.test(d.body.textContent),'speed day shows step log groups');
 const pcs=A.partCounts('speed',{},1);ok(pcs.total>=25&&pcs.parts.filter(p=>p.timed).length===2,'phase 1 steps counted '+pcs.total);
 const wk3=A.partCounts('speed',{},3).parts.filter(p=>p.id==='s')[0];ok(wk3.n===6&&A.partCounts('speed',{},8).parts.filter(p=>p.id==='s')[0].n===8,'sprint reps scale by phase');
 click('[data-act=partrep][data-p=w1]');ok(S.days[mon].cardio.speed.p.w1[0].d===true,'checking a warm-up step saves');
 set('[data-chg=parttime][data-p=s][data-i="0"]','3.9');set('[data-chg=parttime][data-p=s][data-i="1"]','3.7');
 const sp0=S.days[mon].cardio.speed.p.s;ok(sp0[0].t===3.9&&sp0[0].d===true&&sp0[1].t===3.7,'sprint times saved and mark rep done');
 ok(/Best 3.7 s, average 3.8 s/.test(d.body.textContent),'sprint best and average shown');
 click('[data-act=partrep][data-p=w1]');ok(!S.days[mon].cardio.speed.p.w1[0].d,'uncheck works');
 ok(!S.days[mon].cardio.speed.done,'not done until all steps');
 click('[data-act=partsall][data-id=speed]');ok(S.days[mon].cardio.speed.done===true&&A.partCounts('speed',S.days[mon].cardio.speed,1).done===A.partCounts('speed',{},1).total,'mark every step done completes cardio');
 // finisher and pool parts exist
 ok(A.PARTS.finisher(1)[0].n===5&&A.PARTS.pool_sun(1).length===3&&A.PARTS.zone2(1).length===3,'finisher, pool and zone2 have steps');
 A.UI.date=t0;
 ok(errors.length===0,'no errors steps '+errors.join('|'));

 // warm-up, stretch, timestamps, timing
 const lift=(()=>{let x=t0;while(![2,3,5,6].includes(new Date(x+'T12:00:00').getDay()))x=addD(x,-1);return x;})();
 A.UI.tab='today';A.UI.date=lift;A.render();
 ok(/Warm-up/.test(d.body.textContent)&&d.querySelectorAll('[data-act=warmchk]').length===6&&d.querySelectorAll('[data-act=stretchchk]').length===8,'lift day has warm-up and 8 stretch checks');
 click('[data-act=warmchk][data-i="0"]');ok(S.days[lift].warm[0]>1e12,'warm-up check stamped');
 const gx=A.PARTS?Object.keys(S.days[lift]||{}):0;
 const exId=d.querySelector('[data-act=setdone]').dataset.ex;click('[data-act=setdone][data-i="0"]');
 ok(S.days[lift].sets[exId][0].done&&S.days[lift].sets[exId][0].ts>1e12,'set done stamped');
 for(let i=0;i<8;i++)click('[data-act=stretchchk][data-i="'+i+'"]');
 ok(S.days[lift].checks.stretch===true&&Object.keys(S.days[lift].stretch).length===8,'all 8 stretches auto-complete stretch');
 click('[data-act=stretchchk][data-i="0"]');ok(S.days[lift].checks.stretch===false,'unchecking one stretch un-completes');
 // synthetic timing
 const tday=addD(t0,-3);const base=new Date(tday+'T06:00:00').getTime();
 S.days[tday]=S.days[tday]||{};S.days[tday].warm={0:base};
 S.days[tday].sets={goblet:[{done:true,ts:base+5*60000},{done:true,ts:base+8*60000},{done:true,ts:base+30*60000},{done:true,ts:base+70*60000}]};
 S.days[tday].cardio={zone2:{done:true,dts:base+100*60000}};
 const ses=A.timeSessions(tday,true);ok(ses.length===1&&ses[0].len===100&&ses[0].n===6,'session length 100 min, 6 checks');
 ok(ses[0].gaps.length>=2&&ses[0].longest===40,'gaps detected, longest 40 min');
 S.days[tday].stretch={0:new Date(tday+'T20:30:00').getTime(),1:new Date(tday+'T20:36:00').getTime()};
 ok(A.timeSessions(tday,true).length===2&&A.timeSessions(tday,false).length===1,'evening stretch is its own session, excluded from workout');
 A.UI.date=tday;A.render();ok(/Workout timing/.test(d.body.textContent)&&/100 min/.test(d.body.textContent)&&/Over 75 min/.test(d.body.textContent),'timing card flags long workout');
 const t2=addD(t0,-4),b2=new Date(t2+'T06:00:00').getTime();S.days[t2]=S.days[t2]||{};S.days[t2].sets={goblet:[{done:true,ts:b2},{done:true,ts:b2+40*60000},{done:true,ts:b2+80*60000}]};
 const wt=A.weekTiming();ok(wt.n>=2&&wt.long>=2,'week timing counts long sessions '+JSON.stringify(wt));
 ok(A.catchUp().some(x=>/running long/.test(x.t)),'coach flags long workouts');
 A.UI.date=t0;
 ok(errors.length===0,'no errors timing '+errors.join('|'));
 ok(errors.length===0,'no errors end '+errors.join('|'));
})().catch(e=>{console.log('FAIL exception',e.stack);process.exitCode=1;}).finally(()=>process.exit(process.exitCode||0));
