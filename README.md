# SportyBet — Low-Risk Basketball Totals (Ongoing Experiment)

**thesis:**
predicting basketball totals is easy. **not losing money is hard**.

this repository is a **never-finished experiment** focused on one thing only:

> **minimizing downside risk in basketball Alternative Over/Under markets using statistically calibrated models**

we explicitly optimize for **coverage guarantees**, not raw prediction accuracy.

---

## what this repo actually does

* predicts **expected total points (μ)** per game using **XGBoost**
* converts predictions into **risk-controlled betting floors** using **Conformal Prediction**
* filters bets via strict **no-edge → no-bet** rules
* tracks **results, drawdowns, and calibration drift** over time

no neural hype. no gut calls. no martingale nonsense.

---

## core principles

* **risk > accuracy**
* **calibration > confidence**
* **process > outcomes**
* if the model is uncertain → **we do nothing**

this is a capital-preservation system first, a prediction system second.

---

## current stack (locked)

| layer            | tool                          | status           |
| ---------------- | ----------------------------- | ---------------- |
| point prediction | XGBoost                       | ✅ core           |
| risk calibration | Conformal Prediction          | ✅ non-negotiable |
| data ingestion   | Puppeteer scraper (SportyBet) | ✅ live           |
| betting logic    | floor + threshold rules       | ✅ evolving       |
| bankroll control | simulation + drawdown rules   | 🚧 active        |

everything else is explicitly out of scope.

---

## project structure

```text
SportyBet/
├── README.md

├── data/
│   ├── raw/
│   │   ├── matches/
│   │   └── stats/
│   ├── processed/
│   └── splits/

├── models/
│   ├── xgboost/
│   └── conformal/

├── strategy/
│   ├── threshold.py
│   ├── selector.py
│   └── bet_rules.md

├── simulation/
│   ├── bankroll.py
│   ├── backtest.py
│   └── reports/

├── results/               ← immutable experiment logs
│   ├── daily/
│   ├── weekly/
│   ├── calibration/
│   └── README.md

├── services/
│   ├── matchfetcher/       ← puppeteer odds scraper
│   └── predictor_api/

└── notebooks/
    ├── residuals.ipynb
    └── feature_sanity.ipynb
```

**rule:**
models change. data grows. **results never get rewritten**.

---

## betting logic (the only rule that matters)

we do **not** bet the model prediction.

we bet the **mathematical floor**.

```
floor = μ − conformal_buffer
```

a bet is placed **only if**:

```
floor > bookmaker_line + safety_margin
```

no edge → no bet
close call → no bet
bad calibration → no bet

abstention is a valid outcome.

---

## results & transparency

all live and simulated outcomes are stored in `/results`.

this includes:

* hit rate
* realized vs expected coverage
* max drawdown
* streak behavior
* calibration drift by league

if this repo ever “looks quiet”, that usually means **the system is correctly doing nothing**.

---

## live odds ingestion

sportybet odds are scraped via a puppeteer service and exposed through a simple API.

* `GET /api/matches` — today’s matches + totals
* `POST /api/scrape` — manual refresh

this service is intentionally dumb. all intelligence lives downstream.

---

## repo activity

![GitHub stars over time](https://starchart.cc/tobiawolaju/SportyBet.svg)

---

## non-goals (explicit)

this repo is **not**:

* a betting bot
* a guaranteed profit system
* a model zoo
* a tips channel
* an ML flex project

it is a controlled, adversarial experiment against uncertainty.

---

## status

**ongoing. never “done”.**
every change must justify itself against **risk, not excitement**.

if the experiment stops outperforming inactivity, it gets shut down.

---

next step options (pick one, we wire it properly):

* document the `/results` schema (what gets logged, forever)
* formalize league-specific calibration rules
* harden bankroll math against tail events
