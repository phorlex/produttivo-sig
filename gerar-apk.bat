@echo off
setlocal

cd /d "%~dp0"

echo.
echo ==========================================
echo  Gerador de APK - SIG Checklist
echo ==========================================
echo.
echo Este processo usa o Expo EAS Build para gerar o APK Android.
echo Na primeira vez, faca login ou crie uma conta Expo quando solicitado.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$free=(Get-PSDrive C).Free; if ($free -lt 5GB) { Write-Host ''; Write-Host 'ERRO: o disco C: precisa de pelo menos 5 GB livres para gerar o APK.'; Write-Host ('Espaco livre atual: {0:N2} GB' -f ($free/1GB)); Write-Host ''; Write-Host 'Libere espaco e execute este arquivo novamente.'; exit 1 }"
if errorlevel 1 goto erro_espaco

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install --legacy-peer-deps
  if errorlevel 1 goto erro
)

echo.
echo Gerando APK...
echo.
call npm run build:apk
if errorlevel 1 goto erro

echo.
echo Build enviado com sucesso.
echo Quando terminar, o EAS vai mostrar o link para baixar o APK.
echo.
pause
exit /b 0

:erro_espaco
echo.
echo Dica rapida: esvazie a Lixeira e remova arquivos grandes de Downloads.
echo Tambem ajuda apagar caches temporarios do npm e do Windows.
echo.
pause
exit /b 1

:erro
echo.
echo Nao foi possivel gerar o APK. Verifique a mensagem acima.
echo.
pause
exit /b 1
