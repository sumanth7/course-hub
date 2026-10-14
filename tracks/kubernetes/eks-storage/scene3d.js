// Lesson 25 in 3D: storage on EKS. EBS volumes live in one AZ and attach to one node; EFS spans AZs and many
// pods. A database (StatefulSet + EBS) and a web app sharing uploads (EFS) across three AZs.
const S = createStage({ home: { target: [-24, 10, -12], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 255, minW: 470, phoneMinW: 420 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 11;
const AZ = [{ name: "us-east-1a", z: -72 }, { name: "us-east-1b", z: 0 }, { name: "us-east-1c", z: 72 }];
const NODE_NAMES = ["ip-10-0-1-17", "ip-10-0-2-41", "ip-10-0-3-88"];
const NODE_X = -60, EBS_X = 40, EFS = { x: 160, z: 0 }, CSI = { x: -190, z: -112 }, EC2 = { x: -90, z: -120 }, SNAP = { x: 40, z: -122 };

part("plate", { kind: "Storage on EKS", title: "Volumes and Availability Zones", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "Three AZs from back to front, each with a node. EBS volumes (the discs) belong to one AZ and attach to one node at a time. The EFS file system on the right is reachable from every AZ, by many pods at once." });
own("plate", S.plate({ x: 0, z: -14, w: 470, d: 300 }));
AZ.forEach((a) => { S.world.add(S.lines([[V(-230, 0.08, a.z + 36), V(110, 0.08, a.z + 36)]], "edgeLo")); S.label("plate", a.name, { small: true, anchor: V(-225, 2, a.z), lod: 1.2 }); });
own("plate", track([[[CSI.x, CSI.z], [SNAP.x, CSI.z]], [[EC2.x, CSI.z], [EC2.x, AZ[2].z]], ...AZ.map((a) => [[EC2.x, a.z + 28], [EFS.x - 30, a.z + 28]])], { width: 4 }));

// ---- nodes, pods, EBS volumes per AZ ----
const azVis = AZ.map((a, i) => {
  const id = part("node-" + i, { kind: "Node", title: `node in ${a.name}`, zoom: 2, anchor: V(NODE_X, TOP + 24, a.z), desc: () => `A worker node in ${a.name}. ${st.up[i] ? "" : "<b>Down</b> (drained or its AZ failed)."} It can only attach EBS volumes from ${a.name}.`,
    actions: () => [{ label: st.up[i] ? "Take this node down" : "Bring it back", danger: st.up[i], run: () => setUp(i, !st.up[i]) }] });
  own(id, S.tray({ x: NODE_X, z: a.z, w: 80, d: 46, top: TOP }));
  label(id, `node · ${a.name}`);
  const web = crate({ w: 18, h: 11, d: 16, ribs: 3 }); web.position.set(NODE_X - 20, TOP, a.z); own(id, web);
  const wl = lamp(NODE_X - 14, TOP + 11, a.z - 4, { r: 1.1 }); own(id, wl.mesh);
  const db = crate({ w: 22, h: 13, d: 18, ribs: 4 }); db.position.set(NODE_X + 16, TOP, a.z); db.visible = false; own(id, db);
  const dl = lamp(NODE_X + 23, TOP + 13, a.z - 4, { r: 1.2 }); own(id, dl.mesh); dl.mesh.visible = false;
  const vid = part("ebs-" + i, { kind: "EBS volume", dynamic: true, title: () => (vols().find((v) => v.az === i) ? vols().find((v) => v.az === i).id : "no volume"), zoom: 2.8, anchor: V(EBS_X, 22, a.z),
    desc: () => { const v = vols().find((x) => x.az === i); return v ? `An EBS gp3 volume, <b>${v.size}Gi</b>, in ${a.name}. It can attach to one node in this AZ only. ${v.attached ? "Attached to the node here." : "Not attached."}${v.from ? " Restored from a snapshot." : ""}` : "No volume in this AZ."; } });
  const disk = cyl(10, 7, { x: EBS_X, z: a.z, seg: 32, tone: "hi" }); own(vid, disk); disk.visible = false;
  const dlamp = lamp(EBS_X + 6, 7, a.z, { r: 1.1 }); own(vid, dlamp.mesh); dlamp.mesh.visible = false;
  label(vid, "", { small: true });
  const attachMat = new THREE.LineBasicMaterial(); S.onTheme((p) => attachMat.color.set(p.accent));
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(NODE_X + 28, 8, a.z), V(EBS_X - 10, 4, a.z)]), attachMat); S.world.add(wire); wire.visible = false;
  return { web, wl, db, dl, disk, dlamp, wire };
});
part("efs", { kind: "EFS file system", title: "EFS fs-0shopuploads", zoom: 1.8, anchor: V(EFS.x, 30, EFS.z), desc: "A shared NFS file system that lives across all AZs, with a mount target (an ENI) in each. Any number of pods in any AZ can mount it read-write (ReadWriteMany). Slower and pricier per GB than EBS, but it survives an AZ failure and needs no attach step." });
own("efs", housing({ x: EFS.x, z: EFS.z, w: 40, d: 190, h: 18 }));
const mtLamps = AZ.map((a) => { const l = lamp(EFS.x - 20, 8, a.z, { r: 1.3 }); own("efs", l.mesh); return l; });
label("efs", "EFS (all AZs)");
part("csi", { kind: "CSI driver", title: "ebs-csi-controller", zoom: 2.6, anchor: V(CSI.x, 26, CSI.z), desc: "The EBS CSI driver's controller. When a PVC needs a volume it calls EC2 CreateVolume in the right AZ, then AttachVolume to the node; its DaemonSet half mounts it into the pod. It needs IAM permissions (via IRSA or Pod Identity, lesson 24)." });
const csiCrate = crate({ w: 26, h: 13, d: 20, ribs: 4 }); csiCrate.position.set(CSI.x, 0, CSI.z);
const csiLamp = lamp(CSI.x + 9, 13, CSI.z + 5, { r: 1.2, state: "off" });
own("csi", csiCrate, csiLamp.mesh);
label("csi", "EBS CSI controller");
part("ec2", { kind: "AWS API", title: "EC2 / EBS API", zoom: 2.6, anchor: V(EC2.x, 24, EC2.z), desc: "CreateVolume, AttachVolume, ModifyVolume, CreateSnapshot: the calls the CSI driver makes for you." });
own("ec2", housing({ x: EC2.x, z: EC2.z, w: 34, d: 20, h: 12 }));
const ec2Lamp = lamp(EC2.x + 12, 12, EC2.z, { r: 1.2, state: "off" }); own("ec2", ec2Lamp.mesh);
label("ec2", "EC2 / EBS API");
part("snap", { kind: "Snapshot", title: "EBS snapshot (regional)", zoom: 2.6, anchor: V(SNAP.x, 22, SNAP.z), desc: () => (st.snapshot ? `A snapshot of the database volume, stored regionally (in S3), not in one AZ. A new volume can be created from it in any AZ: that's how data moves between AZs.` : "No snapshot yet.") });
own("snap", S.openBox({ x: SNAP.x, z: SNAP.z, w: 30, d: 20, h: 10 }));
const snapDisk = cyl(7, 4, { x: SNAP.x, y0: 2, z: SNAP.z, seg: 28, tone: "hi" }); own("snap", snapDisk); snapDisk.visible = false;
label("snap", "snapshots");

