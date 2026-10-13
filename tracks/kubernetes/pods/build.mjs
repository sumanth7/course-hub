import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -168, y: -76, w: 336, d: 150, r: 9 };
const TRAY_Z = 4, TOP = 12;
const TRAYS = [{ x: -156, y: -60, w: 146, d: 46, r: 3 }, { x: 4, y: -60, w: 146, d: 46, r: 3 }];
const CRATE_H = 16;
const CRATE = (x) => ({ x: x - 17, y: -51, w: 34, d: 28, r: 0.8 });
const PODS = [
  { name: "web-7d4f", node: 0, ns: "prod", labels: { app: "web", tier: "frontend" } },
  { name: "api-5c9b", node: 0, ns: "prod", labels: { app: "api", tier: "backend" } },
  { name: "web-dev", node: 0, ns: "dev", labels: { app: "web", tier: "frontend" } },
  { name: "web-2k8x", node: 1, ns: "prod", labels: { app: "web", tier: "frontend" } },
  { name: "db-0", node: 1, ns: "prod", labels: { app: "db", tier: "backend" } },
  { name: "api-dev", node: 1, ns: "dev", labels: { app: "api", tier: "backend" } },
];
const xOf = (i) => TRAYS[PODS[i].node].x + 27 + (i % 3) * 46;
// the workbench in front: one pod opened up, and its phase board
const BENCH = { x: 24, y: 6, w: 112, d: 46, r: 3 };
const OPEN = { x: 32, y: 10, w: 56, d: 36, r: 1 };
const OPEN_H = 14;
const BOARD = { x: 96, y: 12, w: 34, d: 34, r: 2 };
const BOARD_H = 10;
const PHASES = ["Pending", "ContainerCreating", "Running", "Succeeded", "Failed"];

