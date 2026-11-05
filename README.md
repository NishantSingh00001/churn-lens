# ChurnLens — keep the revenue you already have

Winning a customer costs ~5× keeping one — yet most teams find out about churn in the cancellation email. **ChurnLens** scores every account with a real risk model, explains exactly *why* each one is at risk, maps retention cohorts, and lets you **simulate retention plays against real MRR** before you spend a dollar. Everything runs in the browser.

## Run it
Open `index.html`, or `python3 -m http.server 8080`. No build, no dependencies, fully offline.

## Pages
- **Home** — pitch + a live 3D cohort-decay ribbon hero (retention survival curves).
- **Customers** — all 40 accounts scored and ranked by churn risk; search, filter by band, sort. Click one for a drawer showing its **explainable risk factors** and the recommended retention play.
- **Cohorts** — a monthly **retention triangle** (heatmap of % retained by cohort × month) and overlaid survival curves.
- **Segments** — where churn concentrates: average risk and MRR-at-risk by plan and by region.
- **Simulator** — four retention levers (engagement, price, NPS, proactive support), each changing a feature the model actually uses; it **re-scores all 40 accounts live** and shows accounts saved, annual revenue retained, and a before/after retention curve.
- **Settings** — theme, accents, JSON export.

## The model is real
A logistic churn model (`churnProb`) over six features — tenure, engagement, support friction, NPS, price sensitivity and plan tier — each with a signed weight. Risk is `sigmoid(w·features)`. The customer drawer decomposes the score into **per-factor contributions** (a SHAP-style explanation), and the simulator recomputes the whole book by adjusting features and re-running the same model — so the revenue numbers move for a real reason.

## Deploy
Static — Netlify drop, `vercel`, or GitHub Pages.

## Feature count
50+ — risk scoring, explainable factors, risk bands, cohort retention triangle, survival curves, segment analysis, MRR at risk, what-if simulator with live re-scoring, revenue impact, 3D hero, theming, export, offline. Full list on the home page.

*The real market need: SaaS teams react to churn instead of predicting it (cf. retention/CS tooling). ChurnLens is a self-contained demonstration of predictive churn + retention simulation.*
