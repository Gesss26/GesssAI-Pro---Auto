// ============================================================
// pdf-quote-parser.js
// Parser PDF Marathonbet → quote strutturate
// + salvataggio in localStorage
// + estrazione data massima per check aggiornamento
// ============================================================

(function () {
  'use strict';

  const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  const MESI_NUM = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5, 'giugno': 6,
    'luglio': 7, 'agosto': 8, 'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
  };

  const STORAGE_KEY = 'ft_quote_pdf';
  const STORAGE_META_KEY = 'ft_quote_pdf_meta';

  const CAMPIONATI_RICONOSCIBILI = [
    'Italia - Serie A', 'Italia - Serie B', 'Italia - Serie C',
    'Inghilterra - Premier League', 'Inghilterra - Championship', 'Inghilterra - EFL Cup',
    'Spagna - La Liga', 'Spagna - LaLiga2', 'Spagna - LaLiga 2',
    'Germania - Bundesliga', 'Germania - 2. Bundesliga',
    'Francia - Ligue 1', 'Francia - Ligue 2',
    'Olanda - Eredivisie', 'Olanda - Eerste Divisie',
    'Portogallo - Liga Portugal', 'Belgio - Pro League',
    'Turchia - Süper Lig', 'Scozia - Premiership',
    'Repubblica di Corea - K-Legue 1', 'Corea - K League 1',
    'Jupiler Pro League', 'Premier League', 'Ligue 1', 'Ligue 2',
    'Bundesliga', '2. Bundesliga', 'Serie A', 'Serie B',
    'Eredivisie', 'Eerste Divisie', 'Primeira Liga', 'La Liga',
  ];

  // ============================================================
  // ESTRAZIONE TESTO DA PDF (con posizionamento Y)
  // ============================================================

  const estraiRigheDaPDF = async (file) => {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js non caricato. Aggiungi lo script nell\'HTML.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const tutteLeRighe = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const righeMap = new Map();

      content.items.forEach(item => {
        if (!item.str || item.str.trim() === '') return;
        const yKey = Math.round(item.transform[5] / 3) * 3;
        if (!righeMap.has(yKey)) righeMap.set(yKey, []);
        righeMap.get(yKey).push({
          text: item.str,
          x: item.transform[4],
        });
      });

      const ySorted = Array.from(righeMap.keys()).sort((a, b) => b - a);

      ySorted.forEach(y => {
        const items = righeMap.get(y).sort((a, b) => a.x - b.x);
        const riga = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
        if (riga) {
          tutteLeRighe.push({ pagina: i, y, testo: riga });
        }
      });
    }

    return tutteLeRighe;
  };

  // ============================================================
  // RICONOSCIMENTO RIGHE
  // ============================================================

  const isIntestazioneCampionato = (testo) => {
    const pattern = /^([A-Z][a-zà-ù]+(?:\s+di\s+[A-Z][a-zà-ù]+)?)\s+-\s+(.+)$/;
    const match = testo.match(pattern);
    if (!match) return null;
    if (GIORNI.some(g => testo.includes(g))) return null;

    const campionato = testo.trim();
    const isKnown = CAMPIONATI_RICONOSCIBILI.some(c =>
      campionato.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(campionato.toLowerCase())
    );

    return isKnown ? campionato : null;
  };

  const isRigaData = (testo) => {
    const pattern = new RegExp(
      `^(${GIORNI.join('|')})\\s+(\\d{1,2})\\s+(${MESI.join('|')})`,
      'i'
    );
    const match = testo.match(pattern);
    if (!match) return null;

    const giorno = match[2].padStart(2, '0');
    const mese = MESI_NUM[match[3].toLowerCase()] || 1;
    const meseStr = String(mese).padStart(2, '0');
    const anno = new Date().getFullYear();
    const dataISO = `${anno}-${meseStr}-${giorno}`;

    return {
      giorno: match[1],
      numero: match[2],
      mese: match[3],
      dataCompleta: `${match[1]} ${match[2]} ${match[3]}`,
      dataISO,
    };
  };

  // ============================================================
  // PARSING RIGA PARTITA
  // ============================================================

  const parseRigaPartita = (testo) => {
    const pattern = /^(\d{3,6})\s+(\d{1,2}:\d{2})\s+(.+)$/;
    const match = testo.match(pattern);
    if (!match) return null;

    const [, alias, ora, resto] = match;

    const quotePattern = /(\d+\.\d+)/g;
    const quote = [];
    let qMatch;
    while ((qMatch = quotePattern.exec(resto)) !== null) {
      quote.push(parseFloat(qMatch[1]));
    }

    if (quote.length < 3) return null;

    const primaQuotaIndex = resto.indexOf(quote[0].toString());
    const eventoRaw = resto.substring(0, primaQuotaIndex).trim();

    const sepIndex = eventoRaw.lastIndexOf(' - ');
    if (sepIndex === -1) return null;

    const casa = eventoRaw.substring(0, sepIndex).trim();
    const ospiti = eventoRaw.substring(sepIndex + 3).trim();

    if (!casa || !ospiti) return null;

    const quoteMappate = {
      '1': quote[0] ?? null,
      'X': quote[1] ?? null,
      '2': quote[2] ?? null,
      '1X': quote[3] ?? null,
      '12': quote[4] ?? null,
      'X2': quote[5] ?? null,
      'GG': quote[6] ?? null,
      'NG': quote[7] ?? null,
      'U1.5': quote[8] ?? null,
      'O1.5': quote[9] ?? null,
      'U2.5': quote[10] ?? null,
      'O2.5': quote[11] ?? null,
      'U3.5': quote[12] ?? null,
      'O3.5': quote[13] ?? null,
      'U4.5': quote[14] ?? null,
      'O4.5': quote[15] ?? null,
      'MG14_SI': quote[16] ?? null,
      'MG14_NO': quote[17] ?? null,
      'MG25_SI': quote[18] ?? null,
      'MG25_NO': quote[19] ?? null,
    };

    return {
      alias: alias.trim(),
      ora: ora.trim(),
      casa,
      ospiti,
      quote: quoteMappate,
      quoteGrezze: quote,
      numQuote: quote.length,
    };
  };

  // ============================================================
  // PARSER PRINCIPALE
  // ============================================================

  const parseMarathonbetPDF = (righe) => {
    const partite = [];
    let campionatoCorrente = null;
    let dataCorrente = null;
    let dataISOCorrente = null;
    let giornoCorrente = null;

    for (const riga of righe) {
      const testo = riga.testo;

      const camp = isIntestazioneCampionato(testo);
      if (camp) {
        campionatoCorrente = camp;
        continue;
      }

      const data = isRigaData(testo);
      if (data) {
        dataCorrente = data.dataCompleta;
        dataISOCorrente = data.dataISO;
        giornoCorrente = data.giorno;
        continue;
      }

      if (/^(Alias|Codice|Evento|Calcio|1X2|DOPPIA|GG\/NG|U\/O|MG|SI|NO)/i.test(testo)) {
        continue;
      }

      const partita = parseRigaPartita(testo);
      if (partita) {
        partite.push({
          ...partita,
          campionato: campionatoCorrente,
          data: dataCorrente,
          dataISO: dataISOCorrente,
          giorno: giornoCorrente,
          fonte: 'Marathonbet',
          estrattoIl: new Date().toISOString(),
        });
      }
    }

    return partite;
  };

  // ============================================================
  // NORMALIZZAZIONE NOMI + FUZZY MATCHING
  // ============================================================

  const normalizzaNome = (nome) => {
    if (!nome) return '';
    return nome
      .toLowerCase()
      .replace(/\b(fc|ac|ssc|as|us|ss|asd|ssd|calcio|sportiva|società|1919|1929|1937|1908|1911|u23|u21|u19)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const similarita = (a, b) => {
    if (a === b) return 1;
    if (!a || !b) return 0;

    const bigrams = (str) => {
      const set = new Set();
      for (let i = 0; i < str.length - 1; i++) {
        set.add(str.substring(i, i + 2));
      }
      return set;
    };

    const aBigrams = bigrams(a);
    const bBigrams = bigrams(b);
    let intersection = 0;
    aBigrams.forEach(bg => {
      if (bBigrams.has(bg)) intersection++;
    });

    return (2 * intersection) / (aBigrams.size + bBigrams.size);
  };

  const trovaMatchApp = (partitaPDF, matchesApp) => {
    const casaNorm = normalizzaNome(partitaPDF.casa);
    const ospitiNorm = normalizzaNome(partitaPDF.ospiti);

    let bestMatch = null;
    let bestScore = 0;

    for (const m of matchesApp) {
      const appCasaNorm = normalizzaNome(m.casa);
      const appOspitiNorm = normalizzaNome(m.ospiti);

      const scoreCasa = similarita(casaNorm, appCasaNorm);
      const scoreOspiti = similarita(ospitiNorm, appOspitiNorm);
      const score = (scoreCasa + scoreOspiti) / 2;

      if (score > bestScore && score > 0.65) {
        bestScore = score;
        bestMatch = m;
      }
    }

    return bestMatch ? { match: bestMatch, score: bestScore } : null;
  };

  // ============================================================
  // ANALISI VALUE BET
  // ============================================================

  const analizzaValueBet = (partitaPDF, matchApp, stats) => {
    if (!stats || stats.error) return [];

    const mapping = {
      '1': { familyId: 'fisse', giocata: '1' },
      'X': { familyId: 'fisse', giocata: 'X' },
      '2': { familyId: 'fisse', giocata: '2' },
      '1X': { familyId: 'dc', giocata: '1X' },
      '12': { familyId: 'dc', giocata: '12' },
      'X2': { familyId: 'dc', giocata: 'X2' },
      'GG': { familyId: 'gg_ng', giocata: 'GG' },
      'NG': { familyId: 'gg_ng', giocata: 'NG' },
      'O1.5': { familyId: 'over', giocata: 'Over 1.5' },
      'O2.5': { familyId: 'over', giocata: 'Over 2.5' },
      'O3.5': { familyId: 'over', giocata: 'Over 3.5' },
      'O4.5': { familyId: 'over', giocata: 'Over 4.5' },
      'U1.5': { familyId: 'under', giocata: 'Under 1.5' },
      'U2.5': { familyId: 'under', giocata: 'Under 2.5' },
      'U3.5': { familyId: 'under', giocata: 'Under 3.5' },
      'U4.5': { familyId: 'under', giocata: 'Under 4.5' },
      'MG14_SI': { familyId: 'multigol', giocata: '1-4' },
      'MG25_SI': { familyId: 'multigol', giocata: '2-5' },
    };

    const risultati = [];

    for (const [mercato, quotaBook] of Object.entries(partitaPDF.quote)) {
      if (!quotaBook || quotaBook <= 1) continue;

      const map = mapping[mercato];
      if (!map) continue;

      const pctTua = window.getGiocataPct
        ? window.getGiocataPct(map.giocata, stats, stats.homeMG, stats.awayMG, stats.mgTot)
        : 0;

      if (pctTua === 0) continue;

      const quotaFair = 100 / pctTua;
      const edge = ((quotaBook * pctTua / 100) - 1) * 100;

      const b = quotaBook - 1;
      const p = pctTua / 100;
      const q = 1 - p;
      const kelly = b > 0 ? Math.max(0, (b * p - q) / b) : 0;

      let classificazione = '⚪';
      let livello = 'no-value';
      if (edge > 20) { classificazione = '💎 VALUE ECCELLENTE'; livello = 'excellent'; }
      else if (edge > 10) { classificazione = '✅ VALUE BUONO'; livello = 'good'; }
      else if (edge > 5) { classificazione = '🟡 VALUE MARGINALE'; livello = 'marginal'; }
      else if (edge > 0) { classificazione = '⚪ Quota fair'; livello = 'fair'; }

      risultati.push({
        mercato,
        giocata: map.giocata,
        familyId: map.familyId,
        pctTua,
        quotaFair: parseFloat(quotaFair.toFixed(2)),
        quotaBook,
        edge: parseFloat(edge.toFixed(1)),
        isValue: edge > 5,
        livello,
        classificazione,
        kellyStake: parseFloat((kelly * 100).toFixed(2)),
      });
    }

    return risultati.sort((a, b) => b.edge - a.edge);
  };

  // ============================================================
  // SALVATAGGIO IN LOCALSTORAGE
  // ============================================================

  const salvaQuote = (partite) => {
    try {
      // Struttura salvata:
      // {
      //   "casa|ospiti|YYYY-MM-DD": { quote: {...}, meta: {...} }
      // }
      const mappa = {};

      partite.forEach(p => {
        const key = `${normalizzaNome(p.casa)}|${normalizzaNome(p.ospiti)}|${p.dataISO || ''}`;
        mappa[key] = {
          casa: p.casa,
          ospiti: p.ospiti,
          campionato: p.campionato,
          data: p.data,
          dataISO: p.dataISO,
          ora: p.ora,
          quote: p.quote,
        };
      });

      // Calcola data massima
      const dateValide = partite
        .map(p => p.dataISO)
        .filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/))
        .sort();

      const dataMax = dateValide[dateValide.length - 1] || null;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappa));
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
        salvatoIl: new Date().toISOString(),
        dataMaxPDF: dataMax,
        numPartite: partite.length,
      }));

      console.log(`✅ Quote salvate in localStorage: ${partite.length} partite, data max: ${dataMax}`);

      // Evento globale per notificare i moduli
      window.dispatchEvent(new CustomEvent('quote-updated', {
        detail: { numPartite: partite.length, dataMaxPDF: dataMax }
      }));

      return { numPartite: partite.length, dataMaxPDF: dataMax };
    } catch (e) {
      console.warn('Errore salvataggio quote:', e);
      return null;
    }
  };

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
  // CERCA QUOTA PER UNA PARTITA + GIOCATA
  // ============================================================

  /**
   * Trova la quota di una giocata per una specifica partita
   * @param {Object} match - partita dell'app {casa, ospiti, data}
   * @param {string} familyId - es. 'dc', 'over', 'gg_ng'
   * @param {string} giocata - es. '1X', 'Over 2.5', 'GG'
   * @returns {number|null} quota o null
   */
  const trovaQuotaPerGiocata = (match, familyId, giocata) => {
    const quote = leggiQuote();
    if (!quote || Object.keys(quote).length === 0) return null;

    const casaNorm = normalizzaNome(match.casa);
    const ospitiNorm = normalizzaNome(match.ospiti);
    const dataMatch = match.data || '';

    // 1. Prova match esatto (casa|ospiti|data)
    const keyEsatta = `${casaNorm}|${ospitiNorm}|${dataMatch}`;
    let entry = quote[keyEsatta];

    // 2. Se non trovato, prova per casa|ospiti (senza data)
    if (!entry) {
      const keys = Object.keys(quote).filter(k => k.startsWith(`${casaNorm}|${ospitiNorm}|`));
      if (keys.length > 0) {
        entry = quote[keys[0]];
      }
    }

    // 3. Fuzzy matching: cerca per somiglianza nomi
    if (!entry) {
      let bestMatch = null;
      let bestScore = 0;

      for (const [key, val] of Object.entries(quote)) {
        const scoreCasa = similarita(casaNorm, normalizzaNome(val.casa));
        const scoreOspiti = similarita(ospitiNorm, normalizzaNome(val.ospiti));
        const score = (scoreCasa + scoreOspiti) / 2;

        if (score > bestScore && score > 0.75) {
          bestScore = score;
          bestMatch = val;
        }
      }

      if (bestMatch) entry = bestMatch;
    }

    if (!entry || !entry.quote) return null;

    // Mappa famiglia → chiave quota
    return mappaGiocataAQuota(entry.quote, familyId, giocata);
  };

  const mappaGiocataAQuota = (quotePDF, familyId, giocata) => {
    // FISSE
    if (familyId === 'fisse') {
      if (giocata === '1') return quotePDF['1'] || null;
      if (giocata === 'X') return quotePDF['X'] || null;
      if (giocata === '2') return quotePDF['2'] || null;
    }

    // DOPPIA CHANCE
    if (familyId === 'dc') {
      if (giocata === '1X') return quotePDF['1X'] || null;
      if (giocata === '12') return quotePDF['12'] || null;
      if (giocata === 'X2') return quotePDF['X2'] || null;
    }

    // GG/NG
    if (familyId === 'gg_ng') {
      if (giocata === 'GG' || giocata === 'Goal-Goal') return quotePDF['GG'] || null;
      if (giocata === 'NG' || giocata === 'No Goal') return quotePDF['NG'] || null;
    }

    // OVER
    if (familyId === 'over') {
      if (giocata === 'Over 1.5') return quotePDF['O1.5'] || null;
      if (giocata === 'Over 2.5') return quotePDF['O2.5'] || null;
      if (giocata === 'Over 3.5') return quotePDF['O3.5'] || null;
      if (giocata === 'Over 4.5') return quotePDF['O4.5'] || null;
    }

    // UNDER
    if (familyId === 'under') {
      if (giocata === 'Under 1.5') return quotePDF['U1.5'] || null;
      if (giocata === 'Under 2.5') return quotePDF['U2.5'] || null;
      if (giocata === 'Under 3.5') return quotePDF['U3.5'] || null;
      if (giocata === 'Under 4.5') return quotePDF['U4.5'] || null;
    }

    // MULTIGOL
    if (familyId === 'multigol') {
      if (giocata === '1-4') return quotePDF['MG14_SI'] || null;
      if (giocata === '2-5') return quotePDF['MG25_SI'] || null;
      // 0-2 e 1-3 non sono nel PDF Marathonbet (sono MG Casa)
    }

    // DC + OVER (es. "1X+O2.5")
    if (familyId === 'dc_over') {
      const parts = giocata.split('+');
      if (parts.length === 2) {
        const dcQ = quotePDF[parts[0]] || null;
        const overQ = quotePDF[parts[1]] || null;
        if (dcQ && overQ) return parseFloat((dcQ * overQ).toFixed(2));
      }
    }

    // DC + UNDER (es. "1X+U2.5")
    if (familyId === 'dc_under') {
      const parts = giocata.split('+');
      if (parts.length === 2) {
        const dcQ = quotePDF[parts[0]] || null;
        const underQ = quotePDF[parts[1]] || null;
        if (dcQ && underQ) return parseFloat((dcQ * underQ).toFixed(2));
      }
    }

    return null;
  };

  /**
   * Restituisce l'analisi completa (con edge, value bet) per una giocata
   * @returns {Object|null} { quota, quotaFair, edge, isValue, classificazione }
   */
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
  // CHECK AGGIORNAMENTO PDF
  // ============================================================

  /**
   * Verifica se il PDF è aggiornato (data max >= oggi)
   * @returns {Object} { aggiornato: bool, dataMax: string, oggi: string }
   */
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
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.PDFQuoteParser = {
    // Parsing
    estraiRigheDaPDF,
    parseMarathonbetPDF,
    parseRigaPartita,
    isIntestazioneCampionato,
    isRigaData,
    // Matching
    normalizzaNome,
    similarita,
    trovaMatchApp,
    // Analisi
    analizzaValueBet,
    // Storage
    salvaQuote,
    leggiQuote,
    leggiMeta,
    getMaxDataPDF,
    // Query
    trovaQuotaPerGiocata,
    analizzaGiocataConQuota,
    // Check
    checkAggiornamentoPDF,
    // Costanti
    CAMPIONATI_RICONOSCIBILI,
    STORAGE_KEY,
    STORAGE_META_KEY,
  };

  console.log('✅ PDFQuoteParser caricato - Marathonbet (con storage + check data)');

})();