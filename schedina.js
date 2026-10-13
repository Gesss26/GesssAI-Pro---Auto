// ============================================================
// schedina.js - Modulo Schedina con quote PDF visibili
// v12: Aggiunta TAB "Schedina Quota" (genera schedina da quota target)
//      - Usa le giocate selezionate in "🎯 Seleziona Giocate"
//      - Algoritmo greedy: ordina per % decrescente, aggiunge partite
//        finché prodotto quote >= quota target
//      - Default quota target: 3.00
//      - Range partite: 2-10
// ============================================================

const GIOCATE_SELEZIONATE_KEY = 'ft_giocate_selezionate';

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

const GRUPPI_GIOCATE = [
  {
    familyId: 'fisse', label: 'FISSE', icon: '🎯',
    giocate: [
      { giocata: '1', label: '1' },
      { giocata: 'X', label: 'X' },
      { giocata: '2', label: '2' },
    ]
  },
  {
    familyId: 'dc', label: 'DOPPIA CHANCE', icon: '🛡️',
    giocate: [
      { giocata: '1X', label: '1X' },
      { giocata: '12', label: '12' },
      { giocata: 'X2', label: 'X2' },
    ]
  },
  {
    familyId: 'over', label: 'OVER', icon: '⬆️',
    giocate: [
      { giocata: 'Over 1.5', label: 'Over 1.5' },
      { giocata: 'Over 2.5', label: 'Over 2.5' },
      { giocata: 'Over 3.5', label: 'Over 3.5' },
      { giocata: 'Over 4.5', label: 'Over 4.5' },
    ]
  },
  {
    familyId: 'under', label: 'UNDER', icon: '⬇️',
    giocate: [
      { giocata: 'Under 1.5', label: 'Under 1.5' },
      { giocata: 'Under 2.5', label: 'Under 2.5' },
      { giocata: 'Under 3.5', label: 'Under 3.5' },
      { giocata: 'Under 4.5', label: 'Under 4.5' },
    ]
  },
  {
    familyId: 'gg_ng', label: 'GG - NG', icon: '⚽',
    giocate: [
      { giocata: 'GG', label: 'GG' },
      { giocata: 'NG', label: 'NG' },
    ]
  },
  {
    familyId: 'multigol', label: 'MULTIGOL CASA', icon: '📊',
    giocate: [
      { giocata: 'MG Casa 0-2', label: 'MG Casa 0-2' },
      { giocata: 'MG Casa 1-3', label: 'MG Casa 1-3' },
      { giocata: 'MG Casa 2-5', label: 'MG Casa 2-5' },
    ]
  },
  {
    familyId: 'multigol', label: 'MULTIGOL OSPITE', icon: '📊',
    giocate: [
      { giocata: 'MG Ospite 0-2', label: 'MG Ospite 0-2' },
      { giocata: 'MG Ospite 1-3', label: 'MG Ospite 1-3' },
      { giocata: 'MG Ospite 2-5', label: 'MG Ospite 2-5' },
    ]
  },
  {
    familyId: 'multigol', label: 'MULTIGOL TOTALE', icon: '📊',
    giocate: [
      { giocata: 'MG Tot 1-4', label: 'MG Tot 1-4' },
      { giocata: 'MG Tot 2-5', label: 'MG Tot 2-5' },
    ]
  },
  {
    familyId: 'dc_over', label: 'DC + OVER', icon: '🔗',
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
    ]
  },
  {
    familyId: 'dc_under', label: 'DC + UNDER', icon: '🔗',
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
    ]
  },
  {
    familyId: 'mg_casa_ospite', label: 'MG CASA + OSPITE', icon: '⚔️',
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
    ]
  },
  {
    familyId: 'dc_multigol', label: 'DC + MULTIGOL', icon: '🔗',
    giocate: [
      { giocata: '1X+MG Tot 1-4', label: '1X+MG Tot 1-4' },
      { giocata: '12+MG Tot 1-4', label: '12+MG Tot 1-4' },
      { giocata: 'X2+MG Tot 1-4', label: 'X2+MG Tot 1-4' },
      { giocata: '1X+MG Tot 2-5', label: '1X+MG Tot 2-5' },
      { giocata: '12+MG Tot 2-5', label: '12+MG Tot 2-5' },
      { giocata: 'X2+MG Tot 2-5', label: 'X2+MG Tot 2-5' },
    ]
  },
];

