#!/bin/sh

cd backend || exit 1
npm run start:dev &
BACKEND_PID=$!

npx wait-on http://localhost:3000

printf '\n[Municipio360] Backend pronto.\n'
printf '[Municipio360] Swagger UI: http://localhost:3000/api\n'
printf '[Municipio360] OpenAPI JSON: http://localhost:3000/api/openapi.json\n'
printf '[Municipio360] Alias docs: http://localhost:3000/docs\n\n'

cd ../frontend || exit 1
npm run dev &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
