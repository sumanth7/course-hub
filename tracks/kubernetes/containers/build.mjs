import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -190, y: -80, w: 380, d: 160, r: 9 };
// left: two machines on identical hardware
const VMH = { x: -180, y: -66, w: 74, d: 62, r: 3 };
const CTH = { x: -180, y: 6, w: 74, d: 62, r: 3 };
const HW = 6, OS = 5;
const VM_COLS = [-170, -147, -124];
const CT_GRID = [0, 1, 2, 3, 4, 5].map((i) => [-168 + (i % 3) * 23, 14 + Math.floor(i / 3) * 26]);
// right: Dockerfile, layer stack, registry, hosts
const DOCKER = { x: -84, y: -64, w: 44, d: 52, r: 1.5 };
const STACK = { x: -26, y: -58, w: 40, d: 32, r: 1.2 };
const LAYERS = ["FROM node:20-slim", "RUN npm ci", "COPY . /app", "CMD node app.js"];
const LAYER_H = 4;
const REG = { x: 40, y: -70, w: 140, d: 32, r: 3 };
const REG_H = 8;
const HOSTS = [{ x: -10 }, { x: 52 }, { x: 114 }].map((h) => ({ x: h.x, y: 4, w: 56, d: 48, r: 3 }));
const HOST_H = 8;

