curl -X POST http://localhost:3000/api/documents/batch \
  -H "content-type: application/json" \
  -H "x-idempotency-key: batch-demo-001" \
  -d '{"userIds":["user-1","user-2"],"documentType":"cerfa","priority":3}'

curl http://localhost:3000/api/documents/batch/<batchId>

curl -OJ http://localhost:3000/api/documents/<documentId>
