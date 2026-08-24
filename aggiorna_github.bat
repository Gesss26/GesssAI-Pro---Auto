@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🔄 AGGIORNAMENTO DATI SU GITHUB
echo ========================================

REM Vai nella directory dello script
cd /d "D:\ai\gesssai-pro-auto"

echo 📂 Directory: %cd%
echo.

REM ===== VERIFICA GIT =====
echo 🔍 Verifica repository Git...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRORE: Non sei in un repository Git!
    echo.
    echo Per risolvere:
    echo   git init
    echo   git add .
    echo   git commit -m "Inizializzazione"
    echo   git remote add origin https://github.com/Gesss26/GesssAI-Pro---Auto.git
    echo   git push -u origin master
    pause
    exit /b 1
)
echo ✅ Repository Git trovato
echo.

REM ===== DETERMINA IL BRANCH CORRETTO =====
echo 🔍 Determinazione branch...
for /f "delims=" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=master
echo    Branch corrente: %CURRENT_BRANCH%
echo.

REM ===== VERIFICA URL REMOTO =====
echo 🔍 Verifica URL remoto...
git remote -v | find "origin" >nul
if errorlevel 1 (
    echo ⚠️ Repository remoto non configurato!
    git remote add origin https://github.com/Gesss26/GesssAI-Pro---Auto.git
    echo ✅ Remoto aggiunto: https://github.com/Gesss26/GesssAI-Pro---Auto.git
)
echo.

REM ===== VERIFICA FILE JSON =====
echo 📁 Verifica file JSON...
if not exist "data\matches.json" (
    echo ❌ ERRORE: data/matches.json non trovato!
    echo    Esegui prima python scarica.py
    pause
    exit /b 1
)

for %%A in ("data\matches.json") do (
    set /a SIZE=%%~zA/1024
    echo    ✅ matches.json trovato (!SIZE! KB)
)
echo.

REM ===== AGGIUNGI FILE =====
echo 📤 Aggiungo i file a Git...
git add data/matches.json
git add data/*.json
git add excel/*.xlsx 2>nul
git add *.json 2>nul

REM ===== VERIFICA MODIFICHE =====
git diff --cached --quiet
if errorlevel 1 (
    echo.
    echo 📝 Modifiche rilevate, eseguo commit...
    
    REM Crea messaggio con data e ora
    for /f "tokens=1-3 delims=/- " %%a in ('date /t') do (
        set DATA_GG=%%a
        set DATA_MM=%%b
        set DATA_AAAA=%%c
    )
    for /f "tokens=1-3 delims=: " %%a in ('time /t') do (
        set ORA=%%a:%%b
    )
    
    git commit -m "Aggiornamento automatico dati %DATA_GG%/%DATA_MM%/%DATA_AAAA% %ORA%"
    
    if errorlevel 1 (
        echo ❌ ERRORE durante il commit
        pause
        exit /b 1
    )
    echo ✅ Commit effettuato!
    
    echo.
    echo 🚀 Push su GitHub (branch: %CURRENT_BRANCH%)...
    git push origin %CURRENT_BRANCH%
    
    if errorlevel 1 (
        echo.
        echo ❌ ERRORE durante il push!
        echo.
        echo Tentativo con -u...
        git push -u origin %CURRENT_BRANCH%
        
        if errorlevel 1 (
            echo.
            echo ❌ ANCORA ERRORE!
            echo.
            echo Possibili soluzioni:
            echo   1. Usa un token:
            echo      git remote set-url origin https://Gesss26:IL_TUO_TOKEN@github.com/Gesss26/GesssAI-Pro---Auto.git
            echo   2. Forza il push:
            echo      git push -f origin %CURRENT_BRANCH%
            echo.
            pause
            exit /b 1
        )
    )
    
    echo ✅ Push completato con successo!
    
) else (
    echo ℹ️ Nessuna modifica da committare - tutto aggiornato!
)

echo.
echo ========================================
echo ✅ OPERAZIONE COMPLETATA!
echo ========================================
pause