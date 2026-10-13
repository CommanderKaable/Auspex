/* Auspex: Battle Ledger — table companion for 40k Reforged. Vanilla JS, no build step. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function d6(){ const a = new Uint8Array(1); do { crypto.getRandomValues(a); } while (a[0] >= 252); return a[0] % 6 + 1; }
const rollN = n => Array.from({length: Math.max(0, n)}, d6);
const sum = a => a.reduce((x, y) => x + y, 0);
const KEY = "reforged-companion-v2";
const SIDES = ["Red", "Green"];

/* ---------- missions ---------- */
// Board is 60" x 44". Red deploys bottom/left, Green top/right. Layouts are approximations of the classic deployment maps.
const O = (id, x, y, t, label) => ({id, x, y, t, label});
const MISSIONS = {
  vault: {name: "Vault Breaker", deploy: "Diagonal corners", src: "Official 40k Reforged mission", vp: false, rounds: 0,
    zones: ["0,20 0,44 24,44", "36,0 60,0 60,24"],
    objs: [O("V1",16,8,"vault","Vault"), O("V2",30,22,"vault","Vault"), O("V3",44,36,"vault","Vault"), O("RF1",41.7,5.7,"forge0","Red forge"), O("RF2",54.3,18.3,"forge0","Red forge"), O("GF1",5.7,25.7,"forge1","Green forge"), O("GF2",18.3,38.3,"forge1","Green forge")],
    brief: ["Capture a vault in your active unit's End step: be within 4\" and have more models than all enemy units within 4\". Roll 2D6, take a relic matching a die. Doubles make the unit ready again.",
      "Carry a relic to one of your forges (the two nearest the enemy zone) and outnumber the defenders to reforge it. Each forge once per round; not by units that were in reserves this round.",
      "Win: three units with reforged relics on the battlefield. No round limit."]},
  hold: {name: "Take and Hold", deploy: "Dawn of War (long edges, 12\" deep)", src: "Adapted from the classic Take and Hold", vp: true, rounds: 5,
    zones: ["0,32 60,32 60,44 0,44", "0,0 60,0 60,12 0,12"],
    objs: [O("C",30,22,"c","Centre"), O("RH",30,38,"h0","Red home"), O("GH",30,6,"h1","Green home"), O("W",10,22,"n","West"), O("E",50,22,"n","East")],
    brief: ["Five objectives. At the end of each battle round from round 2, a side controls an objective if it has more models within 4\" of its centre than the other side.",
      "Score 3 VP for each objective you control (up to 15 VP a round).",
      "The battle lasts 5 rounds. Most VP wins."]},
  purge: {name: "Purge the Foe", deploy: "Search and Destroy (table quarters, 9\" clear of centre)", src: "Adapted from the classic Purge the Foe", vp: true, rounds: 5,
    zones: ["0,22 30,22 30,44 0,44", "30,0 60,0 60,22 30,22"], hole: true,
    objs: [O("C",30,22,"c","Centre"), O("RH",13,35,"h0","Red home"), O("GH",47,9,"h1","Green home"), O("NW",15,11,"n","North-west"), O("SE",45,33,"n","South-east")],
    brief: ["At the end of every battle round: 4 VP if you destroyed at least one enemy unit that round, plus 4 VP if you destroyed more units than your opponent did.",
      "From round 2, also: 4 VP if you control at least one objective, plus 4 VP if you control more than your opponent. Control = more models within 4\".",
      "The app counts kills from units marked Destroyed. 5 rounds, most VP wins."]},
  supply: {name: "Supply Drop", deploy: "Hammer and Anvil (short edges, 18\" deep)", src: "Adapted from the classic Supply Drop", vp: true, rounds: 5,
    zones: ["0,0 18,0 18,44 0,44", "42,0 60,0 60,44 42,44"],
    objs: [O("C",30,22,"c","Centre"), O("RH",9,22,"h0","Red home"), O("GH",51,22,"h1","Green home"), O("N",30,8,"n","North"), O("S",30,36,"n","South")],
    score: ["C","N","S"],
    brief: ["Only the three objectives in no man's land score. Home objectives are just terrain markers.",
      "End of rounds 2 and 3: 5 VP each. After scoring round 3, one random supply objective is removed. Round 4: 8 VP each. After round 4 another is removed. Round 5: the last one is worth 15 VP.",
      "Control = more models within 4\" of the centre. 5 rounds, most VP wins."]},
  scorched: {name: "Scorched Earth", deploy: "Crucible of Battle (diagonal short-edge zones)", src: "Adapted from the classic Scorched Earth", vp: true, rounds: 5,
    zones: ["0,8 0,44 30,44", "30,0 60,0 60,36"],
    objs: [O("C",30,22,"c","Centre"), O("RH",8,36,"h0","Red home"), O("GH",52,8,"h1","Green home"), O("NW",16,12,"n","North-west"), O("SE",44,32,"n","South-east")],
    brief: ["End of each battle round from round 2: 3 VP for each objective you control (more models within 4\").",
      "Burn: from round 2, in a unit's End step, if it made no attacks this turn, is within 4\" of an objective outside your own deployment zone and outnumbers the enemy models within 4\", it can burn that objective. +5 VP, or +10 VP for the enemy home objective. The objective is removed.",
      "5 rounds, most VP wins."]}
};
const DETAILS = {
  vault: {
    setup: ["Deployment zones are triangles in opposite corners: 24\" along the short edge and 24\" along the long edge. Red takes the bottom-left corner, Green the top-right.",
      "Place 7 markers. Three vaults run corner to corner across the middle: one in the centre, one 16\" from the left edge and 8\" from the top, one 16\" from the right edge and 8\" from the bottom.",
      "Each zone's diagonal edge has two forges, 8\" in from each end. The forges in Green's zone belong to Red, and the forges in Red's zone belong to Green.",
      "Every unit starts in reserves and deploys when it is first activated."],
    scoring: ["There are no VP. Progress is counted in relics.",
      "Vault: after your active unit's End step, if it is within 4\" of a vault and has more models than all enemy units within 4\" of it combined, capture it. Roll 2D6. Pick a relic from your army's relic table that matches either die and give it to any of your units on the battlefield. Doubles make the capturing unit ready again.",
      "A unit holds one relic at a time. Giving it a new one replaces the old one, and only one of your units can hold a given relic.",
      "Forge: after its End step, a unit with a relic that is within 4\" of one of your forges and outnumbers the enemy there reforges the relic. The unit becomes ready again."],
    special: ["Each forge can only be captured once per battle round.",
      "A unit that was in reserves at any point this round can't capture a forge.",
      "If your opponent still has ready units and you have none, after each of their turns you may capture a vault with one of your units within 4\".",
      "Reforged: each successful hit roll for that unit causes an extra hit."],
    win: ["You win the moment three different units of yours with reforged relics are on the battlefield.", "You also win if the enemy army is wiped out or your opponent surrenders. There is no round limit."],
    tips: ["Model count matters more than toughness here. Big cheap squads make the best capturers.", "Kill relic carriers before they reach a forge. A relic that isn't reforged yet is lost when its unit dies."]},
  hold: {
    setup: ["Deployment zones run the full length of each long edge, 12\" deep. Red takes the bottom edge, Green the top. The middle 20\" is no man's land.",
      "Place 5 objectives: one in the centre; one home objective in each zone, 6\" from your edge and halfway along it; one 10\" in from each short edge on the centre line.",
      "Every unit starts in reserves."],
    scoring: ["At the end of each battle round, from round 2 onwards, check every objective.",
      "A side controls an objective if it has more models within 4\" of its centre than the other side. Equal numbers, or nobody there, means nobody controls it.",
      "Score 3 VP for each objective you control, up to 15 VP a round."],
    special: ["There are no special actions. Just hold ground.", "Round 1 never scores, so you can deploy without worrying about objectives yet."],
    win: ["After scoring round 5, the side with most VP wins. Equal VP is a draw.", "Wiping out the enemy army wins at once."],
    tips: ["Holding three of five each round usually wins.", "Your home objective is easy points, but every model there isn't fighting for the centre."]},
  purge: {
    setup: ["Split the table into quarters. Red deploys in the bottom-left quarter, Green in the top-right. Nobody may deploy within 9\" of the centre.",
      "Place 5 objectives: one in the centre; one home objective in the middle of each deployment quarter; one in the middle of each empty quarter.",
      "Every unit starts in reserves."],
    scoring: ["End of every battle round, including round 1: 4 VP if you destroyed at least one enemy unit that round, plus 4 VP more if you destroyed more units than your opponent did.",
      "From round 2: 4 VP if you control at least one objective, plus 4 VP more if you control more objectives than your opponent.",
      "Control = more models within 4\" of the objective's centre. Up to 16 VP a round."],
    special: ["Mark destroyed units in the app straight away: open the unit and tap Destroyed. The app counts kills for the round automatically."],
    win: ["After scoring round 5, the side with most VP wins. Equal VP is a draw.", "Wiping out the enemy army wins at once."],
    tips: ["Even one kill per round is worth 4 VP. Look for an easy target every round.", "Units that only just survive deny your opponent kill points."]},
  supply: {
    setup: ["Deployment zones run along each short edge, 18\" deep. Red takes the left edge, Green the right. No man's land is 24\" wide.",
      "Place 5 markers: centre; North and South on the centre line, 8\" from each long edge; one home marker in the middle of each zone.",
      "Only Centre, North and South are supply objectives. Home markers don't score.",
      "Every unit starts in reserves."],
    scoring: ["At the end of each battle round from round 2, score each supply objective you control (more models within 4\").",
      "Rounds 2 and 3: 5 VP each. Round 4: 8 VP each. Round 5: 15 VP for the last one."],
    special: ["After scoring round 3, the app removes one supply objective at random. After scoring round 4, it removes another, leaving one. Take the marker off the table when the app tells you."],
    win: ["After scoring round 5, the side with most VP wins. Equal VP is a draw.", "Wiping out the enemy army wins at once."],
    tips: ["The last objective is worth 15 VP, so keep reserves close to all three until you know which one survives.", "Fast units are valuable in rounds 4 and 5."]},
  scorched: {
    setup: ["Deployment zones are large triangles on opposite short edges. Red's zone is the bottom-left: the whole left edge from 8\" below the top corner, and the bottom edge out to 30\". Green's zone mirrors it top-right.",
      "Place 5 objectives: centre; one home objective deep in each zone; one in each of the two empty corners of no man's land.",
      "Every unit starts in reserves."],
    scoring: ["At the end of each battle round from round 2: 3 VP for each objective you control (more models within 4\").",
      "Burning scores straight away: +5 VP for a no-man's-land objective or the centre, +10 VP for the enemy's home objective."],
    special: ["Burn: from round 2, in a unit's End step, if it made no attacks this turn, is within 4\" of an objective outside your own deployment zone and has more models than the enemy within 4\" of it, it can burn the objective. Use the Burn button in the End step.",
      "A burned objective is removed for the rest of the battle. Nobody can score it after that.",
      "Each unit can burn at most one objective per activation."],
    win: ["After scoring round 5, the side with most VP wins. Equal VP is a draw.", "Wiping out the enemy army wins at once."],
    tips: ["Burning the enemy home objective is a 10 VP swing, and it also removes their safe points.", "A unit that burns gives up its attacks, so send units that don't hit hard anyway."]}
};
const DSEC = [["setup","Setup"],["scoring","Scoring"],["special","Special rules"],["win","How to win"],["tips","Tips"]];
function missionDetails(k, openKeys){
  const d = DETAILS[k];
  return DSEC.map(([s, t]) => `<details class="dsec" ${openKeys.includes(s) ? "open" : ""}><summary>${t}</summary><ul class="brief">${d[s].map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>`).join("");
}
const M = () => MISSIONS[G.mission] || MISSIONS.vault;
const liveObjs = () => M().objs.filter(o => !G.gone[o.id]);
const scoringObjs = () => liveObjs().filter(o => !M().score || M().score.includes(o.id));
const winText = () => G.winner === -1 ? "Draw" : SIDES[G.winner] + " wins";

