import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -170, y: -62, w: 340, d: 124, r: 9 };
const TRAY = { x: -112, y: -40, w: 236, d: 64, r: 3 };
const TRAY_Z = 4, TOP = 12;
const SLOTS = [0, 1, 2, 3].map((i) => TRAY.x + 26 + i * 46);
const CRATE_Y = -12;
const CRATE = (x) => ({ x: x - 16, y: CRATE_Y - 14, w: 32, d: 28, r: 0.8 });
const CRATE_H = 22;
const FACE = CRATE_Y + 14; // crate front face
const TOWER = { x: TRAY.x + TRAY.w - 38, y: TRAY.y + 6, w: 30, d: 20, r: 2 };
const TOWER_H = 44;
const DOCK = { x: -160, y: -34, w: 40, d: 50, r: 2 };
const NODE_CPU = 4, NODE_MEM = 8;
const BAR = { z0: TOP + 2.5, z1: TOP + CRATE_H - 2.5 }; // crate meter span
const POD_CPU_MAX = 2, POD_MEM_MAX = 6;
const NB = { z0: TOP + 6, z1: TOP + TOWER_H - 6 };

const C = scene({ width: 640, height: 380, elevation: 32, pad: 16, fit: [...k.boxCorners(PLATE, -17, 0), [TOWER.x, TOWER.y, TOP + TOWER_H + 4]] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect } = C;

function tray() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth([...k.corners(TRAY, 6), [TRAY.x + TRAY.w / 2, TRAY.y + 6], [TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d - 6]])) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(TRAY, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(TRAY, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  SLOTS.forEach((x) => {
    const seat = k.insetPlan(CRATE(x), -1.6);
    out.push(L(k.planOutline(seat, TOP, P, 2), { tone: "faint" }));
    out.push(D(k.corners(seat, 0).map(([px, py]) => at([px, py, TOP])), { size: 0.4, tone: "lo" }));
  });
  out.push(frontText(TRAY.x + 4, TRAY.y + TRAY.d, TRAY_Z + 2.2, "node-1 · allocatable 4 CPU · 8 GiB", { size: 2.8, tone: "mid" }));
  return out.join("");
}
function dock() {
  const out = [S(k.slabOf(DOCK, 0, 1.2, P, 2, 0.3), { tone: "lo" })];
  out.push(L(k.planOutline(k.insetPlan(DOCK, 2), 1.2, P, 2), { tone: "faint" }));
  out.push(topText(DOCK.x + 3, DOCK.y + DOCK.d - 3, 1.2, "Pending", { size: 3.2, tone: "mid" }));
  return out.join("");
}
// a pod crate built at x = 0 so it can move between dock and slots; meters live on its front face
function podCrate(i) {
  const out = [crate(CRATE(0), TOP, CRATE_H, { ribs: 6, doors: false })];
  out.push(topText(-14, CRATE_Y + 5, TOP + CRATE_H, "", { size: 4, tone: "hi", attrs: `data-pname="${i}"` }));
  out.push(topText(-14, CRATE_Y + 10.5, TOP + CRATE_H, "", { size: 2.9, tone: "mid", attrs: `data-pqos="${i}"` }));
  // meter frames: CPU on the left, memory on the right
  for (const [x0, label] of [[-12, "cpu"], [2, "mem"]]) {
    out.push(L(faceRect("y", FACE, x0, x0 + 8, BAR.z0, BAR.z1), { tone: "lo" }));
    out.push(frontText(x0 + 0.6, FACE, BAR.z0 - 1.6, label, { size: 1.9, tone: "lo" }));
  }
  out.push(`<path data-fill="${i}-cpu" class="rs-fill"/><path data-fill="${i}-mem" class="rs-fill"/>`);
  out.push(`<path data-req="${i}-cpu" class="rs-req"/><path data-req="${i}-mem" class="rs-req"/>`);
  out.push(`<path data-lim="${i}-cpu" class="rs-lim"/><path data-lim="${i}-mem" class="rs-lim"/>`);
  return `<g data-pod="${i}" style="opacity:0">${out.join("")}</g>`;
}
function tower() {
  const out = [housing(TOWER, TOP, TOWER_H, { seam: 0.12 })];
  const fy = TOWER.y + TOWER.d;
  for (const [x0, label] of [[TOWER.x + 4, "CPU"], [TOWER.x + 17, "MEM"]]) {
    out.push(L(faceRect("y", fy, x0, x0 + 9, NB.z0, NB.z1), { tone: "mid" }));
    out.push(frontText(x0 + 0.8, fy, NB.z0 - 2.4, label, { size: 2.4, tone: "mid" }));
  }
  out.push(`<path data-nused="cpu" class="rs-fill"/><path data-nused="mem" class="rs-fill"/><path data-nreq="cpu" class="rs-nreq"/><path data-nreq="mem" class="rs-nreq"/>`);
  out.push(topText(TOWER.x + 3, TOWER.y + 12, TOP + TOWER_H, "kubelet", { size: 3, tone: "mid" }));
  out.push(lampSvg(TOWER.x + TOWER.w - 4, TOWER.y + 5, TOP + TOWER_H, { r: 1.1, attr: "data-pressure", cls: "rs-alarm" }));
  return out.join("");
}

const MAXPODS = 6;
const body = [
  plate(PLATE, { ruler: false }),
  dock(),
  tray(),
  `<g data-part="pods">${Array.from({ length: MAXPODS }, (_, i) => podCrate(i)).join("")}</g>`,
  tower(),
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const SLOTS = ${JSON.stringify(SLOTS)}, DOCK = ${JSON.stringify(DOCK)}, TOWER = ${JSON.stringify(TOWER)}, TOP = ${TOP}, FACE = ${FACE};
const BAR = ${JSON.stringify(BAR)}, NB = ${JSON.stringify(NB)}, NODE_CPU = ${NODE_CPU}, NODE_MEM = ${NODE_MEM}, POD_CPU_MAX = ${POD_CPU_MAX}, POD_MEM_MAX = ${POD_MEM_MAX}, MAXPODS = ${MAXPODS};
const rect = (x0, x1, y, z0, z1) => "M" + at([x0, y, z0]).join(" ") + "L" + at([x1, y, z0]).join(" ") + "L" + at([x1, y, z1]).join(" ") + "L" + at([x0, y, z1]).join(" ") + "Z";
const hline = (x0, x1, y, z) => "M" + at([x0, y, z]).join(" ") + "L" + at([x1, y, z]).join(" ");
const podEl = Array.from({ length: MAXPODS }, (_, i) => $('[data-pod="' + i + '"]'));
const ui = { status: document.getElementById("rs-status"), rows: document.getElementById("rs-rows") };

// ---- model ----
const qosOf = (p) => (!p.req.cpu && !p.req.mem && !p.lim.cpu && !p.lim.mem ? "BestEffort" : p.lim.cpu && p.lim.mem && p.req.cpu === p.lim.cpu && p.req.mem === p.lim.mem ? "Guaranteed" : "Burstable");
let seq = 0;
const pods = [];
function makePod(name, req, lim, base) {
  const p = { id: seq++, name, req, lim, base, want: { ...base }, use: { cpu: 0, mem: base.mem * 0.6 }, state: "pending", slot: -1, t: 0, restarts: 0, burstUntil: 0, leak: 0, x: DOCK.x + DOCK.w / 2, el: null };
  p.qos = qosOf(p);
  pods.push(p);
  return p;
}
function seed() {
  pods.length = 0; seq = 0;
  makePod("web", { cpu: 1, mem: 2 }, { cpu: 1, mem: 2 }, { cpu: 0.6, mem: 1.4 });
  makePod("api", { cpu: 0.5, mem: 1 }, { cpu: 1, mem: 3 }, { cpu: 0.4, mem: 1.3 });
  makePod("batch", { cpu: 0, mem: 0 }, { cpu: 0, mem: 0 }, { cpu: 0.5, mem: 1.2 });
  pods.forEach((p, i) => { p.state = "running"; p.slot = i; p.x = SLOTS[i]; p.t = 9; });
}
seed();
let msg = "", clock = 0, pressure = 0;
const running = () => pods.filter((p) => p.state === "running" || p.state === "oom");
const requested = (k) => running().reduce((s, p) => s + (p.req[k] || 0), 0);
const used = (k) => running().reduce((s, p) => s + p.use[k], 0);
function schedule() {
  for (const p of pods.filter((q) => q.state === "pending")) {
    const free = SLOTS.findIndex((_, i) => !pods.some((q) => q.slot === i && q.state !== "pending" && q.state !== "gone"));
    const fits = requested("cpu") + (p.req.cpu || 0) <= NODE_CPU + 1e-9 && requested("mem") + (p.req.mem || 0) <= NODE_MEM + 1e-9;
    p.why = free < 0 ? "no free slot" : !fits ? "Insufficient " + (requested("cpu") + (p.req.cpu || 0) > NODE_CPU ? "cpu" : "memory") + " (by requests)" : "";
    if (free >= 0 && fits) { p.state = "running"; p.slot = free; p.t = 0; p.use = { cpu: 0, mem: p.base.mem * 0.5 }; }
    else break; // first-come, first-served in this small model
  }
}
function step(dt) {
  clock += dt;
  for (const p of pods) {
    p.t += dt;
    if (p.state === "oom") { if (p.t > 1.4) { p.state = "running"; p.t = 0; p.restarts++; p.use.mem = p.base.mem * 0.5; p.want = { ...p.base }; p.leak = 0; } continue; }
    if (p.state === "evicted") { if (p.t > 1.2) { p.state = "gone"; } continue; }
    if (p.state !== "running") continue;
    const wob = 0.08 * Math.sin(clock * 1.3 + p.id * 2);
    p.want.cpu = clock < p.burstUntil ? 1.8 : p.base.cpu + wob;
    if (p.leak) p.want.mem = Math.min(6, p.want.mem + p.leak * dt); else p.want.mem = p.base.mem + wob;
    // CPU above the limit is throttled; memory above the limit is OOM-killed
    p.throttled = p.lim.cpu ? p.want.cpu > p.lim.cpu : false;
    p.use.cpu = ease(p.use.cpu, p.lim.cpu ? Math.min(p.want.cpu, p.lim.cpu) : p.want.cpu, dt, 0.3);
    p.use.mem = ease(p.use.mem, p.want.mem, dt, 0.5);
    if (p.lim.mem && p.use.mem > p.lim.mem) { p.state = "oom"; p.t = 0; msg = p.name + " used more memory than its limit (" + p.lim.mem + " GiB): the kernel OOM-killed the container and the kubelet restarted it. The pod stays on the node; its restart count goes up."; }
  }
  // node memory pressure: the kubelet evicts by QoS, BestEffort first, then Burstable above its request
  const memUsed = used("mem");
  pressure = memUsed > NODE_MEM * 0.94 ? 1 : Math.max(0, pressure - dt);
  if (memUsed > NODE_MEM * 0.94) {
    const cands = running().filter((p) => p.state === "running");
    const rank = (p) => (p.qos === "BestEffort" ? 0 : p.qos === "Burstable" ? 1 : 2);
    cands.sort((a, b) => rank(a) - rank(b) || (b.use.mem - (b.req.mem || 0)) - (a.use.mem - (a.req.mem || 0)));
    const v = cands[0];
    if (v) { v.state = "evicted"; v.t = 0; msg = "Node memory pressure (" + memUsed.toFixed(1) + " of 8 GiB used): the kubelet evicted " + v.name + ", a " + v.qos + " pod, first. Its Deployment makes a replacement, which the scheduler places again."; }
  }
  // evicted pods come back as new pending pods (their Deployment recreates them)
  for (const p of pods.filter((q) => q.state === "gone")) { p.state = "pending"; p.slot = -1; p.leak = 0; p.want = { ...p.base }; p.use = { cpu: 0, mem: 0 }; p.x = DOCK.x + DOCK.w / 2; }
  schedule();
  for (const p of pods) { const tx = p.slot >= 0 ? SLOTS[p.slot] : DOCK.x + DOCK.w / 2; p.x = ease(p.x, tx, dt, 0.25); }
}
function addBig() {
  if (pods.length >= MAXPODS) { msg = "This demo holds at most six pods. Press Reset to start over."; return; }
  const p = makePod("cache-" + (pods.length - 2), { cpu: 2, mem: 4 }, { cpu: 2, mem: 4 }, { cpu: 0.3, mem: 1 });
  schedule();
  msg = p.state === "running"
    ? p.name + " requests 2 CPU and 4 GiB. The scheduler adds up requests, not usage: they fit, so it is placed."
    : p.name + " stays Pending: " + p.why + ". The node is mostly idle, but the scheduler only counts what pods have requested.";
}
const byName = (n) => pods.find((p) => p.name === n && p.state === "running");
function burst() { const p = byName("web"); if (p) { p.burstUntil = clock + 6; msg = "web wants 1.8 CPU but its limit is 1: the kernel throttles it at 1 CPU. It slows down, but nothing is killed."; } }
function spike() { const p = byName("api"); if (p) { p.leak = 1.2; p.want.mem = p.use.mem; msg = "api's memory climbs toward its 3 GiB limit..."; } }
function leak() { const p = byName("batch"); if (p) { p.leak = 1.6; p.want.mem = p.use.mem; msg = "batch has no limits (BestEffort) and its memory keeps growing, using the node's free memory..."; } }
function reset() { seed(); msg = ""; }

// ---- drawing ----
const meterX = { cpu: -12, mem: 2 };
function draw() {
  podEl.forEach((el, i) => {
    const p = pods[i];
    if (!p) { el.style.opacity = 0; el.style.visibility = "hidden"; return; }
    el.style.visibility = "";
    const fadeOut = p.state === "evicted" ? Math.max(0, 1 - p.t / 1.2) : 1;
    el.style.opacity = (p.state === "pending" ? 0.6 : p.state === "oom" ? 0.45 + 0.4 * Math.abs(Math.sin(p.t * 8)) : fadeOut).toFixed(2);
    const y = p.slot >= 0 ? 0 : (pods.filter((q) => q.state === "pending").indexOf(p)) * -0; // pending crates stack on the dock
    el.setAttribute("transform", translateAlong(P, [p.x, y, p.slot >= 0 ? 0 : -TOP + 1.2]));
    setText(el.querySelector("[data-pname]"), p.name);
    setText(el.querySelector("[data-pqos]"), p.qos);
    for (const r of ["cpu", "mem"]) {
      const max = r === "cpu" ? POD_CPU_MAX : POD_MEM_MAX;
      const z = (v) => BAR.z0 + (BAR.z1 - BAR.z0) * Math.min(1, v / max);
      const x0 = meterX[r] + 0.8, x1 = meterX[r] + 7.2;
      const f = el.querySelector('[data-fill="' + i + "-" + r + '"]');
      f.setAttribute("d", p.use[r] > 0.01 ? rect(x0, x1, FACE, BAR.z0, z(p.use[r])) : "");
      f.classList.toggle("is-hot", (r === "cpu" && p.throttled) || (r === "mem" && p.lim.mem && p.use.mem > p.lim.mem * 0.85) || (r === "mem" && !p.lim.mem && p.leak));
      el.querySelector('[data-req="' + i + "-" + r + '"]').setAttribute("d", p.req[r] ? hline(meterX[r], meterX[r] + 8, FACE, z(p.req[r])) : "");
      el.querySelector('[data-lim="' + i + "-" + r + '"]').setAttribute("d", p.lim[r] ? hline(meterX[r] - 1, meterX[r] + 9, FACE, z(p.lim[r])) : "");
    }
  });
  const fy = TOWER.y + TOWER.d;
  for (const [r, x0, cap] of [["cpu", TOWER.x + 4, NODE_CPU], ["mem", TOWER.x + 17, NODE_MEM]]) {
    const z = (v) => NB.z0 + (NB.z1 - NB.z0) * Math.min(1, v / cap);
    const u = used(r), q = requested(r);
    const f = $('[data-nused="' + r + '"]');
    f.setAttribute("d", rect(x0 + 1, x0 + 8, fy, NB.z0, z(u)));
    f.classList.toggle("is-hot", r === "mem" && u > cap * 0.85);
    $('[data-nreq="' + r + '"]').setAttribute("d", hline(x0 - 1.5, x0 + 10.5, fy, z(q)));
  }
  $("[data-pressure]").style.opacity = pressure > 0 ? 1 : 0.15;
  const pend = pods.filter((p) => p.state === "pending").length;
  say("requested " + requested("cpu").toFixed(1) + "/4 CPU, " + requested("mem").toFixed(0) + "/8 GiB · used " + used("mem").toFixed(1) + " GiB" + (pend ? " · " + pend + " pending" : ""));
  setText(ui.status, msg || "The scheduler places pods by their requests. Limits cap what a running container may use: CPU over the limit is throttled, memory over the limit is OOM-killed.");
  ui.status.dataset.tone = /OOM|evicted|Pending/.test(msg) ? "bad" : "";
  const fmt = (v) => (v ? String(v) : "–");
  const html = pods.map((p) => {
    const st = p.state === "running" ? (p.throttled ? "Running · CPU throttled" : "Running") : p.state === "oom" ? "OOMKilled → restarting" : p.state === "evicted" ? "Evicted" : "Pending" + (p.why ? ": " + p.why : "");
    const tone = p.state === "running" && !p.throttled ? "good" : "bad";
    return "<tr><td>" + p.name + "</td><td>" + p.qos + "</td><td>" + fmt(p.req.cpu) + " / " + fmt(p.lim.cpu) + " / " + p.use.cpu.toFixed(1) + "</td><td>" + fmt(p.req.mem) + " / " + fmt(p.lim.mem) + " / " + p.use.mem.toFixed(1) + "</td><td>" + p.restarts + "</td><td data-tone='" + tone + "'>" + st + "</td></tr>";
  }).join("");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
}

const A = animate({
  tick(dt) { step(dt); draw(); },
  tour: [{ hold: 3 }, { burst: 1 }, { hold: 7 }, { spike: 1 }, { hold: 7 }, { leak: 1 }, { hold: 8 }, { add: 1 }, { hold: 5 }, { add: 1 }, { hold: 7 }, { reset: 1 }],
  act(s) { if (s.burst) burst(); if (s.spike) spike(); if (s.leak) leak(); if (s.add) addBig(); if (s.reset) reset(); },
});
controls({ burst, spike, leak, add: addBig, reset }, A.takeOver);
draw();
`;

const controls = `<div class="lx-controls" role="group" aria-label="Resource controls">
  <button type="button" data-do="burst">CPU burst: web</button>
  <button type="button" data-do="spike" class="is-danger">Memory spike: api</button>
  <button type="button" data-do="leak" class="is-danger">Memory leak: batch</button>
  <button type="button" data-do="add">Add a pod: 2 CPU · 4 GiB</button>
  <button type="button" data-do="reset">Reset</button>
  <p class="lx-status" id="rs-status" aria-live="polite"></p>
</div>
<div class="lx-table-wrap"><table class="lx-table"><thead><tr><th>Pod</th><th>QoS class</th><th>CPU req / lim / use</th><th>Mem GiB req / lim / use</th><th>Restarts</th><th>State</th></tr></thead><tbody id="rs-rows"></tbody></table></div>
<pre class="lx-yaml"><b>resources:</b>            # api: Burstable (requests below limits)
  <b>requests:</b> { cpu: 500m, memory: 1Gi }   # what the scheduler reserves
  <b>limits:</b>   { cpu: "1",  memory: 3Gi }   # CPU above: throttled · memory above: OOMKilled
# Guaranteed: requests == limits for every container · BestEffort: no requests or limits at all</pre>`;

const css = `
.rs-fill { fill: var(--anatomy-mid); stroke: none; opacity: .9; }
.rs-fill.is-hot { fill: var(--anatomy-red); }
.rs-req { stroke: var(--anatomy-strong); stroke-width: 1; stroke-dasharray: 1.2 0.8; fill: none; }
.rs-lim { stroke: var(--anatomy-lit); stroke-width: 1.3; fill: none; }
.rs-nreq { stroke: var(--anatomy-lit); stroke-width: 1.3; fill: none; }
.rs-alarm .iso-top, .rs-alarm .iso-fill, .rs-alarm .iso-shade { fill: var(--anatomy-red); }
`;

writeLesson({
  slug: "resources",
  pageTitle: "Requests, Limits & QoS",
  fig: "Fig 10",
  title: "Requests, limits & QoS",
  hint: "Burst, spike, leak or add a pod below",
  readout: "requested 1.5/4 CPU, 3/8 GiB",
  width: 640,
  height: 380,
  label:
    "Requests, limits and QoS drawn as one node tray with four slots and a pending dock. Each pod crate carries a CPU and a memory meter on its front: a dashed tick at its request, a bright cap at its limit, and a fill for what it uses now. A meter tower on the node shows the sum of requests against what is actually used. The scheduler places pods by requests; CPU above a limit is throttled, memory above a limit is OOM-killed, and under memory pressure the kubelet evicts BestEffort pods first.",
  keys: [
    { mark: "dashed", label: "Dashed tick: the request, what the scheduler reserves" },
    { mark: "lit", label: "Bright cap: the limit; the node tower's bright line is the sum of requests" },
    { mark: "red", label: "Red fill: throttled CPU, memory near its limit, or a node under memory pressure" },
  ],
  caption:
    "Requests are what the scheduler reserves on a node; it places a pod only where the sum of requests still fits, whatever the node is really using, so a big pod can stay Pending on an idle node. Limits cap a running container: CPU above the limit is throttled, while memory above the limit gets the container OOM-killed and restarted. Requests and limits together set the QoS class: Guaranteed when they are equal, Burstable when requests are lower, BestEffort when there are none. When a node runs short of memory, the kubelet evicts BestEffort pods first, then Burstable pods using more than they requested, and Guaranteed pods last.",
  body,
  controls,
  css,
  live,
});
