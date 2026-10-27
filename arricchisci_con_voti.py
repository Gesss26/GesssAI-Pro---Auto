# arricchisci_con_voti.py
import json
import pandas as pd
import os
import sys
import re
import unicodedata
from datetime import datetime

FILE_DATI_ESTRATTI = "dati_estratti.json"
FILE_EXCEL = "Statistiche_Fantacalcio_Stagione_2026_27.xlsx"
FILE_OUTPUT_FORMAZIONI = "formazioni_con_voti.json"
FILE_OUTPUT_ASSENZE = "assenze.json"


def normalizza_nome(nome):
    """Normalizza un nome: rimuove accenti, punteggiatura e spazi extra, converte in minuscolo."""
    if not nome:
        return ""
    s = str(nome).strip().lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    s = re.sub(r"[.'\-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def chiave_giocatore(nome):
    """Estrae il cognome principale (primo token normalizzato) per matching robusto."""
    n = normalizza_nome(nome)
    if not n:
        return ""
    return n.split(" ")[0]


def carica_voti_da_excel(excel_path):
    """Carica il file Excel e restituisce un dizionario {nome_giocatore: {Mv, Fm, Pv, Gf, Ass}}"""
    if not os.path.exists(excel_path):
        print(f"ERRORE: File Excel non trovato in {excel_path}")
        sys.exit(1)

    try:
        xls = pd.ExcelFile(excel_path)
        sheet_names = xls.sheet_names
        print(f"Fogli trovati: {sheet_names}")

        # Priorità: foglio 'Tutti' -> 'Voti' -> primo foglio
        target_sheet = None
        for candidate in ["Tutti", "Voti"]:
            if candidate in sheet_names:
                target_sheet = candidate
                break
        if target_sheet is None:
            target_sheet = sheet_names[0]

        print(f"Lettura del foglio Excel: '{target_sheet}'")

        # Prova prima senza skiprows
        df = pd.read_excel(excel_path, sheet_name=target_sheet)
        df.columns = [str(c).strip() for c in df.columns]

        # Se la colonna 'Nome' o 'Id' non è presente, c'è una riga di titolo: salta la prima riga
        colonne_lower = [str(c).strip().lower() for c in df.columns]
        if 'nome' not in colonne_lower and 'id' not in colonne_lower:
            print("Rilevata riga di titolo, salto la prima riga...")
            df = pd.read_excel(excel_path, sheet_name=target_sheet, skiprows=1)
            df.columns = [str(c).strip() for c in df.columns]

        print(f"Colonne trovate: {df.columns.tolist()}")

        # Rinomina tutte le colonne in minuscolo per uniformità
        df.columns = [str(c).strip().lower() for c in df.columns]

        # Trova la colonna nome
        col_nome = None
        for c in ['nome_excel', 'nome', 'giocatore', 'calciatore']:
            if c in df.columns:
                col_nome = c
                break

        if not col_nome:
            print("ERRORE: Colonna 'Nome' non trovata nell'Excel.")
            print(f"Colonne disponibili: {df.columns.tolist()}")
            sys.exit(1)

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
        # Filtra eventuali righe di titolo residue
        if nome.lower().startswith('statistiche'):
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

    # Indici per lookup robusto
    voti_normalizzati = {normalizza_nome(k): v for k, v in voti.items()}
    voti_per_cognome = {}
    for k, v in voti.items():
        ck = chiave_giocatore(k)
        if ck and ck not in voti_per_cognome:
            voti_per_cognome[ck] = v

    formazioni_finali = {}
    assenze_finali = {
        "aggiornato": datetime.now().strftime("%Y-%m-%d"),
        "squadre": {}
    }

    def cerca_voto(nome):
        # 1. Match esatto
        if nome in voti:
            return voti[nome]
        # 2. Match normalizzato
        n = normalizza_nome(nome)
        if n in voti_normalizzati:
            return voti_normalizzati[n]
        # 3. Match per cognome principale
        ck = chiave_giocatore(nome)
        if ck in voti_per_cognome:
            return voti_per_cognome[ck]
        return {"Mv": 0.0, "Fm": 0.0, "Pv": 0, "Gf": 0, "Ass": 0}

    for squadra, info in dati.items():
        titolari_arricchiti = []
        panchina_arricchita = []

        nomi_normalizzati_schierati = set()
        cognomi_schierati = set()

        def registra_schierato(nome):
            nomi_normalizzati_schierati.add(normalizza_nome(nome))
            ck = chiave_giocatore(nome)
            if ck:
                cognomi_schierati.add(ck)

        for nome_giocatore in info.get("titolari", []):
            nome = nome_giocatore if isinstance(nome_giocatore, str) else nome_giocatore.get("nome", "")
            ruolo = nome_giocatore.get("ruolo", "") if isinstance(nome_giocatore, dict) else ""
            registra_schierato(nome)

            v = cerca_voto(nome)
            titolari_arricchiti.append({
                "nome": nome, "ruolo": ruolo,
                "Mv": v["Mv"], "Fm": v["Fm"], "Pv": v["Pv"], "Gf": v["Gf"], "Ass": v["Ass"],
                "nome_excel": nome if (v["Mv"] > 0 or v["Fm"] > 0) else None
            })

        for nome_giocatore in info.get("panchina", []):
            nome = nome_giocatore if isinstance(nome_giocatore, str) else nome_giocatore.get("nome", "")
            ruolo = nome_giocatore.get("ruolo", "") if isinstance(nome_giocatore, dict) else ""
            registra_schierato(nome)

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
            ck_ind = chiave_giocatore(nome_ind)

            # Doppio controllo: nome completo normalizzato E cognome principale
            if nome_ind_norm in nomi_normalizzati_schierati:
                print(f"[FILTRO] '{nome_ind}' ({squadra}) rimosso dagli indisponibili: match esatto normalizzato")
                continue
            if ck_ind and ck_ind in cognomi_schierati and len(ck_ind) >= 4:
                print(f"[FILTRO] '{nome_ind}' ({squadra}) rimosso dagli indisponibili: match cognome '{ck_ind}'")
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