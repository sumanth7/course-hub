// Lesson 15 in 3D: a Helm chart kit and values sheet install a release; break it, investigate it, roll it back.
const S = createStage({ home: { target: [-4, 14, -6], dir: [0.9, 1.1, 1.15], zoom: 1.05 }, viewH: 240 });
const { box, cyl, lamp, crate, housing, part, own, label } = S;

const TOP = 12;
const KIT = { x: -136, z: -38, w: 60, d: 40, h: 16 };
const VALUES = { x: -136, z: 16, w: 60, d: 52 };
const TRAY = { x: -8, z: -27, w: 156, d: 62 };
const PODS_X = [-56, -8, 40];
const POD_Z = -30, CR = { w: 34, h: 14, d: 28 };
const SVC = { x: 118, z: -30, w: 56, d: 40, h: 14 };
const PRINTER = { x: -5, z: 37, w: 150, d: 30, h: 8 };

part("plate", { kind: "Release", title: "Release shop", noFrame: true, zoom: 1, anchor: V(-4, 24, -6), desc: "A Helm chart (the kit) plus values (the sheet) became this release: three pods and a Service on node-1. The printer in front shows the newest cluster events.", yaml: "helm list\nhelm history shop" });
own("plate", S.plate({ x: 0, z: -2, w: 352, d: 148 }));

part("kit", { kind: "Helm chart", title: "chart shop 1.2.0", zoom: 2.4, anchor: V(KIT.x, KIT.h + 14, KIT.z), desc: () => `Templates for a Deployment, a Service and a ConfigMap. Rendered with the values sheet, they become release <b>shop</b>, now at revision <b>${history.length}</b>.`, yaml: "shop/\n  Chart.yaml        # name: shop, version: 1.2.0\n  values.yaml\n  templates/deployment.yaml service.yaml configmap.yaml", actions: () => [{ label: "helm rollback", run: rollback }] });
own("kit", crate({ w: KIT.w, h: KIT.h, d: KIT.d, ribs: 0, tone: "mid" }));
S.PARTS.kit.meshes[0].parent.position.set(KIT.x, 0, KIT.z);
own("kit", box(2, KIT.h + 0.2, KIT.d + 0.4, { x: KIT.x - 16, z: KIT.z, tone: "lo", r: 0 }), box(2, KIT.h + 0.2, KIT.d + 0.4, { x: KIT.x + 16, z: KIT.z, tone: "lo", r: 0 }));
label("kit", "helm chart");
const revLabel = S.label("kit", "", { small: true, anchor: V(KIT.x, KIT.h + 4, KIT.z + 8) });

part("values", { kind: "values.yaml", title: "Values sheet", zoom: 2.6, anchor: V(VALUES.x, 14, VALUES.z), desc: "The settings rendered into the chart's templates. A value that breaks the release is printed in red.", yaml: () => `image.tag: ${vals().tag}\nenv.DATABASE_URL: ${vals().db || "(unset)"}\nresources.memory: ${vals().mem}\nservice.selector.app: ${vals().sel}`,
  actions: () => [{ label: "Bad image tag", danger: true, run: BREAK.image }, { label: "Drop DATABASE_URL", danger: true, run: BREAK.crash }, { label: "64Gi memory", danger: true, run: BREAK.pending }, { label: "Selector typo", danger: true, run: BREAK.selector }] });
own("values", box(VALUES.w, 2, VALUES.d, { x: VALUES.x, z: VALUES.z, tone: "lo", r: 1 }), box(VALUES.w - 4, 0.6, VALUES.d - 4, { x: VALUES.x, y0: 2, z: VALUES.z, tone: "hi", r: 0.6 }));
label("values", "values.yaml");
const valLabels = [0, 1, 2, 3].map((n) => S.label("values", "", { small: true, anchor: V(VALUES.x, 4, VALUES.z - 15 + n * 10) }));

