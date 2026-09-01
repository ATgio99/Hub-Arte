@echo off
cd /d "%~dp0"

REM Verifica che Node.js sia installato
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo ❌ Node.js non trovato. Installalo da https://nodejs.org
  echo    Scarica la versione LTS e riprova.
  pause
  exit /b 1
)

REM Prima volta? Installa le dipendenze
if not exist "node_modules" (
  echo 📦 Prima esecuzione: installazione dipendenze...
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo ❌ Errore nell'installazione delle dipendenze.
    pause
    exit /b 1
  )
  echo ✅ Dipendenze installate!
  echo.
)

echo 🏛️  Avvio HUB Art — Atlante Neuronale
echo    Sito:       http://localhost:5173
echo    Gestione:   http://localhost:5173/admin.html
echo    Login:      http://localhost:5173/#/login
echo.
echo    Lascia aperta questa finestra.
echo    Premi Ctrl+C per fermare il server.
echo.

REM Apri il browser dopo 3 secondi
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5173"

REM Avvia Vite dev server
call npx vite --host
