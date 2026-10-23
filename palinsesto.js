// ============================================================
// palinsesto.js - Modulo Palinsesto
// v19: Aggiunto ⏳ durante download, tooltip diagnostico su -.--
//      + quoteVersion per re-render automatico su quote-updated
//      + safeGetDixonPct robusto
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo, useEffect, useCallback } = React;

  // ⭐ FALLBACK SICURO per useMotoreAnalisi (non più usato ma mantenuto per compatibilità)
  if (!window.FiltriCampionati) window.FiltriCampionati = {};
  if (typeof window.FiltriCampionati.useMotoreAnalisi !== 'function') {
    window.FiltriCampionati.useMotoreAnalisi = function () {
      return { motore: 'confronto', setMotore: () => {} };
    };
  }

  // ⭐ FALLBACK SICURO per useVisualizzaGiocateMode
  if (typeof window.FiltriCampionati.useVisualizzaGiocateMode !== 'function') {
    window.FiltriCampionati.useVisualizzaGiocateMode = function () {
      const [mode, setModeState] = React.useState(
        () => localStorage.getItem('ft_visualizza_giocate_mode') || 'scelte'
      );
      const setMode = React.useCallback((v) => {
        const val = (v === 'calcolate' || v === 'tutte') ? 'calcolate' : 'scelte';
        setModeState(val);
        localStorage.setItem('ft_visualizza_giocate_mode', val);
        window.dispatchEvent(new Event('visualizza-giocate-mode-updated'));
      }, []);
      React.useEffect(() => {
        const handler = () => setModeState(localStorage.getItem('ft_visualizza_giocate_mode') || 'scelte');
        window.addEventListener('visualizza-giocate-mode-updated', handler);
        window.addEventListener('storage', handler);
        return () => {
          window.removeEventListener('visualizza-giocate-mode-updated', handler);
          window.removeEventListener('storage', handler);
        };
      }, []);
      return { mode, setMode };
    };
  }

  // ⭐ Riferimenti globali
  const normalizzaAccenti = (str) => {
    if (typeof window.normalizzaAccenti === 'function') return window.normalizzaAccenti(str);
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss').replace(/ø/g, 'o').replace(/æ/g, 'ae');
  };

  const formatGiocataLabel = (familyId, label) => {
    if (typeof window.formatGiocataLabel === 'function') return window.formatGiocataLabel(familyId, label);
    if (!label) return '—';
    if (label.startsWith('Over '))  return label.replace('.', ',');
    if (label.startsWith('Under ')) return label.replace('.', ',');
    if (familyId === 'multigol') return label;
    if (familyId === 'mg_casa_ospite') {
      const parts = label.split('+');
      if (parts.length === 2) return `MG ${parts[0]} C + MG ${parts[1]} O`;
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
      if (label === 'Goal-Goal' || label === 'GG') return 'GG';
      if (label === 'No Goal' || label === 'NG') return 'NG';
    }
    return label;
  };

  const safeGetDixonPct = (familyId, giocata, match, allMatches) => {
    if (!match || !allMatches || allMatches.length === 0) return 0;
    if (typeof window.getDixonPct === 'function' && !window.getDixonPct._isFallback) {
      try {
        const v = window.getDixonPct(familyId, giocata, match, allMatches);
        return (typeof v === 'number' && !isNaN(v)) ? v : 0;
      } catch (e) {
        console.warn('Errore getDixonPct:', e);
        return 0;
      }
    }
    return 0;
  };

  // ============================================================
  // TOP 5 + TOP COPPE
  // ============================================================
  const TOP_5_MAGGIORI = ['Serie A', 'Ligue 1', 'La Liga', 'Bundesliga', 'Premier League'];
  const TOP_5_MINORI = ['Serie B', '2. Bundesliga', 'Ligue 2', 'Segunda División', 'EFL Championship'];
  const TOP_COPPE = ['UEFA Champions League', 'UEFA Europa League', 'UEFA Europa Conference'];

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

  // ============================================================
  // CHAMP LOGO
  // ============================================================
  const ChampLogo = ({ campionato, size = 24 }) => {
    const [hasError, setHasError] = useState(false);
    const [pathIndex, setPathIndex] = useState(0);

    useEffect(() => {
      setHasError(false);
      setPathIndex(0);
    }, [campionato]);

    const getPaths = (champ) => {
      if (!champ) return [];
      const normalized = normalizzaAccenti(champ);
      const kebab = normalized.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '');
      const snake = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

      const specificPaths = [];
      if (champ.toLowerCase().includes('efl championship')) {
        specificPaths.push(
          'logos/campionati/championship.png',
          'logos/campionati/efl-championship.png',
          'logos/campionati/efl_championship.png',
          'logos/campionati/EFL_Championship.png'
        );
      }
      if (champ.toLowerCase() === 'serie c - girone a') specificPaths.push('logos/campionati/serie-c-girone-a.png');
      if (champ.toLowerCase() === 'serie c - girone b') specificPaths.push('logos/campionati/serie-c-girone-b.png');
      if (champ.toLowerCase() === 'serie c - girone c') specificPaths.push('logos/campionati/serie-c-girone-c.png');

      return [
        ...specificPaths,
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

  // ============================================================
  // ⭐ QUOTA BOX — v2 con ⏳ durante download + tooltip diagnostico
  // ============================================================
  const QuotaBox = ({ match, familyId, giocata, pctTua, compact = false }) => {
    const [quotaInfo, setQuotaInfo] = useState(null);
    const quoteCtx = window.QuoteManager && window.QuoteManager.useQuote ? window.QuoteManager.useQuote() : {};
    const numPartite = quoteCtx.numPartite || 0;
    const inCorso = quoteCtx.inCorso || false;
    const dataMaxPDF = quoteCtx.dataMaxPDF || null;

    useEffect(() => {
      const info = getQuotaInfo(match, familyId, giocata, pctTua);
      setQuotaInfo(info);
    }, [match.id, familyId, giocata, pctTua, numPartite, dataMaxPDF]);

    const hasQuota = quotaInfo && (quotaInfo.quotaBook !== undefined) && (quotaInfo.quotaBook !== null);
    const quotaBook = hasQuota ? quotaInfo.quotaBook : null;
    const isValue = hasQuota ? !!quotaInfo.isValue : false;

    // ⭐ Durante il download mostra ⏳
    if (!hasQuota && inCorso) {
      return (
        <div
          title="Download quote Marathonbet in corso..."
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: compact ? '1px 5px' : '2px 6px',
            marginLeft: compact ? '0' : '6px',
            borderRadius: '4px',
            background: 'rgba(0, 245, 255, 0.08)',
            border: '1px dashed var(--neon-cyan)',
            fontSize: compact ? '10px' : '11px',
            fontWeight: 'bold',
            color: 'var(--neon-cyan)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'progress',
          }}
        >
          <span>💰</span><span>⏳</span>
        </div>
      );
    }

    // ⭐ Nessuna quota: mostra motivo nel tooltip
    if (!hasQuota) {
      let motivo = 'Quota non disponibile';
      let icona = '-.-';

      if (numPartite === 0) {
        motivo = '⚠️ Nessun PDF quote caricato. Vai in Impostazioni → Quote Book per importare il PDF.';
        icona = '❌';
      } else if (dataMaxPDF && match.data && match.data > dataMaxPDF) {
        motivo = `📅 Partita oltre la data max del PDF (${dataMaxPDF.split('-').reverse().join('/')}). Il PDF non copre ancora questa data.`;
        icona = '-.-';
      } else {
        motivo = '🔍 Partita non trovata nel PDF Marathonbet (nome squadra o data non coincidono). Verifica in console con: PDFQuoteParser.debugPartita("NomeSquadra")';
        icona = '-.-';
      }

      return (
        <div
          title={motivo}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: compact ? '1px 5px' : '2px 6px',
            marginLeft: compact ? '0' : '6px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px dashed var(--border)',
            fontSize: compact ? '10px' : '11px',
            fontWeight: 'bold',
            color: 'var(--text-dim)',
            whiteSpace: 'nowrap',
            opacity: 0.8,
            cursor: 'help',
            flexShrink: 0,
          }}
        >
          <span>💰</span><span>{icona}</span>
        </div>
      );
    }

    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: compact ? '1px 5px' : '2px 6px',
        marginLeft: compact ? '0' : '6px',
        borderRadius: '4px',
        background: isValue ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${isValue ? 'var(--neon-green)' : 'var(--border)'}`,
        fontSize: compact ? '10px' : '11px',
        fontWeight: 'bold',
        color: isValue ? 'var(--neon-green)' : 'var(--text)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        <span>💰</span><span>{quotaBook.toFixed(2)}</span>
        {isValue && <span style={{ fontSize: '9px' }}>⭐</span>}
      </div>
    );
  };

  const getRischioCard = (righe) => {
    if (!righe || righe.length === 0) return { level: 'vuoto', colore: '#555', label: '▫️' };
    const nBombe = righe.filter(g => (g.pct >= 90) || (g.pctDixon >= 90)).length;
    const nBuone = righe.filter(g => Math.max(g.pct || 0, g.pctDixon || 0) >= 66).length;
    const mediaPct = righe.reduce((s, g) => s + Math.max(g.pct || 0, g.pctDixon || 0), 0) / righe.length;

    if (nBombe >= 2) return { level: 'top', colore: 'var(--neon-gold)', label: '💎' };
    if (nBombe >= 1) return { level: 'alta', colore: 'var(--neon-green)', label: '🔥' };
    if (nBuone >= 2) return { level: 'buona', colore: 'var(--neon-cyan)', label: '✅' };
    if (mediaPct >= 50) return { level: 'media', colore: 'var(--text-dim)', label: '•' };
    return { level: 'bassa', colore: 'var(--neon-red)', label: '▫️' };
  };

  // ============================================================
  // MATCH TAB
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

    const getDixonPct = safeGetDixonPct;

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

    const famiglieDaAnalizzare = useMemo(() => {
      if (stats.error) return [];
      let ids;
      if (visualizzaMode === 'calcolate') ids = Object.keys(FAMIGLIE_GIOCATE);
      else ids = selectedFamiglie || [];
      return [...new Set(ids)].filter(id => FAMIGLIE_GIOCATE[id]);
    }, [visualizzaMode, selectedFamiglie, stats.error]);

    const bestStoricoPerFamiglia = useMemo(() => {
      if (stats.error) return [];
      const homeMG = stats.homeMG || {};
      const awayMG = stats.awayMG || {};
      const mgTot = stats.mgTot || {};
      const out = [];
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
          out.push({
            familyId, familyLabel: family.label, familyIcon: family.icon,
            label: best.label, displayLabel: formatGiocataLabel(familyId, best.label),
            pct: best.pct, isBomb: best.pct >= 90, giocata: best.giocata,
          });
        }
      });
      return out;
    }, [famiglieDaAnalizzare, stats]);

    const bestDixonPerFamiglia = useMemo(() => {
      if (!getDixonPct) return [];
      if (stats.error) return [];
      const out = [];
      famiglieDaAnalizzare.forEach(familyId => {
        const family = FAMIGLIE_GIOCATE[familyId];
        if (!family) return;
        let best = null, bestPct = -1;
        family.options.forEach(opt => {
          const pct = getDixonPct(familyId, opt, match, allMatches);
          if (pct > bestPct) { bestPct = pct; best = opt; }
        });
        if (best && bestPct > 0) {
          out.push({
            familyId, familyLabel: family.label, familyIcon: family.icon,
            label: best, displayLabel: formatGiocataLabel(familyId, best),
            pct: bestPct, isBomb: bestPct >= 90, giocata: best,
          });
        }
      });
      return out;
    }, [famiglieDaAnalizzare, match.id, allMatches.length, stats.error]);

    const righeDaMostrare = useMemo(() => {
      if (stats.error) return [];
      return bestStoricoPerFamiglia
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3)
        .map(g => {
          const pctDixon = getDixonPct ? getDixonPct(g.familyId, g.giocata, match, allMatches) : 0;
          const hasDixon = pctDixon > 0;
          return { ...g, pctDixon: hasDixon ? pctDixon : 0 };
        });
    }, [bestStoricoPerFamiglia, match.id, allMatches.length, stats.error]);

    const topTripla = useMemo(() => {
      if (stats.error) return [];
      const topStorico = [...bestStoricoPerFamiglia].sort((a, b) => b.pct - a.pct).slice(0, 3);
      const topDixon = [...bestDixonPerFamiglia].sort((a, b) => b.pct - a.pct).slice(0, 3);

      const dixonByFamily = {};
      topDixon.forEach(d => {
        if (!dixonByFamily[d.familyId]) dixonByFamily[d.familyId] = d;
      });

      const result = [];
      const usedDixonKeys = new Set();

      topStorico.forEach(s => {
        let d = dixonByFamily[s.familyId] || null;
        if (d) usedDixonKeys.add(d.familyId);

        let quotaSource = null;
        if (s && d) quotaSource = s.pct >= d.pct ? s : d;
        else quotaSource = s || d;

        result.push({ storico: s, dixon: d, quotaSource, tipo: d ? 'match-famiglia' : 'solo-storico' });
      });

      topDixon.forEach(d => {
        if (!usedDixonKeys.has(d.familyId)) {
          const isDuplicate = result.some(r => r.dixon && r.dixon.familyId === d.familyId);
          if (!isDuplicate) {
            result.push({ storico: null, dixon: d, quotaSource: d, tipo: 'solo-dixon' });
            usedDixonKeys.add(d.familyId);
          }
        }
      });

      return result;
    }, [bestStoricoPerFamiglia, bestDixonPerFamiglia, stats.error]);

    const score = useMemo(() => {
      if (righeDaMostrare.length === 0) return 0;
      const sum = righeDaMostrare.reduce((s, g) => s + Math.max(g.pct || 0, g.pctDixon || 0), 0);
      return Math.round(sum / righeDaMostrare.length);
    }, [righeDaMostrare]);

    const hasBomb = righeDaMostrare.some(g => g.isBomb || g.pctDixon >= 90);
    const rischio = getRischioCard(righeDaMostrare);
    const handleClick = (e) => { e.stopPropagation(); onSelect(match.id); };
    const formattedDate = match.data ? formatDateEU(match.data) : 'N/D';

    const neonBorderStyle = {
      border: `2px solid ${champColor}`,
      borderLeftWidth: '6px',
      borderLeftColor: rischio.colore,
      boxShadow: `0 0 12px ${champColor}88, 0 0 4px ${champColor}44, inset 0 0 8px ${champColor}11`,
    };

    const renderRigaTripla = () => {
      if (topTripla.length === 0) {
        return (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
            Nessuna giocata disponibile
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {topTripla.map((row, idx) => {
            const s = row.storico;
            const d = row.dixon;
            const q = row.quotaSource;

            const isMatch = row.tipo === 'match-famiglia';
            const isSoloDixon = row.tipo === 'solo-dixon';

            const borderRowColor = isMatch
              ? 'var(--neon-green)'
              : row.tipo === 'solo-storico'
                ? 'var(--neon-cyan)'
                : 'var(--neon-magenta)';

            const isBombRow = (s && s.pct >= 90) || (d && d.pct >= 90);

            const rowStyle = {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '4px',
              padding: '6px',
              background: isBombRow
                ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.05))'
                : 'var(--bg-elevated)',
              borderRadius: '8px',
              border: isBombRow
                ? '2px solid var(--neon-gold)'
                : `1px solid ${borderRowColor}50`,
              position: 'relative',
              boxShadow: isBombRow ? '0 0 15px rgba(255, 215, 0, 0.4)' : 'none',
              animation: isBombRow ? 'bomb-glow 1.2s infinite alternate' : 'none',
            };

            return (
              <div key={idx} style={rowStyle}>
                {isMatch && (
                  <span title="Storico e Dixon suggeriscono la stessa famiglia" style={{ position: 'absolute', top: '-6px', right: '6px', background: 'var(--neon-green)', color: '#000', fontSize: '9px', fontWeight: 900, padding: '1px 6px', borderRadius: '8px', zIndex: 2 }}>
                    ✓ MATCH
                  </span>
                )}
                {isSoloDixon && (
                  <span title="Solo Dixon suggerisce questa giocata" style={{ position: 'absolute', top: '-6px', right: '6px', background: 'var(--neon-magenta)', color: '#000', fontSize: '9px', fontWeight: 900, padding: '1px 6px', borderRadius: '8px', zIndex: 2 }}>
                    + DIXON
                  </span>
                )}

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  padding: '6px 8px', borderRadius: '6px',
                  background: s ? 'rgba(0, 245, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: s ? '1px solid var(--neon-cyan)' : '1px dashed var(--border)',
                  minHeight: '52px', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: '9px', color: 'var(--neon-cyan)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                    📊 Storico
                  </div>
                  {s ? (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                        {s.displayLabel || s.label}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', color: s.pct >= 90 ? 'var(--neon-gold)' : s.pct >= 66 ? 'var(--neon-green)' : s.pct >= 33 ? 'var(--text-dim)' : 'var(--neon-red)', textAlign: 'center', lineHeight: 1.1 }}>
                        {s.pct}%{s.isBomb && <span style={{ fontSize: '10px', marginLeft: '2px' }}>💣</span>}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>—</div>
                  )}
                </div>

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  padding: '6px 8px', borderRadius: '6px',
                  background: d ? 'rgba(255, 0, 229, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: d ? '1px solid var(--neon-magenta)' : '1px dashed var(--border)',
                  minHeight: '52px', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: '9px', color: 'var(--neon-magenta)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                    🧮 Dixon
                  </div>
                  {d ? (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                        {d.displayLabel || d.label}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', color: d.pct >= 90 ? 'var(--neon-gold)' : d.pct >= 66 ? 'var(--neon-green)' : d.pct >= 33 ? 'var(--text-dim)' : 'var(--neon-red)', textAlign: 'center', lineHeight: 1.1 }}>
                        {d.pct}%{d.isBomb && <span style={{ fontSize: '10px', marginLeft: '2px' }}>💣</span>}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>—</div>
                  )}
                </div>

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  padding: '6px 8px', borderRadius: '6px',
                  background: q ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: q ? '1px solid var(--neon-green)' : '1px dashed var(--border)',
                  minHeight: '52px', justifyContent: 'center', alignItems: 'center',
                }}>
                  <div style={{ fontSize: '9px', color: 'var(--neon-green)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                    💰 Quota
                  </div>
                  {q ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px' }}>
                        <QuotaBox match={match} familyId={q.familyId} giocata={q.giocata} pctTua={q.pct} compact={true} />
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '2px' }}>
                        {q.displayLabel || q.label}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="match-tab" style={neonBorderStyle} onClick={handleClick}>
        <div className="score-badge" style={{
          background: `${rischio.colore}22`, border: `2px solid ${rischio.colore}`, color: rischio.colore,
          padding: '2px 10px', borderRadius: '10px', boxShadow: `0 0 10px ${rischio.colore}66`,
        }}>
          <span style={{ fontSize: '14px', marginRight: '4px' }}>{rischio.label}</span>
          <span className={`giocata-pct ${getPercentualeClasse(score)}`} style={{ fontSize: '13px' }}>{isNaN(score) ? 0 : score}%</span>
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
          {renderRigaTripla()}
        </div>
      </div>
    );
  };

  // ============================================================
  // CHAMP BAR
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
      if (!camp) return null;
      const nOggi = countOggi(camp);
      const n2g = countEntro2Giorni(camp);
      if (nOggi > 0) {
        return (
          <span style={{
            background: 'var(--neon-red)', color: '#fff', fontSize: '9px', fontWeight: 900,
            padding: '1px 6px', borderRadius: '10px', flexShrink: 0,
          }}>{nOggi}</span>
        );
      }
      if (n2g > 0) {
        return (
          <span style={{
            background: 'var(--neon-gold)', color: '#000', fontSize: '9px', fontWeight: 900,
            padding: '1px 6px', borderRadius: '10px', flexShrink: 0,
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
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '4px', padding: '5px 6px', minHeight: '36px',
                  borderWidth: isActive ? '2px' : '1px', borderRadius: '10px',
                  fontSize: '10px', fontWeight: isActive ? 'bold' : '700',
                  width: '100%', transition: 'all 0.2s', overflow: 'hidden',
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
  // VISUALIZZA GIOCATE SWITCH
  // ============================================================
  const VisualizzaGiocateSwitch = ({
    mode, setMode,
    selectedFamiglie,
    onTop5Maggiori, onTop5Minori, onTop5Tutti,
    isTop5MaggioriAttivo, isTop5MinoriAttivo, isTop5TuttiAttivo,
    onTopCoppe, isTopCoppeAttivo,
  }) => {
    const countScelte = (selectedFamiglie || []).length;
    const totalFamiglie = Object.keys(window.FAMIGLIE_GIOCATE || {}).length;
    const { giorni, setGiorni } = window.FiltriCampionati.useGiorniRange();

    const btnTopStyle = (attivo, colore) => ({
      padding: '6px 12px', fontSize: '11px', fontWeight: 700,
      borderRadius: '6px', border: `1px solid ${colore}`, cursor: 'pointer',
      background: attivo ? colore : 'var(--bg-deep)',
      color: attivo ? '#000' : colore,
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    });

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        marginBottom: '14px', padding: '10px 14px',
        background: 'var(--bg-elevated)', borderRadius: '12px',
        border: '1px solid var(--border)', justifyContent: 'center'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
          📅 Giorni
        </span>
        <div style={{
          display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px',
          padding: '3px', border: '1px solid var(--border)', gap: '2px'
        }}>
          {[1, 2, 3, 4, 5, 6, 7].map(g => (
            <button key={g} onClick={() => setGiorni(g)}
              style={{
                padding: '6px 10px', fontSize: '11px', fontWeight: 700,
                borderRadius: '6px', border: 'none', cursor: 'pointer', minWidth: '30px',
                background: giorni === g ? 'var(--neon-cyan)' : 'transparent',
                color: giorni === g ? '#000' : 'var(--text-dim)',
                transition: 'all 0.15s'
              }}
              title={g === 1 ? 'Solo oggi' : `Prossimi ${g} giorni`}
            >{g}</button>
          ))}
        </div>

        <span style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-gold)', textTransform: 'uppercase' }}>
          🏆 Top 5
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={onTop5Maggiori} style={btnTopStyle(isTop5MaggioriAttivo, 'var(--neon-gold)')} title="Serie A, Ligue 1, La Liga, Bundesliga, Premier League">⭐ Maggiori</button>
          <button onClick={onTop5Minori} style={btnTopStyle(isTop5MinoriAttivo, 'var(--neon-cyan)')} title="Serie B, 2. Bundesliga, Ligue 2, Segunda División, EFL Championship">🔹 Minori</button>
          <button onClick={onTop5Tutti} style={btnTopStyle(isTop5TuttiAttivo, 'var(--neon-magenta)')} title="Maggiori + Minori (10 campionati)">💎 Maggiori + Minori</button>
          <button onClick={onTopCoppe} style={btnTopStyle(isTopCoppeAttivo, '#1a1aff')} title="UEFA Champions League, Europa League, Conference League">🏆 Coppe</button>
        </div>

        <span style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
          🎯 Giocate
        </span>
        <div style={{
          display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px',
          padding: '3px', border: '1px solid var(--border)'
        }}>
          <button onClick={() => setMode('scelte')}
            style={{
              padding: '6px 16px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: mode === 'scelte' ? 'var(--neon-cyan)' : 'transparent',
              color: mode === 'scelte' ? '#000' : 'var(--text-dim)'
            }}
          >⭐ Scelte ({countScelte})</button>
          <button onClick={() => setMode('calcolate')}
            style={{
              padding: '6px 16px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: mode === 'calcolate' ? 'var(--neon-magenta)' : 'transparent',
              color: mode === 'calcolate' ? '#000' : 'var(--text-dim)'
            }}
          >🌐 Calcolate ({totalFamiglie})</button>
        </div>
      </div>
    );
  };

  // ============================================================
  // PALINSESTO COMPONENT
  // ============================================================
  function PalinsestoComponent({ matches, selectedFamiglie, onSelectMatch, weatherCache, championships }) {
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;
    const addDaysToDateStr = window.addDaysToDateStr;
    const isMobile = useIsMobile();
    const { mode: visualizzaMode, setMode: setVisualizzaMode } = window.FiltriCampionati.useVisualizzaGiocateMode();
    const { giorni } = window.FiltriCampionati.useGiorniRange();

    // ⭐ FIX: forza re-render quando le quote vengono aggiornate
    const [quoteVersion, setQuoteVersion] = useState(0);
    useEffect(() => {
      const handler = () => {
        console.log('🔄 Palinsesto: quote aggiornate, re-render forzato');
        setQuoteVersion(v => v + 1);
      };
      window.addEventListener('quote-updated', handler);
      return () => window.removeEventListener('quote-updated', handler);
    }, []);

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

    const selezionaSoloCampionati = useCallback((targetList) => {
      if (typeof setFiltro !== 'function') return;
      if (!Array.isArray(tuttiNomiCampionati) || tuttiNomiCampionati.length === 0) return;
      const nuovoFiltro = {};
      tuttiNomiCampionati.forEach(nome => {
        const isTarget = targetList.some(t => matchCampionato(nome, t));
        nuovoFiltro[nome] = isTarget;
      });
      setFiltro(nuovoFiltro);
    }, [setFiltro, tuttiNomiCampionati]);

    const handleTop5Maggiori = useCallback(() => selezionaSoloCampionati(TOP_5_MAGGIORI), [selezionaSoloCampionati]);
    const handleTop5Minori = useCallback(() => selezionaSoloCampionati(TOP_5_MINORI), [selezionaSoloCampionati]);
    const handleTop5Tutti = useCallback(() => selezionaSoloCampionati([...TOP_5_MAGGIORI, ...TOP_5_MINORI]), [selezionaSoloCampionati]);
    const handleTopCoppe = useCallback(() => selezionaSoloCampionati(TOP_COPPE), [selezionaSoloCampionati]);

    const isSelezioneUgualeA = useCallback((targetList) => {
      if (!Array.isArray(campionatiAttivi)) return false;
      const nomiTarget = tuttiNomiCampionati.filter(n => targetList.some(t => matchCampionato(n, t)));
      if (nomiTarget.length === 0) return false;
      const setAttivi = new Set(campionatiAttivi);
      return nomiTarget.length === setAttivi.size && nomiTarget.every(n => setAttivi.has(n));
    }, [campionatiAttivi, tuttiNomiCampionati]);

    const isTop5MaggioriAttivo = useMemo(() => isSelezioneUgualeA(TOP_5_MAGGIORI), [isSelezioneUgualeA]);
    const isTop5MinoriAttivo = useMemo(() => isSelezioneUgualeA(TOP_5_MINORI), [isSelezioneUgualeA]);
    const isTop5TuttiAttivo = useMemo(() => isSelezioneUgualeA([...TOP_5_MAGGIORI, ...TOP_5_MINORI]), [isSelezioneUgualeA]);
    const isTopCoppeAttivo = useMemo(() => isSelezioneUgualeA(TOP_COPPE), [isSelezioneUgualeA]);

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
        let filtroRaw = null;
        try {
          filtroRaw = window.FiltriCampionati.leggiFiltroCampionati
            ? window.FiltriCampionati.leggiFiltroCampionati()
            : null;
        } catch (e) { filtroRaw = null; }
        const nessunoEsplicitamenteSelezionato =
          filtroRaw && Object.values(filtroRaw).every(v => v === false);
        if (nessunoEsplicitamenteSelezionato) list = [];
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
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900, color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase' }}>
              📅 {titoloGiorni}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '11px', marginLeft: 'auto' }}>{partiteOggi.length} partite</span>
          </div>
          <ChampBar matches={matches} championships={championshipsList} campionatiSelezionati={campionatiAttivi} onToggle={toggleCampionato} onSelezionaTutti={selezionaTutti} onDeselezionaTutti={deselezionaTutti} />
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
            onTopCoppe={handleTopCoppe}
            isTopCoppeAttivo={isTopCoppeAttivo}
          />
          {partiteOggi.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>😴</div>
              <div style={{ color: 'var(--text-dim)' }}>Nessuna partita nei prossimi {giorni} giorni</div>
            </div>
          ) : (
            <div className="matches-grid">
              {partiteOggi.map(m => (<MatchTab key={`${m.id}-${quoteVersion}`} match={m} allMatches={matches} onSelect={onSelectMatch} selectedFamiglie={selectedFamiglie} />))}
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
          onTopCoppe={handleTopCoppe}
          isTopCoppeAttivo={isTopCoppeAttivo}
        />
        <ChampBar matches={matches} championships={championshipsList} campionatiSelezionati={campionatiAttivi} onToggle={toggleCampionato} onSelezionaTutti={selezionaTutti} onDeselezionaTutti={deselezionaTutti} />
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
            {partiteOggi.map(m => (<MatchTab key={`${m.id}-${quoteVersion}`} match={m} allMatches={matches} onSelect={onSelectMatch} selectedFamiglie={selectedFamiglie} />))}
          </div>
        )}
      </div>
    );
  }

  window.PalinsestoComponent = PalinsestoComponent;
  window.ChampLogo = ChampLogo;
  console.log('✅ Modulo Palinsesto v19 caricato — quote reattive + ⏳ + tooltip diagnostico');

})();