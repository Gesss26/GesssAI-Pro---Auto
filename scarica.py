import os
import re
import time
import json
import shutil
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ============================================
# CONFIGURAZIONE (ADATTATA PER GITHUB ACTIONS)
# ============================================

# Usa cartelle relative al repository
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
download_folder = os.path.join(BASE_DIR, "siti_da_matchesnow")
output_folder = os.path.join(BASE_DIR, "excel")
data_folder = os.path.join(BASE_DIR, "data")

os.makedirs(download_folder, exist_ok=True)
os.makedirs(output_folder, exist_ok=True)
os.makedirs(data_folder, exist_ok=True)

# ============================================
# LISTA CAMPIONATI
# ============================================

LEAGUES = [
    {'name': 'Serie A', 'file': 'serie_a.html', 'url': 'https://matchesnow.co.uk/leagues/serie-a/2026'},
    {'name': 'Serie B', 'file': 'serie_b.html', 'url': 'https://matchesnow.co.uk/leagues/serie-b/2026'},
    {'name': 'Allsvenskan', 'file': 'allsvenskan.html', 'url': 'https://matchesnow.co.uk/leagues/allsvenskan/2026'},
    {'name': 'Eliteserien', 'file': 'eliteserien.html', 'url': 'https://matchesnow.co.uk/leagues/eliteserien/2026'},
    {'name': 'Superliga', 'file': 'superliga.html', 'url': 'https://matchesnow.co.uk/leagues/superliga/2026'},
    {'name': '1. Division', 'file': '1-division.html', 'url': 'https://matchesnow.co.uk/leagues/1-division/2026'},
    {'name': 'Jupiler Pro League', 'file': 'jupiler-pro-league.html', 'url': 'https://matchesnow.co.uk/leagues/jupiler-pro-league/2026'},
    {'name': 'Veikkausliiga', 'file': 'veikkausliiga.html', 'url': 'https://matchesnow.co.uk/leagues/veikkausliiga/2026'},
    {'name': 'J1 League', 'file': 'j1-league.html', 'url': 'https://matchesnow.co.uk/leagues/j1-league/2026'},
    {'name': 'Swiss Super League', 'file': 'swiss-super-league.html', 'url': 'https://matchesnow.co.uk/leagues/swiss-super-league/2026'},
    {'name': 'K League 1', 'file': 'k-league-1.html', 'url': 'https://matchesnow.co.uk/leagues/k-league-1/2026'},
    {'name': 'La Liga', 'file': 'la-liga.html', 'url': 'https://matchesnow.co.uk/leagues/la-liga/2026'},
    {'name': 'Segunda Division', 'file': 'segunda-division.html', 'url': 'https://matchesnow.co.uk/leagues/segunda-division/2026'},
    {'name': 'Bundesliga', 'file': 'bundesliga.html', 'url': 'https://matchesnow.co.uk/leagues/bundesliga/2026'},
    {'name': '2. Bundesliga', 'file': '2-bundesliga.html', 'url': 'https://matchesnow.co.uk/leagues/2-bundesliga/2026'},
    {'name': 'Ligue 1', 'file': 'ligue-1.html', 'url': 'https://matchesnow.co.uk/leagues/ligue-1/2026'},
    {'name': 'Ligue 2', 'file': 'ligue-2.html', 'url': 'https://matchesnow.co.uk/leagues/ligue-2/2026'},
    {'name': 'Premier League', 'file': 'premier-league.html', 'url': 'https://matchesnow.co.uk/leagues/premier-league/2026'},
    {'name': 'Championship', 'file': 'championship.html', 'url': 'https://matchesnow.co.uk/leagues/championship/2026'},
    {'name': 'Scottish Premiership', 'file': 'scottish-premiership.html', 'url': 'https://matchesnow.co.uk/leagues/scottish-premiership/2026'},
    {'name': 'Eredivisie', 'file': 'eredivisie.html', 'url': 'https://matchesnow.co.uk/leagues/eredivisie/2026'},
    {'name': 'Primeira Liga', 'file': 'primeira-liga.html', 'url': 'https://matchesnow.co.uk/leagues/primeira-liga/2026'},
    {'name': 'A-League', 'file': 'a-league.html', 'url': 'https://matchesnow.co.uk/leagues/a-league/2026'},
]

