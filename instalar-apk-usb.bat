@echo off
setlocal

cd /d "%~dp0"

echo.
echo ==========================================
echo  Instalador USB - SIG Checklist
echo ==========================================
echo.

if exist "C:\src\android-sdk\platform-tools\adb.exe" (
  set "ADB=C:\src\android-sdk\platform-tools\adb.exe"
) else if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
  set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
) else (
  echo ERRO: adb nao encontrado.
  echo Instale o Android SDK ou use o APK manualmente em dist\SIG-Checklist.apk.
  goto erro
)

if not exist "dist\SIG-Checklist.apk" (
  echo ERRO: APK nao encontrado.
  echo Gere primeiro executando: gerar-apk-local.bat
  goto erro
)

echo Conecte o telefone no cabo USB.
echo Ative a Depuracao USB e aceite a permissao na tela do telefone.
echo.

"%ADB%" devices
echo.
echo Instalando APK...
"%ADB%" install -r "dist\SIG-Checklist.apk"
if errorlevel 1 goto erro

echo.
echo APK instalado com sucesso.
echo.
pause
exit /b 0

:erro
echo.
echo Nao foi possivel instalar pelo USB. Verifique a mensagem acima.
echo.
pause
exit /b 1
