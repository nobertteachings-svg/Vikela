import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users (stress level)
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users (breaking point)
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.5'], // Allow higher error rate during stress testing
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  // Concurrent requests to find breaking points
  let requests = [
    http.get(`${BASE_URL}/health`),
    http.get(`${BASE_URL}/api/v1/frameworks`, {
      headers: { 'X-Org-Slug': 'demo' },
    }),
  ];

  requests.forEach((res) => {
    check(res, {
      'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    }) || errorRate.add(1);
  });

  sleep(0.5);
}
