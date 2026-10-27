const WORDS = "the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both between need mean call develop under last right move thing general school never same another begin while number part turn real leave might want point form off child few small since against ask late home interest large person end open public follow during present without again hold govern around possible head consider word program problem however lead system set order eye plan run keep face fact group play stand increase early course change help line".split(" ");

// ---------- themes & settings ----------
const THEMES = {
  "olivia (yours)": ["#1c1b1d","#deaf9d","#deaf9d","#716462","#262223","#f2d0c4","#bf616a","#793e44"],
  "serika dark":    ["#323437","#e2b714","#e2b714","#646669","#2c2e31","#d1d0c5","#ca4754","#7e2a33"],
  "dracula":        ["#282a36","#bd93f9","#f8f8f2","#6272a4","#20222c","#f8f8f2","#ff5555","#b33c3c"],
  "nord":           ["#242933","#88c0d0","#d8dee9","#616e88","#1d212a","#eceff4","#bf616a","#793e44"],
  "8008 pink":      ["#333a45","#f44c7f","#f44c7f","#939eae","#2e343d","#e9ecf0","#da3333","#791717"],
  "carbon":         ["#313131","#f66e0d","#f66e0d","#616161","#2b2b2b","#f5e6c8","#e72d2d","#7e2a2a"],
  "rose pine":      ["#1f1d27","#9ccfd8","#f6c177","#6e6a86","#26233a","#e0def4","#eb6f92","#a3506a"],
  "terminal":       ["#191a1b","#79a617","#79a617","#48494b","#141516","#e7eae0","#a61717","#731010"],
  "botanical":      ["#7b9c98","#eaf1f3","#abc6c4","#495755","#6f8f8b","#eaf1f3","#f6c9b4","#f59a71"],
  "paper":          ["#eeeeee","#444444","#444444","#b2b2b2","#e0e0e0","#444444","#d70000","#8a0000"],
};
const VARS = ["--bg","--main","--caret","--sub","--sub-alt","--text","--err","--err-extra"];

// defaults copied from Bryan's monkeytype config
const DEFAULTS = {
  theme: "olivia (yours)", font: "Lexend Deca", fontSize: 3, caret: "line", smoothCaret: "medium",
  tape: true, flip: true, keymap: "react", sound: "off", liveWpm: true,
};
const OPTIONS = [
  { key: "theme", label: "theme", theme: true },
  { key: "font", label: "font family", opts: ["Lexend Deca","Roboto Mono","JetBrains Mono","Fira Code","Source Code Pro","Space Mono","Nunito"] },
  { key: "fontSize", label: "font size", opts: [[1.5,"1.5"],[2,"2"],[2.5,"2.5"],[3,"3"],[4,"4"]] },
  { key: "caret", label: "caret style", opts: ["off","line","block","underline"] },
  { key: "smoothCaret", label: "smooth caret", opts: ["off","slow","medium","fast"] },
  { key: "tape", label: "tape mode", opts: [[false,"off"],[true,"on"]] },
  { key: "flip", label: "flip test colors", opts: [[false,"off"],[true,"on"]] },
  { key: "keymap", label: "keymap", opts: ["off","react","next"] },
  { key: "sound", label: "sound on click", opts: ["off","click","beep","pop"] },
  { key: "liveWpm", label: "live wpm", opts: [[false,"off"],[true,"on"]] },
];

let S = { ...DEFAULTS };
try { Object.assign(S, JSON.parse(localStorage.getItem("typerace-settings") || "{}")); } catch {}
if (!THEMES[S.theme]) S.theme = DEFAULTS.theme;

function applySettings() {
  const t = THEMES[S.theme];
  VARS.forEach((v, i) => document.documentElement.style.setProperty(v, t[i]));
  document.documentElement.style.setProperty("--font", `"${S.font}"`);
  document.documentElement.style.setProperty("--size", S.fontSize + "rem");
  document.documentElement.style.setProperty("--caret-ms", { off: "0ms", slow: "150ms", medium: "100ms", fast: "50ms" }[S.smoothCaret]);
  document.body.classList.toggle("tape", S.tape);
  document.body.classList.toggle("flip", S.flip);
  $("keymap").classList.toggle("hidden", S.keymap === "off");
  $("miniWpm").classList.toggle("hidden", !S.liveWpm);
  try { localStorage.setItem("typerace-settings", JSON.stringify(S)); } catch {}
  // fonts load async; reposition once they're ready
  document.fonts?.ready.then(() => { scrollWords(); placeCaret(); });
  scrollWords(); placeCaret(); updateKeymap();
}

