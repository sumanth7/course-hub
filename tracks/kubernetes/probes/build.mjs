import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../../site/kubernetes/probes");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 400;

// World layout (units ≈ px). x along the bench, y across, z up.
const PLATE = { x: -150, y: -62, w: 300, d: 132, r: 9 };
const PLATE_H = 12;
const FOOT_H = 5;

// one node: a long bench with three test stations
const BENCH = { x: -124, y: -40, w: 204, d: 60, r: 3 };
const BENCH_Z = 4;
const TOP = 12;
const STATIONS = [-90, -25, 40];
const NAMES = ["web-1", "web-2", "web-3"];
const CRATE = (cx) => ({ x: cx - 13, y: -25, w: 26, d: 30, r: 0.8 });
const CRATE_H = 18;
const CRATE_TOP = TOP + CRATE_H;
const TOWER = (cx) => ({ x: cx + 17, y: -30, w: 10, d: 10, r: 1.2 });
const TOWER_H = 40;
const ARM_Z = TOP + TOWER_H;
const ARM_H = 4;
const ARM = (cx) => ({ x: cx - 11, y: -27, w: 38, d: 7, r: 1 });
const PROBE_Y = -23.5;
const PROBES = ["S", "L", "R"];
const PROBE_DX = [-7, 0, 7];
const ROD_R = 0.9;
const REST_GAP = 3; // plunger tip rests this far above the lid

// the Service in front
const TRACK_Y = 39;
const GATE = { x: 98, y: 29, w: 24, d: 20, r: 2 };
const GATE_H = 16;
const PORT_Y = BENCH.y + BENCH.d + 1.8;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...STATIONS.map((cx) => [cx + 27, -30, ARM_Z + ARM_H + 2]), [STATIONS[0] - 11, -27, ARM_Z + ARM_H + 2]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 52 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth2 = ([x, y]) => k.depthOf([x, y, 0], P);
const byDepth = (points) => [...points].sort((a, b) => depth2(a) - depth2(b));
const faceRect = (axis, c, a0, a1, z0, z1) =>
  axis === "x"
    ? `M${at([c, a0, z0]).join(" ")}L${at([c, a1, z0]).join(" ")}L${at([c, a1, z1]).join(" ")}L${at([c, a0, z1]).join(" ")}Z`
    : `M${at([a0, c, z0]).join(" ")}L${at([a1, c, z0]).join(" ")}L${at([a1, c, z1]).join(" ")}L${at([a0, c, z1]).join(" ")}Z`;

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.8, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 9, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 9), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Service track and spurs to each station's port, inlaid
  for (const cx of STATIONS) {
    const spur = { x: cx - 2.4, y: PORT_Y - 0.5, w: 4.8, d: TRACK_Y - 3 - PORT_Y + 1.5, r: 0.8 };
    out.push(S(k.slabOf(spur, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(spur, 1.2), 0.6, P, 2), { tone: "faint" }));
  }
  const track = { x: STATIONS[0] - 4, y: TRACK_Y - 3, w: GATE.x + 1 - (STATIONS[0] - 4), d: 6, r: 1 };
  out.push(S(k.slabOf(track, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(track, 1.4), 0.6, P, 2), { tone: "faint" }));
  // ruler strip along the front
  const strip = { x: -110, y: PLATE.y + PLATE.d - 12, w: 196, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  // label plate, front left
  const label = { x: PLATE.x + 9, y: PLATE.y + PLATE.d - 20, w: 24, d: 12, r: 1 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
  [[3, 16], [3, 11], [3, 17]].forEach(([dx, len], i) => out.push(L(k.lineOnTop([label.x + dx, label.y + 3.6 + i * 2.4], [label.x + dx + len, label.y + 3.6 + i * 2.4], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2, label.y + 2, 0.8]), at([label.x + label.w - 2, label.y + label.d - 2, 0.8])], { size: 0.4 }));
  return out.join("");
}

