// ============================================================
// assenze.js - Modulo Assenze, Infortuni e Formazioni (v5.0)
// - Legge assenze.json (infortunati manuali con importanza)
// - Legge formazioni_con_voti.json (formazioni con voti dall'Excel)
// - Legge stats_giocatori.json (mappa completa giocatori dall'Excel)
// - Legge probabili_formazioni.json (formazioni con probabilità titolarità)
// - Fix: lettura perfetta delle colonne dell'Excel (R, Mv, Fm, ecc.)
// - Fix: normalizzazione ruoli (Por -> P, Dc -> D, ecc.)
//
// ⭐ v5.0: NUOVA calcolaPesi BASATA SULLE FORMAZIONI
//   - Itera sui titolari effettivi (con probabilità di titolarità)
//   - Calcola pesoOffensivo e pesoDifensivo per ogni titolare
//   - Confronta con il peso "massimo teorico" (se tutti giocassero al 100%)
//   - Restituisce percentuale di penalizzazione (0 = tutti disponibili, 1 = tutti out)
//   - Fallback: se formazione assente, usa la logica vecchia (solo assenze)
// ============================================================

(function () {
  'use strict';

  const PESI_IMPORTANZA = {
    chiave: 1.0,
    rotazione: 0.5,
    marginale: 0.2,
  };

  // ⭐ v5: pesi per il calcolo del contributo offensivo/difensivo di un giocatore
  const PESO_RUOLO_ATTACCO = {
    'A': 1.0,   // Attaccante
    'C': 0.6,   // Centrocampista
    'D': 0.25,  // Difensore
    'P': 0.0,   // Portiere
    '?': 0.3,   // Sconosciuto
  };
  const PESO_RUOLO_DIFESA = {
    'P': 1.0,   // Portiere
    'D': 1.0,   // Difensore
    'C': 0.5,   // Centrocampista
    'A': 0.2,   // Attaccante
    '?': 0.5,
  };

  // Soglia di affidabilità: sotto questa soglia di "peso titolari disponibili",
  // la squadra è considerata in emergenza e il peso viene comunque cappato
  const SOGLIA_EMERGENZA = 0.6;

  const PREFISSI_SQUADRA = [
    'a.s. ', 's.s.c. ', 's.s. ', 'a.c. ', 'f.c. ', 'u.s. ',
    'asd ', 'ssd ', 'pol. ', 'pol ',
    'as ', 'ssc ', 'ss ', 'ac ', 'fc ', 'us ',
    'calcio ',
  ];

  const SUFFISSI_SQUADRA = [' calcio', ' fc', ' ac', ' ss', ' as', ' us'];

  const normalizzaNomeSquadra = (nome) => {
    if (!nome) return '';
    let n = nome.toString().trim().toLowerCase();
    n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    n = n.replace(/\s+/g, ' ').trim();
    n = n.replace(/[.,]/g, '').trim();

    for (const pref of PREFISSI_SQUADRA) {
      if (n.startsWith(pref)) {
        n = n.substring(pref.length).trim();
        break;
      }
    }
    for (const suff of SUFFISSI_SQUADRA) {
      if (n.endsWith(suff)) {
        n = n.substring(0, n.length - suff.length).trim();
        break;
      }
    }
    return n;
  };

  const normalizzaNomeGiocatore = (s) => {
    if (s === null || s === undefined) return '';
    let n = String(s);
    n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    n = n.replace(/[''`´]/g, "'");
    n = n.toLowerCase();
    n = n.replace(/[.\-–—]/g, ' ');
    n = n.replace(/\s+/g, ' ').trim();
    return n;
  };

  window.AssenzeDB = {
    aggiornato: null,
    squadre: {},
    formazioni: {},
    _formazioniProbabili: null,   // ⭐ v5: formazioni con probabilità da probabili_formazioni.json
    _mappa: {},
    _mappaNormalizzata: {},
    _indiceSquadre: {},
    _indiceFormazioni: {},
    _indiceFormazioniProbabili: {},
    _cacheTeamStats: {},
    _cachePesi: {},               // ⭐ v5: cache per calcolaPesi
    _medieLega: null,             // ⭐ v5: medie di lega (Mv e Fm) per normalizzare i pesi
    _caricato: false,

    async carica() {
      try {
        // 1. Assenze manuali (con importanza)
        const r = await fetch('data/assenze.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        this.aggiornato = data.aggiornato || null;
        this.squadre = data.squadre || {};

        // 2. Formazioni con voti già uniti (generate da unifica.py)
        try {
          const rf = await fetch('data/formazioni_con_voti.json');
          if (rf.ok) {
            const fd = await rf.json();
            this.formazioni = fd.formazioni || {};
            console.log('✅ Formazioni caricate:', Object.keys(this.formazioni).length, 'squadre');
          } else {
            console.warn('⚠️ Formazioni non trovate (HTTP', rf.status, ')');
          }
        } catch (e) {
          console.warn('⚠️ Formazioni non caricate:', e.message);
        }

        // ⭐ v5: 3. Formazioni probabili (con probabilità di titolarità)
        try {
          const rp = await fetch('data/probabili_formazioni.json');
          if (rp.ok) {
            const pd = await rp.json();
            this._formazioniProbabili = pd.formazioni || null;
            console.log('✅ Formazioni probabili caricate:', Object.keys(this._formazioniProbabili || {}).length, 'squadre');
          } else {
            console.warn('⚠️ Formazioni probabili non trovate (HTTP', rp.status, ') - uso formazioni_con_voti');
          }
        } catch (e) {
          console.warn('⚠️ Formazioni probabili non caricate:', e.message);
        }

        this._costruisciIndice();
        this._caricato = true;

        // 4. Stats giocatori dall'Excel (parsato in JSON)
        await this.caricaStats();

        console.log(
          '✅ Assenze caricate:',
          Object.keys(this.squadre).length, 'squadre,',
          this._contaTotale(), 'assenze,',
          Object.keys(this.formazioni).length, 'formazioni,',
          Object.keys(this._formazioniProbabili || {}).length, 'form. probabili,',
          Object.keys(this._mappa).length, 'giocatori'
        );
        window.dispatchEvent(new Event('assenze-updated'));
        return true;
      } catch (e) {
        console.warn('⚠️ Assenze non caricate:', e.message);
        this._caricato = false;
        return false;
      }
    },

    async caricaStats() {
      try {
        const r = await fetch('data/stats_giocatori.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const rows = await r.json();
        this.setStatsGiocatori(rows);
        console.log(`✅ Stats caricate: ${rows.length} giocatori`);
        return true;
      } catch (e) {
        console.warn('⚠️ Stats giocatori non caricate:', e.message);
        return false;
      }
    },

    _costruisciIndice() {
      this._indiceSquadre = {};
      Object.keys(this.squadre).forEach(chiaveOriginale => {
        const normalizzata = normalizzaNomeSquadra(chiaveOriginale);
        if (normalizzata) this._indiceSquadre[normalizzata] = chiaveOriginale;
      });
      this._indiceFormazioni = {};
      Object.keys(this.formazioni).forEach(chiaveOriginale => {
        const normalizzata = normalizzaNomeSquadra(chiaveOriginale);
        if (normalizzata) this._indiceFormazioni[normalizzata] = chiaveOriginale;
      });
      // ⭐ v5: indice formazioni probabili
      this._indiceFormazioniProbabili = {};
      if (this._formazioniProbabili) {
        Object.keys(this._formazioniProbabili).forEach(chiaveOriginale => {
          const normalizzata = normalizzaNomeSquadra(chiaveOriginale);
          if (normalizzata) this._indiceFormazioniProbabili[normalizzata] = chiaveOriginale;
        });
      }
      this._cacheTeamStats = {};
      this._cachePesi = {};
      this._medieLega = null;
    },

    _contaTotale() {
      return Object.values(this.squadre).reduce((s, arr) => s + arr.length, 0);
    },

    _trovaChiaveSquadra(squadra, indice = null) {
      if (!squadra) return null;
      const idx = indice || this._indiceSquadre;
      let src = this.squadre;
      if (indice === this._indiceFormazioni) src = this.formazioni;
      else if (indice === this._indiceFormazioniProbabili) src = this._formazioniProbabili || {};

      if (src[squadra] !== undefined) return squadra;

      const norm = normalizzaNomeSquadra(squadra);
      if (!norm) return null;
      if (idx[norm]) return idx[norm];

      if (norm.length < 4) return null;
      for (const k of Object.keys(idx)) {
        if (k.length < 4) continue;
        if (k === norm) return idx[k];
        if (k.startsWith(norm) || norm.startsWith(k)) return idx[k];
      }
      return null;
    },

    getAssenze(squadra) {
      if (!squadra) return [];
      const chiave = this._trovaChiaveSquadra(squadra);
      if (!chiave) return [];
      return this.squadre[chiave] || [];
    },

    getByImportanza(squadra, importanza) {
      return this.getAssenze(squadra).filter(a => a.importanza === importanza);
    },

    // ⭐ v5: priorità a formazioni probabili, fallback a formazioni_con_voti
    getFormazione(squadra) {
      if (!squadra) return null;
      // 1. Prova formazioni probabili (con probabilità)
      if (this._formazioniProbabili) {
        const chiave = this._trovaChiaveSquadra(squadra, this._indiceFormazioniProbabili);
        if (chiave && this._formazioniProbabili[chiave]) {
          return this._formazioniProbabili[chiave];
        }
      }
      // 2. Fallback a formazioni_con_voti
      const chiave = this._trovaChiaveSquadra(squadra, this._indiceFormazioni);
      if (!chiave) return null;
      return this.formazioni[chiave] || null;
    },

    getTitolari(squadra) {
      const f = this.getFormazione(squadra);
      return f && Array.isArray(f.titolari) ? f.titolari : [];
    },

    getModulo(squadra) {
      const f = this.getFormazione(squadra);
      return f ? f.modulo || null : null;
    },

    getBallottaggi(squadra) {
      const f = this.getFormazione(squadra);
      return f && Array.isArray(f.ballottaggi) ? f.ballottaggi : [];
    },

    isTitolare(squadra, nomeGiocatore) {
      const titolari = this.getTitolari(squadra);
      const norm = normalizzaNomeGiocatore(nomeGiocatore || '');
      return titolari.some(t => {
        const nomeT = typeof t === 'string' ? t : (t && t.nome) || '';
        return normalizzaNomeGiocatore(nomeT) === norm;
      });
    },

    getAffidabilitaFormazione(squadra) {
      const f = this.getFormazione(squadra);
      if (!f || !Array.isArray(f.titolari)) return 0;
      return Math.min(1, f.titolari.length / 11);
    },

    getTitolariConStats(squadra) {
      const titolari = this.getTitolari(squadra);
      return titolari.map(t => {
        if (typeof t === 'object' && t !== null && t.nome) {
          return { ...t, titolare: true, trovato: true };
        }
        const nome = typeof t === 'string' ? t : '';
        const g = this.getGiocatore(nome);
        return g ? { ...g, titolare: true } : { nome, titolare: true, trovato: false };
      });
    },

    // ⭐ v5: media titolari ponderata per probabilità di titolarità
    getMediaTitolariPonderata(squadra) {
      const f = this.getFormazione(squadra);
      if (!f) return { media: null, conVoto: 0, totale: 0 };
      const titolari = f.titolari || [];
      let sumMv = 0, sumPesi = 0, countMv = 0;
      titolari.forEach(t => {
        let mv = 0, prob = 100;
        if (typeof t === 'object' && t !== null) {
          mv = parseFloat(t.Mv) || 0;
          prob = (typeof t.probabilità === 'number') ? t.probabilità :
                 (typeof t.probabilita === 'number') ? t.probabilita : 100;
          if (mv <= 0 && t.nome) {
            const g = this.getGiocatore(t.nome);
            if (g) mv = parseFloat(g.Mv) || 0;
          }
        } else if (typeof t === 'string') {
          const g = this.getGiocatore(t);
          if (g) mv = parseFloat(g.Mv) || 0;
        }
        if (mv > 0) {
          const peso = prob / 100;
          sumMv += mv * peso;
          sumPesi += peso;
          countMv++;
        }
      });
      return {
        media: sumPesi > 0 ? Math.round((sumMv / sumPesi) * 100) / 100 : null,
        conVoto: countMv,
        totale: titolari.length,
      };
    },

    getMediaTitolari(squadra) {
      const f = this.getFormazione(squadra);
      if (!f) return { media: null, conVoto: 0, totale: 0 };
      const titolari = f.titolari || [];
      let sum = 0, count = 0;
      titolari.forEach(t => {
        let mv = 0;
        if (typeof t === 'object' && t !== null) {
          mv = parseFloat(t.Mv) || 0;
          if (mv <= 0 && t.nome) {
            const g = this.getGiocatore(t.nome);
            if (g) mv = parseFloat(g.Mv) || 0;
          }
        } else if (typeof t === 'string') {
          const g = this.getGiocatore(t);
          if (g) mv = parseFloat(g.Mv) || 0;
        }
        if (mv > 0) { sum += mv; count++; }
      });
      return {
        media: count > 0 ? Math.round((sum / count) * 100) / 100 : null,
        conVoto: count,
        totale: titolari.length,
      };
    },

    setFormazioni(rows) {
      if (!Array.isArray(rows)) return;
      let n = 0;
      rows.forEach(r => {
        const squadra = (r.squadra || '').toString().trim();
        if (!squadra) return;
        this.formazioni[squadra] = {
          modulo: r.modulo || null,
          titolari: Array.isArray(r.titolari) ? r.titolari : [],
          panchina: Array.isArray(r.panchina) ? r.panchina : [],
          indisponibili: Array.isArray(r.indisponibili) ? r.indisponibili : [],
          squalificati: Array.isArray(r.squalificati) ? r.squalificati : [],
          diffidati: Array.isArray(r.diffidati) ? r.diffidati : [],
        };
        n++;
      });
      this._costruisciIndice();
      console.log(`✅ Importate ${n} formazioni`);
      window.dispatchEvent(new Event('formazioni-updated'));
    },

    setStatsGiocatori(rows) {
      this._mappa = {};
      this._mappaNormalizzata = {};
      if (!Array.isArray(rows)) return;

      const trovaColonna = (row, nomiPossibili) => {
        const keys = Object.keys(row);
        for (const nome of nomiPossibili) {
          const found = keys.find(k => k.toLowerCase().trim() === nome.toLowerCase().trim());
          if (found) return found;
        }
        return null;
      };

      rows.forEach(row => {
        const colNome = trovaColonna(row, ['nome', 'name', 'giocatore', 'calciatore']);
        if (!colNome) return;

        const nome = (row[colNome] || '').toString().trim();
        if (!nome) return;

        const colSquadra = trovaColonna(row, ['squadra', 'team', 'club']);
        const squadra = colSquadra ? (row[colSquadra] || '').toString().trim() : '';

        let ruolo = '?';
        const colRuolo = trovaColonna(row, ['ruolo', 'role']);
        if (colRuolo) {
          const r = (row[colRuolo] || '').toString().trim().toUpperCase();
          if (['P', 'D', 'C', 'A'].includes(r)) ruolo = r;
          else {
            if (r.startsWith('POR') || r === 'P') ruolo = 'P';
            else if (r.startsWith('D')) ruolo = 'D';
            else if (r.startsWith('C')) ruolo = 'C';
            else if (r.startsWith('A')) ruolo = 'A';
            else if (['E', 'W', 'T', 'M'].includes(r)) ruolo = 'C';
          }
        } else {
          const colR = trovaColonna(row, ['r', 'rm']);
          if (colR) {
            const r = (row[colR] || '').toString().trim().toUpperCase();
            if (r.startsWith('POR') || r === 'P') ruolo = 'P';
            else if (r.startsWith('D') || r === 'DIF') ruolo = 'D';
            else if (r.startsWith('C') || r === 'CEN') ruolo = 'C';
            else if (r.startsWith('A') || r === 'ATT') ruolo = 'A';
            else if (['E', 'W', 'T', 'M'].includes(r)) ruolo = 'C';
          }
        }

        const getNum = (nomiPossibili) => {
          const col = trovaColonna(row, nomiPossibili);
          if (!col) return 0;
          const valStr = String(row[col] || '0').replace(',', '.');
          const val = parseFloat(valStr);
          return isNaN(val) ? 0 : val;
        };

        const giocatore = {
          nome,
          squadra,
          ruolo,
          Pv: getNum(['pv', 'presenze', 'presenze voto']),
          Mv: getNum(['mv', 'media voto', 'voto']),
          Fm: getNum(['fm', 'fantamedia', 'fanta media']),
          Gf: getNum(['gf', 'gol fatti', 'gol']),
          Gs: getNum(['gs', 'gol subiti']),
          Ass: getNum(['ass', 'assist']),
          Rp: getNum(['rp', 'rigori parati']),
          Rc: getNum(['rc', 'rigori causati']),
        };

        this._mappa[nome] = giocatore;

        const norm = normalizzaNomeGiocatore(nome);
        if (norm && !this._mappaNormalizzata[norm]) {
          this._mappaNormalizzata[norm] = giocatore;
        }
      });

      this._cacheTeamStats = {};
      this._cachePesi = {};
      this._medieLega = null;
      console.log('✅ AssenzeDB: mappati', Object.keys(this._mappa).length, 'giocatori');

      const primiTre = Object.values(this._mappa).slice(0, 3);
      if (primiTre.length > 0) {
        console.log('🔍 Esempio giocatori mappati:', primiTre);
      }
    },

    getGiocatore(nome) {
      if (!nome) return null;
      if (this._mappa[nome]) return this._mappa[nome];

      const norm = normalizzaNomeGiocatore(nome);
      if (!norm) return null;
      if (this._mappaNormalizzata[norm]) return this._mappaNormalizzata[norm];

      const parti = norm.split(' ');
      if (parti.length >= 2) {
        const cognome = parti[0];
        const iniziale = parti[1];
        const key1 = `${cognome} ${iniziale}`;
        if (this._mappaNormalizzata[key1]) return this._mappaNormalizzata[key1];
        for (const k of Object.keys(this._mappaNormalizzata)) {
          if (k.startsWith(cognome + ' ')) {
            return this._mappaNormalizzata[k];
          }
        }
      }

      if (norm.length >= 4) {
        const candidati = [];
        for (const k of Object.keys(this._mappaNormalizzata)) {
          if (k.includes(norm) || norm.includes(k)) {
            candidati.push(this._mappaNormalizzata[k]);
          }
        }
        if (candidati.length === 1) return candidati[0];
      }

      return null;
    },

    // ⭐ v5: medie di lega per normalizzare i pesi (Mv media e Fm media)
    _calcolaMedieLega() {
      if (this._medieLega) return this._medieLega;

      let sumMv = 0, countMv = 0;
      let sumFm = 0, countFm = 0;

      Object.values(this._mappa).forEach(g => {
        if (g.Mv > 0 && g.Pv >= 5) {
          sumMv += g.Mv;
          countMv++;
        }
        if (g.Fm > 0 && g.Pv >= 5) {
          sumFm += g.Fm;
          countFm++;
        }
      });

      this._medieLega = {
        mv: countMv > 0 ? sumMv / countMv : 6.0,
        fm: countFm > 0 ? sumFm / countFm : 6.5,
      };
      return this._medieLega;
    },

    // ============================================================
    // ⭐ v5: NUOVA calcolaPesi BASATA SULLE FORMAZIONI
    // ============================================================
    calcolaPesi(squadra, teamStats) {
      if (!squadra) {
        return { pesoAttacco: 0, pesoDifesa: 0, dettagli: [], nAssenze: 0, fonte: 'nessuna' };
      }

      // Cache per squadra (invalidata quando cambiano stats o formazioni)
      const cacheKey = squadra.toLowerCase().trim();
      if (this._cachePesi[cacheKey]) {
        return this._cachePesi[cacheKey];
      }

      const formazione = this.getFormazione(squadra);
      const assenze = this.getAssenze(squadra);

      // Se NON c'è formazione: fallback alla vecchia logica (solo assenze)
      if (!formazione || !Array.isArray(formazione.titolari) || formazione.titolari.length === 0) {
        const risultato = this._calcolaPesiDaAssenze(squadra, assenze, teamStats);
        risultato.fonte = 'assenze-senza-formazione';
        this._cachePesi[cacheKey] = risultato;
        return risultato;
      }

      // ⭐ NUOVA LOGICA: itera sui titolari e calcola il peso reale
      const medie = this._calcolaMedieLega();
      const mediaMvLega = medie.mv || 6.0;
      const mediaFmLega = medie.fm || 6.5;

      let pesoAttaccoDisponibile = 0;   // peso offensivo dei titolari disponibili
      let pesoAttaccoMassimo = 0;       // peso offensivo massimo teorico (tutti al 100%)
      let pesoDifesaDisponibile = 0;
      let pesoDifesaMassimo = 0;

      const dettagli = [];
      const nomiAssenti = new Set((assenze || []).map(a => normalizzaNomeGiocatore(a.nome || '')));

      formazione.titolari.forEach(t => {
        const nome = typeof t === 'string' ? t : (t && t.nome) || '';
        if (!nome) return;

        const normNome = normalizzaNomeGiocatore(nome);
        const èAssente = nomiAssenti.has(normNome);

        // Probabilità di titolarità (0-100), default 100
        let prob = 100;
        if (typeof t === 'object' && t !== null) {
          if (typeof t.probabilità === 'number') prob = t.probabilità;
          else if (typeof t.probabilita === 'number') prob = t.probabilita;
        }

        // Se è assente, prob = 0 (non gioca)
        if (èAssente) prob = 0;

        const g = this.getGiocatore(nome);
        if (!g) {
          dettagli.push({
            nome, ruolo: (typeof t === 'object' && t.ruolo) || '?',
            probabilità: prob, èAssente,
            trovato: false,
            pesoOff: 0, pesoDif: 0,
            nota: 'stats non trovate',
          });
          return;
        }

        // Pesi di ruolo
        const ruolo = g.ruolo || ((typeof t === 'object' && t.ruolo) || '?');
        const pesoRuoloAtt = PESO_RUOLO_ATTACCO[ruolo] || 0.3;
        const pesoRuoloDif = PESO_RUOLO_DIFESA[ruolo] || 0.5;

        // Peso basato sulle stats reali (normalizzato sulla media di lega)
        const affidabilità = Math.min(1, (g.Pv || 0) / 15);
        const qualitàOff = (g.Fm > 0 && mediaFmLega > 0)
          ? (g.Fm / mediaFmLega) * affidabilità
          : 1.0;
        const qualitàDif = (g.Mv > 0 && mediaMvLega > 0)
          ? (g.Mv / mediaMvLega) * affidabilità
          : 1.0;

        // Peso finale = pesoRuolo × qualità × (probabilità titolarità / 100)
        const probFraz = Math.max(0, Math.min(1, prob / 100));
        const pesoOff = pesoRuoloAtt * qualitàOff * probFraz;
        const pesoDif = pesoRuoloDif * qualitàDif * probFraz;

        // Peso massimo teorico = pesoRuolo × qualità (se giocasse sempre)
        const pesoOffMax = pesoRuoloAtt * qualitàOff;
        const pesoDifMax = pesoRuoloDif * qualitàDif;

        pesoAttaccoDisponibile += pesoOff;
        pesoAttaccoMassimo += pesoOffMax;
        pesoDifesaDisponibile += pesoDif;
        pesoDifesaMassimo += pesoDifMax;

        dettagli.push({
          nome,
          ruolo,
          probabilità: prob,
          èAssente,
          trovato: true,
          Fm: g.Fm, Mv: g.Mv, Gf: g.Gf, Ass: g.Ass, Pv: g.Pv,
          pesoOff: Math.round(pesoOff * 100) / 100,
          pesoDif: Math.round(pesoDif * 100) / 100,
          nota: èAssente ? 'assente' : (prob < 100 ? `titolarità ${prob}%` : 'titolare'),
        });
      });

      // Calcola la percentuale di penalizzazione (0 = nessuna perdita, 1 = tutto perso)
      const pctAttaccoPersa = pesoAttaccoMassimo > 0
        ? 1 - (pesoAttaccoDisponibile / pesoAttaccoMassimo)
        : 0;
      const pctDifesaPersa = pesoDifesaMassimo > 0
        ? 1 - (pesoDifesaDisponibile / pesoDifesaMassimo)
        : 0;

      // Applica un cap (max 35% per attacco, 25% per difesa)
      // per evitare penalizzazioni troppo violente su rose corte
      const pesoAttacco = Math.min(0.35, Math.max(0, pctAttaccoPersa));
      const pesoDifesa = Math.min(0.25, Math.max(0, pctDifesaPersa));

      const risultato = {
        pesoAttacco: Math.round(pesoAttacco * 1000) / 1000,
        pesoDifesa: Math.round(pesoDifesa * 1000) / 1000,
        dettagli,
        nAssenze: assenze.length,
        nTitolari: formazione.titolari.length,
        pctAttaccoPersa: Math.round(pctAttaccoPersa * 1000) / 1000,
        pctDifesaPersa: Math.round(pctDifesaPersa * 1000) / 1000,
        fonte: 'formazione-con-probabilità',
        emergenza: pctAttaccoPersa > SOGLIA_EMERGENZA || pctDifesaPersa > SOGLIA_EMERGENZA,
      };

      this._cachePesi[cacheKey] = risultato;
      return risultato;
    },

    // ⭐ v5: vecchia logica (solo assenze) usata come fallback
    _calcolaPesiDaAssenze(squadra, assenze, teamStats) {
      if (!assenze || assenze.length === 0) {
        return { pesoAttacco: 0, pesoDifesa: 0, dettagli: [], nAssenze: 0 };
      }

      const stats = teamStats || this._calcolaTeamStatsDefault(squadra);
      let golPersi = 0, assistPersi = 0, fmPersi = 0, difPersi = 0;
      const dettagli = [];

      assenze.forEach(a => {
        const g = this.getGiocatore(a.nome);
        const pesoImp = PESI_IMPORTANZA[a.importanza] || 0.5;

        if (!g) {
          dettagli.push({ ...a, trovato: false, impattoAttacco: 0, impattoDifesa: 0 });
          return;
        }

        const ruolo = a.ruolo || g.ruolo;
        let impattoAttacco = 0;
        let impattoDifesa = 0;

        if (ruolo === 'A' || ruolo === 'C') {
          golPersi += (g.Gf || 0) * pesoImp;
          assistPersi += (g.Ass || 0) * pesoImp;
          fmPersi += (g.Fm || 0) * pesoImp;
          impattoAttacco = g.Fm * pesoImp;
        }
        if (ruolo === 'D' || ruolo === 'P') {
          difPersi += (g.Fm || 0) * pesoImp;
          impattoDifesa = g.Fm * pesoImp;
        }

        dettagli.push({
          ...a,
          ruolo,
          trovato: true,
          Fm: g.Fm, Pv: g.Pv, Gf: g.Gf, Ass: g.Ass,
          impattoAttacco: Math.round(impattoAttacco * 100) / 100,
          impattoDifesa: Math.round(impattoDifesa * 100) / 100,
        });
      });

      const pctGolPersi = stats.golTotali > 0 ? golPersi / stats.golTotali : 0;
      const pctFmPersa = stats.fmTotale > 0 ? fmPersi / stats.fmTotale : 0;
      const pesoAttaccoGrezzo = pctGolPersi * 0.5 + pctFmPersa * 0.5;
      const pesoAttacco = Math.min(0.35, Math.max(0, pesoAttaccoGrezzo));

      const pctDifPersa = stats.difTotale > 0 ? difPersi / stats.difTotale : 0;
      const pesoDifesa = Math.min(0.25, Math.max(0, pctDifPersa));

      return {
        pesoAttacco: Math.round(pesoAttacco * 1000) / 1000,
        pesoDifesa: Math.round(pesoDifesa * 1000) / 1000,
        dettagli,
        nAssenze: assenze.length,
        golPersi,
        assistPersi,
        fmPersi,
        difPersi,
      };
    },

    _calcolaTeamStatsDefault(squadra) {
      const normSquadra = normalizzaNomeSquadra(squadra);
      if (this._cacheTeamStats[normSquadra]) {
        return this._cacheTeamStats[normSquadra];
      }

      let golTotali = 0, fmTotale = 0, difTotale = 0, nGiocatori = 0;
      Object.values(this._mappa).forEach(g => {
        const normG = normalizzaNomeSquadra(g.squadra);
        if (normG !== normSquadra) return;
        nGiocatori++;
        golTotali += g.Gf || 0;
        if (g.Pv > 0) {
          fmTotale += g.Fm || 0;
          if (g.ruolo === 'D' || g.ruolo === 'P') difTotale += g.Fm || 0;
        }
      });

      const stats = {
        golTotali: Math.max(golTotali, 10),
        fmTotale: Math.max(fmTotale, nGiocatori * 5.5),
        difTotale: Math.max(difTotale, 10),
      };
      this._cacheTeamStats[normSquadra] = stats;
      return stats;
    },

    applicaAiLambda(lambdaHome, lambdaAway, homeTeam, awayTeam) {
      if (!lambdaHome || !lambdaAway) {
        return { lambdaHome: lambdaHome || 0, lambdaAway: lambdaAway || 0, impatto: null };
      }
      const h = this.calcolaPesi(homeTeam);
      const a = this.calcolaPesi(awayTeam);

      const lambdaHomeAdj = lambdaHome * (1 - h.pesoAttacco) * (1 + a.pesoDifesa);
      const lambdaAwayAdj = lambdaAway * (1 - a.pesoAttacco) * (1 + h.pesoDifesa);

      return {
        lambdaHome: Math.max(0.05, lambdaHomeAdj),
        lambdaAway: Math.max(0.05, lambdaAwayAdj),
        impatto: { home: h, away: a },
      };
    },

    riepilogo(squadra) {
      const assenze = this.getAssenze(squadra);
      const formazione = this.getFormazione(squadra);
      const parts = [];

      if (assenze.length > 0) {
        const chiave = assenze.filter(a => a.importanza === 'chiave').length;
        parts.push(`${assenze.length} assenti${chiave ? ` (${chiave} chiave)` : ''}`);
      }
      if (formazione) {
        const mod = formazione.modulo ? ` ${formazione.modulo}` : '';
        const nTit = (formazione.titolari || []).length;
        parts.push(`formazione${mod} (${nTit} titolari)`);
      }
      return parts.length ? parts.join(' · ') : 'Nessuna assenza';
    },

    debugSquadre() {
      console.log('📊 Chiavi originali assenze:', Object.keys(this.squadre));
      console.log('📊 Chiavi originali formazioni:', Object.keys(this.formazioni));
      console.log('📊 Chiavi originali form. probabili:', Object.keys(this._formazioniProbabili || {}));
      const test = ['Roma', 'Napoli', 'Inter', 'Juventus', 'Milan', 'Fiorentina'];
      test.forEach(t => {
        const chiave = this._trovaChiaveSquadra(t);
        const f = this.getFormazione(t);
        const pesi = this.calcolaPesi(t);
        console.log(`  "${t}" → ${chiave ? `"${chiave}"` : '❌'} | formazione: ${f ? f.modulo : '❌'} | pesi: att ${pesi.pesoAttacco} dif ${pesi.pesoDifesa} (${pesi.fonte || 'assenze'})`);
      });
    },

    debugGiocatori() {
      console.log('📊 Mappa giocatori:', Object.keys(this._mappa).length);
      console.log('🔍 Primi 5:', Object.values(this._mappa).slice(0, 5));
    },

    debugFormazioni() {
      console.log('📋 Formazioni_con_voti:', Object.keys(this.formazioni));
      console.log('📋 Formazioni probabili:', Object.keys(this._formazioniProbabili || {}));
    },

    debugPesi(squadra) {
      const pesi = this.calcolaPesi(squadra);
      console.log(`📊 Pesi ${squadra}:`, pesi);
      if (pesi.dettagli && pesi.dettagli.length > 0) {
        console.table(pesi.dettagli.map(d => ({
          nome: d.nome,
          ruolo: d.ruolo,
          prob: d.probabilità,
          assente: d.èAssente,
          pesoOff: d.pesoOff,
          pesoDif: d.pesoDif,
          nota: d.nota,
        })));
      }
    },
  };

  console.log('✅ Modulo assenze.js v5.0 caricato — calcolaPesi basata su formazioni + probabilità');

})();