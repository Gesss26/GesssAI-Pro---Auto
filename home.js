// ============================================================
// home.js - Modulo Home (FUTURISTIC + MOBILE FIX + SWITCH CALCOLATE/SCELTE)
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

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

  (function injectNazioniStyles() {
    if (document.getElementById('home-nazioni-styles')) return;
    const style = document.createElement('style');
    style.id = 'home-nazioni-styles';
    style.textContent = `
      .nazioni-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
      @media (max-width: 1024px) {
        .nazioni-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
      }
      @media (max-width: 768px) {
        .nazioni-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .nazione-btn { min-height: 80px !important; padding: 10px 4px !important; }
      }
      @media (max-width: 480px) {
        .nazioni-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .nazione-btn { min-height: 72px !important; padding: 8px 4px !important; }
      }
    `;
    document.head.appendChild(style);
  })();

  const NAZIONI = {
    'Belgio':      { file: 'belgio.png',      campionati: ['Jupiler Pro League'] },
    'Corea':       { file: 'corea.png',       campionati: ['K League 1'] },
    'Francia':     { file: 'francia.png',     campionati: ['Ligue 1', 'Ligue 2'] },
    'Germania':    { file: 'germania.png',    campionati: ['Bundesliga', '2. Bundesliga'] },
    'Giappone':    { file: 'giappone.png',    campionati: ['J1 League'] },
    'Inghilterra': { file: 'inghilterra.png', campionati: ['Premier League', 'EFL Championship'] },
    'Italia':      { file: 'italia.png',      campionati: ['Serie A', 'Serie B', 'Serie C - Girone A', 'Serie C - Girone B', 'Serie C - Girone C'] },
    'Olanda':      { file: 'olanda.png',      campionati: ['Eredivisie', 'Eerste Divisie'] },
    'Portogallo':  { file: 'portogallo.png',  campionati: ['Primeira Liga'] },
    'Scozia':      { file: 'scozia.png',      campionati: ['Scottish Premiership'] },
    'Spagna':      { file: 'spagna.png',      campionati: ['La Liga', 'Segunda División'] },
    'Turchia':     { file: 'turchia.png',     campionati: ['Süper Lig'] },
  };

  const NAZIONI_BASE_PATH = 'logos/Nazioni/';
  const SCHEDINA_STORAGE_KEY = 'ft_schedina_selezioni';
  const GIOCATE_SELEZIONATE_KEY = 'ft_giocate_selezionate';

  // ============================================================
  // QUOTA INLINE
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

  // ============================================================
  // LETTURA GIOCATE SELEZIONATE (sincronizzata con schedina.js)
  // ============================================================
  const leggiGiocateSelezionate = () => {
    try {
      return JSON.parse(localStorage.getItem(GIOCATE_SELEZIONATE_KEY) || '["tutte"]');
    } catch (e) {
      return ['tutte'];
    }
  };

  // ============================================================
  // CALCOLO TOP3 GIOCATE CON SUPPORTO SCELTE
  // ============================================================
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

    // ============================================================
    // TOP 3 CALCOLATE (comportamento originale)
    // ============================================================
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

    // ============================================================
    // TOP 3 SCELTE (dall'utente in schedina.js)
    // ============================================================
    const giocateSelezionate = leggiGiocateSelezionate();
    const isTutteMode = giocateSelezionate.includes('tutte') || giocateSelezionate.length === 0;

    // Se in schedina è attivo "tutte" non ci sono giocate specifiche → mostriamo le calcolate
    if (isTutteMode) {
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

    // Modalità "Scelte": mostra solo le giocate specifiche selezionate
    const top3Scelte = [];
    giocateSelezionate.forEach(sel => {
      if (typeof sel !== 'object' || !sel.familyId || !sel.giocata) return;

      const { familyId, giocata } = sel;
      const family = window.FAMIGLIE_GIOCATE[familyId];
      if (!family) return;

      let pct = 0;
      if (familyId === 'gg_ng') {
        const ggNg = window.calcolaGG_NG ? window.calcolaGG_NG(stats) : null;
        if (ggNg) {
          pct = giocata === 'GG' ? ggNg.gg : ggNg.ng;
        }
      } else {
        pct = window.getGiocataPct(giocata, stats, homeMG, awayMG, mgTot);
      }

      if (pct > 0) {
        top3Scelte.push({
          familyId,
          familyLabel: family.label,
          familyIcon: family.icon,
          giocata,
          label: giocata,
          pct: Math.round(pct),
          isBomb: pct >= 90,
        });
      }
    });

    top3Scelte.sort((a, b) => b.pct - a.pct);
    return top3Scelte.slice(0, 3);
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

  // ============================================================
  // RIGA PARTITA CON SWITCH CALCOLATE/SCELTE
  // ============================================================
  const RigaPartita = ({ match, allMatches, tipoGiocate }) => {
    const [top3, setTop3] = useState([]);

    useEffect(() => {
      const res = calcolaTop3Giocate(match, allMatches, tipoGiocate);
      const formatted = res.map(g => ({ ...g, label: formatGiocataLabel(g.familyId, g.label) }));
      setTop3(formatted);
    }, [match.id, tipoGiocate]);

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

  // ============================================================
  // SEZIONE CAMPIONATO CON SWITCH
  // ============================================================
  const SezioneCampionato = ({ campionato, matches, allMatches, hideHeader = false, tipoGiocate = 'calcolate' }) => {
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
                <RigaPartita key={m.id} match={m} allMatches={allMatches} tipoGiocate={tipoGiocate} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // VISTA NAZIONE CON SWITCH
  // ============================================================
  const VistaNazione = ({ nazione, matches, onBack, tipoGiocate }) => {
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
            />
          ))
        )}
      </div>
    );
  };

  // ============================================================
  // MOBILE: SELEZIONE CAMPIONATO → VISTA GIORNATA
  // ============================================================
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

  const MobileVistaGiornata = ({ campionato, matches, onBack, tipoGiocate }) => {
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
                <RigaPartita key={m.id} match={m} allMatches={matches} tipoGiocate={tipoGiocate} />
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
  const GrigliaNazioni = ({ matches, onSelectNazione }) => {
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

    return (
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '16px', flexWrap: 'wrap', gap: '10px',
        }}>
          <h2 style={{ margin: 0, color: 'var(--neon-cyan)' }}>🌍 Seleziona una Nazione</h2>
          {schedinaCount > 0 && (
            <span style={{
              background: 'var(--neon-green)', color: '#000', padding: '4px 14px',
              borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
            }}>
              🎯 {schedinaCount} giocate in schedina
            </span>
          )}
        </div>

        <div className="nazioni-grid">
          {nazioniOrdinate.map(naz => {
            const disabled = conteggi[naz] === 0;
            return (
              <button
                key={naz}
                onClick={() => !disabled && onSelectNazione(naz)}
                disabled={disabled}
                title={disabled ? `${naz} - nessuna partita` : naz}
                className="nazione-btn"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '12px 6px', borderRadius: '10px',
                  border: '2px solid var(--border)',
                  background: disabled ? 'var(--bg-elevated)' : 'var(--card)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  transition: 'all 0.15s', minHeight: '90px', position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <NazioneBandiera nazione={naz} size={36} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text)', textAlign: 'center' }}>
                  {naz}
                </span>
                {!disabled && (
                  <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                    {conteggi[naz]} partite
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
  // COMPONENTE PRINCIPALE CON SWITCH
  // ============================================================
  function HomeComponent({ matches, championships, onSelectMatch, setTab, selectedFamiglie, weatherCache }) {
    const [homeTab, setHomeTab] = useState('Nazioni');
    const [nazioneSelezionata, setNazioneSelezionata] = useState(null);
    const [campionatoMobile, setCampionatoMobile] = useState(null);
    const [tipoGiocate, setTipoGiocate] = useState('calcolate'); // ⭐ NUOVO
    const isMobile = useIsMobile();

    const { filtro: filtroCampionati, campionatiAttivi } =
      window.FiltriCampionati.useFiltroCampionati();

    const matchesPuliti = useMemo(() => {
      const normalizzati = normalizeMatches(matches);
      return window.FiltriCampionati.filtaPartitePerCampionato(normalizzati);
    }, [matches, filtroCampionati]);

    // ⭐ Ascolta cambiamenti delle giocate selezionate in schedina.js
    //    e forza un re-render quando lo switch è su "scelte"
    const [refreshTick, setRefreshTick] = useState(0);
    useEffect(() => {
      const handler = () => {
        if (tipoGiocate === 'scelte') setRefreshTick(t => t + 1);
      };
      window.addEventListener('giocate-selezionate-updated', handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('giocate-selezionate-updated', handler);
        window.removeEventListener('storage', handler);
      };
    }, [tipoGiocate]);

    if (!matches || matches.length === 0) {
      return (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌍</div>
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '8px' }}>Nessuna partita disponibile</h3>
          <p style={{ color: 'var(--text-dim)' }}>
            Importa un campionato da <b>Impostazioni → Importa Campionato</b>
          </p>
        </div>
      );
    }

    const renderTabContent = () => {
      if (homeTab === 'GestioneConto') {
        return window.GestioneContoComponent ? (
          <window.GestioneContoComponent />
        ) : (
          <div className="alert alert-info">⏳ Caricamento Gestione Conto...</div>
        );
      }

      if (homeTab === 'Performance') {
        return window.PerformanceComponent ? (
          <window.PerformanceComponent matches={matches} championships={championships} onSelectMatch={onSelectMatch} />
        ) : (
          <div className="alert alert-info">⏳ Caricamento Performance...</div>
        );
      }

      // MOBILE
      if (isMobile) {
        if (campionatoMobile) {
          return (
            <MobileVistaGiornata
              campionato={campionatoMobile}
              matches={matchesPuliti}
              onBack={() => setCampionatoMobile(null)}
              tipoGiocate={tipoGiocate}
            />
          );
        }

        if (nazioneSelezionata) {
          const info = NAZIONI[nazioneSelezionata];

          if (!info) {
            return (
              <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
                <div style={{ color: 'var(--neon-red)', marginBottom: '12px' }}>
                  Nazione non trovata
                </div>
                <button className="btn" onClick={() => setNazioneSelezionata(null)}>
                  ← Torna alle nazioni
                </button>
              </div>
            );
          }

          const campionatiNazione = info.campionati
            .filter(c => matchesPuliti.some(m => m.campionato === c))
            .map(c => ({
              nome: c,
              nPartite: matchesPuliti.filter(m => m.campionato === c).length,
            }));

          return (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px',
                padding: '12px 14px', background: 'var(--card)', borderRadius: '12px',
                border: '1px solid var(--border)',
              }}>
                <button onClick={() => setNazioneSelezionata(null)} style={{
                  background: 'var(--bg-elevated)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '8px 14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                }}>← Indietro</button>
                <NazioneBandiera nazione={nazioneSelezionata} size={36} />
                <h2 style={{ margin: 0, flex: 1, color: 'var(--neon-cyan)', fontSize: '18px' }}>
                  {nazioneSelezionata}
                </h2>
              </div>

              {campionatiNazione.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                  Nessun campionato disponibile per {nazioneSelezionata}
                </div>
              ) : (
                <MobileCampScelta
                  campionati={campionatiNazione}
                  onSelect={(camp) => setCampionatoMobile(camp)}
                />
              )}
            </div>
          );
        }

        return (
          <GrigliaNazioni
            matches={matchesPuliti}
            onSelectNazione={setNazioneSelezionata}
          />
        );
      }

      // PC
      if (nazioneSelezionata) {
        return (
          <VistaNazione
            nazione={nazioneSelezionata}
            matches={matchesPuliti}
            onBack={() => setNazioneSelezionata(null)}
            tipoGiocate={tipoGiocate}
          />
        );
      }

      return (
        <GrigliaNazioni
          matches={matchesPuliti}
          onSelectNazione={setNazioneSelezionata}
        />
      );
    };

    return (
      <div>
        {window.QuoteManager?.BannerScadenzaQuote && (
          <window.QuoteManager.BannerScadenzaQuote />
        )}

        {homeTab !== 'GestioneConto' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            padding: '10px 14px', marginBottom: '14px',
            background: 'var(--bg-elevated)', borderRadius: '8px',
            border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-dim)',
          }}>
            <span>🏆 <b style={{ color: 'var(--neon-cyan)' }}>{campionatiAttivi.length}</b> campionati attivi</span>
            <span>•</span>
            <span>📊 <b style={{ color: 'var(--neon-cyan)' }}>{matchesPuliti.length}</b> partite totali</span>
            <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
              Modifica i filtri nel <b>Palinsesto</b> 📅
            </span>
          </div>
        )}

        <div className="sub-tabs" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            className={homeTab === 'Nazioni' ? 'active' : ''}
            onClick={() => { setHomeTab('Nazioni'); setNazioneSelezionata(null); setCampionatoMobile(null); }}
          >
            🌍 Seleziona una Nazione
          </button>
          <button
            className={homeTab === 'GestioneConto' ? 'active' : ''}
            onClick={() => { setHomeTab('GestioneConto'); setNazioneSelezionata(null); setCampionatoMobile(null); }}
          >
            💰 Gestione Conto
          </button>
          <button
            className={homeTab === 'Performance' ? 'active' : ''}
            onClick={() => setHomeTab('Performance')}
          >
            📈 Performance
          </button>
        </div>

        {/* ⭐ SWITCH CALCOLATE / SCELTE (solo per tab Nazioni) */}
        {homeTab === 'Nazioni' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '14px',
            padding: '8px 14px',
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
              🎯 Giocate
            </span>
            <div style={{
              display: 'flex',
              background: 'var(--bg-deep)',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid var(--border)',
            }}>
              <button
                onClick={() => setTipoGiocate('calcolate')}
                title="Mostra le 3 giocate con % più alta"
                style={{
                  padding: '6px 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: tipoGiocate === 'calcolate' ? 'var(--neon-cyan)' : 'transparent',
                  color: tipoGiocate === 'calcolate' ? '#000' : 'var(--text-dim)',
                  transition: 'all 0.2s',
                }}
              >
                🎯 Calcolate
              </button>
              <button
                onClick={() => setTipoGiocate('scelte')}
                title="Mostra le giocate selezionate in Schedina"
                style={{
                  padding: '6px 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: tipoGiocate === 'scelte' ? 'var(--neon-green)' : 'transparent',
                  color: tipoGiocate === 'scelte' ? '#000' : 'var(--text-dim)',
                  transition: 'all 0.2s',
                }}
              >
                ✅ Scelte
              </button>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              {tipoGiocate === 'calcolate'
                ? '🎯 Top 3 per percentuale'
                : '✅ Solo giocate selezionate in Schedina'}
            </span>
          </div>
        )}

        {renderTabContent()}
      </div>
    );
  }

  window.HomeComponent = HomeComponent;
  window.HomeUtils = {
    NAZIONI, NAZIONI_BASE_PATH, SCHEDINA_STORAGE_KEY,
    formatGiocataLabel, getGiornataCorrente, calcolaTop3Giocate,
    leggiSelezioniSchedina, scriviSelezioniSchedina, toggleSelezioneSchedina,
    normalizeMatches, normalizeCampionato, CHINESE_TEAMS,
    leggiGiocateSelezionate, GIOCATE_SELEZIONATE_KEY,
  };

  console.log('✅ Modulo Home FUTURISTIC caricato (FIX MOBILE + SWITCH CALCOLATE/SCELTE)');

})();