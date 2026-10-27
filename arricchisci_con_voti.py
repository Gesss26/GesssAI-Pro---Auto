# arricchisci_con_voti.py
import json
import pandas as pd
import os
import sys
from datetime import datetime

FILE_DATI_ESTRATTI = "dati_estratti.json"
FILE_EXCEL = "Statistiche_Fantacalcio_Stagione_2026_27.xlsx"
FILE_OUTPUT_FORMAZIONI = "formazioni_con_voti.json"
FILE_OUTPUT_ASSENZE = "assenze.json"


def normalizza_nome(nome):
    """Normalizza un nome per il confronto: rimuove spazi extra e converte in minuscolo."""
    if not nome:
        return ""
    return str(nome).strip().lower()


def carica_voti_da_excel(excel_path):
    """Carica il file Excel e restituisce un dizionario {nome_giocatore: {Mv, Fm, Pv, Gf, Ass}}"""
    if not os.path.exists(excel_path):
        print(f"ERRORE: File Excel non trovato in {excel_path}")
        sys.exit(1)

    try:
        xls = pd.ExcelFile(excel_path)
        sheet_names = xls.sheet_names
        target_sheet = "Voti" if "Voti" in sheet_names else sheet_names[0]
        print(f"Lettura del foglio Excel: '{target_sheet}'")
        df = pd.read_excel(excel_path, sheet_name=target_sheet)
        df.columns = [str(c).strip().lower() for c in df.columns]

        col_nome = None
        for c in ['nome_excel', 'nome', 'giocatore', 'calciatore']:
            if c in df.columns:
                col_nome = c
                break
        if not col_nome:
            col_nome = df.columns[0]

        print(f"Colonna nomi identificata: '{col_nome}'")

    except Exception as e:
        print(f"ERRORE lettura Excel: {e}")
        sys.exit(1)

    voti = {}
    for _, row in df.iterrows():
        nome_grezzo = row.get(col_nome, "")
        if pd.isna(nome_grezzo):
            continue
        nome = str(nome_grezzo).strip()
        if not nome or nome.lower() == 'nan':
            continue

        def get_val(col, default, is_int=False):
            val = row.get(col, default)
            if pd.isna(val):
                return default
            return int(val) if is_int else float(val)

        voti[nome] = {
            "Mv": get_val('mv', 0.0),
            "Fm": get_val('fm', 0.0),
            "Pv": get_val('pv', 0, is_int=True),
            "Gf": get_val('gf', 0, is_int=True),
            "Ass": get_val('ass', 0, is_int=True),
        }

    print(f"Caricati {len(voti)} voti dal file Excel.")
    return voti


def stima_importanza(motivo):
    m = (motivo or "").lower()
    if any(k in m for k in ["crociato", "rottura", "frattura", "lesione di alto grado",
                            "stagione", "da aprile", "da marzo", "da febbraio"]):
        return "chiave"
    if any(k in m for k in ["lesione", "distrazione", "sindrome", "lussazione",
                            "sovraccarico", "affaticamento", "risentimento", "problema"]):
        return "rotazione"
    return "marginale"


