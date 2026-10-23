// ============================================================
// pdf-quote-parser.js — v3 (fix definitivo)
// Fix principali:
// - isRigaData: logica stagione calcistica corretta (Lug-Dic / Gen-Giu)
// - PREFISSI_SQUADRA: rimossi u23/u21/u19 (identificatori squadra, non prefissi)
// - parseMarathonbetPDF: campionato estratto anche a fine riga
// - TRADUZIONI: Juventus Next Gen → juventus, aggiunte diverse squadre
// - normalizzaNome: log diagnostico in DEBUG
// ============================================================

(function () {
  'use strict';

  const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  const MESI_NUM = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5, 'giugno': 6,
    'luglio': 7, 'agosto': 8, 'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
  };

  const STORAGE_KEY = 'ft_quote_pdf';
  const STORAGE_META_KEY = 'ft_quote_pdf_meta';
  const SOGLIA_MATCH = 0.55;
  const GIORNI_SCADENZA = 7;

  // ============================================================
  // TRADUZIONI SQUADRE
  // ============================================================
  const TRADUZIONI_SQUADRE = {
    // --- Refusi PDF ---
    'barri': 'bari',
    'novara': 'novara',

    // --- Squadre "next gen" / primavera ---
    'juventusnextgen': 'juventus',
    'juventusnextgenu23': 'juventus',
    'juventusu23': 'juventus',
    'nextgen': 'juventus',
    'interu23': 'inter',
    'atalantau23': 'atalanta',
    'milanu23': 'milan',

    // --- Spagna ---
    'siviglia': 'sevilla',
    'barcellona': 'barcelona',
    'real madrid': 'realmadrid',
    'atletico madrid': 'atleticomadrid',
    'athletic bilbao': 'athleticbilbao',
    'real betis': 'realbetis',
    'real sociedad': 'realsociedad',
    'realsociedadb': 'realsociedadb',
    'real valladolid': 'realvalladolid',
    'rayo vallecano': 'rayovallecano',
    'rc celta': 'celta',
    'rc celta fortuna': 'celtafortuna',
    'celta fortuna': 'celtafortuna',
    'ud las palmas': 'laspalmas',
    'las palmas': 'laspalmas',
    'deportivo alaves': 'alaves',
    'alaves': 'alaves',
    'cf malaga': 'malaga',
    'malaga': 'malaga',
    'cadice': 'cadice',
    'ad ceuta': 'ceuta',
    'fc andorra': 'andorra',
    'burgos cf': 'burgos',
    'ce sabadell': 'sabadell',
    'ce sabadell fc': 'sabadell',
    'albacete': 'albacete',
    'eldense': 'eldense',
    'castellon': 'castellon',
    'sporting gijon': 'sportinggijon',
    'cordoba cf': 'cordoba',
    'cordoba': 'cordoba',
    'eibar': 'eibar',
    'leganes': 'leganes',
    'red maiorca': 'maiorca',
    'maiorca': 'maiorca',
    'girona': 'girona',
    'ud almeria': 'almeria',
    'almeria': 'almeria',
    'real oviedo': 'realoviedo',
    'real zaragoza': 'zaragoza',

    // --- Italia ---
    'inter': 'inter',
    'inter milano': 'intermilano',
    'milan': 'milan',
    'ac milan': 'milan',
    'juventus': 'juventus',
    'napoli': 'napoli',
    'roma': 'roma',
    'lazio': 'lazio',
    'atalanta': 'atalanta',
    'fiorentina': 'fiorentina',
    'torino': 'torino',
    'bologna': 'bologna',
    'genoa': 'genoa',
    'cagliari': 'cagliari',
    'cagliari calcio': 'cagliari',
    'udinese': 'udinese',
    'venezia': 'venezia',
    'como': 'como',
    'verona': 'verona',
    'hellas verona': 'verona',
    'parma': 'parma',
    'parma calcio': 'parma',
    'lecce': 'lecce',
    'monza': 'monza',
    'ac monza': 'monza',
    'sassuolo': 'sassuolo',
    'sassuolo calcio': 'sassuolo',
    'frosinone': 'frosinone',
    'frosinone calcio': 'frosinone',
    'empoli': 'empoli',
    'empoli fc': 'empoli',
    'salernitana': 'salernitana',
    'us salernitana': 'salernitana',
    'sampdoria': 'sampdoria',
    'spezia': 'spezia',
    'spezia calcio': 'spezia',
    'cremonese': 'cremonese',
    'palermo': 'palermo',
    'palermo fc': 'palermo',
    'bari': 'bari',
    'ssc bari': 'bari',
    'catania': 'catania',
    'catania fc': 'catania',
    'crotone': 'crotone',
    'casertana': 'casertana',
    'lr vicenza': 'vicenza',
    'vicenza': 'vicenza',
    'delfino pescara': 'pescara',
    'pescara': 'pescara',
    'perugia': 'perugia',
    'altamura': 'altamura',
    'potenza': 'potenza',
    'pineto': 'pineto',
    'gubbio': 'gubbio',
    'ac savoia': 'savoia',
    'savoia': 'savoia',
    'cosenza': 'cosenza',
    'alcione milano': 'alcione',
    'alcione': 'alcione',
    'carpi': 'carpi',
    'catanzaro': 'catanzaro',
    'us catanzaro 1929': 'catanzaro',
    'ascoli': 'ascoli',
    'trento': 'trento',
    'renate': 'renate',
    'albinoleffe': 'albinoleffe',
    'grosseto': 'grosseto',
    'ac reggiana': 'reggiana',
    'reggiana': 'reggiana',
    'ac reggiana 1919': 'reggiana',
    'forli fc': 'forli',
    'forli': 'forli',
    'us pianese': 'pianese',
    'pianese': 'pianese',
    'desenzano': 'desenzano',
    'giana erminio': 'gianaerminio',
    'torres': 'torres',
    'guidonia montecelio 1937 fc': 'guidonia',
    'guidonia': 'guidonia',
    'giugliano': 'giugliano',
    'pergolettese': 'pergolettese',
    'lumezzane': 'lumezzane',
    'lecco': 'lecco',
    'folgore caratese': 'caratese',
    'arzignano valchiampo': 'arzignano',
    'novara': 'novara',
    'vado': 'vado',
    'ostiame': 'ostiame',

    // --- Inghilterra ---
    'manchester city': 'manchestercity',
    'manchester united': 'manchesterunited',
    'newcastle': 'newcastle',
    'newcastle united': 'newcastle',
    'tottenham': 'tottenham',
    'chelsea': 'chelsea',
    'arsenal': 'arsenal',
    'liverpool': 'liverpool',
    'everton': 'everton',
    'brighton': 'brighton',
    'aston villa': 'astonvilla',
    'west ham': 'westham',
    'west ham united': 'westham',
    'crystal palace': 'crystalpalace',
    'wolverhampton': 'wolverhampton',
    'nottingham forest': 'nottinghamforest',
    'bournemouth': 'bournemouth',
    'brentford': 'brentford',
    'fulham': 'fulham',
    'fulham fc': 'fulham',
    'leeds united': 'leedsunited',
    'sunderland': 'sunderland',
    'hull city': 'hullcity',
    'ipswich town': 'ipswichtown',
    'coventry city': 'coventrycity',
    'stoke city': 'stokecity',
    'bristol city': 'bristolcity',
    'preston north end': 'preston',
    'west bromwich': 'westbromwich',
    'west bromwich albion': 'westbromwich',
    'watford': 'watford',
    'lincoln city': 'lincoln',
    'burnley': 'burnley',
    'southampton': 'southampton',
    'portsmouth': 'portsmouth',
    'millwall': 'millwall',
    'charlton athletic': 'charlton',
    'norwich': 'norwich',
    'norwich city': 'norwich',
    'sheffield united': 'sheffieldunited',
    'sheffield united fc': 'sheffieldunited',
    'derby county': 'derbycounty',

    // --- Germania ---
    'bayern monaco': 'bayernmonaco',
    'bayern munich': 'bayernmonaco',
    'borussia dortmund': 'borussiadortmund',
    'borussia monchengladbach': 'borussiamonchengladbach',
    'eintracht francoforte': 'eintrachtfrancoforte',
    'eintracht francforte': 'eintrachtfrancoforte',
    'bayer leverkusen': 'bayerleverkusen',
    'werder brema': 'werderbrema',
    'werder bremen': 'werderbrema',
    'augsburg': 'augsburg',
    'mainz': 'mainz',
    'mainz 05': 'mainz',
    'amburgo': 'amburgo',
    'hamburger sv': 'amburgo',
    'colonia': 'colonia',
    'fc koln': 'colonia',
    'friburgo': 'friburgo',
    'stoccarda': 'stoccarda',
    'union berlino': 'unionberlino',
    'union berlin': 'unionberlino',
    'schalke 04': 'schalke04',
    'schalke': 'schalke04',
    'hoffenheim': 'hoffenheim',
    'lipsia': 'lipsia',
    'rb lipsia': 'lipsia',
    'sv darmstadt 98': 'darmstadt',
    'darmstadt': 'darmstadt',
    'sv 07 elversberg': 'elversberg',
    'elversberg': 'elversberg',
    'sc paderborn': 'paderborn',
    'paderborn': 'paderborn',
    '1 fc heidenheim 1846': 'heidenheim',
    'heidenheim': 'heidenheim',
    'energie cottbus': 'cottbus',
    'cottbus': 'cottbus',
    'hertha bsc': 'hertha',
    'hertha': 'hertha',
    'dsc arminia bielefeld': 'arminiabilefeld',
    'arminia bielefeld': 'arminiabilefeld',
    'magdeburg': 'magdeburg',
    'karlsruhe': 'karlsruhe',
    'st pauli': 'stpauli',
    'vfl bochum 1848': 'bochum',
    'bochum': 'bochum',
    'wolfsburg': 'wolfsburg',
    'vfl wolfsburg': 'wolfsburg',

    // --- Francia ---
    'paris saint-germain': 'psg',
    'paris saint germain': 'psg',
    'psg': 'psg',
    'olympique marsiglia': 'marsiglia',
    'olympique marseille': 'marsiglia',
    'marsiglia': 'marsiglia',
    'monaco': 'monaco',
    'lione': 'lione',
    'lyon': 'lione',
    'lilla': 'lilla',
    'lille': 'lilla',
    'nizza': 'nizza',
    'nice': 'nizza',
    'lens': 'lens',
    'rennes': 'rennes',
    'stade rennes fc': 'rennes',
    'strasburgo': 'strasburgo',
    'strasbourg': 'strasburgo',
    'troyes': 'troyes',
    'angers': 'angers',
    'brest': 'brest',
    'auxerre': 'auxerre',
    'toulouse': 'toulouse',
    'tolosa fc': 'toulouse',
    'le havre ac': 'lehavre',
    'le havre': 'lehavre',
    'lorient': 'lorient',
    'le mans fc': 'lemans',
    'le mans': 'lemans',
    'paris fc': 'parisfc',
    'sochaux-montbeliard': 'sochaux',
    'sochaux': 'sochaux',
    'fc annecy': 'annecy',
    'annecy': 'annecy',
    'pau fc': 'pau',
    'pau': 'pau',
    'grenoble foot 38': 'grenoble',
    'grenoble': 'grenoble',
    'clermont': 'clermont',
    'guingamp': 'guingamp',
    'usl dunkerque': 'dunkerque',
    'dunkerque': 'dunkerque',
    'metz': 'metz',
    'nancy': 'nancy',
    'stade lavallois mfc': 'laval',
    'laval': 'laval',
    'digione': 'digione',
    'dijon': 'digione',
    'rodez aveyron football': 'rodez',
    'rodez': 'rodez',
    'saint etienne': 'saintetienne',
    'nantes': 'nantes',
    'us boulogne': 'boulogne',
    'boulogne': 'boulogne',
    'reims': 'reims',

    // --- Olanda ---
    'ajax': 'ajax',
    'psv eindhoven': 'psveindhoven',
    'psv': 'psveindhoven',
    'feyenoord': 'feyenoord',
    'az alkmaar': 'azalkmaar',
    'az': 'azalkmaar',
    'twente': 'twente',
    'utrecht': 'utrecht',
    'nec nimega': 'nec',
    'nec': 'nec',
    'go ahead eagles': 'goaheadeagles',
    'willem ii': 'willemii',
    'fortuna sittard': 'fortunasittard',
    'sparta rotterdam': 'spartarotterdam',
    'heerenveen': 'heerenveen',
    'groningen': 'groningen',
    'zwolle': 'zwolle',
    'ado den haag': 'adodenhaag',
    'cambuur': 'cambuur',
    'excelsior rotterdam': 'excelsior',
    'telstar': 'telstar',
    'den bosch': 'denbosch',
    'nac breda': 'nacbreda',
    'heracles almelo': 'heracles',
    'top oss': 'toposs',
    'jong ajax amsterdam youth': 'jongajax',
    'vitesse arnhem': 'vitesse',
    'emmen': 'emmen',
    'volendam': 'volendam',
    'jong fc utrecht youth': 'jongutrecht',
    'fc eindhoven': 'fceindhoven',
    'jong psv eindhoven youth': 'jongpsv',
    'mvv maastricht': 'mvv',
    'almere city fc': 'almere',
    'roda': 'roda',
    'de graafschap': 'graafschap',
    'waalwijk': 'waalwijk',
    'jong az alkmaar youth': 'jongaz',
    'helmond sport': 'helmond',
    'dordrecht': 'dordrecht',
    'venlo': 'venlo',

    // --- Portogallo ---
    'benfica': 'benfica',
    'fc porto': 'porto',
    'porto': 'porto',
    'sporting lisbona': 'sporting',
    'sporting': 'sporting',
    'sporting braga': 'braga',
    'braga': 'braga',
    'vitoria guimaraes': 'vitoriaguimaraes',
    'moreirense': 'moreirense',
    'moreirense fc': 'moreirense',
    'santa clara': 'santaclara',
    'estoril praia': 'estoril',
    'casa pia lisbona': 'casapia',
    'casa pia': 'casapia',
    'rio ave': 'rioave',
    'famalicao': 'famalicao',
    'nacional da madeira': 'nacional',
    'maritimo madeira': 'maritimo',
    'gil vicente': 'gilvicente',
    'fc alverca sad': 'alverca',
    'alverca': 'alverca',
    'arouca': 'arouca',
    'estrela amadora': 'estrelaamadora',
    'academico de viseu fc': 'academicoviseu',

    // --- Belgio ---
    'club bruges': 'clubbruges',
    'anderlecht': 'anderlecht',
    'gent': 'gent',
    'genk': 'genk',
    'standard liegi': 'standardliegi',
    'standard': 'standardliegi',
    'anversa': 'anversa',
    'antwerp': 'anversa',
    'royal charleroi': 'charleroi',
    'charleroi': 'charleroi',
    'union saint gilloise': 'unionsaintgilloise',
    'cercle brugge': 'cerclebrugge',
    'zulte waregem': 'zultewaregem',
    'kortrijk': 'kortrijk',
    'mechelen': 'mechelen',
    'sk beveren': 'beveren',
    'oud-heverlee leuven': 'leuven',
    'lommel sk': 'lommel',
    'raal la louviere': 'lalouviere',
    'st truiden': 'sinttruiden',
    'st. truidense vv': 'sinttruiden',
    'kvc westerlo': 'westerlo',

    // --- Turchia ---
    'galatasaray': 'galatasaray',
    'fenerbahce': 'fenerbahce',
    'besiktas': 'besiktas',
    'trabzonspor': 'trabzonspor',
    'basaksehir': 'basaksehir',
    'istanbul basaksehir fk': 'basaksehir',
    'samsunspor': 'samsunspor',
    'eyupspor': 'eyupspor',
    'konyaspor': 'konyaspor',
    'konyaspor club': 'konyaspor',
    'antalyaspor': 'antalyaspor',
    'alanyaspor': 'alanyaspor',
    'gaziantep fk': 'gaziantep',
    'gaziantep': 'gaziantep',
    'rizespor': 'rizespor',
    'kasimpasa': 'kasimpasa',
    'goster': 'goster',
    'kocaelispor': 'kocaelispor',
    'genclerbirligi sk': 'genclerbirligi',
    'caykur rizespor': 'rizespor',

    // --- Scozia ---
    'celtic': 'celtic',
    'glasgow rangers': 'rangers',
    'rangers': 'rangers',
    'aberdeen': 'aberdeen',
    'hearts': 'hearts',
    'heart of midlothian': 'hearts',
    'heart of midlothian fc': 'hearts',
    'hibernian': 'hibernian',
    'hibernian fc': 'hibernian',
    'dundee united': 'dundeeunited',
    'dundee fc': 'dundee',
    'motherwell': 'motherwell',
    'kilmarnock': 'kilmarnock',
    'st johnstone': 'stjohnstone',
    'st. johnstone fc': 'stjohnstone',
    'st mirren': 'stmirren',
    'st. mirren': 'stmirren',
    'falkirk': 'falkirk',

    // --- Grecia ---
    'olympiacos': 'olympiacos',
    'panathinaikos': 'panathinaikos',
    'aek atene': 'aek',
    'aek': 'aek',
    'paok': 'paok',

    // --- Corea ---
    'daejeon citizen': 'daejeon',
    'daejeon': 'daejeon',
    'fc pohang steelers': 'pohang',
    'pohang': 'pohang',
    'gimcheon sangmu': 'gimcheon',
    'gangwon': 'gangwon',
    'gwangju': 'gwangju',
    'anyang': 'anyang',
    'ulsan': 'ulsan',
    'seul': 'seul',
    'incheon united': 'incheon',
    'jeju united fc': 'jeju',
    'bucheon': 'bucheon',
    'jeonbuk fc': 'jeonbuk',

    // --- Giappone ---
    'kashima antlers': 'kashima',
    'yokohama f marinos': 'yokohama',
    'kawasaki frontale': 'kawasaki',
  };

  // ============================================================
  // PREFISSI SQUADRA (rimossi u23/u21/u19)
  // ============================================================
  const PREFISSI_SQUADRA = [
    'dsc', 'vfi', 'vfl', 'energie', 'ssc', 'usl', 'acf', 'fbc', 'asd', 'usd',
    'fc', 'ac', 'ssc', 'as', 'us', 'ss', 'asd', 'ssd', 'calcio', 'sportiva',
    'società', 'societa', 'cf', 'sk', 'sv', 'sc', 'vv', 'kvc', 'fk', 'bk',
    'if', 'ff', 'cd', 'sd', 'ud', 'rc', 'rcd', 'afc', 'cfc',
    // ❌ RIMOSSI: 'u23', 'u21', 'u19' (identificatori squadra, non prefissi)
  ];

  // ============================================================
  // NORMALIZZAZIONE NOMI
  // ============================================================
  const normalizzaNome = (nome) => {
    if (!nome) return '';
    let n = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/ø/g, 'o')
      .replace(/æ/g, 'ae');

    const prefissiRegex = new RegExp('\\b(' + PREFISSI_SQUADRA.join('|') + ')\\b', 'g');
    n = n.replace(prefissiRegex, '');

    n = n.replace(/\b(18|19|20)\d{2}\b/g, '');

    n = n.replace(/[^a-z0-9]/g, '').trim();

    if (TRADUZIONI_SQUADRE[n]) n = TRADUZIONI_SQUADRE[n];

    return n;
  };

  // ============================================================
  // NORMALIZZAZIONE DATA
  // ============================================================
  const normalizzaDataISO = (d) => {
    if (!d) return '';
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    const s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
    const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
    return s;
  };

  // ============================================================
  // ESTRAZIONE TESTO DA PDF
  // ============================================================
  const estraiRigheDaPDF = async (file) => {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js non caricato.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const tutteLeRighe = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const righeMap = new Map();

      content.items.forEach(item => {
        if (!item.str || item.str.trim() === '') return;
        const yKey = Math.round(item.transform[5] / 3) * 3;
        if (!righeMap.has(yKey)) righeMap.set(yKey, []);
        righeMap.get(yKey).push({ text: item.str, x: item.transform[4] });
      });

      const ySorted = Array.from(righeMap.keys()).sort((a, b) => b - a);
      ySorted.forEach(y => {
        const items = righeMap.get(y).sort((a, b) => a.x - b.x);
        const riga = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
        if (riga) tutteLeRighe.push({ pagina: i, y, testo: riga });
      });
    }
    return tutteLeRighe;
  };

  // ============================================================
  // RICONOSCIMENTO RIGHE
  // ============================================================
  const CAMPIONATI_RICONOSCIBILI = [
    'Italia - Serie A', 'Italia - Serie B', 'Italia - Serie C',
    'Inghilterra - Premier League', 'Inghilterra - Championship', 'Inghilterra - EFL Cup',
    'Spagna - La Liga', 'Spagna - LaLiga2', 'Spagna - LaLiga 2',
    'Germania - Bundesliga', 'Germania - 2. Bundesliga', 'Germania - 2',
    'Francia - Ligue 1', 'Francia - Ligue 2',
    'Olanda - Eredivisie', 'Olanda - Eerste Divisie', 'Olanda - Erdiveisie',
    'Portogallo - Liga Portugal', 'Belgio - Pro League',
    'Turchia - Süper Lig', 'Scozia - Premiership',
    'Repubblica di Corea - K-Legue 1', 'Corea - K League 1',
    'Jupiler Pro League', 'Premier League', 'Ligue 1', 'Ligue 2',
    'Bundesliga', '2. Bundesliga', 'Serie A', 'Serie B',
    'Eredivisie', 'Eerste Divisie', 'Primeira Liga', 'La Liga',
  ];

  const isIntestazioneCampionato = (testo) => {
    const pattern = /^([A-Z][a-zà-ù]+(?:\s+di\s+[A-Z][a-zà-ù]+)?)\s+-\s+(.+)$/;
    const match = testo.match(pattern);
    if (!match) return null;
    if (GIORNI.some(g => testo.includes(g))) return null;
    const campionato = testo.trim();
    const isKnown = CAMPIONATI_RICONOSCIBILI.some(c =>
      campionato.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(campionato.toLowerCase())
    );
    return isKnown ? campionato : null;
  };

  // ⭐ NUOVO: estrae un campionato dalla riga (anche in coda)
  const estraiCampionatoDaRiga = (testo) => {
    // Cerca pattern tipo "Italia - Serie A" o "Spagna - LaLiga 2"
    const pattern = /([A-Z][a-zà-ù]+(?:\s+di\s+[A-Z][a-zà-ù]+)?\s+-\s+(?:Serie [A-Z]|Serie C - Girone [A-Z]|Premier League|Championship|EFL Championship|La ?Liga(?:\s?\d)?|Ligue [12]|Bundesliga|2\. Bundesliga|2|Eredivisie|Eerste Divisie|Erdiveisie|Primeira Liga|Liga Portugal|Pro League|Jupiler Pro League|Süper Lig|K[- ]Legue 1|K League 1|J1 League|Scottish Premiership|Premiership|Segunda Divisi[oó]n))/;
    const match = testo.match(pattern);
    if (!match) return null;
    const candidato = match[1].trim();
    const isKnown = CAMPIONATI_RICONOSCIBILI.some(c =>
      candidato.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(candidato.toLowerCase())
    );
    return isKnown ? candidato : null;
  };

  // ============================================================
  // isRigaData — FIX stagione calcistica
  // ============================================================
  const isRigaData = (testo) => {
    const pattern = new RegExp(
      `^(${GIORNI.join('|')})\\s+(\\d{1,2})\\s+(${MESI.join('|')})`,
      'i'
    );
    const match = testo.match(pattern);
    if (!match) return null;

    const giorno = match[2].padStart(2, '0');
    const mese = MESI_NUM[match[3].toLowerCase()] || 1;
    const meseStr = String(mese).padStart(2, '0');

    const oggi = new Date();
    const annoCorrente = oggi.getFullYear();
    const meseCorrente = oggi.getMonth() + 1;

    // ⭐ FIX: stagione calcistica
    // - Lug-Dic con PDF Gen-Giu → anno + 1
    // - Gen-Giu con PDF Lug-Dic → anno - 1
    // - altrimenti anno corrente
    let anno = annoCorrente;
    const oggiPrimoSemestre = meseCorrente >= 7; // Lug-Dic
    const pdfPrimoSemestre = mese >= 7;          // Lug-Dic

    if (oggiPrimoSemestre && !pdfPrimoSemestre) anno = annoCorrente + 1;
    else if (!oggiPrimoSemestre && pdfPrimoSemestre) anno = annoCorrente - 1;

    const dataISO = `${anno}-${meseStr}-${giorno}`;

    return {
      giorno: match[1],
      numero: match[2],
      mese: match[3],
      dataCompleta: `${match[1]} ${match[2]} ${match[3]}`,
      dataISO,
    };
  };

  // ============================================================
  // PARSING RIGA PARTITA
  // ============================================================
  const parseRigaPartita = (testo) => {
    const pattern = /^(\d{3,6})\s*(\d{1,2}:\d{2})\s*(.+)$/;
    const match = testo.match(pattern);
    if (!match) return null;

    const [, alias, ora, resto] = match;

    const quotePattern = /(\d+\.\d{2})/g;
    const quote = [];
    let qMatch;
    while ((qMatch = quotePattern.exec(resto)) !== null) {
      quote.push(parseFloat(qMatch[1]));
    }
    if (quote.length < 3) return null;

    const primaQuotaMatch = resto.match(/\d+\.\d{2}/);
    if (!primaQuotaMatch) return null;

    const eventoRaw = resto.substring(0, primaQuotaMatch.index).trim();
    const sepIndex = eventoRaw.lastIndexOf(' - ');
    if (sepIndex === -1) return null;

    const casa = eventoRaw.substring(0, sepIndex).trim();
    const ospiti = eventoRaw.substring(sepIndex + 3).trim();
    if (!casa || !ospiti) return null;

    let quoteMappate;

    if (quote.length >= 18) {
      // Formato completo: 18 quote con U4.5/O4.5
      quoteMappate = {
        '1': quote[0], 'X': quote[1], '2': quote[2],
        '1X': quote[3], '12': quote[4], 'X2': quote[5],
        'GG': quote[6], 'NG': quote[7],
        'U1.5': quote[8], 'O1.5': quote[9],
        'U2.5': quote[10], 'O2.5': quote[11],
        'U3.5': quote[12], 'O3.5': quote[13],
        'U4.5': quote[14], 'O4.5': quote[15],
        'MG14_SI': quote[16], 'MG25_SI': quote[17],
      };
    } else if (quote.length >= 16) {
      // Formato ridotto: 16 quote (senza U4.5/O4.5)
      quoteMappate = {
        '1': quote[0], 'X': quote[1], '2': quote[2],
        '1X': quote[3], '12': quote[4], 'X2': quote[5],
        'GG': quote[6], 'NG': quote[7],
        'U1.5': quote[8], 'O1.5': quote[9],
        'U2.5': quote[10], 'O2.5': quote[11],
        'U3.5': quote[12], 'O3.5': quote[13],
        'U4.5': null, 'O4.5': null,
        'MG14_SI': quote[14], 'MG25_SI': quote[15],
      };
    } else {
      return null;
    }

    return {
      alias: alias.trim(),
      ora: ora.trim(),
      casa,
      ospiti,
      quote: quoteMappate,
      quoteGrezze: quote,
      numQuote: quote.length,
    };
  };

  // ============================================================
  // PARSER PRINCIPALE
  // ============================================================
  const parseMarathonbetPDF = (righe) => {
    const partite = [];
    let campionatoCorrente = null;
    let dataCorrente = null;
    let dataISOCorrente = null;
    let giornoCorrente = null;

    for (const riga of righe) {
      const testo = riga.testo;

      // 1) Intestazione campionato pulita (inizio riga)
      const camp = isIntestazioneCampionato(testo);
      if (camp) {
        campionatoCorrente = camp;
        continue;
      }

      // 2) Data
      const data = isRigaData(testo);
      if (data) {
        dataCorrente = data.dataCompleta;
        dataISOCorrente = data.dataISO;
        giornoCorrente = data.giorno;
        continue;
      }

      // 3) Skip intestazioni tabella
      if (/^(Alias|Codice|Evento|Calcio|1X2|DOPPIA|GG\/NG|U\/O|U\/0|MG|SI|NO)/i.test(testo)) {
        continue;
      }

      // 4) Prova a parsare come partita
      const partita = parseRigaPartita(testo);
      if (partita) {
        // ⭐ Controlla se c'è un campionato in coda alla riga (es. "Siviglia - Osasuna ... Spagna - LaLiga 2")
        const campInCoda = estraiCampionatoDaRiga(testo);
        if (campInCoda) campionatoCorrente = campInCoda;

        partite.push({
          ...partita,
          campionato: campionatoCorrente,
          data: dataCorrente,
          dataISO: dataISOCorrente,
          giorno: giornoCorrente,
          fonte: 'Marathonbet',
          estrattoIl: new Date().toISOString(),
        });
        continue;
      }

      // 5) Se la riga contiene solo un campionato (a volte succede)
      const campSolo = estraiCampionatoDaRiga(testo);
      if (campSolo) {
        campionatoCorrente = campSolo;
      }
    }

    return partite;
  };

  // ============================================================
  // SIMILARITÀ
  // ============================================================
  const similarita = (a, b) => {
    if (a === b) return 1;
    if (!a || !b) return 0;

    if (a.length >= 3 && b.length >= 3) {
      if (a.includes(b) || b.includes(a)) return 0.95;
    }

    const bigrams = (str) => {
      const set = new Set();
      for (let i = 0; i < str.length - 1; i++) set.add(str.substring(i, i + 2));
      return set;
    };

    const aBigrams = bigrams(a);
    const bBigrams = bigrams(b);
    let intersection = 0;
    aBigrams.forEach(bg => { if (bBigrams.has(bg)) intersection++; });

    return (2 * intersection) / (aBigrams.size + bBigrams.size);
  };

  // ============================================================
  // FUZZY MATCHING
  // ============================================================
  const trovaMatchApp = (partitaPDF, matchesApp) => {
    const casaNorm = normalizzaNome(partitaPDF.casa);
    const ospitiNorm = normalizzaNome(partitaPDF.ospiti);

    let bestMatch = null;
    let bestScore = 0;

    for (const m of matchesApp) {
      const appCasaNorm = normalizzaNome(m.casa);
      const appOspitiNorm = normalizzaNome(m.ospiti);

      const scoreCasa = similarita(casaNorm, appCasaNorm);
      const scoreOspiti = similarita(ospitiNorm, appOspitiNorm);
      const score = (scoreCasa + scoreOspiti) / 2;

      if (score > bestScore && score > SOGLIA_MATCH) {
        bestScore = score;
        bestMatch = m;
      }
    }

    return bestMatch ? { match: bestMatch, score: bestScore } : null;
  };

  // ============================================================
  // VALUE BET
  // ============================================================
  const analizzaValueBet = (partitaPDF, matchApp, stats) => {
    if (!stats || stats.error) return [];

    const mapping = {
      '1': { familyId: 'fisse', giocata: '1' },
      'X': { familyId: 'fisse', giocata: 'X' },
      '2': { familyId: 'fisse', giocata: '2' },
      '1X': { familyId: 'dc', giocata: '1X' },
      '12': { familyId: 'dc', giocata: '12' },
      'X2': { familyId: 'dc', giocata: 'X2' },
      'GG': { familyId: 'gg_ng', giocata: 'GG' },
      'NG': { familyId: 'gg_ng', giocata: 'NG' },
      'O1.5': { familyId: 'over', giocata: 'Over 1.5' },
      'O2.5': { familyId: 'over', giocata: 'Over 2.5' },
      'O3.5': { familyId: 'over', giocata: 'Over 3.5' },
      'O4.5': { familyId: 'over', giocata: 'Over 4.5' },
      'U1.5': { familyId: 'under', giocata: 'Under 1.5' },
      'U2.5': { familyId: 'under', giocata: 'Under 2.5' },
      'U3.5': { familyId: 'under', giocata: 'Under 3.5' },
      'U4.5': { familyId: 'under', giocata: 'Under 4.5' },
      'MG14_SI': { familyId: 'multigol', giocata: '1-4' },
      'MG25_SI': { familyId: 'multigol', giocata: '2-5' },
    };

    const risultati = [];

    for (const [mercato, quotaBook] of Object.entries(partitaPDF.quote)) {
      if (!quotaBook || quotaBook <= 1) continue;
      const map = mapping[mercato];
      if (!map) continue;

      const pctTua = window.getGiocataPct
        ? window.getGiocataPct(map.giocata, stats, stats.homeMG, stats.awayMG, stats.mgTot)
        : 0;
      if (pctTua === 0) continue;

      const quotaFair = 100 / pctTua;
      const edge = ((quotaBook * pctTua / 100) - 1) * 100;

      const b = quotaBook - 1;
      const p = pctTua / 100;
      const q = 1 - p;
      const kelly = b > 0 ? Math.max(0, (b * p - q) / b) : 0;

      let classificazione = '⚪';
      let livello = 'no-value';
      if (edge > 20) { classificazione = '💎 VALUE ECCELLENTE'; livello = 'excellent'; }
      else if (edge > 10) { classificazione = '✅ VALUE BUONO'; livello = 'good'; }
      else if (edge > 5) { classificazione = '🟡 VALUE MARGINALE'; livello = 'marginal'; }
      else if (edge > 0) { classificazione = '⚪ Quota fair'; livello = 'fair'; }

      risultati.push({
        mercato, giocata: map.giocata, familyId: map.familyId,
        pctTua, quotaFair: parseFloat(quotaFair.toFixed(2)), quotaBook,
        edge: parseFloat(edge.toFixed(1)),
        isValue: edge > 5, livello, classificazione,
        kellyStake: parseFloat((kelly * 100).toFixed(2)),
      });
    }

    return risultati.sort((a, b) => b.edge - a.edge);
  };

  // ============================================================
  // SALVATAGGIO
  // ============================================================
  const salvaQuote = (partite) => {
    try {
      const mappa = {};
      partite.forEach(p => {
        const key = `${normalizzaNome(p.casa)}|${normalizzaNome(p.ospiti)}|${p.dataISO || ''}`;
        mappa[key] = {
          casa: p.casa, ospiti: p.ospiti, campionato: p.campionato,
          data: p.data, dataISO: p.dataISO, ora: p.ora, quote: p.quote,
        };
      });

      const dateValide = partite.map(p => p.dataISO)
        .filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/)).sort();
      const dataMax = dateValide[dateValide.length - 1] || null;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappa));
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
        salvatoIl: new Date().toISOString(),
        dataMaxPDF: dataMax,
        numPartite: partite.length,
      }));

      window.dispatchEvent(new CustomEvent('quote-updated', {
        detail: { numPartite: partite.length, dataMaxPDF: dataMax }
      }));

      console.log(`✅ Quote salvate: ${partite.length} partite, data max: ${dataMax}`);
      return { numPartite: partite.length, dataMaxPDF: dataMax };
    } catch (e) {
      console.warn('Errore salvataggio:', e);
      return null;
    }
  };

  const aggiungiQuote = (partite) => {
    try {
      const esistenti = leggiQuote();
      const mappa = { ...esistenti };

      partite.forEach(p => {
        const key = `${normalizzaNome(p.casa)}|${normalizzaNome(p.ospiti)}|${p.dataISO || ''}`;
        mappa[key] = {
          casa: p.casa, ospiti: p.ospiti, campionato: p.campionato,
          data: p.data, dataISO: p.dataISO, ora: p.ora, quote: p.quote,
        };
      });

      const tutte = Object.values(mappa);
      const dateValide = tutte.map(p => p.dataISO)
        .filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/)).sort();
      const dataMax = dateValide[dateValide.length - 1] || null;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappa));
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
        salvatoIl: new Date().toISOString(),
        dataMaxPDF: dataMax,
        numPartite: tutte.length,
      }));

      window.dispatchEvent(new CustomEvent('quote-updated', {
        detail: { numPartite: tutte.length, dataMaxPDF: dataMax }
      }));

      console.log(`✅ Quote aggiunte: +${partite.length} (totale: ${tutte.length}), data max: ${dataMax}`);
      return { numPartite: tutte.length, dataMaxPDF: dataMax };
    } catch (e) {
      console.warn('Errore aggiunta:', e);
      return null;
    }
  };

  const resetQuote = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_META_KEY);
      window.dispatchEvent(new CustomEvent('quote-updated', {
        detail: { numPartite: 0, dataMaxPDF: null }
      }));
      return true;
    } catch (e) { return false; }
  };

  const leggiQuote = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  };

  const leggiMeta = () => {
    try {
      const raw = localStorage.getItem(STORAGE_META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };

  const getMaxDataPDF = () => {
    const meta = leggiMeta();
    return meta ? meta.dataMaxPDF : null;
  };

  // ============================================================
  // MAPPA GIOCATA → QUOTA
  // ============================================================
  const mappaGiocataAQuota = (quotePDF, familyId, giocata) => {
    if (!quotePDF) return null;

    if (familyId === 'fisse') {
      if (giocata === '1') return quotePDF['1'] || null;
      if (giocata === 'X') return quotePDF['X'] || null;
      if (giocata === '2') return quotePDF['2'] || null;
    }
    if (familyId === 'dc') {
      if (giocata === '1X') return quotePDF['1X'] || null;
      if (giocata === '12') return quotePDF['12'] || null;
      if (giocata === 'X2') return quotePDF['X2'] || null;
    }
    if (familyId === 'gg_ng') {
      const g = String(giocata || '').trim().toLowerCase();
      if (g === 'gg' || g === 'goal-goal' || g === 'goal' || g === 'g') return quotePDF['GG'] || null;
      if (g === 'ng' || g === 'no goal' || g === 'nogoal' || g === 'n') return quotePDF['NG'] || null;
    }
    if (familyId === 'over') {
      if (giocata === 'Over 1.5') return quotePDF['O1.5'] || null;
      if (giocata === 'Over 2.5') return quotePDF['O2.5'] || null;
      if (giocata === 'Over 3.5') return quotePDF['O3.5'] || null;
      if (giocata === 'Over 4.5') return quotePDF['O4.5'] || null;
    }
    if (familyId === 'under') {
      if (giocata === 'Under 1.5') return quotePDF['U1.5'] || null;
      if (giocata === 'Under 2.5') return quotePDF['U2.5'] || null;
      if (giocata === 'Under 3.5') return quotePDF['U3.5'] || null;
      if (giocata === 'Under 4.5') return quotePDF['U4.5'] || null;
    }
    if (familyId === 'multigol') {
      if (giocata === '1-4') return quotePDF['MG14_SI'] || null;
      if (giocata === '2-5') return quotePDF['MG25_SI'] || null;
    }
    if (familyId === 'dc_over') {
      const parts = giocata.split('+');
      if (parts.length === 2) {
        const dcQ = quotePDF[parts[0]] || null;
        const overQ = quotePDF[parts[1]] || null;
        if (dcQ && overQ) return parseFloat((dcQ * overQ).toFixed(2));
      }
    }
    if (familyId === 'dc_under') {
      const parts = giocata.split('+');
      if (parts.length === 2) {
        const dcQ = quotePDF[parts[0]] || null;
        const underQ = quotePDF[parts[1]] || null;
        if (dcQ && underQ) return parseFloat((dcQ * underQ).toFixed(2));
      }
    }
    return null;
  };

  // ============================================================
  // TROVA QUOTA PER GIOCATA
  // ============================================================
  const trovaQuotaPerGiocata = (match, familyId, giocata) => {
    const quote = leggiQuote();
    if (!quote || Object.keys(quote).length === 0) return null;

    const casaNorm = normalizzaNome(match.casa);
    const ospitiNorm = normalizzaNome(match.ospiti);
    const dataMatch = normalizzaDataISO(match.data);

    let entry = null;
    let matchedBy = null;

    // 1. Match esatto
    const keyEsatta = `${casaNorm}|${ospitiNorm}|${dataMatch}`;
    if (quote[keyEsatta]) { entry = quote[keyEsatta]; matchedBy = 'exact'; }

    // 2. Prefix (ignora data)
    if (!entry) {
      const prefisso = `${casaNorm}|${ospitiNorm}|`;
      const keys = Object.keys(quote).filter(k => k.startsWith(prefisso));
      if (keys.length > 0) {
        entry = quote[keys[0]];
        matchedBy = `prefix(${keys[0]})`;
      }
    }

    // 3. Ordine invertito
    if (!entry) {
      const prefissoInv = `${ospitiNorm}|${casaNorm}|`;
      const keys = Object.keys(quote).filter(k => k.startsWith(prefissoInv));
      if (keys.length > 0) {
        entry = quote[keys[0]];
        matchedBy = 'prefix-invertito';
      }
    }

    // 4. Fuzzy
    if (!entry) {
      let bestMatch = null, bestScore = 0;
      for (const [, val] of Object.entries(quote)) {
        const scoreCasa = similarita(casaNorm, normalizzaNome(val.casa));
        const scoreOspiti = similarita(ospitiNorm, normalizzaNome(val.ospiti));
        const score = (scoreCasa + scoreOspiti) / 2;
        if (score > bestScore && score > SOGLIA_MATCH) {
          bestScore = score; bestMatch = val;
        }
      }
      if (bestMatch) {
        entry = bestMatch;
        matchedBy = `fuzzy(${bestScore.toFixed(2)})`;
      }
    }

    if (!entry || !entry.quote) {
      if (window.QuoteManager && window.QuoteManager.DEBUG) {
        console.warn('❌ QUOTA NON TROVATA:', match.casa, 'vs', match.ospiti,
          '| norm:', casaNorm, '|', ospitiNorm, '| data:', dataMatch);
      }
      return null;
    }

    if (window.QuoteManager && window.QuoteManager.DEBUG) {
      console.log('🎯 Match [' + matchedBy + ']:', match.casa, 'vs', match.ospiti,
        '→ entry:', entry.casa, 'vs', entry.ospiti);
    }

    return mappaGiocataAQuota(entry.quote, familyId, giocata);
  };

  // ============================================================
  // ANALISI CON EDGE
  // ============================================================
  const analizzaGiocataConQuota = (match, familyId, giocata, pctTua) => {
    const quotaBook = trovaQuotaPerGiocata(match, familyId, giocata);
    if (!quotaBook || !pctTua || pctTua <= 0) return null;

    const quotaFair = 100 / pctTua;
    const edge = ((quotaBook * pctTua / 100) - 1) * 100;

    let classificazione = '⚪';
    if (edge > 20) classificazione = '💎';
    else if (edge > 10) classificazione = '✅';
    else if (edge > 5) classificazione = '🟡';

    return {
      quotaBook,
      quotaFair: parseFloat(quotaFair.toFixed(2)),
      edge: parseFloat(edge.toFixed(1)),
      isValue: edge > 5,
      classificazione,
    };
  };

  // ============================================================
  // CHECK AGGIORNAMENTO
  // ============================================================
  const checkAggiornamentoPDF = () => {
    const dataMax = getMaxDataPDF();
    const oggi = new Date().toISOString().slice(0, 10);
    const meta = leggiMeta();

    if (!dataMax || !meta || meta.numPartite === 0) {
      return { stato: 'assente', aggiornato: false, dataMax: null, oggi, motivo: 'no-data', messaggio: '📄 Nessun PDF caricato.' };
    }

    if (meta.salvatoIl) {
      const giorni = (Date.now() - new Date(meta.salvatoIl).getTime()) / 86400000;
      if (giorni > GIORNI_SCADENZA) {
        return {
          stato: 'scaduto', aggiornato: false, dataMax, oggi, motivo: 'vecchio',
          giorniDaSalvataggio: Math.round(giorni),
          messaggio: `⚠️ Quote caricate ${Math.round(giorni)} giorni fa.`,
        };
      }
    }

    if (dataMax < oggi) {
      return {
        stato: 'scaduto', aggiornato: false, dataMax, oggi, motivo: 'scaduto',
        messaggio: `⚠️ Quote scadute! Ultima: ${dataMax.split('-').reverse().join('/')}`,
      };
    }

    return { stato: 'ok', aggiornato: true, dataMax, oggi, motivo: 'ok', messaggio: null };
  };

  const debugPartita = (nomeCasa) => {
    const quote = leggiQuote();
    const norm = normalizzaNome(nomeCasa);
    const keys = Object.keys(quote).filter(k => k.includes(norm));
    console.log(`🔍 Debug "${nomeCasa}" (norm: "${norm}") → ${keys.length} risultati`);
    keys.slice(0, 5).forEach(k => {
      const val = quote[k];
      console.log(`   ${k} → ${val.casa} vs ${val.ospiti} (${val.data})`);
    });
  };

  // ============================================================
  // EXPORT
  // ============================================================
  window.PDFQuoteParser = {
    estraiRigheDaPDF, parseMarathonbetPDF, parseRigaPartita,
    isIntestazioneCampionato, isRigaData,
    normalizzaNome, normalizzaDataISO,
    similarita, trovaMatchApp, analizzaValueBet,
    salvaQuote, aggiungiQuote, resetQuote, leggiQuote, leggiMeta, getMaxDataPDF,
    trovaQuotaPerGiocata, analizzaGiocataConQuota, mappaGiocataAQuota,
    checkAggiornamentoPDF, debugPartita,
    CAMPIONATI_RICONOSCIBILI, TRADUZIONI_SQUADRE, PREFISSI_SQUADRA,
    SOGLIA_MATCH, STORAGE_KEY, STORAGE_META_KEY, GIORNI_SCADENZA,
  };

  console.log('✅ PDFQuoteParser v3 caricato — fix stagione calcistica + u23 + campionato in coda');

})();