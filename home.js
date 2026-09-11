// ============================================================
// home.js - Modulo Home esterno per GesssAI-Pro v3.0
// ============================================================
// Richiede che in index.html siano già definite ed esposte
// globalmente le seguenti funzioni/variabili:
//   - computeMatchStats, getGiocataPct, getBestBetForFamily
//   - FAMIGLIE_GIOCATE, getChampColor, formatDateEU
//   - TeamLogo, getPercentualeClasse
//   - parseDate, normalizeDate, getTodayStr
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  // ============================================================
  // FIX: Chinese Super League erroneamente etichettata
  //      come "Super League Grecia" dallo scraper.
  // ============================================================

  const CHINESE_TEAMS = new Set([
    'Chengdu Better City',
    'Sichuan Jiuniu',
    'Tianjin Teda',
    'Shandong Luneng',
    'Shanghai Shenhua',
    'Dalian Zhixing',
    'SHANGHAI SIPG',
    'Henan Jianye',
    'Yunnan Yukun',
    'Qingdao Jonoon',
    'Hangzhou Greentown',
    'Qingdao Youth Island',
    'Wuhan Three Towns',
    'Beijing Guoan',
    'Shenyang Urban',
    'Chongqing Tongliang Long',
  ]);

  const normalizeCampionato = (match) => {
    const camp = (match.campionato || '').trim();
    const casa = (match.casa || '').trim();
    const ospiti = (match.ospiti || '').trim();

    if (
      camp === 'Super League Grecia' &&
      (CHINESE_TEAMS.has(casa) || CHINESE_TEAMS.has(ospiti))
    ) {
      return { ...match, campionato: 'Chinese Super League' };
    }
    return match;
  };

  const normalizeMatches = (matches) => {
    if (!Array.isArray(matches)) return [];
    return matches.map(normalizeCampionato);
  };

  // ============================================================
  // STILI GRIGLIA NAZIONI (responsive)
  // ============================================================

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

      /* Tablet (max 1024px): 3 colonne */
      @media (max-width: 1024px) {
        .nazioni-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
      }

      /* Tablet piccolo / mobile orizzontale (max 768px): 3 colonne */
      @media (max-width: 768px) {
        .nazioni-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .nazione-btn {
          min-height: 80px !important;
          padding: 10px 4px !important;
        }
      }

      /* Mobile (max 480px): 2 colonne */
      @media (max-width: 480px) {
        .nazioni-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .nazione-btn {
          min-height: 72px !important;
          padding: 8px 4px !important;
        }
        .nazione-btn img {
          width: 30px !important;
          height: 30px !important;
        }
        .nazione-btn span {
          font-size: 10px !important;
        }
      }

      /* Mobile molto piccolo (max 360px): 2 colonne strette */
      @media (max-width: 360px) {
        .nazioni-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }
        .nazione-btn {
          min-height: 66px !important;
        }
      }
    `;
    document.head.appendChild(style);
  })();

  // ============================================================
  // MAPPA NAZIONI → CAMPIONATI
  // ============================================================

  const NAZIONI = {
    'Argentina':   { file: 'argentina.png',   campionati: ['Liga Profesional Argentina'] },
    'Belgio':      { file: 'belgio.png',      campionati: ['Jupiler Pro League'] },
    'Brasile':     { file: 'brasile.png',     campionati: ['Brasileirão Serie A'] },
    'Cina':        { file: 'cina.png',        campionati: ['Chinese Super League'] },
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
    'Stati Uniti': { file: 'stati_uniti.png', campionati: ['Major League Soccer'] },
    'Turchia':     { file: 'turchia.png',     campionati: ['Süper Lig'] },
  };

  const NAZIONI_BASE_PATH = '/GesssAI-Pro---Auto/logos/Nazioni/';
  const SCHEDINA_STORAGE_KEY = 'ft_schedina_selezioni';

  // ============================================================
  // BANDIERA NAZIONE CON FALLBACK
  // ============================================================

  const NazioneBandiera = ({ nazione, size = 40 }) => {
    const [hasError, setHasError] = useState(false);
    const info = NAZIONI[nazione];

    if (!info || hasError) {
      const initials = nazione.substring(0, 3).toUpperCase();
      return (
        <div style={{
          width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '50%',
          fontWeight: 'bold', color: 'var(--accent)', fontSize: Math.max(size * 0.3, 9), flexShrink: 0,
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

  // ============================================================
  // ETICHETTA LEGGIBILE PER GIOCATE
  // ============================================================

  const formatGiocataLabel = (familyId, label, giocata) => {
    if (!label) return '—';

    if (label.startsWith('Over '))  return label.replace('Over ', 'Over ').replace('.', ',');
    if (label.startsWith('Under ')) return label.replace('Under ', 'Under ').replace('.', ',');

    if (familyId === 'multigol') {
      if (label === '1-4') return 'MG Tot 1-4';
      return 'MG Tot ' + label;
    }

    if (familyId === 'mg_casa_ospite') {
      const parts = label.split('+');
      if (parts.length === 2) return `MG Casa ${parts[0]} + MG Ospite ${parts[1]}`;
    }

    if (familyId === 'dc_multigol') {
      const parts = label.split('+');
      if (parts.length === 2) return `${parts[0]} + MG Tot ${parts[1]}`;
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

    return label;
  };

  // ============================================================
  // GIORNATA CORRENTE
  // ============================================================

  const getGiornataCorrente = (matchesDelCampionato) => {
    if (!matchesDelCampionato || matchesDelCampionato.length === 0) return null;
    const todayStr = window.getTodayStr();

    const oggi = matchesDelCampionato.filter(m => {
      const d = window.normalizeDate(m.data);
      return d === todayStr;
    });
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
  // CALCOLO TOP 3 GIOCATE PER UNA PARTITA
  // ============================================================

  const calcolaTop3Giocate = (match, allMatches) => {
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

    const tutte = [];

    Object.keys(window.FAMIGLIE_GIOCATE).forEach(familyId => {
      const family = window.FAMIGLIE_GIOCATE[familyId];
      if (!family) return;

      const best = window.getBestBetForFamily(
        familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot
      );

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

  // ============================================================
  // GESTIONE SELEZIONI SCHEDINA (localStorage)
  // ============================================================

  const leggiSelezioniSchedina = () => {
    try { return JSON.parse(localStorage.getItem(SCHEDINA_STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  };

  const scriviSelezioniSchedina = (arr) => {
    try {
      localStorage.setItem(SCHEDINA_STORAGE_KEY, JSON.stringify(arr));
      window.dispatchEvent(new CustomEvent('schedina-updated', { detail: arr }));
    } catch (e) {
      console.warn('Errore salvataggio schedina:', e);
    }
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
        matchId: match.id,
        campionato: match.campionato,
        casa: match.casa,
        ospiti: match.ospiti,
        data: match.data,
        ora: match.ora,
        giocata: giocataObj.giocata,
        familyId: giocataObj.familyId,
        familyLabel: giocataObj.familyLabel,
        pct: giocataObj.pct,
        aggiuntoIl: new Date().toISOString(),
      });
      scriviSelezioniSchedina(arr);
      return true;
    }
  };

  // ============================================================
  // BOTTONE GIOCATA (selezionabile)
  // ============================================================

  const GiocataBadge = ({ match, giocataObj, onToggle }) => {
    const [selected, setSelected] = useState(() =>
      isGiocataSelezionata(match.id, giocataObj.familyId, giocataObj.giocata)
    );

    const pct = giocataObj.pct;
    const cls = window.getPercentualeClasse(pct);
    const isBomb = pct >= 90;

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
          border: selected ? '2px solid var(--win)' : isBomb ? '2px solid var(--accent)' : '1px solid var(--border)',
          background: selected ? 'rgba(111, 207, 151, 0.15)' : isBomb ? 'rgba(243, 156, 18, 0.10)' : 'var(--surface)',
          cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'center',
          minHeight: '48px', position: 'relative',
        }}
      >
        {selected && (
          <span style={{
            position: 'absolute', top: '-6px', right: '-6px', background: 'var(--win)', color: '#000',
            borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}>✓</span>
        )}
        <span style={{
          fontSize: '11px', fontWeight: 'bold', color: 'var(--text)', lineHeight: '1.2',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
        }}>
          {giocataObj.label}
        </span>
        <span className={`giocata-pct ${cls}`} style={{ fontSize: '13px' }}>
          {pct}% {isBomb && <span className="bomb-icon" style={{ fontSize: '12px' }}>💣</span>}
        </span>
        <span style={{
          fontSize: '9px', color: 'var(--text-muted)', lineHeight: '1',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
        }}>
          {giocataObj.familyIcon} {giocataObj.familyLabel}
        </span>
      </button>
    );
  };

  // ============================================================
  // RIGA PARTITA (6 colonne)
  // ============================================================

  const RigaPartita = ({ match, allMatches }) => {
    const [top3, setTop3] = useState([]);

    useEffect(() => {
      const res = calcolaTop3Giocate(match, allMatches);
      const formatted = res.map(g => ({
        ...g,
        label: formatGiocataLabel(g.familyId, g.label, g.giocata),
      }));
      setTop3(formatted);
    }, [match.id]);

    const dataEU = match.data ? window.formatDateEU(match.data) : 'N/D';
    const ora = match.ora || 'TBD';

    const cellStyle = {
      padding: '8px 10px',
      borderBottom: '1px solid var(--border)',
      fontSize: '13px',
      verticalAlign: 'middle',
    };

    return (
      <tr
        style={{ transition: 'background 0.15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: 'var(--text-muted)', width: '90px' }}>
          {dataEU}
        </td>
        <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: 'var(--accent)', fontWeight: 'bold', width: '60px' }}>
          {ora}
        </td>
        <td style={{ ...cellStyle, minWidth: '180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <window.TeamLogo teamName={match.casa} championship={match.campionato} size={20} />
            <span style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '13px' }}>
              {match.casa} - {match.ospiti}
            </span>
            <window.TeamLogo teamName={match.ospiti} championship={match.campionato} size={20} />
          </div>
        </td>
        <td style={{ ...cellStyle, width: '150px' }}>
          {top3[0] ? <GiocataBadge match={match} giocataObj={top3[0]} /> : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
        </td>
        <td style={{ ...cellStyle, width: '150px' }}>
          {top3[1] ? <GiocataBadge match={match} giocataObj={top3[1]} /> : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
        </td>
        <td style={{ ...cellStyle, width: '150px' }}>
          {top3[2] ? <GiocataBadge match={match} giocataObj={top3[2]} /> : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
        </td>
      </tr>
    );
  };

  // ============================================================
  // SEZIONE CAMPIONATO
  // ============================================================

  const SezioneCampionato = ({ campionato, matches, allMatches }) => {
    const partiteCampionato = matches
      .filter(m => m.campionato === campionato)
      .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));

    if (partiteCampionato.length === 0) return null;

    const giornata = getGiornataCorrente(partiteCampionato);
    const color = window.getChampColor(campionato);

    let partiteDaMostrare = partiteCampionato;
    if (giornata) {
      const sameRound = partiteCampionato.filter(m => String(m.round) === String(giornata));
      if (sameRound.length > 0) partiteDaMostrare = sameRound;
    }

    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          background: color, color: '#000', padding: '10px 16px',
          borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

        <div style={{
          overflowX: 'auto', background: 'var(--card)',
          border: '1px solid var(--border)', borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)' }}>Data</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)' }}>Ora</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)' }}>Partita</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)' }}>🥇 Giocata 1</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)' }}>🥈 Giocata 2</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)' }}>🥉 Giocata 3</th>
              </tr>
            </thead>
            <tbody>
              {partiteDaMostrare.map(m => (
                <RigaPartita key={m.id} match={m} allMatches={allMatches} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // VISTA DETTAGLIO NAZIONE
  // ============================================================

  const VistaNazione = ({ nazione, matches, onBack }) => {
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
          <button
            onClick={onBack}
            style={{
              background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold',
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            ← Indietro
          </button>

          <NazioneBandiera nazione={nazione} size={44} />

          <h2 style={{ margin: 0, flex: 1, color: 'var(--accent)' }}>{nazione}</h2>

          {schedinaCount > 0 && (
            <span style={{
              background: 'var(--win)', color: '#000', padding: '4px 14px',
              borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
            }}>
              🎯 {schedinaCount} in schedina
            </span>
          )}
        </div>

        {campionatiDaMostrare.length === 0 ? (
          <div className="empty-state">
            Nessuna partita disponibile per i campionati di {nazione}.
          </div>
        ) : (
          campionatiDaMostrare.map(camp => (
            <SezioneCampionato
              key={camp}
              campionato={camp}
              matches={matches}
              allMatches={matches}
            />
          ))
        )}
      </div>
    );
  };

  // ============================================================
  // GRIGLIA NAZIONI (4x4 responsive)
  // ============================================================

  const GrigliaNazioni = ({ matches, onSelectNazione }) => {
    const nazioniOrdinate = useMemo(() => {
      return Object.keys(NAZIONI).sort((a, b) => a.localeCompare(b));
    }, []);

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
          <h2 style={{ margin: 0, color: 'var(--accent)' }}>🌍 Seleziona una Nazione</h2>
          {schedinaCount > 0 && (
            <span style={{
              background: 'var(--win)', color: '#000', padding: '4px 14px',
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
                  background: disabled ? 'var(--surface)' : 'var(--card)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  transition: 'all 0.15s', minHeight: '90px', position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <NazioneBandiera nazione={naz} size={36} />
                <span style={{
                  fontSize: '11px', fontWeight: 'bold', color: 'var(--text)',
                  textAlign: 'center', lineHeight: '1.2',
                }}>
                  {naz}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: '16px', padding: '10px 14px', background: 'var(--surface)',
          borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px',
          color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap',
        }}>
          <span>💡 Clicca su una nazione per vedere i campionati</span>
          <span>🎯 Clicca su una giocata per aggiungerla alla Schedina</span>
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTE PRINCIPALE: HOME
  // ============================================================

  function HomeComponent({ matches, championships, onSelectMatch, setTab, selectedFamiglie, weatherCache }) {
    const [nazioneSelezionata, setNazioneSelezionata] = useState(null);

    // FIX: normalizza i campionati (Chinese Super League non più sotto Grecia)
    const matchesPuliti = useMemo(() => normalizeMatches(matches), [matches]);

    if (!matchesPuliti || matchesPuliti.length === 0) {
      return (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌍</div>
          <h3 style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            Nessuna partita disponibile
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Importa un campionato da <b>Impostazioni → Importa Campionato</b>
          </p>
        </div>
      );
    }

    if (nazioneSelezionata) {
      return (
        <VistaNazione
          nazione={nazioneSelezionata}
          matches={matchesPuliti}
          onBack={() => setNazioneSelezionata(null)}
        />
      );
    }

    return (
      <GrigliaNazioni
        matches={matchesPuliti}
        onSelectNazione={setNazioneSelezionata}
      />
    );
  }

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.HomeComponent = HomeComponent;

  window.HomeUtils = {
    NAZIONI,
    NAZIONI_BASE_PATH,
    SCHEDINA_STORAGE_KEY,
    formatGiocataLabel,
    getGiornataCorrente,
    calcolaTop3Giocate,
    leggiSelezioniSchedina,
    scriviSelezioniSchedina,
    toggleSelezioneSchedina,
    // FIX: esposte per debug / riuso altrove
    normalizeMatches,
    normalizeCampionato,
    CHINESE_TEAMS,
  };

  console.log('✅ Modulo Home caricato (home.js)');
  console.log('   - Nazioni disponibili:', Object.keys(NAZIONI).length);
  console.log('   - Griglia: 4x4 responsive (4 desktop / 3 tablet / 2 mobile)');
  console.log('   - Chiave schedina:', SCHEDINA_STORAGE_KEY);
  console.log('   - FIX attivo: Chinese Super League separata da Super League Grecia');
  console.log('   - Cina sostituisce Grecia nella griglia nazioni');

})();