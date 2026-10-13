// Lesson 11 in 3D: lockers (PersistentVolumes), a claim ticket (PVC), and a StorageClass press.
const S = createStage({ home: { target: [0, 22, -8], dir: [0.95, 1, 1.1], zoom: 1.05 }, viewH: 260 });
const { box, cyl, lamp, crate, housing, part, own, label } = S;

const TOP = 12;
const RACK = { x: 74, z: -49, w: 156, d: 34 }, RACK_H = 4;
const SLOTS = [32, 78, 124];
const PRESS = { x: -121, z: -49, w: 58, d: 34, h: 30 };
const TRAY = { x: -53, z: 25, w: 150, d: 62 };
const POD = { x: -57, z: 23, w: 110, d: 38, h: 18 };
const ZONES = { fs: { x: -92, z: 23 }, empty: { x: -56, z: 23 } };
const TAG = { x: -20, z: 23 };
const MAXT = 8, TILE = { w: 22, d: 14 };
const LOCKER = { w: 40, d: 26, h: 30, z: -49 };

part("plate", { kind: "Storage", title: "Lockers and a claim ticket", noFrame: true, zoom: 1, anchor: V(0, 30, -8), desc: "A pod writes records in three places. Restart its container or delete it, and see which records survive.", yaml: "kubectl get pv,pvc" });
own("plate", S.plate({ x: 4, z: 0, w: 328, d: 150 }));
part("press", { kind: "StorageClass", title: "StorageClass standard", zoom: 2.4, anchor: V(PRESS.x, PRESS.h + 12, PRESS.z),
  desc: () => `Makes a new PersistentVolume whenever a claim asks for one (dynamic provisioning), using a CSI driver. Its <b>reclaimPolicy: ${policy}</b> is copied onto each volume it makes.`,
  yaml: () => `kind: StorageClass\nmetadata: { name: standard }\nprovisioner: ebs.csi.aws.com\nreclaimPolicy: ${policy}`,
  actions: () => [{ label: "Switch reclaimPolicy to " + (policy === "Delete" ? "Retain" : "Delete"), run: setPolicy }] });
own("press", housing({ x: PRESS.x, z: PRESS.z, w: PRESS.w, d: PRESS.d, h: PRESS.h }));
const pressLamp = lamp(PRESS.x + 22, PRESS.h, PRESS.z - 10, { r: 1.3, state: "off" });
own("press", pressLamp.mesh);
label("press", "StorageClass");
part("rack", { kind: "PersistentVolumes", title: "Volume rack", zoom: 1.8, anchor: V(RACK.x, LOCKER.h + 16, RACK.z), desc: "Each locker is a PersistentVolume: real storage (a cloud disk, an NFS share) that exists apart from any pod.", yaml: "kubectl get pv" });
own("rack", box(RACK.w, RACK_H, RACK.d, { x: RACK.x, z: RACK.z, tone: "lo", r: 1 }));
label("rack", "PersistentVolumes", { anchor: V(RACK.x, 8, RACK.z + 22) });

// tile stacks
const stack = (x, y0, z, part_) => Array.from({ length: MAXT }, (_, i) => { const t = box(TILE.w, 1.3, TILE.d, { x, y0: y0 + i * 1.6, z, tone: "hi", r: 0.4 }); own(part_, t); t.visible = false; return t; });
const lockers = SLOTS.map((x, i) => {
  const id = part("pv-" + i, { kind: "PersistentVolume", dynamic: true, zoom: 2.8, anchor: () => V(pvAt(i)?.x ?? x, RACK_H + LOCKER.h + 14, LOCKER.z),
    title: () => { const v = pvAt(i); return v ? pvName(v.id) : "empty slot"; },
    desc: () => { const v = pvAt(i); if (!v) return ""; return `<b>${v.state}</b>, 5Gi. Holds <b>${v.data}</b> records. ` + (v.state === "Bound" ? "Bound to the claim pvc/data, so the pod mounts it." : v.state === "Released" ? "Its claim was deleted, but reclaimPolicy Retain kept it and its data. It is not reused automatically." : ""); } });
  const g = new THREE.Group();
  g.add(housing({ x: 0, z: 0, w: LOCKER.w, d: LOCKER.d, h: LOCKER.h, y0: RACK_H, plinth: false }), box(5, 2, 1.4, { x: 11, y0: RACK_H + 12, z: LOCKER.d / 2 + 0.7, tone: "hi", r: 0.4 }));
  const l = lamp(15, RACK_H + LOCKER.h, -8, { r: 1.2, state: "off" });
  g.add(l.mesh);
  g.position.set(x, 0, LOCKER.z);
  own(id, g);
  const tiles = Array.from({ length: MAXT }, (_, t) => { const m = box(TILE.w, 1.3, TILE.d, { x: -4, y0: RACK_H + LOCKER.h + t * 1.6, z: 0, tone: "hi", r: 0.4 }); g.add(m); m.visible = false; return m; });
  S.PARTS[id].meshes.push(...tiles);
  tiles.forEach((m) => (m.userData.part = id));
  g.visible = false;
  label(id, "", { small: true });
  return { g, l, tiles, id };
});

