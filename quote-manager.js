// ============================================================
// quote-manager.js
// Gestore quote via Bzzoiro Sports Data (sostituisce The Odds API)
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect } = React;

  // ============================================================
  // CONFIGURAZIONE
  // ============================================================

  const API_TOKEN = 'c958a1a97001b982d3a910f974adb315f1f15059';
  const API_BASE = 'https://sports.bzzoiro.com/api/v2';

  // Mercati da richiedere
  const MARKETS = [
    '1x2',
    'over_under_15',
    'over_under_25',
    'over_under_35',
    'over_under_45',
    'btts',
    'double_chance'
  ];

  // Campionati (ID o nomi) - da verificare con /leagues/
  const LEAGUES = [
    'Serie A', 'Serie B',
    'La Liga', 'Segunda División',
    'Premier League', 'EFL Championship',
    'Bundesliga', '2. Bundesliga',
    'Ligue 1', 'Ligue 2',
    'Eredivisie', 'Eerste Divisie',
    'Primeira Liga', 'Jupiler Pro League',
    'Süper Lig', 'Scottish Premiership',
    'J1 League', 'K League 1'
  ];

  const CACHE_DURATION_MS = 30 * 60 * 1000;
  const CACHE_KEY = 'ft_quote_last_download';

  const STORAGE_KEY = 'ft_quote_pdf';
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
  };

  const listeners = new Set();

  const notifyListeners = (payload) => {
    listeners.forEach(fn => {
      try { fn(payload); } catch (e) { console.warn('Listener error:', e); }
    });
  };

  // ============================================================
  // NORMALIZZAZIONE NOMI
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
  // ESTRAZIONE QUOTE DA EVENTO BZZOIRO
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
    };

    // Bzzoiro restituisce le quote in modo diverso - adatta in base alla risposta reale
    // Struttura tipica: evento.odds con chiavi tipo odds_home, odds_draw, odds_away
    // e mercati extra in un array

    if (evento.odds_home) quote['1'] = evento.odds_home;
    if (evento.odds_draw) quote['X'] = evento.odds_draw;
    if (evento.odds_away) quote['2'] = evento.odds_away;

    // Doppia chance diretta (se disponibile)
    if (evento.odds_1x) quote['1X'] = evento.odds_1x;
    if (evento.odds_12) quote['12'] = evento.odds_12;
    if (evento.odds_x2) quote['X2'] = evento.odds_x2;

    // GG/NG diretta
    if (evento.odds_btts_yes) quote['GG'] = evento.odds_btts_yes;
    if (evento.odds_btts_no) quote['NG'] = evento.odds_btts_no;

    // Over/Under (se disponibili come campi separati)
    if (evento.odds_over_15) quote['O1.5'] = evento.odds_over_15;
    if (evento.odds_under_15) quote['U1.5'] = evento.odds_under_15;
    if (evento.odds_over_25) quote['O2.5'] = evento.odds_over_25;
    if (evento.odds_under_25) quote['U2.5'] = evento.odds_under_25;
    if (evento.odds_over_35) quote['O3.5'] = evento.odds_over_35;
    if (evento.odds_under_35) quote['U3.5'] = evento.odds_under_35;
    if (evento.odds_over_45) quote['O4.5'] = evento.odds_over_45;
    if (evento.odds_under_45) quote['U4.5'] = evento.odds_under_45;

    // Calcola doppia chance se non fornita direttamente
    const calcolaDC = (qa, qb) => {
      if (!qa || !qb || qa <= 1 || qb <= 1) return null;
      const somma = (1 / qa) + (1 / qb);
      if (somma >= 1) return null;
      return parseFloat((1 / somma).toFixed(2));
    };

    if (!quote['1X']) quote['1X'] = calcolaDC(quote['1'], quote['X']);
    if (!quote['12']) quote['12'] = calcolaDC(quote['1'], quote['2']);
    if (!quote['X2']) quote['X2'] = calcolaDC(quote['X'], quote['2']);

    return quote;
  };

  // ============================================================
  // DOWNLOAD DA BZZOIRO
  // ============================================================

  const scaricaDaAPI = async (forza = false) => {
    if (state.inCorso) {
      if (DEBUG) console.log('⏳ Download già in corso, skip');
      return { ok: false, motivo: 'in-corso' };
    }

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
      if (DEBUG) console.log('🌐 Download quote da Bzzoiro Sports Data...');

      const headers = {
        'Authorization': `Token ${API_TOKEN}`,
        'Accept': 'application/json',
      };

      const mappa = {};
      let totaleEventi = 0;
      let dataMax = null;

      // Richiedi eventi con quote per i prossimi 14 giorni
      const oggi = new Date().toISOString().slice(0, 10);
      const tra14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const url = `${API_BASE}/events/?date_from=${oggi}&date_to=${tra14}&full=true`;

      if (DEBUG) console.log(`📡 Chiamata: ${url}`);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const eventi = data.results || data;

      if (!Array.isArray(eventi)) {
        throw new Error('Formato risposta inatteso');
      }

      if (DEBUG) console.log(`   → ${eventi.length} eventi`);

      eventi.forEach(ev => {
        const quote = estraiQuoteEvento(ev);
        const casa = ev.home_team || ev.home_team_name;
        const ospiti = ev.away_team || ev.away_team_name;
        const dataEvento = ev.date || ev.scheduled_start_time?.slice(0, 10);
        const ora = ev.time || ev.scheduled_start_time?.slice(11, 16);

        if (!casa || !ospiti || !dataEvento) return;

        // Filtra solo i campionati che ci interessano
        const leagueName = ev.league || ev.league_name || '';
        if (LEAGUES.length > 0 && !LEAGUES.some(l => leagueName.toLowerCase().includes(l.toLowerCase()))) {
          return;
        }

        const key = `${normalizzaNome(casa)}|${normalizzaNome(ospiti)}|${dataEvento}`;
        mappa[key] = {
          casa,
          ospiti,
          campionato: leagueName,
          data: dataEvento,
          dataISO: dataEvento,
          ora,
          quote,
        };

        totaleEventi++;
        if (!dataMax || dataEvento > dataMax) dataMax = dataEvento;
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappa));
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
        salvatoIl: new Date().toISOString(),
        dataMaxPDF: dataMax,
        numPartite: totaleEventi,
        fonte: 'Bzzoiro Sports Data',
      }));

      try { localStorage.setItem(CACHE_KEY, String(Date.now())); } catch (e) {}

      state.scaricato = true;
      state.ultimaDataMax = dataMax;
      state.numPartite = totaleEventi;
      state.errore = null;
      state.inCorso = false;

      const payload = {
        inCorso: false,
        ok: true,
        numPartite: totaleEventi,
        dataMaxPDF: dataMax,
        oggi,
        aggiornato: dataMax ? dataMax >= oggi : false,
      };

      notifyListeners(payload);
      if (DEBUG) console.log(`✅ Quote aggiornate: ${totaleEventi} partite, data max: ${dataMax}`);

      return payload;

    } catch (err) {
      console.error('❌ Errore download quote Bzzoiro:', err);

      state.inCorso = false;
      state.errore = err.message;

      notifyListeners({ inCorso: false, errore: err.message });

      return { ok: false, errore: err.message };
    }
  };

  // ============================================================
  // STORAGE
  // ============================================================

  const leggiQuote = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  };

  const leggiMeta = () => {
    try {
      const raw = localStorage.getItem(STORAGE_META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
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

    if (familyId === 'fisse') {
      if (giocata === '1') return quote['1'] || null;
      if (giocata === 'X') return quote['X'] || null;
      if (giocata === '2') return quote['2'] || null;
    }

    if (familyId === 'dc') {
      if (giocata === '1X') return quote['1X'] || null;
      if (giocata === '12') return quote['12'] || null;
      if (giocata === 'X2') return quote['X2'] || null;
    }

    if (familyId === 'gg_ng') {
      const g = String(giocata || '').trim().toLowerCase();
      if (g === 'gg' || g === 'goal-goal' || g === 'g') return quote['GG'] || null;
      if (g === 'ng' || g === 'no goal' || g === 'n') return quote['NG'] || null;
    }

    if (familyId === 'over') {
      if (giocata === 'Over 1.5') return quote['O1.5'] || null;
      if (giocata === 'Over 2.5') return quote['O2.5'] || null;
      if (giocata === 'Over 3.5') return quote['O3.5'] || null;
      if (giocata === 'Over 4.5') return quote['O4.5'] || null;
    }

    if (familyId === 'under') {
      if (giocata === 'Under 1.5') return quote['U1.5'] || null;
      if (giocata === 'Under 2.5') return quote['U2.5'] || null;
      if (giocata === 'Under 3.5') return quote['U3.5'] || null;
      if (giocata === 'Under 4.5') return quote['U4.5'] || null;
    }

    return null;
  };

  // ============================================================
  // TROVA QUOTA
  // ============================================================

  const trovaQuotaPerGiocata = (match, familyId, giocata) => {
    const quote = leggiQuote();
    if (!quote || Object.keys(quote).length === 0) return null;

    const casaNorm = normalizzaNome(match.casa);
    const ospitiNorm = normalizzaNome(match.ospiti);
    const dataMatch = match.data || '';

    let entry = null;

    const keyEsatta = `${casaNorm}|${ospitiNorm}|${dataMatch}`;
    if (quote[keyEsatta]) entry = quote[keyEsatta];

    if (!entry) {
      const keys = Object.keys(quote).filter(k => k.startsWith(`${casaNorm}|${ospitiNorm}|`));
      if (keys.length > 0) entry = quote[keys[0]];
    }

    if (!entry) {
      let bestMatch = null, bestScore = 0;
      for (const [, val] of Object.entries(quote)) {
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
  // ANALISI CON EDGE
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
    if (!dataMax) return { aggiornato: false, dataMax: null, oggi, motivo: 'no-data' };
    return { aggiornato: dataMax >= oggi, dataMax, oggi, motivo: dataMax >= oggi ? 'ok' : 'vecchio' };
  };

  // ============================================================
  // HOOK REACT
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
    }));

    useEffect(() => {
      const update = (payload) => {
        setStato(prev => ({ ...prev, ...payload, meta: leggiMeta() }));
      };
      const updateFromGlobalEvent = () => {
        setStato(prev => ({ ...prev, meta: leggiMeta() }));
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
  // AUTO-DOWNLOAD
  // ============================================================

  const initAutoDownload = () => {
    if (DEBUG) console.log('🚀 QuoteManager: avvio auto-download da Bzzoiro');
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
  // BANNER (semplificato)
  // ============================================================

  function BannerAlertPDF() {
    const { aggiornato, dataMaxPDF, errore } = useQuote();
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;

    if (errore) {
      return (
        <div style={{
          background: 'rgba(235, 87, 87, 0.15)', border: '2px solid var(--lose)',
          borderRadius: '8px', padding: '10px 16px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text)',
        }}>
          <span style={{ fontSize: '20px' }}>❌</span>
          <span style={{ flex: 1 }}><b style={{ color: 'var(--lose)' }}>Errore quote:</b> {errore}</span>
          <button onClick={() => scaricaDaAPI(true)} className="btn" style={{ fontSize: '11px', padding: '4px 12px' }}>🔄 Riprova</button>
          <button onClick={() => setDismissed(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>✖</button>
        </div>
      );
    }

    if (aggiornato === false && dataMaxPDF) {
      const dataMaxEU = dataMaxPDF.split('-').reverse().join('/');
      const oggiEU = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');
      return (
        <div style={{
          background: 'rgba(243, 156, 18, 0.15)', border: '2px solid var(--accent)',
          borderRadius: '8px', padding: '10px 16px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text)',
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span style={{ flex: 1 }}>
            <b style={{ color: 'var(--accent)' }}>Quote non aggiornate</b>
            <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '11px' }}>
              (ultima data: {dataMaxEU} • oggi: {oggiEU})
            </span>
          </span>
          <button onClick={() => scaricaDaAPI(true)} className="btn" style={{ fontSize: '11px', padding: '4px 12px', background: 'var(--accent)', color: '#000' }}>🔄 Ricarica</button>
          <button onClick={() => setDismissed(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>✖</button>
        </div>
      );
    }

    return null;
  }

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
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.QuoteManager = {
    scaricaDaAPI,
    scaricaEAggiorna: scaricaDaAPI,
    checkAggiornamento: checkAggiornamentoPDF,
    hasQuote: () => {
      const meta = leggiMeta();
      return !!(meta && meta.numPartite > 0);
    },
    trovaQuota: trovaQuotaPerGiocata,
    analizzaGiocata: analizzaGiocataConQuota,
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
    API_TOKEN,
    DEBUG,
  };

  console.log('✅ QuoteManager caricato - Bzzoiro Sports Data');

})();