@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: ⚽ GESSSAI - SCRAPING + AGGIORNAMENTO DATI
:: ============================================================

title GesssAI - Scraping e Aggiornamento Dati
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║     ⚽ GESSSAI - SCRAPING + AGGIORNAMENTO DATI             ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: 1. VAI NELLA DIRECTORY CORRETTA
:: ============================================================
echo 📂 [1/5] Navigazione nella directory...
cd /d "D:\Ai\GesssAI-Pro-Auto"

if errorlevel 1 (
    echo ❌ ERRORE: Directory non trovata!
    echo    Verifica che esista: D:\Ai\GesssAI-Pro-Auto
    pause
    exit /b 1
)

echo ✅ Directory corrente: %cd%
echo.

:: ============================================================
:: 2. VERIFICA REPOSITORY GIT
:: ============================================================
echo 🔍 [2/5] Verifica repository Git...

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Repository Git non inizializzato!
    echo.
    echo    📦 Inizializzo repository...
    git init
    if errorlevel 1 (
        echo ❌ ERRORE: Impossibile inizializzare Git
        pause
        exit /b 1
    )
    echo ✅ Git inizializzato
    
    echo.
    echo    📤 Aggiungo i file...
    git add .
    git commit -m "Inizializzazione repository GesssAI"
    
    echo.
    echo    🔗 Collego al repository remoto...
    git remote add origin https://github.com/Gesss26/GesssAl-Pro---Auto.git
    git branch -M main
    
    echo.
    echo    🚀 Push iniziale...
    git push -u origin main
    
    if errorlevel 1 (
        echo ⚠️ Push iniziale fallito.
        echo    Per risolvere usa il token:
        echo    git remote set-url origin https://Gesss26:TOKEN@github.com/Gesss26/GesssAl-Pro---Auto.git
    ) else (
        echo ✅ Repository inizializzato e collegato!
    )
) else (
    echo ✅ Repository Git trovato
)
echo.

:: ============================================================
:: 3. CREA CARTELLE NECESSARIE
:: ============================================================
echo 📁 [3/5] Verifica cartelle...

if not exist "data" (
    mkdir data
    echo ✅ Cartella data creata
) else (
    echo ✅ Cartella data esistente
)

if not exist "excel" (
    mkdir excel
    echo ✅ Cartella excel creata
) else (
    echo ✅ Cartella excel esistente
)

if not exist "downloads" (
    mkdir downloads
    echo ✅ Cartella downloads creata
) else (
    echo ✅ Cartella downloads esistente
)

echo.

:: ============================================================
:: 4. AVVIA SCRAPING (CON GESTIONE ERRORI)
:: ============================================================
echo ⚽ [4/5] Avvio scraping...
echo.

:: Verifica che esista scarica.py
if not exist "scarica.py" (
    echo ❌ ERRORE: File scarica.py non trovato!
    pause
    exit /b 1
)

:: Esegui il Python (continua anche se ci sono errori di download)
python scarica.py

:: Anche se ci sono errori 429, la conversione potrebbe aver funzionato
echo.
echo ✅ Scraping completato (anche con possibili errori di rate-limit)
echo.

:: ============================================================
:: 5. AGGIORNA GITHUB (FORZATO)
:: ============================================================
echo 🔄 [5/5] Aggiornamento GitHub...
echo.

:: Verifica che il JSON esista
if exist "data\matches.json" (
    echo ✅ JSON trovato: data\matches.json
    for %%A in ("data\matches.json") do (
        set /a SIZE=%%~zA/1024
        echo    📊 Dimensione: !SIZE! KB
    )
) else (
    echo ⚠️ JSON non trovato in data/
    echo    Cerco in altre posizioni...
    
    if exist "matches.json" (
        echo ✅ Trovato matches.json nella root
        copy matches.json data\ 2>nul
        echo ✅ Copiato in data/
    )
)