// the node and the pod
part("node", { kind: "Node", title: "node-1", zoom: 1.6, anchor: V(TRAY.x, TOP + 4, TRAY.z + 34), desc: "The node running the pod.", yaml: "" });
own("node", S.tray({ x: TRAY.x, z: TRAY.z, w: TRAY.w, d: TRAY.d, top: TOP }));
part("pod", { kind: "Pod", title: () => "pod/" + podName, zoom: 2, anchor: V(POD.x, TOP + POD.h + 16, POD.z),
  desc: () => `Writes every record three times: to its container's filesystem (<b>${data.fs}</b>), its emptyDir volume (<b>${data.empty}</b>) and its PersistentVolume (<b>${boundPv() ? boundPv().data : "none"}</b>).`,
  yaml: "volumes:\n- { name: scratch, emptyDir: {} }\n- { name: data, persistentVolumeClaim: { claimName: data } }",
  actions: () => [{ label: "Write a record", run: write }, { label: "Restart the container", run: restartContainer }, { label: "Delete the pod", danger: true, run: deletePod }] });
const podGroup = crate({ w: POD.w, h: POD.h, d: POD.d, ribs: 8 });
own("pod", podGroup);
podGroup.position.set(POD.x, TOP, POD.z);
label("pod", "pod");
part("fs", { kind: "Container filesystem", title: "Container's own filesystem", zoom: 3, anchor: V(ZONES.fs.x, TOP + POD.h + 14, ZONES.fs.z), desc: () => `<b>${data.fs}</b> records. Lives as long as the container: a restart starts it fresh.`, yaml: "" });
own("fs", S.rect(ZONES.fs.x - 15, ZONES.fs.z - 14, ZONES.fs.x + 15, ZONES.fs.z + 14, TOP + POD.h + 0.1, "edgeMid"));
const fsTiles = stack(ZONES.fs.x, TOP + POD.h, ZONES.fs.z, "fs");
label("fs", "container fs", { small: true });
part("empty", { kind: "emptyDir volume", title: "emptyDir", zoom: 3, anchor: V(ZONES.empty.x, TOP + POD.h + 14, ZONES.empty.z), desc: () => `<b>${data.empty}</b> records. Belongs to the pod: it survives container restarts, but is deleted with the pod.`, yaml: "volumes: [{ name: scratch, emptyDir: {} }]" });
own("empty", S.rect(ZONES.empty.x - 15, ZONES.empty.z - 14, ZONES.empty.x + 15, ZONES.empty.z + 14, TOP + POD.h + 0.1, "edgeMid"));
const emptyTiles = stack(ZONES.empty.x, TOP + POD.h, ZONES.empty.z, "empty");
label("empty", "emptyDir", { small: true });
part("pvc", { kind: "PersistentVolumeClaim", title: "pvc/data · 5Gi RWO", zoom: 3, anchor: V(TAG.x, TOP + POD.h + 12, TAG.z),
  desc: () => (pvc.exists ? `A request for storage: 5Gi, ReadWriteOnce, class standard. ${boundPv() ? "Bound to " + pvName(boundPv().id) + "." : "Waiting for a volume."}` : "Deleted. Create it again and the StorageClass makes a new, empty volume."),
  yaml: "kind: PersistentVolumeClaim\nmetadata: { name: data }\nspec: { storageClassName: standard, accessModes: [ReadWriteOnce], resources: { requests: { storage: 5Gi } } }",
  actions: () => [pvc.exists ? { label: "Delete the PVC", danger: true, run: togglePvc } : { label: "Create the PVC", run: togglePvc }] });
