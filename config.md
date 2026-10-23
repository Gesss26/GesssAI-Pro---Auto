# 📋 Configurazione GesssAI-Pro

## Nome file Excel attuale
`Statistiche_Fantacalcio_Stagione_2026_27.xlsx`

Quando cambia stagione (es. 2027_28), aggiornare in:
- `index.html` → `loadStatisticheGiocatori()` (3 righe)
- `scripts/aggiorna_assenze.py` → `EXCEL_PATH`
- `.github/workflows/aggiorna-assenze.yml` → step "Verifica che l'Excel esista"

## Flusso settimanale (venerdì)
1. Scarica Excel da fantacalcio.it
2. Rinomina in `Statistiche_Fantacalcio_Stagione_2026_27.xlsx`
3. Commit su GitHub in `data/`
4. Actions → "Aggiorna Assenze Venerdì" → Run workflow
5. Verifica esito verde ✅

## Secret necessari su GitHub
- `GEMINI_API_KEY` → da https://aistudio.google.com/apikey

## Note
- La GitHub Action gira da sola **ogni venerdì alle 17:00 italiane**
- Usa l'Excel che hai committato tu (non lo scarica dal sito)
- Se l'Excel non è aggiornato, il JSON conterrà dati vecchi