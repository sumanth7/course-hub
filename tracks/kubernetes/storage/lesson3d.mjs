export default {
  pageTitle: "Volumes, PVs & PVCs (3D)",
  lede: "A pod writes records into three places: its container's filesystem, an emptyDir, and a PersistentVolume reached through its claim. Restart, delete, re-claim, and see which records survive. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Storage controls">
    <button type="button" data-do="write">Write a record</button>
    <button type="button" data-do="rc">Restart the container</button>
    <button type="button" data-do="dp" class="danger">Delete the pod</button>
    <button type="button" data-do="pvc" id="st-pvc" class="danger">Delete the PVC</button>
    <button type="button" data-do="pol" id="st-policy">reclaimPolicy: Delete</button>
  </div>
  <p class="status" id="st-status" aria-live="polite"></p>
  <div class="table-wrap"><table><thead><tr><th>Where the app writes</th><th>Records</th><th>Lives as long as</th><th>So</th></tr></thead><tbody id="st-rows"></tbody></table></div>`,
  caption: "A container's own filesystem is thrown away whenever it restarts. An emptyDir volume belongs to the pod, so it survives container restarts but not the pod. For data that must outlive pods, a pod mounts a PersistentVolumeClaim; a StorageClass provisions a PersistentVolume to satisfy it and binds the two, and a replacement pod using the same claim finds the same data. When the claim is deleted, the volume's reclaimPolicy decides: Delete removes it, Retain keeps it as Released.",
};
