// Lesson 04 in 3D: labelled pods across two nodes, selectors and namespaces, and one pod opened up.
const S = createStage({ home: { target: [0, 20, -6], dir: [0.95, 0.95, 1.15], zoom: 1.05 }, viewH: 280 });
const { box, cyl, lamp, crate, housing, part, own, label } = S;

const TOP = 12;
const TRAYS = [{ x: -83, z: -37 }, { x: 77, z: -37 }];
const PODS = [
  { name: "web-7d4f", node: 0, ns: "prod", labels: { app: "web", tier: "frontend" } },
  { name: "api-5c9b", node: 0, ns: "prod", labels: { app: "api", tier: "backend" } },
  { name: "web-dev", node: 0, ns: "dev", labels: { app: "web", tier: "frontend" } },
  { name: "web-2k8x", node: 1, ns: "prod", labels: { app: "web", tier: "frontend" } },
  { name: "db-0", node: 1, ns: "prod", labels: { app: "db", tier: "backend" } },
  { name: "api-dev", node: 1, ns: "dev", labels: { app: "api", tier: "backend" } },
];
const xOf = (i) => TRAYS[PODS[i].node].x - 46 + (i % 3) * 46;
const BENCH = { x: 80, z: 29, w: 112, d: 46 };
const OPEN = { x: 60, z: 29, w: 56, d: 36, h: 12 };
const BOARD = { x: 112, z: 29, w: 34, d: 34 };
const PHASES = ["Pending", "ContainerCreating", "Running", "Succeeded", "Failed"];

part("plate", { kind: "Cluster", title: "Two nodes, two namespaces", noFrame: true, zoom: 1, anchor: V(0, 30, -6), desc: "Namespaces are not places: prod and dev pods share both nodes. A namespace is a name scope for objects, access rules and quotas.", yaml: "kubectl get namespaces\nkubectl get pods -A" });
own("plate", S.plate({ x: 0, z: -2, w: 336, d: 150 }));
TRAYS.forEach((t, n) => { const id = part("node-" + n, { kind: "Node", title: "node-" + (n + 1), zoom: 1.8, anchor: V(t.x, TOP + 4, t.z + 25), desc: "A node. Pods from any namespace can run on it.", yaml: "" }); own(id, S.tray({ x: t.x, z: t.z, w: 146, d: 46, top: TOP })); label(id, "node-" + (n + 1)); });

const dimMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.22, depthWrite: false });
S.onTheme((p) => dimMat.color.set(p.hi));
const crates = PODS.map((p, i) => {
  const id = part("pod-" + i, { kind: "Pod", title: p.name, zoom: 3, anchor: V(xOf(i), TOP + 28, TRAYS[p.node].z),
    desc: () => `Namespace <b>${p.ns}</b>, labels <b>app=${p.labels.app}</b>, <b>tier=${p.labels.tier}</b>. ${matches(p) ? "It matches the current selector." : "It does not match the current selector."}`,
    yaml: `metadata:\n  name: ${p.name}\n  namespace: ${p.ns}\n  labels: { app: ${p.labels.app}, tier: ${p.labels.tier} }` });
  const g = crate({ w: 34, h: 16, d: 28, ribs: 5 });
  g.position.set(xOf(i), TOP, TRAYS[p.node].z);
  const l = lamp(12, 16, -9, { r: 1.4 });
  g.add(l.mesh);
  own(id, g);
  label(id, `${p.name} · ${p.ns}`, { small: true });
  S.label(id, `app=${p.labels.app} · tier=${p.labels.tier}`, { small: true, anchor: V(xOf(i), TOP + 20, TRAYS[p.node].z + 14), lod: 1.5 });
  return { g, l, body: g.userData.body, base: g.userData.body.material };
});
// the two labels per pod live in the same map slot; keep handles to both
const tagLabels = PODS.map((_, i) => S.labels["pod-" + i]);

// the workbench: one pod opened up, and its phase board
part("demo", { kind: "Pod (opened up)", title: "pod/demo · ns dev", zoom: 2.6, anchor: V(OPEN.x, OPEN.h + 18, OPEN.z),
  desc: () => `Two containers, <b>app</b> and <b>log-agent</b>, in one pod: they share one IP and a volume, and are always scheduled together. Status: <b>${demo.status}</b>, restarts ${demo.restarts}.`,
  yaml: "kind: Pod\nmetadata: { name: demo, namespace: dev, labels: { app: demo } }\nspec:\n  containers:\n  - { name: app,       image: myapp:1.4 }\n  - { name: log-agent, image: fluent-bit:3 }",
  actions: () => [{ label: "Run a server pod", run: () => run("server") }, { label: "Run a Job pod", run: () => run("job") }, { label: "Run a crashing pod", danger: true, run: () => run("crash") }] });