function renderSettings() {
  $("settingsBody").innerHTML = OPTIONS.map(o => {
    let opts;
    if (o.theme) opts = Object.entries(THEMES).map(([name, c]) => `
      <button class="theme-btn ${S.theme === name ? "on" : ""}" data-k="theme" data-v='${JSON.stringify(name)}'
        style="background:${c[0]};color:${c[5]}">
        <span class="dots"><i style="background:${c[1]}"></i><i style="background:${c[3]}"></i><i style="background:${c[5]}"></i></span>${name}
      </button>`).join("");
    else opts = o.opts.map(x => {
      const [v, l] = Array.isArray(x) ? x : [x, x];
      return `<button class="opt ${S[o.key] === v ? "on" : ""}" data-k="${o.key}" data-v='${JSON.stringify(v)}'
        ${o.key === "font" ? `style="font-family:'${v}'"` : ""}>${l}</button>`;
    }).join("");
    return `<div class="set"><div class="lbl">${o.label}</div><div class="opts">${opts}</div></div>`;
  }).join("");
}
document.addEventListener("click", e => {
  const b = e.target.closest("#settingsBody [data-k]");
  if (!b) return;
  S[b.dataset.k] = JSON.parse(b.dataset.v);
  applySettings(); renderSettings();
});
function $(id) { return document.getElementById(id); }
$("gearBtn").onclick = () => { renderSettings(); $("settings").classList.remove("hidden"); };
$("closeSettings").onclick = () => $("settings").classList.add("hidden");
$("settings").onclick = e => { if (e.target.id === "settings") $("settings").classList.add("hidden"); };
const settingsOpen = () => !$("settings").classList.contains("hidden");

// ---------- sounds ----------
let audio;
function playSound() {
  if (S.sound === "off") return;
  try {
    audio = audio || new AudioContext();
    const t = audio.currentTime, g = audio.createGain();
    g.connect(audio.destination);
    if (S.sound === "click") {
      const buf = audio.createBuffer(1, audio.sampleRate * 0.03, audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      const src = audio.createBufferSource(); src.buffer = buf;
      const f = audio.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1500;
      src.connect(f); f.connect(g); g.gain.value = 0.5; src.start(t);
    } else {
      const o = audio.createOscillator(); o.connect(g);
      if (S.sound === "beep") { o.frequency.value = 880; o.type = "square"; g.gain.setValueAtTime(0.06, t); }
      else { o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.06); g.gain.setValueAtTime(0.3, t); }
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.start(t); o.stop(t + 0.08);
    }
  } catch {}
}

// ---------- keymap ----------
const ROWS = ["qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"];
$("keymap").innerHTML = ROWS.map((r, i) =>
  `<div class="kr" style="margin-left:${i * 14}px">${[...r].map(k => `<div class="k" data-key="${k}">${k}</div>`).join("")}</div>`).join("")
  + `<div class="kr"><div class="k space" data-key=" "></div></div>`;
function keyEl(k) { return [...document.querySelectorAll("#keymap .k")].find(e => e.dataset.key === k.toLowerCase()); }
function flashKey(k) {
  if (S.keymap !== "react") return;
  const el = keyEl(k); if (!el) return;
  el.classList.add("hit"); setTimeout(() => el.classList.remove("hit"), 120);
}
function updateKeymap() {
  if (S.keymap !== "next") return;
  document.querySelectorAll("#keymap .k.hit").forEach(e => e.classList.remove("hit"));
  if (!T.live || T.done) return;
  const t = T.words[T.wi] || "";
  const next = T.input.length >= t.length ? " " : t[T.input.length];
  keyEl(next)?.classList.add("hit");
}

// ---------- word generation (seeded so every player gets the same text) ----------
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeGen(seed, cfg) {
  const rng = mulberry32(seed);
  let sentenceStart = true;
  return n => Array.from({ length: n }, () => {
    let w = WORDS[Math.floor(rng() * WORDS.length)];
    if (cfg.numbers && rng() < 0.12) w = String(Math.floor(rng() * 10 ** (1 + Math.floor(rng() * 4))));
    if (cfg.punctuation) {
      if (sentenceStart) w = w[0].toUpperCase() + w.slice(1);
      sentenceStart = false;
      const r = rng();
      if (r < 0.09) w += ",";
      else if (r < 0.17) { w += "."; sentenceStart = true; }
      else if (r < 0.19) { w += "?"; sentenceStart = true; }
      else if (r < 0.2) { w += "!"; sentenceStart = true; }
      else if (r < 0.22) w = `"${w}"`;
    }
    return w;
  });
}

// ---------- room state ----------
const PREFIX = "typerace-v1-";
const HOSTING_KEY = "typerace-hosting";
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ";
let peer, isHost = false, solo = false, hostConn = null, myId = null, roomCode = "";
const conns = new Map();
let players = {};
let cfg;
function loadCfg() {
  cfg = { mode: "time", time: 15, words: 50, punctuation: false, numbers: false };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem("typerace-cfg") || "{}")); } catch {}
}
loadCfg();
let racing = false, raceCfg = null, raceIds = new Set();
let joined = false;   // we got into the room at least once, so going home can offer a way back

