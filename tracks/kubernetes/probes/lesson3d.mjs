const rows = ["web-1", "web-2", "web-3"].map((n, i) => `<tr id="pb-row-${i}"><td>${n}</td><td>Ready</td><td>passed</td><td>0/3</td><td>0/3</td><td>0</td></tr>`).join("");
export default {
  pageTitle: "Health Probes (3D)",
  lede: "The kubelet taps every pod with three probes. Break a pod with the buttons below and watch what each probe does about it, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Break a pod">
    <button type="button" data-do="busy">Overload web-2</button>
    <button type="button" data-do="hang" class="danger">Hang web-1</button>
    <button type="button" data-do="slow">Restart web-3 with a 6 s start</button>
    <button type="button" data-do="startup" id="pb-startup" aria-pressed="true">startupProbe: on</button>
  </div>
  <div class="table-wrap"><table><thead><tr><th>Pod</th><th>State</th><th>Startup</th><th>Liveness</th><th>Readiness</th><th>Restarts</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  caption: "The kubelet runs each probe once per period. A failing readiness probe only takes the pod out of the Service; it keeps running and comes back when the probe passes. A failing liveness probe means the container is stuck, so after three failures the kubelet restarts it. Without a startup probe, liveness can kill a slow starter before it is up, again and again (CrashLoopBackOff); with one, liveness and readiness wait until the app answers.",
};
