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

# ================================================================
# ===== DIZIONARIO DI TRADUZIONE PER I NOMI DELLE SQUADRE =====
# ================================================================
# Questo dizionario traduce i nomi delle squadre come arrivano da matchesio.com
# nei nomi che hai nei tuoi file dei loghi.
# Se vedi un nome che non viene tradotto, aggiungilo qui!
# ================================================================

TEAM_NAME_MAPPING = {
    # ============================================================
    # ITALIA - Serie A
    # ============================================================
    'Inter Milan': 'Inter',
    'Inter': 'Inter',
    'AC Milan': 'Milan',
    'Milan': 'Milan',
    'Atalanta BC': 'Atalanta',
    'Atalanta': 'Atalanta',
    'Juventus FC': 'Juventus',
    'Juventus': 'Juventus',
    'SSC Napoli': 'Napoli',
    'Napoli': 'Napoli',
    'AS Roma': 'Roma',
    'Roma': 'Roma',
    'SS Lazio': 'Lazio',
    'Lazio': 'Lazio',
    'ACF Fiorentina': 'Fiorentina',
    'Fiorentina': 'Fiorentina',
    'Bologna FC': 'Bologna',
    'Bologna': 'Bologna',
    'Torino FC': 'Torino',
    'Torino': 'Torino',
    'Udinese Calcio': 'Udinese',
    'Udinese': 'Udinese',
    'Genoa CFC': 'Genoa',
    'Genoa': 'Genoa',
    'Hellas Verona': 'Verona',
    'Verona': 'Verona',
    'Empoli FC': 'Empoli',
    'Empoli': 'Empoli',
    'Cagliari Calcio': 'Cagliari',
    'Cagliari': 'Cagliari',
    'US Lecce': 'Lecce',
    'Lecce': 'Lecce',
    'AC Monza': 'Monza',
    'Monza': 'Monza',
    'Parma Calcio': 'Parma',
    'Parma': 'Parma',
    'Como 1907': 'Como',
    'Como': 'Como',
    'Venezia FC': 'Venezia',
    'Venezia': 'Venezia',
    
    # ============================================================
    # INGHILTERRA - Premier League
    # ============================================================
    'Arsenal FC': 'Arsenal',
    'Arsenal': 'Arsenal',
    'Aston Villa FC': 'Aston Villa',
    'Aston Villa': 'Aston Villa',
    'AFC Bournemouth': 'Bournemouth',
    'Bournemouth': 'Bournemouth',
    'Brentford FC': 'Brentford',
    'Brentford': 'Brentford',
    'Brighton & Hove Albion': 'Brighton',
    'Brighton and Hove Albion': 'Brighton',
    'Brighton': 'Brighton',
    'Chelsea FC': 'Chelsea',
    'Chelsea': 'Chelsea',
    'Crystal Palace FC': 'Crystal Palace',
    'Crystal Palace': 'Crystal Palace',
    'Everton FC': 'Everton',
    'Everton': 'Everton',
    'Fulham FC': 'Fulham',
    'Fulham': 'Fulham',
    'Ipswich Town': 'Ipswich Town',
    'Ipswich': 'Ipswich Town',
    'Leicester City': 'Leicester City',
    'Leicester': 'Leicester City',
    'Liverpool FC': 'Liverpool',
    'Liverpool': 'Liverpool',
    'Manchester City': 'Manchester City',
    'Man City': 'Manchester City',
    'Manchester United': 'Manchester United',
    'Man United': 'Manchester United',
    'Newcastle United': 'Newcastle United',
    'Newcastle': 'Newcastle United',
    'Nottingham Forest': 'Nottingham Forest',
    'Nottm Forest': 'Nottingham Forest',
    'Southampton FC': 'Southampton',
    'Southampton': 'Southampton',
    'Tottenham Hotspur': 'Tottenham',
    'Tottenham': 'Tottenham',
    'West Ham United': 'West Ham',
    'West Ham': 'West Ham',
    'Wolverhampton Wanderers': 'Wolverhampton',
    'Wolves': 'Wolverhampton',
    
    # ============================================================
    # SPAGNA - La Liga
    # ============================================================
    'Real Madrid CF': 'Real Madrid',
    'Real Madrid': 'Real Madrid',
    'FC Barcelona': 'Barcelona',
    'Barcelona': 'Barcelona',
    'Atletico Madrid': 'Atletico Madrid',
    'Atlético Madrid': 'Atletico Madrid',
    'Athletic Club': 'Athletic Bilbao',
    'Athletic Bilbao': 'Athletic Bilbao',
    'Real Sociedad': 'Real Sociedad',
    'Real Betis': 'Real Betis',
    'Betis': 'Real Betis',
    'Villarreal CF': 'Villarreal',
    'Villarreal': 'Villarreal',
    'Valencia CF': 'Valencia',
    'Valencia': 'Valencia',
    'Sevilla FC': 'Sevilla',
    'Sevilla': 'Sevilla',
    'Girona FC': 'Girona',
    'Girona': 'Girona',
    'Getafe CF': 'Getafe',
    'Getafe': 'Getafe',
    'CA Osasuna': 'Osasuna',
    'Osasuna': 'Osasuna',
    'RC Celta': 'Celta Vigo',
    'Celta Vigo': 'Celta Vigo',
    'Rayo Vallecano': 'Rayo Vallecano',
    'Rayo': 'Rayo Vallecano',
    'RCD Mallorca': 'Mallorca',
    'Mallorca': 'Mallorca',
    'UD Las Palmas': 'Las Palmas',
    'Las Palmas': 'Las Palmas',
    'Deportivo Alaves': 'Alaves',
    'Alaves': 'Alaves',
    'RCD Espanyol': 'Espanyol',
    'Espanyol': 'Espanyol',
    'CD Leganes': 'Leganes',
    'Leganes': 'Leganes',
    
    # ============================================================
    # GERMANIA - Bundesliga
    # ============================================================
    'Bayern Munich': 'Bayern Munich',
    'Bayern München': 'Bayern Munich',
    'Borussia Dortmund': 'Borussia Dortmund',
    'Dortmund': 'Borussia Dortmund',
    'RB Leipzig': 'RB Leipzig',
    'Leipzig': 'RB Leipzig',
    'Bayer Leverkusen': 'Bayer Leverkusen',
    'Leverkusen': 'Bayer Leverkusen',
    'Eintracht Frankfurt': 'Eintracht Frankfurt',
    'Frankfurt': 'Eintracht Frankfurt',
    'SC Freiburg': 'Freiburg',
    'Freiburg': 'Freiburg',
    'VfB Stuttgart': 'Stuttgart',
    'Stuttgart': 'Stuttgart',
    'VfL Wolfsburg': 'Wolfsburg',
    'Wolfsburg': 'Wolfsburg',
    'Mainz 05': 'Mainz',
    'Mainz': 'Mainz',
    'FC Augsburg': 'Augsburg',
    'Augsburg': 'Augsburg',
    '1. FC Union Berlin': 'Union Berlin',
    'Union Berlin': 'Union Berlin',
    'TSG Hoffenheim': 'Hoffenheim',
    'Hoffenheim': 'Hoffenheim',
    'Werder Bremen': 'Werder Bremen',
    'Bremen': 'Werder Bremen',
    'Borussia Mönchengladbach': 'Borussia Monchengladbach',
    'Mönchengladbach': 'Borussia Monchengladbach',
    '1. FC Heidenheim': 'Heidenheim',
    'Heidenheim': 'Heidenheim',
    'SV Darmstadt': 'Darmstadt',
    'Darmstadt': 'Darmstadt',
    'VfL Bochum': 'Bochum',
    'Bochum': 'Bochum',
    'FC Koln': 'Koln',
    'Koln': 'Koln',
    
    # ============================================================
    # FRANCIA - Ligue 1
    # ============================================================
    'Paris Saint-Germain': 'PSG',
    'PSG': 'PSG',
    'Olympique Marseille': 'Marseille',
    'Marseille': 'Marseille',
    'Olympique Lyonnais': 'Lyon',
    'Lyon': 'Lyon',
    'AS Monaco': 'Monaco',
    'Monaco': 'Monaco',
    'LOSC Lille': 'Lille',
    'Lille': 'Lille',
    'OGC Nice': 'Nice',
    'Nice': 'Nice',
    'Stade Rennais': 'Rennes',
    'Rennes': 'Rennes',
    'RC Strasbourg': 'Strasbourg',
    'Strasbourg': 'Strasbourg',
    'Montpellier HSC': 'Montpellier',
    'Montpellier': 'Montpellier',
    'Toulouse FC': 'Toulouse',
    'Toulouse': 'Toulouse',
    'Stade de Reims': 'Reims',
    'Reims': 'Reims',
    'Stade Brestois': 'Brest',
    'Brest': 'Brest',
    'FC Nantes': 'Nantes',
    'Nantes': 'Nantes',
    'RC Lens': 'Lens',
    'Lens': 'Lens',
    'FC Metz': 'Metz',
    'Metz': 'Metz',
    'FC Lorient': 'Lorient',
    'Lorient': 'Lorient',
    'Clermont Foot': 'Clermont',
    'Clermont': 'Clermont',
    'Le Havre AC': 'Le Havre',
    'Le Havre': 'Le Havre',
    
    # ============================================================
    # OLANDA - Eredivisie
    # ============================================================
    'Ajax': 'Ajax',
    'Ajax Amsterdam': 'Ajax',
    'PSV': 'PSV',
    'PSV Eindhoven': 'PSV',
    'Feyenoord': 'Feyenoord',
    'FC Twente': 'Twente',
    'Twente': 'Twente',
    'AZ Alkmaar': 'AZ',
    'AZ': 'AZ',
    'FC Utrecht': 'Utrecht',
    'Utrecht': 'Utrecht',
    'Sparta Rotterdam': 'Sparta Rotterdam',
    'Sparta': 'Sparta Rotterdam',
    'Go Ahead Eagles': 'Go Ahead Eagles',
    'NEC': 'NEC',
    'NEC Nijmegen': 'NEC',
    'Heracles Almelo': 'Heracles',
    'Heracles': 'Heracles',
    'RKC Waalwijk': 'RKC Waalwijk',
    'Waalwijk': 'RKC Waalwijk',
    'PEC Zwolle': 'Zwolle',
    'Zwolle': 'Zwolle',
    'Heerenveen': 'Heerenveen',
    'SC Heerenveen': 'Heerenveen',
    'Almere City': 'Almere City',
    'Almere': 'Almere City',
    'FC Volendam': 'Volendam',
    'Volendam': 'Volendam',
    'Excelsior': 'Excelsior',
    'SBV Excelsior': 'Excelsior',
    
    # ============================================================
    # PORTOGALLO - Primeira Liga
    # ============================================================
    'Benfica': 'Benfica',
    'SL Benfica': 'Benfica',
    'Porto': 'Porto',
    'FC Porto': 'Porto',
    'Sporting CP': 'Sporting CP',
    'Sporting': 'Sporting CP',
    'Braga': 'Braga',
    'SC Braga': 'Braga',
    'Vitoria Guimaraes': 'Vitoria Guimaraes',
    'Guimaraes': 'Vitoria Guimaraes',
    'Boavista': 'Boavista',
    'Boavista FC': 'Boavista',
    'Famalicao': 'Famalicao',
    'FC Famalicao': 'Famalicao',
    'Rio Ave': 'Rio Ave',
    'Rio Ave FC': 'Rio Ave',
    'Casa Pia': 'Casa Pia',
    'Casa Pia AC': 'Casa Pia',
    'Gil Vicente': 'Gil Vicente',
    'Gil Vicente FC': 'Gil Vicente',
    'Estoril': 'Estoril',
    'Estoril Praia': 'Estoril',
    'Portimonense': 'Portimonense',
    'Portimonense SC': 'Portimonense',
    'Vizela': 'Vizela',
    'FC Vizela': 'Vizela',
    'Chaves': 'Chaves',
    'GD Chaves': 'Chaves',
    'Arouca': 'Arouca',
    'FC Arouca': 'Arouca',
    
    # ============================================================
    # SCOZIA - Scottish Premiership
    # ============================================================
    'Celtic': 'Celtic',
    'Celtic FC': 'Celtic',
    'Rangers': 'Rangers',
    'Rangers FC': 'Rangers',
    'Heart of Midlothian': 'Hearts',
    'Hearts': 'Hearts',
    'Hibernian': 'Hibernian',
    'Hibs': 'Hibernian',
    'Aberdeen': 'Aberdeen',
    'Aberdeen FC': 'Aberdeen',
    'Dundee United': 'Dundee United',
    'Dundee Utd': 'Dundee United',
    'Kilmarnock': 'Kilmarnock',
    'Kilmarnock FC': 'Kilmarnock',
    'St Mirren': 'St Mirren',
    'St. Mirren': 'St Mirren',
    'Motherwell': 'Motherwell',
    'Motherwell FC': 'Motherwell',
    'St Johnstone': 'St Johnstone',
    'St. Johnstone': 'St Johnstone',
    'Ross County': 'Ross County',
    'Livingston': 'Livingston',
    'Livingston FC': 'Livingston',
    
    # ============================================================
    # TURCHIA - Süper Lig
    # ============================================================
    'Galatasaray': 'Galatasaray',
    'Galatasaray SK': 'Galatasaray',
    'Fenerbahce': 'Fenerbahce',
    'Fenerbahçe': 'Fenerbahce',
    'Besiktas': 'Besiktas',
    'Beşiktaş': 'Besiktas',
    'Trabzonspor': 'Trabzonspor',
    'Trabzon': 'Trabzonspor',
    'Basaksehir': 'Basaksehir',
    'Istanbul Basaksehir': 'Basaksehir',
    'Sivasspor': 'Sivasspor',
    'Kasimpasa': 'Kasimpasa',
    'Kasımpaşa': 'Kasimpasa',
    'Konyaspor': 'Konyaspor',
    'Alanyaspor': 'Alanyaspor',
    'Rizespor': 'Rizespor',
    'Caykur Rizespor': 'Rizespor',
    'Gaziantep FK': 'Gaziantep',
    'Gaziantep': 'Gaziantep',
    'Antalyaspor': 'Antalyaspor',
    'Kayserispor': 'Kayserispor',
    'Fatih Karagumruk': 'Karagumruk',
    'Karagumruk': 'Karagumruk',
    'Pendikspor': 'Pendikspor',
    
    # ============================================================
    # BRASILE - Serie A (Brasile)
    # ============================================================
    'Flamengo': 'Flamengo',
    'CR Flamengo': 'Flamengo',
    'Palmeiras': 'Palmeiras',
    'SE Palmeiras': 'Palmeiras',
    'Corinthians': 'Corinthians',
    'SC Corinthians': 'Corinthians',
    'Fluminense': 'Fluminense',
    'Fluminense FC': 'Fluminense',
    'Atletico Mineiro': 'Atletico Mineiro',
    'Atlético Mineiro': 'Atletico Mineiro',
    'Gremio': 'Gremio',
    'Grêmio': 'Gremio',
    'Internacional': 'Internacional',
    'SC Internacional': 'Internacional',
    'Santos': 'Santos',
    'Santos FC': 'Santos',
    'Sao Paulo': 'Sao Paulo',
    'São Paulo': 'Sao Paulo',
    'Cruzeiro': 'Cruzeiro',
    'Cruzeiro EC': 'Cruzeiro',
    'Botafogo': 'Botafogo',
    'Botafogo FR': 'Botafogo',
    'Vasco da Gama': 'Vasco',
    'Vasco': 'Vasco',
    'Bahia': 'Bahia',
    'EC Bahia': 'Bahia',
    'Cuiaba': 'Cuiaba',
    'Cuiabá': 'Cuiaba',
    'Athletico Paranaense': 'Athletico PR',
    'Athletico PR': 'Athletico PR',
    
    # ============================================================
    # ARGENTINA - Liga Profesional
    # ============================================================
    'River Plate': 'River Plate',
    'River': 'River Plate',
    'Boca Juniors': 'Boca Juniors',
    'Boca': 'Boca Juniors',
    'Independiente': 'Independiente',
    'Racing Club': 'Racing Club',
    'Racing': 'Racing Club',
    'San Lorenzo': 'San Lorenzo',
    'San Lorenzo de Almagro': 'San Lorenzo',
    'Velez Sarsfield': 'Velez',
    'Vélez Sarsfield': 'Velez',
    'Estudiantes': 'Estudiantes',
    'Estudiantes LP': 'Estudiantes',
    'Rosario Central': 'Rosario Central',
    'Newells Old Boys': 'Newells',
    'Newell\'s Old Boys': 'Newells',
    'Lanús': 'Lanus',
    'Lanus': 'Lanus',
    'Banfield': 'Banfield',
    'Defensa y Justicia': 'Defensa',
    'Defensa': 'Defensa',
    
    # ============================================================
    # BELGIO - Jupiler Pro League
    # ============================================================
    'Anderlecht': 'Anderlecht',
    'RSC Anderlecht': 'Anderlecht',
    'Club Brugge': 'Club Brugge',
    'Brugge': 'Club Brugge',
    'Genk': 'Genk',
    'Racing Genk': 'Genk',
    'Gent': 'Gent',
    'KAA Gent': 'Gent',
    'Standard Liege': 'Standard Liege',
    'Standard Liège': 'Standard Liege',
    'Charleroi': 'Charleroi',
    'Sporting Charleroi': 'Charleroi',
    'Mechelen': 'Mechelen',
    'KV Mechelen': 'Mechelen',
    'Cercle Brugge': 'Cercle Brugge',
    'Cercle': 'Cercle Brugge',
    'Oud-Heverlee Leuven': 'OH Leuven',
    'OH Leuven': 'OH Leuven',
    'Union Saint-Gilloise': 'Union SG',
    'Union SG': 'Union SG',
    'St Truiden': 'St Truiden',
    'Sint-Truiden': 'St Truiden',
    'Westerlo': 'Westerlo',
    'KVC Westerlo': 'Westerlo',
    
    # ============================================================
    # STATI UNITI - MLS
    # ============================================================
    'LA Galaxy': 'LA Galaxy',
    'Galaxy': 'LA Galaxy',
    'Inter Miami': 'Inter Miami',
    'Miami': 'Inter Miami',
    'New York Red Bulls': 'NY Red Bulls',
    'Red Bulls': 'NY Red Bulls',
    'Los Angeles FC': 'LAFC',
    'LAFC': 'LAFC',
    'Atlanta United': 'Atlanta United',
    'Atlanta': 'Atlanta United',
    'Seattle Sounders': 'Seattle Sounders',
    'Sounders': 'Seattle Sounders',
    'Portland Timbers': 'Portland Timbers',
    'Timbers': 'Portland Timbers',
    'FC Dallas': 'FC Dallas',
    'Dallas': 'FC Dallas',
    'Sporting Kansas City': 'Sporting KC',
    'Sporting KC': 'Sporting KC',
    'Austin FC': 'Austin',
    'Austin': 'Austin',
    'San Jose Earthquakes': 'San Jose',
    'San Jose': 'San Jose',
    'Chicago Fire': 'Chicago Fire',
    'Fire': 'Chicago Fire',
}