own("pvc", box(28, 1.2, 26, { x: TAG.x, y0: TOP + POD.h, z: TAG.z, tone: "mid", r: 0.5 }));
label("pvc", "pvc/data", { small: true });
// the mount cable, rebuilt each frame
const cableGeo = new THREE.BufferGeometry();
const cableMat = new THREE.LineDashedMaterial({ dashSize: 2, gapSize: 1.4 });
S.onTheme((p) => cableMat.color.set(p.edgeHi));
const cable = new THREE.Line(cableGeo, cableMat);
S.world.add(cable);

// ---- model ----
let pvSeq = 0, podSeq = 0, policy = "Delete", podName = "", podGone = 0, restartT = 0, pressing = 0, msg = "";
const data = { fs: 0, empty: 0 };
const pvs = [];
const pvc = { exists: true, pv: null };
const pvName = (id) => "pvc-" + ["8f2c", "b71a", "4d9e", "e05b", "c3a7", "71fd"][id % 6];
const pvAt = (slot) => pvs.find((v) => v.slot === slot);
const boundPv = () => pvs.find((v) => v.id === pvc.pv);
const newPod = () => { podName = "app-7c9d-" + ["k2m4", "x8qp", "t3vn", "r6wz"][podSeq++ % 4]; };
function provision() {
  const slot = [0, 1, 2].find((s) => !pvs.some((v) => v.slot === s));
  if (slot === undefined) { msg = "The rack is full of Released volumes. An admin would delete them to make room."; return; }
  pvs.push({ id: pvSeq++, slot, state: "Provisioning", data: 0, x: PRESS.x + PRESS.w / 2 + 10, t: 0 });
  pvc.pv = pvs[pvs.length - 1].id; pressing = 1.6;
}
newPod(); provision(); Object.assign(pvs[0], { x: SLOTS[0], state: "Bound" }); pressing = 0;
function write() { if (podGone || restartT) return; data.fs++; data.empty++; const v = boundPv(); if (v && v.state === "Bound") v.data++; msg = "The app wrote a record to each place."; }
function restartContainer() { restartT = 1.2; data.fs = 0; msg = "The container restarted: its own filesystem starts fresh. The emptyDir belongs to the pod and the PV is outside it, so both keep their data."; }
function deletePod() { podGone = 1.6; data.fs = 0; data.empty = 0; msg = "The pod was deleted and replaced. emptyDir is gone with it; the new pod mounts the same claim, so the PV's data is still there."; }
function togglePvc() {
  if (pvc.exists) { pvc.exists = false; const v = boundPv(); pvc.pv = null; if (v) { if (policy === "Delete") { v.state = "Deleting"; v.t = 0; msg = "PVC deleted with reclaimPolicy Delete: the volume and its data are deleted too."; } else { v.state = "Released"; msg = "PVC deleted with reclaimPolicy Retain: the volume and its data stay, marked Released."; } } }
  else { pvc.exists = true; provision(); msg = "New PVC: the StorageClass provisions a brand-new, empty volume and binds it to the claim."; }
}
function setPolicy() { policy = policy === "Delete" ? "Retain" : "Delete"; msg = `reclaimPolicy is now ${policy}: it decides what happens to a volume when its claim is deleted.`; }

