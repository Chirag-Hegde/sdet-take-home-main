import http from 'k6/http';
import { check, sleep } from 'k6';
import { smoke } from '../profiles/smoke';
import { url } from '../shared/http';

/**
 * Example k6 scenario against the Reminders API.
 *
 * This is the minimal baseline: it lists reminders and checks the status.
 * The Part C deliverable — a realistic journey with custom metrics and
 * thresholds — lives in ./reminders-journey.ts; this file is kept as a quick
 * connectivity check.
 *
 * Run:
 *   npm run api        # in one terminal
 *   npm run k6:build   # bundle scenarios to load/dist/
 *   npm run k6:smoke   # runs load/dist/reminders-smoke.js
 */
export const options = {
  vus: smoke.vus,
  duration: smoke.duration,
  // Thresholds live in reminders-journey.ts; this baseline stays unguarded on purpose.
};

export default function () {
  const res = http.get(url('/reminders?page=1&pageSize=10'));

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