// ---- the model ----
const st = { binding: "wait", up: [true, true, true], dbVol: null, vols: [], snapshot: null, dbPod: "pending", busy: false, webOnEbs: false, size: 20, clock: 0, volSeq: 0 };
let msg = "";
const vols = () => st.vols;
const P = (x, z) => V(x, FY, z);
const net = S.packets({ speed: 220, onArrive: (d) => d.next && d.next() });
const go = (pts, data, next) => net.add(pts.map(([x, z]) => P(x, z)), { ...data, next });
let csiBlink = 0, ec2Blink = 0;
function createVolume(az, from, then) {
  csiBlink = 0.6;
  go([[CSI.x, CSI.z], [EC2.x, CSI.z]], { ring: true }, () => { ec2Blink = 0.6;
    go([[EC2.x, CSI.z], [EC2.x, AZ[az].z + 28], [EBS_X, AZ[az].z + 28], [EBS_X, AZ[az].z + 12]], { alt: true }, () => {
      const v = { id: "vol-0" + (9 + st.volSeq++).toString(16) + "f9c1e2a7b4d", az, size: st.size, attached: false, from };
      st.vols.push(v); st.dbVol = v;
      S.event("Normal", "ProvisioningSucceeded", "persistentvolumeclaim/data-db-0", `Successfully provisioned volume pvc-7b4d… (${v.id}) in ${AZ[az].name}`, "ebs.csi.aws.com");
      then?.(v);
    });
  });
}
function attach(v) {
  go([[EC2.x, CSI.z], [EC2.x, AZ[v.az].z + 28], [NODE_X + 30, AZ[v.az].z + 28]], { ring: true }, () => { v.attached = true; st.dbPod = "running"; st.dbAz = v.az; S.event("Normal", "SuccessfulAttachVolume", "pod/db-0", `AttachVolume.Attach succeeded for volume "pvc-7b4d…" (${v.id})`, "attachdetach-controller"); st.busy = false; });
}
// schedule db-0: the scheduler must honour where its volume lives
function scheduleDb() {
  if (st.busy) return;
  const v = st.dbVol;
  if (!v) {
    if (st.binding === "wait") { const az = [0, 1, 2].find((i) => st.up[i]); if (az === undefined) return; st.busy = true; msg = `WaitForFirstConsumer: the scheduler picks a node first (${AZ[az].name}), then the CSI driver creates the volume in that same AZ.`; createVolume(az, null, attach); }
    else { const az = 2; st.busy = true; msg = `Immediate binding: the volume is created as soon as the PVC exists, in an AZ chosen without looking at pods: ${AZ[az].name}. The pod must now follow it there.`; createVolume(az, null, (vv) => { st.busy = false; }); }
    return;
  }
  if (st.dbPod === "running" && st.up[v.az]) return;
  if (st.up[v.az]) { if (!v.attached) { st.busy = true; st.dbPod = "attaching"; attach(v); } return; }
  if (st.dbPod !== "conflict") { st.dbPod = "conflict"; v.attached = false; S.event("Warning", "FailedScheduling", "pod/db-0", `0/3 nodes are available: 1 node(s) were unschedulable, 2 node(s) had volume node affinity conflict.`, "default-scheduler"); msg = `db-0 can't move: its EBS volume is in ${AZ[v.az].name}, and the other nodes are in other AZs. The pod stays Pending with "volume node affinity conflict". Restore a snapshot into another AZ, or bring the node back.`; }
}
function setUp(i, up) { st.up[i] = up; if (!up && st.dbVol && st.dbVol.az === i) { st.dbPod = "moving"; st.dbVol.attached = false; } msg = up ? `${AZ[i].name}'s node is back.` : `${AZ[i].name}'s node is down. web keeps serving from the other AZs, still reading and writing the same EFS files.`; }
function snapshot() { if (!st.dbVol) return; csiBlink = 0.6; go([[EBS_X, AZ[st.dbVol.az].z - 12], [EBS_X, SNAP.z + 10]], { alt: true }, () => { st.snapshot = { id: "snap-0a1b2c3d4e5f6", from: st.dbVol.id, size: st.dbVol.size }; msg = "Snapshot taken: it's regional, so it can be restored into any AZ."; S.event("Normal", "SnapshotReady", "volumesnapshot/db-snap", "Snapshot snap-0a1b2c3d4e5f6 is ready to use", "snapshot-controller"); }); }
function restore() {
  if (!st.snapshot) { msg = "Take a snapshot first (while the volume is reachable)."; return false; }
  const az = [0, 1, 2].find((i) => st.up[i] && (!st.dbVol || i !== st.dbVol.az));
  if (az === undefined) { msg = "No healthy AZ to restore into."; return false; }
  const old = st.dbVol; st.busy = true; st.dbPod = "moving";
  msg = `New PVC from the snapshot: the CSI driver creates a fresh volume from it in ${AZ[az].name}, and db-0 starts there with its data.`;
  go([[SNAP.x, SNAP.z + 10], [SNAP.x, CSI.z]], { alt: true }, () => createVolume(az, st.snapshot.id, (v) => { st.vols = st.vols.filter((x) => x !== old); attach(v); }));
  return true;
}
function setBinding(b) { st.binding = b; msg = b === "wait" ? "WaitForFirstConsumer: volumes are created where the pod is scheduled. The right default for EBS." : "Immediate: volumes are created as soon as the PVC is, in some AZ, before any pod exists. Recreate the PVC to see where it lands."; }
function recreate() { st.vols = st.vols.filter((v) => v !== st.dbVol); st.dbVol = null; st.dbPod = "pending"; st.busy = false; st.snapshot = st.snapshot; }
function resize(n) { if (!st.dbVol) return; st.size = n; csiBlink = 0.6; go([[CSI.x, CSI.z], [EC2.x, CSI.z]], { ring: true }, () => { ec2Blink = 0.6; st.dbVol.size = n; msg = `Expanded online to ${n}Gi: the CSI driver calls ModifyVolume, then the filesystem is grown. The StorageClass has allowVolumeExpansion: true. EBS can only grow, never shrink.`; S.event("Normal", "FileSystemResizeSuccessful", "pod/db-0", `MountVolume.NodeExpandVolume succeeded for volume "pvc-7b4d…"`, "kubelet"); }); }