S.onTick((dt) => {
  pressing = Math.max(0, pressing - dt);
  restartT = Math.max(0, restartT - dt);
  if (podGone) { podGone = Math.max(0, podGone - dt); if (!podGone) newPod(); }
  for (const v of pvs) {
    v.t += dt;
    const tx = v.state === "Provisioning" && pressing > 0.6 ? PRESS.x + PRESS.w / 2 + 10 : SLOTS[v.slot];
    v.x = easeTo(v.x, tx, dt, 0.35);
    if (v.state === "Provisioning" && !pressing && Math.abs(v.x - tx) < 0.5) v.state = pvc.pv === v.id ? "Bound" : "Available";
  }
  for (let i = pvs.length - 1; i >= 0; i--) if (pvs[i].state === "Deleting" && pvs[i].t > 1.2) pvs.splice(i, 1);
  fsTiles.forEach((t, i) => (t.visible = i < data.fs));
  emptyTiles.forEach((t, i) => (t.visible = i < data.empty));
  lockers.forEach((L, i) => {
    const v = pvAt(i);
    L.g.visible = !!v;
    if (!v) { S.setLabel(L.id, "", { show: false }); return; }
    L.g.position.x = v.x;
    L.g.scale.y = v.state === "Deleting" ? Math.max(0.01, 1 - v.t / 1.2) : 1;
    L.l.set(v.state === "Bound" ? "on" : v.state === "Released" ? "bad" : "off");
    L.tiles.forEach((t, k) => (t.visible = k < v.data));
    S.labels[L.id].obj.position.set(v.x, RACK_H + LOCKER.h + 8, LOCKER.z + 8);
    S.setLabel(L.id, `${pvName(v.id)} · ${v.state}`, { bad: v.state === "Released" || v.state === "Deleting" });
  });
  pressLamp.set(pressing > 0 ? "accent" : "off");
  podGroup.visible = !(podGone && Math.cos(podGone * 6) > 0.2);
  podGroup.scale.y = restartT ? 0.9 + 0.1 * Math.abs(Math.cos(restartT * 8)) : 1;
  S.setLabel("pod", "pod/" + podName);
  S.setLabel("pvc", pvc.exists ? "pvc/data" : "pvc/data · deleted", { bad: !pvc.exists });
  const v = boundPv();
  if (v && v.state === "Bound" && !podGone) {
    const pts = [V(POD.x + POD.w / 2, TOP + 8, POD.z), V(POD.x + POD.w / 2 + 8, TOP + 8, POD.z), V(POD.x + POD.w / 2 + 8, 0.4, POD.z), V(v.x, 0.4, POD.z), V(v.x, 0.4, LOCKER.z + 18), V(v.x, RACK_H + 4, LOCKER.z + 18), V(v.x, RACK_H + 8, LOCKER.z + LOCKER.d / 2)];
    cableGeo.setFromPoints(pts); cable.computeLineDistances(); cable.visible = true;
  } else cable.visible = false;
  S.say(`container fs ${data.fs} · emptyDir ${data.empty} · PV ${v ? v.data : "none"}`);
  syncUi();
});

S.overview = () => `<h2>Which data survives?</h2><p class="muted">Write some records, then restart the container or delete the pod. Pick a part:</p>`;
const ui = { status: document.getElementById("st-status"), rows: document.getElementById("st-rows"), pvcBtn: document.getElementById("st-pvc"), policy: document.getElementById("st-policy") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => { S.stopTour(); ({ write, rc: restartContainer, dp: deletePod, pvc: togglePvc, pol: setPolicy })[b.dataset.do](); S.renderPanel(); }));
function syncUi() {
  const m = msg || "Write a few records, then restart the container or delete the pod and see which data survives.";
  if (ui.status.textContent !== m) ui.status.textContent = m;
  ui.status.dataset.tone = /deleted too|fresh|gone/.test(msg) ? "bad" : "";
  const t1 = pvc.exists ? "Delete the PVC" : "Create the PVC again", t2 = "reclaimPolicy: " + policy;
  if (ui.pvcBtn.textContent !== t1) ui.pvcBtn.textContent = t1;
  if (ui.policy.textContent !== t2) ui.policy.textContent = t2;
  const v = boundPv();
  const html = [["Container filesystem", data.fs, "the container", "lost on container restart"], ["emptyDir volume", data.empty, "the pod", "lost when the pod is deleted"], ["PersistentVolume via PVC", v ? v.data : "–", "the cluster", "kept until its claim is deleted (then reclaimPolicy)"]].map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
}

