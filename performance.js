// ============================================================
// performance.js - Modulo Storico Performance (v6 - Selettore Schedina)
// - ⭐ v5: calcola TUTTI gli snapshot direttamente da matches (Excel)
// - ⭐ v6: filtro "🎯 Seleziona Giocate" stile Schedina
// - La matrice Campionato × Giocata si popola automaticamente
// - Il DB GitHub è solo cache opzionale per condivisione
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const STORAGE_KEY = 'ft_performance_pending';
  const DEBOUNCE_MS = 5 * 60 * 1000;
  const MAX_LOCAL = 5000;

  // ============================================================
  // ORDINE CAMPIONATI
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
  // STORAGE LOCALE
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
          } catch (e2) {}
        }
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

  const matchRange = (val, range) => {
    const [min, max] = String(range).split('-').map(Number);
    if (isNaN(min) || isNaN(max)) return false;
    return val >= min && val <= max;
  };

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

  // ============================================================
  // CALCOLA TUTTE LE GIOCATE DI TUTTE LE FAMIGLIE
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
  // SALVA SNAPSHOT
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
  // UPLOAD VERSO GITHUB
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
  // HOOK PRINCIPALE: snapshot da matches + merge remoto/pending
  // ============================================================

  const usePerformanceSnapshots = (matches) => {
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

    const daExcel = useMemo(() => {
      if (!matches || matches.length === 0) return [];
      if (typeof window.computeMatchStats !== 'function') return [];
      if (typeof window.FAMIGLIE_GIOCATE !== 'object') return [];

      const partiteGiocate = matches.filter(m => m.stato === 'Giocata');
      if (partiteGiocate.length === 0) return [];

      console.log(`📊 Performance: calcolo snapshot per ${partiteGiocate.length} partite giocate...`);
      const t0 = performance.now();
      const out = [];

      partiteGiocate.forEach((match, idx) => {
        try {
          const giocate = calcolaTutteGiocatePerPartita(match, matches);
          if (!giocate || giocate.length === 0) return;

          const giocateConEsito = giocate.map(g => ({
            ...g,
            esito: calcolaEsitoGiocata(match, g.familyId, g.giocata),
          }));

          out.push({
            matchKey: makeMatchKey(match.data, match.casa, match.ospiti),
            data: match.data,
            ora: match.ora || '',
            campionato: match.campionato || '',
            casa: match.casa || '',
            ospiti: match.ospiti || '',
            risultatoFinale: `${match.golCasa || 0}-${match.golOspite || 0}`,
            salvatoIl: new Date().toISOString(),
            giocate: giocateConEsito,
          });

          if (idx > 0 && idx % 100 === 0) {
            console.log(`   ... ${idx}/${partiteGiocate.length}`);
          }
        } catch (e) {
          console.warn(`⚠️ Errore calcolo snapshot per ${match.casa}-${match.ospiti}:`, e.message);
        }
      });

      const t1 = performance.now();
      console.log(`✅ Performance: ${out.length} snapshot calcolati in ${Math.round(t1 - t0)}ms`);
      return out;
    }, [matches]);

    const tutti = useMemo(() => {
      const map = new Map();
      remote.forEach(s => map.set(s.matchKey, s));
      daExcel.forEach(s => map.set(s.matchKey, s));
      pending.forEach(s => map.set(s.matchKey, s));
      return Array.from(map.values());
    }, [pending, remote, daExcel]);

    return {
      snapshots: tutti,
      loading,
      pending,
      remote,
      daExcel,
    };
  };

  // ============================================================
  // AGGREGAZIONE MATRICE
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

  const cellColor = (pct, tot, minGiocate) => {
    if (tot < minGiocate) return { bg: 'transparent', fg: 'var(--text-muted)', opacity: 0.3 };
    if (pct >= 80) return { bg: 'rgba(111, 207, 151, 0.35)', fg: 'var(--win)', opacity: 1 };
    if (pct >= 65) return { bg: 'rgba(111, 207, 151, 0.15)', fg: 'var(--win)', opacity: 1 };
    if (pct >= 45) return { bg: 'rgba(255, 255, 255, 0.05)', fg: 'var(--text)', opacity: 1 };
    if (pct >= 30) return { bg: 'rgba(235, 87, 87, 0.10)', fg: 'var(--lose)', opacity: 1 };
    return { bg: 'rgba(235, 87, 87, 0.25)', fg: 'var(--lose)', opacity: 1 };
  };

  // ============================================================
  // SELETTORE GIOCATE (stile Schedina)
  // ============================================================

  const GiocateSelector = ({ selected, onChange, allLabels }) => {
    const categorie = useMemo(() => {
      const cats = {
        fisse:          { id: 'fisse',          label: 'FISSE',           icon: '🎯', items: [] },
        dc:             { id: 'dc',             label: 'DOPPIA CHANCE',   icon: '🛡️', items: [] },
        over:           { id: 'over',           label: 'OVER',            icon: '⬆️', items: [] },
        under:          { id: 'under',          label: 'UNDER',           icon: '⬇️', items: [] },
        gg_ng:          { id: 'gg_ng',          label: 'GG / NG',         icon: '⚽', items: [] },
        mg:             { id: 'mg',             label: 'MULTIGOL',        icon: '📊', items: [] },
        dc_over:        { id: 'dc_over',        label: 'DC + OVER',       icon: '🔗', items: [] },
        dc_under:       { id: 'dc_under',       label: 'DC + UNDER',      icon: '🔗', items: [] },
        dc_mg:          { id: 'dc_mg',          label: 'DC + MULTIGOL',   icon: '🔗', items: [] },
        mg_casa_ospite: { id: 'mg_casa_ospite', label: 'MG CASA + OSPITE', icon: '⚔️', items: [] },
      };

      (allLabels || []).forEach(label => {
        if (!label) return;
        if (['1', 'X', '2'].includes(label)) cats.fisse.items.push(label);
        else if (['1X', '12', 'X2'].includes(label)) cats.dc.items.push(label);
        else if (label === 'GG' || label === 'NG') cats.gg_ng.items.push(label);
        else if (label.startsWith('Over ')) cats.over.items.push(label);
        else if (label.startsWith('Under ')) cats.under.items.push(label);
        else if (label.startsWith('MG ')) cats.mg.items.push(label);
        else if (label.includes('+')) {
          const parts = label.split('+');
          const p1 = parts[0].trim();
          if (['1X', '12', 'X2'].includes(p1)) {
            const p2 = (parts[1] || '').trim();
            if (p2.startsWith('Over')) cats.dc_over.items.push(label);
            else if (p2.startsWith('Under')) cats.dc_under.items.push(label);
            else cats.dc_mg.items.push(label);
          } else {
            cats.mg_casa_ospite.items.push(label);
          }
        }
      });

      return Object.values(cats).filter(c => c.items.length > 0);
    }, [allLabels]);

    const isAllSelected = selected.size === allLabels.length;
    const isCategorySelected = (cat) => cat.items.every(i => selected.has(i));
    const isCategoryPartial = (cat) => {
      const some = cat.items.some(i => selected.has(i));
      return some && !isCategorySelected(cat);
    };

    const toggleCategory = (cat) => {
      const next = new Set(selected);
      if (isCategorySelected(cat)) {
        cat.items.forEach(i => next.delete(i));
      } else {
        cat.items.forEach(i => next.add(i));
      }
      onChange(next);
    };

    const toggleItem = (item) => {
      const next = new Set(selected);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      onChange(next);
    };

    const selectAll = () => onChange(new Set(allLabels));
    const clearAll = () => onChange(new Set());

    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          marginBottom: '10px', paddingBottom: '8px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text)' }}>
            🎯 Seleziona Giocate
          </span>
          <span style={{
            fontSize: '11px', color: 'var(--text-muted)',
            padding: '3px 10px', background: 'var(--surface)', borderRadius: '4px',
          }}>
            <b style={{ color: 'var(--accent)' }}>{selected.size}</b> / {allLabels.length}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <button className="btn" onClick={selectAll} disabled={isAllSelected}
              style={{
                fontSize: '10px', padding: '3px 14px',
                background: isAllSelected ? 'var(--accent)' : 'var(--surface)',
                color: isAllSelected ? '#000' : 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '4px',
                cursor: isAllSelected ? 'default' : 'pointer',
                opacity: isAllSelected ? 0.7 : 1,
              }}>✅ Tutte</button>
            <button className="btn" onClick={clearAll} disabled={selected.size === 0}
              style={{
                fontSize: '10px', padding: '3px 14px',
                background: 'var(--surface)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '4px',
                cursor: selected.size === 0 ? 'default' : 'pointer',
                opacity: selected.size === 0 ? 0.5 : 1,
              }}>❌ Nessuna</button>
          </div>
        </div>

        <div className="giocate-selector-grid">
          {categorie.map(cat => {
            const allSel = isCategorySelected(cat);
            const partial = isCategoryPartial(cat);
            return (
              <div key={cat.id}
                className={`giocate-category ${allSel ? 'active' : ''}`}
                onClick={() => toggleCategory(cat)}
                style={{
                  borderColor: partial ? 'var(--accent)' : undefined,
                  background: partial ? 'rgba(243, 156, 18, 0.08)' : undefined,
                }}
                title={`Click per ${allSel ? 'deselezionare' : 'selezionare'} tutta la categoria ${cat.label}`}>
                <div className="category-title">
                  <span className="icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className="badge">
                    {cat.items.filter(i => selected.has(i)).length}/{cat.items.length}
                  </span>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}
                  onClick={(e) => e.stopPropagation()}>
                  {cat.items.map(item => {
                    const isOn = selected.has(item);
                    return (
                      <button key={item} onClick={() => toggleItem(item)} title={item}
                        style={{
                          fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                          border: `1px solid ${isOn ? 'var(--accent)' : 'var(--border)'}`,
                          background: isOn ? 'var(--accent)' : 'var(--surface)',
                          color: isOn ? '#000' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: isOn ? 'bold' : 'normal',
                          whiteSpace: 'nowrap', transition: 'all 0.15s',
                        }}>{item}</button>
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
  // TABELLA MATRICE
  // ============================================================

  const MatriceCampionato = ({ snapshots }) => {
    const [minGiocate, setMinGiocate] = useState(1);
    const [filtroCampionato, setFiltroCampionato] = useState('Tutti');
    const [selectedGiocate, setSelectedGiocate] = useState(new Set());
    const [showSelector, setShowSelector] = useState(false);
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState('desc');
    const [dettaglio, setDettaglio] = useState(null);

    const { matrix, campionati, tutteGiocate } = useMemo(
      () => costruisciMatrice(snapshots),
      [snapshots]
    );

    useEffect(() => {
      if (tutteGiocate.length > 0 && selectedGiocate.size === 0) {
        setSelectedGiocate(new Set(tutteGiocate));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tutteGiocate.length]);

    const giocateFiltrate = selectedGiocate.size === 0
      ? tutteGiocate
      : tutteGiocate.filter(g => selectedGiocate.has(g));

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
            Assicurati che il file Excel contenga partite con <b>stato = "Giocata"</b> e i relativi gol.
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
              <button
                className="btn"
                onClick={() => setShowSelector(s => !s)}
                style={{
                  fontSize: '12px', padding: '6px 14px',
                  background: showSelector ? 'var(--accent)' : 'var(--surface)',
                  color: showSelector ? '#000' : 'var(--text)',
                  border: '1px solid var(--border)',
                  fontWeight: 'bold',
                }}
                title="Mostra/nascondi il selettore delle giocate"
              >
                🎯 Seleziona Giocate ({selectedGiocate.size}/{tutteGiocate.length})
              </button>
            </div>
            <button className="btn btn-secondary" onClick={exportCSV}
              style={{ fontSize: '12px', padding: '6px 14px', marginLeft: 'auto' }}>
              📥 Esporta CSV
            </button>
          </div>
        </div>

        {showSelector && (
          <div className="card" style={{ padding: '12px 14px', marginBottom: '12px' }}>
            <GiocateSelector
              selected={selectedGiocate}
              onChange={setSelectedGiocate}
              allLabels={tutteGiocate}
            />
          </div>
        )}

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
    const { snapshots, loading, pending, remote, daExcel } = usePerformanceSnapshots(matches);
    const [uploading, setUploading] = useState(false);
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
      if (!window.PerformanceDB) return;
      if (!isWriter) {
        setMsg({ type: 'warning', text: '⚠️ Solo l\'admin può fare upload su GitHub' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }

      setUploading(true);
      setMsg({ type: 'info', text: '⏳ Preparazione upload...' });

      try {
        const tuttiDaSalvare = daExcel || [];
        if (tuttiDaSalvare.length === 0) {
          setMsg({ type: 'warning', text: '⚠️ Nessuno snapshot da caricare' });
          setUploading(false);
          setTimeout(() => setMsg(null), 3000);
          return;
        }

        const perGiorno = {};
        tuttiDaSalvare.forEach(s => {
          const d = s.data ? s.data.slice(0, 10) : null;
          if (!d) return;
          if (!perGiorno[d]) perGiorno[d] = [];
          perGiorno[d].push(s);
        });

        setMsg({ type: 'info', text: `⏳ Upload di ${Object.keys(perGiorno).length} giorni...` });

        let totaleOk = 0;
        let errori = [];
        let giorniOk = 0;

        for (const [data, snaps] of Object.entries(perGiorno)) {
          try {
            const r = await window.PerformanceDB.salvaGiorno(data, snaps);
            if (r.ok) {
              totaleOk += snaps.length;
              giorniOk++;
            } else {
              errori.push(`${data}: ${r.error}`);
            }
          } catch (e) {
            errori.push(`${data}: ${e.message}`);
          }
          if (giorniOk % 10 === 0) {
            setMsg({ type: 'info', text: `⏳ Upload... ${giorniOk}/${Object.keys(perGiorno).length} giorni` });
          }
        }

        setUploading(false);

        if (errori.length === 0) {
          setMsg({ type: 'success', text: `✅ Caricati ${totaleOk} snapshot (${giorniOk} giorni) su GitHub` });
        } else {
          setMsg({ type: 'warning', text: `⚠️ Caricati ${totaleOk} snapshot, ${errori.length} errori: ${errori.slice(0, 3).join(', ')}` });
        }
      } catch (e) {
        setUploading(false);
        setMsg({ type: 'error', text: `❌ ${e.message}` });
      }

      setTimeout(() => setMsg(null), 8000);
    };

    const risolti = snapshots.filter(s => s.risultatoFinale).length;
    const inAttesa = snapshots.length - risolti;
    const pendingCount = pending.length;
    const daExcelCount = daExcel ? daExcel.length : 0;
    const remoteCount = remote ? remote.length : 0;

    return (
      <div>
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
              {daExcelCount > 0 && ` • 📊 ${daExcelCount} da Excel`}
              {remoteCount > 0 && ` • ☁️ ${remoteCount} da GitHub`}
              {pendingCount > 0 && ` • 💾 ${pendingCount} in coda`}
              {loading && ' • 🔄 caricamento...'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isWriter && (
              <button className="btn" onClick={handleUploadManuale}
                disabled={uploading || daExcelCount === 0}
                style={{ fontSize: '12px', padding: '6px 14px',
                  opacity: (uploading || daExcelCount === 0) ? 0.5 : 1 }}>
                {uploading ? '⏳ Upload...' : '☁️ Pubblica su GitHub'}
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

        <div className="card" style={{
          padding: '10px 14px', marginBottom: '12px',
          background: 'rgba(52, 152, 219, 0.08)',
          border: '1px solid #3498db', borderRadius: '8px',
          fontSize: '12px', color: 'var(--text)',
        }}>
          ℹ️ <b>Fonte dati automatica:</b> gli snapshot vengono calcolati direttamente dal file Excel caricato
          ({daExcelCount} partite giocate con risultato). Ogni volta che ricarichi l'Excel, la matrice si aggiorna.
          {isWriter && (
            <span> Gli admin possono pubblicare i risultati su GitHub con il pulsante <b>☁️ Pubblica su GitHub</b>.</span>
          )}
        </div>

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

  console.log('✅ Modulo Performance v6 caricato - selettore giocate stile Schedina + calcolo da Excel');

})();