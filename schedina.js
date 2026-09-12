// ============================================================
// COMPONENTE SCHEDINA - MOSTRA LE STESSE PARTITE DEL PALINSESTO
// + ESCLUSIONE PARTITE GIÀ INIZIATE
// + SINCRONIZZATO CON IL RANGE GIORNI DEL PALINSESTO
// + SINCRONIZZATO CON IL FILTRO CAMPIONATI GLOBALE (Palinsesto)
// + ORDINAMENTO: DATA -> PERCENTUALE (DECRESCENTE)
// + TOP 3 GIOCATE COME IN HOME (filtra in base alle giocate scelte)
// ============================================================

const SchedinaComponent = ({ 
  matches, 
  championships, 
  selectedFamiglie, 
  onSelectMatch, 
  showAlert,
  palinsestoGiorniRange = 1,  // (legacy, ora usiamo il filtro globale)
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

  // Converte in array di nomi (compatibilità con il codice esistente)
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
  // OTTIENI LE PARTITE - STESSA IDENTICA LOGICA DEL PALINSESTO
  // ============================================================
  const getPartiteDisponibili = useCallback(() => {
    const todayStr = getTodayStr();
    const maxDateStr = addDaysToDateStr(todayStr, giorniRange);
    
    // Prendi le partite Future (come nel Palinsesto)
    let partite = matches.filter(m => m.stato === 'Futura');
    
    // Filtra per campionati selezionati (dal filtro globale)
    if (campionatiSelezionati.length > 0) {
      partite = partite.filter(m => campionatiSelezionati.includes(m.campionato));
    } else {
      partite = [];
    }
    
    // FILTRO DATA: da oggi a oggi+giorniRange (IDENTICO AL PALINSESTO)
    partite = partite.filter(m => {
      if (!m.data) return false;
      const normalized = normalizeDate(m.data);
      if (!normalized) return false;
      return normalized >= todayStr && normalized <= maxDateStr;
    });
    
    // ⭐ ESCLUSIONE PARTITE GIÀ INIZIATE (ORARIO PASSATO)
    partite = partite.filter(m => {
      if (!m.ora || m.ora === 'TBD' || m.ora === 'N/D') {
        return true;
      }
      
      const matchDate = normalizeDate(m.data);
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr = getTodayStr();
      
      if (matchDate !== todayStr) {
        return true;
      }
      
      const timeParts = m.ora.split(':');
      if (timeParts.length < 2) return true;
      
      const matchHour = parseInt(timeParts[0], 10);
      const matchMinutes = parseInt(timeParts[1], 10);
      if (isNaN(matchHour) || isNaN(matchMinutes)) return true;
      
      const matchTotalMinutes = matchHour * 60 + matchMinutes;
      
      return matchTotalMinutes > currentTotalMinutes;
    });
    
    // FILTRO ORARIO: "dopo ora"
    if (filtroOrario === 'dopo_ora') {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      
      partite = partite.filter(m => {
        if (!m.ora || m.ora === 'TBD' || m.ora === 'N/D') {
          return true;
        }
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
  // CALCOLA TOP 3 GIOCATE PER PARTITA (come in Home)
  // Filtra in base alle giocate selezionate (da 1 a 3+)
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

    // Determina quali famiglie analizzare in base alle giocate selezionate
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

    // Ordina per percentuale decrescente
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
  // PARTITE DISPONIBILI CON ORDINAMENTO: DATA -> SCORE
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
    
    // ORDINA PER DATA (crescente) e poi per SCORE (decrescente)
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

  // Seleziona un numero personalizzato di partite
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
      showAlert('success', `🎲🎲🎲 CASUALITÀ ESTREMA! ${selezionateOrdinate.length} partite selezionate a caso! (rispettato il numero scelto: ${numeroPartiteDesiderato})`);
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
        // Mantieni anche la migliore per compatibilità con il salvataggio
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
          lines.push(`  ${medal} ${g.familyIcon} ${g.label} → ${g.pct}%${bombEmoji}${ggngTag}`);
        });
      } else {
        lines.push(`  🎯 N/A`);
      }

      if (idx < schedina.partite.length - 1) lines.push('');
    });
    
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
    // ⚠️ NON ripristinare giorniRange: è un filtro globale (fonte: Palinsesto)
    // ⚠️ NON ripristinare campionatiSelezionati: è un filtro globale (fonte: Palinsesto)
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

  function hexToRgb(hex) {
    if (hex.startsWith('#')) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '243, 156, 18';
    }
    return '243, 156, 18';
  }

  return (
    <div className="schedina-container">
      <div className="