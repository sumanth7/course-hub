export default {
  pageTitle: "IAM on EKS: Access Entries, IRSA & Pod Identity (3D)",
  lede: "Identity in both directions. People and CI reach the Kubernetes API with IAM identities: a signed STS token, mapped to permissions by access entries. Pods reach AWS with IAM roles: through IRSA, EKS Pod Identity, or (badly) the node's own role. Run kubectl as different people, give a pod an identity, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="IAM controls">
    <button type="button" data-do="as" data-who="alice">kubectl as alice</button>
    <button type="button" data-do="as" data-who="ci">kubectl as CI (delete)</button>
    <button type="button" data-do="as" data-who="bob">kubectl as bob</button>
    <button type="button" data-do="bob" id="ia-bob">Give bob an access entry</button>
    <button type="button" data-do="mode" data-mode="none" aria-pressed="true">Pod: no identity</button>
    <button type="button" data-do="mode" data-mode="irsa" aria-pressed="false">IRSA</button>
    <button type="button" data-do="mode" data-mode="podid" aria-pressed="false">Pod Identity</button>
    <button type="button" data-do="hop" id="ia-hop" class="danger">IMDS hop limit: 1</button>
    <button type="button" data-do="upload">Upload a report</button>
  </div>
  <p class="status" id="ia-status" aria-live="polite"></p>`,
  caption: "kubectl on EKS authenticates with IAM: aws eks get-token presigns an STS GetCallerIdentity request, and the API server's authenticator calls STS to learn the caller's ARN. Access entries, stored by EKS, then map that ARN to Kubernetes access: an access policy (cluster admin, admin, edit or view) scoped to the cluster or to namespaces, or groups for your own RBAC. They replace the aws-auth ConfigMap. In the other direction, pods should never use the node's instance role; set the IMDS hop limit to 1 so they can't. With IRSA, a service account annotated with a role gets a token signed by the cluster's OIDC issuer, which STS exchanges for role credentials when the role's trust policy names that service account. EKS Pod Identity does the same through a node agent and the EKS Auth API, with associations managed by EKS and a trust policy that can be reused across clusters.",
};
