export default {
  pageTitle: "Containers & Images (3D)",
  lede: "Two machines on the same hardware: one runs VMs, one runs containers. Then build an image layer by layer, push it, run it on three hosts, and kill a host with and without an orchestrator. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Containers controls">
    <button type="button" data-do="boot">Boot both machines</button>
    <button type="button" data-do="build">docker build</button>
    <button type="button" data-do="push">docker push</button>
    <button type="button" data-do="run">Run on 3 hosts</button>
    <button type="button" data-do="kill" class="danger">Kill a host</button>
    <button type="button" data-do="mode" id="ct-mode" aria-pressed="true">Mode: declarative (orchestrator)</button>
  </div>
  <p class="status" id="ct-status" aria-live="polite"></p>
  <pre id="ct-log" aria-live="polite" style="min-height:6.5em"></pre>`,
  caption: "A virtual machine carries a whole operating system, so it is heavy and slow to start. A container is an isolated process sharing the host's kernel, so it starts in moments and many fit on one machine. It runs from an image: read-only layers built from a Dockerfile, cached so a rebuild only redoes what changed, and pushed to a registry so any host can pull it. Running containers on many machines by hand is imperative and fragile; an orchestrator like Kubernetes is declarative: you state what should run, and it keeps making that true.",
};
