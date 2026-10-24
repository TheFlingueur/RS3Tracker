const $=s=>document.querySelector(s);
let quests=[], areas=[], progress=new Map();
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("hidden",p.id!==b.dataset.tab));}));
$("#refresh").addEventListener("click",loadAll);
$("#questSearch").addEventListener("input",renderQuests);$("#questFilter").addEventListener("change",renderQuests);
$("#areaSearch").addEventListener("input",renderAreas);$("#areaFilter").addEventListener("change",renderAreas);
const k=(type,key)=>`${type}:${key}`;
async function api(url,opts={}){const r=await fetch(url,{...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}});const d=await r.json();if(!r.ok)throw Error(d.error||d.note||`HTTP ${r.status}`);return d;}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function toggle(type,key,completed){try{await api("/api/progress",{method:"PUT",body:JSON.stringify({type,key,completed})});progress.set(k(type,key),completed);renderQuests();renderAreas();}catch(e){alert("Could not save progress: "+e.message);}}
async function loadAll(){
  $("#profileStatus").textContent="Loading";$("#profileMessage").textContent="Contacting official Adventurer's Log…";$("#profilePill").textContent="Connecting";
  const results=await Promise.allSettled([
    api("/api/config").then(d=>{const p=d.player||"The_Deedz";$("#playerName").textContent=p;$("#profileSource").href=`https://secure.runescape.com/m=adventurers-log/profile?searchName=${encodeURIComponent(p)}`;}),
    api("/api/progress").then(d=>{progress=new Map((d.items||[]).map(x=>[k(x.item_type,x.item_key),!!x.completed]));}),
    api("/api/profile").then(d=>{$("#profileStatus").textContent=d.stats?.length?"Retrieved":"Check source";$("#profilePill").textContent=d.stats?.length?"Source reached":"Limited data";$("#profileMessage").textContent=d.note||d.error||"Profile loaded.";$("#profileText").textContent=d.pageText||d.error||"";$("#statTable").innerHTML=d.stats?.length?"<table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>"+d.stats.map(x=>`<tr><td>${esc(x.label)}</td><td>${esc(x.value)}</td></tr>`).join("")+"</tbody></table>":"";}),
    api("/api/wiki/quests").then(d=>{quests=dedupe(d.quests||[]);$("#questCount").textContent=quests.length||"—";$("#questNote").textContent=d.note||d.error||"";}),
    api("/api/wiki/areas").then(d=>{areas=[...new Set(d.areas||[])];$("#areaNote").textContent=d.note||d.error||"";})
  ]);
  if(results[2].status==="rejected"){ $("#profileStatus").textContent="Unavailable";$("#profilePill").textContent="Unavailable";$("#profileMessage").textContent=results[2].reason.message; }
  if(results[3].status==="rejected")$("#questList").textContent=results[3].reason.message;
  if(results[4].status==="rejected")$("#areaList").textContent=results[4].reason.message;
  renderQuests();renderAreas();
}
function dedupe(arr){const seen=new Set();return arr.filter(x=>{const n=x.name.toLowerCase();if(seen.has(n))return false;seen.add(n);return true;});}
function renderQuests(){const term=$("#questSearch").value.toLowerCase(),f=$("#questFilter").value;const rows=quests.filter(q=>q.name.toLowerCase().includes(term)&&(f==="all"||(f==="done")===!!progress.get(k("quest",q.name))));$("#doneCount").textContent=quests.filter(q=>progress.get(k("quest",q.name))).length;$("#questList").innerHTML=rows.length?rows.map(q=>`<label class="item ${progress.get(k("quest",q.name))?"done":""}"><input type="checkbox" data-key="${esc(q.name)}" ${progress.get(k("quest",q.name))?"checked":""}><span class="item-name">${esc(q.name)}<small><a href="${esc(q.url)}" target="_blank" rel="noreferrer">Open Wiki page ↗</a></small></span></label>`).join(""):"<p>No matching quests. Check the Wiki source if the import failed.</p>";$("#questList").querySelectorAll("[data-key]").forEach(c=>c.addEventListener("change",()=>toggle("quest",c.dataset.key,c.checked)));}
function renderAreas(){const term=$("#areaSearch").value.toLowerCase(),f=$("#areaFilter").value;const rows=areas.filter(n=>n.toLowerCase().includes(term)&&(f==="all"||(f==="done")===!!progress.get(k("area",n))));$("#areaDoneCount").textContent=areas.filter(n=>progress.get(k("area",n))).length;$("#areaList").innerHTML=rows.length?rows.map(n=>`<label class="item ${progress.get(k("area",n))?"done":""}"><input type="checkbox" data-key="${esc(n)}" ${progress.get(k("area",n))?"checked":""}><span class="item-name">${esc(n)}</span></label>`).join(""):"<p>No matching headings. Check the Wiki source if the import failed.</p>";$("#areaList").querySelectorAll("[data-key]").forEach(c=>c.addEventListener("change",()=>toggle("area",c.dataset.key,c.checked)));}
loadAll();