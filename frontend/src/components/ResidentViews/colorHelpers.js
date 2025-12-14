// Shared palette + helpers to keep cluster colors consistent across visuals
export const CLUSTER_COLOR_RANGE = [
  '#F28E2B', // orange
  '#4E79A7', // blue
  '#E15759', // red
  '#76B7B2', // teal
  '#59A14F', // green
  '#EDC948', // yellow
  '#B07AA1', // purple
  '#FF9DA7', // pink
  '#9C755F', // brown
  '#BAB0AC'  // gray
];

export function getSortedClusterDomain(values = []) {
  return Array.from(new Set(values)).sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  });
}
