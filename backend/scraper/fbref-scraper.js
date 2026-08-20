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

// Mappatura campionati FBref
const LEAGUES = [
  { id: '11', name: 'Serie A', season: '2026-2027' },
  { id: '9', name: 'Premier League', season: '2026-2027' },
  { id: '20', name: 'Bundesliga', season: '2026-2027' },
  { id: '12', name: 'La Liga', season: '2026-2027' },
  { id: '13', name: 'Ligue 1', season: '2026-2027' },
  { id: '23', name: 'Eredivisie', season: '2026-2027' },
  { id: '29', name: 'Allsvenskan', season: '2026-2027' },
  { id: '28', name: 'Eliteserien', season: '2026-2027' },
  { id: '50', name: 'Danish Superliga', season: '2026-2027' },
  { id: '56', name: 'Austrian Bundesliga', season: '2026-2027' },
  { id: '57', name: 'Swiss Super League', season: '2026-2027' },
  { id: '62', name: 'Chinese Super League', season: '2026-2027' },
  { id: '25', name: 'J1 League', season: '2026-2027' },
  { id: '55', name: 'K League 1', season: '2026-2027' },
  { id: '30', name: 'Russian Premier League', season: '2026-2027' },
  { id: '43', name: 'Veikkausliiga', season: '2026-2027' },
  { id: '80', name: 'Premier Division', season: '2026-2027' },
  { id: '18', name: 'Serie B', season: '2026-2027' },
];

// Mappatura per nomi cartelle loghi
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
  const url = `https://fbref.com/en/comps/${league.id}/${league.season}/schedule/${league.season}-Scores-and-Fixtures`;
  
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
        // Se hai proxy, aggiungi qui
        // proxy: { host: 'proxy.host', port: 8080 }
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
  
  return data;
}

// ============================================================
// MAIN EXPORT
// ============================================================

async function runScraper() {
  try {
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

module.exports = { runScraper, scheduleScraper, scrapeAllLeagues };