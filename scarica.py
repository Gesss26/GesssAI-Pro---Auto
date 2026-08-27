import json
import requests
from datetime import datetime
from typing import List, Dict
import os
import sys
import subprocess
import shutil
import time
import re

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False
    print("⚠️ openpyxl non installato. Installa con: pip install openpyxl")

# ===== LISTA COMPLETA CAMPIONATI =====
LEAGUES = [
    {'name': 'Liga Profesional', 'url': 'https://www.matchesio.com/it/competition/liga-profesional-argentina-ar/export/json/'},
    {'name': 'Jupiler Pro League', 'url': 'https://www.matchesio.com/it/competition/jupiler-pro-league-be/export/json/'},
    {'name': 'Serie A (Brasile)', 'url': 'https://www.matchesio.com/it/competition/serie-a-br/export/json/'},
    {'name': 'Super League', 'url': 'https://www.matchesio.com/it/competition/super-league/export/json/'},
    {'name': 'Premier League', 'url': 'https://www.matchesio.com/it/competition/premier-league-gb-eng/export/json/'},
    {'name': 'Championship', 'url': 'https://www.matchesio.com/it/competition/championship-gb-eng/export/json/'},
    {'name': 'Eredivisie', 'url': 'https://www.matchesio.com/it/competition/eredivisie-nl/export/json/'},
    {'name': 'Ligue 1', 'url': 'https://www.matchesio.com/it/competition/ligue-1-fr/export/json/'},
    {'name': 'Ligue 2', 'url': 'https://www.matchesio.com/it/competition/ligue-2-fr/export/json/'},
    {'name': 'Bundesliga', 'url': 'https://www.matchesio.com/it/competition/bundesliga-de/export/json/'},
    {'name': '2. Bundesliga', 'url': 'https://www.matchesio.com/it/competition/2-bundesliga-de/export/json/'},
    {'name': 'J1 League', 'url': 'https://www.matchesio.com/it/competition/j1-league/export/json/'},
    {'name': 'Serie A (Italia)', 'url': 'https://www.matchesio.com/it/competition/serie-a-it/export/json/'},
    {'name': 'Serie B', 'url': 'https://www.matchesio.com/it/competition/serie-b-it/export/json/'},
    {'name': 'Serie C - Girone A', 'url': 'https://www.matchesio.com/it/competition/serie-c-girone-a-it/export/json/'},
    {'name': 'Serie C - Girone B', 'url': 'https://www.matchesio.com/it/competition/serie-c-girone-b-it/export/json/'},
    {'name': 'Serie C - Girone C', 'url': 'https://www.matchesio.com/it/competition/serie-c-girone-c-it/export/json/'},
    {'name': 'Serie A Women', 'url': 'https://www.matchesio.com/it/competition/serie-a-women-it/export/json/'},
    {'name': 'K League 1', 'url': 'https://www.matchesio.com/it/competition/k-league/export/json/'},
    {'name': 'Eerste Divisie', 'url': 'https://www.matchesio.com/it/competition/eerste-divisie-nl/export/json/'},
    {'name': 'Primeira Liga', 'url': 'https://www.matchesio.com/it/competition/primeira-liga-pt/export/json/'},
    {'name': 'Premiership', 'url': 'https://www.matchesio.com/it/competition/premiership-gb-sct/export/json/'},
    {'name': 'LaLiga', 'url': 'https://www.matchesio.com/it/competition/la-liga-es/export/json/'},
    {'name': 'Segunda División', 'url': 'https://www.matchesio.com/it/competition/segunda-division-es/export/json/'},
    {'name': 'Süper Lig', 'url': 'https://www.matchesio.com/it/competition/super-lig-tr/export/json/'},
    {'name': 'Major League Soccer', 'url': 'https://www.matchesio.com/it/competition/major-league-soccer-us/export/json/'},
]

# ===== CONFIGURAZIONE GITHUB =====
GITHUB_REPO_PATH = r"D:\ai\gesssai-pro---auto"
GITHUB_REMOTE = "origin"
GITHUB_BRANCH = "master"
GITHUB_FOLDER = "json"
REPO_JSON_PATH = os.path.join(GITHUB_REPO_PATH, GITHUB_FOLDER)

def convert_date_to_italian(date_str: str) -> str:
    """Converte una data da YYYY-MM-DD a DD/MM/YYYY."""
    if not date_str:
        return ''
    date_str = str(date_str)
    
    # Se è già DD/MM/YYYY
    if re.match(r'^\d{2}/\d{2}/\d{4}$', date_str):
        return date_str
    
    # Se è YYYY-MM-DD
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_str)
    if match:
        return f"{match.group(3)}/{match.group(2)}/{match.group(1)}"
    
    return date_str

