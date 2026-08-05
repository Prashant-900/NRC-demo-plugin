/*
 * NRC demo plugin — entry point.
 *
 * Registers three things:
 *   1. A sidebar entry "Node Readiness"
 *   2. A route (/node-readiness) that renders the cluster-level rule list
 *   3. A section on the Node details page with the per-node readiness drill-down
 */
import {
  DetailsViewSectionProps,
  registerDetailsViewSection,
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import NodeReadinessNodePanel from './NodePanel';
import NRRListView from './NRRListView';

// 1. Sidebar entry (left menu).
registerSidebarEntry({
  parent: null,
  name: 'node-readiness',
  label: 'Node Readiness',
  url: '/node-readiness',
  icon: 'mdi:shield-check',
});

// 2. Route -> cluster-level list view.
registerRoute({
  path: '/node-readiness',
  sidebar: 'node-readiness',
  name: 'node-readiness',
  exact: true,
  component: () => <NRRListView />,
});

// 3. Node details page -> per-node NRC panel.
registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
  if (resource && resource.kind === 'Node') {
    return <NodeReadinessNodePanel node={resource} />;
  }
  return null;
});
