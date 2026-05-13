@echo off
setlocal

cd /d "%~dp0"

echo.
echo ========================================
echo  SIG Checklist - enviar para o GitHub
echo ========================================
echo.

git status --short
echo.

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" (
  set /p COMMIT_MSG=Mensagem do commit: 
)

if "%COMMIT_MSG%"=="" (
  set "COMMIT_MSG=Atualizar projeto"
)

echo.
echo Adicionando arquivos...
git add .
if errorlevel 1 goto erro

git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo Nenhuma alteracao para commitar.
) else (
  echo.
  echo Criando commit: "%COMMIT_MSG%"
  git commit -m "%COMMIT_MSG%"
  if errorlevel 1 goto erro
)

echo.
echo Enviando para origin/main...
git push -u origin main
if errorlevel 1 goto erro

echo.
echo Pronto. Projeto enviado para o GitHub.
goto fim

:erro
echo.
echo Ocorreu um erro. Verifique a mensagem acima.
exit /b 1

:fim
endlocal