// ---------- home ----------
try { $("name").value = localStorage.getItem("typerace-name") || ""; } catch {}
const hashCode = location.hash.slice(1).toUpperCase();
if (/^[A-Z]{4}$/.test(hashCode)) $("code").value = hashCode;

function myName() {
  const n = $("name").value.trim() || "guest" + Math.floor(Math.random() * 900 + 100);
  try { localStorage.setItem("typerace-name", n); } catch {}
  return n;
}
function homeErr(msg) { $("homeErr").textContent = msg; $("homeErr").classList.remove("info"); }
function info(msg) { $("homeErr").textContent = msg; $("homeErr").classList.add("info"); }   // progress, not a failure
$("soloBtn").onclick = () => {
  leaveRoom();
  solo = isHost = true; myId = "me";
  players = { me: blankPlayer(myName()) };
  enterRoom();
  hostStart();
};
// going home keeps the room open, so friends don't have to rejoin
$("logo").onclick = e => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); goHome(); };
$("leaveBtn").onclick = goHome;
$("backBtn").onclick = showRoom;
$("leaveRoomBtn").onclick = leaveRoom;
$("createBtn").onclick = () => { leaveRoom(); createRoom(myName()); };
$("joinBtn").onclick = () => {
  const code = $("code").value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return homeErr("room codes are 4 letters");   // check before dropping the current room
  leaveRoom(); joinRoom(myName(), code);
};
$("hostInsteadBtn").onclick = () => {
  const code = ($("hostInsteadBtn").dataset.code || "").toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return;
  leaveRoom(); createRoom(myName(), code);
};
function offerHosting(code) {
  $("hostInsteadBtn").dataset.code = code;
  $("hostInsteadBtn").textContent = `host room ${code} instead`;
  $("hostInsteadBtn").classList.remove("hidden");
}
$("code").onkeydown = e => { if (e.key === "Enter") $("joinBtn").click(); };
$("name").onkeydown = e => {
  if (e.key !== "Enter") return;
  if (!$("backRow").classList.contains("hidden")) { e.stopPropagation(); return $("backBtn").click(); }   // don't drop a kept room on a stray Enter, or let it start a race
  ($("code").value ? $("joinBtn") : $("createBtn")).click();
};
const randomCode = () => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");

// a refreshed host can take its own code back, so the room survives a reload
function rememberHosting(code) {
  try { code ? localStorage.setItem(HOSTING_KEY, JSON.stringify({ code, at: Date.now() })) : localStorage.removeItem(HOSTING_KEY); } catch {}
}
function hostedCode() {
  try {
    const h = JSON.parse(localStorage.getItem(HOSTING_KEY) || "null");
    return h && Date.now() - h.at < 60 * 60 * 1000 ? h.code : null;   // an hour old is someone else's room by now
  } catch { return null; }
}

// every room change bumps this, so a timer from an abandoned attempt does nothing
let roomGen = 0, createTimer = null, rejoinTimer = null, connTimer = null, rejoinTries = 0, everOpen = false;
const REJOINS = 20;

function clearTimers() { clearTimeout(createTimer); clearTimeout(rejoinTimer); clearTimeout(connTimer); }

function createRoom(name, code = null, tries = 0) {
  clearTimers();
  const g = ++roomGen;
  $("hostInsteadBtn").classList.add("hidden");
  info(code ? `reopening room ${code}…` : "creating room…");
  roomCode = code || randomCode();
  const p = peer = new Peer(PREFIX + roomCode);
  p.on("open", id => {
    if (p !== peer) return p.destroy();   // superseded: don't sit on the broker holding a room id
    isHost = true; myId = id; players = { [id]: blankPlayer(name) };
    rememberHosting(roomCode); homeErr(""); enterRoom();
  });
  p.on("connection", onGuest);
  p.on("error", err => {
    if (p !== peer) return p.destroy();
    if (err.type !== "unavailable-id") {
      // PeerJS has already given up on this peer, so the room is finished
      if (isHost) return setStatus("lost the connection to the server — nobody new can join");
      p.destroy(); peer = null; roomCode = "";
      return homeErr("couldn't create room: " + err.type);
    }
    p.destroy(); peer = null;
    // the broker holds a reloaded host's old id for a moment, so wait and try again
    if (code && tries < 6) { createTimer = setTimeout(() => { if (g === roomGen) createRoom(name, code, tries + 1); }, 1000); return; }
    if (!code && tries < 5) return createRoom(name, null, tries + 1);
    roomCode = "";
    if (!code) return homeErr("couldn't create room: " + err.type);
    joinRoom(name, code);   // a friend revived it while we were away, so join theirs
    info(`someone else is hosting room ${code} — joining it`);
  });
}

