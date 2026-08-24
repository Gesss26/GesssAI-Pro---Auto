const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { runScraper, scheduleScraper } = require('./scraper/fbref-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servi file statici (index.html, loghi, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
// API ENDPOINTS
// ============================================================

// Ottieni tutte le partite
app.get('/api/matches', (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../public/data/matches.json');
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      res.json(data);
    } else {
      res.json({ championships: [], matches: [], lastUpdate: null });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ottieni partite per campionato
app.get('/api/matches/:championship', (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../public/data/matches.json');
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      const filtered = data.matches.filter(m => 
        m.campionato.toLowerCase() === req.params.championship.toLowerCase()
      );
      res.json({ ...data, matches: filtered, total: filtered.length });
    } else {
      res.json({ matches: [], total: 0 });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forza aggiornamento scraping
app.post('/api/scrape', async (req, res) => {
  const result = await runScraper();
  res.json(result);
});

// Stato scraper
app.get('/api/status', (req, res) => {
  const dataPath = path.join(__dirname, '../public/data/matches.json');
  let lastUpdate = null;
  let matchCount = 0;
  let championships = [];
  
  if (fs.existsSync(dataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      lastUpdate = data.lastUpdate;
      matchCount = data.matches?.length || 0;
      championships = data.championships || [];
    } catch (e) {}
  }
  
  // Prossimo aggiornamento (0:00, 6:00, 12:00, 18:00)
  const now = new Date();
  const hours = [0, 6, 12, 18];
  const nextHour = hours.find(h => h > now.getHours()) || hours[0];
  const nextUpdate = new Date(now);
  nextUpdate.setHours(nextHour, 0, 0, 0);
  if (nextHour === hours[0] && now.getHours() >= 18) {
    nextUpdate.setDate(nextUpdate.getDate() + 1);
  }
  
  res.json({
    status: 'ok',
    lastUpdate,
    matchCount,
    championships: championships.length,
    nextUpdate: nextUpdate.toISOString(),
    version: '3.0.0',
  });
});

// Lista campionati con loghi disponibili
app.get('/api/championships', (req, res) => {
  const logosPath = path.join(__dirname, '../public/logos');
  const availableLogos = [];
  
  if (fs.existsSync(logosPath)) {
    const folders = fs.readdirSync(logosPath);
    folders.forEach(folder => {
      const folderPath = path.join(logosPath, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const files = fs.readdirSync(folderPath).filter(f => 
          f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg')
        );
        availableLogos.push({
          league: folder,
          teams: files.map(f => f.replace(/\.(png|jpg|svg)$/, ''))
        });
      }
    });
  }
  
  res.json(availableLogos);
});

// ============================================================
// AVVIO SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
  console.log(`📂 Cartella loghi: /logos`);
  console.log(`📊 API: /api/matches`);
  
  // Avvia scheduler
  scheduleScraper();
});

module.exports = app;
module.exports = { runScraper, scheduleScraper };