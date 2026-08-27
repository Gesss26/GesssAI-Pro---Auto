// ============================================================
// METEO.JS - DATI METEO E COORDINATE PER GesssAI-Pro
// ============================================================

// ============================================================
// MAPPA PAESI PER CAMPIONATO
// ============================================================

const CHAMPIONSHIP_COUNTRY = {
  // ARGENTINA
  'Liga Profesional': 'AR',
  'Liga Profesional Argentina': 'AR',
  
  // BELGIO
  'Jupiler Pro League': 'BE',
  'Belgian Pro League': 'BE',
  
  // BRASILE
  'Serie A (Brasile)': 'BR',
  'Serie A BR': 'BR',
  'Brasileirão': 'BR',
  
  // CINA
  'Super League': 'CN',
  'Chinese Super League': 'CN',
  'CSL': 'CN',
  
  // INGHILTERRA
  'Premier League': 'GB',
  'English Premier League': 'GB',
  'EPL': 'GB',
  'Championship': 'GB',
  'EFL Championship': 'GB',
  'Premiership': 'GB',
  'Scottish Premiership': 'GB',
  'Scottish Premier League': 'GB',
  
  // FRANCIA
  'Ligue 1': 'FR',
  'Ligue 2': 'FR',
  
  // GERMANIA
  'Bundesliga': 'DE',
  '2. Bundesliga': 'DE',
  
  // GIAPPONE
  'J1 League': 'JP',
  'J-League': 'JP',
  
  // ITALIA
  'Serie A (Italia)': 'IT',
  'Serie A IT': 'IT',
  'Serie A': 'IT',
  'Serie A TIM': 'IT',
  'Serie A Enilive': 'IT',
  'Serie B': 'IT',
  'Serie B IT': 'IT',
  'Serie C - Girone A': 'IT',
  'Serie C - Girone B': 'IT',
  'Serie C - Girone C': 'IT',
  'Serie A Women': 'IT',
  'Serie A Women IT': 'IT',
  
  // COREA
  'K League 1': 'KR',
  'K League': 'KR',
  'K-League': 'KR',
  
  // OLANDA
  'Eerste Divisie': 'NL',
  'Eerste Divisie NL': 'NL',
  
  // PORTOGALLO
  'Primeira Liga': 'PT',
  'Liga Portugal': 'PT',
  
  // SPAGNA
  'LaLiga': 'ES',
  'La Liga': 'ES',
  'Segunda División': 'ES',
  
  // TURCHIA
  'Süper Lig': 'TR',
  'Super Lig': 'TR',
  'Turkish Süper Lig': 'TR',
  
  // USA/CANADA
  'Major League Soccer': 'US',
  'MLS': 'US',
  'NWSL': 'US',
  'National Women\'s Soccer League': 'US',
  
  // AUSTRALIA
  'A-League': 'AU',
  'A-League Men': 'AU',
  
  // SVEZIA
  'Allsvenskan': 'SE',
  
  // NORVEGIA
  'Eliteserien': 'NO',
  
  // DANIMARCA
  'Danish Superliga': 'DK',
  
  // SVIZZERA
  'Swiss Super League': 'CH',
  
  // AUSTRIA
  'Austrian Bundesliga': 'AT',
  
  // RUSSIA
  'Russian Premier League': 'RU',
  
  // MESSICO
  'Liga MX': 'MX'
};

// ============================================================
// MAPPA CITTÀ PER CAMPIONATO
// ============================================================

const CITTÀ_PER_CAMPIONATO = {
  // ARGENTINA
  'Liga Profesional': 'Buenos Aires',
  'Liga Profesional Argentina': 'Buenos Aires',
  
  // BELGIO
  'Jupiler Pro League': 'Bruxelles',
  'Belgian Pro League': 'Bruxelles',
  
  // BRASILE
  'Serie A (Brasile)': 'Brasilia',
  'Serie A BR': 'Brasilia',
  'Brasileirão': 'Brasilia',
  
  // CINA
  'Super League': 'Pechino',
  'Chinese Super League': 'Pechino',
  'CSL': 'Pechino',
  
  // INGHILTERRA
  'Premier League': 'Londra',
  'English Premier League': 'Londra',
  'EPL': 'Londra',
  'Championship': 'Londra',
  'EFL Championship': 'Londra',
  'Premiership': 'Glasgow',
  'Scottish Premiership': 'Glasgow',
  'Scottish Premier League': 'Glasgow',
  
  // FRANCIA
  'Ligue 1': 'Parigi',
  'Ligue 2': 'Parigi',
  
  // GERMANIA
  'Bundesliga': 'Berlino',
  '2. Bundesliga': 'Berlino',
  
  // GIAPPONE
  'J1 League': 'Tokyo',
  'J-League': 'Tokyo',
  
  // ITALIA
  'Serie A (Italia)': 'Roma',
  'Serie A IT': 'Roma',
  'Serie A': 'Roma',
  'Serie A TIM': 'Roma',
  'Serie A Enilive': 'Roma',
  'Serie B': 'Roma',
  'Serie B IT': 'Roma',
  'Serie C - Girone A': 'Milano',
  'Serie C - Girone B': 'Firenze',
  'Serie C - Girone C': 'Napoli',
  'Serie A Women': 'Roma',
  'Serie A Women IT': 'Roma',
  
  // COREA
  'K League 1': 'Seul',
  'K League': 'Seul',
  'K-League': 'Seul',
  
  // OLANDA
  'Eerste Divisie': 'Amsterdam',
  'Eerste Divisie NL': 'Amsterdam',
  
  // PORTOGALLO
  'Primeira Liga': 'Lisbona',
  'Liga Portugal': 'Lisbona',
  
  // SPAGNA
  'LaLiga': 'Madrid',
  'La Liga': 'Madrid',
  'Segunda División': 'Madrid',
  
  // TURCHIA
  'Süper Lig': 'Istanbul',
  'Super Lig': 'Istanbul',
  'Turkish Süper Lig': 'Istanbul',
  
  // USA/CANADA
  'Major League Soccer': 'New York',
  'MLS': 'New York',
  'NWSL': 'New York',
  'National Women\'s Soccer League': 'New York',
  
  // AUSTRALIA
  'A-League': 'Sydney',
  'A-League Men': 'Sydney',
  
  // SVEZIA
  'Allsvenskan': 'Stoccolma',
  
  // NORVEGIA
  'Eliteserien': 'Oslo',
  
  // DANIMARCA
  'Danish Superliga': 'Copenaghen',
  
  // SVIZZERA
  'Swiss Super League': 'Berna',
  
  // AUSTRIA
  'Austrian Bundesliga': 'Vienna',
  
  // RUSSIA
  'Russian Premier League': 'Mosca',
  
  // MESSICO
  'Liga MX': 'Città del Messico'
};

// ============================================================
// MAPPA SQUADRE → CITTÀ (COMPLETA)
// ============================================================

