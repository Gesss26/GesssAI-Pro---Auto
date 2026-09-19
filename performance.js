// ============================================================
// performance.js - Modulo Storico Performance (v4 - DB GitHub)
// - Salva TUTTE le giocate di TUTTE le famiglie
// - Scrive su GitHub (solo admin) + localStorage locale
// - Upload debounced + manuale + on beforeunload
// - Tabella matrice Campionato × Giocata con filtri ed export CSV
// - ⭐ Pulsante "Importa partite giocate" per recuperare storico
// - ⭐ FIX v4: gestione localStorage pieno (riduzione progressiva)
// - ⭐ FIX v4: MAX_LOCAL = 5000 (evita quota exceeded)
// - Ordinamento campionati: Italiane → Top 5 → Serie B estere
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const STORAGE_KEY = 'ft_performance_pending';
  const DEBOUNCE_MS = 5 * 60 * 1000;
  const MAX_LOCAL = 5000; // ⭐ Ridotto da 50000 a 5000 per evitare quota exceeded

  // ============================================================
  // ORDINE CAMPIONATI (per tabella)
  // ============================================================

  const CHAMP_ORDER = [
    'Serie A', 'Serie B', 'Serie C - Girone A', 'Serie C - Girone B', 'Serie C - Girone C',
    'Premier League', 'EFL Championship',
    'Bundesliga', '2. Bundesliga',
    'La Liga', 'Segunda División',
    'Ligue 1', 'Ligue 2',
    'Eredivisie', 'Eerste Divisie',
    'Primeira Liga',
    'Süper Lig',
    'Jupiler Pro League',
    'Scottish Premiership',
    'J1 League', 'K League 1',
  ];

  const champSortKey = (champ) => {
    const i = CHAMP_ORDER.indexOf(champ);
    return i === -1 ? 9999 : i;
  };

  // ============================================================
  // STORAGE LOCALE (buffer + UI) — con riduzione progressiva
  // ============================================================

  const leggiPending = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  };

  const scriviPending = (arr) => {
    // Helper: prova a salvare una lista
    const trySave = (list) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    };

    try {
      const limited = arr.slice(-MAX_LOCAL);
      trySave(limited);
      window.dispatchEvent(new CustomEvent('performance-updated', { detail: limited }));
      return;
    } catch (e) {
      // QuotaExceededError? Riduci progressivamente
      if (e.name === 'QuotaExceededError' || e.code === 22 || /quota/i.test(e.message)) {
        console.warn('⚠️ localStorage pieno. Riduco la dimensione del buffer...');
        const sizes = [3000, 2000, 1000, 500, 200, 100, 50];
        for (const size of sizes) {
          try {
            const limited = arr.slice(-size);
            trySave(limited);
            console.log(`✅ Buffer ridotto a ${limited.length} snapshot`);
            window.dispatchEvent(new CustomEvent('performance-updated', { detail: limited }));
            return;
          } catch (e2) {
            // Prova la prossima dimensione
          }
        }
        // Fallback estremo: svuota e salva solo gli ultimi 20
        try {
          const minimal = arr.slice(-20);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
          console.warn('⚠️ Buffer di emergenza: solo 20 snapshot in locale');
          window.dispatchEvent(new CustomEvent('performance-updated', { detail: minimal }));
        } catch (e3) {
          console.error('❌ Impossibile salvare anche il buffer minimo:', e3);
        }
      } else {
        console.warn('Errore salvataggio pending performance:', e);
      }
    }
  };

  // ============================================================
  // CHIAVE STABILE
  // ============================================================

  const norm = (s) => String(s || '')
    .trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const makeMatchKey = (data, casa, ospiti) => {
    const d = String(data || '').slice(0, 10);
    return `${d}|${norm(casa)}|${norm(ospiti)}`;
  };

  // ============================================================
  // CALCOLO ESITO
  // ============================================================

  const calcolaEsitoGiocata = (match, familyId, giocataLabel) => {
    const gC = match.golCasa || 0;
    const gO = match.golOspite || 0;
    const tot = gC + gO;

    if (familyId === 'fisse') {
      if (giocataLabel === '1') return gC > gO ? 'V' : 'P';
      if (giocataLabel === 'X') return gC === gO ? 'V' : 'P';
      if (giocataLabel === '2') return gC < gO ? 'V' : 'P';
    }
    if (familyId === 'dc') {
      if (giocataLabel === '1X') return gC >= gO ? 'V' : 'P';
      if (giocataLabel === '12') return gC !== gO ? 'V' : 'P';
      if (giocataLabel === 'X2') return gC <= gO ? 'V' : 'P';
    }
    if (familyId === 'over') {
      const s = parseFloat(String(giocataLabel).replace('Over ', ''));
      if (!isNaN(s)) return tot > s ? 'V' : 'P';
    }
    if (familyId === 'under') {
      const s = parseFloat(String(giocataLabel).replace('Under ', ''));
      if (!isNaN(s)) return tot < s ? 'V' : 'P';
    }
    if (familyId === 'gg_ng') {
      if (giocataLabel === 'Goal-Goal' || giocataLabel === 'GG') return (gC > 0 && gO > 0) ? 'V' : 'P';
      if (giocataLabel === 'No Goal' || giocataLabel === 'NG') return (gC === 0 || gO === 0) ? 'V' : 'P';
    }
    if (familyId === 'multigol') {
      if (giocataLabel === '0-2') return gC <= 2 ? 'V' : 'P';
      if (giocataLabel === '1-3') return (gC >= 1 && gC <= 3) ? 'V' : 'P';
      if (giocataLabel === '1-4') return (tot >= 1 && tot <= 4) ? 'V' : 'P';
      if (giocataLabel === '2-5') return (tot >= 2 && tot <= 5) ? 'V' : 'P';
    }
    if (familyId === 'mg_casa_ospite') {
      const parts = String(giocataLabel).split('+');
      if (parts.length === 2) {
        const c1 = matchRange(gC, parts[0]);
        const c2 = matchRange(gO, parts[1]);
        return (c1 && c2) ? 'V' : 'P';
      }
    }
    if (familyId === 'dc_over') {
      const parts = String(giocataLabel).split('+');
      if (parts.length === 2) {
        const dcOk = calcolaEsitoGiocata(match, 'dc', parts[0]) === 'V';
        const oOk = calcolaEsitoGiocata(match, 'over', 'Over ' + parts[1].replace('O', '')) === 'V';
        return (dcOk && oOk) ? 'V' : 'P';
      }
    }
    if (familyId === 'dc_under') {
      const parts = String(giocataLabel).split('+');
      if (parts.length === 2) {
        const dcOk = calcolaEsitoGiocata(match, 'dc', parts[0]) === 'V';
        const uOk = calcolaEsitoGiocata(match, 'under', 'Under ' + parts[1].replace('U', '')) === 'V';
        return (dcOk && uOk) ? 'V' : 'P';
      }
    }
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
  // CALCOLA TUTTE LE GIOCATE DI TUTTE LE FAMIGLIE PER UNA PARTITA
  // ============================================================

  const calcolaTutteGiocatePerPartita = (match, allMatches) => {
    if (typeof window.computeMatchStats !== 'function') return [];
    if (typeof window.FAMIGLIE_GIOCATE !== 'object') return [];

    const stats = window.computeMatchStats(match, allMatches);
    if (!stats || stats.error) return [];

    stats._allMatches = allMatches;
    stats._homeTeam = match.casa;
    stats._awayTeam = match.ospiti;

    const homeMG = stats.homeMG || {};
    const awayMG = stats.awayMG || {};
    const mgTot = stats.mgTot || {};
    const FAMIGLIE = window.FAMIGLIE_GIOCATE;
    const out = [];

    Object.keys(FAMIGLIE).forEach(familyId => {
      const family = FAMIGLIE[familyId];
      if (!family) return;

      family.options.forEach(opt => {
        let pct = 0;

        if (familyId === 'gg_ng') {
          const ggNgResult = window.calcolaGG_NG ? window.calcolaGG_NG(stats) : null;
          if (ggNgResult) {
            if (opt === 'GG') pct = ggNgResult.gg || 0;
            else if (opt === 'NG') pct = ggNgResult.ng || 0;
          }
        } else {
          if (window.getGiocataPct) {
            pct = window.getGiocataPct(opt, stats, homeMG, awayMG, mgTot);
          }
        }

        if (pct > 0) {
          out.push({
            familyId,
            familyLabel: family.label,
            familyIcon: family.icon,
            giocata: opt,
            label: opt,
            displayLabel: opt,
            pct,
          });
        }
      });
    });

    return out;
  };

  // ============================================================
  // SALVA SNAPSHOT (locale + pianifica upload)
  // ============================================================

  let uploadTimer = null;

  const salvaSnapshot = (match, giocate) => {
    const arr = leggiPending();
    const key = makeMatchKey(match.data, match.casa, match.ospiti);
    const idx = arr.findIndex(s => s.matchKey === key);

    const snapshot = {
      matchKey: key,
      data: match.data,
      ora: match.ora || '',
      campionato: match.campionato || '',
      casa: match.casa || '',
      ospiti: match.ospiti || '',
      risultatoFinale: null,
      salvatoIl: new Date().toISOString(),
      giocate: giocate.map(g => ({
        familyId: g.familyId,
        familyLabel: g.familyLabel,
        giocata: g.giocata,
        label: g.label,
        displayLabel: g.displayLabel || g.label,
        pct: g.pct,
        esito: null,
      })),
    };

    if (match.stato === 'Giocata') {
      snapshot.risultatoFinale = `${match.golCasa || 0}-${match.golOspite || 0}`;
      snapshot.giocate.forEach(g => {
        g.esito = calcolaEsitoGiocata(match, g.familyId, g.giocata);
      });
    }

    if (idx >= 0) {
      const prev = arr[idx];
      const merged = Object.assign({}, prev, snapshot);
      if (prev.risultatoFinale) {
        merged.risultatoFinale = prev.risultatoFinale;
      }
      arr[idx] = merged;
    } else {
      arr.push(snapshot);
    }

    scriviPending(arr);

    if (window.PerformanceDB && window.PerformanceDB.isWriter()) {
      if (uploadTimer) clearTimeout(uploadTimer);
      uploadTimer = setTimeout(() => {
        flushUpload();
      }, DEBOUNCE_MS);
    }
  };

  // ============================================================
  // UPLOAD VERSO GITHUB (raggruppa per giorno)
  // ============================================================

  const uploadInCorso = { value: false };

  const flushUpload = async (opts) => {
    const silent = opts && opts.silent;
    if (uploadInCorso.value) return { ok: false, motivo: 'in-corso' };
    if (!window.PerformanceDB || !window.PerformanceDB.isWriter()) {
      return { ok: false, motivo: 'readonly' };
    }

    uploadInCorso.value = true;
    const arr = leggiPending();
    if (arr.length === 0) {
      uploadInCorso.value = false;
      return { ok: true, motivo: 'vuoto' };
    }

    const perGiorno = {};
    arr.forEach(s => {
      const d = s.data ? s.data.slice(0, 10) : null;
      if (!d) return;
      if (!perGiorno[d]) perGiorno[d] = [];
      perGiorno[d].push(s);
    });

    let totaleUploadati = 0;
    const errori = [];

    for (const [data, snaps] of Object.entries(perGiorno)) {
      try {
        const r = await window.PerformanceDB.salvaGiorno(data, snaps);
        if (r.ok) {
          totaleUploadati += snaps.length;
        } else {
          errori.push(`${data}: ${r.error}`);
        }
      } catch (e) {
        errori.push(`${data}: ${e.message}`);
      }
    }

    uploadInCorso.value = false;

    if (errori.length === 0) {
      if (!silent) console.log(`✅ Performance: upload completato (${totaleUploadati} snapshot su ${Object.keys(perGiorno).length} giorni)`);
      return { ok: true, uploadati: totaleUploadati };
    } else {
      console.warn('⚠️ Performance: upload parziale:', errori);
      return { ok: false, errori };
    }
  };

  // ============================================================
  // AGGIORNA ESITI SUI PENDING
  // ============================================================

  const aggiornaEsiti = (matches) => {
    const arr = leggiPending();
    let modificato = false;

    const index = new Map();
    matches.forEach(m => {
      index.set(makeMatchKey(m.data, m.casa, m.ospiti), m);
      index.set(makeMatchKey(m.data, m.ospiti, m.casa), m);
    });

    arr.forEach(snap => {
      if (snap.risultatoFinale) return;
      const match = index.get(snap.matchKey);
      if (!match || match.stato !== 'Giocata') return;

      snap.risultatoFinale = `${match.golCasa || 0}-${match.golOspite || 0}`;
      snap.giocate.forEach(g => {
        g.esito = calcolaEsitoGiocata(match, g.familyId, g.giocata);
      });
      modificato = true;
    });

    if (modificato) {
      scriviPending(arr);
      if (window.PerformanceDB && window.PerformanceDB.isWriter()) {
        if (uploadTimer) clearTimeout(uploadTimer);
        uploadTimer = setTimeout(() => flushUpload(), 2000);
      }
    }
    return arr;
  };

  // ============================================================
  // HOOK: legge pending + DB remoto
  // ============================================================

  const usePerformanceSnapshots = () => {
    const [pending, setPending] = useState(() => leggiPending());
    const [remote, setRemote] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const handler = (e) => setPending(e.detail || leggiPending());
      const storageHandler = (e) => {
        if (e.key === STORAGE_KEY) setPending(leggiPending());
      };
      window.addEventListener('performance-updated', handler);
      window.addEventListener('storage', storageHandler);
      return () => {
        window.removeEventListener('performance-updated', handler);
        window.removeEventListener('storage', storageHandler);
      };
    }, []);

    useEffect(() => {
      if (!window.PerformanceDB) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const giorni = await window.PerformanceDB.listaGiorniDisponibili();
          if (giorni.length === 0) { setLoading(false); return; }
          const from = giorni[0];
          const to = giorni[giorni.length - 1];
          const snaps = await window.PerformanceDB.leggiIntervallo(from, to);
          if (!cancelled) setRemote(snaps);
        } catch (e) {
          console.warn('Performance: errore caricamento DB remoto:', e);
        }
        if (!cancelled) setLoading(false);
      })();
      return () => { cancelled = true; };
    }, []);

    const tutti = useMemo(() => {
      const map = new Map();
      remote.forEach(s => map.set(s.matchKey, s));
      pending.forEach(s => map.set(s.matchKey, s));
      return Array.from(map.values());
    }, [pending, remote]);

    return { snapshots: tutti, loading, pending, remote };
  };

  // ============================================================
  // AGGREGAZIONE: matrice campionato × giocata
  // ============================================================

  const costruisciMatrice = (snapshots) => {
    const matrix = {};
    const tutteGiocateSet = new Set();

    snapshots.forEach(snap => {
      if (!snap.risultatoFinale) return;
      const camp = snap.campionato || 'N/D';
      if (!matrix[camp]) matrix[camp] = {};

      snap.giocate.forEach(g => {
        if (g.esito !== 'V' && g.esito !== 'P') return;
        const label = g.displayLabel || g.giocata;
        tutteGiocateSet.add(label);

        if (!matrix[camp][label]) matrix[camp][label] = { V: 0, P: 0, tot: 0 };
        matrix[camp][label].tot++;
        if (g.esito === 'V') matrix[camp][label].V++;
        else matrix[camp][label].P++;
      });
    });

    const campionati = Object.keys(matrix).sort((a, b) => {
      const ka = champSortKey(a);
      const kb = champSortKey(b);
      if (ka !== kb) return ka - kb;
      return a.localeCompare(b);
    });

    const tutteGiocate = Array.from(tutteGiocateSet).sort((a, b) => {
      const order = (s) => {
        if (s.startsWith('Over ')) return 1;
        if (s.startsWith('Under ')) return 2;
        if (s === 'GG' || s === 'NG') return 3;
        if (s === '1' || s === 'X' || s === '2') return 4;
        if (s === '1X' || s === '12' || s === 'X2') return 5;
        if (s.startsWith('MG ')) return 6;
        return 7;
      };
      const oa = order(a);
      const ob = order(b);
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b);
    });

    return { matrix, campionati, tutteGiocate };
  };

  // ============================================================
  // COLORE PER CELLA
  // ============================================================

  const cellColor = (pct, tot, minGiocate) => {
    if (tot < minGiocate) return { bg: 'transparent', fg: 'var(--text-muted)', opacity: 0.3 };
    if (pct >= 80) return { bg: 'rgba(111, 207, 151, 0.35)', fg: 'var(--win)', opacity: 1 };
    if (pct >= 65) return { bg: 'rgba(111, 207, 151, 0.15)', fg: 'var(--win)', opacity: 1 };
    if (pct >= 45) return { bg: 'rgba(255, 255, 255, 0.05)', fg: 'var(--text)', opacity: 1 };
    if (pct >= 30) return { bg: 'rgba(235, 87, 87, 0.10)', fg: 'var(--lose)', opacity: 1 };
    return { bg: 'rgba(235, 87, 87, 0.25)', fg: 'var(--lose)', opacity: 1 };
  };

  // ============================================================
  // TABELLA MATRICE
  // ============================================================

  const MatriceCampionato = ({ snapshots }) => {
    const [minGiocate, setMinGiocate] = useState(1);
    const [filtroCampionato, setFiltroCampionato] = useState('Tutti');
    const [filtroFamiglia, setFiltroFamiglia] = useState('Tutte');
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState('desc');
    const [dettaglio, setDettaglio] = useState(null);

    const { matrix, campionati, tutteGiocate } = useMemo(
      () => costruisciMatrice(snapshots),
      [snapshots]
    );

    const inFamiglia = (label, fam) => {
      if (fam === 'Tutte') return true;
      if (fam === 'Over') return label.startsWith('Over ');
      if (fam === 'Under') return label.startsWith('Under ');
      if (fam === 'GG/NG') return label === 'GG' || label === 'NG';
      if (fam === 'MG') return label.startsWith('MG ');
      if (fam === 'FISSE') return ['1', 'X', '2'].includes(label);
      if (fam === 'DC') return ['1X', '12', 'X2'].includes(label);
      if (fam === 'Combinazioni') return label.includes('+');
      return true;
    };

    const giocateFiltrate = tutteGiocate.filter(g => inFamiglia(g, filtroFamiglia));

    const campionatiFiltrati = filtroCampionato === 'Tutti'
      ? campionati
      : campionati.filter(c => c === filtroCampionato);

    let campionatiOrdinati = [...campionatiFiltrati];
    if (sortCol) {
      campionatiOrdinati.sort((a, b) => {
        const va = matrix[a][sortCol];
        const vb = matrix[b][sortCol];
        const pa = va && va.tot >= minGiocate ? (va.V / va.tot) * 100 : -1;
        const pb = vb && vb.tot >= minGiocate ? (vb.V / vb.tot) * 100 : -1;
        return sortDir === 'desc' ? pb - pa : pa - pb;
      });
    }

    const handleSort = (col) => {
      if (sortCol === col) {
        setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
      } else {
        setSortCol(col);
        setSortDir('desc');
      }
    };

    const exportCSV = () => {
      const sep = ';';
      const lines = [];
      lines.push(['Campionato', ...giocateFiltrate].join(sep));
      campionatiOrdinati.forEach(camp => {
        const row = [camp];
        giocateFiltrate.forEach(g => {
          const v = matrix[camp][g];
          if (!v || v.tot < minGiocate) {
            row.push('');
          } else {
            const pct = Math.round((v.V / v.tot) * 100);
            row.push(`${pct}% (${v.tot})`);
          }
        });
        lines.push(row.join(sep));
      });
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    if (campionati.length === 0) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
          <h3 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Nessun dato di performance</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Apri il <b>Palinsesto</b> per generare snapshot, oppure clicca <b>📥 Importa partite giocate</b> qui sopra.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="card" style={{ padding: '12px 14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Min giocate:</label>
              <input type="number" min="1" max="200" value={minGiocate}
                onChange={e => setMinGiocate(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '70px', padding: '4px 8px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Campionato:</label>
              <select value={filtroCampionato} onChange={e => setFiltroCampionato(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', maxWidth: '220px' }}>
                <option value="Tutti">Tutti ({campionati.length})</option>
                {campionati.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Famiglia:</label>
              <select value={filtroFamiglia} onChange={e => setFiltroFamiglia(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px' }}>
                <option>Tutte</option>
                <option>Over</option>
                <option>Under</option>
                <option>GG/NG</option>
                <option>MG</option>
                <option>FISSE</option>
                <option>DC</option>
                <option>Combinazioni</option>
              </select>
            </div>
            <button className="btn btn-secondary" onClick={exportCSV}
              style={{ fontSize: '12px', padding: '6px 14px', marginLeft: 'auto' }}>
              📥 Esporta CSV
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1200px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={{
                  padding: '8px 10px', textAlign: 'left', position: 'sticky', left: 0, zIndex: 2,
                  background: 'var(--surface)', borderBottom: '2px solid var(--border)',
                  fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)',
                }}>
                  Campionato
                </th>
                {giocateFiltrate.map(g => (
                  <th key={g}
                    onClick={() => handleSort(g)}
                    style={{
                      padding: '6px 8px', textAlign: 'center', cursor: 'pointer',
                      borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap',
                      fontSize: '10px', textTransform: 'uppercase',
                      color: sortCol === g ? 'var(--accent)' : 'var(--text-muted)',
                      background: sortCol === g ? 'rgba(243, 156, 18, 0.1)' : 'var(--surface)',
                    }}>
                    {g} {sortCol === g && (sortDir === 'desc' ? '▼' : '▲')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campionatiOrdinati.map(camp => (
                <tr key={camp} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{
                    padding: '6px 10px', fontWeight: 'bold', position: 'sticky', left: 0,
                    background: 'var(--card)', zIndex: 1,
                  }}>
                    {camp}
                  </td>
                  {giocateFiltrate.map(g => {
                    const v = matrix[camp][g];
                    if (!v || v.tot < minGiocate) {
                      return (
                        <td key={g} style={{
                          padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)',
                          opacity: 0.3, fontSize: '11px',
                        }}>—</td>
                      );
                    }
                    const pct = Math.round((v.V / v.tot) * 100);
                    const c = cellColor(pct, v.tot, minGiocate);
                    return (
                      <td key={g}
                        onClick={() => setDettaglio({ camp, giocata: g })}
                        style={{
                          padding: '6px 8px', textAlign: 'center', cursor: 'pointer',
                          background: c.bg, color: c.fg, fontWeight: 'bold',
                          fontSize: '12px', opacity: c.opacity,
                        }}>
                        {pct}%
                        <div style={{ fontSize: '9px', opacity: 0.6 }}>({v.tot})</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dettaglio && (
          <div className="heatmap-detail-overlay" onClick={() => setDettaglio(null)}>
            <div className="heatmap-detail-modal" onClick={e => e.stopPropagation()}
              style={{ maxWidth: '900px', maxHeight: '85vh', overflowY: 'auto' }}>
              <button className="close-btn" onClick={() => setDettaglio(null)}>✖</button>
              <h3 style={{ color: 'var(--accent)', marginBottom: '12px' }}>
                {dettaglio.camp} — {dettaglio.giocata}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {(() => {
                  const v = matrix[dettaglio.camp][dettaglio.giocata];
                  const pct = Math.round((v.V / v.tot) * 100);
                  return `${v.V} vinte / ${v.P} perse (${pct}% su ${v.tot} giocate)`;
                })()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {snapshots
                  .filter(s => s.campionato === dettaglio.camp)
                  .filter(s => s.giocate.some(g => (g.displayLabel || g.giocata) === dettaglio.giocata))
                  .slice(-100)
                  .reverse()
                  .map((s, i) => {
                    const g = s.giocate.find(x => (x.displayLabel || x.giocata) === dettaglio.giocata);
                    if (!g) return null;
                    const isV = g.esito === 'V';
                    const isP = g.esito === 'P';
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 10px', borderRadius: '6px',
                        background: isV ? 'rgba(111, 207, 151, 0.1)' : isP ? 'rgba(235, 87, 87, 0.1)' : 'var(--surface)',
                        border: `1px solid ${isV ? 'var(--win)' : isP ? 'var(--lose)' : 'var(--border)'}`,
                        fontSize: '12px',
                      }}>
                        <span>📅 {s.data} — ⚽ {s.casa} {s.risultatoFinale || '?-?'} {s.ospiti}</span>
                        <span style={{ fontWeight: 'bold', color: isV ? 'var(--win)' : isP ? 'var(--lose)' : 'var(--text-muted)' }}>
                          {isV ? '✅ V' : isP ? '❌ P' : '⏳'} ({g.pct}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // COMPONENTE PRINCIPALE
  // ============================================================

  function PerformanceComponent({ matches, championships, onSelectMatch }) {
    const { snapshots, loading, pending, remote } = usePerformanceSnapshots();
    const [uploading, setUploading] = useState(false);
    const [importandoGiocate, setImportandoGiocate] = useState(false);
    const [msg, setMsg] = useState(null);
    const isWriter = window.PerformanceDB ? window.PerformanceDB.isWriter() : false;

    useEffect(() => {
      if (!matches || matches.length === 0) return;
      const t = setTimeout(() => {
        aggiornaEsiti(matches);
      }, 500);
      return () => clearTimeout(t);
    }, [matches]);

    useEffect(() => {
      const handler = () => {
        if (isWriter && leggiPending().length > 0) {
          try { flushUpload({ silent: true }); } catch (e) {}
        }
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }, [isWriter]);

    const handleUploadManuale = async () => {
      setUploading(true);
      setMsg({ type: 'info', text: '⏳ Upload in corso...' });
      const r = await flushUpload({ silent: false });
      setUploading(false);
      if (r.ok) {
        setMsg({ type: 'success', text: `✅ Caricati ${r.uploadati || 0} snapshot su GitHub` });
      } else {
        setMsg({ type: 'error', text: `❌ ${r.errori ? r.errori.join(', ') : r.motivo || 'Errore'}` });
      }
      setTimeout(() => setMsg(null), 4000);
    };

    // ⭐ IMPORTA PARTITE GIÀ GIOCATE
    const handleImportaPartiteGiocate = async () => {
      if (!matches || matches.length === 0) {
        setMsg({ type: 'error', text: '⚠️ Nessuna partita disponibile' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }

      const partiteGiocate = matches.filter(m =>
        m.stato === 'Giocata' &&
        (m.golCasa > 0 || m.golOspite > 0 || m.risultato)
      );

      if (partiteGiocate.length === 0) {
        setMsg({ type: 'warning', text: '⚠️ Nessuna partita giocata con risultato' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }

      setImportandoGiocate(true);
      setMsg({ type: 'info', text: `⏳ Importazione di ${partiteGiocate.length} partite...` });

      await new Promise(r => setTimeout(r, 100));

      let importate = 0;
      let errori = 0;

      try {
        for (let i = 0; i < partiteGiocate.length; i++) {
          const match = partiteGiocate[i];
          try {
            const tutteGiocate = calcolaTutteGiocatePerPartita(match, matches);
            if (!tutteGiocate || tutteGiocate.length === 0) continue;

            salvaSnapshot(match, tutteGiocate);
            importate++;

            if (i % 100 === 0 && i > 0) {
              setMsg({ type: 'info', text: `⏳ Importazione... ${i}/${partiteGiocate.length}` });
              await new Promise(r => setTimeout(r, 0));
            }
          } catch (e) {
            errori++;
          }
        }

        setMsg({
          type: 'success',
          text: `✅ Importate ${importate} partite (${errori} errori). Upload su GitHub in corso...`
        });

        if (window.PerformanceDB && window.PerformanceDB.isWriter()) {
          const r = await flushUpload({ silent: true });
          if (r.ok) {
            setMsg({
              type: 'success',
              text: `✅ Importate ${importate} partite e caricate su GitHub!`
            });
          } else {
            setMsg({
              type: 'warning',
              text: `✅ ${importate} snapshot in coda locale (upload: ${r.motivo || r.errori?.join(', ') || 'attesa'})`
            });
          }
        } else {
          setMsg({
            type: 'success',
            text: `✅ Importate ${importate} partite (solo locali, non sei admin)`
          });
        }
      } catch (e) {
        setMsg({ type: 'error', text: '❌ ' + e.message });
      } finally {
        setImportandoGiocate(false);
        setTimeout(() => setMsg(null), 8000);
      }
    };

    const risolti = snapshots.filter(s => s.risultatoFinale).length;
    const inAttesa = snapshots.length - risolti;
    const pendingCount = pending.length;
    const partiteGiocateDisponibili = matches
      ? matches.filter(m => m.stato === 'Giocata' && (m.golCasa > 0 || m.golOspite > 0 || m.risultato)).length
      : 0;

    return (
      <div>
        {/* HEADER */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '12px', marginBottom: '16px', padding: '10px 14px',
          background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: '18px' }}>📈 Storico Performance</h2>
            <span style={{
              fontSize: '11px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '10px',
              background: isWriter ? 'var(--win)' : 'var(--surface)',
              color: isWriter ? '#000' : 'var(--text-muted)',
              border: isWriter ? 'none' : '1px solid var(--border)',
            }}>
              {isWriter ? '✍️ Scrittore' : '👁️ Solo lettura'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {snapshots.length} snapshot ({risolti} risolti • {inAttesa} in attesa)
              {pendingCount > 0 && ` • ${pendingCount} pending`}
              {loading && ' • 🔄 caricamento...'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isWriter && (
              <button className="btn" onClick={handleUploadManuale}
                disabled={uploading || pendingCount === 0}
                style={{ fontSize: '12px', padding: '6px 14px',
                  opacity: (uploading || pendingCount === 0) ? 0.5 : 1 }}>
                {uploading ? '⏳ Upload...' : '💾 Salva adesso'}
              </button>
            )}
            {!isWriter && (
              <button className="btn btn-secondary"
                onClick={() => {
                  if (window.PerformanceDB) window.PerformanceDB.clearCache();
                  window.location.reload();
                }}
                style={{ fontSize: '12px', padding: '6px 14px' }}>
                🔄 Sincronizza
              </button>
            )}
          </div>
        </div>

        {/* IMPORTA PARTITE GIÀ GIOCATE */}
        {isWriter && partiteGiocateDisponibili > 0 && (
          <div className="card" style={{
            padding: '10px 14px', marginBottom: '12px',
            background: 'rgba(52, 152, 219, 0.08)',
            border: '1px solid #3498db', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1 }}>
              📚 <b>Recupera storico</b>: importa snapshot per tutte le partite già giocate
              ({partiteGiocateDisponibili} disponibili)
            </span>
            <button
              className="btn"
              onClick={handleImportaPartiteGiocate}
              disabled={importandoGiocate}
              style={{
                fontSize: '12px', padding: '6px 14px',
                background: importandoGiocate ? 'var(--surface)' : '#3498db',
                color: importandoGiocate ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: '6px', fontWeight: 'bold',
                cursor: importandoGiocate ? 'wait' : 'pointer',
              }}>
              {importandoGiocate ? '⏳ Importazione...' : '📥 Importa partite giocate'}
            </button>
          </div>
        )}

        {msg && (
          <div style={{
            marginBottom: '12px', padding: '10px 14px', borderRadius: '6px',
            background: msg.type === 'success' ? 'rgba(111, 207, 151, 0.15)'
              : msg.type === 'error' ? 'rgba(235, 87, 87, 0.15)'
              : msg.type === 'warning' ? 'rgba(243, 156, 18, 0.15)'
              : 'rgba(52, 152, 219, 0.15)',
            border: `1px solid ${msg.type === 'success' ? 'var(--win)'
              : msg.type === 'error' ? 'var(--lose)'
              : msg.type === 'warning' ? 'var(--accent)'
              : '#3498db'}`,
            color: msg.type === 'success' ? 'var(--win)'
              : msg.type === 'error' ? 'var(--lose)'
              : msg.type === 'warning' ? 'var(--accent)'
              : '#3498db',
            fontSize: '13px', fontWeight: 'bold',
          }}>
            {msg.text}
          </div>
        )}

        <MatriceCampionato snapshots={snapshots} />
      </div>
    );
  }

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.PerformanceComponent = PerformanceComponent;
  window.PerformanceUtils = {
    STORAGE_KEY,
    leggiPending,
    scriviPending,
    salvaSnapshot,
    aggiornaEsiti,
    flushUpload,
    calcolaEsitoGiocata,
    calcolaTutteGiocatePerPartita,
    usePerformanceSnapshots,
    costruisciMatrice,
    makeMatchKey,
    CHAMP_ORDER,
  };

  console.log('✅ Modulo Performance v4 caricato - DB GitHub + matrice Campionato × Giocata + import partite giocate + buffer ridotto');

})();