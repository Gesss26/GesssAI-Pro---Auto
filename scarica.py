import os
import re
import requests
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime
import json
import time
import shutil

# ============================================
# CONFIGURAZIONE
# ============================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
output_folder = os.path.join(BASE_DIR, "excel")
data_folder = os.path.join(BASE_DIR, "data")

os.makedirs(output_folder, exist_ok=True)
os.makedirs(data_folder, exist_ok=True)

print("\n" + "=" * 70)
print("⚽ DOWNLOAD CALENDARI DA FIXTUREDOWNLOAD.COM")
print("=" * 70)
print("\n✅ Campionati disponibili e FUNZIONANTI:\n")

# ============================================
# LISTA CAMPIONATI (SOLO QUELLI CHE FUNZIONANO)
# ============================================

LEAGUES = [
    {'name': 'Premier League', 'url': 'https://fixturedownload.com/results/epl-2026'},
    {'name': 'La Liga', 'url': 'https://fixturedownload.com/results/la-liga-2026'},
    {'name': 'Bundesliga', 'url': 'https://fixturedownload.com/results/bundesliga-2026'},
    {'name': 'Ligue 1', 'url': 'https://fixturedownload.com/results/ligue-1-2026'},
    {'name': 'Serie A', 'url': 'https://fixturedownload.com/results/serie-a-2026'},
    {'name': 'Eredivisie', 'url': 'https://fixturedownload.com/results/eredivisie-2026'},
    {'name': 'Primeira Liga', 'url': 'https://fixturedownload.com/results/primeira-liga-2026'},
    {'name': 'Scottish Premiership', 'url': 'https://fixturedownload.com/results/scottish-premiership-2026'},
    {'name': 'Super Lig', 'url': 'https://fixturedownload.com/results/super-lig-2026'},
    {'name': 'Championship', 'url': 'https://fixturedownload.com/results/championship-2026'},
    {'name': 'EFL League One', 'url': 'https://fixturedownload.com/results/efl-league-one-2026'},
    {'name': 'EFL League Two', 'url': 'https://fixturedownload.com/results/efl-league-two-2026'},
    {'name': 'MLS', 'url': 'https://fixturedownload.com/results/mls-2026'},
    {'name': 'NWSL', 'url': 'https://fixturedownload.com/results/nwsl-2026'},
]

for league in LEAGUES:
    print(f"   ✅ {league['name']}")

print(f"\n📊 Totale: {len(LEAGUES)} campionati")

# ============================================
# FUNZIONE PER SCARICARE UNA PAGINA
# ============================================

def scarica_pagina(url):
    """Scarica il contenuto di una pagina web"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            return response.text
        else:
            print(f"   ❌ Errore HTTP: {response.status_code}")
            return None
    except Exception as e:
        print(f"   ❌ Errore: {e}")
        return None

# ============================================
# FUNZIONE PER ESTRARRE I DATI
# ============================================

def estrai_dati_da_html(html_content, league_name):
    """Estrae i dati dalla tabella HTML"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Cerca la tabella
    table = None
    for t in soup.find_all('table'):
        if 'Round Number' in t.text and 'Date' in t.text:
            table = t
            break
    
    if not table:
        print(f"   ⚠️ Tabella non trovata per {league_name}")
        return None
    
    rows = table.find_all('tr')
    matches_data = []
    current_round = ''
    
    for row in rows:
        cells = row.find_all(['th', 'td'])
        if len(cells) < 5:
            continue
        
        try:
            round_raw = cells[0].get_text(strip=True)
            date_raw = cells[1].get_text(strip=True)
            home = cells[3].get_text(strip=True)
            away = cells[4].get_text(strip=True)
            result = cells[5].get_text(strip=True) if len(cells) > 5 else ''
            
            if round_raw == 'Round Number' or home == 'Home Team':
                continue
            
            if round_raw and round_raw.isdigit():
                current_round = round_raw
            wk = current_round
            
            date_str = ''
            time_str = ''
            if date_raw:
                parts = date_raw.split(' ')
                if len(parts) >= 2:
                    date_str = parts[0]
                    time_str = parts[1]
                else:
                    date_str = date_raw
            
            gol_casa = 0
            gol_ospite = 0
            stato = 'Futura'
            risultato = ''
            
            if result and result != '-' and result != '':
                match = re.search(r'(\d+)\s*[-–:\.]\s*(\d+)', result)
                if match:
                    gol_casa = int(match.group(1))
                    gol_ospite = int(match.group(2))
                    risultato = f"{gol_casa}-{gol_ospite}"
                    stato = 'Giocata'
            
            matches_data.append({
                'Campionato': league_name,
                'Numero Giornata (Wk)': wk,
                'Data': date_str,
                'Ora': time_str,
                'Squadra Casa': home,
                'Squadra Ospite': away,
                'Risultato': risultato,
                'Gol Casa': gol_casa,
                'Gol Ospite': gol_ospite,
                'Stato': stato
            })
            
        except Exception as e:
            continue
    
    if not matches_data:
        print(f"   ⚠️ Nessun dato estratto per {league_name}")
        return None
    
    df = pd.DataFrame(matches_data)
    print(f"   ✅ Estratte {len(df)} partite per {league_name}")
    return df