:: Controlla anche il file Excel
if exist "excel\GesssAI_Input.xlsx" (
    echo ✅ Excel trovato: excel\GesssAI_Input.xlsx
    for %%A in ("excel\GesssAI_Input.xlsx") do (
        set /a SIZE=%%~zA/1024
        echo    📊 Dimensione: !SIZE! KB
    )
)

echo.

:: ===== AGGIUNGI TUTTI I FILE =====
echo 📤 Aggiungo i file a Git...

:: Aggiungi JSON
git add data/*.json 2>nul
git add *.json 2>nul

:: Aggiungi Excel
git add excel/*.xlsx 2>nul
git add *.xlsx 2>nul

:: Aggiungi HTML (se necessario)
git add downloads/*.html 2>nul

:: ===== COMMIT =====
git diff --cached --quiet
if errorlevel 1 (
    echo.
    echo 📝 Modifiche rilevate, eseguo commit...
    
    :: Data e ora per il commit
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
        echo    Forse non ci sono modifiche da committare
    ) else (
        echo ✅ Commit effettuato!
        
        echo.
        echo 🚀 Push su GitHub...
        git push origin main
        
        if errorlevel 1 (
            echo.
            echo ❌ ERRORE durante il push!
            echo.
            echo Possibili soluzioni:
            echo   1. Usa un token: 
            echo      git remote set-url origin https://Gesss26:TOKEN@github.com/Gesss26/GesssAl-Pro---Auto.git
            echo   2. Usa SSH:
            echo      git remote set-url origin git@github.com:Gesss26/GesssAl-Pro---Auto.git
            echo   3. Forza il push:
            echo      git push -f origin main
            echo.
        ) else (
            echo ✅ Push completato con successo!
        )
    )
) else (
    echo ℹ️ Nessuna modifica da committare
)
echo.

:: ============================================================
:: 6. STATISTICHE FINALI
:: ============================================================
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║     ✅ PROCESSO COMPLETATO!                                ║
echo ║                                                              ║
echo ║     📊 Dati generati:                                      ║
echo ║        📱 data/matches.json - JSON per l'app              ║
echo ║        📊 excel/GesssAI_Input.xlsx - Excel per l'app     ║
echo ║                                                              ║
echo ║     🔗 Repository:                                         ║
echo ║        https://github.com/Gesss26/GesssAl-Pro---Auto      ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Mostra statistiche
echo 📊 STATISTICHE FINALI:
echo.
if exist "data\matches.json" (
    for %%A in ("data\matches.json") do (
        set /a SIZE=%%~zA/1024
        echo    📱 matches.json: !SIZE! KB
    )
) else (
    echo    ❌ matches.json non trovato
)

if exist "excel\GesssAI_Input.xlsx" (
    for %%A in ("excel\GesssAI_Input.xlsx") do (
        set /a SIZE=%%~zA/1024
        echo    📊 GesssAI_Input.xlsx: !SIZE! KB
    )
) else (
    echo    ❌ GesssAI_Input.xlsx non trovato
)

if exist "excel\Tutti_Schedule.xlsx" (
    for %%A in ("excel\Tutti_Schedule.xlsx") do (
        set /a SIZE=%%~zA/1024
        echo    📅 Tutti_Schedule.xlsx: !SIZE! KB
    )
)

if exist "excel\Tutti_Stats.xlsx" (
    for %%A in ("excel\Tutti_Stats.xlsx") do (
        set /a SIZE=%%~zA/1024
        echo    📊 Tutti_Stats.xlsx: !SIZE! KB
    )
)

echo.
echo ⏰ Data: %date% %time%
echo.

:: ============================================================
:: 7. COMANDI UTILI PER IL FUTURO
:: ============================================================
echo.
echo 💡 CONSIGLI PER IL FUTURO:
echo.
echo    1. Per evitare errori 429, attendi il giorno dopo
echo    2. L'API key ha 50 richieste/giorno
echo    3. Per aggiornare solo il JSON usa: python scarica.py --no-download
echo    4. Per forzare il push su GitHub: git push -f origin main
echo.

pause
exit /b 0