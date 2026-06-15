import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

// Simulate large dataset
const testData = new SharedArray('test-data', function () {
  return Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    title: `Test Evidence ${i}`,
    type: 'OTHER',
  }));
});

export const options = {
  stages: [
    { duration: '5m', target: 10 },   // Steady load with large data
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const data = testData[Math.floor(Math.random() * testData.length)];
  
  // Test handling large amounts of data
  const res = http.post(`${BASE_URL}/api/v1/evidence`, 
    JSON.stringify({
      title: data.title,
      type: data.type,
    }), 
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Slug': 'demo',
      },
    }
  );

  check(res, {
    'evidence created': (r) => r.status === 201 || r.status === 200,
  });
}