const TEAM_CITY_MAP = {
  // ============================================
  // ARGENTINA - LIGA PROFESIONAL
  // ============================================
  'Boca Juniors': 'Buenos Aires',
  'River Plate': 'Buenos Aires',
  'Independiente': 'Avellaneda',
  'Racing Club': 'Avellaneda',
  'San Lorenzo': 'Buenos Aires',
  'Vélez Sarsfield': 'Buenos Aires',
  'Estudiantes': 'La Plata',
  'Gimnasia LP': 'La Plata',
  'Newell\'s Old Boys': 'Rosario',
  'Rosario Central': 'Rosario',
  'Belgrano': 'Córdoba',
  'Talleres': 'Córdoba',
  'Atlético Tucumán': 'San Miguel de Tucumán',
  'Colón': 'Santa Fe',
  'Unión': 'Santa Fe',
  'Banfield': 'Banfield',
  'Lanús': 'Lanús',
  'Godoy Cruz': 'Mendoza',
  'Argentinos Juniors': 'Buenos Aires',
  'Huracán': 'Buenos Aires',
  
  // ============================================
  // BELGIO - JUPILER PRO LEAGUE
  // ============================================
  'Anderlecht': 'Bruxelles',
  'Club Brugge': 'Bruges',
  'Genk': 'Genk',
  'Gent': 'Gand',
  'Standard Liège': 'Liegi',
  'Charleroi': 'Charleroi',
  'Mechelen': 'Malines',
  'Cercle Brugge': 'Bruges',
  'Oostende': 'Ostende',
  'Zulte Waregem': 'Waregem',
  'Kortrijk': 'Courtrai',
  'OH Leuven': 'Lovanio',
  'Beerschot': 'Anversa',
  'Royal Antwerp': 'Anversa',
  
  // ============================================
  // BRASILE - SERIE A
  // ============================================
  'Flamengo': 'Rio de Janeiro',
  'Palmeiras': 'San Paolo',
  'Corinthians': 'San Paolo',
  'São Paulo': 'San Paolo',
  'Santos': 'Santos',
  'Grêmio': 'Porto Alegre',
  'Internacional': 'Porto Alegre',
  'Cruzeiro': 'Belo Horizonte',
  'Atlético Mineiro': 'Belo Horizonte',
  'Fluminense': 'Rio de Janeiro',
  'Botafogo': 'Rio de Janeiro',
  'Vasco da Gama': 'Rio de Janeiro',
  'Bahia': 'Salvador',
  'Fortaleza': 'Fortaleza',
  'Ceará': 'Fortaleza',
  'Athletico Paranaense': 'Curitiba',
  'Coritiba': 'Curitiba',
  'Goiás': 'Goiânia',
  'América Mineiro': 'Belo Horizonte',
  'Cuiabá': 'Cuiabá',
  
  // ============================================
  // CINA - SUPER LEAGUE
  // ============================================
  'Beijing Guoan': 'Pechino',
  'Shanghai SIPG': 'Shanghai',
  'Guangzhou Evergrande': 'Canton',
  'Shandong Luneng': 'Jinan',
  'Jiangsu Suning': 'Nanchino',
  'Shanghai Shenhua': 'Shanghai',
  'Tianjin Teda': 'Tientsin',
  'Dalian Yifang': 'Dalian',
  'Henan Jianye': 'Zhengzhou',
  'Chongqing Dangdai': 'Chongqing',
  'Hebei China Fortune': 'Langfang',
  'Guangzhou R&F': 'Canton',
  'Shenzhen FC': 'Shenzhen',
  'Wuhan Zall': 'Wuhan',
  'Qingdao Huanghai': 'Qingdao',
  
  // ============================================
  // INGHILTERRA - PREMIER LEAGUE, CHAMPIONSHIP
  // ============================================
  'Arsenal': 'Londra',
  'Aston Villa': 'Birmingham',
  'Bournemouth': 'Bournemouth',
  'Brentford': 'Londra',
  'Brighton & Hove Albion': 'Brighton',
  'Chelsea': 'Londra',
  'Crystal Palace': 'Londra',
  'Everton': 'Liverpool',
  'Fulham': 'Londra',
  'Ipswich Town': 'Ipswich',
  'Leeds United': 'Leeds',
  'Leicester City': 'Leicester',
  'Liverpool': 'Liverpool',
  'Manchester City': 'Manchester',
  'Manchester United': 'Manchester',
  'Newcastle United': 'Newcastle upon Tyne',
  'Nottingham Forest': 'Nottingham',
  'Southampton': 'Southampton',
  'Tottenham Hotspur': 'Londra',
  'West Ham United': 'Londra',
  'Wolverhampton Wanderers': 'Wolverhampton',
  
  // ============================================
  // SCOZIA - PREMIERSHIP
  // ============================================
  'Celtic': 'Glasgow',
  'Rangers': 'Glasgow',
  'Aberdeen': 'Aberdeen',
  'Heart of Midlothian': 'Edimburgo',
  'Hibernian': 'Edimburgo',
  'Kilmarnock': 'Kilmarnock',
  'Motherwell': 'Motherwell',
  'Dundee United': 'Dundee',
  'Dundee': 'Dundee',
  'St. Johnstone': 'Perth',
  'St. Mirren': 'Paisley',
  'Ross County': 'Dingwall',
  
  // ============================================
  // FRANCIA - LIGUE 1, LIGUE 2
  // ============================================
  'Paris Saint-Germain': 'Parigi',
  'Marseille': 'Marsiglia',
  'Lyon': 'Lione',
  'Lille': 'Lilla',
  'Monaco': 'Monaco',
  'Nice': 'Nizza',
  'Rennes': 'Rennes',
  'Strasbourg': 'Strasburgo',
  'Nantes': 'Nantes',
  'Montpellier': 'Montpellier',
  'Reims': 'Reims',
  'Toulouse': 'Tolosa',
  'Bordeaux': 'Bordeaux',
  'Saint-Étienne': 'Saint-Étienne',
  'Lens': 'Lens',
  'Brest': 'Brest',
  'Angers': 'Angers',
  'Auxerre': 'Auxerre',
  'Clermont Foot': 'Clermont-Ferrand',
  'Le Havre': 'Le Havre',
  'Lorient': 'Lorient',
  'Metz': 'Metz',
  
  // ============================================
  // GERMANIA - BUNDESLIGA, 2. BUNDESLIGA
  // ============================================
  'FC Bayern München': 'Monaco',
  'Borussia Dortmund': 'Dortmund',
  'RB Leipzig': 'Lipsia',
  'Bayer 04 Leverkusen': 'Leverkusen',
  'Eintracht Frankfurt': 'Francoforte',
  'VfB Stuttgart': 'Stoccarda',
  'Borussia Mönchengladbach': 'Mönchengladbach',
  'SC Freiburg': 'Friburgo',
  'TSG Hoffenheim': 'Sinsheim',
  '1. FC Union Berlin': 'Berlino',
  'VfL Wolfsburg': 'Wolfsburg',
  '1. FSV Mainz 05': 'Magonza',
  'SV Werder Bremen': 'Brema',
  'FC Augsburg': 'Augusta',
  'VfL Bochum': 'Bochum',
  'FC Köln': 'Colonia',
  'SV Darmstadt 98': 'Darmstadt',
  'FC Heidenheim': 'Heidenheim',
  'Hamburger SV': 'Amburgo',
  'FC Schalke 04': 'Gelsenkirchen',
  '1. FC Nürnberg': 'Norimberga',
  'Fortuna Düsseldorf': 'Düsseldorf',
  'Hannover 96': 'Hannover',
  'Karlsruher SC': 'Karlsruhe',
  'Holstein Kiel': 'Kiel',
  'SC Paderborn 07': 'Paderborn',
  'SV Elversberg': 'Spiesen-Elversberg',
  
  // ============================================
  // GIAPPONE - J1 LEAGUE
  // ============================================
  'Kashima Antlers': 'Kashima',
  'Urawa Red Diamonds': 'Saitama',
  'Kawasaki Frontale': 'Kawasaki',
  'Yokohama F. Marinos': 'Yokohama',
  'Sanfrecce Hiroshima': 'Hiroshima',
  'Gamba Osaka': 'Osaka',
  'Cerezo Osaka': 'Osaka',
  'Nagoya Grampus': 'Nagoya',
  'FC Tokyo': 'Tokyo',
  'Vissel Kobe': 'Kobe',
  'Shimizu S-Pulse': 'Shizuoka',
  'Sagan Tosu': 'Tosu',
  'Oita Trinita': 'Oita',
  'Kashiwa Reysol': 'Kashiwa',
  'Yokohama FC': 'Yokohama',
  
  // ============================================
  // ITALIA - SERIE A, SERIE B, SERIE C
  // ============================================
  'Atalanta': 'Bergamo',
  'Bologna': 'Bologna',
  'Cagliari': 'Cagliari',
  'Como': 'Como',
  'Empoli': 'Empoli',
  'Fiorentina': 'Firenze',
  'Genoa': 'Genova',
  'Inter': 'Milano',
  'Juventus': 'Torino',
  'Lazio': 'Roma',
  'Lecce': 'Lecce',
  'Milan': 'Milano',
  'Monza': 'Monza',
  'Napoli': 'Napoli',
  'Parma': 'Parma',
  'Roma': 'Roma',
  'Torino': 'Torino',
  'Udinese': 'Udine',
  'Venezia': 'Venezia',
  'Verona': 'Verona',
  
  // SERIE B
  'Palermo': 'Palermo',
  'Sassuolo': 'Reggio Emilia',
  'Bari': 'Bari',
  'Cremonese': 'Cremona',
  'Pisa': 'Pisa',
  'Spezia': 'La Spezia',
  'Sampdoria': 'Genova',
  'Brescia': 'Brescia',
  'Catanzaro': 'Catanzaro',
  'Reggiana': 'Reggio Emilia',
  'Frosinone': 'Frosinone',
  'Modena': 'Modena',
  'Cittadella': 'Cittadella',
  'Salernitana': 'Salerno',
  'Mantova': 'Mantova',
  'Cesena': 'Cesena',
  'Juve Stabia': 'Castellammare di Stabia',
  'Carrarese': 'Carrara',
  'Südtirol': 'Bolzano',
  
  // SERIE C - GIRONE A
  'Pro Vercelli': 'Vercelli',
  'Pro Patria': 'Busto Arsizio',
  'Albinoleffe': 'Albino',
  'Giana Erminio': 'Gorgonzola',
  'Renate': 'Renate',
  'Vicenza': 'Vicenza',
  'Padova': 'Padova',
  'Triestina': 'Trieste',
  'Lecco': 'Lecco',
  'Feralpisalò': 'Salò',
  'Lumezzane': 'Lumezzane',
  'Atalanta U23': 'Bergamo',
  
  // SERIE C - GIRONE B
  'Perugia': 'Perugia',
  'Ternana': 'Terni',
  'Gubbio': 'Gubbio',
  'Pescara': 'Pescara',
  'Ascoli': 'Ascoli Piceno',
  'Rimini': 'Rimini',
  'Arezzo': 'Arezzo',
  'Sestri Levante': 'Sestri Levante',
  'Virtus Entella': 'Chiavari',
  'Torres': 'Sassari',
  'Olbia': 'Olbia',
  'Pianese': 'Piancastagnaio',
  
  // SERIE C - GIRONE C
  'Avellino': 'Avellino',
  'Benevento': 'Benevento',
  'Casertana': 'Caserta',
  'Foggia': 'Foggia',
  'Giugliano': 'Giugliano in Campania',
  'Latina': 'Latina',
  'Messina': 'Messina',
  'Monopoli': 'Monopoli',
  'Picerno': 'Picerno',
  'Potenza': 'Potenza',
  'Sorrento': 'Sorrento',
  'Taranto': 'Taranto',
  'Team Altamura': 'Altamura',
  'Trapani': 'Trapani',
  'Turris': 'Torre del Greco',
  
  // SERIE A WOMEN
  'Juventus Women': 'Torino',
  'Roma Women': 'Roma',
  'Milan Women': 'Milano',
  'Inter Women': 'Milano',
  'Fiorentina Women': 'Firenze',
  'Sassuolo Women': 'Reggio Emilia',
  'Sampdoria Women': 'Genova',
  'Como Women': 'Como',
  'Napoli Women': 'Napoli',
  'Lazio Women': 'Roma',
  
  // ============================================
  // COREA - K LEAGUE 1
  // ============================================
  'Ulsan Hyundai': 'Ulsan',
  'Jeonbuk Hyundai Motors': 'Jeonju',
  'Pohang Steelers': 'Pohang',
  'Daegu FC': 'Daegu',
  'Gangwon FC': 'Chuncheon',
  'Suwon Samsung Bluewings': 'Suwon',
  'FC Seoul': 'Seul',
  'Jeju United': 'Jeju',
  'Incheon United': 'Incheon',
  'Gwangju FC': 'Gwangju',
  'Daejeon Hana Citizen': 'Daejeon',
  'Suwon FC': 'Suwon',
  
  // ============================================
  // OLANDA - EERSTE DIVISIE
  // ============================================
  'Ajax': 'Amsterdam',
  'PSV Eindhoven': 'Eindhoven',
  'Feyenoord': 'Rotterdam',
  'AZ Alkmaar': 'Alkmaar',
  'FC Twente': 'Enschede',
  'FC Utrecht': 'Utrecht',
  'Vitesse': 'Arnhem',
  'SC Heerenveen': 'Heerenveen',
  'FC Groningen': 'Groningen',
  'NEC Nijmegen': 'Nijmegen',
  'Sparta Rotterdam': 'Rotterdam',
  'Go Ahead Eagles': 'Deventer',
  'Fortuna Sittard': 'Sittard',
  'Heracles Almelo': 'Almelo',
  'PEC Zwolle': 'Zwolle',
  'RKC Waalwijk': 'Waalwijk',
  'Willem II': 'Tilburg',
  'NAC Breda': 'Breda',
  'Volendam': 'Volendam',
  'Den Bosch': '\'s-Hertogenbosch',
  'Eindhoven FC': 'Eindhoven',
  'De Graafschap': 'Doetinchem',
  'Telstar': 'Velsen',
  'Helmond Sport': 'Helmond',
  'MVV Maastricht': 'Maastricht',
  'ADO Den Haag': 'L\'Aia',
  'TOP Oss': 'Oss',
  'Jong Ajax': 'Amsterdam',
  'Jong PSV': 'Eindhoven',
  'Jong AZ': 'Alkmaar',
  'Jong FC Utrecht': 'Utrecht',
  
  // ============================================
  // PORTOGALLO - PRIMEIRA LIGA
  // ============================================
  'Benfica': 'Lisbona',
  'Sporting CP': 'Lisbona',
  'Porto': 'Porto',
  'Braga': 'Braga',
  'Vitória Guimarães': 'Guimarães',
  'Boavista': 'Porto',
  'Casa Pia': 'Lisbona',
  'Estoril Praia': 'Estoril',
  'Famalicão': 'Vila Nova de Famalicão',
  'Farense': 'Faro',
  'Gil Vicente': 'Barcelos',
  'Moreirense': 'Moreira de Cónegos',
  'Nacional': 'Funchal',
  'Rio Ave': 'Vila do Conde',
  'Santa Clara': 'Ponta Delgada',
  'Portimonense': 'Portimão',
  
  // ============================================
  // SPAGNA - LALIGA, SEGUNDA DIVISIÓN
  // ============================================
  'Real Madrid': 'Madrid',
  'Barcelona': 'Barcellona',
  'Atlético Madrid': 'Madrid',
  'Real Sociedad': 'San Sebastián',
  'Athletic Bilbao': 'Bilbao',
  'Sevilla': 'Siviglia',
  'Real Betis': 'Siviglia',
  'Villarreal': 'Villarreal',
  'Valencia': 'Valencia',
  'Celta Vigo': 'Vigo',
  'Girona': 'Girona',
  'Osasuna': 'Pamplona',
  'Getafe': 'Getafe',
  'Mallorca': 'Palma di Maiorca',
  'Alavés': 'Vitoria-Gasteiz',
  'Espanyol': 'Barcellona',
  'Las Palmas': 'Las Palmas',
  'Rayo Vallecano': 'Madrid',
  'Leganés': 'Leganés',
  'Granada': 'Granada',
  
  // SEGUNDA DIVISIÓN
  'Deportivo La Coruña': 'La Coruña',
  'Real Zaragoza': 'Zaragoza',
  'Elche': 'Elche',
  'Málaga': 'Málaga',
  'Racing Santander': 'Santander',
  'Levante': 'Valencia',
  'Tenerife': 'Santa Cruz de Tenerife',
  'Eibar': 'Eibar',
  'Almería': 'Almería',
  'Huesca': 'Huesca',
  'Mirandés': 'Miranda de Ebro',
  'Cartagena': 'Cartagena',
  'Burgos': 'Burgos',
  'Fuenlabrada': 'Fuenlabrada',
  'Lugo': 'Lugo',
  'Ponferradina': 'Ponferrada',
  
  // ============================================
  // TURCHIA - SÜPER LIG
  // ============================================
  'Galatasaray': 'Istanbul',
  'Fenerbahçe': 'Istanbul',
  'Beşiktaş': 'Istanbul',
  'Başakşehir': 'Istanbul',
  'Trabzonspor': 'Trabzon',
  'Sivasspor': 'Sivas',
  'Adana Demirspor': 'Adana',
  'Alanyaspor': 'Alanya',
  'Antalyaspor': 'Antalya',
  'Çaykur Rizespor': 'Rize',
  'Gaziantep FK': 'Gaziantep',
  'Göztepe': 'Izmir',
  'Hatayspor': 'Antakya',
  'Kasımpaşa': 'Istanbul',
  'Kayserispor': 'Kayseri',
  'Konyaspor': 'Konya',
  'Samsunspor': 'Samsun',
  
  // ============================================
  // USA/CANADA - MLS, NWSL
  // ============================================
  'LA Galaxy': 'Los Angeles',
  'Los Angeles FC': 'Los Angeles',
  'New York Red Bulls': 'New York',
  'New York City FC': 'New York',
  'Inter Miami': 'Miami',
  'Atlanta United': 'Atlanta',
  'Austin FC': 'Austin',
  'Charlotte FC': 'Charlotte',
  'Chicago Fire': 'Chicago',
  'Colorado Rapids': 'Denver',
  'Columbus Crew': 'Columbus',
  'D.C. United': 'Washington',
  'FC Cincinnati': 'Cincinnati',
  'FC Dallas': 'Dallas',
  'Houston Dynamo': 'Houston',
  'Minnesota United': 'Minneapolis',
  'Nashville SC': 'Nashville',
  'New England Revolution': 'Boston',
  'Orlando City': 'Orlando',
  'Philadelphia Union': 'Philadelphia',
  'Portland Timbers': 'Portland',
  'Real Salt Lake': 'Salt Lake City',
  'San Diego FC': 'San Diego',
  'San Jose Earthquakes': 'San Jose',
  'Seattle Sounders': 'Seattle',
  'Sporting Kansas City': 'Kansas City',
  'St. Louis CITY SC': 'St. Louis',
  'Toronto FC': 'Toronto',
  'Vancouver Whitecaps': 'Vancouver',
  'CF Montréal': 'Montreal',
  
  // NWSL
  'Angel City FC': 'Los Angeles',
  'Bay FC': 'San Jose',
  'Chicago Stars': 'Chicago',
  'Houston Dash': 'Houston',
  'Kansas City Current': 'Kansas City',
  'NJ/NY Gotham FC': 'New York',
  'North Carolina Courage': 'Raleigh',
  'Orlando Pride': 'Orlando',
  'Portland Thorns': 'Portland',
  'Racing Louisville': 'Louisville',
  'San Diego Wave': 'San Diego',
  'Seattle Reign': 'Seattle',
  'Utah Royals': 'Salt Lake City',
  'Washington Spirit': 'Washington',
  
  // ============================================
  // AUSTRALIA - A-LEAGUE
  // ============================================
  'Sydney FC': 'Sydney',
  'Melbourne Victory': 'Melbourne',
  'Melbourne City': 'Melbourne',
  'Western Sydney Wanderers': 'Sydney',
  'Brisbane Roar': 'Brisbane',
  'Perth Glory': 'Perth',
  'Adelaide United': 'Adelaide',
  'Central Coast Mariners': 'Gosford',
  'Newcastle Jets': 'Newcastle',
  'Wellington Phoenix': 'Wellington',
  'Macarthur FC': 'Sydney',
  'Western United': 'Melbourne',
  
  // ============================================
  // SVEZIA - ALLSVENSKAN
  // ============================================
  'Malmö FF': 'Malmö',
  'AIK': 'Stoccolma',
  'IFK Göteborg': 'Göteborg',
  'Hammarby IF': 'Stoccolma',
  'Djurgårdens IF': 'Stoccolma',
  'BK Häcken': 'Göteborg',
  'Elfsborg': 'Borås',
  'Kalmar FF': 'Kalmar',
  'Norrköping': 'Norrköping',
  'Sirius': 'Uppsala',
  'Varbergs BoIS': 'Varberg',
  'Degerfors': 'Degerfors',
  'Mjällby': 'Hällevik',
  'Värnamo': 'Värnamo',
  
  // ============================================
  // NORVEGIA - ELITESERIEN
  // ============================================
  'Bodø/Glimt': 'Bodø',
  'Molde FK': 'Molde',
  'Rosenborg': 'Trondheim',
  'Vålerenga': 'Oslo',
  'Brann': 'Bergen',
  'Lillestrøm': 'Lillestrøm',
  'Odd': 'Skien',
  'Strømsgodset': 'Drammen',
  'Viking': 'Stavanger',
  'Sarpsborg 08': 'Sarpsborg',
  'Stabæk': 'Bærum',
  'Tromsø': 'Tromsø',
  'HamKam': 'Hamar',
  'Sandefjord': 'Sandefjord',
  
  // ============================================
  // DANIMARCA - DANISH SUPERLIGA
  // ============================================
  'FC København': 'Copenaghen',
  'Brøndby IF': 'Brøndby',
  'FC Midtjylland': 'Herning',
  'AGF': 'Aarhus',
  'Randers FC': 'Randers',
  'OB': 'Odense',
  'Aalborg BK': 'Aalborg',
  'Viborg FF': 'Viborg',
  'Silkeborg IF': 'Silkeborg',
  'FC Nordsjælland': 'Farum',
  'Lyngby BK': 'Kongens Lyngby',
  'Vejle BK': 'Vejle',
  
  // ============================================
  // SVIZZERA - SWISS SUPER LEAGUE
  // ============================================
  'BSC Young Boys': 'Berna',
  'FC Basel': 'Basilea',
  'Servette FC': 'Ginevra',
  'FC Zürich': 'Zurigo',
  'FC Lugano': 'Lugano',
  'FC St. Gallen': 'San Gallo',
  'Grasshopper': 'Zurigo',
  'FC Sion': 'Sion',
  'FC Lausanne-Sport': 'Losanna',
  'Yverdon-Sport': 'Yverdon',
  'FC Winterthur': 'Winterthur',
  'FC Luzern': 'Lucerna',
  
  // ============================================
  // AUSTRIA - AUSTRIAN BUNDESLIGA
  // ============================================
  'Red Bull Salzburg': 'Salisburgo',
  'Sturm Graz': 'Graz',
  'LASK': 'Linz',
  'Rapid Vienna': 'Vienna',
  'Austria Vienna': 'Vienna',
  'Wolfsberger AC': 'Wolfsberg',
  'WSG Tirol': 'Innsbruck',
  'Austria Klagenfurt': 'Klagenfurt',
  'SC Rheindorf Altach': 'Altach',
  'Blau-Weiß Linz': 'Linz',
  'TSV Hartberg': 'Hartberg',
  'SV Ried': 'Ried im Innkreis',
  
  // ============================================
  // RUSSIA - RUSSIAN PREMIER LEAGUE
  // ============================================
  'Zenit Saint Petersburg': 'San Pietroburgo',
  'Spartak Moscow': 'Mosca',
  'CSKA Moscow': 'Mosca',
  'Lokomotiv Moscow': 'Mosca',
  'Dynamo Moscow': 'Mosca',
  'Krasnodar': 'Krasnodar',
  'Rostov': 'Rostov sul Don',
  'Sochi': 'Sochi',
  'Krylya Sovetov': 'Samara',
  'Nizhny Novgorod': 'Nižnij Novgorod',
  'Ural': 'Ekaterinburg',
  'Akhmat Grozny': 'Grozny',
  'Rubin Kazan': 'Kazan',
  'Orenburg': 'Orenburg',
  'Fakel Voronezh': 'Voronezh',
  'Khimki': 'Khimki',
  
  // ============================================
  // MESSICO - LIGA MX
  // ============================================
  'Club América': 'Città del Messico',
  'Guadalajara': 'Guadalajara',
  'Monterrey': 'Monterrey',
  'Tigres UANL': 'Monterrey',
  'Cruz Azul': 'Città del Messico',
  'Pumas UNAM': 'Città del Messico',
  'Atlas': 'Guadalajara',
  'Toluca': 'Toluca',
  'Santos Laguna': 'Torreón',
  'Pachuca': 'Pachuca',
  'Tijuana': 'Tijuana',
  'Necaxa': 'Aguascalientes',
  'León': 'León',
  'Puebla': 'Puebla',
  'Mazatlán': 'Mazatlán',
  'Juárez': 'Ciudad Juárez'
};

