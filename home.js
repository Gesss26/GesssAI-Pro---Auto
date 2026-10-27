// ============================================================
// home.js - Modulo Home con MENU PRINCIPALE a griglia di card
// v11: Menu hub con EMOJI + preset campionati con loghi reali
//      + griglia 5×5 unificata "Campionati Attivi" in Home
//      + sottomenu Info e Utilità + lista mobile compatta
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback } = React;

  const CHINESE_TEAMS = new Set([
    'Chengdu Better City', 'Sichuan Jiuniu', 'Tianjin Teda', 'Shandong Luneng',
    'Shanghai Shenhua', 'Dalian Zhixing', 'SHANGHAI SIPG', 'Henan Jianye',
    'Yunnan Yukun', 'Qingdao Jonoon', 'Hangzhou Greentown', 'Qingdao Youth Island',
    'Wuhan Three Towns', 'Beijing Guoan', 'Shenyang Urban', 'Chongqing Tongliang Long',
  ]);

  const normalizeCampionato = (match) => {
    const camp = (match.campionato || '').trim();
    const casa = (match.casa || '').trim();
    const ospiti = (match.ospiti || '').trim();
    if (camp === 'Super League Grecia' && (CHINESE_TEAMS.has(casa) || CHINESE_TEAMS.has(ospiti))) {
      return { ...match, campionato: 'Chinese Super League' };
    }
    return match;
  };

  const normalizeMatches = (matches) => {
    if (!Array.isArray(matches)) return [];
    return matches.map(normalizeCampionato);
  };

  const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
    useEffect(() => {
      const handler = () => setIsMobile(window.innerWidth < 900);
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
  };

  // ============================================================
  // STILI INIETTATI (menu card + lista mobile + preset campionati)
  // ============================================================
  (function injectMenuStyles() {
    if (document.getElementById('home-menu-styles')) return;
    const style = document.createElement('style');
    style.id = 'home-menu-styles';
    style.textContent = `
      .menu-home-header {
        text-align: center;
        margin-bottom: 24px;
        padding: 18px 14px;
        background: linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(255, 0, 229, 0.05));
        border-radius: 16px;
        border: 1px solid var(--border);
      }
      .menu-home-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 26px;
        font-weight: 900;
        letter-spacing: 3px;
        text-transform: uppercase;
        background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta), var(--neon-gold));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 6px;
        text-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
      }
      .menu-home-subtitle {
        font-size: 12px;
        color: var(--text-dim);
        letter-spacing: 2px;
        text-transform: uppercase;
        font-family: 'Orbitron', sans-serif;
      }
      .menu-home-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        width: 100%;
        margin-bottom: 24px;
      }
      @media (max-width: 1500px) and (min-width: 1150px) {
        .menu-home-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
      @media (max-width: 1149px) and (min-width: 900px) {
        .menu-home-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 899px) {
        .menu-home-grid { display: none; }
      }
      .menu-home-card {
        position: relative;
        background: linear-gradient(135deg, rgba(30, 40, 66, 0.85), rgba(20, 27, 46, 0.95));
        border: 2px solid var(--border);
        border-radius: 18px;
        padding: 24px 16px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        min-height: 200px;
        text-align: center;
        overflow: hidden;
        backdrop-filter: blur(10px);
      }
      .menu-home-card:hover {
        transform: translateY(-6px);
        border-color: var(--neon-cyan);
        box-shadow: 0 0 30px rgba(0, 245, 255, 0.4), inset 0 0 20px rgba(0, 245, 255, 0.05);
      }
      .menu-home-card-emoji {
        font-size: 64px;
        line-height: 1;
        transition: transform 0.3s ease;
        filter: drop-shadow(0 0 12px rgba(0, 245, 255, 0.4));
        user-select: none;
      }
      .menu-home-card:hover .menu-home-card-emoji {
        transform: scale(1.12);
      }
      .menu-home-card-title {
        font-family: 'Rajdhani', sans-serif;
        font-size: 15px;
        font-weight: 800;
        color: var(--text);
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .menu-home-card-desc {
        font-size: 11px;
        color: var(--text-dim);
        line-height: 1.3;
      }

      /* Blocco Seleziona Campionati */
      .menu-home-section {
        background: linear-gradient(135deg, rgba(30, 40, 66, 0.7), rgba(20, 27, 46, 0.9));
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 20px;
      }
      .menu-home-section-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 14px;
        font-weight: 900;
        color: var(--neon-cyan);
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .menu-home-section-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      @media (max-width: 1024px) {
        .menu-home-section-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 480px) {
        .menu-home-section-grid { grid-template-columns: 1fr; }
      }
      .menu-home-section-btn {
        padding: 12px 14px;
        border-radius: 12px;
        border: 2px solid var(--neon-cyan);
        background: linear-gradient(135deg, var(--neon-cyan), var(--neon-blue));
        color: #000;
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-family: 'Rajdhani', sans-serif;
        box-shadow: 0 0 15px rgba(0, 245, 255, 0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        min-height: 100px;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      .menu-home-section-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 0 30px rgba(0, 245, 255, 0.7);
      }
      .menu-home-section-btn .btn-logos {
        display: flex;
        gap: 4px;
        align-items: center;
        justify-content: center;
        flex-wrap: nowrap;
        height: 32px;
        background: rgba(0, 0, 0, 0.18);
        border-radius: 8px;
        padding: 4px 8px;
        max-width: 100%;
      }
      .menu-home-section-btn .btn-logos .champ-logo-mini {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .menu-home-section-btn .btn-title {
        font-size: 13px;
        font-weight: 900;
        line-height: 1.1;
      }
      .menu-home-section-btn .btn-sub {
        font-size: 9px;
        opacity: 0.75;
        font-weight: 700;
        text-transform: none;
        letter-spacing: 0;
        text-align: center;
        line-height: 1.2;
      }
      .menu-home-section-btn.btn-coppe {
        background: linear-gradient(135deg, #1a1aff, #4d7cff);
        border-color: #4d7cff;
        color: #fff;
      }
      .menu-home-section-btn.btn-minori {
        background: linear-gradient(135deg, #ff9500, #ffd700);
        border-color: #ffd700;
      }
      .menu-home-section-btn.btn-tutti {
        background: linear-gradient(135deg, var(--neon-magenta), #a855f7);
        border-color: var(--neon-magenta);
        color: #fff;
      }
      .menu-home-section-info {
        margin-top: 12px;
        padding: 10px 14px;
        background: rgba(0, 245, 255, 0.06);
        border-radius: 8px;
        border: 1px solid var(--border);
        font-size: 11px;
        color: var(--text-dim);
        font-style: italic;
        text-align: center;
      }

      /* Lista mobile compatta */
      .menu-mobile-list {
        display: none;
        flex-direction: column;
        gap: 10px;
        width: 100%;
      }
      @media (max-width: 899px) {
        .menu-mobile-list { display: flex; }
      }
      .menu-mobile-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 16px;
        background: linear-gradient(135deg, rgba(30, 40, 66, 0.85), rgba(20, 27, 46, 0.95));
        border: 2px solid var(--border);
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .menu-mobile-item:active {
        transform: scale(0.98);
        border-color: var(--neon-cyan);
        background: rgba(0, 245, 255, 0.08);
      }
      .menu-mobile-item-emoji {
        font-size: 32px;
        line-height: 1;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        user-select: none;
      }
      .menu-mobile-item-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .menu-mobile-item-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--text);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .menu-mobile-item-desc {
        font-size: 11px;
        color: var(--text-dim);
      }
      .menu-mobile-item-arrow {
        font-size: 20px;
        color: var(--neon-cyan);
        font-weight: 900;
        flex-shrink: 0;
      }

      /* Back to menu button */
      .back-to-menu-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: linear-gradient(135deg, var(--neon-cyan), var(--neon-blue));
        color: #000;
        border: 2px solid var(--neon-cyan);
        border-radius: 50px;
        font-size: 12px;
        font-weight: 900;
        font-family: 'Orbitron', sans-serif;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        margin-bottom: 16px;
        box-shadow: 0 0 20px rgba(0, 245, 255, 0.5);
        transition: all 0.2s ease;
      }
      .back-to-menu-btn:hover {
        transform: translateY(-2px) scale(1.03);
        box-shadow: 0 0 35px var(--neon-cyan);
      }
    `;
    document.head.appendChild(style);
  })();

  // ============================================================
  // CONFIGURAZIONE MENU
  // ============================================================
  const MENU_ITEMS = [
    {
      id: 'gestione-conto',
      title: 'Gestione Conto',
      desc: 'Banca e movimenti',
      emoji: '💰',
      action: { type: 'homeTab', value: 'GestioneConto' },
    },
    {
      id: 'giornata',
      title: 'Visualizza Giornata',
      desc: 'Partite per nazione',
      emoji: '⚽',
      action: { type: 'homeTab', value: 'Nazioni' },
    },
    {
      id: 'palinsesto',
      title: 'Palinsesto',
      desc: 'Tutte le partite',
      emoji: '📅',
      action: { type: 'mainTab', value: 'Palinsesto' },
    },
    {
      id: 'storico',
      title: 'Storico Partite',
      desc: 'Archivio completo',
      emoji: '📜',
      action: { type: 'mainTab', value: 'Storico' },
    },
    {
      id: 'schedina',
      title: 'Crea Schedina',
      desc: 'Costruisci giocate',
      emoji: '🎯',
      action: { type: 'mainTab', value: 'Schedina' },
    },
    {
      id: 'info-utilita',
      title: 'Info e Utilità',
      desc: 'Strumenti avanzati',
      emoji: '🧰',
      action: { type: 'homeTab', value: 'InfoUtilità' },
    },
    {
      id: 'impostazioni',
      title: 'Impostazioni',
      desc: 'Configurazione',
      emoji: '⚙️',
      action: { type: 'mainTab', value: 'Impostazioni' },
    },
  ];

  const MENU_ITEMS_INFO_UTILITA = [
    {
      id: 'calcolatrice',
      title: 'Calcolatrice',
      desc: 'Copertura e profitto',
      emoji: '🧮',
      action: { type: 'homeTab', value: 'Calcolatrice' },
    },
    {
      id: 'performance',
      title: 'Performance',
      desc: 'Statistiche trading',
      emoji: '📈',
      action: { type: 'homeTab', value: 'Performance' },
    },
  ];

  const TOP_5_MAGGIORI = ['Serie A', 'Ligue 1', 'La Liga', 'Bundesliga', 'Premier League'];
  const TOP_5_MINORI = ['Serie B', '2. Bundesliga', 'Ligue 2', 'Segunda División', 'EFL Championship'];
  const TOP_COPPE = ['UEFA Champions League', 'UEFA Europa League', 'UEFA Europa Conference', 'UEFA Nations League'];

  const PRESET_CAMPIONATI = [
    {
      id: 'top5-maggiori',
      label: '🏆 Top 5 Maggiori',
      sub: 'Serie A · Ligue 1 · Liga · Bundesliga · Premier',
      className: '',
      campionati: TOP_5_MAGGIORI,
    },
    {
      id: 'top5-minori',
      label: '🔹 Top 5 Minori',
      sub: 'Serie B · 2. Bundes · Ligue 2 · Segunda · EFL',
      className: 'btn-minori',
      campionati: TOP_5_MINORI,
    },
    {
      id: 'maggiori-minori',
      label: '💎 Maggiori + Minori',
      sub: '10 campionati top',
      className: 'btn-tutti',
      campionati: [...TOP_5_MAGGIORI, ...TOP_5_MINORI],
    },
    {
      id: 'coppe',
      label: '🏆 Coppe UEFA',
      sub: 'UCL · UEL · UECL · Nations League',
      className: 'btn-coppe',
      campionati: TOP_COPPE,
    },
  ];

  // ============================================================
  // NAZIONI
  // ============================================================
  const NAZIONI = {
    'Coppe UEFA': { file: 'uefa.png', campionati: [
      'UEFA Champions League',
      'UEFA Europa League',
      'UEFA Europa Conference',
      'UEFA Nations League',
    ]},
    'Belgio':      { file: 'belgio.png',      campionati: ['Jupiler Pro League'] },
    'Corea':       { file: 'corea.png',       campionati: ['K League 1'] },
    'Francia':     { file: 'francia.png',     campionati: ['Ligue 1', 'Ligue 2'] },
    'Germania':    { file: 'germania.png',    campionati: ['Bundesliga', '2. Bundesliga'] },
    'Giappone':    { file: 'giappone.png',    campionati: ['J1 League'] },
    'Inghilterra': { file: 'inghilterra.png', campionati: ['Premier League', 'EFL Championship'] },
    'Italia':      { file: 'italia.png',      campionati: [
      'Serie A', 'Serie B',
      'Serie C - Girone A', 'Serie C - Girone B', 'Serie C - Girone C',
    ]},
    'Olanda':      { file: 'olanda.png',      campionati: ['Eredivisie', 'Eerste Divisie'] },
    'Portogallo':  { file: 'portogallo.png',  campionati: ['Primeira Liga'] },
    'Scozia':      { file: 'scozia.png',      campionati: ['Scottish Premiership'] },
    'Spagna':      { file: 'spagna.png',      campionati: ['La Liga', 'Segunda División'] },
    'Turchia':     { file: 'turchia.png',     campionati: ['Süper Lig'] },
  };

  const NAZIONI_BASE_PATH = 'logos/Nazioni/';
  const SCHEDINA_STORAGE_KEY = 'ft_schedina_selezioni';
  const GIOCATE_SELEZIONATE_KEY = 'ft_giocate_selezionate';
  const FAMIGLIE_SELEZIONATE_KEY = 'ft_selected_famiglie';

  // ============================================================
  // COMPONENTE: Back to Menu Button
  // ============================================================
  const BackToMenuButton = ({ onClick, label = 'Torna al Menù Principale' }) => {
    if (!onClick) return null;
    return (
      <button className="back-to-menu-btn" onClick={onClick}>
        ← {label}
      </button>
    );
  };

  // ============================================================
  // COMPONENTE: Menu Home (emoji + preset + griglia 5x5 campionati)
  // ============================================================
  const MenuHomeComponent = ({ onSelect, onApplyPreset, presetAttivo, matches, championships }) => {
    const isMobile = useIsMobile();

    const {
      campionatiAttivi,
      toggleCampionato,
      selezionaTutti,
      deselezionaTutti,
    } = window.FiltriCampionati.useFiltroCampionati();

    const championshipsOrdinati = useMemo(() => {
      const lista = (championships && championships.length > 0)
        ? championships
        : (window.CHAMPIONSHIP_LIST || []).map(name => ({ name }));
      return [...lista].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'it', { sensitivity: 'base' })
      );
    }, [championships]);

    const getBadge = (nomeCampionato) => {
      if (!Array.isArray(matches)) return null;
      const todayStr = window.getTodayStr();
      const maxDateStr = window.addDaysToDateStr(todayStr, 2);

      const nOggi = matches.filter(m =>
        m.campionato === nomeCampionato &&
        m.stato === 'Futura' &&
        window.normalizeDate(m.data) === todayStr
      ).length;

      const n2g = matches.filter(m => {
        if (m.campionato !== nomeCampionato || m.stato !== 'Futura') return false;
        const d = window.normalizeDate(m.data);
        return d > todayStr && d <= maxDateStr;
      }).length;

      if (nOggi > 0) {
        return (
          <span style={{
            background: 'var(--neon-red)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 900,
            padding: '1px 6px',
            borderRadius: '10px',
            flexShrink: 0,
          }}>{nOggi}</span>
        );
      }
      if (n2g > 0) {
        return (
          <span style={{
            background: 'var(--neon-gold)',
            color: '#000',
            fontSize: '9px',
            fontWeight: 900,
            padding: '1px 6px',
            borderRadius: '10px',
            flexShrink: 0,
          }}>{n2g}</span>
        );
      }
      return null;
    };

    const renderLoghiPreset = (campionati) => {
      const ChampLogo = window.ChampLogo;
      if (!ChampLogo) return null;
      return (
        <div className="btn-logos">
          {campionati.slice(0, 5).map((camp, i) => (
            <span key={i} className="champ-logo-mini" title={camp}>
              <ChampLogo campionato={camp} size={22} />
            </span>
          ))}
        </div>
      );
    };

    const numeroCampionatiSelezionati = campionatiAttivi.length;
    const numeroCampionatiTotali = championshipsOrdinati.length;
    const tuttiSelezionati = numeroCampionatiSelezionati === numeroCampionatiTotali && numeroCampionatiTotali > 0;

    return (
      <div>
        <div className="menu-home-header">
          <div className="menu-home-title">Menu Principale</div>
          <div className="menu-home-subtitle">GesssAI-Pro · Football Trader</div>
        </div>

        {/* DESKTOP: griglia card emoji */}
        <div className="menu-home-grid">
          {MENU_ITEMS.map(item => (
            <div
              key={item.id}
              className="menu-home-card"
              onClick={() => onSelect(item.action)}
            >
              <div className="menu-home-card-emoji">{item.emoji}</div>
              <div className="menu-home-card-title">{item.title}</div>
              <div className="menu-home-card-desc">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* MOBILE: lista compatta emoji */}
        <div className="menu-mobile-list">
          {MENU_ITEMS.map(item => (
            <div
              key={item.id}
              className="menu-mobile-item"
              onClick={() => onSelect(item.action)}
            >
              <div className="menu-mobile-item-emoji">{item.emoji}</div>
              <div className="menu-mobile-item-text">
                <div className="menu-mobile-item-title">{item.title}</div>
                <div className="menu-mobile-item-desc">{item.desc}</div>
              </div>
              <div className="menu-mobile-item-arrow">→</div>
            </div>
          ))}
        </div>

        {/* BLOCCO: Seleziona Campionati (UNIFICATO) */}
        <div className="menu-home-section">
          <div className="menu-home-section-title">
            <span>🏆</span>
            <span>Seleziona Campionati</span>
          </div>

          {/* RIGA 1: Preset rapidi con loghi */}
          <div className="menu-home-section-grid">
            {PRESET_CAMPIONATI.map(preset => {
              const isActive = presetAttivo === preset.id;
              return (
                <button
                  key={preset.id}
                  className={`menu-home-section-btn ${preset.className}`}
                  onClick={() => onApplyPreset(preset)}
                  style={{
                    outline: isActive ? '3px solid var(--neon-gold)' : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  {renderLoghiPreset(preset.campionati)}
                  <span className="btn-title">{preset.label}</span>
                  <span className="btn-sub">{preset.sub}</span>
                </button>
              );
            })}
          </div>

          {/* RIGA 2: Griglia 5×5 completa */}
          <div style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px dashed var(--border)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--neon-cyan)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                ⚙️ Campionati Attivi
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  className="btn"
                  onClick={selezionaTutti}
                  style={{
                    fontSize: '10px',
                    padding: '4px 14px',
                    background: tuttiSelezionati ? 'var(--accent)' : 'var(--surface)',
                    color: tuttiSelezionati ? '#000' : 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >✅ Tutti</button>
                <button
                  className="btn"
                  onClick={deselezionaTutti}
                  style={{
                    fontSize: '10px',
                    padding: '4px 14px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >❌ Deseleziona</button>
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  padding: '4px 10px',
                  background: 'var(--surface)',
                  borderRadius: '6px',
                  fontWeight: 700,
                }}>
                  {numeroCampionatiSelezionati} / {numeroCampionatiTotali}
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '4px',
              width: '100%',
            }}>
              {championshipsOrdinati.map((c, idx) => {
                const nomeCamp = c.name || c;
                const isActive = campionatiAttivi.includes(nomeCamp);
                const color = window.getChampColor(nomeCamp);
                const label = nomeCamp.length > 16 ? nomeCamp.substring(0, 14) + '…' : nomeCamp;
                const hasPartite = Array.isArray(matches) && matches.some(m => m.campionato === nomeCamp);

                return (
                  <button
                    key={`${nomeCamp}-${idx}`}
                    onClick={() => toggleCampionato(nomeCamp)}
                    className={`champ-bar-item ${isActive ? 'active' : ''}`}
                    style={{
                      borderColor: isActive ? 'var(--neon-cyan)' : `${color}66`,
                      background: isActive
                        ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))'
                        : 'var(--bg-elevated)',
                      color: isActive ? '#000' : 'var(--text-dim)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '5px 6px',
                      minHeight: '36px',
                      borderWidth: isActive ? '2px' : '1px',
                      borderStyle: 'solid',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: isActive ? 'bold' : '700',
                      width: '100%',
                      transition: 'all 0.2s',
                      overflow: 'hidden',
                      boxShadow: isActive ? '0 0 20px rgba(0, 245, 255, 0.5)' : 'none',
                      opacity: hasPartite ? 1 : 0.4,
                    }}
                    title={nomeCamp}
                  >
                    {window.ChampLogo && <window.ChampLogo campionato={nomeCamp} size={14} />}
                    <span style={{
                      fontSize: '10px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '75px',
                    }}>
                      {label}
                    </span>
                    {getBadge(nomeCamp)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="menu-home-section-info">
            💡 Il filtro è valido per <b>Palinsesto</b>, <b>Schedina</b> e tutte le altre schermate
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTE: Info e Utilità
  // ============================================================
  const InfoUtilitàComponent = ({ onSelect, onBack }) => {
    return (
      <div>
        <BackToMenuButton onClick={onBack} label="Torna al Menù" />

        <div className="menu-home-header">
          <div className="menu-home-title">Info e Utilità</div>
          <div className="menu-home-subtitle">Strumenti avanzati</div>
        </div>

        <div className="menu-home-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', maxWidth: '600px', margin: '0 auto 24px' }}>
          {MENU_ITEMS_INFO_UTILITA.map(item => (
            <div
              key={item.id}
              className="menu-home-card"
              onClick={() => onSelect(item.action)}
            >
              <div className="menu-home-card-emoji">{item.emoji}</div>
              <div className="menu-home-card-title">{item.title}</div>
              <div className="menu-home-card-desc">{item.desc}</div>
            </div>
          ))}
        </div>

        <div className="menu-mobile-list">
          {MENU_ITEMS_INFO_UTILITA.map(item => (
            <div
              key={item.id}
              className="menu-mobile-item"
              onClick={() => onSelect(item.action)}
            >
              <div className="menu-mobile-item-emoji">{item.emoji}</div>
              <div className="menu-mobile-item-text">
                <div className="menu-mobile-item-title">{item.title}</div>
                <div className="menu-mobile-item-desc">{item.desc}</div>
              </div>
              <div className="menu-mobile-item-arrow">→</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTI ESISTENTI
  // ============================================================
  const QuotaInline = ({ match, familyId, giocata, pctTua, size = 'sm' }) => {
    const [quotaInfo, setQuotaInfo] = useState(null);
    const quoteHook = window.QuoteManager ? window.QuoteManager.useQuote() : { numPartite: 0 };
    const numPartite = quoteHook.numPartite;

    useEffect(() => {
      if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') return;
      try {
        const info = window.QuoteManager.analizzaGiocata(match, familyId, giocata, pctTua);
        setQuotaInfo(info);
      } catch (e) { setQuotaInfo(null); }
    }, [match.id, familyId, giocata, pctTua, numPartite]);

    if (!quotaInfo || !quotaInfo.quotaBook) return null;
    const { quotaBook, edge, isValue } = quotaInfo;
    const padding = size === 'lg' ? '3px 8px' : '1px 6px';
    const fontSize = size === 'lg' ? '12px' : '10px';

    return (
      <span
        title={isValue ? `VALUE BET! Edge: +${edge}%` : `Quota Marathonbet`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          padding, marginTop: '2px', borderRadius: '4px',
          background: isValue ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          border: `1px solid ${isValue ? 'var(--neon-green)' : 'var(--border)'}`,
          fontSize, fontWeight: 'bold',
          color: isValue ? 'var(--neon-green)' : 'var(--text)',
          whiteSpace: 'nowrap',
        }}
      >
        💰{quotaBook.toFixed(2)}
      </span>
    );
  };

  const NazioneBandiera = ({ nazione, size = 40 }) => {
    const [hasError, setHasError] = useState(false);
    const info = NAZIONI[nazione];

    if (!info || hasError) {
      const initials = nazione.substring(0, 3).toUpperCase();
      return (
        <div style={{
          width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '50%',
          fontWeight: 'bold', color: 'var(--neon-cyan)', fontSize: Math.max(size * 0.3, 9), flexShrink: 0,
        }}>
          {initials}
        </div>
      );
    }

    return (
      <img
        src={NAZIONI_BASE_PATH + info.file}
        alt={nazione}
        width={size}
        height={size}
        onError={() => setHasError(true)}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }}
      />
    );
  };

  const formatGiocataLabel = (familyId, label) => {
    if (!label) return '—';
    if (label.startsWith('Over '))  return label;
    if (label.startsWith('Under ')) return label.replace('.', ',');
    if (familyId === 'multigol') return label;
    if (familyId === 'mg_casa_ospite') {
      const parts = label.split('+');
      if (parts.length === 2) return `MG ${parts[0]} Casa + MG ${parts[1]} Ospite`;
    }
    if (familyId === 'dc_multigol') {
      const parts = label.split('+');
      if (parts.length === 2) return `${parts[0]} + ${parts[1]}`;
    }
    if (familyId === 'dc_under') {
      const parts = label.split('+');
      if (parts.length === 2) {
        const uLabel = parts[1].replace('U', 'Under ').replace('.', ',');
        return `${parts[0]} + ${uLabel}`;
      }
    }
    if (familyId === 'dc_over') {
      const parts = label.split('+');
      if (parts.length === 2) {
        const oLabel = parts[1].replace('O', 'Over ').replace('.', ',');
        return `${parts[0]} + ${oLabel}`;
      }
    }
    if (familyId === 'gg_ng') {
      if (label === 'Goal-Goal') return 'GG';
      if (label === 'No Goal') return 'NG';
    }
    return label;
  };

  const getGiornataCorrente = (matchesDelCampionato) => {
    if (!matchesDelCampionato || matchesDelCampionato.length === 0) return null;
    const todayStr = window.getTodayStr();

    const oggi = matchesDelCampionato.filter(m => window.normalizeDate(m.data) === todayStr);
    if (oggi.length > 0) {
      const roundCount = {};
      oggi.forEach(m => {
        const r = m.round || 'N/A';
        roundCount[r] = (roundCount[r] || 0) + 1;
      });
      let best = null, bestCount = 0;
      for (const [r, c] of Object.entries(roundCount)) {
        if (c > bestCount) { best = r; bestCount = c; }
      }
      return best;
    }

    const future = matchesDelCampionato
      .filter(m => m.stato === 'Futura' && m.data)
      .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));
    if (future.length > 0) return future[0].round || null;

    const played = matchesDelCampionato
      .filter(m => m.stato === 'Giocata' && m.data)
      .sort((a, b) => window.parseDate(b.data, b.ora) - window.parseDate(a.data, a.ora));
    if (played.length > 0) return played[0].round || null;

    return null;
  };

  const leggiFamiglieSelezionate = () => {
    try {
      const saved = localStorage.getItem(FAMIGLIE_SELEZIONATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return window.DEFAULT_FAMIGLIE || ['dc_under', 'mg_casa_ospite', 'over'];
  };

  const calcolaTop3Giocate = (match, allMatches, tipoGiocate = 'calcolate') => {
    if (!match) return [];
    const stats = window.computeMatchStats(match, allMatches);
    if (stats.error) return [];

    stats._allMatches = allMatches;
    stats._homeTeam = match.casa;
    stats._awayTeam = match.ospiti;

    const homeMG = stats.homeMG || {};
    const awayMG = stats.awayMG || {};
    const mgTot = stats.mgTot || {};
    const homeRange = window.getMultigolRange(match.casa, allMatches);
    const awayRange = window.getMultigolRange(match.ospiti, allMatches);

    if (tipoGiocate === 'calcolate') {
      const tutte = [];
      Object.keys(window.FAMIGLIE_GIOCATE).forEach(familyId => {
        const family = window.FAMIGLIE_GIOCATE[familyId];
        if (!family) return;

        let best = null;

        if (familyId === 'gg_ng') {
          const ggNgResult = window.calcolaGG_NG ? window.calcolaGG_NG(stats) : null;
          if (ggNgResult) {
            best = { ...ggNgResult, familyId: 'gg_ng', familyLabel: family.label, familyIcon: family.icon };
          }
        } else {
          best = window.getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
        }

        if (best && best.pct > 0) {
          tutte.push({
            familyId, familyLabel: family.label, familyIcon: family.icon,
            giocata: best.giocata, label: best.label, pct: best.pct, isBomb: best.pct >= 90,
          });
        }
      });

      tutte.sort((a, b) => b.pct - a.pct);
      return tutte.slice(0, 3);
    }

    const famiglieScelte = leggiFamiglieSelezionate();
    if (!famiglieScelte || famiglieScelte.length === 0) return [];

    const tutte = [];
    famiglieScelte.forEach(familyId => {
      const family = window.FAMIGLIE_GIOCATE[familyId];
      if (!family) return;

      let best = null;

      if (familyId === 'gg_ng') {
        const ggNgResult = window.calcolaGG_NG ? window.calcolaGG_NG(stats) : null;
        if (ggNgResult) {
          best = { ...ggNgResult, familyId: 'gg_ng', familyLabel: family.label, familyIcon: family.icon };
        }
      } else {
        best = window.getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
      }

      if (best && best.pct > 0) {
        tutte.push({
          familyId,
          familyLabel: family.label,
          familyIcon: family.icon,
          giocata: best.giocata,
          label: best.label,
          pct: best.pct,
          isBomb: best.pct >= 90,
        });
      }
    });

    tutte.sort((a, b) => b.pct - a.pct);
    return tutte.slice(0, 3);
  };

  const leggiSelezioniSchedina = () => {
    try { return JSON.parse(localStorage.getItem(SCHEDINA_STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  };

  const scriviSelezioniSchedina = (arr) => {
    try {
      localStorage.setItem(SCHEDINA_STORAGE_KEY, JSON.stringify(arr));
      window.dispatchEvent(new CustomEvent('schedina-updated', { detail: arr }));
    } catch (e) {}
  };

  const chiaveSelezione = (matchId, familyId, giocata) => `${matchId}::${familyId}::${giocata}`;

  const isGiocataSelezionata = (matchId, familyId, giocata) => {
    const arr = leggiSelezioniSchedina();
    const key = chiaveSelezione(matchId, familyId, giocata);
    return arr.some(s => chiaveSelezione(s.matchId, s.familyId, s.giocata) === key);
  };

  const toggleSelezioneSchedina = (match, giocataObj) => {
    const arr = leggiSelezioniSchedina();
    const key = chiaveSelezione(match.id, giocataObj.familyId, giocataObj.giocata);
    const idx = arr.findIndex(s => chiaveSelezione(s.matchId, s.familyId, s.giocata) === key);

    if (idx >= 0) {
      arr.splice(idx, 1);
      scriviSelezioniSchedina(arr);
      return false;
    } else {
      arr.push({
        matchId: match.id, campionato: match.campionato, casa: match.casa, ospiti: match.ospiti,
        data: match.data, ora: match.ora, giocata: giocataObj.giocata,
        familyId: giocataObj.familyId, familyLabel: giocataObj.familyLabel,
        pct: giocataObj.pct, aggiuntoIl: new Date().toISOString(),
      });
      scriviSelezioniSchedina(arr);
      return true;
    }
  };

  const GiocataBadge = ({ match, giocataObj, onToggle }) => {
    const [selected, setSelected] = useState(() =>
      isGiocataSelezionata(match.id, giocataObj.familyId, giocataObj.giocata)
    );

    const pct = giocataObj.pct;
    const cls = window.getPercentualeClasse(pct);
    const isBomb = pct >= 90;
    const isGGNG = giocataObj.familyId === 'gg_ng';

    const handleClick = (e) => {
      e.stopPropagation();
      const nowSelected = toggleSelezioneSchedina(match, giocataObj);
      setSelected(nowSelected);
      if (onToggle) onToggle(nowSelected);
    };

    return (
      <button
        onClick={handleClick}
        title={`Clicca per ${selected ? 'rimuovere' : 'aggiungere'} alla schedina`}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '2px', padding: '6px 8px', borderRadius: '6px',
          border: selected
            ? '2px solid var(--neon-green)'
            : isBomb
              ? '2px solid var(--neon-gold)'
              : (isGGNG ? '2px solid #e74c3c' : '1px solid var(--border)'),
          background: selected
            ? 'rgba(0, 255, 136, 0.12)'
            : isBomb
              ? 'rgba(255, 215, 0, 0.10)'
              : (isGGNG ? 'rgba(231, 76, 60, 0.06)' : 'var(--surface)'),
          cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'center',
          minHeight: '58px', position: 'relative',
        }}
      >
        {selected && (
          <span style={{
            position: 'absolute', top: '-6px', right: '-6px', background: 'var(--neon-green)', color: '#000',
            borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}>✓</span>
        )}
        <span style={{
          fontSize: '11px', fontWeight: 'bold', color: isGGNG ? '#e74c3c' : 'var(--text)', lineHeight: '1.2',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
        }}>
          {giocataObj.label}
        </span>
        <span className={`giocata-pct ${cls}`} style={{ fontSize: '13px' }}>
          {pct}% {isBomb && <span className="bomb-icon" style={{ fontSize: '12px' }}>💣</span>}
        </span>
        <QuotaInline match={match} familyId={giocataObj.familyId} giocata={giocataObj.giocata} pctTua={pct} size="sm" />
        <span style={{
          fontSize: '9px', color: 'var(--text-dim)', lineHeight: '1',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
        }}>
          {giocataObj.familyIcon} {giocataObj.familyLabel}
        </span>
      </button>
    );
  };

  const RigaPartita = ({ match, allMatches, tipoGiocate, refreshKey }) => {
    const top3 = useMemo(() => {
      const res = calcolaTop3Giocate(match, allMatches, tipoGiocate);
      return res.map(g => ({ ...g, label: formatGiocataLabel(g.familyId, g.label) }));
    }, [match.id, tipoGiocate, refreshKey]);

    const dataEU = match.data ? window.formatDateEU(match.data) : 'N/D';
    const ora = match.ora || 'TBD';

    const cellStyle = {
      padding: '8px 10px',
      borderBottom: '1px solid var(--border)',
      fontSize: '13px',
      verticalAlign: 'middle',
    };

    return (
      <tr style={{ transition: 'background 0.15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: 'var(--text-dim)', width: '90px' }}>{dataEU}</td>
        <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: 'var(--neon-cyan)', fontWeight: 'bold', width: '60px' }}>{ora}</td>
        <td style={{ ...cellStyle, minWidth: '180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <window.TeamLogo teamName={match.casa} championship={match.campionato} size={20} />
            <span style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '13px' }}>
              {match.casa} - {match.ospiti}
            </span>
            <window.TeamLogo teamName={match.ospiti} championship={match.campionato} size={20} />
          </div>
        </td>
        <td style={{ ...cellStyle, width: '160px' }}>
          {top3[0] ? <GiocataBadge match={match} giocataObj={top3[0]} /> : <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>—</span>}
        </td>
        <td style={{ ...cellStyle, width: '160px' }}>
          {top3[1] ? <GiocataBadge match={match} giocataObj={top3[1]} /> : <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>—</span>}
        </td>
        <td style={{ ...cellStyle, width: '160px' }}>
          {top3[2] ? <GiocataBadge match={match} giocataObj={top3[2]} /> : <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>—</span>}
        </td>
      </tr>
    );
  };

  const SezioneCampionato = ({ campionato, matches, allMatches, hideHeader = false, tipoGiocate = 'calcolate', refreshKey }) => {
    const partiteCampionato = matches
      .filter(m => m.campionato === campionato)
      .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));

    if (partiteCampionato.length === 0) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
          Nessuna partita per {campionato}
        </div>
      );
    }

    const giornata = getGiornataCorrente(partiteCampionato);
    const color = window.getChampColor(campionato);

    let partiteDaMostrare = partiteCampionato;
    if (giornata) {
      const sameRound = partiteCampionato.filter(m => String(m.round) === String(giornata));
      if (sameRound.length > 0) partiteDaMostrare = sameRound;
    }

    return (
      <div style={{ marginBottom: '24px' }}>
        {!hideHeader && (
          <div style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#000',
            padding: '10px 16px', borderRadius: '8px 8px 0 0',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {window.ChampLogo && <window.ChampLogo campionato={campionato} size={24} />}
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{campionato}</span>
              {giornata && (
                <span style={{
                  background: 'rgba(0,0,0,0.2)', color: '#000', padding: '2px 12px',
                  borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
                }}>
                  Giornata {giornata}
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.8 }}>
              {partiteDaMostrare.length} partite
            </span>
          </div>
        )}

        <div style={{
          overflowX: 'auto', background: 'var(--card)',
          border: '1px solid var(--border)',
          borderTop: hideHeader ? '1px solid var(--border)' : 'none',
          borderRadius: hideHeader ? '12px' : '0 0 8px 8px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>Data</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>Ora</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>Partita</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>🥇 Giocata 1</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>🥈 Giocata 2</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>🥉 Giocata 3</th>
              </tr>
            </thead>
            <tbody>
              {partiteDaMostrare.map(m => (
                <RigaPartita key={m.id} match={m} allMatches={allMatches} tipoGiocate={tipoGiocate} refreshKey={refreshKey} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const VistaNazione = ({ nazione, matches, onBack, tipoGiocate, refreshKey }) => {
    if (nazione && typeof nazione === 'object' && nazione.__special === 'UEFA') {
      const camp = nazione.campionato;
      return (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
            padding: '12px 16px', background: 'var(--card)', borderRadius: '10px',
            border: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            <button onClick={onBack} style={{
              background: 'var(--bg-elevated)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '8px',
              padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
            }}>← Indietro</button>
            {window.ChampLogo && <window.ChampLogo campionato={camp} size={44} />}
            <h2 style={{ margin: 0, flex: 1, color: 'var(--neon-cyan)' }}>{camp}</h2>
          </div>
          <SezioneCampionato
            campionato={camp}
            matches={matches}
            allMatches={matches}
            tipoGiocate={tipoGiocate}
            refreshKey={refreshKey}
          />
        </div>
      );
    }

    const info = NAZIONI[nazione];
    if (!info) return null;

    const [schedinaCount, setSchedinaCount] = useState(() => leggiSelezioniSchedina().length);

    useEffect(() => {
      const handler = (e) => setSchedinaCount((e.detail || []).length);
      window.addEventListener('schedina-updated', handler);
      return () => window.removeEventListener('schedina-updated', handler);
    }, []);

    const campionatiDaMostrare = info.campionati.filter(c =>
      matches.some(m => m.campionato === c)
    );

    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
          padding: '12px 16px', background: 'var(--card)', borderRadius: '10px',
          border: '1px solid var(--border)', flexWrap: 'wrap',
        }}>
          <button onClick={onBack} style={{
            background: 'var(--bg-elevated)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: '8px',
            padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
          }}>← Indietro</button>

          <NazioneBandiera nazione={nazione} size={44} />

          <h2 style={{ margin: 0, flex: 1, color: 'var(--neon-cyan)' }}>{nazione}</h2>

          {schedinaCount > 0 && (
            <span style={{
              background: 'var(--neon-green)', color: '#000', padding: '4px 14px',
              borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
            }}>
              🎯 {schedinaCount} in schedina
            </span>
          )}
        </div>

        {campionatiDaMostrare.length === 0 ? (
          <div className="empty-state">
            Nessuna partita disponibile per i campionati attivi di {nazione}.
          </div>
        ) : (
          campionatiDaMostrare.map(camp => (
            <SezioneCampionato
              key={camp}
              campionato={camp}
              matches={matches}
              allMatches={matches}
              tipoGiocate={tipoGiocate}
              refreshKey={refreshKey}
            />
          ))
        )}
      </div>
    );
  };

  const MobileCampScelta = ({ campionati, onSelect }) => (
    <div className="card" style={{ padding: '14px' }}>
      <div style={{
        fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontWeight: 700,
        color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '2px',
        marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)',
      }}>
        🏆 Seleziona Campionato
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {campionati.map(camp => {
          const nome = camp.nome || camp;
          const nPartite = camp.nPartite || 0;
          const color = window.getChampColor(nome);
          return (
            <button
              key={nome}
              onClick={() => onSelect(nome)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: '12px',
                border: `2px solid ${color}`,
                background: `linear-gradient(135deg, ${color}22, ${color}11)`,
                cursor: 'pointer', textAlign: 'left',
                boxShadow: `0 4px 16px ${color}33`,
              }}
            >
              {window.ChampLogo && <window.ChampLogo campionato={nome} size={32} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {nome}
                </div>
                {nPartite > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {nPartite} partite
                  </div>
                )}
              </div>
              <span style={{ fontSize: '18px', color: 'var(--neon-cyan)' }}>→</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const MobileVistaGiornata = ({ campionato, matches, onBack, tipoGiocate, refreshKey }) => {
    const color = window.getChampColor(campionato);
    const partiteCampionato = matches
      .filter(m => m.campionato === campionato)
      .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));

    const giornata = getGiornataCorrente(partiteCampionato);
    let partiteDaMostrare = partiteCampionato;
    if (giornata) {
      const sameRound = partiteCampionato.filter(m => String(m.round) === String(giornata));
      if (sameRound.length > 0) partiteDaMostrare = sameRound;
    }

    return (
      <div>
        <button className="mobile-back-btn" onClick={onBack}>
          ← Cambia Campionato
        </button>

        <div style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          borderRadius: '12px', padding: '14px 16px', marginBottom: '14px',
          display: 'flex', alignItems: 'center', gap: '12px',
          marginTop: '55px',
          boxShadow: `0 6px 24px ${color}55`,
        }}>
          {window.ChampLogo && <window.ChampLogo campionato={campionato} size={36} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900,
              color: '#000', textTransform: 'uppercase',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{campionato}</div>
            <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
              {giornata ? `Giornata ${giornata}` : 'Giornata N/D'} • {partiteDaMostrare.length} partite
            </div>
          </div>
        </div>

        <div style={{
          overflowX: 'auto', background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: '12px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {partiteDaMostrare.map(m => (
                <RigaPartita key={m.id} match={m} allMatches={matches} tipoGiocate={tipoGiocate} refreshKey={refreshKey} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // GRIGLIA NAZIONI
  // ============================================================
  const GrigliaNazioni = ({ matches, onSelectNazione, tipoGiocate, setTipoGiocate }) => {
    const nazioniOrdinate = useMemo(() => Object.keys(NAZIONI).sort((a, b) => a.localeCompare(b)), []);

    const conteggi = useMemo(() => {
      const c = {};
      nazioniOrdinate.forEach(naz => {
        const camps = NAZIONI[naz].campionati;
        c[naz] = matches.filter(m => camps.includes(m.campionato)).length;
      });
      return c;
    }, [matches, nazioniOrdinate]);

    const [schedinaCount, setSchedinaCount] = useState(() => leggiSelezioniSchedina().length);

    useEffect(() => {
      const handler = (e) => setSchedinaCount((e.detail || []).length);
      window.addEventListener('schedina-updated', handler);
      return () => window.removeEventListener('schedina-updated', handler);
    }, []);

    const conteggiUEFA = useMemo(() => {
      const c = {};
      (NAZIONI['Coppe UEFA']?.campionati || []).forEach(camp => {
        c[camp] = matches.filter(m => m.campionato === camp).length;
      });
      return c;
    }, [matches]);

    const uefaCampionati = NAZIONI['Coppe UEFA']?.campionati || [];
    const nazioniSenzaUEFA = nazioniOrdinate.filter(n => n !== 'Coppe UEFA');

    const bottoneSempreCyanStyle = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '8px 6px',
      minHeight: '90px',
      borderRadius: '10px',
      borderWidth: '2px',
      borderStyle: 'solid',
      fontSize: '11px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.2s',
      overflow: 'hidden',
      width: '100%',
      fontFamily: 'Rajdhani, sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
      color: '#000',
      borderColor: 'var(--neon-cyan)',
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)',
    };

    const bottoneSempreCyanSmallStyle = {
      ...bottoneSempreCyanStyle,
      flexDirection: 'row',
      minHeight: '44px',
      padding: '8px 10px',
    };

    const [tutteAttive, setTutteAttive] = useState(true);

    return (
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '16px', flexWrap: 'wrap', gap: '10px',
        }}>
          <h2 style={{ margin: 0, color: 'var(--neon-cyan)' }}>🌍 Seleziona una Nazione</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setTutteAttive(true)}
              style={{
                fontSize: '11px', padding: '6px 14px',
                background: tutteAttive ? 'var(--accent)' : 'var(--surface)',
                color: tutteAttive ? '#000' : 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '6px',
                cursor: 'pointer', fontWeight: 'bold',
              }}
            >✅ Seleziona Tutti</button>
            <button
              onClick={() => setTutteAttive(false)}
              style={{
                fontSize: '11px', padding: '6px 14px',
                background: 'var(--surface)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '6px',
                cursor: 'pointer',
              }}
            >❌ Deseleziona Tutti</button>
            {schedinaCount > 0 && (
              <span style={{
                background: 'var(--neon-green)', color: '#000', padding: '4px 14px',
                borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
              }}>
                🎯 {schedinaCount} giocate in schedina
              </span>
            )}
          </div>
        </div>

        <div style={{
          marginBottom: '20px',
          padding: '12px 14px',
          background: 'linear-gradient(135deg, rgba(26, 26, 255, 0.08), rgba(255, 102, 0, 0.05))',
          borderRadius: '14px',
          border: '2px solid var(--border-strong)',
        }}>
          <div style={{
            fontSize: '13px', fontWeight: 700, color: 'var(--neon-cyan)',
            textTransform: 'uppercase', letterSpacing: '2px',
            marginBottom: '12px', paddingBottom: '8px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '20px' }}>🏆</span>
            <span>COPPE UEFA</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '8px',
          }}>
            {uefaCampionati.map(camp => {
              const disabled = conteggiUEFA[camp] === 0;
              const shortName = window.getChampShortName ? window.getChampShortName(camp) : camp;
              return (
                <button
                  key={camp}
                  onClick={() => !disabled && onSelectNazione('UEFA:' + camp)}
                  disabled={disabled}
                  title={disabled ? `${camp} - nessuna partita` : camp}
                  style={{
                    ...bottoneSempreCyanSmallStyle,
                    opacity: disabled ? 0.4 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    filter: disabled ? 'grayscale(0.7)' : 'none',
                  }}
                >
                  {window.ChampLogo && <window.ChampLogo campionato={camp} size={18} />}
                  <span style={{
                    fontSize: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '110px',
                  }}>
                    {shortName}
                  </span>
                  {!disabled && (
                    <span style={{
                      background: 'rgba(0,0,0,0.3)',
                      color: '#000',
                      fontSize: '9px',
                      fontWeight: 900,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      flexShrink: 0,
                    }}>
                      {conteggiUEFA[camp]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="nazioni-grid" style={{ gap: '8px' }}>
          {nazioniSenzaUEFA.map(naz => {
            const disabled = conteggi[naz] === 0 || !tutteAttive;
            return (
              <button
                key={naz}
                onClick={() => !disabled && onSelectNazione(naz)}
                disabled={disabled}
                title={disabled ? `${naz} - nessuna partita` : naz}
                className="nazione-btn"
                style={{
                  ...bottoneSempreCyanStyle,
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  filter: disabled ? 'grayscale(0.7)' : 'none',
                }}
              >
                <NazioneBandiera nazione={naz} size={32} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center' }}>
                  {naz}
                </span>
                {!disabled && (
                  <span style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: '#000',
                    fontSize: '9px',
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}>
                    {conteggi[naz]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // CALCOLATRICE
  // ============================================================
  const CalcolatriceComponent = ({ matches }) => {
    const [campionatoSel, setCampionatoSel] = useState('');
    const [partitaSel, setPartitaSel] = useState('');
    const [giocataSel, setGiocataSel] = useState('');
    const [giocataCustom, setGiocataCustom] = useState('');
    const [vincita, setVincita] = useState('');
    const [quota, setQuota] = useState('');
    const [profittoMinimo, setProfittoMinimo] = useState('');
    const [quotaLive, setQuotaLive] = useState('');

    const campionatiConPartite = useMemo(() => {
      const oggi = window.getTodayStr();
      const futuri = (matches || []).filter(m => m.stato === 'Futura' && window.normalizeDate(m.data) >= oggi);
      const set = new Set(futuri.map(m => m.campionato));
      return Array.from(set).sort();
    }, [matches]);

    const partiteFiltrate = useMemo(() => {
      if (!campionatoSel) return [];
      const oggi = window.getTodayStr();
      return (matches || [])
        .filter(m => m.campionato === campionatoSel && m.stato === 'Futura' && window.normalizeDate(m.data) >= oggi)
        .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));
    }, [matches, campionatoSel]);

    const partita = useMemo(() => {
      if (!partitaSel) return null;
      return (matches || []).find(m => m.id === partitaSel) || null;
    }, [matches, partitaSel]);

    const calcolaCopertura = (giocata) => {
      const g = (giocata || '').toUpperCase().trim();
      const map = {
        '1':    { copre: ['X2'], tipo: 'dc', desc: 'Doppia Chance X2' },
        'X':    { copre: ['12'], tipo: 'dc', desc: 'Doppia Chance 12' },
        '2':    { copre: ['1X'], tipo: 'dc', desc: 'Doppia Chance 1X' },
        '1X':   { copre: ['2'],  tipo: 'singolo', desc: 'Vittoria Ospite (2)' },
        '12':   { copre: ['X'],  tipo: 'singolo', desc: 'Pareggio (X)' },
        'X2':   { copre: ['1'],  tipo: 'singolo', desc: 'Vittoria Casa (1)' },
        'GG':   { copre: ['NG'], tipo: 'singolo', desc: 'No Goal (NG)' },
        'NG':   { copre: ['GG'], tipo: 'singolo', desc: 'Goal (GG)' },
        'OVER 1.5':  { copre: ['UNDER 1.5'], tipo: 'singolo', desc: 'Under 1.5' },
        'OVER 2.5':  { copre: ['UNDER 2.5'], tipo: 'singolo', desc: 'Under 2.5' },
        'OVER 3.5':  { copre: ['UNDER 3.5'], tipo: 'singolo', desc: 'Under 3.5' },
        'OVER 4.5':  { copre: ['UNDER 4.5'], tipo: 'singolo', desc: 'Under 4.5' },
        'UNDER 1.5': { copre: ['OVER 1.5'], tipo: 'singolo', desc: 'Over 1.5' },
        'UNDER 2.5': { copre: ['OVER 2.5'], tipo: 'singolo', desc: 'Over 2.5' },
        'UNDER 3.5': { copre: ['OVER 3.5'], tipo: 'singolo', desc: 'Over 3.5' },
        'UNDER 4.5': { copre: ['OVER 4.5'], tipo: 'singolo', desc: 'Over 4.5' },
      };
      return map[g] || { copre: [], tipo: 'custom', desc: 'Copertura manuale' };
    };

    const coperturaInfo = useMemo(() => {
      const g = giocataCustom.trim() || giocataSel;
      if (!g) return null;
      return calcolaCopertura(g);
    }, [giocataSel, giocataCustom]);

    const analisiProbabilita = useMemo(() => {
      if (!partita || !coperturaInfo || !coperturaInfo.copre.length) return null;
      const stats = window.computeMatchStats(partita, matches || []);
      if (stats.error) return null;
      const segnoCopertura = coperturaInfo.copre[0];

      let pctStorica = 0;
      try {
        pctStorica = window.getGiocataPct(segnoCopertura, stats, stats.homeMG, stats.awayMG, stats.mgTot) || 0;
        if (segnoCopertura === 'GG') pctStorica = window.calcolaGG_NG(stats)?.gg || pctStorica;
        else if (segnoCopertura === 'NG') pctStorica = window.calcolaGG_NG(stats)?.ng || pctStorica;
      } catch (e) { pctStorica = 0; }

      let pctMC = null;
      try {
        const savedMC = localStorage.getItem(`ft_mc_${partita.id}`);
        if (savedMC) {
          const mc = JSON.parse(savedMC);
          if (segnoCopertura === '1') pctMC = mc.homeWins;
          else if (segnoCopertura === 'X') pctMC = mc.draws;
          else if (segnoCopertura === '2') pctMC = mc.awayWins;
          else if (segnoCopertura === '1X') pctMC = (mc.homeWins || 0) + (mc.draws || 0);
          else if (segnoCopertura === 'X2') pctMC = (mc.awayWins || 0) + (mc.draws || 0);
          else if (segnoCopertura === '12') pctMC = (mc.homeWins || 0) + (mc.awayWins || 0);
          else if (segnoCopertura === 'GG') pctMC = mc.gg;
          else if (segnoCopertura === 'NG') pctMC = mc.ng;
          else if (segnoCopertura.startsWith('Over')) {
            const soglia = segnoCopertura.replace('Over ', '').replace('.', '');
            if (soglia === '15') pctMC = mc.over15;
            else if (soglia === '25') pctMC = mc.over25;
            else if (soglia === '35') pctMC = mc.over35;
            else if (soglia === '45') pctMC = mc.over45;
          } else if (segnoCopertura.startsWith('Under')) {
            const soglia = segnoCopertura.replace('Under ', '').replace('.', '');
            if (soglia === '15') pctMC = mc.under15;
            else if (soglia === '25') pctMC = mc.under25;
            else if (soglia === '35') pctMC = mc.under35;
            else if (soglia === '45') pctMC = mc.under45;
          }
        }
      } catch (e) {}

      let pctPDF = null, quotaPDF = null;
      try {
        if (window.QuoteManager && typeof window.QuoteManager.analizzaGiocata === 'function') {
          let familyId = null, giocata = segnoCopertura;
          if (['1', 'X', '2'].includes(segnoCopertura)) familyId = 'fisse';
          else if (['1X', '12', 'X2'].includes(segnoCopertura)) familyId = 'dc';
          else if (['GG', 'NG'].includes(segnoCopertura)) familyId = 'gg_ng';
          else if (segnoCopertura.startsWith('Over')) familyId = 'over';
          else if (segnoCopertura.startsWith('Under')) familyId = 'under';
          if (familyId) {
            const info = window.QuoteManager.analizzaGiocata(partita, familyId, giocata, pctStorica);
            if (info && info.quotaBook) {
              quotaPDF = info.quotaBook;
              pctPDF = Math.round((1 / quotaPDF) * 100);
            }
          }
        }
      } catch (e) {}

      let pctLive = null;
      if (quotaLive && parseFloat(quotaLive) > 1) {
        pctLive = Math.round((1 / parseFloat(quotaLive)) * 100);
      }

      const fonti = [pctStorica, pctMC, pctPDF, pctLive].filter(v => v != null && v > 0);
      const media = fonti.length > 0 ? Math.round(fonti.reduce((a, b) => a + b, 0) / fonti.length) : 0;

      let consiglio = { livello: 'info', testo: '', modalita: 'esatta' };
      if (media < 25) consiglio = { livello: 'ok', testo: '❌ Non coprire — schedina già sicura', modalita: 'esatta', colore: 'var(--neon-green)' };
      else if (media < 35) consiglio = { livello: 'warn', testo: '🤔 Copertura opzionale', modalita: 'esatta', colore: 'var(--neon-gold)' };
      else if (media < 50) consiglio = { livello: 'danger', testo: '✅ Copertura consigliata (con profitto)', modalita: 'profitto', colore: 'var(--neon-orange)' };
      else consiglio = { livello: 'danger', testo: '🚨 Copertura FORTE (no-loss)', modalita: 'noloss', colore: 'var(--neon-red)' };

      return {
        segnoCopertura, tipoCopertura: coperturaInfo.tipo, descrizione: coperturaInfo.desc,
        pctStorica, pctMC, pctPDF, pctLive, quotaPDF, media, consiglio,
      };
    }, [partita, coperturaInfo, quotaLive, matches]);

    const calcoli = useMemo(() => {
      const v = parseFloat(vincita) || 0;
      const q = parseFloat(quota) || 0;
      const p = parseFloat(profittoMinimo) || 0;
      if (v <= 0 || q <= 1) return null;
      let importo = 0, modalita = 'esatta';
      if (p > 0) { importo = (v - p) / q; modalita = 'profitto'; }
      else { importo = v / q; }
      const nettoCoperto = (importo * q) - importo;
      const nettoSchedina = v - importo;
      const totaleInvestito = importo;
      const roiCopertura = importo > 0 ? ((nettoCoperto / importo) * 100) : 0;
      return { importo: Math.max(0, importo), nettoCoperto, nettoSchedina, totaleInvestito, roiCopertura, modalita };
    }, [vincita, quota, profittoMinimo]);

    const profittoSuggerito = useMemo(() => {
      if (!analisiProbabilita || !vincita) return null;
      const v = parseFloat(vincita) || 0;
      const prob = analisiProbabilita.media / 100;
      const suggerito = Math.round(v * prob * 0.3);
      return suggerito > 0 ? suggerito : null;
    }, [analisiProbabilita, vincita]);

    const resetAll = () => {
      setCampionatoSel(''); setPartitaSel(''); setGiocataSel(''); setGiocataCustom('');
      setVincita(''); setQuota(''); setProfittoMinimo(''); setQuotaLive('');
    };

    const giocateDisponibili = [
      { value: '1', label: '1 (Vittoria Casa)' },
      { value: 'X', label: 'X (Pareggio)' },
      { value: '2', label: '2 (Vittoria Ospite)' },
      { value: '1X', label: '1X (Doppia Chance Casa/Pareggio)' },
      { value: '12', label: '12 (Doppia Chance No Pareggio)' },
      { value: 'X2', label: 'X2 (Doppia Chance Pareggio/Ospite)' },
      { value: 'GG', label: 'GG (Goal-Goal)' },
      { value: 'NG', label: 'NG (No Goal)' },
      { value: 'Over 1.5', label: 'Over 1.5' },
      { value: 'Over 2.5', label: 'Over 2.5' },
      { value: 'Over 3.5', label: 'Over 3.5' },
      { value: 'Over 4.5', label: 'Over 4.5' },
      { value: 'Under 1.5', label: 'Under 1.5' },
      { value: 'Under 2.5', label: 'Under 2.5' },
      { value: 'Under 3.5', label: 'Under 3.5' },
      { value: 'Under 4.5', label: 'Under 4.5' },
      { value: 'custom', label: '✏️ Altra giocata (personalizzata)' },
    ];

    const ProbCard = ({ label, value, color, subtitle }) => (
      <div style={{
        padding: '10px 12px', borderRadius: '8px',
        background: 'var(--card)', border: `1px solid ${value != null && value > 0 ? color : 'var(--border)'}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '22px', fontWeight: 900, color: value != null && value > 0 ? color : 'var(--text-dim)', fontFamily: 'Orbitron, sans-serif' }}>
          {value != null && value > 0 ? `${value}%` : '—'}
        </div>
        {subtitle && <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{subtitle}</div>}
      </div>
    );

    const selectStyle = {
      width: '100%', padding: '10px 12px',
      background: 'var(--bg-elevated)', color: 'var(--text)',
      border: '1px solid var(--border)', borderRadius: '8px',
      fontSize: '13px', cursor: 'pointer', outline: 'none',
    };

    const inputStyle = {
      width: '100%', padding: '10px 12px',
      background: 'var(--bg-elevated)', color: 'var(--text)',
      border: '2px solid var(--border)', borderRadius: '8px',
      fontSize: '16px', fontWeight: 700, outline: 'none', textAlign: 'right',
    };

    const resultRowStyle = {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px', borderRadius: '8px',
      background: 'var(--card)', border: '1px solid var(--border)', marginBottom: '6px',
    };

    return (
      <div>
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '16px', fontFamily: 'Orbitron, sans-serif', fontSize: '16px' }}>
            🎯 Seleziona la partita da coprire
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>🏆 Campionato</label>
              <select style={selectStyle} value={campionatoSel} onChange={(e) => { setCampionatoSel(e.target.value); setPartitaSel(''); setGiocataSel(''); }}>
                <option value="">— Seleziona campionato —</option>
                {campionatiConPartite.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>⚽ Partita</label>
              <select style={selectStyle} value={partitaSel} onChange={(e) => { setPartitaSel(e.target.value); setGiocataSel(''); }} disabled={!campionatoSel}>
                <option value="">— Seleziona partita —</option>
                {partiteFiltrate.map(m => <option key={m.id} value={m.id}>{m.casa} vs {m.ospiti} ({window.formatDateEU(m.data)} {m.ora || ''})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>💡 Cosa hai giocato</label>
              <select style={selectStyle} value={giocataSel} onChange={(e) => { setGiocataSel(e.target.value); if (e.target.value !== 'custom') setGiocataCustom(''); }} disabled={!partitaSel}>
                <option value="">— Seleziona giocata —</option>
                {giocateDisponibili.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          {giocataSel === 'custom' && (
            <div style={{ marginTop: '12px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>✏️ Inserisci manualmente (es. "1X+O2.5")</label>
              <input style={{ ...inputStyle, textAlign: 'left' }} type="text" value={giocataCustom} onChange={(e) => setGiocataCustom(e.target.value)} placeholder="Es: 1X+O2.5" />
            </div>
          )}
          {coperturaInfo && coperturaInfo.copre.length > 0 && (
            <div style={{ marginTop: '14px', padding: '12px 14px', background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.1), rgba(255, 0, 229, 0.05))', borderRadius: '10px', border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>🎯 Per coprire devi giocare:</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>{coperturaInfo.copre.join(' + ')}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{coperturaInfo.desc}</div>
            </div>
          )}
        </div>

        {analisiProbabilita && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '14px', fontFamily: 'Orbitron, sans-serif', fontSize: '16px' }}>
              📊 Analisi Probabilità — "{analisiProbabilita.segnoCopertura}"
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              <ProbCard label="📈 Storica" value={analisiProbabilita.pctStorica} color="var(--neon-cyan)" />
              <ProbCard label="🎲 Monte Carlo" value={analisiProbabilita.pctMC} color="var(--neon-magenta)" />
              <ProbCard label="📄 PDF" value={analisiProbabilita.pctPDF} color="var(--neon-gold)" subtitle={analisiProbabilita.quotaPDF ? `Quota ${analisiProbabilita.quotaPDF.toFixed(2)}` : null} />
              <ProbCard label="🔴 Live" value={analisiProbabilita.pctLive} color="var(--neon-green)" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>🔴 Quota aggiornata (opzionale)</label>
              <input style={inputStyle} type="number" step="0.01" min="1.01" value={quotaLive} onChange={(e) => { setQuotaLive(e.target.value); if (e.target.value) setQuota(e.target.value); }} placeholder="Es: 2.53" />
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(255, 0, 229, 0.05))', border: `2px solid ${analisiProbabilita.consiglio.colore}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 700 }}>👉 PROBABILITÀ MEDIA</span>
                <span style={{ fontSize: '28px', fontWeight: 900, color: analisiProbabilita.consiglio.colore, fontFamily: 'Orbitron, sans-serif' }}>{analisiProbabilita.media}%</span>
              </div>
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${analisiProbabilita.consiglio.colore}` }}>
                <div style={{ fontSize: '14px', fontWeight: 900, color: analisiProbabilita.consiglio.colore, textAlign: 'center' }}>{analisiProbabilita.consiglio.testo}</div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '14px', fontFamily: 'Orbitron, sans-serif', fontSize: '16px' }}>🧮 Calcolo Copertura</h3>
          <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>💰 Vincita attesa schedina (€)</label>
              <input style={inputStyle} type="number" step="0.01" value={vincita} onChange={(e) => setVincita(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>📊 Quota copertura {analisiProbabilita && `(${analisiProbabilita.segnoCopertura})`}</label>
              <input style={inputStyle} type="number" step="0.01" min="1.01" value={quota} onChange={(e) => setQuota(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>🎯 Profitto minimo desiderato (€) — opzionale</label>
              <input style={inputStyle} type="number" step="0.01" min="0" value={profittoMinimo} onChange={(e) => setProfittoMinimo(e.target.value)} placeholder={profittoSuggerito ? `Suggerito: ${profittoSuggerito}` : 'Vuoto = copertura esatta'} />
            </div>
          </div>
          {calcoli && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid var(--neon-cyan)' }}>
              <div style={resultRowStyle}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>💵 Devi giocare</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 900, color: 'var(--neon-cyan)' }}>{calcoli.importo.toFixed(2)} €</span>
              </div>
              <div style={resultRowStyle}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>✅ Se esce "{analisiProbabilita?.segnoCopertura || 'copertura'}"</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 900, color: calcoli.nettoCoperto >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                  {calcoli.nettoCoperto >= 0 ? '+' : ''}{calcoli.nettoCoperto.toFixed(2)} €
                </span>
              </div>
              <div style={resultRowStyle}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>🎯 Se esce la schedina</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 900, color: calcoli.nettoSchedina >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                  {calcoli.nettoSchedina >= 0 ? '+' : ''}{calcoli.nettoSchedina.toFixed(2)} €
                </span>
              </div>
              <div style={resultRowStyle}>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>⚠️ Totale investito</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 900, color: 'var(--text)' }}>{calcoli.totaleInvestito.toFixed(2)} €</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={resetAll} style={{ flex: 1, minWidth: '100px' }}>🔄 Reset</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTE PRINCIPALE
  // ============================================================
  function HomeComponent({ matches, championships, onSelectMatch, setTab, selectedFamiglie, weatherCache, resetKey }) {
    const [homeTab, setHomeTab] = useState('Menu');
    const [nazioneSelezionata, setNazioneSelezionata] = useState(null);
    const [campionatoMobile, setCampionatoMobile] = useState(null);
    const [tipoGiocate, setTipoGiocate] = useState('calcolate');
    const [refreshKey, setRefreshKey] = useState(0);
    const [presetAttivo, setPresetAttivo] = useState(null);
    const isMobile = useIsMobile();

    useEffect(() => {
      if (resetKey === undefined) return;
      setHomeTab('Menu');
      setNazioneSelezionata(null);
      setCampionatoMobile(null);
    }, [resetKey]);

    const { filtro: filtroCampionati, setFiltro, campionatiAttivi } =
      window.FiltriCampionati.useFiltroCampionati();

    const matchesPuliti = useMemo(() => {
      const normalizzati = normalizeMatches(matches);
      return window.FiltriCampionati.filtraPartitePerCampionato(normalizzati);
    }, [matches, filtroCampionati]);

    useEffect(() => {
      const handler = () => setRefreshKey(t => t + 1);
      window.addEventListener('giocate-selezionate-updated', handler);
      window.addEventListener('schedina-updated', handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('giocate-selezionate-updated', handler);
        window.removeEventListener('schedina-updated', handler);
        window.removeEventListener('storage', handler);
      };
    }, []);

    const handleSelectNazione = React.useCallback((naz) => {
      if (typeof naz === 'string' && naz.startsWith('UEFA:')) {
        const camp = naz.replace('UEFA:', '');
        if (isMobile) setCampionatoMobile(camp);
        else setNazioneSelezionata({ __special: 'UEFA', campionato: camp });
      } else {
        setNazioneSelezionata(naz);
      }
    }, [isMobile]);

    const handleApplyPreset = useCallback((preset) => {
      if (!setFiltro) return;

      const tuttiCampionati = (window.CHAMPIONSHIP_LIST || []).slice();
      const dalDb = matches.map(m => m.campionato).filter(Boolean);
      const unione = Array.from(new Set([...tuttiCampionati, ...dalDb]));

      const nuovoFiltro = {};
      unione.forEach(nome => {
        const match = preset.campionati.some(t =>
          t === nome ||
          nome.toLowerCase().includes(t.toLowerCase()) ||
          t.toLowerCase().includes(nome.toLowerCase())
        );
        nuovoFiltro[nome] = match;
      });

      setFiltro(nuovoFiltro);
      setPresetAttivo(preset.id);
    }, [setFiltro, matches]);

    const handleMenuAction = useCallback((action) => {
      if (!action) return;
      if (action.type === 'homeTab') {
        setHomeTab(action.value);
        setNazioneSelezionata(null);
        setCampionatoMobile(null);
      } else if (action.type === 'mainTab') {
        if (setTab) setTab(action.value);
      }
    }, [setTab]);

    const backToMenu = useCallback(() => {
      setHomeTab('Menu');
      setNazioneSelezionata(null);
      setCampionatoMobile(null);
    }, []);

    if (!matches || matches.length === 0) {
      if (homeTab === 'Menu') {
        return (
          <MenuHomeComponent
            onSelect={handleMenuAction}
            onApplyPreset={handleApplyPreset}
            presetAttivo={presetAttivo}
            matches={matches}
            championships={championships}
          />
        );
      }
      return (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌍</div>
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '8px' }}>Nessuna partita disponibile</h3>
          <p style={{ color: 'var(--text-dim)' }}>Importa un campionato da <b>Impostazioni → Importa Campionato</b></p>
          <button className="back-to-menu-btn" onClick={backToMenu} style={{ marginTop: '20px' }}>← Torna al Menù Principale</button>
        </div>
      );
    }

    const renderTabContent = () => {
      if (homeTab === 'Menu') {
        return (
          <MenuHomeComponent
            onSelect={handleMenuAction}
            onApplyPreset={handleApplyPreset}
            presetAttivo={presetAttivo}
            matches={matches}
            championships={championships}
          />
        );
      }

      if (homeTab === 'InfoUtilità') {
        return (
          <InfoUtilitàComponent
            onSelect={handleMenuAction}
            onBack={backToMenu}
          />
        );
      }

      if (homeTab === 'GestioneConto') {
        return (
          <div>
            <BackToMenuButton onClick={backToMenu} />
            {window.GestioneContoComponent
              ? <window.GestioneContoComponent />
              : <div className="alert alert-info">⏳ Caricamento Gestione Conto...</div>}
          </div>
        );
      }
      if (homeTab === 'Performance') {
        return (
          <div>
            <BackToMenuButton onClick={backToMenu} />
            {window.PerformanceComponent
              ? <window.PerformanceComponent matches={matches} championships={championships} onSelectMatch={onSelectMatch} />
              : <div className="alert alert-info">⏳ Caricamento Performance...</div>}
          </div>
        );
      }
      if (homeTab === 'Calcolatrice') {
        return (
          <div>
            <BackToMenuButton onClick={backToMenu} />
            <CalcolatriceComponent matches={matchesPuliti} />
          </div>
        );
      }

      if (isMobile) {
        if (campionatoMobile) {
          return (
            <div>
              <BackToMenuButton onClick={backToMenu} />
              <MobileVistaGiornata
                campionato={campionatoMobile}
                matches={matchesPuliti}
                onBack={() => setCampionatoMobile(null)}
                tipoGiocate={tipoGiocate}
                refreshKey={refreshKey}
              />
            </div>
          );
        }
        if (nazioneSelezionata) {
          const info = NAZIONI[nazioneSelezionata];
          if (!info) {
            return (
              <div>
                <BackToMenuButton onClick={backToMenu} />
                <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
                  <div style={{ color: 'var(--neon-red)', marginBottom: '12px' }}>Nazione non trovata</div>
                  <button className="btn" onClick={() => setNazioneSelezionata(null)}>← Torna alle nazioni</button>
                </div>
              </div>
            );
          }
          const campionatiNazione = info.campionati
            .filter(c => matchesPuliti.some(m => m.campionato === c))
            .map(c => ({ nome: c, nPartite: matchesPuliti.filter(m => m.campionato === c).length }));
          return (
            <div>
              <BackToMenuButton onClick={backToMenu} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', padding: '12px 14px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <button onClick={() => setNazioneSelezionata(null)} style={{ background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>← Indietro</button>
                <NazioneBandiera nazione={nazioneSelezionata} size={36} />
                <h2 style={{ margin: 0, flex: 1, color: 'var(--neon-cyan)', fontSize: '18px' }}>{nazioneSelezionata}</h2>
              </div>
              {campionatiNazione.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>Nessun campionato disponibile per {nazioneSelezionata}</div>
              ) : (
                <MobileCampScelta campionati={campionatiNazione} onSelect={(camp) => setCampionatoMobile(camp)} />
              )}
            </div>
          );
        }
        return (
          <div>
            <BackToMenuButton onClick={backToMenu} />
            <GrigliaNazioni
              matches={matchesPuliti}
              onSelectNazione={handleSelectNazione}
              tipoGiocate={tipoGiocate}
              setTipoGiocate={setTipoGiocate}
            />
          </div>
        );
      }

      if (nazioneSelezionata) {
        return (
          <div>
            <BackToMenuButton onClick={backToMenu} />
            <VistaNazione
              nazione={nazioneSelezionata}
              matches={matchesPuliti}
              onBack={() => setNazioneSelezionata(null)}
              tipoGiocate={tipoGiocate}
              refreshKey={refreshKey}
            />
          </div>
        );
      }
      return (
        <div>
          <BackToMenuButton onClick={backToMenu} />
          <GrigliaNazioni
            matches={matchesPuliti}
            onSelectNazione={handleSelectNazione}
            tipoGiocate={tipoGiocate}
            setTipoGiocate={setTipoGiocate}
          />
        </div>
      );
    };

    return (
      <div>
        {window.QuoteManager?.BannerScadenzaQuote && <window.QuoteManager.BannerScadenzaQuote />}
        {renderTabContent()}
      </div>
    );
  }

  // ============================================================
  // EXPORT GLOBALI
  // ============================================================
  window.HomeComponent = HomeComponent;
  window.BackToMenuButton = BackToMenuButton;
  window.MenuHomeComponent = MenuHomeComponent;
  window.HomeUtils = {
    NAZIONI, NAZIONI_BASE_PATH, SCHEDINA_STORAGE_KEY,
    formatGiocataLabel, getGiornataCorrente, calcolaTop3Giocate,
    leggiSelezioniSchedina, scriviSelezioniSchedina, toggleSelezioneSchedina,
    normalizeMatches, normalizeCampionato, CHINESE_TEAMS,
    leggiFamiglieSelezionate, GIOCATE_SELEZIONATE_KEY, FAMIGLIE_SELEZIONATE_KEY,
    TOP_5_MAGGIORI, TOP_5_MINORI, TOP_COPPE, PRESET_CAMPIONATI,
  };

  console.log('✅ Modulo Home v11 caricato — Menu hub con EMOJI + preset loghi + griglia 5×5 unificata');
})();