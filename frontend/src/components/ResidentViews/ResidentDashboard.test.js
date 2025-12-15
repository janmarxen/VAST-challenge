import { shouldShowFloatingDemographicControls } from './ResidentDashboard';

describe('shouldShowFloatingDemographicControls', () => {
  test('does not float when intersecting', () => {
    expect(
      shouldShowFloatingDemographicControls({
        isIntersecting: true,
        boundingClientRect: { top: -10 },
      })
    ).toBe(false);
  });

  test('floats only after controls scroll above viewport', () => {
    expect(
      shouldShowFloatingDemographicControls({
        isIntersecting: false,
        boundingClientRect: { top: -1 },
      })
    ).toBe(true);
  });

  test('does not float when controls are below viewport', () => {
    expect(
      shouldShowFloatingDemographicControls({
        isIntersecting: false,
        boundingClientRect: { top: 50 },
      })
    ).toBe(false);
  });
});