function joinRoom(name, code) {
  if (!/^[A-Z]{4}$/.test(code)) return homeErr("room codes are 4 letters");
  clearTimers();
  ++roomGen;
  $("hostInsteadBtn").classList.add("hidden");
  info("joining…");
  roomCode = code; rejoinTries = 0; everOpen = false;
  const p = peer = new Peer();
  p.on("open", () => { if (p !== peer) return p.destroy(); myId = p.id; connectToHost(name); });
  p.on("error", err => {
    if (p !== peer) return p.destroy();
    if (err.type === "peer-unavailable") {
      if (everOpen) return retryJoin(name);   // we were in this room, so the host is probably reloading
      clearTimers();                          // nobody has ever answered on this code; stop knocking
      homeErr(`no one is hosting room ${code}`);
      return offerHosting(code);
    }
    if (err.type === "network" || err.type === "disconnected") {   // a blip, not a dead room
      // PeerJS throws if it isn't actually disconnected, and the throw would unwind its own handler
      try { if (p.disconnected && !p.destroyed) p.reconnect(); } catch {}
      return retryJoin(name);
    }
    homeErr("couldn't join: " + err.type);
  });
}

function connectToHost(name) {
  if (!peer || !roomCode || isHost) return;
  clearTimeout(connTimer);
  if (peer.destroyed) return;
  if (peer.disconnected) return retryJoin(name);   // connect() would just return nothing
  const stale = hostConn; hostConn = null; stale?.close();   // don't leave half-open attempts behind
  const conn = hostConn = peer.connect(PREFIX + roomCode, { reliable: true });
  if (!conn) return retryJoin(name);
  const g = roomGen;
  conn.on("open", () => {
    if (conn !== hostConn) return conn.close();
    clearTimeout(connTimer);
    rejoinTries = 0; everOpen = true; homeErr("");
    conn.send({ t: "hello", name });
    if (!joined) return enterRoom();
    if ($("room").classList.contains("hidden")) { showBackRow(); return info(`back in room ${roomCode}`); }
    setStatus("back in the room"); renderPlayers();
  });
  conn.on("data", m => { if (conn === hostConn) onHostMsg(m); });
  conn.on("close", () => {
    if (conn !== hostConn) return;
    hostConn = null; clearTimeout(connTimer);
    stopRace(); clearRaceView(true);   // that race is over for us, but leave any results on screen
    retryJoin(name);   // most likely the host refreshed; wait for them to come back
  });
  // an attempt can hang with neither open nor close, so keep the budget moving
  connTimer = setTimeout(() => {
    if (g !== roomGen || conn !== hostConn) return;
    hostConn = null; conn.close(); retryJoin(name);
  }, 5000);
}

// the host's page reload drops every guest, so keep knocking for a while before giving up
function retryJoin(name) {
  clearTimeout(rejoinTimer);
  if (!peer || !roomCode || isHost) return;
  const g = roomGen;
  if (++rejoinTries > REJOINS) {
    const c = roomCode;
    if ($("room").classList.contains("hidden")) { leaveRoom(); homeErr(`the host left room ${c}`); offerHosting(c); }
    else setStatus("the host left the room");
    return;
  }
  const msg = `${joined ? "the host left — reconnecting" : "connecting"}… (${rejoinTries}/${REJOINS})`;
  if ($("room").classList.contains("hidden")) { $("backRow").classList.add("hidden"); info(msg); } else setStatus(msg);
  rejoinTimer = setTimeout(() => { if (g === roomGen) connectToHost(name); }, 3000);
}

const blankPlayer = name => ({ name, progress: 0, wpm: 0, acc: 0, done: false, time: 0 });

function showRoom() {
  $("home").classList.add("hidden");
  $("backRow").classList.add("hidden");
  $("room").classList.remove("hidden");
  $("leaveBtn").classList.remove("hidden");
  $("roomInfo").classList.toggle("hidden", solo);
  scrollWords(); placeCaret();   // positions read as 0 while the room was hidden
  if (T.live && !T.done) $("box").focus();
}

function goHome() {
  if ($("room").classList.contains("hidden")) return;
  // typing is ignored on the home screen, so leaving mid-race would stall it for everyone
  if (racing && !solo && !T.done) return setStatus(isHost ? "finish or end the race before going home" : "finish the race before going home");
  if (solo || (!isHost && !hostConn && !rejoinTries)) leaveRoom();   // nothing to keep: solo, or the host is gone for good
  $("room").classList.add("hidden");
  $("home").classList.remove("hidden");
  $("leaveBtn").classList.add("hidden");
  $("roomInfo").classList.add("hidden");
  showBackRow();
}

function showBackRow() {
  if (!roomCode || !joined || (!isHost && !hostConn)) return $("backRow").classList.add("hidden");
  $("backBtn").textContent = `back to room ${roomCode}`;
  $("backRow").classList.remove("hidden");
}