const C = scene({ width: 680, height: 400, elevation: 36, pad: 12, fit: [...k.boxCorners(PLATE, -17, 0), [STACK.x, STACK.y, 40]] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect } = C;

function base(pl, title) {
  const out = [housing(pl, 0, HW, { seam: 0.5 })];
  out.push(frontText(pl.x + 3, pl.y + pl.d, 1.6, title, { size: 2.8, tone: "mid" }));
  return out.join("");
}
function vmHost() {
  const out = [base(VMH, "same hardware · hypervisor")];
  const hv = k.insetPlan(VMH, 3);
  out.push(S(k.slabOf(hv, HW, 3, P, 2), { tone: "lo" }));
  VM_COLS.forEach((x, i) => {
    const os = { x, y: VMH.y + 6, w: 19, d: 50, r: 1 };
    out.push(`<g data-vm="${i}">${S(k.slabOf(os, HW + 3, 13, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(os, HW + 9, P, 2), { tone: "faint" }) })}${topText(os.x + 2, os.y + 8, HW + 16, "guest OS", { size: 2.5, tone: "mid" })}${S(k.slabOf({ x: os.x + 3, y: os.y + 22, w: 13, d: 20, r: 0.8 }, HW + 16, 5, P, 2), { tone: "hi", crease: "lo" })}${topText(os.x + 4, os.y + 34, HW + 21, "app", { size: 2.6, tone: "hi" })}${lampSvg(os.x + 9.5, os.y + 14, HW + 16, { r: 1, attr: `data-vml="${i}"` })}</g>`);
  });
  out.push(topText(VMH.x + 3, VMH.y + 4, HW, "VMs", { size: 3, tone: "hi" }));
  return out.join("");
}
function ctHost() {
  const out = [base(CTH, "same hardware · one kernel")];
  const os = k.insetPlan(CTH, 3);
  out.push(S(k.slabOf(os, HW, OS, P, 2, 0.4), { tone: "mid" }));
  out.push(frontText(os.x + 3, os.y + os.d, HW + 1.4, "host OS + container runtime", { size: 2.3, tone: "mid" }));
  CT_GRID.forEach(([x, y], i) => {
    const pl = { x, y, w: 18, d: 20, r: 0.6 };
    out.push(`<g data-ct="${i}">${crate(pl, HW + OS, 6, { ribs: 2, doors: false, lamp: [x + 13, y + 5], lampAttr: `data-ctl="${i}"` })}${topText(x + 2, y + 16, HW + OS + 6, "app", { size: 2.6, tone: "hi" })}</g>`);
  });
  out.push(topText(CTH.x + 3, CTH.y + 4, HW, "containers", { size: 3, tone: "hi" }));
  return out.join("");
}
function dockerfile() {
  const out = [S(k.slabOf(DOCKER, 0, 1.2, P, 2, 0.3), { tone: "lo" })];
  const sheet = k.insetPlan(DOCKER, 2);
  out.push(S(k.slabOf(sheet, 1.2, 0.5, P, 2), { tone: "hi", crease: "none" }));
  out.push(topText(sheet.x + 2, sheet.y + 6, 1.7, "Dockerfile", { size: 3.2, tone: "hi" }));
  LAYERS.forEach((l, i) => out.push(topText(sheet.x + 2, sheet.y + 14 + i * 8, 1.7, l, { size: 2.6, tone: i === 2 ? "hi" : "mid", attrs: `data-dl="${i}"` })));
  return out.join("");
}
function stack() {
  const out = [S(k.slabOf(k.insetPlan(STACK, -2), 0, 2, P, 2, 0.3), { tone: "lo" })];
  out.push(frontText(STACK.x - 1, STACK.y + STACK.d + 2, 0.4, "image: shop", { size: 2.6, tone: "mid" }));
  LAYERS.forEach((l, i) => {
    const pl = k.insetPlan(STACK, i * 1.5);
    out.push(`<g data-layer="${i}" style="opacity:0">${S(k.slabOf(pl, 2 + i * LAYER_H, LAYER_H - 0.4, P, 2, 0.3), { tone: i === 3 ? "hi" : "mid", crease: "lo" })}${frontText(pl.x + 1.5, pl.y + pl.d, 2 + i * LAYER_H + 0.9, l, { size: 2.3, tone: "hi" })}</g>`);
  });
  return out.join("");
}
function registry() {
  const out = [housing(REG, 0, REG_H, { seam: 0.5 })];
  out.push(frontText(REG.x + 3, REG.y + REG.d, 2, "registry · ghcr.io/acme/shop", { size: 2.8, tone: "mid" }));
  ["v1", "v2"].forEach((tag, i) => {
    const pl = { x: REG.x + 8 + i * 40, y: REG.y + 6, w: 30, d: 20, r: 1 };
    out.push(L(k.planOutline(k.insetPlan(pl, -1), REG_H, P, 2), { tone: "faint" }));
    out.push(`<g data-reg="${i}" style="opacity:0">${S(k.slabOf(pl, REG_H, 10, P, 2, 0.3), { tone: "mid", crease: "lo", inner: L(k.sideSeam(pl, REG_H + 2.5, P, 2) + k.sideSeam(pl, REG_H + 5, P, 2) + k.sideSeam(pl, REG_H + 7.5, P, 2), { tone: "lo" }) })}${topText(pl.x + 2, pl.y + 12, REG_H + 10, "shop:" + tag, { size: 3, tone: "hi" })}</g>`);
  });
  return out.join("");
}
function host(i) {
  const h = HOSTS[i];
  const out = [housing(h, 0, HOST_H, { seam: 0.5 })];
  out.push(frontText(h.x + 3, h.y + h.d, 2, `host-${i + 1}`, { size: 2.8, tone: "mid" }));
  out.push(lampSvg(h.x + h.w - 4, h.y + 4, HOST_H, { r: 1.1, attr: `data-hostl="${i}"` }));
  const pl = { x: h.x + 8, y: h.y + 10, w: 36, d: 28, r: 0.8 };
  out.push(`<g data-run="${i}" style="opacity:0">${crate(pl, HOST_H, 12, { ribs: 4, doors: false, lamp: [pl.x + pl.w - 4, pl.y + 4], lampAttr: `data-runl="${i}"` })}${topText(pl.x + 2, pl.y + 10, HOST_H + 12, "shop", { size: 3.4, tone: "hi" })}${topText(pl.x + 2, pl.y + 17, HOST_H + 12, "", { size: 2.6, tone: "mid", attrs: `data-runtag="${i}"` })}</g>`);
  return `<g data-host="${i}">${out.join("")}</g>`;
}

const body = [plate(PLATE, { ruler: false }), vmHost(), ctHost(), dockerfile(), stack(), registry(), `<g data-lane></g>`, [0, 1, 2].map(host).join("")].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const STACK = ${JSON.stringify(STACK)}, REG = ${JSON.stringify(REG)}, HOSTS = ${JSON.stringify(HOSTS)}, LAYERS = ${JSON.stringify(LAYERS)};
const ui = { status: document.getElementById("ct-status"), mode: document.getElementById("ct-mode"), boot: document.getElementById("ct-boot"), log: document.getElementById("ct-log") };
const lane = $("[data-lane]");
const net = packets({ speed: 110, layer: () => lane, onArrive: (d) => d.done && d.done() });

// ---- VMs vs containers ----
let bootT = -1;
function boot() { bootT = 0; msg = "Booting both: each VM starts a whole guest operating system (tens of seconds); a container is just a process on the host's kernel (well under a second)."; }

// ---- build, push, run ----
const img = { built: 0, layersShown: 0, building: false, buildQueue: [], tag: 0, pushed: [false, false], cached: 0 };
let msg = "", t = 0;
const hosts = [{ up: true, run: null }, { up: true, run: null }, { up: true, run: null }];
let declarative = true, want = 0, logLines = [];
const logIt = (s) => { logLines.unshift(s); logLines.length = Math.min(logLines.length, 5); };
function build() {
  if (img.building) return;
  const rebuild = img.built > 0;
  img.building = true;
  // a rebuild after a code change reuses the cached layers above which nothing changed
  img.buildQueue = rebuild ? [2, 3] : [0, 1, 2, 3];
  img.layersShown = rebuild ? 2 : 0;
  img.cached = rebuild ? 2 : 0;
  img.tag = rebuild ? 2 : 1;
  logIt("$ docker build -t shop:v" + img.tag + " ." + (rebuild ? "   # CACHED: FROM, RUN npm ci" : ""));
  msg = rebuild ? "Rebuilding after a code change: the first two layers are reused from cache; only COPY and the layers after it are rebuilt." : "Building: each Dockerfile instruction becomes a read-only layer stacked on the one before.";
  t = 0;
}
function push() {
  if (!img.built || img.building) return;
  const i = img.tag - 1;
  net.add([[STACK.x + 20, STACK.y + 16, 22], [STACK.x + 40, STACK.y + 16, 22], [REG.x + 23 + i * 40, REG.y + 16, 22]], { done: () => { img.pushed[i] = true; } });
  logIt("$ docker push ghcr.io/acme/shop:v" + img.tag);
  msg = "Pushing the image to a registry: any machine can now pull it by name and tag.";
}
function runAll() {
  const i = [1, 0].find((n) => img.pushed[n]);
  if (i === undefined) { msg = "Push an image first."; return; }
  want = 3;
  hosts.forEach((h, n) => { if (h.up && (!h.run || h.run.tag !== i + 1)) pull(n, i + 1); });
  logIt("$ " + (declarative ? "kubectl apply -f shop.yaml   # replicas: 3, image shop:v" + (i + 1) : "for h in host-1 host-2 host-3; do ssh $h docker run -d shop:v" + (i + 1) + "; done"));
}
function pull(n, tag) {
  const h = HOSTS[n];
  net.add([[REG.x + 23 + (tag - 1) * 40, REG.y + 26, 20], [h.x + 26, h.y + 20, 22]], { done: () => { if (hosts[n].up) hosts[n].run = { tag, t: 0 }; } });
}
function kill() {
  const n = hosts.findIndex((h) => h.up && h.run);
  if (n < 0) return;
  hosts[n].up = false; hosts[n].run = null;
  msg = declarative
    ? "host-" + (n + 1) + " died. The orchestrator compares desired state (3 running) with actual (2) and starts a replacement on a healthy host."
    : "host-" + (n + 1) + " died, and so did its container. Your script ran once and has finished: nothing notices, nothing restarts it.";
  logIt("# host-" + (n + 1) + " is down");
  setTimeout(() => { hosts[n].up = true; logIt("# host-" + (n + 1) + " is back (empty)"); }, 9000);
}
function step(dt) {
  t += dt;
  if (bootT >= 0) bootT += dt;
  if (img.building && t > 0.9) {
    t = 0;
    if (img.buildQueue.length) { img.buildQueue.shift(); img.layersShown++; }
    else { img.building = false; img.built = img.tag; logIt("Successfully tagged shop:v" + img.tag); }
  }
  hosts.forEach((h) => { if (h.run) h.run.t += dt; });
  // declarative: a controller keeps the number of running copies at the desired count
  if (declarative && want) {
    const running = hosts.filter((h) => h.up && h.run).length;
    const inFlight = net.list.filter((p) => !p.data.done || true).length;
    if (running < want && !inFlight) {
      const tag = Math.max(...hosts.map((h) => (h.run ? h.run.tag : 0)), 1);
      const free = hosts.findIndex((h) => h.up && !h.run);
      const target = free >= 0 ? free : hosts.findIndex((h) => h.up);
      if (target >= 0 && free >= 0) { pull(target, tag); logIt("# controller: 2/3 running, starting a replacement on host-" + (target + 1)); }
      else if (target >= 0 && !hosts[target].extra) { hosts[target].extra = true; logIt("# controller: 2/3 running, starting a second copy on host-" + (target + 1)); }
    }
    if (hosts.filter((h) => h.up && h.run).length + hosts.filter((h) => h.extra && h.up).length >= want) {}
  }
  net.step(dt);
}
function draw() {
  net.draw();
  [0, 1, 2].forEach((i) => {
    const on = bootT < 0 ? 1 : bootT > 5 + i * 0.8 ? 1 : 0;
    const blink = bootT >= 0 && !on ? 0.2 + 0.5 * Math.abs(Math.sin(bootT * 5 + i)) : on;
    $('[data-vml="' + i + '"]').style.opacity = blink;
  });
  [0, 1, 2, 3, 4, 5].forEach((i) => { $('[data-ctl="' + i + '"]').style.opacity = bootT < 0 ? 1 : bootT > 0.3 + i * 0.05 ? 1 : 0.15; });
  LAYERS.forEach((_, i) => {
    const g = $('[data-layer="' + i + '"]');
    g.style.opacity = i < img.layersShown ? 1 : img.building && i === img.layersShown ? Math.min(1, t / 0.9) * 0.6 : 0;
    g.classList.toggle("ct-cached", img.cached > i && img.building);
  });
  [0, 1].forEach((i) => ($('[data-reg="' + i + '"]').style.opacity = img.pushed[i] ? 1 : 0));
  hosts.forEach((h, n) => {
    $('[data-host="' + n + '"]').style.opacity = h.up ? 1 : 0.3;
    $('[data-hostl="' + n + '"]').style.opacity = h.up ? 1 : 0.1;
    const g = $('[data-run="' + n + '"]');
    g.style.opacity = h.run ? Math.min(1, h.run.t / 0.4) : 0;
    $('[data-runl="' + n + '"]').style.opacity = h.run && h.run.t > 0.4 ? 1 : 0.15;
    setText($('[data-runtag="' + n + '"]'), h.run ? "shop:v" + h.run.tag + (h.extra ? " ×2" : "") : "");
  });
  const running = hosts.filter((h) => h.up && h.run).length + hosts.filter((h) => h.extra && h.up && h.run).length;
  ui.mode.textContent = declarative ? "Mode: declarative (orchestrator)" : "Mode: imperative (a script)";
  ui.mode.setAttribute("aria-pressed", String(declarative));
  setText(ui.status, msg || "Build an image, push it, run it on three hosts, then kill a host in each mode.");
  ui.status.dataset.tone = /nothing restarts/.test(msg) ? "bad" : /replacement/.test(msg) ? "good" : "";
  setText(ui.log, logLines.join("\\n"));
  say((img.built ? "image shop:v" + img.built : "no image yet") + " · " + running + " running" + (want ? " of " + want : ""));
}

const A = animate({
  tick(dt) { step(dt); draw(); },
  tour: [
    { hold: 2 }, { boot: 1 }, { hold: 7 }, { build: 1 }, { until: () => !img.building, min: 1 }, { push: 1 }, { hold: 2 }, { run: 1 }, { hold: 4 },
    { kill: 1 }, { hold: 6 }, { mode: 1 }, { hold: 1 }, { run: 1 }, { hold: 4 }, { kill: 1 }, { hold: 8 }, { mode: 1 },
    { build: 1 }, { until: () => !img.building, min: 1 }, { push: 1 }, { hold: 2 }, { run: 1 }, { hold: 6 },
  ],
  act(s) { if (s.boot) boot(); if (s.build) build(); if (s.push) push(); if (s.run) runAll(); if (s.kill) kill(); if (s.mode) toggleMode(); },
});
function toggleMode() { declarative = !declarative; hosts.forEach((h) => (h.extra = false)); msg = declarative ? "Declarative: you state what should run (3 copies of shop), and a controller keeps making it true." : "Imperative: you run commands that do things once. Whatever happens afterwards is your problem."; }
controls({ boot, build, push, run: runAll, kill, mode: toggleMode }, A.takeOver);
draw();
`;

const controls = `<div class="lx-controls" role="group" aria-label="VMs and containers">
  <button type="button" data-do="boot" id="ct-boot">Boot both machines</button>
</div>
<div class="lx-controls" role="group" aria-label="Build, push, run">
  <button type="button" data-do="build">docker build</button>
  <button type="button" data-do="push">docker push</button>
  <button type="button" data-do="run">Run on 3 hosts</button>
  <button type="button" data-do="kill" class="is-danger">Kill a host</button>
  <button type="button" data-do="mode" id="ct-mode" aria-pressed="true">Mode: declarative (orchestrator)</button>
  <p class="lx-status" id="ct-status" aria-live="polite"></p>
</div>
<pre class="lx-yaml" id="ct-log" aria-live="polite"></pre>
<pre class="lx-yaml"><b>FROM</b> node:20-slim          # base layer: a minimal OS userland, not a kernel
<b>WORKDIR</b> /app
<b>COPY</b> package*.json ./
<b>RUN</b> npm ci                 # dependencies: cached until package.json changes
<b>COPY</b> . .                   # your code: changes often, so it comes late
<b>CMD</b> ["node", "app.js"]</pre>`;

writeLesson({
  slug: "containers",
  pageTitle: "Containers & Images",
  fig: "Fig 1",
  title: "Containers & images",
  hint: "Boot, build, push, run, then kill a host",
  readout: "no image yet · 0 running",
  width: 680,
  height: 400,
  label:
    "Containers and images. On the left, two machines on the same hardware: one runs three virtual machines, each with its own guest operating system under its app; the other runs six containers side by side on one host operating system and runtime. On the right, a Dockerfile sheet, an image built as a stack of four layers, a registry shelf holding tagged images, and three hosts that pull the image and run it as a container.",
  keys: [
    { mark: "raised", label: "Layers: each Dockerfile instruction adds a read-only layer; unchanged layers come from cache" },
    { mark: "lit", label: "Lamps: a VM or container that has finished starting" },
    { mark: "edge", label: "Dots: an image being pushed to the registry or pulled by a host" },
  ],
  caption:
    "A virtual machine carries a whole operating system, so it is heavy and slow to start. A container is an isolated process that shares the host's kernel, so it starts in moments and many fit on one machine. It runs from an image: read-only layers built from a Dockerfile, cached so a rebuild only redoes what changed, and pushed to a registry so any host can pull and run it. Running containers on many machines by hand is imperative and fragile: when a host dies, nothing brings its containers back. An orchestrator like Kubernetes is declarative: you state what should run, and it keeps making that true.",
  body,
  controls,
  css: `.ct-cached .iso-edge { stroke-dasharray: 2 1.2; } #ct-log { min-height: 6.5em; }`,
  live,
});
