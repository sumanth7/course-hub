export default {
  pageTitle: "StatefulSets, DaemonSets & Jobs (3D)",
  lede: "Each node has three bays: a StatefulSet's members with their own volume lockers at the back, a DaemonSet's agent in the middle, a Job's pods in front. A CronJob clock starts the Job on schedule. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="StatefulSet">
    <span class="pair"><span id="wl-sts-scale">db replicas 3</span><button type="button" data-do="stsDown" aria-label="Scale db down">−</button><button type="button" data-do="stsUp" aria-label="Scale db up">+</button></span>
    <button type="button" data-do="delDb" class="danger">Delete db-1</button>
  </div>
  <p class="status" id="wl-sts" aria-live="polite"></p>
  <div class="ctl" role="group" aria-label="DaemonSet"><button type="button" data-do="node4" id="wl-node4">Add node-4</button></div>
  <p class="status" id="wl-ds" aria-live="polite"></p>
  <div class="ctl" role="group" aria-label="Job and CronJob"><button type="button" data-do="job">Run the Job now</button><button type="button" data-do="cron" id="wl-cron" aria-pressed="true">CronJob schedule: on</button></div>
  <p class="status" id="wl-job" aria-live="polite"></p>`,
  caption: "A StatefulSet's pods get stable names with an ordinal, are created and removed in order, and each gets its own PersistentVolumeClaim from a template, so a replaced db-1 comes back as db-1 with its data. A DaemonSet runs exactly one pod on every node, adding one when a node joins. A Job runs pods until enough succeed, retrying failures, and a CronJob creates Jobs on a cron schedule.",
};
