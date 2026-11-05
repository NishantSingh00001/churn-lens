# ChurnLens — Build Log

**Problem:** SaaS teams learn about churn too late and can't quantify which retention play is worth funding (the predictive-retention / customer-success-analytics category).

**Approach:** A churn/retention console on the shared core framework, coral/rose identity, custom 3D cohort-decay ribbon hero.

## Real model
- `churnProb()`: logistic model `sigmoid(w·features)` over tenure, engagement, support friction, NPS, price sensitivity, plan tier, with signed weights.
- `factorContribs()`: decomposes each score into per-feature contributions (SHAP-style) for the explainable drawer.
- 40 seeded accounts (`mulberry32`) with plan/region/MRR and features → stable risk scores.
- `buildCohorts()`: 12 monthly cohorts with survival curves derived from members' hazard; retention triangle observed-to-date.
- Simulator `adjust()` applies levers to features and re-runs `churnProb` across the book; revenue saved = Σ mrr·(risk−newRisk)·12.

## Custom 3D hero
`mountRibbonHero()` — 11 cohort "ribbons", each a line+points strip decaying as `exp(-hazard·t)` across time, spread in z, vertex-colored coral→salmon→gold, gently animated, cursor-reactive. Additive materials for vivid swiftshader rendering.

## Pages
index, customers (+ risk-factor drawer), cohorts (triangle + curves), segments, simulator, settings.

## Testing (headless Chromium, swiftshader)
- Landing hero renders; 4 stat tiles. ✓
- Customers: 40 rows; drawer opens with 6 ranked risk factors. ✓
- Cohorts: 89 triangle cells, survival-curve chart. ✓
- Segments: 3 plan bars + 4 region bars. ✓
- Simulator: 3 result tiles; levers re-score live — +30% engagement & +2.5 NPS → 11.1 accounts saved, $61k retained, churn 43%→16%. ✓
- Settings: theme, accents, export. ✓
- **0 JavaScript errors** across all pages.

## Status
Complete. 6 pages, 50+ features, real logistic model + live simulator, 3D hero, 0 errors. Delivered as churnlens.zip.
