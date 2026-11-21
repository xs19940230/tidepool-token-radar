# Tidepool — token launch radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![Rank](https://make.fun/badge/token-radar-01/xs19940230/tidepool-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard)
[![Reward](https://make.fun/badge/token-radar-01/xs19940230/tidepool-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

A fully offline research desk for the official make.fun token-radar-01 snapshot. All 758 protocols receive reproducible implied values and four-step research plans. The default view shows 191 record-based candidates, including all 40 required watchlist protocols. Existing-token records and related products have separate views.

## Run

Node.js 22.18 or later, no dependencies:

```sh
node main.ts --input ../input/snapshot.json --output ../out
```

Open `../out/dashboard/index.html` directly in a browser. No server, network requests, external fonts or installation is required. The grader defaults to `/input/snapshot.json` and `/output`; `MAKEFUN_OUTPUT_DIR` or `--output` overrides the latter. `--preview` skips dossier construction during screenshot preparation.

## Use

- Sort by name, global value rank, implied value, TVL, growth or tracking age.
- Combine token-status, chain, category, growth and text filters; paginate results.
- Open any protocol for its exact value, peer calibration, factors, sensitivity scenarios and practical plan.
- Save a shortlist in browser-local storage; export the current filtered and sorted view as CSV.
- Open the methodology to inspect formulas, provenance and missing-data assumptions.

## Value model

`buildBoard` in `lib/model.ts` uses circulating market-cap/TVL ratios of token-recorded protocols with reported market caps. Ratios are clipped to 0.1–4.0; category medians shrink toward the global median with weight `n/(n+6)`. The value is TVL × blended multiple × growth factor × tracking maturity. Growth is capped at ±50% and contributes at most ±25%. Maturity is logarithmic in days tracked, capped at 3 years. Unknown growth/date uses a neutral factor. Values are rounded to whole dollars. No protocol-name valuation overrides are used.

Low/high scenarios are subjective 0.5×/1.8× sensitivities, not statistical confidence intervals. Tracking age is not proven time without a token. The snapshot does not supply token supply, revenue, verified incentive programs, addresses or live product access. Plans are illustrative, category-based and explicitly require current official verification. Some categories receive a zero-capital access-research plan. Protocol TVLs may overlap.

`main.ts` writes `board.json`, `data.js`, the dashboard, screenshots and the canonical `dossier.json`. It also includes the actual model source as `dashboard/model-source.txt` so the dossier exposes the algorithm and plan generator in full. The vendored `vendor/makefun-board.ts` is unchanged from the kit.

## Screenshots

Captured from the actual offline page using Chrome DevTools at DPR 1, without compositing:

1. `1-board.png`: default candidates; complete page, 1440 × 1369.
2. `2-detail.png`: Curvance, its exact scenario calculation and four-step plan, 1440 × 1050.
3. `3-filtered.png`: Lending + positive 7d TVL, sorted by growth descending, 1440 × 1050.

MIT license. Built for https://make.fun/bounty/token-radar-01.
