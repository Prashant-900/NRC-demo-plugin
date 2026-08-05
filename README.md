# Headlamp Node Readiness (NRC) Plugin

A [Headlamp](https://headlamp.dev/) plugin that visualizes the state of the
[node-readiness-controller (NRC)](https://github.com/kubernetes-sigs/node-readiness-controller)
directly inside the Kubernetes dashboard.

NRC gates node scheduling by placing taints on nodes until a set of
`NodeReadinessRule` conditions are met (for example: "don't schedule GPU
workloads until the GPU driver is Ready"). Today that state lives only in the
API and is hard to inspect. This plugin makes it visible: which rules exist,
which nodes are gated, why, and what the controller has been doing.

> Built as groundwork for the CNCF LFX 2026 Term 3 mentorship project,
> [node-readiness-controller#327](https://github.com/kubernetes-sigs/node-readiness-controller/issues/327).

## Features

- **Cluster overview** — a sidebar page listing every `NodeReadinessRule` with
  live status, plus summary tiles for total rules, matched nodes, held (gated)
  nodes, released (ready) nodes, and failures.
- **Per-node drill-down** — a section on each Node's details page showing which
  rules apply, per-condition pass/fail, the NRC-managed taints
  (keys under `readiness.k8s.io/`), and recent NRC events
  (`TaintAdded` / `TaintRemoved` / `TaintAdopted` / `BootstrapCompleted`).
- **Read-only & safe** — the plugin only reads Kubernetes API state; it never
  writes. NRC writes `.status`, the plugin reads it.
- **Graceful degradation** — if NRC's CRD isn't installed on the selected
  cluster, the plugin shows a friendly explanation instead of erroring.

## Screenshots

| Cluster overview | Node drill-down |
|---|---|
| ![Rules list](docs/screenshots/list-view.png) | ![Node panel](docs/screenshots/node-panel.png) |

_(Add your own captures under `docs/screenshots/` — see that folder's README.)_

## How it works

Both NRC and this plugin talk to the same Kubernetes API. NRC **writes** status;
the plugin **reads** it:

| UI element                | Source field |
|---------------------------|--------------|
| Rule list                 | `NodeReadinessRule` objects (`useList`) |
| Mode / taint / conditions | `spec.enforcementMode`, `spec.taint`, `spec.conditions` |
| Matched / held / released | `status.nodeEvaluations[].taintStatus` |
| Failed nodes              | `status.failedNodes[]` |
| Applicable rules per node | `spec.nodeSelector` vs `node.metadata.labels` |
| NRC taints on a node      | `node.spec.taints[]` with key prefix `readiness.k8s.io/` |
| Events                    | `Event` objects with NRC reasons |

Headlamp doesn't know about custom resources by default, so `src/resources.ts`
teaches it the `NodeReadinessRule` API via `makeCustomResourceClass`.

## Getting started

Requires Node.js 22+ and a running Headlamp (desktop app or dev server).

```bash
git clone https://github.com/<your-username>/headlamp-demo-plugin.git
cd headlamp-demo-plugin
npm install
npm run start     # builds in watch mode; Headlamp desktop auto-detects it
```

Then open Headlamp and look for **Node Readiness** in the sidebar, and the
**Node Readiness (NRC)** section on any Node's details page.

## Try it with sample data

The `examples/` folder has ready-to-apply manifests:

```bash
# Optional: install a lightweight CRD so the plugin has something to read
kubectl apply -f examples/00-crd.yaml

# Create a few demo rules
kubectl apply -f examples/01-gpu-driver-ready.yaml
kubectl apply -f examples/02-network-ready.yaml
kubectl apply -f examples/03-storage-ready-dryrun.yaml
```

The rules will appear in the sidebar view immediately. (Without the full
node-readiness-controller running, `.status` stays empty, so counts show 0 —
that's expected; the controller is what populates status.)

## Available scripts

| Command | What it does |
|---|---|
| `npm run start` | Build in watch mode for local development |
| `npm run build` | Production build into `dist/` |
| `npm run tsc`   | Type-check with TypeScript |
| `npm run lint`  | Lint the source |
| `npm run format`| Auto-format the source |
| `npm run package` | Produce a distributable plugin tarball |

## Project layout

```
headlamp-demo-plugin/
├── src/
│   ├── index.tsx        # registers sidebar entry, route, Node details section
│   ├── resources.ts     # NodeReadinessRule CR class + selector-matching helpers
│   ├── NRRListView.tsx  # cluster-level rules table + summary tiles
│   └── NodePanel.tsx    # per-node drill-down section
├── examples/            # sample CRD + NodeReadinessRule manifests
├── docs/screenshots/    # put your screenshots here
├── package.json
├── tsconfig.json
└── LICENSE
```

## License

[MIT](LICENSE) © Prashant Suthar