def parse_date_for_sorting(date_str: str) -> str:
    """Converte DD/MM/YYYY in YYYY-MM-DD per l'ordinamento."""
    if not date_str:
        return '9999-99-99'
    
    # Se è DD/MM/YYYY
    match = re.search(r'(\d{2})/(\d{2})/(\d{4})', date_str)
    if match:
        return f"{match.group(3)}-{match.group(2)}-{match.group(1)}"
    
    return date_str

def parse_matches_from_json(data, league_name: str) -> List[Dict]:
    """Estrae le partite dal JSON."""
    matches = []
    
    if not isinstance(data, list):
        print(f"   ⚠️ Il JSON non è una lista, è {type(data)}")
        return []
    
    print(f"   📊 Trovate {len(data)} partite")
    
    for match in data:
        if not isinstance(match, dict):
            continue
        
        # === SQUADRE ===
        home_team = match.get('homeTeam', '') or match.get('home_team', '') or ''
        away_team = match.get('awayTeam', '') or match.get('away_team', '') or ''
        
        # === DATA ===
        date_raw = match.get('date', '')
        date_str = convert_date_to_italian(date_raw)
        
        # === ORA ===
        time_str = match.get('time', '')
        
        # === GIORNATA ===
        matchday = match.get('matchday', '')
        
        # === RISULTATO E GOL ===
        result_str = match.get('result', '')
        home_score = ''
        away_score = ''
        result = ''
        
        if result_str:
            # Gestisce sia "1-1" che "1–1"
            result_clean = result_str.replace('–', '-')
            if '-' in result_clean:
                parts = result_clean.split('-')
                if len(parts) == 2:
                    home_score = parts[0].strip()
                    away_score = parts[1].strip()
                    result = f"{home_score}–{away_score}"
            else:
                result = result_str
        
        # === STATO ===
        status = match.get('status', '').lower()
        
        # Mappa lo stato dal JSON allo stato italiano
        if status in ['giocata', 'played', 'finished', 'complete', 'completed', 'ft']:
            status_ita = 'Giocata'
        elif status in ['da giocare', 'scheduled', 'upcoming', 'future', 'not started', '']:
            if home_score and away_score:
                status_ita = 'Giocata'
            else:
                status_ita = 'Futura'
        elif status in ['in corso', 'live', 'in progress']:
            status_ita = 'In corso'
        elif status in ['posticipata', 'postponed']:
            status_ita = 'Posticipata'
        else:
            status_ita = 'Futura'
        
        # === CITTÀ E STADIO ===
        city = match.get('city', '')
        stadium = match.get('stadium', '')
        
        # Campo per l'ordinamento (non visibile nell'Excel)
        sort_date = parse_date_for_sorting(date_str)
        
        matches.append({
            'campionato': league_name,
            'data': date_str,
            'ora': time_str,
            'giornata': str(matchday),
            'squadra_casa': home_team.title() if home_team else '',
            'squadra_ospite': away_team.title() if away_team else '',
            'risultato': result,
            'gol_casa': home_score,
            'gol_ospite': away_score,
            'citta': city.title() if city else '',
            'stadio': stadium,
            'stato': status_ita,
            '_sort_date': sort_date  # Campo nascosto per ordinamento
        })
    
    return matches

def sort_matches_by_date(all_matches: List[Dict]) -> List[Dict]:
    """
    Ordina le partite per data cronologica.
    Prima ordina per data (YYYY-MM-DD), poi per campionato.
    """
    # Rimuovi eventuali duplicati
    unique_matches = []
    seen = set()
    
    for match in all_matches:
        # Crea una chiave unica per ogni partita
        key = (match['campionato'], match['data'], match['ora'], 
               match['squadra_casa'], match['squadra_ospite'])
        if key not in seen:
            seen.add(key)
            unique_matches.append(match)
    
    # Ordina per data (cronologico) e poi per campionato
    unique_matches.sort(key=lambda x: (x['_sort_date'], x['campionato']))
    
    # Rimuovi i campi di ordinamento
    for match in unique_matches:
        match.pop('_sort_date', None)
    
    return unique_matches

