/* =========================================================
   OP TORNEOS - Lógica principal
   Todo se guarda en localStorage del dispositivo (sin servidor).
   ========================================================= */

const STORAGE_KEY = "optcg_tracker_state_v1";
let state = null;
let pickerCallback = null;

function defaultState(){
  return {
    leaders: BASE_LEADERS.map(l => ({...l, image:null, custom:false})),
    tournaments: [],
    apiKey: null,
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn("No se pudo leer el almacenamiento", e); }
  return defaultState();
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
}

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/* ---------- Navegación ---------- */
function showView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  const view = document.getElementById("view-"+name);
  if(view) view.classList.add("active");
  const tab = document.querySelector(`.tab[data-v="${name}"]`);
  if(tab) tab.classList.add("active");
  if(name==="dashboard") renderDashboard();
  if(name==="lideres") renderLeaderLibrary("");
  if(name==="torneos") renderTournamentList();
  if(name==="ajustes") document.getElementById("apiKeyInput").value = state.apiKey || "";
}

function closeModal(){ document.getElementById("modalBg").classList.remove("show"); }
function openModalHTML(html){
  document.getElementById("modalContent").innerHTML = `<div class="closebar"></div>` + html;
  document.getElementById("modalBg").classList.add("show");
}
document.getElementById("modalBg").addEventListener("click", e=>{
  if(e.target.id==="modalBg") closeModal();
});

/* ---------- Avatares de líder (con o sin imagen) ---------- */
function leaderAvatarHTML(leader){
  if(leader && leader.image){
    return `<img src="${leader.image}" onerror="this.parentElement.innerHTML='${(leader.name||"?")[0]}'">`;
  }
  const initial = leader ? (leader.name||"?")[0].toUpperCase() : "?";
  return initial;
}

function findLeader(id){ return state.leaders.find(l=>l.id===id); }

/* ---------- Librería de líderes ---------- */
function renderLeaderLibrary(filter){
  const grid = document.getElementById("leaderLibraryGrid");
  const f = (filter||"").toLowerCase();
  const list = state.leaders.filter(l=>l.name.toLowerCase().includes(f));
  if(list.length===0){
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">Sin resultados.</div>`;
    return;
  }
  grid.innerHTML = list.map(l=>`
    <div class="leader-tile" onclick="openLeaderEditor('${l.id}')">
      <div class="avatar">${leaderAvatarHTML(l)}</div>
      <span class="name">${l.name}</span>
    </div>
  `).join("");
}

function openLeaderEditor(id){
  const existing = id ? findLeader(id) : null;
  openModalHTML(`
    <h3>${existing? "Editar líder":"Añadir líder manual"}</h3>
    <label>Nombre del líder</label>
    <input id="led_name" value="${existing? existing.name:""}" placeholder="Ej: Monkey D. Luffy">
    <label>Colores (separados por coma)</label>
    <input id="led_colors" value="${existing? existing.colors.join(", "):""}" placeholder="Ej: Rojo, Verde">
    <label>URL de imagen (opcional)</label>
    <input id="led_img" value="${existing && existing.image? existing.image:""}" placeholder="https://...">
    <div class="row" style="margin-top:14px;">
      ${existing? `<button class="btn secondary block" onclick="deleteLeader('${existing.id}')">Eliminar</button>`:""}
      <button class="btn block" onclick="saveLeaderEditor('${existing? existing.id:""}')">Guardar</button>
    </div>
  `);
}

function saveLeaderEditor(id){
  const name = document.getElementById("led_name").value.trim();
  if(!name){ toast("Escribe un nombre"); return; }
  const colors = document.getElementById("led_colors").value.split(",").map(s=>s.trim()).filter(Boolean);
  const image = document.getElementById("led_img").value.trim() || null;
  if(id){
    const l = findLeader(id);
    l.name=name; l.colors=colors.length?colors:["Variado"]; l.image=image;
  } else {
    state.leaders.push({id:uid(), name, colors: colors.length?colors:["Variado"], image, custom:true});
  }
  saveState();
  closeModal();
  renderLeaderLibrary("");
  toast("Líder guardado");
}

function deleteLeader(id){
  state.leaders = state.leaders.filter(l=>l.id!==id);
  saveState();
  closeModal();
  renderLeaderLibrary("");
}

