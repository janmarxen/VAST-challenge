import { getScatterDomainData } from './WageVsCostScatter';

describe('getScatterDomainData', () => {
  test('uses full dataset for domains (ignores toggles/filters)', () => {
    const rows = [
      { participantId: 1, CostOfLiving: 1000, Income: 2000, haveKids: true, Cluster: 0 },
      { participantId: 2, CostOfLiving: 1200, Income: 5000, haveKids: false, Cluster: 2 },
      { participantId: 3, CostOfLiving: 4500, Income: 9000, haveKids: true, Cluster: 1 }, // excluded by xMax
    ];

    const domainRows = getScatterDomainData(rows, 4000);

    expect(domainRows.map(d => d.participantId).sort()).toEqual([1, 2]);
  });

  test('drops rows with non-finite numbers', () => {
    const rows = [
      { participantId: 1, CostOfLiving: 1000, Income: NaN },
      { participantId: 2, CostOfLiving: Infinity, Income: 1000 },
      { participantId: 3, CostOfLiving: 1000, Income: 1000 },
    ];

    const domainRows = getScatterDomainData(rows, 4000);

    expect(domainRows.map(d => d.participantId)).toEqual([3]);
  });
});
