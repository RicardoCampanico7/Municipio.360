#!/bin/sh

cd backend || exit 1
npm run start:dev &
BACKEND_PID=$!

npx wait-on http://localhost:3000

cd ../frontend || exit 1
npm run dev &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
