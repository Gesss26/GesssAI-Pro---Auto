const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

console.log('🚀 Avvio scraper FBref...');

const LEAGUES = [
  { name: 'Serie A', url: 'https://fbref.com/en/comps/11/2026-2027/schedule/2026-2027-Serie-A-M-Scores-and-Fixtures' },
  { name: 'Premier League', url: 'https://fbref.com/en/comps/9/2026-2027/schedule/2026-2027-Premier-League-Scores-and-Fixtures' },
];

async function scrapeLeague(league) {
  try {
    console.log(📊 Scraping ...);
    const response = await axios.get(league.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 30000
    });
    const $ = cheerio.load(response.data);
    const matches = [];
    const table = #div_schedule table;
    if (table.length === 0) return matches;
    table.find('tbody tr').each((i, row) => {
      const cells = .find('td');
      if (cells.length < 4) return;
      const date = .text().trim();
      const homeTeam = .text().trim();
      const scoreText = .text().trim();
      const awayTeam = .text().trim();
      if (!date || !homeTeam || !awayTeam) return;
      let homeGoals = 0, awayGoals = 0, stato = 'Futura';
      const scoreMatch = scoreText.match(/(\d+)–(\d+)/);
      if (scoreMatch) {
        homeGoals = parseInt(scoreMatch[1]);
        awayGoals = parseInt(scoreMatch[2]);
        stato = 'Giocata';
      }
      let data = date;
      if (date.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [y, m, d] = date.split('-');
        data = ${d}//;
      }
      matches.push({ data, casa: homeTeam, ospiti: awayTeam, golCasa: homeGoals, golOspite: awayGoals, stato, risultato: stato === 'Giocata' ? ${homeGoals}- : '' });
    });
    console.log(  ✅ Trovate  partite);
    return matches;
  } catch (error) {
    console.error(  ❌ Errore:, error.message);
    return [];
  }
}

async function main() {
  let allMatches = [];
  const championships = [];
  for (const league of LEAGUES) {
    const matches = await scrapeLeague(league);
    if (matches.length > 0) {
      allMatches = allMatches.concat(matches.map(m => ({ ...m, campionato: league.name, id: league.name + '_' + Date.now() + '_' + Math.random().toString(36).slice(2), round: 'N/A', ora: 'TBD' })));
      championships.push({ name: league.name, importedAt: new Date().toISOString() });
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  console.log(\n📊 Totale partite: );
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const output = { championships, matches: allMatches, lastUpdate: new Date().toISOString(), source: 'fbref', totalMatches: allMatches.length };
  const filePath = path.join(dataDir, 'matches.json');
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(✅ Dati salvati in );
}

main().catch(console.error);