function clearRaceView(keepResults) {
  Object.assign(T, { words: [], wi: 0, input: "", typed: [], live: false, start: 0, keys: 0, good: 0, done: false, gen: null, endMs: 0 });
  raceCfg = null;
  $("words").innerHTML = "";
  $("miniTimer").textContent = ""; $("miniWpm").textContent = "";
  if (!keepResults) $("results").classList.add("hidden");
}

function leaveRoom() {
  stopRace();
  if (isHost) rememberHosting(null);
  // destroy() fires close events right away; clear these first so the handlers see no room
  const old = peer;
  peer = hostConn = null; conns.clear(); clearTimeout(bcTimer);
  clearTimers(); rejoinTries = 0; everOpen = false; ++roomGen;
  old?.destroy();
  players = {}; isHost = solo = false; myId = null; roomCode = ""; joined = false;
  loadCfg();   // a guest's cfg was overwritten by the host's
  clearRaceView();
  $("backRow").classList.add("hidden");
  $("hostInsteadBtn").classList.add("hidden");
  $("startBtn").textContent = "start race";
  homeErr("");
  history.replaceState(null, "", location.pathname);
}

function enterRoom() {
  joined = true;
  showRoom();
  $("players").classList.toggle("hidden", solo);
  if (!solo) {
    $("roomCode").textContent = roomCode;
    history.replaceState(null, "", "#" + roomCode);
  }
  setStatus(isHost ? "share the invite link, then start the race" : "waiting for the host to start");
  $("footer").innerHTML = solo ? "<kbd>enter</kbd> restart &nbsp; <kbd>esc</kbd> settings"
    : isHost ? "<kbd>enter</kbd> start race &nbsp; <kbd>esc</kbd> settings" : "<kbd>esc</kbd> settings";
  renderCfg(); renderPlayers(); showControls();
}

$("copyBtn").onclick = () => {
  navigator.clipboard?.writeText(location.origin + location.pathname + "#" + roomCode).then(() => {
    $("copyBtn").textContent = "copied!";
    setTimeout(() => $("copyBtn").textContent = "copy invite link", 1500);
  });
};

// ---------- race config bar ----------
function renderCfg() {
  const dis = !isHost || (racing && !solo) ? "disabled" : "";
  const pill = (on, attrs, label) => `<button class="pill ${on ? "on" : ""}" ${attrs} ${dis}>${label}</button>`;
  const amounts = cfg.mode === "time" ? [15, 30, 60, 120] : [10, 25, 50, 100];
  $("cfgBar").innerHTML = `
    <div class="grp">${pill(cfg.punctuation, 'data-c="punctuation"', "@ punctuation")}${pill(cfg.numbers, 'data-c="numbers"', "# numbers")}</div>
    <div class="sep"></div>
    <div class="grp">${pill(cfg.mode === "time", 'data-c="mode" data-v="time"', "⏱ time")}${pill(cfg.mode === "words", 'data-c="mode" data-v="words"', "A words")}</div>
    <div class="sep"></div>
    <div class="grp">${amounts.map(a => pill(cfg[cfg.mode] === a, `data-c="amount" data-v="${a}"`, a)).join("")}</div>`;
  $("cfgNote").textContent = isHost ? "" : "the host picks the race settings";
}
$("cfgBar").onclick = e => {
  const b = e.target.closest("[data-c]");
  if (!b || b.disabled) return;
  const c = b.dataset.c;
  if (c === "punctuation" || c === "numbers") cfg[c] = !cfg[c];
  else if (c === "mode") cfg.mode = b.dataset.v;
  else cfg[cfg.mode] = +b.dataset.v;
  try { localStorage.setItem("typerace-cfg", JSON.stringify(cfg)); } catch {}
  renderCfg();
  for (const c of conns.values()) c.send({ t: "cfg", cfg });
  if (solo) { stopRace(); hostStart(); }   // like monkeytype: changing the mode restarts the test
};

// ---------- networking ----------
function onGuest(conn) {
  conn.on("data", msg => {
    if (msg.t === "hello") {
      conns.set(conn.peer, conn);   // the newest attempt from this player wins
      players[conn.peer] = blankPlayer(String(msg.name).slice(0, 16));
      raceIds.delete(conn.peer);   // they missed the start, so the race must not wait on them
      conn.send({ t: "cfg", cfg });
      broadcastPlayers(true);
      checkOver();
    } else if (conns.get(conn.peer) !== conn) {
      return;   // a leftover attempt from a player who has already reconnected
    } else if (msg.t === "prog" && players[conn.peer] && racing) {
      Object.assign(players[conn.peer], pickProg(msg));
      broadcastPlayers(msg.done);
      checkOver();
    }
  });
  conn.on("close", () => {
    if (conns.get(conn.peer) !== conn) return;   // superseded by a reconnect; don't drop the live player
    conns.delete(conn.peer); delete players[conn.peer]; raceIds.delete(conn.peer);
    broadcastPlayers(true); checkOver();
  });
}
const pickProg = m => ({ progress: +m.progress || 0, wpm: +m.wpm || 0, acc: +m.acc || 0, done: !!m.done, time: +m.time || 0 });