def arricchisci(dati_estratti_path, excel_path):
    if not os.path.exists(dati_estratti_path):
        print(f"ERRORE: File non trovato: {dati_estratti_path}.")
        sys.exit(1)

    with open(dati_estratti_path, "r", encoding="utf-8") as f:
        dati = json.load(f).get("formazioni", {})

    voti = carica_voti_da_excel(excel_path)

    # Indice normalizzato dei voti per lookup robusto (case-insensitive, trim)
    voti_normalizzati = {normalizza_nome(k): v for k, v in voti.items()}

    formazioni_finali = {}
    assenze_finali = {
        "aggiornato": datetime.now().strftime("%Y-%m-%d"),
        "squadre": {}
    }

    def cerca_voto(nome):
        # 1. Match esatto
        if nome in voti:
            return voti[nome]
        # 2. Match normalizzato (case-insensitive, trim)
        n = normalizza_nome(nome)
        if n in voti_normalizzati:
            return voti_normalizzati[n]
        # 3. Fallback: match case-insensitive lineare
        for k, v in voti.items():
            if k.lower() == nome.lower():
                return v
        return {"Mv": 0.0, "Fm": 0.0, "Pv": 0, "Gf": 0, "Ass": 0}

    for squadra, info in dati.items():
        titolari_arricchiti = []
        panchina_arricchita = []

        # Set per tracciare chi è schierato (titolari + panchina) con nomi normalizzati
        giocatori_schierati = set()

        for nome_giocatore in info.get("titolari", []):
            nome = nome_giocatore if isinstance(nome_giocatore, str) else nome_giocatore.get("nome", "")
            ruolo = nome_giocatore.get("ruolo", "") if isinstance(nome_giocatore, dict) else ""

            # Salva la versione normalizzata nel set per i confronti successivi
            giocatori_schierati.add(normalizza_nome(nome))

            v = cerca_voto(nome)
            titolari_arricchiti.append({
                "nome": nome, "ruolo": ruolo,
                "Mv": v["Mv"], "Fm": v["Fm"], "Pv": v["Pv"], "Gf": v["Gf"], "Ass": v["Ass"],
                "nome_excel": nome if (v["Mv"] > 0 or v["Fm"] > 0) else None
            })

        for nome_giocatore in info.get("panchina", []):
            nome = nome_giocatore if isinstance(nome_giocatore, str) else nome_giocatore.get("nome", "")
            ruolo = nome_giocatore.get("ruolo", "") if isinstance(nome_giocatore, dict) else ""

            giocatori_schierati.add(normalizza_nome(nome))

            v = cerca_voto(nome)
            panchina_arricchita.append({
                "nome": nome, "ruolo": ruolo,
                "Mv": v["Mv"], "Fm": v["Fm"], "Pv": v["Pv"], "Gf": v["Gf"], "Ass": v["Ass"],
                "nome_excel": nome if (v["Mv"] > 0 or v["Fm"] > 0) else None
            })

        formazioni_finali[squadra] = {
            "modulo": info.get("modulo"),
            "titolari": titolari_arricchiti,
            "panchina": panchina_arricchita,
            "ballottaggi": info.get("ballottaggi", []),
        }

        indisponibili_finali = []
        for ind in info.get("indisponibili", []):
            nome_ind = ind.get("nome", "").strip()
            nome_ind_norm = normalizza_nome(nome_ind)

            # Se il giocatore è schierato (titolare o panchina) NON è infortunato
            if nome_ind_norm in giocatori_schierati:
                continue

            indisponibili_finali.append({
                "nome": nome_ind,
                "ruolo": ind.get("ruolo", ""),
                "motivo": ind.get("motivo", ""),
                "importanza": stima_importanza(ind.get("motivo", "")),
                "tipo": ind.get("stato", "infortunato"),
                "rientro": "N/D",
            })

        assenze_finali["squadre"][squadra] = indisponibili_finali

    with open(FILE_OUTPUT_FORMAZIONI, "w", encoding="utf-8") as f:
        json.dump(
            {
                "giornata": None,
                "aggiornato": datetime.now().strftime("%Y-%m-%d"),
                "formazioni": formazioni_finali,
            },
            f, ensure_ascii=False, indent=2
        )
    print(f"OK - Generato {FILE_OUTPUT_FORMAZIONI}")

    with open(FILE_OUTPUT_ASSENZE, "w", encoding="utf-8") as f:
        json.dump(assenze_finali, f, ensure_ascii=False, indent=2)
    print(f"OK - Generato {FILE_OUTPUT_ASSENZE}")


if __name__ == "__main__":
    arricchisci(FILE_DATI_ESTRATTI, FILE_EXCEL)