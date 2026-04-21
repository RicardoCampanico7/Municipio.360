@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

if not exist "%BACKEND_DIR%\package.json" (
  echo [Municipio360] Nao encontrei o backend em "%BACKEND_DIR%".
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [Municipio360] Nao encontrei o frontend em "%FRONTEND_DIR%".
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [Municipio360] Nao encontrei o npm.cmd. Confirma se o Node.js esta instalado.
  exit /b 1
)

echo [Municipio360] A abrir o backend...
start "Municipio360 Backend" /D "%BACKEND_DIR%" cmd /k "npm.cmd run start:dev"

echo [Municipio360] A abrir o frontend...
start "Municipio360 Frontend" /D "%FRONTEND_DIR%" cmd /k "npm.cmd run dev"

echo.
echo [Municipio360] Janelas abertas.
echo [Municipio360] Swagger UI: http://localhost:3000/api
echo [Municipio360] Frontend: ve o URL mostrado na janela do frontend, normalmente http://localhost:5173

endlocal
