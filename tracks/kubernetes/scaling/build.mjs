import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -190, y: -70, w: 390, d: 140, r: 9 };
const NODE_X = [-92, -8, 76, 160];
const TRAY = (n) => ({ x: NODE_X[n] - 38, y: -48, w: 76, d: 74, r: 3 });
const TRAY_Z = 4, TOP = 12;
const SLOT = (n, s) => [NODE_X[n] - 17 + (s % 2) * 34, -30 + Math.floor(s / 2) * 30];
const CR = (x, y) => ({ x: x - 14, y: y - 11, w: 28, d: 22, r: 0.8 });
const CRATE_H = 11;
const HPA = { x: -182, y: -44, w: 50, d: 64, r: 3 };
const HPA_H = 16;
const GAUGE_C = [HPA.x + 25, HPA.y + 22];

const C = scene({ width: 660, height: 380, elevation: 36, pad: 12, fit: [...k.boxCorners(PLATE, -17, 0)] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect } = C;

function tray(n) {
  const T = TRAY(n);
  const out = [`<path class="iso-halo" d="${k.haloOf(T, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(T, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(T, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(T, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  for (let s = 0; s < 4; s++) { const [x, y] = SLOT(n, s); out.push(L(k.planOutline(k.insetPlan(CR(x, y), -1.2), TOP, P, 2), { tone: "faint" })); }
  out.push(frontText(T.x + 4, T.y + T.d, TRAY_Z + 2.2, `node-${n + 1}`, { size: 3, tone: "mid" }));
  if (n === 1) {
    // a node label, shown as a plate on the tray front
    const pl = { x: T.x + 40, y: T.y + T.d, w: 30, d: 1.4, r: 0.4 };
    out.push(S(k.slabOf(pl, TRAY_Z + 1, 6, P, 2), { tone: "hi", crease: "none" }));
    out.push(frontText(pl.x + 2, pl.y + pl.d, TRAY_Z + 2.4, "disktype=ssd", { size: 2.6, tone: "hi" }));
  }
  if (n === 2) {
    out.push(frontText(T.x + 40, T.y + T.d, TRAY_Z + 2.2, "gpu node", { size: 3, tone: "mid" }));
    // the taint: a striped barrier across the front of the tray
    const bar = { x: T.x + 2, y: T.y + T.d - 6, w: T.w - 4, d: 2.4, r: 0.6 };
    const stripes = [];
    for (let i = 0; i < 9; i++) stripes.push(faceRect("y", bar.y + bar.d, bar.x + 3 + i * 8, bar.x + 6.5 + i * 8, TOP + 4, TOP + 7));
    out.push(`<g data-taint>${S(k.cylinder(bar.x + 1.5, bar.y + 1.2, 1.4, TOP, 8, P, 12), { tone: "mid" })}${S(k.cylinder(bar.x + bar.w - 1.5, bar.y + 1.2, 1.4, TOP, 8, P, 12), { tone: "mid" })}${S(k.slabOf(bar, TOP + 4, 3, P, 2), { tone: "hi", crease: "none", inner: L(stripes.join(""), { tone: "lo" }) })}</g>`);
    out.push(frontText(T.x + 4, T.y + T.d, TRAY_Z - 3, "taint gpu=true:NoSchedule", { size: 2.4, tone: "mid", attrs: "data-tainttext" }));
  }
  return out.join("");
}
const POOL = 14;
const podSvg = (i) => `<g data-pod="${i}" style="opacity:0">${crate(CR(0, 0), TOP, CRATE_H, { ribs: 3, doors: false, lamp: [9, -6], lampAttr: `data-pl="${i}"` })}${topText(-12, 7, TOP + CRATE_H, "", { size: 3.2, tone: "hi", attrs: `data-pn="${i}"` })}</g>`;
function hpa() {
  const out = [housing(HPA, 0, HPA_H, { seam: 0.5 })];
  const [cx, cy] = GAUGE_C;
  out.push(L(k.ring(cx, cy, 15, HPA_H, P, 48), { tone: "lo" }));
  const t = k.radialTicks(cx, cy, 14.4, 10, 5, HPA_H, [1.2, 2.6], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // target mark at 50% CPU
  out.push(`<path class="iso-line" data-tone="hi" d="${k.lineOnTop([cx, cy - 15], [cx, cy - 18.5], HPA_H, P)}" style="stroke-width:1.2"/>`);
  out.push(S(k.cylinder(cx, cy, 1.4, HPA_H, 0.8, P, 14), { tone: "mid" }));
  out.push(topText(HPA.x + 3, HPA.y + 48, HPA_H, "HPA web", { size: 3.4, tone: "hi" }));
  out.push(topText(HPA.x + 3, HPA.y + 54, HPA_H, "target CPU 50%", { size: 2.8, tone: "mid" }));
  out.push(topText(HPA.x + 3, HPA.y + 60, HPA_H, "", { size: 2.8, tone: "mid", attrs: "data-hpatext" }));
  out.push(frontText(HPA.x + 3, HPA.y + HPA.d, 4, "load → CPU %", { size: 2.8, tone: "mid" }));
  return out.join("");
}
const needle = (frac) => {
  const a = -Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1.05, frac);
  return k.lineOnTop([GAUGE_C[0], GAUGE_C[1]], [GAUGE_C[0] + Math.sin(a) * 12, GAUGE_C[1] - Math.cos(a) * 12], HPA_H + 0.85, P);
};

const body = [
  plate(PLATE, { ruler: false }),
  hpa(),
  `<path data-needle class="iso-line" data-tone="lit" data-free="end" d="${needle(0.3)}" style="stroke-width:1.1"/>`,
  S(k.cylinder(GAUGE_C[0], GAUGE_C[1], 1, HPA_H + 0.8, 0.6, P, 12), { tone: "hi" }),
  `<g data-node="0">${tray(0)}</g><g data-node="1">${tray(1)}</g><g data-node="2">${tray(2)}</g><g data-node="3" style="opacity:0">${tray(3)}</g>`,
  `<g data-ghost>${L(k.planOutline(TRAY(3), TRAY_Z, P, 4), { tone: "lo", dashed: true })}</g>`,
  `<g data-pods>${Array.from({ length: POOL }, (_, i) => podSvg(i)).join("")}</g>`,
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const TOP = ${TOP}, NODE_X = ${JSON.stringify(NODE_X)}, GAUGE_C = ${JSON.stringify(GAUGE_C)}, HPA_H = ${HPA_H}, POOL = ${POOL};
const SLOT = ${SLOT.toString()};
const needle = ${needle.toString().replace(/k\./g, "")};
const ui = { status: document.getElementById("sc-status"), load: document.getElementById("sc-load"), taint: document.getElementById("sc-taint"), rows: document.getElementById("sc-rows") };

// ---- model ----
const PER_POD = 100; // requests/s one web pod handles at 100% CPU
const TARGET = 50, MIN = 2, MAX = 10;
const hpa = { load: 150, replicas: 3, lowSince: 0, evalIn: 0, util: 0 };
let tainted = true, msg = "", clock = 0;
const nodes = [{ up: true }, { up: true }, { up: true }, { up: false, booting: 0, emptyFor: 0 }];
// pods: { id, kind: web|db|trainer, node, slot, state: pending|running|terminating, t }
const pods = [];
let seq = 0;
const add = (kind) => { const p = { id: seq++, kind, node: -1, slot: -1, state: "pending", t: 0, name: kind === "web" ? "web-" + (seq) : kind }; pods.push(p); return p; };
add("db"); add("trainer"); for (let i = 0; i < 3; i++) add("web");
const allowed = (p, n) => {
  if (!nodes[n].up) return false;
  if (p.kind === "db") return n === 1;                 // nodeSelector: disktype=ssd
  if (n === 2 && tainted && p.kind !== "trainer") return false; // taint gpu=true:NoSchedule
  if (p.kind === "trainer") return n === 2;             // toleration + nodeAffinity: gpu node
  return true;
};
const used = (n) => pods.filter((p) => p.node === n && p.state !== "pending").map((p) => p.slot);
function schedule() {
  for (const p of pods.filter((q) => q.state === "pending")) {
    // spread: prefer the allowed node with the most free slots
    let best = -1, free = 0;
    for (let n = 0; n < 4; n++) { if (!allowed(p, n)) continue; const f = 4 - used(n).length; if (f > free) { free = f; best = n; } }
    if (best >= 0) { const s = [0, 1, 2, 3].find((x) => !used(best).includes(x)); p.node = best; p.slot = s; p.state = "running"; p.t = 0; }
  }
}
function step(dt) {
  clock += dt;
  const web = pods.filter((p) => p.kind === "web" && p.state !== "terminating");
  const runningWeb = web.filter((p) => p.state === "running").length || 1;
  hpa.util = (hpa.load / runningWeb / PER_POD) * 100;
  hpa.evalIn -= dt;
  if (hpa.evalIn <= 0) {
    hpa.evalIn = 1.5; // the HPA checks metrics every 15s in a real cluster
    const desired = Math.max(MIN, Math.min(MAX, Math.ceil(hpa.load / TARGET)));
    if (desired > hpa.replicas) { hpa.replicas = desired; hpa.lowSince = 0; msg = "CPU is above the 50% target: the HPA raises replicas to " + desired + " (load " + hpa.load + " req/s ÷ 50 per pod)."; }
    else if (desired < hpa.replicas) { hpa.lowSince += 1.5; if (hpa.lowSince >= 6) { hpa.replicas = desired; hpa.lowSince = 0; msg = "Load stayed low through the stabilization window, so the HPA scales down to " + desired + "."; } }
    else hpa.lowSince = 0;
  }
  // the Deployment follows the HPA's replica count
  while (web.length < hpa.replicas) { web.push(add("web")); }
  if (web.length > hpa.replicas) { const v = web.filter((p) => p.state === "pending").concat(web.filter((p) => p.node === 3), web).find(Boolean); if (v) { v.state = "terminating"; v.t = 0; } }
  for (const p of pods) p.t += dt;
  for (let i = pods.length - 1; i >= 0; i--) if (pods[i].state === "terminating" && pods[i].t > 0.8) pods.splice(i, 1);
  schedule();
  // Cluster Autoscaler: pods stuck Pending bring up a node; an empty extra node goes away
  const pending = pods.filter((p) => p.state === "pending");
  const n4 = nodes[3];
  if (!n4.up && pending.some((p) => p.kind === "web")) {
    n4.booting += dt;
    if (n4.booting > 3.5) { n4.up = true; n4.booting = 0; n4.emptyFor = 0; msg = "The Cluster Autoscaler saw pods that fit nowhere and added node-4. The scheduler places them there."; }
    else if (n4.booting < dt * 1.5) msg = pending.length + " web pod(s) are Pending: no allowed node has room. The Cluster Autoscaler is adding a node...";
  } else if (!pending.length) n4.booting = 0;
  if (n4.up) {
    n4.emptyFor = used(3).length ? 0 : n4.emptyFor + dt;
    if (n4.emptyFor > 6) { n4.up = false; n4.emptyFor = 0; msg = "node-4 sat empty, so the Cluster Autoscaler removed it."; }
  }
}
function setLoad(d) { hpa.load = Math.max(0, Math.min(500, hpa.load + d)); }
function toggleTaint() {
  tainted = !tainted;
  msg = tainted ? "Taint back on node-3: new web pods can no longer land there. Taints do not evict running pods with NoSchedule." : "Taint removed: node-3 now accepts any pod, so web pods can be scheduled onto the gpu node.";
  if (tainted) return;
}

function draw() {
  for (let n = 0; n < 4; n++) $('[data-node="' + n + '"]').style.opacity = n < 3 ? 1 : nodes[3].up ? 1 : nodes[3].booting ? 0.25 + 0.25 * Math.abs(Math.sin(clock * 4)) : 0;
  $("[data-ghost]").style.opacity = nodes[3].up ? 0 : 0.6;
  $("[data-taint]").style.opacity = tainted ? 1 : 0;
  $("[data-tainttext]").style.opacity = tainted ? 1 : 0.2;
  const pend = pods.filter((p) => p.state === "pending");
  for (let i = 0; i < POOL; i++) {
    const g = $('[data-pod="' + i + '"]');
    const p = pods[i];
    if (!p) { g.style.opacity = 0; continue; }
    let x, y, z = 0;
    if (p.node >= 0) { [x, y] = SLOT(p.node, p.slot); }
    else { const k2 = pend.indexOf(p); x = -150 + (k2 % 3) * 10; y = 40; z = -TOP + 0.4 + Math.floor(k2 / 3) * 12; }
    p.x = p.x === undefined ? x : ease(p.x, x, 1 / 60, 0.2);
    p.y = p.y === undefined ? y : ease(p.y, y, 1 / 60, 0.2);
    g.setAttribute("transform", translateAlong(P, [p.x, p.y, z]));
    g.style.opacity = p.state === "pending" ? 0.5 : p.state === "terminating" ? Math.max(0, 1 - p.t / 0.8) : Math.min(1, p.t / 0.4);
    setText(g.querySelector("[data-pn]"), p.name);
    const u = p.kind === "web" ? Math.min(1, hpa.util / 100) : 0.5;
    g.querySelector("[data-pl]").style.opacity = p.state === "running" ? (0.2 + 0.8 * u).toFixed(2) : 0.1;
  }
  $("[data-needle]").setAttribute("d", needle(hpa.util / 100));
  const web = pods.filter((p) => p.kind === "web" && p.state !== "terminating");
  setText($("[data-hpatext]"), "replicas " + hpa.replicas + " (2–10)");
  setText(ui.load, "load " + hpa.load + " req/s");
  setText(ui.taint, tainted ? "Remove taint from node-3" : "Taint node-3 again");
  say("CPU " + Math.round(hpa.util) + "% of target 50% · web " + web.filter((p) => p.state === "running").length + "/" + hpa.replicas + (pend.length ? " · " + pend.length + " pending" : "") + " · nodes " + (nodes[3].up ? 4 : 3));
  setText(ui.status, msg || "Raise the load and watch the HPA add web pods. When they no longer fit on the nodes they are allowed on, the Cluster Autoscaler adds one.");
  ui.status.dataset.tone = /Pending/.test(msg) ? "bad" : "";
  const rule = { db: "nodeSelector disktype=ssd", trainer: "tolerates gpu taint + affinity gpu", web: "none (but not tolerating the taint)" };
  const html = pods.filter((p) => p.state !== "terminating").map((p) => "<tr><td>" + p.name + "</td><td>" + rule[p.kind] + "</td><td data-tone='" + (p.state === "running" ? "good" : "bad") + "'>" + (p.state === "running" ? "node-" + (p.node + 1) : "Pending") + "</td></tr>").join("");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
}

const A = animate({
  tick(dt) { step(dt); draw(); },
  tour: [{ hold: 3 }, { load: 150 }, { hold: 5 }, { load: 150 }, { hold: 10 }, { taint: 1 }, { hold: 5 }, { taint: 1 }, { load: -250 }, { hold: 16 }],
  act(s) { if (s.load) setLoad(s.load); if (s.taint) toggleTaint(); },
});
controls({ up: () => setLoad(100), down: () => setLoad(-100), taint: toggleTaint }, A.takeOver);
draw();
`;

const controls = `<div class="lx-controls" role="group" aria-label="Autoscaling controls">
  <span class="lx-pair"><span id="sc-load">load 150 req/s</span><button type="button" data-do="down" aria-label="Less load">−</button><button type="button" data-do="up" aria-label="More load">+</button></span>
  <button type="button" data-do="taint" id="sc-taint">Remove taint from node-3</button>
  <p class="lx-status" id="sc-status" aria-live="polite"></p>
</div>
<div class="lx-table-wrap"><table class="lx-table"><thead><tr><th>Pod</th><th>Placement rule</th><th>Placed on</th></tr></thead><tbody id="sc-rows"></tbody></table></div>
<pre class="lx-yaml"><b>kind:</b> HorizontalPodAutoscaler
<b>spec:</b> { scaleTargetRef: { kind: Deployment, name: web }, <b>minReplicas:</b> 2, <b>maxReplicas:</b> 10,
        <b>metrics:</b> [{ type: Resource, resource: { name: cpu, target: { type: Utilization, averageUtilization: 50 } } }] }
---
# db pod:      <b>nodeSelector:</b> { disktype: ssd }
# trainer pod: <b>tolerations:</b> [{ key: gpu, value: "true", effect: NoSchedule }]
#              <b>affinity:</b> { nodeAffinity: { requiredDuringSchedulingIgnoredDuringExecution: ... gpu=true } }
# node-3:      kubectl taint nodes node-3 <b>gpu=true:NoSchedule</b></pre>`;

writeLesson({
  slug: "scaling",
  pageTitle: "Autoscaling & Placement",
  fig: "Fig 13",
  title: "Autoscaling & placement",
  hint: "Change the load or the taint below",
  readout: "CPU 50% of target 50% · web 3/3 · nodes 3",
  width: 660,
  height: 380,
  label:
    "Autoscaling and placement drawn as three node trays with four pod slots each and room for a fourth. On the left, the HPA's gauge reads web's CPU against a 50% target. node-2 carries a disktype=ssd plate, where the db pod's nodeSelector sends it; node-3 is a gpu node with a striped barrier across its front, its taint, which only the trainer pod tolerates. When web pods cannot fit anywhere they are allowed, they wait Pending and the Cluster Autoscaler brings up a fourth node.",
  keys: [
    { mark: "lit", label: "Gauge needle: web's average CPU; the bright mark is the HPA's 50% target" },
    { mark: "raised", label: "Striped barrier: node-3's taint, which only pods with a matching toleration pass" },
    { mark: "dashed", label: "Dashed outline: the node the Cluster Autoscaler adds when pods are Pending" },
  ],
  caption:
    "The Horizontal Pod Autoscaler watches a metric, here average CPU, and sets a Deployment's replicas to bring it to the target: desired = ceil(current × actual ÷ target). It scales up quickly and down only after a stabilization window. More pods need room: when pods stay Pending because no node they are allowed on has space, the Cluster Autoscaler adds a node, and it removes nodes that sit empty. Where pods may go is up to you: a nodeSelector or node affinity pulls a pod to labelled nodes, and a taint pushes every pod away from a node except those with a matching toleration.",
  body,
  controls,
  live,
});
