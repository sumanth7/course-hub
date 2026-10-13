// Lesson 10 in 3D: requests, limits and QoS on one node, with meter columns on every pod and on the node.
const S = createStage({ home: { target: [-10, 22, 0], dir: [0.95, 0.95, 1.15], zoom: 1.1 }, viewH: 250 });
const { box, cyl, lamp, crate, housing, part, own, label } = S;

const TOP = 12, TRAY = { x: 10, z: -8, w: 236, d: 64 };
const SLOTS = [-76, -30, 16, 62];
const DOCK = { x: -146, z: -8 };
const TOWER = { x: 118, z: -18, w: 32, d: 22, h: 44 };
const CR = { w: 30, h: 20, d: 26 };
const NODE_CPU = 4, NODE_MEM = 8, POD_CPU = 2, POD_MEM = 6, MAXPODS = 6;

part("plate", { kind: "Cluster", title: "One node and a pending dock", noFrame: true, zoom: 1, anchor: V(-10, 30, 0), desc: "One node with four pod slots and 4 CPU · 8 GiB to give. On the left, the dock where Pending pods wait.", yaml: "kubectl describe node node-1   # Allocatable and Allocated resources" });
own("plate", S.plate({ x: -8, z: -2, w: 336, d: 120 }), box(44, 1.2, 52, { x: DOCK.x, y0: 0, z: DOCK.z, tone: "lo", r: 1 }));
label("plate", "Pending", { anchor: V(DOCK.x, 6, DOCK.z + 22) });
part("node", { kind: "Node", title: "node-1 · allocatable 4 CPU · 8 GiB", zoom: 1.4, anchor: V(TRAY.x, TOP + 4, TRAY.z + 34), desc: "The scheduler places a pod here only if the node's requested totals stay within what it can allocate, whatever the pods are actually using.", yaml: "" });
own("node", S.tray({ x: TRAY.x, z: TRAY.z, w: TRAY.w, d: TRAY.d, top: TOP, slots: SLOTS.map((x) => [x, TRAY.z]), slotSize: [34, 30] }));
label("node", "node-1");

part("kubelet", { kind: "kubelet", title: "Node meters (kubelet)", zoom: 2.4, anchor: V(TOWER.x, TOP + TOWER.h + 10, TOWER.z),
  desc: () => `Left column CPU, right column memory. The bright plate is the sum of <b>requests</b> (${requested("cpu").toFixed(1)} of 4 CPU, ${requested("mem").toFixed(0)} of 8 GiB); the fill is what pods <b>use</b> (${used("mem").toFixed(1)} GiB). The lamp lights under memory pressure, when the kubelet starts evicting.`, yaml: "kubectl top node node-1" });
own("kubelet", housing({ x: TOWER.x, z: TOWER.z, w: TOWER.w, d: TOWER.d, h: TOWER.h, y0: TOP }));
const nodeCpu = S.meter({ x: TOWER.x - 7, z: TOWER.z + TOWER.d / 2 + 3, y0: TOP + 4, h: 34, w: 5, d: 4 });
const nodeMem = S.meter({ x: TOWER.x + 7, z: TOWER.z + TOWER.d / 2 + 3, y0: TOP + 4, h: 34, w: 5, d: 4 });
const pressure = lamp(TOWER.x + 10, TOP + TOWER.h, TOWER.z - 6, { r: 1.5, state: "off" });
own("kubelet", nodeCpu, nodeMem, pressure.mesh);
label("kubelet", "kubelet meters");
S.label("kubelet", "CPU   MEM", { small: true, anchor: V(TOWER.x, TOP + 2, TOWER.z + TOWER.d / 2 + 8), lod: 1.6 });