# ============================================
# MAPPA PER I NOMI DEI CAMPIONATI (per parsing)
# ============================================

LEAGUE_NAME_MAP = {
    'serie_a': 'Serie A',
    'serie_b': 'Serie B',
    'allsvenskan': 'Allsvenskan',
    'eliteserien': 'Eliteserien',
    'superliga': 'Superliga',
    '1-division': '1. Division',
    'jupiler-pro-league': 'Jupiler Pro League',
    'veikkausliiga': 'Veikkausliiga',
    'j1-league': 'J1 League',
    'swiss-super-league': 'Swiss Super League',
    'k-league-1': 'K League 1',
    'la-liga': 'La Liga',
    'segunda-division': 'Segunda Division',
    'bundesliga': 'Bundesliga',
    '2-bundesliga': '2. Bundesliga',
    'ligue-1': 'Ligue 1',
    'ligue-2': 'Ligue 2',
    'premier-league': 'Premier League',
    'championship': 'Championship',
    'scottish-premiership': 'Scottish Premiership',
    'eredivisie': 'Eredivisie',
    'primeira-liga': 'Primeira Liga',
    'a-league': 'A-League',
}

# ============================================
# DETERMINA SE SIAMO IN MODALITÀ HEADLESS
# ============================================

HEADLESS = os.environ.get('CHROME_HEADLESS', 'false').lower() == 'true'

# ============================================
# FUNZIONE PER SALVARE LE PAGINE HTML
# ============================================

def salva_pagine():
    """Scarica e salva tutte le pagine HTML da matchesnow"""
    print("\n" + "=" * 70)
    print("📥 SALVATAGGIO PAGINE HTML")
    print("=" * 70)
    
    driver = None
    try:
        print("\n🚀 Avvio Chrome...")
        options = Options()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        if HEADLESS:
            options.add_argument('--headless=new')
            print("   🔇 Modalità headless attiva")
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        print("✅ Browser avviato!")
        
        successi = 0
        errori = 0
        
        for league in LEAGUES:
            print(f"\n📥 Scaricando {league['name']}...")
            print(f"   URL: {league['url']}")
            
            try:
                file_path = os.path.join(download_folder, league['file'])
                
                driver.get(league['url'])
                time.sleep(3)
                
                # Scroll per caricare il calendario
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2)
                
                # Aspetta il caricamento
                try:
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.CLASS_NAME, "schedule"))
                    )
                    print("   ✅ Calendario trovato")
                except:
                    print("   ⚠️ Calendario non trovato, salvo comunque...")
                
                html = driver.page_source
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(html)
                print(f"   💾 HTML salvato: {league['file']} ({len(html)} bytes)")
                successi += 1
                
            except Exception as e:
                print(f"   ❌ Errore: {e}")
                errori += 1
            
            time.sleep(1)
        
        print("\n" + "=" * 70)
        print(f"📊 Pagine salvate: {successi} / {len(LEAGUES)}")
        print(f"   ❌ Errori: {errori}")
        print("=" * 70)
        return successi, errori
        
    except Exception as e:
        print(f"❌ Errore critico: {e}")
        return 0, len(LEAGUES)
    finally:
        if driver:
            driver.quit()

# ============================================
# FUNZIONE PER ESTRARRE I DATI DA UN FILE HTML
# ============================================