// ============================================================
// COORDINATE PER LE CITTÀ (COMPLETE)
// ============================================================

const COORDS = {
  // ARGENTINA
  'Buenos Aires': { lat: -34.6037, lon: -58.3816 },
  'Avellaneda': { lat: -34.6600, lon: -58.3700 },
  'La Plata': { lat: -34.9200, lon: -57.9500 },
  'Rosario': { lat: -32.9468, lon: -60.6393 },
  'Córdoba': { lat: -31.4201, lon: -64.1888 },
  'San Miguel de Tucumán': { lat: -26.8083, lon: -65.2176 },
  'Santa Fe': { lat: -31.6333, lon: -60.7000 },
  'Banfield': { lat: -34.7500, lon: -58.4000 },
  'Lanús': { lat: -34.7000, lon: -58.4000 },
  'Mendoza': { lat: -32.8908, lon: -68.8272 },
  
  // BELGIO
  'Bruxelles': { lat: 50.8503, lon: 4.3517 },
  'Bruges': { lat: 51.2093, lon: 3.2247 },
  'Genk': { lat: 50.9660, lon: 5.5020 },
  'Gand': { lat: 51.0543, lon: 3.7174 },
  'Liegi': { lat: 50.6326, lon: 5.5797 },
  'Charleroi': { lat: 50.4108, lon: 4.4446 },
  'Malines': { lat: 51.0259, lon: 4.4775 },
  'Ostende': { lat: 51.2155, lon: 2.9286 },
  'Waregem': { lat: 50.8880, lon: 3.4310 },
  'Courtrai': { lat: 50.8278, lon: 3.2640 },
  'Lovanio': { lat: 50.8796, lon: 4.7009 },
  'Anversa': { lat: 51.2194, lon: 4.4025 },
  
  // BRASILE
  'Rio de Janeiro': { lat: -22.9068, lon: -43.1729 },
  'San Paolo': { lat: -23.5505, lon: -46.6333 },
  'Santos': { lat: -23.9608, lon: -46.3322 },
  'Porto Alegre': { lat: -30.0346, lon: -51.2177 },
  'Belo Horizonte': { lat: -19.9191, lon: -43.9387 },
  'Salvador': { lat: -12.9777, lon: -38.5016 },
  'Fortaleza': { lat: -3.7319, lon: -38.5267 },
  'Curitiba': { lat: -25.4290, lon: -49.2671 },
  'Goiânia': { lat: -16.6869, lon: -49.2648 },
  'Cuiabá': { lat: -15.6014, lon: -56.0979 },
  
  // CINA
  'Pechino': { lat: 39.9042, lon: 116.4074 },
  'Shanghai': { lat: 31.2304, lon: 121.4737 },
  'Canton': { lat: 23.1291, lon: 113.2644 },
  'Jinan': { lat: 36.6512, lon: 117.1201 },
  'Nanchino': { lat: 32.0603, lon: 118.7969 },
  'Tientsin': { lat: 39.0842, lon: 117.2009 },
  'Dalian': { lat: 38.9140, lon: 121.6147 },
  'Zhengzhou': { lat: 34.7472, lon: 113.6225 },
  'Chongqing': { lat: 29.5630, lon: 106.5516 },
  'Langfang': { lat: 39.5091, lon: 116.7036 },
  'Shenzhen': { lat: 22.5431, lon: 114.0579 },
  'Wuhan': { lat: 30.5928, lon: 114.3055 },
  'Qingdao': { lat: 36.0671, lon: 120.3826 },
  
  // INGHILTERRA
  'Londra': { lat: 51.5074, lon: -0.1278 },
  'Manchester': { lat: 53.4808, lon: -2.2426 },
  'Liverpool': { lat: 53.4084, lon: -2.9916 },
  'Birmingham': { lat: 52.4862, lon: -1.8904 },
  'Leeds': { lat: 53.8008, lon: -1.5491 },
  'Sheffield': { lat: 53.3811, lon: -1.4701 },
  'Leicester': { lat: 52.6369, lon: -1.1398 },
  'Nottingham': { lat: 52.9548, lon: -1.1581 },
  'Southampton': { lat: 50.9097, lon: -1.4044 },
  'Brighton': { lat: 50.8225, lon: -0.1372 },
  'Bournemouth': { lat: 50.7192, lon: -1.8808 },
  'Bristol': { lat: 51.4545, lon: -2.5879 },
  'Burnley': { lat: 53.7893, lon: -2.2408 },
  'Cardiff': { lat: 51.4816, lon: -3.1791 },
  'Coventry': { lat: 52.4068, lon: -1.5197 },
  'Derby': { lat: 52.9225, lon: -1.4746 },
  'Hull': { lat: 53.7676, lon: -0.3274 },
  'Ipswich': { lat: 52.0592, lon: 1.1555 },
  'Luton': { lat: 51.8787, lon: -0.4200 },
  'Middlesbrough': { lat: 54.5466, lon: -1.2169 },
  'Norwich': { lat: 52.6309, lon: 1.2974 },
  'Plymouth': { lat: 50.3753, lon: -4.1422 },
  'Portsmouth': { lat: 50.8198, lon: -1.0880 },
  'Preston': { lat: 53.7632, lon: -2.7031 },
  'Reading': { lat: 51.4543, lon: -0.9781 },
  'Sunderland': { lat: 54.9069, lon: -1.3838 },
  'Swansea': { lat: 51.6214, lon: -3.9438 },
  'Watford': { lat: 51.6565, lon: -0.3903 },
  'Wolverhampton': { lat: 52.5870, lon: -2.1311 },
  'Wrexham': { lat: 53.0430, lon: -2.9925 },
  'Blackburn': { lat: 53.7476, lon: -2.4827 },
  'Blackpool': { lat: 53.8175, lon: -3.0357 },
  'Bolton': { lat: 53.5769, lon: -2.4282 },
  'Bradford': { lat: 53.7950, lon: -1.7594 },
  'Barnsley': { lat: 53.5526, lon: -1.4797 },
  'Doncaster': { lat: 53.5228, lon: -1.1312 },
  'Huddersfield': { lat: 53.6458, lon: -1.7850 },
  'Lincoln': { lat: 53.2307, lon: -0.5406 },
  'Mansfield': { lat: 53.1417, lon: -1.1964 },
  'Oxford': { lat: 51.7520, lon: -1.2577 },
  'Peterborough': { lat: 52.5695, lon: -0.2405 },
  'Stockport': { lat: 53.4106, lon: -2.1575 },
  'Stoke-on-Trent': { lat: 53.0027, lon: -2.1794 },
  'Wigan': { lat: 53.5451, lon: -2.6325 },
  'Wycombe': { lat: 51.6466, lon: -0.8037 },
  'Burton upon Trent': { lat: 52.8037, lon: -1.6365 },
  'Cambridge': { lat: 52.2053, lon: 0.1218 },
  'Milton Keynes': { lat: 52.0406, lon: -0.7594 },
  'Stevenage': { lat: 51.9038, lon: -0.1966 },
  'Newcastle upon Tyne': { lat: 54.9783, lon: -1.6174 },
  'West Bromwich': { lat: 52.5177, lon: -1.9979 },
  
  // SCOZIA
  'Glasgow': { lat: 55.8642, lon: -4.2518 },
  'Edimburgo': { lat: 55.9533, lon: -3.1883 },
  'Aberdeen': { lat: 57.1497, lon: -2.0943 },
  'Dundee': { lat: 56.4620, lon: -2.9707 },
  'Kilmarnock': { lat: 55.6100, lon: -4.4975 },
  'Motherwell': { lat: 55.7932, lon: -3.9864 },
  'Dingwall': { lat: 57.5956, lon: -4.4276 },
  'Perth': { lat: 56.3960, lon: -3.4370 },
  'Paisley': { lat: 55.8466, lon: -4.4230 },
  
  // FRANCIA
  'Parigi': { lat: 48.8566, lon: 2.3522 },
  'Marsiglia': { lat: 43.2965, lon: 5.3698 },
  'Lione': { lat: 45.7640, lon: 4.8357 },
  'Lilla': { lat: 50.6292, lon: 3.0573 },
  'Monaco': { lat: 43.7102, lon: 7.2620 },
  'Nizza': { lat: 43.7102, lon: 7.2620 },
  'Rennes': { lat: 48.1173, lon: -1.6778 },
  'Strasburgo': { lat: 48.5734, lon: 7.7521 },
  'Nantes': { lat: 47.2184, lon: -1.5536 },
  'Montpellier': { lat: 43.6108, lon: 3.8767 },
  'Reims': { lat: 49.2583, lon: 4.0317 },
  'Tolosa': { lat: 43.6047, lon: 1.4442 },
  'Bordeaux': { lat: 44.8378, lon: -0.5792 },
  'Saint-Étienne': { lat: 45.4397, lon: 4.3872 },
  'Lens': { lat: 50.4319, lon: 2.8318 },
  'Brest': { lat: 48.3904, lon: -4.4868 },
  'Angers': { lat: 47.4784, lon: -0.5632 },
  'Auxerre': { lat: 47.7961, lon: 3.5706 },
  'Clermont-Ferrand': { lat: 45.7772, lon: 3.0870 },
  'Le Havre': { lat: 49.4944, lon: 0.1070 },
  'Lorient': { lat: 47.7485, lon: -3.3658 },
  'Metz': { lat: 49.1193, lon: 6.1755 },
  'Ajaccio': { lat: 41.9192, lon: 8.7386 },
  'Bastia': { lat: 42.6964, lon: 9.4500 },
  'Nancy': { lat: 48.6921, lon: 6.1844 },
  
  // GERMANIA
  'Berlino': { lat: 52.5200, lon: 13.4050 },
  'Monaco': { lat: 48.1351, lon: 11.5820 },
  'Dortmund': { lat: 51.5136, lon: 7.4653 },
  'Lipsia': { lat: 51.3397, lon: 12.3731 },
  'Leverkusen': { lat: 51.0458, lon: 6.9746 },
  'Francoforte': { lat: 50.1109, lon: 8.6821 },
  'Wolfsburg': { lat: 52.4226, lon: 10.7866 },
  'Magonza': { lat: 49.9929, lon: 8.2473 },
  'Mönchengladbach': { lat: 51.1805, lon: 6.4428 },
  'Friburgo': { lat: 47.9990, lon: 7.8421 },
  'Stoccarda': { lat: 48.7758, lon: 9.1829 },
  'Brema': { lat: 53.0793, lon: 8.8017 },
  'Sinsheim': { lat: 49.2538, lon: 8.8779 },
  'Augusta': { lat: 48.3705, lon: 10.8978 },
  'Colonia': { lat: 50.9375, lon: 6.9603 },
  'Bochum': { lat: 51.4818, lon: 7.2192 },
  'Darmstadt': { lat: 49.8728, lon: 8.6514 },
  'Heidenheim': { lat: 48.6764, lon: 10.1541 },
  'Amburgo': { lat: 53.5511, lon: 9.9937 },
  'Gelsenkirchen': { lat: 51.5177, lon: 7.0840 },
  'Norimberga': { lat: 49.4521, lon: 11.0767 },
  'Düsseldorf': { lat: 51.2277, lon: 6.7735 },
  'Hannover': { lat: 52.3759, lon: 9.7320 },
  'Karlsruhe': { lat: 49.0069, lon: 8.4037 },
  'Kiel': { lat: 54.3233, lon: 10.1228 },
  'Paderborn': { lat: 51.7184, lon: 8.7597 },
  'Spiesen-Elversberg': { lat: 49.3167, lon: 7.1333 },
  
  // GIAPPONE
  'Tokyo': { lat: 35.6762, lon: 139.6503 },
  'Kashima': { lat: 35.9660, lon: 140.6450 },
  'Saitama': { lat: 35.8616, lon: 139.6455 },
  'Kawasaki': { lat: 35.5206, lon: 139.7172 },
  'Yokohama': { lat: 35.4437, lon: 139.6380 },
  'Hiroshima': { lat: 34.3853, lon: 132.4553 },
  'Osaka': { lat: 34.6937, lon: 135.5023 },
  'Nagoya': { lat: 35.1815, lon: 136.9066 },
  'Kobe': { lat: 34.6901, lon: 135.1955 },
  'Shizuoka': { lat: 34.9769, lon: 138.3831 },
  'Tosu': { lat: 33.3700, lon: 130.5100 },
  'Oita': { lat: 33.2333, lon: 131.6000 },
  'Kashiwa': { lat: 35.8640, lon: 139.9680 },
  
  // ITALIA
  'Roma': { lat: 41.9028, lon: 12.4964 },
  'Milano': { lat: 45.4642, lon: 9.1900 },
  'Napoli': { lat: 40.8518, lon: 14.2681 },
  'Torino': { lat: 45.0703, lon: 7.6869 },
  'Firenze': { lat: 43.7696, lon: 11.2558 },
  'Bergamo': { lat: 45.6980, lon: 9.6773 },
  'Bologna': { lat: 44.4949, lon: 11.3426 },
  'Genova': { lat: 44.4056, lon: 8.9463 },
  'Reggio Emilia': { lat: 44.6988, lon: 10.6324 },
  'Empoli': { lat: 43.7188, lon: 10.9455 },
  'Salerno': { lat: 40.6823, lon: 14.7700 },
  'Lecce': { lat: 40.3547, lon: 18.1724 },
  'Verona': { lat: 45.4384, lon: 10.9916 },
  'Cagliari': { lat: 39.2238, lon: 9.1217 },
  'Monza': { lat: 45.5883, lon: 9.2738 },
  'Parma': { lat: 44.8015, lon: 10.3280 },
  'Como': { lat: 45.8080, lon: 9.0852 },
  'Venezia': { lat: 45.4408, lon: 12.3155 },
  'Udine': { lat: 46.0642, lon: 13.2341 },
  'Palermo': { lat: 38.1157, lon: 13.3615 },
  'Bari': { lat: 41.1171, lon: 16.8719 },
  'Cremona': { lat: 45.1363, lon: 10.0191 },
  'Pisa': { lat: 43.7228, lon: 10.4017 },
  'La Spezia': { lat: 44.1025, lon: 9.8241 },
  'Brescia': { lat: 45.5415, lon: 10.2117 },
  'Catanzaro': { lat: 38.9101, lon: 16.5876 },
  'Frosinone': { lat: 41.6397, lon: 13.3511 },
  'Modena': { lat: 44.6480, lon: 10.9252 },
  'Cittadella': { lat: 45.6483, lon: 11.7846 },
  'Mantova': { lat: 45.1564, lon: 10.7914 },
  'Cesena': { lat: 44.1390, lon: 12.2420 },
  'Castellammare di Stabia': { lat: 40.6954, lon: 14.4804 },
  'Carrara': { lat: 44.0798, lon: 10.0998 },
  'Bolzano': { lat: 46.4980, lon: 11.3548 },
  'Vercelli': { lat: 45.3211, lon: 8.4197 },
  'Busto Arsizio': { lat: 45.6109, lon: 8.8499 },
  'Albino': { lat: 45.7630, lon: 9.7930 },
  'Gorgonzola': { lat: 45.5300, lon: 9.4100 },
  'Renate': { lat: 45.7250, lon: 9.2800 },
  'Vicenza': { lat: 45.5455, lon: 11.5359 },
  'Padova': { lat: 45.4064, lon: 11.8768 },
  'Trieste': { lat: 45.6495, lon: 13.7768 },
  'Lecco': { lat: 45.8550, lon: 9.3900 },
  'Salò': { lat: 45.6070, lon: 10.5230 },
  'Lumezzane': { lat: 45.6500, lon: 10.2700 },
  'Perugia': { lat: 43.1107, lon: 12.3892 },
  'Terni': { lat: 42.5636, lon: 12.6415 },
  'Gubbio': { lat: 43.3513, lon: 12.5771 },
  'Pescara': { lat: 42.4646, lon: 14.2136 },
  'Ascoli Piceno': { lat: 42.8528, lon: 13.5742 },
  'Rimini': { lat: 44.0573, lon: 12.5685 },
  'Arezzo': { lat: 43.4668, lon: 11.8782 },
  'Sestri Levante': { lat: 44.2700, lon: 9.4000 },
  'Chiavari': { lat: 44.3170, lon: 9.3220 },
  'Sassari': { lat: 40.7269, lon: 8.5592 },
  'Olbia': { lat: 40.9230, lon: 9.4960 },
  'Piancastagnaio': { lat: 42.8500, lon: 11.6800 },
  'Avellino': { lat: 40.9145, lon: 14.7891 },
  'Benevento': { lat: 41.1296, lon: 14.7780 },
  'Caserta': { lat: 41.0759, lon: 14.3327 },
  'Foggia': { lat: 41.4626, lon: 15.5446 },
  'Giugliano in Campania': { lat: 40.9300, lon: 14.2100 },
  'Latina': { lat: 41.4662, lon: 12.9037 },
  'Messina': { lat: 38.1938, lon: 15.5540 },
  'Monopoli': { lat: 40.9494, lon: 17.3028 },
  'Picerno': { lat: 40.6400, lon: 15.6400 },
  'Potenza': { lat: 40.6428, lon: 15.7990 },
  'Sorrento': { lat: 40.6264, lon: 14.3758 },
  'Taranto': { lat: 40.4644, lon: 17.2472 },
  'Altamura': { lat: 40.8200, lon: 16.5500 },
  'Trapani': { lat: 38.0187, lon: 12.5137 },
  'Torre del Greco': { lat: 40.7859, lon: 14.3675 },
  
  // COREA
  'Seul': { lat: 37.5665, lon: 126.9780 },
  'Ulsan': { lat: 35.5384, lon: 129.3114 },
  'Jeonju': { lat: 35.8242, lon: 127.1480 },
  'Pohang': { lat: 36.0190, lon: 129.3435 },
  'Daegu': { lat: 35.8714, lon: 128.6014 },
  'Chuncheon': { lat: 37.8813, lon: 127.7298 },
  'Suwon': { lat: 37.2636, lon: 127.0286 },
  'Jeju': { lat: 33.4996, lon: 126.5312 },
  'Incheon': { lat: 37.4563, lon: 126.7052 },
  'Gwangju': { lat: 35.1600, lon: 126.8514 },
  'Daejeon': { lat: 36.3504, lon: 127.3845 },
  
  // OLANDA
  'Amsterdam': { lat: 52.3676, lon: 4.9041 },
  'Rotterdam': { lat: 51.9244, lon: 4.4777 },
  'Eindhoven': { lat: 51.4416, lon: 5.4697 },
  'Alkmaar': { lat: 52.6324, lon: 4.7534 },
  'Utrecht': { lat: 52.0907, lon: 5.1214 },
  'Enschede': { lat: 52.2215, lon: 6.8937 },
  'Heerenveen': { lat: 52.9597, lon: 5.9403 },
  'Arnhem': { lat: 51.9851, lon: 5.8987 },
  'Groningen': { lat: 53.2194, lon: 6.5665 },
  'Nijmegen': { lat: 51.8425, lon: 5.8528 },
  'Tilburg': { lat: 51.5555, lon: 5.0913 },
  'Breda': { lat: 51.5719, lon: 4.7683 },
  'Zwolle': { lat: 52.5167, lon: 6.0833 },
  'Deventer': { lat: 52.2533, lon: 6.1583 },
  'Almelo': { lat: 52.3567, lon: 6.6567 },
  'Waalwijk': { lat: 51.6825, lon: 5.0708 },
  'Sittard': { lat: 50.9983, lon: 5.8694 },
  'Volendam': { lat: 52.4950, lon: 5.0700 },
  '\'s-Hertogenbosch': { lat: 51.6978, lon: 5.3037 },
  'Doetinchem': { lat: 51.9653, lon: 6.2938 },
  'Velsen': { lat: 52.4600, lon: 4.6300 },
  'Helmond': { lat: 51.4814, lon: 5.6538 },
  'Maastricht': { lat: 50.8514, lon: 5.6910 },
  'L\'Aia': { lat: 52.0705, lon: 4.3007 },
  'Oss': { lat: 51.7600, lon: 5.5200 },
  
  // PORTOGALLO
  'Lisbona': { lat: 38.7223, lon: -9.1393 },
  'Porto': { lat: 41.1579, lon: -8.6291 },
  'Braga': { lat: 41.5454, lon: -8.4265 },
  'Guimarães': { lat: 41.4426, lon: -8.2918 },
  'Vila do Conde': { lat: 41.3545, lon: -8.7440 },
  'Faro': { lat: 37.0162, lon: -7.9328 },
  'Funchal': { lat: 32.6509, lon: -16.9080 },
  'Setúbal': { lat: 38.5244, lon: -8.8882 },
  'Barcelos': { lat: 41.5300, lon: -8.6150 },
  'Vila Nova de Famalicão': { lat: 41.4110, lon: -8.5200 },
  'Moreira de Cónegos': { lat: 41.3800, lon: -8.3300 },
  'Ponta Delgada': { lat: 37.7462, lon: -25.6684 },
  'Estoril': { lat: 38.7057, lon: -9.3960 },
  'Portimão': { lat: 37.1367, lon: -8.5370 },
  
  // SPAGNA
  'Madrid': { lat: 40.4168, lon: -3.7038 },
  'Barcellona': { lat: 41.3851, lon: 2.1734 },
  'Siviglia': { lat: 37.3891, lon: -5.9845 },
  'Bilbao': { lat: 43.2630, lon: -2.9350 },
  'San Sebastián': { lat: 43.3183, lon: -1.9812 },
  'Valencia': { lat: 39.4699, lon: -0.3763 },
  'Villarreal': { lat: 39.9383, lon: -0.1005 },
  'Pamplona': { lat: 42.8125, lon: -1.6458 },
  'Vigo': { lat: 42.2406, lon: -8.7207 },
  'Getafe': { lat: 40.3100, lon: -3.7300 },
  'Palma di Maiorca': { lat: 39.5696, lon: 2.6502 },
  'Granada': { lat: 37.1765, lon: -3.5970 },
  'Girona': { lat: 41.9794, lon: 2.8214 },
  'Vitoria-Gasteiz': { lat: 42.8467, lon: -2.6716 },
  'Las Palmas': { lat: 28.1235, lon: -15.4363 },
  'Leganés': { lat: 40.3275, lon: -3.7642 },
  'Santander': { lat: 43.4623, lon: -3.8099 },
  'La Coruña': { lat: 43.3623, lon: -8.4115 },
  'Elche': { lat: 38.2622, lon: -0.7011 },
  'Málaga': { lat: 36.7202, lon: -4.4203 },
  'Zaragoza': { lat: 41.6488, lon: -0.8891 },
  'Santa Cruz de Tenerife': { lat: 28.4636, lon: -16.2518 },
  'Eibar': { lat: 43.1847, lon: -2.4733 },
  'Almería': { lat: 36.8413, lon: -2.4634 },
  'Huesca': { lat: 42.1400, lon: -0.4089 },
  'Miranda de Ebro': { lat: 42.6869, lon: -2.9477 },
  'Cartagena': { lat: 37.6257, lon: -0.9860 },
  'Burgos': { lat: 42.3439, lon: -3.6970 },
  'Fuenlabrada': { lat: 40.2844, lon: -3.7946 },
  'Lugo': { lat: 43.0099, lon: -7.5561 },
  'Ponferrada': { lat: 42.5468, lon: -6.5936 },
  
  // TURCHIA
  'Istanbul': { lat: 41.0082, lon: 28.9784 },
  'Ankara': { lat: 39.9334, lon: 32.8597 },
  'Izmir': { lat: 38.4192, lon: 27.1287 },
  'Antalya': { lat: 36.8841, lon: 30.7056 },
  'Adana': { lat: 37.0000, lon: 35.3213 },
  'Gaziantep': { lat: 37.0662, lon: 37.3833 },
  'Konya': { lat: 37.8714, lon: 32.4846 },
  'Trabzon': { lat: 41.0027, lon: 39.7168 },
  'Samsun': { lat: 41.2863, lon: 36.3300 },
  'Kayseri': { lat: 38.7312, lon: 35.4788 },
  'Sivas': { lat: 39.7484, lon: 37.0162 },
  'Rize': { lat: 41.0201, lon: 40.5219 },
  'Antakya': { lat: 36.2024, lon: 36.1635 },
  'Alanya': { lat: 36.5441, lon: 31.9892 },
  
  // USA/CANADA
  'New York': { lat: 40.7128, lon: -74.0060 },
  'Los Angeles': { lat: 34.0522, lon: -118.2437 },
  'Chicago': { lat: 41.8781, lon: -87.6298 },
  'Houston': { lat: 29.7604, lon: -95.3698 },
  'Phoenix': { lat: 33.4484, lon: -112.0740 },
  'Philadelphia': { lat: 39.9526, lon: -75.1652 },
  'San Diego': { lat: 32.7157, lon: -117.1611 },
  'Dallas': { lat: 32.7767, lon: -96.7970 },
  'San Jose': { lat: 37.3382, lon: -121.8863 },
  'Austin': { lat: 30.2672, lon: -97.7431 },
  'Columbus': { lat: 39.9612, lon: -82.9988 },
  'San Francisco': { lat: 37.7749, lon: -122.4194 },
  'Charlotte': { lat: 35.2271, lon: -80.8431 },
  'Indianapolis': { lat: 39.7684, lon: -86.1581 },
  'Seattle': { lat: 47.6062, lon: -122.3321 },
  'Denver': { lat: 39.7392, lon: -104.9903 },
  'Washington': { lat: 38.9072, lon: -77.0369 },
  'Boston': { lat: 42.3601, lon: -71.0589 },
  'Nashville': { lat: 36.1627, lon: -86.7816 },
  'Portland': { lat: 45.5051, lon: -122.6750 },
  'Las Vegas': { lat: 36.1699, lon: -115.1398 },
  'Detroit': { lat: 42.3314, lon: -83.0458 },
  'Memphis': { lat: 35.1495, lon: -90.0490 },
  'Louisville': { lat: 38.2527, lon: -85.7585 },
  'Baltimore': { lat: 39.2904, lon: -76.6122 },
  'Milwaukee': { lat: 43.0389, lon: -87.9065 },
  'Kansas City': { lat: 39.0997, lon: -94.5786 },
  'Miami': { lat: 25.7617, lon: -80.1918 },
  'Atlanta': { lat: 33.7490, lon: -84.3880 },
  'Orlando': { lat: 28.5383, lon: -81.3792 },
  'Minneapolis': { lat: 44.9778, lon: -93.2650 },
  'Cleveland': { lat: 41.4993, lon: -81.6944 },
  'Pittsburgh': { lat: 40.4406, lon: -79.9959 },
  'St. Louis': { lat: 38.6270, lon: -90.1994 },
  'Cincinnati': { lat: 39.1031, lon: -84.5120 },
  'Salt Lake City': { lat: 40.7608, lon: -111.8910 },
  'Raleigh': { lat: 35.7796, lon: -78.6382 },
  'Toronto': { lat: 43.6532, lon: -79.3832 },
  'Vancouver': { lat: 49.2827, lon: -123.1207 },
  'Montreal': { lat: 45.5017, lon: -73.5673 },
  
  // AUSTRALIA
  'Sydney': { lat: -33.8688, lon: 151.2093 },
  'Melbourne': { lat: -37.8136, lon: 144.9631 },
  'Brisbane': { lat: -27.4698, lon: 153.0251 },
  'Perth': { lat: -31.9505, lon: 115.8605 },
  'Adelaide': { lat: -34.9285, lon: 138.6007 },
  'Newcastle': { lat: -32.9283, lon: 151.7817 },
  'Gosford': { lat: -33.4244, lon: 151.3422 },
  'Wellington': { lat: -41.2865, lon: 174.7762 },
  
  // SVEZIA
  'Stoccolma': { lat: 59.3293, lon: 18.0686 },
  'Malmö': { lat: 55.6050, lon: 13.0038 },
  'Göteborg': { lat: 57.7089, lon: 11.9746 },
  'Borås': { lat: 57.7210, lon: 12.9401 },
  'Kalmar': { lat: 56.6616, lon: 16.3616 },
  'Norrköping': { lat: 58.5940, lon: 16.1826 },
  'Uppsala': { lat: 59.8586, lon: 17.6389 },
  'Varberg': { lat: 57.1055, lon: 12.2508 },
  'Degerfors': { lat: 59.2380, lon: 14.4310 },
  'Hällevik': { lat: 56.0200, lon: 14.7100 },
  'Värnamo': { lat: 57.1800, lon: 14.0400 },
  
  // NORVEGIA
  'Oslo': { lat: 59.9139, lon: 10.7522 },
  'Bodø': { lat: 67.2820, lon: 14.3751 },
  'Molde': { lat: 62.7333, lon: 7.1833 },
  'Trondheim': { lat: 63.4305, lon: 10.3951 },
  'Bergen': { lat: 60.3913, lon: 5.3221 },
  'Lillestrøm': { lat: 59.9540, lon: 11.0490 },
  'Skien': { lat: 59.2090, lon: 9.6090 },
  'Drammen': { lat: 59.7439, lon: 10.2045 },
  'Stavanger': { lat: 58.9700, lon: 5.7331 },
  'Sarpsborg': { lat: 59.2833, lon: 11.1167 },
  'Bærum': { lat: 59.9250, lon: 10.4500 },
  'Tromsø': { lat: 69.6492, lon: 18.9553 },
  'Hamar': { lat: 60.7945, lon: 11.0680 },
  'Sandefjord': { lat: 59.1310, lon: 10.2160 },
  
  // DANIMARCA
  'Copenaghen': { lat: 55.6761, lon: 12.5683 },
  'Brøndby': { lat: 55.6500, lon: 12.4167 },
  'Herning': { lat: 56.1360, lon: 8.9760 },
  'Aarhus': { lat: 56.1629, lon: 10.2039 },
  'Randers': { lat: 56.4600, lon: 10.0400 },
  'Odense': { lat: 55.3959, lon: 10.3883 },
  'Aalborg': { lat: 57.0488, lon: 9.9217 },
  'Viborg': { lat: 56.4532, lon: 9.4020 },
  'Silkeborg': { lat: 56.1698, lon: 9.5450 },
  'Farum': { lat: 55.8100, lon: 12.3700 },
  'Kongens Lyngby': { lat: 55.7700, lon: 12.5000 },
  'Vejle': { lat: 55.7090, lon: 9.5350 },
  
  // SVIZZERA
  'Berna': { lat: 46.9480, lon: 7.4474 },
  'Basilea': { lat: 47.5596, lon: 7.5886 },
  'Ginevra': { lat: 46.2044, lon: 6.1432 },
  'Zurigo': { lat: 47.3769, lon: 8.5417 },
  'Lugano': { lat: 46.0050, lon: 8.9520 },
  'San Gallo': { lat: 47.4240, lon: 9.3770 },
  'Sion': { lat: 46.2340, lon: 7.3620 },
  'Losanna': { lat: 46.5197, lon: 6.6323 },
  'Yverdon': { lat: 46.7780, lon: 6.6410 },
  'Winterthur': { lat: 47.4980, lon: 8.7260 },
  'Lucerna': { lat: 47.0500, lon: 8.3060 },
  
  // AUSTRIA
  'Vienna': { lat: 48.2082, lon: 16.3738 },
  'Salisburgo': { lat: 47.8095, lon: 13.0550 },
  'Graz': { lat: 47.0707, lon: 15.4395 },
  'Linz': { lat: 48.3069, lon: 14.2858 },
  'Wolfsberg': { lat: 46.8400, lon: 14.8400 },
  'Innsbruck': { lat: 47.2692, lon: 11.4041 },
  'Klagenfurt': { lat: 46.6248, lon: 14.3052 },
  'Altach': { lat: 47.3500, lon: 9.6500 },
  'Hartberg': { lat: 47.2833, lon: 15.9667 },
  'Ried im Innkreis': { lat: 48.2167, lon: 13.4833 },
  
  // RUSSIA
  'Mosca': { lat: 55.7558, lon: 37.6173 },
  'San Pietroburgo': { lat: 59.9343, lon: 30.3351 },
  'Krasnodar': { lat: 45.0355, lon: 38.9750 },
  'Rostov sul Don': { lat: 47.2357, lon: 39.7015 },
  'Sochi': { lat: 43.5855, lon: 39.7231 },
  'Samara': { lat: 53.1959, lon: 50.1000 },
  'Nižnij Novgorod': { lat: 56.2965, lon: 43.9361 },
  'Ekaterinburg': { lat: 56.8389, lon: 60.6057 },
  'Grozny': { lat: 43.3180, lon: 45.6980 },
  'Kazan': { lat: 55.7887, lon: 49.1221 },
  'Orenburg': { lat: 51.7682, lon: 55.0970 },
  'Voronezh': { lat: 51.6606, lon: 39.2003 },
  'Khimki': { lat: 55.8884, lon: 37.4450 },
  
  // MESSICO
  'Città del Messico': { lat: 19.4326, lon: -99.1332 },
  'Guadalajara': { lat: 20.6597, lon: -103.3496 },
  'Monterrey': { lat: 25.6866, lon: -100.3161 },
  'Torreón': { lat: 25.5420, lon: -103.4070 },
  'Pachuca': { lat: 20.1200, lon: -98.7330 },
  'Tijuana': { lat: 32.5149, lon: -117.0382 },
  'Aguascalientes': { lat: 21.8798, lon: -102.2960 },
  'León': { lat: 21.1250, lon: -101.6820 },
  'Puebla': { lat: 19.0414, lon: -98.2063 },
  'Mazatlán': { lat: 23.2494, lon: -106.4111 },
  'Ciudad Juárez': { lat: 31.7450, lon: -106.4370 }
};

