@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo Configurar MySQL - SIG Checklist
echo ==========================================
echo.

set /p MYSQL_USER=Usuario MySQL [root]: 
if "%MYSQL_USER%"=="" set MYSQL_USER=root

set /p MYSQL_PASS=Senha do MySQL: 

set /p MYSQL_DB=Banco [sig_checklist]: 
if "%MYSQL_DB%"=="" set MYSQL_DB=sig_checklist

powershell -NoProfile -ExecutionPolicy Bypass -Command "$user='%MYSQL_USER%'; $pass=[uri]::EscapeDataString('%MYSQL_PASS%'); $db='%MYSQL_DB%'; $url=\"mysql://$user`:$pass@localhost:3306/$db\"; $lines=@(); if(Test-Path '.env'){ $lines=Get-Content '.env' | Where-Object { $_ -notmatch '^DATABASE_URL=' } }; @(\"DATABASE_URL=$url\") + $lines | Set-Content '.env' -Encoding ASCII"

echo.
echo DATABASE_URL atualizada no arquivo .env.
echo.
echo Rodando migrations...
call npm run db:migrate
if errorlevel 1 (
  echo.
  echo Falha ao rodar migrations. Confira usuario e senha do MySQL.
  pause
  exit /b 1
)

echo.
echo Rodando seed inicial...
call npm run db:seed
if errorlevel 1 (
  echo.
  echo Falha ao rodar seed.
  pause
  exit /b 1
)

echo.
echo Banco preparado com sucesso.
echo Login inicial:
echo E-mail: admin@sig.com
echo Senha: 123456
echo.
pause
