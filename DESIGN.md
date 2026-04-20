# Dashboard Design Brief

## Goal
Rebuild the dashboard so a user can understand system health and take action within 5 seconds.

## Principles
- Decision-first, not data-dump
- Replace vanity metrics with actionable insights
- Every chart must answer a specific question
- Prioritize readability over density
- Use consistent color semantics: green = good, red = bad
- Avoid unnecessary charts; do not use pie charts unless there is a strong justification

## Required Structure
1. Top section with 4-6 KPI cards and trend indicators
2. Primary chart with a key business or system metric and a comparison baseline
3. Secondary panels for breakdowns and distributions
4. Alert section that highlights anomalies automatically

## Dashboard Questions
- Is demand improving or slowing?
- Which listings need intervention right now?
- Is inventory healthy, stale, or invisible?
- Are there blocked conversations or trust issues hurting conversion?

## Implementation Notes
- KPI cards should highlight metrics that lead to action, not vanity totals by themselves.
- The primary chart should compare the current period with the previous period.
- Secondary panels should explain why the top-line KPI moved.
- Alerts should be generated from thresholds or anomalies, not manually curated.