let bcTimer = null;
function broadcastPlayers(now) {
  const send = () => { bcTimer = null; for (const c of conns.values()) c.send({ t: "players", players }); renderPlayers(); };
  if (now) { clearTimeout(bcTimer); return send(); }
  if (!bcTimer) bcTimer = setTimeout(send, 120);
}

function onHostMsg(msg) {
  if (msg.t === "players") { players = msg.players; renderPlayers(); }
  else if (msg.t === "cfg") { cfg = msg.cfg; renderCfg(); }
  else if (msg.t === "start") beginCountdown(msg.seed, msg.cfg);
  else if (msg.t === "over") { players = msg.players; showResults(); }
}

function sendProgress(p) {
  if (isHost) { Object.assign(players[myId], p); broadcastPlayers(p.done); checkOver(); }
  else if (hostConn?.open) hostConn.send({ t: "prog", ...p });
}

function checkOver() {
  if (!isHost || !racing) return;
  const ids = [...raceIds].filter(id => players[id]);
  if (ids.length && ids.every(id => players[id].done)) endRace();
}
function endRace() {
  for (const c of conns.values()) c.send({ t: "over", players });
  showResults();
}

// ---------- players list ----------
function renderPlayers() {
  const list = Object.entries(players);
  const maxWpm = Math.max(1, ...list.map(([, p]) => p.wpm));
  const timeMode = (raceCfg || cfg).mode === "time";
  $("players").innerHTML = list.map(([id, p]) => {
    const w = timeMode ? p.wpm / maxWpm : p.progress;
    return `<div class="p ${id === myId ? "me" : ""}">
      <span class="name">${esc(p.name)}${id === myId ? " (you)" : ""}</span>
      <span class="bar"><i style="width:${Math.round(w * 100)}%"></i></span>
      <span class="stat">${p.done ? "✓ " : ""}${p.wpm} wpm</span>
    </div>`;
  }).join("");
}
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const setStatus = html => $("status").innerHTML = html;

function showControls() {
  $("startBtn").classList.toggle("hidden", !isHost || racing);
  $("endBtn").classList.toggle("hidden", !isHost || !racing || solo);
}

// ---------- race flow ----------
function hostStart() {
  if (!isHost || racing) return;
  const seed = Math.floor(Math.random() * 2 ** 31);
  for (const c of conns.values()) c.send({ t: "start", seed, cfg });
  raceIds = new Set(Object.keys(players));
  beginCountdown(seed, { ...cfg });
}
$("startBtn").onclick = hostStart;
$("endBtn").onclick = () => { if (isHost && racing) endRace(); };

let countdownTimer = null, clockTimer = null;
function beginCountdown(seed, c) {
  if ($("room").classList.contains("hidden")) showRoom();   // a guest on the home screen gets pulled into the race
  racing = true; raceCfg = c;
  for (const p of Object.values(players)) Object.assign(p, blankPlayer(p.name));
  renderPlayers(); renderCfg(); showControls();
  $("results").classList.add("hidden");
  $("miniTimer").textContent = ""; $("miniWpm").textContent = "";
  setupTyping(seed, c);
  if (solo) {   // no countdown: the clock starts on the first keypress
    setStatus("");
    T.live = true;
    $("box").focus();
    updateMini(); updateKeymap();
    return;
  }
  let n = 3;
  clearInterval(countdownTimer);
  setStatus(`<span id="count">${n}</span>`);
  countdownTimer = setInterval(() => {
    if (--n > 0) return setStatus(`<span id="count">${n}</span>`);
    clearInterval(countdownTimer);
    setStatus("go!");
    T.live = true;   // like monkeytype, each player's clock starts on their first keypress
    $("box").focus();
    updateMini(); updateKeymap();
  }, 1000);
}

function tickClock() {
  if (!T.live || T.done || !T.start) return clearInterval(clockTimer);
  if (raceCfg.mode === "time" && performance.now() - T.start >= raceCfg.time * 1000) return finishTyping();
  updateMini();
}
setInterval(() => { if (T.live && !T.done && T.start) sendProgress(stats()); }, 1000);

function stopRace() {
  racing = false; T.live = false;
  clearInterval(countdownTimer); clearInterval(clockTimer);
  renderCfg(); showControls(); placeCaret(); updateKeymap();
}

