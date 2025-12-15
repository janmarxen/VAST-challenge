import { CLUSTER_COLOR_RANGE } from './colorHelpers';

export const CLUSTER_OPTIONS = [
  { value: null, label: 'All clusters', color: null },
  // Color mapping assumes sorted cluster IDs [0,1,2] map to the first 3 palette entries.
  { value: 0, label: 'Lean Savers', color: CLUSTER_COLOR_RANGE[0] },
  { value: 1, label: 'Stretched Households', color: CLUSTER_COLOR_RANGE[1] },
  { value: 2, label: 'Affluent Achievers', color: CLUSTER_COLOR_RANGE[2] },
];

export function normalizeClusterValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

export function filterRowsByCluster(rows, clusterValue) {
  const normalized = normalizeClusterValue(clusterValue);
  if (normalized === null) return rows;
  return (rows || []).filter((row) => Number(row?.Cluster) === normalized);
}