// pod crates with two meters each, built at the origin and moved between the dock and the slots
const podObjs = Array.from({ length: MAXPODS }, (_, i) => {
  const id = part("pod-" + i, { kind: "Pod", dynamic: true, zoom: 3, anchor: () => { const p = pods[i]; return V(p ? p.x : 0, TOP + CR.h + 12, TRAY.z); },
    title: () => (pods[i] ? pods[i].name + " · " + pods[i].qos : ""),
    desc: () => podDesc(pods[i]),
    yaml: () => { const p = pods[i]; if (!p) return ""; const f = (v, u) => (v ? v + u : "none"); return `resources:\n  requests: { cpu: ${f(p.req.cpu, "")}, memory: ${f(p.req.mem, "Gi")} }\n  limits:   { cpu: ${f(p.lim.cpu, "")}, memory: ${f(p.lim.mem, "Gi")} }`; } });
  const g = new THREE.Group();
  const c = crate({ w: CR.w, h: CR.h, d: CR.d, ribs: 5 });
  const mc = S.meter({ x: -6, z: CR.d / 2 + 3, y0: 0, h: CR.h, w: 3.4, d: 3 });
  const mm = S.meter({ x: 6, z: CR.d / 2 + 3, y0: 0, h: CR.h, w: 3.4, d: 3 });
  g.add(c, mc, mm);
  own(id, g);
  g.visible = false;
  label(id, "", { small: true, anchor: V(0, 0, 0) });
  return { g, id, cpu: mc.userData.meter, mem: mm.userData.meter };
});