/* ---------- Selector de líder reutilizable (modal) ---------- */
function pickLeader(callback, title){
  pickerCallback = callback;
  openModalHTML(`
    <h3>${title||"Elige un líder"}</h3>
    <div class="search-box">
      <input placeholder="Buscar..." oninput="renderPickerGrid(this.value)">
    </div>
    <div class="leader-grid" id="pickerGrid"></div>
    <button class="btn ghost block" style="margin-top:10px;" onclick="closeModal();openLeaderEditorThenPick()">➕ Añadir nuevo líder</button>
  `);
  renderPickerGrid("");
}
function renderPickerGrid(filter){
  const grid = document.getElementById("pickerGrid");
  if(!grid) return;
  const f=(filter||"").toLowerCase();
  const list = state.leaders.filter(l=>l.name.toLowerCase().includes(f));
  grid.innerHTML = list.map(l=>`
    <div class="leader-tile" onclick='pickerChoose("${l.id}")'>
      <div class="avatar">${leaderAvatarHTML(l)}</div>
      <span class="name">${l.name}</span>
    </div>
  `).join("") || `<div class="empty" style="grid-column:1/-1">Sin resultados</div>`;
}
function pickerChoose(id){
  const l = findLeader(id);
  closeModal();
  if(pickerCallback) pickerCallback(l);
}
function openLeaderEditorThenPick(){ openLeaderEditor(null); }

/* ---------- Proxy de imágenes ----------
   El sitio oficial (en.onepiece-cardgame.com) bloquea la carga de sus
   imágenes desde otras webs (Chrome las marca como
   ERR_BLOCKED_BY_RESPONSE.NotSameSite). Para solucionarlo, pasamos la
   imagen por wsrv.nl, un servicio gratuito que la sirve sin ese problema. */
