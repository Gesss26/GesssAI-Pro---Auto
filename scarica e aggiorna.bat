@echo off
echo ========================================
echo ⚽ SCRAPING + AGGIORNAMENTO GITHUB
echo ========================================

cd /d "D:\Ai\GesssAI-Pro-Auto"

echo 📥 1. Avvio scraping...
python scarica.py

if errorlevel 1 (
    echo ❌ ERRORE durante lo scraping!
    pause
    exit /b 1
)

echo 📤 2. Aggiorno GitHub...
call aggiorna_github.bat

echo ✅ TUTTO FATTO!
pause