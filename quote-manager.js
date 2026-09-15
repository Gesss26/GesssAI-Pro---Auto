// ============================================================
// quote-manager.js
// Gestore globale delle quote PDF Marathonbet
// - Auto-download all'avvio dell'app
// - Salvataggio in localStorage
// - Alert se PDF non aggiornato
// - Hook React useQuote() per accedere alle quote
// - FIX: debug logging
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback } = React;

  // ============================================================
  // CONFIGURAZIONE
  // ============================================================

  const REPO_BASE_URL = 'https://gesss26.github.io/GesssAI-Pro---Auto';
  const PDF_REMOTE_PATH = 'quote/marathonbet.pdf';
  const PDF_FULL_URL = `${REPO_BASE_URL}/${PDF_REMOTE_PATH}`;

  const CACHE_DURATION_MS = 30 * 60 * 1000;
  const CACHE_KEY = 'ft_quote_last_download';

  const DEBUG = true; // ⭐ Metti false quando tutto funziona

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
  // CORE: DOWNLOAD + PARSING + SALVATAGGIO
  // ============================================================

  const scaricaEAggiorna = async (forza = false) => {
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
            const meta = window.PDFQuoteParser?.leggiMeta?.();
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

    if (!window.PDFQuoteParser) {
      const err = 'PDFQuoteParser non caricato';
      console.error('❌', err);
      state.errore = err;
      notifyListeners({ errore: err });
      return { ok: false, errore: err };
    }

    state.inCorso = true;
    state.errore = null;
    notifyListeners({ inCorso: true });

    try {
      if (DEBUG) console.log('🌐 Download PDF da:', PDF_FULL_URL);

      const url = `${PDF_FULL_URL}?t=${Date.now()}`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Accept': 'application/pdf' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('PDF non trovato su GitHub (404). Carica in: quote/marathonbet.pdf');
        }
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const blob = await response.blob();
      if (DEBUG) console.log(`✅ PDF scaricato: ${(blob.size / 1024).toFixed(0)} KB`);

      if (blob.size < 1000) {
        throw new Error('File scaricato troppo piccolo (probabile HTML di errore)');
      }

      // Parsing
      const fakeFile = new File([blob], 'marathonbet.pdf', { type: 'application/pdf' });
      const righe = await window.PDFQuoteParser.estraiRigheDaPDF(fakeFile);
      const partite = window.PDFQuoteParser.parseMarathonbetPDF(righe);
      if (DEBUG) console.log(`📊 Estratte ${partite.length} partite dal PDF`);

      // Salvataggio
      const result = window.PDFQuoteParser.salvaQuote(partite);

      try { localStorage.setItem(CACHE_KEY, String(Date.now())); } catch (e) {}

      const check = window.PDFQuoteParser.checkAggiornamentoPDF();

      state.scaricato = true;
      state.ultimaDataMax = check.dataMax;
      state.numPartite = partite.length;
      state.errore = null;
      state.inCorso = false;

      const payload = {
        inCorso: false,
        ok: true,
        numPartite: partite.length,
        dataMaxPDF: check.dataMax,
        oggi: check.oggi,
        aggiornato: check.aggiornato,
      };

      notifyListeners(payload);
      if (DEBUG) console.log(`✅ Quote aggiornate: ${partite.length} partite, data max: ${check.dataMax}`);

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
  // CHECK AGGIORNAMENTO
  // ============================================================

  const checkAggiornamento = () => {
    if (!window.PDFQuoteParser?.checkAggiornamentoPDF) {
      return { aggiornato: false, dataMax: null, oggi: null, motivo: 'no-parser' };
    }
    return window.PDFQuoteParser.checkAggiornamentoPDF();
  };

  // ============================================================
  // QUERY QUOTE
  // ============================================================

  const trovaQuota = (match, familyId, giocata) => {
    if (!window.PDFQuoteParser?.trovaQuotaPerGiocata) return null;
    return window.PDFQuoteParser.trovaQuotaPerGiocata(match, familyId, giocata);
  };

  const analizzaGiocata = (match, familyId, giocata, pctTua) => {
    if (!window.PDFQuoteParser?.analizzaGiocataConQuota) return null;
    try {
      const result = window.PDFQuoteParser.analizzaGiocataConQuota(match, familyId, giocata, pctTua);
      if (DEBUG && result) {
        console.log(`💰 Quota trovata: ${match.casa} vs ${match.ospiti} | ${familyId}/${giocata} → ${result.quotaBook} (edge ${result.edge}%)`);
      }
      return result;
    } catch (e) {
      console.warn('Errore analizzaGiocata:', e);
      return null;
    }
  };

  const hasQuote = () => {
    const meta = window.PDFQuoteParser?.leggiMeta?.();
    return !!(meta && meta.numPartite > 0);
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
      meta: window.PDFQuoteParser?.leggiMeta?.() || null,
    }));

    useEffect(() => {
      const update = (payload) => {
        setStato(prev => ({
          ...prev,
          ...payload,
          meta: window.PDFQuoteParser?.leggiMeta?.() || null,
        }));
      };

      const updateFromGlobalEvent = () => {
        setStato(prev => ({
          ...prev,
          meta: window.PDFQuoteParser?.leggiMeta?.() || null,
        }));
      };

      listeners.add(update);
      window.addEventListener('quote-updated', updateFromGlobalEvent);

      const meta = window.PDFQuoteParser?.leggiMeta?.() || null;
      if (meta) {
        const check = window.PDFQuoteParser?.checkAggiornamentoPDF?.() || {};
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
  // ALERT PDF
  // ============================================================

  const getAlertPDF = () => {
    const check = checkAggiornamento();
    if (!check.dataMax) {
      return {
        tipo: 'warning',
        messaggio: '📄 PDF quote non caricato. Ricontrolla il file PDF.',
      };
    }
    if (!check.aggiornato) {
      const dataMaxEU = check.dataMax ? check.dataMax.split('-').reverse().join('/') : 'N/D';
      const oggiEU = check.oggi ? check.oggi.split('-').reverse().join('/') : 'N/D';
      return {
        tipo: 'warning',
        messaggio: `⚠️ Ricontrolla il file PDF che non è aggiornato (ultima data: ${dataMaxEU}, oggi: ${oggiEU})`,
      };
    }
    return null;
  };

  // ============================================================
  // AUTO-DOWNLOAD
  // ============================================================

  const initAutoDownload = () => {
    const tryInit = () => {
      if (!window.PDFQuoteParser) {
        if (DEBUG) console.warn('⏳ PDFQuoteParser non ancora caricato, riprovo...');
        setTimeout(tryInit, 500);
        return;
      }

      if (DEBUG) console.log('🚀 QuoteManager: avvio auto-download');
      scaricaEAggiorna(false).then(result => {
        if (result.ok) {
          if (DEBUG) console.log('✅ Auto-download completato');
        } else if (result.motivo === 'cache') {
          if (DEBUG) console.log('⏩ Auto-download saltato (cache)');
        } else {
          console.warn('⚠️ Auto-download fallito:', result.errore);
        }
      });
    };

    setTimeout(tryInit, 1000);
  };

  // ============================================================
  // COMPONENTE: BannerAlertPDF
  // ============================================================

  function BannerAlertPDF() {
    const { aggiornato, dataMaxPDF, errore } = useQuote();
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
            onClick={() => scaricaEAggiorna(true)}
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
            <b style={{ color: 'var(--accent)' }}>Ricontrolla il file PDF che non è aggiornato</b>
            <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '11px' }}>
              (ultima data nel PDF: {dataMaxEU} • oggi: {oggiEU})
            </span>
          </span>
          <button
            onClick={() => scaricaEAggiorna(true)}
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

    return null;
  }

  // ============================================================
  // DEBUG: mostra tutte le quote in console
  // ============================================================

  const stampaTutteQuote = () => {
    const quote = window.PDFQuoteParser?.leggiQuote?.() || {};
    const numKeys = Object.keys(quote).length;
    console.log(`📊 Quote salvate: ${numKeys} partite`);
    console.log(`📅 Data max: ${window.PDFQuoteParser?.getMaxDataPDF?.() || 'N/D'}`);
    console.log('─'.repeat(50));
    Object.entries(quote).forEach(([k, v]) => {
      console.log(`⚽ ${v.casa} vs ${v.ospiti} (${v.data || 'N/D'})`);
      console.log(`   GG: ${v.quote.GG || 'N/D'} | NG: ${v.quote.NG || 'N/D'}`);
      console.log(`   1: ${v.quote['1']} | X: ${v.quote['X']} | 2: ${v.quote['2']}`);
    });
  };

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.QuoteManager = {
    scaricaEAggiorna,
    checkAggiornamento,
    hasQuote,
    trovaQuota,
    analizzaGiocata,
    getAlertPDF,
    useQuote,
    BannerAlertPDF,
    initAutoDownload,
    stampaTutteQuote,
    PDF_FULL_URL,
    DEBUG,
  };

  console.log('✅ QuoteManager caricato - con debug attivo');

})();