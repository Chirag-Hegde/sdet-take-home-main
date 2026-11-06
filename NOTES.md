# Submission notes

## Part A — API tests

Run with `npm test` (full suite, 30 tests — 26 pass, and the 4 tagged `@Bug` fail by design; see Part B) or `npm run test:smoke` (`@Healthcheck` tag only, one per spec file). `npm run test:green` excludes the intentional failures and is fully green. Playwright auto-starts the API. No files under `api/` were touched.

### What was added

| File | Status | Purpose |
|------|--------|---------|
| `tests/api/reminders/Reminders_Schema.ts` | tightened | Strict Zod schemas: id pattern, ISO datetimes, closed objects; added `NotFoundErrorSchema` (404) and `ValidationErrorSchema` (400). Every response body is parsed through a schema, not just status-checked. |
| `tests/api/reminders/Reminders_Factory.ts` | new | `buildReminder(overrides)` — builds valid create payloads. Override a field with `undefined` to drop it in negative tests (JSON.stringify omits it). |
| `tests/api/reminders/Reminders_List.spec.ts` | extended | Pagination (defaults, disjoint pages, out-of-range, invalid params), status filter (Open/Done/unknown value), sort asc on both fields. |
| `tests/api/reminders/Reminders_Create.spec.ts` | new | Happy path + default status, round-trip via GET by id, explicit `Done`, and 400 validation table (missing/whitespace/invalid fields, empty body). |
| `tests/api/reminders/Reminders_GetById.spec.ts` | new | Seeded fetch with full shape check, 404 for unknown id, exact-string id matching. |
| `tests/fixtures/api.fixture.ts` | small edit | The failure message of `toHaveApiStatus` printed raw response bodies; `notes` is sensitive per the API reference, so it is now redacted before printing. |

The existing `Reminders_API.ts` wrapper already covered all endpoints and is used unchanged.

### Decisions worth knowing

- **Isolation on shared state.** The in-memory store is shared across parallel tests and never resets mid-run. So: the factory gives every record a unique patientName/title; tests only assert on seeded data (`r-001..r-025`, deterministic per `api/seed.js`) or on records they created; counts are asserted as lower bounds, never exact store totals. Factory `dueDate` (2027) and server-stamped `createdAt` ("now") both sort after the seed, so seed-order assertions stay stable while other tests create data.
- **`notes` never appears in output.** It is not asserted by equality (a failure diff would print it); the round-trip test compares it as a boolean, and the fixture redacts it from failure messages.
- **Known bugs are fenced off, not papered over.** `order=desc`, the `total` field, and empty/non-string `title` acceptance are real API bugs. Part A deliberately does not assert on them (noted in spec headers); each gets a dedicated failing regression test in Part B.

## Part B — bugs and regression tests

### Bugs found

All verified over HTTP against a fresh server. Expected behavior cites [API_REFERENCE.md](./API_REFERENCE.md).

**BUG-1 — `total` is the current page's length, not the count of all matches.**
- Repro: `GET /reminders?pageSize=5` → `total: 5`. Expected `total: 25` (reference: "total number of reminders that match the current filter, across all pages").
- Also: `GET /reminders?status=Done&pageSize=2` → `total: 2` (expected 5); `GET /reminders?page=9999` → `total: 0` (expected 25). A client cannot compute how many pages exist.

**BUG-2 — `order=desc` is accepted but ignored; results are always ascending.**
- Repro: `GET /reminders?sort=dueDate&order=desc` → first item is `r-001` (the *earliest* dueDate). Expected `r-025` first. Same for `sort=createdAt`.

**BUG-3 — completing an unknown id returns `200` with `{}` instead of `404`.**
- Repro: `POST /reminders/r-99999/complete` → `200`, body `{}`. Expected `404`. The empty body also violates the reminder shape, so clients parsing the response break twice.

**BUG-4 — `title` may be empty or non-string; only `patientName` gets a real check.**
- Repro: `POST /reminders` with `{"patientName":"A","title":"","dueDate":"2027-01-01T00:00:00.000Z"}` → `201`. Expected `400` ("title … must be non-empty").
- Worse: `"title": 12345` → also `201`, and that record then makes every later `GET /reminders` response violate the contract (non-string title) for all consumers.