part("node", { kind: "Node", title: "node-1", zoom: 1.6, anchor: V(TRAY.x, TOP + 4, TRAY.z + 34), desc: "Runs the release's pods.", yaml: "" });
own("node", S.tray({ x: TRAY.x, z: TRAY.z, w: TRAY.w, d: TRAY.d, top: TOP, slots: PODS_X.map((x) => [x, POD_Z]), slotSize: [36, 30] }));
const NAMES = ["shop-7f6d", "shop-k2p9", "shop-x4c1"];
const pods = PODS_X.map((x, i) => {
  const id = part("pod-" + i, { kind: "Pod", title: NAMES[i], zoom: 3, anchor: V(x, TOP + CR.h + 12, POD_Z), desc: () => `Status <b>${status()}</b>, restarts ${restarts}. Investigate with the kubectl buttons below.`, yaml: `kubectl describe pod ${NAMES[i]}\nkubectl logs ${NAMES[i]} --previous` });
  const g = crate({ w: CR.w, h: CR.h, d: CR.d, ribs: 4 });
  g.position.set(x, TOP, POD_Z);
  const l = lamp(12, CR.h, -9, { r: 1.4 });
  g.add(l.mesh);
  own(id, g);
  label(id, NAMES[i], { small: true });
  return { g, l, id };
});
part("svc", { kind: "Service", title: "svc/shop", zoom: 2.6, anchor: V(SVC.x, SVC.h + 12, SVC.z), desc: () => `Selects pods with app=<b>${vals().sel}</b>. Endpoints: <b>${endpoints().length || "none"}</b>.`, yaml: "kubectl get endpoints shop" });
own("svc", housing({ x: SVC.x, z: SVC.z, w: SVC.w, d: SVC.d, h: SVC.h }));
const svcLamp = lamp(SVC.x + 22, SVC.h, SVC.z - 14, { r: 1.5 });
own("svc", svcLamp.mesh);
label("svc", "svc/shop");
part("printer", { kind: "Events", title: "Event printer", zoom: 2.4, anchor: V(PRINTER.x, PRINTER.h + 10, PRINTER.z), desc: "The newest cluster events: what the scheduler, the kubelet and the controllers did, and what went wrong. Usually the first place to look.", yaml: "kubectl get events --sort-by=.lastTimestamp" });
own("printer", housing({ x: PRINTER.x, z: PRINTER.z, w: PRINTER.w, d: PRINTER.d, h: PRINTER.h }), box(PRINTER.w - 8, 0.4, 16, { x: PRINTER.x, y0: PRINTER.h, z: PRINTER.z - 3, tone: "hi", r: 0.3 }));
label("printer", "events");
const evLabels = [0, 1].map((n) => S.label("printer", "", { small: true, anchor: V(PRINTER.x, PRINTER.h + 2, PRINTER.z - 7 + n * 7) }));

