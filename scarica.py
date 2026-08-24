import os
import time
import pandas as pd
from bs4 import BeautifulSoup
import glob
import re
from datetime import datetime
import locale
import json
import asyncio
from crawl4ai_cloud import AsyncWebCrawler

# ============================================
# CONFIGURAZIONE PER LOCALE E PERCORSI
# ============================================

# 🔑 INSERISCI QUI LA TUA API KEY DI CRAWL4AI CLOUD
API_KEY = os.environ.get('CRAWL4AI_API_KEY', 'sk_live_8pxScR5n1rxFFS952gUQQuIkbiMVFni7N4QiR1oalYQ')
# Rileva se siamo su GitHub Actions
IN_GITHUB_ACTIONS = os.environ.get('GITHUB_ACTIONS') == 'true'

# Configura percorsi in base all'ambiente
if IN_GITHUB_ACTIONS:
    BASE_DIR = os.getcwd()
    download_folder = os.path.join(BASE_DIR, 'downloads')
    output_folder = os.path.join(BASE_DIR, 'excel')
    data_folder = os.path.join(BASE_DIR, 'data')
    print(f"🏗️ Esecuzione su GitHub Actions")
else:
    download_folder = r"d:\ai\siti_da_fbref"
    output_folder = r"d:\ai\excel"
    data_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    print(f"💻 Esecuzione in locale")

# Crea le cartelle
os.makedirs(download_folder, exist_ok=True)
os.makedirs(output_folder, exist_ok=True)
os.makedirs(data_folder, exist_ok=True)

print("\n" + "=" * 70)
print("⚽ DOWNLOAD E CONVERSIONE FBref → GESSSAI (Crawl4AI Cloud)")
print("=" * 70)