function showResults() {
  const timeMode = raceCfg?.mode === "time";
  if (solo) {
    const p = players.me;
    $("results").innerHTML = `<table><tr><th>wpm</th><th>accuracy</th><th>time</th></tr>
      <tr><td class="big">${p.wpm}</td><td class="big">${p.acc}%</td><td class="big">${(p.time / 1000).toFixed(1)}s</td></tr></table>`;
    $("results").classList.remove("hidden");
    stopRace();
    $("startBtn").textContent = "next test";
    setStatus("");
    return;
  }
  const rows = Object.entries(players).sort(([, a], [, b]) =>
    timeMode ? b.wpm - a.wpm : (b.done - a.done) || (a.done ? a.time - b.time : b.progress - a.progress));
  $("results").innerHTML = `<table>
    <tr><th>#</th><th>name</th><th>wpm</th><th>accuracy</th><th>time</th></tr>
    ${rows.map(([id, p], i) => `<tr>
      <td>${i + 1}</td><td>${esc(p.name)}${id === myId ? " (you)" : ""}</td>
      <td class="big">${p.wpm}</td><td>${p.acc}%</td>
      <td>${p.done || timeMode ? (p.time / 1000).toFixed(1) + "s" : "dnf"}</td></tr>`).join("")}
  </table>`;
  $("results").classList.remove("hidden");
  stopRace();
  $("startBtn").textContent = "race again";
  setStatus(isHost ? "race over" : "race over, waiting for the host");
}

// ---------- typing engine ----------
const T = { words: [], wi: 0, input: "", typed: [], live: false, start: 0, keys: 0, good: 0, done: false, gen: null, endMs: 0 };

function setupTyping(seed, c) {
  const gen = makeGen(seed, c);
  const words = gen(c.mode === "words" ? c.words : 120);
  Object.assign(T, { words, wi: 0, input: "", typed: [], live: false, start: 0, keys: 0, good: 0, done: false, gen, endMs: 0 });
  $("words").innerHTML = words.map((_, i) => `<span class="w" id="w${i}"></span>`).join("") + `<div id="caret"></div>`;
  words.forEach((_, i) => renderWord(i));
  scrollWords(); placeCaret();
}

function moreWords() {   // time mode never runs out of words
  if (raceCfg.mode !== "time" || T.wi < T.words.length - 40) return;
  const start = T.words.length;
  T.words.push(...T.gen(60));
  $("caret").insertAdjacentHTML("beforebegin", T.words.slice(start).map((_, i) => `<span class="w" id="w${start + i}"></span>`).join(""));
  for (let i = start; i < T.words.length; i++) renderWord(i);
}

function renderWord(i) {
  const target = T.words[i];
  const inp = i === T.wi ? T.input : (T.typed[i] ?? "");
  let html = "";
  for (let j = 0; j < Math.max(target.length, inp.length); j++) {
    if (j < target.length) html += `<span class="${j < inp.length ? (inp[j] === target[j] ? "ok" : "bad") : ""}">${esc(target[j])}</span>`;
    else html += `<span class="extra">${esc(inp[j])}</span>`;
  }
  const el = $("w" + i);
  el.innerHTML = html;
  el.classList.toggle("err", i < T.wi && T.typed[i] !== target);
}

function placeCaret() {
  const c = $("caret");
  if (!c) return;
  if (S.caret === "off" || T.done || !racing) { c.style.display = "none"; return; }
  c.style.display = "";
  const spans = $("w" + T.wi)?.children;
  if (!spans?.length) return;
  const i = T.input.length;
  const s = spans[Math.min(i, spans.length - 1)];
  const x = i < spans.length ? s.offsetLeft : s.offsetLeft + s.offsetWidth;
  const w = s.offsetWidth, h = s.offsetHeight, y = s.offsetTop;
  const st = c.style;
  if (S.caret === "line") Object.assign(st, { left: x - 1 + "px", top: y + h * .12 + "px", width: "2px", height: h * .76 + "px", opacity: "" });
  if (S.caret === "block") Object.assign(st, { left: x + "px", top: y + h * .12 + "px", width: w + "px", height: h * .76 + "px", opacity: ".4" });
  if (S.caret === "underline") Object.assign(st, { left: x + "px", top: y + h * .85 + "px", width: w + "px", height: "3px", opacity: "" });
}

function scrollWords() {
  const el = $("w" + T.wi);
  if (!el) return;
  if (S.tape) {
    $("words").style.transform = `translateX(${$("box").clientWidth * 0.5 - el.offsetLeft}px)`;
  } else {
    const lineH = el.offsetHeight || 1;
    $("words").style.transform = `translateY(${-Math.max(0, Math.round(el.offsetTop / lineH) - 1) * lineH}px)`;
  }
}
addEventListener("resize", () => { scrollWords(); placeCaret(); });