// ---------- the node bench ----------
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth([...k.corners(BENCH, 7), [-25 + 32, BENCH.y + 7], [-25 + 32, BENCH.y + BENCH.d - 7]])) out.push(S(k.cylinder(x, y, 3.2, 0, BENCH_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(BENCH, BENCH_Z, TOP - BENCH_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BENCH, BENCH_Z + 2.2, P, 4), { tone: "faint" }) }));
  const fy = BENCH.y + BENCH.d;
  STATIONS.forEach((cx, i) => {
    // seat for the crate
    const seat = k.insetPlan(CRATE(cx), -2);
    out.push(L(k.planOutline(seat, TOP, P, 2), { tone: "faint" }));
    out.push(D(k.corners(seat, 0).map(([x, y]) => at([x, y, TOP])), { size: 0.4, tone: "lo" }));
    // port where the Service spur ends
    out.push(S(k.slabOf({ x: cx - 3, y: fy, w: 6, d: 1.8, r: 0.5 }, BENCH_Z + 0.8, 4.2, P, 2), { tone: "mid", crease: "none" }));
    // restart counter, engraved on the bench front
    out.push(k.faceTextSvg(k.sideMatrix([cx + 6, fy], BENCH_Z + 4.6, P, "left"), "restarts 0", { size: 2.8, tone: "mid" }).replace("<text ", `<text data-restarts="${i}" `));
  });
  out.push(k.faceTextSvg(k.topMatrix([BENCH.x + 3, fy - 3], TOP, P, "x"), "node-1 · kubelet", { size: 2.6, tone: "lo" }));
  return out.join("");
}

// ---------- a station ----------
function crate(cx, i) {
  const plan = CRATE(cx);
  const out = [];
  const x1 = plan.x + plan.w;
  const y1 = plan.y + plan.d;
  const ribs = [];
  for (let r = 1; r < 8; r++) ribs.push(k.segment([x1, plan.y + r * (plan.d / 8), TOP + 1.4], [x1, plan.y + r * (plan.d / 8), CRATE_TOP - 1.4], P));
  const doors = [-6, 0, 6].map((dx) => k.segment([cx + dx, y1, TOP + 1.4], [cx + dx, y1, CRATE_TOP - 1.4], P)).join("");
  const bands = k.sideSeam(plan, TOP + 1.4, P, 2) + k.sideSeam(plan, CRATE_TOP - 1.4, P, 2);
  out.push(S(k.slabOf(plan, TOP, CRATE_H, P, 2, 0.5), { tone: "hi", crease: "lo", inner: L(bands, { tone: "lo" }) + L(ribs.join(""), { tone: "faint" }) + L(doors, { tone: "lo" }) }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2), CRATE_TOP, P, 2), { tone: "faint" }));
  out.push(D(k.corners(plan, 1.3).map(([x, y]) => at([x, y, CRATE_TOP])), { size: 0.5, tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([cx - 10.5, plan.y + plan.d - 3.5], CRATE_TOP, P, "x"), NAMES[i], { size: 5, tone: "hi" }));
  // readiness lamp on the lid
  out.push(S(k.cylinder(cx + 8, plan.y + 13, 2.2, CRATE_TOP, 0.8, P, 16), { tone: "lo" }));
  out.push(`<g data-ready="${i}">${S(k.cylinder(cx + 8, plan.y + 13, 1.4, CRATE_TOP + 0.8, 1.4, P, 14), { tone: "hi", lit: true })}</g>`);
  return `<g data-crate="${i}" class="pb-crate">${out.join("")}</g>`;
}
function tower(cx, i) {
  const plan = TOWER(cx);
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(plan, -1.4), TOP, 2, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf(plan, TOP + 2, TOWER_H - 2, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, TOP + 10, P, 3), { tone: "faint" }) }));
  // failure counters on the +x face: a bar for the startup probe, three pips each for liveness and readiness
  const fx = plan.x + plan.w;
  const y0 = plan.y + 1.6, y1 = plan.y + plan.d - 1.6;
  out.push(L(faceRect("x", fx, y0, y1, ARM_Z - 6, ARM_Z - 4), { tone: "lo" }));
  out.push(`<path data-sbar="${i}" class="pb-bar" d=""/>`);
  for (const [row, z] of [["L", ARM_Z - 11], ["R", ARM_Z - 16]]) {
    [0, 1, 2].forEach((n) => {
      const [sx, sy] = at([fx, y0 + 1.4 + n * 2.6, z]);
      out.push(`<circle class="pb-pip" data-pip="${i}-${row}-${n}" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="0.95"/>`);
    });
  }
  out.push(k.faceTextSvg(k.sideMatrix([plan.x + 1.4, plan.y + plan.d], ARM_Z - 3.8, P, "left"), "S", { size: 2.4, tone: "mid" }));
  out.push(k.faceTextSvg(k.sideMatrix([plan.x + 1.4, plan.y + plan.d], ARM_Z - 9.6, P, "left"), "L", { size: 2.4, tone: "mid" }));
  out.push(k.faceTextSvg(k.sideMatrix([plan.x + 1.4, plan.y + plan.d], ARM_Z - 14.6, P, "left"), "R", { size: 2.4, tone: "mid" }));
  return out.join("");
}
const rodSvg = (x, tip) =>
  S(k.cylinder(x, PROBE_Y, ROD_R, tip + 1, ARM_Z - tip - 1, P, 14), { tone: "mid", crease: "none" }) +
  S(k.cylinder(x, PROBE_Y, 1.7, tip, 1, P, 16), { tone: "hi", crease: "lo" });
