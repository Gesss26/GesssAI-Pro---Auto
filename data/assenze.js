// ============================================================
// assenze.js - Modulo Assenze e Infortuni (v2.1)
// ✅ Fix: normalizzazione nomi squadre (Roma = AS Roma = Roma )
// ✅ Fix: mappa giocatori più robusta (accetta varianti nomi colonne)
// ✅ Fix: normalizzazione nomi squadre anche per il match giocatori
// ============================================================

(function () {
  'use strict';

  const PESI_IMPORTANZA = {
    chiave: 1.0,
    rotazione: 0.5,
    marginale: 0.2,
  };

  // Prefissi comuni nei nomi squadre italiani/europei
  const PREFISSI_SQUADRA = [
    'as ', 'a.s. ', 'ssc ', 's.s.c. ', 'ss ', 's.s. ',
    'ac ', 'a.c. ', 'fc ', 'f.c. ', 'us ', 'u.s. ',
    'ssd ', 'asd ', 'pol. ', 'pol ', 'calcio ',
    'hellas ', 'ss lazio', 'as roma',
  ];

  /**
   * Normalizza il nome squadra per il match:
   * - trim + collapse spazi
   * - lowercase
   * - rimuove prefissi comuni
   * - rimuove accenti
   */
  const normalizzaNomeSquadra = (nome) => {
    if (!nome) return '';
    let n = nome.toString().trim().toLowerCase();
    // Rimuovi accenti
    n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Collassa spazi multipli
    n = n.replace(/\s+/g, ' ').trim();
    // Rimuovi prefissi comuni
    for (const pref of PREFISSI_SQUADRA) {
      if (n.startsWith(pref)) {
        n = n.substring(pref.length).trim();
        break;
      }
    }
    // Rimuovi suffissi tipo "calcio", "fc"
    n = n.replace(/\s+(calcio|fc|ac|ss|as)$/i, '').trim();
    return n;
  };

  window.AssenzeDB = {
    aggiornato: null,
    squadre: {},
    _mappa: {},
    _indiceSquadre: {},   // mappa normalizzata → chiave originale
    _caricato: false,

    async carica() {
      try {
        const r = await fetch('data/assenze.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        this.aggiornato = data.aggiornato || null;
        this.squadre = data.squadre || {};
        this._costruisciIndice();
        this._caricato = true;
        console.log(
          '✅ Assenze caricate:',
          Object.keys(this.squadre).length,
          'squadre,',
          this._contaTotale(),
          'assenze'
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
        this._indiceSquadre[normalizzata] = chiaveOriginale;
      });
      console.log('📇 Indice squadre (normalizzato → originale):', this._indiceSquadre);
    },

    _contaTotale() {
      return Object.values(this.squadre).reduce((s, arr) => s + arr.length, 0);
    },

    /**
     * Trova la chiave originale nel JSON che corrisponde al nome squadra.
     * Tenta: match esatto → match normalizzato → match parziale.
     */
    _trovaChiaveSquadra(squadra) {
      if (!squadra) return null;
      // 1. Match esatto
      if (this.squadre[squadra] !== undefined) return squadra;
      // 2. Match normalizzato
      const norm = normalizzaNomeSquadra(squadra);
      if (this._indiceSquadre[norm]) return this._indiceSquadre[norm];
      // 3. Match parziale (include)
      const chiavi = Object.keys(this.squadre);
      for (const k of chiavi) {
        const normK = normalizzaNomeSquadra(k);
        if (normK === norm) return k;
        if (normK.includes(norm) || norm.includes(normK)) return k;
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

    setStatsGiocatori(rows) {
      this._mappa = {};
      if (!Array.isArray(rows)) return;
      
      // Trova i nomi delle colonne (case-insensitive)
      const trovaColonna = (row, nomiPossibili) => {
        for (const nome of nomiPossibili) {
          for (const key of Object.keys(row)) {
            if (key.toLowerCase() === nome.toLowerCase()) return key;
          }
        }
        return null;
      };

      rows.forEach(row => {
        // Trova la colonna "Nome" (può essere "Nome", "nome", "NOME")
        const colNome = trovaColonna(row, ['nome', 'name', 'giocatore']);
        if (!colNome) return;
        
        const nome = (row[colNome] || '').toString().trim();
        if (!nome) return;
        
        // Trova la colonna "Squadra" (può essere "Squadra", "squadra", "Team", ecc.)
        const colSquadra = trovaColonna(row, ['squadra', 'team', 'club']);
        const squadra = colSquadra ? (row[colSquadra] || '').toString().trim() : '';
        
        // Trova la colonna "R" (ruolo)
        const colRuolo = trovaColonna(row, ['r', 'ruolo', 'role']);
        const ruolo = colRuolo ? (row[colRuolo] || '').toString().trim() : '';
        
        // Funzione helper per trovare un valore numerico
        const getNum = (nomiPossibili) => {
          const col = trovaColonna(row, nomiPossibili);
          if (!col) return 0;
          const val = parseFloat(row[col]);
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
      
      console.log('✅ AssenzeDB: mappati', Object.keys(this._mappa).length, 'giocatori');
      
      // Debug: mostra i primi 3 giocatori mappati
      const primiTre = Object.values(this._mappa).slice(0, 3);
      if (primiTre.length > 0) {
        console.log('🔍 Esempio giocatori mappati:', primiTre);
      }
    },

    getGiocatore(nome) {
      return this._mappa[nome] || null;
    },

    calcolaPesi(squadra, teamStats) {
      const assenze = this.getAssenze(squadra);
      if (assenze.length === 0) {
        return { pesoAttacco: 0, pesoDifesa: 0, dettagli: [], nAssenze: 0 };
      }

      const stats = teamStats || this._calcolaTeamStatsDefault(squadra);

      let golPersi = 0;
      let assistPersi = 0;
      let fmPersi = 0;
      let difPersi = 0;
      const dettagli = [];

      assenze.forEach(a => {
        const g = this.getGiocatore(a.nome);
        const pesoImp = PESI_IMPORTANZA[a.importanza] || 0.5;

        if (!g) {
          dettagli.push({ ...a, trovato: false, impattoAttacco: 0, impattoDifesa: 0 });
          return;
        }

        let impattoAttacco = 0;
        let impattoDifesa = 0;

        if (a.ruolo === 'A' || a.ruolo === 'C') {
          golPersi += (g.Gf || 0) * pesoImp;
          assistPersi += (g.Ass || 0) * pesoImp;
          fmPersi += (g.Fm || 0) * pesoImp;
          impattoAttacco = g.Fm * pesoImp;
        }

        if (a.ruolo === 'D' || a.ruolo === 'P') {
          difPersi += (g.Fm || 0) * pesoImp;
          impattoDifesa = g.Fm * pesoImp;
        }

        dettagli.push({
          ...a,
          trovato: true,
          Fm: g.Fm,
          Pv: g.Pv,
          Gf: g.Gf,
          Ass: g.Ass,
          impattoAttacco: Math.round(impattoAttacco * 100) / 100,
          impattoDifesa: Math.round(impattoDifesa * 100) / 100,
        });
      });

      const pctGolPersi = stats.golTotali > 0 ? golPersi / stats.golTotali : 0;
      const pctFmPersa = stats.fmTotale > 0 ? fmPersi / stats.fmTotale : 0;
      const pesoAttaccoGrezzo = pctGolPersi * 0.5 + pctFmPersa * 0.5;
      const pesoAttacco = Math.min(0.35, pesoAttaccoGrezzo);

      const pctDifPersa = stats.difTotale > 0 ? difPersi / stats.difTotale : 0;
      const pesoDifesa = Math.min(0.25, pctDifPersa);

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
      let golTotali = 0;
      let fmTotale = 0;
      let difTotale = 0;
      let nGiocatori = 0;
      // ⭐ Usa la normalizzazione anche qui
      const normSquadra = normalizzaNomeSquadra(squadra);
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
      return {
        golTotali: Math.max(golTotali, 10),
        fmTotale: Math.max(fmTotale, nGiocatori * 5.5),
        difTotale: Math.max(difTotale, 10),
      };
    },

    applicaAiLambda(lambdaHome, lambdaAway, homeTeam, awayTeam) {
      const h = this.calcolaPesi(homeTeam);
      const a = this.calcolaPesi(awayTeam);

      const lambdaHomeAdj = lambdaHome * (1 - h.pesoAttacco) * (1 + a.pesoDifesa);
      const lambdaAwayAdj = lambdaAway * (1 - a.pesoAttacco) * (1 + h.pesoDifesa);

      return {
        lambdaHome: lambdaHomeAdj,
        lambdaAway: lambdaAwayAdj,
        impatto: { home: h, away: a },
      };
    },

    riepilogo(squadra) {
      const assenze = this.getAssenze(squadra);
      if (assenze.length === 0) return 'Nessuna assenza';
      const chiave = assenze.filter(a => a.importanza === 'chiave').length;
      return `${assenze.length} assenti${chiave ? ` (${chiave} chiave)` : ''}`;
    },

    // ⭐ Debug: mostra tutte le chiavi e l'indice normalizzato
    debugSquadre() {
      console.log('📊 Chiavi originali nel JSON:', Object.keys(this.squadre));
      console.log('📇 Indice normalizzato:', this._indiceSquadre);
      const test = ['Roma', 'AS Roma', 'Napoli', 'SSC Napoli', 'Inter', 'FC Inter', 'Juventus', 'Milan', 'AC Milan'];
      test.forEach(t => {
        const chiave = this._trovaChiaveSquadra(t);
        console.log(`  "${t}" → ${chiave ? `"${chiave}" (${this.squadre[chiave].length} assenze)` : '❌ NON TROVATA'}`);
      });
    },

    debugGiocatori() {
      console.log('📊 Mappa giocatori:', Object.keys(this._mappa).length);
      const primiCinque = Object.values(this._mappa).slice(0, 5);
      if (primiCinque.length > 0) {
        console.log('🔍 Primi 5 giocatori mappati:', primiCinque);
      } else {
        console.log('❌ Nessun giocatore mappato. Verifica il formato del file Excel (colonne Nome, Squadra, R, Pv, Mv, Fm, Gf, Ass)');
      }
    },
  };

  console.log('✅ Modulo assenze.js v2.1 caricato - normalizzazione nomi squadre + mappa giocatori robusta');
})();