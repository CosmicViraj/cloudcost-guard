const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
async function cfg(env){const r=(await env.DB.prepare('SELECT k,v FROM settings').all()).results;return Object.fromEntries(r.map(x=>[x.k,+x.v]))}
export default{async fetch(req,env){
 const u=new URL(req.url),p=u.pathname;
 if(!p.startsWith('/api/'))return env.ASSETS.fetch(req);
 if(req.headers.get('x-api-key')!==env.API_KEY)return J({error:'Unauthorized'},401);
 try{
 if(p==='/api/spend'&&req.method==='POST'){
  const b=await req.json(),c=await cfg(env),rate=c[b.currency];
  const amt=+b.amount;
  if(!rate||!(amt>0)||!/^\d{4}-\d{2}-\d{2}$/.test(b.day)||!b.provider)return J({error:'Invalid input'},400);
  const inr=amt*rate*(b.gst?1.18:1);
  await env.DB.prepare('INSERT INTO spend(day,provider,service,team,amount,currency,inr,gst) VALUES(?,?,?,?,?,?,?,?)')
   .bind(b.day,String(b.provider).slice(0,40),String(b.service||'').slice(0,60),String(b.team||'General').slice(0,40),amt,b.currency,inr,b.gst?1:0).run();
  return J({ok:true},201)}
 if(p==='/api/spend'&&req.method==='GET')
  return J((await env.DB.prepare('SELECT * FROM spend ORDER BY day DESC,id DESC LIMIT 100').all()).results);
 if(p.startsWith('/api/spend/')&&req.method==='DELETE'){await env.DB.prepare('DELETE FROM spend WHERE id=?').bind(+p.split('/').pop()).run();return J({ok:true})}
 if(p==='/api/budget'&&req.method==='PUT'){const b=await req.json();if(!(+b.budget>0))return J({error:'Invalid'},400);await env.DB.prepare("INSERT OR REPLACE INTO settings VALUES('budget',?)").bind(String(+b.budget)).run();return J({ok:true})}
 if(p==='/api/summary'){
  const now=new Date(),ym=now.toISOString().slice(0,7),dom=now.getUTCDate(),dim=new Date(now.getUTCFullYear(),now.getUTCMonth()+1,0).getDate();
  const c=await cfg(env);
  const grp=async col=>(await env.DB.prepare(`SELECT ${col} k,SUM(inr) t FROM spend WHERE day LIKE ?||'%' GROUP BY ${col} ORDER BY t DESC`).bind(ym).all()).results;
  const mtd=(await env.DB.prepare("SELECT COALESCE(SUM(inr),0) t FROM spend WHERE day LIKE ?||'%'").bind(ym).first()).t;
  const since=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
  const days=(await env.DB.prepare('SELECT day,SUM(inr) t FROM spend WHERE day>=? GROUP BY day ORDER BY day').bind(since).all()).results;
  const v=days.map(d=>d.t),m=v.reduce((a,b)=>a+b,0)/(v.length||1),sd=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/(v.length||1));
  const anomalies=v.length>=7?days.filter(d=>d.t>m+2*sd&&d.t>m*1.5).map(d=>({day:d.day,inr:d.t,x:+(d.t/m).toFixed(1)})):[];
  const forecast=dom?mtd/dom*dim:0;
  return J({budget:c.budget,mtd,forecast,pct:c.budget?mtd/c.budget*100:0,willBreach:forecast>c.budget,byProvider:await grp('provider'),byTeam:await grp('team'),anomalies,fx:{USD:c.USD,EUR:c.EUR}})}
 return J({error:'Not found'},404)
 }catch(e){return J({error:'Server error'},500)}
}}