// ============================================================
// PICCOLA QUOTA INLINE
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
        padding, marginLeft: '4px', borderRadius: '4px',
        background: isValue ? 'rgba(111, 207, 151, 0.2)' : 'rgba(255, 255, 255, 0.08)',
        border: `1px solid ${isValue ? 'var(--win)' : 'var(--border)'}`,
        fontSize, fontWeight: 'bold',
        color: isValue ? 'var(--win)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }}
    >
      💰{quotaBook.toFixed(2)}
    </span>
  );
};

// ============================================================
// COMPONENTE: SCHEDINA QUOTA (nuova tab)
// ============================================================
const SchedinaQuotaComponent = ({
  matches,
  giocateSelezionate,
  campionatiSelezionati,
  filtroOrario,
  giorniRange,
  showAlert,
}) => {
  const { useState, useMemo } = React;

  const getTodayStr = window.getTodayStr;
  const addDaysToDateStr = window.addDaysToDateStr;
  const normalizeDate = window.normalizeDate;
  const parseDate = window.parseDate;
  const formatDateEU = window.formatDateEU;
  const getChampColor = window.getChampColor;
  const getPercentualeClasse = window.getPercentualeClasse;
  const getGiocataPct = window.getGiocataPct;
  const computeMatchStats = window.computeMatchStats;
  const calcolaGG_NG = window.calcolaGG_NG;

  const [quotaTarget, setQuotaTarget] = useState(3.00);
  const [schedinaGenerata, setSchedinaGenerata] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [tolleranzaPct, setTolleranzaPct] = useState(15); // ±15% accettabile

  const QUOTA_PRESETS = [2.00, 2.50, 3.00, 4.00, 5.00, 7.50, 10.00, 15.00, 20.00, 30.00, 50.00];

  // ============================================================
  // 1. PARTITE DISPONIBILI (future, filtrate per campionato + range giorni + orario)
  // ============================================================
  const partiteDisponibili = useMemo(() => {
    const todayStr = getTodayStr();
    const maxDateStr = addDaysToDateStr(todayStr, giorniRange);

    let partite = matches.filter(m => m.stato === 'Futura');

    if (campionatiSelezionati && campionatiSelezionati.length > 0) {
      partite = partite.filter(m => campionatiSelezionati.includes(m.campionato));
    } else {
      return [];
    }

    partite = partite.filter(m => {
      if (!m.data) return false;
      const normalized = normalizeDate(m.data);
      if (!normalized) return false;
      return normalized >= todayStr && normalized <= maxDateStr;
    });

    // Filtro orario
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
        if (matchDate === todayStr) {
          return matchTotalMinutes > currentTotalMinutes;
        }
        return true;
      });
    }

    return partite;
  }, [matches, campionatiSelezionati, giorniRange, filtroOrario]);

  // ============================================================
  // 2. MAPPA GIOCATE SELEZIONATE (familyId + giocata)
  // ============================================================
  const giocateDaUsare = useMemo(() => {
    if (!giocateSelezionate || giocateSelezionate.length === 0) return [];
    if (giocateSelezionate.includes('tutte')) return null; // null = tutte le famiglie
    return giocateSelezionate.filter(s => typeof s === 'object' && s.familyId && s.giocata);
  }, [giocateSelezionate]);

  // ============================================================
  // 3. CALCOLA CANDIDATI: per ogni partita, migliore giocata con quota
  // ============================================================
  const candidati = useMemo(() => {
    if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') {
      return [];
    }

    const out = [];

    partiteDisponibili.forEach(match => {
      let stats;
      try {
        stats = computeMatchStats(match, matches);
      } catch (e) { return; }
      if (!stats || stats.error) return;

      stats._allMatches = matches;
      stats._homeTeam = match.casa;
      stats._awayTeam = match.ospiti;

      const homeMG = stats.homeMG || {};
      const awayMG = stats.awayMG || {};
      const mgTot = stats.mgTot || {};

      // Determina le giocate candidate per questa partita
      let giocateCandidatePartita = [];

      if (giocateDaUsare === null) {
        // Modalità "Tutte": per ogni famiglia, la migliore giocata
        Object.keys(window.FAMIGLIE_GIOCATE || {}).forEach(familyId => {
          const family = window.FAMIGLIE_GIOCATE[familyId];
          if (!family) return;

          let best = null;
          if (familyId === 'gg_ng') {
            const ggNgResult = calcolaGG_NG ? calcolaGG_NG(stats) : null;
            if (ggNgResult) {
              best = {
                familyId: 'gg_ng',
                familyLabel: family.label,
                familyIcon: family.icon,
                giocata: ggNgResult.giocata,
                label: ggNgResult.label,
                pct: ggNgResult.pct,
              };
            }
          } else {
            let bestPct = -1, bestOpt = null;
            family.options.forEach(opt => {
              let pct = 0;
              try { pct = getGiocataPct(opt, stats, homeMG, awayMG, mgTot) || 0; }
              catch (e) { pct = 0; }
              if (pct > bestPct) { bestPct = pct; bestOpt = opt; }
            });
            if (bestOpt && bestPct > 0) {
              best = {
                familyId,
                familyLabel: family.label,
                familyIcon: family.icon,
                giocata: bestOpt,
                label: bestOpt,
                pct: bestPct,
              };
            }
          }
          if (best) giocateCandidatePartita.push(best);
        });
      } else {
        // Modalità "giocate specifiche": solo quelle selezionate
        giocateDaUsare.forEach(sel => {
          const family = window.FAMIGLIE_GIOCATE[sel.familyId];
          if (!family) return;

          let pct = 0;
          if (sel.familyId === 'gg_ng') {
            const ggNg = calcolaGG_NG ? calcolaGG_NG(stats) : null;
            if (ggNg) {
              pct = sel.giocata === 'GG' ? ggNg.gg : (sel.giocata === 'NG' ? ggNg.ng : 0);
            }
          } else {
            try { pct = getGiocataPct(sel.giocata, stats, homeMG, awayMG, mgTot) || 0; }
            catch (e) { pct = 0; }
          }

          if (pct > 0) {
            giocateCandidatePartita.push({
              familyId: sel.familyId,
              familyLabel: family.label,
              familyIcon: family.icon,
              giocata: sel.giocata,
              label: sel.giocata,
              pct,
            });
          }
        });
      }

      if (giocateCandidatePartita.length === 0) return;

      // Tra le candidate, scegli quella con % più alta
      giocateCandidatePartita.sort((a, b) => b.pct - a.pct);
      const migliore = giocateCandidatePartita[0];

      // Recupera la quota
      let quota = null;
      try {
        const q = window.QuoteManager.analizzaGiocata(match, migliore.familyId, migliore.giocata, migliore.pct);
        if (q && q.quotaBook) quota = q.quotaBook;
      } catch (e) { quota = null; }

      if (!quota || quota <= 1) return;

      out.push({
        match,
        familyId: migliore.familyId,
        familyLabel: migliore.familyLabel,
        familyIcon: migliore.familyIcon,
        giocata: migliore.giocata,
        label: migliore.label,
        displayLabel: formatGiocataLabel(migliore.familyId, migliore.giocata),
        pct: Math.round(migliore.pct),
        quota,
        isBomb: migliore.pct >= 90,
      });
    });

    return out;
  }, [partiteDisponibili, matches, giocateDaUsare]);

  // ============================================================
  // 4. GENERA SCHEDINA
  // ============================================================
  const generaSchedina = () => {
    if (candidati.length === 0) {
      showAlert('error', '❌ Nessuna partita con quote disponibili. Importa un PDF quote.');
      return;
    }

    setGenerando(true);

    const target = parseFloat(quotaTarget) || 3.00;
    const minQuota = target * (1 - tolleranzaPct / 100);
    const maxQuota = target * (1 + tolleranzaPct / 100);

    // Ordina per % decrescente (le più sicure prima)
    // A parità di %, preferisci quota più alta
    const ordinati = [...candidati].sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      return b.quota - a.quota;
    });

    // Algoritmo greedy: aggiungi partite finché prodotto >= target
    const selezionate = [];
    const usate = new Set();
    let prodotto = 1;

    // Fase 1: cerca la singola partita con quota più vicina al target (ma non oltre)
    // (in caso target piccolo, es. 2.00)
    let migliorSingola = null;
    for (const c of ordinati) {
      if (c.quota >= minQuota && c.quota <= maxQuota) {
        if (!migliorSingola || c.pct > migliorSingola.pct) migliorSingola = c;
      }
    }
    if (migliorSingola && target < 3.5) {
      selezionate.push(migliorSingola);
      usate.add(migliorSingola.match.id);
      prodotto = migliorSingola.quota;
    } else {
      // Fase 2: greedy su più partite
      for (const c of ordinati) {
        if (usate.has(c.match.id)) continue;
        if (selezionate.length >= 10) break;

        // Se il prodotto attuale è già nel range, fermati
        if (prodotto >= minQuota) break;

        // Aggiungi questa partita
        selezionate.push(c);
        usate.add(c.match.id);
        prodotto *= c.quota;
      }
    }

    // Se dopo il greedy il prodotto è ancora < target, prova ad aggiungere
    // altre partite (anche se % più bassa) finché non ci arrivi (max 10)
    if (prodotto < minQuota) {
      for (const c of ordinati) {
        if (usate.has(c.match.id)) continue;
        if (selezionate.length >= 10) break;
        if (prodotto >= minQuota) break;
        selezionate.push(c);
        usate.add(c.match.id);
        prodotto *= c.quota;
      }
    }

    if (selezionate.length < 2) {
      showAlert('error', '❌ Impossibile raggiungere la quota target con le partite disponibili.');
      setGenerando(false);
      return;
    }

    // Ordina per data/ora crescente
    selezionate.sort((a, b) => {
      const da = normalizeDate(a.match.data);
      const db = normalizeDate(b.match.data);
      if (da && db && da !== db) return da.localeCompare(db);
      const oa = a.match.ora || '99:99';
      const ob = b.match.ora || '99:99';
      return oa.localeCompare(ob);
    });

    const quotaFinale = parseFloat(prodotto.toFixed(2));
    const diff = quotaFinale - target;
    const diffPct = ((diff / target) * 100).toFixed(1);
    const mediaPct = Math.round(selezionate.reduce((s, x) => s + x.pct, 0) / selezionate.length);

    const stato = (quotaFinale >= minQuota && quotaFinale <= maxQuota)
      ? 'ok'
      : (quotaFinale > maxQuota ? 'sopra' : 'sotto');

    setSchedinaGenerata({
      partite: selezionate,
      quotaFinale,
      quotaTarget: target,
      diff,
      diffPct,
      mediaPct,
      stato,
      numPartite: selezionate.length,
    });

    setGenerando(false);
    showAlert('success', `✅ Schedina generata! Quota ${quotaFinale} (target ${target})`);
  };

  const resetSchedina = () => {
    setSchedinaGenerata(null);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div>
      {/* SEZIONE INPUT */}
      <div className="card" style={{marginBottom: '16px'}}>
        <h3 style={{color: 'var(--accent)', marginBottom: '14px', fontSize: '18px'}}>
          💰 Genera Schedina da Quota Target
        </h3>

        {/* Info giocate usate */}
        <div style={{
          marginBottom: '14px',
          padding: '10px 14px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          fontSize: '12px',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>
            🎯 Giocate in uso:{' '}
            {giocateDaUsare === null ? (
              <b style={{ color: 'var(--accent)' }}>Tutte le famiglie</b>
            ) : giocateDaUsare.length === 0 ? (
              <b style={{ color: 'var(--neon-red)' }}>Nessuna (seleziona in "🎯 Seleziona Giocate")</b>
            ) : (
              <b style={{ color: 'var(--win)' }}>
                {giocateDaUsare.map(s => formatGiocataLabel(s.familyId, s.giocata)).join(' • ')}
              </b>
            )}
            <span style={{ marginLeft: '10px', color: 'var(--text-dim)' }}>
              ({candidati.length} partite con quota disponibile)
            </span>
          </span>
        </div>

        {/* Input quota target + preset */}
        <div style={{marginBottom: '14px'}}>
          <label style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '6px'}}>
            🎯 Quota totale desiderata
          </label>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number"
              step="0.05"
              min="1.01"
              value={quotaTarget}
              onChange={e => setQuotaTarget(parseFloat(e.target.value) || 1.01)}
              style={{
                width: '120px',
                padding: '10px 14px',
                background: 'var(--surface)',
                color: 'var(--accent)',
                border: '2px solid var(--accent)',
                borderRadius: '8px',
                fontSize: '20px',
                fontWeight: 'bold',
                fontFamily: 'Orbitron, monospace',
                textAlign: 'center',
              }}
            />

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
              {QUOTA_PRESETS.map(q => (
                <button
                  key={q}
                  className="btn"
                  onClick={() => setQuotaTarget(q)}
                  style={{
                    fontSize: '11px',
                    padding: '5px 12px',
                    background: quotaTarget === q ? 'var(--accent)' : 'var(--surface)',
                    color: quotaTarget === q ? '#000' : 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: quotaTarget === q ? 'bold' : 'normal',
                  }}
                >
                  {q.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tolleranza */}
        <div style={{marginBottom: '14px'}}>
          <label style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
            <span>📊 Tolleranza accettabile</span>
            <span style={{ color: 'var(--accent)' }}>±{tolleranzaPct}%</span>
          </label>
          <input
            type="range"
            min="5"
            max="40"
            step="5"
            value={tolleranzaPct}
            onChange={e => setTolleranzaPct(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
            <span>±5%</span>
            <span>±40%</span>
          </div>
        </div>

        {/* Pulsanti azione */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={generaSchedina}
            disabled={generando || candidati.length === 0}
            style={{
              background: candidati.length > 0 ? 'var(--accent)' : 'var(--surface)',
              color: candidati.length > 0 ? '#000' : 'var(--text-muted)',
              fontWeight: 'bold',
              padding: '10px 24px',
              fontSize: '14px',
              cursor: candidati.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            {generando ? '⏳ Generazione...' : '⚡ Genera Schedina'}
          </button>

          {schedinaGenerata && (
            <button className="btn btn-secondary" onClick={resetSchedina}>
              🗑️ Resetta
            </button>
          )}
        </div>
      </div>

      {/* SEZIONE RISULTATO */}
      {schedinaGenerata && (
        <div className="card" style={{border: `2px solid ${schedinaGenerata.stato === 'ok' ? 'var(--win)' : (schedinaGenerata.stato === 'sopra' ? 'var(--neon-gold)' : 'var(--neon-red)')}`}}>
          {/* Header risultato */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '14px',
            paddingBottom: '12px',
            borderBottom: '2px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Quota raggiunta
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: 900,
                fontFamily: 'Orbitron, monospace',
                color: schedinaGenerata.stato === 'ok' ? 'var(--win)' : (schedinaGenerata.stato === 'sopra' ? 'var(--neon-gold)' : 'var(--neon-red)'),
                textShadow: schedinaGenerata.stato === 'ok' ? '0 0 16px var(--win)' : 'none',
              }}>
                {schedinaGenerata.quotaFinale.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Target: {schedinaGenerata.quotaTarget.toFixed(2)} ({schedinaGenerata.diff >= 0 ? '+' : ''}{schedinaGenerata.diff.toFixed(2)} • {schedinaGenerata.diffPct}%)
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                📊 <b>{schedinaGenerata.numPartite}</b> partite
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                ⭐ Media %: <b style={{ color: 'var(--accent)' }}>{schedinaGenerata.mediaPct}%