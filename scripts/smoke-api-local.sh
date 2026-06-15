#!/usr/bin/env bash
# Local API smoke (demo org). Not a substitute for staging checklist — use for dev regression.
set -euo pipefail

API="${API_URL:-http://localhost:3001}"
ORG_SLUG="${VIKELA_DEV_ORG_SLUG:-demo}"
H=(-H "X-Org-Slug: $ORG_SLUG" -H "Content-Type: application/json")

pass=0
fail=0
note() { echo "  → $*"; }
ok() { echo "✅ $1"; pass=$((pass + 1)); }
bad() { echo "❌ $1"; fail=$((fail + 1)); note "$2"; }

echo "=== Vikela API smoke (local) ==="
echo "API: $API  Org: $ORG_SLUG"
echo

# Health
if curl -sf "$API/health" | grep -q '"ok"'; then ok "GET /health"; else bad "GET /health" "$(curl -s "$API/health" || true)"; fi

# Read endpoints
for path in \
  "/api/v1/dashboard" \
  "/api/v1/frameworks" \
  "/api/v1/gaps?status=OPEN" \
  "/api/v1/gaps?status=OPEN&isSample=false" \
  "/api/v1/scans" \
  "/api/v1/evidence" \
  "/api/v1/evidence/coverage" \
  "/api/v1/policies" \
  "/api/v1/risks" \
  "/api/v1/vendors" \
  "/api/v1/members" \
  "/api/v1/training" \
  "/api/v1/training/progress" \
  "/api/v1/copilot/suggestions"; do
  code=$(curl -s -o /tmp/smoke.json -w "%{http_code}" "${H[@]}" "$API$path")
  if [[ "$code" == "200" ]] && grep -q '"data"' /tmp/smoke.json 2>/dev/null && ! grep -q '"data":null' /tmp/smoke.json 2>/dev/null; then
    ok "GET $path"
  else
    bad "GET $path" "HTTP $code $(head -c 200 /tmp/smoke.json 2>/dev/null)"
  fi
done

# Mutations (create + patch + export)
RISK=$(curl -sf "${H[@]}" -d '{"title":"Smoke risk","description":"auto","likelihood":2,"impact":2}' "$API/api/v1/risks" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.id)}catch{}})")
if [[ -n "${RISK:-}" ]]; then
  ok "POST /risks"
  code=$(curl -s -o /tmp/smoke.json -w "%{http_code}" "${H[@]}" -X PATCH -d '{"status":"MITIGATED"}' "$API/api/v1/risks/$RISK")
  [[ "$code" == "200" ]] && ok "PATCH /risks/:id" || bad "PATCH /risks/:id" "HTTP $code"
  code=$(curl -s -o /tmp/smoke.csv -w "%{http_code}" "${H[@]}" "$API/api/v1/risks/export")
  [[ "$code" == "200" ]] && head -1 /tmp/smoke.csv | grep -q Title && ok "GET /risks/export" || bad "GET /risks/export" "HTTP $code"
else
  bad "POST /risks" "no id returned"
fi

VENDOR=$(curl -sf "${H[@]}" -d '{"name":"Smoke Vendor Co","category":"SaaS"}' "$API/api/v1/vendors" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.id)}catch{}})")
if [[ -n "${VENDOR:-}" ]]; then
  ok "POST /vendors"
  code=$(curl -s -o /tmp/smoke.json -w "%{http_code}" "${H[@]}" -X PATCH -d '{"reviewStatus":"IN_REVIEW"}' "$API/api/v1/vendors/$VENDOR")
  [[ "$code" == "200" ]] && ok "PATCH /vendors/:id" || bad "PATCH /vendors/:id" "HTTP $code"
else
  bad "POST /vendors" "no id"
fi

MOD=$(curl -sf "${H[@]}" -d '{"name":"Smoke training","description":"auto","assignToAll":true}' "$API/api/v1/training/modules" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.id)}catch{}})")
if [[ -n "${MOD:-}" ]]; then
  ok "POST /training/modules"
  ASSIGN=$(curl -sf "${H[@]}" "$API/api/v1/training/progress" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const rows=j.data||[];const a=rows[0]&&rows[0].assignments&&rows[0].assignments[0];console.log(a&&a.id||"")}catch{}})')
  if [[ -n "${ASSIGN:-}" ]]; then
    code=$(curl -s -o /tmp/smoke.json -w "%{http_code}" "${H[@]}" -X PATCH -d '{"status":"COMPLETE"}' "$API/api/v1/training/assignments/$ASSIGN")
    [[ "$code" == "200" ]] && ok "PATCH /training/assignments/:id" || bad "PATCH /training/assignments/:id" "HTTP $code"
  else
    bad "PATCH /training/assignments/:id" "no assignment id"
  fi
  code=$(curl -s -o /tmp/smoke.csv -w "%{http_code}" "${H[@]}" "$API/api/v1/training/export")
  [[ "$code" == "200" ]] && head -1 /tmp/smoke.csv | grep -q Member && ok "GET /training/export" || bad "GET /training/export" "HTTP $code"
else
  bad "POST /training/modules" "no id"
fi

POLICY=$(curl -sf "${H[@]}" "$API/api/v1/policies" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data[0].id)}catch{}})")
if [[ -n "${POLICY:-}" ]]; then
  code=$(curl -s -o /tmp/smoke.json -w "%{http_code}" "${H[@]}" -X PATCH -d '{"title":"Smoke policy title"}' "$API/api/v1/policies/$POLICY")
  [[ "$code" == "200" ]] && ok "PATCH /policies/:id" || bad "PATCH /policies/:id" "HTTP $code"
  code=$(curl -s -o /tmp/smoke.md -w "%{http_code}" "${H[@]}" "$API/api/v1/policies/$POLICY/export")
  [[ "$code" == "200" ]] && ok "GET /policies/:id/export" || bad "GET /policies/:id/export" "HTTP $code"
else
  note "SKIP policies mutations (no policies in org)"
fi

GAP=$(curl -sf "${H[@]}" "$API/api/v1/gaps?status=OPEN" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const rows=JSON.parse(d).data||[];const g=rows.find(x=>x.isSample===false)||rows[0];console.log(g&&g.id||"")}catch{}})')
if [[ -n "${GAP:-}" ]]; then
  code=$(curl -s -o /tmp/smoke.json -w "%{http_code}" "${H[@]}" -X POST -d '{}' "$API/api/v1/copilot/explain-gap/$GAP")
  if [[ "$code" == "200" ]] && grep -q '"answer"' /tmp/smoke.json; then
    ok "POST /copilot/explain-gap/:id"
  else
    bad "POST /copilot/explain-gap/:id" "HTTP $code $(head -c 120 /tmp/smoke.json 2>/dev/null)"
  fi
else
  note "SKIP copilot explain (no open gaps)"
fi

echo
echo "=== Summary: $pass passed, $fail failed ==="
[[ "$fail" -eq 0 ]]
