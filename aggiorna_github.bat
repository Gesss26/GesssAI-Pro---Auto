@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🔄 AGGIORNAMENTO DATI SU GITHUB
echo ========================================

REM Vai nella directory
cd /d "D:\ai\gesssai-pro-auto"

echo 📂 Directory: %cd%
echo.

REM ===== BRANCH MASTER =====
echo 🔍 Branch: master
echo.

REM ===== VERIFICA FILE JSON =====
echo 📁 Verifica file JSON...
if not exist "data\matches.json" (
    echo ❌ ERRORE: data/matches.json non trovato!
    pause
    exit /b 1
)

for %%A in ("data\matches.json") do (
    set /a SIZE=%%~zA/1024
    echo    ✅ matches.json trovato (!SIZE! KB)
)
echo.

REM ===== AGGIUNGI E COMMIT =====
echo 📤 Aggiungo i file a Git...
git add data/matches.json
git add data/*.json
git add excel/*.xlsx 2>nul
git add *.json 2>nul

git diff --cached --quiet
if errorlevel 1 (
    echo 📝 Modifiche rilevate, eseguo commit...
    
    for /f "tokens=1-3 delims=/- " %%a in ('date /t') do (
        set DATA_GG=%%a
        set DATA_MM=%%b
        set DATA_AAAA=%%c
    )
    for /f "tokens=1-3 delims=: " %%a in ('time /t') do (
        set ORA=%%a:%%b
    )
    
    git commit -m "Aggiornamento automatico dati %DATA_GG%/%DATA_MM%/%DATA_AAAA% %ORA%"
    echo ✅ Commit effettuato!
    
    echo.
    echo 🚀 Push su GitHub (branch: master)...
    git push origin master
    
    if errorlevel 1 (
        echo ❌ ERRORE durante il push!
        echo.
        echo Provando con -u...
        git push -u origin master
    ) else (
        echo ✅ Push completato!
    )
) else (
    echo ℹ️ Nessuna modifica da committare
)

echo.
echo ========================================
echo ✅ OPERAZIONE COMPLETATA!
echo ========================================
pause