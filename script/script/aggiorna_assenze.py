#!/usr/bin/env python3
"""
aggiorna_assenze.py
Legge l'Excel del Fantacalcio già presente in data/, lo carica su Gemini
e genera data/assenze.json con le assenze/infortuni aggiornati.

NON scarica l'Excel da internet: presuppone che tu lo abbia già caricato
manualmente sul repo (commit del venerdì).
"""

import os
import sys
import json
import time
import datetime
import mimetypes
from pathlib import Path

# --- Dipendenze ---
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ Manca google-genai. Installa con: pip install google-genai")
    sys.exit(1)

# ============================================================
# CONFIGURAZIONE
# ============================================================
EXCEL_PATH = Path("data/Statistiche_Fantacalcio_Stagione_2026_27.xlsx")
ASSENZE_JSON_PATH = Path("data/assenze.json")

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Prompt identico a quello usato manualmente
PROMPT_ASSENZE = """
Sei un analista di dati calcistici. Ti ho allegato un file Excel
"Statistiche_Fantacalcio_Stagione_2026_27.xlsx" con i voti e le
statistiche di TUTTI i giocatori della Serie A 2026/27
(fogli: Tutti, Portieri, Difensori, Centrocampisti, Attaccanti).

Colonne: Id | R (ruolo) | Rm (ruolo specifico) | Nome | Squadra |
Pv (presenze voto) | Mv (media voto) | Fm (fantamedia) |
Gf (gol fatti) | Gs (gol subiti) | Rp (rigori parati) |
Rc (rigori causati) | R+ (rigori segnati) | R- (rigori sbagliati) |
Ass (assist) | Amm (ammonizioni) | Esp (espulsioni) | Au (autogol)

COMPITO:
Genera una lista aggiornata delle ASSENZE per infortunio o squalifica
per OGNI squadra della Serie A (es. Inter, Milan, Juventus, Napoli,
Roma, Lazio, Atalanta, Fiorentina, Bologna, Torino, Como, Genoa,
Cagliari, Udinese, Parma, Lecce, Sassuolo, Monza, Frosinone, Venezia).

Per ogni squadra elenca SOLO i giocatori assenti al momento attuale
(usa le tue conoscenze più recenti di infortuni/squalifiche +
coerenza con le presenze Pv del file: se un giocatore ha Pv=0 in
tutte le prime 7 giornate è probabilmente infortunato o fuori rosa).

PER OGNI GIOCATORE ASSENTE indica:
- Nome (come nel file Excel)
- Ruolo: P / D / C / A
- Motivo: "Infortunio" | "Squalifica" | "Fuori rosa" | "Non disponibile"
- Importanza: "chiave" (titolare con Fm≥6.0 o con ≥2 gol/assist)
  | "rotazione" (titolare occasionale, Fm 5.5–6.0)
  | "marginale" (riserva, Pv≤2)
- Rientro previsto (se noto, altrimenti "N/D")

OUTPUT: restituisci SOLO un oggetto JSON valido con questa struttura,
senza testo aggiuntivo prima o dopo:

{
  "aggiornato": "2026-10-23",
  "squadre": {
    "Inter": [
      { "nome": "Thuram K.", "ruolo": "C", "motivo": "Infortunio", "importanza": "chiave", "rientro": "N/D" }
    ],
    "Milan": [],
    "Juventus": [],
    ...
  }
}

Regole:
- Se una squadra non ha assenze, metti array vuoto [].
- Usa ESATTAMENTE i nomi squadra del file Excel (Roma, Milan, Inter...).
- Usa ESATTAMENTE i nomi giocatore del file Excel (es. "Martinez L.", "Thuram").
- Non inventare giocatori che non esistono nel file.
- Se non sei sicuro di un'assenza, NON includerla (meglio pochi dati veri che tanti falsi).
""".strip()


def log(msg):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}")


