// ============================================================
// quote-manager.js
// Gestore globale delle quote PDF Marathonbet
// - Auto-download all'avvio dell'app (MULTI-FILE)
// - Salvataggio in localStorage (merge tra i file)
// - Alert se PDF non aggiornato
// - Hook React useQuote() per accedere alle quote
// - BannerAlertPDF componente per avvisi
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect } = React;

  // ============================================================
  // CONFIGURAZIONE
  // ============================================================

  const REPO_BASE_URL = 'https://gesss26.github.io/GesssAI-Pro---Auto';

  // ⭐ LISTA DEI PDF DA SCARICARE E UNIRE
  const PDF_FILES = [
    'quote/marathonbet.pdf',
    'quote/marathonbet-2.pdf',
  ];

  const CACHE_DURATION_MS = 30 * 60 * 1000;
  const CACHE_KEY = 'ft_quote_last_download';

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
  // CORE: DOWNLOAD MULTI-FILE + PARSING + MERGE
  // ============================================================

  const scaricaEAggiorna = async (forza) => {
    if (typeof forza !== 'boolean') forza = false;

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
            const meta = window.PDFQuoteParser && window.PDFQuoteParser.leggiMeta ? window.PDFQuoteParser.leggiMeta() : null;
            return {
              ok: true,
              motivo: 'cache',
              numPartite: meta ? meta.numPartite : 0,
              dataMaxPDF: meta ? meta.dataMaxPDF : null,
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
      // Backup quote esistenti prima del reset (per ripristino in caso di fallimento totale)
      const quoteVecchie = window.PDFQuoteParser.leggiQuote();
      const avevaQuoteVecchie = Object.keys(quoteVecchie).length > 0;

      // Reset quote vecchie
      window.PDFQuoteParser.resetQuote();

      let totalePartite = 0;
      const risultati = [];

      for (let i = 0; i < PDF_FILES.length; i++) {
        const percorso = PDF_FILES[i];
        const url = REPO_BASE_URL + '/' + percorso + '?t=' + Date.now();
        if (DEBUG) console.log('🌐 Download:', url);

        try {
          const response = await fetch(url, {
            cache: 'no-store',
            headers: { 'Accept': 'application/pdf' },
          });

          if (!response.ok) {
            console.warn('⚠️ ' + percorso + ': HTTP ' + response.status + ' - skip');
            risultati.push({ file: percorso, ok: false, errore: 'HTTP ' + response.status });
            continue;
          }

          const blob = await response.blob();
          if (blob.size < 1000) {
            console.warn('⚠️ ' + percorso + ': file troppo piccolo - skip');
            risultati.push({ file: percorso, ok: false, errore: 'file troppo piccolo' });
            continue;
          }

          if (DEBUG) console.log('✅ PDF scaricato: ' + percorso + ' (' + (blob.size / 1024).toFixed(0) + ' KB)');

          const fakeFile = new File([blob], percorso.split('/').pop(), { type: 'application/pdf' });
          const righe = await window.PDFQuoteParser.estraiRigheDaPDF(fakeFile);
          const partite = window.PDFQuoteParser.parseMarathonbetPDF(righe);

          if (partite.length === 0) {
            console.warn('⚠️ ' + percorso + ': 0 partite estratte - skip');
            risultati.push({ file: percorso, ok: false, errore: '0 partite' });
            continue;
          }

          // MERGE invece di overwrite
          window.PDFQuoteParser.aggiungiQuote(partite);

          totalePartite += partite.length;
          risultati.push({ file: percorso, ok: true, partite: partite.length });
          if (DEBUG) console.log('✅ ' + percorso + ': ' + partite.length + ' partite');

        } catch (errFile) {
          console.warn('❌ ' + percorso + ': ' + errFile.message);
          risultati.push({ file: percorso, ok: false, errore: errFile.message });
        }
      }

      // Se TUTTI i file falliscono ma c'erano quote vecchie, ripristina quelle vecchie
      if (totalePartite === 0 && avevaQuoteVecchie) {
        console.warn('⚠️ Download fallito, ripristino quote precedenti');
        try {
          localStorage.setItem('ft_quote_pdf', JSON.stringify(quoteVecchie));
          const dateValide = Object.values(quoteVecchie)
            .map(p => p.dataISO)
            .filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/))
            .sort();
          localStorage.setItem('ft_quote_pdf_meta', JSON.stringify({
            salvatoIl: new Date().toISOString(),
            dataMaxPDF: dateValide[dateValide.length - 1] || null,
            numPartite: Object.keys(quoteVecchie).length,
          }));
          window.dispatchEvent(new CustomEvent('quote-updated', {
            detail: { numPartite: Object.keys(quoteVecchie).length, dataMaxPDF: dateValide[dateValide.length - 1] || null }
          }));
        } catch (e) {
          console.error('Impossibile ripristinare quote vecchie:', e);
        }
      }

      try { localStorage.setItem(CACHE_KEY, String(Date.now())); } catch (e) {}

      const check = window.PDFQuoteParser.checkAggiornamentoPDF();

      state.scaricato = true;
      state.ultimaDataMax = check.dataMax;
      state.numPartite = totalePartite;
      state.errore = null;
      state.inCorso = false;

      const payload = {
        inCorso: false,
        ok: totalePartite > 0,
        numPartite: totalePartite,
        dataMaxPDF: check.dataMax,
        oggi: check.oggi,
        aggiornato: check.aggiornato,
        risultati: risultati,
      };

      notifyListeners(payload);
      if (DEBUG) console.log('✅ Quote aggiornate: ' + totalePartite + ' partite totali da ' + PDF_FILES.length + ' file');

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
    if (!window.PDFQuoteParser || !window.PDFQuoteParser.checkAggiornamentoPDF) {
      return { aggiornato: false, dataMax: null, oggi: null, motivo: 'no-parser' };
    }
    return window.PDFQuoteParser.checkAggiornamentoPDF();
  };

  // ============================================================
  // QUERY QUOTE
  // ============================================================

  const trovaQuota = (match, familyId, giocata) => {
    if (!window.PDFQuoteParser || !window.PDFQuoteParser.trovaQuotaPerGiocata) return null;
    return window.PDFQuoteParser.trovaQuotaPerGiocata(match, familyId, giocata);
  };

  const analizzaGiocata = (match, familyId, giocata, pctTua) => {
    if (!window.PDFQuoteParser || !window.PDFQuoteParser.analizzaGiocataConQuota) return null;
    try {
      const result = window.PDFQuoteParser.analizzaGiocataConQuota(match, familyId, giocata, pctTua);
      if (DEBUG && result) {
        console.log('💰 Quota trovata: ' + match.casa + ' vs ' + match.ospiti + ' | ' + familyId + '/' + giocata + ' → ' + result.quotaBook + ' (edge ' + result.edge + '%)');
      }
      return result;
    } catch (e) {
      console.warn('Errore analizzaGiocata:', e);
      return null;
    }
  };

  const hasQuote = () => {
    if (!window.PDFQuoteParser || !window.PDFQuoteParser.leggiMeta) return false;
    const meta = window.PDFQuoteParser.leggiMeta();
    return !!(meta && meta.numPartite > 0);
  };

  // ============================================================
  // HOOK REACT: useQuote
  // ============================================================

  const useQuote = () => {
    const [stato, setStato] = useState(function () {
      const meta = window.PDFQuoteParser && window.PDFQuoteParser.leggiMeta ? window.PDFQuoteParser.leggiMeta() : null;
      return {
        scaricato: state.scaricato,
        inCorso: state.inCorso,
        errore: state.errore,
        numPartite: state.numPartite,
        dataMaxPDF: state.ultimaDataMax,
        aggiornato: null,
        meta: meta,
      };
    });

    useEffect(function () {
      const update = (payload) => {
        setStato(function (prev) {
          const meta = window.PDFQuoteParser && window.PDFQuoteParser.leggiMeta ? window.PDFQuoteParser.leggiMeta() : null;
          return Object.assign({}, prev, payload, { meta: meta });
        });
      };

      const updateFromGlobalEvent = () => {
        setStato(function (prev) {
          const meta = window.PDFQuoteParser && window.PDFQuoteParser.leggiMeta ? window.PDFQuoteParser.leggiMeta() : null;
          return Object.assign({}, prev, { meta: meta });
        });
      };

      listeners.add(update);
      window.addEventListener('quote-updated', updateFromGlobalEvent);

      const meta = window.PDFQuoteParser && window.PDFQuoteParser.leggiMeta ? window.PDFQuoteParser.leggiMeta() : null;
      if (meta) {
        const check = window.PDFQuoteParser && window.PDFQuoteParser.checkAggiornamentoPDF ? window.PDFQuoteParser.checkAggiornamentoPDF() : {};
        setStato(function (prev) {
          return Object.assign({}, prev, {
            numPartite: meta.numPartite,
            dataMaxPDF: meta.dataMaxPDF,
            aggiornato: check.aggiornato,
            meta: meta,
          });
        });
      }

      return function () {
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
        messaggio: '⚠️ Ricontrolla il file PDF che non è aggiornato (ultima data: ' + dataMaxEU + ', oggi: ' + oggiEU + ')',
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

      if (DEBUG) console.log('🚀 QuoteManager: avvio auto-download multi-file');
      scaricaEAggiorna(false).then(function (result) {
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
  // COMPONENTE: BannerAlertPDF (React)
  // ============================================================

  function BannerAlertPDF() {
    const quoteState = useQuote();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    if (quoteState.errore) {
      return React.createElement('div', {
        style: {
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
        }
      },
        React.createElement('span', { style: { fontSize: '20px' } }, '❌'),
        React.createElement('span', { style: { flex: 1 } },
          React.createElement('b', { style: { color: 'var(--lose)' } }, 'Errore download quote:'),
          ' ' + quoteState.errore
        ),
        React.createElement('button', {
          onClick: function () { scaricaEAggiorna(true); },
          className: 'btn',
          style: { fontSize: '11px', padding: '4px 12px' }
        }, '🔄 Riprova'),
        React.createElement('button', {
          onClick: function () { setDismissed(true); },
          style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }
        }, '✖')
      );
    }

    const fileFalliti = (quoteState.risultati || []).filter(function (r) { return !r.ok; });
    if (fileFalliti.length > 0) {
      return React.createElement('div', {
        style: {
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
        }
      },
        React.createElement('span', { style: { fontSize: '20px' } }, '⚠️'),
        React.createElement('span', { style: { flex: 1 } },
          React.createElement('b', { style: { color: 'var(--accent)' } }, 'Alcuni PDF non sono stati caricati: '),
          fileFalliti.map(function (f) { return f.file.split('/').pop(); }).join(', ')
        ),
        React.createElement('button', {
          onClick: function () { scaricaEAggiorna(true); },
          className: 'btn',
          style: { fontSize: '11px', padding: '4px 12px', background: 'var(--accent)', color: '#000' }
        }, '🔄 Riprova'),
        React.createElement('button', {
          onClick: function () { setDismissed(true); },
          style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }
        }, '✖')
      );
    }

    if (quoteState.aggiornato === false && quoteState.dataMaxPDF) {
      const dataMaxEU = quoteState.dataMaxPDF.split('-').reverse().join('/');
      const oggiEU = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');

      return React.createElement('div', {
        style: {
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
        }
      },
        React.createElement('span', { style: { fontSize: '20px' } }, '⚠️'),
        React.createElement('span', { style: { flex: 1 } },
          React.createElement('b', { style: { color: 'var(--accent)' } }, 'Ricontrolla il file PDF che non è aggiornato'),
          React.createElement('span', { style: { color: 'var(--text-muted)', marginLeft: '8px', fontSize: '11px' } },
            '(ultima data nel PDF: ' + dataMaxEU + ' • oggi: ' + oggiEU + ')'
          )
        ),
        React.createElement('button', {
          onClick: function () { scaricaEAggiorna(true); },
          className: 'btn',
          style: { fontSize: '11px', padding: '4px 12px', background: 'var(--accent)', color: '#000' }
        }, '🔄 Ricarica'),
        React.createElement('button', {
          onClick: function () { setDismissed(true); },
          style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }
        }, '✖')
      );
    }

    return null;
  }

  // ============================================================
  // DEBUG
  // ============================================================

  const stampaTutteQuote = () => {
    const quote = (window.PDFQuoteParser && window.PDFQuoteParser.leggiQuote) ? window.PDFQuoteParser.leggiQuote() : {};
    const numKeys = Object.keys(quote).length;
    console.log('📊 Quote salvate: ' + numKeys + ' partite');
    console.log('📅 Data max: ' + ((window.PDFQuoteParser && window.PDFQuoteParser.getMaxDataPDF) ? window.PDFQuoteParser.getMaxDataPDF() : 'N/D'));
    console.log('─'.repeat(50));
    Object.entries(quote).forEach(function (entry) {
      const k = entry[0];
      const v = entry[1];
      console.log('⚽ ' + v.casa + ' vs ' + v.ospiti + ' (' + (v.data || 'N/D') + ')');
      console.log('   GG: ' + (v.quote.GG || 'N/D') + ' | NG: ' + (v.quote.NG || 'N/D'));
      console.log('   1: ' + v.quote['1'] + ' | X: ' + v.quote['X'] + ' | 2: ' + v.quote['2']);
    });
  };

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.QuoteManager = {
    scaricaEAggiorna: scaricaEAggiorna,
    checkAggiornamento: checkAggiornamento,
    hasQuote: hasQuote,
    trovaQuota: trovaQuota,
    analizzaGiocata: analizzaGiocata,
    getAlertPDF: getAlertPDF,
    useQuote: useQuote,
    BannerAlertPDF: BannerAlertPDF,
    initAutoDownload: initAutoDownload,
    stampaTutteQuote: stampaTutteQuote,
    PDF_FILES: PDF_FILES,
    REPO_BASE_URL: REPO_BASE_URL,
    DEBUG: DEBUG,
  };

  console.log('✅ QuoteManager caricato (MULTI-FILE) - file configurati: ' + PDF_FILES.length);

})();