export default {
  pageTitle: "Storage on EKS: EBS, EFS & AZs (3D)",
  lede: "EBS volumes live in one Availability Zone and attach to one node; EFS spans every AZ and many pods. Take the database's node down and watch it get stuck behind its volume, snapshot it and restore it into another AZ, compare binding modes, grow a volume, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Storage controls">
    <button type="button" data-do="down" id="st-down" class="danger">Take down db's node</button>
    <button type="button" data-do="snap">Snapshot the volume</button>
    <button type="button" data-do="restore">Restore into another AZ</button>
    <button type="button" data-do="bind" data-bind="wait" aria-pressed="true">WaitForFirstConsumer</button>
    <button type="button" data-do="bind" data-bind="immediate" aria-pressed="false">Immediate</button>
    <button type="button" data-do="resize">Grow the volume +20Gi</button>
  </div>
  <p class="status" id="st-status" aria-live="polite"></p>`,
  caption: "On EKS, the EBS CSI driver turns PersistentVolumeClaims into EBS volumes. An EBS volume exists in a single Availability Zone and attaches to one node at a time (ReadWriteOnce), so its PersistentVolume carries node affinity for that zone: a pod using it can only run there, and if that zone's nodes are gone it stays Pending with a volume node affinity conflict. WaitForFirstConsumer delays creating the volume until the pod is scheduled, so the volume lands where the pod is; Immediate creates it in an arbitrary zone first. Snapshots are regional and can be restored into any zone, which is how EBS data moves between zones. EFS, through its CSI driver, is a regional NFS file system with a mount target in each zone, so many pods in all zones can share it (ReadWriteMany). Volumes on a StorageClass with allowVolumeExpansion can grow online.",
};