def translate_team_name(team_name: str) -> str:
    """
    Traduce il nome della squadra secondo il dizionario.
    Se non trova corrispondenza, restituisce il nome originale.
    """
    if not team_name:
        return team_name
    
    team_name_clean = team_name.strip()
    
    # 1. Cerca corrispondenza esatta (case-insensitive)
    for key, value in TEAM_NAME_MAPPING.items():
        if team_name_clean.lower() == key.lower():
            return value
    
    # 2. Cerca corrispondenza parziale (es. "Inter Milan" contiene "Inter")
    for key, value in TEAM_NAME_MAPPING.items():
        if key.lower() in team_name_clean.lower():
            return value
        if team_name_clean.lower() in key.lower():
            return value
    
    # 3. Se non trova, restituisce il nome originale
    return team_name_clean

# ================================================================
# FINE DIZIONARIO TRADUZIONE
# ================================================================

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
    """Estrae le partite dal JSON applicando la traduzione dei nomi."""
    matches = []
    
    if not isinstance(data, list):
        print(f"   ⚠️ Il JSON non è una lista, è {type(data)}")
        return []
    
    print(f"   📊 Trovate {len(data)} partite")
    
    for match in data:
        if not isinstance(match, dict):
            continue
        
        # === SQUADRE - APPLICA LA TRADUZIONE ===
        home_team = match.get('homeTeam', '') or match.get('home_team', '') or ''
        away_team = match.get('awayTeam', '') or match.get('away_team', '') or ''
        
        # 🔥 APPLICA LA TRADUZIONE DEI NOMI 🔥
        home_team = translate_team_name(home_team)
        away_team = translate_team_name(away_team)
        
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
            '_sort_date': sort_date
        })
    
    return matches

def sort_matches_by_date(all_matches: List[Dict]) -> List[Dict]:
    """Ordina le partite per data cronologica."""
    unique_matches = []
    seen = set()
    for match in all_matches:
        key = (match['campionato'], match['data'], match['ora'], 
               match['squadra_casa'], match['squadra_ospite'])
        if key not in seen:
            seen.add(key)
            unique_matches.append(match)
    
    unique_matches.sort(key=lambda x: (x['_sort_date'], x['campionato']))
    
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
    print("\n🔄 I nomi delle squadre verranno tradotti automaticamente per i loghi!")
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

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()
        input("\n🔄 Premi ENTER per uscire...")