// ---- the release ----
const GOOD = { tag: "1.4.2", db: "postgres://db:5432/shop", mem: "256Mi", sel: "shop" };
const history = [{ values: { ...GOOD } }];
let fault = "none", t = 0, restarts = 0, out = "", msg = "", inspected = -1, inspectT = 0;
const vals = () => history[history.length - 1].values;
const faultOf = (v) => (v.tag !== GOOD.tag ? "image" : !v.db ? "crash" : v.mem !== GOOD.mem ? "pending" : v.sel !== GOOD.sel ? "selector" : "none");
function upgrade(change, note) { history.push({ values: { ...vals(), ...change } }); fault = faultOf(vals()); t = 0; restarts = 0; out = `$ helm upgrade shop ./shop ${note}\nRelease "shop" has been upgraded. Happy Helming!\nREVISION: ${history.length}`; msg = `Upgraded to revision ${history.length}. Something is wrong: use the kubectl buttons to find out what.`; }
function rollback() { const good = [...history].reverse().findIndex((h) => faultOf(h.values) === "none"); const rev = history.length - good; history.push({ values: { ...history[rev - 1].values } }); fault = "none"; t = 0; restarts = 0; out = `$ helm rollback shop ${rev}\nRollback was a success! Happy Helming!\n# recorded as a new revision: ${history.length}`; msg = `Rolled back to the values of revision ${rev}. The pods are replaced and the release is healthy again.`; }
const BREAK = { image: () => upgrade({ tag: "1.4.3-typo" }, "--set image.tag=1.4.3-typo"), crash: () => upgrade({ db: "" }, "--set env.DATABASE_URL=null"), pending: () => upgrade({ mem: "64Gi" }, "--set resources.memory=64Gi"), selector: () => upgrade({ sel: "shopp" }, "--set service.selector.app=shopp") };
const status = () => (t < 1.2 ? "ContainerCreating" : { none: "Running", image: t < 3 ? "ErrImagePull" : "ImagePullBackOff", crash: t % 4 < 1 ? "Error" : "CrashLoopBackOff", pending: "Pending", selector: "Running" }[fault]);
const events = () => ({
  none: ["Normal  Started  pod/shop-7f6d  Started container shop", "Normal  Pulled   pod/shop-7f6d  Successfully pulled image shop:1.4.2"],
  image: [`Warning Failed   pod/shop-7f6d  Failed to pull image "shop:${vals().tag}": not found`, "Normal  BackOff  pod/shop-7f6d  Back-off pulling image"],
  crash: ["Warning BackOff  pod/shop-7f6d  Back-off restarting failed container shop", "Normal  Started  pod/shop-7f6d  Started container shop"],
  pending: ["Warning FailedScheduling  pod/shop-7f6d  0/1 nodes are available: 1 Insufficient memory", "Normal  ScalingReplicaSet  deployment/shop  Scaled up to 3"],
  selector: ["Normal  Started  pod/shop-7f6d  Started container shop", "(no warnings: the pods are fine; the Service finds none)"],
}[fault]);
const endpoints = () => (fault === "selector" || !(fault === "none" && t > 1.2) ? [] : ["10.244.1.21:8080", "10.244.1.22:8080", "10.244.1.23:8080"]);
const tools = {
  get: () => { inspected = 0; return "$ kubectl get pods -l app=shop\nNAME             READY   STATUS              RESTARTS\n" + NAMES.map((n) => n.padEnd(17) + (status() === "Running" ? "1/1" : "0/1").padEnd(8) + status().padEnd(20) + restarts).join("\n"); },
  describe: () => { inspected = 1; return `$ kubectl describe pod shop-7f6d\nImage:   shop:${vals().tag}\nLimits:  memory: ${vals().mem}\nStatus:  ${status()}\nEvents:\n  ${events().join("\n  ")}`; },
  logs: () => { inspected = 1; return `$ kubectl logs shop-7f6d${fault === "crash" ? " --previous" : ""}\n` + { none: "listening on :8080", selector: "listening on :8080", crash: "Error: DATABASE_URL is not set\nexit status 1", image: 'Error from server (BadRequest): container "shop" is waiting to start: trying and failing to pull image', pending: "(no logs: the container never started; the pod is not scheduled)" }[fault]; },
  events: () => { inspected = 2; return "$ kubectl get events --sort-by=.lastTimestamp\n" + events().join("\n"); },
  endpoints: () => { inspected = 3; const e = endpoints(); return `$ kubectl get endpoints shop\nNAME   ENDPOINTS\nshop   ${e.length ? e.join(",") : "<none>"}` + (fault === "selector" ? `\n# the Service selects app=${vals().sel}, but the pods are labelled app=shop` : ""); },
};
const run = (tool) => { out = tools[tool](); inspectT = 1.6; const focus = { 0: "pod-0", 1: "pod-0", 2: "printer", 3: "svc" }[inspected]; if (focus && !S.touring()) S.select(focus, true); };

