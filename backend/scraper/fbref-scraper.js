const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// ============================================================
// CONFIGURAZIONE
// ============================================================

const CONFIG = {
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
  ],
  concurrency: 3,
  delayBetweenRequests: 1500,
  maxRetries: 3,
  timeout: 30000,
};

// ============================================================
// LISTA DEI 36 SITI (AGGIORNATA DA scarica.py)
// ============================================================

const LEAGUES = [
  // Allsvenskan (Svezia) - SENZA STAGIONE
  { id: '29', name: 'Allsvenskan', url: 'https://fbref.com/en/comps/29/schedule/Allsvenskan-Scores-and-Fixtures' },
  
  // Austrian Bundesliga (Austria) - SENZA STAGIONE
  { id: '56', name: 'Austrian Bundesliga', url: 'https://fbref.com/en/comps/56/schedule/Austrian-Bundesliga-Scores-and-Fixtures' },

  // Bundesliga (Germania) - CON STAGIONE 2026-2027
  { id: '20', name: 'Bundesliga', url: 'https://fbref.com/en/comps/20/2026-2027/schedule/2026-2027-Bundesliga-Scores-and-Fixtures' },
  
  // Chinese Super League (Cina) - SENZA STAGIONE
  { id: '62', name: 'Chinese Super League', url: 'https://fbref.com/en/comps/62/schedule/Chinese-Super-League-Scores-and-Fixtures' },
  
  // Danish Superliga (Danimarca) - SENZA STAGIONE
  { id: '50', name: 'Danish Superliga', url: 'https://fbref.com/en/comps/50/schedule/Danish-Superliga-Scores-and-Fixtures' },
  
  // Eliteserien (Norvegia) - SENZA STAGIONE
  { id: '28', name: 'Eliteserien', url: 'https://fbref.com/en/comps/28/schedule/Eliteserien-Scores-and-Fixtures' },
  
  // Eredivisie (Paesi Bassi) - SENZA STAGIONE
  { id: '23', name: 'Eredivisie', url: 'https://fbref.com/en/comps/23/schedule/Eredivisie-Scores-and-Fixtures' },
  
  // La Liga (Spagna) - CON STAGIONE 2026-2027
  { id: '12', name: 'La Liga', url: 'https://fbref.com/en/comps/12/2026-2027/schedule/2026-2027-La-Liga-Scores-and-Fixtures' },

  // Ligue 1 (Francia) - CON STAGIONE 2026-2027
  { id: '13', name: 'Ligue 1', url: 'https://fbref.com/en/comps/13/2026-2027/schedule/2026-2027-Ligue-1-Scores-and-Fixtures' },
  
  // League of Ireland Premier Division (Irlanda) - SENZA STAGIONE
  { id: '80', name: 'Premier Division', url: 'https://fbref.com/en/comps/80/schedule/League-of-Ireland-Premier-Division-Scores-and-Fixtures' },
  
  // J1 League (Giappone) - SENZA STAGIONE
  { id: '25', name: 'J1 League', url: 'https://fbref.com/en/comps/25/schedule/J1-League-Scores-and-Fixtures' },
  
  // K League 1 (Corea del Sud) - SENZA STAGIONE
  { id: '55', name: 'K League 1', url: 'https://fbref.com/en/comps/55/schedule/K-League-1-Scores-and-Fixtures' },

  // Premier League (Inghilterra) - CON STAGIONE 2026-2027
  { id: '9', name: 'Premier League', url: 'https://fbref.com/en/comps/9/2026-2027/schedule/2026-2027-Premier-League-Scores-and-Fixtures' },
  
  // Russian Premier League (Russia) - SENZA STAGIONE
  { id: '30', name: 'Russian Premier League', url: 'https://fbref.com/en/comps/30/schedule/Russian-Premier-League-Scores-and-Fixtures' },

  // Serie A (Italia) - CON STAGIONE 2026-2027
  { id: '11', name: 'Serie A', url: 'https://fbref.com/en/comps/11/2026-2027/schedule/2026-2027-Serie-A-M-Scores-and-Fixtures' },

  // Serie B (Italia) - CON STAGIONE 2026-2027
  { id: '18', name: 'Serie B', url: 'https://fbref.com/en/comps/18/2026-2027/schedule/2026-2027-Serie-B-M-Scores-and-Fixtures' },
  
  // Swiss Super League (Svizzera) - SENZA STAGIONE
  { id: '57', name: 'Swiss Super League', url: 'https://fbref.com/en/comps/57/schedule/Swiss-Super-League-Scores-and-Fixtures' },
  
  // Veikkausliiga (Finlandia) - SENZA STAGIONE
  { id: '43', name: 'Veikkausliiga', url: 'https://fbref.com/en/comps/43/schedule/Veikkausliiga-Scores-and-Fixtures' }
];

// ============================================================
// Mappatura per nomi cartelle loghi
// ============================================================

const LEAGUE_FOLDER_MAP = {
  'Premier League': 'Premier_League',
  'Serie A': 'Serie_A',
  'Serie B': 'Serie_B',
  'Bundesliga': 'Bundesliga',
  'La Liga': 'La_Liga',
  'Ligue 1': 'Ligue_1',
  'Eredivisie': 'Eredivisie',
  'Allsvenskan': 'Allsvenskan',
  'Eliteserien': 'Eliteserien',
  'Danish Superliga': 'Danish_Superliga',
  'Austrian Bundesliga': 'Austrian_Bundesliga',
  'Swiss Super League': 'Swiss_Super_League',
  'Chinese Super League': 'Chinese_Super_League',
  'J1 League': 'J1_League',
  'K League 1': 'K_League_1',
  'Russian Premier League': 'Russian_Premier_League',
  'Veikkausliiga': 'Veikkausliiga',
  'Premier Division': 'Premier_Division',
};