Observations that are *not* contract violations (contract is silent) but worth a product decision: no `pageSize` cap (`?pageSize=10000` returns everything); invalid `page`/`pageSize`/`sort`/`order` silently fall back to defaults instead of `400`; the status filter is case-sensitive (`status=open` matches nothing).

### Regression tests

Alongside the bug hunt, `tests/api/reminders/Reminders_Complete.spec.ts` (passing) covers the complete endpoint's working behavior: completes a reminder the test created itself (never a seeded one — that would mutate shared state), verifies the change on a fresh GET, and checks idempotency.

`tests/api/reminders/Reminders_KnownBugs.spec.ts` — one test per bug, tagged `@Bug`. **They fail today on purpose**: each asserts the documented contract exactly where the implementation breaks it, so it goes green when the bug is fixed and guards it afterwards.

- `npm run test:bugs` → only the regressions (expect **4 failures**).
- `npm run test:green` → everything else (expect **all green**).
- `npm test` → both; the only failures are the four tagged `@Bug`.

Design decisions:

- **Failure-proof anchors.** Counts can only grow mid-run (no delete endpoint; Done records are never reopened), so BUG-1 asserts lower bounds from the seed (`total >= 25`, filtered `>= 5`) and BUG-2 asserts "non-increasing order" rather than exact ids. The tests can only fail because of the bugs, never because parallel tests created data.
- **No `test.fail()`.** It inverts when the bug is fixed (reports "unexpected pass" instead of going green), which defeats "fails now, passes once fixed". Honest failures + the `@Bug` tag keep both signals clean.
- **A passing `@Healthcheck` sits at the top of the bug file** so a red run is attributable to the bugs, not a dead server.
- **The non-string-title variant of BUG-4 is documented but not automated**: the junk record it would create poisons every schema-validating list test in the shared store for the rest of the run. It belongs in a serially-run project against a dedicated server instance.
- Fix sketches (not applied): compute `total` from the filtered array before slicing; multiply the sort comparator by `-1` when `order === 'desc'`; early-return `404` in the complete handler; give `title` the same `typeof`+trim check as `patientName`.

## Part C — load smoke

Scenario: `load/scenarios/reminders-journey.ts`. Run: `npm run api` → `npm run k6:build` → `npm run k6:journey`.

The journey models a clinician working their open reminders: search (`GET /reminders?status=Open&page=1&pageSize=5`) → next page → open one detail (`GET /reminders/{id}`, id picked from the page just viewed), with 1–3s of think time between steps. It is read-only on purpose: the store is in-memory with no delete, so a write-heavy smoke would grow the dataset over the run and skew the latency it is trying to measure.

Custom metrics: `journey_duration` (a Trend: HTTP time of the three requests, think time excluded — it measures the API, not the sleeps) and `journey_errors` (a Rate: journeys where any step failed a check). Thresholds fail the run if blown: `http_req_duration p(95)<300ms`, `http_req_failed rate<1%`, `journey_duration p(95)<900ms` (3 × the per-request budget), `journey_errors rate<1%`.

**Results** (2 VUs, 30s, fresh server — Apple Silicon laptop, localhost): 12 journeys / 36 requests, 60/60 checks passed, all thresholds green. `http_req_duration` p95 **1.89ms** (avg 1.28ms, max 2.31ms); `journey_duration` p95 **4.93ms**; 0% errors.

**Reading:** healthy, as expected — single-digit-millisecond p95 with a flat distribution (max ≈ 2× median, no tail), zero failures, and the journey p95 is almost exactly 3× the per-request p95, meaning no step is an outlier. At 2 VUs with think time this is a functional smoke plus a latency *baseline*, not a capacity statement. What I'd dig into next: ramp VUs in stages to find where p95 bends; a sustained write-mix soak to watch the in-memory array's growth push the O(n) per-request sort and `find` up; and the uncapped `pageSize` (one `?pageSize=100000`-style request against a grown store is the cheapest way for a client to hurt everyone's latency).

## What I'd do next with more time

- Contract tests for the "silent fallback" behaviors once product decides whether invalid query params should be `400`s.
- A dedicated serially-run Playwright project (own server instance per run) for store-poisoning cases like the non-string title, and for exact-count assertions.
- Malformed-JSON body edge (`POST /reminders` with invalid JSON → Express answers with an HTML 400, not the documented `{errors}` shape).
- A ramped k6 profile (stages) alongside `smoke` to find the knee of the latency curve.