S.onTick((dt) => {
  t += dt;
  if (fault === "crash" && t > 1.2 && Math.floor((t - dt) / 4) !== Math.floor(t / 4)) restarts++;
  inspectT = Math.max(0, inspectT - dt);
  const st = status(), ok = st === "Running";
  pods.forEach((p, i) => {
    p.g.visible = st !== "Pending" || Math.sin(t * 4) > -0.2;
    p.g.scale.y = st === "Pending" ? 0.3 : st === "ContainerCreating" ? 0.6 + 0.4 * Math.min(1, t / 1.2) : 1;
    p.l.set(ok ? "on" : st === "ContainerCreating" ? "off" : "bad");
    S.setLabel(p.id, `${NAMES[i]} · ${st}`, { bad: !ok && st !== "ContainerCreating" });
  });
  svcLamp.set(endpoints().length ? "on" : "bad");
  S.setLabel("svc", endpoints().length ? `svc/shop · ${endpoints().length} endpoints` : "svc/shop · no endpoints", { bad: !endpoints().length });
  const v = vals();
  [[`image.tag: ${v.tag}`, v.tag !== GOOD.tag], [`env.DATABASE_URL: ${v.db || "(unset)"}`, !v.db], [`resources.memory: ${v.mem}`, v.mem !== GOOD.mem], [`selector app: ${v.sel}`, v.sel !== GOOD.sel]].forEach(([txt, bad], n) => { valLabels[n].el.textContent = txt; valLabels[n].el.classList.toggle("is-bad", bad); });
  revLabel.el.textContent = "release rev " + history.length;
  const e = events();
  evLabels.forEach((L, n) => { L.el.textContent = e[n]; L.el.classList.toggle("is-bad", /^Warning/.test(e[n])); });
  S.say(`rev ${history.length} · ${ok && fault !== "pending" ? 3 : 0}/3 ready · ${st}`);
  syncUi();
});

S.overview = () => `<h2>Break it, find it, fix it</h2><p class="muted">Break the release with a bad helm upgrade, investigate with kubectl, then roll back. Pick a part:</p>`;
const ui = { term: document.getElementById("op-term"), status: document.getElementById("op-status"), rollback: document.getElementById("op-rollback") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "brk") BREAK[b.dataset.f](); if (a === "tool") run(b.dataset.t); if (a === "rb") rollback();
  S.renderPanel();
}));
function syncUi() {
  if (ui.term.textContent !== out) ui.term.textContent = out;
  const m = msg || "Release shop is healthy. Break it with one of the upgrades, investigate, then roll back.";
  if (ui.status.textContent !== m) ui.status.textContent = m;
  ui.status.dataset.tone = fault === "none" ? "good" : "bad";
  ui.rollback.disabled = fault === "none";
}

