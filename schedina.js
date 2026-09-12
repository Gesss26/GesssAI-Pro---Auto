// ============================================================
// COMPONENTE SCHEDINA - MOSTRA LE STESSE PARTITE DEL PALINSESTO
// + ESCLUSIONE PARTITE GIÀ INIZIATE
// + SINCRONIZZATO CON IL RANGE GIORNI DEL PALINSESTO
// + SINCRONIZZATO CON IL FILTRO CAMPIONATI GLOBALE (Palinsesto)
// + ORDINAMENTO: DATA -> PERCENTUALE (DECRESCENTE)
// + TOP 3 GIOCATE COME IN HOME (filtra in base alle giocate scelte)
// + QUOTA BSD accanto a ogni giocata + TOTALI QUOTA per medaglia
// ============================================================

const SchedinaComponent = ({ 
  matches, 
  championships, 
  selectedFamiglie, 
  onSelectMatch, 
  showAlert,
  palinsestoGiorniRange = 1,
  renderGiorniButtons,
  renderChampFilters,
  CHAMPIONSHIP_LIST
}) => {
  // Accesso sicuro alle funzioni globali
  const getChampColor = window.getChampColor || (() => '#95a5a6');
  const computeMatchStats = window.computeMatchStats;
  const getMultigolRange = window.getMultigolRange;
  const getBestBetForFamily = window.getBestBetForFamily;
  const getPercentualeClasse = window.getPercentualeClasse;
  const normalizeDate = window.normalizeDate;
  const getTodayStr = window.getTodayStr;
  const addDaysToDateStr = window.addDaysToDateStr;
  const formatDateEU = window.formatDateEU;

  // ⭐ GIORNI RANGE GLOBALE (letto dal Palinsesto)
  const { giorni: giorniRange, setGiorni: setGiorniRange } =
    window.FiltriCampionati.useGiorniRange();

  // ⭐ FILTRO CAMPIONATI GLOBALE (letto dal Palinsesto)
  const {
    filtro: campionatiSelezionatiObj,
    toggleCampionato,
    selezionaTutti: selezionaTuttiCampionati,
    deselezionaTutti: deselezionaTuttiCampionati,
    campionatiAttivi,
  } = window.FiltriCampionati.useFiltroCampionati();

  const campionatiSelezionati = campionatiAttivi;

  // Stato locale della schedina
  const [partiteSelezionate, setPartiteSelezionate] = useState([]);
  const [schedinaCreata, setSchedinaCreata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [giocateSelezionate, setGiocateSelezionate] = useState(['tutte']);
  const [showSchedinaModal, setShowSchedinaModal] = useState(false);
  const [casualitaLevel, setCasualitaLevel] = useState(30);
  const [schedineSalvate, setSchedineSalvate] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ft_schedine_salvate') || '[]');
    } catch { return []; }
  });
  const [numeroPartiteDaSelezionare, setNumeroPartiteDaSelezionare] = useState(5);
  const [filtroOrario, setFiltroOrario] = useState('dopo_ora');

  // Funzione per mescolare un array
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Funzione per ordinare le partite per data e ora crescente
  const ordinaPartitePerDataOra = (partite) => {
    return [...partite].sort((a, b) => {
      const dateA = normalizeDate(a.data);
      const dateB = normalizeDate(b.data);
      
      if (dateA && dateB && dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      
      const oraA = a.ora || '00:00';
      const oraB = b.ora || '00:00';
      
      const parseOra = (ora) => {
        if (ora === 'TBD' || ora === 'N/D' || !ora) return { h: 99, m: 99 };
        const parts = ora.split(':');
        if (parts.length < 2) return { h: 99, m: 99 };
        return { 
          h: parseInt(parts[0], 10) || 99, 
          m: parseInt(parts[1], 10) || 99 
        };
      };
      
      const oraAParsed = parseOra(oraA);
      const oraBParsed = parseOra(oraB);
      
      if (oraAParsed.h !== oraBParsed.h) {
        return oraAParsed.h - oraBParsed.h;
      }
      return oraAParsed.m - oraBParsed.m;
    });
  };

  // ============================================================
  // OTTIENI LE PARTITE - STESSA LOGICA DEL PALINSESTO
  // ============================================================
  const getPartiteDisponibili = useCallback(() => {
    const todayStr = getTodayStr();
    const maxDateStr = addDaysToDateStr(todayStr, giorniRange);
    
    let partite = matches.filter(m => m.stato === 'Futura');
    
    if (campionatiSelezionati.length > 0) {
      partite = partite.filter(m => campionatiSelezionati.includes(m.campionato));
    } else {
      partite = [];
    }
    
    partite = partite.filter(m => {
      if (!m.data) return false;
      const normalized = normalizeDate(m.data);
      if (!normalized) return false;
      return normalized >= todayStr && normalized <= maxDateStr;
    });
    
    // Escludi partite già iniziate
    partite = partite.filter(m => {
      if (!m.ora || m.ora === 'TBD' || m.ora === 'N/D') return true;
      const matchDate = normalizeDate(m.data);
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr2 = getTodayStr();
      if (matchDate !== todayStr2) return true;
      const timeParts = m.ora.split(':');
      if (timeParts.length < 2) return true;
      const matchHour = parseInt(timeParts[0], 10);
      const matchMinutes = parseInt(timeParts[1], 10);
      if (isNaN(matchHour) || isNaN(matchMinutes)) return true;
      const matchTotalMinutes = matchHour * 60 + matchMinutes;
      return matchTotalMinutes > currentTotalMinutes;
    });
    
    if (filtroOrario === 'dopo_ora') {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      partite = partite.filter(m => {
        if (!m.ora || m.ora === 'TBD' || m.ora === 'N/D') return true;
        const timeParts = m.ora.split(':');
        if (timeParts.length < 2) return true;
        const matchHour = parseInt(timeParts[0], 10);
        const matchMinutes = parseInt(timeParts[1], 10);
        if (isNaN(matchHour) || isNaN(matchMinutes)) return true;
        const matchTotalMinutes = matchHour * 60 + matchMinutes;
        const matchDate = normalizeDate(m.data);
        if (matchDate === todayStr) {
          return matchTotalMinutes > currentTotalMinutes;
        }
        return true;
      });
    }
    
    return partite;
  }, [matches, campionatiSelezionati, giorniRange, filtroOrario]);

  // ============================================================
  // FUNZIONE CALCOLA GG - NG
  // ============================================================
  const calcolaGG_NG = (stats) => {
    if (stats.error) return null;
    
    const { homeGames, awayGames } = stats;
    const allGames = [...homeGames, ...awayGames];
    const uniqueGames = Array.from(new Map(allGames.map(g => [g.id, g])).values());
    
    if (uniqueGames.length === 0) return null;
    
    let gg = 0;
    let ng = 0;
    
    uniqueGames.forEach(g => {
      if (g.golCasa > 0 && g.golOspite > 0) {
        gg++;
      } else {
        ng++;
      }
    });
    
    const total = uniqueGames.length;
    const pctGG = Math.round((gg / total) * 100);
    const pctNG = Math.round((ng / total) * 100);
    
    const migliore = pctGG > pctNG ? 'GG' : 'NG';
    const pctMigliore = Math.max(pctGG, pctNG);
    
    return {
      giocata: migliore,
      label: migliore === 'GG' ? 'Goal-Goal' : 'No Goal',
      pct: pctMigliore,
      isBomb: pctMigliore >= 90,
      familyId: 'gg_ng',
      familyLabel: 'GG - NG',
      familyIcon: '⚽',
      gg: pctGG,
      ng: pctNG
    };
  };

  // ============================================================
  // CALCOLA TOP 3 GIOCATE PER PARTITA
  // ============================================================
  const calcolaTop3GiocatePerPartita = (match) => {
    const stats = computeMatchStats(match, matches);
    if (stats.error) return { top3: [], score: 0, tutteGiocate: [] };

    stats._allMatches = matches;
    stats._homeTeam = match.casa;
    stats._awayTeam = match.ospiti;

    const homeMG = stats.homeMG || {};
    const awayMG = stats.awayMG || {};
    const mgTot = stats.mgTot || {};
    const homeRange = getMultigolRange(match.casa, matches);
    const awayRange = getMultigolRange(match.ospiti, matches);

    const famiglieDaAnalizzare = giocateSelezionate.includes('tutte') || giocateSelezionate.length === 0
      ? Object.keys(window.FAMIGLIE_GIOCATE || {})
      : giocateSelezionate;

    const tutte = [];

    famiglieDaAnalizzare.forEach(familyId => {
      const family = window.FAMIGLIE_GIOCATE[familyId];
      if (!family) return;

      let best = null;

      if (familyId === 'gg_ng') {
        const ggNgResult = calcolaGG_NG(stats);
        if (ggNgResult) {
          best = {
            ...ggNgResult,
            familyId: 'gg_ng',
            familyLabel: window.FAMIGLIE_GIOCATE['gg_ng']?.label || 'GG - NG',
            familyIcon: window.FAMIGLIE_GIOCATE['gg_ng']?.icon || '⚽'
          };
        }
      } else {
        const bestBet = getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
        if (bestBet && bestBet.pct > 0) {
          best = {
            ...bestBet,
            familyId: familyId,
            familyLabel: window.FAMIGLIE_GIOCATE[familyId]?.label || familyId,
            familyIcon: window.FAMIGLIE_GIOCATE[familyId]?.icon || '🎯'
          };
        }
      }

      if (best && best.pct > 0) {
        tutte.push(best);
      }
    });

    tutte.sort((a, b) => b.pct - a.pct);

    const top3 = tutte.slice(0, 3);
    const score = top3.length > 0
      ? Math.round(top3.reduce((s, g) => s + g.pct, 0) / top3.length)
      : 0;

    return {
      top3: top3,
      score: score,
      tutteGiocate: tutte
    };
  };

  // ============================================================
  // PARTITE DISPONIBILI CON ORDINAMENTO
  // ============================================================
  const partiteDisponibili = useMemo(() => {
    const partite = getPartiteDisponibili();
    const partiteConDettagli = partite.map(m => {
      const dettagli = calcolaTop3GiocatePerPartita(m);
      return {
        ...m,
        top3: dettagli.top3,
        score: dettagli.score,
        tutteGiocate: dettagli.tutteGiocate || []
      };
    });
    
    return partiteConDettagli.sort((a, b) => {
      const dateA = normalizeDate(a.data);
      const dateB = normalizeDate(b.data);
      
      if (dateA && dateB && dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      
      if (a.score !== b.score) {
        return (b.score || 0) - (a.score || 0);
      }
      
      const oraA = a.ora || '00:00';
      const oraB = b.ora || '00:00';
      return oraA.localeCompare(oraB);
    });
  }, [getPartiteDisponibili, giocateSelezionate, selectedFamiglie]);

  // ============================================================
  // CALCOLO TOTALI QUOTA PER MEDAGLIA
  // ============================================================
  const calcolaTotaliQuotaPerMedaglia = (schedina) => {
    if (!schedina || !schedina.partite) return null;
    
    const perMedaglia = { '🥇': [], '🥈': [], '🥉': [] };
    const nomiMedaglie = ['🥇', '🥈', '🥉'];
    
    schedina.partite.forEach(m => {
      const top3 = m.top3 || (m.giocata ? [m.giocata] : []);
      top3.forEach((g, i) => {
        if (i > 2) return;
        const quota = window.getQuotaForGiocata
          ? window.getQuotaForGiocata(m.id, g.familyId, g.giocata)
          : null;
        perMedaglia[nomiMedaglie[i]].push({
          matchId: m.id,
          label: g.label,
          pct: g.pct,
          quota: quota ? quota.decimal_odds : null,
        });
      });
    });
    
    const calcolaTotale = (arr) => {
      const conQuota = arr.filter(x => x.quota !== null);
      if (conQuota.length === 0) return { totale: null, count: 0, senza: arr.length };
      const prodotto = conQuota.reduce((acc, x) => acc * x.quota, 1);
      return {
        totale: prodotto,
        count: conQuota.length,
        senza: arr.length - conQuota.length,
      };
    };
    
    return {
      '🥇': calcolaTotale(perMedaglia['🥇']),
      '🥈': calcolaTotale(perMedaglia['🥈']),
      '🥉': calcolaTotale(perMedaglia['🥉']),
    };
  };

  // ============================================================
  // SELEZIONE NUMERO PARTITE
  // ============================================================
  const selezionaNumeroPartite = (n) => {
    if (partiteDisponibili.length === 0) {
      showAlert('info', 'ℹ️ Nessuna partita disponibile.');
      return;
    }
    
    const numeroDaPrendere = Math.min(n, partiteDisponibili.length, 10);
    let messaggioExtra = '';
    
    let migliori;
    if (casualitaLevel > 80) {
      const shuffled = shuffleArray(partiteDisponibili);
      migliori = shuffled.slice(0, numeroDaPrendere);
      messaggioExtra = ` 🎲🎲🎲 (scelte casualmente!)`;
    } else {
      migliori = partiteDisponibili.slice(0, numeroDaPrendere);
    }
    
    const miglioriOrdinate = ordinaPartitePerDataOra(migliori);
    setPartiteSelezionate(miglioriOrdinate);
    showAlert('success', `✅ Selezionate ${miglioriOrdinate.length} partite!${messaggioExtra}`);
  };

  // RIGENERA
  const rigeneraSchedina = () => {
    if (partiteDisponibili.length === 0) {
      showAlert('info', 'ℹ️ Nessuna partita disponibile per rigenerare la schedina.');
      return;
    }

    const numeroPartiteDesiderato = Math.min(numeroPartiteDaSelezionare, partiteDisponibili.length, 10);
    
    if (casualitaLevel > 80) {
      const shuffled = shuffleArray(partiteDisponibili);
      const selezionate = shuffled.slice(0, numeroPartiteDesiderato);
      const selezionateOrdinate = ordinaPartitePerDataOra(selezionate);
      setPartiteSelezionate(selezionateOrdinate);
      showAlert('success', `🎲🎲🎲 CASUALITÀ ESTREMA! ${selezionateOrdinate.length} partite selezionate a caso!`);
      return;
    }

    const partitePerScore = {};
    partiteDisponibili.forEach(m => {
      const score = m.score;
      if (!partitePerScore[score]) partitePerScore[score] = [];
      partitePerScore[score].push(m);
    });

    const scores = Object.keys(partitePerScore).map(Number).sort((a, b) => b - a);
    let selezionate = [];
    
    for (const score of scores) {
      if (selezionate.length >= numeroPartiteDesiderato) break;
      
      let partiteGruppo = partitePerScore[score];
      if (partiteGruppo.length === 0) continue;
      
      const postiDisponibili = numeroPartiteDesiderato - selezionate.length;
      let shuffled = shuffleArray(partiteGruppo);
      
      let daPrendereCount;
      if (casualitaLevel > 50) {
        const percentuale = 0.5 + (casualitaLevel - 50) / 100;
        daPrendereCount = Math.min(
          Math.ceil(partiteGruppo.length * percentuale),
          postiDisponibili
        );
        daPrendereCount = Math.max(1, daPrendereCount);
      } else {
        daPrendereCount = Math.min(partiteGruppo.length, postiDisponibili);
      }
      
      const daPrendere = shuffled.slice(0, daPrendereCount);
      selezionate = [...selezionate, ...daPrendere];
    }
    
    if (selezionate.length < numeroPartiteDesiderato) {
      const idsSelezionati = new Set(selezionate.map(m => m.id));
      let rimanenti = partiteDisponibili.filter(m => !idsSelezionati.has(m.id));
      rimanenti = shuffleArray(rimanenti);
      const postiDisponibili = numeroPartiteDesiderato - selezionate.length;
      const daPrendere = rimanenti.slice(0, postiDisponibili);
      selezionate = [...selezionate, ...daPrendere];
    }
    
    if (selezionate.length < 2) {
      const shuffledAll = shuffleArray(partiteDisponibili);
      const daPrendereCount = Math.min(numeroPartiteDesiderato, partiteDisponibili.length);
      selezionate = shuffledAll.slice(0, daPrendereCount);
    }
    
    const selezionateOrdinate = ordinaPartitePerDataOra(selezionate);
    setPartiteSelezionate(selezionateOrdinate);
    
    let emojiCasualita = '🎲';
    let messaggioCasualita = '';
    if (casualitaLevel > 80) {
      emojiCasualita = '🎲🎲🎲';
      messaggioCasualita = `🎲🎲🎲 CASUALITÀ ESTREMA! ${selezionateOrdinate.length} partite selezionate a caso!`;
    } else if (casualitaLevel > 50) {
      emojiCasualita = '🎲🎲';
      messaggioCasualita = `${selezionateOrdinate.length} partite selezionate con mix casuale`;
    } else {
      messaggioCasualita = `${selezionateOrdinate.length} partite selezionate (poche variazioni)`;
    }
    
    showAlert('success', `🔄 Schedina rigenerata! ${messaggioCasualita} ${emojiCasualita} Livello: ${casualitaLevel}%`);
  };

  // SELEZIONE CASUALE
  const selezionaCasuale = () => {
    if (partiteDisponibili.length === 0) {
      showAlert('info', 'ℹ️ Nessuna partita disponibile.');
      return;
    }
    
    const numeroPartiteDesiderato = Math.min(numeroPartiteDaSelezionare, partiteDisponibili.length, 10);
    const shuffled = shuffleArray(partiteDisponibili);
    const selezionate = shuffled.slice(0, numeroPartiteDesiderato);
    const selezionateOrdinate = ordinaPartitePerDataOra(selezionate);
    setPartiteSelezionate(selezionateOrdinate);
    
    let messaggio = `🎲 ${selezionateOrdinate.length} partite selezionate casualmente!`;
    if (casualitaLevel > 80) {
      messaggio = `🎲🎲🎲 CASUALITÀ ESTREMA! ${selezionateOrdinate.length} partite selezionate a caso!`;
    }
    showAlert('success', messaggio);
  };

  const togglePartita = (match) => {
    setPartiteSelezionate(prev => {
      const exists = prev.find(m => m.id === match.id);
      let nuovePartite;
      if (exists) {
        nuovePartite = prev.filter(m => m.id !== match.id);
      } else {
        if (prev.length >= 10) {
          showAlert('error', '⚠️ Massimo 10 partite per schedina!');
          return prev;
        }
        nuovePartite = [...prev, match];
      }
      return ordinaPartitePerDataOra(nuovePartite);
    });
  };

  // CREA SCHEDINA
  const creaSchedina = () => {
    if (partiteSelezionate.length < 2) {
      showAlert('error', '⚠️ Seleziona almeno 2 partite per creare la schedina!');
      return;
    }
    
    setLoading(true);
    const partiteOrdinate = ordinaPartitePerDataOra(partiteSelezionate);
    
    const schedina = partiteOrdinate.map(m => {
      const dettagli = calcolaTop3GiocatePerPartita(m);
      return {
        ...m,
        top3: dettagli.top3,
        score: dettagli.score,
        giocata: dettagli.top3[0] || null,
        pct: dettagli.top3[0]?.pct || 0
      };
    });
    
    const totaleScore = schedina.reduce((s, m) => s + (m.score || 0), 0);
    const mediaScore = Math.round(totaleScore / schedina.length);
    
    const datePartite = schedina.map(m => normalizeDate(m.data)).filter(d => d);
    const dataInizio = datePartite.length > 0 ? datePartite[0] : 'N/D';
    const dataFine = datePartite.length > 0 ? datePartite[datePartite.length - 1] : 'N/D';
    
    const nuovaSchedina = {
      id: Date.now().toString(36),
      partite: schedina,
      totale: totaleScore,
      media: mediaScore,
      numPartite: schedina.length,
      data: new Date().toISOString(),
      dataFormattata: new Date().toLocaleString('it-IT'),
      giocateSelezionate: [...giocateSelezionate],
      campionatiSelezionati: [...campionatiSelezionati],
      timestamp: new Date().toLocaleString('it-IT'),
      dataInizio: dataInizio,
      dataFine: dataFine,
      casualitaLevel: casualitaLevel,
      giorniRange: giorniRange
    };
    
    setSchedinaCreata(nuovaSchedina);
    
    const salvate = [...schedineSalvate];
    salvate.push(nuovaSchedina);
    localStorage.setItem('ft_schedine_salvate', JSON.stringify(salvate));
    setSchedineSalvate(salvate);
    
    setLoading(false);
    showAlert('success', `🎯 Schedina creata! ${schedina.length} partite dal ${formatDateEU(dataInizio)} al ${formatDateEU(dataFine)} - Media score: ${mediaScore}%`);
    setShowSchedinaModal(true);
  };

  const resettaSchedina = () => {
    setPartiteSelezionate([]);
    setSchedinaCreata(null);
    showAlert('info', '🔄 Schedina resettata');
  };

  const toggleGiocata = (giocataId) => {
    setGiocateSelezionate(prev => {
      if (giocataId === 'tutte') {
        return ['tutte'];
      }
      
      const newSelection = prev.includes(giocataId) 
        ? prev.filter(id => id !== giocataId)
        : [...prev.filter(id => id !== 'tutte'), giocataId];
      
      if (newSelection.length === 0) {
        return ['tutte'];
      }
      
      return newSelection;
    });
  };

  const selezionaTutteGiocate = () => {
    setGiocateSelezionate(['tutte']);
  };

  const deselezionaTutteGiocate = () => {
    setGiocateSelezionate([]);
    setTimeout(() => {
      setGiocateSelezionate(prev => prev.length === 0 ? ['tutte'] : prev);
    }, 0);
  };

  // ============================================================
  // FORMATTAZIONE SCHEDINA PER CONDIVISIONE
  // ============================================================
  const formatSchedinaText = (schedina) => {
    if (!schedina || !schedina.partite) {
      console.error('❌ Schedina non valida per la formattazione');
      return '🎯 Errore nella generazione della schedina';
    }
    
    const lines = [];
    lines.push('🎯 *SCHEDINA GesssAI-Pro*');
    lines.push(`📅 ${schedina.dataFormattata || new Date().toLocaleString('it-IT')}`);
    lines.push(`📊 ${schedina.numPartite} partite • Media: ${schedina.media}%`);
    
    if (schedina.casualitaLevel > 80) {
      lines.push(`🎲🎲🎲 CASUALITÀ ESTREMA: ${schedina.casualitaLevel}%`);
    } else if (schedina.casualitaLevel > 50) {
      lines.push(`🎲🎲 Casualità media: ${schedina.casualitaLevel}%`);
    }
    
    if (schedina.dataInizio && schedina.dataFine) {
      const inizio = formatDateEU(schedina.dataInizio);
      const fine = formatDateEU(schedina.dataFine);
      if (inizio === fine) {
        lines.push(`📆 Data: ${inizio}`);
      } else {
        lines.push(`📆 Dal ${inizio} al ${fine}`);
      }
    }
    
    if (schedina.giorniRange !== undefined) {
      lines.push(`📅 Range giorni: ${schedina.giorniRange} giorno/i`);
    }
    
    if (schedina.campionatiSelezionati && schedina.campionatiSelezionati.length > 0) {
      const champsDisplay = schedina.campionatiSelezionati.length === championships.length 
        ? 'Tutti' 
        : schedina.campionatiSelezionati.join(', ');
      lines.push(`🏆 Campionati: ${champsDisplay}`);
    }
    
    if (schedina.giocateSelezionate && schedina.giocateSelezionate.length > 0) {
      const giocateDisplay = schedina.giocateSelezionate.includes('tutte')
        ? '⭐ Tutte'
        : schedina.giocateSelezionate.map(id => window.FAMIGLIE_GIOCATE[id]?.label || id).join(', ');
      lines.push(`🎯 Giocate: ${giocateDisplay}`);
    }
    
    if (schedina.giocateSelezionate && schedina.giocateSelezionate.includes('gg_ng')) {
      lines.push(`⚽ GG/NG attivo`);
    }
    
    lines.push('───────────────────');
    lines.push('');
    
    schedina.partite.forEach((m, idx) => {
      const dataFormattata = formatDateEU(m.data);
      const oraFormattata = m.ora && m.ora !== 'TBD' ? m.ora : '--:--';
      lines.push(`📅 ${dataFormattata} - ${oraFormattata}`);
      lines.push(`🏆 ${m.campionato}`);
      lines.push(`⚽ ${m.casa} vs ${m.ospiti}`);

      const top3 = m.top3 || (m.giocata ? [m.giocata] : []);
      if (top3.length > 0) {
        top3.forEach((g, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
          const bombEmoji = g.isBomb ? ' 💣' : '';
          const ggngTag = g.familyId === 'gg_ng' ? ' ⚽GG/NG' : '';
          const quota = window.getQuotaForGiocata
            ? window.getQuotaForGiocata(m.id, g.familyId, g.giocata)
            : null;
          const quotaStr = quota ? ` @${quota.decimal_odds}` : '';
          lines.push(`  ${medal} ${g.familyIcon} ${g.label} → ${g.pct}%${quotaStr}${bombEmoji}${ggngTag}`);
        });
      } else {
        lines.push(`  🎯 N/A`);
      }

      if (idx < schedina.partite.length - 1) lines.push('');
    });
    
    // Totali quota per medaglia
    const totali = calcolaTotaliQuotaPerMedaglia(schedina);
    if (totali) {
      lines.push('');
      lines.push('───────────────────');
      lines.push('💰 *TOTALI QUOTA PER MEDAGLIA*');
      ['🥇', '🥈', '🥉'].forEach(med => {
        const t = totali[med];
        if (t.totale !== null) {
          const senzaStr = t.senza > 0 ? ` (${t.senza} senza quota)` : '';
          lines.push(`  ${med} Totale: ${t.totale.toFixed(2)} • ${t.count} giocate${senzaStr}`);
        } else {
          lines.push(`  ${med} Totale: N/D`);
        }
      });
    }
    
    lines.push('');
    lines.push('───────────────────');
    lines.push(`⭐ Media Score: ${schedina.media}%`);
    lines.push(`📊 Numero partite: ${schedina.numPartite}`);
    lines.push('💣 GesssAI-Pro v3.0');
    lines.push('⚠️ Le scommesse comportano rischi finanziari. Gioca responsabilmente.');
    
    return lines.join('\n');
  };

  // ============================================================
  // FUNZIONI DI CONDIVISIONE
  // ============================================================
  
  const copySchedinaToClipboard = () => {
    if (!schedinaCreata) {
      showAlert('error', '❌ Nessuna schedina da copiare!');
      return;
    }
    const text = formatSchedinaText(schedinaCreata);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showAlert('success', '📋 Schedina copiata negli appunti!'))
        .catch(() => showAlert('error', '❌ Errore nella copia'));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showAlert('success', '📋 Schedina copiata negli appunti!');
      } catch (e) {
        showAlert('error', '❌ Errore nella copia');
      }
      document.body.removeChild(textarea);
    }
  };

  const shareOnWhatsApp = () => {
    if (!schedinaCreata) {
      showAlert('error', '❌ Nessuna schedina da condividere!');
      return;
    }
    const text = formatSchedinaText(schedinaCreata);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareOnTelegram = () => {
    if (!schedinaCreata) {
      showAlert('error', '❌ Nessuna schedina da condividere!');
      return;
    }
    const text = formatSchedinaText(schedinaCreata);
    const url = `https://t.me/share/url?url=${encodeURIComponent('🎯 Schedina GesssAI-Pro')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const salvaSchedinaLocale = () => {
    if (!schedinaCreata) {
      showAlert('error', '❌ Nessuna schedina da salvare!');
      return;
    }
    const now = new Date();
    const nomeFile = `Schedina_GesssAI_${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    
    const text = formatSchedinaText(schedinaCreata);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeFile}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert('success', `💾 Schedina salvata come ${nomeFile}.txt`);
  };

  const eliminaSchedinaSalvata = (id) => {
    if (!confirm('⚠️ Sei sicuro di voler eliminare questa schedina salvata?')) return;
    const nuoveSalvate = schedineSalvate.filter(s => s.id !== id);
    localStorage.setItem('ft_schedine_salvate', JSON.stringify(nuoveSalvate));
    setSchedineSalvate(nuoveSalvate);
    showAlert('success', '🗑️ Schedina eliminata!');
  };

  const caricaSchedinaSalvata = (schedina) => {
    setSchedinaCreata(schedina);
    const partiteOrdinate = ordinaPartitePerDataOra(schedina.partite);
    setPartiteSelezionate(partiteOrdinate);
    if (schedina.giocateSelezionate) {
      setGiocateSelezionate(schedina.giocateSelezionate);
    }
    setShowSchedinaModal(true);
    showAlert('success', `📂 Schedina caricata! ${schedina.numPartite} partite, media ${schedina.media}%`);
  };

  const famiglieDisponibili = [
    { id: 'tutte', label: '⭐ Tutte', icon: '⭐' },
    { id: 'gg_ng', label: 'GG - NG', icon: '⚽' },
    ...Object.entries(window.FAMIGLIE_GIOCATE || {})
      .filter(([id]) => id !== 'gg_ng')
      .map(([id, family]) => ({
        id: id,
        label: family.label,
        icon: family.icon
      }))
  ];

  return (
    <div className="schedina-container">
      <div className="card" style={{marginBottom: '20px'}}>
        <h3 style={{color: 'var(--accent)', marginBottom: '16px', fontSize: '20px'}}>
          🎯 Crea Schedina {casualitaLevel > 50 ? '🎲' : ''}
          <span style={{fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px', fontWeight: 'normal'}}>
            📅 Sincronizzato con Palinsesto ({giorniRange} giorno/i) • 🏆 {campionatiSelezionati.length} campionati attivi • 💰 Quote BSD
          </span>
        </h3>
        
        {/* SEZIONE 1: CAMPIONATI */}
        <div style={{
          marginBottom: '20px', padding: '14px 16px', background: 'var(--surface)', 
          borderRadius: '10px', border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px'
          }}>
            <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
              🏆 Campionati Attivi
              <span style={{fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal'}}>
                (sincronizzato con Palinsesto)
              </span>
            </span>
            <div style={{display: 'flex', gap: '6px'}}>
              <button className="btn" onClick={selezionaTuttiCampionati} style={{
                fontSize: '10px', padding: '3px 14px',
                background: campionatiSelezionati.length === championships.length ? 'var(--accent)' : 'var(--surface)',
                color: campionatiSelezionati.length === championships.length ? '#000' : 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer'
              }}>✅ Tutti</button>
              <button className="btn" onClick={deselezionaTuttiCampionati} style={{
                fontSize: '10px', padding: '3px 14px', background: 'var(--surface)',
                color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer'
              }}>❌ Deseleziona</button>
              <span style={{fontSize: '11px', color: 'var(--text-muted)', padding: '3px 10px', background: 'var(--surface)', borderRadius: '4px'}}>
                {campionatiSelezionati.length} / {championships.length}
              </span>
            </div>
          </div>
          
          <div className="champ-filters-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', width: '100%'
          }}>
            {championships.map(c => {
              const isSelected = campionatiSelezionati.includes(c.name);
              const color = getChampColor(c.name);
              return (
                <button 
                  key={c.name}
                  onClick={() => toggleCampionato(c.name)}
                  className={`champ-filter-btn ${isSelected ? 'active' : 'inactive'}`}
                  style={{
                    padding: '6px 8px', borderRadius: '6px',
                    border: isSelected ? `2px solid ${color}` : '2px solid var(--border)',
                    background: isSelected ? color : 'var(--surface)',
                    color: isSelected ? '#000' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '11px',
                    fontWeight: isSelected ? 'bold' : '600',
                    transition: 'all 0.2s', minHeight: '34px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                  title={c.name}
                >
                  <span className="champ-color-dot" style={{
                    display: 'inline-block', width: '10px', height: '10px',
                    borderRadius: '50%', marginRight: '6px', flexShrink: 0, background: color
                  }} />
                  <span className="champ-name" style={{
                    fontSize: '10px', lineHeight: '1.2',
                    overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {c.name.length > 20 ? c.name.substring(0, 18) + '…' : c.name}
                  </span>
                </button>
              );
            })}
          </div>
          
          <div style={{fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic'}}>
            🔄 Modifica la selezione nel <b>Palinsesto</b> per sincronizzarla con tutti i tab
          </div>
        </div>

        {/* SEZIONE 2: GIOCATE */}
        <div style={{
          marginBottom: '20px', padding: '14px 16px', background: 'var(--surface)',
          borderRadius: '10px', border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px'
          }}>
            <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
              🎯 Seleziona Giocate
            </span>
            <div style={{display: 'flex', gap: '6px'}}>
              <button className="btn" onClick={selezionaTutteGiocate} style={{
                fontSize: '10px', padding: '3px 14px',
                background: giocateSelezionate.includes('tutte') ? 'var(--accent)' : 'var(--surface)',
                color: giocateSelezionate.includes('tutte') ? '#000' : 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer'
              }}>⭐ Tutte</button>
              <button className="btn" onClick={deselezionaTutteGiocate} style={{
                fontSize: '10px', padding: '3px 14px', background: 'var(--surface)',
                color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer'
              }}>❌ Deseleziona</button>
              <span style={{fontSize: '11px', color: 'var(--text-muted)', padding: '3px 10px', background: 'var(--surface)', borderRadius: '4px'}}>
                {giocateSelezionate.includes('tutte') ? '⭐ Tutte' : `${giocateSelezionate.length} selezionate`}
              </span>
            </div>
          </div>
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            {famiglieDisponibili.map(f => {
              const isSelected = giocateSelezionate.includes(f.id);
              const isTutte = f.id === 'tutte';
              const isGGNG = f.id === 'gg_ng';
              return (
                <button 
                  key={f.id}
                  onClick={() => toggleGiocata(f.id)}
                  style={{
                    padding: '6px 16px', borderRadius: '8px',
                    border: isSelected 
                      ? (isGGNG ? '2px solid #e74c3c' : '2px solid var(--accent)') 
                      : '1px solid var(--border)',
                    background: isSelected 
                      ? (isGGNG ? 'rgba(231, 76, 60, 0.12)' : 'rgba(243, 156, 18, 0.10)') 
                      : 'var(--surface)',
                    color: isSelected 
                      ? (isGGNG ? '#e74c3c' : 'var(--accent)') 
                      : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '12px',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    transition: 'all 0.2s', opacity: isSelected ? 1 : 0.6,
                    boxShadow: isSelected 
                      ? (isGGNG ? '0 0 20px rgba(231, 76, 60, 0.2)' : '0 0 15px rgba(243, 156, 18, 0.15)') 
                      : 'none'
                  }}
                >
                  {isSelected ? '✅' : (isTutte ? '⭐' : f.icon)} {f.label}
                  {isGGNG && <span style={{fontSize: '11px', marginLeft: '4px', color: '#e74c3c'}}>⚽</span>}
                </button>
              );
            })}
          </div>
          <div style={{fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic'}}>
            {giocateSelezionate.includes('tutte') 
              ? '⭐ Analizza TUTTE le famiglie di giocate (incluso GG - NG) → Top 3 giocate'
              : `📊 Analizza ${giocateSelezionate.length} famiglia/e: ${giocateSelezionate.map(id => window.FAMIGLIE_GIOCATE[id]?.label || id).join(', ')} → Top ${Math.min(3, giocateSelezionate.length)} giocate`}
            {giocateSelezionate.includes('gg_ng') && <span style={{marginLeft: '6px', color: '#e74c3c', fontWeight: 'bold'}}>⚽ GG/NG attivo!</span>}
          </div>
        </div>

        {/* SEZIONE 3: FILTRI DATA/ORA */}
        <div style={{
          marginBottom: '20px', padding: '14px 16px', background: 'var(--surface)',
          borderRadius: '10px', border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px'
          }}>
            <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
              📅 Filtri Data e Orario
              <span style={{fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal'}}>
                (sincronizzato con Palinsesto)
              </span>
            </span>
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center'}}>
            <div style={{flex: '1', minWidth: '160px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '4px'}}>
                📆 Range Giorni
              </label>
              <select 
                value={giorniRange} 
                onChange={e => setGiorniRange(parseInt(e.target.value))}
                style={{
                  width: '100%', padding: '7px 12px', background: 'var(--surface)',
                  color: 'var(--text)', border: '1px solid var(--border)',
                  borderRadius: '6px', fontSize: '12px'
                }}
              >
                <option value="1">1 Giorno (Oggi)</option>
                <option value="2">2 Giorni (Oggi - Domani)</option>
                <option value="3">3 Giorni (Oggi - +2)</option>
                <option value="4">4 Giorni (Oggi - +3)</option>
                <option value="5">5 Giorni (Oggi - +4)</option>
                <option value="6">6 Giorni (Oggi - +5)</option>
                <option value="7">7 Giorni (Oggi - +6)</option>
              </select>
              <div style={{fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px'}}>
                🔄 Sincronizzato con il Palinsesto
              </div>
            </div>
            
            <div style={{flex: '1', minWidth: '160px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '4px'}}>
                ⏰ Filtro Orario
              </label>
              <div style={{display: 'flex', background: 'var(--surface)', borderRadius: '6px', padding: '3px', border: '1px solid var(--border)'}}>
                <button onClick={() => setFiltroOrario('dopo_ora')} style={{
                  flex: 1, padding: '6px 10px', fontSize: '11px', borderRadius: '4px',
                  border: 'none', cursor: 'pointer',
                  fontWeight: filtroOrario === 'dopo_ora' ? 'bold' : 'normal',
                  background: filtroOrario === 'dopo_ora' ? 'var(--accent)' : 'transparent',
                  color: filtroOrario === 'dopo_ora' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>⏰ Dopo ora</button>
                <button onClick={() => setFiltroOrario('giorno_intero')} style={{
                  flex: 1, padding: '6px 10px', fontSize: '11px', borderRadius: '4px',
                  border: 'none', cursor: 'pointer',
                  fontWeight: filtroOrario === 'giorno_intero' ? 'bold' : 'normal',
                  background: filtroOrario === 'giorno_intero' ? 'var(--accent)' : 'transparent',
                  color: filtroOrario === 'giorno_intero' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>📅 Giorno intero</button>
              </div>
              <div style={{fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', textAlign: 'center'}}>
                {filtroOrario === 'dopo_ora' ? 'Solo partite non ancora iniziate' : 'Tutte le partite del giorno'}
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 4: CASUALITÀ */}
        <div style={{
          marginBottom: '20px', padding: '14px 16px', background: 'var(--surface)',
          borderRadius: '10px', border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px'
          }}>
            <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
              🎲 Livello di Casualità
            </span>
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '22px'}}>🎲</span>
            </div>
            <div style={{flex: '1', minWidth: '140px'}}>
              <input 
                type="range" min="0" max="100" step="5"
                value={casualitaLevel} 
                onChange={e => setCasualitaLevel(parseInt(e.target.value))}
                style={{
                  width: '100%', accentColor: '#8e44ad', height: '6px',
                  borderRadius: '3px', background: 'var(--surface)', cursor: 'pointer'
                }}
              />
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', minWidth: '90px'}}>
              <span style={{fontSize: '16px', fontWeight: 'bold', color: '#8e44ad'}}>{casualitaLevel}%</span>
              <span style={{fontSize: '22px'}}>
                {casualitaLevel > 80 ? '🎲🎲🎲' : casualitaLevel > 50 ? '🎲🎲' : casualitaLevel > 20 ? '🎲' : '📊'}
              </span>
            </div>
            <div style={{fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic'}}>
              {casualitaLevel <= 20 ? '📊 Prevedibile' : 
               casualitaLevel <= 50 ? '🎲 Un po\' di casualità' : 
               casualitaLevel <= 80 ? '🎲🎲 Media casualità' : 
               '🎲🎲🎲 MOLTO CASUALE!'}
            </div>
          </div>
        </div>

        {/* SEZIONE 5: STATISTICHE */}
        <div style={{
          marginBottom: '16px', padding: '10px 16px', background: 'var(--surface)',
          borderRadius: '8px', border: '1px solid var(--border)'
        }}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px'}}>
            <span>📊 <b>{partiteDisponibili.length}</b> partite disponibili</span>
            <span>🏆 <b>{campionatiSelezionati.length}</b> campionati attivi</span>
            <span>📅 Range: <b>{giorniRange} giorno/i</b></span>
            <span>⭐ Media score: <b style={{color: 'var(--accent)'}}>
              {partiteDisponibili.length > 0 ? Math.round(partiteDisponibili.reduce((s, m) => s + m.score, 0) / partiteDisponibili.length) : 0}%
            </b></span>
            <span>🎯 Selezionate: <b style={{color: 'var(--win)'}}>{partiteSelezionate.length}</b> / {numeroPartiteDaSelezionare}</span>
            <span style={{color: '#3498db'}}>💰 Quote BSD: <b>{Object.keys(JSON.parse(localStorage.getItem('ft_quote_cache') || '{}')).length}</b> partite</span>
          </div>
        </div>

        {/* SEZIONE 6: NUMERO PARTITE */}
        <div style={{
          marginBottom: '16px', padding: '14px 16px', background: 'var(--surface)',
          borderRadius: '10px', border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px'
          }}>
            <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
              📊 Numero di Partite
            </span>
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '5px 14px', borderRadius: '8px', border: '1px solid var(--border)'}}>
              <span style={{fontSize: '13px', fontWeight: 'bold', color: 'var(--text)'}}>📊 Numero partite:</span>
              <input 
                type="number" min="1" max="10"
                value={numeroPartiteDaSelezionare} 
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setNumeroPartiteDaSelezionare(Math.min(10, Math.max(1, val)));
                }}
                style={{
                  width: '44px', padding: '4px 6px', fontSize: '14px', fontWeight: 'bold',
                  textAlign: 'center', background: 'var(--background)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: '4px', outline: 'none'
                }}
              />
              <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>(1-10)</span>
            </div>
            
            <button className="btn" onClick={() => selezionaNumeroPartite(numeroPartiteDaSelezionare)} 
              style={{background: 'var(--accent2)', color: '#000', padding: '6px 16px', fontWeight: 'bold'}}>
              ⚡ Seleziona
            </button>
            
            <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto'}}>
              <button className="btn" onClick={() => selezionaNumeroPartite(3)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 3</button>
              <button className="btn" onClick={() => selezionaNumeroPartite(5)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 5</button>
              <button className="btn" onClick={() => selezionaNumeroPartite(10)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 10</button>
              <button className="btn" onClick={() => selezionaNumeroPartite(partiteDisponibili.length)} 
                style={{fontSize: '11px', padding: '5px 12px'}}>
                📋 Tutte ({partiteDisponibili.length})
              </button>
            </div>
          </div>
        </div>

        {/* SEZIONE 7: PULSANTI AZIONE */}
        <div style={{
          marginBottom: '12px', padding: '12px 16px', background: 'var(--surface)',
          borderRadius: '10px', border: '2px solid var(--border)',
          display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center'
        }}>
          <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
            <button className="btn" onClick={selezionaCasuale} style={{background: '#8e44ad', color: '#fff', fontWeight: 'bold'}}>🎲 Casuale</button>
            <button className="btn" onClick={rigeneraSchedina} style={{background: 'var(--accent2)', color: '#000', fontWeight: 'bold'}}>🔄 Rigenera {casualitaLevel > 50 ? '🎲' : ''}</button>
            <button className="btn btn-secondary" onClick={resettaSchedina}>🗑️ Resetta</button>
          </div>
          
          <button className="btn" onClick={creaSchedina} 
            disabled={partiteSelezionate.length < 2 || loading} 
            style={{
              marginLeft: 'auto',
              background: partiteSelezionate.length >= 2 ? 'var(--accent)' : 'var(--surface)',
              color: partiteSelezionate.length >= 2 ? '#000' : 'var(--text-muted)',
              fontWeight: 'bold', padding: '8px 20px', fontSize: '14px'
            }}>
            {loading ? '⏳ Creazione...' : `🎯 Crea Schedina (${partiteSelezionate.length})`}
          </button>
        </div>
        
        {/* LEGENDA */}
        <div style={{
          marginTop: '8px', padding: '10px 14px', background: 'var(--surface)',
          borderRadius: '8px', border: '1px dashed var(--border)', 
          fontSize: '10px', color: 'var(--text-muted)'
        }}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '14px'}}>
            <span>💡 Clicca su una partita per selezionarla/deselezionarla</span>
            <span>🔢 Max 10 partite per schedina</span>
            <span style={{color: '#e74c3c'}}>⚽ GG - NG</span>
            <span style={{color: '#eb5757'}}>⏰ Escluse partite già iniziate</span>
            <span style={{color: 'var(--accent)'}}>🔄 Sincronizzato con Palinsesto</span>
            <span style={{color: '#3498db'}}>💰 @quota = quota BSD (se disponibile)</span>
            <span style={{color: 'var(--accent)'}}>🥇🥈🥉 Top 3 giocate per partita</span>
          </div>
        </div>
      </div>
      
      {/* ===== LISTA PARTITE ===== */}
      <div className="card" style={{marginTop: '16px'}}>
        <h4 style={{marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
          <span>📋 Partite Disponibili ({partiteDisponibili.length})</span>
          {partiteSelezionate.length > 0 && (
            <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>
              {partiteSelezionate.length} selezionate ✅ • Ordinate per data/ora
            </span>
          )}
        </h4>
        {partiteDisponibili.length === 0 ? (
          <div className="empty-state" style={{padding: '30px', textAlign: 'center', color: 'var(--text-muted)'}}>
            <div style={{fontSize: '24px', marginBottom: '8px'}}>⏰</div>
            <p>Nessuna partita disponibile per i filtri selezionati.</p>
            <p style={{fontSize: '12px'}}>Verifica che ci siano partite future nei campionati attivi (selezionati nel Palinsesto) e che non siano già iniziate.</p>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {partiteDisponibili.map(m => {
              const isSelected = partiteSelezionate.some(p => p.id === m.id);
              
              return (
                <div 
                  key={m.id}
                  onClick={() => togglePartita(m)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '8px',
                    border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(243, 156, 18, 0.08)' : 'var(--surface)',
                    cursor: 'pointer', transition: 'all 0.2s', gap: '8px', flexWrap: 'wrap'
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px'}}>
                    <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                      {formatDateEU(m.data)}
                    </span>
                    <span style={{fontSize: '10px', color: 'var(--text-muted)'}}>
                      {m.ora && m.ora !== 'TBD' ? m.ora : ''}
                    </span>
                  </div>
                  
                  <div style={{fontSize: '11px', color: 'var(--text-muted)', minWidth: '80px'}}>
                    {m.campionato}
                  </div>
                  
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '150px'}}>
                    <span style={{fontWeight: 'bold', fontSize: '13px', color: 'var(--text)'}}>
                      {m.casa} vs {m.ospiti}
                    </span>
                  </div>

                  {/* TOP 3 GIOCATE CON QUOTA */}
                  <div style={{
                    display: 'flex', gap: '6px', alignItems: 'center',
                    justifyContent: 'center', flexWrap: 'wrap', minWidth: '280px'
                  }}>
                    {m.top3 && m.top3.length > 0 ? (
                      m.top3.map((g, idx) => {
                        const isGGNG = g.familyId === 'gg_ng';
                        const quota = window.getQuotaForGiocata
                          ? window.getQuotaForGiocata(m.id, g.familyId, g.giocata)
                          : null;
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              gap: '2px', padding: '4px 8px', borderRadius: '6px',
                              border: g.isBomb ? '2px solid var(--accent)' : (isGGNG ? '1px solid #e74c3c' : '1px solid var(--border)'),
                              background: g.isBomb ? 'rgba(243, 156, 18, 0.10)' : (isGGNG ? 'rgba(231, 76, 60, 0.06)' : 'var(--surface)'),
                              minWidth: '85px'
                            }}
                            title={`${g.familyIcon} ${g.familyLabel}${quota ? ` • Quota: ${quota.decimal_odds}` : ''}`}
                          >
                            <span style={{
                              fontSize: '10px', fontWeight: 'bold',
                              color: isGGNG ? '#e74c3c' : 'var(--accent)',
                              whiteSpace: 'nowrap', overflow: 'hidden',
                              textOverflow: 'ellipsis', maxWidth: '80px'
                            }}>
                              {g.label}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`} style={{fontSize: '11px', padding: '1px 5px'}}>
                                {g.pct}% {g.isBomb && '💣'}
                              </span>
                              {quota && (
                                <span style={{
                                  fontSize: '10px', fontWeight: 'bold', color: '#3498db',
                                  background: 'rgba(52, 152, 219, 0.15)',
                                  padding: '1px 5px', borderRadius: '4px',
                                }}>
                                  @{quota.decimal_odds}
                                </span>
                              )}
                            </div>
                            <span style={{
                              fontSize: '8px', color: 'var(--text-muted)',
                              whiteSpace: 'nowrap', overflow: 'hidden',
                              textOverflow: 'ellipsis', maxWidth: '80px'
                            }}>
                              {g.familyIcon} {g.familyLabel}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <span style={{fontSize: '10px', color: 'var(--text-muted)'}}>N/D</span>
                    )}
                  </div>
                  
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', minWidth: '50px', justifyContent: 'flex-end'}}>
                    <span className={`giocata-pct ${getPercentualeClasse(m.score)}`} style={{fontSize: '13px', padding: '2px 10px'}}>
                      {m.score}%
                    </span>
                    {isSelected && <span style={{color: 'var(--win)', fontSize: '14px'}}>✅</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== SCHEDINE SALVATE ===== */}
      {schedineSalvate.length > 0 && (
        <div className="card" style={{marginTop: '16px', border: '2px solid var(--accent)'}}>
          <h4 style={{color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            💾 Schedine Salvate ({schedineSalvate.length})
            <button className="btn btn-secondary" 
              onClick={() => {
                if (confirm('⚠️ Eliminare TUTTE le schedine salvate?')) {
                  localStorage.setItem('ft_schedine_salvate', '[]');
                  setSchedineSalvate([]);
                  showAlert('success', '🗑️ Tutte le schedine eliminate!');
                }
              }}
              style={{fontSize: '10px', padding: '2px 12px', marginLeft: 'auto'}}>
              🗑️ Elimina Tutte
            </button>
          </h4>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {schedineSalvate.map((s, idx) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: '6px',
                border: '1px solid var(--border)', background: 'var(--surface)',
                gap: '8px', flexWrap: 'wrap'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '150px'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--accent)', fontSize: '12px'}}>#{idx + 1}</span>
                  <span style={{fontSize: '12px', color: 'var(--text)'}}>
                    📅 {s.dataFormattata || s.timestamp || 'N/D'}
                  </span>
                  <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                    {s.numPartite} partite • Media: <b style={{color: 'var(--accent)'}}>{s.media}%</b>
                  </span>
                  {s.giocateSelezionate?.includes('gg_ng') && (
                    <span style={{fontSize: '10px', color: '#e74c3c'}}>⚽ GG/NG</span>
                  )}
                </div>
                
                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                  <button className="btn" onClick={() => caricaSchedinaSalvata(s)} style={{fontSize: '10px', padding: '4px 12px'}}>
                    📂 Carica
                  </button>
                  <button className="btn btn-secondary" 
                    onClick={() => {
                      const text = formatSchedinaText(s);
                      navigator.clipboard?.writeText?.(text);
                      showAlert('success', '📋 Schedina copiata!');
                    }}
                    style={{fontSize: '10px', padding: '4px 12px'}}>
                    📋 Copia
                  </button>
                  <button className="btn btn-danger" onClick={() => eliminaSchedinaSalvata(s.id)} style={{fontSize: '10px', padding: '4px 12px'}}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== MODAL SCHEDINA ===== */}
      {showSchedinaModal && schedinaCreata && (
        <div className="heatmap-detail-overlay" onClick={() => setShowSchedinaModal(false)}>
          <div className="heatmap-detail-modal" onClick={e => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'}}>
            <button className="close-btn" onClick={() => setShowSchedinaModal(false)}>✖</button>
            
            <div id="schedina-da-condividere" style={{padding: '10px 0'}}>
              <h2 style={{color: 'var(--accent)', textAlign: 'center', marginBottom: '4px'}}>🎯 SCHEDINA GesssAI-Pro</h2>
              <p style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px'}}>
                📅 {schedinaCreata.dataFormattata || new Date().toLocaleString('it-IT')} • {schedinaCreata.numPartite} partite • Media: <b style={{color: 'var(--accent)'}}>{schedinaCreata.media}%</b>
                {schedinaCreata.giocateSelezionate?.includes('gg_ng') && <span style={{marginLeft: '8px', color: '#e74c3c'}}>⚽ GG/NG</span>}
                {schedinaCreata.casualitaLevel > 80 && <span style={{marginLeft: '8px', color: '#8e44ad'}}>🎲 ESTREMA</span>}
              </p>
              
              <div style={{borderTop: '2px solid var(--accent)', paddingTop: '12px'}}>
                {schedinaCreata.partite.map((m, idx) => {
                  const top3 = m.top3 || (m.giocata ? [m.giocata] : []);
                  
                  return (
                    <div key={idx} style={{
                      padding: '8px 12px', marginBottom: '6px', borderRadius: '6px',
                      border: '1px solid var(--border)', background: 'var(--surface)'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px'}}>
                        <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                          #{idx + 1} 📅 {formatDateEU(m.data)} - {m.ora && m.ora !== 'TBD' ? m.ora : '--:--'}
                        </span>
                        <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                          🏆 {m.campionato}
                        </span>
                      </div>
                      <div style={{marginTop: '2px'}}>
                        <span style={{fontSize: '14px', fontWeight: 'bold'}}>
                          ⚽ {m.casa} vs {m.ospiti}
                        </span>
                      </div>

                      <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center'}}>
                        {top3.length > 0 ? top3.map((g, i) => {
                          const isGGNG = g.familyId === 'gg_ng';
                          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                          const quota = window.getQuotaForGiocata
                            ? window.getQuotaForGiocata(m.id, g.familyId, g.giocata)
                            : null;

                          return (
                            <div key={i} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              gap: '1px', padding: '3px 8px', borderRadius: '6px',
                              border: g.isBomb ? '2px solid var(--accent)' : (isGGNG ? '1px solid #e74c3c' : '1px solid var(--border)'),
                              background: g.isBomb ? 'rgba(243, 156, 18, 0.10)' : 'var(--surface)'
                            }}>
                              <span style={{fontSize: '9px', color: 'var(--text-muted)'}}>{medal}</span>
                              <span style={{fontSize: '11px', fontWeight: 'bold', color: isGGNG ? '#e74c3c' : 'var(--accent)'}}>
                                {g.label}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`} style={{fontSize: '12px', padding: '1px 6px'}}>
                                  {g.pct}% {g.isBomb && '💣'}
                                </span>
                                {quota && (
                                  <span style={{
                                    fontSize: '11px', fontWeight: 'bold', color: '#3498db',
                                    background: 'rgba(52, 152, 219, 0.15)',
                                    padding: '1px 6px', borderRadius: '4px',
                                  }}>
                                    @{quota.decimal_odds}
                                  </span>
                                )}
                              </div>
                              <span style={{fontSize: '8px', color: 'var(--text-muted)'}}>
                                {g.familyIcon} {g.familyLabel}
                              </span>
                            </div>
                          );
                        }) : (
                          <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>Nessuna giocata</span>
                        )}
                      </div>

                      <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '4px'}}>
                        <span className={`giocata-pct ${getPercentualeClasse(m.score)}`} style={{fontSize: '11px', padding: '1px 8px'}}>
                          Score: {m.score}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ============================================================ */}
              {/* 💰 TOTALI QUOTA PER MEDAGLIA                                   */}
              {/* ============================================================ */}
              {(() => {
                const totali = calcolaTotaliQuotaPerMedaglia(schedinaCreata);
                if (!totali) return null;
                
                return (
                  <div style={{
                    marginTop: '16px', padding: '14px 16px',
                    background: 'rgba(243, 156, 18, 0.08)',
                    borderRadius: '10px', border: '2px solid var(--accent)'
                  }}>
                    <div style={{textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '10px'}}>
                      💰 Totali Quota per Medaglia
                    </div>
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
                      {[
                        { medaglia: '🥇', label: 'Top 1', t: totali['🥇'] },
                        { medaglia: '🥈', label: 'Top 2', t: totali['🥈'] },
                        { medaglia: '🥉', label: 'Top 3', t: totali['🥉'] },
                      ].map(({ medaglia, label, t }) => (
                        <div key={medaglia} style={{
                          padding: '10px 8px', background: 'var(--card)',
                          borderRadius: '8px', textAlign: 'center',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{fontSize: '20px', marginBottom: '4px'}}>{medaglia}</div>
                          <div style={{fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px'}}>
                            {label}
                          </div>
                          {t.totale !== null ? (
                            <>
                              <div style={{
                                fontSize: '20px', fontWeight: 'bold',
                                color: '#3498db', wordBreak: 'break-all'
                              }}>
                                {t.totale.toFixed(2)}
                              </div>
                              <div style={{fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px'}}>
                                {t.count} giocate{t.senza > 0 ? ` • ${t.senza} senza quota` : ''}
                              </div>
                            </>
                          ) : (
                            <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                              N/D
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div style={{textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '10px', fontStyle: 'italic'}}>
                      💡 La quota totale è il prodotto delle singole quote. Le partite senza quota BSD sono escluse.
                    </div>
                  </div>
                );
              })()}

              <div style={{borderTop: '2px solid var(--accent)', marginTop: '12px', paddingTop: '12px', textAlign: 'center'}}>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: 'var(--accent)'}}>
                  ⭐ Media Score: {schedinaCreata.media}%
                </div>
                <div style={{fontSize: '13px', color: 'var(--text)'}}>
                  📊 {schedinaCreata.numPartite} partite
                  {schedinaCreata.giocateSelezionate?.includes('gg_ng') && (
                    <span style={{marginLeft: '8px', color: '#e74c3c'}}>⚽ GG/NG incluso</span>
                  )}
                  {schedinaCreata.casualitaLevel > 80 && (
                    <span style={{marginLeft: '8px', color: '#8e44ad'}}>🎲 ESTREMA</span>
                  )}
                </div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px'}}>
                  💣 GesssAI-Pro v3.0 • ⚠️ Le scommesse comportano rischi finanziari. Gioca responsabilmente.
                </div>
              </div>
            </div>
            
            {/* BOTTONI AZIONE MODAL */}
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', justifyContent: 'center'}}>
              <button className="btn" onClick={copySchedinaToClipboard} style={{background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'}}>
                📋 Copia
              </button>
              
              <button className="btn" onClick={salvaSchedinaLocale} style={{background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'}}>
                💾 Salva
              </button>
              
              <button className="btn" onClick={shareOnWhatsApp}
                style={{background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
              
              <button className="btn" onClick={shareOnTelegram}
                style={{background: '#0088cc', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram
              </button>
              
              <button className="btn btn-secondary" onClick={() => setShowSchedinaModal(false)}>
                ✖ Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.SchedinaComponent = SchedinaComponent;
console.log('✅ SchedinaComponent caricato - Top 3 giocate + Quote BSD + Totali quota per medaglia');