/* ---------- state ---------- */
function mkUnits(side, n){ return Array.from({length: n}, (_, i) => ({id: side + "-" + (i + 1), side, n: i + 1, status: "reserves", ready: false, supp: 0, stuck: false, engaged: false, veh: false, relic: null, resRound: 0})); }
function freshGame(r, g, m){
  return {v: 2, sample: false, vp: [0, 0], mission: m || "vault", gone: {}, scored: {}, units: [...mkUnits(0, r), ...mkUnits(1, g)], round: 0, started: false, init: null, turn: 0,
    act: null, forges: {0: [0, 0], 1: [0, 0]}, winner: null, log: []};
}
let G, HIST = [];
const UI = {tab: "battle", sheet: null, uid: null, dice: {n: 10, need: 3, rr: "none", res: null, S: 4, T: 4}, setup: {r: 6, g: 6, m: "vault"}, ctl: {}, fx: null, q: 1, rv: 4, confirm: null, cap: null};
function load(){ try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.g && o.g.v === 2 && !o.g.sample){ G = o.g; HIST = o.h || []; return true; } } catch (e) {} G = freshGame(6, 6); HIST = []; return false; }
function save(){ try { localStorage.setItem(KEY, JSON.stringify({g: G, h: HIST.slice(-40)})); } catch (e) {} }
function commit(fn){ HIST.push(JSON.stringify(G)); if (HIST.length > 60) HIST.shift(); fn(); checkWin(); save(); render(); }
function undo(){ if (!HIST.length) return toast("Nothing to undo"); G = JSON.parse(HIST.pop()); UI.sheet = null; save(); render(); toast("Undone"); }
function log(t, s){ G.log.push({r: G.round, s: s ?? -1, t}); }
const U = id => G.units.find(u => u.id === id);
const nm = u => SIDES[u.side] + " " + u.n;
const ready = s => G.units.filter(u => u.side === s && u.ready && u.status !== "dead");
const reforgedCount = s => G.units.filter(u => u.side === s && u.status === "field" && u.relic && u.relic.ref).length;

/* ---------- rules logic ---------- */
function startRound(){ if (M().vp && G.round >= M().rounds) return toast("The battle is over"); if (needsScoring()) return toast("Score this round first"); commit(roundBody); }
function roundBody(){
  {
    G.round++; let a, b, ties = 0;
    do { a = sum(rollN(2)); b = sum(rollN(2)); if (a === b) ties++; } while (a === b);
    G.init = [a, b]; G.turn = a > b ? 0 : 1; G.started = true;
    G.units.forEach(u => { if (u.status === "dead") return; u.ready = true; u.stuck = !!u.engaged && u.status === "field"; if (u.status === "reserves") u.resRound = G.round; });
    log(`Round ${G.round}: ${SIDES[G.turn]} won initiative ${Math.max(a, b)}–${Math.min(a, b)}${ties ? " after " + ties + " tie" + (ties > 1 ? "s" : "") : ""}.`, G.turn);
    const st = G.units.filter(u => u.stuck).map(nm); if (st.length) log(`Stuck In this round: ${st.join(", ")}.`);
    if (!ready(G.turn).length) G.turn = 1 - G.turn;
  }
}
function setCount(side, n){
  const us = G.units.filter(u => u.side === side);
  if (n > us.length){
    for (let i = us.length + 1; i <= n; i++) G.units.push({id: side + "-" + i + "-" + Date.now().toString(36), side, n: i, status: "reserves", ready: G.started, supp: 0, stuck: false, engaged: false, veh: false, relic: null, resRound: G.round});
    log(`${SIDES[side]} now has ${n} units.`, side);
  } else if (n < us.length){
    const last = us[us.length - 1];
    if (G.act && G.act.id === last.id) return toast("Finish that unit's activation first");
    G.units = G.units.filter(u => u.id !== last.id);
    log(`${SIDES[side]} ${last.n} removed. ${SIDES[side]} now has ${n} units.`, side);
    if (G.started && !G.act && !ready(G.turn).length) nextTurn();
  }
}
function nextTurn(){
  const c = G.turn, o = 1 - c;
  if (ready(o).length) G.turn = o; else if (ready(c).length) G.turn = c;
  else { G.started = false; log(`Round ${G.round} ends.`); }
}
function checkWin(){
  if (G.winner != null) return;
  if (G.mission === "vault") for (const s of [0, 1]) if (reforgedCount(s) >= 3){ G.winner = s; log(`${SIDES[s]} has three units with reforged relics and wins!`, s); return; }
  for (const s of [0, 1]){ const us = G.units.filter(u => u.side === s); if (us.length && us.every(u => u.status === "dead")){ G.winner = 1 - s; log(`${SIDES[s]} is wiped out. ${SIDES[1 - s]} wins!`, 1 - s); return; } }
}
function makeReady(u, why){ u.ready = true; if (G.act && G.act.id === u.id) G.act.again = true; log(`${nm(u)} becomes ready again (${why}).`, u.side); }