own("demo", housing({ x: BENCH.x, z: BENCH.z, w: BENCH.w, d: BENCH.d, h: 6, plinth: false }), S.openBox({ x: OPEN.x, z: OPEN.z, w: OPEN.w, d: OPEN.d, h: OPEN.h, y0: 6 }));
const appBox = box(22, 8, 18, { x: OPEN.x - 12, y0: 7.6, z: OPEN.z - 4, tone: "mid", r: 0.6 });
const sideBox = box(20, 8, 18, { x: OPEN.x + 13, y0: 7.6, z: OPEN.z - 4, tone: "mid", r: 0.6 });
const shelf = box(50, 1, 7, { x: OPEN.x, y0: 7.6, z: OPEN.z + 11, tone: "lo", r: 0.3 });
const appLamp = lamp(OPEN.x - 4, 15.6, OPEN.z - 9, { r: 1.1 }), sideLamp = lamp(OPEN.x + 20, 15.6, OPEN.z - 9, { r: 1.1 });
own("demo", appBox, sideBox, shelf, appLamp.mesh, sideLamp.mesh);
label("demo", "pod/demo");
S.label("demo", "app", { small: true, anchor: V(OPEN.x - 12, 20, OPEN.z - 4), lod: 1.5 });
S.label("demo", "log-agent", { small: true, anchor: V(OPEN.x + 13, 20, OPEN.z - 4), lod: 1.5 });
S.label("demo", "shared volume · IP 10.244.1.9", { small: true, anchor: V(OPEN.x, 12, OPEN.z + 13), lod: 1.5 });
part("phases", { kind: "Pod phase", title: "Phase board", zoom: 3, anchor: V(BOARD.x, 22, BOARD.z), desc: "A pod's phase: Pending while it waits for a node, ContainerCreating while images are pulled, Running, then Succeeded or Failed. A container that keeps crashing is restarted with a growing delay: CrashLoopBackOff.", yaml: "kubectl get pod demo -n dev -w" });
own("phases", housing({ x: BOARD.x, z: BOARD.z, w: BOARD.w, d: BOARD.d, h: 10, y0: 6, plinth: false }));
label("phases", "phase");
const phaseLamps = PHASES.map((ph, n) => { const l = lamp(BOARD.x - 12, 16, BOARD.z - 13 + n * 6.4, { r: 1.2, state: "off" }); own("phases", l.mesh); S.label("phases", ph, { small: true, anchor: V(BOARD.x + 2, 17, BOARD.z - 13 + n * 6.4), lod: 1.7 }); return l; });

// ---- selectors and namespaces ----
let sel = "app=web", ns = "prod";
const matches = (p) => (ns === "all" || p.ns === ns) && sel.split(",").every((kv) => { const [k, v] = kv.split("="); return p.labels[k] === v; });
// ---- the demo pod's lifecycle ----
const demo = { kind: "server", t: 0, restarts: 0, backoff: 0, status: "Pending", ready: false };
function run(kind) { Object.assign(demo, { kind, t: 0, restarts: 0, backoff: 0, status: "Pending", ready: false }); }
function stepDemo(dt) {
  const d = demo; d.t += dt;
  if (d.status === "Pending" && d.t > 1.2) { d.status = "ContainerCreating"; d.t = 0; }
  else if (d.status === "ContainerCreating" && d.t > 1.6) { d.status = "Running"; d.t = 0; }
  else if (d.status === "Running") {
    if (d.kind === "job" && d.t > 3.5) { d.status = "Completed"; d.t = 0; }
    if (d.kind === "crash" && d.t > 1.2) { d.status = "Error"; d.t = 0; d.restarts++; d.backoff = Math.min(8, d.backoff ? d.backoff * 2 : 1.5); }
  }
  else if (d.status === "Error" && d.t > 0.8) { d.status = "CrashLoopBackOff"; d.t = 0; }
  else if (d.status === "CrashLoopBackOff" && d.t > d.backoff) { d.status = "Running"; d.t = 0; }
}
const phaseIndex = (s) => ({ Pending: 0, ContainerCreating: 1, Running: 2, Completed: 3, Error: 4, CrashLoopBackOff: 4 })[s];

