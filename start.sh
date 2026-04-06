#!/bin/sh

BACKEND_PID=""

if npx wait-on -t 1000 http://localhost:3000/occurrences/health >/dev/null 2>&1; then
  printf '[Municipio360] Backend ja estava a correr em http://localhost:3000\n'
elif npx wait-on -t 1000 tcp:3000 >/dev/null 2>&1; then
  printf '[Municipio360] A porta 3000 ja esta ocupada por outro processo.\n'
  printf '[Municipio360] Fecha esse processo ou altera a porta do backend antes de voltar a correr o script.\n'
  exit 1
else
  cd backend || exit 1
  npm run start:dev &
  BACKEND_PID=$!

  npx wait-on http://localhost:3000/occurrences/health

  printf '\n[Municipio360] Backend pronto.\n'
  printf '[Municipio360] Swagger UI: http://localhost:3000/api\n'
  printf '[Municipio360] OpenAPI JSON: http://localhost:3000/api/openapi.json\n'
  printf '[Municipio360] Alias docs: http://localhost:3000/docs\n\n'

  cd ..
fi

cd frontend || exit 1
npm run dev &
FRONTEND_PID=$!

if [ -n "$BACKEND_PID" ]; then
  wait $BACKEND_PID $FRONTEND_PID
else
  wait $FRONTEND_PID
fi