let tick = 0;
S.onTick((dt) => {
  st.clock += dt; net.step(dt);
  tick -= dt; if (tick <= 0) { tick = 0.3; scheduleDb(); }
  csiBlink = Math.max(0, csiBlink - dt); ec2Blink = Math.max(0, ec2Blink - dt);
  csiLamp.set(csiBlink > 0 ? "accent" : "on"); ec2Lamp.set(ec2Blink > 0 ? "accent" : "off");
  azVis.forEach((v, i) => {
    const up = st.up[i];
    v.web.visible = up; v.wl.mesh.visible = up; v.wl.set(Math.sin(st.clock * 3 + i) > 0.6 ? "accent" : "on");
    const vol = st.vols.find((x) => x.az === i);
    v.disk.visible = !!vol; v.dlamp.mesh.visible = !!vol; if (vol) { v.disk.scale.y = 0.6 + vol.size / 50; v.dlamp.set(vol.attached ? "accent" : "on"); }
    S.setLabel("ebs-" + i, vol ? `${vol.id.slice(0, 9)}… ${vol.size}Gi` : "", { show: !!vol });
    v.wire.visible = !!vol && vol.attached && up;
    const here = st.dbVol && st.dbVol.az === i && st.dbPod === "running" && up;
    v.db.visible = here; v.dl.mesh.visible = here; v.dl.set("on");
    S.setLabel("node-" + i, `node · ${AZ[i].name}${up ? "" : " · down"}${here ? " · db-0" : ""}`, { bad: !up });
    mtLamps[i].set(up ? "on" : "off");
  });
  snapDisk.visible = !!st.snapshot;
  S.say(`db-0: ${{ running: "Running", pending: "Pending (no volume yet)", attaching: "ContainerCreating (attaching)", conflict: "Pending: volume node affinity conflict", moving: "Pending" }[st.dbPod]}${st.dbVol ? ` · volume in ${AZ[st.dbVol.az].name}` : ""} · web on EFS: ${st.up.filter(Boolean).length}/3 replicas`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>Volumes live in one AZ</h2><p class="muted">The database's EBS disc is tied to its AZ; the web pods share EFS across all three. Take a node down and see who can move. Pick a part:</p>`;
const ui = { status: document.getElementById("st-status"), bind: [...document.querySelectorAll("[data-bind]")], down: document.getElementById("st-down") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "down") { const i = st.dbVol ? st.dbVol.az : 0; setUp(i, !st.up[i]); }
  if (a === "snap") { S.shellEcho?.("kubectl apply -f db-snapshot.yaml", "button"); snapshot(); }
  if (a === "restore") { S.shellEcho?.("kubectl apply -f data-db-0-from-snapshot.yaml", "button"); restore(); }
  if (a === "bind") { setBinding(b.dataset.bind); recreate(); }
  if (a === "resize") resize(st.size + 20);
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  ui.bind.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bind === st.binding)));
  const i = st.dbVol ? st.dbVol.az : 0;
  set(ui.down, st.up[i] ? `Take down db's node (${AZ[i].name})` : `Bring back ${AZ[i].name}`);
  set(ui.status, msg || "db-0 runs with an EBS volume in us-east-1a. web runs three replicas, one per AZ, sharing EFS.");
  ui.status.dataset.tone = st.dbPod === "conflict" ? "bad" : "";
}