// ---- the model (same rules as the 2D lesson) ----
const qosOf = (p) => (!p.req.cpu && !p.req.mem && !p.lim.cpu && !p.lim.mem ? "BestEffort" : p.lim.cpu && p.lim.mem && p.req.cpu === p.lim.cpu && p.req.mem === p.lim.mem ? "Guaranteed" : "Burstable");
let seq = 0, msg = "", clock = 0, press = 0;
const pods = [];
function makePod(name, req, lim, base) { const p = { id: seq++, name, req, lim, base, want: { ...base }, use: { cpu: 0, mem: base.mem * 0.6 }, state: "pending", slot: -1, t: 0, restarts: 0, burstUntil: 0, leak: 0, x: DOCK.x, y: 0 }; p.qos = qosOf(p); pods.push(p); return p; }
function seed() {
  pods.length = 0; seq = 0;
  makePod("web", { cpu: 1, mem: 2 }, { cpu: 1, mem: 2 }, { cpu: 0.6, mem: 1.4 });
  makePod("api", { cpu: 0.5, mem: 1 }, { cpu: 1, mem: 3 }, { cpu: 0.4, mem: 1.3 });
  makePod("batch", { cpu: 0, mem: 0 }, { cpu: 0, mem: 0 }, { cpu: 0.5, mem: 1.2 });
  pods.forEach((p, i) => { p.state = "running"; p.slot = i; p.x = SLOTS[i]; p.t = 9; });
}
seed();
const running = () => pods.filter((p) => p.state === "running" || p.state === "oom");
const requested = (k) => running().reduce((s, p) => s + (p.req[k] || 0), 0);
const used = (k) => running().reduce((s, p) => s + p.use[k], 0);
function schedule() {
  for (const p of pods.filter((q) => q.state === "pending")) {
    const free = SLOTS.findIndex((_, i) => !pods.some((q) => q.slot === i && q.state !== "pending" && q.state !== "gone"));
    const cpuOk = requested("cpu") + (p.req.cpu || 0) <= NODE_CPU + 1e-9, memOk = requested("mem") + (p.req.mem || 0) <= NODE_MEM + 1e-9;
    p.why = free < 0 ? "no free slot" : !cpuOk ? "Insufficient cpu (by requests)" : !memOk ? "Insufficient memory (by requests)" : "";
    if (free >= 0 && cpuOk && memOk) { p.state = "running"; p.slot = free; p.t = 0; p.use = { cpu: 0, mem: p.base.mem * 0.5 }; } else break;
  }
}
function step(dt) {
  clock += dt;
  for (const p of pods) {
    p.t += dt;
    if (p.state === "oom") { if (p.t > 1.4) { Object.assign(p, { state: "running", t: 0, leak: 0, want: { ...p.base } }); p.restarts++; p.use.mem = p.base.mem * 0.5; } continue; }
    if (p.state === "evicted") { if (p.t > 1.2) p.state = "gone"; continue; }
    if (p.state !== "running") continue;
    const wob = 0.08 * Math.sin(clock * 1.3 + p.id * 2);
    p.want.cpu = clock < p.burstUntil ? 1.8 : p.base.cpu + wob;
    p.want.mem = p.leak ? Math.min(6, p.want.mem + p.leak * dt) : p.base.mem + wob;
    p.throttled = p.lim.cpu ? p.want.cpu > p.lim.cpu : false;
    p.use.cpu = easeTo(p.use.cpu, p.lim.cpu ? Math.min(p.want.cpu, p.lim.cpu) : p.want.cpu, dt, 0.3);
    p.use.mem = easeTo(p.use.mem, p.want.mem, dt, 0.5);
    if (p.lim.mem && p.use.mem > p.lim.mem) { p.state = "oom"; p.t = 0; msg = `${p.name} used more memory than its limit (${p.lim.mem} GiB): the kernel OOM-killed the container and the kubelet restarted it in place.`; }
  }
  const memUsed = used("mem");
  press = memUsed > NODE_MEM * 0.94 ? 1 : Math.max(0, press - dt);
  if (memUsed > NODE_MEM * 0.94) {
    const rank = (p) => (p.qos === "BestEffort" ? 0 : p.qos === "Burstable" ? 1 : 2);
    const v = running().filter((p) => p.state === "running").sort((a, b) => rank(a) - rank(b) || (b.use.mem - (b.req.mem || 0)) - (a.use.mem - (a.req.mem || 0)))[0];
    if (v) { v.state = "evicted"; v.t = 0; msg = `Node memory pressure (${memUsed.toFixed(1)} of 8 GiB used): the kubelet evicted ${v.name}, a ${v.qos} pod, first. Its Deployment makes a replacement.`; }
  }
  for (const p of pods.filter((q) => q.state === "gone")) Object.assign(p, { state: "pending", slot: -1, leak: 0, want: { ...p.base }, use: { cpu: 0, mem: 0 } });
  schedule();
}
function addBig() {
  if (pods.length >= MAXPODS) { msg = "This demo holds at most six pods. Press Reset to start over."; return; }
  const p = makePod("cache-" + (pods.length - 2), { cpu: 2, mem: 4 }, { cpu: 2, mem: 4 }, { cpu: 0.3, mem: 1 });
  schedule();
  msg = p.state === "running" ? `${p.name} requests 2 CPU and 4 GiB. The scheduler adds up requests, not usage: they fit, so it is placed.` : `${p.name} stays Pending: ${p.why}. The node is mostly idle, but the scheduler only counts what pods have requested.`;
}
const byName = (n) => pods.find((p) => p.name === n && p.state === "running");
function burst() { const p = byName("web"); if (p) { p.burstUntil = clock + 6; msg = "web wants 1.8 CPU but its limit is 1: the kernel throttles it at 1 CPU. It slows down, but nothing is killed."; } }
function spike() { const p = byName("api"); if (p) { p.leak = 1.2; p.want.mem = p.use.mem; msg = "api's memory climbs toward its 3 GiB limit..."; } }
function leak() { const p = byName("batch"); if (p) { p.leak = 1.6; p.want.mem = p.use.mem; msg = "batch has no limits (BestEffort), so its memory keeps growing into the node's free memory..."; } }
function reset() { seed(); msg = ""; }
function podDesc(p) {
  if (!p) return "";
  const st = p.state === "running" ? (p.throttled ? "Running, CPU throttled" : "Running") : p.state === "oom" ? "OOMKilled, restarting" : p.state === "evicted" ? "Evicted" : "Pending: " + (p.why || "waiting");
  return `<b>${st}</b>. QoS class <b>${p.qos}</b>. Left meter CPU, right meter memory: the blue tick is the request, the bright cap the limit, the fill current use (${p.use.cpu.toFixed(1)} CPU, ${p.use.mem.toFixed(1)} GiB). Restarts: ${p.restarts}.`;
}

