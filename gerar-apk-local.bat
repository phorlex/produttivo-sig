@echo off
setlocal

cd /d "%~dp0"

echo.
echo ==========================================
echo  Gerador de APK LOCAL - SIG Checklist
echo ==========================================
echo.
echo Este modo nao usa conta Expo. Ele compila o APK no proprio PC.
echo O arquivo final sera salvo em: dist\SIG-Checklist.apk
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$free=(Get-PSDrive C).Free; if ($free -lt 8GB) { Write-Host ''; Write-Host 'ERRO: o disco C: precisa de pelo menos 8 GB livres para gerar APK local.'; Write-Host ('Espaco livre atual: {0:N2} GB' -f ($free/1GB)); Write-Host ''; exit 1 }"
if errorlevel 1 goto erro_espaco

if exist "C:\src\android-sdk\platform-tools\adb.exe" (
  set "ANDROID_HOME=C:\src\android-sdk"
  set "ANDROID_SDK_ROOT=C:\src\android-sdk"
) else if exist "%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" (
  set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
  set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
) else (
  echo ERRO: Android SDK nao encontrado.
  echo Instale o Android Studio ou configure o ANDROID_HOME.
  goto erro
)

set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

for /f "delims=" %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip=(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address.IPAddress -like '192.168.*' } | Select-Object -First 1 -ExpandProperty IPv4Address).IPAddress; if (-not $ip) { $ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' } | Select-Object -First 1 -ExpandProperty IPAddress) }; if ($ip) { $ip }"') do set "WIFI_IP=%%I"

if not defined WIFI_IP (
  echo Nao consegui detectar o IP do Wi-Fi automaticamente.
  set /p WIFI_IP=Digite o IP deste computador na rede Wi-Fi, exemplo 192.168.0.149: 
)

set "EXPO_PUBLIC_API_URL=http://%WIFI_IP%:4000"
set "NODE_ENV=production"
set "GRADLE_OPTS=-Xmx6144m -Dfile.encoding=UTF-8"
echo API do app mobile: %EXPO_PUBLIC_API_URL%
echo.

java -version >nul 2>nul
if errorlevel 1 (
  echo ERRO: Java nao encontrado. Instale o JDK 17.
  goto erro
)

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install --legacy-peer-deps
  if errorlevel 1 goto erro
)

echo.
echo Preparando projeto Android nativo...
cd mobile
call npx --yes expo prebuild --platform android
if errorlevel 1 goto erro

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='android/gradle.properties'; $text=Get-Content $p -Raw; $text=$text -replace 'org\.gradle\.jvmargs=.*','org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8'; $text=$text -replace 'android\.enableJetifier=.*','android.enableJetifier=false'; $text=$text -replace 'reactNativeArchitectures=.*','reactNativeArchitectures=armeabi-v7a,arm64-v8a'; Set-Content $p $text -Encoding UTF8"

echo.
echo Compilando APK local...
cd android
call gradlew.bat assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
if errorlevel 1 goto erro

cd /d "%~dp0"
if not exist "dist" mkdir "dist"
copy /Y "mobile\android\app\build\outputs\apk\release\app-release.apk" "dist\SIG-Checklist.apk" >nul
if errorlevel 1 goto erro

echo.
echo APK gerado com sucesso:
echo %CD%\dist\SIG-Checklist.apk
echo.
pause
exit /b 0

:erro_espaco
echo.
echo Libere espaco no disco e execute novamente.
echo.
pause
exit /b 1

:erro
echo.
echo Nao foi possivel gerar o APK local. Verifique a mensagem acima.
echo.
pause
exit /b 1
