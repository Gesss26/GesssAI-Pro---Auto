// ============================================================
// performance.js - Modulo Storico Performance
// Traccia l'esito reale delle giocate suggerite (snapshot).
// Limite: 20000 snapshot massimi in localStorage (~10 MB).
//
// ⭐ FIX 2026-09: aggiornaEsiti fa matching per CONTENUTO
//    (data + squadre normalizzate) perché gli ID delle partite
//    in index.html usano Math.random() e cambiano ad ogni reload.
//    Gli snapshot esistenti (con ID vecchi) vengono risolti comunque.
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

  const STORAGE_KEY = 'ft_performance_snapshots';
  const MAX_SNAPSHOTS = 20000; // ⭐ Aumentato da 5000 a 20000

  // ============================================================
  // UTILITY STORAGE
  // ============================================================

  const leggiSnapshots = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('Errore lettura performance:', e);
      return [];
    }
  };

  const scriviSnapshots = (arr) => {
    try {
      const limited = arr.slice(-MAX_SNAPSHOTS); // ⭐ Mantieni solo gli ultimi 20000
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      window.dispatchEvent(new CustomEvent('performance-updated', { detail: limited }));
    } catch (e) {
      // ⚠️ Se superiamo la quota di localStorage, tenta di liberare spazio
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('⚠️ Quota localStorage superata, taglio a metà e riprovo...');
        try {
          const half = arr.slice(-Math.floor(MAX_SNAPSHOTS / 2));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(half));
          window.dispatchEvent(new CustomEvent('performance-updated', { detail: half }));
        } catch (e2) {
          console.error('❌ Impossibile salvare neanche metà degli snapshot:', e2);
        }
      } else {
        console.warn('Errore salvataggio performance:', e);
      }
    }
  };

  // ============================================================
  // CALCOLO ESITO GIOCATA
  // ============================================================

  const calcolaEsitoGiocata = (match, familyId, giocataLabel) => {
    const gC = match.golCasa || 0;
    const gO = match.golOspite || 0;
    const tot = gC + gO;

    // FISSE
    if (familyId === 'fisse') {
      if (giocataLabel === '1') return gC > gO ? 'V' : 'P';
      if (giocataLabel === 'X') return gC === gO ? 'V' : 'P';
      if (giocataLabel === '2') return gC < gO ? 'V' : 'P';
    }

    // DOPPIA CHANCE
    if (familyId === 'dc') {
      if (giocataLabel === '1X') return gC >= gO ? 'V' : 'P';
      if (giocataLabel === '12') return gC !== gO ? 'V' : 'P';
      if (giocataLabel === 'X2') return gC <= gO ? 'V' : 'P';
    }

    // OVER
    if (familyId === 'over') {
      const soglia = parseFloat(String(giocataLabel).replace('Over ', ''));
      if (!isNaN(soglia)) return tot > soglia ? 'V' : 'P';
    }

    // UNDER
    if (familyId === 'under') {
      const soglia = parseFloat(String(giocataLabel).replace('Under ', ''));
      if (!isNaN(soglia)) return tot < soglia ? 'V' : 'P';
    }

    // GG / NG
    if (familyId === 'gg_ng') {
      if (giocataLabel === 'Goal-Goal' || giocataLabel === 'GG') return (gC > 0 && gO > 0) ? 'V' : 'P';
      if (giocataLabel === 'No Goal' || giocataLabel === 'NG') return (gC === 0 || gO === 0) ? 'V' : 'P';
    }

    // MULTIGOL (0-2/1-3 su casa, 1-4/2-5 su totale)
    if (familyId === 'multigol') {
      if (giocataLabel === '0-2') return gC <= 2 ? 'V' : 'P';
      if (giocataLabel === '1-3') return (gC >= 1 && gC <= 3) ? 'V' : 'P';
      if (giocataLabel === '1-4') return (tot >= 1 && tot <= 4) ? 'V' : 'P';
      if (giocataLabel === '2-5') return (tot >= 2 && tot <= 5) ? 'V' : 'P';
    }

    // MG CASA + OSPITE ("0-2+1-3")
    if (familyId === 'mg_casa_ospite') {
      const parts = String(giocataLabel).split('+');
      if (parts.length === 2) {
        const casaOk = matchRange(gC, parts[0]);
        const ospiteOk = matchRange(gO, parts[1]);
        return (casaOk && ospiteOk) ? 'V' : 'P';
      }
    }

    // DC + OVER ("1X+O2.5")
    if (familyId === 'dc_over') {
      const parts = String(giocataLabel).split('+');
      if (parts.length === 2) {
        const dcOk = calcolaEsitoGiocata(match, 'dc', parts[0]) === 'V';
        const overOk = calcolaEsitoGiocata(match, 'over', 'Over ' + parts[1].replace('O', '')) === 'V';
        return (dcOk && overOk) ? 'V' : 'P';
      }
    }

    // DC + UNDER ("1X+U2.5")
    if (familyId === 'dc_under') {
      const parts = String(giocataLabel).split('+');
      if (parts.length === 2) {
        const dcOk = calcolaEsitoGiocata(match, 'dc', parts[0]) === 'V';
        const underOk = calcolaEsitoGiocata(match, 'under', 'Under ' + parts[1].replace('U', '')) === 'V';
        return (dcOk && underOk) ? 'V' : 'P';
      }
    }

    // DC + MULTIGOL ("1X+0-2")
    if (familyId === 'dc_multigol') {
      const parts = String(giocataLabel).split('+');
      if (parts.length === 2) {
        const dcOk = calcolaEsitoGiocata(match, 'dc', parts[0]) === 'V';
        const mg = parts[1];
        let mgOk = false;
        if (mg === '0-2') mgOk = tot <= 2;
        else if (mg === '1-3') mgOk = tot >= 1 && tot <= 3;
        else if (mg === '1-4') mgOk = tot >= 1 && tot <= 4;
        else if (mg === '2-5') mgOk = tot >= 2 && tot <= 5;
        return (dcOk && mgOk) ? 'V' : 'P';
      }
    }

    return null;
  };

  const matchRange = (val, range) => {
    const [min, max] = String(range).split('-').map(Number);
    if (isNaN(min) || isNaN(max)) return false;
    return val >= min && val <= max;
  };

  // ============================================================
  // SALVA SNAPSHOT
  // ============================================================

  const salvaSnapshot = (match, giocate) => {
    const arr = leggiSnapshots();
    const idx = arr.findIndex(s => s.matchId === match.id);
    const snapshot = {
      matchId: match.id,
      data: match.data,
      ora: match.ora,
      campionato: match.campionato,
      casa: match.casa,
      ospiti: match.ospiti,
      giocate: giocate.map(g => ({
        familyId: g.familyId,
        familyLabel: g.familyLabel,
        giocata: g.giocata,
        label: g.label,
        displayLabel: g.displayLabel || g.label,
        pct: g.pct,
        esito: null,
      })),
      salvatoIl: new Date().toISOString(),
      risultatoFinale: null,
    };

    // ⭐ Se la partita è già giocata, risolvi subito gli esiti
    if (match.stato === 'Giocata') {
      snapshot.risultatoFinale = `${match.golCasa || 0}-${match.golOspite || 0}`;
      snapshot.giocate.forEach(g => {
        g.esito = calcolaEsitoGiocata(match, g.familyId, g.giocata);
      });
    }

    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...snapshot };
    } else {
      arr.push(snapshot);
    }
    scriviSnapshots(arr);
  };

  // ============================================================
  // AGGIORNA ESITI
  // ⭐ FIX: matching per CONTENUTO (data + squadre), non solo per ID
  //    perché gli ID delle partite (index.html) usano Math.random()
  //    e cambiano ad ogni reload → gli snapshot con ID vecchi
  //    non troverebbero mai il match corrispondente.
  // ============================================================

  const aggiornaEsiti = (matches) => {
    const arr = leggiSnapshots();
    let modificato = false;

    // Normalizza stringhe (lowercase, no accenti, trim)
    const norm = (s) => String(s || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Chiave stabile: data (YYYY-MM-DD) + casa + ospiti
    const keyOf = (data, casa, ospiti) => {
      const d = String(data || '').slice(0, 10);
      return `${d}|${norm(casa)}|${norm(ospiti)}`;
    };

    // Indice: chiave stabile → match
    // (registro sia orientamento normale sia invertito, per sicurezza)
    const matchIndex = new Map();
    matches.forEach(m => {
      matchIndex.set(keyOf(m.data, m.casa, m.ospiti), m);
      matchIndex.set(keyOf(m.data, m.ospiti, m.casa), m);
    });

    // Indice di fallback senza data (solo squadre) — usato se la data è ambigua
    const matchIndexNoData = new Map();
    matches.forEach(m => {
      const k1 = `${norm(m.casa)}|${norm(m.ospiti)}`;
      const k2 = `${norm(m.ospiti)}|${norm(m.casa)}`;
      if (!matchIndexNoData.has(k1)) matchIndexNoData.set(k1, m);
      if (!matchIndexNoData.has(k2)) matchIndexNoData.set(k2, m);
    });

    arr.forEach(snap => {
      if (snap.risultatoFinale) return;

      // 1° tentativo: match per ID (veloce, funziona nello stesso reload)
      let match = matches.find(m => m.id === snap.matchId);

      // 2° tentativo: match per chiave stabile (data + squadre)
      if (!match) {
        match = matchIndex.get(keyOf(snap.data, snap.casa, snap.ospiti));
      }

      // 3° tentativo: match per sole squadre (se la data non combacia)
      if (!match) {
        const k = `${norm(snap.casa)}|${norm(snap.ospiti)}`;
        match = matchIndexNoData.get(k);
      }

      if (!match) return;
      if (match.stato !== 'Giocata') return;

      snap.risultatoFinale = `${match.golCasa || 0}-${match.golOspite || 0}`;
      snap.giocate.forEach(g => {
        g.esito = calcolaEsitoGiocata(match, g.familyId, g.giocata);
      });
      modificato = true;
    });

    if (modificato) scriviSnapshots(arr);
    return arr;
  };

  // ============================================================
  // HOOK
  // ============================================================

  const usePerformanceSnapshots = () => {
    const [snapshots, setSnapshots] = useState(() => leggiSnapshots());

    useEffect(() => {
      const handler = (e) => setSnapshots(e.detail || leggiSnapshots());
      const storageHandler = (e) => {
        if (e.key === STORAGE_KEY) setSnapshots(leggiSnapshots());
      };
      window.addEventListener('performance-updated', handler);
      window.addEventListener('storage', storageHandler);
      return () => {
        window.removeEventListener('performance-updated', handler);
        window.removeEventListener('storage', storageHandler);
      };
    }, []);

    return snapshots;
  };

  // ============================================================
  // AGGREGAZIONE STATISTICHE
  // ============================================================

  const aggregaStatistiche = (snapshots) => {
    const stats = {};
    let totaleGiocate = 0, totaleVinte = 0, totalePerse = 0;

    snapshots.forEach(snap => {
      if (!snap.risultatoFinale) return;
      snap.giocate.forEach(g => {
        if (g.esito !== 'V' && g.esito !== 'P') return;

        if (!stats[g.familyId]) {
          stats[g.familyId] = {
            familyId: g.familyId,
            familyLabel: g.familyLabel,
            tot: 0,
            vinte: 0,
            perse: 0,
            sommaPct: 0,
            bombe: 0,
            bombeVinte: 0,
            fasce: {
              '0-50': { tot: 0, vinte: 0 },
              '50-70': { tot: 0, vinte: 0 },
              '70-85': { tot: 0, vinte: 0 },
              '85-95': { tot: 0, vinte: 0 },
              '95-100': { tot: 0, vinte: 0 },
            },
          };
        }

        const st = stats[g.familyId];
        st.tot++;
        st.sommaPct += g.pct;
        if (g.esito === 'V') st.vinte++;
        else st.perse++;

        if (g.pct >= 90) {
          st.bombe++;
          if (g.esito === 'V') st.bombeVinte++;
        }

        let fascia = '0-50';
        if (g.pct >= 95) fascia = '95-100';
        else if (g.pct >= 85) fascia = '85-95';
        else if (g.pct >= 70) fascia = '70-85';
        else if (g.pct >= 50) fascia = '50-70';
        st.fasce[fascia].tot++;
        if (g.esito === 'V') st.fasce[fascia].vinte++;

        totaleGiocate++;
        if (g.esito === 'V') totaleVinte++;
        else totalePerse++;
      });
    });

    Object.values(stats).forEach(st => {
      st.pctReale = st.tot > 0 ? Math.round((st.vinte / st.tot) * 100) : 0;
      st.pctMediaPrevista = st.tot > 0 ? Math.round(st.sommaPct / st.tot) : 0;
      st.diff = st.pctReale - st.pctMediaPrevista;
      st.pctBombeVinte = st.bombe > 0 ? Math.round((st.bombeVinte / st.bombe) * 100) : 0;
    });

    return {
      perFamiglia: stats,
      totaleGiocate,
      totaleVinte,
      totalePerse,
      pctSuccessoTotale: totaleGiocate > 0 ? Math.round((totaleVinte / totaleGiocate) * 100) : 0,
    };
  };

  // ============================================================
  // TABELLA RIEPILOGO
  // ============================================================

  const TabellaRiepilogo = ({ stats }) => {
    const entries = Object.values(stats.perFamiglia).sort((a, b) => b.tot - a.tot);

    if (entries.length === 0) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
          <h3 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Nessun dato di performance</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Le statistiche appariranno automaticamente quando le partite con snapshot salvato
            diventeranno <b>"Giocate"</b>.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
            💡 Le partite del Palinsesto e Schedina vengono salvate automaticamente.
          </p>
        </div>
      );
    }

    const getPctColor = (pct) => {
      if (pct >= 90) return 'var(--accent)';
      if (pct >= 67) return 'var(--win)';
      if (pct >= 34) return 'var(--text-muted)';
      return 'var(--lose)';
    };

    const getDiffColor = (diff) => {
      if (diff > 5) return 'var(--win)';
      if (diff < -5) return 'var(--lose)';
      return 'var(--text-muted)';
    };

    return (
      <div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}>
          <div style={{ background: 'var(--card)', border: '2px solid var(--accent)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Giocate totali</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.totaleGiocate}</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--win)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>✅ Vinte</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--win)' }}>{stats.totaleVinte}</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--lose)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>❌ Perse</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--lose)' }}>{stats.totalePerse}</div>
          </div>
          <div style={{ background: 'var(--card)', border: '2px solid var(--accent)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>% Successo totale</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: getPctColor(stats.pctSuccessoTotale) }}>{stats.pctSuccessoTotale}%</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', overflowX: 'auto' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>📊 Performance per Famiglia</h4>
          <table className="standings-table" style={{ width: '100%', minWidth: '850px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Famiglia</th>
                <th className="num">Totale</th>
                <th className="num">✅</th>
                <th className="num">❌</th>
                <th className="num">% Reale</th>
                <th className="num">% Prevista</th>
                <th className="num">Δ Diff</th>
                <th className="num">💣 Bombe</th>
                <th className="num">💣 Vinte</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(st => {
                const pctColor = getPctColor(st.pctReale);
                const diffColor = getDiffColor(st.diff);
                const diffSign = st.diff > 0 ? '+' : '';
                return (
                  <tr key={st.familyId}>
                    <td style={{ fontWeight: 'bold' }}>{st.familyLabel || st.familyId}</td>
                    <td className="num">{st.tot}</td>
                    <td className="num" style={{ color: 'var(--win)', fontWeight: 'bold' }}>{st.vinte}</td>
                    <td className="num" style={{ color: 'var(--lose)', fontWeight: 'bold' }}>{st.perse}</td>
                    <td className="num" style={{ color: pctColor, fontWeight: 'bold', fontSize: '15px' }}>{st.pctReale}%</td>
                    <td className="num" style={{ color: 'var(--text-muted)' }}>{st.pctMediaPrevista}%</td>
                    <td className="num" style={{ color: diffColor, fontWeight: 'bold' }}>{diffSign}{st.diff}</td>
                    <td className="num">{st.bombe}</td>
                    <td className="num" style={{ fontWeight: 'bold', color: st.pctBombeVinte >= 80 ? 'var(--win)' : 'var(--draw)' }}>{st.pctBombeVinte}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            💡 <b>Δ Diff</b>: differenza tra % reale e % media prevista.
            <b style={{ color: 'var(--win)' }}> +5 o più</b> = modello sottostima.
            <b style={{ color: 'var(--lose)' }}> −5 o meno</b> = modello sovrastima.
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // CALIBRAZIONE
  // ============================================================

  const Calibrazione = ({ stats }) => {
    const entries = Object.values(stats.perFamiglia).filter(st => st.tot >= 10);

    if (entries.length === 0) {
      return (
        <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          ⚠️ Servono almeno <b>10 giocate per famiglia</b> per mostrare la calibrazione.
        </div>
      );
    }

    const fasceOrdine = ['0-50', '50-70', '70-85', '85-95', '95-100'];

    return (
      <div className="card" style={{ padding: '14px 16px' }}>
        <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>🎯 Calibrazione: Previsto vs Reale</h4>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Se il modello è ben calibrato, ogni fascia dovrebbe avere una % reale vicina al valore centrale.
        </div>

        {entries.map(st => (
          <div key={st.familyId} style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px', color: 'var(--accent)' }}>
              {st.familyLabel || st.familyId}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '8px' }}>
                ({st.tot} giocate)
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {fasceOrdine.map(fascia => {
                const data = st.fasce[fascia];
                if (!data || data.tot === 0) {
                  return (
                    <div key={fascia} style={{ background: 'var(--surface)', padding: '8px', borderRadius: '6px', textAlign: 'center', opacity: 0.4, fontSize: '11px' }}>
                      <div style={{ color: 'var(--text-muted)' }}>{fascia}%</div>
                      <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>—</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>0 giocate</div>
                    </div>
                  );
                }
                const pctReale = Math.round((data.vinte / data.tot) * 100);
                const center = { '0-50': 40, '50-70': 60, '70-85': 78, '85-95': 90, '95-100': 97 }[fascia];
                const diff = pctReale - center;
                const diffColor = Math.abs(diff) <= 8 ? 'var(--win)' : Math.abs(diff) <= 15 ? 'var(--draw)' : 'var(--lose)';
                return (
                  <div key={fascia} style={{ background: 'var(--surface)', padding: '8px', borderRadius: '6px', textAlign: 'center', border: `1px solid ${diffColor}` }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fascia}%</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: diffColor }}>{pctReale}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>previsto ~{center}%</div>
                    <div style={{ fontSize: '10px', color: diffColor, fontWeight: 'bold' }}>{diff >= 0 ? '+' : ''}{diff}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{data.tot} giocate</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================
  // ULTIMI RISULTATI
  // ============================================================

  const UltimiRisultati = ({ snapshots }) => {
    const risolti = snapshots.filter(s => s.risultatoFinale).slice(-30).reverse();

    if (risolti.length === 0) {
      return (
        <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          📭 Nessun risultato registrato ancora.
        </div>
      );
    }

    return (
      <div className="card" style={{ padding: '14px 16px' }}>
        <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>
          🕒 Ultimi Risultati ({risolti.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {risolti.map((snap, idx) => {
            const vinteCount = snap.giocate.filter(g => g.esito === 'V').length;
            const totale = snap.giocate.filter(g => g.esito === 'V' || g.esito === 'P').length;
            const pctVinte = totale > 0 ? Math.round((vinteCount / totale) * 100) : 0;
            return (
              <div key={idx} style={{
                background: 'var(--surface)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    📅 {window.formatDateEU ? window.formatDateEU(snap.data) : snap.data}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    🏆 {snap.campionato}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    ⚽ {snap.casa} {snap.risultatoFinale} {snap.ospiti}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: pctVinte >= 70 ? 'var(--win)' : pctVinte >= 40 ? 'var(--draw)' : 'var(--lose)'
                  }}>
                    {vinteCount}/{totale} ({pctVinte}%)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {snap.giocate.map((g, i) => {
                    if (g.esito !== 'V' && g.esito !== 'P') return null;
                    const isV = g.esito === 'V';
                    return (
                      <span key={i} style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isV ? 'rgba(111, 207, 151, 0.2)' : 'rgba(235, 87, 87, 0.2)',
                        color: isV ? 'var(--win)' : 'var(--lose)',
                        border: `1px solid ${isV ? 'var(--win)' : 'var(--lose)'}`,
                        fontWeight: 'bold',
                      }}>
                        {isV ? '✅' : '❌'} {g.displayLabel} ({g.pct}%)
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTE PRINCIPALE
  // ============================================================

  function PerformanceComponent({ matches, championships, onSelectMatch }) {
    const snapshots = usePerformanceSnapshots();
    const [subTab, setSubTab] = useState('Riepilogo');
    const [autoAggiorna, setAutoAggiorna] = useState(true);

    useEffect(() => {
      if (!autoAggiorna) return;
      if (!matches || matches.length === 0) return;
      const timer = setTimeout(() => {
        aggiornaEsiti(matches);
      }, 500);
      return () => clearTimeout(timer);
    }, [matches, autoAggiorna]);

    const stats = useMemo(() => aggregaStatistiche(snapshots), [snapshots]);

    const resetAll = () => {
      if (!confirm('⚠️ Eliminare TUTTO lo storico performance? L\'operazione è irreversibile.')) return;
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('performance-updated', { detail: [] }));
    };

    const totaleSnapshot = snapshots.length;
    const risoltiCount = snapshots.filter(s => s.risultatoFinale).length;
    const inAttesaCount = totaleSnapshot - risoltiCount;

    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          padding: '10px 14px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: '18px' }}>
              📈 Storico Performance
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {totaleSnapshot} snapshot ({risoltiCount} risolti • {inAttesaCount} in attesa) • {stats.totaleGiocate} giocate risolte
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoAggiorna}
                onChange={e => setAutoAggiorna(e.target.checked)}
              />
              Auto-aggiorna
            </label>
            <button
              className="btn btn-secondary"
              onClick={() => aggiornaEsiti(matches)}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              🔄 Aggiorna ora
            </button>
            <button
              className="btn btn-danger"
              onClick={resetAll}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              🗑️ Reset
            </button>
          </div>
        </div>

        <div className="sub-tabs">
          <button className={subTab === 'Riepilogo' ? 'active' : ''} onClick={() => setSubTab('Riepilogo')}>
            📊 Riepilogo
          </button>
          <button className={subTab === 'Calibrazione' ? 'active' : ''} onClick={() => setSubTab('Calibrazione')}>
            🎯 Calibrazione
          </button>
          <button className={subTab === 'Ultimi' ? 'active' : ''} onClick={() => setSubTab('Ultimi')}>
            🕒 Ultimi Risultati
          </button>
        </div>

        {subTab === 'Riepilogo' && <TabellaRiepilogo stats={stats} />}
        {subTab === 'Calibrazione' && <Calibrazione stats={stats} />}
        {subTab === 'Ultimi' && <UltimiRisultati snapshots={snapshots} />}
      </div>
    );
  }

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.PerformanceComponent = PerformanceComponent;
  window.PerformanceUtils = {
    STORAGE_KEY,
    MAX_SNAPSHOTS,
    leggiSnapshots,
    scriviSnapshots,
    salvaSnapshot,
    aggiornaEsiti,
    aggregaStatistiche,
    calcolaEsitoGiocata,
    usePerformanceSnapshots,
  };

  console.log('✅ Modulo Performance caricato - MAX_SNAPSHOTS:', MAX_SNAPSHOTS, '- matching per contenuto attivo');

})();