S.onTick((dt) => {
  stepDemo(dt);
  crates.forEach((c, i) => {
    const on = matches(PODS[i]);
    c.body.material = on ? c.base : dimMat;
    c.body.userData.edge.visible = on;
    c.g.children.forEach((ch) => { if (ch.isLineSegments) ch.visible = on; });
    c.l.set(on ? "accent" : "off");
    tagLabels[i].el.classList.toggle("is-sel", on);
  });
  const pi = phaseIndex(demo.status);
  phaseLamps.forEach((l, n) => l.set(n === pi ? (n === 4 ? (demo.status === "CrashLoopBackOff" && Math.sin(demo.t * 8) < 0 ? "off" : "bad") : "on") : "off"));
  appLamp.set(demo.status === "Running" ? "on" : demo.status === "Error" || demo.status === "CrashLoopBackOff" ? "bad" : "off");
  sideLamp.set(["Running", "Error", "CrashLoopBackOff"].includes(demo.status) ? "on" : "off");
  const n = PODS.filter(matches).length;
  S.say(`${n} pod${n === 1 ? "" : "s"} match ${sel} ${ns === "all" ? "in all namespaces" : "in " + ns} · demo: ${demo.status}`);
  syncUi();
});

S.overview = () => `<h2>Pods, labels and namespaces</h2><p class="muted">Choose a selector and a namespace below: matching pods light up and the kubectl output updates. Pick a part:</p>`;
const ui = { term: document.getElementById("pd-term"), status: document.getElementById("pd-status"), sel: [...document.querySelectorAll("[data-sel]")], ns: [...document.querySelectorAll("[data-ns]")] };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "sel") sel = b.dataset.sel; if (a === "ns") ns = b.dataset.ns; if (a === "run") run(b.dataset.kind);
  S.renderPanel();
}));
function syncUi() {
  ui.sel.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sel === sel)));
  ui.ns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ns === ns)));
  const pad = (s, w) => (s + " ".repeat(w)).slice(0, w);
  const rows = PODS.filter(matches).map((p) => [ns === "all" ? p.ns : null, p.name, "2/2", "Running", "0"]);
  if ((ns === "all" || ns === "dev") && sel === "app=demo") rows.push([ns === "all" ? "dev" : null, "demo", demo.status === "Running" ? "2/2" : "1/2", demo.status, String(demo.restarts)]);
  const head = (ns === "all" ? "NAMESPACE  " : "") + "NAME       READY   STATUS              RESTARTS";
  const text = `$ kubectl get pods ${ns === "all" ? "-A" : "-n " + ns} -l ${sel}\n` + (rows.length ? head + "\n" + rows.map((r) => (r[0] !== null ? pad(r[0], 11) : "") + pad(r[1], 11) + pad(r[2], 8) + pad(r[3], 20) + r[4]).join("\n") : `No resources found${ns !== "all" ? " in " + ns + " namespace" : ""}.`);
  if (ui.term.textContent !== text) ui.term.textContent = text;
  const desc = { server: "A server pod: Pending while the scheduler picks a node, ContainerCreating while the image is pulled, then Running.", job: "A Job's pod runs its command and exits 0: Succeeded (kubectl shows Completed), and it is not restarted.", crash: "A crashing pod: the app exits with an error, the kubelet restarts it, and each restart waits longer: CrashLoopBackOff." }[demo.kind];
  if (ui.status.textContent !== desc) { ui.status.textContent = desc; ui.status.dataset.tone = demo.kind === "crash" ? "bad" : ""; }
}

S.setTour([
  { home: true, say: "Six pods on two nodes. Each carries labels, app and tier, and belongs to a namespace, prod or dev.", hold: 6 },
  { focus: "pod-0", zoom: 3, say: "Labels are free-form key=value tags. Almost everything finds pods by them: Services, Deployments, kubectl -l.", hold: 6 },
  { home: true, say: "Selector app=web in prod: two pods light up, one on each node.", run: () => { sel = "app=web"; ns = "prod"; }, hold: 5 },
  { home: true, say: "Same selector across all namespaces: the dev pod web-dev joins in. Namespaces scope names, not machines.", run: () => { ns = "all"; }, hold: 6 },
  { home: true, say: "tier=backend: the api and db pods, whatever their names.", run: () => { sel = "tier=backend"; }, hold: 5 },
  { focus: "demo", zoom: 2.6, say: "Now one pod opened up: two containers, app and a log-agent sidecar, sharing one IP and a volume.", run: () => { sel = "app=demo"; ns = "dev"; run("server"); }, hold: 7 },
  { focus: "phases", zoom: 3, say: "Its phase board: Pending, then ContainerCreating, then Running.", hold: 5 },
  { focus: "phases", zoom: 3, say: "A Job's pod runs to completion: Succeeded.", run: () => run("job"), hold: 7 },
  { focus: "phases", zoom: 3, say: "A crashing pod is restarted with longer and longer waits: CrashLoopBackOff.", run: () => run("crash"), hold: 10 },
  { home: true, say: "Pods are the unit; labels are how everything finds them; namespaces scope them.", run: () => { sel = "app=web"; ns = "prod"; run("server"); }, hold: 5 },
]);
S.start();