function correctChars() {
  let c = 0;
  for (let i = 0; i < T.wi; i++) if (T.typed[i] === T.words[i]) c += T.words[i].length + 1;
  const t = T.words[T.wi] || "";
  let k = 0;
  while (k < T.input.length && T.input[k] === t[k]) k++;
  return c + k;
}

function stats() {
  const ms = T.endMs || (T.start ? performance.now() - T.start : 0);
  const cc = correctChars();
  const progress = raceCfg.mode === "time" ? Math.min(1, ms / (raceCfg.time * 1000)) : Math.min(1, cc / T.words.join(" ").length);
  return {
    progress,
    wpm: ms > 500 ? Math.round(cc / 5 / (ms / 60000)) : 0,
    acc: T.keys ? Math.round((T.good / T.keys) * 100) : 100,
    done: T.done, time: Math.round(ms),
  };
}

function updateMini() {
  if (!T.live) return;
  const ms = T.endMs || (T.start ? performance.now() - T.start : 0);
  $("miniTimer").textContent = raceCfg.mode === "time"
    ? Math.max(0, Math.ceil(raceCfg.time - ms / 1000))
    : `${Math.min(T.wi, T.words.length)}/${T.words.length}`;
  $("miniWpm").textContent = T.keys ? stats().wpm : "";
}

function finishTyping() {
  if (T.done) return;
  T.done = true;
  T.endMs = raceCfg.mode === "time" ? raceCfg.time * 1000 : performance.now() - T.start;
  clearInterval(clockTimer);
  const s = stats();
  $("miniTimer").textContent = "";
  $("miniWpm").textContent = `${s.wpm} wpm · ${s.acc}% acc`;
  $("miniWpm").classList.remove("hidden");
  setStatus("finished! waiting for the others…");
  placeCaret(); updateKeymap();
  sendProgress(s);
}

let typingIdle;
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    settingsOpen() ? $("closeSettings").click() : $("gearBtn").click();
    return;
  }
  if (settingsOpen() || $("room").classList.contains("hidden")) return;
  if (e.key === "Enter" && solo) { e.preventDefault(); stopRace(); return hostStart(); }
  if (e.key === "Enter" && isHost && !racing) { e.preventDefault(); return hostStart(); }
  if (!T.live || T.done || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!T.start && (e.key.length === 1 && e.key !== " ")) {
    T.start = performance.now();
    if (!solo) setStatus("");
    clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 100);
  }
  if (!T.start) return;
  if (document.activeElement !== $("box")) $("box").focus();
  document.body.classList.add("typing");
  clearTimeout(typingIdle);
  typingIdle = setTimeout(() => document.body.classList.remove("typing"), 600);

  const target = T.words[T.wi];
  const prev = T.wi;
  if (e.key === "Backspace") {
    e.preventDefault();
    if (T.input) T.input = T.input.slice(0, -1);
    else if (T.wi > 0 && T.typed[T.wi - 1] !== T.words[T.wi - 1]) {   // go back to fix a wrong word
      T.wi--; T.input = T.typed[T.wi]; T.typed.length = T.wi;
    }
  } else if (e.key === " ") {
    e.preventDefault();
    if (!T.input) return;
    T.keys++; if (T.input === target) T.good++;
    T.typed[T.wi] = T.input; T.input = "";
    if (T.wi === T.words.length - 1) { T.wi++; renderWord(prev); return finishTyping(); }
    T.wi++;
    moreWords();
  } else if (e.key.length === 1) {
    e.preventDefault();
    if (T.input.length > target.length + 10) return;
    T.keys++; if (e.key === target[T.input.length]) T.good++;
    T.input += e.key;
  } else return;

  playSound(); flashKey(e.key);
  renderWord(prev); if (prev !== T.wi) renderWord(T.wi);
  if (raceCfg.mode === "words" && T.wi === T.words.length - 1 && T.input === T.words[T.wi]) {
    T.typed[T.wi] = T.input; return finishTyping();
  }
  scrollWords(); placeCaret(); updateKeymap(); updateMini();
  sendProgress(stats());
});

// keys are read from the whole page, so only blur the text when the browser window itself loses focus
const updateBlur = () => $("box").classList.toggle("blur", T.live && !T.done && !document.hasFocus() && !settingsOpen());
addEventListener("focus", () => { updateBlur(); if (T.live) $("box").focus(); });
addEventListener("blur", updateBlur);
$("box").addEventListener("click", () => $("box").focus());
// a clicked button keeps focus, and space/enter would press it again while typing
document.addEventListener("click", e => { if (e.target.closest("button") && racing) $("box").focus(); });

applySettings();

// a host who refreshes gets their own room back, so nobody has to rejoin
let savedName = "";
try { savedName = localStorage.getItem("typerace-name") || ""; } catch {}
if (savedName && /^[A-Z]{4}$/.test(hashCode) && hostedCode() === hashCode) createRoom(savedName, hashCode);