// ============================================================
// FUNZIONI DI SCRAPING
// ============================================================

async function scrapeLeague(league) {
  // Usa l'URL già completo dalla lista
  const url = league.url;
  
  console.log(`🌐 Scaricamento: ${league.name} → ${url}`);
  
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const headers = {
        'User-Agent': CONFIG.userAgents[Math.floor(Math.random() * CONFIG.userAgents.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      };
      
      const response = await axios.get(url, {
        headers,
        timeout: CONFIG.timeout,
        decompress: true,
      });
      
      const $ = cheerio.load(response.data);
      const results = [];
      
      // Cerca la tabella schedule
      const table = $('#div_schedule table');
      if (table.length === 0) {
        console.warn(`⚠️ Tabella non trovata per ${league.name}`);
        return results;
      }
      
      table.find('tbody tr').each((_, row) => {
        const $row = $(row);
        if ($row.hasClass('spacer')) return;
        
        const cells = $row.find('td');
        if (cells.length < 8) return;
        
        // Estrai dati
        const date = $(cells[0]).text().trim();
        const homeTeam = $(cells[1]).text().trim();
        const scoreText = $(cells[2]).text().trim();
        const awayTeam = $(cells[3]).text().trim();
        
        let homeGoals = null, awayGoals = null;
        const scoreMatch = scoreText.match(/(\d+)–(\d+)/);
        if (scoreMatch) {
          homeGoals = parseInt(scoreMatch[1]);
          awayGoals = parseInt(scoreMatch[2]);
        }
        
        // Se la data è vuota o non ha anno, salta
        if (!date || !date.match(/\d{4}/)) return;
        if (!homeTeam || !awayTeam) return;
        
        results.push({
          data: normalizeDate(date),
          casa: homeTeam,
          ospiti: awayTeam,
          golCasa: homeGoals,
          golOspite: awayGoals,
          risultato: scoreText || '',
          stato: scoreText ? 'Giocata' : 'Futura',
        });
      });
      
      console.log(`✅ ${league.name}: ${results.length} partite`);
      return results;
      
    } catch (error) {
      console.warn(`⚠️ Tentativo ${attempt}/${CONFIG.maxRetries} fallito per ${league.name}: ${error.message}`);
      if (attempt < CONFIG.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
  }
  
  console.error(`❌ Scraping fallito per ${league.name}`);
  return [];
}

// ============================================================
// NORMALIZZA DATA (formato europeo)
// ============================================================

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  
  // Formato: "2024-08-20" → "20/08/2024"
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  
  // Formato: "20/08/2024" → già corretto
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    return dateStr;
  }
  
  // Formato: "Aug 20, 2024" → "20/08/2024"
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
  } catch (e) {}
  
  return dateStr;
}

// ============================================================
// DEDUPLICAZIONE PARTITE
// ============================================================

function deduplicateMatches(matches) {
  const seen = new Set();
  const result = [];
  
  matches.forEach(m => {
    const key = `${m.campionato}|${m.data}|${m.casa}|${m.ospiti}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(m);
    }
  });
  
  return result;
}

// ============================================================
// SCRAPING COMPLETO
// ============================================================

async function scrapeAllLeagues() {
  console.log('🚀 Avvio scraping FBref...');
  console.log(`📊 Campionati da scrapare: ${LEAGUES.length}`);
  const startTime = Date.now();
  
  const allResults = [];
  const chunks = [];
  
  // Dividi in chunk per rate limiting
  for (let i = 0; i < LEAGUES.length; i += CONFIG.concurrency) {
    chunks.push(LEAGUES.slice(i, i + CONFIG.concurrency));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(league => 
      scrapeLeague(league).then(matches => 
        matches.map(m => ({ ...m, campionato: league.name }))
      )
    );
    
    const chunkResults = await Promise.all(promises);
    allResults.push(...chunkResults.flat());
    
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Deduplica
  const uniqueMatches = deduplicateMatches(allResults);
  
  console.log(`✅ Scraping completato in ${duration}s`);
  console.log(`📊 Trovate ${uniqueMatches.length} partite uniche`);
  
  return uniqueMatches;
}

// ============================================================
// SALVATAGGIO SU FILE
// ============================================================

function saveMatchesToFile(matches) {
  const dataPath = path.join(__dirname, '../../data/matches.json');
  const dir = path.dirname(dataPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const championships = [...new Set(matches.map(m => m.campionato))].map(name => ({
    name,
    importedAt: new Date().toISOString()
  }));
  
  const data = {
    championships,
    matches,
    lastUpdate: new Date().toISOString(),
    source: 'fbref',
    totalMatches: matches.length,
  };
  
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`💾 Salvataggio completato: ${dataPath}`);
  console.log(`📊 ${matches.length} partite salvate`);
  
  return data;
}

// ============================================================
// MAIN EXPORT
// ============================================================

async function runScraper() {
  try {
    console.log('🔄 Avvio runScraper()...');
    const matches = await scrapeAllLeagues();
    const data = saveMatchesToFile(matches);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Errore scraper:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// SCHEDULER (ogni 6 ore)
// ============================================================

function scheduleScraper() {
  // Prima esecuzione immediata
  runScraper().then(result => {
    console.log(`📊 Scraping iniziale: ${result.data?.matches?.length || 0} partite`);
  });
  
  // Programma ogni 6 ore
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Esecuzione scraping programmato...');
    const result = await runScraper();
    console.log(`📊 Aggiornamento: ${result.data?.matches?.length || 0} partite`);
  });
  
  console.log('⏰ Scraper programmato ogni 6 ore');
}

// ============================================================
// ESPORTAZIONE
// ============================================================

module.exports = { runScraper, scheduleScraper, scrapeAllLeagues };