def fetch_league_json(url: str, league_name: str) -> List[Dict]:
    """Scarica il JSON da un campionato."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, timeout=30, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        matches = parse_matches_from_json(data, league_name)
        return matches
    except Exception as e:
        print(f"❌ Errore nel download di {league_name}: {e}")
        return []

def save_excel(all_matches: List[Dict]) -> str:
    """Salva i dati in Excel (.xlsx)."""
    if not all_matches or not EXCEL_AVAILABLE:
        return None
    
    try:
        os.makedirs(REPO_JSON_PATH, exist_ok=True)
        
        # Ordina le partite per data prima di salvare
        all_matches = sort_matches_by_date(all_matches)
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Calcio"
        
        headers = ['Campionato', 'Data', 'Ora', 'Giornata', 'Squadra Casa', 'Squadra Ospite', 
                   'Risultato', 'Gol Casa', 'Gol Ospite', 'Città', 'Stadio', 'Stato']
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="1D4ED8", end_color="1D4ED8", fill_type="solid")
            cell.alignment = Alignment(horizontal="center", vertical="center")
        
        for row, match in enumerate(all_matches, 2):
            ws.cell(row=row, column=1, value=match['campionato'])
            ws.cell(row=row, column=2, value=match['data'])
            ws.cell(row=row, column=3, value=match['ora'])
            ws.cell(row=row, column=4, value=match['giornata'])
            ws.cell(row=row, column=5, value=match['squadra_casa'])
            ws.cell(row=row, column=6, value=match['squadra_ospite'])
            ws.cell(row=row, column=7, value=match['risultato'])
            ws.cell(row=row, column=8, value=match['gol_casa'] if match['gol_casa'] else None)
            ws.cell(row=row, column=9, value=match['gol_ospite'] if match['gol_ospite'] else None)
            ws.cell(row=row, column=10, value=match['citta'])
            ws.cell(row=row, column=11, value=match.get('stadio', ''))
            ws.cell(row=row, column=12, value=match['stato'])
        
        column_widths = [25, 15, 10, 10, 22, 22, 12, 10, 10, 18, 25, 12]
        for i, width in enumerate(column_widths, 1):
            ws.column_dimensions[chr(64 + i)].width = width
        
        excel_path = os.path.join(REPO_JSON_PATH, 'GesssAI_Input.xlsx')
        temp_path = os.path.join(REPO_JSON_PATH, 'GesssAI_Input_temp.xlsx')
        
        if os.path.exists(excel_path):
            try:
                os.remove(excel_path)
            except:
                pass
        
        wb.save(temp_path)
        wb.close()
        del wb
        
        time.sleep(1)
        
        try:
            os.rename(temp_path, excel_path)
        except:
            excel_path = temp_path
        
        return excel_path if os.path.exists(excel_path) else None
    except Exception as e:
        print(f"⚠️ Errore nel salvataggio Excel: {e}")
        return None

def save_json(all_matches: List[Dict]):
    """Salva i dati in JSON."""
    if not all_matches:
        return None, None
    
    try:
        os.makedirs(REPO_JSON_PATH, exist_ok=True)
        
        # Ordina le partite per data prima di salvare
        all_matches = sort_matches_by_date(all_matches)
        
        json_path = os.path.join(REPO_JSON_PATH, 'GesssAI_Input.json')
        temp_json_path = os.path.join(REPO_JSON_PATH, 'GesssAI_Input_temp.json')
        
        if os.path.exists(json_path):
            try:
                os.remove(json_path)
            except:
                pass
        
        with open(temp_json_path, 'w', encoding='utf-8') as f:
            json.dump(all_matches, f, ensure_ascii=False, indent=2)
        
        try:
            os.rename(temp_json_path, json_path)
        except:
            json_path = temp_json_path
        
        raw_json_path = os.path.join(REPO_JSON_PATH, 'matches.json')
        temp_raw_path = os.path.join(REPO_JSON_PATH, 'matches_temp.json')
        
        if os.path.exists(raw_json_path):
            try:
                os.remove(raw_json_path)
            except:
                pass
        
        with open(temp_raw_path, 'w', encoding='utf-8') as f:
            json.dump(all_matches, f, ensure_ascii=False, indent=2)
        
        try:
            os.rename(temp_raw_path, raw_json_path)
        except:
            raw_json_path = temp_raw_path
        
        time.sleep(0.5)
        
        return json_path, raw_json_path
    except Exception as e:
        print(f"⚠️ Errore nel salvataggio JSON: {e}")
        return None, None

def push_to_github():
    """Esegue git add, commit e push dei file nel repository."""
    if not os.path.exists(GITHUB_REPO_PATH):
        print(f"❌ Repository non trovato in: {GITHUB_REPO_PATH}")
        return False
    
    try:
        current_dir = os.getcwd()
        os.chdir(GITHUB_REPO_PATH)
        
        # Elimina file temporanei
        for f in os.listdir(REPO_JSON_PATH):
            if 'temp' in f:
                try:
                    os.remove(os.path.join(REPO_JSON_PATH, f))
                except:
                    pass
        
        print("\n🔄 Eseguo git add...")
        subprocess.run(['git', 'add', GITHUB_FOLDER + '/'], check=True, capture_output=True)
        print(f"   ✅ File aggiunti")
        
        print("🔄 Eseguo git commit...")
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
        commit_msg = f"Aggiornati dati calcio da matchesio.com ({timestamp})"
        
        commit_result = subprocess.run(['git', 'commit', '-m', commit_msg], 
                                      capture_output=True, text=True)
        
        if "nothing to commit" in commit_result.stdout:
            print("   ℹ️ Nessuna modifica da committare")
            os.chdir(current_dir)
            return True
        
        print("   ✅ Commit effettuato")
        
        print(f"🔄 Eseguo git push a {GITHUB_REMOTE}/{GITHUB_BRANCH}...")
        result = subprocess.run(['git', 'push', GITHUB_REMOTE, GITHUB_BRANCH], 
                               capture_output=True, text=True)
        
        if result.returncode == 0:
            print("\n✅ FILE INVIATI CON SUCCESSO SU GITHUB!")
            print(f"   📁 Visualizza: https://github.com/Gesss26/GesssAI-Pro---Auto/tree/{GITHUB_BRANCH}/{GITHUB_FOLDER}")
            os.chdir(current_dir)
            return True
        else:
            print(f"\n❌ Errore durante il push: {result.stderr}")
            os.chdir(current_dir)
            return False
    except Exception as e:
        print(f"\n❌ Errore: {e}")
        return False

def main():
    print("="*70)
    print("🚀 Avvio download calendari calcio da matchesio.com...")
    print(f"📋 {len(LEAGUES)} campionati da scaricare")
    print(f"📁 I file verranno salvati in: {REPO_JSON_PATH}")
    print("="*70)
    print()
    
    all_matches = []
    errors = []
    
    os.makedirs(REPO_JSON_PATH, exist_ok=True)
    
    for i, league in enumerate(LEAGUES, 1):
        league_name = league['name']
        print(f"⏳ [{i:2d}/{len(LEAGUES)}] Scaricando {league_name}...")
        
        matches = fetch_league_json(league['url'], league_name)
        
        if matches:
            all_matches.extend(matches)
            giocate = sum(1 for m in matches if m['stato'] == 'Giocata')
            future = sum(1 for m in matches if m['stato'] == 'Futura')
            print(f"   ✅ {len(matches)} partite ({giocate} giocate, {future} future)")
        else:
            errors.append(league_name)
            print(f"   ❌ Nessuna partita trovata")
        
        time.sleep(0.5)
    
    if all_matches:
        print("\n💾 Salvataggio file in ordine cronologico per data...")
        
        excel_path = save_excel(all_matches)
        json_path, raw_json_path = save_json(all_matches)
        
        # Verifica file salvati
        if excel_path and os.path.exists(excel_path):
            print(f"   ✅ GesssAI_Input.xlsx ({os.path.getsize(excel_path):,} bytes)")
        else:
            print(f"   ❌ GesssAI_Input.xlsx non creato")
        
        if json_path and os.path.exists(json_path):
            print(f"   ✅ GesssAI_Input.json ({os.path.getsize(json_path):,} bytes)")
        else:
            print(f"   ❌ GesssAI_Input.json non creato")
        
        if raw_json_path and os.path.exists(raw_json_path):
            print(f"   ✅ matches.json ({os.path.getsize(raw_json_path):,} bytes)")
        else:
            print(f"   ❌ matches.json non creato")
        
        # Statistiche finali
        print("\n" + "="*70)
        print("📊 STATISTICHE FINALI")
        print("="*70)
        
        giocate = sum(1 for m in all_matches if m['stato'] == 'Giocata')
        future = sum(1 for m in all_matches if m['stato'] == 'Futura')
        
        print(f"   • Partite totali: {len(all_matches):,}")
        print(f"   • Giocate: {giocate:,}")
        print(f"   • Future: {future:,}")
        
        print("\n📋 DISTRIBUZIONE PER CAMPIONATO:")
        league_counts = {}
        for match in all_matches:
            league = match['campionato']
            league_counts[league] = league_counts.get(league, 0) + 1
        
        for league, count in sorted(league_counts.items()):
            print(f"   • {league}: {count:,} partite")
        
        # Mostra le prime e ultime date
        # Nota: i campi _sort_date sono già stati rimossi da sort_matches_by_date
        print(f"\n📅 Le partite sono in ordine cronologico dalla prima all'ultima data.")
        
        if errors:
            print(f"\n⚠️ Campionati senza partite ({len(errors)}):")
            for e in errors:
                print(f"   • {e}")
        
        print("\n📤 INVIO SU GITHUB...")
        push_to_github()
    else:
        print("\n❌ Nessuna partita scaricata.")
    
    print("\n" + "="*70)
    input("\n🔄 Premi ENTER per uscire...")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()
        input("\n🔄 Premi ENTER per uscire...")