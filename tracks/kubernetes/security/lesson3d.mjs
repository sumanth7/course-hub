export default {
  pageTitle: "ServiceAccounts & RBAC (3D)",
  lede: "Three subjects, a user and two ServiceAccounts, send requests through the API server's gate. Keycard badges on the role cards show who holds which role. Pick who is asking and try an action, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Acting as">
    <button type="button" data-do="who" data-who="alice" aria-pressed="true">as alice</button>
    <button type="button" data-do="who" data-who="ci-bot" aria-pressed="false">as ci-bot (SA)</button>
    <button type="button" data-do="who" data-who="monitor" aria-pressed="false">as monitor (SA)</button>
  </div>
  <div class="ctl" role="group" aria-label="Try an action">
    <button type="button" data-do="act" data-a="get-pods">get pods</button>
    <button type="button" data-do="act" data-a="delete-pods">delete pods</button>
    <button type="button" data-do="act" data-a="create-deploy">create deployment</button>
    <button type="button" data-do="act" data-a="get-secrets">get secrets</button>
    <button type="button" data-do="act" data-a="list-nodes">list nodes</button>
    <button type="button" data-do="priv" class="danger">create a privileged pod</button>
  </div>
  <div class="ctl" role="group" aria-label="Change permissions">
    <button type="button" data-do="bind" id="rb-bind">Bind ci-bot to deployer</button>
    <button type="button" data-do="pss" id="rb-pss" aria-pressed="false">Pod Security restricted: off</button>
  </div>
  <p class="status" id="rb-status" aria-live="polite"></p>
  <pre id="rb-log" aria-live="polite" style="min-height:7em"></pre>`,
  caption: "Every request to the API server says who is asking: a user, or a pod using its ServiceAccount's token. RBAC decides what they may do: a Role lists verbs on resources in a namespace, a ClusterRole does so cluster-wide, and RoleBindings or ClusterRoleBindings grant roles to users, groups or ServiceAccounts. There are no deny rules. After RBAC, admission can still reject a request; Pod Security 'restricted' blocks privileged pods.",
};