function arm(cx, i) {
  const plan = ARM(cx);
  const out = [];
  out.push(S(k.slabOf(plan, ARM_Z, ARM_H, P, 2, 0.5), { tone: "mid" }));
  PROBE_DX.forEach((dx, n) => {
    const x = cx + dx;
    out.push(k.faceTextSvg(k.sideMatrix([x - 0.9, plan.y + plan.d], ARM_Z + 1, P, "left"), PROBES[n], { size: 2.6, tone: "hi" }));
    out.push(S(k.cylinder(x, PROBE_Y, 1.6, ARM_Z + ARM_H, 0.6, P, 14), { tone: "lo" }));
    out.push(`<g data-res="${i}-${n}" class="pb-res">${S(k.cylinder(x, PROBE_Y, 1.05, ARM_Z + ARM_H + 0.6, 1, P, 12), { tone: "hi", lit: true })}</g>`);
  });
  out.push(D([at([plan.x + 2, plan.y + 3.5, ARM_Z + ARM_H]), at([plan.x + plan.w - 2, plan.y + 3.5, ARM_Z + ARM_H])], { size: 0.42 }));
  return out.join("");
}
function station(cx, i) {
  const rods = PROBE_DX.map((dx, n) => `<g data-rod="${i}-${n}">${rodSvg(cx + dx, CRATE_TOP + REST_GAP)}</g>`).join("");
  return crate(cx, i) + tower(cx, i) + rods + arm(cx, i);
}