const C = scene({ width: 640, height: 390, elevation: 34, pad: 16, fit: [...k.boxCorners(PLATE, -17, 0)] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect } = C;

function tray(n) {
  const T = TRAYS[n];
  const out = [`<path class="iso-halo" d="${k.haloOf(T, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(T, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(T, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(T, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  out.push(frontText(T.x + 4, T.y + T.d, TRAY_Z + 2.2, `node-${n + 1}`, { size: 2.8, tone: "mid" }));
  return out.join("");
}
function podCrate(i) {
  const p = PODS[i];
  const x = xOf(i);
  const plan = CRATE(x);
  const out = [crate(plan, TOP, CRATE_H, { ribs: 5, doors: false, lamp: [x + 12, plan.y + 4], lampAttr: `data-match="${i}"` })];
  out.push(topText(plan.x + 2, plan.y + 9, TOP + CRATE_H, p.name, { size: 3.6, tone: "hi" }));
  out.push(topText(plan.x + 2, plan.y + 16, TOP + CRATE_H, `app=${p.labels.app}`, { size: 2.9, tone: "mid" }));
  out.push(topText(plan.x + 2, plan.y + 21.5, TOP + CRATE_H, `tier=${p.labels.tier}`, { size: 2.9, tone: "mid" }));
  out.push(frontText(plan.x + 2, plan.y + plan.d, TOP + 4, `ns: ${p.ns}`, { size: 3, tone: "hi" }));
  return `<g data-pod="${i}" class="pd-pod">${out.join("")}</g>`;
}
function bench() {
  const out = [housing(BENCH, 0, 6, { seam: 0.5, plinth: false })];
  // the opened pod: two containers side by side in one crate, sharing the pod's IP and a volume shelf
  const top = 6;
  out.push(S(k.slabOf(OPEN, top, OPEN_H, P, 2, 0.5), { tone: "hi", crease: "lo", inner: L(k.sideSeam(OPEN, top + 1.2, P, 2), { tone: "lo" }) }));
  const lid = top + OPEN_H;
  const app = { x: OPEN.x + 3, y: OPEN.y + 4, w: 24, d: 18, r: 0.8 };
  const side = { x: OPEN.x + 31, y: OPEN.y + 4, w: 22, d: 18, r: 0.8 };
  for (const [plan, name, attr] of [[app, "app", "data-c-app"], [side, "log-agent", "data-c-side"]]) {
    out.push(`<g ${attr}>${S(k.slabOf(plan, lid, 6, P, 2, 0.4), { tone: "mid" })}${topText(plan.x + 2, plan.y + 7, lid + 6, name, { size: 3, tone: "hi" })}${lampSvg(plan.x + plan.w - 4, plan.y + plan.d - 4, lid + 6, { r: 1.1, attr: attr + "-lamp" })}</g>`);
  }
  const shelf = { x: OPEN.x + 3, y: OPEN.y + 25, w: OPEN.w - 6, d: 8, r: 0.6 };
  out.push(S(k.slabOf(shelf, lid, 1, P, 2), { tone: "lo", crease: "none" }));
  out.push(topText(shelf.x + 2, shelf.y + 5.6, lid + 1, "shared volume · IP 10.244.1.9", { size: 2.6, tone: "mid" }));
  out.push(frontText(OPEN.x + 3, OPEN.y + OPEN.d, top + 4, "pod: demo (ns dev)", { size: 3, tone: "hi", attrs: "data-demo-name" }));
  // phase board: one lamp per phase
  out.push(housing(BOARD, top, BOARD_H, { seam: 0, plinth: false }));
  PHASES.forEach((ph, n) => {
    const y = BOARD.y + 5 + n * 6.2;
    out.push(lampSvg(BOARD.x + 4, y - 1, top + BOARD_H, { r: 1.1, attr: `data-ph="${n}"`, cls: n === 4 ? "pd-bad" : "" }));
    out.push(topText(BOARD.x + 7.5, y, top + BOARD_H, ph, { size: 2.6, tone: "mid" }));
  });
  out.push(frontText(BOARD.x + 2, BOARD.y + BOARD.d, top + 3.2, "restarts 0", { size: 2.6, tone: "mid", attrs: "data-restarts" }));
  return out.join("");
}

const body = [plate(PLATE, { ruler: false }), tray(0), [0, 1, 2].map(podCrate).join(""), tray(1), [3, 4, 5].map(podCrate).join(""), bench()].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const PODS = ${JSON.stringify(PODS)}, PHASES = ${JSON.stringify(PHASES)};
const ui = { status: document.getElementById("pd-status"), term: document.getElementById("pd-term"), sel: [...document.querySelectorAll("[data-sel]")], ns: [...document.querySelectorAll("[data-ns]")] };

// ---- selectors and namespaces ----
let sel = "app=web", ns = "prod";
const matches = (p) => (ns === "all" || p.ns === ns) && sel.split(",").every((kv) => { const [k2, v] = kv.split("="); return p.labels[k2] === v; });

// ---- the demo pod's lifecycle ----
const demo = { kind: "server", phase: 0, t: 0, restarts: 0, backoff: 0, status: "Pending", ready: false, done: false };
function run(kind) { Object.assign(demo, { kind, phase: 0, t: 0, restarts: 0, backoff: 0, status: "Pending", ready: false, done: false }); }
function stepDemo(dt) {
  demo.t += dt;
  const d = demo;
  if (d.status === "Pending" && d.t > 1.2) { d.status = "ContainerCreating"; d.t = 0; }
  else if (d.status === "ContainerCreating" && d.t > 1.6) { d.status = "Running"; d.t = 0; }
  else if (d.status === "Running") {
    d.ready = d.kind !== "crash" || d.t < 1.2;
    if (d.kind === "job" && d.t > 3.5) { d.status = "Completed"; d.t = 0; }
    if (d.kind === "crash" && d.t > 1.2) { d.status = "Error"; d.t = 0; d.restarts++; d.backoff = Math.min(8, d.backoff ? d.backoff * 2 : 1.5); }
  }
  else if (d.status === "Error" && d.t > 0.8) { d.status = "CrashLoopBackOff"; d.t = 0; }
  else if (d.status === "CrashLoopBackOff" && d.t > d.backoff) { d.status = "Running"; d.t = 0; }
}
const phaseIndex = (s) => ({ Pending: 0, ContainerCreating: 1, Running: 2, Completed: 3, Error: 4, CrashLoopBackOff: 4 })[s];

function draw() {
  PODS.forEach((p, i) => {
    const on = matches(p);
    const g = $('[data-pod="' + i + '"]');
    g.style.opacity = on ? 1 : 0.32;
    const solid = g.querySelector(".iso-solid");
    if (on) solid.setAttribute("data-flash", ""); else solid.removeAttribute("data-flash");
    $('[data-match="' + i + '"]').style.opacity = on ? 1 : 0.1;
  });
  const pi = phaseIndex(demo.status);
  PHASES.forEach((_, n) => { const el = $('[data-ph="' + n + '"]'); el.style.opacity = n === pi ? (demo.status === "CrashLoopBackOff" ? 0.4 + 0.6 * Math.abs(Math.sin(demo.t * 4)) : 1) : 0.12; });
  const appUp = demo.status === "Running";
  $("[data-c-app-lamp]").style.opacity = appUp ? 1 : 0.12;
  $("[data-c-side-lamp]").style.opacity = demo.status === "Running" || demo.status === "Error" || demo.status === "CrashLoopBackOff" ? 1 : 0.12;
  $("[data-c-app]").style.opacity = demo.status === "Error" ? 0.4 : 1;
  setText($("[data-restarts]"), "restarts " + demo.restarts);
  const nsFlag = ns === "all" ? "-A" : "-n " + ns;
  const rows = PODS.filter(matches).map((p) => [ns === "all" ? p.ns : null, p.name, "2/2", "Running", "0"]);
  if (ns === "all" || ns === "dev") {
    const demoMatches = sel.split(",").every((kv) => kv === "app=demo");
    if (demoMatches) rows.push([ns === "all" ? "dev" : null, "demo", (demo.status === "Running" ? (demo.ready ? 2 : 1) : demo.status === "Completed" ? 0 : 1) + "/2", demo.status, String(demo.restarts)]);
  }
  const head = (ns === "all" ? "NAMESPACE  " : "") + "NAME       READY   STATUS              RESTARTS";
  const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
  const lines = rows.map((r) => (r[0] !== null ? pad(r[0], 11) : "") + pad(r[1], 11) + pad(r[2], 8) + pad(r[3], 20) + r[4]);
  const text = "$ kubectl get pods " + nsFlag + " -l " + sel + "\\n" + (lines.length ? head + "\\n" + lines.join("\\n") : "No resources found" + (ns !== "all" ? " in " + ns + " namespace." : "."));
  setText(ui.term, text);
  ui.sel.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sel === sel)));
  ui.ns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ns === ns)));
  const n = PODS.filter(matches).length;
  say(n + " pod" + (n === 1 ? "" : "s") + " match " + sel + (ns === "all" ? " in all namespaces" : " in " + ns) + " · demo: " + demo.status);
  const desc = {
    server: "A server pod: Pending while the scheduler picks a node, ContainerCreating while the image is pulled, then Running. Both containers share the pod's IP and its volume.",
    job: "A Job's pod runs its command and exits 0: the phase becomes Succeeded (kubectl shows Completed) and it is not restarted.",
    crash: "A crashing pod: the app exits with an error, the kubelet restarts it, and each restart waits longer (CrashLoopBackOff: 10s, 20s, 40s... up to 5 minutes in a real cluster).",
  }[demo.kind];
  setText(ui.status, desc);
  ui.status.dataset.tone = demo.kind === "crash" ? "bad" : "";
}

const A = animate({
  tick(dt) { stepDemo(dt); draw(); },
  tour: [
    { hold: 4 }, { sel: "tier=backend" }, { hold: 4 }, { ns: "all" }, { hold: 4 }, { sel: "app=web" }, { hold: 4 }, { ns: "dev" }, { hold: 3 },
    { run: "job" }, { hold: 8 }, { run: "crash" }, { hold: 12 }, { run: "server" }, { ns: "prod" }, { hold: 5 },
  ],
  act(s) { if (s.sel) sel = s.sel; if (s.ns) ns = s.ns; if (s.run) run(s.run); },
});
controls({
  sel: (b) => { sel = b.dataset.sel; },
  ns: (b) => { ns = b.dataset.ns; },
  run: (b) => run(b.dataset.kind),
}, A.takeOver);
draw();
`;

const controls = `<div class="lx-controls" role="group" aria-label="Selectors">
  <button type="button" data-do="sel" data-sel="app=web" aria-pressed="true">-l app=web</button>
  <button type="button" data-do="sel" data-sel="tier=backend" aria-pressed="false">-l tier=backend</button>
  <button type="button" data-do="sel" data-sel="app=api,tier=backend" aria-pressed="false">-l app=api,tier=backend</button>
  <button type="button" data-do="sel" data-sel="app=demo" aria-pressed="false">-l app=demo</button>
</div>
<div class="lx-controls" role="group" aria-label="Namespaces">
  <button type="button" data-do="ns" data-ns="prod" aria-pressed="true">-n prod</button>
  <button type="button" data-do="ns" data-ns="dev" aria-pressed="false">-n dev</button>
  <button type="button" data-do="ns" data-ns="all" aria-pressed="false">-A (all namespaces)</button>
</div>
<pre class="lx-yaml" id="pd-term" aria-live="polite"></pre>
<div class="lx-controls" role="group" aria-label="Run a pod">
  <button type="button" data-do="run" data-kind="server">Run a server pod</button>
  <button type="button" data-do="run" data-kind="job">Run a Job pod</button>
  <button type="button" data-do="run" data-kind="crash" class="is-danger">Run a crashing pod</button>
  <p class="lx-status" id="pd-status" aria-live="polite"></p>
</div>
<pre class="lx-yaml"><b>apiVersion:</b> v1
<b>kind:</b> Pod
<b>metadata:</b>
  <b>name:</b> demo
  <b>namespace:</b> dev
  <b>labels:</b> { app: demo }
<b>spec:</b>
  <b>containers:</b>                 # two containers, one IP, one shared volume
  - { name: app,       image: myapp:1.4 }
  - { name: log-agent, image: fluent-bit:3 }
  <b>restartPolicy:</b> Always       # a Job's pod uses OnFailure or Never</pre>`;

writeLesson({
  slug: "pods",
  pageTitle: "Pods, Labels & Namespaces",
  fig: "Fig 4",
  title: "Pods, labels & namespaces",
  hint: "Pick a selector and a namespace below",
  readout: "2 pods match app=web in prod",
  height: 390,
  label:
    "Pods, labels and namespaces drawn as six pod crates on two node trays. Each lid is stencilled with the pod's name and its labels, app and tier, and its side with its namespace, prod or dev; namespaces span both nodes. Choosing a label selector and a namespace lights the crates that match. In front, a workbench holds one pod opened up, with two containers, app and log-agent, sharing an IP and a volume, beside a board with a lamp for each pod phase.",
  keys: [
    { mark: "lit", label: "Lit crate and lamp: the pod matches the selector in the chosen namespace" },
    { mark: "raised", label: "Workbench: one pod opened up, two containers sharing an IP and a volume" },
    { mark: "red", label: "Failed lamp: the pod's app exited with an error (CrashLoopBackOff when it keeps doing so)" },
  ],
  caption:
    "A pod is the smallest thing Kubernetes runs: one or more containers that share an IP address and volumes and are always scheduled together. Pods carry labels, free-form key=value tags, and almost everything finds pods through label selectors: Services, Deployments and kubectl -l. Namespaces divide one cluster into named groups for names, access rules and quotas; they are logical and span all nodes. A pod's phase moves from Pending through ContainerCreating to Running, and ends as Succeeded or Failed; a container that keeps crashing is restarted with a growing delay, shown as CrashLoopBackOff.",
  body,
  controls,
  css: `.pd-bad .iso-top, .pd-bad .iso-fill, .pd-bad .iso-shade { fill: var(--anatomy-red); } .pd-pod { transition: opacity .25s ease; }`,
  live,
});
