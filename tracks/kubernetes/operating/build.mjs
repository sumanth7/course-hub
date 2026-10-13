import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -176, y: -74, w: 352, d: 148, r: 9 };
const KIT = { x: -166, y: -58, w: 60, d: 40, r: 2 };
const KIT_H = 16;
const VALUES = { x: -166, y: -10, w: 60, d: 52, r: 1.5 };
const TRAY = { x: -86, y: -58, w: 156, d: 62, r: 3 };
const TRAY_Z = 4, TOP = 12;
const PODS_X = [-56, -8, 40];
const CR = (x) => ({ x: x - 17, y: -44, w: 34, d: 28, r: 0.8 });
const CRATE_H = 14;
const SVC = { x: 90, y: -50, w: 56, d: 40, r: 3 };
const SVC_H = 14;
const PRINTER = { x: -80, y: 22, w: 150, d: 30, r: 3 };
const PRINTER_H = 8;

const C = scene({ width: 660, height: 390, elevation: 36, pad: 12, fit: [...k.boxCorners(PLATE, -17, 0)] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect } = C;

function kit() {
  const out = [crate(KIT, 0, KIT_H, { ribs: 0, doors: false, tone: "mid" })];
  // packing straps
  for (const dx of [14, 46]) out.push(L(k.sideSeam({ x: KIT.x + dx - 1, y: KIT.y, w: 2, d: KIT.d, r: 0 }, KIT_H, P, 1), { tone: "lo" }));
  out.push(topText(KIT.x + 3, KIT.y + 10, KIT_H, "helm chart", { size: 3.4, tone: "hi" }));
  out.push(topText(KIT.x + 3, KIT.y + 17, KIT_H, "shop 1.2.0", { size: 3, tone: "mid" }));
  out.push(topText(KIT.x + 3, KIT.y + 24, KIT_H, "templates/ ×3", { size: 2.6, tone: "lo" }));
  out.push(topText(KIT.x + 3, KIT.y + 33, KIT_H, "", { size: 3, tone: "hi", attrs: "data-rev" }));
  return out.join("");
}
function values() {
  const out = [S(k.slabOf(VALUES, 0, 2, P, 2, 0.3), { tone: "lo" })];
  const sheet = k.insetPlan(VALUES, 2);
  out.push(S(k.slabOf(sheet, 2, 0.6, P, 2), { tone: "hi", crease: "none" }));
  out.push(topText(sheet.x + 2, sheet.y + 6, 2.6, "values.yaml", { size: 3.2, tone: "hi" }));
  ["image.tag", "env.DATABASE_URL", "resources.memory", "selector app"].forEach((key, n) => {
    out.push(topText(sheet.x + 2, sheet.y + 13 + n * 8, 2.6, "", { size: 2.7, tone: "mid", attrs: `data-val="${n}"` }));
  });
  return out.join("");
}
function node() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(TRAY, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(TRAY, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(TRAY, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  out.push(frontText(TRAY.x + 4, TRAY.y + TRAY.d, TRAY_Z + 2.2, "node-1 · release shop", { size: 2.8, tone: "mid" }));
  PODS_X.forEach((x, i) => {
    const pl = CR(x);
    out.push(`<g data-pod="${i}">${crate(pl, TOP, CRATE_H, { ribs: 4, doors: false, lamp: [pl.x + pl.w - 4.5, pl.y + 4.5], lampAttr: `data-plamp="${i}"` })}${topText(pl.x + 2, pl.y + 9, TOP + CRATE_H, "shop-" + ["7f6d", "k2p9", "x4c1"][i], { size: 3.2, tone: "hi" })}${topText(pl.x + 2, pl.y + 15.5, TOP + CRATE_H, "", { size: 2.6, tone: "mid", attrs: `data-pstat="${i}"` })}</g>`);
  });
  return out.join("");
}
function svc() {
  const out = [housing(SVC, 0, SVC_H, { seam: 0.5 })];
  out.push(topText(SVC.x + 3, SVC.y + 10, SVC_H, "svc/shop", { size: 3.4, tone: "hi" }));
  out.push(topText(SVC.x + 3, SVC.y + 17, SVC_H, "", { size: 2.7, tone: "mid", attrs: "data-ep" }));
  out.push(lampSvg(SVC.x + SVC.w - 5, SVC.y + 5, SVC_H, { r: 1.4, attr: "data-svclamp" }));
  return out.join("");
}
function printer() {
  const out = [housing(PRINTER, 0, PRINTER_H, { seam: 0.5 })];
  const tape = { x: PRINTER.x + 4, y: PRINTER.y + 4, w: PRINTER.w - 8, d: 16, r: 0.6 };
  out.push(S(k.slabOf(tape, PRINTER_H, 0.4, P, 2), { tone: "hi", crease: "none" }));
  out.push(topText(tape.x + 2, tape.y + 6, PRINTER_H + 0.4, "", { size: 2.6, tone: "hi", attrs: "data-ev0" }));
  out.push(topText(tape.x + 2, tape.y + 12.5, PRINTER_H + 0.4, "", { size: 2.6, tone: "mid", attrs: "data-ev1" }));
  out.push(frontText(PRINTER.x + 4, PRINTER.y + PRINTER.d, 2.4, "events (kubectl get events)", { size: 2.8, tone: "mid" }));
  return out.join("");
}

const body = [plate(PLATE, { ruler: false }), kit(), values(), node(), svc(), printer()].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const ui = { term: document.getElementById("op-term"), status: document.getElementById("op-status"), rollback: document.getElementById("op-rollback") };

// ---- the release: Helm keeps every revision's values ----
const GOOD = { tag: "1.4.2", db: "postgres://db:5432/shop", mem: "256Mi", sel: "shop" };
const history = [{ rev: 1, values: { ...GOOD }, note: "install" }];
let fault = "none", t = 0, restarts = 0, inspected = -1, inspectT = 0, out = "", msg = "";
const vals = () => history[history.length - 1].values;
const faultOf = (v) => (v.tag !== GOOD.tag ? "image" : !v.db ? "crash" : v.mem !== GOOD.mem ? "pending" : v.sel !== GOOD.sel ? "selector" : "none");
function upgrade(change, note) {
  const v = { ...vals(), ...change };
  history.push({ rev: history.length + 1, values: v, note });
  fault = faultOf(v); t = 0; restarts = 0;
  out = "$ helm upgrade shop ./shop " + note + "\\nRelease \\"shop\\" has been upgraded. Happy Helming!\\nREVISION: " + history.length;
  msg = "Upgraded to revision " + history.length + ". Something is wrong: use the kubectl buttons to find out what.";
}
function rollback() {
  const good = [...history].reverse().find((h) => faultOf(h.values) === "none");
  history.push({ rev: history.length + 1, values: { ...good.values }, note: "rollback to " + good.rev });
  fault = "none"; t = 0; restarts = 0;
  out = "$ helm rollback shop " + good.rev + "\\nRollback was a success! Happy Helming!\\n# Helm records the rollback as a new revision: " + history.length;
  msg = "Rolled back to the values of revision " + good.rev + ". The pods are replaced and the release is healthy again.";
}
const POD = ["shop-7f6d", "shop-k2p9", "shop-x4c1"];
function status() {
  if (t < 1.2) return "ContainerCreating";
  return { none: "Running", image: t < 3 ? "ErrImagePull" : "ImagePullBackOff", crash: (t % 4) < 1 ? "Error" : "CrashLoopBackOff", pending: "Pending", selector: "Running" }[fault];
}
function events() {
  return {
    none: ["Normal  Started  pod/shop-7f6d  Started container shop", "Normal  Pulled   pod/shop-7f6d  Successfully pulled image \\"shop:1.4.2\\""],
    image: ["Warning Failed   pod/shop-7f6d  Failed to pull image \\"shop:" + vals().tag + "\\": not found", "Normal  BackOff  pod/shop-7f6d  Back-off pulling image"],
    crash: ["Warning BackOff  pod/shop-7f6d  Back-off restarting failed container shop", "Normal  Started  pod/shop-7f6d  Started container shop"],
    pending: ["Warning FailedScheduling  pod/shop-7f6d  0/1 nodes are available: 1 Insufficient memory", "Normal  ScalingReplicaSet  deployment/shop  Scaled up to 3"],
    selector: ["Normal  Started  pod/shop-7f6d  Started container shop", "(no warning events: the pods are fine; the Service just finds none)"],
  }[fault];
}
const ready = () => fault === "none" || fault === "selector" ? (t > 1.2 ? 3 : 0) : 0;
const endpoints = () => (fault === "selector" || ready() === 0 ? [] : ["10.244.1.21:8080", "10.244.1.22:8080", "10.244.1.23:8080"]);
const tools = {
  get: () => { inspected = 0; return "$ kubectl get pods -l app=shop\\nNAME             READY   STATUS              RESTARTS\\n" + POD.map((n) => n.padEnd(17) + (status() === "Running" ? "1/1" : "0/1").padEnd(8) + status().padEnd(20) + restarts).join("\\n"); },
  describe: () => { inspected = 1; const e = events(); return "$ kubectl describe pod shop-7f6d\\nName:    shop-7f6d\\nImage:   shop:" + vals().tag + "\\nLimits:  memory: " + vals().mem + "\\nStatus:  " + status() + "\\nEvents:\\n  " + e.join("\\n  "); },
  logs: () => {
    inspected = 1;
    const body = { none: "listening on :8080", selector: "listening on :8080", crash: "Error: DATABASE_URL is not set\\nexit status 1", image: "Error from server (BadRequest): container \\"shop\\" in pod \\"shop-7f6d\\" is waiting to start: trying and failing to pull image", pending: "(no logs: the container was never started; the pod is not scheduled)" }[fault];
    return "$ kubectl logs shop-7f6d" + (fault === "crash" ? " --previous" : "") + "\\n" + body;
  },
  events: () => { inspected = 2; return "$ kubectl get events --sort-by=.lastTimestamp\\n" + events().join("\\n"); },
  endpoints: () => { inspected = 3; const e = endpoints(); return "$ kubectl get endpoints shop\\nNAME   ENDPOINTS\\nshop   " + (e.length ? e.join(",") : "<none>") + (fault === "selector" ? "\\n# the Service selects app=" + vals().sel + ", but the pods are labelled app=shop" : ""); },
};
function run(tool) { out = tools[tool](); inspectT = 1.5; }

function step(dt) {
  t += dt;
  if (fault === "crash" && Math.floor((t - dt) / 4) !== Math.floor(t / 4) && t > 1.2) restarts++;
}
function draw(dt) {
  inspectT = Math.max(0, inspectT - dt);
  const st = status();
  const v = vals();
  const lines = [["image.tag", v.tag, v.tag !== GOOD.tag], ["env.DATABASE_URL", v.db || "(unset)", !v.db], ["resources.memory", v.mem, v.mem !== GOOD.mem], ["selector app", v.sel, v.sel !== GOOD.sel]];
  lines.forEach(([key, val, bad], n) => { const el = $('[data-val="' + n + '"]'); setText(el, key + ": " + val); el.classList.toggle("op-bad", bad); });
  setText($("[data-rev]"), "release rev " + history.length);
  POD_STATE(st);
  setText($("[data-ep]"), endpoints().length ? endpoints().length + " endpoints" : "endpoints: <none>");
  const svcEl = $("[data-svclamp]");
  svcEl.classList.toggle("op-red", !endpoints().length);
  svcEl.style.opacity = inspected === 3 && inspectT > 0 ? 1 : endpoints().length ? 0.9 : 0.9;
  const e = events();
  setText($("[data-ev0]"), e[0]); setText($("[data-ev1]"), e[1]);
  $("[data-ev0]").classList.toggle("op-bad", /^Warning/.test(e[0]));
  setText(ui.term, out);
  setText(ui.status, msg || "Release shop is healthy. Break it with one of the upgrades, investigate, then roll back.");
  ui.status.dataset.tone = fault === "none" ? "good" : "bad";
  ui.rollback.disabled = fault === "none";
  say("rev " + history.length + " · " + ready() + "/3 ready · " + st);
}
function POD_STATE(st) {
  [0, 1, 2].forEach((i) => {
    const g = $('[data-pod="' + i + '"]');
    const ok = st === "Running";
    g.style.opacity = st === "Pending" ? 0.4 : st === "ContainerCreating" ? 0.7 : 1;
    $('[data-plamp="' + i + '"]').classList.toggle("op-red", !ok && st !== "ContainerCreating");
    $('[data-plamp="' + i + '"]').style.opacity = ok || st !== "ContainerCreating" ? 1 : 0.2;
    setText($('[data-pstat="' + i + '"]'), st);
    const solid = g.querySelector(".iso-solid");
    if (inspected <= 1 && inspectT > 0 && (inspected === 0 || i === 0)) solid.setAttribute("data-flash", ""); else solid.removeAttribute("data-flash");
  });
}

const A = animate({
  tick(dt) { step(dt); draw(dt); },
  tour: [
    { hold: 3 }, { up: "image" }, { hold: 4 }, { tool: "get" }, { hold: 3 }, { tool: "describe" }, { hold: 4 }, { rb: 1 }, { hold: 4 },
    { up: "crash" }, { hold: 6 }, { tool: "get" }, { hold: 3 }, { tool: "logs" }, { hold: 4 }, { rb: 1 }, { hold: 4 },
    { up: "selector" }, { hold: 4 }, { tool: "get" }, { hold: 3 }, { tool: "endpoints" }, { hold: 4 }, { rb: 1 }, { hold: 4 },
    { up: "pending" }, { hold: 4 }, { tool: "events" }, { hold: 4 }, { rb: 1 }, { hold: 4 },
  ],
  act(s) { if (s.up) BREAK[s.up](); if (s.tool) run(s.tool); if (s.rb) rollback(); },
});
const BREAK = {
  image: () => upgrade({ tag: "1.4.3-typo" }, "--set image.tag=1.4.3-typo"),
  crash: () => upgrade({ db: "" }, "--set env.DATABASE_URL=null"),
  pending: () => upgrade({ mem: "64Gi" }, "--set resources.memory=64Gi"),
  selector: () => upgrade({ sel: "shopp" }, "--set service.selector.app=shopp"),
};
controls({
  brk: (b) => BREAK[b.dataset.f](),
  tool: (b) => run(b.dataset.t),
  rb: () => rollback(),
}, A.takeOver);
draw(0);
`;

const controls = `<div class="lx-controls" role="group" aria-label="Break the release">
  <button type="button" data-do="brk" data-f="image" class="is-danger">helm upgrade: bad image tag</button>
  <button type="button" data-do="brk" data-f="crash" class="is-danger">helm upgrade: drop DATABASE_URL</button>
  <button type="button" data-do="brk" data-f="pending" class="is-danger">helm upgrade: 64Gi memory</button>
  <button type="button" data-do="brk" data-f="selector" class="is-danger">helm upgrade: selector typo</button>
</div>
<div class="lx-controls" role="group" aria-label="Investigate">
  <button type="button" data-do="tool" data-t="get">kubectl get pods</button>
  <button type="button" data-do="tool" data-t="describe">describe pod</button>
  <button type="button" data-do="tool" data-t="logs">logs</button>
  <button type="button" data-do="tool" data-t="events">get events</button>
  <button type="button" data-do="tool" data-t="endpoints">get endpoints</button>
  <button type="button" data-do="rb" id="op-rollback" disabled>helm rollback</button>
  <p class="lx-status" id="op-status" aria-live="polite"></p>
</div>
<pre class="lx-yaml" id="op-term" aria-live="polite"></pre>
<pre class="lx-yaml"># a Helm chart: templates plus default values
shop/
  Chart.yaml            # name: shop, version: 1.2.0
  values.yaml           # <b>image.tag:</b> 1.4.2 · <b>env.DATABASE_URL</b> · <b>resources.memory:</b> 256Mi
  templates/deployment.yaml   service.yaml   configmap.yaml

$ helm install shop ./shop          # renders the templates with the values and applies them
$ helm history shop                 # every revision and its values
$ helm rollback shop 1              # back to revision 1's values, recorded as a new revision</pre>`;

writeLesson({
  slug: "operating",
  pageTitle: "Debugging & Helm",
  fig: "Fig 15",
  title: "Debugging & Helm",
  hint: "Break it, investigate, roll back",
  readout: "rev 1 · 3/3 ready · Running",
  width: 660,
  height: 390,
  label:
    "Debugging and Helm drawn as a flat-pack kit and a release. On the left, a Helm chart drawn as a strapped kit box, with a values.yaml sheet beside it whose four values set the image tag, an environment variable, the memory request and the Service selector; a value that breaks the release turns red. On the node, the release runs three pods with a status lamp and status text each, and a Service shows its endpoints. At the front, an event printer shows the latest two cluster events.",
  keys: [
    { mark: "red", label: "Red: a bad value on the sheet, a pod that is not Running, or a Service with no endpoints" },
    { mark: "lit", label: "Lit crate: the object your last kubectl command looked at" },
    { mark: "raised", label: "Event tape: the newest events, the first place to look" },
  ],
  caption:
    "Helm packages an app's manifests as a chart: templates plus values. helm install renders and applies them as a release, helm upgrade applies new values as a new revision, and helm rollback returns to an earlier revision's values. When something breaks, work outward from the pod: kubectl get pods shows the status, describe pod shows its settings and events, logs shows what the app printed (--previous for a container that crashed), get events shows what the cluster did, and get endpoints shows whether a Service actually finds your pods.",
  body,
  controls,
  css: `.iso-face-text.op-bad { fill: var(--anatomy-red); } .op-red .iso-top, .op-red .iso-fill, .op-red .iso-shade { fill: var(--anatomy-red); } #op-term { min-height: 9em; }`,
  live,
});
