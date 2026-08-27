import os
import re
import json
import requests
import pandas as pd
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import time
import shutil

# ============================================
# CONFIGURAZIONE
# ============================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Crea le cartelle necessarie
json_folder = os.path.join(BASE_DIR, "json")
data_folder = os.path.join(BASE_DIR, "data")
excel_folder = os.path.join(BASE_DIR, "excel")

os.makedirs(json_folder, exist_ok=True)
os.makedirs(data_folder, exist_ok=True)
os.makedirs(excel_folder, exist_ok=True)

print("\n" + "=" * 70)
print("⚽ DOWNLOAD CALENDARI DA FIXTUREDOWNLOAD.COM")
print("=" * 70)
print(f"📁 Repository: Gesss26/GesssAI-Pro---Auto")
print(f"📁 Cartella output: {BASE_DIR}")
print("=" * 70)

# ============================================
# LISTA CAMPIONATI - QUELLI CHE FUNZIONANO
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

# ============================================
# FUNZIONI DI UTILITÀ
# ============================================

def normalize_date(date_str):
    """Normalizza una data in formato YYYY-MM-DD"""
    if not date_str:
        return None
    
    # Se è già in formato YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}', date_str):
        return date_str[:10]
    
    # Se è in formato DD/MM/YYYY
    if re.match(r'^\d{2}/\d{2}/\d{4}', date_str):
        parts = date_str.split('/')
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    
    # Se è un numero seriale Excel
    if date_str.isdigit():
        serial = int(date_str)
        excel_epoch = datetime(1899, 12, 30)
        date = excel_epoch + timedelta(days=serial)
        return date.strftime('%Y-%m-%d')
    
    return date_str

def parse_date_from_string(date_str):
    """Converte una stringa data in oggetto datetime"""
    if not date_str:
        return datetime.min
    
    normalized = normalize_date(date_str)
    if not normalized:
        return datetime.min
    
    try:
        return datetime.strptime(normalized, '%Y-%m-%d')
    except:
        return datetime.min

# ============================================
# FUNZIONE PER SCARICARE I DATI
# ============================================

