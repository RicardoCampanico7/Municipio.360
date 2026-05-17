#!/bin/sh

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null
  fi

  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null
  fi
}

trap cleanup INT TERM

backend_health_ready() {
  curl -fsS --max-time 2 http://localhost:3000/occurrences/health >/dev/null 2>&1
}

tcp_port_open() {
  nc -z localhost 3000 >/dev/null 2>&1
}

wait_for_backend() {
  max_attempts=60
  attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    if backend_health_ready; then
      return 0
    fi

    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      wait "$BACKEND_PID"
      status=$?
      printf '\n[Municipio360] O backend terminou antes de ficar pronto (codigo %s).\n' "$status"
      printf '[Municipio360] Confirma se a base de dados esta a correr: docker compose up -d\n'
      return "$status"
    fi

    sleep 1
    attempt=$((attempt + 1))
  done

  printf '\n[Municipio360] Timeout ao esperar pelo backend em http://localhost:3000/occurrences/health.\n'
  printf '[Municipio360] Ve os logs acima para perceber porque o backend nao ficou pronto.\n'
  return 1
}

if backend_health_ready; then
  printf '[Municipio360] Backend ja estava a correr em http://localhost:3000\n'
elif tcp_port_open; then
  printf '[Municipio360] A porta 3000 ja esta ocupada por outro processo.\n'
  printf '[Municipio360] Fecha esse processo ou altera a porta do backend antes de voltar a correr o script.\n'
  exit 1
else
  cd backend || exit 1
  npm run start:dev &
  BACKEND_PID=$!

  wait_for_backend || exit 1

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