def verifica_excel():
    if not EXCEL_PATH.exists():
        log(f"❌ Excel non trovato: {EXCEL_PATH}")
        log("   Committa il file scaricato da Fantacalcio.it in data/")
        return False

    eta_giorni = (time.time() - EXCEL_PATH.stat().st_mtime) / 86400
    if eta_giorni > 10:
        log(f"⚠️ Attenzione: l'Excel ha {eta_giorni:.1f} giorni. Sicuro sia aggiornato?")
    else:
        log(f"✅ Excel trovato (aggiornato {eta_giorni:.1f} giorni fa)")
    return True


def carica_excel_gemini(client):
    log(f"📤 Upload Excel su Gemini: {EXCEL_PATH.name}")
    mime_type, _ = mimetypes.guess_type(str(EXCEL_PATH))
    if not mime_type:
        mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    with open(EXCEL_PATH, "rb") as f:
        uploaded = client.files.upload(
            file=f,
            config={"mime_type": mime_type},
        )

    for _ in range(30):
        meta = client.files.get(name=uploaded.name)
        if meta.state.name == "ACTIVE":
            log(f"✅ File pronto")
            return uploaded
        elif meta.state.name == "FAILED":
            raise RuntimeError("Upload file fallito")
        time.sleep(2)

    raise TimeoutError("Timeout upload file")


def chiama_gemini(client, uploaded_file):
    log("🤖 Chiamo Gemini...")

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Part.from_uri(
                file_uri=uploaded_file.uri,
                mime_type=uploaded_file.mime_type,
            ),
            types.Part(text=PROMPT_ASSENZE),
        ],
        config=types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    testo = response.text.strip()
    log(f"✅ Risposta ricevuta ({len(testo)} caratteri)")

    # Pulisci markdown
    if testo.startswith("```json"):
        testo = testo[7:]
    if testo.startswith("```"):
        testo = testo[3:]
    if testo.endswith("```"):
        testo = testo[:-3]
    testo = testo.strip()

    try:
        data = json.loads(testo)
    except json.JSONDecodeError as e:
        log(f"❌ JSON non valido: {e}")
        log("   Primi 500 caratteri della risposta:")
        log(testo[:500])
        return None

    return data


def valida_json(data):
    if not isinstance(data, dict):
        return False, "JSON non è un oggetto"
    if "squadre" not in data:
        return False, "Manca chiave 'squadre'"
    if not isinstance(data["squadre"], dict):
        return False, "'squadre' non è un oggetto"

    totale_assenze = sum(len(v) for v in data["squadre"].values())
    log(f"📊 Squadre: {len(data['squadre'])} • Assenze totali: {totale_assenze}")

    data_json = data.get("aggiornato")
    oggi = datetime.date.today().isoformat()
    if data_json != oggi:
        log(f"⚠️ Data nel JSON ({data_json}) diversa da oggi ({oggi}). La aggiorno.")
        data["aggiornato"] = oggi

    return True, f"OK ({totale_assenze} assenze)"


def main():
    log("=" * 60)
    log("AGGIONAMENTO ASSENZE - GesssAI-Pro")
    log("=" * 60)

    if not GEMINI_API_KEY:
        log("❌ GEMINI_API_KEY non impostata")
        log("   Locale: export GEMINI_API_KEY='...'")
        log("   GitHub Actions: Settings → Secrets → Actions")
        sys.exit(1)

    if not verifica_excel():
        sys.exit(1)

    client = genai.Client(api_key=GEMINI_API_KEY)

    try:
        uploaded = carica_excel_gemini(client)
        data = chiama_gemini(client, uploaded)

        if data is None:
            log("❌ Generazione JSON fallita")
            sys.exit(1)

        ok, msg = valida_json(data)
        if not ok:
            log(f"❌ Validazione fallita: {msg}")
            sys.exit(1)

        ASSENZE_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(ASSENZE_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        log(f"✅ Salvato: {ASSENZE_JSON_PATH}")

        try:
            client.files.delete(name=uploaded.name)
            log("🧹 File temporaneo Gemini eliminato")
        except Exception:
            pass

        log("=" * 60)
        log("✅ COMPLETATO")
        log("=" * 60)

    except Exception as e:
        log(f"❌ Errore: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()