/* ---------- toast & wake lock ---------- */
let tt; function toast(m){ const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2200); }
let wake = null; async function keepAwake(){ try { if ("wakeLock" in navigator && !wake){ wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => wake = null); } } catch (e) {} }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && UI.awake) keepAwake(); });

/* ---------- render: top + tabs ---------- */
const ICON = {
  battle: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/></svg>',
  mission: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  rules: '<svg viewBox="0 0 24 24"><path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1z M12 6v14"/></svg>'
};
function renderTop(){
  const r = UI.tab === "battle" ? "" : (G.round ? `R${G.round}` : "");
  const dark = curTheme() === "dark";
  $("#top").innerHTML = `<span class="brand">Auspex</span><span class="rnd">${r}</span>
    <button class="icon-btn" data-a="theme" aria-label="Switch to ${dark ? "light" : "dark"} mode" title="Switch to ${dark ? "light" : "dark"} mode">${dark ? "☀" : "☾"}</button>
    <button class="icon-btn" data-a="undo" ${HIST.length ? "" : "disabled"} aria-label="Undo">↶</button>
    <button class="icon-btn" data-a="openSetup">New</button>`;
  $("#tabs").innerHTML = [["battle","Battle"],["dice","Dice"],["mission","Mission"],["rules","Rules"]].map(([k, l]) => `<button class="tab" data-a="tab" data-v="${k}" ${UI.tab === k ? 'aria-current="page"' : ""}>${ICON[k]}${l}</button>`).join("");
}

