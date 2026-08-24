import os
import pandas as pd
from bs4 import BeautifulSoup
import glob
import re
import json
from datetime import datetime

# ============================================
# CONFIGURAZIONE
# ============================================
download_folder = r"d:\ai\siti_da_fbref"
output_folder = r"d:\ai\excel"
data_folder = r"d:\ai\gesssai-pro-auto\data"
os.makedirs(output_folder, exist_ok=True)
os.makedirs(data_folder, exist_ok=True)

print("\n" + "=" * 70)
print("📊 CONVERSIONE HTML → EXCEL + JSON (COMPLETO)")
print("=" * 70)

# ============================================
# FUNZIONE PER ESTRARRE STATS
# ============================================
def estrai_stats(html_content):
    """Estrae TUTTE le colonne dalla tabella Stats"""
    soup = BeautifulSoup(html_content, 'html.parser')
    stats = []
    
    table = soup.find('table', {'id': 'stats_standard'})
    if not table:
        for t in soup.find_all('table'):
            if 'Rk' in t.text and 'Squad' in t.text:
                table = t
                break
    
    if not table:
        return None
    
    rows = table.find_all('tr')
    header_row = None
    
    for row in rows:
        cells = row.find_all(['th', 'td'])
        header_text = ' '.join([c.get_text(strip=True) for c in cells])
        if 'Rk' in header_text and 'Squad' in header_text:
            header_row = cells
            break
    
    if not header_row:
        return None
    
    col_names = []
    for cell in header_row:
        name = cell.get_text(strip=True)
        col_names.append(name if name else f"Col_{len(col_names)}")
    
    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 3:
            continue
        
        try:
            rk = cells[0].get_text(strip=True)
            if not rk or rk == 'Rk':
                continue
            
            row_data = {}
            for idx, cell in enumerate(cells):
                if idx < len(col_names):
                    row_data[col_names[idx]] = cell.get_text(strip=True)
                else:
                    row_data[f"Col_{idx}"] = cell.get_text(strip=True)
            
            stats.append(row_data)
        except:
            continue
    
    return stats

