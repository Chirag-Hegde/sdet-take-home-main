import http, { Response } from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { smoke } from '../profiles/smoke';
import { url } from '../shared/http';

/**
 * Part C — load smoke: one realistic user journey.
 *
 * The journey (a clinician working their open reminders):
 *   1. search:  GET /reminders?status=Open&page=1&pageSize=5
 *   2. page:    GET /reminders?status=Open&page=2&pageSize=5
 *   3. detail:  GET /reminders/{id} — an id picked from the page just viewed
 * with 1-3s think time between steps, like a person reading the screen.
 *
 * Read-only on purpose: the store is in-memory with no delete endpoint, so a
 * write-heavy smoke would grow the dataset for the whole run and skew latency.
 *
 * Custom metrics:
 *   - journey_duration: HTTP time of one journey (sum of the 3 requests),
 *     think time excluded — it measures the API, not the sleeps.
 *   - journey_errors:   rate of journeys where any step failed a check.
 *
 * Response bodies are never logged: notes is sensitive.
 *
 * Run:  npm run api  →  npm run k6:build  →  npm run k6:journey
 */
const journeyDuration = new Trend('journey_duration', true);
const journeyErrors = new Rate('journey_errors');

export const options = {
  vus: smoke.vus,
  duration: smoke.duration,
  thresholds: {
    http_req_duration: ['p(95)<300'], // per-request budget (generous for localhost)
    http_req_failed: ['rate<0.01'], // transport/HTTP-error ceiling
    journey_duration: ['p(95)<900'], // whole journey: 3 requests x 300ms
    journey_errors: ['rate<0.01'],
  },
};

/** Safely pull `items` out of a list response; [] if the body isn't as expected. */
function itemsOf(res: Response): Array<{ id: string }> {
  try {
    return (res.json('items') as Array<{ id: string }>) ?? [];
  } catch {
    return [];
  }
}

function thinkTime() {
  sleep(1 + Math.random() * 2);
}

export default function () {
  let httpMs = 0;
  let ok = true;

  // 1. Search: first page of open reminders.
  const page1 = http.get(url('/reminders?status=Open&page=1&pageSize=5'));
  httpMs += page1.timings.duration;
  ok =
    check(page1, {
      'search: status 200': (r) => r.status === 200,
      'search: has items': (r) => itemsOf(r).length > 0,
    }) && ok;
  thinkTime();

  // 2. Page through to the next page.
  const page2 = http.get(url('/reminders?status=Open&page=2&pageSize=5'));
  httpMs += page2.timings.duration;
  ok = check(page2, { 'page 2: status 200': (r) => r.status === 200 }) && ok;
  thinkTime();

  // 3. Open one reminder's detail from the first page.
  const items = itemsOf(page1);
  if (items.length > 0) {
    const id = items[Math.floor(Math.random() * items.length)].id;
    const detail = http.get(url(`/reminders/${id}`));
    httpMs += detail.timings.duration;
    ok =
      check(detail, {
        'detail: status 200': (r) => r.status === 200,
        'detail: id matches': (r) => r.json('id') === id,
      }) && ok;
  } else {
    ok = false; // nothing to open — count the journey as failed
  }

  journeyDuration.add(httpMs);
  journeyErrors.add(!ok);
  thinkTime();
}
