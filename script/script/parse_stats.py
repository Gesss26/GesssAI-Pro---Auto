#!/usr/bin/env python3
"""
parse_stats.py
Legge l'Excel "Statistiche_Fantacalcio_Stagione_2026_27.xlsx" (foglio "Tutti")
e produce data/stats_giocatori.json con tutti i giocatori.

Output: data/stats_giocatori.json
"""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
XLSX_FILE = ROOT / "Statistiche_Fantacalcio_Stagione_2026_27.xlsx"
OUT_FILE = ROOT / "data" / "stats_giocatori.json"

# Colonne attese nel foglio (case-insensitive, con/senza spazi)
COLONNE_ATTESE = {
    "id": ["id"],
    "R": ["r"],
    "Rm": ["rm"],
    "nome": ["nome"],
    "squadra": ["squadra"],
    "Pv": ["pv", "presenze"],
    "Mv": ["mv", "media voto", "voto"],
    "Fm": ["fm", "fantamedia", "fanta media"],
    "Gf": ["gf", "gol fatti", "gol"],
    "Gs": ["gs", "gol subiti"],
    "Rp": ["rp", "rigori parati"],
    "Rc": ["rc", "rigori causati"],
    "Ass": ["ass", "assist"],
    "Amm": ["amm", "ammonizioni"],
    "Esp": ["esp", "espulsioni"],
    "Au": ["au", "autogol"],
}


def trova_colonna(df, nomi_possibili):
    """Restituisce il nome reale della colonna nel DataFrame, ignorando case/spazi."""
    for col in df.columns:
        norm = str(col).strip().lower().replace("_", " ")
        for nome in nomi_possibili:
            if norm == nome.lower().strip():
                return col
    return None


def normalizza_ruolo(r):
    """R = P/D/C/A (o con suffissi tipo 'Por', 'Dc', 'E;W')."""
    if not r:
        return "?"
    r = str(r).strip().upper()
    # La prima lettera è quella principale per il fantacalcio classico
    if r.startswith("P"):
        return "P"
    if r.startswith("D"):
        return "D"
    if r.startswith("C"):
        return "C"
    if r.startswith("A"):
        return "A"
    # Ruoli Mantra tipo W, T, E, M → trattati come centrocampisti
    if any(r.startswith(x) for x in ("W", "T", "E", "M")):
        return "C"
    return "?"


def num(val):
    """Converte in float gestendo None, NaN, stringhe con virgola."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        if pd.isna(val):
            return 0.0
        return float(val)
    s = str(val).strip().replace(",", ".")
    if not s or s.lower() == "nan":
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def main():
    if not XLSX_FILE.exists():
        print(f"❌ File non trovato: {XLSX_FILE}", file=sys.stderr)
        sys.exit(1)

    # Legge il primo foglio ("Tutti")
    xls = pd.ExcelFile(XLSX_FILE)
    print(f"Fogli trovati: {xls.sheet_names}")
    df = pd.read_excel(xls, sheet_name=0)

    # Riga 0 contiene titolo, riga 1 contiene header vero
    # Il file ha:
    #   Riga 0: "Statistiche Fantacalcio Stagione 2026 27"
    #   Riga 1: "Id | R | Rm | Nome | Squadra | Pv | Mv | Fm | ..."
    # Se la prima riga non ha "Nome" tra le colonne, rileggo con header=1
    if "Nome" not in df.columns and "nome" not in [str(c).lower() for c in df.columns]:
        print("Prima riga non è header, rileggo con header=1...")
        df = pd.read_excel(xls, sheet_name=0, header=1)

    print(f"Colonne: {list(df.columns)}")
    print(f"Righe: {len(df)}")

    # Trova colonne reali
    cols = {}
    for chiave, nomi in COLONNE_ATTESE.items():
        cols[chiave] = trova_colonna(df, nomi)
        if cols[chiave] is None and chiave in ("nome", "squadra", "R"):
            print(f"❌ Colonna mancante: {chiave} (cercavo {nomi})", file=sys.stderr)
            sys.exit(1)

    giocatori = []
    for _, row in df.iterrows():
        nome = str(row[cols["nome"]]).strip() if pd.notna(row[cols["nome"]]) else ""
        if not nome or nome.lower() == "nan":
            continue

        squadra = str(row[cols["squadra"]]).strip() if cols["squadra"] and pd.notna(row[cols["squadra"]]) else ""

        r_raw = str(row[cols["R"]]).strip() if cols["R"] and pd.notna(row[cols["R"]]) else ""
        rm_raw = str(row[cols["Rm"]]).strip() if cols["Rm"] and pd.notna(row[cols["Rm"]]) else ""

        giocatori.append({
            "id": int(num(row[cols["id"]])) if cols["id"] else 0,
            "nome": nome,
            "squadra": squadra,
            "ruolo": normalizza_ruolo(r_raw),
            "R": r_raw,
            "Rm": rm_raw,
            "Pv": int(num(row[cols["Pv"]])),
            "Mv": round(num(row[cols["Mv"]]), 2),
            "Fm": round(num(row[cols["Fm"]]), 2),
            "Gf": int(num(row[cols["Gf"]])),
            "Gs": int(num(row[cols["Gs"]])),
            "Rp": int(num(row[cols["Rp"]])),
            "Rc": int(num(row[cols["Rc"]])),
            "Ass": int(num(row[cols["Ass"]])),
            "Amm": int(num(row[cols["Amm"]])),
            "Esp": int(num(row[cols["Esp"]])),
            "Au": int(num(row[cols["Au"]])),
        })

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(giocatori, f, ensure_ascii=False, indent=2)

    print(f"✅ Scritto {OUT_FILE}")
    print(f"   Giocatori: {len(giocatori)}")
    con_voto = sum(1 for g in giocatori if g["Mv"] > 0)
    print(f"   Con Mv > 0: {con_voto}")


if __name__ == "__main__":
    main()