function proxifyImage(url){
  if(!url) return null;
  const stripped = url.replace(/^https:\/\//,'').replace(/^http:\/\//,'');
  return 'https://wsrv.nl/?url=' + encodeURIComponent('ssl:'+stripped);
}


async function syncLeadersOnline(){
  if(!state.apiKey){
    toast("Añade tu clave de API en Ajustes primero");
    showView("ajustes");
    return;
  }
  toast("Descargando líderes...");
  try{
    let page=1, all=[], totalPages=1;
    do{
      const res = await fetch(`https://www.apitcg.com/api/one-piece/cards?type=LEADER&limit=100&page=${page}`,{
        headers:{ "x-api-key": state.apiKey }
      });
      if(!res.ok) throw new Error("HTTP "+res.status);
      const data = await res.json();
      all = all.concat(data.data||[]);
      totalPages = data.totalPages||1;
      page++;
    } while(page<=totalPages);

    const onlineLeaders = all.map(c=>({
      id: "api_"+c.code,
      name: c.name.replace(/\./g," "),
      colors: c.color ? c.color.split("/") : ["Variado"],
      image: c.images? proxifyImage(c.images.large||c.images.small) : null,
      custom:false
    }));
    // Mezclar: quitar duplicados por nombre, preferir versión online (con imagen)
    const customOnes = state.leaders.filter(l=>l.custom);
    state.leaders = [...onlineLeaders, ...customOnes];
    saveState();
    toast(`¡Listo! ${onlineLeaders.length} líderes cargados.`);
    renderLeaderLibrary("");
  }catch(e){
    console.error(e);
    toast("No se pudo conectar. Revisa tu clave o tu conexión.");
  }
}

function saveApiKey(){
  state.apiKey = document.getElementById("apiKeyInput").value.trim() || null;
  saveState();
  toast("Clave guardada");
}

/* ---------- Torneos ---------- */
function startNewTournament(){
  pickLeader((leader)=>{
    const t = {
      id: uid(),
      name: "Torneo " + new Date().toLocaleDateString("es-ES"),
      date: new Date().toISOString().slice(0,10),
      ownLeaderId: leader.id,
      rounds: [],
      placement: null,
      finished: false
    };
    state.tournaments.unshift(t);
    saveState();
    openTournament(t.id);
  }, "¿Con qué líder vas a jugar?");
}

function renderTournamentList(){
  const el = document.getElementById("tournamentList");
  if(state.tournaments.length===0){
    el.innerHTML = `<div class="empty"><span class="ic">🏆</span>Todavía no has creado ningún torneo.<br><br><button class="btn" onclick="startNewTournament()">Crear el primero</button></div>`;
    return;
  }
  el.innerHTML = state.tournaments.map(t=>{
    const {w,l,d} = recordOf(t);
    const leader = findLeader(t.ownLeaderId);
    return `<div class="tour-item" onclick="openTournament('${t.id}')">
      <div>
        <b>${t.name}</b>
        <div class="muted">${leader? leader.name:"—"} · ${t.date}</div>
      </div>
      <div class="res">${w}V - ${l}D${d?(' - '+d+'E'):''}</div>
    </div>`;
  }).join("");
}

function recordOf(t){
  let w=0,l=0,d=0;
  t.rounds.forEach(r=>{
    if(r.result==="win") w++;
    else if(r.result==="loss") l++;
    else if(r.result==="draw") d++;
  });
  return {w,l,d};
}

function openTournament(id){
  const t = state.tournaments.find(x=>x.id===id);
  if(!t) return;
  showRawView("torneo-detalle");
  const leader = findLeader(t.ownLeaderId);
  const {w,l,d} = recordOf(t);
  const view = document.getElementById("view-torneo-detalle");
  view.innerHTML = `
    <button class="btn secondary sm" onclick="showView('torneos')">← Volver a torneos</button>
    <div class="banner" style="margin-top:10px;">
      <div class="avatar" style="width:60px;height:80px;margin:0 auto 8px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;background:linear-gradient(160deg,#444,#222);overflow:hidden;">${leaderAvatarHTML(leader)}</div>
      <input id="tourName" value="${t.name}" onchange="updateTourField('${t.id}','name',this.value)" style="text-align:center;font-weight:700;font-size:16px;background:transparent;border:none;">
      <input type="date" id="tourDate" value="${t.date}" onchange="updateTourField('${t.id}','date',this.value)" style="text-align:center;background:transparent;border:none;color:var(--muted);">
      <div class="score">${w}V - ${l}D${d?(' - '+d+'E'):''}</div>
      <button class="btn ghost sm" onclick="changeOwnLeader('${t.id}')">Cambiar líder propio</button>
    </div>

    <label>Posición final del torneo (opcional, ej: 1, 4, 8...)</label>
    <input type="number" min="1" value="${t.placement||''}" onchange="updateTourField('${t.id}','placement',this.value?parseInt(this.value):null)">

    <h3 style="margin-top:16px;">Rondas</h3>
    <div id="roundsList"></div>
    <button class="btn block" onclick="addRound('${t.id}')">➕ Añadir ronda</button>

    <button class="btn secondary block" style="margin-top:16px;" onclick="if(confirm('¿Eliminar este torneo?')){deleteTournament('${t.id}')}">🗑️ Eliminar torneo</button>
  `;
  renderRounds(t.id);
}

// pequeño helper para activar una vista que no está en la barra de tabs
function showRawView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById("view-"+name).classList.add("active");
}

function updateTourField(id, field, value){
  const t = state.tournaments.find(x=>x.id===id);
  t[field]=value;
  saveState();
  if(field==="name"||field==="date"){ /* nada más que hacer */ }
}

function changeOwnLeader(tid){
  pickLeader((leader)=>{
    const t = state.tournaments.find(x=>x.id===tid);
    t.ownLeaderId = leader.id;
    saveState();
    openTournament(tid);
  }, "Elige tu nuevo líder");
}

function deleteTournament(id){
  state.tournaments = state.tournaments.filter(x=>x.id!==id);
  saveState();
  showView("torneos");
}

function addRound(tid){
  const t = state.tournaments.find(x=>x.id===tid);
  t.rounds.push({id:uid(), opponentLeaderId:null, opponentLeaderName:null, dice:null, order:null, result:null, notes:""});
  saveState();
  renderRounds(tid);
}

