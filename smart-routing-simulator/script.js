/* Smart routing simulator - logic
   Sections: 1) topology data  2) cost metrics  3) Dijkstra + Bellman-Ford
             4) drawing (SVG)  5) packet animation  6) UI wiring + events */
const N={A:[90,90],B:[240,50],C:[170,240],D:[350,150],E:[330,340],F:[510,220],G:[540,375],H:[660,290]};
const L=[["A","B",4,100],["A","C",2,50],["B","D",5,100],["C","D",3,50],["C","E",6,100],["D","E",7,50],["D","F",2,100],["E","F",4,50],["E","G",3,100],["F","H",5,50],["G","H",2,100]].map(([a,b,d,bw])=>({a,b,d,bw,load:0,down:false}));
const $=id=>document.getElementById(id),svg=$("svg");
let path=[],drag=null;
const util=l=>l.load/l.bw;
const cost=(l,m)=>m==="hops"?1:m==="delay"?l.d:l.d*(1+4*util(l)**2);
function adj(m){const g={};for(const k in N)g[k]=[];L.forEach((l,i)=>{if(!l.down){const c=cost(l,m);g[l.a].push([l.b,c]);g[l.b].push([l.a,c])}});return g}
function dijkstra(s,m){const g=adj(m),dist={},prev={},done=new Set(),log=[];for(const k in N)dist[k]=Infinity;dist[s]=0;
 for(;;){let u=null;for(const k in dist)if(!done.has(k)&&dist[k]<Infinity&&(u===null||dist[k]<dist[u]))u=k;if(u===null)break;done.add(u);const rel=[];
  for(const[v,c]of g[u])if(!done.has(v)&&dist[u]+c<dist[v]-1e-9){dist[v]=dist[u]+c;prev[v]=u;rel.push(v+"="+dist[v].toFixed(1))}
  log.push("Visit "+u+" (cost "+dist[u].toFixed(1)+")"+(rel.length?", update "+rel.join(", "):""))}
 return{dist,prev,log}}
function bellman(s,m){const g=adj(m),dist={},prev={},log=[];for(const k in N)dist[k]=Infinity;dist[s]=0;
 for(let r=1;r<=8;r++){const ch=[];for(const u in g)for(const[v,c]of g[u])if(dist[u]+c<dist[v]-1e-9){dist[v]=dist[u]+c;prev[v]=u;ch.push(v)}
  log.push("Round "+r+": "+(ch.length?[...new Set(ch)].join(", ")+" updated":"no change, converged"));if(!ch.length)break}
 return{dist,prev,log}}
function route(s,d,m,alg){const r=(alg==="bf"?bellman:dijkstra)(s,m);const p=[];if(r.dist[d]<Infinity){p.push(d);while(p[0]!==s)p.unshift(r.prev[p[0]])}return{...r,p}}
const idx=(a,b)=>L.findIndex(l=>!l.down&&((l.a===a&&l.b===b)||(l.a===b&&l.b===a)));
const edges=p=>p.slice(1).map((k,j)=>L[idx(p[j],k)]);
function draw(){let h="";
 L.forEach((l,i)=>{const[a,b]=[N[l.a],N[l.b]],u=util(l),col=l.down||u>.75?"var(--red)":u>.4?"var(--amber)":"var(--mute)";
  const on=path.length>1&&path.some((k,j)=>j&&idx(path[j-1],k)===i);
  if(on)h+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="var(--teal)" stroke-width="11" opacity=".4" stroke-linecap="round"/>`;
  h+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-width="${2+Math.min(u,1)*3}" ${l.down?'stroke-dasharray="6 6"':""}/>`;
  h+=`<line data-i="${i}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="transparent" stroke-width="18" style="cursor:pointer"><title>Click to ${l.down?"restore":"fail"} link ${l.a}-${l.b}</title></line>`;
  h+=`<text x="${(a[0]+b[0])/2}" y="${(a[1]+b[1])/2+4}" text-anchor="middle" font-size="12" fill="var(--ink)" style="paint-order:stroke;stroke:var(--bg);stroke-width:5px">${l.down?"down":l.d+"ms · "+Math.round(u*100)+"%"}</text>`});
 const s=$("src").value,d=$("dst").value;
 for(const k in N){const[x,y]=N[k],f=k===s?"var(--teal)":k===d?"var(--ink)":"var(--panel)",t=k===s||k===d?"var(--bg)":"var(--ink)";
  h+=`<g class="node" data-n="${k}"><circle cx="${x}" cy="${y}" r="21" fill="${f}" stroke="var(--ink)" stroke-width="2"/><text x="${x}" y="${y+5}" text-anchor="middle" font-weight="700" font-size="15" fill="${t}">${k}</text></g>`}
 h+='<circle id="pkt" r="0" fill="var(--amber)" stroke="var(--ink)" stroke-width="2"/>';
 svg.innerHTML=h}