def estrai_da_file_html(file_path):
    """Estrae i dati da un file HTML salvato da matchesnow"""
    
    nome_file = os.path.basename(file_path)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except:
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                html_content = f.read()
        except Exception as e:
            return None
    
    soup = BeautifulSoup(html_content, 'html.parser')
    matches_data = []
    
    # Cerca la sezione fixtures
    fixtures_div = soup.find('div', {'id': 'fixtures'})
    if not fixtures_div:
        fixtures_div = soup.find('div', {'class': 'fixtures'})
    
    if not fixtures_div:
        return None
    
    # Estrai il nome del campionato
    league_name = os.path.basename(file_path).replace('.html', '')
    for key, value in LEAGUE_NAME_MAP.items():
        if key in league_name.lower():
            league_name = value
            break
    if '_' in league_name:
        league_name = league_name.replace('_', ' ').title()
    
    # Trova tutti i round
    round_elements = fixtures_div.find_all(['h3', 'h4'], string=re.compile(r'Round\s+\d+', re.IGNORECASE))
    
    if not round_elements:
        # Fallback: cerca nel testo
        all_text = fixtures_div.get_text()
        round_matches = re.findall(r'Round\s+(\d+)', all_text, re.IGNORECASE)
        if round_matches:
            matches_data = estrai_dal_testo(all_text, league_name)
            if matches_data:
                return pd.DataFrame(matches_data)
        return None
    
    for round_elem in round_elements:
        round_match = re.search(r'Round\s+(\d+)', round_elem.text, re.IGNORECASE)
        if not round_match:
            continue
        current_round = round_match.group(1)
        
        # Cerca la data
        date_elem = round_elem.find_next_sibling('h4')
        current_date = ''
        
        if date_elem and re.search(r'[A-Za-z]+\s+\d{1,2},?\s+\d{4}', date_elem.text):
            date_text = date_elem.text.strip()
            date_match = re.search(r'([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})', date_text)
            if date_match:
                month = date_match.group(1)
                day = date_match.group(2).zfill(2)
                year = date_match.group(3)
                month_map = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                }
                current_date = f"{day}/{month_map.get(month[:3], '01')}/{year}"
        
        # Cerca le partite
        next_round = round_elem.find_next_sibling('h3')
        if not next_round:
            next_round = round_elem.find_next_sibling(lambda tag: tag.name == 'h3' and 'Round' in tag.text)
        
        current_elem = round_elem.find_next_sibling()
        match_links = []
        
        while current_elem and current_elem != next_round:
            if current_elem.name == 'a' and current_elem.get('href') and '/leagues/' in current_elem.get('href'):
                match_links.append(current_elem)
            if current_elem.name == 'div':
                links = current_elem.find_all('a', href=re.compile(r'/leagues/.*/\d{4}/.*'))
                match_links.extend(links)
            current_elem = current_elem.find_next_sibling()
        
        for link in match_links:
            try:
                text = link.text.strip()
                if not text or len(text) < 3:
                    continue
                
                is_played = 'FT' in text
                numbers = re.findall(r'\d+', text)
                
                if is_played and len(numbers) >= 2:
                    gol_casa = int(numbers[0])
                    gol_ospite = int(numbers[1])
                    stato = 'Giocata'
                    risultato = f"{gol_casa}-{gol_ospite}"
                else:
                    gol_casa = 0
                    gol_ospite = 0
                    stato = 'Futura'
                    risultato = ''
                
                time_match = re.search(r'(\d{1,2}:\d{2})', text)
                time_str = time_match.group(1) if time_match else ''
                
                clean_text = text
                clean_text = re.sub(r'FT', '', clean_text)
                clean_text = re.sub(r'\d+', '', clean_text)
                clean_text = clean_text.strip()
                
                teams = [w for w in clean_text.split() if len(w) > 1]
                
                if len(teams) >= 4:
                    mid = len(teams) // 2
                    home = ' '.join(teams[:mid])
                    away = ' '.join(teams[mid:])
                elif len(teams) >= 2:
                    home = teams[0]
                    away = teams[-1]
                else:
                    continue
                
                home = home.strip()
                away = away.strip()
                
                if home and away and len(home) > 1 and len(away) > 1:
                    matches_data.append({
                        'Campionato': league_name,
                        'Numero Giornata (Wk)': current_round,
                        'Data': current_date,
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
        return None
    
    return pd.DataFrame(matches_data)

# ============================================
# FUNZIONE PER ESTRARRE DAL TESTO (FALLBACK)
# ============================================

def estrai_dal_testo(text, league_name):
    """Estrae i dati dal testo grezzo (fallback)"""
    matches_data = []
    lines = text.split('\n')
    current_round = ''
    current_date = ''
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        round_match = re.search(r'Round\s+(\d+)', line, re.IGNORECASE)
        if round_match:
            current_round = round_match.group(1)
            continue
        
        date_match = re.search(r'([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})', line)
        if date_match:
            month = date_match.group(1)
            day = date_match.group(2).zfill(2)
            year = date_match.group(3)
            month_map = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            }
            current_date = f"{day}/{month_map.get(month[:3], '01')}/{year}"
            continue
        
        if 'FT' in line:
            parts = line.split()
            if len(parts) >= 4:
                numbers = [p for p in parts if p.isdigit()]
                if numbers:
                    if len(numbers) >= 2:
                        gol_casa = int(numbers[0])
                        gol_ospite = int(numbers[1])
                    else:
                        gol_casa = int(numbers[0])
                        gol_ospite = 0
                    
                    stato = 'Giocata'
                    risultato = f"{gol_casa}-{gol_ospite}"
                    
                    team_parts = [p for p in parts if p not in ['FT'] and not p.isdigit()]
                    if len(team_parts) >= 2:
                        home = team_parts[0]
                        away = team_parts[-1]
                        
                        matches_data.append({
                            'Campionato': league_name,
                            'Numero Giornata (Wk)': current_round,
                            'Data': current_date,
                            'Ora': '',
                            'Squadra Casa': home,
                            'Squadra Ospite': away,
                            'Risultato': risultato,
                            'Gol Casa': gol_casa,
                            'Gol Ospite': gol_ospite,
                            'Stato': stato
                        })
    
    return matches_data

# ============================================
# FUNZIONE PER CREARE I FILE XLSX E JSON
# ============================================

def crea_file():
    """Legge i file HTML salvati e crea Excel e JSON"""
    print("\n" + "=" * 70)
    print("📊 CREAZIONE FILE XLSX E JSON")
    print("=" * 70)
    
    html_files = [f for f in os.listdir(download_folder) if f.endswith('.html')]
    
    if not html_files:
        print(f"\n❌ Nessun file HTML trovato in {download_folder}")
        print("   📌 Usa l'opzione 2 per salvare le pagine")
        return
    
    print(f"\n📄 Trovati {len(html_files)} file HTML:")
    for f in html_files:
        print(f"   - {f}")
    
    tutte_le_partite = pd.DataFrame()
    successi = 0
    errori = 0
    dettagli = []
    
    for file_name in html_files:
        file_path = os.path.join(download_folder, file_name)
        df = estrai_da_file_html(file_path)
        
        if df is not None and not df.empty:
            tutte_le_partite = pd.concat([tutte_le_partite, df], ignore_index=True)
            successi += 1
            dettagli.append(f"   ✅ {file_name}: {len(df)} partite")
        else:
            errori += 1
            dettagli.append(f"   ❌ {file_name}: nessuna partita")
    
    print("\n📊 DETTAGLIO:")
    for det in dettagli:
        print(det)
    
    print("\n" + "=" * 70)
    print(f"📊 TOTALE: {successi} successi, {errori} errori")
    print(f"   📊 Totale partite: {len(tutte_le_partite)}")
    
    if tutte_le_partite.empty:
        print("\n❌ Nessun dato da salvare!")
        return
    
    # Propaga Wk e Data
    current_wk = ''
    current_date = ''
    for idx in range(len(tutte_le_partite)):
        if tutte_le_partite.loc[idx, 'Numero Giornata (Wk)'] and tutte_le_partite.loc[idx, 'Numero Giornata (Wk)'] != '':
            current_wk = tutte_le_partite.loc[idx, 'Numero Giornata (Wk)']
        else:
            tutte_le_partite.loc[idx, 'Numero Giornata (Wk)'] = current_wk
        
        if tutte_le_partite.loc[idx, 'Data'] and tutte_le_partite.loc[idx, 'Data'] != '':
            current_date = tutte_le_partite.loc[idx, 'Data']
        else:
            tutte_le_partite.loc[idx, 'Data'] = current_date
    
    # ============================================================
    # SALVA EXCEL
    # ============================================================
    excel_path = os.path.join(output_folder, "GesssAI_Input.xlsx")
    tutte_le_partite.to_excel(excel_path, index=False)
    print(f"\n✅ Excel salvato: {excel_path} ({len(tutte_le_partite)} righe)")
    
    # ============================================================
    # CREA JSON
    # ============================================================
    matches_data = []
    campionati_set = set()
    
    for _, row in tutte_le_partite.iterrows():
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
    
    # Salva GesssAI_Input.json
    json_path_excel = os.path.join(output_folder, "GesssAI_Input.json")
    with open(json_path_excel, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ GesssAI_Input.json salvato in: {json_path_excel}")
    
    # Copia come matches.json per GitHub
    json_path_data = os.path.join(data_folder, "matches.json")
    shutil.copy2(json_path_excel, json_path_data)
    print(f"✅ matches.json copiato in: {json_path_data}")
    
    giocate = len(tutte_le_partite[tutte_le_partite['Stato'] == 'Giocata'])
    future = len(tutte_le_partite) - giocate
    
    print(f"\n📊 Statistiche finali:")
    print(f"   🟢 Giocate: {giocate}")
    print(f"   🔵 Future: {future}")
    print(f"   🏆 Campionati: {len(campionati_set)}")

# ============================================
# FUNZIONE PER TUTTO (SALVA + CREA)
# ============================================

def tutto():
    """Esegue salvataggio pagine e creazione file"""
    salva_pagine()
    crea_file()

# ============================================
# MAIN PER GITHUB ACTIONS (ESEGUE TUTTO)
# ============================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("⚽ GESSSAI - DATA EXTRACTOR (MATCHSNOW)")
    print("=" * 70)
    
    # In GitHub Actions esegue sempre tutto
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        print("\n🔄 Esecuzione in GitHub Actions...")
        tutto()
    else:
        # Menu interattivo per esecuzione locale
        print(f"\n📁 Cartella input: {download_folder}")
        print(f"📁 Cartella output: {output_folder}")
        print(f"📁 Cartella data: {data_folder}")
        
        while True:
            print("\n" + "=" * 70)
            print("📌 Scegli l'operazione da eseguire:")
            print("   1️⃣  Tutto (Salva pagine HTML + Crea XLSX e JSON)")
            print("   2️⃣  Salva solo le pagine HTML")
            print("   3️⃣  Crea solo i file XLSX e JSON (da pagine già salvate)")
            print("   4️⃣  Esci")
            print("\n" + "-" * 70)
            
            try:
                scelta = input("\n👉 Inserisci il numero della tua scelta (1-4): ").strip()
                
                if scelta == '1':
                    tutto()
                    break
                elif scelta == '2':
                    salva_pagine()
                    break
                elif scelta == '3':
                    crea_file()
                    break
                elif scelta == '4':
                    print("\n👋 Arrivederci!")
                    break
                else:
                    print("❌ Scelta non valida. Inserisci un numero da 1 a 4.")
            except KeyboardInterrupt:
                print("\n\n👋 Arrivederci!")
                break
            except Exception as e:
                print(f"❌ Errore: {e}")
    
    print("\n" + "=" * 70)