// ---- what the inspector shows ----
const v_ = () => vals();
const podState = () => ({ none: undefined, image: "waiting: { reason: ImagePullBackOff, message: \"Back-off pulling image \\\"shop:" + v_().tag + "\\\"\" }", crash: "waiting: { reason: CrashLoopBackOff }   # ← lastState.terminated: { exitCode: 1 }", pending: undefined, selector: undefined })[fault];
pods.forEach((p, i) => Object.assign(S.PARTS["pod-" + i], { manifest: () => K.pod({ name: NAMES[i], labels: { app: "shop" }, image: "shop:" + v_().tag, node: fault === "pending" ? "" : "node-1", ip: fault === "pending" ? "" : `10.244.1.${21 + i}`, phase: fault === "pending" ? "Pending" : "Running", ready: status() === "Running", restarts, reason: fault === "pending" ? "Unschedulable" : undefined, state: podState(), env: [`{ name: DATABASE_URL, value: ${v_().db ? '"' + v_().db + '"' : '""   # ← empty: the app exits at start'} }`], resources: { reqCpu: "250m", reqMem: v_().mem, limCpu: "500m", limMem: v_().mem }, owner: { kind: "ReplicaSet", name: "shop-6c8d" } }), facts: () => [["Status", status()], ["Image", "shop:" + v_().tag], ["Restarts", restarts]] }));
Object.assign(S.PARTS.svc, { manifest: () => K.service({ name: "shop", selector: { app: v_().sel }, endpoints: endpoints() }) + (fault === "selector" ? "\n# ← selects app=" + v_().sel + ", but the pods are labelled app=shop" : ""), facts: () => [["Selector", "app=" + v_().sel], ["Endpoints", endpoints().length || "none"]] });
Object.assign(S.PARTS.values, { manifest: () => `# values.yaml for release shop, revision ${history.length}\nimage:\n  repository: shop\n  tag: ${v_().tag}${v_().tag !== GOOD.tag ? "   # ← no such image" : ""}\nenv:\n  DATABASE_URL: ${v_().db || '""'}${!v_().db ? "   # ← the app needs this" : ""}\nresources:\n  memory: ${v_().mem}${v_().mem !== GOOD.mem ? "   # ← more than any node has" : ""}\nservice:\n  selector: { app: ${v_().sel} }${v_().sel !== GOOD.sel ? "   # ← typo: pods are app=shop" : ""}`, kubectl: "helm get values shop\nhelm get values shop --revision 1\nhelm diff upgrade shop ./shop   # plugin" });
Object.assign(S.PARTS.kit, { manifest: () => `# helm history shop\nREVISION  STATUS      DESCRIPTION\n${history.map((h, k) => `${String(k + 1).padEnd(10)}${(k === history.length - 1 ? "deployed" : "superseded").padEnd(12)}${k === 0 ? "Install complete" : faultOf(h.values) === "none" ? "Rollback / upgrade complete" : "Upgrade complete"}`).join("\n")}\n---\n# Chart.yaml\napiVersion: v2\nname: shop\nversion: 1.2.0\nappVersion: "1.4.2"`, kubectl: "helm history shop\nhelm get manifest shop   # the rendered YAML Helm applied" });
Object.assign(S.PARTS.printer, { manifest: () => "# kubectl get events --sort-by=.lastTimestamp\n" + events().join("\n") });
Object.assign(S.PARTS.node, { manifest: () => K.node({ name: "node-1", cpu: "4", mem: "8Gi" }) });

