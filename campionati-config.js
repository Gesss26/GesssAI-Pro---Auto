// ============================================================
// campionati-config.js
// ============================================================

window.CHAMPIONSHIP_LIST = [
  'UEFA Champions League',
  'UEFA Europa League',
  'UEFA Europa Conference',
  'UEFA Nations League',
  'Jupiler Pro League',
  'Premier League',
  'Championship',
  'Ligue 1',
  'Ligue 2',
  'Bundesliga',
  '2. Bundesliga',
  'Serie A',
  'Serie B',
  'Serie C',
  'J1 League',
  'Eerste Divisie',
  'Eredivisie',
  'Primeira Liga',
  'Scottish Premiership',
  'K League 1',
  'La Liga',
  'Segunda División',
  'Süper Lig',
];

window.CHAMPIONSHIP_COLORS = {
  'UEFA Champions League':   '#1a1aff',
  'UEFA Europa League':      '#ff6600',
  'UEFA Europa Conference':  '#00b894',
  'UEFA Nations League':     '#003399',
  'Jupiler Pro League': '#e74c3c',
  'Premier League': '#3498db',
  'Championship': '#6c3483',
  'Ligue 1': '#9b59b6',
  'Ligue 2': '#8e44ad',
  'Bundesliga': '#f39c12',
  '2. Bundesliga': '#e67e22',
  'Serie A': '#2ecc71',
  'Serie B': '#e67e22',
  'Serie C': '#2980b9',
  'J1 League': '#e74c3c',
  'Eerste Divisie': '#e67e22',
  'Eredivisie': '#e74c3c',
  'Primeira Liga': '#34495e',
  'Scottish Premiership': '#2ecc71',
  'K League 1': '#3498db',
  'La Liga': '#e74c3c',
  'Segunda División': '#e67e22',
  'Süper Lig': '#e67e22',
};

window.CAMPIONATI_ESCLUSI = new Set([]);

console.log('✅ campionati-config.js caricato - ' + window.CHAMPIONSHIP_LIST.length + ' campionati configurati');