S.onTick((dt) => {
  step(dt);
  const pend = pods.filter((p) => p.state === "pending");
  podObjs.forEach((o, i) => {
    const p = pods[i];
    o.g.visible = !!p && !(p.state === "evicted" && p.t > 1.1);
    if (!p) { S.setLabel(o.id, "", { show: false }); return; }
    const tx = p.slot >= 0 ? SLOTS[p.slot] : DOCK.x, tz = p.slot >= 0 ? TRAY.z : DOCK.z - 6 + pend.indexOf(p) * 6;
    const ty = p.slot >= 0 ? TOP : 1.2 + Math.max(0, pend.indexOf(p)) * (CR.h + 1);
    p.x = easeTo(p.x, tx, dt, 0.25); p.y = easeTo(p.y ?? ty, ty, dt, 0.25); p.z = easeTo(p.z ?? tz, tz, dt, 0.25);
    o.g.position.set(p.x, p.y, p.z);
    o.g.scale.y = p.state === "evicted" ? Math.max(0.01, 1 - p.t / 1.2) : p.state === "oom" ? 0.85 + 0.15 * Math.abs(Math.cos(p.t * 8)) : 1;
    o.cpu.set(p.use.cpu / POD_CPU); o.cpu.req(p.req.cpu ? p.req.cpu / POD_CPU : null); o.cpu.lim(p.lim.cpu ? p.lim.cpu / POD_CPU : null); o.cpu.hot(!!p.throttled);
    o.mem.set(p.use.mem / POD_MEM); o.mem.req(p.req.mem ? p.req.mem / POD_MEM : null); o.mem.lim(p.lim.mem ? p.lim.mem / POD_MEM : null); o.mem.hot((p.lim.mem && p.use.mem > p.lim.mem * 0.85) || (!p.lim.mem && p.leak > 0));
    S.labels[o.id].obj.position.set(p.x, p.y + CR.h + 6, p.z);
    S.setLabel(o.id, `${p.name} · ${p.qos}` + (p.state === "pending" ? " · Pending" : p.state === "oom" ? " · OOMKilled" : p.state === "evicted" ? " · Evicted" : p.throttled ? " · throttled" : ""), { bad: p.state !== "running" || p.throttled, show: p.state !== "gone" });
  });
  const nc = nodeCpu.userData.meter, nm = nodeMem.userData.meter;
  nc.set(used("cpu") / NODE_CPU); nc.req(requested("cpu") / NODE_CPU); nc.lim(1);
  nm.set(used("mem") / NODE_MEM); nm.req(requested("mem") / NODE_MEM); nm.lim(1); nm.hot(used("mem") > NODE_MEM * 0.85);
  pressure.set(press > 0 ? "bad" : "off");
  S.say(`requested ${requested("cpu").toFixed(1)}/4 CPU, ${requested("mem").toFixed(0)}/8 GiB · used ${used("mem").toFixed(1)} GiB` + (pend.length ? ` · ${pend.length} pending` : ""));
  syncUi();
});

S.overview = () => `<h2>Requests, limits and QoS</h2><p class="muted">Each pod carries two meters: CPU and memory. Requests decide placement; limits cap a running container. Pick a part:</p>`;
const ui = { status: document.getElementById("rs-status"), rows: document.getElementById("rs-rows") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => { S.stopTour(); ({ burst, spike, leak, add: addBig, reset })[b.dataset.do](); S.renderPanel(); }));
function syncUi() {
  const m = msg || "The scheduler places pods by their requests. Limits cap a running container: CPU over the limit is throttled, memory over the limit is OOM-killed.";
  if (ui.status.textContent !== m) ui.status.textContent = m;
  ui.status.dataset.tone = /OOM|evicted|Pending/.test(msg) ? "bad" : "";
  const fmt = (v) => (v ? String(v) : "–");
  const html = pods.map((p) => { const st = p.state === "running" ? (p.throttled ? "Running · CPU throttled" : "Running") : p.state === "oom" ? "OOMKilled → restarting" : p.state === "evicted" ? "Evicted" : "Pending" + (p.why ? ": " + p.why : ""); return `<tr><td>${p.name}</td><td>${p.qos}</td><td>${fmt(p.req.cpu)} / ${fmt(p.lim.cpu)} / ${p.use.cpu.toFixed(1)}</td><td>${fmt(p.req.mem)} / ${fmt(p.lim.mem)} / ${p.use.mem.toFixed(1)}</td><td>${p.restarts}</td><td data-tone="${p.state === "running" && !p.throttled ? "good" : "bad"}">${st}</td></tr>`; }).join("");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
}