// ---- kubectl and the YAML editor ----
// helm and kubectl both work here; editing values.yaml is a helm upgrade
const KEYS = { "image.tag": "tag", "env.DATABASE_URL": "db", "resources.memory": "mem", "service.selector.app": "sel" };
Object.assign(S.PARTS.values, {
  fields: Object.fromEntries(Object.entries(KEYS).map(([path, k]) => [path, { optional: true, check: (v) => (v !== undefined && v !== null && typeof v === "object" ? "must be a string" : ""), set: () => {} }])),
  applied: (all) => { const change = {}; for (const [path, k] of Object.entries(KEYS)) { const v = all[path]; const nv = v === undefined || v === null ? "" : String(v); if (nv !== vals()[k]) change[k] = nv; } if (Object.keys(change).length) { S.stopTour(); upgrade(change, "-f values.yaml"); } },
  appliedMsg: (changed) => (changed ? `Release "shop" has been upgraded. Happy Helming!\nREVISION: ${history.length}` : "Release \"shop\" unchanged"),
});
S.kube({
  ns: "default",
  help: ["helm upgrade shop ./shop --set image.tag=1.4.3-typo | env.DATABASE_URL=null | resources.memory=64Gi | service.selector.app=shopp", "helm history shop   ·   helm rollback shop [REVISION]   ·   helm get values shop", "kubectl get pods   ·   kubectl describe pod shop-7f6d   ·   kubectl logs shop-7f6d [--previous]", "kubectl get events --sort-by=.lastTimestamp   ·   kubectl get endpoints shop", "kubectl edit … is off here: change values.yaml in the panel (Edit), which runs helm upgrade"],
  examples: ["helm upgrade shop ./shop --set image.tag=1.4.3-typo", "kubectl get pods", "kubectl describe pod shop-7f6d", "kubectl logs shop-7f6d --previous", "kubectl get events --sort-by=.lastTimestamp", "kubectl get endpoints shop", "helm history shop", "helm rollback shop 1"],
  objects: () => [
    ...NAMES.map((n, i) => ({ kind: "Pod", name: n, part: "pod-" + i, labels: { app: "shop" }, row: { READY: status() === "Running" ? "1/1" : "0/1", STATUS: status(), RESTARTS: restarts }, wide: { IP: fault === "pending" ? "<none>" : `10.244.1.${21 + i}`, NODE: fault === "pending" ? "<none>" : "node-1" },
      logs: () => ({ none: ["shop 1.4.2 listening on :8080"], selector: ["shop 1.4.2 listening on :8080", "(no requests arrive: the Service has no endpoints)"], crash: ["Error: DATABASE_URL is not set", "exit status 1"], image: [`Error from server (BadRequest): container "shop" in pod "${n}" is waiting to start: trying and failing to pull image`], pending: [`Error from server (BadRequest): pod ${n} is Pending: not scheduled to a node yet`] })[fault],
      describe: () => [["Status:", status()], ["Image:", "shop:" + vals().tag], ["Limits:", "memory: " + vals().mem], ["Restart Count:", restarts], ["Events (helm lesson):"], ...events().map((e) => ["  " + e])] })),
    { kind: "Endpoints", name: "shop", part: "svc", row: { ENDPOINTS: endpoints().join(",") || "<none>" } },
    { kind: "Deployment", name: "shop", part: "kit", labels: { app: "shop", "app.kubernetes.io/managed-by": "Helm" }, row: { READY: `${status() === "Running" ? 3 : 0}/3`, "UP-TO-DATE": 3, AVAILABLE: status() === "Running" ? 3 : 0 }, manifest: () => K.deployment({ name: "shop", replicas: 3, image: "shop:" + vals().tag, ready: status() === "Running" ? 3 : 0, revision: history.length }) },
  ],
  verbs: {
    get({ pos, f }) { if (!/^(ev|events?)$/.test(pos[0] || "")) return undefined; run("events"); return ["LAST SEEN   TYPE      REASON   OBJECT   MESSAGE", ...events().map((e) => "5s          " + e)]; },
    edit({ pos }) { if (/values/.test(pos.join(" "))) return undefined; return { err: "In this lesson Helm owns the objects: a kubectl edit would be overwritten by the next helm upgrade. Edit values.yaml instead (click the values sheet → Edit)." }; },
  },
  tools: {
    helm({ pos, f }) {
      const [cmd, rel] = pos;
      if (!cmd) return { err: "Usage: helm upgrade|rollback|history|get values|list|status shop" };
      if (cmd !== "list" && cmd !== "ls" && rel !== "shop" && !(cmd === "get" && pos[2] === "shop")) return { err: `Error: release: not found${rel ? ` (${rel}); this lesson's release is shop` : ""}` };
      if (cmd === "list" || cmd === "ls") return ["NAME   NAMESPACE   REVISION   STATUS     CHART        APP VERSION", `shop   default     ${String(history.length).padEnd(11)}deployed   shop-1.2.0   1.4.2`];
      if (cmd === "status") return [`NAME: shop`, `NAMESPACE: default`, `STATUS: deployed`, `REVISION: ${history.length}`, fault === "none" ? "# the release is deployed; the pods are healthy" : "# deployed only means Helm applied the objects: the pods may still be broken (kubectl get pods)"];
      if (cmd === "history") return ["REVISION   STATUS       DESCRIPTION", ...history.map((h, k) => `${String(k + 1).padEnd(11)}${(k === history.length - 1 ? "deployed" : "superseded").padEnd(13)}${k === 0 ? "Install complete" : "Upgrade complete"}${faultOf(h.values) !== "none" ? "   # " + faultOf(h.values) + " fault" : ""}`)];
      if (cmd === "get") { if (pos[1] !== "values") return { err: "this lesson simulates helm get values shop" }; const v = vals(); return ["USER-SUPPLIED VALUES:", `image: { tag: ${v.tag} }`, `env: { DATABASE_URL: ${v.db || "null"} }`, `resources: { memory: ${v.mem} }`, `service: { selector: { app: ${v.sel} } }`]; }
      if (cmd === "rollback") {
        S.stopTour();
        const rev = pos[2] ? +pos[2] : 0;
        if (rev) { if (!history[rev - 1]) return { err: `Error: release has no ${rev} version` }; history.push({ values: { ...history[rev - 1].values } }); fault = faultOf(vals()); t = 0; restarts = 0; msg = `Rolled back to revision ${rev}'s values, as revision ${history.length}.`; return [`Rollback was a success! Happy Helming!`]; }
        rollback(); return ["Rollback was a success! Happy Helming!"];
      }
      if (cmd === "upgrade") {
        const sets = [].concat(f["--set"] || []).flatMap((x) => String(x).split(","));
        if (!sets.length) return { err: "Error: this lesson's upgrades change one value: --set image.tag=… | env.DATABASE_URL=… | resources.memory=… | service.selector.app=…" };
        const change = {};
        for (const kv of sets) { const [k, v] = kv.split("="); if (!KEYS[k]) return { err: `Error: this chart's values are ${Object.keys(KEYS).join(", ")}` }; change[KEYS[k]] = v === "null" || v === undefined ? "" : v; }
        S.stopTour(); upgrade(change, sets.map((x) => "--set " + x).join(" "));
        return [`Release "shop" has been upgraded. Happy Helming!`, `NAME: shop`, `STATUS: deployed`, `REVISION: ${history.length}`];
      }
      return { err: `Error: unknown command "${cmd}" for "helm"` };
    },
  },
});
// ---- end kubectl ----
S.setTour([
  { home: true, say: "A Helm chart and its values installed release shop: three pods and a Service. Everything is healthy.", hold: 5 },
  { focus: "values", zoom: 2.6, say: "helm upgrade with a typo in the image tag. The sheet marks the bad value...", run: BREAK.image, hold: 5 },
  { focus: "pod-0", zoom: 2.6, say: "...and the pods sit in ImagePullBackOff. kubectl describe shows the image it tried and the events.", run: () => run("describe"), hold: 7 },
  { focus: "kit", zoom: 2.2, say: "helm rollback restores the last good values as a new revision.", run: rollback, hold: 6 },
  { focus: "pod-1", zoom: 2.6, say: "Another bad upgrade drops DATABASE_URL. The app starts, crashes, restarts: CrashLoopBackOff. Its logs say why.", run: () => { BREAK.crash(); setTimeout(() => run("logs"), 2500); }, hold: 8 },
  { focus: "svc", zoom: 2.6, say: "A selector typo is sneakier: the pods are fine, but the Service finds none. kubectl get endpoints shows <none>.", run: () => { rollback(); setTimeout(() => { BREAK.selector(); run("endpoints"); }, 1200); }, hold: 8 },
  { focus: "printer", zoom: 2.4, say: "64Gi of memory: the pods are Pending, and the events say Insufficient memory.", run: () => { rollback(); setTimeout(() => { BREAK.pending(); run("events"); }, 1200); }, hold: 7 },
  { home: true, say: "Work outward: get pods, describe, logs, events, endpoints. Then roll back while you fix it properly.", run: rollback, hold: 6 },
]);
S.start();
