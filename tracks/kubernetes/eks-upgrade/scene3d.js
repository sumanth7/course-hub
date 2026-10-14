// Lesson 26 in 3D: upgrading EKS from 1.31 to 1.32. Check upgrade insights (a removed API), upgrade the control
// plane (one minor version, rolling API servers), then add-ons, then the managed node group (surge, drain, replace).
const S = createStage({ home: { target: [-6, 12, 10], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 280, minW: 500, phoneMinW: 420 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const TOP = 11, FY = 1.9;
const CP = { x: -130, z: -78 }, INS = { x: -5, z: -86 }, ADD = { x: 120, z: -78 };
const SLOTS = [-165, -85, -5, 75, 155];
const NG_Z = 46, CAL_Z = 122;
const VERS = ["1.29", "1.30", "1.31", "1.32", "1.33"];

part("plate", { kind: "Upgrade", title: "Upgrading a cluster, in order", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "At the back, left to right: the control plane, upgrade insights, the add-ons. At the front: the managed node group, with a spare bay for surge nodes. Along the edge: the EKS support calendar." });
own("plate", S.plate({ x: 0, z: 18, w: 450, d: 290 }));

// ---- control plane with three API servers that roll ----
part("cp", { kind: "Control plane", title: () => `Control plane ${st.cp}`, zoom: 2.2, anchor: V(CP.x, 30, CP.z), desc: () => `EKS upgrades the control plane in place, one minor version at a time: it starts new API servers on the new version, checks them, and retires the old ones, so the API stays available. It can't be rolled back. ${st.cpBusy ? "<b>Upgrading now.</b>" : `Running <b>${st.cp}</b>.`}` });
own("cp", housing({ x: CP.x, z: CP.z, w: 70, d: 34, h: 8 }));
const apis = [-22, 0, 22].map((dx) => { const b = box(16, 12, 20, { x: CP.x + dx, y0: 8, z: CP.z, tone: "hi", r: 0.6 }); const l = lamp(CP.x + dx, 20, CP.z, { r: 1.2 }); own("cp", b, l.mesh); return { b, l, v: "1.31" }; });
label("cp", "control plane 1.31");
// ---- upgrade insights ----
const CHECKS = [{ id: "api", name: "Deprecated APIs removed in 1.32" }, { id: "skew", name: "Kubelet version skew" }, { id: "addon", name: "Add-on version compatibility" }, { id: "cluster", name: "Cluster health" }];
part("ins", { kind: "Upgrade insights", title: "EKS upgrade insights", zoom: 2.2, anchor: V(INS.x, 22, INS.z), desc: () => `EKS scans the cluster's API audit logs and configuration before you upgrade. ${insight("api") === "ERROR" ? "<b>ERROR:</b> something still calls flowcontrol.apiserver.k8s.io/v1beta3, which Kubernetes 1.32 no longer serves." : "No blocking findings."}` });
own("ins", housing({ x: INS.x, z: INS.z, w: 76, d: 30, h: 6 }));
const checkLamps = CHECKS.map((c, k) => { const z = INS.z - 11 + k * 7.4; const l = lamp(INS.x - 32, 6, z, { r: 1.1, state: "off" }); own("ins", l.mesh); S.label("ins", c.name, { small: true, anchor: V(INS.x + 2, 8, z), lod: 1.6 }); return l; });
label("ins", "upgrade insights");
// ---- add-ons ----
const ADDONS = { "vpc-cni": { "1.31": "v1.18.3-eksbuild.1", "1.32": "v1.19.0-eksbuild.1" }, "kube-proxy": { "1.31": "v1.31.0-eksbuild.2", "1.32": "v1.32.0-eksbuild.2" }, coredns: { "1.31": "v1.11.3-eksbuild.1", "1.32": "v1.11.4-eksbuild.2" } };
part("addons", { kind: "Managed add-ons", title: "Add-ons", zoom: 2.4, anchor: V(ADD.x, 24, ADD.z), desc: () => `Each add-on has versions built for each Kubernetes version. kube-proxy in particular should match the control plane's minor version. Now: ${Object.keys(ADDONS).map((a) => `${a} <b>${st.addons[a]}</b>`).join(", ")}.` });
own("addons", housing({ x: ADD.x, z: ADD.z, w: 56, d: 32, h: 6 }));
const addonCarts = Object.keys(ADDONS).map((a, k) => { const z = ADD.z - 10 + k * 10; const c = box(40, 2, 7, { x: ADD.x - 4, y0: 6, z, tone: "hi", r: 0.3 }); const l = lamp(ADD.x + 21, 6, z, { r: 1.1 }); own("addons", c, l.mesh); S.label("addons", a, { small: true, anchor: V(ADD.x - 4, 9, z), lod: 1.6 }); return l; });
label("addons", "add-ons");
// ---- node group: four bays plus a surge bay ----
part("ng", { kind: "Managed node group", title: "ng-general", zoom: 1.6, anchor: V(0, 30, NG_Z), desc: () => `Three m6i.large nodes. A version update launches a new node from the new AMI first (surge), then cordons and drains an old one (honouring PodDisruptionBudgets), then terminates it, one at a time. Kubelets may run up to three minor versions behind the control plane, never ahead.` });
const bays = SLOTS.map((x, k) => { const id = part("bay-" + k, { kind: "Node", dynamic: true, zoom: 2.4, anchor: V(x, TOP + 22, NG_Z), title: () => (nodes.find((n) => n.bay === k) ? `${nodes.find((n) => n.bay === k).name} (kubelet ${nodes.find((n) => n.bay === k).v})` : "empty bay"), desc: () => { const n = nodes.find((m) => m.bay === k); return n ? `kubelet <b>${n.v}</b>. ${n.state === "draining" ? "Cordoned and draining." : n.state === "booting" ? "Booting from the new AMI." : ""}` : "Empty: a surge node will land here during the update."; } }); const t = S.tray({ x, z: NG_Z, w: 66, d: 44, top: TOP }); t.visible = false; own(id, t); const pods = [-14, 14].map((dx) => { const c = crate({ w: 18, h: 11, d: 16, ribs: 3 }); c.position.set(x + dx, TOP, NG_Z); c.visible = false; own(id, c); return c; }); label(id, "", { small: true }); return { id, t, pods }; });
// ---- support calendar ----
part("cal", { kind: "Support calendar", title: "EKS version support", zoom: 1.6, anchor: V(0, 10, CAL_Z), desc: "Each EKS version gets about 14 months of standard support, then 12 months of extended support at a higher hourly price, after which EKS upgrades the control plane for you. Upgrading a version or two a year keeps you in standard support." });
const calMat = new THREE.MeshBasicMaterial(), extMat = new THREE.MeshBasicMaterial();
S.onTheme((p) => { calMat.color.set(p.edgeMid); extMat.color.set(p.bad); });
VERS.forEach((v, k) => { const x = -170 + k * 70; const std = new THREE.Mesh(new THREE.BoxGeometry(50, 2, 6), calMat); std.position.set(x + 10, 1, CAL_Z - 4); const ext = new THREE.Mesh(new THREE.BoxGeometry(36, 2, 6), extMat); ext.position.set(x + 53, 1, CAL_Z + 4); S.world.add(std, ext); S.label("cal", v, { small: true, anchor: V(x - 12, 3, CAL_Z - 4), lod: 1.2 }); });
const marker = box(3, 8, 20, { x: 0, y0: 0, z: CAL_Z, tone: "hi", r: 0.3 });
own("cal", marker);
label("cal", "today");

// ---- the model ----
const st = { cp: "1.31", cpBusy: false, addons: Object.fromEntries(Object.keys(ADDONS).map((a) => [a, ADDONS[a]["1.31"]])), chartFixed: false, checked: false, ngBusy: false, clock: 0 };
const nodes = [0, 1, 2].map((k) => ({ bay: k, name: `ip-10-0-${k + 1}-${[17, 41, 88][k]}`, v: "1.31", state: "ready", t: 0, pods: 2 }));
let msg = "", nodeSeq = 3;
const insight = (id) => {
  if (id === "api") return st.chartFixed ? "PASSING" : st.cp === "1.32" ? "ERROR" : "ERROR";
  if (id === "skew") return nodes.every((n) => VERS.indexOf(st.cp) - VERS.indexOf(n.v) <= 3) ? "PASSING" : "ERROR";
  if (id === "addon") return st.addons["kube-proxy"].includes("v" + st.cp) ? "PASSING" : "WARNING";
  return "PASSING";
};
function upgradeCp(target) {
  if (st.cpBusy) return { err: "An error occurred (ResourceInUseException): An update is already in progress" };
  if (VERS.indexOf(target) - VERS.indexOf(st.cp) !== 1) return { err: `An error occurred (InvalidParameterException): Unsupported Kubernetes minor version update from ${st.cp} to ${target}   # one minor version at a time${VERS.indexOf(target) <= VERS.indexOf(st.cp) ? "; and never down" : ""}` };
  if (target !== "1.32") return { err: "This lesson stops at 1.32." };
  st.cpBusy = true; st.cpT = 0;
  msg = st.chartFixed ? "Upgrading the control plane to 1.32: EKS brings up new API servers and retires the old ones one by one. The API stays up throughout." : "Upgrading to 1.32 with the ERROR still open. EKS lets you, but anything still using flowcontrol.apiserver.k8s.io/v1beta3 will start failing.";
  S.event("Normal", "UpdateStarted", "cluster/shop", "VersionUpdate to 1.32 InProgress", "eks");
  return { ok: true };
}
function stepCp(dt) {
  if (!st.cpBusy) return;
  st.cpT += dt;
  const k = Math.min(3, Math.floor(st.cpT / 1.6));
  apis.forEach((a, i) => (a.v = i < k ? "1.32" : "1.31"));
  if (st.cpT > 5) { st.cpBusy = false; st.cp = "1.32"; S.event("Normal", "UpdateSuccessful", "cluster/shop", "VersionUpdate to 1.32 Successful", "eks"); msg = `Control plane on 1.32. Nodes still run 1.31 kubelets: that's allowed (up to three versions behind). Next: add-ons, then nodes.${st.chartFixed ? "" : " The monitoring chart's FlowSchema now fails: no matches for kind FlowSchema in version v1beta3."}`; }
}
function updateAddon(a) {
  if (!ADDONS[a]) return { err: `An error occurred (ResourceNotFoundException): No addon: ${a}` };
  const want = ADDONS[a][st.cp];
  if (st.addons[a] === want) return { err: `An error occurred (InvalidParameterException): Addon version specified is already installed` };
  st.addons[a] = want; addonBlink[a] = 0.8;
  S.event("Normal", "AddonUpdated", "addon/" + a, `${a} updated to ${want}`, "eks");
  msg = `${a} → ${want}, the version built for ${st.cp}.`;
  return { ok: true, v: want };
}
function updateNodes() {
  if (st.ngBusy) return { err: "An error occurred (ResourceInUseException): Nodegroup update already in progress" };
  if (VERS.indexOf(st.cp) <= VERS.indexOf(nodes[0].v)) return { err: `An error occurred (InvalidParameterException): Requested Nodegroup release version ${VERS[VERS.indexOf(st.cp) + 1] || "1.32"} is invalid: the node group's Kubernetes version can't be newer than the cluster's (${st.cp})   # upgrade the control plane first` };
  if (nodes.every((n) => n.v === st.cp)) return { err: "The node group already runs " + st.cp };
  st.ngBusy = true; st.ngT = 0;
  msg = "Node group update: launch a new 1.32 node (surge), cordon and drain an old 1.31 node, terminate it. Repeat.";
  S.event("Normal", "UpdateStarted", "nodegroup/ng-general", "VersionUpdate to 1.32 (AMI amazon-eks-node-al2023-x86_64-standard-1.32-v20261008)", "eks");
  return { ok: true };
}
function stepNodes(dt) {
  for (const n of nodes) n.t += dt;
  if (!st.ngBusy) return;
  st.ngT -= dt; if (st.ngT > 0) return; st.ngT = 0.6;
  const booting = nodes.find((n) => n.state === "booting"), draining = nodes.find((n) => n.state === "draining");
  if (booting) { if (booting.t > 2) { booting.state = "ready"; } return; }
  if (draining) { if (draining.pods > 0) { draining.pods--; const tgt = nodes.find((n) => n.v === st.cp && n.state === "ready" && n.pods < 2); if (tgt) tgt.pods++; } else if (draining.t > 1) { nodes.splice(nodes.indexOf(draining), 1); S.event("Normal", "Terminated", "node/" + draining.name, "Instance terminated after drain", "eks"); } return; }
  const old = nodes.find((n) => n.v !== st.cp);
  if (!old) { st.ngBusy = false; msg = "All nodes run 1.32. Upgrade done: control plane, add-ons, nodes. Same order next time, one minor version at a time."; S.event("Normal", "UpdateSuccessful", "nodegroup/ng-general", "VersionUpdate to 1.32 Successful", "eks"); return; }
  const free = [0, 1, 2, 3, 4].find((b) => !nodes.some((n) => n.bay === b));
  const fresh = nodes.filter((n) => n.v === st.cp && n.pods < 2);
  if (!fresh.length && free !== undefined) { const n = { bay: free, name: `ip-10-0-${(nodeSeq % 3) + 1}-${100 + nodeSeq++}`, v: st.cp, state: "booting", t: 0, pods: 0 }; nodes.push(n); S.event("Normal", "Launched", "node/" + n.name, "Surge node launched from the 1.32 AMI", "eks"); return; }
  old.state = "draining"; old.t = 0; S.event("Normal", "NodeNotSchedulable", "node/" + old.name, "Node cordoned; draining pods", "eks");
}
const addonBlink = {};
function fixChart() { st.chartFixed = true; msg = "helm upgrade monitoring to chart 2.x: its FlowSchema now uses flowcontrol.apiserver.k8s.io/v1. The insight clears after the next scan."; }

S.onTick((dt) => {
  st.clock += dt;
  stepCp(dt); stepNodes(dt);
  const rolling = st.cpBusy ? Math.floor(st.cpT / 1.6) : -1;
  apis.forEach((a, i) => a.l.set(i === rolling ? (Math.sin(st.clock * 10) > 0 ? "accent" : "off") : a.v === "1.32" ? "accent" : "on"));
  S.setLabel("cp", `control plane ${st.cpBusy ? "1.31 → 1.32" : st.cp}`);
  CHECKS.forEach((c, k) => { const r = st.checked ? insight(c.id) : null; checkLamps[k].set(!r ? "off" : r === "PASSING" ? "good" : r === "WARNING" ? "accent" : "bad"); });
  Object.keys(ADDONS).forEach((a, k) => { addonBlink[a] = Math.max(0, (addonBlink[a] || 0) - dt); addonCarts[k].set(addonBlink[a] > 0 ? "accent" : st.addons[a] === ADDONS[a][st.cp] ? "good" : "on"); });
  bays.forEach((b, k) => {
    const n = nodes.find((m) => m.bay === k);
    b.t.visible = !!n;
    if (n) { const down = n.state !== "ready"; if (b.t.userData.down !== down) { b.t.userData.down = down; b.t.userData.setDown(down); } }
    b.pods.forEach((c, j) => (c.visible = !!n && j < n.pods));
    S.setLabel(b.id, n ? `${n.name} · kubelet ${n.v}${n.state !== "ready" ? " · " + n.state : ""}` : "", { show: !!n, bad: n && n.state === "draining" });
  });
  marker.position.x = -170 + VERS.indexOf("1.31") * 70 + 30;
  S.say(`control plane ${st.cpBusy ? "upgrading" : st.cp} · kubelets ${[...new Set(nodes.map((n) => n.v))].join(" + ")} · kube-proxy ${st.addons["kube-proxy"].split("-")[0]}`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>Upgrade in order</h2><p class="muted">Check insights, upgrade the control plane, then add-ons, then nodes. Try doing it out of order. Pick a part:</p>`;
const ui = { status: document.getElementById("up-status") };
const echo = (c, n) => S.shellEcho?.(c, n || "button");
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  let r;
  if (a === "check") { st.checked = true; echo("aws eks list-insights --cluster-name shop"); msg = insight("api") === "ERROR" ? "Insights: ERROR on deprecated APIs. The monitoring Helm chart's FlowSchema still uses flowcontrol.apiserver.k8s.io/v1beta3, removed in 1.32." : "Insights: all passing. Safe to upgrade."; }
  if (a === "fix") { echo("helm upgrade monitoring prometheus-community/kube-prometheus-stack --version 66.2.0"); fixChart(); }
  if (a === "cp") { echo("aws eks update-cluster-version --name shop --kubernetes-version 1.32"); r = upgradeCp("1.32"); }
  if (a === "addons") { echo("aws eks update-addon --cluster-name shop --addon-name kube-proxy --addon-version " + ADDONS["kube-proxy"][st.cp]); r = ["kube-proxy", "vpc-cni", "coredns"].map(updateAddon).find((x) => x.err && !/already installed/.test(x.err)); }
  if (a === "nodes") { echo("aws eks update-nodegroup-version --cluster-name shop --nodegroup-name ng-general"); r = updateNodes(); }
  if (r && r.err) msg = r.err;
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  set(ui.status, msg || "shop runs 1.31 everywhere. Upgrade it to 1.32: check, control plane, add-ons, nodes.");
  ui.status.dataset.tone = /ERROR|error|Unsupported|invalid|fails/.test(msg) ? "bad" : /done/.test(msg) ? "good" : "";
}

// ---- what the inspector shows ----
const insightY = () => `# aws eks list-insights --cluster-name shop  +  describe-insight
insights:
${CHECKS.map((c) => `- { name: "${c.name}", category: UPGRADE_READINESS, kubernetesVersion: "1.32", status: ${st.checked ? insight(c.id) : "UNKNOWN"} }`).join("\n")}
${insight("api") === "ERROR" ? `# describe-insight (deprecated APIs):
#   resource: flowschemas.v1beta3.flowcontrol.apiserver.k8s.io
#   usedBy: system:serviceaccount:monitoring:kube-prometheus-stack-operator   ← who still calls it
#   replacedWith: flowcontrol.apiserver.k8s.io/v1
#   lastSeen: 2 hours ago (from the API server's audit log)` : "# no deprecated API calls seen in the last 30 days"}`;
Object.assign(S.PARTS.ins, { manifest: insightY });
Object.assign(S.PARTS.cp, { manifest: () => `# aws eks describe-update --name shop --update-id 9f2c…\nupdate:\n  type: VersionUpdate\n  status: ${st.cpBusy ? "InProgress" : st.cp === "1.32" ? "Successful" : "(none yet)"}\n  params: [{ type: Version, value: "1.32" }, { type: PlatformVersion, value: eks.3 }]\n# you can't roll back: test the upgrade on a non-production cluster first` });
Object.assign(S.PARTS.addons, { manifest: () => `# aws eks describe-addon-versions --kubernetes-version ${st.cp} (excerpt)\n${Object.keys(ADDONS).map((a) => `- { addonName: ${a}, installed: ${st.addons[a]}, defaultFor${st.cp.replace(".", "")}: ${ADDONS[a][st.cp]} }${st.addons[a] === ADDONS[a][st.cp] ? "" : "   # ← update after the control plane"}`).join("\n")}` });
const flowY = () => `apiVersion: flowcontrol.apiserver.k8s.io/${st.chartFixed ? "v1" : "v1beta3"}   # ← ${st.chartFixed ? "the stable version" : "removed in Kubernetes 1.32"}
kind: FlowSchema
metadata:
  name: kube-prometheus-stack-operator
  labels: { app.kubernetes.io/managed-by: Helm }
spec:
  priorityLevelConfiguration: { name: workload-low }
  matchingPrecedence: 1000
  rules: [{ subjects: [{ kind: ServiceAccount, serviceAccount: { name: kube-prometheus-stack-operator, namespace: monitoring } }], resourceRules: [{ verbs: ["*"], apiGroups: ["*"], resources: ["*"], namespaces: ["*"] }] }]`;
Object.assign(S.PARTS.ng, { manifest: () => `# aws eks describe-nodegroup --cluster-name shop --nodegroup-name ng-general (excerpt)\nnodegroup:\n  version: "${nodes.every((n) => n.v === "1.32") ? "1.32" : "1.31"}"\n  releaseVersion: ${nodes.every((n) => n.v === "1.32") ? "1.32.0-20261008" : "1.31.2-20260915"}   # ← the EKS-optimized AMI\n  updateConfig: { maxUnavailable: 1 }   # ← replace one node at a time\n  status: ${st.ngBusy ? "UPDATING" : "ACTIVE"}\n---\n${flowY()}` });

// ---- kubectl and the YAML editor ----
S.kube({
  ns: "default", auto: false,
  help: ["aws eks list-insights --cluster-name shop   ·   kubent   (find deprecated APIs in your manifests)", "aws eks update-cluster-version --name shop --kubernetes-version 1.32", "aws eks describe-addon-versions --kubernetes-version 1.32   ·   aws eks update-addon --cluster-name shop --addon-name kube-proxy --addon-version …", "aws eks update-nodegroup-version --cluster-name shop --nodegroup-name ng-general", "kubectl version   ·   kubectl get nodes   ·   kubectl get flowschemas   ·   helm upgrade monitoring …"],
  examples: ["kubectl version", "aws eks list-insights --cluster-name shop", "kubent", "aws eks update-nodegroup-version --cluster-name shop --nodegroup-name ng-general", "aws eks update-cluster-version --name shop --kubernetes-version 1.33", "aws eks update-cluster-version --name shop --kubernetes-version 1.32", "kubectl get nodes", "kubectl get flowschemas"],
  objects: () => nodes.map((n) => ({ kind: "Node", name: n.name + ".ec2.internal", part: "bay-" + n.bay, labels: {}, row: { STATUS: n.state === "draining" ? "Ready,SchedulingDisabled" : n.state === "booting" ? "NotReady" : "Ready", ROLES: "<none>", VERSION: `v${n.v}.${n.v === "1.32" ? "0" : "2"}-eks-7f9249a` } })),
  verbs: {
    version() { return [`Client Version: v1.32.1`, `Server Version: v${st.cp}.${st.cp === "1.32" ? "0" : "2"}-eks-${st.cp === "1.32" ? "5e2a7c1" : "a7f0d2b"}`]; },
    get({ pos }) { if (!/flowschema/.test(pos[0] || "")) return undefined; if (st.cp === "1.32" && !st.chartFixed) return { err: 'NAME                             PRIORITYLEVEL   MATCHINGPRECEDENCE\n... (served as v1)\n# but the chart still applies v1beta3:\n$ helm upgrade monitoring … → Error: UPGRADE FAILED: resource mapping not found for name: "kube-prometheus-stack-operator": no matches for kind "FlowSchema" in version "flowcontrol.apiserver.k8s.io/v1beta3"' }; return ["NAME                             PRIORITYLEVEL   MATCHINGPRECEDENCE   AGE", "kube-prometheus-stack-operator   workload-low    1000                 90d"]; },
  },
  tools: {
    aws({ pos, f }) {
      const [s1, op] = pos;
      if (s1 !== "eks") return { err: "this lesson simulates aws eks …" };
      if (op === "list-insights") { st.checked = true; return ["NAME                                      CATEGORY            STATUS", ...CHECKS.map((c) => `${c.name.padEnd(42)}UPGRADE_READINESS   ${insight(c.id)}`)]; }
      if (op === "describe-insight") return { yaml: insightY() };
      if (op === "update-cluster-version") { S.stopTour(); const r = upgradeCp(String(f["--kubernetes-version"] || "")); return r.err ? r : ['{ "update": { "id": "9f2c1e2a-…", "status": "InProgress", "type": "VersionUpdate", "params": [{ "type": "Version", "value": "1.32" }] } }']; }
      if (op === "describe-addon-versions") return ["ADDON        DEFAULT FOR " + (f["--kubernetes-version"] || st.cp), ...Object.keys(ADDONS).map((a) => `${a.padEnd(13)}${ADDONS[a][f["--kubernetes-version"] || st.cp] || "(none)"}`)];
      if (op === "update-addon") { const a = f["--addon-name"]; const r = updateAddon(a); return r.err ? r : [`{ "update": { "type": "AddonUpdate", "status": "InProgress", "params": [{ "type": "AddonVersion", "value": "${r.v}" }] } }`]; }
      if (op === "update-nodegroup-version") { S.stopTour(); const r = updateNodes(); return r.err ? r : ['{ "update": { "type": "VersionUpdate", "status": "InProgress" } }   # surge, drain, replace, one node at a time']; }
      return { err: "this lesson simulates aws eks list-insights | describe-insight | update-cluster-version | describe-addon-versions | update-addon | update-nodegroup-version" };
    },
    kubent() { return st.chartFixed ? ["__________________________________________________________________________________________", ">>> No deprecated APIs found <<<"] : ["__________________________________________________________________________________________", ">>> Deprecated APIs removed in 1.32 <<<", "KIND         NAMESPACE   NAME                             API_VERSION                            REPLACE_WITH", "FlowSchema   <undefined> kube-prometheus-stack-operator   flowcontrol.apiserver.k8s.io/v1beta3   flowcontrol.apiserver.k8s.io/v1"]; },
    helm({ pos }) { if (pos[0] !== "upgrade" || pos[1] !== "monitoring") return { err: "this lesson simulates helm upgrade monitoring …" }; S.stopTour(); fixChart(); return ['Release "monitoring" has been upgraded. Happy Helming!', "# chart 66.x renders FlowSchema with apiVersion flowcontrol.apiserver.k8s.io/v1"]; },
  },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "shop runs Kubernetes 1.31: control plane, add-ons and nodes. Let's get it to 1.32.", hold: 5 },
  { focus: "ins", zoom: 2.2, say: "First, upgrade insights. EKS has seen something still calling flowcontrol.apiserver.k8s.io/v1beta3, which 1.32 removes: the monitoring chart.", run: () => { st.checked = true; }, hold: 8 },
  { focus: "ins", zoom: 2.2, say: "Upgrade the chart to a version that uses v1, and the insight clears.", run: fixChart, hold: 5 },
  { focus: "cp", zoom: 2, say: "Now the control plane. EKS replaces the API servers one at a time; the API never goes down. It can't be undone, and it only moves one minor version.", run: () => upgradeCp("1.32"), hold: 7 },
  { focus: "addons", zoom: 2.2, say: "Then the add-ons, each to the version built for 1.32. kube-proxy should match the control plane.", run: () => ["kube-proxy", "vpc-cni", "coredns"].forEach(updateAddon), hold: 6 },
  { home: true, say: "Finally the nodes: a new 1.32 node joins, an old one is cordoned and drained, then terminated. One at a time.", run: updateNodes, hold: 14 },
  { focus: "cal", zoom: 1.6, say: "Each version has about 14 months of standard support, then costs more in extended support. Upgrade a version or two a year.", hold: 6 },
]);
S.start();