function renderRounds(tid){
  const t = state.tournaments.find(x=>x.id===tid);
  const list = document.getElementById("roundsList");
  if(t.rounds.length===0){
    list.innerHTML = `<div class="empty">Sin rondas todavía.</div>`;
    return;
  }
  list.innerHTML = t.rounds.map((r,idx)=>{
    const oppName = r.opponentLeaderId ? findLeader(r.opponentLeaderId).name : (r.opponentLeaderName||"Elegir rival");
    return `
    <div class="round-row">
      <div class="rh">
        <b>Ronda ${idx+1}</b>
        <button class="icon-btn" onclick="removeRound('${tid}','${r.id}')">🗑️</button>
      </div>
      <button class="btn secondary block sm" style="margin-bottom:8px;text-align:left;" onclick="pickOpponent('${tid}','${r.id}')">🎴 Rival: ${oppName}</button>

      <label style="margin-top:0;">Tirada de dado</label>
      <div class="btn-toggle-group">
        <div class="btn-toggle ${r.dice==='win'?'on-win':''}" onclick="setRoundField('${tid}','${r.id}','dice','win')">🎲 Ganada</div>
        <div class="btn-toggle ${r.dice==='loss'?'on-loss':''}" onclick="setRoundField('${tid}','${r.id}','dice','loss')">🎲 Perdida</div>
      </div>

      <label>Orden de turno</label>
      <div class="btn-toggle-group">
        <div class="btn-toggle ${r.order==='first'?'on-win':''}" onclick="setRoundField('${tid}','${r.id}','order','first')">1º Primero</div>
        <div class="btn-toggle ${r.order==='second'?'on-loss':''}" onclick="setRoundField('${tid}','${r.id}','order','second')">2º Segundo</div>
      </div>

      <label>Resultado</label>
      <div class="btn-toggle-group">
        <div class="btn-toggle ${r.result==='win'?'on-win':''}" onclick="setRoundField('${tid}','${r.id}','result','win')">✅ Victoria</div>
        <div class="btn-toggle ${r.result==='loss'?'on-loss':''}" onclick="setRoundField('${tid}','${r.id}','result','loss')">❌ Derrota</div>
        <div class="btn-toggle ${r.result==='draw'?'on-draw':''}" onclick="setRoundField('${tid}','${r.id}','result','draw')">➖ Empate</div>
      </div>

      <label>Notas</label>
      <input value="${r.notes||''}" placeholder="Notas de la partida..." onchange="setRoundField('${tid}','${r.id}','notes',this.value)">
    </div>`;
  }).join("");
}

function pickOpponent(tid, rid){
  pickLeader((leader)=>{
    const t = state.tournaments.find(x=>x.id===tid);
    const r = t.rounds.find(x=>x.id===rid);
    r.opponentLeaderId = leader.id;
    r.opponentLeaderName = leader.name;
    saveState();
    renderRounds(tid);
  }, "¿Contra qué líder jugaste?");
}

function setRoundField(tid, rid, field, value){
  const t = state.tournaments.find(x=>x.id===tid);
  const r = t.rounds.find(x=>x.id===rid);
  r[field] = (r[field]===value) ? null : value; // pulsar otra vez deselecciona
  saveState();
  renderRounds(tid);
  renderTournamentList();
}

function removeRound(tid, rid){
  const t = state.tournaments.find(x=>x.id===tid);
  t.rounds = t.rounds.filter(x=>x.id!==rid);
  saveState();
  renderRounds(tid);
}

/* ---------- Estadísticas globales ---------- */
function computeGlobalStats(){
  const allRounds = state.tournaments.flatMap(t=>t.rounds);
  const decided = allRounds.filter(r=>r.result==="win"||r.result==="loss");
  const wins = allRounds.filter(r=>r.result==="win").length;
  const losses = allRounds.filter(r=>r.result==="loss").length;

  const firstRounds = allRounds.filter(r=>r.order==="first" && (r.result==="win"||r.result==="loss"));
  const firstWins = firstRounds.filter(r=>r.result==="win").length;

  const secondRounds = allRounds.filter(r=>r.order==="second" && (r.result==="win"||r.result==="loss"));
  const secondWins = secondRounds.filter(r=>r.result==="win").length;

  const diceRounds = allRounds.filter(r=>r.dice==="win"||r.dice==="loss");
  const diceWins = diceRounds.filter(r=>r.dice==="win").length;

  const placements = state.tournaments.map(t=>t.placement).filter(p=>p!=null);
  const avgPlacement = placements.length? (placements.reduce((a,b)=>a+b,0)/placements.length).toFixed(1) : null;

  const pct = (num,den)=> den? ((num/den)*100).toFixed(2) : "0.00";

  return {
    totalEvents: state.tournaments.length,
    totalGames: allRounds.length,
    overall: pct(wins, decided.length), overallWL: `${wins}V-${losses}D`,
    firstPct: pct(firstWins, firstRounds.length), firstWL: `${firstWins}V-${firstRounds.length-firstWins}D`,
    secondPct: pct(secondWins, secondRounds.length), secondWL: `${secondWins}V-${secondRounds.length-secondWins}D`,
    dicePct: pct(diceWins, diceRounds.length), diceWL: `${diceWins}-${diceRounds.length-diceWins}`,
    avgPlacement: avgPlacement || "-"
  };
}

