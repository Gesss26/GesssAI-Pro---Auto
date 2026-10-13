// ============================================================
// campionati-config.js
// v3: nomi ESATTI del database (EFL Championship, Serie C con trattino)
// ============================================================

const getLeagueFolder = (champ) => {
  if (!champ) return '';
  const map = {
    'Jupiler Pro League': 'Jupiler_Pro_League',
    'Premier League': 'Premier_League',
    'EFL Championship': 'Championship',                    // ⭐ nome ESATTO dal DB
    'Ligue 1': 'Ligue_1',
    'Ligue 2': 'Ligue_2',
    'Bundesliga': 'Bundesliga',
    '2. Bundesliga': '2. Bundesliga',
    'Serie A': 'Serie_A',
    'Serie B': 'Serie_B',
    'Serie C - Girone A': 'Serie_C_Girone_A',              // ⭐ con trattino
    'Serie C - Girone B': 'Serie_C_Girone_B',              // ⭐ con trattino
    'Serie C - Girone C': 'Serie_C_Girone_C',              // ⭐ con trattino
    'J1 League': 'J1_League',
    'Eredivisie': 'Eredivisie',
    'Eerste Divisie': 'Eerste_Divisie',
    'Primeira Liga': 'Primeira_Liga',
    'Scottish Premiership': 'Scottish_Premiership',
    'K League 1': 'K_League_1',
    'La Liga': 'La_Liga',
    'Segunda División': 'Segunda_Division',
    'Süper Lig': 'Super_Lig',
    'UEFA Champions League': 'UEFA_Champions_League',
    'UEFA Europa League': 'UEFA_Europa_League',
    'UEFA Europa Conference': 'UEFA_Europa_Conference',
    'UEFA Nations League': 'UEFA_Nations_League',
  };
  return map[champ] || champ.replace(/ /g, '_');
};