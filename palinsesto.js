// ============================================================
// palinsesto.js - Modulo Palinsesto
// v6: filtro giorni (1-7) + switch Scelte/Tutte
//     + bordi neon colorati sulle card match
//     + bottoni TOP 5 (Maggiori / Minori / Tutti) con selezione atomica
//     + FIX: palinsesto non si svuota se CHAMPIONSHIP_LIST non pronta
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo, useEffect, useCallback } = React;

  const normalizzaAccenti = (str) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/ø/g, 'o')
      .replace(/æ/g, 'ae');
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

  // ============================================================
  // TOP 5 — Selezioni rapide campionati
  // ============================================================
  const TOP_5_MAGGIORI = [
    'Serie A',
    'Ligue 1',
    'La Liga',
    'Bundesliga',
    'Premier League',
  ];

  const TOP_5_MINORI = [
    'Serie B',
    '2. Bundesliga',
    'Ligue 2',
    'Segunda División',
    'EFL Championship',
  ];

  // Confronto robusto: case-insensitive, accenti normalizzati, alias comuni
  const matchCampionato = (nomeDb, nomeTarget) => {
    if (!nomeDb || !nomeTarget) return false;
    const a = normalizzaAccenti(nomeDb).toLowerCase().trim();
    const b = normalizzaAccenti(nomeTarget).toLowerCase().trim();
    if (a === b) return true;
    const alias = {
      'segunda division': ['segunda division'],
      '2. bundesliga': ['2. bundesliga', '2 bundesliga', 'zweite bundesliga'],
      'efl championship': ['efl championship', 'championship', 'elf championship'],
    };
    for (const variants of Object.values(alias)) {
      if (variants.includes(a) && variants.includes(b)) return true;
    }
    return false;
  };

  const getQuotaInfo = (match, familyId, giocata, pctTua) => {
    if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') return null;
    try { return window.QuoteManager.analizzaGiocata(match, familyId, giocata, pctTua); }
    catch (e) { return null; }
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

  const getCampionatiOrdinati = () => {
    const list = (window.CHAMPIONSHIP_LIST && window.CHAMPIONSHIP_LIST.length > 0) ? window.CHAMPIONSHIP_LIST : [];
    return [...list].sort((a, b) => (a || '').localeCompare(b || '', 'it', { sensitivity: 'base' }));
  };

  const ChampLogo = ({ campionato, size = 24 }) => {
    const [hasError, setHasError] = useState(false);
    const [pathIndex, setPathIndex] = useState(0);

    const getPaths = (champ) => {
      if (!champ) return [];
      const normalized = normalizzaAccenti(champ);
      const kebab = normalized.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '');
      const snake = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      return [
        `logos/campionati/${kebab}.png`,
        `logos/campionati/${snake}.png`,
        `logos/campionati/${champ}.png`,
        `logos/campionati/${kebab}.jpg`,
        `logos/campionati/${snake}.jpg`,
      ];
    };

    const paths = getPaths(campionato);
    if (hasError || pathIndex >= paths.length || paths.length === 0) {
      const color = window.getChampColor(campionato);
      return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: size * 0.38, flexShrink: 0 }}>
          {campionato.substring(0, 2).toUpperCase()}
        </div>
      );
    }

    return (
      <img key={paths[pathIndex]} src={paths[pathIndex]} alt={campionato}
        onError={() => { if (pathIndex + 1 < paths.length) setPathIndex(pathIndex + 1); else setHasError(true); }}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
    );
  };

  const QuotaBox = ({ match, familyId, giocata, pctTua }) => {
    const [quotaInfo, setQuotaInfo] = useState(null);
    const { numPartite, dataMaxPDF } = window.QuoteManager ? window.QuoteManager.useQuote() : { numPartite: 0 };

    useEffect(() => {
      const info = getQuotaInfo(match, familyId, giocata, pctTua);
      setQuotaInfo(info);
    }, [match.id, familyId, giocata, pctTua, numPartite, dataMaxPDF]);

    if (!quotaInfo || !quotaInfo.quotaBook) return null;
    const { quotaBook, edge, isValue } = quotaInfo;

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', marginLeft: '6px', borderRadius: '4px', background: isValue ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)', border: `1px solid ${isValue ? 'var(--neon-green)' : 'var(--border)'}`, fontSize: '11px', fontWeight: 'bold', color: isValue ? 'var(--neon-green)' : 'var(--text)', whiteSpace: 'nowrap' }}>
        <span>💰</span><span>{quotaBook.toFixed(2)}</span>
      </div>
    );
  };

  // ============================================================
  // MATCH TAB — con bordo neon colorato
  // ============================================================
  const MatchTab = ({ match, allMatches, onSelect, selectedFamiglie }) => {
    const computeMatchStats = window.computeMatchStats;
    const calcFormAndStats = window.calcFormAndStats;
    const getChampColor = window.getChampColor;
    const formatDateEU = window.formatDateEU;
    const TeamLogo = window.TeamLogo;
    const FAMIGLIE_GIOCATE = window.FAMIGLIE_GIOCATE;
    const getGiocataPct = window.getGiocataPct;
    const getPercentualeClasse = window.getPercentualeClasse;
    const calcolaGG_NG = window.calcolaGG_NG;
    const { mode: visualizzaMode } = window.FiltriCampionati.useVisualizzaGiocateMode();

    if (!match) return null;

    const homeForm = calcFormAndStats(allMatches, match.casa);
    const awayForm = calcFormAndStats(allMatches, match.ospiti);
    const champColor = getChampColor(match.campionato);
    const diff = Math.abs(homeForm.pct - awayForm.pct);
    const stats = computeMatchStats(match, allMatches);
    stats._allMatches = allMatches;
    stats._homeTeam = match.casa;
    stats._awayTeam = match.ospiti;

    const renderFormSquares = (formStr) => {
      if (!formStr) return <span>N/D</span>;
      return [...formStr].map((letter, idx) => <div key={idx} className={`form-square form-square-${letter}`}>{letter}</div>);
    };

    const getColorForPct = (valore) => {
      if (valore >= 90) return 'var(--neon-gold)';
      if (valore >= 66.67) return 'var(--neon-green)';
      if (valore >= 33.34) return 'var(--text-dim)';
      return 'var(--neon-red)';
    };

    const getGiocateDaMostrare = () => {
      if (stats.error) return [];
      const homeMG = stats.homeMG || {};
      const awayMG = stats.awayMG || {};
      const mgTot = stats.mgTot || {};
      const giocateDaMostrare = [];
      let famiglieDaAnalizzare;
      if (visualizzaMode === 'tutte') famiglieDaAnalizzare = Object.keys(FAMIGLIE_GIOCATE);
      else famiglieDaAnalizzare = selectedFamiglie || [];
      famiglieDaAnalizzare = [...new Set(famiglieDaAnalizzare)].filter(id => FAMIGLIE_GIOCATE[id]);

      famiglieDaAnalizzare.forEach(familyId => {
        const family = FAMIGLIE_GIOCATE[familyId];
        if (!family) return;
        let best = null;
        if (familyId === 'gg_ng') {
          const r = calcolaGG_NG ? calcolaGG_NG(stats) : null;
          if (r) best = { label: r.giocata, giocata: r.giocata, pct: r.pct };
        } else {
          let bestPct = -1, bestOpt = null;
          family.options.forEach(opt => {
            let pct = 0;
            try { pct = getGiocataPct(opt, stats, homeMG, awayMG, mgTot) || 0; } catch (e) { pct = 0; }
            if (pct > bestPct) { bestPct = pct; bestOpt = opt; }
          });
          if (bestOpt && bestPct > 0) best = { label: bestOpt, giocata: bestOpt, pct: bestPct };
        }
        if (best && best.pct > 0) {
          giocateDaMostrare.push({
            familyId, familyLabel: family.label, familyIcon: family.icon,
            label: best.label, displayLabel: formatGiocataLabel(familyId, best.label),
            familyName: family.label, pct: best.pct, isBomb: best.pct >= 90, giocata: best.giocata,
          });
        }
      });

      return giocateDaMostrare.sort((a, b) => b.pct - a.pct).slice(0, 3);
    };

    const giocateDaMostrare = getGiocateDaMostrare();
    const score = giocateDaMostrare.length > 0 ? Math.round(giocateDaMostrare.reduce((s, g) => s + g.pct, 0) / giocateDaMostrare.length) : 0;
    const hasBomb = giocateDaMostrare.some(g => g.isBomb);
    const handleClick = (e) => { e.stopPropagation(); onSelect(match.id); };
    const formattedDate = match.data ? formatDateEU(match.data) : 'N/D';

    const neonBorderStyle = {
      border: `2px solid ${champColor}`,
      boxShadow: `0 0 12px ${champColor}88, 0 0 4px ${champColor}44, inset 0 0 8px ${champColor}11`,
    };

    return (
      <div
        className="match-tab"
        style={{
          ...neonBorderStyle,
          borderLeftWidth: '6px',
          borderLeftColor: champColor,
        }}
        onClick={handleClick}
      >
        <div className="score-badge">
          <span className={`giocata-pct ${getPercentualeClasse(score)}`}>{isNaN(score) ? 0 : score}%</span>
          {hasBomb && <span className="bomb-inline">💣</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <div className="tab-header" style={{ background: champColor, marginBottom: 0 }}>
            <ChampLogo campionato={match.campionato} size={16} />
            <span>{match.campionato || 'N/D'}</span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--neon-cyan)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>G.{match.round || 'N/A'}</span>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginBottom: '6px', textAlign: 'center' }}>📅 {formattedDate} • ⏰ {match.ora || 'TBD'}</div>
        <div className="teams-row">
          <div className="team"><TeamLogo teamName={match.casa} championship={match.campionato} size={50} /><div className="team-name">{match.casa || 'Casa'}</div></div>
          <div className="vs">VS</div>
          <div className="team"><TeamLogo teamName={match.ospiti} championship={match.campionato} size={50} /><div className="team-name">{match.ospiti || 'Ospite'}</div></div>
        </div>
        <div className="form-row-compact">
          <div className="form-block-compact"><div className="form-label">Forma</div><div className="form-squares">{renderFormSquares(homeForm.form)}</div><div className="form-pct-compact">{homeForm.pct || 0}%</div></div>
          <div className="form-block-compact"><div className="form-label">Forma</div><div className="form-squares">{renderFormSquares(awayForm.form)}</div><div className="form-pct-compact">{awayForm.pct || 0}%</div></div>
        </div>
        <div className="form-diff">📊 Differenza forma: <span className={diff >= 20 ? 'diff-alta' : 'diff-bassa'}>{isNaN(diff) ? 0 : diff}%</span></div>
        <div className="bet-row-vertical">
          {giocateDaMostrare.length > 0 ? giocateDaMostrare.map((g, idx) => {
            const pctColor = getColorForPct(g.pct);
            const isBomb = g.pct >= 90;
            return (
              <div key={idx} className={`bet-item-vertical ${isBomb ? 'bomb' : ''}`} style={{ borderColor: pctColor }}>
                <span className="bet-label" style={{ color: isBomb ? 'var(--neon-gold)' : pctColor, fontWeight: 700 }}>{isBomb && '💣 '}{g.displayLabel || g.label}</span>
                <span className="bet-value"><span className={`giocata-pct ${getPercentualeClasse(g.pct)}`}>{g.pct}%</span><QuotaBox match={match} familyId={g.familyId} giocata={g.giocata} pctTua={g.pct} /></span>
              </div>
            );
          }) : (
            <div className="bet-item-vertical" style={{ textAlign: 'center', color: 'var(--text-dim)' }}><span>Nessuna giocata</span></div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // CHAMP BAR — con badge oggi (rosso) / 2 giorni (giallo)
  // ============================================================
  const ChampBar = ({ matches, campionatiSelezionati, onToggle, onSelezionaTutti, onDeselezionaTutti, championships }) => {
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;
    const addDaysToDateStr = window.addDaysToDateStr;

    const todayStr = getTodayStr();
    const maxDateStr = addDaysToDateStr(todayStr, 2);

    const countOggi = (camp) => {
      if (!camp) return 0;
      return matches.filter(m => m.campionato === camp && m.stato === 'Futura' && normalizeDate(m.data) === todayStr).length;
    };

    const countEntro2Giorni = (camp) => {
      if (!camp) return 0;
      return matches.filter(m => {
        if (m.campionato !== camp || m.stato !== 'Futura') return false;
        const d = normalizeDate(m.data);
        return d > todayStr && d <= maxDateStr;
      }).length;
    };

    const campionatiOrdinati = useMemo(() => getCampionatiOrdinati(), []);

    const isTuttiSelezionati = campionatiSelezionati.length === championships.length && championships.length > 0;

    const renderBadge = (camp) => {
      const nOggi = countOggi(camp);
      const n2g = countEntro2Giorni(camp);
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

    return (
      <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'linear-gradient(135deg, rgba(30, 40, 66, 0.7), rgba(20, 27, 46, 0.9))', border: '1px solid var(--border)', borderRadius: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>🏆 Campionati Attivi</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={onSelezionaTutti} style={{ fontSize: '10px', padding: '4px 14px', background: isTuttiSelezionati ? 'var(--accent)' : 'var(--surface)', color: isTuttiSelezionati ? '#000' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Tutti</button>
            <button onClick={onDeselezionaTutti} style={{ fontSize: '10px', padding: '4px 14px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>❌ Deseleziona</button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--surface)', borderRadius: '6px' }}>{campionatiSelezionati.length} / {championships.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '4px', width: '100%' }}>
          {campionatiOrdinati.map((campionato, idx) => {
            const color = window.getChampColor(campionato);
            const isActive = campionatiSelezionati.includes(campionato);
            const label = campionato.length > 16 ? campionato.substring(0, 14) + '…' : campionato;
            const hasPartite = matches.some(m => m.campionato === campionato);

            return (
              <button
                key={`${campionato}-${idx}`}
                onClick={() => onToggle(campionato)}
                className={`champ-bar-item ${isActive ? 'active' : ''}`}
                style={{
                  borderColor: isActive ? 'var(--neon-cyan)' : `${color}66`,
                  background: isActive ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))' : 'var(--bg-elevated)',
                  color: isActive ? '#000' : 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '5px 6px',
                  minHeight: '36px',
                  borderWidth: isActive ? '2px' : '1px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: isActive ? 'bold' : '700',
                  width: '100%',
                  transition: 'all 0.2s',
                  overflow: 'hidden',
                  boxShadow: isActive ? '0 0 20px rgba(0, 245, 255, 0.5)' : 'none',
                  opacity: hasPartite ? 1 : 0.4,
                }}
                title={campionato}
              >
                <ChampLogo campionato={campionato} size={14} />
                <span style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75px' }}>{label}</span>
                {renderBadge(campionato)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // VISUALIZZA GIOCATE SWITCH — v5 con TOP 5 Maggiori/Minori/Tutti
  // ============================================================
  const VisualizzaGiocateSwitch = ({
    mode,
    setMode,
    selectedFamiglie,
    onTop5Maggiori,
    onTop5Minori,
    onTop5Tutti,
    isTop5MaggioriAttivo,
    isTop5MinoriAttivo,
    isTop5TuttiAttivo,
  }) => {
    const countScelte = (selectedFamiglie || []).length;
    const totalFamiglie = Object.keys(window.FAMIGLIE_GIOCATE || {}).length;
    const { giorni, setGiorni } = window.FiltriCampionati.useGiorniRange();

    const btnTopStyle = (attivo, colore) => ({
      padding: '6px 12px',
      fontSize: '11px',
      fontWeight: 700,
      borderRadius: '6px',
      border: `1px solid ${colore}`,
      cursor: 'pointer',
      background: attivo ? colore : 'var(--bg-deep)',
      color: attivo ? '#000' : colore,
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    });

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '14px',
        padding: '10px 14px',
        background: 'var(--bg-elevated)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        justifyContent: 'center'
      }}>
        {/* ── RANGE GIORNI ── */}
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
          📅 Giorni
        </span>
        <div style={{
          display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px',
          padding: '3px', border: '1px solid var(--border)', gap: '2px'
        }}>
          {[1, 2, 3, 4, 5, 6, 7].map(g => (
            <button
              key={g}
              onClick={() => setGiorni(g)}
              style={{
                padding: '6px 10px', fontSize: '11px', fontWeight: 700,
                borderRadius: '6px', border: 'none', cursor: 'pointer', minWidth: '30px',
                background: giorni === g ? 'var(--neon-cyan)' : 'transparent',
                color: giorni === g ? '#000' : 'var(--text-dim)',
                transition: 'all 0.15s'
              }}
              title={g === 1 ? 'Solo oggi' : `Prossimi ${g} giorni`}
            >
              {g}
            </button>
          ))}
        </div>

        <span style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        {/* ── TOP 5 ── */}
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-gold)', textTransform: 'uppercase' }}>
          🏆 Top 5
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={onTop5Maggiori}
            style={btnTopStyle(isTop5MaggioriAttivo, 'var(--neon-gold)')}
            title="Serie A, Ligue 1, La Liga, Bundesliga, Premier League"
          >
            ⭐ Maggiori
          </button>
          <button
            onClick={onTop5Minori}
            style={btnTopStyle(isTop5MinoriAttivo, 'var(--neon-cyan)')}
            title="Serie B, 2. Bundesliga, Ligue 2, Segunda División, EFL Championship"
          >
            🔹 Minori
          </button>
          <button
            onClick={onTop5Tutti}
            style={btnTopStyle(isTop5TuttiAttivo, 'var(--neon-magenta)')}
            title="Maggiori + Minori (10 campionati)"
          >
            💎 Maggiori + Minori
          </button>
        </div>

        <span style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        {/* ── SWITCH SCELTE/TUTTE ── */}
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
          🎯 Giocate
        </span>
        <div style={{
          display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px',
          padding: '3px', border: '1px solid var(--border)'
        }}>
          <button
            onClick={() => setMode('scelte')}
            style={{
              padding: '6px 16px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: mode === 'scelte' ? 'var(--neon-cyan)' : 'transparent',
              color: mode === 'scelte' ? '#000' : 'var(--text-dim)'
            }}
          >
            ⭐ Scelte ({countScelte})
          </button>
          <button
            onClick={() => setMode('tutte')}
            style={{
              padding: '6px 16px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: mode === 'tutte' ? 'var(--neon-magenta)' : 'transparent',
              color: mode === 'tutte' ? '#000' : 'var(--text-dim)'
            }}
          >
            🌐 Tutte ({totalFamiglie})
          </button>
        </div>
      </div>
    );
  };

  // ============================================================
  // PALINSESTO COMPONENT — v6 con filtro giorni + TOP 5 + FIX
  // ============================================================
  function PalinsestoComponent({ matches, selectedFamiglie, onSelectMatch, weatherCache, championships }) {
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;
    const addDaysToDateStr = window.addDaysToDateStr;
    const isMobile = useIsMobile();
    const { mode: visualizzaMode, setMode: setVisualizzaMode } = window.FiltriCampionati.useVisualizzaGiocateMode();

    const { giorni } = window.FiltriCampionati.useGiorniRange();

    const {
      campionatiAttivi,
      toggleCampionato,
      selezionaTutti,
      deselezionaTutti,
      setFiltro,
    } = window.FiltriCampionati.useFiltroCampionati();

    const championshipsList = useMemo(() => {
      if (championships && championships.length > 0) return championships;
      if (window.CHAMPIONSHIP_LIST && window.CHAMPIONSHIP_LIST.length > 0) return window.CHAMPIONSHIP_LIST.map(name => ({ name }));
      return [];
    }, [championships]);

    // ============================================================
    // ⭐ LISTA COMPLETA NOMI CAMPIONATI (DB + LISTA, con fallback)
    // ============================================================
    const tuttiNomiCampionati = useMemo(() => {
      const dalDb = Array.isArray(matches)
        ? [...new Set(matches.map(m => m.campionato).filter(Boolean))]
        : [];
      const dallaLista = (window.CHAMPIONSHIP_LIST || []).slice();
      const unione = [...dalDb];
      dallaLista.forEach(n => {
        if (!unione.some(x => matchCampionato(x, n))) unione.push(n);
      });
      return unione;
    }, [matches]);

    // ============================================================
    // ⭐ SELEZIONE RAPIDA TOP 5 — atomica via setFiltro
    // ============================================================
    const selezionaSoloCampionati = useCallback((targetList) => {
      if (typeof setFiltro !== 'function') return;
      if (!Array.isArray(tuttiNomiCampionati) || tuttiNomiCampionati.length === 0) {
        console.warn('⚠️ TOP 5: nessun campionato disponibile, selezione ignorata');
        return;
      }
      const nuovoFiltro = {};
      tuttiNomiCampionati.forEach(nome => {
        const isTarget = targetList.some(t => matchCampionato(nome, t));
        nuovoFiltro[nome] = isTarget;
      });
      setFiltro(nuovoFiltro);
    }, [setFiltro, tuttiNomiCampionati]);

    const handleTop5Maggiori = useCallback(() => {
      selezionaSoloCampionati(TOP_5_MAGGIORI);
    }, [selezionaSoloCampionati]);

    const handleTop5Minori = useCallback(() => {
      selezionaSoloCampionati(TOP_5_MINORI);
    }, [selezionaSoloCampionati]);

    const handleTop5Tutti = useCallback(() => {
      selezionaSoloCampionati([...TOP_5_MAGGIORI, ...TOP_5_MINORI]);
    }, [selezionaSoloCampionati]);

    // Helper: verifica se la selezione corrente corrisponde ESATTAMENTE a una lista target
    const isSelezioneUgualeA = useCallback((targetList) => {
      if (!Array.isArray(campionatiAttivi)) return false;
      const nomiTarget = tuttiNomiCampionati
        .filter(n => targetList.some(t => matchCampionato(n, t)));
      if (nomiTarget.length === 0) return false;
      const setAttivi = new Set(campionatiAttivi);
      return nomiTarget.length === setAttivi.size
        && nomiTarget.every(n => setAttivi.has(n));
    }, [campionatiAttivi, tuttiNomiCampionati]);

    const isTop5MaggioriAttivo = useMemo(() => isSelezioneUgualeA(TOP_5_MAGGIORI), [isSelezioneUgualeA]);
    const isTop5MinoriAttivo = useMemo(() => isSelezioneUgualeA(TOP_5_MINORI), [isSelezioneUgualeA]);
    const isTop5TuttiAttivo = useMemo(
      () => isSelezioneUgualeA([...TOP_5_MAGGIORI, ...TOP_5_MINORI]),
      [isSelezioneUgualeA]
    );

    // ============================================================
    // PARTITE FILTRATE PER GIORNI (con FIX anti-svuotamento)
    // ============================================================
    const partiteOggi = useMemo(() => {
      const todayStr = getTodayStr();
      const maxDateStr = addDaysToDateStr(todayStr, giorni);

      let list = matches.filter(m => {
        if (m.stato !== 'Futura') return false;
        const d = normalizeDate(m.data);
        if (!d) return false;
        return d >= todayStr && d <= maxDateStr;
      });

      if (Array.isArray(campionatiAttivi) && campionatiAttivi.length > 0) {
        list = list.filter(m => campionatiAttivi.includes(m.campionato));
      } else {
        // FIX: se il filtro è vuoto ma non è una scelta esplicita dell'utente
        // (es. localStorage corrotto o filtro mai inizializzato), mostra tutto.
        let filtroRaw = null;
        try {
          filtroRaw = window.FiltriCampionati.leggiFiltroCampionati();
        } catch (e) { filtroRaw = null; }
        const nessunoEsplicitamenteSelezionato =
          filtroRaw && Object.values(filtroRaw).every(v => v === false);
        if (nessunoEsplicitamenteSelezionato) {
          list = [];
        }
        // altrimenti lascia list com'è (mostra tutto)
      }

      return list.sort((a, b) => {
        const dateA = normalizeDate(a.data);
        const dateB = normalizeDate(b.data);
        if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.ora || '99:99').localeCompare(b.ora || '99:99');
      });
    }, [matches, campionatiAttivi, giorni, normalizeDate, getTodayStr, addDaysToDateStr]);

    const isTuttiMode = campionatiAttivi.length === championshipsList.length && championshipsList.length > 0;

    const titoloGiorni = giorni === 1 ? 'Oggi' : `Prossimi ${giorni} giorni`;

    if (isMobile) {
      return (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', marginBottom: '12px',
            background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(255, 0, 229, 0.05))',
            borderRadius: '14px', border: '1px solid var(--border)'
          }}>
            <span style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900,
              color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase'
            }}>
              📅 {titoloGiorni}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '11px', marginLeft: 'auto' }}>
              {partiteOggi.length} partite
            </span>
          </div>
          <ChampBar
            matches={matches}
            championships={championshipsList}
            campionatiSelezionati={campionatiAttivi}
            onToggle={toggleCampionato}
            onSelezionaTutti={selezionaTutti}
            onDeselezionaTutti={deselezionaTutti}
          />
          <VisualizzaGiocateSwitch
            mode={visualizzaMode}
            setMode={setVisualizzaMode}
            selectedFamiglie={selectedFamiglie}
            onTop5Maggiori={handleTop5Maggiori}
            onTop5Minori={handleTop5Minori}
            onTop5Tutti={handleTop5Tutti}
            isTop5MaggioriAttivo={isTop5MaggioriAttivo}
            isTop5MinoriAttivo={isTop5MinoriAttivo}
            isTop5TuttiAttivo={isTop5TuttiAttivo}
          />
          {partiteOggi.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>😴</div>
              <div style={{ color: 'var(--text-dim)' }}>
                Nessuna partita nei prossimi {giorni} giorni
              </div>
            </div>
          ) : (
            <div className="matches-grid">
              {partiteOggi.map(m => (
                <MatchTab
                  key={m.id}
                  match={m}
                  allMatches={matches}
                  onSelect={onSelectMatch}
                  selectedFamiglie={selectedFamiglie}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          padding: '10px 16px', marginBottom: '12px',
          background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(255, 0, 229, 0.05))',
          borderRadius: '14px', border: '1px solid var(--border)'
        }}>
          <span style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontWeight: 900,
            color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase',
            textShadow: '0 0 12px var(--neon-cyan)'
          }}>
            📅 Palinsesto {titoloGiorni}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
            {isTuttiMode ? 'Tutti i campionati' : `${campionatiAttivi.length} campionati`} • {partiteOggi.length} partite
          </span>
        </div>
        <VisualizzaGiocateSwitch
          mode={visualizzaMode}
          setMode={setVisualizzaMode}
          selectedFamiglie={selectedFamiglie}
          onTop5Maggiori={handleTop5Maggiori}
          onTop5Minori={handleTop5Minori}
          onTop5Tutti={handleTop5Tutti}
          isTop5MaggioriAttivo={isTop5MaggioriAttivo}
          isTop5MinoriAttivo={isTop5MinoriAttivo}
          isTop5TuttiAttivo={isTop5TuttiAttivo}
        />
        <ChampBar
          matches={matches}
          championships={championshipsList}
          campionatiSelezionati={campionatiAttivi}
          onToggle={toggleCampionato}
          onSelezionaTutti={selezionaTutti}
          onDeselezionaTutti={deselezionaTutti}
        />
        {partiteOggi.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>😴</div>
            <h3 style={{ color: 'var(--neon-cyan)' }}>Nessuna partita nei prossimi {giorni} giorni</h3>
            <p style={{ color: 'var(--text-dim)' }}>
              {campionatiAttivi.length === 0
                ? 'Seleziona almeno un campionato'
                : `Non ci sono partite in programma nei prossimi ${giorni} giorni nei campionati selezionati`}
            </p>
          </div>
        ) : (
          <div className="matches-grid">
            {partiteOggi.map(m => (
              <MatchTab
                key={m.id}
                match={m}
                allMatches={matches}
                onSelect={onSelectMatch}
                selectedFamiglie={selectedFamiglie}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  window.PalinsestoComponent = PalinsestoComponent;
  window.ChampLogo = ChampLogo;
  console.log('✅ Modulo Palinsesto v6 caricato — filtro giorni + TOP 5 + bordi neon + FIX svuotamento');

})();