// ---- what the inspector shows ----
const scY = () => `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations: { storageclass.kubernetes.io/is-default-class: "true" }
provisioner: ebs.csi.aws.com
volumeBindingMode: ${st.binding === "wait" ? "WaitForFirstConsumer   # ← create the volume where the pod lands" : "Immediate   # ← create it now, in any AZ: the pod must follow"}
allowVolumeExpansion: true   # ← PVCs can grow
parameters: { type: gp3, encrypted: "true" }
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs
provisioner: efs.csi.aws.com
parameters: { provisioningMode: efs-ap, fileSystemId: fs-0shopuploads, directoryPerms: "700" }   # ← an access point per PVC`;
const pvcY = () => `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-db-0
  namespace: shop
spec:
  accessModes: [ReadWriteOnce]   # ← EBS: one node at a time
  storageClassName: gp3
  resources: { requests: { storage: ${st.size}Gi } }
${st.restoredFrom ? "  dataSource: { apiGroup: snapshot.storage.k8s.io, kind: VolumeSnapshot, name: db-snap }   # ← start from the snapshot\n" : ""}status:
  phase: ${st.dbVol ? "Bound" : "Pending"}`;
const pvY = () => (st.dbVol ? `apiVersion: v1
kind: PersistentVolume
metadata:
  name: pvc-7b4d9c1e
spec:
  capacity: { storage: ${st.dbVol.size}Gi }
  accessModes: [ReadWriteOnce]
  csi: { driver: ebs.csi.aws.com, volumeHandle: ${st.dbVol.id} }
  nodeAffinity:   # ← the scheduler may only put db-0 in this AZ
    required:
      nodeSelectorTerms:
      - matchExpressions: [{ key: topology.kubernetes.io/zone, operator: In, values: [${AZ[st.dbVol.az].name}] }]` : "# no PersistentVolume yet");
