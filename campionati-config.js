// ============================================================
// campionati-config.js
// v2: allineato ai nomi esatti del database (Championship, Serie C)
// ============================================================

const getLeagueFolder = (champ) => {
  if (!champ) return '';
  const map = {
    'Jupiler Pro League': 'Jupiler_Pro_League',
    'Premier League': 'Premier_League',
    'Championship': 'Championship',                    // ⭐ nome breve
    'Ligue 1': 'Ligue_1',
    'Ligue 2': 'Ligue_2',
    'Bundesliga': 'Bundesliga',
    '2. Bundesliga': '2. Bundesliga',
    'Serie A': 'Serie_A',
    'Serie B': 'Serie_B',
    'Serie C - Girone A': 'Serie_C_Girone_A',
    'Serie C - Girone B': 'Serie_C_Girone_B',
    'Serie C - Girone C': 'Serie_C_Girone_C',
    // Varianti senza trattino (fallback)
    'Serie C Girone A': 'Serie_C_Girone_A',
    'Serie C Girone B': 'Serie_C_Girone_B',
    'Serie C Girone C': 'Serie_C_Girone_C',
    'Serie C A': 'Serie_C_Girone_A',
    'Serie C B': 'Serie_C_Girone_B',
    'Serie C C': 'Serie_C_Girone_C',
    'J1 League': 'J1_League',
    'Eredivisie': 'Eredivisie',
    'Eerste Divisie': 'Eerste_Divisie',
    'Primeira Liga': 'Primeira_Liga',
    'Scottish Premiership': 'Scottish_Premiership',
    'K League 1': 'K_League_1',
    'La Liga': 'La_Liga',
    'Segunda División': 'Segunda_Division',
    'Segunda Division': 'Segunda_Division',
    'Süper Lig': 'Super_Lig',
    'Super Lig': 'Super_Lig',
    'UEFA Champions League': 'UEFA_Champions_League',
    'UEFA Europa League': 'UEFA_Europa_League',
    'UEFA Europa Conference': 'UEFA_Europa_Conference',
    'UEFA Europa Conference League': 'UEFA_Europa_Conference',
    'UEFA Nations League': 'UEFA_Nations_League',
  };
  return map[champ] || champ.replace(/ /g, '_');
};