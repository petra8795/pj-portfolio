/* =========================================================
   Play mode — the portfolio as a small 3D island.
   Walk around; each piece of work stands on a billboard.
   Walking up to one shows it (E / Read for details).
   Coins, flips (double jump) and trampolines add points,
   just for fun. Three.js is loaded only when Play is picked,
   so Classic stays light. Classic is the default.
   ========================================================= */
(() => {
  const $ = (s) => document.querySelector(s);
  const play = $("#play");
  if (!play) return;

  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

  /* ---------- content: one billboard each ---------- */
  const CALENDLY = "https://calendly.com/jakljevicpetra/30min";
  const PIECES = [
    { id: "about", icon: "👋", kind: "About", title: "Hi, I'm Petra", tag: "UX/UI designer",
      text: "I design products that solve real-world problems and that people enjoy using, across web, apps and ecommerce. I also build: this island is part of the portfolio.",
      lines: ["UX/UI designer", "Web · apps · ecommerce", "Designs it, then builds it"],
      classic: "#about", cta: "Read more in Classic" },
    { id: "kintsu", icon: "🏺", kind: "Project", title: "Kintsu", tag: "Brand identity · Website · 2024",
      img: "images/kintsu-cover.webp",
      text: "Brand identity and website for a design-as-a-service agency. Clean and trustworthy, with a pastel palette that keeps it fresh and inviting.",
      href: "kintsu.html", cta: "Open case study" },
    { id: "companion", icon: "📱", kind: "Project", title: "NU companion app", tag: "Mobile · UX/UI · 2022–2024",
      img: "images/companion-cover.webp",
      text: "Made complex health data understandable for people without a science background, and added reasons to come back to the app.",
      href: "companion.html", cta: "Open case study" },
    { id: "waiting", icon: "⏳", kind: "Project", title: "NU waiting room", tag: "Product redesign · 2022–2024",
      img: "images/waiting-room-cover.png",
      text: "Guided people from buying a test kit to getting their results, so the wait felt clear and trustworthy.",
      href: "waiting-room.html", cta: "Open case study" },
    { id: "correlate", icon: "✉️", kind: "Project", title: "Correlate", tag: "CX · System emails · 2020–2021",
      img: "images/correlate-cover.webp",
      text: "System emails and UI pieces for the CX team, from customer flow and design to developer handover and QA.",
      href: "correlate.html", cta: "Open case study" },
    { id: "experience", icon: "🧭", kind: "Experience", title: "Where I've worked", tag: "2020 — today",
      roles: [
        ["Freelance designer", "2024 —"],
        ["UX/UI designer, The NU", "2022 — 2024"],
        ["UX/UI designer, Playground Studio", "2021 — 2022"],
        ["CX designer, Correlate", "2020 — 2021"],
        ["Marketing / graphic designer, StoringCargo", "2020 — 2021"],
      ],
      lines: ["Freelance · 2024 —", "The NU · 2022 — 2024", "Playground Studio · 2021 — 22", "Correlate · 2020 — 21"],
      classic: "#experience", cta: "Full experience in Classic" },
    { id: "contact", icon: "📞", kind: "Contact", title: "Let's talk", tag: "Say hi",
      text: "Want to work together, or just tell me your score? Book a 30-minute call.",
      lines: ["Book a 30-minute call", "calendly.com/jakljevicpetra"],
      href: CALENDLY, external: true, cta: "Book a call" },
  ];
  const BY_ID = Object.fromEntries(PIECES.map((p) => [p.id, p]));

  /* ---------- storage ---------- */
  const store = {
    get(k, s = localStorage) { try { return s.getItem(k); } catch (e) { return null; } },
    set(k, v, s = localStorage) { try { s.setItem(k, v); } catch (e) {} },
  };
  let visited = new Set(JSON.parse(store.get("pj-visited", sessionStorage) || "[]").filter((id) => BY_ID[id]));
  let best = +store.get("pj-best") || 0;

  /* ---------- mode switch ---------- */
  const modeBtns = document.querySelectorAll(".mode__btn");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  let started = false, running = false, ready = false;

  function setMode(m, opts = {}) {
    const isPlay = m === "play";
    document.body.classList.toggle("is-play", isPlay);
    play.hidden = !isPlay;
    modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    store.set("pj-mode", m);
    if (isPlay) {
      window.scrollTo(0, 0);
      if (!started) { started = true; boot(); }
      resume();
    } else {
      pause();
      if (opts.hash) {
        const el = document.querySelector(opts.hash);
        if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }));
      }
    }
  }
  modeBtns.forEach((b) => b.addEventListener("click", () => { sfx.init(); setMode(b.dataset.mode); }));

  /* ---------- sound (synthesised, no files) ---------- */
  const sfx = (() => {
    let ac = null, out = null, on = store.get("pj-sound") !== "off";
    function init() {
      if (ac) { if (ac.state !== "running") ac.resume().catch(() => {}); return; }
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.35; out.connect(ac.destination); }
      catch (e) { ac = null; }
    }
    const ok = () => ac && on && ac.state === "running";
    function tone(type, f0, f1, dur, gain, delay = 0) {
      const t = ac.currentTime + 0.01 + delay, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
    }
    return {
      init,
      get on() { return on; },
      toggle() { on = !on; store.set("pj-sound", on ? "on" : "off"); if (on) init(); return on; },
      jump() { if (ok()) tone("square", 300, 600, 0.12, 0.07); },
      flip() { if (ok()) tone("triangle", 400, 1200, 0.25, 0.12); },
      coin() { if (!ok()) return; tone("square", 988, 988, 0.06, 0.06); tone("square", 1319, 1319, 0.18, 0.06, 0.06); },
      boing() { if (ok()) tone("sine", 200, 900, 0.3, 0.2); },
      splash() { if (ok()) tone("sine", 500, 120, 0.3, 0.15); },
      board() { if (!ok()) return; [523, 659, 784].forEach((f, i) => tone("triangle", f, f, 0.16, 0.16, i * 0.08)); },
      win() { if (!ok()) return; [523, 659, 784, 1046, 1318].forEach((f, i) => tone("triangle", f, f, 0.2, 0.18, i * 0.1)); },
    };
  })();

  /* ---------- HUD ---------- */
  const news = $("#pNews");
  let newsT = 0, score = 0;
  function say(s, secs = 3.2) {
    news.innerHTML = "";
    const m = document.createElement("div");
    m.className = "play__msg"; m.textContent = s;
    news.appendChild(m); newsT = secs;
  }
  function showRead(id) {
    const p = BY_ID[id];
    news.innerHTML = "";
    const b = document.createElement("button");
    b.type = "button"; b.className = "play__read";
    b.innerHTML = `<span aria-hidden="true">${p.icon}</span> Read “${esc(p.title)}” ${coarse ? "" : "<kbd>E</kbd>"}`;
    b.addEventListener("click", () => openPiece(id));
    news.appendChild(b); newsT = 0;
  }
  function updateHud() {
    $("#pScoreNum").textContent = score;
    $("#pCount").textContent = `${visited.size}/${PIECES.length}`;
    $("#pPips").innerHTML = PIECES.map((p) => `<i class="${visited.has(p.id) ? "on" : ""}"></i>`).join("");
  }
  const soundBtn = $("#pSound");
  const syncSound = () => {
    soundBtn.innerHTML = `<span aria-hidden="true">${sfx.on ? "🔊" : "🔇"}</span><span class="play__lbl">${sfx.on ? "Sound on" : "Sound off"}</span>`;
    soundBtn.setAttribute("aria-pressed", String(sfx.on));
    soundBtn.setAttribute("aria-label", "Sound");
  };
  soundBtn.addEventListener("click", () => { sfx.toggle(); syncSound(); });
  syncSound(); updateHud();
  $("#pFound").addEventListener("click", openList);

  /* ---------- cards ---------- */
  const veil = $("#pVeil"), card = $("#pCard");
  let lastFocus = null, finalePending = false;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const paused = () => !veil.hidden;

  function showCard(html) {
    lastFocus = document.activeElement;
    card.innerHTML = `<button type="button" class="play__close" data-act="close" aria-label="Close">×</button>` + html;
    veil.hidden = false; clearInput();
    card.focus();
  }
  function closeCard() {
    veil.hidden = true;
    if (finalePending) { finalePending = false; return finale(); }
    if (lastFocus && lastFocus.focus && lastFocus !== document.body) lastFocus.focus();
  }
  veil.addEventListener("click", (e) => {
    if (e.target === veil) return closeCard();
    const b = e.target.closest("[data-act]");
    if (!b) return;
    e.preventDefault();
    const act = b.dataset.act;
    if (act === "close") closeCard();
    else if (act === "classic") { veil.hidden = true; setMode("classic", { hash: b.dataset.hash }); }
    else if (act === "again") { veil.hidden = true; restart(); }
    else if (act === "goto") { veil.hidden = true; if (W) W.teleport(b.dataset.id); }
  });
  veil.addEventListener("keydown", (e) => { // keep Tab inside the card
    if (e.key !== "Tab") return;
    const f = [...card.querySelectorAll("a,button")];
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
  function pieceAction(p) {
    if (p.href) return `<a class="play__btn play__btn--go" href="${esc(p.href)}"${p.external ? ' target="_blank" rel="noopener"' : ""}>${esc(p.cta)} <span aria-hidden="true">→</span></a>`;
    return `<button type="button" class="play__btn play__btn--go" data-act="classic" data-hash="${esc(p.classic)}">${esc(p.cta)} <span aria-hidden="true">→</span></button>`;
  }
  function openPiece(id) {
    const p = BY_ID[id];
    showCard(`
      <span class="play__eyebrow">${esc(p.kind)}</span>
      <h2 id="pCardTitle"><span class="ico" aria-hidden="true">${p.icon}</span>${esc(p.title)}</h2>
      <span class="play__tag">${esc(p.tag)}</span>
      ${p.img ? `<img src="${esc(p.img)}" alt="" />` : ""}
      ${p.text ? `<p>${esc(p.text)}</p>` : ""}
      ${p.roles ? `<ul class="play__roles">${p.roles.map(([r, d]) => `<li>${esc(r)}<span>${esc(d)}</span></li>`).join("")}</ul>` : ""}
      <div class="play__actions">${pieceAction(p)}<button type="button" class="play__btn" data-act="close">Keep exploring</button></div>`);
  }
  function openList() {
    showCard(`
      <span class="play__eyebrow">${visited.size}/${PIECES.length} boards seen · Score ${score}</span>
      <h2 id="pCardTitle">Everything on the island</h2>
      <ul class="play__list">${PIECES.map((p) => `<li${visited.has(p.id) ? "" : ' class="is-new"'}>
        <a href="#" data-act="goto" data-id="${p.id}"><span class="ico" aria-hidden="true">${p.icon}</span>${esc(p.title)}<small>${visited.has(p.id) ? "Seen" : esc(p.kind)}</small></a></li>`).join("")}</ul>
      <p class="play__hint">Pick one to walk straight to its board.</p>
      <div class="play__actions"><button type="button" class="play__btn" data-act="classic" data-hash="#work">Classic view</button></div>`);
  }
  function finale() {
    sfx.win();
    const isBest = score > best;
    if (isBest) { best = score; store.set("pj-best", String(best)); }
    showCard(`
      <span class="play__eyebrow">All 7 boards seen</span>
      <h2 id="pCardTitle"><span class="ico" aria-hidden="true">🏝️</span>Score ${score}</h2>
      <p>${isBest ? "New best score on this device. " : `Best on this device: ${best}. `}Thanks for walking around. Keep collecting coins, or take the next step and book a call.</p>
      <div class="play__actions">
        <a class="play__btn play__btn--go" href="${CALENDLY}" target="_blank" rel="noopener">Book a call <span aria-hidden="true">→</span></a>
        <button type="button" class="play__btn" data-act="close">Keep exploring</button>
        <button type="button" class="play__btn" data-act="again">Start over</button>
      </div>`);
  }
  function addScore(n, label, pos) {
    score += n; $("#pScoreNum").textContent = score;
    if (W) W.pop(label || `+${n}`, pos, n >= 50);
  }
  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id); store.set("pj-visited", JSON.stringify([...visited]), sessionStorage);
    sfx.board(); addScore(100, "New board +100", W.boardPos(id)); updateHud();
    if (visited.size === PIECES.length) finalePending = true;
  }
  function restart() {
    score = 0; visited = new Set(); store.set("pj-visited", "[]", sessionStorage);
    updateHud(); W.reset(); say("Fresh start. Coins are back");
  }

  /* ---------- input ---------- */
  const keys = new Set();
  const MOVE = { ArrowUp: 1, KeyW: 1, ArrowDown: 1, KeyS: 1, ArrowLeft: 1, KeyA: 1, ArrowRight: 1, KeyD: 1 };
  const stick = { x: 0, y: 0 };
  let jumpPressed = false;
  function clearInput() { keys.clear(); stick.x = stick.y = 0; }
  addEventListener("keydown", (e) => {
    if (play.hidden) return;
    if (paused()) { if (e.code === "Escape") closeCard(); return; }
    if (e.target.closest && e.target.closest("input,textarea,select")) return;
    if (MOVE[e.code]) { keys.add(e.code); e.preventDefault(); }
    else if (e.code === "Space") { e.preventDefault(); if (!e.repeat) jumpPressed = true; }
    else if (e.code === "KeyE" || e.code === "Enter") { e.preventDefault(); if (W && W.near) openPiece(W.near); }
    else if (e.code === "KeyB") { e.preventDefault(); openList(); }
    else return;
    sfx.init();
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  addEventListener("blur", clearInput);
  function moveInput() {
    let x = 0, y = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
    if (stick.x || stick.y) { x = stick.x; y = stick.y; }
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }
  // floating stick
  const zone = $("#pZone"), stickEl = $("#pStick"), knob = $("#pKnob");
  let sid = null, sx = 0, sy = 0;
  zone.addEventListener("pointerdown", (e) => {
    sfx.init(); sid = e.pointerId; try { zone.setPointerCapture(sid); } catch (err) {}
    const r = zone.getBoundingClientRect();
    sx = Math.min(Math.max(e.clientX - r.left, 60), r.width - 60);
    sy = Math.min(Math.max(e.clientY - r.top, 60), r.height - 60);
    stickEl.style.left = sx - 60 + "px"; stickEl.style.top = sy - 60 + "px"; stickEl.classList.add("is-live");
  });
  zone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== sid) return;
    const r = zone.getBoundingClientRect();
    let dx = e.clientX - r.left - sx, dy = e.clientY - r.top - sy;
    const len = Math.hypot(dx, dy), max = 40;
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    if (len < 8) { stick.x = stick.y = 0; return; }
    stick.x = dx / max; stick.y = dy / max;
  });
  const endStick = (e) => { if (e.pointerId !== sid) return; sid = null; stick.x = stick.y = 0; knob.style.transform = ""; stickEl.classList.remove("is-live"); };
  zone.addEventListener("pointerup", endStick);
  zone.addEventListener("pointercancel", endStick);
  const jumpBtn = $("#pJump");
  jumpBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); sfx.init(); jumpBtn.classList.add("is-down"); jumpPressed = true; });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => jumpBtn.addEventListener(t, () => jumpBtn.classList.remove("is-down")));
  jumpBtn.addEventListener("click", (e) => { if (e.detail === 0) jumpPressed = true; });

  /* ---------- the 3D world ---------- */
  let W = null, raf = 0, last = 0;

  async function boot() {
    say("Loading the island…", 30);
    let THREE;
    try { THREE = await import(THREE_URL); }
    catch (e) {
      news.innerHTML = "";
      const m = document.createElement("div"); m.className = "play__msg";
      m.textContent = "The 3D world couldn't load. Check your connection, or switch to Classic.";
      news.appendChild(m); newsT = 0;
      return;
    }
    if (document.fonts && document.fonts.ready) await document.fonts.ready.catch(() => {});
    W = makeWorld(THREE);
    ready = true;
    say(coarse ? "Drag on the left to walk. Jump twice to flip. Walk up to a board to see it" : "Walk with WASD or the arrows. Space jumps (twice to flip). Walk up to a board to see it", 5);
    if (!play.hidden) { running = false; resume(); }
  }

  function makeWorld(THREE) {
    const cv = $("#pCanvas");
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#cfe9f2");
    scene.fog = new THREE.Fog("#cfe9f2", 40, 95);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

    scene.add(new THREE.HemisphereLight("#ffffff", "#c9b48a", 1.6));
    const sun = new THREE.DirectionalLight("#fff4e0", 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);

    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
    const INK = "#2b1d33", ACCENT = "#F0481F", BLUE = "#33a8f0", GOLD = "#f2bf1d";
    const R = 34; // island radius

    // water, sand, grass
    const water = new THREE.Mesh(new THREE.CircleGeometry(160, 48), mat("#7cc8e8", { roughness: 0.3 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.6; scene.add(water);
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(R + 3, R + 5, 1.2, 64), mat("#f0d9a8"));
    sand.position.y = -0.75; // top sits below the grass so they never z-fight sand.receiveShadow = true; scene.add(sand);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.6, 0.6, 64), mat("#a8d86a"));
    grass.position.y = -0.3; grass.receiveShadow = true; scene.add(grass);
    // path ring linking the boards
    const path = new THREE.Mesh(new THREE.RingGeometry(16.6, 19.4, 64), mat("#f3e9cf"));
    path.rotation.x = -Math.PI / 2; path.position.y = 0.01; path.receiveShadow = true; scene.add(path);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(4, 40), mat("#f3e9cf"));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.012; plaza.receiveShadow = true; scene.add(plaza);

    const colliders = []; // {x, z, r}

    // trees and rocks, placed with a fixed seed so the island is the same every visit
    let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const BOARD_RING = 18;
    const boardAngle = (i) => -Math.PI / 2 + (i / PIECES.length) * Math.PI * 2;
    const boardSpot = (i) => ({ x: Math.cos(boardAngle(i)) * BOARD_RING, z: Math.sin(boardAngle(i)) * BOARD_RING });
    const clearOf = (x, z, d) => Math.hypot(x, z) > 7 && PIECES.every((_, i) => { const b = boardSpot(i); return Math.hypot(x - b.x, z - (b.z + 3)) > d; });
    for (let n = 0, tries = 0; n < 34 && tries < 500; tries++) {
      const a = rand() * Math.PI * 2, r = 8 + rand() * (R - 10), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!clearOf(x, z, 7) || (r > 15.5 && r < 20.5)) continue;
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 8), mat("#8a5a3c"));
      trunk.position.y = 0.8;
      const s = 0.8 + rand() * 0.7;
      const top = new THREE.Mesh(rand() < 0.5 ? new THREE.ConeGeometry(1.4 * s, 3 * s, 8) : new THREE.IcosahedronGeometry(1.3 * s, 0), mat(rand() < 0.5 ? "#5fae4c" : "#79c25a", { flatShading: true }));
      top.position.y = 1.6 + 1.2 * s;
      [trunk, top].forEach((m) => { m.castShadow = true; m.receiveShadow = true; t.add(m); });
      t.position.set(x, 0, z); t.rotation.y = rand() * 6; scene.add(t);
      colliders.push({ x, z, r: 0.7 });
      n++;
    }
    for (let n = 0; n < 12; n++) {
      const a = rand() * Math.PI * 2, r = 24 + rand() * 9, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!clearOf(x, z, 6)) continue;
      const s = 0.5 + rand() * 0.9;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat("#9aa3b8", { flatShading: true }));
      rock.position.set(x, s * 0.4, z); rock.castShadow = rock.receiveShadow = true; scene.add(rock);
      colliders.push({ x, z, r: s * 0.9 });
    }

    // billboards: all face the camera (+z) so they read from the fixed view
    const BW = 7, BH = 4.6, BY = 2.6;
    function boardTexture(p) {
      const c = document.createElement("canvas"); c.width = 1024; c.height = Math.round(1024 * BH / BW);
      const g = c.getContext("2d"), Wd = c.width, Hd = c.height;
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const paint = (im) => {
        g.fillStyle = "#fffaf0"; g.fillRect(0, 0, Wd, Hd);
        g.lineWidth = 14; g.strokeStyle = INK; g.strokeRect(7, 7, Wd - 14, Hd - 14);
        g.font = '700 30px "Space Mono",monospace'; const kind = p.kind.toUpperCase(); const tw = g.measureText(kind).width + 40;
        g.fillStyle = p.kind === "Project" ? ACCENT : BLUE; g.beginPath(); g.roundRect(36, 34, tw, 52, 26); g.fill();
        g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(kind, 56, 61);
        if (im) {
          const iw = Wd - 72, ih = 360, s = Math.max(iw / im.naturalWidth, ih / im.naturalHeight);
          const sw = iw / s, sh = ih / s;
          g.save(); g.beginPath(); g.roundRect(36, 106, iw, ih, 20); g.clip();
          g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 36, 106, iw, ih); g.restore();
          g.lineWidth = 5; g.beginPath(); g.roundRect(36, 106, iw, ih, 20); g.stroke();
          g.fillStyle = INK; g.textBaseline = "top"; g.font = '700 62px "Space Grotesk",system-ui'; g.fillText(p.title, 36, 492);
          g.fillStyle = "#6b5a73"; g.font = '700 26px "Space Mono",monospace'; g.fillText(p.tag.toUpperCase(), 40, 570);
        } else {
          g.textBaseline = "top"; g.font = "110px system-ui,'Apple Color Emoji','Segoe UI Emoji'"; g.fillText(p.icon, 36, 118);
          g.fillStyle = INK; g.font = '700 72px "Space Grotesk",system-ui'; g.fillText(p.title, 184, 128);
          g.fillStyle = "#6b5a73"; g.font = '700 26px "Space Mono",monospace'; g.fillText(p.tag.toUpperCase(), 188, 212);
          g.fillStyle = "#3a2e40"; g.font = '500 44px Inter,system-ui';
          (p.lines || []).forEach((l, i) => g.fillText("•  " + l, 48, 300 + i * 66));
        }
        tex.needsUpdate = true;
      };
      if (p.img) { const im = new Image(); im.onload = () => paint(im); im.src = p.img; paint(null); g.fillStyle = "#eee3c7"; g.fillRect(36, 106, Wd - 72, 360); tex.needsUpdate = true; }
      else paint(null);
      return tex;
    }
    const boards = PIECES.map((p, i) => {
      const { x, z } = boardSpot(i);
      const grp = new THREE.Group(); grp.position.set(x, 0, z);
      for (const px of [-BW / 2 + 0.8, BW / 2 - 0.8]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, BY + 0.2, 10), mat(INK));
        post.position.set(px, (BY + 0.2) / 2, -0.15); post.castShadow = true; grp.add(post);
        colliders.push({ x: x + px, z: z - 0.15, r: 0.35 });
      }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.3, BH + 0.3, 0.3), mat(INK));
      frame.position.set(0, BY + BH / 2, -0.2); frame.castShadow = true; grp.add(frame);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: boardTexture(p) }));
      face.position.set(0, BY + BH / 2, -0.04); grp.add(face);
      const glow = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.1, 40), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.03, 2.6); grp.add(glow);
      scene.add(grp);
      const fadeMats = [];
      grp.traverse((m) => { if (m.isMesh && m !== glow) { m.material = m.material.clone(); m.material.transparent = true; fadeMats.push(m.material); } });
      return { id: p.id, x, z, grp, glow, fadeMats, fade: 1, front: { x, z: z + 2.6 } };
    });

    // trampolines
    const tramps = [0.5, 2.5, 4.5].map((k) => {
      const a = boardAngle(0) + (k / PIECES.length) * Math.PI * 2, r = 11;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const grp = new THREE.Group(); grp.position.set(x, 0, z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.35, 24), mat(INK)); base.position.y = 0.18; base.castShadow = true;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.1, 24), mat(ACCENT)); pad.position.y = 0.4;
      grp.add(base, pad); scene.add(grp);
      return { x, z, pad, squish: 0 };
    });

    // coins: around the path, plus towers above the trampolines (reachable only by bouncing)
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20);
    const coinMat = mat(GOLD, { metalness: 0.3, roughness: 0.4, emissive: "#6b4a00", emissiveIntensity: 0.25 });
    const coins = [];
    const addCoin = (x, y, z, worth = 10) => {
      const m = new THREE.Mesh(coinGeo, coinMat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.castShadow = true;
      scene.add(m); coins.push({ m, worth, got: false, base: y });
    };
    PIECES.forEach((_, i) => { // arcs between boards along the path
      for (let s = 1; s <= 4; s++) {
        const a = boardAngle(i) + ((s / 5) * Math.PI * 2) / PIECES.length;
        addCoin(Math.cos(a) * 18, 0.9 + Math.sin((s / 5) * Math.PI) * 1.4, Math.sin(a) * 18);
      }
    });
    tramps.forEach((t) => { for (let s = 0; s < 4; s++) addCoin(t.x, 3 + s * 1.6, t.z, s === 3 ? 50 : 10); });
    for (let s = 0; s < 8; s++) { const a = (s / 8) * Math.PI * 2; addCoin(Math.cos(a) * 26, 0.9, Math.sin(a) * 26); }

    // the character: a blue blob with a beret, built from primitives
    const hero = new THREE.Group(); scene.add(hero);
    const body = new THREE.Group(); hero.add(body);
    const blob = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.55, 6, 16), mat(BLUE)); blob.position.y = 1.05; blob.castShadow = true;
    const eyeW = mat("#ffffff"), eyeB = mat(INK);
    const eyes = [-0.18, 0.18].map((ex) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), eyeW); e.position.set(ex, 1.3, 0.43); e.scale.z = 0.6;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), eyeB); p.position.set(ex, 1.3, 0.51);
      body.add(e, p); return e;
    });
    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.14, 20), mat(INK)); beret.position.set(-0.05, 1.68, -0.02); beret.rotation.z = 0.18;
    const nub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(INK)); nub.position.set(-0.05, 1.78, -0.02);
    const legs = [-0.2, 0.2].map((lx) => {
      const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), mat(INK)); l.position.set(lx, 0.32, 0); l.castShadow = true; body.add(l); return l;
    });
    body.add(blob, beret, nub);
    const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.18 }));
    shadowBlob.rotation.x = -Math.PI / 2; scene.add(shadowBlob);
    void eyes;

    // floating score labels (HTML, positioned from 3D)
    const pops = [];
    function pop(text, pos, big) {
      const el = document.createElement("div");
      el.className = "play__pop" + (big ? " is-big" : ""); el.textContent = text;
      play.appendChild(el);
      pops.push({ el, pos: pos ? new THREE.Vector3(pos.x, pos.y, pos.z) : hero.position.clone().add(new THREE.Vector3(0, 2.4, 0)), t: 1.1 });
    }

    // state
    const P = { pos: hero.position, vy: 0, vel: new THREE.Vector2(), grounded: true, jumps: 0, flip: 0, face: 0, walk: 0, squash: 0 };
    let near = null, seaT = 0;
    const SPAWN = new THREE.Vector3(0, 0, 3);
    hero.position.copy(SPAWN);

    function reset() {
      hero.position.copy(SPAWN); P.vy = 0; P.vel.set(0, 0); P.flip = 0; body.rotation.x = 0;
      coins.forEach((c) => { c.got = false; c.m.visible = true; });
    }
    function teleport(id) {
      const b = boards.find((b) => b.id === id);
      hero.position.set(b.front.x, 0, b.front.z + 1.5); P.vel.set(0, 0); P.vy = 0; P.face = Math.PI; hero.rotation.y = Math.PI;
      camPos.copy(hero.position).add(camOffset()); lookAt.set(hero.position.x, 1.5, hero.position.z - 3);
    }
    function boardPos(id) { const b = boards.find((b) => b.id === id); return { x: b.x, y: BY + BH + 0.8, z: b.z }; }

    // camera: fixed angle, follows the hero; narrow screens pull back
    const camPos = new THREE.Vector3();
    let aspect = 1;
    const camOffset = () => (aspect < 0.9 ? new THREE.Vector3(0, 15, 17) : new THREE.Vector3(0, 13, 15.5));
    camPos.copy(hero.position).add(camOffset());

    function fit() {
      const st = $("#pStage");
      const w = Math.max(280, st.clientWidth), h = Math.max(220, st.clientHeight - 6);
      const cw = Math.min(w, 1400), ch = Math.min(h, coarse && cw < 600 ? h : cw * 0.62);
      aspect = cw / ch;
      renderer.setSize(cw, ch, false);
      cv.style.width = cw + "px"; cv.style.height = ch + "px";
      camera.aspect = aspect; camera.fov = aspect < 0.9 ? 60 : 45; camera.updateProjectionMatrix();
    }

    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), lookAt = new THREE.Vector3(0, 1.5, 0);
    function update(dt, time) {
      // movement in screen space: up on screen = -z
      const inp = moveInput();
      const speed = 7, accel = P.grounded ? 40 : 18;
      P.vel.x += (inp.x * speed - P.vel.x) * Math.min(1, accel * dt / speed);
      P.vel.y += (inp.y * speed - P.vel.y) * Math.min(1, accel * dt / speed);
      const mv = Math.hypot(P.vel.x, P.vel.y);
      hero.position.x += P.vel.x * dt; hero.position.z += P.vel.y * dt;
      if (mv > 0.5) {
        const target = Math.atan2(P.vel.x, P.vel.y);
        let d = target - P.face; d = Math.atan2(Math.sin(d), Math.cos(d));
        P.face += d * Math.min(1, dt * 12); hero.rotation.y = P.face;
      }
      // collisions with trees, rocks, posts
      for (const c of colliders) {
        const dx = hero.position.x - c.x, dz = hero.position.z - c.z, d = Math.hypot(dx, dz), m = c.r + 0.45;
        if (d < m && d > 0.0001 && hero.position.y < 3) { hero.position.x = c.x + (dx / d) * m; hero.position.z = c.z + (dz / d) * m; }
      }
      // the sea edge
      const rr = Math.hypot(hero.position.x, hero.position.z);
      if (rr > R - 0.8) {
        hero.position.x *= (R - 0.8) / rr; hero.position.z *= (R - 0.8) / rr;
        if (time - seaT > 4) { seaT = time; sfx.splash(); say("The sea is cold. Back to the island"); }
      }

      // jumping: second jump is a flip worth +50 if it completes in the air
      if (jumpPressed) {
        jumpPressed = false;
        if (P.grounded) { P.vy = 10.5; P.grounded = false; P.jumps = 1; sfx.jump(); }
        else if (P.jumps === 1) { P.vy = 9.5; P.jumps = 2; P.flip = 0.0001; sfx.flip(); }
      }
      P.vy -= 28 * dt; hero.position.y += P.vy * dt;
      if (P.flip) {
        P.flip += dt * Math.PI * 2 / 0.5;
        body.rotation.x = P.flip;
        if (P.flip >= Math.PI * 2) { P.flip = 0; body.rotation.x = 0; addScore(50, "Flip! +50"); }
      }
      if (hero.position.y <= 0) {
        if (!P.grounded && P.vy < -12) P.squash = 0.3;
        hero.position.y = 0; P.vy = 0; P.grounded = true; P.jumps = 0;
        if (P.flip) { P.flip = 0; body.rotation.x = 0; } // landed mid-flip: no points
      }
      // trampolines
      for (const t of tramps) {
        if (Math.hypot(hero.position.x - t.x, hero.position.z - t.z) < 1.25 && hero.position.y < 0.5 && P.vy <= 0) {
          hero.position.y = 0.5; P.vy = 19; P.grounded = false; P.jumps = 1; t.squish = 1; sfx.boing(); addScore(20, "Boing +20");
        }
        t.squish = Math.max(0, t.squish - dt * 4); t.pad.position.y = 0.4 - t.squish * 0.15;
      }

      // walk cycle + squash
      P.walk += dt * mv * 2.2;
      const sw = P.grounded && mv > 0.5 ? Math.sin(P.walk) : 0;
      legs[0].rotation.x = sw * 0.6; legs[1].rotation.x = -sw * 0.6;
      body.position.y = reduce ? 0 : Math.abs(sw) * 0.06;
      P.squash *= Math.pow(0.002, dt);
      body.scale.set(1 + P.squash * 0.5, 1 - P.squash * 0.5, 1 + P.squash * 0.5);
      shadowBlob.position.set(hero.position.x, 0.02, hero.position.z);
      shadowBlob.scale.setScalar(Math.max(0.4, 1 - hero.position.y * 0.08));

      // coins
      for (const c of coins) {
        if (c.got) continue;
        c.m.rotation.z = reduce ? 0 : time * 3;
        c.m.position.y = c.base + (reduce ? 0 : Math.sin(time * 2 + c.m.position.x) * 0.12);
        tmp.copy(hero.position); tmp.y += 1;
        if (tmp.distanceTo(c.m.position) < 1.1) { c.got = true; c.m.visible = false; sfx.coin(); addScore(c.worth, `+${c.worth}`, c.m.position); }
      }

      // boards
      let n = null;
      for (const b of boards) {
        const d = Math.hypot(hero.position.x - b.front.x, hero.position.z - b.front.z);
        if (d < 3.4) n = b.id;
        const on = n === b.id;
        b.glow.material.opacity += ((on ? 0.9 : 0) - b.glow.material.opacity) * Math.min(1, dt * 8);
        // boards between the camera and the hero fade out so they never hide you
        const blocking = b.z > hero.position.z + 1.5 && b.z - hero.position.z < 16 && Math.abs(b.x - hero.position.x) < BW * 0.75;
        b.fade += ((blocking ? 0.18 : 1) - b.fade) * Math.min(1, dt * 6);
        for (const m of b.fadeMats) { m.opacity = b.fade; m.depthWrite = b.fade > 0.95; }
        b.grp.traverse((m) => { if (m.isMesh) m.castShadow = b.fade > 0.5 && m.geometry.type !== "PlaneGeometry" && m !== b.glow; });
      }
      if (n !== near) {
        near = n; W.near = n;
        if (n) { showRead(n); visit(n); }
        else if (news.firstChild && news.firstChild.classList.contains("play__read")) news.innerHTML = "";
      }

      // camera + sun follow
      // standing at a board: frame it so it reads (pulled back far enough to fit its width on phones)
      const nb = near && boards.find((b) => b.id === near);
      if (nb) {
        const dist = aspect < 0.9 ? 11.5 : 11;
        tmp.set(nb.x, BY + BH / 2 + 1.8, nb.z + dist);
        lookAt.lerp(tmp2.set(nb.x, BY + BH / 2 - (aspect < 0.9 ? 0.6 : 1.5), nb.z), Math.min(1, dt * 4)); // wide screens look lower so you stay in frame
      } else {
        tmp.copy(hero.position).add(camOffset());
        tmp.y += Math.max(0, hero.position.y) * -0.4; // don't chase every jump
        lookAt.lerp(tmp2.set(hero.position.x, 1.5 + hero.position.y * 0.5, hero.position.z - 3), Math.min(1, dt * 6));
      }
      camPos.lerp(tmp, Math.min(1, dt * (nb ? 3 : 4)));
      camera.position.copy(camPos);
      camera.lookAt(lookAt);
      sun.position.set(hero.position.x + 12, 22, hero.position.z + 8);
      sun.target.position.set(hero.position.x, 0, hero.position.z);
    }

    function render(dt) {
      renderer.render(scene, camera);
      // score pops follow their 3D point
      const r = cv.getBoundingClientRect(), pr = play.getBoundingClientRect();
      for (const p of pops) {
        p.t -= dt; p.pos.y += dt * 1.2;
        tmp.copy(p.pos).project(camera);
        p.el.style.transform = `translate(${r.left - pr.left + (tmp.x + 1) / 2 * r.width}px, ${r.top - pr.top + (1 - tmp.y) / 2 * r.height}px) translate(-50%,-50%)`;
        p.el.style.opacity = Math.min(1, p.t * 2);
      }
      for (const p of pops.filter((p) => p.t <= 0)) p.el.remove();
      pops.splice(0, pops.length, ...pops.filter((p) => p.t > 0));
    }

    return { fit, update, render, reset, teleport, boardPos, pop, near: null };
  }

  /* ---------- loop ---------- */
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.033, (t - last) / 1000 || 0); last = t;
    if (!paused()) W.update(dt, t / 1000);
    W.render(dt);
    if (newsT > 0 && (newsT -= dt) <= 0 && news.firstChild) news.firstChild.classList.add("is-out");
  }
  function resume() {
    if (running || !ready) return;
    running = true; W.fit(); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function pause() { running = false; cancelAnimationFrame(raf); clearInput(); }
  addEventListener("resize", () => { if (running) W.fit(); });
  document.addEventListener("visibilitychange", () => { if (play.hidden) return; document.hidden ? pause() : resume(); });

  // Start in the mode the visitor picked last time (Classic by default), or ?play
  const want = /[?&]play\b/.test(location.search) ? "play" : store.get("pj-mode") === "play" ? "play" : "classic";
  if (want === "play") setMode("play");
})();
