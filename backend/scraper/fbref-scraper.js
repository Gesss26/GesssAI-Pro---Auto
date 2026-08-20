const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const fetch = require('node-fetch');

// ============================================================
// CONFIGURAZIONE
// ============================================================

const CONFIG = {
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  ],
  concurrency: 2,  // Ridotto per evitare blocchi
  delayBetweenRequests: 3000,  // Aumentato
  maxRetries: 5,  // Aumentato
  timeout: 30000,
};

// ============================================================
// LISTA DEI 36 SITI (AGGIORNATA DA scarica.py)
// ============================================================

const LEAGUES = [
  // 🔵 IN CORSO - URL SENZA STAGIONE
  { name: 'Allsvenskan', url: 'https://fbref.com/en/comps/29/schedule/Allsvenskan-Scores-and-Fixtures' },
  { name: 'Eliteserien', url: 'https://fbref.com/en/comps/28/schedule/Eliteserien-Scores-and-Fixtures' },
  { name: 'Danish Superliga', url: 'https://fbref.com/en/comps/50/schedule/Danish-Superliga-Scores-and-Fixtures' },
  { name: 'Pro League', url: 'https://fbref.com/en/comps/34/schedule/Belgian-Pro-League-Scores-and-Fixtures' },
  { name: 'Premier Division', url: 'https://fbref.com/en/comps/80/schedule/League-of-Ireland-Premier-Division-Scores-and-Fixtures' },
  { name: 'J1 League', url: 'https://fbref.com/en/comps/25/schedule/J1-League-Scores-and-Fixtures' },
  { name: 'K League 1', url: 'https://fbref.com/en/comps/55/schedule/K-League-1-Scores-and-Fixtures' },
  { name: 'Swiss Super League', url: 'https://fbref.com/en/comps/57/schedule/Swiss-Super-League-Scores-and-Fixtures' },
  { name: 'Veikkausliiga', url: 'https://fbref.com/en/comps/43/schedule/Veikkausliiga-Scores-and-Fixtures' },
  { name: 'Russian Premier League', url: 'https://fbref.com/en/comps/30/schedule/Russian-Premier-League-Scores-and-Fixtures' },
  { name: 'Chinese Super League', url: 'https://fbref.com/en/comps/62/schedule/Chinese-Super-League-Scores-and-Fixtures' },
  { name: 'Austrian Bundesliga', url: 'https://fbref.com/en/comps/56/schedule/Austrian-Bundesliga-Scores-and-Fixtures' },
  { name: 'Eredivisie', url: 'https://fbref.com/en/comps/23/schedule/Eredivisie-Scores-and-Fixtures' },
  { name: 'Primeira Liga', url: 'https://fbref.com/en/comps/32/schedule/Primeira-Liga-Scores-and-Fixtures' },
  
  // 🟡 FUTURI - URL CON STAGIONE 2026-2027
  { name: 'Serie A', url: 'https://fbref.com/en/comps/11/2026-2027/schedule/2026-2027-Serie-A-Scores-and-Fixtures' },
  { name: 'Serie B', url: 'https://fbref.com/en/comps/18/2026-2027/schedule/2026-2027-Serie-B-Scores-and-Fixtures' },
  { name: 'Premier League', url: 'https://fbref.com/en/comps/9/2026-2027/schedule/2026-2027-Premier-League-Scores-and-Fixtures' },
  { name: 'Bundesliga', url: 'https://fbref.com/en/comps/20/2026-2027/schedule/2026-2027-Bundesliga-Scores-and-Fixtures' },
  { name: 'La Liga', url: 'https://fbref.com/en/comps/12/2026-2027/schedule/2026-2027-La-Liga-Scores-and-Fixtures' },
  { name: 'Ligue 1', url: 'https://fbref.com/en/comps/13/2026-2027/schedule/2026-2027-Ligue-1-Scores-and-Fixtures' },
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
  const url = league.url;
  
  console.log(`🌐 Scaricamento: ${league.name} → ${url}`);
  
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      // HEADERS COMPLETI PER SEMBRARE UN BROWSER VERO
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,it;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'sec-ch-ua': '"Not)A;Brand";v="99", "Google Chrome";v="138", "Chromium";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      };
      
      // ============================================================
      // RICHIESTA CON FETCH (invece di axios)
      // ============================================================
      const response = await fetch(url, {
        headers: headers,
        referrer: 'https://www.google.com/',
        signal: AbortSignal.timeout(CONFIG.timeout),
      });
      
      // Controlla se la risposta è OK
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Leggi il contenuto come testo
      const html = await response.text();
      
      // Se l'HTML è troppo corto, probabilmente è un blocco
      if (html.length < 10000) {
        console.warn(`⚠️ HTML troppo corto per ${league.name} (${html.length} bytes), potrebbe essere bloccato`);
        if (attempt < CONFIG.maxRetries) {
          const waitTime = attempt * 5000 + Math.random() * 3000;
          console.log(`   ⏳ Attendo ${Math.round(waitTime/1000)}s prima di riprovare...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      const $ = cheerio.load(html);
      const results = [];
      
      // ============================================================
      // CERCA LA TABELLA - PIÙ SELETTORI
      // ============================================================
      let table = $('#div_schedule table');
      if (table.length === 0) {
        table = $('table.stats_table');
      }
      if (table.length === 0) {
        table = $('table[data-cols]');
      }
      if (table.length === 0) {
        // Cerca qualsiasi tabella con risultati
        table = $('table tbody tr').first().closest('table');
      }
      
      if (table.length === 0) {
        console.warn(`⚠️ Tabella non trovata per ${league.name}`);
        // Salva l'HTML per debug
        const debugPath = path.join(__dirname, '../../debug', `debug-${league.name}.html`);
        const debugDir = path.dirname(debugPath);
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        fs.writeFileSync(debugPath, html);
        console.log(`💾 HTML salvato in debug/debug-${league.name}.html`);
        return results;
      }
      
      // ============================================================
      // ESTRAZIONE DATI
      // ============================================================
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
        
        // Estrai gol dal risultato
        let homeGoals = null, awayGoals = null;
        const scoreMatch = scoreText.match(/(\d+)–(\d+)/);
        if (scoreMatch) {
          homeGoals = parseInt(scoreMatch[1]);
          awayGoals = parseInt(scoreMatch[2]);
        }
        
        // Verifica che la partita sia valida
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
        const waitTime = attempt * 4000 + Math.random() * 3000;
        console.log(`   ⏳ Attendo ${Math.round(waitTime/1000)}s prima di riprovare...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
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
  
  // Attesa iniziale per evitare blocchi
  console.log('⏳ Attendere 3 secondi prima di iniziare...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const startTime = Date.now();
  const allResults = [];
  const chunks = [];
  
  // Dividi in chunk per rate limiting
  for (let i = 0; i < LEAGUES.length; i += CONFIG.concurrency) {
    chunks.push(LEAGUES.slice(i, i + CONFIG.concurrency));
  }
  
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`\n📦 Chunk ${chunkIndex + 1}/${chunks.length} (${chunk.map(l => l.name).join(', ')})`);
    
    const promises = chunk.map(league => 
      scrapeLeague(league).then(matches => 
        matches.map(m => ({ ...m, campionato: league.name }))
      )
    );
    
    const chunkResults = await Promise.all(promises);
    allResults.push(...chunkResults.flat());
    
    // Attesa tra chunk
    if (chunkIndex < chunks.length - 1) {
      const waitTime = CONFIG.delayBetweenRequests + Math.random() * 2000;
      console.log(`   ⏳ Attendo ${Math.round(waitTime/1000)}s prima del prossimo chunk...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Deduplica
  const uniqueMatches = deduplicateMatches(allResults);
  
  console.log(`\n✅ Scraping completato in ${duration}s`);
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