try:
    locale.setlocale(locale.LC_TIME, 'it_IT.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_TIME, 'italian')
    except:
        print("⚠️ Impossibile impostare la localizzazione italiana")

print(f"\n📂 Cartella DOWNLOAD: {download_folder}")
print(f"📂 Cartella OUTPUT Excel: {output_folder}")
print(f"📂 Cartella DATA: {data_folder}")

# ============================================
# LISTA DEI 36 SITI (AGGIORNATA)
# ============================================
sites = [
    # Allsvenskan (Svezia)
    {'nome': 'Allsvenskan - Stats', 'url': 'https://fbref.com/en/comps/29/Allsvenskan-Stats'},
    {'nome': 'Allsvenskan - Schedule', 'url': 'https://fbref.com/en/comps/29/schedule/Allsvenskan-Scores-and-Fixtures'},
    
    # Austrian Bundesliga (Austria)
    {'nome': 'Austrian Bundesliga - Stats', 'url': 'https://fbref.com/en/comps/56/Austrian-Bundesliga-Stats'},
    {'nome': 'Austrian Bundesliga - Schedule', 'url': 'https://fbref.com/en/comps/56/schedule/Austrian-Bundesliga-Scores-and-Fixtures'},

    # Bundesliga (Germania)
    {'nome': 'Bundesliga - Stats', 'url': 'https://fbref.com/en/comps/20/2026-2027/2026-2027-Bundesliga-Stats'},
    {'nome': 'Bundesliga - Schedule', 'url': 'https://fbref.com/en/comps/20/2026-2027/schedule/2026-2027-Bundesliga-Scores-and-Fixtures'},
    
    # Chinese Super League (Cina)
    {'nome': 'Chinese Super League - Stats', 'url': 'https://fbref.com/en/comps/62/Chinese-Super-League-Stats'},
    {'nome': 'Chinese Super League - Schedule', 'url': 'https://fbref.com/en/comps/62/schedule/Chinese-Super-League-Scores-and-Fixtures'},
    
    # Danish Superliga (Danimarca)
    {'nome': 'Danish Superliga - Stats', 'url': 'https://fbref.com/en/comps/50/Danish-Superliga-Stats'},
    {'nome': 'Danish Superliga - Schedule', 'url': 'https://fbref.com/en/comps/50/schedule/Danish-Superliga-Scores-and-Fixtures'},
    
    # Eliteserien (Norvegia)
    {'nome': 'Eliteserien - Stats', 'url': 'https://fbref.com/en/comps/28/Eliteserien-Stats'},
    {'nome': 'Eliteserien - Schedule', 'url': 'https://fbref.com/en/comps/28/schedule/Eliteserien-Scores-and-Fixtures'},
    
    # Eredivisie (Paesi Bassi) 
    {'nome': 'Eredivisie - Stats', 'url': 'https://fbref.com/en/comps/23/Eredivisie-Stats'},
    {'nome': 'Eredivisie - Schedule', 'url': 'https://fbref.com/en/comps/23/schedule/Eredivisie-Scores-and-Fixtures'},
    
    # La Liga (Spagna) 
    {'nome': 'La Liga - Stats', 'url': 'https://fbref.com/en/comps/12/2026-2027/2026-2027-La-Liga-Stats'},
    {'nome': 'La Liga - Schedule', 'url': 'https://fbref.com/en/comps/12/2026-2027/schedule/2026-2027-La-Liga-Scores-and-Fixtures'},

    # Ligue 1 (Francia) 
    {'nome': 'Ligue 1 - Stats', 'url': 'https://fbref.com/en/comps/13/2026-2027/2026-2027-Ligue-1-Stats'},
    {'nome': 'Ligue 1 - Schedule', 'url': 'https://fbref.com/en/comps/13/2026-2027/schedule/2026-2027-Ligue-1-Scores-and-Fixtures'},
    
    # League of Ireland Premier Division (Irlanda)
    {'nome': 'Ireland Premier - Stats', 'url': 'https://fbref.com/en/comps/80/League-of-Ireland-Premier-Division-Stats'},
    {'nome': 'Ireland Premier - Schedule', 'url': 'https://fbref.com/en/comps/80/schedule/League-of-Ireland-Premier-Division-Scores-and-Fixtures'},
    
    # J1 League (Giappone)
    {'nome': 'J1 League - Stats', 'url': 'https://fbref.com/en/comps/25/J1-League-Stats'},
    {'nome': 'J1 League - Schedule', 'url': 'https://fbref.com/en/comps/25/schedule/J1-League-Scores-and-Fixtures'},
    
    # K League 1 (Corea del Sud)
    {'nome': 'K League 1 - Stats', 'url': 'https://fbref.com/en/comps/55/K-League-1-Stats'},
    {'nome': 'K League 1 - Schedule', 'url': 'https://fbref.com/en/comps/55/schedule/K-League-1-Scores-and-Fixtures'},

    # Premier League (Inghilterra)
    {'nome': 'Premier League - Stats', 'url': 'https://fbref.com/en/comps/9/2026-2027/2026-2027-Premier-League-Stats'},
    {'nome': 'Premier League - Schedule', 'url': 'https://fbref.com/en/comps/9/2026-2027/schedule/2026-2027-Premier-League-Scores-and-Fixtures'},
    
    # Russian Premier League (Russia)
    {'nome': 'Russian PL - Stats', 'url': 'https://fbref.com/en/comps/30/Russian-Premier-League-Stats'},
    {'nome': 'Russian PL - Schedule', 'url': 'https://fbref.com/en/comps/30/schedule/Russian-Premier-League-Scores-and-Fixtures'},

    # Serie A (Italia)
    {'nome': 'Serie A - Stats', 'url': 'https://fbref.com/en/comps/11/2026-2027/2026-2027-Serie-A-M-Stats'},
    {'nome': 'Serie A - Schedule', 'url': 'https://fbref.com/en/comps/11/2026-2027/schedule/2026-2027-Serie-A-M-Scores-and-Fixtures'},

    # Serie B (Italia)
    {'nome': 'Serie B - Stats', 'url': 'https://fbref.com/en/comps/18/2026-2027/2026-2027-Serie-B-M-Stats'},
    {'nome': 'Serie B - Schedule', 'url': 'https://fbref.com/en/comps/18/2026-2027/schedule/2026-2027-Serie-B-M-Scores-and-Fixtures'},
    
    # Swiss Super League (Svizzera)
    {'nome': 'Swiss Super League - Stats', 'url': 'https://fbref.com/en/comps/57/Swiss-Super-League-Stats'},
    {'nome': 'Swiss Super League - Schedule', 'url': 'https://fbref.com/en/comps/57/schedule/Swiss-Super-League-Scores-and-Fixtures'},
    
    # Veikkausliiga (Finlandia)
    {'nome': 'Veikkausliiga - Stats', 'url': 'https://fbref.com/en/comps/43/Veikkausliiga-Stats'},
    {'nome': 'Veikkausliiga - Schedule', 'url': 'https://fbref.com/en/comps/43/schedule/Veikkausliiga-Scores-and-Fixtures'}
]

# ============================================
# FUNZIONI DI UTILITÀ (SENZA SELENIUM)
# ============================================

async def scrape_page_with_crawl4ai(url, nome):
    """Scarica una pagina usando Crawl4AI Cloud"""
    try:
        print(f"   🌐 Scaricamento: {nome}")
        
        async with AsyncWebCrawler(api_key=API_KEY) as crawler:
            result = await crawler.run(
                url,
                # Opzioni per FBref
                wait_for="table",  # Aspetta che la tabella sia caricata
                wait_timeout=30000,  # Timeout 30 secondi
                screenshot=False,  # Non serve screenshot
                markdown=False,  # Vogliamo HTML
                html=True  # Restituisci HTML
            )
            
            if result and result.html:
                print(f"   ✅ Scaricato: {len(result.html)} bytes")
                return result.html
            else:
                print(f"   ❌ Nessun contenuto per {nome}")
                return None
                
    except Exception as e:
        print(f"   ❌ Errore per {nome}: {e}")
        return None

def estrai_tabella(html_content):
    """Estrae la tabella dei risultati dall'HTML con BeautifulSoup"""
    if not html_content:
        return None
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        matches = []
        
        # Cerca la tabella - diversi selettori
        table = soup.find('table', {'id': 'div_schedule'})
        if not table:
            table = soup.find('table', class_='stats_table')
        if not table:
            # Cerca qualsiasi tabella con risultati
            for t in soup.find_all('table'):
                if t.find('tbody') and len(t.find_all('tr')) > 5:
                    table = t
                    break
        
        if not table:
            print("   ⚠️ Tabella non trovata")
            return None
        
        # Cerca le righe
        rows = table.find_all('tr')
        print(f"   📊 Righe trovate: {len(rows)}")
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 4:
                continue
            
            date = cells[0].get_text(strip=True)
            home = cells[1].get_text(strip=True)
            score_text = cells[2].get_text(strip=True)
            away = cells[3].get_text(strip=True)
            
            if not date or not home or not away:
                continue
            
            # Estrai gol
            home_goals = 0
            away_goals = 0
            stato = 'Futura'
            risultato = ''
            
            score_match = re.search(r'(\d+)\s*[-–:\.]\s*(\d+)', score_text)
            if score_match:
                home_goals = int(score_match.group(1))
                away_goals = int(score_match.group(2))
                stato = 'Giocata'
                risultato = f"{home_goals}-{away_goals}"
            
            # Normalizza data: YYYY-MM-DD → DD/MM/YYYY
            if re.match(r'^\d{4}-\d{2}-\d{2}$', date):
                parts = date.split('-')
                date = f"{parts[2]}/{parts[1]}/{parts[0]}"
            
            matches.append({
                'data': date,
                'casa': home,
                'ospiti': away,
                'golCasa': home_goals,
                'golOspite': away_goals,
                'stato': stato,
                'risultato': risultato
            })
        
        return matches
        
    except Exception as e:
        print(f"   ❌ Errore parsing: {e}")
        return None

# ============================================
# FUNZIONE PER CONVERTIRE IN FORMATO GESSSAI
# ============================================

def converti_per_gesssai(file_schedule, file_stats, output_file):
    """
    Converte i file Schedule nel formato per l'app GesssAI
    REGOLA: Se Risultato ha un valore → Giocata, altrimenti → Futura
    INCLUDE TUTTE LE PARTITE (ANCHE GIOCATE)
    """
    try:
        print("\n📱 Conversione per l'app GesssAI...")
        
        df_schedule = pd.read_excel(file_schedule)
        print(f"   📅 Schedule: {len(df_schedule)} righe")
        
        # Trova le colonne
        col_data = None
        col_home = None
        col_away = None
        col_campionato = None
        col_giornata = None
        col_ora = None
        col_risultato = None
        
        for col in df_schedule.columns:
            col_lower = col.lower().strip()
            if 'date' in col_lower or 'data' in col_lower:
                col_data = col
            elif 'home' in col_lower or 'casa' in col_lower:
                col_home = col
            elif 'away' in col_lower or 'ospite' in col_lower:
                col_away = col
            elif 'risultato' in col_lower or 'score' in col_lower:
                col_risultato = col
            elif 'wk' in col_lower or 'giornata' in col_lower:
                col_giornata = col
            elif 'time' in col_lower or 'ora' in col_lower:
                col_ora = col
        
        # Se non trova la colonna risultati, cerca per contenuto
        if not col_risultato:
            for col in df_schedule.columns:
                sample = df_schedule[col].astype(str).head(30)
                if sample.str.contains(r'\d+[-–]\d+').sum() > 0:
                    col_risultato = col
                    break
        
        if not col_campionato:
            col_campionato = 'Campionato'
            if col_campionato not in df_schedule.columns:
                nome_campionato = os.path.basename(file_schedule).replace('_Schedule.xlsx', '').replace('Tutti_', '')
                df_schedule.insert(0, 'Campionato', nome_campionato)
        
        print(f"\n   🔍 Colonne trovate:")
        print(f"      Campionato: {col_campionato}")
        print(f"      Data: {col_data}")
        print(f"      Casa: {col_home}")
        print(f"      Ospite: {col_away}")
        print(f"      Risultato: {col_risultato}")
        
        if not col_risultato:
            print("   ❌ ERRORE: Colonna Risultato non trovata!")
            return None
        
        # ============================================================
        # CONVERSIONE - INCLUDE TUTTE LE PARTITE (ANCHE GIOCATE)
        # ============================================================
        risultati = []
        conteggio_giocate = 0
        conteggio_future = 0
        
        for _, row in df_schedule.iterrows():
            try:
                campionato = str(row[col_campionato]) if col_campionato and col_campionato in row else 'Sconosciuto'
                campionato = campionato.replace(' - Schedule', '').replace('.xlsx', '').strip()
                
                data = str(row[col_data]) if col_data and col_data in row else ''
                ora = str(row[col_ora]) if col_ora and col_ora in row else ''
                casa = str(row[col_home]) if col_home and col_home in row else ''
                ospite = str(row[col_away]) if col_away and col_away in row else ''
                giornata = str(row[col_giornata]) if col_giornata and col_giornata in row else ''
                score = str(row[col_risultato]) if col_risultato and col_risultato in row else ''
                
                # Pulisci
                if data == 'nan': data = ''
                if ora == 'nan': ora = ''
                if casa == 'nan': casa = ''
                if ospite == 'nan': ospite = ''
                if giornata == 'nan': giornata = ''
                if score == 'nan': score = ''
                
                gol_casa = 0
                gol_ospite = 0
                risultato = ''
                stato = 'Futura'
                
                if score and score != '':
                    match = re.search(r'(\d+)\s*[-–:\.]\s*(\d+)', score)
                    if match:
                        gol_casa = int(match.group(1))
                        gol_ospite = int(match.group(2))
                        risultato = f"{gol_casa}-{gol_ospite}"
                        stato = 'Giocata'
                        conteggio_giocate += 1
                else:
                    conteggio_future += 1
                
                if casa and casa != '' and ospite and ospite != '':
                    risultati.append({
                        'Campionato': campionato,
                        'Numero Giornata (Wk)': giornata,
                        'Data': data,
                        'Ora': ora,
                        'Squadra Casa': casa,
                        'Squadra Ospite': ospite,
                        'Risultato': risultato,
                        'Gol Casa': gol_casa,
                        'Gol Ospite': gol_ospite,
                        'Stato': stato
                    })
                    
            except Exception as e:
                continue
        
        # Crea DataFrame finale con TUTTE le partite
        df_finale = pd.DataFrame(risultati)
        df_finale = df_finale.drop_duplicates(subset=['Campionato', 'Data', 'Squadra Casa', 'Squadra Ospite'])
        df_finale = df_finale.sort_values(['Campionato', 'Data'])
        
        # Salva
        df_finale.to_excel(output_file, index=False)
        
        print(f"\n   ✅ Creato file per GesssAI: {output_file}")
        print(f"      📊 {len(df_finale)} partite totali")
        print(f"      🟢 Giocate: {conteggio_giocate}")
        print(f"      🔵 Future: {conteggio_future}")
        print(f"      🏆 Campionati: {df_finale['Campionato'].nunique()}")
        
        return df_finale
        
    except Exception as e:
        print(f"   ❌ Errore: {e}")
        import traceback
        traceback.print_exc()
        return None

# ============================================
# FUNZIONE PER GENERARE IL JSON UNICO CON TUTTE LE PARTITE
# ============================================

def genera_json_per_app(df_schedule, output_folder, data_folder):
    """Genera un file JSON compatibile con l'app GesssAI-Pro v3.0
    INCLUDE TUTTE LE PARTITE (GIOCATE + FUTURE) IN UN UNICO FILE
    """
    try:
        print("\n📱 Generazione JSON unico con tutte le partite...")
        
        if df_schedule is None or df_schedule.empty:
            print("   ❌ Nessun dato disponibile per il JSON")
            return None
        
        matches_data = []
        campionati_set = set()
        errors = 0
        
        for idx, row in df_schedule.iterrows():
            try:
                campionato = str(row.get('Campionato', 'Sconosciuto')).strip()
                if campionato == 'nan' or campionato == 'None' or campionato == '':
                    campionato = 'Sconosciuto'
                
                campionati_set.add(campionato)
                
                data_europea = str(row.get('Data', '')).strip()
                if data_europea == 'nan' or data_europea == 'None':
                    data_europea = ''
                
                if data_europea and re.match(r'^\d{4}-\d{1,2}-\d{1,2}$', data_europea):
                    parts = data_europea.split('-')
                    data_europea = f"{parts[2]}/{parts[1]}/{parts[0]}"
                
                gol_casa = row.get('Gol Casa', 0)
                gol_ospite = row.get('Gol Ospite', 0)
                
                try:
                    gol_casa = int(gol_casa) if gol_casa and gol_casa != 'nan' else 0
                except:
                    gol_casa = 0
                try:
                    gol_ospite = int(gol_ospite) if gol_ospite and gol_ospite != 'nan' else 0
                except:
                    gol_ospite = 0
                
                stato = str(row.get('Stato', 'Futura')).strip()
                if stato == 'nan' or stato == 'None':
                    stato = 'Futura'
                
                risultato = str(row.get('Risultato', '')).strip()
                if risultato and risultato != '' and risultato != 'nan':
                    stato = 'Giocata'
                    if gol_casa == 0 and gol_ospite == 0:
                        match = re.search(r'(\d+)\s*[-–:\.]\s*(\d+)', risultato)
                        if match:
                            gol_casa = int(match.group(1))
                            gol_ospite = int(match.group(2))
                
                casa = str(row.get('Squadra Casa', '')).strip()
                if casa == 'nan' or casa == 'None':
                    casa = ''
                
                ospite = str(row.get('Squadra Ospite', '')).strip()
                if ospite == 'nan' or ospite == 'None':
                    ospite = ''
                
                if not casa or not ospite:
                    errors += 1
                    continue
                
                round_val = str(row.get('Numero Giornata (Wk)', 'N/A')).strip()
                if round_val == 'nan' or round_val == 'None':
                    round_val = 'N/A'
                
                ora = str(row.get('Ora', 'TBD')).strip()
                if ora == 'nan' or ora == 'None':
                    ora = 'TBD'
                
                id_parts = [
                    campionato.replace(' ', '_'),
                    data_europea.replace('/', '_') if data_europea else 'nodate',
                    casa.replace(' ', '_'),
                    ospite.replace(' ', '_')
                ]
                match_id = "_".join(id_parts)
                
                # Risultato display
                risultato_display = f"{gol_casa}-{gol_ospite}" if stato == 'Giocata' else ""
                
                match_data = {
                    "id": match_id,
                    "campionato": campionato,
                    "round": round_val,
                    "data": data_europea,
                    "ora": ora,
                    "casa": casa,
                    "ospiti": ospite,
                    "stato": stato,
                    "golCasa": gol_casa,
                    "golOspite": gol_ospite,
                    "risultato": risultato_display,
                    "citta": "N/D"
                }
                matches_data.append(match_data)
                
            except Exception as e:
                errors += 1
                continue
        
        campionati_list = [{"name": c, "importedAt": datetime.now().isoformat()} for c in sorted(campionati_set)]
        
        data = {
            "championships": campionati_list,
            "matches": matches_data,
            "apiKeys": {},
            "theme": "Scuro Blu Notte",
            "customTheme": None,
            "schedineHistory": [],
            "selectedFamiglie": ["dc_under", "mg_casa_ospite", "over"],
            "exportedAt": datetime.now().isoformat()
        }
        
        # ============================================================
        # SALVA IN TUTTI I POSTI POSSIBILI
        # ============================================================
        
        # 1. Nella cartella output (excel)
        output_path = os.path.join(output_folder, "GesssAI_Input.json")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ JSON salvato in: {output_path}")
        
        # 2. Nella cartella data del progetto (PER GITHUB)
        data_path = os.path.join(data_folder, "matches.json")
        with open(data_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ JSON salvato in: {data_path}")
        
        # 3. Nella cartella corrente (come fallback)
        current_path = os.path.join(os.getcwd(), "data", "matches.json")
        os.makedirs(os.path.dirname(current_path), exist_ok=True)
        with open(current_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ JSON salvato in: {current_path}")
        
        # Statistiche
        giocate = sum(1 for m in matches_data if m.get('stato') == 'Giocata')
        future = len(matches_data) - giocate
        
        print(f"\n   📊 {len(matches_data)} partite totali")
        print(f"   🏆 {len(campionati_set)} campionati")
        print(f"   🟢 Giocate: {giocate}")
        print(f"   🔵 Future: {future}")
        
        if errors > 0:
            print(f"   ⚠️ {errors} righe saltate per dati mancanti")
        
        return output_path
        
    except Exception as e:
        print(f"   ❌ Errore nella generazione JSON: {e}")
        import traceback
        traceback.print_exc()
        return None

# ============================================
# FUNZIONE PER SALVARE HTML (PER DEBUG)
# ============================================

def salva_html(html_content, nome_file):
    """Salva l'HTML per debug"""
    try:
        html_path = os.path.join(download_folder, nome_file)
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"   💾 HTML salvato: {nome_file}")
        return html_path
    except Exception as e:
        print(f"   ❌ Errore salvataggio HTML: {e}")
        return None

# ============================================
# FASE 1: DOWNLOAD CON CRAWL4AI CLOUD
# ============================================

print("\n" + "=" * 70)
print("📥 FASE 1: DOWNLOAD DA FBref (Crawl4AI Cloud)")
print("=" * 70)

print(f"\n📥 Download di {len(sites)} siti...")
print("-" * 60)

download_success = 0
download_errors = 0
html_files_created = []

async def download_all_sites():
    global download_success, download_errors, html_files_created
    
    for i, site in enumerate(sites, 1):
        print(f"\n[{i}/{len(sites)}] {site['nome']}")
        print(f"   URL: {site['url']}")
        
        html = await scrape_page_with_crawl4ai(site['url'], site['nome'])
        
        if html:
            nome_file = f"{site['nome'].replace(' ', '_').replace('/', '_')}.html"
            html_path = salva_html(html, nome_file)
            if html_path:
                html_files_created.append(html_path)
                download_success += 1
        else:
            download_errors += 1
        
        # Attesa tra le richieste
        if i < len(sites):
            print(f"   ⏳ Attendo 2 secondi...")
            await asyncio.sleep(2)

# Esegui il download
asyncio.run(download_all_sites())

print("\n" + "-" * 60)
print(f"📊 Download completato:")
print(f"   ✅ Successi: {download_success}")
print(f"   ❌ Errori: {download_errors}")

# ============================================
# FASE 2: CONVERSIONE
# ============================================
print("\n" + "=" * 70)
print("🔄 FASE 2: CONVERSIONE IN EXCEL")
print("=" * 70)

if not html_files_created:
    print("\n⚠️ Nessun nuovo file scaricato. Cerco file HTML esistenti...")
    html_files_created = glob.glob(os.path.join(download_folder, "*.html"))

if not html_files_created:
    print("\n❌ Nessun file HTML trovato!")
    if not IN_GITHUB_ACTIONS:
        input("\nPremi INVIO per uscire...")
    exit()

print(f"\n📄 Trovati {len(html_files_created)} file HTML da convertire")
print("-" * 60)

converted = 0
errors = 0

# Funzione per convertire HTML in Excel (senza Selenium)
def converti_html_in_excel_semplice(html_file_path, output_folder):
    """Converte un file HTML in Excel usando BeautifulSoup (senza Selenium)"""
    try:
        nome_file = os.path.basename(html_file_path)
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Estrai la tabella
        matches = estrai_tabella(html_content)
        if not matches:
            return None, "Nessuna partita trovata"
        
        # Crea DataFrame
        df = pd.DataFrame(matches)
        
        # Salva Excel
        nome_excel = os.path.splitext(nome_file)[0] + ".xlsx"
        excel_path = os.path.join(output_folder, nome_excel)
        
        with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Dati', index=False)
            worksheet = writer.sheets['Dati']
            for idx, col in enumerate(df.columns):
                try:
                    max_length = max(df[col].astype(str).map(len).max() if len(df) > 0 else 0, len(str(col))) + 2
                    max_length = min(max_length, 50)
                    col_letter = chr(65 + idx) if idx < 26 else chr(65 + (idx // 26) - 1) + chr(65 + (idx % 26))
                    worksheet.column_dimensions[col_letter].width = max_length
                except:
                    pass
        
        return df, f"OK ({len(df)} righe, {len(df.columns)} colonne)"
    except Exception as e:
        return None, str(e)

for i, html_file in enumerate(html_files_created, 1):
    nome_file = os.path.basename(html_file)
    print(f"\n[{i}/{len(html_files_created)}] {nome_file}")
    
    df, result = converti_html_in_excel_semplice(html_file, output_folder)
    
    if df is not None:
        print(f"   ✅ Excel salvato: {os.path.splitext(nome_file)[0]}.xlsx ({result})")
        converted += 1
    else:
        print(f"   ❌ Errore: {result}")
        errors += 1

# ============================================
# FASE 3: UNISCI
# ============================================
print("\n" + "=" * 70)
print("📊 FASE 3: UNISCI FILE EXCEL")
print("=" * 70)

def unisci_file_excel(output_folder, pattern, nome_output):
    """Unisce tutti i file Excel che corrispondono a un pattern"""
    
    excel_files = glob.glob(os.path.join(output_folder, f"*{pattern}*.xlsx"))
    if not excel_files:
        print(f"   ⚠️ Nessun file {pattern} trovato")
        return None
    
    print(f"\n   📁 Trovati {len(excel_files)} file {pattern}:")
    df_combined = pd.DataFrame()
    
    for file in excel_files:
        try:
            nome_campionato = os.path.basename(file)
            nome_campionato = os.path.splitext(nome_campionato)[0]
            nome_campionato = nome_campionato.replace(" - Schedule", "").replace(" - Stats", "")
            nome_campionato = nome_campionato.replace("_", " ").strip()
            
            print(f"      - {os.path.basename(file)} → {nome_campionato}")
            
            df_temp = pd.read_excel(file)
            df_temp.insert(0, 'Campionato', nome_campionato)
            df_combined = pd.concat([df_combined, df_temp], ignore_index=True)
            
        except Exception as e:
            print(f"      ❌ Errore nella lettura di {os.path.basename(file)}: {str(e)}")
    
    if df_combined.empty:
        print(f"   ⚠️ Nessun dato valido per {pattern}")
        return None
    
    output_path = os.path.join(output_folder, nome_output)
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df_combined.to_excel(writer, sheet_name=f'Tutti {pattern}', index=False)
        worksheet = writer.sheets[f'Tutti {pattern}']
        for idx, col in enumerate(df_combined.columns):
            try:
                max_length = max(df_combined[col].astype(str).map(len).max() if len(df_combined) > 0 else 0, len(str(col))) + 2
                max_length = min(max_length, 50)
                col_letter = chr(65 + idx) if idx < 26 else chr(65 + (idx // 26) - 1) + chr(65 + (idx % 26))
                worksheet.column_dimensions[col_letter].width = max_length
            except:
                pass
    
    print(f"\n   ✅ Creato file unificato: {nome_output}")
    print(f"      Totale righe: {len(df_combined)}")
    print(f"      Campionati inclusi: {df_combined['Campionato'].nunique()}")
    return output_path

print("\n📅 Unione file Schedule...")
unisci_file_excel(output_folder, "Schedule", "Tutti_Schedule.xlsx")

print("\n📊 Unione file Stats...")
unisci_file_excel(output_folder, "Stats", "Tutti_Stats.xlsx")

# ============================================
# FASE 4: CONVERSIONE PER APP (TUTTE LE PARTITE)
# ============================================
print("\n" + "=" * 70)
print("📱 FASE 4: CONVERSIONE PER APP GESSSAI")
print("=" * 70)

file_schedule = os.path.join(output_folder, "Tutti_Schedule.xlsx")
file_stats = os.path.join(output_folder, "Tutti_Stats.xlsx")
output_file = os.path.join(output_folder, "GesssAI_Input.xlsx")

df_finale = None
if os.path.exists(file_schedule):
    # CONVERTI - include TUTTE le partite (Giocate + Future)
    df_finale = converti_per_gesssai(file_schedule, file_stats, output_file)
    
    # GENERA JSON UNICO - include TUTTE le partite in un unico file
    if df_finale is not None and not df_finale.empty:
        print("\n📱 Generazione JSON unico con tutte le partite...")
        genera_json_per_app(df_finale, output_folder, data_folder)
else:
    print("\n⚠️ File Tutti_Schedule.xlsx non trovato.")

# ============================================
# RIEPILOGO FINALE
# ============================================
print("\n" + "=" * 70)
print("🏁 PROCESSO COMPLETATO!")
print("=" * 70)

print(f"\n📊 Riepilogo generale:")
print(f"   📥 Download: {download_success} successi, {download_errors} errori")
print(f"   🔄 Conversione: {converted} successi, {errors} errori")
print(f"\n📂 File Excel salvati in: {output_folder}")

excel_files = glob.glob(os.path.join(output_folder, "*.xlsx"))
if excel_files:
    print(f"\n📁 File creati ({len(excel_files)}):")
    for file in sorted(excel_files):
        dimensione = os.path.getsize(file) / 1024
        nome = os.path.basename(file)
        if nome.startswith("Tutti_"):
            print(f"   ⭐ {nome} ({dimensione:.1f} KB) - UNIFICATO")
        elif nome.startswith("GesssAI"):
            print(f"   🚀 {nome} ({dimensione:.1f} KB) - PRONTO PER APP")
        else:
            print(f"   - {nome} ({dimensione:.1f} KB)")

# Controlla il file nella cartella data
data_json = os.path.join(data_folder, "matches.json")
if os.path.exists(data_json):
    dimensione = os.path.getsize(data_json) / 1024
    # Conta le partite
    try:
        with open(data_json, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
            matches_count = len(json_data.get('matches', []))
            giocate = sum(1 for m in json_data.get('matches', []) if m.get('stato') == 'Giocata')
            future = matches_count - giocate
            print(f"   📱 data/matches.json ({dimensione:.1f} KB) - {matches_count} partite totali ({giocate} Giocate, {future} Future) - PRONTO PER GITHUB PAGES")
    except:
        print(f"   📱 data/matches.json ({dimensione:.1f} KB) - PRONTO PER GITHUB PAGES")

print("\n" + "=" * 70)
if IN_GITHUB_ACTIONS:
    print("✅ Esecuzione su GitHub Actions completata!")
else:
    print("🔴 Premere un tasto per uscire...")
    input()
    print("\n👋 Arrivederci!")