/* ---------- render: battle ---------- */
function tile(u){
  const can = G.started && !G.act && u.ready && u.status !== "dead" && u.side === G.turn && G.winner == null;
  const done = G.started && !u.ready && u.status !== "dead";
  const isAct = G.act && G.act.id === u.id;
  const st = u.status === "dead" ? "Dead" : isAct ? "Active" : u.status === "reserves" ? "Reserve" : G.started ? (u.ready ? "Ready" : "Done") : "";
  const cls = ["tile", "s" + u.side, can ? "can" : "", done ? "done" : "", u.status === "reserves" && !can ? "res" : "", u.status === "dead" ? "dead" : "", isAct ? "active" : ""].join(" ");
  const left = u.supp ? `<span class="mk w">S${u.supp}</span>` : u.stuck ? `<span class="mk">SI</span>` : "<span></span>";
  const right = u.relic ? `<span class="mk ${u.relic.ref ? "af" : "a"}">${u.relic.ref ? "◆" : "◇"}${u.relic.d}</span>` : "<span></span>";
  return `<button class="${cls}" data-a="unit" data-id="${u.id}" aria-label="${nm(u)} ${st}"><span class="marks">${left}${right}</span><span class="n">${u.n}</span><span class="st">${st}</span></button>`;
}
function sideBlock(s){
  const us = G.units.filter(u => u.side === s);
  return `<section class="side side-${s}"><div class="side-head s${s}"><h2>${SIDES[s]}</h2><span class="muted num">${ready(s).length} ready · ${reforgedCount(s)}/3 reforged</span></div>
    <div class="tiles">${us.map(tile).join("")}</div></section>`;
}
const kills = s => G.units.filter(u => u.side === 1 - s && u.status === "dead").length;
const roundKills = s => G.units.filter(u => u.side === 1 - s && u.status === "dead" && u.deadRound === G.round).length;
const needsScoring = () => M().vp && G.round > 0 && !G.scored[G.round] && G.winner == null;
function computeScore(){
  const m = G.mission, r = G.round, ctl = UI.ctl, vp = [0, 0];
  const objs = r >= 2 ? scoringObjs() : [];
  const held = [0, 1].map(s => objs.filter(o => ctl[o.id] === s).length);
  const k = [0, 1].map(roundKills);
  if (m === "hold" || m === "scorched") [0, 1].forEach(s => vp[s] += 3 * held[s]);
  if (m === "supply"){ const val = r <= 3 ? 5 : r === 4 ? 8 : 15; [0, 1].forEach(s => vp[s] += val * held[s]); }
  if (m === "purge") [0, 1].forEach(s => { if (k[s] > 0) vp[s] += 4; if (k[s] > k[1 - s]) vp[s] += 4; if (r >= 2){ if (held[s] > 0) vp[s] += 4; if (held[s] > held[1 - s]) vp[s] += 4; } });
  return {vp, held, k, objs};
}
function scoringCard(){
  const r = G.round, S = computeScore(), m = M();
  const rows = S.objs.map(o => `<div class="ctlrow"><span class="lab">${esc(o.label)} <span class="muted">${o.id}</span></span><div class="seg ctl">${[[null, "None"], [0, "Red"], [1, "Green"]].map(([v, l]) => `<button data-a="ctl" data-id="${o.id}" data-v="${v === null ? "" : v}" class="${(UI.ctl[o.id] ?? null) === v ? "on" + (v === 0 ? " r" : v === 1 ? " g" : "") : ""}">${l}</button>`).join("")}</div></div>`).join("");
  return `<div class="banner"><span class="big">Score round ${r}</span>
    ${S.objs.length ? `<p>Who controls each objective? A side controls it with more models within 4" of its centre.</p>${rows}` : `<p>${r < 2 ? "Objectives don't score in round 1." : "No objectives left to score."}</p>`}
    ${G.mission === "purge" ? `<p>Units destroyed this round: Red destroyed ${S.k[0]}, Green destroyed ${S.k[1]}.</p>` : ""}
    <div class="two"><div class="fig"><b style="color:var(--red)">+${S.vp[0]}</b><span>Red VP</span></div><div class="fig"><b style="color:var(--green)">+${S.vp[1]}</b><span>Green VP</span></div></div>
    <button class="btn primary block" data-a="scoreRound">${r >= m.rounds ? "Score and end the battle" : `Score round ${r}`}</button></div>`;
}
function mapSVG(key){
  const live = !key || key === G.mission;
  const m = key ? MISSIONS[key] : M();
  const col = t => t === "forge0" || t === "h0" ? "var(--red)" : t === "forge1" || t === "h1" ? "var(--green)" : "var(--accent)";
  const objs = m.objs.map(o => { const gone = live && G.gone[o.id]; const c = gone ? "var(--muted)" : col(o.t); const scores = !m.score || m.score.includes(o.id);
    return `<g opacity="${gone ? .45 : 1}"><circle cx="${o.x}" cy="${o.y}" r="4" fill="none" stroke="${c}" stroke-width=".3" stroke-dasharray="1 .8"/>
      <circle cx="${o.x}" cy="${o.y}" r="${scores ? 1.5 : 1}" fill="${c}"/>${gone ? `<path d="M${o.x - 1.6} ${o.y - 1.6}L${o.x + 1.6} ${o.y + 1.6}M${o.x + 1.6} ${o.y - 1.6}L${o.x - 1.6} ${o.y + 1.6}" stroke="var(--fg)" stroke-width=".5"/>` : ""}
      <text x="${o.x}" y="${o.y - 4.8}" font-size="2.3" text-anchor="middle" fill="var(--fg)">${o.id}</text></g>`; }).join("");
  return `<svg class="map" viewBox="-1 -1 62 46" role="img" aria-label="${esc(m.name)} battlefield, 60 by 44 inches">
    <rect x="0" y="0" width="60" height="44" fill="var(--surface)" stroke="var(--line)" stroke-width=".3"/>
    <polygon points="${m.zones[0]}" fill="var(--red-soft)" stroke="var(--red)" stroke-width=".3"/>
    <polygon points="${m.zones[1]}" fill="var(--green-soft)" stroke="var(--green)" stroke-width=".3"/>
    ${m.hole ? `<circle cx="30" cy="22" r="9" fill="var(--surface)" stroke="var(--line)" stroke-width=".3" stroke-dasharray="1 1"/>` : ""}
    ${objs}</svg>`;
}
function scoreboard(){
  const alive = G.units.filter(u => u.status !== "dead");
  const done = G.started ? alive.filter(u => !u.ready).length : (G.round ? alive.length : 0);
  const pct = alive.length ? Math.round(done / alive.length * 100) : 0;
  const state = G.winner != null ? winText() : !G.round ? "Not started" : G.started ? `${SIDES[G.turn]} to activate` : `Round ${G.round} complete`;
  const init = G.init && G.round ? `${SIDES[G.init[0] > G.init[1] ? 0 : 1]} won initiative ${Math.max(...G.init)}–${Math.min(...G.init)}` : "Roll initiative to begin";
  const side = s => `<div class="sb-side s${s}"><span class="sb-name">${SIDES[s]}</span>
    <span class="sb-vp num">${G.vp[s]}</span><span class="sb-lab">VP</span>
    <span class="stepper sm"><button data-a="vp" data-s="${s}" data-d="-1" aria-label="${SIDES[s]} VP down">−</button><button data-a="vp" data-s="${s}" data-d="1" aria-label="${SIDES[s]} VP up">+</button></span>
    <span class="sb-ref">${M().vp ? `${kills(1 - s)} enemy units destroyed` : `◆ ${reforgedCount(s)}/3 reforged`}</span></div>`;
  return `<section class="scoreboard" aria-label="Round and score">
    <div class="sb-round"><span class="sb-lab">Round</span><span class="sb-rnum num">${G.round || "–"}</span>${M().rounds ? `<span class="sb-lab">of ${M().rounds}</span>` : ""}</div>
    <div class="sb-state ${G.started ? "s" + G.turn : ""}">${state}</div>
    <div class="sb-prog"><div class="bar"><i style="width:${pct}%"></i></div><span class="muted num">${G.round ? `${done}/${alive.length} activated` : ""}</span></div>
    <div class="sb-init muted"><button class="linkish" data-a="tab" data-v="mission">${esc(M().name)}</button> · ${init}</div>
    <div class="sb-sides">${side(0)}${side(1)}</div>
  </section>`;
}
const DESK = "(min-width: 1100px) and (min-aspect-ratio: 3/2)";
const isDesk = () => matchMedia(DESK).matches;
function renderBattle(){
  let h = scoreboard() + `<div class="bcol bcol-top">`;
  if (G.winner != null) h += `<div class="banner win"><span class="big">${winText()}</span>${M().vp ? `<p>Final score: Red ${G.vp[0]} – Green ${G.vp[1]} VP.</p>` : ""}<button class="btn primary block" data-a="openSetup">New game</button></div>`;
  else if (G.act){ const u = U(G.act.id); h += `<div class="banner s${u.side}"><span class="big">${nm(u)}</span><p>Activation in progress.</p><button class="btn ${u.side ? "green" : "red"} block" data-a="resume">Continue</button></div>`; }
  else if (!G.started && needsScoring()){
    h += scoringCard();
  } else if (!G.started){
    h += `<div class="banner"><span class="big">Round ${G.round + 1}</span><p>${G.round ? "Units marked as engaged get Stuck In when you roll." : "All units start in reserves and deploy when they activate."}</p><button class="btn primary block" data-a="startRound">Ready all units &amp; roll initiative</button></div>`;
  } else {
    const s = G.turn, alone = !ready(1 - s).length;
    h += `<div class="banner s${s}"><p>Tap a highlighted ${SIDES[s]} unit to activate it.${alone && ready(s).length > 1 ? ` ${SIDES[1 - s]} is out of ready units, so ${SIDES[s]} goes again.` : ""}</p></div>`;
  }
  h += `</div>`;
  const first = G.started ? G.turn : 0;
  h += sideBlock(first) + sideBlock(1 - first);
  h += `<div class="bcol bcol-bot">`;
  const cnt = s => G.units.filter(u => u.side === s).length;
  h += `<div class="card"><h3>Units per side</h3>
    <div class="field"><span class="lab" style="color:var(--red)">Red</span>${stepper("cnt0", cnt(0), "red units")}</div>
    <div class="field"><span class="lab" style="color:var(--green)">Green</span>${stepper("cnt1", cnt(1), "green units")}</div>
    <p class="muted" style="margin:0;font-size:.9rem">Adding puts a new unit in reserves. Removing takes away the highest number.</p></div>`;
  if (G.started && !G.act && G.winner == null) h += `<button class="btn block" data-a="askRound">${M().vp ? "End this round" : "New round: ready all units"}</button>`;
  h += `<details class="card logcard" ${isDesk() ? "open" : ""}><summary>Battle log</summary><div class="log">${G.log.slice().reverse().slice(0, 80).map(e => `<div class="s${e.s}"><span class="r num">R${e.r}</span><span>${esc(e.t)}</span></div>`).join("") || '<p class="muted">Nothing yet.</p>'}</div></details></div>`;
  return h;
}

/* ---------- render: dice ---------- */
function woundNeed(S, T){ const d = S - T; return d >= 2 ? 2 : d === 1 ? 3 : d === 0 ? 4 : d === -1 ? 5 : 6; }
function stepper(a, v, label){ return `<span class="stepper"><button data-a="${a}" data-d="-1" aria-label="${label} down">−</button><span class="num">${v}</span><button data-a="${a}" data-d="1" aria-label="${label} up">+</button></span>`; }
function diceTool(){
  const D = UI.dice;
  let h = `<div class="card">
    <div class="field"><span class="lab">Dice</span>${stepper("dN", D.n, "dice")}</div>
    <div class="field"><span class="lab">Success on</span>${stepper("dNeed", D.need + "+", "target")}</div>
    <div><div class="eyebrow" style="margin-bottom:6px">Re-roll</div><div class="seg">${[["none","None"],["ones","1s"],["fails","Fails"]].map(([k, l]) => `<button data-a="dRR" data-v="${k}" class="${D.rr === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
    <button class="btn primary block" data-a="dRoll">Roll ${D.n} dice</button>`;
  if (D.res){
    const r = D.res;
    h += `<div class="dice">${r.dice.map(d => `<span class="die ${d.v === 6 ? "six" : d.ok ? "ok" : "no"} ${d.rr ? "rr" : ""}">${d.v}</span>`).join("")}</div>
      <div class="figs"><div class="fig"><b class="num">${r.ok}</b><span>successes (${r.need}+)</span></div><div class="fig"><b class="num">${r.sixes}</b><span>sixes</span></div></div>
      ${r.ok ? `<button class="btn block" data-a="dChain">Roll the ${r.ok} successes next</button>` : ""}`;
  }
  return h + `</div>`;
}
function renderDice(){
  const D = UI.dice; const w = woundNeed(D.S, D.T);
  return `<div class="card"><h3>Wound roll needed</h3>
    <div class="field"><span class="lab">Strength</span>${stepper("dS", D.S, "strength")}</div>
    <div class="field"><span class="lab">Toughness</span>${stepper("dT", D.T, "toughness")}</div>
    <div class="two"><div class="fig"><b>${w}+</b><span>to wound</span></div><button class="btn" data-a="dUseW">Use ${w}+</button></div>
    <p class="muted" style="margin:0;font-size:.9rem">In cover the wound roll is 1 worse (${Math.min(7, w + 1)}+). Pierce makes S 7 when T ≤ S.</p></div>
    <div class="card"><h3>Roll dice</h3><p class="muted" style="margin:0;font-size:.92rem">For hits, wounds, saves, Resolve or Resilient: set the dice and the target, then roll. Sixes are highlighted for Critical Hits and Critical Wounds.</p></div>
    ${diceTool()}`;
}

/* ---------- render: mission ---------- */
function renderMission(){
  const m = M();
  let h = `<div class="card"><span class="eyebrow">Current mission · ${esc(m.src)}</span><h3 style="font-size:1.7rem">${esc(m.name)}</h3><p class="muted" style="margin:0">Deployment: ${esc(m.deploy)}${m.vp ? ` · ${m.rounds} rounds` : " · no round limit"}</p>
    ${mapSVG()}
    <p class="muted" style="margin:0;font-size:.88rem">Red deploys in the red zone, Green in the green zone. Dashed rings show the 4" objective range. Positions are approximate: set them up by eye.</p>
    ${missionDetails(G.mission, ["scoring"])}</div>`;
  const others = `<div class="card"><h3>All missions</h3><p class="muted" style="margin:0;font-size:.92rem">Read up on another mission. To play one, start a new game and pick it.</p>
    ${Object.entries(MISSIONS).filter(([k]) => k !== G.mission).map(([k, x]) => `<details class="dsec other"><summary>${esc(x.name)}<small>${esc(x.deploy)}</small></summary>${mapSVG(k)}${missionDetails(k, [])}</details>`).join("")}
    <button class="btn" data-a="openSetup">New game with another mission</button></div>`;
  if (m.vp){
    h += `<div class="card"><h3>Score</h3><div class="two"><div class="fig"><b style="color:var(--red)">${G.vp[0]}</b><span>Red VP</span></div><div class="fig"><b style="color:var(--green)">${G.vp[1]}</b><span>Green VP</span></div></div>
      <p class="muted" style="margin:0;font-size:.9rem">Rounds scored: ${Object.keys(G.scored).sort().join(", ") || "none yet"}. ${Object.keys(G.gone).length ? "Removed: " + Object.keys(G.gone).join(", ") + "." : ""}</p></div>`;
    return h + others;
  }
  const side = s => {
    const held = G.units.filter(u => u.side === s && u.relic);
    return `<div class="card"><div class="side-head s${s}"><h2>${SIDES[s]}</h2><span class="muted num">${reforgedCount(s)}/3 reforged</span></div>
      ${held.length ? held.map(u => `<div class="field"><span class="lab">${nm(u)}<small>Relic ${u.relic.d}${u.relic.ref ? " · reforged" : ""}${u.status === "dead" ? " · destroyed" : ""}</small></span><span class="mk ${u.relic.ref ? "af" : "a"}" style="font-size:1rem">${u.relic.ref ? "◆" : "◇"}${u.relic.d}</span></div>`).join("") : '<p class="muted" style="margin:0">No relics yet.</p>'}
      <p class="muted" style="margin:0;font-size:.9rem">Forges used this round: ${[0, 1].map(i => `F${i + 1} ${G.forges[s][i] === G.round && G.round ? "✓" : "–"}`).join(" · ")}</p></div>`;
  };
  return h + `<p class="muted" style="margin:0;font-size:.92rem">Captures happen in a unit's End step. Open the unit and tap <b>Capture vault</b> or <b>Capture forge</b>.</p>
    ${side(0)}${side(1)}${others}`;
}

/* ---------- render: rules ---------- */
function renderRules(){
  const wt = []; for (let T = 1; T <= 6; T++){ wt.push(`<tr><th>T${T}</th>${[1,2,3,4,5,6,7].map(S => `<td>${woundNeed(S, T)}+</td>`).join("")}</tr>`); }
  const R = (t, b, o) => `<details class="card" ${o ? "open" : ""}><summary>${t}</summary><div class="rb">${b}</div></details>`;
  return R("Battle round", `<ul><li>Every unit starts in reserves and deploys (wholly in your zone) when activated.</li><li>Start of round: all units become ready, both sides roll 2D6 for initiative, ties re-roll.</li><li>Sides alternate activating one ready unit each. If one side runs out, the other activates the rest back to back.</li><li>The round ends when nothing is ready. There is no round limit.</li></ul>`, true) +
  R("A turn", `<ol><li><b>Select</b> a ready unit (it's no longer ready).</li><li><b>Move</b>: roll 2D6. Advance up to roll + 6". If engaged: Reposition up to the roll, or Pile In. Ending within 4" of an enemy lets you Pile In 4".</li><li><b>Attacks</b>: one target per weapon. Used a melee weapon? You may Pile In afterwards.</li><li><b>End</b>: resolve end-step rules and captures.</li></ol>`) +
  R("Ranges and Too Close", `<div class="tbl"><table><tr><th>Type</th><th>Range</th><th>Too Close</th></tr><tr><td>Melee</td><td>1" (2" if the target touches a friend)</td><td>–</td></tr><tr><td>CQ</td><td>8"</td><td>–</td></tr><tr><td>Assault</td><td>16"</td><td>within roll"</td></tr><tr><td>Heavy</td><td>24"</td><td>within roll + 6"</td></tr><tr><td>Velocity</td><td>32"</td><td>within roll + 12"</td></tr></table></div><p>Too Close is checked once, right after the Move Roll and before moving.</p><p><b>Stuck In</b>: units with melee weapons engaged at initiative get +1 hit per melee hit this round. Lost if they Advance or Reposition.</p>`) +
  R("Attacks", `<ol><li>Hit: D6 ≥ WS.</li><li>Wound: S vs T (table below). Cover: −1 to the wound roll.</li><li>Save: D6 ≥ Sv, never modified. Damaged models take wounds first; leaders last.</li><li>Damage: lose D Health; excess is lost.</li></ol><div class="tbl"><table><tr><th></th>${[1,2,3,4,5,6,7].map(s => `<th>S${s}</th>`).join("")}</tr>${wt.join("")}</table></div><p>Dice order: re-rolls → discards → dice-result effects (crits) → modifiers → result.</p><p>Resilient X+: after a failed save, roll D6; on X+ the attack fails. Shock Wound: skips to the save, Damage 1.</p>`) +
  R("Suppression", `<ul><li>Suppression X: make X Resolve tests (D6 ≥ Rv). Each failure adds 1 to Suppressed (max 6).</li><li>Suppressed X: Move Rolls −X (min 1).</li><li>Infantry: X non-leader models can't attack. It clears after the unit's End step.</li><li>Vehicle/Monster: skip Attacks to clear it, or after Attacks take 2×X Shock Wounds and clear it.</li></ul>`) +
  R("Vault Breaker", `<ul><li>Within 4" of an objective's centre: your active unit is capturing; every unit is defending.</li><li>Vault: after your End step, if your active unit has more models than all enemy defenders, roll 2D6. Doubles: the unit is ready again. Take a relic matching either die and give it to one of your units.</li><li>Forge (your two forges are nearest the enemy zone): a unit with a relic that outnumbers the defenders reforges it. Each forge once per round, and not by units that were in reserves this round. The unit becomes ready again.</li><li>Reforged: +1 hit for every successful hit. Three reforged units on the battlefield wins.</li></ul>`) +
  R("Transports", `<ul><li>After deploying a transport, embark one infantry unit from reserves.</li><li>Passengers disembark at the start of their own Move step, wholly within 4".</li><li>Transport destroyed: passengers disembark and roll D6: 1–2 not ready + Suppressed 6, 3–4 Suppressed 6, 5–6 no effect.</li></ul>`);
}

/* ---------- sheets ---------- */
function shell(title, side, body, foot, steps){
  return `<div class="wrap" data-a="bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sh-head ${side != null ? "s" + side : ""}"><h2>${esc(title)}</h2><button class="x" data-a="close" aria-label="Close">×</button></div>
    ${steps || ""}<div class="sh-body">${body}</div>${foot ? `<div class="sh-foot">${foot}</div>` : ""}</div></div>`;
}
function unitSheet(){
  const u = U(UI.uid); if (!u) return "";
  const can = G.started && !G.act && u.ready && u.status !== "dead" && u.side === G.turn && G.winner == null;
  const b = `<div class="seg">${[["field","On table"],["reserves","Reserves"],["dead","Destroyed"]].map(([k, l]) => `<button data-a="uStatus" data-v="${k}" class="${u.status === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="card">
      <div class="field"><span class="lab">Suppressed</span>${stepper("uSupp", u.supp, "suppressed")}</div>
      <label class="toggle">In engagement range<input type="checkbox" id="u-eng" data-t="engaged" ${u.engaged ? "checked" : ""}></label>
      <label class="toggle">Stuck In<input type="checkbox" id="u-stuck" data-t="stuck" ${u.stuck ? "checked" : ""}></label>
      <label class="toggle">Vehicle or monster<input type="checkbox" id="u-veh" data-t="veh" ${u.veh ? "checked" : ""}></label>
    </div>
    <div class="card"><h3>Take Suppression</h3>
      <div class="field"><span class="lab">Amount</span>${stepper("uQ", UI.q, "amount")}</div>
      <div class="field"><span class="lab">Resolve (Rv)</span>${stepper("uRv", UI.rv + "+", "resolve")}</div>
      <button class="btn block" data-a="uResolve">Roll ${UI.q} Resolve test${UI.q > 1 ? "s" : ""}</button>
      ${UI.fx ? `<div class="dice">${UI.fx.dice.map(d => `<span class="die ${d.ok ? "ok" : "no"}">${d.v}</span>`).join("")}</div><p style="margin:0">${esc(UI.fx.t)}</p>` : ""}
    </div>
    ${G.mission !== "vault" ? "" : `<div class="card"><h3>Relic</h3>${u.relic ? `<p style="margin:0">Holding relic ${u.relic.d}${u.relic.ref ? ", reforged" : ""}.</p>` : '<p class="muted" style="margin:0">None.</p>'}
      <div class="two"><button class="btn" data-a="capOpen" data-v="vault" ${u.status === "field" ? "" : "disabled"}>Capture vault</button><button class="btn" data-a="capOpen" data-v="forge" ${u.relic && u.status === "field" && !u.relic.ref ? "" : "disabled"}>Capture forge</button></div>
      ${u.relic ? `<button class="btn quiet" data-a="uDropRelic">Remove relic</button>` : ""}</div>`}
    ${G.started && !u.ready && u.status !== "dead" ? `<button class="btn" data-a="uReady">Make ready again</button>` : ""}`;
  const foot = can ? `<button class="btn ${u.side ? "green" : "red"} block" data-a="activate">Activate ${nm(u)}</button>` : "";
  return shell(nm(u), u.side, b, foot);
}
function actSheet(){
  const A = G.act, u = U(A.id); const step = A.step;
  const si = ["move","attack","end"].indexOf(step);
  const steps = `<div class="steps">${["Move","Attack","End"].map((l, i) => `<span class="${i === si ? "cur" : i < si ? "past" : ""}">${l}</span>`).join("")}</div>`;
  let b = "", foot = "";
  if (step === "move"){
    if (u.status === "reserves" && !A.deployed){
      b += `<div class="card"><h3>Deploy from reserves</h3><p style="margin:0">Place it wholly in your deployment zone, outside enemy engagement range. Forward Deploy units roll 2D6 for extra distance.</p>
        <div class="two"><button class="btn primary" data-a="aDeploy">Deployed</button><button class="btn" data-a="aFwd">Forward Deploy</button></div>
        ${A.fwd ? `<p style="margin:0">Rolled <b>${A.fwd.join(" + ")} = ${sum(A.fwd)}"</b>: deploy wholly within ${sum(A.fwd)}" of your zone.</p>` : ""}
        <button class="btn quiet" data-a="aStay">Keep in reserves</button></div>`;
    } else {
      b += `<label class="toggle card" style="flex-direction:row">In engagement range of an enemy<input type="checkbox" id="a-eng" data-t="eng" ${A.eng ? "checked" : ""}></label>
        <div class="card"><div class="field"><span class="lab">Extra D6<small>from abilities</small></span>${stepper("aBonus", A.bonus || 0, "extra dice")}</div>
        ${u.supp ? `<p style="margin:0" class="muted">Suppressed ${u.supp}: −${u.supp} to the roll (min 1).</p>` : ""}
        <button class="btn primary block" data-a="aRoll">${A.mr ? "Roll again" : "Make Move Roll"}</button>
        ${A.mr ? `<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div class="dice">${A.mr.dice.map(v => `<span class="die big">${v}</span>`).join("")}</div><span class="huge num">${A.mr.t}"</span></div>` : ""}</div>`;
      if (A.mr){
        const R = A.mr.t;
        b += `<div class="figs">${A.eng ? `<div class="fig"><b>${R}"</b><span>Reposition max</span></div>` : `<div class="fig"><b>${R + 6}"</b><span>Advance max</span></div>`}<div class="fig"><b>4"</b><span>Pile In if within 4"</span></div></div>
          <div class="eyebrow">Too Close: enemies within can't be targeted by</div>
          <div class="figs3"><div class="fig tc"><b>${R}"</b><span>Assault</span></div><div class="fig tc"><b>${R + 6}"</b><span>Heavy</span></div><div class="fig tc"><b>${R + 12}"</b><span>Velocity</span></div></div>
          ${u.stuck ? `<label class="toggle card" style="flex-direction:row">Advanced or Repositioned (loses Stuck In)<input type="checkbox" id="a-moved" data-t="moved" ${A.moved ? "checked" : ""}></label>` : ""}
          ${u.veh && u.supp ? `<label class="toggle card" style="flex-direction:row">Skip attacks to clear Suppressed<input type="checkbox" id="a-skip" data-t="skip" ${A.skip ? "checked" : ""}></label>` : ""}`;
      }
    }
    foot = `<button class="btn primary block" data-a="aNext" data-v="${A.skip ? "end" : "attack"}" ${(u.status === "field" && A.mr) ? "" : "disabled"}>${A.skip ? "Next: End (skip attacks)" : "Next: Attack"}</button>`;
  }
  if (step === "attack"){
    if (u.supp && !u.veh) b += `<div class="card"><b>Suppressed ${u.supp}</b><span>${u.supp} non-leader model${u.supp > 1 ? "s" : ""} can't attack this turn.</span></div>`;
    if (u.stuck) b += `<p style="margin:0"><b>Stuck In:</b> each successful melee hit causes one extra hit.</p>`;
    if (u.relic && u.relic.ref) b += `<p style="margin:0"><b>Reforged:</b> each successful hit causes one extra hit.</p>`;
    b += diceTool();
    b += `<p class="muted" style="margin:0;font-size:.92rem">Used a melee weapon? The unit may Pile In 4" after attacking.</p>`;
    foot = `<button class="btn primary block" data-a="aNext" data-v="end">Next: End</button>`;
  }
  if (step === "end"){
    const notes = [];
    if (A.stay) notes.push("The unit stays in reserves.");
    if (u.supp && !u.veh) notes.push(`Suppressed ${u.supp} clears now.`);
    if (u.supp && u.veh && !A.skip) notes.push(`It attacked while Suppressed ${u.supp}: take ${2 * u.supp} Shock Wounds, then Suppressed clears.`);
    if (u.supp && u.veh && A.skip) notes.push("It skipped attacks, so Suppressed clears.");
    if (u.status === "field" && G.mission === "scorched" && G.round >= 2){
      const burnable = liveObjs().filter(o => o.t !== "h" + u.side);
      b += `<div class="card"><h3>Burn an objective</h3><p class="muted" style="margin:0;font-size:.9rem">Only if this unit made no attacks this turn, is within 4" of the objective and has more models than the enemy within 4".</p>
        <div class="two">${burnable.map(o => `<button class="btn" data-a="burn" data-id="${o.id}" ${A.burned ? "disabled" : ""}>Burn ${o.id} (+${o.t === "h" + (1 - u.side) ? 10 : 5})</button>`).join("")}</div></div>`;
    }
    if (u.status === "field" && G.mission !== "vault") b += `<label class="toggle card" style="flex-direction:row">Ended in engagement range<input type="checkbox" id="a-eng2" data-t="eng" ${A.eng ? "checked" : ""}></label>`;
    if (u.status === "field" && G.mission === "vault") b += `<div class="card"><h3>Captures</h3><div class="two"><button class="btn" data-a="capOpen" data-v="vault">Capture vault</button><button class="btn" data-a="capOpen" data-v="forge" ${u.relic && !u.relic.ref ? "" : "disabled"}>Capture forge</button></div>
      <p class="muted" style="margin:0;font-size:.9rem">Your unit must be within 4" and have more models than all enemy units within 4".</p></div>
      <label class="toggle card" style="flex-direction:row">Ended in engagement range<input type="checkbox" id="a-eng2" data-t="eng" ${A.eng ? "checked" : ""}></label>`;
    if (notes.length) b += `<div class="card">${notes.map(n => `<p style="margin:0">${n}</p>`).join("")}</div>`;
    foot = `<button class="btn ${u.side ? "green" : "red"} block" data-a="aDone">Finish ${nm(u)}'s turn</button>`;
  }
  foot += `<button class="btn quiet" data-a="aCancel">Cancel activation</button>`;
  return shell(nm(u), u.side, b, foot, steps);
}
function capSheet(){
  const C = UI.cap, u = U(C.id), s = u.side;
  let b = "", foot = "";
  if (C.kind === "vault"){
    if (!C.dice){
      b = `<p style="margin:0">Check: ${nm(u)} is within 4" of a vault and has more models than all enemy units within 4" of it combined.</p>`;
      foot = `<button class="btn primary block" data-a="capRoll">Capture and roll 2D6</button>`;
    } else {
      const dbl = C.dice[0] === C.dice[1];
      b = `<div class="dice">${C.dice.map(v => `<span class="die big">${v}</span>`).join("")}</div>
        ${dbl ? `<p style="margin:0"><b>Doubles:</b> ${nm(u)} becomes ready again.</p>` : ""}
        <div class="eyebrow">Choose a relic</div><div class="two">${[...new Set(C.dice)].map(v => `<button class="btn ${C.relic === v ? "on" : ""}" data-a="capPick" data-v="${v}">Relic ${v}</button>`).join("")}</div>
        <div class="eyebrow">Give it to</div><div class="tiles">${G.units.filter(x => x.side === s && x.status === "field").map(x => `<button class="tile s${s} ${C.to === x.id ? "can" : ""}" data-a="capTo" data-id="${x.id}"><span class="n">${x.n}</span><span class="st">${x.relic ? "has " + x.relic.d : ""}</span></button>`).join("")}</div>`;
      foot = `<button class="btn primary block" data-a="capGive" ${C.relic ? "" : "disabled"}>Give relic ${C.relic || ""} to ${nm(U(C.to))}</button>`;
    }
  } else {
    const fr = G.forges[s];
    const blocked = u.resRound === G.round;
    b = `<p style="margin:0">Check: ${nm(u)} holds relic ${u.relic.d}, is within 4" of one of your forges and outnumbers the enemy units within 4".</p>
      ${blocked ? `<p style="margin:0"><b>Not allowed:</b> this unit was in reserves this round.</p>` : ""}
      <div class="eyebrow">Which forge?</div><div class="two">${[0, 1].map(i => `<button class="btn ${C.f === i ? "on" : ""}" data-a="capF" data-v="${i}" ${fr[i] === G.round ? "disabled" : ""}>Forge ${i + 1}${fr[i] === G.round ? " (used)" : ""}</button>`).join("")}</div>`;
    foot = `<button class="btn primary block" data-a="capForge" ${C.f == null || blocked ? "disabled" : ""}>Reforge relic ${u.relic.d}</button>`;
  }
  return shell(C.kind === "vault" ? "Capture vault" : "Capture forge", s, b, foot);
}
function setupSheet(){
  const S = UI.setup;
  const pick = S.m !== "random" ? MISSIONS[S.m] : null;
  const b = `<section class="card"><h3>1. Choose a mission</h3>
    <div class="seg"><button data-a="pickMode" data-v="pick" class="${S.m !== "random" ? "on" : ""}">I'll pick</button><button data-a="pickMode" data-v="random" class="${S.m === "random" ? "on" : ""}">Random</button></div>
    ${S.m === "random" ? `<p style="margin:0">One of the ${Object.keys(MISSIONS).length} missions is drawn when you start. You'll see which on the Battle page.</p>`
      : `<div class="mlist">${Object.entries(MISSIONS).map(([k, m]) => `<button class="mpick ${S.m === k ? "on" : ""}" data-a="pickM" data-v="${k}"><b>${esc(m.name)}</b><span>${esc(m.deploy)}${m.vp ? " · " + m.rounds + " rounds, VP" : " · relics, no round limit"}</span></button>`).join("")}</div>
      ${pick ? `<details class="dsec"><summary>About ${esc(pick.name)}</summary>${mapSVG(S.m)}${missionDetails(S.m, ["scoring"])}</details>` : ""}`}
    </section>
    <section class="card"><h3>2. Units per side</h3>
    <p style="margin:0" class="muted">Count the units each side brings. An attached leader counts as part of its unit.</p>
    <div class="card"><div class="field"><span class="lab" style="color:var(--red)">Red units</span>${stepper("sR", S.r, "red units")}</div>
    <div class="field"><span class="lab" style="color:var(--green)">Green units</span>${stepper("sG", S.g, "green units")}</div></section>
    <label class="toggle card" style="flex-direction:row">Keep screen on during the game<input type="checkbox" id="s-awake" data-t="awake" ${UI.awake ? "checked" : ""}></label>`;
  return shell("New game", null, b, `<button class="btn primary block" data-a="newGame">Start ${S.r} v ${S.g}: ${S.m === "random" ? "random mission" : esc(MISSIONS[S.m].name)}</button>`);
}
function confirmSheet(){ const C = UI.confirm; return shell(C.title, null, `<p style="margin:0">${esc(C.text)}</p>`, `<button class="btn primary block" data-a="cYes">${esc(C.yes)}</button><button class="btn quiet" data-a="close">Go back</button>`); }

/* ---------- render root ---------- */
function render(){
  renderTop();
  $("#main").dataset.tab = UI.tab;
  $("#main").innerHTML = {battle: renderBattle, dice: renderDice, mission: renderMission, rules: renderRules}[UI.tab]();
  const map = {unit: unitSheet, act: () => G.act ? actSheet() : "", cap: () => UI.cap ? capSheet() : "", setup: setupSheet, confirm: () => UI.confirm ? confirmSheet() : ""};
  const sh = $("#sheet"); const old = sh.querySelector(".sh-body"); const top = old ? old.scrollTop : 0;
  const html = UI.sheet && map[UI.sheet] ? map[UI.sheet]() : "";
  sh.innerHTML = html; sh.hidden = !html;
  const nb = sh.querySelector(".sh-body"); if (nb && UI.keep) nb.scrollTop = top; UI.keep = true;
  document.body.style.overflow = html ? "hidden" : "";
}
function open(name){ UI.sheet = name; UI.keep = false; render(); }

/* ---------- actions ---------- */
const A = {
  tab(d){ UI.tab = d.v; if (UI.sheet === "act") UI.sheet = null; window.scrollTo(0, 0); render(); },
  undo, startRound,
  theme(){ const t = curTheme() === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("reforged-theme", t); } catch (e) {} render(); },
  vp(d){ commit(() => { const s = +d.s; G.vp[s] = Math.max(0, G.vp[s] + +d.d); }); },
  cnt0(d){ const n = clamp(G.units.filter(u => u.side === 0).length + +d.d, 1, 30); commit(() => setCount(0, n)); },
  cnt1(d){ const n = clamp(G.units.filter(u => u.side === 1).length + +d.d, 1, 30); commit(() => setCount(1, n)); },
  askRound(){
    const left = ready(0).length + ready(1).length;
    const go = () => commit(() => { log(`Round ${G.round} ended${left ? " early (" + left + " unit" + (left > 1 ? "s" : "") + " still ready)" : ""}.`); G.started = false; G.units.forEach(u => { u.ready = false; }); if (!needsScoring()) roundBody(); });
    if (!left) return go();
    UI.confirm = {title: "Start a new round?", text: `${left} unit${left > 1 ? "s are" : " is"} still ready this round. All units become ready and initiative is rolled.`, yes: "Ready all & roll initiative", fn: go};
    open("confirm");
  },
  close(){ UI.sheet = null; UI.fx = null; render(); },
  bg(d, el, e){ if (e.target === el) A.close(); },
  unit(d){ UI.uid = d.id; UI.fx = null; if (G.act && G.act.id === d.id){ open("act"); return; } open("unit"); },
  resume(){ open("act"); },
  activate(){ const u = U(UI.uid); commit(() => { G.act = {id: u.id, step: "move", eng: !!u.engaged}; log(`${nm(u)} activated.`, u.side); }); open("act"); },
  uStatus(d){ commit(() => { const u = U(UI.uid); u.status = d.v; if (d.v === "dead"){ u.ready = false; u.deadRound = G.round; log(`${nm(u)} destroyed.`, u.side); if (u.relic && !u.relic.ref) u.relic = null; } }); },
  uSupp(d){ commit(() => { const u = U(UI.uid); u.supp = clamp(u.supp + +d.d, 0, 6); }); },
  uQ(d){ UI.q = clamp(UI.q + +d.d, 1, 20); render(); },
  uRv(d){ UI.rv = clamp(UI.rv + +d.d, 2, 7); render(); },
  uResolve(){ commit(() => { const u = U(UI.uid); const dice = rollN(UI.q).map(v => ({v, ok: v >= UI.rv})); const f = dice.filter(x => !x.ok).length; const b4 = u.supp; u.supp = clamp(u.supp + f, 0, 6);
    UI.fx = {dice, t: `${f} failed. Suppressed ${b4} → ${u.supp}.`}; log(`${nm(u)} took ${UI.q} Suppression (Rv ${UI.rv}+): ${f} failed, Suppressed ${u.supp}.`, u.side); }); },
  uDropRelic(){ commit(() => { const u = U(UI.uid); log(`${nm(u)} lost relic ${u.relic.d}.`, u.side); u.relic = null; }); },
  uReady(){ commit(() => { const u = U(UI.uid); makeReady(u, "manual"); if (!G.started){ G.started = true; G.turn = u.side; } else if (!G.act && !ready(G.turn).length) G.turn = u.side; }); },
  aDeploy(){ commit(() => { const u = U(G.act.id); u.status = "field"; u.resRound = G.round; G.act.deployed = true; log(`${nm(u)} deployed${G.act.fwd ? ` (Forward Deploy ${sum(G.act.fwd)}")` : ""}.`, u.side); }); },
  aFwd(){ commit(() => { G.act.fwd = rollN(2); }); },
  aStay(){ commit(() => { G.act.stay = true; G.act.step = "end"; log(`${nm(U(G.act.id))} stays in reserves.`, U(G.act.id).side); }); UI.keep = false; render(); },
  aBonus(d){ commit(() => { G.act.bonus = clamp((G.act.bonus || 0) + +d.d, 0, 3); }); },
  aRoll(){ commit(() => { const u = U(G.act.id); const dice = rollN(2 + (G.act.bonus || 0)); const t = Math.max(1, sum(dice) - u.supp); G.act.mr = {dice, t}; log(`${nm(u)} Move Roll ${dice.join("+")}${u.supp ? " − " + u.supp : ""} = ${t}".`, u.side); }); },
  aNext(d){ commit(() => { G.act.step = d.v; }); UI.keep = false; render(); },
  aDone(){
    commit(() => {
      const a = G.act, u = U(a.id);
      if (a.moved && u.stuck){ u.stuck = false; log(`${nm(u)} loses Stuck In.`, u.side); }
      if (u.supp){
        if (!u.veh) log(`${nm(u)} loses Suppressed.`, u.side);
        else if (a.skip) log(`${nm(u)} skipped attacks and loses Suppressed.`, u.side);
        else log(`${nm(u)} takes ${2 * u.supp} Shock Wounds for attacking while Suppressed, then loses Suppressed.`, u.side);
        u.supp = 0;
      }
      if (u.status === "field") u.engaged = !!a.eng;
      u.ready = !!a.again && u.status !== "dead";
      G.act = null; nextTurn();
    });
    UI.sheet = null; render();
  },
  aCancel(){ UI.confirm = {title: "Cancel activation?", text: "The unit goes back to ready. To take back dice rolls, use Undo instead.", yes: "Cancel activation", fn: () => commit(() => { const u = U(G.act.id); log(`${nm(u)}'s activation cancelled.`, u.side); G.act = null; })}; open("confirm"); },
  cYes(){ const C = UI.confirm; UI.sheet = null; UI.confirm = null; C.fn(); },
  capOpen(d){ const id = G.act && UI.sheet === "act" ? G.act.id : UI.uid; UI.capBack = UI.sheet; UI.cap = {kind: d.v, id, dice: null, relic: null, to: id, f: null}; open("cap"); },
  capRoll(){ commit(() => { const C = UI.cap, u = U(C.id); C.dice = rollN(2); log(`${nm(u)} captured a vault: rolled ${C.dice.join(" · ")}.`, u.side); if (C.dice[0] === C.dice[1]) makeReady(u, "doubles"); }); },
  capPick(d){ UI.cap.relic = +d.v; render(); },
  capTo(d){ UI.cap.to = d.id; render(); },
  capGive(){ const C = UI.cap; commit(() => { const t = U(C.to); G.units.forEach(x => { if (x.side === t.side && x.relic && x.relic.d === C.relic && !x.relic.ref) x.relic = null; }); t.relic = {d: C.relic, ref: false}; log(`${nm(t)} takes relic ${C.relic}.`, t.side); }); UI.cap = null; UI.sheet = UI.capBack === "act" && G.act ? "act" : null; render(); toast("Relic given"); },
  capF(d){ UI.cap.f = +d.v; render(); },
  capForge(){ const C = UI.cap; commit(() => { const u = U(C.id); G.forges[u.side][C.f] = G.round; u.relic.ref = true; log(`${nm(u)} captured forge ${C.f + 1}: relic ${u.relic.d} reforged!`, u.side); makeReady(u, "relic reforged"); }); UI.cap = null; UI.sheet = UI.capBack === "act" && G.act ? "act" : null; render(); toast("Relic reforged"); },
  openSetup(){ open("setup"); },
  sR(d){ UI.setup.r = clamp(UI.setup.r + +d.d, 1, 24); render(); },
  sG(d){ UI.setup.g = clamp(UI.setup.g + +d.d, 1, 24); render(); },
  pickM(d){ UI.setup.m = d.v; UI.lastPick = d.v; render(); },
  pickMode(d){ UI.setup.m = d.v === "random" ? "random" : (UI.lastPick || "vault"); render(); },
  ctl(d){ UI.ctl[d.id] = d.v === "" ? null : +d.v; render(); },
  scoreRound(){
    const S = computeScore(), r = G.round, m = M();
    commit(() => {
      G.vp[0] += S.vp[0]; G.vp[1] += S.vp[1]; G.scored[r] = true;
      log(`Round ${r} scoring: Red +${S.vp[0]}, Green +${S.vp[1]} VP (Red ${G.vp[0]} – Green ${G.vp[1]}).`);
      if (G.mission === "supply" && (r === 3 || r === 4)){
        const left = scoringObjs(); if (left.length > 1){ const o = left[Math.floor(Math.random() * left.length)]; G.gone[o.id] = true; log(`Supply objective ${o.id} (${o.label}) is removed.`); toast(`${o.label} objective removed`); }
      }
      if (r >= m.rounds){ G.winner = G.vp[0] === G.vp[1] ? -1 : G.vp[0] > G.vp[1] ? 0 : 1; log(`Battle over after ${r} rounds: ${winText()} (${G.vp[0]}–${G.vp[1]}).`, G.winner >= 0 ? G.winner : -1); }
    });
    UI.ctl = {};
  },
  burn(d){
    commit(() => { const u = U(G.act.id), o = M().objs.find(x => x.id === d.id); const val = o.t === "h" + (1 - u.side) ? 10 : 5;
      G.gone[o.id] = true; G.vp[u.side] += val; G.act.burned = true; log(`${nm(u)} burns objective ${o.id} (${o.label}): +${val} VP.`, u.side); });
    toast("Objective burned");
  },
  newGame(){
    const keys = Object.keys(MISSIONS); const rnd = UI.setup.m === "random";
    const mk = rnd ? keys[Math.floor(Math.random() * keys.length)] : UI.setup.m;
    HIST.push(JSON.stringify(G)); G = freshGame(UI.setup.r, UI.setup.g, mk);
    log(`New game: ${MISSIONS[mk].name}${rnd ? " (drawn at random)" : ""}, Red ${UI.setup.r} v Green ${UI.setup.g} units.`);
    UI.sheet = null; UI.tab = "battle"; save(); render(); toast(`${rnd ? "Random mission: " : ""}${MISSIONS[mk].name}`); },
  dN(d){ UI.dice.n = clamp(UI.dice.n + +d.d, 1, 60); UI.dice.res = null; render(); },
  dNeed(d){ UI.dice.need = clamp(UI.dice.need + +d.d, 2, 6); UI.dice.res = null; render(); },
  dRR(d){ UI.dice.rr = d.v; render(); },
  dS(d){ UI.dice.S = clamp(UI.dice.S + +d.d, 1, 7); render(); },
  dT(d){ UI.dice.T = clamp(UI.dice.T + +d.d, 1, 7); render(); },
  dUseW(){ UI.dice.need = woundNeed(UI.dice.S, UI.dice.T); UI.dice.res = null; toast(`Target set to ${UI.dice.need}+`); render(); },
  dRoll(){ const D = UI.dice; const dice = rollN(D.n).map(v => { let rr = false; if ((D.rr === "ones" && v === 1) || (D.rr === "fails" && v < D.need)){ v = d6(); rr = true; } return {v, ok: v >= D.need, rr}; });
    D.res = {dice, ok: dice.filter(x => x.ok).length, sixes: dice.filter(x => x.v === 6).length, need: D.need}; render(); },
  dChain(){ UI.dice.n = UI.dice.res.ok; UI.dice.res = null; render(); toast(`${UI.dice.n} dice ready: set the next target`); }
};
document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]"); if (!el) return;
  if (el.dataset.a === "bg" && e.target !== el) return;
  const f = A[el.dataset.a]; if (!f) return; e.preventDefault(); f(el.dataset, el, e);
});
document.addEventListener("change", e => {
  const t = e.target.dataset.t; if (!t) return; const v = e.target.checked;
  if (t === "awake"){ UI.awake = v; if (v) keepAwake(); else if (wake){ wake.release(); wake = null; } return; }
  if (t === "stuck" || t === "veh" || t === "engaged"){ commit(() => { U(UI.uid)[t] = v; }); return; }
  if (["eng","moved","skip"].includes(t) && G.act){ commit(() => { G.act[t] = v; }); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && UI.sheet) A.close(); });

/* ---------- boot ---------- */
matchMedia(DESK).addEventListener?.("change", () => render());
function curTheme(){ const t = document.documentElement.dataset.theme; return t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
function start(data){
  try { const t = localStorage.getItem("reforged-theme"); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch (e) {}
  let had = true;
  if (data && data.G && data.G.v === 2){ G = data.G; HIST = data.HIST || []; } else had = load();
  if (!G.vp) G.vp = [0, 0];
  if (!G.mission) G.mission = "vault"; if (!G.gone) G.gone = {}; if (!G.scored) G.scored = {};
  if (!had) UI.sheet = "setup";
  render();
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => render());
start({});
})();

/* Offline support when served over https (GitHub Pages) or localhost */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