function computeLeaderStats(){
  const map = {};
  state.tournaments.forEach(t=>{
    const leader = findLeader(t.ownLeaderId);
    const key = leader? leader.name : "Desconocido";
    if(!map[key]) map[key] = {name:key, w:0,l:0,d:0};
    t.rounds.forEach(r=>{
      if(r.result==="win") map[key].w++;
      else if(r.result==="loss") map[key].l++;
      else if(r.result==="draw") map[key].d++;
    });
  });
  return Object.values(map).filter(x=>x.w+x.l+x.d>0);
}

function renderDashboard(){
  const s = computeGlobalStats();
  document.getElementById("globalStats").innerHTML = `
    <div class="stat"><div class="label">Eventos</div><div class="value">${s.totalEvents}</div></div>
    <div class="stat"><div class="label">Partidas</div><div class="value">${s.totalGames}</div></div>
    <div class="stat"><div class="label">Winrate total</div><div class="value">${s.overall}%</div><div class="sub">${s.overallWL}</div></div>
    <div class="stat"><div class="label">Winrate 1º</div><div class="value">${s.firstPct}%</div><div class="sub">${s.firstWL}</div></div>
    <div class="stat"><div class="label">Winrate 2º</div><div class="value">${s.secondPct}%</div><div class="sub">${s.secondWL}</div></div>
    <div class="stat"><div class="label">Winrate dado</div><div class="value">${s.dicePct}%</div><div class="sub">${s.diceWL}</div></div>
    <div class="stat"><div class="label">Posición media</div><div class="value">${s.avgPlacement}</div></div>
  `;

  const leaderStats = computeLeaderStats();
  const card = document.getElementById("leaderStatsCard");
  if(leaderStats.length===0){
    card.innerHTML = `<div class="empty">Aún no hay datos de líderes.</div>`;
  } else {
    card.innerHTML = `<table>
      <tr><th>Líder</th><th>V</th><th>D</th><th>E</th><th>Winrate</th></tr>
      ${leaderStats.map(x=>{
        const decided=x.w+x.l;
        const pct = decided? ((x.w/decided)*100).toFixed(1):"0.0";
        return `<tr><td>${x.name}</td><td>${x.w}</td><td>${x.l}</td><td>${x.d}</td><td>${pct}%</td></tr>`;
      }).join("")}
    </table>`;
  }

  const recent = document.getElementById("recentTournaments");
  if(state.tournaments.length===0){
    recent.innerHTML = `<div class="empty"><span class="ic">📭</span>No hay torneos registrados todavía.<br><br><button class="btn" onclick="showView('torneos');startNewTournament()">Crear mi primer torneo</button></div>`;
  } else {
    recent.innerHTML = state.tournaments.slice(0,5).map(t=>{
      const {w,l,d} = recordOf(t);
      const leader = findLeader(t.ownLeaderId);
      return `<div class="tour-item" onclick="openTournament('${t.id}')">
        <div><b>${t.name}</b><div class="muted">${leader?leader.name:"—"} · ${t.date}</div></div>
        <div class="res">${w}V-${l}D</div>
      </div>`;
    }).join("");
  }
}

/* ---------- Copia de seguridad ---------- */
function exportData(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "optcg_backup.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast("Copia exportada");
}
function importData(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const data = JSON.parse(e.target.result);
      state = data;
      saveState();
      toast("Datos importados");
      showView("dashboard");
    }catch(err){ toast("Archivo no válido"); }
  };
  reader.readAsText(file);
}
function resetAll(){
  state = defaultState();
  saveState();
  showView("dashboard");
  toast("Datos borrados");
}

/* ---------- Arranque ---------- */
state = loadState();
renderDashboard();

// Registrar service worker para que la app funcione sin conexión (PWA)
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  });
}
