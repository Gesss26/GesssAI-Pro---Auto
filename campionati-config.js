// ============================================================
// campionati-config.js - Configurazione centralizzata campionati
// Caricato PRIMA di tutti gli altri moduli
// ============================================================

window.CAMPIONATI_CONFIG = {
  'Serie A': {
    logo: 'logos/campionati/serie-a.png',
    flag: '🇮🇹',
    color: '#2ecc71',
    nomeBreve: 'Serie A',
  },
  'Serie B': {
    logo: 'logos/campionati/serie-b.png',
    flag: '🇮🇹',
    color: '#e67e22',
    nomeBreve: 'Serie B',
  },
  'Serie C - Girone A': {
    logo: 'logos/campionati/serie-c.png',
    flag: '🇮🇹',
    color: '#2980b9',
    nomeBreve: 'Serie C/A',
  },
  'Serie C - Girone B': {
    logo: 'logos/campionati/serie-c.png',
    flag: '🇮🇹',
    color: '#27ae60',
    nomeBreve: 'Serie C/B',
  },
  'Serie C - Girone C': {
    logo: 'logos/campionati/serie-c.png',
    flag: '🇮🇹',
    color: '#c0392b',
    nomeBreve: 'Serie C/C',
  },
  'Premier League': {
    logo: 'logos/campionati/premier-league.png',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    color: '#3498db',
    nomeBreve: 'Premier',
  },
  'EFL Championship': {
    logo: 'logos/campionati/championship.png',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    color: '#6c3483',
    nomeBreve: 'Championship',
  },
  'La Liga': {
    logo: 'logos/campionati/la-liga.png',
    flag: '🇪🇸',
    color: '#e74c3c',
    nomeBreve: 'La Liga',
  },
  'Segunda División': {
    logo: 'logos/campionati/segunda-division.png',
    flag: '🇪🇸',
    color: '#e67e22',
    nomeBreve: 'Segunda',
  },
  'Bundesliga': {
    logo: 'logos/campionati/bundesliga.png',
    flag: '🇩🇪',
    color: '#f39c12',
    nomeBreve: 'Bundesliga',
  },
  '2. Bundesliga': {
    logo: 'logos/campionati/2-bundesliga.png',
    flag: '🇩🇪',
    color: '#e67e22',
    nomeBreve: '2. Bundes',
  },
  'Ligue 1': {
    logo: 'logos/campionati/ligue-1.png',
    flag: '🇫🇷',
    color: '#9b59b6',
    nomeBreve: 'Ligue 1',
  },
  'Ligue 2': {
    logo: 'logos/campionati/ligue-2.png',
    flag: '🇫🇷',
    color: '#8e44ad',
    nomeBreve: 'Ligue 2',
  },
  'Eredivisie': {
    logo: 'logos/campionati/eredivisie.png',
    flag: '🇳🇱',
    color: '#e74c3c',
    nomeBreve: 'Eredivisie',
  },
  'Eerste Divisie': {
    logo: 'logos/campionati/eerste-divisie.png',
    flag: '🇳🇱',
    color: '#e67e22',
    nomeBreve: 'Eerste',
  },
  'Primeira Liga': {
    logo: 'logos/campionati/primeira-liga.png',
    flag: '🇵🇹',
    color: '#34495e',
    nomeBreve: 'Primeira',
  },
  'Jupiler Pro League': {
    logo: 'logos/campionati/jupiler-pro-league.png',
    flag: '🇧🇪',
    color: '#e74c3c',
    nomeBreve: 'Jupiler',
  },
  'Süper Lig': {
    logo: 'logos/campionati/super-lig.png',
    flag: '🇹🇷',
    color: '#e67e22',
    nomeBreve: 'Süper Lig',
  },
  'Scottish Premiership': {
    logo: 'logos/campionati/scottish-premiership.png',
    flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    color: '#2ecc71',
    nomeBreve: 'Scottish',
  },
  'J1 League': {
    logo: 'logos/campionati/j1-league.png',
    flag: '🇯🇵',
    color: '#e74c3c',
    nomeBreve: 'J1 League',
  },
  'K League 1': {
    logo: 'logos/campionati/k-league-1.png',
    flag: '🇰🇷',
    color: '#3498db',
    nomeBreve: 'K League',
  },
};

// Helper globale
window.getChampLogo = (campionato) => {
  const config = window.CAMPIONATI_CONFIG[campionato];
  return config ? config.logo : null;
};

window.getChampFlag = (campionato) => {
  const config = window.CAMPIONATI_CONFIG[campionato];
  return config ? config.flag : '🌍';
};

window.getChampShortName = (campionato) => {
  const config = window.CAMPIONATI_CONFIG[campionato];
  return config ? config.nomeBreve : campionato;
};

console.log('✅ campionati-config.js caricato - ' + Object.keys(window.CAMPIONATI_CONFIG).length + ' campionati configurati');