// ============================================================
// FUNZIONE PER OTTENERE LA CITTÀ DA SQUADRA O CAMPIONATO
// ============================================================

function getCityForMatch(teamName, championship) {
  if (!teamName) return null;
  
  // Prima cerca dalla mappa squadre
  const cityFromTeam = TEAM_CITY_MAP[teamName];
  if (cityFromTeam) return cityFromTeam;
  
  // Cerca per corrispondenza parziale
  for (const [key, city] of Object.entries(TEAM_CITY_MAP)) {
    if (teamName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(teamName.toLowerCase())) {
      return city;
    }
  }
  
  // Poi dal campionato
  if (championship) {
    const cityFromChamp = CITTÀ_PER_CAMPIONATO[championship];
    if (cityFromChamp) return cityFromChamp;
    
    // Cerca per corrispondenza parziale nel campionato
    for (const [key, city] of Object.entries(CITTÀ_PER_CAMPIONATO)) {
      if (championship.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(championship.toLowerCase())) {
        return city;
      }
    }
  }
  
  return null;
}

// ============================================================
// FUNZIONE PER LA BANDIERA DAL CAMPIONATO
// ============================================================

function getCountryFlagHtml(champName) {
  if (!champName) return '<span class="flag-emoji">🌍</span>';
  
  // Cerca corrispondenza esatta
  const exactMatchMap = {
    // ARGENTINA
    'Liga Profesional': 'AR',
    'Liga Profesional Argentina': 'AR',
    
    // BELGIO
    'Jupiler Pro League': 'BE',
    'Belgian Pro League': 'BE',
    
    // BRASILE
    'Serie A (Brasile)': 'BR',
    'Serie A BR': 'BR',
    'Brasileirão': 'BR',
    
    // CINA
    'Super League': 'CN',
    'Chinese Super League': 'CN',
    'CSL': 'CN',
    
    // INGHILTERRA
    'Premier League': 'GB',
    'English Premier League': 'GB',
    'EPL': 'GB',
    'Championship': 'GB',
    'EFL Championship': 'GB',
    'Premiership': 'GB',
    'Scottish Premiership': 'GB',
    'Scottish Premier League': 'GB',
    
    // FRANCIA
    'Ligue 1': 'FR',
    'Ligue 2': 'FR',
    
    // GERMANIA
    'Bundesliga': 'DE',
    '2. Bundesliga': 'DE',
    
    // GIAPPONE
    'J1 League': 'JP',
    'J-League': 'JP',
    
    // ITALIA
    'Serie A (Italia)': 'IT',
    'Serie A IT': 'IT',
    'Serie A': 'IT',
    'Serie A TIM': 'IT',
    'Serie A Enilive': 'IT',
    'Serie B': 'IT',
    'Serie B IT': 'IT',
    'Serie C - Girone A': 'IT',
    'Serie C - Girone B': 'IT',
    'Serie C - Girone C': 'IT',
    'Serie A Women': 'IT',
    'Serie A Women IT': 'IT',
    
    // COREA
    'K League 1': 'KR',
    'K League': 'KR',
    'K-League': 'KR',
    
    // OLANDA
    'Eerste Divisie': 'NL',
    'Eerste Divisie NL': 'NL',
    
    // PORTOGALLO
    'Primeira Liga': 'PT',
    'Liga Portugal': 'PT',
    
    // SPAGNA
    'LaLiga': 'ES',
    'La Liga': 'ES',
    'Segunda División': 'ES',
    
    // TURCHIA
    'Süper Lig': 'TR',
    'Super Lig': 'TR',
    'Turkish Süper Lig': 'TR',
    
    // USA/CANADA
    'Major League Soccer': 'US',
    'MLS': 'US',
    'NWSL': 'US',
    'National Women\'s Soccer League': 'US',
    
    // AUSTRALIA
    'A-League': 'AU',
    'A-League Men': 'AU',
    
    // SVEZIA
    'Allsvenskan': 'SE',
    
    // NORVEGIA
    'Eliteserien': 'NO',
    
    // DANIMARCA
    'Danish Superliga': 'DK',
    
    // SVIZZERA
    'Swiss Super League': 'CH',
    
    // AUSTRIA
    'Austrian Bundesliga': 'AT',
    
    // RUSSIA
    'Russian Premier League': 'RU',
    
    // MESSICO
    'Liga MX': 'MX'
  };
  
  if (exactMatchMap[champName]) {
    const codeLower = exactMatchMap[champName].toLowerCase();
    return `<img src="https://flagcdn.com/${codeLower}.svg" alt="${exactMatchMap[champName]}" class="flag-icon" width="20" height="15" loading="lazy" style="display:inline-block; vertical-align:middle; margin-right:6px; width:20px; height:15px; border-radius:2px; object-fit:cover; box-shadow: 0 1px 2px rgba(0,0,0,0.3);" />`;
  }
  
  // Cerca per corrispondenza parziale
  const partialMatchMap = {
    'Premier': 'GB', 'Championship': 'GB', 'League': 'GB',
    'Serie': 'IT', 'Bundesliga': 'DE', 'Ligue': 'FR',
    'La Liga': 'ES', 'Eredivisie': 'NL', 'Primeira': 'PT',
    'Liga Portugal': 'PT', 'MLS': 'US', 'NWSL': 'US',
    'A-League': 'AU', 'Scottish': 'GB', 'Süper Lig': 'TR',
    'Super Lig': 'TR', 'J1': 'JP', 'K League': 'KR',
    'Liga Profesional': 'AR', 'Jupiler': 'BE', 'Serie A (Brasile)': 'BR',
    'Super League': 'CN', 'Eerste Divisie': 'NL',
    'Segunda División': 'ES', 'Premiership': 'GB',
    'Allsvenskan': 'SE', 'Eliteserien': 'NO',
    'Danish Superliga': 'DK', 'Swiss Super League': 'CH',
    'Austrian Bundesliga': 'AT', 'Russian Premier League': 'RU',
    'Liga MX': 'MX'
  };
  
  const sortedKeys = Object.keys(partialMatchMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (champName.includes(key)) {
      const codeLower = partialMatchMap[key].toLowerCase();
      return `<img src="https://flagcdn.com/${codeLower}.svg" alt="${partialMatchMap[key]}" class="flag-icon" width="20" height="15" loading="lazy" style="display:inline-block; vertical-align:middle; margin-right:6px; width:20px; height:15px; border-radius:2px; object-fit:cover; box-shadow: 0 1px 2px rgba(0,0,0,0.3);" />`;
    }
  }
  
  return '<span class="flag-emoji">🌍</span>';
}

