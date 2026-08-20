// backend/scrape.js
const { runScraper } = require('./scraper/fbref-scraper.js');

async function main() {
  console.log('🚀 Avvio scraper da GitHub Actions...');
  console.log(`📅 Data: ${new Date().toLocaleString('it-IT')}`);
  
  try {
    const result = await runScraper();
    if (result && result.success) {
      console.log(`✅ Scraping completato! ${result.data?.matches?.length || 0} partite`);
      console.log(`💾 Dati salvati in: public/data/matches.json`);
      process.exit(0);
    } else {
      console.error('❌ Errore:', result?.error || 'Errore sconosciuto');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();