// ---------- the Service gate ----------
function gate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(GATE, 0, GATE_H, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(GATE, -1.4), 0, 2, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf(GATE, 2, GATE_H - 2, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(GATE, 6, P, 3), { tone: "faint" }) }));
  const fx = GATE.x + GATE.w;
  const vents = [];
  for (let i = 0; i < 4; i++) vents.push(faceRect("x", fx, GATE.y + 4 + i * 3.4, GATE.y + 5.6 + i * 3.4, 8, 13));
  out.push(L(vents.join(""), { tone: "lo" }));
  out.push(L(k.planOutline({ x: GATE.x + 2, y: GATE.y + 2, w: 13, d: 5.4, r: 0.8 }, GATE_H, P, 2), { tone: "lo" }));
  for (const n of [0, 1, 2]) out.push(`<g data-ep="${n}" style="opacity:.15">${S(k.cylinder(GATE.x + 4.6 + n * 4, GATE.y + 4.7, 1.2, GATE_H, 0.9, P, 12), { tone: "hi", lit: true, crease: "none" })}</g>`);
  out.push(k.faceTextSvg(k.topMatrix([GATE.x + 2.4, GATE.y + 13], GATE_H, P, "x"), "svc/web", { size: 2.8, tone: "mid" }));
  out.push(D(k.corners(GATE, 1.4).map(([x, y]) => at([x, y, GATE_H])), { size: 0.42 }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Health probes drawn as a test bench. Three pod crates, web-1 to web-3, stand on one node. Above each, an arm holds three plungers, the startup, liveness and readiness probes, that tap the crate every period and light a result lamp. A tower beside each crate counts consecutive failures. A crate's lamp is lit while it is ready, and the Service in front sends requests only to ready crates. When liveness fails three times the kubelet restarts the container, and the restart counter on the bench goes up.",
  body: [
    plate(),
    bench(),
    STATIONS.map((cx, i) => station(cx, i)).join(""),
    `<g data-part="packets"></g>`,
    gate(),
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const STATIONS = ${JSON.stringify(STATIONS)}, NAMES = ${JSON.stringify(NAMES)};
const PROBE_DX = ${JSON.stringify(PROBE_DX)}, PROBE_Y = ${PROBE_Y}, ROD_R = ${ROD_R}, ARM_Z = ${ARM_Z}, CRATE_TOP = ${CRATE_TOP}, REST_GAP = ${REST_GAP};
const TOWER = ${JSON.stringify(STATIONS.map(TOWER))}, BAR_Z = [ARM_Z - 6, ARM_Z - 4];
const TRACK_Y = ${TRACK_Y}, GATE_X = ${GATE.x}, PORT_Y = ${PORT_Y};
const rodSvg = ${rodSvg.toString().replace(/k\./g, "")};
const S = (paths, style) => solidSvg(paths, style);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (q) => svg.querySelector(q);
const at = (p) => iso(p, P);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const el = {
  rods: STATIONS.map((_, i) => PROBE_DX.map((_, n) => $('[data-rod="' + i + '-' + n + '"]'))),
  res: STATIONS.map((_, i) => PROBE_DX.map((_, n) => $('[data-res="' + i + '-' + n + '"]'))),
  pips: STATIONS.map((_, i) => ({ L: [0, 1, 2].map((n) => $('[data-pip="' + i + '-L-' + n + '"]')), R: [0, 1, 2].map((n) => $('[data-pip="' + i + '-R-' + n + '"]')) })),
  bar: STATIONS.map((_, i) => $('[data-sbar="' + i + '"]')),
  ready: STATIONS.map((_, i) => $('[data-ready="' + i + '"]')),
  crate: STATIONS.map((_, i) => $('[data-crate="' + i + '"]')),
  restarts: STATIONS.map((_, i) => $('[data-restarts="' + i + '"]')),
  eps: [0, 1, 2].map((n) => $('[data-ep="' + n + '"]')),
  packets: $('[data-part="packets"]'),
};
const ui = {
  hang: document.getElementById("pb-hang"), busy: document.getElementById("pb-busy"), slow: document.getElementById("pb-slow"),
  startup: document.getElementById("pb-startup"), rows: STATIONS.map((_, i) => document.getElementById("pb-row-" + i)),
};

// ---- the model: what the kubelet does, one probe per period ----
const PERIOD = 1, LIVE_FAIL = 3, READY_FAIL = 3, STARTUP_FAIL = 10, LIVE_DELAY = 1;
const NORMAL_START = 1.5, SLOW_START = 6, OVERLOAD_FOR = 7, KILL_FOR = 0.8;
const spec = { startup: true };
const pods = STATIONS.map((_, i) => ({
  i, appUp: true, startIn: 0, slow: false, hung: false, busyUntil: 0,
  phase: "running", phaseT: 0, restarts: 0, lastRestart: -99, backoff: 0,
  started: true, ready: true, fails: { S: 0, L: 0, R: 0 }, clock: i / 3, since: 9,
  tap: [0, 0, 0], flash: [null, null, null],
}));
let now = 0;
function startContainer(p) {
  p.phase = "running"; p.phaseT = 0; p.since = 0;
  p.appUp = false; p.startIn = p.slow ? SLOW_START : NORMAL_START;
  p.hung = false; p.busyUntil = 0;
  p.started = !spec.startup; p.ready = false;
  p.fails = { S: 0, L: 0, R: 0 };
}
function kill(p) {
  p.restarts++;
  // CrashLoopBackOff: restarts in quick succession wait longer each time
  p.backoff = now - p.lastRestart < 12 ? Math.min(8, Math.max(2, p.backoff * 2 || 2)) : 0;
  p.lastRestart = now;
  p.phase = "killed"; p.phaseT = 0; p.appUp = false; p.ready = false; p.started = false;
}
function probe(p, n, pass) {
  const name = ["S", "L", "R"][n];
  p.tap[n] = 1;
  p.flash[n] = { pass, t: 0 };
  if (pass) p.fails[name] = 0; else p.fails[name]++;
}
function runProbes(p) {
  const healthy = p.appUp && !p.hung;
  if (spec.startup && !p.started) {
    probe(p, 0, p.appUp);
    if (p.appUp) p.started = true;
    else if (p.fails.S >= STARTUP_FAIL) kill(p);
    return; // liveness and readiness wait for the startup probe
  }
  if (p.since >= LIVE_DELAY) {
    probe(p, 1, healthy);
    if (p.fails.L >= LIVE_FAIL) { kill(p); return; }
  }
  const ok = healthy && now >= p.busyUntil;
  probe(p, 2, ok);
  if (ok) p.ready = true; else if (p.fails.R >= READY_FAIL) p.ready = false;
}
function step(dt) {
  now += dt;
  for (const p of pods) {
    p.tap = p.tap.map((t) => Math.max(0, t - dt * 5));
    p.flash.forEach((f) => { if (f) f.t += dt; });
    p.phaseT += dt;
    if (p.phase === "killed") {
      if (p.phaseT >= KILL_FOR) { p.phase = "backoff"; p.phaseT = 0; }
      continue;
    }
    if (p.phase === "backoff") {
      if (p.phaseT >= p.backoff) startContainer(p);
      continue;
    }
    p.since += dt;
    if (!p.appUp) { p.startIn -= dt; if (p.startIn <= 0) p.appUp = true; }
    p.clock += dt;
    if (p.clock >= PERIOD) { p.clock -= PERIOD; runProbes(p); }
  }
}

// ---- actions ----
function hang(i) { const p = pods[i]; if (p.phase === "running" && p.appUp) p.hung = true; }
function overload(i) { const p = pods[i]; if (p.phase === "running" && p.appUp) p.busyUntil = now + OVERLOAD_FOR; }
function slowRestart(i) { const p = pods[i]; p.slow = true; kill(p); p.restarts = 0; p.lastRestart = -99; p.backoff = 0; } // a fresh pod, so its restart count starts at 0
function setStartup(on) { spec.startup = on; }

// ---- Service traffic: requests only to ready pods ----
const NS = "http://www.w3.org/2000/svg";
const packets = [];
let rr = 0, spawnIn = 0;
const SPEED = 120, GAP = 0.4;
function stepPackets(dt, calm) {
  const eps = pods.filter((p) => p.ready).map((p) => p.i);
  spawnIn -= dt;
  if (!calm && eps.length && spawnIn <= 0) {
    spawnIn = GAP;
    const i = eps[rr++ % eps.length];
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("r", "1.7"); c.setAttribute("class", "pb-packet");
    el.packets.appendChild(c);
    const pts = [[GATE_X + 4, TRACK_Y, 1.9], [STATIONS[i], TRACK_Y, 1.9], [STATIONS[i], PORT_Y, 1.9]];
    packets.push({ i, pts, s: 0, total: GATE_X + 4 - STATIONS[i] + TRACK_Y - PORT_Y, c });
  }
  for (let n = packets.length - 1; n >= 0; n--) {
    const q = packets[n];
    q.s += SPEED * dt;
    if (q.s >= q.total) {
      const solid = el.crate[q.i].querySelector(".iso-solid");
      if (pods[q.i].ready && solid) { solid.setAttribute("data-lit", ""); clearTimeout(solid.__t); solid.__t = setTimeout(() => solid.removeAttribute("data-lit"), 200); }
      q.c.remove(); packets.splice(n, 1);
    }
  }
}
function placePacket(q) {
  const run = q.pts[0][0] - q.pts[1][0];
  const x = q.s < run ? q.pts[0][0] - q.s : q.pts[1][0];
  const y = q.s < run ? TRACK_Y : TRACK_Y - (q.s - run);
  const [sx, sy] = at([x, y, 1.9]);
  q.c.setAttribute("cx", sx.toFixed(1)); q.c.setAttribute("cy", sy.toFixed(1));
  q.c.style.opacity = Math.min(1, q.s / 6).toFixed(2);
}

// ---- drawing ----
const barPath = (i, frac) => {
  const t = TOWER[i], fx = t.x + t.w, y0 = t.y + 1.6, y1 = y0 + (t.d - 3.2) * frac;
  if (frac <= 0.001) return "";
  return "M" + at([fx, y0, BAR_Z[0]]).join(" ") + "L" + at([fx, y1, BAR_Z[0]]).join(" ") + "L" + at([fx, y1, BAR_Z[1]]).join(" ") + "L" + at([fx, y0, BAR_Z[1]]).join(" ") + "Z";
};
const label = (p) => {
  if (p.phase === "killed") return "killed by kubelet";
  if (p.phase === "backoff") return p.backoff ? "CrashLoopBackOff (" + Math.ceil(p.backoff - p.phaseT) + "s)" : "restarting";
  if (!p.appUp) return spec.startup && !p.started ? "starting · startup probe waiting" : "starting";
  if (p.hung) return "hung · liveness failing";
  if (now < p.busyUntil) return p.ready ? "overloaded · readiness failing" : "overloaded · out of Service";
  return p.ready ? "Ready" : "running · not ready yet";
};
function draw() {
  pods.forEach((p, i) => {
    PROBE_DX.forEach((dx, n) => {
      const tip = CRATE_TOP + REST_GAP * (1 - p.tap[n]) + 0.05;
      el.rods[i][n].innerHTML = rodSvg(STATIONS[i] + dx, tip);
      const f = p.flash[n];
      const r = el.res[i][n];
      const on = f && f.t < 0.45;
      r.style.opacity = on ? 1 : 0.18;
      r.classList.toggle("is-fail", !!(on && !f.pass));
    });
    ["L", "R"].forEach((row) => el.pips[i][row].forEach((c, n) => c.classList.toggle("is-on", p.fails[row] > n)));
    const sfrac = spec.startup && !p.started && p.phase === "running" ? p.fails.S / STARTUP_FAIL : 0;
    el.bar[i].setAttribute("d", barPath(i, sfrac));
    el.ready[i].style.opacity = p.ready ? 1 : 0.1;
    const gone = p.phase !== "running";
    el.crate[i].style.opacity = gone ? (p.phase === "killed" ? Math.max(0.15, 1 - p.phaseT / 0.4) : 0.25) : !p.appUp ? 0.6 + 0.4 * Math.min(1, p.since / 0.4) : 1;
    el.crate[i].classList.toggle("is-hung", p.hung);
    const t = "restarts " + p.restarts;
    if (el.restarts[i].textContent !== t) el.restarts[i].textContent = t;
    el.eps[i].style.opacity = p.ready ? 1 : 0.15;
    const row = ui.rows[i];
    const cells = [label(p), "S " + (spec.startup ? (p.started ? "passed" : p.fails.S + "/" + STARTUP_FAIL) : "off"), "L " + p.fails.L + "/" + LIVE_FAIL, "R " + p.fails.R + "/" + READY_FAIL, String(p.restarts)];
    cells.forEach((v, c) => { if (row.children[c + 1].textContent !== v) row.children[c + 1].textContent = v; });
    row.dataset.state = p.phase !== "running" ? "down" : p.hung || now < p.busyUntil ? "warn" : p.ready ? "ready" : "notready";
  });
  packets.forEach(placePacket);
  ui.startup.textContent = "startupProbe: " + (spec.startup ? "on" : "off");
  ui.startup.setAttribute("aria-pressed", String(spec.startup));
  const ready = pods.filter((p) => p.ready).length;
  const restarts = pods.reduce((s, p) => s + p.restarts, 0);
  const text = ready + "/3 ready · " + restarts + " restart" + (restarts === 1 ? "" : "s");
  if (readout.textContent !== text) readout.textContent = text;
}

// ---- idle tour ----
const TOUR = [
  { hold: 3 }, { busy: 1 }, { hold: 8 },
  { hang: 0 }, { hold: 8 },
  { startup: false }, { slow: 2 }, { hold: 16 },
  { startup: true }, { hold: 11 }, { fast: 2 }, { hold: 4 },
];
let touring = true, tourAt = 0, tourWait = 0, idleTimer = 0;
function tour(dt) {
  const s = TOUR[tourAt];
  if (s.hold !== undefined) { tourWait += dt; if (tourWait < s.hold) return; tourWait = 0; }
  else if (s.busy !== undefined) overload(s.busy);
  else if (s.hang !== undefined) hang(s.hang);
  else if (s.slow !== undefined) slowRestart(s.slow);
  else if (s.fast !== undefined) pods[s.fast].slow = false;
  else if (s.startup !== undefined) setStartup(s.startup);
  tourAt = (tourAt + 1) % TOUR.length;
}

let frame = 0, last = 0, visible = false;
function tick(t) {
  const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 1 / 60;
  last = t;
  const calm = still.matches;
  if (touring) tour(dt);
  step(dt);
  stepPackets(dt, calm);
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const takeOver = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; tourAt = 0; tourWait = 0; run(); }, 30000); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
ui.hang.addEventListener("click", () => { hang(0); takeOver(); });
ui.busy.addEventListener("click", () => { overload(1); takeOver(); });
ui.slow.addEventListener("click", () => { slowRestart(2); takeOver(); });
ui.startup.addEventListener("click", () => { setStartup(!spec.startup); takeOver(); });
draw();
`;

const css = `<style>
.pb-packet { fill: var(--anatomy-lit); stroke: var(--anatomy-paper); stroke-width: .6; }
.pb-crate { transition: opacity .25s ease; }
.pb-crate .iso-solid[data-lit] > .iso-edge { stroke: var(--anatomy-lit); }
.pb-res.is-fail .iso-top, .pb-res.is-fail .iso-fill, .pb-res.is-fail .iso-shade { fill: var(--anatomy-red); }
.pb-res.is-fail .iso-edge { stroke: var(--anatomy-red); }
.pb-pip { fill: var(--anatomy-paper); stroke: var(--anatomy-lo); stroke-width: .5; }
.pb-pip.is-on { fill: var(--anatomy-red); stroke: var(--anatomy-red); }
.pb-bar { fill: var(--anatomy-red); stroke: none; opacity: .85; }
.pb-controls { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-top: 14px; font: 500 12px/1 var(--anatomy-mono); }
.pb-controls button { font: inherit; color: var(--anatomy-strong); background: var(--anatomy-card); border: 1px solid var(--anatomy-muted); border-radius: 999px; padding: 9px 13px; cursor: pointer; }
.pb-controls button:hover { border-color: var(--anatomy-strong); }
.pb-controls button:focus-visible { outline: 2px solid var(--anatomy-strong); outline-offset: 2px; }
.pb-controls button[aria-pressed="true"] { border-color: var(--anatomy-green); color: var(--anatomy-green); }
.pb-table-wrap { overflow-x: auto; margin-top: 12px; }
.pb-table { width: 100%; border-collapse: collapse; font: 400 12px/1.4 var(--anatomy-mono); font-variant-numeric: tabular-nums; color: var(--anatomy-text); }
.pb-table th, .pb-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--anatomy-faint); white-space: nowrap; }
.pb-table th { color: var(--anatomy-muted); font-weight: 500; }
.pb-table tr[data-state="ready"] td:nth-child(2) { color: var(--anatomy-green); }
.pb-table tr[data-state="down"] td:nth-child(2), .pb-table tr[data-state="warn"] td:nth-child(2) { color: var(--anatomy-red); }
.pb-table td:first-child { color: var(--anatomy-strong); }
</style>`;

const rows = NAMES.map((n, i) => `<tr id="pb-row-${i}"><td>${n}</td><td>Ready</td><td>S passed</td><td>L 0/3</td><td>R 0/3</td><td>0</td></tr>`).join("");
const controls = `<div class="pb-controls" role="group" aria-label="Break a pod">
  <button type="button" id="pb-busy">Overload web-2</button>
  <button type="button" id="pb-hang">Hang web-1</button>
  <button type="button" id="pb-slow">Restart web-3 with a 6 s start</button>
  <button type="button" id="pb-startup" aria-pressed="true">startupProbe: on</button>