// ---- what the inspector shows ----
const q = (v, u) => (v ? (u === "Gi" ? v + "Gi" : v < 1 ? v * 1000 + "m" : String(v)) : "");
podObjs.forEach((o, i) => Object.assign(S.PARTS[o.id], {
  manifest: () => { const p = pods[i]; if (!p) return ""; return K.pod({ name: p.name, labels: { app: p.name }, node: p.slot >= 0 ? "node-1" : "", ip: p.slot >= 0 ? `10.244.1.${40 + i}` : "", ready: p.state === "running", restarts: p.restarts, phase: p.state === "pending" ? "Pending" : p.state === "evicted" ? "Failed" : "Running", qos: p.qos, reason: p.state === "pending" ? "Unschedulable" : p.state === "evicted" ? "Evicted" : undefined, resources: p.qos === "BestEffort" ? undefined : { reqCpu: q(p.req.cpu), reqMem: q(p.req.mem, "Gi"), limCpu: q(p.lim.cpu), limMem: q(p.lim.mem, "Gi") }, state: p.state === "oom" ? "terminated: { reason: OOMKilled, exitCode: 137 }   # ← over its memory limit" : undefined }) + (p.qos === "BestEffort" ? "\n# no resources: block at all → QoS BestEffort, first to be evicted" : ""); },
  facts: () => { const p = pods[i]; return p ? [["QoS", p.qos], ["CPU use", `${p.use.cpu.toFixed(2)}${p.lim.cpu ? " / limit " + p.lim.cpu : ""}`], ["Memory use", `${p.use.mem.toFixed(1)} GiB${p.lim.mem ? " / limit " + p.lim.mem + " GiB" : ""}`], ["State", p.state], ["Restarts", p.restarts]] : []; },
  kubectl: () => { const p = pods[i]; return p ? `kubectl top pod ${p.name}\nkubectl describe pod ${p.name}   # Requests/Limits, QoS Class, Last State: OOMKilled` : ""; },
}));
Object.assign(S.PARTS.node, { manifest: () => K.node({ name: "node-1", cpu: "4", mem: "8Gi", allocated: `cpu ${requested("cpu").toFixed(1)} (${Math.round(requested("cpu") * 25)}%), memory ${requested("mem")}Gi (${Math.round(requested("mem") * 12.5)}%)` }), facts: () => [["Requested CPU", `${requested("cpu").toFixed(1)} / 4`], ["Requested memory", `${requested("mem")} / 8 GiB`], ["Used memory", `${used("mem").toFixed(1)} GiB`]] });
Object.assign(S.PARTS.kubelet, { manifest: K.kubeletConfig(), facts: () => [["Memory pressure", press > 0 ? "yes: evicting" : "no"], ["Eviction order", "BestEffort → Burstable over request → Guaranteed"]], kubectl: "kubectl top node node-1\nkubectl describe node node-1   # Conditions: MemoryPressure" });

