# TrendConnect Test Automation Take-Home

Welcome, and thanks for taking the time. This repo contains a small **Reminders API** and a test skeleton. Your job is to test it: write API tests, hunt for bugs and guard against them, and run a quick load check.

Everything runs locally. No accounts, no VPN, no external services.

> The full exercise description (the three parts, weighting, and how we evaluate) is in the brief we emailed you. This README is just how to run things.

## Submission

Bugs found (with repros), load results, and what I'd do next are in [NOTES.md](./NOTES.md).

> **Heads-up:** `npm test` includes **four intentionally failing** regression tests tagged `@Bug`. Each pins a known API bug at the exact point the implementation breaks the contract, so it goes green once the bug is fixed (details in NOTES.md, Part B). `npm run test:green` runs everything else and passes fully.

## Prerequisites

- **Node.js** 20 or newer
- **k6** for Part C only. Install: https://grafana.com/docs/k6/latest/set-up/install-k6/

## Setup

```bash
npm install
npx playwright install chromium
```

## Run the API

```bash
npm run api
```

The API listens on `http://localhost:3000` and resets its data every time it starts. See [`API_REFERENCE.md`](./API_REFERENCE.md) for the contract.

You do **not** need to modify anything in `api/`. Treat it as a black box and test it over HTTP.

## Run the tests

```bash
npm test              # all Playwright tests (auto-starts the API) — 4 @Bug tests fail by design
npm run test:smoke    # only @Healthcheck tests
npm run test:green    # everything except the @Bug regressions (fully green)
npm run test:bugs     # only the @Bug regressions (4 expected failures today)
```

Playwright is configured to start the API for you, so `npm test` works on its own. If you prefer, run `npm run api` in one terminal and the tests in another.

## Run the load scenario (Part C)

```bash
npm run api           # terminal 1
npm run k6:build      # bundle the TypeScript scenarios into load/dist/
npm run k6:journey    # terminal 2: Part C journey (custom metrics + thresholds)
npm run k6:smoke      # terminal 2: minimal baseline example
```

## Where things live

```
api/                         The Reminders API (do not modify)
  server.js
  seed.js
tests/
  fixtures/
    api.fixture.ts           test fixture + toHaveApiStatus matcher (redacts `notes` in failures)
  api/reminders/
    Reminders_API.ts         endpoint wrapper
    Reminders_Schema.ts      strict Zod schemas (+ 400/404 error-body schemas)
    Reminders_Factory.ts     builds valid, unique create payloads
    Reminders_List.spec.ts   GET /reminders — pagination, filter, sort
    Reminders_GetById.spec.ts
    Reminders_Create.spec.ts
    Reminders_Complete.spec.ts
    Reminders_KnownBugs.spec.ts  Part B regressions — fail by design until the bugs are fixed
load/
  esbuild.config.mjs         bundles scenarios for k6
  profiles/smoke.ts          load profile
  shared/http.ts             base URL helper
  scenarios/reminders-smoke.ts     minimal baseline example
  scenarios/reminders-journey.ts   Part C journey (custom metrics + thresholds)
API_REFERENCE.md             the API contract
NOTES.md                     submission notes — bugs, load results, next steps
```

## What to put in your submission

Please update this README (or add a `NOTES.md`) with:

- **Bugs you found** — a short repro for each (endpoint, input, expected vs. actual).
- **Load results** — a couple of sentences reading your k6 run.
- **What you'd do next** with more time.

If you ran out of time on anything, just say so. That's good judgment, not a gap.

Good luck.