// ============================================================
// FUNZIONE PER IL METEO (CON LE COORDINATE AGGIORNATE)
// ============================================================

async function fetchWeatherForMatch(match) {
  if (!match) return null;
  const city = getCityForMatch(match.casa, match.campionato);
  if (!city) {
    console.warn('⚠️ Città non trovata per:', match.casa, match.campionato);
    return null;
  }
  
  let coord = COORDS[city];
  if (!coord) {
    // Prova geocoding se la città non è nella mappa
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it&format=json`
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          coord = { lat: geoData.results[0].latitude, lon: geoData.results[0].longitude };
          console.log(`🌍 Geocodificata ${city} -> ${coord.lat}, ${coord.lon}`);
        }
      }
    } catch (e) { console.warn('Geocoding fallito per', city); }
  }
  
  if (!coord) {
    coord = { lat: 48.8566, lon: 2.3522 };
    console.warn(`⚠️ Coordinate non trovate per ${city}, usando Parigi come default`);
  }
  
  let dateToUse;
  if (match.data && match.data.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    const parts = match.data.split('/');
    dateToUse = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  } else if (match.data && match.data.match(/^\d{4}-\d{2}-\d{2}/)) {
    dateToUse = match.data;
  } else {
    dateToUse = new Date().toISOString().slice(0, 10);
  }
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&start_date=${dateToUse}&end_date=${dateToUse}`;
    console.log(`🌤️ Richiesta meteo per ${city} (${dateToUse}): ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.daily) { console.warn('⚠️ Nessun dato daily per', city); return null; }
    const weatherCode = data.daily.weathercode?.[0] || 0;
    return {
      temp: data.current_weather?.temperature || 0,
      temp_min: data.daily.temperature_2m_min?.[0] || 0,
      temp_max: data.daily.temperature_2m_max?.[0] || 0,
      weather: getWeatherDescription(weatherCode),
      wind_speed: data.current_weather?.windspeed || 0,
      rain: data.daily.precipitation_sum?.[0] || 0,
      forecast_date: dateToUse,
      city: city
    };
  } catch (error) {
    console.warn('❌ Errore meteo per', city, error.message);
    return null;
  }
}

function getWeatherDescription(code) {
  const weatherCodes = {
    0: 'Sereno', 1: 'Poco nuvoloso', 2: 'Parzialmente nuvoloso', 3: 'Coperto',
    45: 'Nebbia', 48: 'Nebbia ghiacciata',
    51: 'Pioviggine leggera', 53: 'Pioviggine moderata', 55: 'Pioviggine fitta',
    56: 'Pioviggine gelata leggera', 57: 'Pioviggine gelata fitta',
    61: 'Pioggia leggera', 63: 'Pioggia moderata', 65: 'Pioggia fitta',
    66: 'Pioggia gelata leggera', 67: 'Pioggia gelata fitta',
    71: 'Neve leggera', 73: 'Neve moderata', 75: 'Neve fitta',
    77: 'Granuli di neve',
    80: 'Rovesci di pioggia leggeri', 81: 'Rovesci di pioggia moderati', 82: 'Rovesci di pioggia forti',
    85: 'Rovesci di neve leggeri', 86: 'Rovesci di neve forti',
    95: 'Temporale leggero', 96: 'Temporale con grandine leggera', 99: 'Temporale con grandine forte'
  };
  return weatherCodes[code] || 'Condizioni variabili';
}

// ============================================================
// ESPORTAZIONE PER L'APP
// ============================================================

// Esponi le funzioni e i dati globalmente per l'uso nell'app
window.CHAMPIONSHIP_COUNTRY = CHAMPIONSHIP_COUNTRY;
window.CITTÀ_PER_CAMPIONATO = CITTÀ_PER_CAMPIONATO;
window.TEAM_CITY_MAP = TEAM_CITY_MAP;
window.COORDS = COORDS;
window.getCityForMatch = getCityForMatch;
window.getCountryFlagHtml = getCountryFlagHtml;
window.fetchWeatherForMatch = fetchWeatherForMatch;
window.getWeatherDescription = getWeatherDescription;

console.log('✅ meteo.js caricato - ' + Object.keys(COORDS).length + ' città disponibili');