# ============================================
# FUNZIONE PER SCARICARE TUTTI I CAMPIONATI
# ============================================

def scarica_tutti_i_campionati():
    """Scarica tutti i campionati"""
    tutte_le_partite = pd.DataFrame()
    successi = 0
    errori = 0
    
    for league in LEAGUES:
        print(f"\n📥 Scaricando {league['name']}...")
        print(f"   URL: {league['url']}")
        
        html = scarica_pagina(league['url'])
        
        if html:
            df = estrai_dati_da_html(html, league['name'])
            if df is not None and not df.empty:
                tutte_le_partite = pd.concat([tutte_le_partite, df], ignore_index=True)
                successi += 1
            else:
                errori += 1
        else:
            errori += 1
        
        time.sleep(2)
    
    print("\n" + "=" * 70)
    print("📊 RIEPILOGO DOWNLOAD")
    print("=" * 70)
    print(f"   ✅ Campionati scaricati: {successi}")
    print(f"   ❌ Errori: {errori}")
    print(f"   📊 Totale partite: {len(tutte_le_partite)}")
    
    return tutte_le_partite

# ============================================
# FUNZIONE PER SALVARE I DATI
# ============================================

def salva_dati(df):
    """Salva i dati in Excel e JSON"""
    if df is None or df.empty:
        print("\n❌ Nessun dato da salvare!")
        return None, None
    
    excel_path = os.path.join(output_folder, "GesssAI_Input.xlsx")
    df.to_excel(excel_path, index=False)
    print(f"\n✅ Excel salvato: {excel_path} ({len(df)} righe)")
    
    matches_data = []
    campionati_set = set()
    
    for _, row in df.iterrows():
        campionato = row.get('Campionato', 'Sconosciuto')
        campionati_set.add(campionato)
        
        match_id = f"{campionato}_{row.get('Data', '')}_{row.get('Squadra Casa', '')}_{row.get('Squadra Ospite', '')}"
        match_id = re.sub(r'[^a-zA-Z0-9_]', '_', match_id)
        match_id = re.sub(r'_+', '_', match_id)
        
        stato = row.get('Stato', 'Futura')
        if stato == 'Giocata':
            risultato = f"{row.get('Gol Casa', 0)}-{row.get('Gol Ospite', 0)}"
        else:
            risultato = ""
        
        match = {
            "id": match_id,
            "campionato": campionato,
            "round": str(row.get('Numero Giornata (Wk)', '')),
            "data": row.get('Data', ''),
            "ora": row.get('Ora', ''),
            "casa": row.get('Squadra Casa', ''),
            "ospiti": row.get('Squadra Ospite', ''),
            "stato": stato,
            "golCasa": int(row.get('Gol Casa', 0)),
            "golOspite": int(row.get('Gol Ospite', 0)),
            "risultato": risultato,
            "citta": "N/D"
        }
        matches_data.append(match)
    
    data = {
        "championships": [{"name": c, "importedAt": datetime.now().isoformat()} for c in sorted(campionati_set)],
        "matches": matches_data,
        "apiKeys": {},
        "theme": "Scuro Blu Notte",
        "customTheme": None,
        "schedineHistory": [],
        "selectedFamiglie": ["dc_under", "mg_casa_ospite", "over"],
        "exportedAt": datetime.now().isoformat()
    }
    
    json_path_excel = os.path.join(output_folder, "GesssAI_Input.json")
    with open(json_path_excel, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ GesssAI_Input.json salvato in: {json_path_excel}")
    
    json_path_data = os.path.join(data_folder, "matches.json")
    shutil.copy2(json_path_excel, json_path_data)
    print(f"✅ matches.json copiato in: {json_path_data}")
    
    giocate = len(df[df['Stato'] == 'Giocata'])
    future = len(df) - giocate
    
    print(f"\n📊 Statistiche finali:")
    print(f"   🟢 Giocate: {giocate}")
    print(f"   🔵 Future: {future}")
    print(f"   🏆 Campionati: {len(campionati_set)}")
    
    return excel_path, json_path_excel

# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    df = scarica_tutti_i_campionati()
    
    if df is not None and not df.empty:
        salva_dati(df)
        
        print("\n📋 Anteprima prime 10 partite:")
        preview_cols = ['Campionato', 'Numero Giornata (Wk)', 'Data', 'Squadra Casa', 'Squadra Ospite', 'Risultato', 'Stato']
        available_cols = [c for c in preview_cols if c in df.columns]
        print(df[available_cols].head(10).to_string(index=False))
    else:
        print("\n❌ Nessun dato scaricato!")
    
    print("\n" + "=" * 70)
    input("🔴 Premere INVIO per uscire...")