const RES = { "spec.resources.requests.storage": { check: (v) => { const n = parseInt(v); return !/^\d+Gi$/.test(String(v)) ? "use Gi, e.g. 40Gi" : n < st.size ? "field can not be less than previous value" : n > 200 ? "200Gi max here" : ""; }, set: (v) => { const n = parseInt(v); if (n !== st.size) resize(n); } } };
Object.assign(S.PARTS.csi, { manifest: scY });
AZ.forEach((_, i) => Object.assign(S.PARTS["ebs-" + i], { manifest: () => (st.dbVol && st.dbVol.az === i ? pvcY() + "\n---\n" + pvY() : ""), fields: (kind) => (kind === "PersistentVolumeClaim" ? RES : kind === "PersistentVolume" ? {} : null) }));
Object.assign(S.PARTS.efs, { manifest: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: uploads
  namespace: shop
spec:
  accessModes: [ReadWriteMany]   # ← all three web pods, in three AZs, at once
  storageClassName: efs
  resources: { requests: { storage: 5Gi } }   # ← required by the API, ignored by EFS (it grows as needed)
status:
  phase: Bound` });
Object.assign(S.PARTS.snap, { manifest: () => (st.snapshot ? `apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: db-snap
  namespace: shop
spec:
  volumeSnapshotClassName: ebs-snapclass
  source: { persistentVolumeClaimName: data-db-0 }
status:
  readyToUse: true
  boundVolumeSnapshotContentName: snapcontent-9f2c   # ← backed by ${st.snapshot.id}` : "# no VolumeSnapshot yet") });

// ---- kubectl and the YAML editor ----
S.kube({
  ns: "shop",
  help: ["kubectl get pvc,pv,sc   ·   kubectl describe pod db-0   ·   kubectl get pods -o wide", "kubectl drain <db's node> --ignore-daemonsets   ·   kubectl uncordon <node>", "kubectl apply -f db-snapshot.yaml   ·   kubectl get volumesnapshot", "kubectl apply -f data-db-0-from-snapshot.yaml   (restore into another AZ)", "kubectl edit pvc data-db-0   (resize)   ·   kubectl apply -f web-ebs-rwx.yaml   (try EBS for shared storage)", "aws ec2 describe-volumes --filters Name=tag:kubernetes.io/created-for/pvc/name,Values=data-db-0"],
  examples: ["kubectl get pvc,pv", "kubectl get pods -o wide", "kubectl drain ip-10-0-1-17 --ignore-daemonsets", "kubectl describe pod db-0", "kubectl apply -f db-snapshot.yaml", "kubectl apply -f data-db-0-from-snapshot.yaml", "kubectl apply -f web-ebs-rwx.yaml", "kubectl edit pvc data-db-0"],
  objects: () => [
    { kind: "Pod", name: "db-0", labels: { app: "db" }, row: { READY: st.dbPod === "running" ? "1/1" : "0/1", STATUS: st.dbPod === "running" ? "Running" : st.dbPod === "attaching" ? "ContainerCreating" : "Pending", RESTARTS: 0 }, wide: { NODE: st.dbPod === "running" ? NODE_NAMES[st.dbVol.az] : "<none>" }, describe: () => [["Status:", st.dbPod === "running" ? "Running" : "Pending"], ["Volumes:"], ["  data:", "PersistentVolumeClaim data-db-0 (gp3, ReadWriteOnce)"]] },
    ...AZ.map((a, i) => ({ kind: "Pod", name: `web-6f2d-${["k2m4p", "x8qpz", "t3vnc"][i]}`, labels: { app: "web" }, row: { READY: "1/1", STATUS: "Running", RESTARTS: 0 }, wide: { NODE: NODE_NAMES[i] } })).filter((_, i) => st.up[i]),
    ...AZ.map((a, i) => ({ kind: "Node", name: NODE_NAMES[i], part: "node-" + i, labels: { "topology.kubernetes.io/zone": a.name }, row: { STATUS: st.up[i] ? "Ready" : "Ready,SchedulingDisabled", ROLES: "<none>", VERSION: "v1.31.2-eks-7f9249a" }, wide: { ZONE: a.name } })),
    ...(st.dbVol ? [{ kind: "PersistentVolumeClaim", name: "data-db-0", part: "ebs-" + st.dbVol.az, manifest: pvcY, labels: {}, row: { STATUS: "Bound", VOLUME: "pvc-7b4d9c1e", CAPACITY: st.size + "Gi", "ACCESS MODES": "RWO", STORAGECLASS: "gp3" } }, { kind: "PersistentVolume", name: "pvc-7b4d9c1e", ns: "", part: "ebs-" + st.dbVol.az, manifest: pvY, labels: {}, row: { CAPACITY: st.dbVol.size + "Gi", "ACCESS MODES": "RWO", "RECLAIM POLICY": "Delete", STATUS: "Bound", CLAIM: "shop/data-db-0", STORAGECLASS: "gp3" } }] : [{ kind: "PersistentVolumeClaim", name: "data-db-0", manifest: pvcY, labels: {}, row: { STATUS: "Pending", VOLUME: "", CAPACITY: "", "ACCESS MODES": "RWO", STORAGECLASS: "gp3" } }]),
    { kind: "PersistentVolumeClaim", name: "uploads", part: "efs", labels: {}, row: { STATUS: "Bound", VOLUME: "pvc-efs9f2c", CAPACITY: "5Gi", "ACCESS MODES": "RWX", STORAGECLASS: "efs" } },
    ...(st.snapshot ? [{ kind: "VolumeSnapshot", name: "db-snap", part: "snap", labels: {}, row: { READYTOUSE: "true", SOURCEPVC: "data-db-0", RESTORESIZE: st.snapshot.size + "Gi" } }] : []),
  ],
  verbs: {
    drain({ pos }) { const i = NODE_NAMES.indexOf(pos[0]) >= 0 ? NODE_NAMES.indexOf(pos[0]) : NODE_NAMES.findIndex((n) => n.startsWith(pos[0] || "?")); if (i < 0) return { err: `Error from server (NotFound): nodes "${pos[0] || ""}" not found` }; S.stopTour(); setUp(i, false); return [`node/${NODE_NAMES[i]} cordoned`, "evicting pod shop/" + (st.dbVol && st.dbVol.az === i ? "db-0" : `web-6f2d-${["k2m4p", "x8qpz", "t3vnc"][i]}`), `node/${NODE_NAMES[i]} drained`]; },
    uncordon({ pos }) { const i = NODE_NAMES.findIndex((n) => n.startsWith(pos[0] || "?")); if (i < 0) return { err: `Error from server (NotFound): nodes "${pos[0] || ""}" not found` }; setUp(i, true); return [`node/${NODE_NAMES[i]} uncordoned`]; },
    apply({ f }) {
      if (f["-f"] === "db-snapshot.yaml") { if (!st.dbVol) return { err: "data-db-0 has no volume yet" }; S.stopTour(); snapshot(); return ["volumesnapshot.snapshot.storage.k8s.io/db-snap created"]; }
      if (f["-f"] === "data-db-0-from-snapshot.yaml") { S.stopTour(); st.restoredFrom = true; return restore() ? ["persistentvolumeclaim/data-db-0 created   # from VolumeSnapshot db-snap (the old claim was deleted first)", "pod/db-0 will start where the new volume is"] : { err: msg }; }
      if (f["-f"] === "web-ebs-rwx.yaml") return { err: 'persistentvolumeclaim/uploads-ebs created\n# kubectl describe pvc uploads-ebs:\n  Warning  ProvisioningFailed  ebs.csi.aws.com  failed to provision volume with StorageClass "gp3": rpc error: code = InvalidArgument desc = Volume capabilities MULTI_NODE_MULTI_WRITER not supported. Only AccessModes [ReadWriteOnce] supported.\n# EBS can attach to one node: shared storage across pods and AZs needs EFS' };
      return f["-f"] === "-" ? undefined : { err: `error: the path "${f["-f"]}" does not exist. Files here: db-snapshot.yaml, data-db-0-from-snapshot.yaml, web-ebs-rwx.yaml` };
    },
  },
  tools: { aws({ pos }) { if (pos[0] !== "ec2" || pos[1] !== "describe-volumes") return { err: "this lesson simulates aws ec2 describe-volumes" }; return ["VolumeId               Size  Type  AvailabilityZone  State", ...st.vols.map((v) => `${v.id.padEnd(23)}${String(v.size).padEnd(6)}gp3   ${AZ[v.az].name.padEnd(18)}${v.attached ? "in-use" : "available"}`)]; } },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "Three AZs. db-0 runs in us-east-1a with an EBS volume next to it; web runs one replica per AZ, all sharing an EFS file system.", hold: 7 },
  { focus: "csi", zoom: 2, say: "With WaitForFirstConsumer, the scheduler picked a node first and the CSI driver created the volume in that node's AZ.", hold: 6 },
  { home: true, say: "Take db-0's node down. web loses one replica and carries on with EFS. db-0 can't move: its volume is stuck in us-east-1a.", run: () => setUp(0, false), hold: 8 },
  { focus: "ebs-0", zoom: 2.4, say: "The PV's node affinity names us-east-1a: the scheduler reports a volume node affinity conflict. EBS volumes never cross AZs.", hold: 7 },
  { home: true, say: "Bring the node back and take a snapshot. Snapshots are regional.", run: () => { setUp(0, true); setTimeout(snapshot, 1500); }, hold: 7 },
  { home: true, say: "Now restore it into us-east-1b: a new volume from the snapshot, and db-0 starts there with its data.", run: () => { setUp(0, false); st.restoredFrom = true; setTimeout(restore, 500); }, hold: 9 },
  { home: true, say: "EBS: fast, one node, one AZ. EFS: shared, every AZ. Snapshots move data between AZs.", run: () => setUp(0, true), hold: 6 },
]);
S.start();