# ============================================
# FUNZIONE PER ESTRARRE SCHEDULE (MIGLIORATA!)
# ============================================
def estrai_schedule(html_content):
    """Estrae le colonne: Wk, Day, Date, Time, Home, Score, Away (con Wk corretto)"""
    soup = BeautifulSoup(html_content, 'html.parser')
    matches = []
    
    # Cerca la tabella Schedule
    table = None
    schedule_div = soup.find('div', {'id': 'div_schedule'})
    if schedule_div:
        table = schedule_div.find('table')
    
    if not table:
        for t in soup.find_all('table'):
            if 'Scores & Fixtures' in t.text or 'Schedule' in t.text:
                table = t
                break
    
    if not table:
        for t in soup.find_all('table'):
            if 'Date' in t.text and 'Opponent' in t.text:
                table = t
                break
    
    if not table:
        return None
    
    rows = table.find_all('tr')
    
    # ============================================
    # TROVA L'HEADER E GLI INDICI DELLE COLONNE
    # ============================================
    header_row = None
    header_index = None
    
    for idx, row in enumerate(rows):
        cells = row.find_all(['th', 'td'])
        header_text = ' '.join([c.get_text(strip=True) for c in cells])
        if 'Date' in header_text and ('Opponent' in header_text or 'Home' in header_text):
            header_row = cells
            header_index = idx
            break
    
    if not header_row:
        # Se non trova l'header, usa la prima riga
        if rows:
            header_row = rows[0].find_all(['th', 'td'])
            header_index = 0
    
    # ============================================
    # MAPPA PRECISA DELLE COLONNE
    # ============================================
    col_names = []
    wk_index = None
    day_index = None
    date_index = None
    time_index = None
    home_index = None
    score_index = None
    away_index = None
    
    if header_row:
        for idx, cell in enumerate(header_row):
            name = cell.get_text(strip=True)
            col_names.append(name if name else f"Col_{idx}")
            name_lower = name.lower()
            
            if 'wk' in name_lower or 'round' in name_lower or 'giornata' in name_lower:
                wk_index = idx
            elif 'day' in name_lower:
                day_index = idx
            elif 'date' in name_lower:
                date_index = idx
            elif 'time' in name_lower:
                time_index = idx
            elif 'home' in name_lower or 'team' in name_lower:
                home_index = idx
            elif 'score' in name_lower or 'result' in name_lower:
                score_index = idx
            elif 'away' in name_lower or 'opponent' in name_lower:
                away_index = idx
    
    # ============================================
    # SE NON TROVA LE COLONNE, USA POSIZIONI FISSE
    # ============================================
    if wk_index is None:
        wk_index = 0
    if day_index is None:
        day_index = 1
    if date_index is None:
        date_index = 2
    if time_index is None:
        time_index = 3
    if home_index is None:
        home_index = 4
    if score_index is None:
        score_index = 5
    if away_index is None:
        away_index = 6
    
    # ============================================
    # VARIABILI PER TENERE TRACCIA DEL WK CORRENTE
    # ============================================
    current_wk = ''
    current_day = ''
    current_date = ''
    
    # ============================================
    # SCORRI LE RIGHE (SALTANDO L'HEADER)
    # ============================================
    for row_idx, row in enumerate(rows):
        # Salta la riga dell'header
        if row_idx == header_index:
            continue
        
        cells = row.find_all('td')
        if not cells or len(cells) < 3:
            continue
        
        try:
            # Estrai i valori grezzi
            wk_raw = cells[wk_index].get_text(strip=True) if wk_index < len(cells) else ''
            day_raw = cells[day_index].get_text(strip=True) if day_index < len(cells) else ''
            date_raw = cells[date_index].get_text(strip=True) if date_index < len(cells) else ''
            time = cells[time_index].get_text(strip=True) if time_index < len(cells) else ''
            home = cells[home_index].get_text(strip=True) if home_index < len(cells) else ''
            score = cells[score_index].get_text(strip=True) if score_index < len(cells) else ''
            away = cells[away_index].get_text(strip=True) if away_index < len(cells) else ''
            
            # Salta righe che non contengono dati validi
            if not date_raw and not home and not away:
                continue
            if home in ['Home', 'Opponent', 'Squad']:
                continue
            if date_raw in ['Date', 'Data']:
                continue
            
            # ============================================
            # GESTISCI WK - CERCA IN TUTTI I MODI POSSIBILI
            # ============================================
            wk = ''
            
            # 1. Prova da wk_raw (se ha un valore)
            if wk_raw and wk_raw.strip():
                # Se è un numero o contiene un numero
                if wk_raw.isdigit() or re.search(r'\d+', wk_raw):
                    wk = wk_raw.strip()
                    current_wk = wk
                else:
                    # Se non è un numero, cerca un numero nella stringa
                    num_match = re.search(r'(\d+)', wk_raw)
                    if num_match:
                        wk = num_match.group(1)
                        current_wk = wk
            
            # 2. Se ancora vuoto, cerca in day_raw (a volte il round è indicato come "Round X")
            if not wk and day_raw:
                round_match = re.search(r'Round\s*(\d+)', day_raw, re.IGNORECASE)
                if round_match:
                    wk = round_match.group(1)
                    current_wk = wk
            
            # 3. Se ancora vuoto, cerca in date_raw (a volte c'è "Matchday X")
            if not wk and date_raw:
                matchday_match = re.search(r'Matchday\s*(\d+)', date_raw, re.IGNORECASE)
                if matchday_match:
                    wk = matchday_match.group(1)
                    current_wk = wk
            
            # 4. Se ancora vuoto, usa il current_wk (ultimo valido)
            if not wk:
                wk = current_wk
            
            # ============================================
            # GESTISCI DAY
            # ============================================
            day = ''
            if day_raw and day_raw.strip():
                day = day_raw.strip()
                current_day = day
            else:
                day = current_day
            
            # ============================================
            # GESTISCI DATE
            # ============================================
            date = ''
            if date_raw and date_raw.strip():
                date = date_raw.strip()
                current_date = date
            else:
                date = current_date
            
            # ============================================
            # CREA IL DIZIONARIO
            # ============================================
            row_data = {}
            for idx, cell in enumerate(cells):
                if idx < len(col_names):
                    col_name = col_names[idx]
                else:
                    col_name = f"Col_{idx}"
                
                value = cell.get_text(strip=True)
                
                # Sostituisci con i valori elaborati per le colonne identificate
                if idx == wk_index:
                    value = wk
                elif idx == day_index:
                    value = day
                elif idx == date_index:
                    value = date
                elif idx == time_index:
                    value = time
                elif idx == home_index:
                    value = home
                elif idx == score_index:
                    value = score
                elif idx == away_index:
                    value = away
                
                row_data[col_name] = value
            
            matches.append(row_data)
        
        except Exception as e:
            print(f"   ⚠️ Errore riga {row_idx}: {e}")
            continue
    
    return matches

