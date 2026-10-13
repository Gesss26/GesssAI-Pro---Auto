// ============================================================
// schedina.js - Modulo Schedina con quote PDF visibili
// v9.1: Sub-tab "Schedina Classica" + "Schedina Quota"
//       - Griglia campionati 5 colonne
//       - Campionati in ordine alfabetico
//       - Schedina Quota con tolleranza ±0.10 fissa
// ============================================================

const formatGiocataLabel = (familyId, label) => {
  if (!label) return '—';

  if (label.startsWith('Over '))  return label;
  if (label.startsWith('Under ')) return label.replace('.', ',');

  if (familyId === 'multigol') {
    return label;
  }

  if (familyId === 'mg_casa_ospite') {
    const parts = label.split('+');
    if (parts.length === 2) {
      return `MG ${parts[0]} Casa + MG ${parts[1]} Ospite`;
    }
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
  tipoGiocate,
  calcolaTop3GiocatePerPartita,
  getPartiteDisponibili,
  showAlert,
  ordinaPartitePerDataOra,
  formatGiocataLabel,
  getPercentualeClasse,
  normalizeDate,
  formatDateEU,
  getChampColor,
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

  // CANDIDATI
  const candidati = useMemo(() => {
    if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') {
      return [];
    }

    const partite = getPartiteDisponibili();
    const out = [];

    partite.forEach(match => {
      let dettagli;
      try {
        dettagli = calcolaTop3GiocatePerPartita(match);
      } catch (e) { return; }

      const listaGiocate = tipoGiocate === 'scelte'
        ? (dettagli.top3Scelte || [])
        : (dettagli.top3Calcolate || []);

      if (!listaGiocate || listaGiocate.length === 0) return;

      const migliore = listaGiocate[0];

      let quota = null;
      try {
        const q = window.QuoteManager.analizzaGiocata(
          match, migliore.familyId, migliore.giocata, migliore.pct
        );
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
        displayLabel: migliore.displayLabel || formatGiocataLabel(migliore.familyId, migliore.giocata),
        pct: Math.round(migliore.pct),
        quota,
        isBomb: migliore.pct >= 90,
      });
    });

    return out.sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      return b.quota - a.quota;
    });
  }, [getPartiteDisponibili, calcolaTop3GiocatePerPartita, tipoGiocate, formatGiocataLabel]);

  // ALGORITMO
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
      } else if (prodottoSenzaUltima < minQuota) {
        let miglioreSostituta = null;
        let miglioreDiff = Infinity;

        for (const c of candidati) {
          if (c.match.id === ultima.match.id) continue;
          if (usate.has(c.match.id)) continue;
          const nuovoProdotto = prodottoSenzaUltima * c.quota;
          const diff = Math.abs(nuovoProdotto - target);
          if (diff < miglioreDiff && nuovoProdotto >= minQuota && nuovoProdotto <= maxQuota) {
            miglioreDiff = diff;
            miglioreSostituta = c;
          }
        }

        if (miglioreSostituta) {
          usate.delete(ultima.match.id);
          usate.add(miglioreSostituta.match.id);
          selezionate[selezionate.length - 1] = miglioreSostituta;
          prodotto = prodottoSenzaUltima * miglioreSostituta.quota;
        }
      }
    }

    const selezionateOrdinate = ordinaPartitePerDataOra(selezionate);

    const quotaFinale = parseFloat(prodotto.toFixed(2));
    const diff = quotaFinale - target;
    const diffAssoluta = Math.abs(diff);

    let stato;
    if (diffAssoluta <= TOLLERANZA_FISSA) {
      stato = 'ok';
    } else if (quotaFinale > target) {
      stato = 'sopra';
    } else if (target - quotaFinale <= 0.30) {
      stato = 'vicino';
    } else {
      stato = 'sotto';
    }

    if (selezionateOrdinate.length < MIN_PARTITE) {
      stato = 'insufficiente';
    }

    const mediaPct = selezionateOrdinate.length > 0
      ? Math.round(selezionateOrdinate.reduce((s, x) => s + x.pct, 0) / selezionateOrdinate.length)
      : 0;

    return {
      partite: selezionateOrdinate,
      quotaFinale,
      quotaTarget: target,
      diff,
      diffAssoluta,
      mediaPct,
      stato,
      numPartite: selezionateOrdinate.length,
    };
  }, [candidati, ordinaPartitePerDataOra]);

  const generaSchedina = () => {
    if (candidati.length === 0) {
      showAlert('error', '❌ Nessuna partita con quote disponibili. Importa un PDF quote.');
      return;
    }

    setGenerando(true);
    setMostraCandidate(false);

    const target = parseFloat(quotaTarget) || QUOTA_TARGET_DEFAULT;
    const risultato = eseguiAlgoritmo(target);

    setSchedinaGenerata(risultato);
    setGenerando(false);

    if (risultato.stato === 'insufficiente') {
      showAlert('error', '❌ Impossibile raggiungere la quota target con le partite disponibili.');
    } else if (risultato.stato === 'ok') {
      showAlert('success', `✅ Schedina generata! Quota ${risultato.quotaFinale.toFixed(2)} (target ${target.toFixed(2)})`);
    } else if (risultato.stato === 'vicino') {
      showAlert('info', `⚠️ Quota vicina: ${risultato.quotaFinale.toFixed(2)} vs target ${target.toFixed(2)}`);
    } else {
      showAlert('success', `✅ Schedina generata! Quota ${risultato.quotaFinale.toFixed(2)}`);
    }
  };

  const resetSchedina = () => {
    setSchedinaGenerata(null);
    setMostraCandidate(false);
  };

  const aggiungiPartita = (candidato) => {
    if (!schedinaGenerata) return;
    if (schedinaGenerata.partite.length >= MAX_PARTITE) {
      showAlert('error', `⚠️ Massimo ${MAX_PARTITE} partite!`);
      return;
    }
    if (schedinaGenerata.partite.some(p => p.match.id === candidato.match.id)) {
      showAlert('info', 'ℹ️ Partita già presente.');
      return;
    }

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

    setSchedinaGenerata({
      ...schedinaGenerata,
      partite: nuoveOrdinate,
      quotaFinale,
      diff,
      diffAssoluta,
      mediaPct,
      stato,
      numPartite: nuoveOrdinate.length,
    });
    showAlert('success', `➕ Aggiunta: ${candidato.match.casa} vs ${candidato.match.ospiti} (${candidato.displayLabel})`);
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

    const mediaPct = nuovePartite.length > 0
      ? Math.round(nuovePartite.reduce((s, x) => s + x.pct, 0) / nuovePartite.length)
      : 0;

    setSchedinaGenerata({
      ...schedinaGenerata,
      partite: nuovePartite,
      quotaFinale,
      diff,
      diffAssoluta,
      mediaPct,
      stato,
      numPartite: nuovePartite.length,
    });
    showAlert('info', '➖ Ultima partita rimossa');
  };

  const copiaSchedinaQuota = () => {
    if (!schedinaGenerata) return;
    const lines = [];
    lines.push('💰 *SCHEDINA QUOTA - GesssAI-Pro*');
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

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ color: 'var(--accent)', marginBottom: '14px', fontSize: '18px' }}>
          💰 Genera Schedina da Quota Target
        </h3>

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
            {giocateSelezionate.includes('tutte') ? (
              <b style={{ color: 'var(--accent)' }}>Tutte le famiglie</b>
            ) : (
              <b style={{ color: 'var(--win)' }}>
                {giocateSelezionate
                  .filter(s => typeof s === 'object')
                  .map(s => formatGiocataLabel(s.familyId, s.giocata))
                  .join(' • ')}
              </b>
            )}
            <span style={{ marginLeft: '10px', color: 'var(--text-dim)' }}>
              ({candidati.length} partite con quota disponibile)
            </span>
          </span>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
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
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
            Tolleranza fissa: <b>±{TOLLERANZA_FISSA.toFixed(2)}</b> sulla quota finale • Range valido: {Math.max(1.01, quotaTarget - TOLLERANZA_FISSA).toFixed(2)} – {(quotaTarget + TOLLERANZA_FISSA).toFixed(2)}
          </div>
        </div>

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

      {schedinaGenerata && (
        <div className="card" style={{ border: `2px solid ${coloreStato}` }}>
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
                fontSize: '36px',
                fontWeight: 900,
                fontFamily: 'Orbitron, monospace',
                color: coloreStato,
                textShadow: statoSchedina === 'ok' ? '0 0 16px var(--win)' : 'none',
              }}>
                {schedinaGenerata.quotaFinale.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Target: {schedinaGenerata.quotaTarget.toFixed(2)} • Diff: {schedinaGenerata.diff >= 0 ? '+' : ''}{schedinaGenerata.diff.toFixed(2)} (max ±{TOLLERANZA_FISSA.toFixed(2)})
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
            <div style={{
              padding: '10px 14px', marginBottom: '12px',
              background: 'rgba(111, 207, 151, 0.15)',
              border: '1px solid var(--win)',
              borderRadius: '8px', fontSize: '13px', color: 'var(--win)',
            }}>
              ✅ <b>Quota nel range target!</b> La schedina è ottimale.
            </div>
          )}
          {statoSchedina === 'vicino' && (
            <div style={{
              padding: '10px 14px', marginBottom: '12px',
              background: 'rgba(243, 156, 18, 0.15)',
              border: '1px solid var(--neon-gold)',
              borderRadius: '8px', fontSize: '13px', color: 'var(--neon-gold)',
            }}>
              ⚠️ <b>Quota vicina al target</b> (mancano {(schedinaGenerata.quotaTarget - schedinaGenerata.quotaFinale).toFixed(2)}). Vuoi aggiungere un'ulteriore partita?
            </div>
          )}
          {statoSchedina === 'sopra' && (
            <div style={{
              padding: '10px 14px', marginBottom: '12px',
              background: 'rgba(243, 156, 18, 0.15)',
              border: '1px solid var(--neon-gold)',
              borderRadius: '8px', fontSize: '13px', color: 'var(--neon-gold)',
            }}>
              ⚠️ Quota sopra il target di {schedinaGenerata.diff.toFixed(2)}. Puoi rimuovere l'ultima partita.
            </div>
          )}
          {statoSchedina === 'sotto' && (
            <div style={{
              padding: '10px 14px', marginBottom: '12px',
              background: 'rgba(235, 87, 87, 0.15)',
              border: '1px solid var(--neon-red)',
              borderRadius: '8px', fontSize: '13px', color: 'var(--neon-red)',
            }}>
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
                      <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                        {p.match.casa} vs {p.match.ospiti}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                        {formatDateEU(p.match.data)} {p.match.ora || ''} • {p.match.campionato}
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        color: p.familyId === 'gg_ng' ? '#e74c3c' : 'var(--accent)',
                      }}>
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
                      <button
                        onClick={() => {
                          if (schedinaGenerata.partite.length <= MIN_PARTITE) {
                            showAlert('error', `⚠️ Minimo ${MIN_PARTITE} partite!`);
                            return;
                          }
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
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          color: 'var(--neon-red)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '2px 8px',
                        }}
                        title="Rimuovi questa partita"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn"
              onClick={() => setMostraCandidate(v => !v)}
              disabled={schedinaGenerata.partite.length >= MAX_PARTITE || candidatiDisponibili.length === 0}
              style={{
                background: 'var(--accent2)',
                color: '#000',
                fontWeight: 'bold',
                opacity: schedinaGenerata.partite.length >= MAX_PARTITE ? 0.5 : 1,
              }}
            >
              ➕ Aggiungi partita {mostraCandidate ? '▲' : '▼'}
            </button>

            <button
              className="btn"
              onClick={rimuoviUltima}
              disabled={schedinaGenerata.partite.length <= MIN_PARTITE}
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                opacity: schedinaGenerata.partite.length <= MIN_PARTITE ? 0.5 : 1,
              }}
            >
              ➖ Rimuovi ultima
            </button>

            <button className="btn" onClick={generaSchedina} style={{ background: 'var(--accent)', color: '#000', fontWeight: 'bold' }}>
              🎲 Rigenera
            </button>

            <button className="btn" onClick={copiaSchedinaQuota} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              📋 Copia
            </button>
          </div>

          {mostraCandidate && candidatiDisponibili.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}>
              <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '10px' }}>
                ➕ Partite disponibili da aggiungere ({candidatiDisponibili.length})
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginLeft: '8px', fontWeight: 'normal' }}>
                  ordinate per % decrescente
                </span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                {candidatiDisponibili.slice(0, 30).map(c => (
                  <div key={c.match.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    gap: '8px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '12px' }}>
                        {c.match.casa} vs {c.match.ospiti}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                        {formatDateEU(c.match.data)} {c.match.ora || ''} • {c.match.campionato}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      color: c.familyId === 'gg_ng' ? '#e74c3c' : 'var(--accent)',
                    }}>
                      {c.displayLabel}
                    </span>
                    <span className={`giocata-pct ${getPercentualeClasse(c.pct)}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {c.pct}%
                    </span>
                    <span style={{ fontWeight: 'bold', color: 'var(--win)', fontFamily: 'Orbitron, monospace', minWidth: '50px', textAlign: 'right' }}>
                      {c.quota.toFixed(2)}
                    </span>
                    <button
                      className="btn"
                      onClick={() => aggiungiPartita(c)}
                      style={{
                        background: 'var(--accent)',
                        color: '#000',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        padding: '4px 12px',
                      }}
                    >
                      ➕
                    </button>
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
  palinsestoGiorniRange = 1,
  renderGiorniButtons,
  renderChampFilters,
  CHAMPIONSHIP_LIST
}) => {
  const { useState, useMemo, useCallback } = React;

  const getChampColor = window.getChampColor || (() => '#95a5a6');
  const computeMatchStats = window.computeMatchStats;
  const getMultigolRange = window.getMultigolRange;
  const getBestBetForFamily = window.getBestBetForFamily;
  const getPercentualeClasse = window.getPercentualeClasse;
  const normalizeDate = window.normalizeDate;
  const getTodayStr = window.getTodayStr;
  const addDaysToDateStr = window.addDaysToDateStr;
  const formatDateEU = window.formatDateEU;
  const getGiocataPct = window.getGiocataPct;
  const calcolaGG_NG = window.calcolaGG_NG;

  const { giorni: giorniRange, setGiorni: setGiorniRange } =
    window.FiltriCampionati.useGiorniRange();

  const {
    filtro: campionatiSelezionatiObj,
    toggleCampionato,
    selezionaTutti: selezionaTuttiCampionati,
    deselezionaTutti: deselezionaTuttiCampionati,
    campionatiAttivi,
  } = window.FiltriCampionati.useFiltroCampionati();

  const campionatiSelezionati = campionatiAttivi;

  // ⭐ SUB-TAB
  const [sottoTab, setSottoTab] = useState('classica');

  const [partiteSelezionate, setPartiteSelezionate] = useState([]);
  const [schedinaCreata, setSchedinaCreata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [giocateSelezionate, setGiocateSelezionate] = useState(['tutte']);
  const [showSchedinaModal, setShowSchedinaModal] = useState(false);
  const [casualitaLevel, setCasualitaLevel] = useState(30);
  const [schedineSalvate, setSchedineSalvate] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ft_schedine_salvate') || '[]');
    } catch { return []; }
  });
  const [numeroPartiteDaSelezionare, setNumeroPartiteDaSelezionare] = useState(5);
  const [filtroOrario, setFiltroOrario] = useState('dopo_ora');

  const [ordinamento, setOrdinamento] = useState('data_pct');
  const [tipoGiocate, setTipoGiocate] = useState('calcolate');

  const MAX_GIOCATE = 3;

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const ordinaPartitePerDataOra = useCallback((partite) => {
    return [...partite].sort((a, b) => {
      const dateA = normalizeDate(a.data);
      const dateB = normalizeDate(b.data);

      if (dateA && dateB && dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const oraA = a.ora || '00:00';
      const oraB = b.ora || '00:00';

      const parseOra = (ora) => {
        if (ora === 'TBD' || ora === 'N/D' || !ora) return { h: 99, m: 99 };
        const parts = ora.split(':');
        if (parts.length < 2) return { h: 99, m: 99 };
        return {
          h: parseInt(parts[0], 10) || 99,
          m: parseInt(parts[1], 10) || 99
        };
      };

      const oraAParsed = parseOra(oraA);
      const oraBParsed = parseOra(oraB);

      if (oraAParsed.h !== oraBParsed.h) {
        return oraAParsed.h - oraBParsed.h;
      }
      return oraAParsed.m - oraBParsed.m;
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

    partite = partite.filter(m => {
      if (!m.ora || m.ora === 'TBD' || m.ora === 'N/D') {
        return true;
      }

      const matchDate = normalizeDate(m.data);
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStrInner = getTodayStr();

      if (matchDate !== todayStrInner) {
        return true;
      }

      const timeParts = m.ora.split(':');
      if (timeParts.length < 2) return true;

      const matchHour = parseInt(timeParts[0], 10);
      const matchMinutes = parseInt(timeParts[1], 10);
      if (isNaN(matchHour) || isNaN(matchMinutes)) return true;

      const matchTotalMinutes = matchHour * 60 + matchMinutes;

      return matchTotalMinutes > currentTotalMinutes;
    });

    if (filtroOrario === 'dopo_ora') {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

      partite = partite.filter(m => {
        if (!m.ora || m.ora === 'TBD' || m.ora === 'N/D') {
          return true;
        }
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
  }, [matches, campionatiSelezionati, giorniRange, filtroOrario, normalizeDate, getTodayStr, addDaysToDateStr]);

  const calcolaTop3GiocatePerPartita = useCallback((match) => {
    const stats = computeMatchStats(match, matches);
    if (stats.error) {
      return {
        top3Calcolate: [], top3Scelte: [], scoreCalcolate: 0, scoreScelte: 0, tutteGiocate: []
      };
    }

    stats._allMatches = matches;
    stats._homeTeam = match.casa;
    stats._awayTeam = match.ospiti;

    const homeMG = stats.homeMG || {};
    const awayMG = stats.awayMG || {};
    const mgTot = stats.mgTot || {};
    const homeRange = getMultigolRange(match.casa, matches);
    const awayRange = getMultigolRange(match.ospiti, matches);

    const tutteCalcolate = [];

    Object.keys(window.FAMIGLIE_GIOCATE || {}).forEach(familyId => {
      const family = window.FAMIGLIE_GIOCATE[familyId];
      if (!family) return;

      let best = null;

      if (familyId === 'gg_ng') {
        const ggNgResult = calcolaGG_NG ? calcolaGG_NG(stats) : null;
        if (ggNgResult) {
          best = {
            ...ggNgResult,
            familyId: 'gg_ng',
            familyLabel: family.label,
            familyIcon: family.icon,
          };
        }
      } else {
        const bestBet = getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
        if (bestBet && bestBet.pct > 0) {
          best = {
            ...bestBet,
            familyId: familyId,
            familyLabel: family.label,
            familyIcon: family.icon,
          };
        }
      }

      if (best && best.pct > 0) {
        best.displayLabel = formatGiocataLabel(familyId, best.label);
        tutteCalcolate.push(best);
      }
    });

    tutteCalcolate.sort((a, b) => b.pct - a.pct);
    const top3Calcolate = tutteCalcolate.slice(0, 3);
    const scoreCalcolate = top3Calcolate.length > 0
      ? Math.round(top3Calcolate.reduce((s, g) => s + g.pct, 0) / top3Calcolate.length)
      : 0;

    const top3Scelte = [];
    const isTutteMode = giocateSelezionate.includes('tutte') || giocateSelezionate.length === 0;

    if (!isTutteMode) {
      giocateSelezionate.forEach(sel => {
        if (typeof sel !== 'object' || !sel.familyId || !sel.giocata) return;

        const { familyId, giocata } = sel;
        const family = window.FAMIGLIE_GIOCATE[familyId];
        if (!family) return;

        let pct = 0;
        if (familyId === 'gg_ng') {
          const ggNg = calcolaGG_NG ? calcolaGG_NG(stats) : null;
          if (ggNg) {
            pct = giocata === 'GG' ? ggNg.gg : ggNg.ng;
          }
        } else {
          pct = getGiocataPct(giocata, stats, homeMG, awayMG, mgTot);
        }

        if (pct > 0) {
          top3Scelte.push({
            familyId,
            familyLabel: family.label,
            familyIcon: family.icon,
            giocata,
            label: giocata,
            displayLabel: formatGiocataLabel(familyId, giocata),
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

    return {
      top3Calcolate, top3Scelte, scoreCalcolate, scoreScelte, tutteGiocate: tutteCalcolate
    };
  }, [matches, giocateSelezionate, computeMatchStats, getMultigolRange, getBestBetForFamily, calcolaGG_NG, getGiocataPct, formatGiocataLabel]);

  const partiteDisponibili = useMemo(() => {
    const partite = getPartiteDisponibili();
    const partiteConDettagli = partite.map(m => {
      const dettagli = calcolaTop3GiocatePerPartita(m);
      return {
        ...m,
        top3Calcolate: dettagli.top3Calcolate,
        top3Scelte: dettagli.top3Scelte,
        scoreCalcolate: dettagli.scoreCalcolate,
        scoreScelte: dettagli.scoreScelte,
        tutteGiocate: dettagli.tutteGiocate || []
      };
    });

    return partiteConDettagli.sort((a, b) => {
      const dateA = normalizeDate(a.data);
      const dateB = normalizeDate(b.data);

      const scoreA = tipoGiocate === 'scelte' ? (a.scoreScelte || 0) : (a.scoreCalcolate || 0);
      const scoreB = tipoGiocate === 'scelte' ? (b.scoreScelte || 0) : (b.scoreCalcolate || 0);

      if (ordinamento === 'data_pct') {
        if (dateA && dateB && dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        const oraA = a.ora || '00:00';
        const oraB = b.ora || '00:00';
        return oraA.localeCompare(oraB);
      } else {
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        if (dateA && dateB && dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        const oraA = a.ora || '00:00';
        const oraB = b.ora || '00:00';
        return oraA.localeCompare(oraB);
      }
    });
  }, [getPartiteDisponibili, calcolaTop3GiocatePerPartita, ordinamento, tipoGiocate, normalizeDate]);

  const selezionaNumeroPartite = (n) => {
    if (partiteDisponibili.length === 0) {
      showAlert('info', 'ℹ️ Nessuna partita disponibile.');
      return;
    }

    const numeroDaPrendere = Math.min(n, partiteDisponibili.length, 10);
    let messaggioExtra = '';

    const ordinatePerScore = [...partiteDisponibili].sort((a, b) => {
      const scoreA = tipoGiocate === 'scelte' ? (a.scoreScelte || 0) : (a.scoreCalcolate || 0);
      const scoreB = tipoGiocate === 'scelte' ? (b.scoreScelte || 0) : (b.scoreCalcolate || 0);
      return scoreB - scoreA;
    });

    let migliori;
    if (casualitaLevel > 80) {
      const shuffled = shuffleArray(partiteDisponibili);
      migliori = shuffled.slice(0, numeroDaPrendere);
      messaggioExtra = ` 🎲🎲🎲 (scelte casualmente!)`;
    } else {
      migliori = ordinatePerScore.slice(0, numeroDaPrendere);
    }

    const miglioriOrdinate = ordinaPartitePerDataOra(migliori);
    setPartiteSelezionate(miglioriOrdinate);
    showAlert('success', `✅ Selezionate ${miglioriOrdinate.length} partite!${messaggioExtra}`);
  };

  const rigeneraSchedina = () => {
    if (partiteDisponibili.length === 0) {
      showAlert('info', 'ℹ️ Nessuna partita disponibile per rigenerare la schedina.');
      return;
    }

    const numeroPartiteDesiderato = Math.min(numeroPartiteDaSelezionare, partiteDisponibili.length, 10);

    if (casualitaLevel > 80) {
      const shuffled = shuffleArray(partiteDisponibili);
      const selezionate = shuffled.slice(0, numeroPartiteDesiderato);
      const selezionateOrdinate = ordinaPartitePerDataOra(selezionate);
      setPartiteSelezionate(selezionateOrdinate);
      showAlert('success', `🎲🎲🎲 CASUALITÀ ESTREMA! ${selezionateOrdinate.length} partite selezionate a caso!`);
      return;
    }

    const partitePerScore = {};
    partiteDisponibili.forEach(m => {
      const score = tipoGiocate === 'scelte' ? (m.scoreScelte || 0) : (m.scoreCalcolate || 0);
      if (!partitePerScore[score]) partitePerScore[score] = [];
      partitePerScore[score].push(m);
    });

    const scores = Object.keys(partitePerScore).map(Number).sort((a, b) => b - a);
    let selezionate = [];

    for (const score of scores) {
      if (selezionate.length >= numeroPartiteDesiderato) break;

      let partiteGruppo = partitePerScore[score];
      if (partiteGruppo.length === 0) continue;

      const postiDisponibili = numeroPartiteDesiderato - selezionate.length;
      let shuffled = shuffleArray(partiteGruppo);

      let daPrendereCount;
      if (casualitaLevel > 50) {
        const percentuale = 0.5 + (casualitaLevel - 50) / 100;
        daPrendereCount = Math.min(
          Math.ceil(partiteGruppo.length * percentuale),
          postiDisponibili
        );
        daPrendereCount = Math.max(1, daPrendereCount);
      } else {
        daPrendereCount = Math.min(partiteGruppo.length, postiDisponibili);
      }

      const daPrendere = shuffled.slice(0, daPrendereCount);
      selezionate = [...selezionate, ...daPrendere];
    }

    if (selezionate.length < numeroPartiteDesiderato) {
      const idsSelezionati = new Set(selezionate.map(m => m.id));
      let rimanenti = partiteDisponibili.filter(m => !idsSelezionati.has(m.id));
      rimanenti = shuffleArray(rimanenti);
      const postiDisponibili = numeroPartiteDesiderato - selezionate.length;
      const daPrendere = rimanenti.slice(0, postiDisponibili);
      selezionate = [...selezionate, ...daPrendere];
    }

    if (selezionate.length < 2) {
      const shuffledAll = shuffleArray(partiteDisponibili);
      const daPrendereCount = Math.min(numeroPartiteDesiderato, partiteDisponibili.length);
      selezionate = shuffledAll.slice(0, daPrendereCount);
    }

    const selezionateOrdinate = ordinaPartitePerDataOra(selezionate);
    setPartiteSelezionate(selezionateOrdinate);

    showAlert('success', `🔄 Schedina rigenerata! ${selezionateOrdinate.length} partite.`);
  };

  const selezionaCasuale = () => {
    if (partiteDisponibili.length === 0) {
      showAlert('info', 'ℹ️ Nessuna partita disponibile.');
      return;
    }

    const numeroPartiteDesiderato = Math.min(numeroPartiteDaSelezionare, partiteDisponibili.length, 10);
    const shuffled = shuffleArray(partiteDisponibili);
    const selezionate = shuffled.slice(0, numeroPartiteDesiderato);
    const selezionateOrdinate = ordinaPartitePerDataOra(selezionate);
    setPartiteSelezionate(selezionateOrdinate);

    showAlert('success', `🎲 ${selezionateOrdinate.length} partite selezionate casualmente!`);
  };

  const togglePartita = (match) => {
    setPartiteSelezionate(prev => {
      const exists = prev.find(m => m.id === match.id);
      let nuovePartite;
      if (exists) {
        nuovePartite = prev.filter(m => m.id !== match.id);
      } else {
        if (prev.length >= 10) {
          showAlert('error', '⚠️ Massimo 10 partite per schedina!');
          return prev;
        }
        nuovePartite = [...prev, match];
      }
      return ordinaPartitePerDataOra(nuovePartite);
    });
  };

  const creaSchedina = () => {
    if (partiteSelezionate.length < 2) {
      showAlert('error', '⚠️ Seleziona almeno 2 partite per creare la schedina!');
      return;
    }

    setLoading(true);
    const partiteOrdinate = ordinaPartitePerDataOra(partiteSelezionate);

    const schedina = partiteOrdinate.map(m => {
      const dettagli = calcolaTop3GiocatePerPartita(m);
      const top3 = tipoGiocate === 'scelte' ? dettagli.top3Scelte : dettagli.top3Calcolate;
      const score = tipoGiocate === 'scelte' ? dettagli.scoreScelte : dettagli.scoreCalcolate;
      return {
        ...m, top3, score, giocata: top3[0] || null, pct: top3[0]?.pct || 0
      };
    });

    const totaleScore = schedina.reduce((s, m) => s + (m.score || 0), 0);
    const mediaScore = Math.round(totaleScore / schedina.length);

    const datePartite = schedina.map(m => normalizeDate(m.data)).filter(d => d);
    const dataInizio = datePartite.length > 0 ? datePartite[0] : 'N/D';
    const dataFine = datePartite.length > 0 ? datePartite[datePartite.length - 1] : 'N/D';

    const nuovaSchedina = {
      id: Date.now().toString(36),
      partite: schedina,
      totale: totaleScore,
      media: mediaScore,
      numPartite: schedina.length,
      data: new Date().toISOString(),
      dataFormattata: new Date().toLocaleString('it-IT'),
      giocateSelezionate: JSON.parse(JSON.stringify(giocateSelezionate)),
      tipoGiocate: tipoGiocate,
      campionatiSelezionati: [...campionatiSelezionati],
      timestamp: new Date().toLocaleString('it-IT'),
      dataInizio: dataInizio,
      dataFine: dataFine,
      casualitaLevel: casualitaLevel,
      giorniRange: giorniRange
    };

    setSchedinaCreata(nuovaSchedina);

    const salvate = [...schedineSalvate];
    salvate.push(nuovaSchedina);
    localStorage.setItem('ft_schedine_salvate', JSON.stringify(salvate));
    setSchedineSalvate(salvate);

    setLoading(false);
    showAlert('success', `🎯 Schedina creata! ${schedina.length} partite - Media score: ${mediaScore}%`);
    setShowSchedinaModal(true);
  };

  const resettaSchedina = () => {
    setPartiteSelezionate([]);
    setSchedinaCreata(null);
    showAlert('info', '🔄 Schedina resettata');
  };

  const isGiocataSelezionata = (familyId, giocata) => {
    if (giocateSelezionate.includes('tutte')) return false;
    return giocateSelezionate.some(
      s => typeof s === 'object' && s.familyId === familyId && s.giocata === giocata
    );
  };

  const toggleGiocata = (familyId, giocata) => {
    setGiocateSelezionate(prev => {
      if (prev.includes('tutte')) {
        return [{ familyId, giocata }];
      }

      const exists = prev.some(
        s => typeof s === 'object' && s.familyId === familyId && s.giocata === giocata
      );

      if (exists) {
        const newSel = prev.filter(
          s => !(typeof s === 'object' && s.familyId === familyId && s.giocata === giocata)
        );
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
    if (tipoGiocate === 'scelte') setTipoGiocate('calcolate');
  };

  const deselezionaTutteGiocate = () => {
    setGiocateSelezionate(['tutte']);
    if (tipoGiocate === 'scelte') setTipoGiocate('calcolate');
  };

  const conteggioGiocateSelezionate = () => {
    if (giocateSelezionate.includes('tutte')) return 0;
    return giocateSelezionate.filter(s => typeof s === 'object').length;
  };

  const handleTipoGiocateChange = (nuovoTipo) => {
    if (nuovoTipo === 'scelte' && giocateSelezionate.includes('tutte')) {
      showAlert('info', 'ℹ️ Nessuna giocata scelta. Seleziona almeno una giocata specifica o usa "⭐ Tutte".');
      setGiocateSelezionate(['tutte']);
      setTipoGiocate('calcolate');
      return;
    }
    setTipoGiocate(nuovoTipo);
  };

  const formatSchedinaText = (schedina) => {
    if (!schedina || !schedina.partite) return '🎯 Errore nella generazione della schedina';

    const lines = [];
    lines.push('🎯 *SCHEDINA GesssAI-Pro*');
    lines.push(`📅 ${schedina.dataFormattata || new Date().toLocaleString('it-IT')}`);
    lines.push(`📊 ${schedina.numPartite} partite • Media: ${schedina.media}%`);

    if (schedina.dataInizio && schedina.dataFine) {
      const inizio = formatDateEU(schedina.dataInizio);
      const fine = formatDateEU(schedina.dataFine);
      if (inizio === fine) lines.push(`📆 Data: ${inizio}`);
      else lines.push(`📆 Dal ${inizio} al ${fine}`);
    }

    if (schedina.campionatiSelezionati && schedina.campionatiSelezionati.length > 0) {
      const champsDisplay = schedina.campionatiSelezionati.length === championships.length
        ? 'Tutti'
        : schedina.campionatiSelezionati.join(', ');
      lines.push(`🏆 Campionati: ${champsDisplay}`);
    }

    if (schedina.giocateSelezionate) {
      if (schedina.giocateSelezionate.includes('tutte')) {
        lines.push(`🎯 Giocate: Tutte le famiglie`);
      } else {
        const labels = schedina.giocateSelezionate
          .filter(s => typeof s === 'object')
          .map(s => formatGiocataLabel(s.familyId, s.giocata));
        if (labels.length > 0) lines.push(`🎯 Giocate: ${labels.join(' • ')}`);
      }
    }

    lines.push('───────────────────');
    lines.push('');

    schedina.partite.forEach((m, idx) => {
      const dataFormattata = formatDateEU(m.data);
      const oraFormattata = m.ora && m.ora !== 'TBD' ? m.ora : '--:--';
      lines.push(`📅 ${dataFormattata} - ${oraFormattata}`);
      lines.push(`🏆 ${m.campionato}`);
      lines.push(`⚽ ${m.casa} vs ${m.ospiti}`);

      const top3 = m.top3 || (m.giocata ? [m.giocata] : []);
      if (top3.length > 0) {
        top3.forEach((g, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
          const bombEmoji = g.isBomb ? ' 💣' : '';
          const ggngTag = g.familyId === 'gg_ng' ? ' ⚽GG/NG' : '';
          const displayLabel = g.displayLabel || formatGiocataLabel(g.familyId, g.label);
          lines.push(`  ${medal} ${g.familyIcon} ${displayLabel} → ${g.pct}%${bombEmoji}${ggngTag}`);
        });
      } else {
        lines.push(`  🎯 N/A`);
      }

      if (idx < schedina.partite.length - 1) lines.push('');
    });

    lines.push('');
    lines.push('───────────────────');
    lines.push(`⭐ Media Score: ${schedina.media}%`);
    lines.push('💣 GesssAI-Pro v3.0');
    lines.push('⚠️ Le scommesse comportano rischi finanziari. Gioca responsabilmente.');

    return lines.join('\n');
  };

  const copySchedinaToClipboard = () => {
    if (!schedinaCreata) {
      showAlert('error', '❌ Nessuna schedina da copiare!');
      return;
    }
    const text = formatSchedinaText(schedinaCreata);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showAlert('success', '📋 Schedina copiata negli appunti!'))
        .catch(() => showAlert('error', '❌ Errore nella copia'));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); showAlert('success', '📋 Schedina copiata negli appunti!'); }
      catch (e) { showAlert('error', '❌ Errore nella copia'); }
      document.body.removeChild(textarea);
    }
  };

  const shareOnWhatsApp = () => {
    if (!schedinaCreata) { showAlert('error', '❌ Nessuna schedina da condividere!'); return; }
    const text = formatSchedinaText(schedinaCreata);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnTelegram = () => {
    if (!schedinaCreata) { showAlert('error', '❌ Nessuna schedina da condividere!'); return; }
    const text = formatSchedinaText(schedinaCreata);
    window.open(`https://t.me/share/url?url=${encodeURIComponent('🎯 Schedina GesssAI-Pro')}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const salvaSchedinaLocale = () => {
    if (!schedinaCreata) { showAlert('error', '❌ Nessuna schedina da salvare!'); return; }
    const now = new Date();
    const nomeFile = `Schedina_GesssAI_${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

    const text = formatSchedinaText(schedinaCreata);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeFile}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert('success', `💾 Schedina salvata come ${nomeFile}.txt`);
  };

  const eliminaSchedinaSalvata = (id) => {
    if (!confirm('⚠️ Sei sicuro di voler eliminare questa schedina salvata?')) return;
    const nuoveSalvate = schedineSalvate.filter(s => s.id !== id);
    localStorage.setItem('ft_schedine_salvate', JSON.stringify(nuoveSalvate));
    setSchedineSalvate(nuoveSalvate);
    showAlert('success', '🗑️ Schedina eliminata!');
  };

  const caricaSchedinaSalvata = (schedina) => {
    setSchedinaCreata(schedina);
    const partiteOrdinate = ordinaPartitePerDataOra(schedina.partite);
    setPartiteSelezionate(partiteOrdinate);
    if (schedina.giocateSelezionate) setGiocateSelezionate(schedina.giocateSelezionate);
    if (schedina.tipoGiocate) setTipoGiocate(schedina.tipoGiocate);
    setShowSchedinaModal(true);
    showAlert('success', `📂 Schedina caricata! ${schedina.numPartite} partite, media ${schedina.media}%`);
  };

  // ⭐ CAMPIONATI ORDINATI ALFABETICAMENTE
  const championshipsOrdinati = useMemo(() => {
    return [...championships].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'it', { sensitivity: 'base' })
    );
  }, [championships]);

  return (
    <div className="schedina-container">

      {window.QuoteManager?.BannerScadenzaQuote && (
        <window.QuoteManager.BannerScadenzaQuote />
      )}

      {/* SUB-TAB */}
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
          tipoGiocate={tipoGiocate}
          calcolaTop3GiocatePerPartita={calcolaTop3GiocatePerPartita}
          getPartiteDisponibili={getPartiteDisponibili}
          showAlert={showAlert}
          ordinaPartitePerDataOra={ordinaPartitePerDataOra}
          formatGiocataLabel={formatGiocataLabel}
          getPercentualeClasse={getPercentualeClasse}
          normalizeDate={normalizeDate}
          formatDateEU={formatDateEU}
          getChampColor={getChampColor}
        />
      )}

      {sottoTab === 'classica' && (
        <>
          <div className="card" style={{marginBottom: '20px'}}>
            <h3 style={{color: 'var(--accent)', marginBottom: '16px', fontSize: '20px'}}>
              🎯 Crea Schedina {casualitaLevel > 50 ? '🎲' : ''}
              <span style={{fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px', fontWeight: 'normal'}}>
                📅 Sincronizzato con Palinsesto ({giorniRange} giorno/i) • 🏆 {campionatiSelezionati.length} campionati attivi
              </span>
            </h3>

            {/* CAMPIONATI */}
            <div style={{
              marginBottom: '20px', padding: '14px 16px',
              background: 'var(--surface)', borderRadius: '10px',
              border: '2px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px'
              }}>
                <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
                  🏆 Campionati Attivi
                  <span style={{fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal'}}>
                    (sincronizzato con Palinsesto)
                  </span>
                </span>
                <div style={{display: 'flex', gap: '6px'}}>
                  <button className="btn" onClick={selezionaTuttiCampionati} style={{
                    fontSize: '10px', padding: '3px 14px',
                    background: campionatiSelezionati.length === championships.length ? 'var(--accent)' : 'var(--surface)',
                    color: campionatiSelezionati.length === championships.length ? '#000' : 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer'
                  }}>✅ Tutti</button>
                  <button className="btn" onClick={deselezionaTuttiCampionati} style={{
                    fontSize: '10px', padding: '3px 14px',
                    background: 'var(--surface)', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer'
                  }}>❌ Deseleziona</button>
                  <span style={{fontSize: '11px', color: 'var(--text-muted)', padding: '3px 10px', background: 'var(--surface)', borderRadius: '4px'}}>
                    {campionatiSelezionati.length} / {championships.length}
                  </span>
                </div>
              </div>

              {/* ⭐ GRIGLIA 5 COLONNE ORDINATA ALFABETICAMENTE */}
              <div className="champ-filters-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '6px',
                width: '100%'
              }}>
                {championshipsOrdinati.map(c => {
                  const isSelected = campionatiSelezionati.includes(c.name);
                  const color = getChampColor(c.name);
                  return (
                    <button
                      key={c.name}
                      onClick={() => toggleCampionato(c.name)}
                      className={`champ-filter-btn ${isSelected ? 'active' : 'inactive'}`}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: isSelected ? `2px solid ${color}` : '2px solid var(--border)',
                        background: isSelected ? color : 'var(--surface)',
                        color: isSelected ? '#000' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: isSelected ? 'bold' : '600',
                        transition: 'all 0.2s',
                        minHeight: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={c.name}
                    >
                      <span style={{
                        display: 'inline-block',
                        width: '10px', height: '10px',
                        borderRadius: '50%',
                        marginRight: '6px',
                        flexShrink: 0,
                        background: color
                      }} />
                      <span style={{
                        fontSize: '10px',
                        lineHeight: '1.2',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {c.name.length > 20 ? c.name.substring(0, 18) + '…' : c.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic'}}>
                🔄 Modifica la selezione nel <b>Palinsesto</b> per sincronizzarla con tutti i tab
              </div>
            </div>

            {/* GIOCATE */}
            <div style={{
              marginBottom: '20px', padding: '14px 16px',
              background: 'var(--surface)', borderRadius: '10px',
              border: '2px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px'
              }}>
                <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
                  🎯 Seleziona Giocate
                  <span style={{fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal'}}>
                    (max {MAX_GIOCATE} giocate singole • "Tutte" = tutte le famiglie)
                  </span>
                </span>
                <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                  <button className="btn" onClick={selezionaTutteGiocate} style={{
                    fontSize: '10px', padding: '3px 14px',
                    background: giocateSelezionate.includes('tutte') ? 'var(--accent)' : 'var(--surface)',
                    color: giocateSelezionate.includes('tutte') ? '#000' : 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer'
                  }}>⭐ Tutte</button>
                  <button className="btn" onClick={deselezionaTutteGiocate} style={{
                    fontSize: '10px', padding: '3px 14px',
                    background: 'var(--surface)', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer'
                  }}>❌ Deseleziona</button>
                  <span style={{fontSize: '11px', color: 'var(--text-muted)', padding: '3px 10px', background: 'var(--surface)', borderRadius: '4px'}}>
                    {giocateSelezionate.includes('tutte')
                      ? '⭐ Tutte le famiglie'
                      : `${conteggioGiocateSelezionate()} / ${MAX_GIOCATE} selezionate`}
                  </span>
                </div>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
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
                      <span style={{fontSize: '14px'}}>{gruppo.icon}</span>
                      <span>{gruppo.label}</span>
                    </div>
                    <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                      {gruppo.giocate.map((g, i) => {
                        const isSelected = isGiocataSelezionata(gruppo.familyId, g.giocata);
                        const isGGNG = gruppo.familyId === 'gg_ng';
                        return (
                          <button
                            key={i}
                            onClick={() => toggleGiocata(gruppo.familyId, g.giocata)}
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
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              opacity: isSelected ? 1 : 0.85,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isSelected ? '✅ ' : ''}{g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{fontSize: '10px', color: 'var(--text-muted)', marginTop: '10px', fontStyle: 'italic'}}>
                {giocateSelezionate.includes('tutte')
                  ? '⭐ Analizza TUTTE le famiglie di giocate (incluso GG - NG) → Top 3 giocate per partita'
                  : `📊 Analizza le giocate selezionate: ${giocateSelezionate
                      .filter(s => typeof s === 'object')
                      .map(s => formatGiocataLabel(s.familyId, s.giocata))
                      .join(' • ')}`}
              </div>
            </div>

            {/* FILTRI DATA/ORA */}
            <div style={{
              marginBottom: '20px', padding: '14px 16px',
              background: 'var(--surface)', borderRadius: '10px',
              border: '2px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                borderBottom: '1px solid var(--border)',
                paddingBottom: '8px', marginBottom: '10px'
              }}>
                <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
                  📅 Filtri Data e Orario
                </span>
              </div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center'}}>
                <div style={{flex: '1', minWidth: '160px'}}>
                  <label style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '4px'}}>
                    📆 Range Giorni
                  </label>
                  <select
                    value={giorniRange}
                    onChange={e => setGiorniRange(parseInt(e.target.value))}
                    style={{
                      width: '100%', padding: '7px 12px',
                      background: 'var(--surface)', color: 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px'
                    }}
                  >
                    <option value="1">1 Giorno (Oggi)</option>
                    <option value="2">2 Giorni (Oggi - Domani)</option>
                    <option value="3">3 Giorni (Oggi - +2)</option>
                    <option value="4">4 Giorni (Oggi - +3)</option>
                    <option value="5">5 Giorni (Oggi - +4)</option>
                    <option value="6">6 Giorni (Oggi - +5)</option>
                    <option value="7">7 Giorni (Oggi - +6)</option>
                  </select>
                </div>

                <div style={{flex: '1', minWidth: '160px'}}>
                  <label style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '4px'}}>
                    ⏰ Filtro Orario
                  </label>
                  <div style={{display: 'flex', background: 'var(--surface)', borderRadius: '6px', padding: '3px', border: '1px solid var(--border)'}}>
                    <button
                      onClick={() => setFiltroOrario('dopo_ora')}
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: '11px',
                        borderRadius: '4px', border: 'none', cursor: 'pointer',
                        fontWeight: filtroOrario === 'dopo_ora' ? 'bold' : 'normal',
                        background: filtroOrario === 'dopo_ora' ? 'var(--accent)' : 'transparent',
                        color: filtroOrario === 'dopo_ora' ? '#000' : 'var(--text-muted)',
                        transition: 'all 0.2s'
                      }}
                    >⏰ Dopo ora</button>
                    <button
                      onClick={() => setFiltroOrario('giorno_intero')}
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: '11px',
                        borderRadius: '4px', border: 'none', cursor: 'pointer',
                        fontWeight: filtroOrario === 'giorno_intero' ? 'bold' : 'normal',
                        background: filtroOrario === 'giorno_intero' ? 'var(--accent)' : 'transparent',
                        color: filtroOrario === 'giorno_intero' ? '#000' : 'var(--text-muted)',
                        transition: 'all 0.2s'
                      }}
                    >📅 Giorno intero</button>
                  </div>
                </div>
              </div>
            </div>

            {/* CASUALITÀ */}
            <div style={{
              marginBottom: '20px', padding: '14px 16px',
              background: 'var(--surface)', borderRadius: '10px',
              border: '2px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                borderBottom: '1px solid var(--border)',
                paddingBottom: '8px', marginBottom: '10px'
              }}>
                <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
                  🎲 Livello di Casualità
                </span>
              </div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '22px'}}>🎲</span>
                </div>
                <div style={{flex: '1', minWidth: '140px'}}>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={casualitaLevel}
                    onChange={e => setCasualitaLevel(parseInt(e.target.value))}
                    style={{
                      width: '100%', accentColor: '#8e44ad',
                      height: '6px', borderRadius: '3px',
                      background: 'var(--surface)', cursor: 'pointer'
                    }}
                  />
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', minWidth: '90px'}}>
                  <span style={{fontSize: '16px', fontWeight: 'bold', color: '#8e44ad'}}>{casualitaLevel}%</span>
                  <span style={{fontSize: '22px'}}>
                    {casualitaLevel > 80 ? '🎲🎲🎲' : casualitaLevel > 50 ? '🎲🎲' : casualitaLevel > 20 ? '🎲' : '📊'}
                  </span>
                </div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic'}}>
                  {casualitaLevel <= 20 ? '📊 Prevedibile' :
                   casualitaLevel <= 50 ? '🎲 Un po\' di casualità' :
                   casualitaLevel <= 80 ? '🎲🎲 Media casualità' :
                   '🎲🎲🎲 MOLTO CASUALE!'}
                </div>
              </div>
            </div>

            {/* STATISTICHE */}
            <div style={{
              marginBottom: '16px', padding: '10px 16px',
              background: 'var(--surface)', borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px'}}>
                <span>📊 <b>{partiteDisponibili.length}</b> partite disponibili</span>
                <span>🏆 <b>{campionatiSelezionati.length}</b> campionati attivi</span>
                <span>📅 Range: <b>{giorniRange} giorno/i</b></span>
                <span>⭐ Media score: <b style={{color: 'var(--accent)'}}>
                  {partiteDisponibili.length > 0
                    ? Math.round(partiteDisponibili.reduce((s, m) =>
                        s + (tipoGiocate === 'scelte' ? (m.scoreScelte || 0) : (m.scoreCalcolate || 0)), 0)
                      / partiteDisponibili.length)
                    : 0}%
                </b></span>
                <span>🎯 Selezionate: <b style={{color: 'var(--win)'}}>{partiteSelezionate.length}</b> / {numeroPartiteDaSelezionare}</span>
              </div>
            </div>

            {/* NUMERO PARTITE */}
            <div style={{
              marginBottom: '16px', padding: '14px 16px',
              background: 'var(--surface)', borderRadius: '10px',
              border: '2px solid var(--border)'
            }}>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '5px 14px', borderRadius: '8px', border: '1px solid var(--border)'}}>
                  <span style={{fontSize: '13px', fontWeight: 'bold', color: 'var(--text)'}}>📊 Numero partite:</span>
                  <input
                    type="number" min="1" max="10"
                    value={numeroPartiteDaSelezionare}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 1;
                      setNumeroPartiteDaSelezionare(Math.min(10, Math.max(1, val)));
                    }}
                    style={{
                      width: '44px', padding: '4px 6px',
                      fontSize: '14px', fontWeight: 'bold',
                      textAlign: 'center',
                      background: 'var(--background)', color: 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: '4px', outline: 'none'
                    }}
                  />
                  <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>(1-10)</span>
                </div>

                <button
                  className="btn"
                  onClick={() => selezionaNumeroPartite(numeroPartiteDaSelezionare)}
                  style={{background: 'var(--accent2)', color: '#000', padding: '6px 16px', fontWeight: 'bold'}}
                >⚡ Seleziona</button>

                <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto'}}>
                  <button className="btn" onClick={() => selezionaNumeroPartite(3)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 3</button>
                  <button className="btn" onClick={() => selezionaNumeroPartite(5)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 5</button>
                  <button className="btn" onClick={() => selezionaNumeroPartite(10)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 10</button>
                  <button className="btn" onClick={() => selezionaNumeroPartite(partiteDisponibili.length)} style={{fontSize: '11px', padding: '5px 12px'}}>
                    📋 Tutte ({partiteDisponibili.length})
                  </button>
                </div>
              </div>
            </div>

            {/* PULSANTI AZIONE */}
            <div style={{
              marginBottom: '12px', padding: '12px 16px',
              background: 'var(--surface)', borderRadius: '10px',
              border: '2px solid var(--border)',
              display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center'
            }}>
              <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                <button className="btn" onClick={selezionaCasuale} style={{background: '#8e44ad', color: '#fff', fontWeight: 'bold'}}>🎲 Casuale</button>
                <button className="btn" onClick={rigeneraSchedina} style={{background: 'var(--accent2)', color: '#000', fontWeight: 'bold'}}>
                  🔄 Rigenera {casualitaLevel > 50 ? '🎲' : ''}
                </button>
                <button className="btn btn-secondary" onClick={resettaSchedina}>🗑️ Resetta</button>
              </div>

              <button
                className="btn"
                onClick={creaSchedina}
                disabled={partiteSelezionate.length < 2 || loading}
                style={{
                  marginLeft: 'auto',
                  background: partiteSelezionate.length >= 2 ? 'var(--accent)' : 'var(--surface)',
                  color: partiteSelezionate.length >= 2 ? '#000' : 'var(--text-muted)',
                  fontWeight: 'bold', padding: '8px 20px', fontSize: '14px'
                }}
              >
                {loading ? '⏳ Creazione...' : `🎯 Crea Schedina (${partiteSelezionate.length})`}
              </button>
            </div>
          </div>

          {/* LISTA PARTITE */}
          <div className="card" style={{marginTop: '16px'}}>
            <h4 style={{
              marginBottom: '12px',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: '10px'
            }}>
              <span>📋 Partite Disponibili ({partiteDisponibili.length})</span>

              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'}}>
                <div style={{
                  display: 'flex', background: 'var(--surface)',
                  borderRadius: '6px', padding: '3px', border: '1px solid var(--border)',
                }}>
                  <button onClick={() => setOrdinamento('data_pct')} style={{
                    padding: '4px 10px', fontSize: '10px',
                    fontWeight: ordinamento === 'data_pct' ? 'bold' : 'normal',
                    borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: ordinamento === 'data_pct' ? 'var(--accent)' : 'transparent',
                    color: ordinamento === 'data_pct' ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}>📅 Data + %</button>
                  <button onClick={() => setOrdinamento('pct_data')} style={{
                    padding: '4px 10px', fontSize: '10px',
                    fontWeight: ordinamento === 'pct_data' ? 'bold' : 'normal',
                    borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: ordinamento === 'pct_data' ? 'var(--accent)' : 'transparent',
                    color: ordinamento === 'pct_data' ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}>⭐ % + Data</button>
                </div>

                <div style={{
                  display: 'flex', background: 'var(--surface)',
                  borderRadius: '6px', padding: '3px', border: '1px solid var(--border)',
                }}>
                  <button onClick={() => handleTipoGiocateChange('calcolate')} style={{
                    padding: '4px 10px', fontSize: '10px',
                    fontWeight: tipoGiocate === 'calcolate' ? 'bold' : 'normal',
                    borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: tipoGiocate === 'calcolate' ? 'var(--accent2)' : 'transparent',
                    color: tipoGiocate === 'calcolate' ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}>🎯 Calcolate</button>
                  <button onClick={() => handleTipoGiocateChange('scelte')} style={{
                    padding: '4px 10px', fontSize: '10px',
                    fontWeight: tipoGiocate === 'scelte' ? 'bold' : 'normal',
                    borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: tipoGiocate === 'scelte' ? 'var(--win)' : 'transparent',
                    color: tipoGiocate === 'scelte' ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}>✅ Scelte</button>
                </div>
              </div>
            </h4>

            {partiteDisponibili.length === 0 ? (
              <div className="empty-state" style={{padding: '30px', textAlign: 'center', color: 'var(--text-muted)'}}>
                <div style={{fontSize: '24px', marginBottom: '8px'}}>⏰</div>
                <p>Nessuna partita disponibile per i filtri selezionati.</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {partiteDisponibili.map(m => {
                  const isSelected = partiteSelezionate.some(p => p.id === m.id);
                  const top3DaMostrare = tipoGiocate === 'scelte' ? m.top3Scelte : m.top3Calcolate;
                  const scoreDaMostrare = tipoGiocate === 'scelte' ? m.scoreScelte : m.scoreCalcolate;
                  const nessunaGiocataScelta = tipoGiocate === 'scelte' && (!top3DaMostrare || top3DaMostrare.length === 0);

                  return (
                    <div
                      key={m.id}
                      onClick={() => togglePartita(m)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: '8px',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(243, 156, 18, 0.08)' : 'var(--surface)',
                        cursor: 'pointer', transition: 'all 0.2s',
                        gap: '8px', flexWrap: 'wrap'
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px'}}>
                        <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>{formatDateEU(m.data)}</span>
                        <span style={{fontSize: '10px', color: 'var(--text-muted)'}}>{m.ora && m.ora !== 'TBD' ? m.ora : ''}</span>
                      </div>

                      <div style={{fontSize: '11px', color: 'var(--text-muted)', minWidth: '80px'}}>{m.campionato}</div>

                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '150px'}}>
                        <span style={{fontWeight: 'bold', fontSize: '13px', color: 'var(--text)'}}>
                          {m.casa} vs {m.ospiti}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex', gap: '6px', alignItems: 'center',
                        justifyContent: 'center', flexWrap: 'wrap', minWidth: '320px'
                      }}>
                        {nessunaGiocataScelta ? (
                          <span style={{fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic'}}>
                            Nessuna giocata scelta
                          </span>
                        ) : top3DaMostrare && top3DaMostrare.length > 0 ? (
                          top3DaMostrare.map((g, idx) => {
                            const isGGNG = g.familyId === 'gg_ng';
                            return (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                                  gap: '2px', padding: '4px 8px', borderRadius: '6px',
                                  border: g.isBomb ? '2px solid var(--accent)' : (isGGNG ? '1px solid #e74c3c' : '1px solid var(--border)'),
                                  background: g.isBomb ? 'rgba(243, 156, 18, 0.10)' : (isGGNG ? 'rgba(231, 76, 60, 0.06)' : 'var(--surface)'),
                                  minWidth: '95px'
                                }}
                                title={`${g.familyIcon} ${g.familyLabel}`}
                              >
                                <span style={{
                                  fontSize: '10px', fontWeight: 'bold',
                                  color: isGGNG ? '#e74c3c' : 'var(--accent)',
                                  whiteSpace: 'nowrap', overflow: 'hidden',
                                  textOverflow: 'ellipsis', maxWidth: '90px'
                                }}>
                                  {g.displayLabel || g.label}
                                </span>
                                <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`} style={{fontSize: '11px', padding: '1px 6px'}}>
                                  {g.pct}% {g.isBomb && '💣'}
                                </span>
                                <QuotaInline match={m} familyId={g.familyId} giocata={g.giocata} pctTua={g.pct} size="sm" />
                              </div>
                            );
                          })
                        ) : (
                          <span style={{fontSize: '10px', color: 'var(--text-muted)'}}>N/D</span>
                        )}
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', minWidth: '50px', justifyContent: 'flex-end'}}>
                        <span className={`giocata-pct ${getPercentualeClasse(scoreDaMostrare)}`} style={{fontSize: '13px', padding: '2px 10px'}}>
                          {scoreDaMostrare}%
                        </span>
                        {isSelected && <span style={{color: 'var(--win)', fontSize: '14px'}}>✅</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SCHEDINE SALVATE */}
          {schedineSalvate.length > 0 && (
            <div className="card" style={{marginTop: '16px', border: '2px solid var(--accent)'}}>
              <h4 style={{color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                💾 Schedine Salvate ({schedineSalvate.length})
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (confirm('⚠️ Eliminare TUTTE le schedine salvate?')) {
                      localStorage.setItem('ft_schedine_salvate', '[]');
                      setSchedineSalvate([]);
                      showAlert('success', '🗑️ Tutte le schedine eliminate!');
                    }
                  }}
                  style={{fontSize: '10px', padding: '2px 12px', marginLeft: 'auto'}}
                >🗑️ Elimina Tutte</button>
              </h4>

              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {schedineSalvate.map((s, idx) => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: '6px',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    gap: '8px', flexWrap: 'wrap'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '150px'}}>
                      <span style={{fontWeight: 'bold', color: 'var(--accent)', fontSize: '12px'}}>#{idx + 1}</span>
                      <span style={{fontSize: '12px', color: 'var(--text)'}}>📅 {s.dataFormattata || s.timestamp || 'N/D'}</span>
                      <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                        {s.numPartite} partite • Media: <b style={{color: 'var(--accent)'}}>{s.media}%</b>
                      </span>
                    </div>

                    <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                      <button className="btn" onClick={() => caricaSchedinaSalvata(s)} style={{fontSize: '10px', padding: '4px 12px'}}>📂 Carica</button>
                      <button className="btn btn-secondary" onClick={() => {
                        const text = formatSchedinaText(s);
                        navigator.clipboard?.writeText?.(text);
                        showAlert('success', '📋 Schedina copiata!');
                      }} style={{fontSize: '10px', padding: '4px 12px'}}>📋 Copia</button>
                      <button className="btn btn-danger" onClick={() => eliminaSchedinaSalvata(s.id)} style={{fontSize: '10px', padding: '4px 12px'}}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL */}
      {showSchedinaModal && schedinaCreata && (
        <div className="heatmap-detail-overlay" onClick={() => setShowSchedinaModal(false)}>
          <div className="heatmap-detail-modal" onClick={e => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'}}>
            <button className="close-btn" onClick={() => setShowSchedinaModal(false)}>✖</button>

            <div style={{padding: '10px 0'}}>
              <h2 style={{color: 'var(--accent)', textAlign: 'center', marginBottom: '4px'}}>🎯 SCHEDINA GesssAI-Pro</h2>
              <p style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px'}}>
                📅 {schedinaCreata.dataFormattata || new Date().toLocaleString('it-IT')} • {schedinaCreata.numPartite} partite • Media: <b style={{color: 'var(--accent)'}}>{schedinaCreata.media}%</b>
              </p>

              <div style={{borderTop: '2px solid var(--accent)', paddingTop: '12px'}}>
                {schedinaCreata.partite.map((m, idx) => {
                  const top3 = m.top3 || (m.giocata ? [m.giocata] : []);
                  return (
                    <div key={idx} style={{
                      padding: '8px 12px', marginBottom: '6px',
                      borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px'}}>
                        <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                          #{idx + 1} 📅 {formatDateEU(m.data)} - {m.ora && m.ora !== 'TBD' ? m.ora : '--:--'}
                        </span>
                        <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>🏆 {m.campionato}</span>
                      </div>
                      <div style={{marginTop: '2px'}}>
                        <span style={{fontSize: '14px', fontWeight: 'bold'}}>⚽ {m.casa} vs {m.ospiti}</span>
                      </div>

                      <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center'}}>
                        {top3.length > 0 ? top3.map((g, i) => {
                          const isGGNG = g.familyId === 'gg_ng';
                          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                          const displayLabel = g.displayLabel || formatGiocataLabel(g.familyId, g.label);
                          return (
                            <div key={i} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              gap: '1px', padding: '3px 8px', borderRadius: '6px',
                              border: g.isBomb ? '2px solid var(--accent)' : (isGGNG ? '1px solid #e74c3c' : '1px solid var(--border)'),
                              background: g.isBomb ? 'rgba(243, 156, 18, 0.10)' : 'var(--surface)'
                            }}>
                              <span style={{fontSize: '9px', color: 'var(--text-muted)'}}>{medal}</span>
                              <span style={{fontSize: '11px', fontWeight: 'bold', color: isGGNG ? '#e74c3c' : 'var(--accent)'}}>{displayLabel}</span>
                              <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`} style={{fontSize: '12px', padding: '1px 6px'}}>
                                {g.pct}% {g.isBomb && '💣'}
                              </span>
                              <QuotaInline match={m} familyId={g.familyId} giocata={g.giocata} pctTua={g.pct} size="lg" />
                              <span style={{fontSize: '8px', color: 'var(--text-muted)'}}>{g.familyIcon} {g.familyLabel}</span>
                            </div>
                          );
                        }) : (
                          <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>Nessuna giocata</span>
                        )}
                      </div>

                      <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '4px'}}>
                        <span className={`giocata-pct ${getPercentualeClasse(m.score)}`} style={{fontSize: '11px', padding: '1px 8px'}}>
                          Score: {m.score}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{borderTop: '2px solid var(--accent)', marginTop: '12px', paddingTop: '12px', textAlign: 'center'}}>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: 'var(--accent)'}}>
                  ⭐ Media Score: {schedinaCreata.media}%
                </div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px'}}>
                  💣 GesssAI-Pro v3.0 • ⚠️ Le scommesse comportano rischi finanziari.
                </div>
              </div>
            </div>

            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', justifyContent: 'center'}}>
              <button className="btn" onClick={copySchedinaToClipboard} style={{background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'}}>📋 Copia</button>
              <button className="btn" onClick={salvaSchedinaLocale} style={{background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'}}>💾 Salva</button>
              <button className="btn" onClick={shareOnWhatsApp} style={{background: '#25D366', color: '#fff', border: 'none'}}>WhatsApp</button>
              <button className="btn" onClick={shareOnTelegram} style={{background: '#0088cc', color: '#fff', border: 'none'}}>Telegram</button>
              <button className="btn btn-secondary" onClick={() => setShowSchedinaModal(false)}>✖ Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.SchedinaComponent = SchedinaComponent;
console.log('✅ SchedinaComponent v9.1 caricato - sub-tab Classica + Quota + griglia 5 colonne alfabetica');