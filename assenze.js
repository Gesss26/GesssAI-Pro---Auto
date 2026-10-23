// ============================================================
// assenze.js - Modulo Assenze e Infortuni
// Legge data/assenze.json e calcola i pesi di impatto sul Dixon-Coles
// ============================================================

(function () {
  'use strict';

  const PESI_IMPORTANZA = {
    chiave: 1.0,
    rotazione: 0.5,
    marginale: 0.2,
  };

  window.AssenzeDB = {
    aggiornato: null,
    squadre: {},
    _mappa: {},
    _caricato: false,

    async carica() {
      try {
        const r = await fetch('data/assenze.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        this.aggiornato = data.aggiornato || null;
        this.squadre = data.squadre || {};
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

    _contaTotale() {
      return Object.values(this.squadre).reduce((s, arr) => s + arr.length, 0);
    },

    getAssenze(squadra) {
      if (!squadra) return [];
      return this.squadre[squadra] || [];
    },

    getByImportanza(squadra, importanza) {
      return this.getAssenze(squadra).filter(a => a.importanza === importanza);
    },

    setStatsGiocatori(rows) {
      this._mappa = {};
      if (!Array.isArray(rows)) return;
      rows.forEach(row => {
        const nome = (row.Nome || row.nome || '').toString().trim();
        if (!nome) return;
        this._mappa[nome] = {
          nome,
          squadra: (row.Squadra || row.squadra || '').toString().trim(),
          ruolo: (row.R || row.r || '').toString().trim(),
          Pv: parseFloat(row.Pv || row.pv || 0) || 0,
          Mv: parseFloat(row.Mv || row.mv || 0) || 0,
          Fm: parseFloat(row.Fm || row.fm || 0) || 0,
          Gf: parseFloat(row.Gf || row.gf || 0) || 0,
          Gs: parseFloat(row.Gs || row.gs || 0) || 0,
          Ass: parseFloat(row.Ass || row.ass || 0) || 0,
          Rp: parseFloat(row.Rp || row.rp || 0) || 0,
          Rc: parseFloat(row.Rc || row.rc || 0) || 0,
        };
      });
      console.log('✅ AssenzeDB: mappati', Object.keys(this._mappa).length, 'giocatori');
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
      Object.values(this._mappa).forEach(g => {
        if (g.squadra !== squadra) return;
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
  };

  console.log('✅ Modulo assenze.js caricato');
})();