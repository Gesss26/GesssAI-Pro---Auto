# arricchisci_con_voti.py
# Legge i dati estratti dall'HTML e li arricchisce con i voti dal file Excel.
# Genera: formazioni_con_voti.json e assenze.json

import json
import pandas as pd
import os
import sys
from datetime import datetime

FILE_DATI_ESTRATTI = "dati_estratti.json"
FILE_EXCEL = "Statistiche_Fantacalcio_Stagione_2026_27.xlsx"
FILE_OUTPUT_FORMAZIONI = "formazioni_con_voti.json"
FILE_OUTPUT_ASSENZE = "assenze.json"

def carica_voti_da_excel(excel_path):
    """Carica il foglio di calcolo e restituisce un dizionario {nome_excel: {Mv, Fm, Pv, Gf, Ass}}"""
    try:
        # NOTA: se il nome del tuo foglio Excel non è "Voti", cambialo qui sotto
        df = pd.read_excel(excel_path, sheet_name="Voti")
    except Exception as e:
        print(f"ERRORE lettura Excel: {e}")
        print("Assicurati che il file Excel esista e che contenga un foglio chiamato 'Voti'.")
        sys.exit(1)
    
    voti = {}
    for _, row in df.iterrows():
        # Gestiamo eventuali valori NaN nel nome
        nome_grezzo = row.get("nome_excel", "")
        if pd.isna(nome_grezzo):
            continue
            
        nome = str(nome_grezzo).strip()
        if not nome:
            continue
            
        voti[nome] = {
            "Mv": float(row.get("Mv", 0.0)) if pd.notna(row.get("Mv")) else 0.0,
            "Fm": float(row.get("Fm", 0.0)) if pd.notna(row.get("Fm")) else 0.0,
            "Pv": int(row.get("Pv", 0)) if pd.notna(row.get("Pv")) else 0,
            "Gf": int(row.get("Gf", 0)) if pd.notna(row.get("Gf")) else 0,
            "Ass": int(row.get("Ass", 0)) if pd.notna(row.get("Ass")) else 0,
        }
    print(f"Caricati {len(voti)} voti dal file Excel.")
    return voti

def stima_importanza(motivo):
    """Stima l'importanza dell'assenza in base al motivo."""
    m = (motivo or "").lower()
    if any(k in m for k in ["crociato", "rottura", "frattura", "lesione di alto grado", "stagione", "da aprile", "da marzo", "da febbraio"]):
        return "chiave"
    if any(k in m for k in ["lesione", "distrazione", "sindrome", "lussazione", "sovraccarico", "affaticamento", "risentimento", "problema"]):
        return "rotazione"
    return "marginale"

def arricchisci(dati_estratti_path, excel_path):
    if not os.path.exists(dati_estratti_path):
        print(f"ERRORE: File non trovato: {dati_estratti_path}. Esegui prima parse_formazioni.py.")
        sys.exit(1)
        
    with open(dati_estratti_path, "r", encoding="utf-8") as f:
        dati = json.load(f).get("formazioni", {})
    
    voti = carica_voti_da_excel(excel_path)
    
    formazioni_finali = {}
    assenze_finali = {
        "aggiornato": datetime.now().strftime("%Y-%m-%d"), 
        "squadre": {}
    }
    
    for squadra, info in dati.items():
        titolari_arricchiti = []
        panchina_arricchita = []
        
        # Arricchisci titolari
        for nome_giocatore in info.get("titolari", []):
            # Gestiamo se è una stringa o un dizionario
            nome = nome_giocatore if isinstance(nome_giocatore, str) else nome_giocatore.get("nome", "")
            ruolo = nome_giocatore.get("ruolo", "") if isinstance(nome_giocatore, dict) else ""
            
            v = voti.get(nome, {"Mv": 0.0, "Fm": 0.0, "Pv": 0, "Gf": 0, "Ass": 0})
            titolari_arricchiti.append({
                "nome": nome, "ruolo": ruolo,
                "Mv": v["Mv"], "Fm": v["Fm"], "Pv": v["Pv"], "Gf": v["Gf"], "Ass": v["Ass"],
                "nome_excel": nome if nome in voti else None
            })
        
        # Arricchisci panchina
        for nome_giocatore in info.get("panchina", []):
            nome = nome_giocatore if isinstance(nome_giocatore, str) else nome_giocatore.get("nome", "")
            ruolo = nome_giocatore.get("ruolo", "") if isinstance(nome_giocatore, dict) else ""
            
            v = voti.get(nome, {"Mv": 0.0, "Fm": 0.0, "Pv": 0, "Gf": 0, "Ass": 0})
            panchina_arricchita.append({
                "nome": nome, "ruolo": ruolo,
                "Mv": v["Mv"], "Fm": v["Fm"], "Pv": v["Pv"], "Gf": v["Gf"], "Ass": v["Ass"],
                "nome_excel": nome if nome in voti else None
            })
        
        formazioni_finali[squadra] = {
            "modulo": info.get("modulo"),
            "titolari": titolari_arricchiti,
            "panchina": panchina_arricchita,
            "ballottaggi": info.get("ballottaggi", []),
        }
        
        # Prepara il file delle assenze
        indisponibili_finali = []
        for ind in info.get("indisponibili", []):
            indisponibili_finali.append({
                "nome": ind.get("nome", ""),
                "ruolo": ind.get("ruolo", ""),
                "motivo": ind.get("motivo", ""),
                "importanza": stima_importanza(ind.get("motivo", "")),
                "tipo": ind.get("stato", "infortunato"),
                "rientro": "N/D",
            })
        assenze_finali["squadre"][squadra] = indisponibili_finali
    
    # Salva formazioni_con_voti.json
    with open(FILE_OUTPUT_FORMAZIONI, "w", encoding="utf-8") as f:
        json.dump({"giornata": None, "aggiornato": datetime.now().strftime("%Y-%m-%d"), "formazioni": formazioni_finali}, f, ensure_ascii=False, indent=2)
    print(f"OK - Generato {FILE_OUTPUT_FORMAZIONI}")
    
    # Salva assenze.json
    with open(FILE_OUTPUT_ASSENZE, "w", encoding="utf-8") as f:
        json.dump(assenze_finali, f, ensure_ascii=False, indent=2)
    print(f"OK - Generato {FILE_OUTPUT_ASSENZE}")

if __name__ == "__main__":
    arricchisci(FILE_DATI_ESTRATTI, FILE_EXCEL)