function animate(p){if(p.length<2||matchMedia("(prefers-reduced-motion:reduce)").matches)return;const pts=p.map(k=>N[k]);let t0=null;
 (function f(ts){t0=t0||ts;const t=(ts-t0)/650,s=Math.floor(t),el=$("pkt");if(!el)return;if(s>=pts.length-1){el.setAttribute("r",0);return}
  const q=t-s,a=pts[s],b=pts[s+1];el.setAttribute("cx",a[0]+(b[0]-a[0])*q);el.setAttribute("cy",a[1]+(b[1]-a[1])*q);el.setAttribute("r",7);requestAnimationFrame(f)})(performance.now())}
function run(){const s=$("src").value,d=$("dst").value,m=$("met").value,alg=$("alg").value;
 const r=route(s,d,m,alg);path=r.p;
 $("route").textContent=s===d?"Pick two different routers":r.p.length?r.p.join(" → "):"No route: destination unreachable";
 if(r.p.length>1){const es=edges(r.p);$("sum").textContent=`Cost ${r.dist[d].toFixed(1)} · ${es.length} hops · ${es.reduce((t,l)=>t+l.d,0)} ms base delay · busiest link ${Math.round(Math.max(...es.map(util))*100)}%`}else $("sum").textContent="";
 let c="<tr><th>Metric</th><th>Path</th><th>Delay</th><th>Busiest link</th></tr>";
 [["hops","Hop count"],["delay","Delay"],["smart","Smart"]].forEach(([k,n])=>{const q=route(s,d,k,"dj");
  if(q.p.length>1){const es=edges(q.p);c+=`<tr><td>${n}</td><td>${q.p.join("-")}</td><td>${es.reduce((t,l)=>t+l.d,0)} ms</td><td>${Math.round(Math.max(...es.map(util))*100)}%</td></tr>`}else c+=`<tr><td>${n}</td><td colspan="3">unreachable</td></tr>`});
 $("cmp").innerHTML=c;
 let t="<tr><th>Destination</th><th>Next hop</th><th>Cost</th></tr>";
 for(const k in N)if(k!==s){if(r.dist[k]===Infinity){t+=`<tr><td>${k}</td><td colspan="2">unreachable</td></tr>`;continue}
  let x=k;while(r.prev[x]!==s)x=r.prev[x];t+=`<tr><td>${k}</td><td>${x}</td><td>${r.dist[k].toFixed(1)}</td></tr>`}
 $("tbl").innerHTML=t;
 $("lt").textContent=alg==="bf"?"Distance-vector rounds":"Link-state steps";
 $("log").innerHTML=r.log.map(x=>`<li>${x}</li>`).join("");
 draw()}
function send(){const s=$("src").value,d=$("dst").value;if(s===d){$("msg").textContent="Choose different source and destination routers.";return}
 const r=route(s,d,$("met").value,$("alg").value);if(r.p.length<2){$("msg").textContent="No route available, so nothing was sent.";return}
 const mb=Math.max(1,+$("flow").value||1);edges(r.p).forEach(l=>l.load+=mb);
 $("msg").textContent=`Sent ${mb} Mbps along ${r.p.join(" → ")}. Links above 100% are overloaded.`;
 run();animate(r.p)}
for(const k in N){$("src").add(new Option(k,k));$("dst").add(new Option(k,k))}
$("src").value="A";$("dst").value="H";
["src","dst","alg","met"].forEach(i=>$(i).onchange=()=>{$("msg").textContent="";run()});
$("send").onclick=send;
$("rl").onclick=()=>{L.forEach(l=>l.load=0);$("msg").textContent="Traffic cleared.";run()};
$("rk").onclick=()=>{L.forEach(l=>l.down=false);$("msg").textContent="All links restored.";run()};
svg.addEventListener("pointerdown",e=>{const g=e.target.closest("[data-n]");if(g){drag=g.dataset.n;svg.setPointerCapture(e.pointerId)}});
svg.addEventListener("pointermove",e=>{if(!drag)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());N[drag]=[Math.max(24,Math.min(716,q.x)),Math.max(24,Math.min(396,q.y))];draw()});
svg.addEventListener("pointerup",()=>drag=null);
svg.addEventListener("click",e=>{const h=e.target.closest("[data-i]");if(h){const l=L[+h.dataset.i];l.down=!l.down;$("msg").textContent=`Link ${l.a}-${l.b} ${l.down?"failed":"restored"}; routes recomputed.`;run()}});
run();
