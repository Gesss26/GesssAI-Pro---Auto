// ============================================================
// assenze.js - Modulo Assenze, Infortuni e Formazioni (v3.0)
// - Normalizzazione nomi squadre robusta
// - Cache team stats
// - Supporto formazioni (titolari, panchina, indisponibili, modulo)
// - Carica sia data/assenze.json sia data/formazioni_seriea.json
// ============================================================

(function () {
  'use strict';

  const PESI_IMPORTANZA = {
    chiave: 1.0,
    rotazione: 0.5,
    marginale: 0.2,
  };

  // Prefissi comuni nei nomi squadre italiani/europei
  // Ordinati dal più lungo al più corto per evitare match parziali errati
  const PREFISSI_SQUADRA = [
    'a.s. ', 's.s.c. ', 's.s. ', 'a.c. ', 'f.c. ', 'u.s. ',
    'asd ', 'ssd ', 'pol. ', 'pol ',
    'as ', 'ssc ', 'ss ', 'ac ', 'fc ', 'us ',
    'calcio ',
  ];

  const SUFFISSI_SQUADRA = [' calcio', ' fc', ' ac', ' ss', ' as', ' us'];

  /**
   * Normalizza il nome squadra per il match:
   * - trim + collapse spazi
   * - lowercase
   * - rimuove accenti
   * - rimuove prefissi comuni (dal più lungo)
   * - rimuove suffissi comuni
   */
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

  window.AssenzeDB = {
    aggiornato: null,
    squadre: {},
    formazioni: {},
    _mappa: {},
    _indiceSquadre: {},
    _indiceFormazioni: {},
    _cacheTeamStats: {},
    _caricato: false,

    async carica() {
      try {
        const r = await fetch('data/assenze.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        this.aggiornato = data.aggiornato || null;
        this.squadre = data.squadre || {};

        // Carica le formazioni generate da Fantacalcio.it
        try {
          const rf = await fetch('data/formazioni_seriea.json');
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

        this._costruisciIndice();
        this._caricato = true;
        console.log(
          '✅ Assenze caricate:',
          Object.keys(this.squadre).length,
          'squadre,',
          this._contaTotale(),
          'assenze,',
          Object.keys(this.formazioni).length,
          'formazioni'
        );
        window.dispatchEvent(new Event('assenze-updated'));
        return true;
      } catch (e) {
        console.warn('⚠️ Assenze non caricate:', e.message);
        this._caricato = false;
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
      this._cacheTeamStats = {};
      console.log('📇 Indice squadre:', this._indiceSquadre);
      console.log('📇 Indice formazioni:', this._indiceFormazioni);
    },

    _contaTotale() {
      return Object.values(this.squadre).reduce((s, arr) => s + arr.length, 0);
    },

    /**
     * Trova la chiave originale nel JSON che corrisponde al nome squadra.
     * Match esatto → match normalizzato → match parziale SOLO se >= 4 char.
     */
    _trovaChiaveSquadra(squadra, indice = null) {
      if (!squadra) return null;
      const idx = indice || this._indiceSquadre;
      const src = indice ? this.formazioni : this.squadre;

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

    // ============================================================
    // ASSENZE
    // ============================================================

    getAssenze(squadra) {
      if (!squadra) return [];
      const chiave = this._trovaChiaveSquadra(squadra);
      if (!chiave) return [];
      return this.squadre[chiave] || [];
    },

    getByImportanza(squadra, importanza) {
      return this.getAssenze(squadra).filter(a => a.importanza === importanza);
    },

    // ============================================================
    // FORMAZIONI
    // ============================================================

    getFormazione(squadra) {
      if (!squadra) return null;
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

    isTitolare(squadra, nomeGiocatore) {
      const titolari = this.getTitolari(squadra);
      const norm = (nomeGiocatore || '').toLowerCase().trim();
      return titolari.some(t => (t || '').toLowerCase().trim() === norm);
    },

    getAffidabilitaFormazione(squadra) {
      const f = this.getFormazione(squadra);
      if (!f || !Array.isArray(f.titolari)) return 0;
      return Math.min(1, f.titolari.length / 11);
    },

    getTitolariConStats(squadra) {
      const titolari = this.getTitolari(squadra);
      return titolari.map(nome => {
        const g = this.getGiocatore(nome);
        return g ? { ...g, titolare: true } : { nome, titolare: true, trovato: false };
      });
    },

    /**
     * Importa formazioni da una fonte esterna.
     * @param {Array} rows - [{ squadra, modulo, titolari: [], panchina: [], indisponibili: [] }]
     */
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
        };
        n++;
      });
      this._costruisciIndice();
      console.log(`✅ Importate ${n} formazioni`);
      window.dispatchEvent(new Event('formazioni-updated'));
    },

    // ============================================================
    // STATS GIOCATORI
    // ============================================================

    setStatsGiocatori(rows) {
      this._mappa = {};
      if (!Array.isArray(rows)) return;

      const trovaColonna = (row, nomiPossibili) => {
        const keys = Object.keys(row);
        for (const nome of nomiPossibili) {
          const found = keys.find(k => k.toLowerCase() === nome.toLowerCase());
          if (found) return found;
        }
        return null;
      };

      rows.forEach(row => {
        const colNome = trovaColonna(row, ['nome', 'name', 'giocatore']);
        if (!colNome) return;

        const nome = (row[colNome] || '').toString().trim();
        if (!nome) return;

        const colSquadra = trovaColonna(row, ['squadra', 'team', 'club']);
        const squadra = colSquadra ? (row[colSquadra] || '').toString().trim() : '';

        const colRuolo = trovaColonna(row, ['ruolo', 'role', 'r']);
        let ruolo = colRuolo ? (row[colRuolo] || '').toString().trim().toUpperCase() : '';
        if (ruolo.length > 1) {
          const mappaRuoli = {
            'PORTIERE': 'P', 'DIFENSORE': 'D',
            'CENTROCAMPISTA': 'C', 'ATTACCANTE': 'A'
          };
          ruolo = mappaRuoli[ruolo] || ruolo.charAt(0);
        }

        const getNum = (nomiPossibili) => {
          const col = trovaColonna(row, nomiPossibili);
          if (!col) return 0;
          const val = parseFloat(String(row[col]).replace(',', '.'));
          return isNaN(val) ? 0 : val;
        };

        this._mappa[nome] = {
          nome,
          squadra,
          ruolo,
          Pv: getNum(['pv', 'presenze', 'presenze voto']),
          Mv: getNum(['mv', 'media voto']),
          Fm: getNum(['fm', 'fantamedia', 'fanta media']),
          Gf: getNum(['gf', 'gol fatti', 'gol']),
          Gs: getNum(['gs', 'gol subiti']),
          Ass: getNum(['ass', 'assist']),
          Rp: getNum(['rp', 'rigori parati']),
          Rc: getNum(['rc', 'rigori causati']),
        };
      });

      this._cacheTeamStats = {};
      console.log('✅ AssenzeDB: mappati', Object.keys(this._mappa).length, 'giocatori');
    },

    getGiocatore(nome) {
      return this._mappa[nome] || null;
    },

    // ============================================================
    // CALCOLO PESI
    // ============================================================

    calcolaPesi(squadra, teamStats) {
      const assenze = this.getAssenze(squadra);
      const formazione = this.getFormazione(squadra);

      const tutteAssenze = [...assenze];
      if (formazione && Array.isArray(formazione.indisponibili)) {
        formazione.indisponibili.forEach(ind => {
          if (!tutteAssenze.some(a => a.nome === ind.nome)) {
            tutteAssenze.push(ind);
          }
        });
      }

      if (tutteAssenze.length === 0) {
        return { pesoAttacco: 0, pesoDifesa: 0, dettagli: [], nAssenze: 0 };
      }

      const stats = teamStats || this._calcolaTeamStatsDefault(squadra);

      let golPersi = 0, assistPersi = 0, fmPersi = 0, difPersi = 0;
      const dettagli = [];

      tutteAssenze.forEach(a => {
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
        nAssenze: tutteAssenze.length,
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

    // ============================================================
    // RIEPILOGHI E DEBUG
    // ============================================================

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
      console.log('📇 Indice squadre:', this._indiceSquadre);
      console.log('📇 Indice formazioni:', this._indiceFormazioni);
      const test = ['Roma', 'AS Roma', 'Napoli', 'SSC Napoli', 'Inter', 'FC Inter',
                    'Juventus', 'Milan', 'AC Milan', 'Fiorentina', 'Frosinone',
                    'Atalanta', 'Genoa', 'Venezia', 'Lecce', 'Udinese'];
      test.forEach(t => {
        const chiave = this._trovaChiaveSquadra(t);
        const f = this.getFormazione(t);
        console.log(`  "${t}" → ${chiave ? `"${chiave}" (${this.squadre[chiave].length} assenze)` : '❌ NON TROVATA'}${f ? ` | formazione ${f.modulo}` : ''}`);
      });
    },

    debugGiocatori() {
      console.log('📊 Mappa giocatori:', Object.keys(this._mappa).length);
      console.log('🔍 Primi 5:', Object.values(this._mappa).slice(0, 5));
    },

    debugFormazioni() {
      console.log('📋 Formazioni:', Object.keys(this.formazioni));
      Object.entries(this.formazioni).forEach(([sq, f]) => {
        console.log(`  ${sq}: modulo=${f.modulo}, titolari=${(f.titolari || []).length}, panchina=${(f.panchina || []).length}, indisponibili=${(f.indisponibili || []).length}`);
      });
    },
  };

  console.log('✅ Modulo assenze.js v3.0 caricato - formazioni + normalizzazione robusta + cache');
})();