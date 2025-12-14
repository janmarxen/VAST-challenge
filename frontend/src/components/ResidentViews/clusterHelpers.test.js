import { filterRowsByCluster, normalizeClusterValue } from './clusterHelpers';

describe('clusterHelpers', () => {
  test('normalizeClusterValue returns null for null/empty', () => {
    expect(normalizeClusterValue(null)).toBeNull();
    expect(normalizeClusterValue(undefined)).toBeNull();
    expect(normalizeClusterValue('')).toBeNull();
  });

  test('normalizeClusterValue coerces numbers', () => {
    expect(normalizeClusterValue(2)).toBe(2);
    expect(normalizeClusterValue('1')).toBe(1);
  });

  test('filterRowsByCluster returns original rows for null filter', () => {
    const rows = [{ Cluster: 0 }, { Cluster: 1 }];
    expect(filterRowsByCluster(rows, null)).toBe(rows);
  });

  test('filterRowsByCluster filters by Cluster (numeric or string)', () => {
    const rows = [{ Cluster: 0, id: 'a' }, { Cluster: '1', id: 'b' }, { Cluster: 1, id: 'c' }];
    expect(filterRowsByCluster(rows, 1).map((r) => r.id)).toEqual(['b', 'c']);
    expect(filterRowsByCluster(rows, '0').map((r) => r.id)).toEqual(['a']);
  });
});
