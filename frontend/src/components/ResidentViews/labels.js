// Human-friendly labels for variable keys used across ResidentViews
export const LABELS = {
  age: 'Age',
  householdSize: 'Household Size',
  Income: 'Income',
  CostOfLiving: 'Cost of Living',
  SavingsRate: 'Savings Rate',
  HighSchoolOrCollege: 'High School Or College'
  // extend as needed for other views
};

export function decodeLabel(key) {
  return LABELS[key] || key;
}

export default { LABELS, decodeLabel };
