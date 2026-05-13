@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo SIG Checklist Operacional
echo ==========================================
echo.

if not exist ".env" (
  echo Arquivo .env nao encontrado.
  echo Criando .env a partir de .env.example...
  copy ".env.example" ".env" >nul
  echo.
  echo Revise o arquivo .env antes de rodar migrations/seed.
  echo.
)

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Para preparar o banco na primeira execucao, rode:
echo mysql -u root -p ^< configurar-mysql.sql
echo npm run db:migrate
echo npm run db:seed
echo.

set BACKEND_RUNNING=0
netstat -ano | findstr ":4000 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  set BACKEND_RUNNING=1
  echo A porta 4000 ja esta em uso. Vou reutilizar o backend que ja esta aberto.
  echo.
)

set WEB_PORT=3000
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  set WEB_PORT=3001
  echo A porta 3000 ja esta em uso. O painel sera iniciado em http://localhost:3001
  echo.
)

if "%BACKEND_RUNNING%"=="0" (
  echo Iniciando backend em http://localhost:4000 ...
  start "SIG Backend" cmd /k "cd /d ""%~dp0"" && npm run dev:backend"
  timeout /t 3 /nobreak >nul
)

echo Iniciando painel web em http://localhost:%WEB_PORT% ...
start "SIG Painel Web" cmd /k "cd /d ""%~dp0"" && npm run dev --workspace web -- -p %WEB_PORT%"

echo.
echo Projeto iniciado.
echo Painel web: http://localhost:%WEB_PORT%
echo Backend:    http://localhost:4000
echo.
echo Para o app mobile, rode em outra janela:
echo npm run dev:mobile
echo.
pause
