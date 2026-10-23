// ============================================================
// schedina.js - Modulo Schedina con quote PDF visibili
// v9.8: + switch Storico/Dixon-Coles (Schedina Classica + Quota)
//       griglia 5x5 con badge oggi/2 giorni + tutti i campionati
//       sub-tabs uniformi (CSS gestisce larghezza/altezza fisse)
// ============================================================

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
// NORMALIZZA ACCENTI
// ============================================================
const normalizzaAccenti = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae');
};

// ============================================================
// CHAMP LOGO (con sfondo chiaro per loghi scuri)
// ============================================================
const ChampLogoSchedina = ({ campionato, size = 24 }) => {
  const [hasError, setHasError] = React.useState(false);
  const [pathIndex, setPathIndex] = React.useState(0);

  const MAPPA_FILE_LOGHI = {
    'EFL Championship': 'championship',
    'Serie C - Girone A': 'serie-c',
    'Serie C - Girone B': 'serie-c',
    'Serie C - Girone C': 'serie-c',
  };

  const isCampionatoScuro = (champ) => {
    if (!champ) return false;
    const c = champ.toLowerCase();
    if (c.includes('uefa') || c.includes('champions') || c.includes('europa') || c.includes('conference') || c.includes('nations')) return true;
    if (c === 'efl championship' || c.includes('eredivisie') || c.includes('primeira')) return true;
    return false;
  };

  const getPaths = (champ) => {
    if (!champ) return [];
    const override = MAPPA_FILE_LOGHI[champ];
    if (override) {
      return [
        `logos/campionati/${override}.png`,
        `logos/campionati/${override}.jpg`,
      ];
    }
    const normalized = normalizzaAccenti(champ);
    const kebab = normalized
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');
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
  const needsLightBg = isCampionatoScuro(campionato);

  if (hasError || pathIndex >= paths.length || paths.length === 0) {
    const color = window.getChampColor(campionato);
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', color: '#000', fontSize: size * 0.38, flexShrink: 0,
      }}>
        {campionato.substring(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      borderRadius: '4px',
      backgroundColor: needsLightBg ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
      padding: needsLightBg ? '2px' : '0',
      boxSizing: 'border-box',
    }}>
      <img
        key={paths[pathIndex]}
        src={paths[pathIndex]}
        alt={campionato}
        onError={() => {
          if (pathIndex + 1 < paths.length) setPathIndex(pathIndex + 1);
          else setHasError(true);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
};

// ============================================================
// HOOK: MODALITÀ STATISTICHE (condiviso tra Schedina Classica e Quota)
// 'storico' → statistiche reali | 'dixon' → Dixon-Coles
// ============================================================
const useModeStatisticheSchedina = () => {
  const { useState, useEffect } = React;
  const [mode, setModeState] = useState(
    () => localStorage.getItem('ft_schedina_mode') || 'storico'
  );

  const setMode = React.useCallback((v) => {
    const val = v === 'dixon' ? 'dixon' : 'storico';
    setModeState(val);
    localStorage.setItem('ft_schedina_mode', val);
    window.dispatchEvent(new Event('schedina-mode-updated'));
  }, []);

  useEffect(() => {
    const handler = () => setModeState(localStorage.getItem('ft_schedina_mode') || 'storico');
    window.addEventListener('schedina-mode-updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('schedina-mode-updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return { mode, setMode };
};

// ============================================================
// SWITCH: STATISTICHE / DIXON-COLES
// ============================================================
const SwitchModeStatistiche = ({ mode, setMode }) => {
  const isStorico = mode !== 'dixon';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', marginBottom: '16px',
      background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.06), rgba(255, 0, 229, 0.06))',
      borderRadius: '12px', border: '1px solid var(--border)',
      flexWrap: 'wrap', justifyContent: 'center',
    }}>
      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        🔀 Motore
      </span>
      <div style={{
        display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px',
        padding: '3px', border: '1px solid var(--border)', gap: '2px',
      }}>
        <button
          onClick={() => setMode('storico')}
          style={{
            padding: '7px 18px', fontSize: '12px', fontWeight: 700,
            borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: isStorico ? 'var(--neon-cyan)' : 'transparent',
            color: isStorico ? '#000' : 'var(--text-dim)',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          title="Usa le statistiche storiche reali (medie squadre)"
        >
          📊 Storico
        </button>
        <button
          onClick={() => setMode('dixon')}
          style={{
            padding: '7px 18px', fontSize: '12px', fontWeight: 700,
            borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: !isStorico ? 'var(--neon-magenta, #ff00e5)' : 'transparent',
            color: !isStorico ? '#000' : 'var(--text-dim)',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          title="Usa il modello Dixon-Coles (matrice esatta λ + assenze)"
        >
          🧮 Dixon-Coles
        </button>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
        {isStorico
          ? '📈 Medie storiche reali delle due squadre'
          : '🧮 Matrice esatta Poisson + correzione τ + assenze'}
      </span>
    </div>
  );
};

// ============================================================
// GRUPPI GIOCATE
// ============================================================
const GRUPPI_GIOCATE = [
  { familyId: 'fisse', label: 'FISSE', icon: '🎯',
    giocate: [
      { giocata: '1', label: '1' },
      { giocata: 'X', label: 'X' },
      { giocata: '2', label: '2' },
    ] },
  { familyId: 'dc', label: 'DOPPIA CHANCE', icon: '🛡️',
    giocate: [
      { giocata: '1X', label: '1X' },
      { giocata: '12', label: '12' },
      { giocata: 'X2', label: 'X2' },
    ] },
  { familyId: 'over', label: 'OVER', icon: '⬆️',
    giocate: [
      { giocata: 'Over 1.5', label: 'Over 1.5' },
      { giocata: 'Over 2.5', label: 'Over 2.5' },
      { giocata: 'Over 3.5', label: 'Over 3.5' },
      { giocata: 'Over 4.5', label: 'Over 4.5' },
    ] },
  { familyId: 'under', label: 'UNDER', icon: '⬇️',
    giocate: [
      { giocata: 'Under 1.5', label: 'Under 1.5' },
      { giocata: 'Under 2.5', label: 'Under 2.5' },
      { giocata: 'Under 3.5', label: 'Under 3.5' },
      { giocata: 'Under 4.5', label: 'Under 4.5' },
    ] },
  { familyId: 'gg_ng', label: 'GG - NG', icon: '⚽',
    giocate: [
      { giocata: 'GG', label: 'GG' },
      { giocata: 'NG', label: 'NG' },
    ] },
  { familyId: 'multigol', label: 'MULTIGOL CASA', icon: '📊',
    giocate: [
      { giocata: 'MG Casa 0-2', label: 'MG Casa 0-2' },
      { giocata: 'MG Casa 1-3', label: 'MG Casa 1-3' },
      { giocata: 'MG Casa 2-5', label: 'MG Casa 2-5' },
    ] },
  { familyId: 'multigol', label: 'MULTIGOL OSPITE', icon: '📊',
    giocate: [
      { giocata: 'MG Ospite 0-2', label: 'MG Ospite 0-2' },
      { giocata: 'MG Ospite 1-3', label: 'MG Ospite 1-3' },
      { giocata: 'MG Ospite 2-5', label: 'MG Ospite 2-5' },
    ] },
  { familyId: 'multigol', label: 'MULTIGOL TOTALE', icon: '📊',
    giocate: [
      { giocata: 'MG Tot 1-4', label: 'MG Tot 1-4' },
      { giocata: 'MG Tot 2-5', label: 'MG Tot 2-5' },
    ] },
  { familyId: 'dc_over', label: 'DC + OVER', icon: '🔗',
    giocate: [
      { giocata: '1X+O1.5', label: '1X+Over 1.5' },
      { giocata: '12+O1.5', label: '12+Over 1.5' },
      { giocata: 'X2+O1.5', label: 'X2+Over 1.5' },
      { giocata: '1X+O2.5', label: '1X+Over 2.5' },
      { giocata: '12+O2.5', label: '12+Over 2.5' },
      { giocata: 'X2+O2.5', label: 'X2+Over 2.5' },
      { giocata: '1X+O3.5', label: '1X+Over 3.5' },
      { giocata: '12+O3.5', label: '12+Over 3.5' },
      { giocata: 'X2+O3.5', label: 'X2+Over 3.5' },
      { giocata: '1X+O4.5', label: '1X+Over 4.5' },
      { giocata: '12+O4.5', label: '12+Over 4.5' },
      { giocata: 'X2+O4.5', label: 'X2+Over 4.5' },
    ] },
  { familyId: 'dc_under', label: 'DC + UNDER', icon: '🔗',
    giocate: [
      { giocata: '1X+U1.5', label: '1X+Under 1.5' },
      { giocata: '12+U1.5', label: '12+Under 1.5' },
      { giocata: 'X2+U1.5', label: 'X2+Under 1.5' },
      { giocata: '1X+U2.5', label: '1X+Under 2.5' },
      { giocata: '12+U2.5', label: '12+Under 2.5' },
      { giocata: 'X2+U2.5', label: 'X2+Under 2.5' },
      { giocata: '1X+U3.5', label: '1X+Under 3.5' },
      { giocata: '12+U3.5', label: '12+Under 3.5' },
      { giocata: 'X2+U3.5', label: 'X2+Under 3.5' },
      { giocata: '1X+U4.5', label: '1X+Under 4.5' },
      { giocata: '12+U4.5', label: '12+Under 4.5' },
      { giocata: 'X2+U4.5', label: 'X2+Under 4.5' },
    ] },
  { familyId: 'mg_casa_ospite', label: 'MG CASA + OSPITE', icon: '⚔️',
    giocate: [
      { giocata: '0-2+0-2', label: '0-2 Casa + 0-2 Ospite' },
      { giocata: '0-2+1-3', label: '0-2 Casa + 1-3 Ospite' },
      { giocata: '0-2+2-5', label: '0-2 Casa + 2-5 Ospite' },
      { giocata: '1-3+0-2', label: '1-3 Casa + 0-2 Ospite' },
      { giocata: '1-3+1-3', label: '1-3 Casa + 1-3 Ospite' },
      { giocata: '1-3+2-5', label: '1-3 Casa + 2-5 Ospite' },
      { giocata: '2-5+0-2', label: '2-5 Casa + 0-2 Ospite' },
      { giocata: '2-5+1-3', label: '2-5 Casa + 1-3 Ospite' },
      { giocata: '2-5+2-5', label: '2-5 Casa + 2-5 Ospite' },
    ] },
  { familyId: 'dc_multigol', label: 'DC + MULTIGOL', icon: '🔗',
    giocate: [
      { giocata: '1X+MG Tot 1-4', label: '1X+MG Tot 1-4' },
      { giocata: '12+MG Tot 1-4', label: '12+MG Tot 1-4' },
      { giocata: 'X2+MG Tot 1-4', label: 'X2+MG Tot 1-4' },
      { giocata: '1X+MG Tot 2-5', label: '1X+MG Tot 2-5' },
      { giocata: '12+MG Tot 2-5', label: '12+MG Tot 2-5' },
      { giocata: 'X2+MG Tot 2-5', label: 'X2+MG Tot 2-5' },
    ] },
];

// ============================================================
// HELPER: calcola % di una giocata usando la sorgente scelta
// ============================================================
const calcPctConSorgente = (familyId, giocata, match, matches, mode, stats, allMatches) => {
  if (mode === 'dixon') {
    if (typeof window.getDixonPct === 'function') {
      try {
        const v = window.getDixonPct(familyId, giocata, match, allMatches || matches);
        return (typeof v === 'number' && !isNaN(v)) ? v : 0;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  }
  // Storico
  const computeMatchStats = window.computeMatchStats;
  const getGiocataPct = window.getGiocataPct;
  const calcolaGG_NG = window.calcolaGG_NG;

  let st = stats;
  if (!st) {
    st = computeMatchStats ? computeMatchStats(match, matches) : null;
  }
  if (!st || st.error) return 0;

  const homeMG = st.homeMG || {};
  const awayMG = st.awayMG || {};
  const mgTot = st.mgTot || {};

  try {
    if (familyId === 'gg_ng') {
      const ggNg = calcolaGG_NG ? calcolaGG_NG(st) : null;
      if (ggNg) return giocata === 'GG' ? ggNg.gg : ggNg.ng;
      return 0;
    }
    return getGiocataPct(giocata, st, homeMG, awayMG, mgTot) || 0;
  } catch (e) {
    return 0;
  }
};

// ============================================================
// QUOTA INLINE
// ============================================================
const QuotaInline = ({ match, familyId, giocata, pctTua, size = 'sm' }) => {
  const [quotaInfo, setQuotaInfo] = React.useState(null);

  const quoteHook = window.QuoteManager ? window.QuoteManager.useQuote() : { numPartite: 0 };
  const numPartite = quoteHook.numPartite;

  React.useEffect(() => {
    if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') return;
    try {
      const info = window.QuoteManager.analizzaGiocata(match, familyId, giocata, pctTua);
      setQuotaInfo(info);
    } catch (e) {
      setQuotaInfo(null);
    }
  }, [match.id, familyId, giocata, pctTua, numPartite]);

  if (!quotaInfo || !quotaInfo.quotaBook) return null;

  const { quotaBook, edge, isValue } = quotaInfo;
  const padding = size === 'lg' ? '3px 8px' : '1px 6px';
  const fontSize = size === 'lg' ? '12px' : '10px';

  return (
    <span
      title={isValue ? `VALUE BET! Edge: +${edge}%` : `Quota Marathonbet`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding,
        marginLeft: '4px',
        borderRadius: '4px',
        background: isValue ? 'rgba(111, 207, 151, 0.2)' : 'rgba(255, 255, 255, 0.08)',
        border: `1px solid ${isValue ? 'var(--win)' : 'var(--border)'}`,
        fontSize,
        fontWeight: 'bold',
        color: isValue ? 'var(--win)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }}
    >
      💰{quotaBook.toFixed(2)}
    </span>
  );
};

// ============================================================
// SUB-COMPONENTE: SCHEDINA QUOTA
// ============================================================
const SchedinaQuotaPanel = ({
  matches,
  campionatiSelezionati,
  giorniRange,
  filtroOrario,
  giocateSelezionate,
  getPartiteDisponibili,
  showAlert,
  ordinaPartitePerDataOra,
  getPercentualeClasse,
  normalizeDate,
  formatDateEU,
  modeStatistiche,
}) => {
  const { useState, useMemo, useCallback } = React;

  const QUOTA_TARGET_DEFAULT = 3.00;
  const TOLLERANZA_FISSA = 0.10;
  const MIN_PARTITE = 2;
  const MAX_PARTITE = 10;

  const QUOTA_PRESETS = [2.00, 2.50, 3.00, 4.00, 5.00, 7.50, 10.00, 15.00, 20.00, 30.00];

  const [quotaTarget, setQuotaTarget] = useState(QUOTA_TARGET_DEFAULT);
  const [schedinaGenerata, setSchedinaGenerata] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [mostraCandidate, setMostraCandidate] = useState(false);

  const computeMatchStats = window.computeMatchStats;

  const giocateInUso = useMemo(() => {
    const isTutteMode = giocateSelezionate.includes('tutte') || giocateSelezionate.length === 0;

    if (isTutteMode) {
      const out = [];
      GRUPPI_GIOCATE.forEach(gruppo => {
        gruppo.giocate.forEach(g => {
          out.push({
            familyId: gruppo.familyId,
            giocata: g.giocata,
            label: g.label,
            familyLabel: gruppo.label,
            familyIcon: gruppo.icon,
          });
        });
      });
      return out;
    }

    const out = [];
    giocateSelezionate.forEach(sel => {
      if (typeof sel !== 'object' || !sel.familyId || !sel.giocata) return;
      const gruppo = GRUPPI_GIOCATE.find(gr => gr.familyId === sel.familyId);
      const infoGiocata = gruppo?.giocate.find(g => g.giocata === sel.giocata);
      out.push({
        familyId: sel.familyId,
        giocata: sel.giocata,
        label: infoGiocata?.label || sel.giocata,
        familyLabel: gruppo?.label || sel.familyId,
        familyIcon: gruppo?.icon || '',
      });
    });
    return out;
  }, [giocateSelezionate]);

  const isTutteMode = giocateSelezionate.includes('tutte') || giocateSelezionate.length === 0;

  const candidati = useMemo(() => {
    if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') {
      return [];
    }
    if (giocateInUso.length === 0) return [];

    const partite = getPartiteDisponibili();
    const out = [];

    partite.forEach(match => {
      const stats = computeMatchStats ? computeMatchStats(match, matches) : null;
      if (!stats || stats.error) return;
      stats._allMatches = matches;
      stats._homeTeam = match.casa;
      stats._awayTeam = match.ospiti;

      giocateInUso.forEach(g => {
        const pct = calcPctConSorgente(
          g.familyId, g.giocata, match, matches,
          modeStatistiche, stats, matches
        );

        if (pct <= 0) return;

        let quota = null;
        try {
          const q = window.QuoteManager.analizzaGiocata(match, g.familyId, g.giocata, Math.round(pct));
          if (q && q.quotaBook) quota = q.quotaBook;
        } catch (e) {
          quota = null;
        }
        if (!quota || quota <= 1) return;

        out.push({
          match,
          familyId: g.familyId,
          familyLabel: g.familyLabel,
          familyIcon: g.familyIcon,
          giocata: g.giocata,
          label: g.label,
          displayLabel: formatGiocataLabel(g.familyId, g.giocata),
          pct: Math.round(pct),
          quota,
          isBomb: pct >= 90,
        });
      });
    });

    return out.sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      return b.quota - a.quota;
    });
  }, [getPartiteDisponibili, matches, giocateInUso, modeStatistiche]);

  const eseguiAlgoritmo = useCallback((target) => {
    if (candidati.length === 0) {
      return { partite: [], quotaFinale: 0, stato: 'vuoto' };
    }
    const minQuota = target - TOLLERANZA_FISSA;
    const maxQuota = target + TOLLERANZA_FISSA;
    const selezionate = [];
    const usate = new Set();
    let prodotto = 1;
    for (const c of candidati) {
      if (usate.has(c.match.id)) continue;
      if (selezionate.length >= MAX_PARTITE) break;
      if (prodotto >= minQuota) break;
      selezionate.push(c);
      usate.add(c.match.id);
      prodotto *= c.quota;
    }
    if (prodotto < minQuota) {
      for (const c of candidati) {
        if (usate.has(c.match.id)) continue;
        if (selezionate.length >= MAX_PARTITE) break;
        if (prodotto >= minQuota) break;
        selezionate.push(c);
        usate.add(c.match.id);
        prodotto *= c.quota;
      }
    }
    if (prodotto > maxQuota && selezionate.length > MIN_PARTITE) {
      const ultima = selezionate[selezionate.length - 1];
      const prodottoSenzaUltima = prodotto / ultima.quota;
      if (prodottoSenzaUltima >= minQuota && prodottoSenzaUltima <= maxQuota) {
        selezionate.pop();
        prodotto = prodottoSenzaUltima;
      }
    }
    const selezionateOrdinate = ordinaPartitePerDataOra(selezionate);
    const quotaFinale = parseFloat(prodotto.toFixed(2));
    const diff = quotaFinale - target;
    const diffAssoluta = Math.abs(diff);
    let stato;
    if (diffAssoluta <= TOLLERANZA_FISSA) stato = 'ok';
    else if (quotaFinale > target) stato = 'sopra';
    else if (target - quotaFinale <= 0.30) stato = 'vicino';
    else stato = 'sotto';
    if (selezionateOrdinate.length < MIN_PARTITE) stato = 'insufficiente';
    const mediaPct = selezionateOrdinate.length > 0
      ? Math.round(selezionateOrdinate.reduce((s, x) => s + x.pct, 0) / selezionateOrdinate.length)
      : 0;
    return {
      partite: selezionateOrdinate, quotaFinale, quotaTarget: target,
      diff, diffAssoluta, mediaPct, stato, numPartite: selezionateOrdinate.length,
    };
  }, [candidati, ordinaPartitePerDataOra]);

  const generaSchedina = () => {
    if (candidati.length === 0) {
      showAlert('error', '❌ Nessuna partita con quote disponibili.');
      return;
    }
    setGenerando(true);
    setMostraCandidate(false);
    const target = parseFloat(quotaTarget) || QUOTA_TARGET_DEFAULT;
    const risultato = eseguiAlgoritmo(target);
    setSchedinaGenerata(risultato);
    setGenerando(false);
    if (risultato.stato === 'insufficiente') showAlert('error', '❌ Impossibile raggiungere la quota.');
    else if (risultato.stato === 'ok') showAlert('success', `✅ Quota ${risultato.quotaFinale.toFixed(2)} (target ${target.toFixed(2)})`);
    else if (risultato.stato === 'vicino') showAlert('info', `⚠️ Quota vicina: ${risultato.quotaFinale.toFixed(2)}`);
    else showAlert('success', `✅ Quota ${risultato.quotaFinale.toFixed(2)}`);
  };

  const resetSchedina = () => {
    setSchedinaGenerata(null);
    setMostraCandidate(false);
  };

  const aggiungiPartita = (candidato) => {
    if (!schedinaGenerata) return;
    if (schedinaGenerata.partite.length >= MAX_PARTITE) { showAlert('error', `⚠️ Massimo ${MAX_PARTITE} partite!`); return; }
    if (schedinaGenerata.partite.some(p => p.match.id === candidato.match.id)) { showAlert('info', 'ℹ️ Già presente.'); return; }
    const nuovePartite = [...schedinaGenerata.partite, candidato];
    const nuoveOrdinate = ordinaPartitePerDataOra(nuovePartite);
    const nuovoProdotto = nuoveOrdinate.reduce((p, x) => p * x.quota, 1);
    const quotaFinale = parseFloat(nuovoProdotto.toFixed(2));
    const diff = quotaFinale - schedinaGenerata.quotaTarget;
    const diffAssoluta = Math.abs(diff);
    let stato;
    if (diffAssoluta <= TOLLERANZA_FISSA) stato = 'ok';
    else if (quotaFinale > schedinaGenerata.quotaTarget) stato = 'sopra';
    else if (schedinaGenerata.quotaTarget - quotaFinale <= 0.30) stato = 'vicino';
    else stato = 'sotto';
    const mediaPct = Math.round(nuoveOrdinate.reduce((s, x) => s + x.pct, 0) / nuoveOrdinate.length);
    setSchedinaGenerata({ ...schedinaGenerata, partite: nuoveOrdinate, quotaFinale, diff, diffAssoluta, mediaPct, stato, numPartite: nuoveOrdinate.length });
    showAlert('success', `➕ Aggiunta: ${candidato.match.casa} vs ${candidato.match.ospiti}`);
  };

  const rimuoviUltima = () => {
    if (!schedinaGenerata || schedinaGenerata.partite.length <= MIN_PARTITE) {
      showAlert('error', `⚠️ Minimo ${MIN_PARTITE} partite!`);
      return;
    }
    const nuovePartite = schedinaGenerata.partite.slice(0, -1);
    const nuovoProdotto = nuovePartite.reduce((p, x) => p * x.quota, 1);
    const quotaFinale = parseFloat(nuovoProdotto.toFixed(2));
    const diff = quotaFinale - schedinaGenerata.quotaTarget;
    const diffAssoluta = Math.abs(diff);
    let stato;
    if (diffAssoluta <= TOLLERANZA_FISSA) stato = 'ok';
    else if (quotaFinale > schedinaGenerata.quotaTarget) stato = 'sopra';
    else if (schedinaGenerata.quotaTarget - quotaFinale <= 0.30) stato = 'vicino';
    else stato = 'sotto';
    if (nuovePartite.length < MIN_PARTITE) stato = 'insufficiente';
    const mediaPct = nuovePartite.length > 0 ? Math.round(nuovePartite.reduce((s, x) => s + x.pct, 0) / nuovePartite.length) : 0;
    setSchedinaGenerata({ ...schedinaGenerata, partite: nuovePartite, quotaFinale, diff, diffAssoluta, mediaPct, stato, numPartite: nuovePartite.length });
    showAlert('info', '➖ Ultima partita rimossa');
  };

  const copiaSchedinaQuota = () => {
    if (!schedinaGenerata) return;
    const lines = [];
    lines.push('💰 *SCHEDINA QUOTA - GesssAI-Pro*');
    lines.push(`🔀 Motore: ${modeStatistiche === 'dixon' ? '🧮 Dixon-Coles' : '📊 Storico'}`);
    lines.push(`🎯 Target: ${schedinaGenerata.quotaTarget.toFixed(2)} (±${TOLLERANZA_FISSA.toFixed(2)})`);
    lines.push(`📊 Quota finale: ${schedinaGenerata.quotaFinale.toFixed(2)}`);
    lines.push(`📈 Media %: ${schedinaGenerata.mediaPct}%`);
    lines.push(`🔢 ${schedinaGenerata.numPartite} partite`);
    lines.push('───────────────────');
    schedinaGenerata.partite.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.match.casa} vs ${p.match.ospiti}`);
      lines.push(`   ${formatDateEU(p.match.data)} ${p.match.ora || ''} • ${p.match.campionato}`);
      lines.push(`   🎯 ${p.displayLabel} → ${p.pct}% • 💰 ${p.quota.toFixed(2)}`);
    });
    lines.push('───────────────────');
    lines.push('💣 GesssAI-Pro v3.0');
    const text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showAlert('success', '📋 Copiato negli appunti!'))
        .catch(() => showAlert('error', '❌ Errore copia'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showAlert('success', '📋 Copiato!'); }
      catch (e) { showAlert('error', '❌ Errore copia'); }
      document.body.removeChild(ta);
    }
  };

  const candidatiDisponibili = useMemo(() => {
    if (!schedinaGenerata) return [];
    const usateIds = new Set(schedinaGenerata.partite.map(p => p.match.id));
    return candidati.filter(c => !usateIds.has(c.match.id));
  }, [candidati, schedinaGenerata]);

  const statoSchedina = schedinaGenerata?.stato;
  const coloreStato = statoSchedina === 'ok' ? 'var(--win)' :
                      statoSchedina === 'vicino' ? 'var(--neon-gold)' :
                      statoSchedina === 'sopra' ? 'var(--neon-gold)' :
                      statoSchedina === 'sotto' ? 'var(--neon-red)' :
                      'var(--text-muted)';

  const etichettaGiocateInUso = () => {
    if (isTutteMode) return `Tutti i gruppi Schedina (${GRUPPI_GIOCATE.length} gruppi)`;
    if (giocateInUso.length === 0) return 'Nessuna giocata selezionata';
    return giocateInUso
      .map(g => formatGiocataLabel(g.familyId, g.giocata))
      .join(' • ');
  };

  return (
    <div>
      {/* BANNER MOTORE ATTIVO */}
      <div style={{
        marginBottom: '14px', padding: '10px 14px',
        background: modeStatistiche === 'dixon'
          ? 'linear-gradient(135deg, rgba(255, 0, 229, 0.10), rgba(255, 0, 229, 0.03))'
          : 'linear-gradient(135deg, rgba(0, 245, 255, 0.10), rgba(0, 245, 255, 0.03))',
        borderRadius: '10px',
        border: `1px solid ${modeStatistiche === 'dixon' ? 'rgba(255, 0, 229, 0.4)' : 'rgba(0, 245, 255, 0.4)'}`,
        fontSize: '12px', fontWeight: 'bold',
        color: modeStatistiche === 'dixon' ? 'var(--neon-magenta, #ff00e5)' : 'var(--neon-cyan)',
        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
      }}>
        <span>{modeStatistiche === 'dixon' ? '🧮' : '📊'}</span>
        <span>Motore attivo: <b>{modeStatistiche === 'dixon' ? 'Dixon-Coles' : 'Storico'}</b></span>
        <span style={{ fontWeight: 'normal', fontSize: '11px', color: 'var(--text-dim)', marginLeft: 'auto' }}>
          {modeStatistiche === 'dixon'
            ? 'Matrice esatta λ + correzione τ + assenze'
            : 'Medie storiche reali delle due squadre'}
        </span>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ color: 'var(--accent)', marginBottom: '14px', fontSize: '18px' }}>
          💰 Genera Schedina da Quota Target
        </h3>

        <div style={{
          marginBottom: '14px', padding: '10px 14px',
          background: 'var(--surface)', borderRadius: '8px',
          border: '1px solid var(--border)', fontSize: '12px',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>
            🎯 Giocate in uso:{' '}
            <b style={{ color: isTutteMode ? 'var(--accent)' : 'var(--win)' }}>
              {etichettaGiocateInUso()}
            </b>
            <span style={{ marginLeft: '10px', color: 'var(--text-dim)' }}>
              ({candidati.length} partite con quota)
            </span>
          </span>
          {!isTutteMode && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              💡 Modifica la selezione nella <b>Schedina Classica</b> per cambiare le giocate in uso
            </div>
          )}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
            🎯 Quota totale desiderata
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number" step="0.05" min="1.01"
              value={quotaTarget}
              onChange={e => setQuotaTarget(parseFloat(e.target.value) || 1.01)}
              style={{
                width: '120px', padding: '10px 14px',
                background: 'var(--surface)', color: 'var(--accent)',
                border: '2px solid var(--accent)', borderRadius: '8px',
                fontSize: '20px', fontWeight: 'bold',
                fontFamily: 'Orbitron, monospace', textAlign: 'center',
              }}
            />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
              {QUOTA_PRESETS.map(q => (
                <button key={q} className="btn" onClick={() => setQuotaTarget(q)}
                  style={{
                    fontSize: '11px', padding: '5px 12px',
                    background: quotaTarget === q ? 'var(--accent)' : 'var(--surface)',
                    color: quotaTarget === q ? '#000' : 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: '6px',
                    cursor: 'pointer', fontWeight: quotaTarget === q ? 'bold' : 'normal',
                  }}>{q.toFixed(2)}</button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
            Tolleranza fissa: <b>±{TOLLERANZA_FISSA.toFixed(2)}</b> • Range: {Math.max(1.01, quotaTarget - TOLLERANZA_FISSA).toFixed(2)} – {(quotaTarget + TOLLERANZA_FISSA).toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn" onClick={generaSchedina}
            disabled={generando || candidati.length === 0}
            style={{
              background: candidati.length > 0 ? 'var(--accent)' : 'var(--surface)',
              color: candidati.length > 0 ? '#000' : 'var(--text-muted)',
              fontWeight: 'bold', padding: '10px 24px', fontSize: '14px',
              cursor: candidati.length > 0 ? 'pointer' : 'not-allowed',
            }}>
            {generando ? '⏳ Generazione...' : '⚡ Genera Schedina'}
          </button>
          {schedinaGenerata && (
            <button className="btn btn-secondary" onClick={resetSchedina}>🗑️ Resetta</button>
          )}
        </div>
      </div>

      {schedinaGenerata && (
        <div className="card" style={{ border: `2px solid ${coloreStato}` }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '12px', marginBottom: '14px',
            paddingBottom: '12px', borderBottom: '2px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Quota raggiunta
              </div>
              <div style={{
                fontSize: '36px', fontWeight: 900, fontFamily: 'Orbitron, monospace',
                color: coloreStato,
                textShadow: statoSchedina === 'ok' ? '0 0 16px var(--win)' : 'none',
              }}>
                {schedinaGenerata.quotaFinale.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Target: {schedinaGenerata.quotaTarget.toFixed(2)} • Diff: {schedinaGenerata.diff >= 0 ? '+' : ''}{schedinaGenerata.diff.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                📊 <b>{schedinaGenerata.numPartite}</b> partite
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                ⭐ Media %: <b style={{ color: 'var(--accent)' }}>{schedinaGenerata.mediaPct}%</b>
              </div>
            </div>
          </div>

          {statoSchedina === 'ok' && (
            <div style={{ padding: '10px 14px', marginBottom: '12px', background: 'rgba(111, 207, 151, 0.15)', border: '1px solid var(--win)', borderRadius: '8px', fontSize: '13px', color: 'var(--win)' }}>
              ✅ <b>Quota nel range target!</b>
            </div>
          )}
          {statoSchedina === 'vicino' && (
            <div style={{ padding: '10px 14px', marginBottom: '12px', background: 'rgba(243, 156, 18, 0.15)', border: '1px solid var(--neon-gold)', borderRadius: '8px', fontSize: '13px', color: 'var(--neon-gold)' }}>
              ⚠️ <b>Quota vicina al target</b> (mancano {(schedinaGenerata.quotaTarget - schedinaGenerata.quotaFinale).toFixed(2)}). Vuoi aggiungere una partita?
            </div>
          )}
          {statoSchedina === 'sopra' && (
            <div style={{ padding: '10px 14px', marginBottom: '12px', background: 'rgba(243, 156, 18, 0.15)', border: '1px solid var(--neon-gold)', borderRadius: '8px', fontSize: '13px', color: 'var(--neon-gold)' }}>
              ⚠️ Quota sopra il target di {schedinaGenerata.diff.toFixed(2)}. Puoi rimuovere l'ultima partita.
            </div>
          )}
          {statoSchedina === 'sotto' && (
            <div style={{ padding: '10px 14px', marginBottom: '12px', background: 'rgba(235, 87, 87, 0.15)', border: '1px solid var(--neon-red)', borderRadius: '8px', fontSize: '13px', color: 'var(--neon-red)' }}>
              ❌ Quota sotto il target di {Math.abs(schedinaGenerata.diff).toFixed(2)}. Aggiungi partite.
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '11px' }}>#</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '11px' }}>Partita</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '11px' }}>Giocata</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px' }}>%</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px' }}>Quota</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px' }}></th>
                </tr>
              </thead>
              <tbody>
                {schedinaGenerata.partite.map((p, idx) => (
                  <tr key={p.match.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 6px', color: 'var(--text-dim)' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>{p.match.casa} vs {p.match.ospiti}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatDateEU(p.match.data)} {p.match.ora || ''} • {p.match.campionato}</div>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 'bold', fontSize: '11px', color: p.familyId === 'gg_ng' ? '#e74c3c' : 'var(--accent)' }}>
                        {p.displayLabel}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <span className={`giocata-pct ${getPercentualeClasse(p.pct)}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {p.pct}% {p.isBomb && '💣'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', color: 'var(--win)', fontFamily: 'Orbitron, monospace' }}>
                      {p.quota.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <button onClick={() => {
                        if (schedinaGenerata.partite.length <= MIN_PARTITE) { showAlert('error', `⚠️ Minimo ${MIN_PARTITE} partite!`); return; }
                        const nuove = schedinaGenerata.partite.filter(x => x.match.id !== p.match.id);
                        const nuovoProdotto = nuove.reduce((pr, x) => pr * x.quota, 1);
                        const qf = parseFloat(nuovoProdotto.toFixed(2));
                        const d = qf - schedinaGenerata.quotaTarget;
                        const da = Math.abs(d);
                        let st;
                        if (da <= TOLLERANZA_FISSA) st = 'ok';
                        else if (qf > schedinaGenerata.quotaTarget) st = 'sopra';
                        else if (schedinaGenerata.quotaTarget - qf <= 0.30) st = 'vicino';
                        else st = 'sotto';
                        if (nuove.length < MIN_PARTITE) st = 'insufficiente';
                        const mp = nuove.length > 0 ? Math.round(nuove.reduce((s, x) => s + x.pct, 0) / nuove.length) : 0;
                        setSchedinaGenerata({ ...schedinaGenerata, partite: nuove, quotaFinale: qf, diff: d, diffAssoluta: da, mediaPct: mp, stato: st, numPartite: nuove.length });
                      }} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--neon-red)', cursor: 'pointer', fontSize: '12px', padding: '2px 8px' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <button className="btn" onClick={() => setMostraCandidate(v => !v)}
              disabled={schedinaGenerata.partite.length >= MAX_PARTITE || candidatiDisponibili.length === 0}
              style={{ background: 'var(--accent2)', color: '#000', fontWeight: 'bold', opacity: schedinaGenerata.partite.length >= MAX_PARTITE ? 0.5 : 1 }}>
              ➕ Aggiungi partita {mostraCandidate ? '▲' : '▼'}
            </button>
            <button className="btn" onClick={rimuoviUltima}
              disabled={schedinaGenerata.partite.length <= MIN_PARTITE}
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', opacity: schedinaGenerata.partite.length <= MIN_PARTITE ? 0.5 : 1 }}>
              ➖ Rimuovi ultima
            </button>
            <button className="btn" onClick={generaSchedina} style={{ background: 'var(--accent)', color: '#000', fontWeight: 'bold' }}>🎲 Rigenera</button>
            <button className="btn" onClick={copiaSchedinaQuota} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>📋 Copia</button>
          </div>

          {mostraCandidate && candidatiDisponibili.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '10px' }}>
                ➕ Partite disponibili ({candidatiDisponibili.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                {candidatiDisponibili.slice(0, 30).map((c, i) => (
                  <div key={`${c.match.id}-${c.giocata}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--card)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '12px' }}>{c.match.casa} vs {c.match.ospiti}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatDateEU(c.match.data)} {c.match.ora || ''} • {c.match.campionato}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 'bold', fontSize: '11px', color: c.familyId === 'gg_ng' ? '#e74c3c' : 'var(--accent)' }}>{c.displayLabel}</span>
                    <span className={`giocata-pct ${getPercentualeClasse(c.pct)}`} style={{ fontSize: '11px', padding: '2px 8px' }}>{c.pct}%</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--win)', fontFamily: 'Orbitron, monospace', minWidth: '50px', textAlign: 'right' }}>{c.quota.toFixed(2)}</span>
                    <button className="btn" onClick={() => aggiungiPartita(c)} style={{ background: 'var(--accent)', color: '#000', fontWeight: 'bold', fontSize: '11px', padding: '4px 12px' }}>➕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPALE
// ============================================================
const SchedinaComponent = ({
  matches,
  championships,
  selectedFamiglie,
  onSelectMatch,
  showAlert,
}) => {
  const { useState, useMemo, useCallback, useEffect } = React;

  const getChampColor = window.getChampColor || (() => '#95a5a6');
  const getPercentualeClasse = window.getPercentualeClasse;
  const normalizeDate = window.normalizeDate;
  const getTodayStr = window.getTodayStr;
  const addDaysToDateStr = window.addDaysToDateStr;
  const formatDateEU = window.formatDateEU;

  const { giorni: giorniRange, setGiorni: setGiorniRange } =
    window.FiltriCampionati.useGiorniRange();

  const {
    toggleCampionato,
    selezionaTutti: selezionaTuttiCampionati,
    deselezionaTutti: deselezionaTuttiCampionati,
    campionatiAttivi,
  } = window.FiltriCampionati.useFiltroCampionati();

  const campionatiSelezionati = campionatiAttivi;

  const [sottoTab, setSottoTab] = useState('classica');
  const [partiteSelezionate, setPartiteSelezionate] = useState([]);
  const [filtroOrario, setFiltroOrario] = useState('dopo_ora');

  // ⭐ Switch Storico / Dixon-Coles (condiviso con Schedina Quota)
  const { mode: modeStatistiche, setMode: setModeStatistiche } = useModeStatisticheSchedina();

  const MAX_GIOCATE = 3;
  const [giocateSelezionate, setGiocateSelezionate] = useState(['tutte']);

  const ordinaPartitePerDataOra = useCallback((partite) => {
    return [...partite].sort((a, b) => {
      const dateA = normalizeDate(a.data);
      const dateB = normalizeDate(b.data);
      if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
      const oraA = a.ora || '00:00';
      const oraB = b.ora || '00:00';
      return oraA.localeCompare(oraB);
    });
  }, [normalizeDate]);

  const getPartiteDisponibili = useCallback(() => {
    const todayStr = getTodayStr();
    const maxDateStr = addDaysToDateStr(todayStr, giorniRange);

    let partite = matches.filter(m => m.stato === 'Futura');
    if (campionatiSelezionati.length > 0) {
      partite = partite.filter(m => campionatiSelezionati.includes(m.campionato));
    } else {
      partite = [];
    }
    partite = partite.filter(m => {
      if (!m.data) return false;
      const normalized = normalizeDate(m.data);
      if (!normalized) return false;
      return normalized >= todayStr && normalized <= maxDateStr;
    });
    if (filtroOrario === 'dopo_ora') {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      partite = partite.filter(m => {
        if (!m.ora || m.ora === 'TBD' || m.ora === 'N/D') return true;
        const timeParts = m.ora.split(':');
        if (timeParts.length < 2) return true;
        const matchHour = parseInt(timeParts[0], 10);
        const matchMinutes = parseInt(timeParts[1], 10);
        if (isNaN(matchHour) || isNaN(matchMinutes)) return true;
        const matchTotalMinutes = matchHour * 60 + matchMinutes;
        const matchDate = normalizeDate(m.data);
        if (matchDate === todayStr) return matchTotalMinutes > currentTotalMinutes;
        return true;
      });
    }
    return partite;
  }, [matches, campionatiSelezionati, giorniRange, filtroOrario, normalizeDate, getTodayStr, addDaysToDateStr]);

  const calcolaTop3GiocatePerPartita = useCallback((match) => {
    const computeMatchStats = window.computeMatchStats;

    const stats = computeMatchStats ? computeMatchStats(match, matches) : null;
    if (!stats || stats.error) {
      return { top3Calcolate: [], top3Scelte: [], scoreCalcolate: 0, scoreScelte: 0 };
    }
    stats._allMatches = matches;
    stats._homeTeam = match.casa;
    stats._awayTeam = match.ospiti;

    const tutteCalcolate = [];
    const viste = new Set();

    GRUPPI_GIOCATE.forEach(gruppo => {
      gruppo.giocate.forEach(g => {
        const key = `${gruppo.familyId}|${g.giocata}`;
        if (viste.has(key)) return;
        viste.add(key);

        let pct = 0;
        try {
          pct = calcPctConSorgente(
            gruppo.familyId, g.giocata, match, matches,
            modeStatistiche, stats, matches
          );
        } catch (e) { pct = 0; }

        if (pct > 0) {
          tutteCalcolate.push({
            familyId: gruppo.familyId,
            familyLabel: gruppo.label,
            familyIcon: gruppo.icon,
            giocata: g.giocata,
            label: g.label,
            displayLabel: formatGiocataLabel(gruppo.familyId, g.giocata),
            pct: Math.round(pct),
            isBomb: pct >= 90,
          });
        }
      });
    });

    tutteCalcolate.sort((a, b) => b.pct - a.pct);
    const top3Calcolate = tutteCalcolate.slice(0, 3);
    const scoreCalcolate = top3Calcolate.length > 0
      ? Math.round(top3Calcolate.reduce((s, g) => s + g.pct, 0) / top3Calcolate.length)
      : 0;

    const top3Scelte = [];
    if (!giocateSelezionate.includes('tutte')) {
      giocateSelezionate.forEach(sel => {
        if (typeof sel !== 'object' || !sel.familyId || !sel.giocata) return;
        let pct = 0;
        try {
          pct = calcPctConSorgente(
            sel.familyId, sel.giocata, match, matches,
            modeStatistiche, stats, matches
          );
        } catch (e) { pct = 0; }

        if (pct > 0) {
          const gruppo = GRUPPI_GIOCATE.find(gr => gr.familyId === sel.familyId);
          const infoGiocata = gruppo?.giocate.find(g => g.giocata === sel.giocata);
          top3Scelte.push({
            familyId: sel.familyId,
            familyLabel: gruppo?.label || '',
            familyIcon: gruppo?.icon || '',
            giocata: sel.giocata,
            label: infoGiocata?.label || sel.giocata,
            displayLabel: formatGiocataLabel(sel.familyId, sel.giocata),
            pct: Math.round(pct),
            isBomb: pct >= 90,
          });
        }
      });
      top3Scelte.sort((a, b) => b.pct - a.pct);
    }
    const scoreScelte = top3Scelte.length > 0
      ? Math.round(top3Scelte.reduce((s, g) => s + g.pct, 0) / top3Scelte.length)
      : 0;

    return { top3Calcolate, top3Scelte, scoreCalcolate, scoreScelte };
  }, [matches, giocateSelezionate, modeStatistiche]);

  const partiteDisponibili = useMemo(() => {
    const partite = getPartiteDisponibili();
    return partite.map(m => {
      const dettagli = calcolaTop3GiocatePerPartita(m);
      return { ...m, ...dettagli };
    }).sort((a, b) => {
      const dateA = normalizeDate(a.data);
      const dateB = normalizeDate(b.data);
      if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
      return (b.scoreCalcolate || 0) - (a.scoreCalcolate || 0);
    });
  }, [getPartiteDisponibili, calcolaTop3GiocatePerPartita, normalizeDate]);

  const championshipsOrdinati = useMemo(() => {
    return [...championships].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'it', { sensitivity: 'base' })
    );
  }, [championships]);

  const isGiocataSelezionata = (familyId, giocata) => {
    if (giocateSelezionate.includes('tutte')) return false;
    return giocateSelezionate.some(s => typeof s === 'object' && s.familyId === familyId && s.giocata === giocata);
  };

  const toggleGiocata = (familyId, giocata) => {
    setGiocateSelezionate(prev => {
      if (prev.includes('tutte')) return [{ familyId, giocata }];
      const exists = prev.some(s => typeof s === 'object' && s.familyId === familyId && s.giocata === giocata);
      if (exists) {
        const newSel = prev.filter(s => !(typeof s === 'object' && s.familyId === familyId && s.giocata === giocata));
        return newSel.length === 0 ? ['tutte'] : newSel;
      }
      if (prev.length >= MAX_GIOCATE) {
        showAlert('error', `⚠️ Massimo ${MAX_GIOCATE} giocate selezionabili!`);
        return prev;
      }
      return [...prev, { familyId, giocata }];
    });
  };

  const selezionaTutteGiocate = () => {
    setGiocateSelezionate(['tutte']);
  };

  const conteggioGiocateSelezionate = () => {
    if (giocateSelezionate.includes('tutte')) return 0;
    return giocateSelezionate.filter(s => typeof s === 'object').length;
  };

  return (
    <div className="schedina-container">
      {window.QuoteManager?.BannerScadenzaQuote && (
        <window.QuoteManager.BannerScadenzaQuote />
      )}

      {/* ⭐ Sub-tabs con bottoni uniformi */}
      <div className="sub-tabs" style={{ marginBottom: '16px' }}>
        <button className={sottoTab === 'classica' ? 'active' : ''} onClick={() => setSottoTab('classica')}>
          📋 Schedina Classica
        </button>
        <button className={sottoTab === 'quota' ? 'active' : ''} onClick={() => setSottoTab('quota')}>
          💰 Schedina Quota
        </button>
      </div>

      {sottoTab === 'quota' && (
        <SchedinaQuotaPanel
          matches={matches}
          campionatiSelezionati={campionatiSelezionati}
          giorniRange={giorniRange}
          filtroOrario={filtroOrario}
          giocateSelezionate={giocateSelezionate}
          getPartiteDisponibili={getPartiteDisponibili}
          showAlert={showAlert}
          ordinaPartitePerDataOra={ordinaPartitePerDataOra}
          getPercentualeClasse={getPercentualeClasse}
          normalizeDate={normalizeDate}
          formatDateEU={formatDateEU}
          modeStatistiche={modeStatistiche}
        />
      )}

      {sottoTab === 'classica' && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '16px', fontSize: '20px' }}>
              🎯 Crea Schedina
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px', fontWeight: 'normal' }}>
                📅 {giorniRange} giorno/i • 🏆 {campionatiSelezionati.length} campionati attivi
                {modeStatistiche === 'dixon' && (
                  <span style={{
                    marginLeft: '8px', padding: '2px 8px', borderRadius: '10px',
                    background: 'var(--neon-magenta, #ff00e5)', color: '#000',
                    fontSize: '10px', fontWeight: 900,
                  }}>🧮 DIXON</span>
                )}
              </span>
            </h3>

            {/* ⭐ GRIGLIA CAMPIONATI 5×5 - CON BADGE OGGI/2 GIORNI */}
            <div style={{
              marginBottom: '16px', padding: '10px 12px',
              background: 'linear-gradient(135deg, rgba(30, 40, 66, 0.7), rgba(20, 27, 46, 0.9))',
              borderRadius: '14px',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>
                  🏆 Campionati Attivi
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn" onClick={selezionaTuttiCampionati}
                    style={{
                      fontSize: '10px', padding: '3px 14px',
                      background: campionatiSelezionati.length === championships.length ? 'var(--accent)' : 'var(--surface)',
                      color: campionatiSelezionati.length === championships.length ? '#000' : 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer',
                    }}>✅ Tutti</button>
                  <button className="btn" onClick={deselezionaTuttiCampionati}
                    style={{
                      fontSize: '10px', padding: '3px 14px',
                      background: 'var(--surface)', color: 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer',
                    }}>❌ Deseleziona</button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '3px 10px', background: 'var(--surface)', borderRadius: '4px' }}>
                    {campionatiSelezionati.length} / {championships.length}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '4px',
                width: '100%',
              }}>
                {championshipsOrdinati.map(c => {
                  const isSelected = campionatiSelezionati.includes(c.name);
                  const color = getChampColor(c.name);
                  const label = c.name.length > 16 ? c.name.substring(0, 14) + '…' : c.name;
                  const hasPartite = matches.some(m => m.campionato === c.name);

                  const todayStr = getTodayStr();
                  const maxDateStr = addDaysToDateStr(todayStr, 2);
                  const nOggi = matches.filter(m => m.campionato === c.name && m.stato === 'Futura' && normalizeDate(m.data) === todayStr).length;
                  const n2g = matches.filter(m => {
                    if (m.campionato !== c.name || m.stato !== 'Futura') return false;
                    const d = normalizeDate(m.data);
                    return d > todayStr && d <= maxDateStr;
                  }).length;

                  let badge = null;
                  if (nOggi > 0) {
                    badge = <span style={{ background: isSelected ? 'rgba(0,0,0,0.3)' : 'var(--neon-red)', color: isSelected ? '#000' : '#fff', fontSize: '9px', fontWeight: 900, padding: '1px 6px', borderRadius: '10px', flexShrink: 0 }}>{nOggi}</span>;
                  } else if (n2g > 0) {
                    badge = <span style={{ background: isSelected ? 'rgba(0,0,0,0.3)' : 'var(--neon-gold)', color: isSelected ? '#000' : '#000', fontSize: '9px', fontWeight: 900, padding: '1px 6px', borderRadius: '10px', flexShrink: 0 }}>{n2g}</span>;
                  }

                  return (
                    <button
                      key={c.name}
                      onClick={() => toggleCampionato(c.name)}
                      className={`champ-bar-item ${isSelected ? 'active' : ''}`}
                      style={{
                        borderColor: isSelected ? 'var(--neon-cyan)' : `${color}66`,
                        background: isSelected
                          ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))'
                          : 'var(--bg-elevated)',
                        color: isSelected ? '#000' : 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '5px 6px',
                        minHeight: '36px',
                        borderWidth: isSelected ? '2px' : '1px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: isSelected ? 'bold' : '700',
                        width: '100%',
                        transition: 'all 0.2s',
                        overflow: 'hidden',
                        boxShadow: isSelected ? '0 0 20px rgba(0, 245, 255, 0.5)' : 'none',
                        opacity: hasPartite ? 1 : 0.4,
                      }}
                      title={c.name}
                    >
                      <ChampLogoSchedina campionato={c.name} size={14} />
                      <span style={{
                        fontSize: '10px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '75px',
                      }}>
                        {label}
                      </span>
                      {badge}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                🔄 Modifica la selezione nel <b>Palinsesto</b> per sincronizzarla
              </div>
            </div>

            {/* ⭐ SWITCH STATISTICHE / DIXON-COLES */}
            <SwitchModeStatistiche mode={modeStatistiche} setMode={setModeStatistiche} />

            {/* GIOCATE */}
            <div style={{
              marginBottom: '20px', padding: '14px 16px',
              background: 'var(--surface)', borderRadius: '10px',
              border: '2px solid var(--border)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px',
              }}>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text)' }}>
                  🎯 Seleziona Giocate
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal' }}>
                    (max {MAX_GIOCATE} • "Tutte" = tutte le famiglie)
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn" onClick={selezionaTutteGiocate}
                    style={{
                      fontSize: '10px', padding: '3px 14px',
                      background: giocateSelezionate.includes('tutte') ? 'var(--accent)' : 'var(--surface)',
                      color: giocateSelezionate.includes('tutte') ? '#000' : 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer',
                    }}>⭐ Tutte</button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '3px 10px', background: 'var(--surface)', borderRadius: '4px' }}>
                    {giocateSelezionate.includes('tutte') ? '⭐ Tutte' : `${conteggioGiocateSelezionate()} / ${MAX_GIOCATE}`}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {GRUPPI_GIOCATE.map((gruppo, gIdx) => (
                  <div key={`${gruppo.familyId}-${gIdx}`} style={{
                    background: 'var(--card)', borderRadius: '8px',
                    padding: '10px 12px', border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      fontSize: '12px', fontWeight: 'bold',
                      color: 'var(--accent)', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <span style={{ fontSize: '14px' }}>{gruppo.icon}</span>
                      <span>{gruppo.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {gruppo.giocate.map((g, i) => {
                        const isSelected = isGiocataSelezionata(gruppo.familyId, g.giocata);
                        const isGGNG = gruppo.familyId === 'gg_ng';
                        return (
                          <button key={i} onClick={() => toggleGiocata(gruppo.familyId, g.giocata)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: isSelected
                                ? (isGGNG ? '2px solid #e74c3c' : '2px solid var(--accent)')
                                : '1px solid var(--border)',
                              background: isSelected
                                ? (isGGNG ? 'rgba(231, 76, 60, 0.15)' : 'rgba(243, 156, 18, 0.15)')
                                : 'var(--surface)',
                              color: isSelected
                                ? (isGGNG ? '#e74c3c' : 'var(--accent)')
                                : 'var(--text-muted)',
                              cursor: 'pointer', fontSize: '11px',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                            }}>
                            {isSelected ? '✅ ' : ''}{g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FILTRI DATA/ORA */}
            <div style={{
              marginBottom: '20px', padding: '14px 16px',
              background: 'var(--surface)', borderRadius: '10px',
              border: '2px solid var(--border)',
            }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text)' }}>
                  📅 Filtri Data e Orario
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                <div style={{ flex: '1', minWidth: '160px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
                    📆 Range Giorni
                  </label>
                  <select value={giorniRange} onChange={e => setGiorniRange(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '7px 12px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }}>
                    <option value="1">1 Giorno (Oggi)</option>
                    <option value="2">2 Giorni</option>
                    <option value="3">3 Giorni</option>
                    <option value="4">4 Giorni</option>
                    <option value="5">5 Giorni</option>
                    <option value="6">6 Giorni</option>
                    <option value="7">7 Giorni</option>
                  </select>
                </div>
                <div style={{ flex: '1', minWidth: '160px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
                    ⏰ Filtro Orario
                  </label>
                  <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '6px', padding: '3px', border: '1px solid var(--border)' }}>
                    <button onClick={() => setFiltroOrario('dopo_ora')}
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: '11px',
                        borderRadius: '4px', border: 'none', cursor: 'pointer',
                        fontWeight: filtroOrario === 'dopo_ora' ? 'bold' : 'normal',
                        background: filtroOrario === 'dopo_ora' ? 'var(--accent)' : 'transparent',
                        color: filtroOrario === 'dopo_ora' ? '#000' : 'var(--text-muted)',
                      }}>⏰ Dopo ora</button>
                    <button onClick={() => setFiltroOrario('giorno_intero')}
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: '11px',
                        borderRadius: '4px', border: 'none', cursor: 'pointer',
                        fontWeight: filtroOrario === 'giorno_intero' ? 'bold' : 'normal',
                        background: filtroOrario === 'giorno_intero' ? 'var(--accent)' : 'transparent',
                        color: filtroOrario === 'giorno_intero' ? '#000' : 'var(--text-muted)',
                      }}>📅 Giorno intero</button>
                  </div>
                </div>
              </div>
            </div>

            {/* LISTA PARTITE */}
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span>📋 Partite Disponibili ({partiteDisponibili.length})</span>
              </h4>

              {partiteDisponibili.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏰</div>
                  <p>Nessuna partita disponibile per i filtri selezionati.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {partiteDisponibili.map(m => {
                    const isSelected = partiteSelezionate.some(p => p.id === m.id);
                    const top3DaMostrare = m.top3Calcolate;
                    const scoreDaMostrare = m.scoreCalcolate;
                    return (
                      <div key={m.id} onClick={() => {
                        setPartiteSelezionate(prev => {
                          const exists = prev.find(p => p.id === m.id);
                          let nuove;
                          if (exists) nuove = prev.filter(p => p.id !== m.id);
                          else nuove = [...prev, m];
                          return ordinaPartitePerDataOra(nuove);
                        });
                      }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: '8px',
                          border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(243, 156, 18, 0.08)' : 'var(--surface)',
                          cursor: 'pointer', transition: 'all 0.2s',
                          gap: '8px', flexWrap: 'wrap',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateEU(m.data)}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.ora || ''}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '150px' }}>
                          <ChampLogoSchedina campionato={m.campionato} size={18} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.campionato}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '150px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text)' }}>
                            {m.casa} vs {m.ospiti}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', minWidth: '320px' }}>
                          {top3DaMostrare && top3DaMostrare.length > 0 ? top3DaMostrare.map((g, idx) => (
                            <div key={idx} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              gap: '2px', padding: '4px 8px', borderRadius: '6px',
                              border: g.isBomb ? '2px solid var(--accent)' : '1px solid var(--border)',
                              background: 'var(--surface)', minWidth: '95px',
                            }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', color: g.familyId === 'gg_ng' ? '#e74c3c' : 'var(--accent)' }}>
                                {g.displayLabel || g.label}
                              </span>
                              <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`} style={{ fontSize: '11px', padding: '1px 6px' }}>
                                {g.pct}% {g.isBomb && '💣'}
                              </span>
                              <QuotaInline match={m} familyId={g.familyId} giocata={g.giocata} pctTua={g.pct} size="sm" />
                            </div>
                          )) : <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>N/D</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '50px', justifyContent: 'flex-end' }}>
                          <span className={`giocata-pct ${getPercentualeClasse(scoreDaMostrare)}`} style={{ fontSize: '13px', padding: '2px 10px' }}>
                            {scoreDaMostrare || 0}%
                          </span>
                          {isSelected && <span style={{ color: 'var(--win)', fontSize: '14px' }}>✅</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

window.SchedinaComponent = SchedinaComponent;
console.log('✅ SchedinaComponent v9.8 caricato - switch Storico/Dixon-Coles + griglia 5x5');