</div>
<div class="pb-table-wrap"><table class="pb-table"><thead><tr><th>Pod</th><th>State</th><th>Startup</th><th>Liveness</th><th>Readiness</th><th>Restarts</th></tr></thead><tbody>${rows}</tbody></table></div>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 9",
    title: "Health probes",
    hint: "Break a pod with the buttons below",
    readout: "3/3 ready · 0 restarts",
    keys: [
      { mark: "lit", label: "Crate lamp: lit while the pod is Ready and in the Service's endpoints" },
      { mark: "raised", label: "Plungers S, L, R: the startup, liveness and readiness probes, one tap per period" },
      { mark: "red", label: "Red: a failed probe, and the tower's count of consecutive failures (L and R need 3, S allows 10)" },
    ],
    caption:
      "The kubelet runs each probe once per period. A failing readiness probe (Overload web-2) only takes the pod out of the Service: it keeps running and comes back when the probe passes. A failing liveness probe (Hang web-1) means the container is stuck, so after three failures the kubelet kills and restarts it. A slow starter (web-3) is the trap: without a startup probe, liveness starts checking after its initial delay and kills the app before it finishes starting, again and again, with CrashLoopBackOff growing the wait. With a startup probe on, liveness and readiness hold off until the app answers, up to ten failures.",
    body: `<div class="iso-stage" tabindex="-1" role="img" aria-label="Health probes figure">${svg}</div>${controls}`,
  });

const file = theme === "light" ? "index-light.html" : "index.html";
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, file), k.pageHtml({ title: "Health probes", theme, body, script: kitScript() + live, width: 700 }));
console.log("wrote", file);