// ---- kubectl and the YAML editor ----
// quantities: "500m" → 0.5 CPU, "512Mi" → 0.5 GiB
const cpuOf = (v) => (v === undefined || v === "" ? 0 : /^\d+(\.\d+)?m$/.test(String(v)) ? parseFloat(v) / 1000 : /^\d+(\.\d+)?$/.test(String(v)) ? +v : NaN);
const memOf = (v) => { if (v === undefined || v === "") return 0; const m = String(v).match(/^(\d+(?:\.\d+)?)(Gi|Mi|G|M)?$/); if (!m) return NaN; const n = +m[1]; return m[2] === "Mi" || m[2] === "M" ? n / 1024 : m[2] ? n : n / 2 ** 30; };
const qty = (v, mem) => (!v ? '""' : mem ? (v >= 1 ? v + "Gi" : Math.round(v * 1024) + "Mi") : v < 1 ? Math.round(v * 1000) + "m" : String(v));
const RES = ["requests.cpu", "requests.memory", "limits.cpu", "limits.memory"];
// each pod belongs to a Deployment; changing its resources replaces the pod
const BASE = ["web", "api", "batch"];
BASE.forEach((name) => {
  const P = () => pods.find((p) => p.name === name);
  S.part("deploy-" + name, { kind: "Deployment", title: "deployment/" + name, listed: false, noFrame: true, anchor: V(0, 30, 0), desc: `Its pod template sets ${name}'s requests and limits. Changing them replaces the pod.`,
    manifest: () => { const p = P(); if (!p) return ""; const run = p.state === "running" ? 1 : 0; return K.deployment({ name, replicas: 1, image: name + ":1.0", ready: run, available: run }).replace("        ports: [{ containerPort: 8080 }]", `        ports: [{ containerPort: 8080 }]\n        resources:   # ← QoS class ${p.qos}\n          requests: { cpu: ${qty(p.req.cpu)}, memory: ${qty(p.req.mem, 1)} }   # ← what the scheduler reserves\n          limits:   { cpu: ${qty(p.lim.cpu)}, memory: ${qty(p.lim.mem, 1)} }   # ← CPU over: throttled · memory over: OOMKilled`); },
    applied: (all) => {
      const p = P(); if (!p) return;
      const get = (k) => all["spec.template.spec.containers[0].resources." + k];
      p.req = { cpu: cpuOf(get("requests.cpu")), mem: memOf(get("requests.memory")) }; p.lim = { cpu: cpuOf(get("limits.cpu")), mem: memOf(get("limits.memory")) };
      // a limit with no request: Kubernetes copies the limit into the request
      if (p.lim.cpu && !p.req.cpu) p.req.cpu = p.lim.cpu; if (p.lim.mem && !p.req.mem) p.req.mem = p.lim.mem;
      p.qos = qosOf(p); Object.assign(p, { state: "gone", leak: 0, burstUntil: 0, restarts: 0 });
      S.event("Normal", "ScalingReplicaSet", "deployment/" + name, `Scaled up replica set ${name}-${(Math.random() * 1e4 | 0).toString(16)} to 1 (new requests/limits)`, "deployment-controller");
      msg = `deployment/${name} changed: its pod is replaced with requests ${qty(p.req.cpu)} CPU / ${qty(p.req.mem, 1)} and limits ${qty(p.lim.cpu) === '""' ? "none" : qty(p.lim.cpu)} / ${qty(p.lim.mem, 1) === '""' ? "none" : qty(p.lim.mem, 1)}: QoS ${p.qos}.`;
    },
    fields: Object.fromEntries(RES.map((k) => ["spec.template.spec.containers[0].resources." + k, { optional: true, check: (v, all) => {
      const mem = k.endsWith("memory"), n = mem ? memOf(v) : cpuOf(v);
      if (Number.isNaN(n)) return mem ? "quantities must match '^([0-9.]+)(Mi|Gi)?$', e.g. 512Mi or 2Gi" : "quantities must be cores or millicores, e.g. 1 or 500m";
      if (n > (mem ? POD_MEM : POD_CPU)) return `this lesson's pods hold at most ${mem ? POD_MEM + "Gi" : POD_CPU + " CPU"}`;
      const other = all["spec.template.spec.containers[0].resources." + (k.startsWith("requests") ? "limits" : "requests") + "." + k.split(".")[1]], o = mem ? memOf(other) : cpuOf(other);
      if (k.startsWith("requests") && o && n > o) return `must be less than or equal to ${k.split(".")[1]} limit of ${other}`;
      return "";
    }, set: () => {} }])) });
});
const podStatus = (p) => (p.state === "running" ? "Running" : p.state === "oom" ? "OOMKilled" : p.state === "evicted" ? "Evicted" : "Pending");
const owner = (p) => (BASE.includes(p.name) ? p.name : "cache");
S.kube({
  ns: "default",
  help: ["kubectl top pod   ·   kubectl top node", "kubectl edit deploy/web | deploy/api | deploy/batch   (resources.requests / limits)", "kubectl describe node node-1   (Allocated resources)", "kubectl describe pod api   (QoS Class, Last State: OOMKilled)", "kubectl get pods -w"],
  examples: ["kubectl top pod", "kubectl top node", "kubectl describe node node-1", "kubectl edit deploy/batch", "kubectl get pods -w", "kubectl describe pod api", "kubectl get events"],
  objects: () => [
    ...BASE.map((n) => { const p = pods.find((q) => q.name === n); return { kind: "Deployment", name: n, part: "deploy-" + n, old: true, labels: { app: n }, row: { READY: p && p.state === "running" ? "1/1" : "0/1", "UP-TO-DATE": 1, AVAILABLE: p && p.state === "running" ? 1 : 0 } }; }),
    ...pods.filter((p) => p.state !== "gone").map((p, i) => ({ kind: "Pod", name: p.name, part: podObjs[pods.indexOf(p)].id, old: p.id < 3, labels: { app: owner(p) }, row: { READY: p.state === "running" ? "1/1" : "0/1", STATUS: podStatus(p), RESTARTS: p.restarts }, wide: { IP: p.slot >= 0 ? `10.244.1.${40 + pods.indexOf(p)}` : "<none>", NODE: p.slot >= 0 ? "node-1" : "<none>" },
      describe: () => [["Status:", podStatus(p)], ...(p.state === "pending" ? [["Reason:", p.why || "waiting"]] : []), ["QoS Class:", p.qos], ["Requests:", `cpu: ${qty(p.req.cpu)}, memory: ${qty(p.req.mem, 1)}`], ["Limits:", `cpu: ${qty(p.lim.cpu)}, memory: ${qty(p.lim.mem, 1)}`], ["Restart Count:", p.restarts], ...(p.restarts ? [["Last State:", "Terminated  Reason: OOMKilled  Exit Code: 137"]] : [])] })),
  ],
  verbs: {
    top({ pos }) {
      if (/^(no|nodes?)$/.test(pos[0] || "")) return ["NAME     CPU(cores)   CPU(%)   MEMORY(bytes)   MEMORY(%)", `node-1   ${Math.round(used("cpu") * 1000)}m`.padEnd(22) + `${Math.round(used("cpu") * 25)}%`.padEnd(9) + `${Math.round(used("mem") * 1024)}Mi`.padEnd(16) + `${Math.round(used("mem") * 12.5)}%`];
      if (!/^(po|pods?)$/.test(pos[0] || "")) return { err: 'error: unknown command "' + (pos[0] || "") + '" for "kubectl top"; use top pod or top node' };
      return ["NAME      CPU(cores)   MEMORY(bytes)", ...running().map((p) => `${p.name.padEnd(10)}${(Math.round(p.use.cpu * 1000) + "m").padEnd(13)}${Math.round(p.use.mem * 1024)}Mi${p.throttled ? "   # ← throttled at its limit" : ""}`)];
    },
  },
});
// ---- end kubectl ----
S.setTour([
  { home: true, say: "One node with 4 CPU and 8 GiB to give, three pods running. Each pod carries a CPU meter and a memory meter.", hold: 6 },
  { focus: "pod-0", zoom: 3, say: "On a meter, the blue tick is the request (what the scheduler reserves), the bright cap the limit, the fill current use.", hold: 7 },
  { focus: "pod-0", zoom: 3, say: "web bursts to 1.8 CPU, but its limit is 1: the fill stops at the cap and turns red. Throttled, not killed.", run: burst, hold: 6 },
  { focus: "pod-1", zoom: 3, say: "api's memory climbs past its 3 GiB limit: the kernel OOM-kills the container and it restarts in place.", run: spike, hold: 7 },
  { focus: "kubelet", zoom: 2.2, say: "batch has no limits at all and leaks memory. The node runs short, so the kubelet evicts the lowest QoS class first: BestEffort.", run: leak, hold: 9 },
  { focus: "node", zoom: 1.4, say: "Add a pod requesting 2 CPU and 4 GiB: it fits by requests, so it is placed.", run: addBig, hold: 5 },
  { home: true, say: "Add another: it stays Pending, even though the node is mostly idle. Scheduling counts requests, not usage.", run: addBig, hold: 7 },
  { home: true, say: "Requests decide where a pod fits; limits decide what happens when it uses too much.", run: reset, hold: 5 },
]);
S.start();
