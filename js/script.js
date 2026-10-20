/* runners */
const RUN = [
  ["  O  ",
   " /|\\_",
   " _/ \\"],
  ["  O  ",
   " <|\\ ",
   "  |\\ "],
  ["  O  ",
   " _|\\>",
   "  /\\_"],
  ["  O  ",
   " /|> ",
   "  /| "],
];
const HEADS = ["O", "o", "@", "Q", "0"];
const MIRROR = { "/": "\\", "\\": "/", "<": ">", ">": "<", "(": ")", ")": "(" };
const mirror = frame => frame.map(l => [...l].reverse().map(c => MIRROR[c] || c).join(""));

const RIDGE = [
  [0.00,.570],[0.04,.563],[0.08,.556],[0.12,.551],[0.16,.549],[0.20,.548],[0.24,.547],
  [0.28,.547],[0.32,.549],[0.36,.552],[0.40,.556],[0.44,.559],[0.48,.565],[0.52,.570],
  [0.56,.575],[0.60,.579],[0.64,.585],[0.68,.590],[0.72,.597],[0.76,.603],[0.80,.609],
  [0.84,.615],[0.88,.622],[0.92,.627],[0.96,.631],[1.00,.636]
];
function ridgeY(nx) {
  for (let i = 1; i < RIDGE.length; i++) {
    const [x1, y1] = RIDGE[i], [x0, y0] = RIDGE[i - 1];
    if (nx <= x1) return y0 + (y1 - y0) * (nx - x0) / (x1 - x0);
  }
  return RIDGE[RIDGE.length - 1][1];
}

const HERO_LANES = [
  { ny: nx => ridgeY(nx) + 0.012, size: 13, speed: 24 },
  { ny: nx => 0.705 + nx * 0.018, size: 20, speed: 40 },
  { ny: nx => 0.785 - nx * 0.010, size: 28, speed: 64 },
];

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function makeScene(layer, lanes, mapPoint, scaleFn) {
  const runners = [];

  function add(laneIndex, nx, dir) {
    const head = HEADS[Math.floor(Math.random() * HEADS.length)];
    let frames = RUN.map(f => f.map((l, i) => i === 0 ? l.replace("O", head) : l));
    if (dir < 0) frames = frames.map(mirror);
    const el = document.createElement("pre");
    el.className = "runner";
    layer.appendChild(el);
    runners.push({
      el, frames, dir, lane: laneIndex,
      nx,
      speedK: 0.8 + Math.random() * 0.45,
      phase: Math.random() * 4,
    });
  }

  function draw(r) {
    const lane = lanes[r.lane];
    const k = scaleFn();
    const p = mapPoint(r.nx, lane.ny(r.nx));
    const p2 = mapPoint(r.nx + 0.01, lane.ny(r.nx + 0.01));
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    const fs = lane.size * k;
    r.el.style.fontSize = fs + "px";
    r.el.textContent = r.frames[Math.floor(r.phase) % 4].join("\n");
    const w = r.el.offsetWidth, h = r.el.offsetHeight;
    r.el.style.transform =
      `translate(${p.x - w / 2}px, ${p.y - h}px) rotate(${angle}rad)`;
  }

  function step(dt) {
    const k = scaleFn();
    for (const r of runners) {
      const lane = lanes[r.lane];
      const pxPerSec = lane.speed * r.speedK * k;
      const width = mapPoint(1, 0).x - mapPoint(0, 0).x;
      r.nx += r.dir * pxPerSec * dt / width;
      r.phase += dt * pxPerSec / (fsStep(lane, k));
      if (r.nx > 1.06) r.nx = -0.06;
      if (r.nx < -0.06) r.nx = 1.06;
      draw(r);
    }
  }
  const fsStep = (lane, k) => lane.size * k * 1.6;

  return { add, step, drawAll: () => runners.forEach(draw), runners };
}

/* hero */
const hero = document.getElementById("hero");
const IMG_W = 2000, IMG_H = 1500;
let box = { s: 1, ox: 0, oy: 0 };
function measureHero() {
  const W = hero.clientWidth, H = hero.clientHeight;
  const s = Math.max(W / IMG_W, H / IMG_H);
  box = { s, ox: (W - IMG_W * s) * 0.5, oy: (H - IMG_H * s) * 1.0 };
  hero.style.top = Math.min(0, innerHeight - H) + "px";
}
const heroScene = makeScene(
  document.getElementById("heroLanes"),
  HERO_LANES,
  (nx, ny) => ({ x: box.ox + nx * IMG_W * box.s, y: box.oy + ny * IMG_H * box.s }),
  () => Math.max(0.75, (IMG_W * box.s) / 1600)
);

[[0, .15, 1], [0, .55, 1], [0, .82, -1],
 [1, .05, 1], [1, .42, 1], [1, .7, -1],
 [2, .25, 1], [2, .9, 1]].forEach(([l, x, d]) => heroScene.add(l, x, d));

