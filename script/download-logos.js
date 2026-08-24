/**
 * Script per scaricare loghi delle squadre da fonti pubbliche
 * Usa: node scripts/download-logos.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { scrapeAllLeagues } = require('../backend/scraper/fbref-scraper');

// Configurazione
const LOGO_BASE_URL = 'https://cdn.fbref.com/';
const LOGO_FOLDER = path.join(__dirname, '../public/logos');

// Nomi dei campionati con le loro cartelle
const LEAGUE_FOLDERS = {
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

// Nomi squadre con nomi file corretti (sostituisci spazi e caratteri speciali)
function sanitizeFileName(name) {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

async function downloadLogo(teamName, leagueName) {
  const leagueFolder = LEAGUE_FOLDERS[leagueName] || leagueName.replace(/ /g, '_');
  const folderPath = path.join(LOGO_FOLDER, leagueFolder);
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  const fileName = sanitizeFileName(teamName) + '.png';
  const filePath = path.join(folderPath, fileName);
  
  // Se il logo esiste già, salta
  if (fs.existsSync(filePath)) {
    return true;
  }
  
  // URL del logo (esempio da FBref)
  const logoUrl = `${LOGO_BASE_URL}${leagueFolder}/${teamName.replace(/ /g, '_')}.png`;
  
  try {
    const response = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    fs.writeFileSync(filePath, response.data);
    console.log(`✅ Scaricato: ${teamName} (${leagueName})`);
    return true;
  } catch (error) {
    // Crea un logo di fallback (iniziali)
    console.log(`⚠️ Logo non trovato per ${teamName}, creo fallback`);
    createFallbackLogo(teamName, filePath);
    return false;
  }
}

function createFallbackLogo(teamName, filePath) {
  // Crea un'immagine SVG di fallback con le iniziali
  const initials = teamName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="10" fill="#2c3e50"/>
    <text x="50" y="65" font-family="Arial" font-size="36" fill="#ecf0f1" text-anchor="middle">
      ${initials}
    </text>
  </svg>
  `;
  
  fs.writeFileSync(filePath.replace(/\.png$/, '.svg'), svg);
}

async function downloadAllLogos() {
  console.log('🔄 Scaricamento loghi da FBref...');
  
  // Prima, ottieni tutte le squadre disponibili dallo scraping
  const matches = await scrapeAllLeagues();
  const teams = new Set();
  
  matches.forEach(m => {
    teams.add(m.casa);
    teams.add(m.ospiti);
  });
  
  const teamsByLeague = {};
  matches.forEach(m => {
    if (!teamsByLeague[m.campionato]) teamsByLeague[m.campionato] = new Set();
    teamsByLeague[m.campionato].add(m.casa);
    teamsByLeague[m.campionato].add(m.ospiti);
  });
  
  console.log(`📊 Trovate ${teams.size} squadre in ${Object.keys(teamsByLeague).length} campionati`);
  
  // Scarica loghi per ogni squadra
  let successCount = 0;
  let totalCount = 0;
  
  for (const [league, teamsSet] of Object.entries(teamsByLeague)) {
    console.log(`\n📁 Scaricando loghi per ${league}...`);
    
    for (const team of teamsSet) {
      totalCount++;
      const result = await downloadLogo(team, league);
      if (result) successCount++;
      
      // Delay per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`\n✅ Scaricati ${successCount}/${totalCount} loghi`);
  console.log(`📂 Cartella loghi: ${LOGO_FOLDER}`);
}

// Esegui se chiamato direttamente
if (require.main === module) {
  downloadAllLogos().catch(console.error);
}

module.exports = { downloadLogo, downloadAllLogos };