// ---- what the inspector shows ----
Object.assign(S.PARTS.press, { manifest: () => K.storageclass({ reclaim: policy }), facts: () => [["Provisioner", "ebs.csi.aws.com"], ["reclaimPolicy", policy]] });
Object.assign(S.PARTS.pvc, { manifest: () => (pvc.exists ? K.pvc({ name: "data", volume: boundPv() ? pvName(boundPv().id) : "", phase: boundPv() && boundPv().state === "Bound" ? "Bound" : "Pending" }) : "# deleted\n$ kubectl delete pvc data\npersistentvolumeclaim \"data\" deleted"), facts: () => [["Status", pvc.exists ? (boundPv() ? "Bound to " + pvName(boundPv().id) : "Pending") : "deleted"], ["Request", "5Gi, ReadWriteOnce"]] });
lockers.forEach((L, i) => Object.assign(S.PARTS[L.id], { manifest: () => { const v = pvAt(i); return v ? K.pv({ name: pvName(v.id), claim: v.state === "Bound" ? "data" : v.state === "Released" ? "data" : "", reclaim: policy, phase: v.state === "Deleting" ? "Released" : v.state === "Provisioning" ? "Pending" : v.state }) : ""; }, facts: () => { const v = pvAt(i); return v ? [["Status", v.state], ["Records", v.data], ["Capacity", "5Gi"]] : []; } }));
Object.assign(S.PARTS.pod, { manifest: () => K.pod({ name: podName, labels: { app: "app" }, node: "node-1", ip: "10.244.1.60", restarts: 0, owner: { kind: "ReplicaSet", name: "app-7c9d" }, volumes: [{ name: "scratch", path: "/scratch", src: "emptyDir: {}   # ← lives as long as the pod" }, { name: "data", path: "/data", src: "persistentVolumeClaim: { claimName: data }   # ← outlives the pod" }] }), facts: () => [["Container fs", data.fs + " records"], ["emptyDir", data.empty + " records"], ["PV", (boundPv() ? boundPv().data : 0) + " records"]] });
Object.assign(S.PARTS.fs, { manifest: () => `# inside the container: the writable layer on top of the image\n$ ls /var/app/records | wc -l\n${data.fs}   # ← gone on container restart` });
Object.assign(S.PARTS.empty, { manifest: () => `volumes:\n- name: scratch\n  emptyDir: {}   # ← created with the pod, deleted with the pod\n# $ ls /scratch | wc -l  →  ${data.empty}` });
Object.assign(S.PARTS.rack, { manifest: () => pvs.length ? pvs.map((v) => K.pv({ name: pvName(v.id), claim: v.state === "Bound" ? "data" : "", reclaim: policy, phase: v.state })).join("\n---\n") : "# no PersistentVolumes", kubectl: "kubectl get pv" });

S.setTour([
  { home: true, say: "A pod on a node, a rack of storage lockers, and a StorageClass press that builds new ones.", hold: 5 },
  { focus: "pod", zoom: 2, say: "The app writes three records, each into three places: its container's filesystem, an emptyDir, and a PersistentVolume.", run: () => { write(); setTimeout(write, 600); setTimeout(write, 1200); }, hold: 6 },
  { focus: "fs", zoom: 2.6, say: "The container crashes and restarts: its own filesystem starts empty.", run: restartContainer, hold: 6 },
  { focus: "empty", zoom: 2.6, say: "Delete the whole pod: the emptyDir goes with it.", run: () => { write(); setTimeout(deletePod, 800); }, hold: 6 },
  { focus: "pv-0", zoom: 2.4, say: "The PersistentVolume lives outside the pod. The replacement pod mounts the same claim and finds every record.", hold: 6 },
  { focus: "pvc", zoom: 2.8, say: "Delete the claim with reclaimPolicy Delete, and the volume and its data are deleted too.", run: togglePvc, hold: 5 },
  { focus: "press", zoom: 2.2, say: "Create the claim again: the StorageClass presses out a brand-new, empty volume and binds it.", run: togglePvc, hold: 6 },
  { home: true, say: "Container files die with the container, emptyDir with the pod; PersistentVolumes outlive both.", hold: 5 },
]);
S.start();