document.getElementById("heroLanes").addEventListener("click", e => {
  const rect = hero.getBoundingClientRect();
  const nx = (e.clientX - rect.left - box.ox) / (IMG_W * box.s);
  const ny = (e.clientY - rect.top - box.oy) / (IMG_H * box.s);
  let best = 0, bestD = Infinity;
  HERO_LANES.forEach((lane, i) => { const d = Math.abs(lane.ny(nx) - ny); if (d < bestD) { bestD = d; best = i; } });
  if (ny < ridgeY(nx) - 0.03) return;
  heroScene.add(best, nx, Math.random() < .75 ? 1 : -1);
  heroScene.drawAll();
});

/* footer */
const footer = document.getElementById("footer");
document.getElementById("footerGround").textContent = "_.-~^~-._".repeat(80);
const footerScene = makeScene(
  document.getElementById("footerLanes"),
  [{ ny: () => (footer.clientHeight - 36) / footer.clientHeight, size: 16, speed: 70 }],
  (nx, ny) => ({ x: nx * footer.clientWidth, y: ny * footer.clientHeight }),
  () => 1
);
footerScene.add(0, .3, 1);
footerScene.add(0, .36, 1);

/* rain */
const rain = document.getElementById("rain");
const ctx = rain.getContext("2d");
const RAIN_COLOR = getComputedStyle(document.documentElement).getPropertyValue("--rain").trim();
const RAIN_FONT = '"JetBrains Mono", ui-monospace, monospace';
let streams = [], cell = 16;
const digit = () => String(Math.floor(Math.random() * 10));

function newStream(x, H, anywhere) {
  const len = 5 + Math.floor(Math.random() * 14);
  return {
    x, len,
    y: anywhere ? Math.random() * H : -Math.random() * H * 0.4,
    speed: 14 + Math.random() * 32,
    alpha: 0.35 + Math.random() * 0.65,
    chars: Array.from({ length: len }, digit),
  };
}
function setupRain() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = hero.clientWidth, H = hero.clientHeight;
  rain.width = W * dpr; rain.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cell = Math.round(16 * Math.max(0.75, (IMG_W * box.s) / 1600));
  streams = [];
  for (let x = 0; x < W; x += cell)
    if (Math.random() < 0.5) streams.push(newStream(x, H, true));
}
function stepRain(dt) {
  const W = hero.clientWidth, H = hero.clientHeight;
  const groundY = box.oy + 0.66 * IMG_H * box.s;
  ctx.clearRect(0, 0, W, H);
  ctx.font = `700 ${cell}px ${RAIN_FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillStyle = RAIN_COLOR;
  for (const st of streams) {
    st.y += st.speed * dt * (cell / 16);
    if (Math.random() < dt * 2) st.chars[Math.floor(Math.random() * st.len)] = digit();
    for (let i = 0; i < st.len; i++) {
      const y = st.y - i * cell;
      if (y < -cell || y > groundY) continue;
      ctx.globalAlpha = st.alpha * (1 - i / st.len);
      ctx.fillText(st.chars[i], st.x + cell / 2, y);
    }
    if (st.y - st.len * cell > groundY) Object.assign(st, newStream(st.x, H, false));
  }
  ctx.globalAlpha = 1;
}

/* loop */
measureHero();
setupRain();
addEventListener("resize", () => { measureHero(); setupRain(); stepRain(0); heroScene.drawAll(); footerScene.drawAll(); });

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (scrollY < hero.offsetHeight + innerHeight) {
    stepRain(dt);
    heroScene.step(dt);
  }
  footerScene.step(dt);
  requestAnimationFrame(tick);
}
document.fonts.ready.then(() => {
  heroScene.drawAll(); footerScene.drawAll(); stepRain(0);
  if (!reduceMotion) requestAnimationFrame(t => { last = t; tick(t); });
});
heroScene.drawAll(); footerScene.drawAll();

/* loader */
const loader = document.getElementById("loader");
const loaderBar = document.getElementById("loaderBar");
const loaderPct = document.getElementById("loaderPct");
const loaderRunner = document.getElementById("loaderRunner");

const heroImgs = [...document.querySelectorAll(".hero img")];
const total = heroImgs.length + 1;
let loaded = 0;
const oneMore = () => loaded++;
heroImgs.forEach(img => img.complete ? oneMore()
  : (img.addEventListener("load", oneMore), img.addEventListener("error", oneMore)));
document.fonts.ready.then(oneMore);

let shown = 0;
let loaderDone = false;
const startTime = performance.now();

function loaderLoop(now) {
  if (loaderDone) return;
  shown += (loaded / total - shown) * 0.08;
  const n = Math.round(shown * 20);
  loaderBar.textContent = "[" + "#".repeat(n) + ".".repeat(20 - n) + "]";
  loaderPct.textContent = Math.round(shown * 100);
  loaderRunner.textContent = RUN[Math.floor(now / 110) % 4].join("\n");
  loaderRunner.style.transform = `translateX(${n}ch)`;
  if (shown > 0.99 && now - startTime > 1200) return finishLoader();
  requestAnimationFrame(loaderLoop);
}

function finishLoader() {
  if (loaderDone) return;
  loaderDone = true;
  loader.classList.add("loader--done");
  loader.addEventListener("transitionend", () => loader.remove(), { once: true });
}

requestAnimationFrame(loaderLoop);
setTimeout(finishLoader, 6000);
