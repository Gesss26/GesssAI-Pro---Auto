// ============================================================
// palinsesto.js - Modulo Palinsesto
// v10: FIX switch Scelte/Calcolate + NUOVA vista "Tripla Affiancata"
//      + 3 viste: 📖 Dettagliata / ⚡ Compatta / 🔀 Tripla
//      + toggle per-card ciclico + toggle globale
//      + tutto il resto invariato (motore Dixon, TOP 5, ChampBar)
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo, useEffect, useCallback } = React;

  // ⭐ FALLBACK SICURO per useMotoreAnalisi
  if (!window.FiltriCampionati) window.FiltriCampionati = {};
  if (typeof window.FiltriCampionati.useMotoreAnalisi !== 'function') {
    window.FiltriCampionati.useMotoreAnalisi = function () {
      const [motore, setMotoreState] = React.useState(
        () => localStorage.getItem('ft_motore') || 'storico'
      );
      const setMotore = React.useCallback((v) => {
        setMotoreState(v);
        localStorage.setItem('ft_motore', v);
        window.dispatchEvent(new Event('motore-mode-changed'));
      }, []);
      return { motore, setMotore };
    };
    console.warn('⚠️ useMotoreAnalisi non trovato in filtri-campionati.js — uso fallback locale (Palinsesto v10)');
  }

  // ⭐ FALLBACK SICURO per useVisualizzaGiocateMode (FIX BUG)
  if (typeof window.FiltriCampionati.useVisualizzaGiocateMode !== 'function') {
    window.FiltriCampionati.useVisualizzaGiocateMode = function () {
      const [mode, setModeState] = React.useState(
        () => localStorage.getItem('ft_visualizza_mode') || 'scelte'
      );
      const setMode = React.useCallback((v) => {
        setModeState(v);
        localStorage.setItem('ft_visualizza_mode', v);
        window.dispatchEvent(new Event('visualizza-mode-changed'));
      }, []);
      React.useEffect(() => {
        const handler = () => setModeState(localStorage.getItem('ft_visualizza_mode') || 'scelte');
        window.addEventListener('visualizza-mode-changed', handler);
        window.addEventListener('storage', handler);
        return () => {
          window.removeEventListener('visualizza-mode-changed', handler);
          window.removeEventListener('storage', handler);
        };
      }, []);
      return { mode, setMode };
    };
    console.warn('⚠️ useVisualizzaGiocateMode non trovato — uso fallback locale (Palinsesto v10)');
  }

  // ⭐ FUNZIONE SICURA PER DIXON
  const safeGetDixonPct = (familyId, giocata, match, allMatches) => {
    if (typeof window.getDixonPct === 'function' && !window.getDixonPct._isFallback) {
      try {
        return window.getDixonPct(familyId, giocata, match, allMatches);
      } catch (e) {
        console.warn('Errore getDixonPct:', e);
        return 0;
      }
    }
    return 0;
  };

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
      if (parts.length === 2) return `MG ${parts[0]} C + MG ${parts[1]} O`;
    }
    if (familyId === 'dc_multigol') {
      const parts = label.split('+');
      if (parts.length === 2) return `${parts[0]} + ${parts[1]}`;
    }
    if (familyId === 'dc_under') {
      const parts = label.split('+');
      if (parts.length === 2) {
        const uLabel = parts[1].replace('U', 'U').replace('.', ',');
        return `${parts[0]}+${uLabel}`;
      }
    }
    if (familyId === 'dc_over') {
      const parts = label.split('+');
      if (parts.length === 2) {
        const oLabel = parts[1].replace('O', 'O').replace('.', ',');
        return `${parts[0]}+${oLabel}`;
      }
    }
    if (familyId === 'gg_ng') {
      if (label === 'Goal-Goal') return 'GG';
      if (label === 'No Goal') return 'NG';
    }
    return label;
  };

  // ============================================================
  // TOP 5
  // ============================================================
  const TOP_5_MAGGIORI = ['Serie A', 'Ligue 1', 'La Liga', 'Bundesliga', 'Premier League'];
  const TOP_5_MINORI = ['Serie B', '2. Bundesliga', 'Ligue 2', 'Segunda División', 'EFL Championship'];

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

  // ============================================================
  // QUOTA BOX
  // ============================================================
  const QuotaBox = ({ match, familyId, giocata, pctTua, compact = false }) => {
    const [quotaInfo, setQuotaInfo] = useState(null);
    const quoteCtx = window.QuoteManager && window.QuoteManager.useQuote ? window.QuoteManager.useQuote() : {};
    const numPartite = quoteCtx.numPartite || 0;
    const dataMaxPDF = quoteCtx.dataMaxPDF || null;

    useEffect(() => {
      const info = getQuotaInfo(match, familyId, giocata, pctTua);
      setQuotaInfo(info);
    }, [match.id, familyId, giocata, pctTua, numPartite, dataMaxPDF]);

    const hasQuota = quotaInfo && (quotaInfo.quotaBook !== undefined) && (quotaInfo.quotaBook !== null);
    const quotaBook = hasQuota ? quotaInfo.quotaBook : null;
    const isValue = hasQuota ? !!quotaInfo.isValue : false;

    if (!hasQuota) {
      return (
        <div
          title="Quota non disponibile nel PDF"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: compact ? '1px 5px' : '2px 6px', marginLeft: compact ? '0' : '6px', borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed var(--border)',
            fontSize: compact ? '10px' : '11px', fontWeight: 'bold', color: 'var(--text-dim)',
            whiteSpace: 'nowrap', opacity: 0.6, flexShrink: 0,
          }}
        >
          <span>💰</span><span>-.--</span>
        </div>
      );
    }

    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: compact ? '1px 5px' : '2px 6px', marginLeft: compact ? '0' : '6px', borderRadius: '4px',
        background: isValue ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${isValue ? 'var(--neon-green)' : 'var(--border)'}`,
        fontSize: compact ? '10px' : '11px', fontWeight: 'bold',
        color: isValue ? 'var(--neon-green)' : 'var(--text)',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        <span>💰</span><span>{quotaBook.toFixed(2)}</span>
        {isValue && <span style={{ fontSize: '9px' }}>⭐</span>}
      </div>
    );
  };

  // ============================================================
  // VISTA COMPATTA - Componenti visivi
  // ============================================================
  const TermometroForma = ({ formString }) => {
    if (!formString || formString === '-----') {
      return (<div style={{ height: '8px', background: 'var(--bg-deep)', borderRadius: '4px', opacity: 0.5 }} />);
    }
    const v = [...formString].filter(c => c === 'V').length;
    const p = [...formString].filter(c => c === 'P').length;
    const s = [...formString].filter(c => c === 'S').length;

    return (
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
        {Array(v).fill(0).map((_, i) => (
          <div key={`v${i}`} style={{ flex: 1, background: 'var(--neon-green)', boxShadow: '0 0 6px var(--neon-green)' }} />
        ))}
        {Array(p).fill(0).map((_, i) => (
          <div key={`p${i}`} style={{ flex: 1, background: 'var(--neon-gold)' }} />
        ))}
        {Array(s).fill(0).map((_, i) => (
          <div key={`s${i}`} style={{ flex: 1, background: 'var(--neon-red)' }} />
        ))}
      </div>
    );
  };

  const BarraPct = ({ pct, isBomb }) => {
    const colore = pct >= 90 ? 'var(--neon-gold)'
                 : pct >= 66 ? 'var(--neon-green)'
                 : pct >= 33 ? 'var(--text-dim)'
                 : 'var(--neon-red)';
    const icona = isBomb ? '💣' : pct >= 66 ? '🔥' : pct >= 33 ? '•' : '▫️';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
        <span style={{ fontSize: '14px', minWidth: '18px', textAlign: 'center' }}>{icona}</span>
        <div style={{
          flex: 1, height: '12px', background: 'var(--bg-deep)',
          borderRadius: '6px', overflow: 'hidden', border: `1px solid ${colore}40`,
        }}>
          <div style={{
            width: `${Math.min(pct, 100)}%`, height: '100%',
            background: `linear-gradient(90deg, ${colore}, ${colore}88)`,
            boxShadow: `0 0 6px ${colore}`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 900, color: colore, minWidth: '32px', textAlign: 'right', fontFamily: 'Orbitron, sans-serif' }}>
          {pct}%
        </span>
      </div>
    );
  };

  const BadgeAccordo = ({ pctStorico, pctDixon }) => {
    if (!pctDixon || pctDixon <= 0) return null;
    const delta = pctDixon - pctStorico;
    const abs = Math.abs(delta);

    if (abs <= 3) {
      return (
        <span title={`Concordi: Storico ${pctStorico}% / Dixon ${pctDixon}%`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '2px',
            padding: '1px 5px', borderRadius: '8px', fontSize: '9px',
            background: 'var(--neon-green)', color: '#000', fontWeight: 900,
          }}>⚖️ ✓</span>
      );
    }
    if (abs > 10) {
      return (
        <span title={`Divergenza: Storico ${pctStorico}% / Dixon ${pctDixon}%`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '2px',
            padding: '1px 5px', borderRadius: '8px', fontSize: '9px',
            background: 'var(--neon-gold)', color: '#000', fontWeight: 900,
          }}>⚖️ ⚠️</span>
      );
    }
    return null;
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

  // ⭐ Ciclo vista: dettagliata → compatta → tripla → dettagliata
  const VISTE_CICLO = ['dettagliata', 'compatta', 'tripla'];
  const VISTA_ICONE = { dettagliata: '📖', compatta: '⚡', tripla: '🔀' };
  const VISTA_NOMI = { dettagliata: 'Dettagliata', compatta: 'Compatta', tripla: 'Tripla' };

  const getVistaIniziale = () => {
    const v = localStorage.getItem('ft_vista_mode');
    return VISTE_CICLO.includes(v) ? v : 'dettagliata';
  };

  // ============================================================
  // MATCH TAB — v10 con 3 viste
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
    const { motore } = window.FiltriCampionati.useMotoreAnalisi();

    const [vista, setVista] = useState(getVistaIniziale);

    useEffect(() => {
      const handler = () => setVista(getVistaIniziale());
      window.addEventListener('vista-mode-changed', handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('vista-mode-changed', handler);
        window.removeEventListener('storage', handler);
      };
    }, []);

    const toggleVista = (e) => {
      e.stopPropagation();
      const currentIdx = VISTE_CICLO.indexOf(vista);
      const nextVista = VISTE_CICLO[(currentIdx + 1) % VISTE_CICLO.length];
      setVista(nextVista);
      localStorage.setItem('ft_vista_mode', nextVista);
      window.dispatchEvent(new Event('vista-mode-changed'));
    };

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

    const famiglieDaAnalizzare = useMemo(() => {
      if (stats.error) return [];
      let ids;
      if (visualizzaMode === 'calcolate') ids = Object.keys(FAMIGLIE_GIOCATE);
      else ids = selectedFamiglie || [];
      return [...new Set(ids)].filter(id => FAMIGLIE_GIOCATE[id]);
    }, [visualizzaMode, selectedFamiglie, stats.error]);

    const bestStoricoPerFamiglia = useMemo(() => {
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
    }, [famiglieDaAnalizzare, match.id, allMatches.length]);

    const righeDaMostrare = useMemo(() => {
      if (stats.error) return [];

      if (motore === 'storico') {
        return bestStoricoPerFamiglia
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 3)
          .map(g => ({ ...g, pctDixon: null, delta: null, fonte: 'storico' }));
      }

      if (motore === 'dixon') {
        return bestDixonPerFamiglia
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 3)
          .map(g => ({ ...g, pctDixon: g.pct, delta: null, fonte: 'dixon' }));
      }

      if (motore === 'confronto' && visualizzaMode === 'scelte') {
        return bestStoricoPerFamiglia
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 3)
          .map(g => {
            const pctDixon = getDixonPct ? getDixonPct(g.familyId, g.giocata, match, allMatches) : 0;
            const hasDixon = pctDixon > 0;
            const delta = hasDixon ? pctDixon - g.pct : null;
            return { ...g, pctDixon: hasDixon ? pctDixon : 0, delta, fonte: 'storico' };
          });
      }

      if (motore === 'confronto' && visualizzaMode === 'calcolate') {
        const tutte = [];
        famiglieDaAnalizzare.forEach(familyId => {
          const family = FAMIGLIE_GIOCATE[familyId];
          if (!family) return;
          family.options.forEach(opt => {
            const pctStorico = getGiocataPct(opt, stats, stats.homeMG, stats.awayMG, stats.mgTot) || 0;
            const pctDixon = getDixonPct ? getDixonPct(familyId, opt, match, allMatches) : 0;
            if (pctStorico <= 0 && pctDixon <= 0) return;
            tutte.push({
              familyId, familyLabel: family.label, familyIcon: family.icon,
              label: opt, giocata: opt, displayLabel: formatGiocataLabel(familyId, opt),
              pct: pctStorico, pctDixon,
              max: Math.max(pctStorico, pctDixon),
              isBomb: Math.max(pctStorico, pctDixon) >= 90,
            });
          });
        });
        return tutte
          .sort((a, b) => b.max - a.max)
          .slice(0, 3)
          .map(g => {
            const hasDixon = g.pctDixon > 0;
            const delta = hasDixon ? g.pctDixon - g.pct : null;
            let fonte = 'concordi';
            if (!hasDixon) fonte = 'storico';
            else if (Math.abs(delta) > 3) fonte = delta > 0 ? 'dixon' : 'storico';
            return { ...g, delta, fonte };
          });
      }

      return [];
    }, [motore, visualizzaMode, bestStoricoPerFamiglia, bestDixonPerFamiglia, stats, match.id, allMatches.length]);

    // ⭐ Per la vista TRIPLA: prendo le top 3 sia da storico che da dixon
    const topTripla = useMemo(() => {
      if (stats.error) return [];
      const topStorico = bestStoricoPerFamiglia.sort((a, b) => b.pct - a.pct).slice(0, 3);
      const topDixon = bestDixonPerFamiglia.sort((a, b) => b.pct - a.pct).slice(0, 3);
      const maxLen = Math.max(topStorico.length, topDixon.length);
      const result = [];
      for (let i = 0; i < maxLen; i++) {
        const s = topStorico[i] || null;
        const d = topDixon[i] || null;
        // Determina la giocata "vincente" per la colonna quota (la % più alta)
        let quotaSource = null;
        if (s && d) {
          quotaSource = s.pct >= d.pct ? s : d;
        } else {
          quotaSource = s || d;
        }
        result.push({ storico: s, dixon: d, quotaSource });
      }
      return result;
    }, [bestStoricoPerFamiglia, bestDixonPerFamiglia, stats.error]);

    const score = useMemo(() => {
      if (righeDaMostrare.length === 0) return 0;
      const sum = righeDaMostrare.reduce((s, g) => {
        const v = motore === 'dixon' ? (g.pctDixon ?? g.pct)
                : motore === 'confronto' ? Math.max(g.pct, g.pctDixon ?? 0)
                : g.pct;
        return s + v;
      }, 0);
      return Math.round(sum / righeDaMostrare.length);
    }, [righeDaMostrare, motore]);

    const hasBomb = righeDaMostrare.some(g => g.isBomb);
    const rischio = getRischioCard(righeDaMostrare);
    const handleClick = (e) => { e.stopPropagation(); onSelect(match.id); };
    const formattedDate = match.data ? formatDateEU(match.data) : 'N/D';

    const neonBorderStyle = {
      border: `2px solid ${champColor}`,
      borderLeftWidth: '6px',
      borderLeftColor: rischio.colore,
      boxShadow: `0 0 12px ${champColor}88, 0 0 4px ${champColor}44, inset 0 0 8px ${champColor}11`,
    };

    // ============================================================
    // 📖 RIGA DETTAGLIATA (originale)
    // ============================================================
    const renderRigaDettagliata = (g, idx) => {
      const isBomb = g.isBomb;
      const pctColor = getColorForPct(g.pct);

      if (motore === 'storico') {
        return (
          <div key={idx} className={`bet-item-vertical ${isBomb ? 'bomb' : ''}`} style={{ borderColor: pctColor }}>
            <span className="bet-label" style={{ color: isBomb ? 'var(--neon-gold)' : pctColor, fontWeight: 700 }}>
              {isBomb && '💣 '}{g.displayLabel || g.label}
            </span>
            <span className="bet-value" style={{ flexShrink: 0 }}>
              <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`}>{g.pct}%</span>
              <QuotaBox match={match} familyId={g.familyId} giocata={g.giocata} pctTua={g.pct} />
            </span>
          </div>
        );
      }

      if (motore === 'dixon') {
        const pct = g.pctDixon ?? g.pct;
        return (
          <div key={idx} className={`bet-item-vertical ${isBomb ? 'bomb' : ''}`}
            style={{ borderColor: isBomb ? 'var(--neon-gold)' : 'var(--neon-magenta)' }}>
            <span className="bet-label" style={{ color: isBomb ? 'var(--neon-gold)' : 'var(--neon-magenta)', fontWeight: 700 }}>
              {isBomb && '💣 '}{g.displayLabel || g.label}
            </span>
            <span className="bet-value" style={{ flexShrink: 0 }}>
              <span className={`giocata-pct ${getPercentualeClasse(pct)}`}>{pct}%</span>
              <QuotaBox match={match} familyId={g.familyId} giocata={g.giocata} pctTua={pct} />
            </span>
          </div>
        );
      }

      const { pct, pctDixon, delta, fonte } = g;
      const hasDixon = pctDixon > 0;

      const accordo = hasDixon && delta != null && Math.abs(delta) <= 3;
      const divergenza = hasDixon && delta != null && Math.abs(delta) > 10;

      const bordo = accordo ? 'var(--neon-green)' : divergenza ? 'var(--neon-gold)' : 'var(--border)';
      const freccia = delta > 0 ? '↗' : delta < 0 ? '↘' : '↔';
      const coloreDelta = delta > 0 ? 'var(--neon-green)' : delta < 0 ? 'var(--neon-red)' : 'var(--text-dim)';

      const badgeFonte = {
        storico:  { txt: '📊', color: 'var(--neon-cyan)' },
        dixon:    { txt: '🧮', color: 'var(--neon-magenta)' },
        concordi: { txt: '⚖️', color: 'var(--neon-green)' },
      }[fonte] || null;

      const pctTuaQuota = hasDixon ? Math.min(pct, pctDixon) : pct;

      return (
        <div key={idx} className={`bet-item-vertical ${isBomb ? 'bomb' : ''}`} style={{ borderColor: bordo }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
              <span style={{ color: isBomb ? 'var(--neon-gold)' : 'var(--text)', fontWeight: 700, fontSize: '11px' }}>
                {isBomb && '💣 '}{g.displayLabel || g.label}
              </span>
              {badgeFonte && (
                <span title={`Fonte: ${fonte}`} style={{
                  fontSize: '10px', color: badgeFonte.color,
                  border: `1px solid ${badgeFonte.color}`, borderRadius: '4px',
                  padding: '0 4px', fontWeight: 900, flexShrink: 0,
                }}>{badgeFonte.txt}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
              <span title="Statistiche storiche">📊 <b>{pct}%</b></span>
              {hasDixon && (
                <>
                  <span style={{ color: 'var(--text-dim)' }}>→</span>
                  <span title="Dixon-Coles" style={{ color: 'var(--neon-magenta)' }}>
                    🧮 <b>{pctDixon}%</b>
                  </span>
                </>
              )}
              {hasDixon && delta != null && (
                <span style={{ color: coloreDelta, fontWeight: 900, fontSize: '10px' }}>
                  {freccia} {delta > 0 ? '+' : ''}{delta}
                </span>
              )}
              {accordo && (
                <span style={{
                  fontSize: '9px', color: 'var(--neon-green)',
                  border: '1px solid var(--neon-green)', borderRadius: '4px',
                  padding: '0 4px', fontWeight: 900,
                }}>✅</span>
              )}
              {divergenza && (
                <span style={{
                  fontSize: '9px', color: 'var(--neon-gold)',
                  border: '1px solid var(--neon-gold)', borderRadius: '4px',
                  padding: '0 4px', fontWeight: 900,
                }}>⚠️</span>
              )}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <QuotaBox match={match} familyId={g.familyId} giocata={g.giocata} pctTua={pctTuaQuota} />
          </div>
        </div>
      );
    };

    // ============================================================
    // ⚡ RIGA COMPATTA
    // ============================================================
    const renderRigaCompatta = (g, idx) => {
      const pctBase = motore === 'dixon' ? (g.pctDixon ?? g.pct)
                      : motore === 'confronto' ? Math.max(g.pct || 0, g.pctDixon || 0)
                      : g.pct;
      const pctPerQuota = motore === 'confronto' && g.pctDixon > 0
        ? Math.min(g.pct, g.pctDixon)
        : pctBase;

      const colore = pctBase >= 90 ? 'var(--neon-gold)'
                   : pctBase >= 66 ? 'var(--neon-green)'
                   : pctBase >= 33 ? 'var(--text-dim)'
                   : 'var(--neon-red)';

      return (
        <div key={idx} style={{
          display: 'flex', flexDirection: 'column', gap: '4px',
          padding: '6px 8px', borderRadius: '8px',
          background: `linear-gradient(90deg, ${colore}15, transparent)`,
          border: `1px solid ${colore}50`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: colore,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {g.isBomb && '💣 '}{g.displayLabel || g.label}
              </span>
              {motore === 'confronto' && g.pctDixon > 0 && (
                <BadgeAccordo pctStorico={g.pct} pctDixon={g.pctDixon} />
              )}
            </div>
            <QuotaBox match={match} familyId={g.familyId} giocata={g.giocata} pctTua={pctPerQuota} />
          </div>
          <BarraPct pct={pctBase} isBomb={g.isBomb} />
        </div>
      );
    };

    // ============================================================
    // 🔀 RIGA TRIPLA (nuova vista a 3 colonne)
    // ============================================================
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

            return (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '4px',
                padding: '6px',
                background: 'var(--bg-elevated)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}>
                {/* Col 1: Storico */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  padding: '6px 8px', borderRadius: '6px',
                  background: s ? 'rgba(0, 245, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: s ? '1px solid var(--neon-cyan)' : '1px dashed var(--border)',
                  minHeight: '52px',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    fontSize: '9px', color: 'var(--neon-cyan)', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center',
                  }}>📊 Storico</div>
                  {s ? (
                    <>
                      <div style={{
                        fontSize: '10px', fontWeight: 700, color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        textAlign: 'center',
                      }}>{s.displayLabel || s.label}</div>
                      <div style={{
                        fontSize: '16px', fontWeight: 900, fontFamily: 'Orbitron, sans-serif',
                        color: s.pct >= 90 ? 'var(--neon-gold)' : s.pct >= 66 ? 'var(--neon-green)' : s.pct >= 33 ? 'var(--text-dim)' : 'var(--neon-red)',
                        textAlign: 'center', lineHeight: 1.1,
                      }}>
                        {s.pct}%{s.isBomb && <span style={{ fontSize: '10px', marginLeft: '2px' }}>💣</span>}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>—</div>
                  )}
                </div>

                {/* Col 2: Dixon */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  padding: '6px 8px', borderRadius: '6px',
                  background: d ? 'rgba(255, 0, 229, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: d ? '1px solid var(--neon-magenta)' : '1px dashed var(--border)',
                  minHeight: '52px',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    fontSize: '9px', color: 'var(--neon-magenta)', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center',
                  }}>🧮 Dixon</div>
                  {d ? (
                    <>
                      <div style={{
                        fontSize: '10px', fontWeight: 700, color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        textAlign: 'center',
                      }}>{d.displayLabel || d.label}</div>
                      <div style={{
                        fontSize: '16px', fontWeight: 900, fontFamily: 'Orbitron, sans-serif',
                        color: d.pct >= 90 ? 'var(--neon-gold)' : d.pct >= 66 ? 'var(--neon-green)' : d.pct >= 33 ? 'var(--text-dim)' : 'var(--neon-red)',
                        textAlign: 'center', lineHeight: 1.1,
                      }}>
                        {d.pct}%{d.isBomb && <span style={{ fontSize: '10px', marginLeft: '2px' }}>💣</span>}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>—</div>
                  )}
                </div>

                {/* Col 3: Quota (della giocata con % più alta) */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  padding: '6px 8px', borderRadius: '6px',
                  background: q ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: q ? '1px solid var(--neon-green)' : '1px dashed var(--border)',
                  minHeight: '52px',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <div style={{
                    fontSize: '9px', color: 'var(--neon-green)', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center',
                  }}>💰 Quota</div>
                  {q ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px' }}>
                        <QuotaBox
                          match={match}
                          familyId={q.familyId}
                          giocata={q.giocata}
                          pctTua={q.pct}
                          compact={true}
                        />
                      </div>
                      <div style={{
                        fontSize: '9px', color: 'var(--text-dim)',
                        textAlign: 'center', marginTop: '2px',
                      }}>
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

    // ============================================================
    // Render riga in base alla vista
    // ============================================================
    const renderRigheContenuto = () => {
      if (vista === 'tripla') {
        return renderRigaTripla();
      }
      const renderRiga = vista === 'compatta' ? renderRigaCompatta : renderRigaDettagliata;
      return (
        <div className="bet-row-vertical">
          {righeDaMostrare.length > 0 ? (
            righeDaMostrare.map((g, idx) => renderRiga(g, idx))
          ) : (
            <div className="bet-item-vertical" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
              <span>Nessuna giocata</span>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="match-tab"
        style={neonBorderStyle}
        onClick={handleClick}>
        <div className="score-badge" style={{
          background: `${rischio.colore}22`,
          border: `2px solid ${rischio.colore}`,
          color: rischio.colore,
          padding: '2px 10px',
          borderRadius: '10px',
          boxShadow: `0 0 10px ${rischio.colore}66`,
        }}>
          <span style={{ fontSize: '14px', marginRight: '4px' }}>{rischio.label}</span>
          <span className={`giocata-pct ${getPercentualeClasse(score)}`} style={{ fontSize: '13px' }}>
            {isNaN(score) ? 0 : score}%
          </span>
          {hasBomb && <span className="bomb-inline">💣</span>}
        </div>

        <button
          onClick={toggleVista}
          title={`Vista: ${VISTA_NOMI[vista]} (clicca per cambiare)`}
          style={{
            position: 'absolute', top: '10px', right: '110px',
            background: 'var(--neon-cyan)',
            color: '#000',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 700,
            zIndex: 11,
          }}
        >
          {VISTA_ICONE[vista]}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <div className="tab-header" style={{ background: champColor, marginBottom: 0 }}>
            <ChampLogo campionato={match.campionato} size={16} />
            <span>{match.campionato || 'N/D'}</span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--neon-cyan)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>G.{match.round || 'N/A'}</span>
          {motore === 'dixon' && (
            <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--neon-magenta)', border: '1px solid var(--neon-magenta)', padding: '2px 6px', borderRadius: '4px' }}>🧮 DC</span>
          )}
          {motore === 'confronto' && (
            <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--neon-gold)', border: '1px solid var(--neon-gold)', padding: '2px 6px', borderRadius: '4px' }}>⚖️ CONFRONTO</span>
          )}
          <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-dim)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
            {VISTA_ICONE[vista]} {VISTA_NOMI[vista]}
          </span>
        </div>

        <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginBottom: '6px', textAlign: 'center' }}>📅 {formattedDate} • ⏰ {match.ora || 'TBD'}</div>

        <div className="teams-row">
          <div className="team"><TeamLogo teamName={match.casa} championship={match.campionato} size={50} /><div className="team-name">{match.casa || 'Casa'}</div></div>
          <div className="vs">VS</div>
          <div className="team"><TeamLogo teamName={match.ospiti} championship={match.campionato} size={50} /><div className="team-name">{match.ospiti || 'Ospite'}</div></div>
        </div>

        {vista === 'compatta' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', marginBottom: '6px' }}>
            <div style={{ padding: '6px 8px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', textAlign: 'center' }}>
                🏠 {homeForm.pct || 0}%
              </div>
              <TermometroForma formString={homeForm.form} />
            </div>
            <div style={{ padding: '6px 8px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', textAlign: 'center' }}>
                ✈️ {awayForm.pct || 0}%
              </div>
              <TermometroForma formString={awayForm.form} />
            </div>
          </div>
        ) : (
          <div className="form-row-compact">
            <div className="form-block-compact"><div className="form-label">Forma</div><div className="form-squares">{renderFormSquares(homeForm.form)}</div><div className="form-pct-compact">{homeForm.pct || 0}%</div></div>
            <div className="form-block-compact"><div className="form-label">Forma</div><div className="form-squares">{renderFormSquares(awayForm.form)}</div><div className="form-pct-compact">{awayForm.pct || 0}%</div></div>
          </div>
        )}

        <div className="form-diff">📊 Differenza forma: <span className={diff >= 20 ? 'diff-alta' : 'diff-bassa'}>{isNaN(diff) ? 0 : diff}%</span></div>

        {renderRigheContenuto()}
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
  // VISUALIZZA GIOCATE SWITCH (con FIX sincronizzazione)
  // ============================================================
  const VisualizzaGiocateSwitch = ({
    mode, setMode, motore, setMotore,
    selectedFamiglie,
    onTop5Maggiori, onTop5Minori, onTop5Tutti,
    isTop5MaggioriAttivo, isTop5MinoriAttivo, isTop5TuttiAttivo,
  }) => {
    const countScelte = (selectedFamiglie || []).length;
    const totalFamiglie = Object.keys(window.FAMIGLIE_GIOCATE || {}).length;
    const { giorni, setGiorni } = window.FiltriCampionati.useGiorniRange();

    const [vista, setVista] = useState(getVistaIniziale);

    useEffect(() => {
      const handler = () => setVista(getVistaIniziale());
      window.addEventListener('vista-mode-changed', handler);
      return () => window.removeEventListener('vista-mode-changed', handler);
    }, []);

    const cambiaVista = (nuovaVista) => {
      localStorage.setItem('ft_vista_mode', nuovaVista);
      setVista(nuovaVista);
      window.dispatchEvent(new Event('vista-mode-changed'));
    };

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

        <span style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-magenta)', textTransform: 'uppercase' }}>
          🔬 Motore
        </span>
        <div style={{
          display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px',
          padding: '3px', border: '1px solid var(--border)'
        }}>
          <button onClick={() => setMotore('storico')}
            style={{
              padding: '6px 14px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: motore === 'storico' ? 'var(--neon-green)' : 'transparent',
              color: motore === 'storico' ? '#000' : 'var(--text-dim)'
            }}
          >📊 Storico</button>
          <button onClick={() => setMotore('dixon')}
            style={{
              padding: '6px 14px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: motore === 'dixon' ? 'var(--neon-magenta)' : 'transparent',
              color: motore === 'dixon' ? '#000' : 'var(--text-dim)'
            }}
          >🧮 Dixon</button>
          <button onClick={() => setMotore('confronto')}
            style={{
              padding: '6px 14px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: motore === 'confronto' ? 'var(--neon-gold)' : 'transparent',
              color: motore === 'confronto' ? '#000' : 'var(--text-dim)'
            }}
          >⚖️ Confronto</button>
        </div>

        <span style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
          👁️ Vista
        </span>
        <div style={{
          display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px',
          padding: '3px', border: '1px solid var(--border)'
        }}>
          <button onClick={() => cambiaVista('dettagliata')}
            style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: vista === 'dettagliata' ? 'var(--neon-cyan)' : 'transparent',
              color: vista === 'dettagliata' ? '#000' : 'var(--text-dim)'
            }}
            title="Vista dettagliata"
          >📖</button>
          <button onClick={() => cambiaVista('compatta')}
            style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: vista === 'compatta' ? 'var(--neon-cyan)' : 'transparent',
              color: vista === 'compatta' ? '#000' : 'var(--text-dim)'
            }}
            title="Vista compatta (a colpo d'occhio)"
          >⚡</button>
          <button onClick={() => cambiaVista('tripla')}
            style={{
              padding: '6px 12px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: vista === 'tripla' ? 'var(--neon-cyan)' : 'transparent',
              color: vista === 'tripla' ? '#000' : 'var(--text-dim)'
            }}
            title="Vista tripla (Storico | Dixon | Quota)"
          >🔀</button>
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
    const { motore, setMotore } = window.FiltriCampionati.useMotoreAnalisi();
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
          <VisualizzaGiocateSwitch mode={visualizzaMode} setMode={setVisualizzaMode} motore={motore} setMotore={setMotore} selectedFamiglie={selectedFamiglie} onTop5Maggiori={handleTop5Maggiori} onTop5Minori={handleTop5Minori} onTop5Tutti={handleTop5Tutti} isTop5MaggioriAttivo={isTop5MaggioriAttivo} isTop5MinoriAttivo={isTop5MinoriAttivo} isTop5TuttiAttivo={isTop5TuttiAttivo} />
          {partiteOggi.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>😴</div>
              <div style={{ color: 'var(--text-dim)' }}>Nessuna partita nei prossimi {giorni} giorni</div>
            </div>
          ) : (
            <div className="matches-grid">
              {partiteOggi.map(m => (<MatchTab key={m.id} match={m} allMatches={matches} onSelect={onSelectMatch} selectedFamiglie={selectedFamiglie} />))}
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
        <VisualizzaGiocateSwitch mode={visualizzaMode} setMode={setVisualizzaMode} motore={motore} setMotore={setMotore} selectedFamiglie={selectedFamiglie} onTop5Maggiori={handleTop5Maggiori} onTop5Minori={handleTop5Minori} onTop5Tutti={handleTop5Tutti} isTop5MaggioriAttivo={isTop5MaggioriAttivo} isTop5MinoriAttivo={isTop5MinoriAttivo} isTop5TuttiAttivo={isTop5TuttiAttivo} />
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
            {partiteOggi.map(m => (<MatchTab key={m.id} match={m} allMatches={matches} onSelect={onSelectMatch} selectedFamiglie={selectedFamiglie} />))}
          </div>
        )}
      </div>
    );
  }

  window.PalinsestoComponent = PalinsestoComponent;
  window.ChampLogo = ChampLogo;
  console.log('✅ Modulo Palinsesto v10 caricato — FIX switch Scelte/Calcolate + Vista Tripla');

})();