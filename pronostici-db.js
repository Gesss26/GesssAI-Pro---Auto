// ============================================================
// pronostici-db.js - Salvataggio e verifica pronostici emessi
// v1: registra top-3 Storico e best Dixon, verifica su risultati
// ============================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'ft_pronostici_v1';

  const slug = (s) => (s || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const makeStableId = (match) => {
    if (!match) return '';
    return [
      slug(match.campionato),
      match.data || '',
      slug(match.casa),
      slug(match.ospiti),
    ].join('__');
  };

  const chiaveRecord = (matchId, familyId, giocata) =>
    `${matchId}::${familyId}::${giocata}`;

  const leggiTutti = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('PronosticiDB: errore lettura', e);
      return [];
    }
  };

  const scriviTutti = (arr) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('PronosticiDB: errore scrittura (storage pieno?)', e);
    }
  };

  /**
   * Registra un pronostico. Se esiste già, NON sovrascrive i campi
   * emessi: completa solo eventuali buchi (es. aggiunge pctDixon se era null).
   */
  const registra = (match, familyId, giocata, opts = {}) => {
    if (!match || !familyId || !giocata) return false;

    const matchId = makeStableId(match);
    if (!matchId) return false;

    const key = chiaveRecord(matchId, familyId, giocata);
    const arr = leggiTutti();
    const idx = arr.findIndex(r => r._key === key);

    const pctStorico = opts.pctStorico != null ? Math.round(opts.pctStorico) : null;
    const pctDixon   = opts.pctDixon   != null ? Math.round(opts.pctDixon)   : null;
    const fonte      = opts.fonte || (
      pctStorico != null && pctDixon != null ? 'entrambi'
      : pctStorico != null ? 'storico'
      : pctDixon != null ? 'dixon'
      : 'sconosciuta'
    );

    if (idx >= 0) {
      const r = arr[idx];
      let changed = false;
      if (r.pctStorico == null && pctStorico != null) { r.pctStorico = pctStorico; changed = true; }
      if (r.pctDixon   == null && pctDixon   != null) { r.pctDixon   = pctDixon;   changed = true; }
      if (r.quotaBook  == null && opts.quota != null) { r.quotaBook  = opts.quota;  changed = true; }
      if ((!r.fonte || r.fonte === 'sconosciuta') && fonte !== 'sconosciuta') { r.fonte = fonte; changed = true; }
      else if (r.pctStorico != null && r.pctDixon != null && r.fonte !== 'entrambi') {
        r.fonte = 'entrambi'; changed = true;
      }
      if (changed) scriviTutti(arr);
      return changed;
    }

    arr.push({
      _key: key,
      matchId,
      campionato: match.campionato || '',
      casa: match.casa || '',
      ospiti: match.ospiti || '',
      data: match.data || '',
      ora: match.ora || '',
      round: match.round || '',
      familyId,
      giocata,
      pctStorico,
      pctDixon,
      quotaBook: opts.quota != null ? opts.quota : null,
      fonte,
      emessoIl: new Date().toISOString(),
      esito: null,
      verificatoIl: null,
      golCasa: null,
      golOspite: null,
    });
    scriviTutti(arr);
    return true;
  };

  const verificaGiocata = (familyId, giocata, golCasa, golOspite) => {
    if (golCasa == null || golOspite == null) return null;
    const tot = golCasa + golOspite;

    if (familyId === 'fisse') {
      if (giocata === '1') return golCasa > golOspite;
      if (giocata === 'X') return golCasa === golOspite;
      if (giocata === '2') return golCasa < golOspite;
    }
    if (familyId === 'dc') {
      if (giocata === '1X') return golCasa >= golOspite;
      if (giocata === '12') return golCasa !== golOspite;
      if (giocata === 'X2') return golCasa <= golOspite;
    }
    if (familyId === 'gg_ng') {
      const gg = golCasa > 0 && golOspite > 0;
      if (giocata === 'GG' || giocata === 'Goal-Goal') return gg;
      if (giocata === 'NG' || giocata === 'No Goal')   return !gg;
    }
    if (familyId === 'over') {
      if (giocata === 'Over 1.5') return tot > 1.5;
      if (giocata === 'Over 2.5') return tot > 2.5;
      if (giocata === 'Over 3.5') return tot > 3.5;
      if (giocata === 'Over 4.5') return tot > 4.5;
    }
    if (familyId === 'under') {
      if (giocata === 'Under 1.5') return tot < 1.5;
      if (giocata === 'Under 2.5') return tot < 2.5;
      if (giocata === 'Under 3.5') return tot < 3.5;
      if (giocata === 'Under 4.5') return tot < 4.5;
    }
    if (familyId === 'multigol') {
      const m = giocata.match(/^(\d+)-(\d+)$/);
      if (!m) return null;
      const min = parseInt(m[1], 10), max = parseInt(m[2], 10);
      return tot >= min && tot <= max;
    }
    if (familyId === 'dc_over') {
      const parts = giocata.split('+');
      if (parts.length !== 2) return null;
      const dc = parts[0];
      const soglia = parseFloat(parts[1].replace('O', '').replace(',', '.'));
      if (isNaN(soglia)) return null;
      const dcOk =
        dc === '1X' ? golCasa >= golOspite :
        dc === '12' ? golCasa !== golOspite :
        dc === 'X2' ? golCasa <= golOspite : false;
      return dcOk && tot > soglia;
    }
    if (familyId === 'dc_under') {
      const parts = giocata.split('+');
      if (parts.length !== 2) return null;
      const dc = parts[0];
      const soglia = parseFloat(parts[1].replace('U', '').replace(',', '.'));
      if (isNaN(soglia)) return null;
      const dcOk =
        dc === '1X' ? golCasa >= golOspite :
        dc === '12' ? golCasa !== golOspite :
        dc === 'X2' ? golCasa <= golOspite : false;
      return dcOk && tot < soglia;
    }
    if (familyId === 'dc_multigol') {
      const parts = giocata.split('+');
      if (parts.length !== 2) return null;
      const dc = parts[0];
      const m = parts[1].match(/^(\d+)-(\d+)$/);
      if (!m) return null;
      const min = parseInt(m[1], 10), max = parseInt(m[2], 10);
      const dcOk =
        dc === '1X' ? golCasa >= golOspite :
        dc === '12' ? golCasa !== golOspite :
        dc === 'X2' ? golCasa <= golOspite : false;
      return dcOk && tot >= min && tot <= max;
    }
    if (familyId === 'mg_casa_ospite') {
      const parts = giocata.split('+');
      if (parts.length !== 2) return null;
      const c = parts[0].match(/^(\d+)-(\d+)$/);
      const o = parts[1].match(/^(\d+)-(\d+)$/);
      if (!c || !o) return null;
      return (
        golCasa >= parseInt(c[1], 10) && golCasa <= parseInt(c[2], 10) &&
        golOspite >= parseInt(o[1], 10) && golOspite <= parseInt(o[2], 10)
      );
    }
    return null;
  };

  const verificaTutti = (matches) => {
    if (!Array.isArray(matches) || matches.length === 0) return 0;
    const arr = leggiTutti();
    if (arr.length === 0) return 0;

    const byId = new Map();
    matches.forEach(m => {
      if (m.stato !== 'Giocata') return;
      const id = makeStableId(m);
      if (id) byId.set(id, m);
    });

    let n = 0;
    arr.forEach(r => {
      if (r.esito != null) return;
      const m = byId.get(r.matchId);
      if (!m) return;
      const esitoBool = verificaGiocata(r.familyId, r.giocata, m.golCasa, m.golOspite);
      if (esitoBool == null) return;
      r.esito = esitoBool ? 'vinto' : 'perso';
      r.verificatoIl = new Date().toISOString();
      r.golCasa = m.golCasa;
      r.golOspite = m.golOspite;
      n++;
    });

    if (n > 0) scriviTutti(arr);
    return n;
  };

  const getPronostici = (opts = {}) => {
    const arr = leggiTutti();
    return arr.filter(r => {
      if (opts.data && r.data !== opts.data) return false;
      if (opts.fonte && opts.fonte !== 'tutti' && r.fonte !== opts.fonte) return false;
      if (opts.esito && opts.esito !== 'tutti') {
        if (opts.esito === 'in-attesa' && r.esito != null) return false;
        if (opts.esito !== 'in-attesa' && r.esito !== opts.esito) return false;
      }
      if (opts.famiglia && r.familyId !== opts.famiglia) return false;
      if (opts.soloBombe) {
        const maxPct = Math.max(r.pctStorico || 0, r.pctDixon || 0);
        if (maxPct < 90) return false;
      }
      return true;
    });
  };

  const statistiche = (opts = {}) => {
    const arr = getPronostici(opts);

    const makeBucket = () => ({ emessi: 0, verificati: 0, vinti: 0, persi: 0, inAttesa: 0 });
    const calcHit = (b) => b.verificati > 0 ? Math.round((b.vinti / b.verificati) * 100) : null;

    const totali = makeBucket();
    const perCampMap = new Map();
    const perFamMap = new Map();
    const perFasciaMap = new Map();

    const fasce = [
      { label: '<33%',  test: p => p > 0 && p < 33 },
      { label: '33-50%', test: p => p >= 33 && p < 50 },
      { label: '50-66%', test: p => p >= 50 && p < 66 },
      { label: '66-90%', test: p => p >= 66 && p < 90 },
      { label: '≥90%',   test: p => p >= 90 },
    ];
    fasce.forEach(f => perFasciaMap.set(f.label, { ...makeBucket(), label: f.label }));

    arr.forEach(r => {
      const bump = (b) => {
        b.emessi++;
        if (r.esito === 'vinto') { b.verificati++; b.vinti++; }
        else if (r.esito === 'perso') { b.verificati++; b.persi++; }
        else b.inAttesa++;
      };

      bump(totali);

      const camp = r.campionato || 'Sconosciuto';
      if (!perCampMap.has(camp)) perCampMap.set(camp, { ...makeBucket(), campionato: camp });
      bump(perCampMap.get(camp));

      if (!perFamMap.has(r.familyId)) perFamMap.set(r.familyId, { ...makeBucket(), familyId: r.familyId });
      bump(perFamMap.get(r.familyId));

      const maxPct = Math.max(r.pctStorico || 0, r.pctDixon || 0);
      const f = fasce.find(x => x.test(maxPct));
      if (f) bump(perFasciaMap.get(f.label));
    });

    const finalize = (b) => ({ ...b, hitRate: calcHit(b) });

    const perCampionato = [...perCampMap.values()]
      .map(finalize)
      .sort((a, b) => {
        if (b.verificati !== a.verificati) return b.verificati - a.verificati;
        return a.campionato.localeCompare(b.campionato);
      });

    const perFamiglia = [...perFamMap.values()]
      .map(finalize)
      .sort((a, b) => b.verificati - a.verificati);

    const perFascia = [...perFasciaMap.values()].map(finalize);

    return { totali: finalize(totali), perCampionato, perFamiglia, perFascia };
  };

  window.PronosticiDB = {
    registra,
    verificaTutti,
    getPronostici,
    statistiche,
    verificaGiocata,
    makeStableId,
    _leggiTutti: leggiTutti,
    _scriviTutti: scriviTutti,
    _reset: () => { localStorage.removeItem(STORAGE_KEY); },
    STORAGE_KEY,
  };

  console.log('✅ pronostici-db.js v1 caricato');
})();