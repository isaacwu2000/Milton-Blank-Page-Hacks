# Scoring

Use one equal-point system across all applicable evaluation criteria. Continue producing a
score when a block failure occurs; the failure prevents passing but does not replace the
diagnostic evaluation.

## Point values

- Binary `Pass`: `1` point earned out of `1` available.
- Binary `Fail`: `0` points earned out of `1` available.
- Binary `Unknown`: `0` points earned out of `1` available. Keep the criterion in the
  denominator and report the coverage gap.
- Binary `N/A`: exclude the criterion from both earned and available points.
- Likert `1` through `5`: earn the selected number of points out of `5` available.
- Likert `Unknown`: `0` points earned out of `5` available. Keep the dimension in the
  denominator and report the coverage gap.
- Likert `N/A`: exclude the dimension from both earned and available points.

Every binary point and Likert point has equal weight. Do not add category weights,
priority multipliers, or acceptance thresholds yet.

## Calculation

Calculate the final percentage across the complete applicable session evaluation:

$$
\text{Score}=\frac{\text{points earned}}{\text{points available}}\times 100
$$

Report all three values:

> **Score:** 142 / 168 points — 84.5%

Do not infer a passing label from the percentage. Report block failures, unknown coverage,
prioritized findings, and rubric scores separately.