def fetch_league_data(league_name, url):
    """Scarica i dati di un campionato da fixturedownload.com"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"   ❌ HTTP {response.status_code}")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Cerca la tabella dei risultati
        table = None
        for t in soup.find_all('table'):
            if 'Round Number' in t.text and 'Date' in t.text:
                table = t
                break
        
        if not table:
            print(f"   ⚠️ Tabella non trovata")
            return None
        
        rows = table.find_all('tr')
        matches = []
        current_round = ''
        
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 5:
                continue
            
            try:
                round_raw = cells[0].get_text(strip=True) if len(cells) > 0 else ''
                date_raw = cells[1].get_text(strip=True) if len(cells) > 1 else ''
                home = cells[3].get_text(strip=True) if len(cells) > 3 else ''
                away = cells[4].get_text(strip=True) if len(cells) > 4 else ''
                result = cells[5].get_text(strip=True) if len(cells) > 5 else ''
                
                if round_raw == 'Round Number' or home == 'Home Team':
                    continue
                
                if round_raw and round_raw.isdigit():
                    current_round = round_raw
                wk = current_round
                
                if not home or not away:
                    continue
                
                # Normalizza la data
                date_normalized = normalize_date(date_raw)
                if not date_normalized:
                    continue
                
                # Estrai ora
                time_str = ''
                if date_raw:
                    parts = date_raw.split(' ')
                    if len(parts) >= 2:
                        date_normalized = normalize_date(parts[0])
                        time_str = parts[1] if len(parts) > 1 else ''
                
                # Analizza il risultato
                gol_casa = 0
                gol_ospite = 0
                stato = 'Futura'
                risultato = ''
                
                if result and result != '-' and result != '':
                    score_parts = re.findall(r'(\d+)\s*[-–:]\s*(\d+)', result)
                    if score_parts:
                        gol_casa = int(score_parts[0][0])
                        gol_ospite = int(score_parts[0][1])
                        risultato = f"{gol_casa}-{gol_ospite}"
                        stato = 'Giocata'
                
                matches.append({
                    'Campionato': league_name,
                    'Numero Giornata (Wk)': wk,
                    'Data': date_normalized,
                    'Ora': time_str,
                    'Squadra Casa': home,
                    'Squadra Ospite': away,
                    'Risultato': risultato,
                    'Gol Casa': gol_casa,
                    'Gol Ospite': gol_ospite,
                    'Stato': stato,
                })
                
            except Exception as e:
                continue
        
        if not matches:
            print(f"   ⚠️ Nessuna partita trovata")
            return None
        
        return matches
        
    except Exception as e:
        print(f"   ❌ Errore: {str(e)}")
        return None

# ============================================
# FUNZIONE PER SCARICARE TUTTI I CAMPIONATI
# ============================================

def scarica_tutti_i_campionati():
    """Scarica tutti i campionati"""
    all_matches = []
    successi = 0
    errori = 0
    
    print(f"\n📋 {len(LEAGUES)} campionati da scaricare")
    print("=" * 70)
    
    for idx, league in enumerate(LEAGUES, 1):
        print(f"\n⏳ [{idx}/{len(LEAGUES)}] Scaricando {league['name']}...")
        print(f"   URL: {league['url']}")
        
        matches = fetch_league_data(league['name'], league['url'])
        
        if matches:
            all_matches.extend(matches)
            successi += 1
            giocate = sum(1 for m in matches if m['Stato'] == 'Giocata')
            future = len(matches) - giocate
            print(f"   ✅ {len(matches)} partite ({giocate} giocate, {future} future)")
        else:
            errori += 1
            print(f"   ❌ Errore durante il download")
        
        time.sleep(1)
    
    print("\n" + "=" * 70)
    print(f"📊 Download completato: {successi} campionati, {errori} errori")
    print(f"   Totale partite: {len(all_matches)}")
    print("=" * 70)
    
    return all_matches

# ============================================
# FUNZIONE PER SALVARE I DATI
# ============================================

def salva_dati(matches):
    """Salva i dati in Excel e JSON"""
    if not matches:
        print("❌ Nessun dato da salvare!")
        return False
    
    # Ordina per data
    matches.sort(key=lambda m: parse_date_from_string(m.get('Data', '')))
    print(f"📅 {len(matches)} partite ordinate per data")
    
    # Crea DataFrame
    df = pd.DataFrame(matches)
    
    # Salva Excel
    excel_path = os.path.join(excel_folder, "GesssAI_Input.xlsx")
    try:
        df.to_excel(excel_path, index=False)
        file_size = os.path.getsize(excel_path)
        print(f"   ✅ GesssAI_Input.xlsx ({file_size:,} bytes) - {excel_path}")
    except Exception as e:
        print(f"   ❌ Errore salvataggio Excel: {e}")
        return False
    
    # Crea dati JSON
    campionati_set = set()
    matches_data = []
    
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
    
    # Salva JSON in json/
    json_path = os.path.join(json_folder, "GesssAI_Input.json")
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ GesssAI_Input.json ({os.path.getsize(json_path):,} bytes) - {json_path}")
    except Exception as e:
        print(f"   ❌ Errore salvataggio JSON: {e}")
        return False
    
    # Copia in data/matches.json
    data_json_path = os.path.join(data_folder, "matches.json")
    try:
        shutil.copy2(json_path, data_json_path)
        print(f"   ✅ matches.json copiato in data/ - {data_json_path}")
    except Exception as e:
        print(f"   ⚠️ Errore copia matches.json: {e}")
    
    # Copia anche nella root (per compatibilità)
    root_json_path = os.path.join(BASE_DIR, "matches.json")
    try:
        shutil.copy2(json_path, root_json_path)
        print(f"   ✅ matches.json copiato in root - {root_json_path}")
    except Exception as e:
        print(f"   ⚠️ Errore copia root: {e}")
    
    # Statistiche
    giocate = len(df[df['Stato'] == 'Giocata'])
    future = len(df) - giocate
    campionati = len(campionati_set)
    
    print("\n" + "=" * 70)
    print("📊 STATISTICHE FINALI")
    print("=" * 70)
    print(f"   • Partite totali: {len(df):,}")
    print(f"   • Giocate: {giocate:,}")
    print(f"   • Future: {future:,}")
    print(f"   • Campionati: {campionati}")
    print("=" * 70)
    
    return True

# ============================================
# MAIN
# ============================================

def main():
    try:
        # Scarica tutti i campionati
        all_matches = scarica_tutti_i_campionati()
        
        if all_matches:
            # Salva i dati
            success = salva_dati(all_matches)
            if success:
                print("\n✅ Download e salvataggio completati con successo!")
            else:
                print("\n❌ Errore durante il salvataggio dei dati!")
        else:
            print("\n❌ Nessun dato scaricato!")
    
    except KeyboardInterrupt:
        print("\n\n⏹️ Download interrotto dall'utente.")
    except Exception as e:
        print(f"\n❌ Errore: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 70)
    print("🏁 Script terminato")
    print("=" * 70)

if __name__ == "__main__":
    main()