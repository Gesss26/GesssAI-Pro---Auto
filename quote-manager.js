// ============================================================
// quote-manager.js
// Gestore quote via The Odds API (sostituisce il sistema PDF)
// - Download automatico da The Odds API
// - Salvataggio in localStorage (stesso formato di prima)
// - Alert se quote non aggiornate
// - Hook React useQuote() per accedere alle quote
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback } = React;

  // ============================================================
  // CONFIGURAZIONE
  // ============================================================

  const API_KEY = '801b8133c6b51c33d6c69757b2446cbc';
  const API_BASE = 'https://api.the-odds-api.com/v4';

  // Regione bookmaker: 'eu' include Marathonbet e altri europei
  const REGIONS = 'eu';
  const ODDS_FORMAT = 'decimal';

  // Mercati richiesti
  // h2h = 1X2, totals = Over/Under, btts = GG/NG
  const MARKETS = 'h2h,totals,btts';

  // Soglie Over/Under che ci interessano (l'API restituisce vari points)
  const TOTALS_POINTS = [1.5, 2.5, 3.5, 4.5];

  // Bookmaker preferito (se presente nei dati, altrimenti media)
  const BOOKMAKER_PREFERITO = 'marathonbet';

  // Campionati da scaricare (sport_key di The Odds API)
  const SPORTS_KEYS = [
    'soccer_italy_serie_a',
    'soccer_italy_serie_b',
    'soccer_spain_la_liga',
    'soccer_spain_segunda_division',
    'soccer_epl',
    'soccer_efl_champ',
    'soccer_germany_bundesliga',
    'soccer_germany_bundesliga2',
    'soccer_france_ligue_one',
    'soccer_france_ligue_two',
    'soccer_netherlands_eredivisie',
    'soccer_portugal_primeira_liga',
    'soccer_belgium_first_div',
    'soccer_turkey_super_league',
    'soccer_spl', // Scottish Premiership
    'soccer_japan_j_league',
    'soccer_korea_kleague1',
  ];

  const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minuti
  const CACHE_KEY = 'ft_quote_last_download';

  const STORAGE_KEY = 'ft_quote_pdf'; // manteniamo la stessa chiave per non rompere il resto
  const STORAGE_META_KEY = 'ft_quote_pdf_meta';

  const DEBUG = true;

  // ============================================================
  // STATO GLOBALE
  // ============================================================

  const state = {
    scaricato: false,
    inCorso: false,
    errore: null,
    ultimaDataMax: null,
    numPartite: 0,
    richiesteRimanenti: null,
  };

  const listeners = new Set();

  const notifyListeners = (payload) => {
    listeners.forEach(fn => {
      try { fn(payload); } catch (e) { console.warn('Listener error:', e); }
    });
  };

  // ============================================================
  // NORMALIZZAZIONE NOMI (per matchare con Excel)
  // ============================================================

  const normalizzaNome = (nome) => {
    if (!nome) return '';
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(fc|ac|ssc|as|us|ss|asd|ssd|calcio|sportiva|società|societa|cf|sk|sv|sc|vv|kvc|fk|bk|if|ff|cd|sd|ud|rc|rcd|afc|cfc)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // ============================================================
  // UTILITY: DATA ISO DA EVENTO API
  // ============================================================

  const isoToDateStr = (isoString) => {
    if (!isoString) return null;
    try {
      return isoString.slice(0, 10); // YYYY-MM-DD
    } catch (e) { return null; }
  };

  const isoToOraStr = (isoString) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) { return null; }
  };

  // ============================================================
  // ESTRAZIONE QUOTE DA UN EVENTO API
  // ============================================================

  const estraiQuoteEvento = (evento) => {
    const quote = {
      '1': null, 'X': null, '2': null,
      '1X': null, '12': null, 'X2': null,
      'GG': null, 'NG': null,
      'U1.5': null, 'O1.5': null,
      'U2.5': null, 'O2.5': null,
      'U3.5': null, 'O3.5': null,
      'U4.5': null, 'O4.5': null,
      'MG14_SI': null, 'MG14_NO': null,
      'MG25_SI': null, 'MG25_NO': null,
    };

    if (!evento.bookmakers || evento.bookmakers.length === 0) return quote;

    // Preferisci Marathonbet se presente, altrimenti il primo bookmaker
    let bookmaker = evento.bookmakers.find(b =>
      b.key && b.key.toLowerCase().includes(BOOKMAKER_PREFERITO)
    ) || evento.bookmakers[0];

    if (!bookmaker || !bookmaker.markets) return quote;

    // Mappa mercato → outcomes
    bookmaker.markets.forEach(mkt => {
      if (!mkt.outcomes) return;

      // ─── h2h (1X2) ───
      if (mkt.key === 'h2h') {
        mkt.outcomes.forEach(o => {
          if (o.name === evento.home_team) quote['1'] = o.price;
          else if (o.name === evento.away_team) quote['2'] = o.price;
          else if (o.name === 'Draw') quote['X'] = o.price;
        });
      }

      // ─── totals (Over/Under) ───
      if (mkt.key === 'totals') {
        mkt.outcomes.forEach(o => {
          const point = o.point;
          if (!TOTALS_POINTS.includes(point)) return;

          if (o.name === 'Over') {
            if (point === 1.5) quote['O1.5'] = o.price;
            if (point === 2.5) quote['O2.5'] = o.price;
            if (point === 3.5) quote['O3.5'] = o.price;
            if (point === 4.5) quote['O4.5'] = o.price;
          } else if (o.name === 'Under') {
            if (point === 1.5) quote['U1.5'] = o.price;
            if (point === 2.5) quote['U2.5'] = o.price;
            if (point === 3.5) quote['U3.5'] = o.price;
            if (point === 4.5) quote['U4.5'] = o.price;
          }
        });
      }

      // ─── btts (GG/NG) ───
      if (mkt.key === 'btts') {
        mkt.outcomes.forEach(o => {
          if (o.name === 'Yes') quote['GG'] = o.price;
          else if (o.name === 'No') quote['NG'] = o.price;
        });
      }
    });

    // ─── CALCOLO DOPPIA CHANCE (1X, 12, X2) ───
    // Formula: quotaDC = 1 / (1/quotaA + 1/quotaB)
    const calcolaDC = (qa, qb) => {
      if (!qa || !qb || qa <= 1 || qb <= 1) return null;
      const pA = 1 / qa;
      const pB = 1 / qb;
      const somma = pA + pB;
      if (somma >= 1) return null; // margine nullo o negativo, non calcolabile
      return parseFloat((1 / somma).toFixed(2));
    };

    quote['1X'] = calcolaDC(quote['1'], quote['X']);
    quote['12'] = calcolaDC(quote['1'], quote['2']);
    quote['X2'] = calcolaDC(quote['X'], quote['2']);

    return quote;
  };

  // ============================================================
  // DOWNLOAD DA THE ODDS API
  // ============================================================

  const scaricaDaAPI = async (forza = false) => {
    if (state.inCorso) {
      if (DEBUG) console.log('⏳ Download già in corso, skip');
      return { ok: false, motivo: 'in-corso' };
    }

    // Check cache
    if (!forza) {
      try {
        const last = localStorage.getItem(CACHE_KEY);
        if (last) {
          const elapsed = Date.now() - parseInt(last, 10);
          if (elapsed < CACHE_DURATION_MS) {
            if (DEBUG) console.log('⏩ Cache recente, skip download');
            const meta = leggiMeta();
            return {
              ok: true,
              motivo: 'cache',
              numPartite: meta?.numPartite || 0,
              dataMaxPDF: meta?.dataMaxPDF || null,
            };
          }
        }
      } catch (e) {}
    }

    state.inCorso = true;
    state.errore = null;
    notifyListeners({ inCorso: true });

    try {
      if (DEBUG) console.log('🌐 Download quote da The Odds API...');

      const mappa = {};
      let totaleEventi = 0;
      let richiesteRimanenti = null;
      let dataMax = null;

      for (const sportKey of SPORTS_KEYS) {
        try {
          const url = `${API_BASE}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=${MARKETS}&oddsFormat=${ODDS_FORMAT}`;

          if (DEBUG) console.log(`📡 Chiamata: ${sportKey}`);

          const response = await fetch(url);

          // Leggi credito residuo dagli header
          const remaining = response.headers.get('x-requests-remaining');
          if (remaining) richiesteRimanenti = parseInt(remaining, 10);

          if (!response.ok) {
            console.warn(`⚠️ ${sportKey}: HTTP ${response.status}`);
            continue;
          }

          const eventi = await response.json();

          if (!Array.isArray(eventi) || eventi.length === 0) {
            if (DEBUG) console.log(`   → nessun evento`);
            continue;
          }

          if (DEBUG) console.log(`   → ${eventi.length} eventi`);

          eventi.forEach(ev => {
            const quote = estraiQuoteEvento(ev);
            const casa = ev.home_team;
            const ospiti = ev.away_team;
            const dataISO = isoToDateStr(ev.commence_time);
            const ora = isoToOraStr(ev.commence_time);

            if (!casa || !ospiti || !dataISO) return;

            const key = `${normalizzaNome(casa)}|${normalizzaNome(ospiti)}|${dataISO}`;
            mappa[key] = {
              casa,
              ospiti,
              campionato: ev.sport_title || sportKey,
              data: dataISO,
              dataISO,
              ora,
              quote,
            };

            totaleEventi++;
            if (!dataMax || dataISO > dataMax) dataMax = dataISO;
          });

        } catch (err) {
          console.warn(`❌ Errore ${sportKey}:`, err.message);
        }
      }

      // Salva in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappa));
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
        salvatoIl: new Date().toISOString(),
        dataMaxPDF: dataMax,
        numPartite: totaleEventi,
        fonte: 'The Odds API',
      }));

      try { localStorage.setItem(CACHE_KEY, String(Date.now())); } catch (e) {}

      state.scaricato = true;
      state.ultimaDataMax = dataMax;
      state.numPartite = totaleEventi;
      state.errore = null;
      state.inCorso = false;
      state.richiesteRimanenti = richiesteRimanenti;

      const payload = {
        inCorso: false,
        ok: true,
        numPartite: totaleEventi,
        dataMaxPDF: dataMax,
        oggi: new Date().toISOString().slice(0, 10),
        aggiornato: dataMax ? dataMax >= new Date().toISOString().slice(0, 10) : false,
        richiesteRimanenti,
      };

      notifyListeners(payload);
      if (DEBUG) console.log(`✅ Quote aggiornate: ${totaleEventi} partite, data max: ${dataMax}, richieste rimanenti: ${richiesteRimanenti}`);

      return payload;

    } catch (err) {
      console.error('❌ Errore download quote:', err);

      state.inCorso = false;
      state.errore = err.message;

      notifyListeners({ inCorso: false, errore: err.message });

      return { ok: false, errore: err.message };
    }
  };

  // ============================================================
  // LETTURA / SCRITTURA STORAGE
  // ============================================================

  const leggiQuote = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  };

  const leggiMeta = () => {
    try {
      const raw = localStorage.getItem(STORAGE_META_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  const getMaxDataPDF = () => {
    const meta = leggiMeta();
    return meta ? meta.dataMaxPDF : null;
  };

  // ============================================================
  // SIMILARITÀ (per match fuzzy)
  // ============================================================

  const similarita = (a, b) => {
    if (a === b) return 1;
    if (!a || !b) return 0;

    const bigrams = (str) => {
      const set = new Set();
      for (let i = 0; i < str.length - 1; i++) set.add(str.substring(i, i + 2));
      return set;
    };

    const aB = bigrams(a);
    const bB = bigrams(b);
    let inter = 0;
    aB.forEach(bg => { if (bB.has(bg)) inter++; });

    return (2 * inter) / (aB.size + bB.size);
  };

  const SOGLIA_MATCH = 0.62;

  // ============================================================
  // MAPPA GIOCATA → QUOTA
  // ============================================================

  const mappaGiocataAQuota = (quote, familyId, giocata) => {
    if (!quote) return null;

    // FISSE
    if (familyId === 'fisse') {
      if (giocata === '1') return quote['1'] || null;
      if (giocata === 'X') return quote['X'] || null;
      if (giocata === '2') return quote['2'] || null;
    }

    // DOPPIA CHANCE
    if (familyId === 'dc') {
      if (giocata === '1X') return quote['1X'] || null;
      if (giocata === '12') return quote['12'] || null;
      if (giocata === 'X2') return quote['X2'] || null;
    }

    // GG/NG
    if (familyId === 'gg_ng') {
      const g = String(giocata || '').trim().toLowerCase();
      if (g === 'gg' || g === 'goal-goal' || g === 'goal goal' || g === 'g' || g === 'goal') {
        return quote['GG'] || null;
      }
      if (g === 'ng' || g === 'no goal' || g === 'no-goal' || g === 'n' || g === 'nogoal') {
        return quote['NG'] || null;
      }
    }

    // OVER
    if (familyId === 'over') {
      if (giocata === 'Over 1.5') return quote['O1.5'] || null;
      if (giocata === 'Over 2.5') return quote['O2.5'] || null;
      if (giocata === 'Over 3.5') return quote['O3.5'] || null;
      if (giocata === 'Over 4.5') return quote['O4.5'] || null;
    }

    // UNDER
    if (familyId === 'under') {
      if (giocata === 'Under 1.5') return quote['U1.5'] || null;
      if (giocata === 'Under 2.5') return quote['U2.5'] || null;
      if (giocata === 'Under 3.5') return quote['U3.5'] || null;
      if (giocata === 'Under 4.5') return quote['U4.5'] || null;
    }

    // MULTIGOL (l'API non li fornisce, li calcoliamo da 1X2 + totals? No, servirebbero
    // i goal esatti. Per ora restituiamo null, puoi implementarli in futuro.)
    if (familyId === 'multigol') return null;

    // DC + OVER / DC + UNDER (combinazioni)
    if (familyId === 'dc_over') {
      const parts = giocata.split('+');
      if (parts.length === 2) {
        const dcQ = quote[parts[0]] || null;
        const overQ = quote[parts[1]] || null;
        if (dcQ && overQ) return parseFloat((dcQ * overQ).toFixed(2));
      }
    }

    if (familyId === 'dc_under') {
      const parts = giocata.split('+');
      if (parts.length === 2) {
        const dcQ = quote[parts[0]] || null;
        const underQ = quote[parts[1]] || null;
        if (dcQ && underQ) return parseFloat((dcQ * underQ).toFixed(2));
      }
    }

    return null;
  };

  // ============================================================
  // TROVA QUOTA PER PARTITA + GIOCATA
  // ============================================================

  const trovaQuotaPerGiocata = (match, familyId, giocata) => {
    const quote = leggiQuote();
    if (!quote || Object.keys(quote).length === 0) return null;

    const casaNorm = normalizzaNome(match.casa);
    const ospitiNorm = normalizzaNome(match.ospiti);
    const dataMatch = match.data || '';

    let entry = null;

    // 1. Match esatto
    const keyEsatta = `${casaNorm}|${ospitiNorm}|${dataMatch}`;
    if (quote[keyEsatta]) {
      entry = quote[keyEsatta];
    }

    // 2. Match casa|ospiti (senza data)
    if (!entry) {
      const keys = Object.keys(quote).filter(k => k.startsWith(`${casaNorm}|${ospitiNorm}|`));
      if (keys.length > 0) entry = quote[keys[0]];
    }

    // 3. Fuzzy matching
    if (!entry) {
      let bestMatch = null;
      let bestScore = 0;

      for (const [key, val] of Object.entries(quote)) {
        const scoreCasa = similarita(casaNorm, normalizzaNome(val.casa));
        const scoreOspiti = similarita(ospitiNorm, normalizzaNome(val.ospiti));
        const score = (scoreCasa + scoreOspiti) / 2;

        if (score > bestScore && score > SOGLIA_MATCH) {
          bestScore = score;
          bestMatch = val;
        }
      }

      if (bestMatch) entry = bestMatch;
    }

    if (!entry || !entry.quote) return null;

    return mappaGiocataAQuota(entry.quote, familyId, giocata);
  };

  // ============================================================
  // ANALISI GIOCATA CON EDGE
  // ============================================================

  const analizzaGiocataConQuota = (match, familyId, giocata, pctTua) => {
    const quotaBook = trovaQuotaPerGiocata(match, familyId, giocata);
    if (!quotaBook || !pctTua || pctTua <= 0) return null;

    const quotaFair = 100 / pctTua;
    const edge = ((quotaBook * pctTua / 100) - 1) * 100;

    let classificazione = '⚪';
    if (edge > 20) classificazione = '💎';
    else if (edge > 10) classificazione = '✅';
    else if (edge > 5) classificazione = '🟡';

    return {
      quotaBook,
      quotaFair: parseFloat(quotaFair.toFixed(2)),
      edge: parseFloat(edge.toFixed(1)),
      isValue: edge > 5,
      classificazione,
    };
  };

  // ============================================================
  // CHECK AGGIORNAMENTO
  // ============================================================

  const checkAggiornamentoPDF = () => {
    const dataMax = getMaxDataPDF();
    const oggi = new Date().toISOString().slice(0, 10);

    if (!dataMax) {
      return { aggiornato: false, dataMax: null, oggi, motivo: 'no-data' };
    }

    return {
      aggiornato: dataMax >= oggi,
      dataMax,
      oggi,
      motivo: dataMax >= oggi ? 'ok' : 'vecchio',
    };
  };

  // ============================================================
  // DEBUG
  // ============================================================

  const debugPartita = (nomeCasa) => {
    const quote = leggiQuote();
    const keys = Object.keys(quote).filter(k => k.includes(normalizzaNome(nomeCasa)));
    if (keys.length === 0) {
      console.log(`❌ Nessuna partita trovata contenente "${nomeCasa}"`);
      return;
    }
    keys.forEach(k => {
      const val = quote[k];
      console.log(`📌 KEY: ${k}`);
      console.log(`   ${val.casa} vs ${val.ospiti} (${val.data})`);
      console.log(`   Quote:`, val.quote);
    });
  };

  const stampaTutteQuote = () => {
    const quote = leggiQuote();
    const numKeys = Object.keys(quote).length;
    console.log(`📊 Quote salvate: ${numKeys} partite`);
    console.log(`📅 Data max: ${getMaxDataPDF() || 'N/D'}`);
    console.log(`📡 Fonte: ${leggiMeta()?.fonte || 'N/D'}`);
    console.log('─'.repeat(50));
    Object.entries(quote).slice(0, 20).forEach(([k, v]) => {
      console.log(`⚽ ${v.casa} vs ${v.ospiti} (${v.data || 'N/D'})`);
      console.log(`   1: ${v.quote['1']} | X: ${v.quote['X']} | 2: ${v.quote['2']}`);
      console.log(`   1X: ${v.quote['1X']} | 12: ${v.quote['12']} | X2: ${v.quote['X2']}`);
      console.log(`   GG: ${v.quote.GG} | NG: ${v.quote.NG}`);
      console.log(`   O2.5: ${v.quote['O2.5']} | U2.5: ${v.quote['U2.5']}`);
    });
  };

  // ============================================================
  // HOOK REACT: useQuote
  // ============================================================

  const useQuote = () => {
    const [stato, setStato] = useState(() => ({
      scaricato: state.scaricato,
      inCorso: state.inCorso,
      errore: state.errore,
      numPartite: state.numPartite,
      dataMaxPDF: state.ultimaDataMax,
      aggiornato: null,
      meta: leggiMeta(),
      richiesteRimanenti: state.richiesteRimanenti,
    }));

    useEffect(() => {
      const update = (payload) => {
        setStato(prev => ({
          ...prev,
          ...payload,
          meta: leggiMeta(),
        }));
      };

      const updateFromGlobalEvent = () => {
        setStato(prev => ({
          ...prev,
          meta: leggiMeta(),
        }));
      };

      listeners.add(update);
      window.addEventListener('quote-updated', updateFromGlobalEvent);

      const meta = leggiMeta();
      if (meta) {
        const check = checkAggiornamentoPDF();
        setStato(prev => ({
          ...prev,
          numPartite: meta.numPartite,
          dataMaxPDF: meta.dataMaxPDF,
          aggiornato: check.aggiornato,
          meta,
        }));
      }

      return () => {
        listeners.delete(update);
        window.removeEventListener('quote-updated', updateFromGlobalEvent);
      };
    }, []);

    return stato;
  };

  // ============================================================
  // ALERT
  // ============================================================

  const getAlertPDF = () => {
    const check = checkAggiornamentoPDF();
    if (!check.dataMax) {
      return {
        tipo: 'warning',
        messaggio: '📄 Quote non caricate. Verifica la connessione o la chiave API.',
      };
    }
    if (!check.aggiornato) {
      const dataMaxEU = check.dataMax ? check.dataMax.split('-').reverse().join('/') : 'N/D';
      const oggiEU = check.oggi ? check.oggi.split('-').reverse().join('/') : 'N/D';
      return {
        tipo: 'warning',
        messaggio: `⚠️ Quote non aggiornate (ultima data: ${dataMaxEU}, oggi: ${oggiEU})`,
      };
    }
    return null;
  };

  // ============================================================
  // AUTO-DOWNLOAD
  // ============================================================

  const initAutoDownload = () => {
    if (DEBUG) console.log('🚀 QuoteManager: avvio auto-download da The Odds API');
    scaricaDaAPI(false).then(result => {
      if (result.ok) {
        if (DEBUG) console.log('✅ Auto-download completato');
      } else if (result.motivo === 'cache') {
        if (DEBUG) console.log('⏩ Auto-download saltato (cache)');
      } else {
        console.warn('⚠️ Auto-download fallito:', result.errore);
      }
    });
  };

  // ============================================================
  // COMPONENTE: BannerAlertPDF
  // ============================================================

  function BannerAlertPDF() {
    const { aggiornato, dataMaxPDF, errore, richiesteRimanenti } = useQuote();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    if (errore) {
      return (
        <div style={{
          background: 'rgba(235, 87, 87, 0.15)',
          border: '2px solid var(--lose)',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: 'var(--text)',
        }}>
          <span style={{ fontSize: '20px' }}>❌</span>
          <span style={{ flex: 1 }}>
            <b style={{ color: 'var(--lose)' }}>Errore download quote:</b> {errore}
          </span>
          <button
            onClick={() => scaricaDaAPI(true)}
            className="btn"
            style={{ fontSize: '11px', padding: '4px 12px' }}
          >
            🔄 Riprova
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
          >
            ✖
          </button>
        </div>
      );
    }

    if (aggiornato === false && dataMaxPDF) {
      const dataMaxEU = dataMaxPDF.split('-').reverse().join('/');
      const oggiEU = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');

      return (
        <div style={{
          background: 'rgba(243, 156, 18, 0.15)',
          border: '2px solid var(--accent)',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: 'var(--text)',
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span style={{ flex: 1 }}>
            <b style={{ color: 'var(--accent)' }}>Quote non aggiornate</b>
            <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '11px' }}>
              (ultima data: {dataMaxEU} • oggi: {oggiEU})
              {richiesteRimanenti !== null && ` • richieste rimanenti: ${richiesteRimanenti}`}
            </span>
          </span>
          <button
            onClick={() => scaricaDaAPI(true)}
            className="btn"
            style={{ fontSize: '11px', padding: '4px 12px', background: 'var(--accent)', color: '#000' }}
          >
            🔄 Ricarica
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
          >
            ✖
          </button>
        </div>
      );
    }

    // Mostra solo info richieste rimanenti (non bloccante)
    if (richiesteRimanenti !== null && richiesteRimanenti < 50) {
      return (
        <div style={{
          background: 'rgba(243, 156, 18, 0.10)',
          border: '1px solid var(--accent)',
          borderRadius: '8px',
          padding: '8px 16px',
          marginBottom: '12px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}>
          📡 Richieste API rimanenti questo mese: <b style={{ color: 'var(--accent)' }}>{richiesteRimanenti}</b>
        </div>
      );
    }

    return null;
  }

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.QuoteManager = {
    scaricaDaAPI,
    scaricaEAggiorna: scaricaDaAPI, // alias retrocompatibile
    checkAggiornamento: checkAggiornamentoPDF,
    hasQuote: () => {
      const meta = leggiMeta();
      return !!(meta && meta.numPartite > 0);
    },
    trovaQuota: trovaQuotaPerGiocata,
    analizzaGiocata: analizzaGiocataConQuota,
    getAlertPDF,
    useQuote,
    BannerAlertPDF,
    initAutoDownload,
    stampaTutteQuote,
    debugPartita,
    leggiQuote,
    leggiMeta,
    getMaxDataPDF,
    normalizzaNome,
    similarita,
    mappaGiocataAQuota,
    API_KEY,
    SPORTS_KEYS,
    DEBUG,
  };

  console.log('✅ QuoteManager caricato - The Odds API (no PDF)');

})();