# ============================================
# SALVA EXCEL
# ============================================
def salva_excel(df, nome_file, output_folder):
    try:
        excel_path = os.path.join(output_folder, nome_file)
        with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Dati', index=False)
        print(f"   ✅ Salvato: {nome_file} ({len(df)} righe)")
        return excel_path
    except Exception as e:
        print(f"   ❌ Errore: {e}")
        return None

# ============================================
# FUNZIONE PER CONVERTIRE LA DATA
# ============================================
def converti_data(data_str):
    """Converte la data da formato americano (YYYY-MM-DD) a europeo (DD/MM/YYYY)"""
    if not data_str or data_str == '' or data_str == 'nan':
        return ''
    
    try:
        dt = datetime.strptime(data_str, '%Y-%m-%d')
        return dt.strftime('%d/%m/%Y')
    except ValueError:
        try:
            dt = datetime.strptime(data_str, '%m/%d/%Y')
            return dt.strftime('%d/%m/%Y')
        except ValueError:
            return data_str

# ============================================
# GENERA GesssAI_Input.xlsx (CORRETTO!)
# ============================================
def genera_gesssai_input(file_schedule, output_folder):
    """Converte in formato GesssAI con Wk popolato e data in formato europeo"""
    try:
        print("\n📱 Generazione GesssAI_Input.xlsx...")
        df = pd.read_excel(file_schedule)
        print(f"   📅 Lette {len(df)} righe")
        print(f"   📋 Colonne disponibili: {list(df.columns)}")
        
        # Identifica le colonne - VERSIONE MIGLIORATA
        col_campionato = None
        col_wk = None
        col_data = None
        col_time = None
        col_home = None
        col_away = None
        col_score = None
        
        for col in df.columns:
            col_lower = col.lower().strip()
            
            # Cerca Campionato
            if 'campionato' in col_lower or 'league' in col_lower:
                col_campionato = col
            
            # Cerca Wk - VERSIONE PIÙ FLESSIBILE
            elif col_lower == 'wk' or col_lower == 'w.k.' or col_lower == 'week':
                col_wk = col
            elif 'giornata' in col_lower or 'round' in col_lower or 'matchday' in col_lower:
                col_wk = col
            
            # Cerca Data
            elif 'date' in col_lower or 'data' in col_lower:
                col_data = col
            
            # Cerca Ora/Time
            elif 'time' in col_lower or 'ora' in col_lower or 'hour' in col_lower:
                col_time = col
            
            # Cerca Home/Casa
            elif 'home' in col_lower or 'casa' in col_lower:
                col_home = col
            
            # Cerca Away/Ospite
            elif 'away' in col_lower or 'ospite' in col_lower or 'guest' in col_lower:
                col_away = col
            
            # Cerca Score/Risultato
            elif 'score' in col_lower or 'result' in col_lower or 'risultato' in col_lower:
                col_score = col
        
        # SE NON TROVA WK, PROVA TUTTE LE COLONNE POSSIBILI
        if col_wk is None:
            # Prova a cercare una colonna che contenga numeri sequenziali
            for col in df.columns:
                if col not in [col_campionato, col_data, col_time, col_home, col_away, col_score]:
                    # Controlla se i valori sono numerici
                    sample_values = df[col].dropna().head(5)
                    if all(str(v).isdigit() for v in sample_values if str(v).strip()):
                        col_wk = col
                        print(f"      🔍 Trovata colonna numerica probabile per Wk: {col}")
                        break
        
        # Se ancora non trova Wk, usa la seconda colonna come fallback
        if col_wk is None and len(df.columns) > 1:
            col_wk = df.columns[1]
            print(f"      ⚠️ Wk non trovato automaticamente, uso colonna: {col_wk}")
        
        print(f"\n   🔍 Colonne identificate:")
        print(f"      Campionato: {col_campionato}")
        print(f"      Wk: {col_wk}")
        print(f"      Data: {col_data}")
        print(f"      Ora: {col_time}")
        print(f"      Home: {col_home}")
        print(f"      Away: {col_away}")
        print(f"      Score: {col_score}")
        
        risultati = []
        last_valid_wk = ''
        
        for index, row in df.iterrows():
            try:
                campionato = str(row.get(col_campionato, '')).strip() if col_campionato else 'Sconosciuto'
                if campionato == 'nan' or campionato == 'None' or campionato == '':
                    campionato = 'Sconosciuto'
                
                # LEGGI WK - VERSIONE MIGLIORATA
                wk_raw = str(row.get(col_wk, '')).strip() if col_wk else ''
                
                if wk_raw == 'nan' or wk_raw == 'None' or wk_raw == '' or wk_raw == '0':
                    wk = last_valid_wk
                else:
                    # Se il valore è un numero, usalo
                    if wk_raw.isdigit():
                        wk = wk_raw
                        last_valid_wk = wk
                    else:
                        # Cerca un numero nella stringa
                        num_match = re.search(r'(\d+)', wk_raw)
                        if num_match:
                            wk = num_match.group(1)
                            last_valid_wk = wk
                        else:
                            wk = last_valid_wk
                
                # CONVERTI DATA
                data_raw = str(row.get(col_data, '')).strip() if col_data else ''
                if data_raw == 'nan' or data_raw == 'None' or data_raw == '':
                    data = ''
                else:
                    data = converti_data(data_raw)
                
                # ALTRI CAMPI
                ora = str(row.get(col_time, '')).strip() if col_time else ''
                if ora == 'nan' or ora == 'None':
                    ora = ''
                
                casa = str(row.get(col_home, '')).strip() if col_home else ''
                if casa == 'nan' or casa == 'None':
                    casa = ''
                
                ospite = str(row.get(col_away, '')).strip() if col_away else ''
                if ospite == 'nan' or ospite == 'None':
                    ospite = ''
                
                score = str(row.get(col_score, '')).strip() if col_score else ''
                if score == 'nan' or score == 'None':
                    score = ''
                
                # ANALIZZA RISULTATO
                gol_casa = 0
                gol_ospite = 0
                stato = 'Futura'
                risultato = ''
                
                if score and score != '':
                    match = re.search(r'(\d+)\s*[-–:\.]\s*(\d+)', score)
                    if match:
                        gol_casa = int(match.group(1))
                        gol_ospite = int(match.group(2))
                        risultato = f"{gol_casa}-{gol_ospite}"
                        stato = 'Giocata'
                
                if casa and casa != '' and ospite and ospite != '':
                    risultati.append({
                        'Campionato': campionato,
                        'Numero Giornata (Wk)': wk,
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
                print(f"   ⚠️ Errore riga {index}: {e}")
                continue
        
        df_finale = pd.DataFrame(risultati)
        
        if df_finale.empty:
            print("   ❌ Nessuna partita elaborata!")
            return None
        
        # Rimuovi duplicati e ordina
        df_finale = df_finale.drop_duplicates(subset=['Campionato', 'Data', 'Squadra Casa', 'Squadra Ospite'])
        df_finale = df_finale.sort_values(['Campionato', 'Data'])
        
        output_path = os.path.join(output_folder, 'GesssAI_Input.xlsx')
        df_finale.to_excel(output_path, index=False)
        
        giocate = len(df_finale[df_finale['Stato'] == 'Giocata'])
        future = len(df_finale) - giocate
        
        print(f"\n   ✅ GesssAI_Input.xlsx creato ({len(df_finale)} partite)")
        print(f"      🟢 Giocate: {giocate}")
        print(f"      🔵 Future: {future}")
        
        print("\n   📋 Anteprima prime 10 righe:")
        preview_df = df_finale[['Campionato', 'Numero Giornata (Wk)', 'Data', 'Squadra Casa', 'Squadra Ospite']].head(10)
        print(preview_df.to_string(index=False))
        
        return df_finale
        
    except Exception as e:
        print(f"   ❌ Errore: {e}")
        import traceback
        traceback.print_exc()
        return None

# ============================================
# GENERA JSON
# ============================================
def genera_json(df, output_folder, data_folder):
    """Genera i file JSON per l'app"""
    try:
        print("\n📱 Generazione JSON...")
        matches_data = []
        campionati_set = set()
        
        for _, row in df.iterrows():
            try:
                campionato = str(row.get('Campionato', 'Sconosciuto')).strip()
                if campionato == 'nan' or campionato == 'None' or campionato == '':
                    campionato = 'Sconosciuto'
                campionati_set.add(campionato)
                
                data = str(row.get('Data', '')).strip()
                if data == 'nan' or data == 'None':
                    data = ''
                
                ora = str(row.get('Ora', '')).strip()
                if ora == 'nan' or ora == 'None':
                    ora = ''
                
                casa = str(row.get('Squadra Casa', '')).strip()
                if casa == 'nan' or casa == 'None':
                    casa = ''
                
                ospite = str(row.get('Squadra Ospite', '')).strip()
                if ospite == 'nan' or ospite == 'None':
                    ospite = ''
                
                wk = str(row.get('Numero Giornata (Wk)', '')).strip()
                if wk == 'nan' or wk == 'None':
                    wk = ''
                
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
                
                risultato = f"{gol_casa}-{gol_ospite}" if stato == 'Giocata' else ""
                
                if not casa or not ospite:
                    continue
                
                id_parts = [
                    campionato.replace(' ', '_'),
                    data.replace('/', '_') if data else 'nodate',
                    casa.replace(' ', '_'),
                    ospite.replace(' ', '_')
                ]
                match_id = "_".join(id_parts)
                
                match_data = {
                    "id": match_id,
                    "campionato": campionato,
                    "round": wk,
                    "data": data,
                    "ora": ora,
                    "casa": casa,
                    "ospiti": ospite,
                    "stato": stato,
                    "golCasa": gol_casa,
                    "golOspite": gol_ospite,
                    "risultato": risultato,
                    "citta": "N/D"
                }
                
                matches_data.append(match_data)
            
            except:
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
        
        output_path = os.path.join(output_folder, 'GesssAI_Input.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ GesssAI_Input.json salvato in: {output_path}")
        
        data_path = os.path.join(data_folder, 'matches.json')
        with open(data_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   ✅ matches.json salvato in: {data_path}")
        
        giocate = sum(1 for m in matches_data if m.get('stato') == 'Giocata')
        future = len(matches_data) - giocate
        
        print(f"\n   📊 {len(matches_data)} partite totali")
        print(f"   🏆 {len(campionati_set)} campionati")
        print(f"   🟢 Giocate: {giocate}")
        print(f"   🔵 Future: {future}")
        
        return data_path
    
    except Exception as e:
        print(f"   ❌ Errore: {e}")
        return None

# ============================================
# UNISCI FILE
# ============================================
def unisci_file_excel(output_folder, tipo):
    """Unisce tutti i file Excel dello stesso tipo"""
    excel_files = glob.glob(os.path.join(output_folder, f"{tipo}.xlsx"))
    excel_files = [f for f in excel_files if not os.path.basename(f).startswith('Tutti_')]
    
    if not excel_files:
        return None
    
    mapping = {
        'Allsvenskan -': 'Allsvenskan',
        'Austrian Bundesliga -': 'Austrian Bundesliga',
        'Bundesliga -': 'Bundesliga',
        'Chinese Super League -': 'Chinese Super League',
        'Danish Superliga -': 'Danish Superliga',
        'Eliteserien -': 'Eliteserien',
        'Eredivisie -': 'Eredivisie',
        'Ireland Premier -': 'Ireland Premier',
        'J1 League -': 'J1 League',
        'K League 1 -': 'K League 1',
        'La Liga -': 'La Liga',
        'Ligue 1 -': 'Ligue 1',
        'Premier League -': 'Premier League',
        'Primeira Liga -': 'Primeira Liga',
        'Russian PL -': 'Russian PL',
        'Serie A -': 'Serie A',
        'Serie B -': 'Serie B',
        'Swiss Super League -': 'Swiss Super League',
        'Veikkausliiga -': 'Veikkausliiga'
    }
    
    df_combined = pd.DataFrame()
    
    for file in excel_files:
        try:
            df_temp = pd.read_excel(file)
            nome_file = os.path.basename(file)
            nome_pulito = nome_file.replace('.xlsx', '').replace(f'_{tipo}', '')
            nome_pulito = nome_pulito.replace('_', ' ')
            
            if nome_pulito in mapping:
                nome_pulito = mapping[nome_pulito]
            
            if ' -' in nome_pulito:
                nome_pulito = nome_pulito.split(' -')[0]
            
            print(f"      - {nome_file} → {nome_pulito}")
            
            df_temp.insert(0, 'Campionato', nome_pulito)
            df_combined = pd.concat([df_combined, df_temp], ignore_index=True)
        
        except Exception as e:
            print(f"      ❌ Errore: {e}")
    
    if df_combined.empty:
        return None
    
    output_path = os.path.join(output_folder, f"Tutti_{tipo}.xlsx")
    df_combined.to_excel(output_path, index=False)
    print(f"\n   ✅ Creato: Tutti_{tipo}.xlsx ({len(df_combined)} righe)")
    
    return output_path

# ============================================
# MAIN
# ============================================
html_files = glob.glob(os.path.join(download_folder, "*.html"))

if not html_files:
    print(f"\n❌ Nessun file HTML trovato in: {download_folder}")
    input("\nPremi INVIO per uscire...")
    exit()

print(f"\n📄 Trovati {len(html_files)} file HTML")
print("-" * 60)

converted_stats = 0
converted_schedule = 0
errors = 0

for html_file in html_files:
    nome = os.path.basename(html_file)
    print(f"\n📄 {nome}")
    
    with open(html_file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    if '_Stats' in nome or '- Stats' in nome:
        dati = estrai_stats(html)
        if dati:
            df = pd.DataFrame(dati)
            excel_name = nome.replace('.html', '.xlsx')
            salva_excel(df, excel_name, output_folder)
            converted_stats += 1
        else:
            print(f"   ❌ Nessun dato Stats")
            errors += 1
    
    elif '_Schedule' in nome or '- Schedule' in nome:
        dati = estrai_schedule(html)
        if dati:
            df = pd.DataFrame(dati)
            excel_name = nome.replace('.html', '.xlsx')
            salva_excel(df, excel_name, output_folder)
            converted_schedule += 1
        else:
            print(f"   ❌ Nessun dato Schedule")
            errors += 1

print(f"\n📊 Conversione: Stats: {converted_stats}, Schedule: {converted_schedule}, Errori: {errors}")

print("\n" + "=" * 70)
print("📊 UNISCI FILE EXCEL")
print("=" * 70)

unisci_file_excel(output_folder, "Stats")
file_schedule = unisci_file_excel(output_folder, "Schedule")

if file_schedule:
    df_finale = genera_gesssai_input(file_schedule, output_folder)
    if df_finale is not None and not df_finale.empty:
        genera_json(df_finale, output_folder, data_folder)
else:
    print("\n⚠️ File Tutti_Schedule.xlsx non trovato!")

print("\n" + "=" * 70)
print("🏁 PROCESSO COMPLETATO!")
print("=" * 70)
print(f"\n📂 File generati:")
print(f"   📁 Excel: {output_folder}")
print(f"   📁 matches.json: {data_folder}")

input("\n🔴 Premere INVIO per uscire...")