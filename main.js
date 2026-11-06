// Shared by every page: nav, reveal, and the small "terminal" micro-interactions.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;

// Mobile nav toggle
const toggle = document.getElementById("navToggle");
const menu = document.getElementById("menu");
toggle.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

// Scroll-reveal
const items = document.querySelectorAll(".reveal");
if (reduce || !("IntersectionObserver" in window)) {
  items.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      const eb = e.target.matches(".eyebrow") ? e.target : e.target.querySelector(".eyebrow");
      if (eb) scramble(eb);
      io.unobserve(e.target);
    }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el) => io.observe(el));
}

// Text scramble: letters flicker through glyphs and settle left to right
const GLYPHS = "!<>-_\\/[]{}=+*^?#01";
function scramble(el, dur = 520) {
  if (reduce || el.dataset.busy) return;
  const text = el.dataset.text || (el.dataset.text = el.textContent);
  el.dataset.busy = "1";
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), done = Math.floor(k * text.length);
    el.textContent = text.slice(0, done) + text.slice(done).replace(/\S/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
    if (k < 1) requestAnimationFrame(step); else { el.textContent = text; delete el.dataset.busy; }
  };
  requestAnimationFrame(step);
}
if (finePointer) document.querySelectorAll(".nav__links a:not(.nav__cta), .backlink").forEach((a) => {
  const label = a.childElementCount ? null : a; // only plain-text links
  if (label) a.addEventListener("mouseenter", () => scramble(label, 380));
});

// Scroll progress bar
const bar = document.createElement("div");
bar.className = "progress"; bar.setAttribute("aria-hidden", "true");
document.body.appendChild(bar);

// Experience rail fills as you scroll; each node lights when the rail reaches it
const rail = document.querySelector(".timeline");
const roles = rail ? [...rail.querySelectorAll(".role")] : [];
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
  if (!rail) return;
  const r = rail.getBoundingClientRect(), mark = innerHeight * 0.6;
  const fill = Math.max(0, Math.min(1, (mark - r.top) / r.height));
  rail.style.setProperty("--fill", reduce ? 1 : fill.toFixed(4));
  roles.forEach((el) => el.classList.toggle("is-lit", reduce || el.getBoundingClientRect().top + 36 < mark));
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
onScroll();

// Cursor spotlight on panels
if (finePointer && !reduce) {
  document.querySelectorAll(".card, .role, .service, .quote-card").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });
}

// Hero: type the prompt, then rise the headline in word by word
const title = document.querySelector(".hero__title");
if (title && !title.closest(".hero--case")) {
  // wrap each word (keeping <br> and the accent span) so it can slide up out of a mask
  let i = 0;
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement("span"); w.className = "w";
          const s = document.createElement("span"); s.textContent = part; s.style.transitionDelay = `${120 + i++ * 70}ms`;
          w.appendChild(s); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") {
        const w = document.createElement("span"); w.className = "w";
        const s = document.createElement("span"); s.style.transitionDelay = `${120 + i++ * 70}ms`;
        n.replaceWith(w); s.appendChild(n); w.appendChild(s);
      }
    });
  };
  wrap(title);
  const prompt = document.querySelector(".hero__prompt");
  const typed = prompt && prompt.querySelector(".typed");
  const word = prompt ? Array.from(prompt.dataset.type) : []; // by character, so emoji stay whole
  const go = () => requestAnimationFrame(() => {
    title.classList.add("is-in");
    setTimeout(() => { title.classList.add("is-done"); designLayer(title); }, reduce ? 0 : 1300);
  });
  if (!typed || reduce) { if (typed) typed.textContent = word.join(""); go(); }
  else {
    let n = 0;
    const tick = () => { typed.textContent = word.slice(0, ++n).join(""); if (n < word.length) setTimeout(tick, 70 + Math.random() * 60); else setTimeout(go, 180); };
    setTimeout(tick, 350);
  }
}

// Footer: year + live local time in Ljubljana
document.getElementById("year").textContent = new Date().getFullYear();
const note = document.querySelector(".footer__note");
if (note) {
  const clock = document.createElement("span");
  clock.className = "footer__clock";
  note.textContent = "";
  note.appendChild(clock);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Ljubljana", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" });
  const tickClock = () => { clock.textContent = `Ljubljana ${fmt.format(new Date())}`; };
  tickClock(); setInterval(tickClock, 1000);
}

// Designer layer: a Figma-style selection around the accent word, with live
// dimensions, and a named multiplayer cursor that glides over to it.
function designLayer(title) {
  const word = title.querySelector("em.sel");
  const hero = title.closest(".hero");
  if (!word || !hero) return;
  const box = document.createElement("div");
  box.className = "sel-box"; box.setAttribute("aria-hidden", "true");
  box.innerHTML = "<i></i><i></i><i></i><i></i><b></b>";
  const cur = document.createElement("div");
  cur.className = "cursor"; cur.setAttribute("aria-hidden", "true");
  cur.innerHTML = '<svg viewBox="0 0 18 18"><path d="M2 1.5l13 6.2-5.6 1.6L7.2 15z" fill="#8FA8FF" stroke="#0B0D0E" stroke-width="1.2" stroke-linejoin="round"/></svg><span>Petra</span>';
  hero.append(box, cur);
  const place = (first) => {
    const h = hero.getBoundingClientRect(), pad = 6, rr = word.getBoundingClientRect();
    // the inline box includes the font's tall ascent/descent; trim it to the glyphs
    const r = { left: rr.left, right: rr.right, width: rr.width, top: rr.top + rr.height * 0.2, height: rr.height * 0.66 };
    r.bottom = r.top + r.height;
    Object.assign(box.style, { left: r.left - h.left - pad + "px", top: r.top - h.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
    box.querySelector("b").textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
    const x = r.right - h.left + pad + 4, y = r.bottom - h.top - 6;
    if (first && !reduce) {
      cur.style.transition = "none";
      cur.style.transform = `translate(${x + 220}px, ${y + 160}px)`;
      cur.getBoundingClientRect();
      cur.style.transition = "";
    }
    cur.style.transform = `translate(${x}px, ${y}px)`;
  };
  place(true);
  requestAnimationFrame(() => { cur.classList.add("is-on"); setTimeout(() => box.classList.add("is-on"), reduce ? 0 : 900); });
  addEventListener("resize", () => place(false));
  if (document.fonts) document.fonts.ready.then(() => place(false));
}
