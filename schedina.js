// ============================================================
// schedina.js - Modulo Schedina con quote PDF visibili
// Quote mostrate accanto a ogni giocata (con value bet evidenziato)
// ✅ FIX v6: Multigol con 8 opzioni + etichette formattate
// ============================================================

const formatGiocataLabel = (familyId, label) => {
  if (!label) return '—';

  if (label.startsWith('Over '))  return label;
  if (label.startsWith('Under ')) return label.replace('.', ',');

  if (familyId === 'multigol') {
    // Le etichette sono già formattate dal sistema: 'MG Casa 0-2', ecc.
    return label;
  }

  if (familyId === 'mg_casa_ospite') {
    const parts = label.split('+');
    if (parts.length === 2) {
      return `MG ${parts[0]} Casa + MG ${parts[1]} Ospite`;
    }
  }

  if (familyId === 'dc_multigol') {
    const parts = label.split('+');
    if (parts.length === 2) return `${parts[0]} + ${parts[1]}`;
  }

  if (familyId === 'dc_under') {
    const parts = label.split('+');
    if (parts.length === 2) {
      const uLabel = parts[1].replace('U', 'Under ').replace('.', ',');
      return `${parts[0]} + ${uLabel}`;
    }
  }

  if (familyId === 'dc_over') {
    const parts = label.split('+');
    if (parts.length === 2) {
      const oLabel = parts[1].replace('O', 'Over ').replace('.', ',');
      return `${parts[0]} + ${oLabel}`;
    }
  }

  if (familyId === 'gg_ng') {
    if (label === 'Goal-Goal') return 'GG';
    if (label === 'No Goal') return 'NG';
  }

  return label;
};

// ============================================================
// COMPONENTE: PICCOLA QUOTA INLINE
// ============================================================
const QuotaInline = ({ match, familyId, giocata, pctTua, size = 'sm' }) => {
  const [quotaInfo, setQuotaInfo] = React.useState(null);

  const quoteHook = window.QuoteManager ? window.QuoteManager.useQuote() : { numPartite: 0 };
  const numPartite = quoteHook.numPartite;

  React.useEffect(() => {
    if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') return;
    try {
      const info = window.QuoteManager.analizzaGiocata(match, familyId, giocata, pctTua);
      setQuotaInfo(info);
    } catch (e) {
      setQuotaInfo(null);
    }
  }, [match.id, familyId, giocata, pctTua, numPartite]);

  if (!quotaInfo || !quotaInfo.quotaBook) return null;

  const { quotaBook, edge, isValue } = quotaInfo;

  const padding = size === 'lg' ? '3px 8px' : '1px 6px';
  const fontSize = size === 'lg' ? '12px' : '10px';

  return (
    <span
      title={isValue ? `VALUE BET! Edge: +${edge}%` : `Quota Marathonbet`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding,
        marginLeft: '4px',
        borderRadius: '4px',
        background: isValue ? 'rgba(111, 207, 151, 0.2)' : 'rgba(255, 255, 255, 0.08)',
        border: `1px solid ${isValue ? 'var(--win)' : 'var(--border)'}`,
        fontSize,
        fontWeight: 'bold',
        color: isValue ? 'var(--win)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }}
    >
      💰{quotaBook.toFixed(2)}
      {isValue && <span>+{edge}%</span>}
    </span>
  );
};

// ============================================================
// COMPONENTE PRINCIPALE
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
  const { useState, useMemo, useCallback } = React;

  const getChampColor = window.getChampColor || (() => '#95a5a6');
  const computeMatchStats = window.computeMatchStats;
  const getMultigolRange = window.getMultigolRange;
  const getBestBetForFamily = window.getBestBetForFamily;
  const getPercentualeClasse = window.getPercentualeClasse;
  const normalizeDate = window.normalizeDate;
  const getTodayStr = window.getTodayStr;
  const addDaysToDateStr = window.addDaysToDateStr;
  const formatDateEU = window.formatDateEU;

  const { giorni: giorniRange, setGiorni: setGiorniRange } =
    window.FiltriCampionati.useGiorniRange();

  const {
    filtro: campionatiSelezionatiObj,
    toggleCampionato,
    selezionaTutti: selezionaTuttiCampionati,
    deselezionaTutti: deselezionaTuttiCampionati,
    campionatiAttivi,
  } = window.FiltriCampionati.useFiltroCampionati();

  const campionatiSelezionati = campionatiAttivi;

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

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

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

    partite = partite.filter(m => {
      if (!m.ora || m.ora === 'TBD' || m.ora === 'N/D') {
        return true;
      }

      const matchDate = normalizeDate(m.data);
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStrInner = getTodayStr();

      if (matchDate !== todayStrInner) {
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
        const ggNgResult = window.calcolaGG_NG ? window.calcolaGG_NG(stats) : null;
        if (ggNgResult) {
          best = {
            ...ggNgResult,
            familyId: 'gg_ng',
            familyLabel: family.label,
            familyIcon: family.icon,
          };
        }
      } else {
        const bestBet = getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
        if (bestBet && bestBet.pct > 0) {
          best = {
            ...bestBet,
            familyId: familyId,
            familyLabel: family.label,
            familyIcon: family.icon,
          };
        }
      }

      if (best && best.pct > 0) {
        best.displayLabel = formatGiocataLabel(familyId, best.label);
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

    showAlert('success', `🔄 Schedina rigenerata! ${selezionateOrdinate.length} partite.`);
  };

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

    showAlert('success', `🎲 ${selezionateOrdinate.length} partite selezionate casualmente!`);
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
    showAlert('success', `🎯 Schedina creata! ${schedina.length} partite - Media score: ${mediaScore}%`);
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

  const formatSchedinaText = (schedina) => {
    if (!schedina || !schedina.partite) {
      return '🎯 Errore nella generazione della schedina';
    }

    const lines = [];
    lines.push('🎯 *SCHEDINA GesssAI-Pro*');
    lines.push(`📅 ${schedina.dataFormattata || new Date().toLocaleString('it-IT')}`);
    lines.push(`📊 ${schedina.numPartite} partite • Media: ${schedina.media}%`);

    if (schedina.dataInizio && schedina.dataFine) {
      const inizio = formatDateEU(schedina.dataInizio);
      const fine = formatDateEU(schedina.dataFine);
      if (inizio === fine) {
        lines.push(`📆 Data: ${inizio}`);
      } else {
        lines.push(`📆 Dal ${inizio} al ${fine}`);
      }
    }

    if (schedina.campionatiSelezionati && schedina.campionatiSelezionati.length > 0) {
      const champsDisplay = schedina.campionatiSelezionati.length === championships.length
        ? 'Tutti'
        : schedina.campionatiSelezionati.join(', ');
      lines.push(`🏆 Campionati: ${champsDisplay}`);
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
          const displayLabel = g.displayLabel || formatGiocataLabel(g.familyId, g.label);
          lines.push(`  ${medal} ${g.familyIcon} ${displayLabel} → ${g.pct}%${bombEmoji}${ggngTag}`);
        });
      } else {
        lines.push(`  🎯 N/A`);
      }

      if (idx < schedina.partite.length - 1) lines.push('');
    });

    lines.push('');
    lines.push('───────────────────');
    lines.push(`⭐ Media Score: ${schedina.media}%`);
    lines.push('💣 GesssAI-Pro v3.0');
    lines.push('⚠️ Le scommesse comportano rischi finanziari. Gioca responsabilmente.');

    return lines.join('\n');
  };

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
    ...Object.entries(window.FAMIGLIE_GIOCATE || {}).map(([id, family]) => ({
      id: id,
      label: family.label,
      icon: family.icon
    }))
  ];

  // ============================================================
  // RENDER
  // ============================================================

    return (
    <div className="schedina-container">

      {window.QuoteManager?.BannerScadenzaQuote && (
        <window.QuoteManager.BannerScadenzaQuote />
      )}

      <div className="card" style={{marginBottom: '20px'}}>
        <h3 style={{color: 'var(--accent)', marginBottom: '16px', fontSize: '20px'}}>
          🎯 Crea Schedina {casualitaLevel > 50 ? '🎲' : ''}
          <span style={{fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px', fontWeight: 'normal'}}>
            📅 Sincronizzato con Palinsesto ({giorniRange} giorno/i) • 🏆 {campionatiSelezionati.length} campionati attivi
          </span>
        </h3>

        {/* SEZIONE 1: CAMPIONATI */}
        <div style={{
          marginBottom: '20px',
          padding: '14px 16px',
          background: 'var(--surface)',
          borderRadius: '10px',
          border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '8px'
          }}>
            <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
              🏆 Campionati Attivi
              <span style={{fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal'}}>
                (sincronizzato con Palinsesto)
              </span>
            </span>
            <div style={{display: 'flex', gap: '6px'}}>
              <button
                className="btn"
                onClick={selezionaTuttiCampionati}
                style={{
                  fontSize: '10px',
                  padding: '3px 14px',
                  background: campionatiSelezionati.length === championships.length ? 'var(--accent)' : 'var(--surface)',
                  color: campionatiSelezionati.length === championships.length ? '#000' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✅ Tutti
              </button>
              <button
                className="btn"
                onClick={deselezionaTuttiCampionati}
                style={{
                  fontSize: '10px',
                  padding: '3px 14px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ❌ Deseleziona
              </button>
              <span style={{fontSize: '11px', color: 'var(--text-muted)', padding: '3px 10px', background: 'var(--surface)', borderRadius: '4px'}}>
                {campionatiSelezionati.length} / {championships.length}
              </span>
            </div>
          </div>

          <div className="champ-filters-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '6px',
            width: '100%'
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
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: isSelected ? `2px solid ${color}` : '2px solid var(--border)',
                    background: isSelected ? color : 'var(--surface)',
                    color: isSelected ? '#000' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: isSelected ? 'bold' : '600',
                    transition: 'all 0.2s',
                    minHeight: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={c.name}
                >
                  <span className="champ-color-dot" style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    marginRight: '6px',
                    flexShrink: 0,
                    background: color
                  }} />
                  <span className="champ-name" style={{
                    fontSize: '10px',
                    lineHeight: '1.2',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
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
          marginBottom: '20px',
          padding: '14px 16px',
          background: 'var(--surface)',
          borderRadius: '10px',
          border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '8px'
          }}>
            <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
              🎯 Seleziona Giocate
            </span>
            <div style={{display: 'flex', gap: '6px'}}>
              <button
                className="btn"
                onClick={selezionaTutteGiocate}
                style={{
                  fontSize: '10px',
                  padding: '3px 14px',
                  background: giocateSelezionate.includes('tutte') ? 'var(--accent)' : 'var(--surface)',
                  color: giocateSelezionate.includes('tutte') ? '#000' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ⭐ Tutte
              </button>
              <button
                className="btn"
                onClick={deselezionaTutteGiocate}
                style={{
                  fontSize: '10px',
                  padding: '3px 14px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ❌ Deseleziona
              </button>
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
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: isSelected
                      ? (isGGNG ? '2px solid #e74c3c' : '2px solid var(--accent)')
                      : '1px solid var(--border)',
                    background: isSelected
                      ? (isGGNG ? 'rgba(231, 76, 60, 0.12)' : 'rgba(243, 156, 18, 0.10)')
                      : 'var(--surface)',
                    color: isSelected
                      ? (isGGNG ? '#e74c3c' : 'var(--accent)')
                      : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    transition: 'all 0.2s',
                    opacity: isSelected ? 1 : 0.6,
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
          </div>
        </div>

        {/* SEZIONE 3: FILTRI DATA/ORA */}
        <div style={{
          marginBottom: '20px',
          padding: '14px 16px',
          background: 'var(--surface)',
          borderRadius: '10px',
          border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            borderBottom: '1px solid var(--border)',
            paddingBottom: '8px',
            marginBottom: '10px'
          }}>
            <span style={{fontSize: '15px', fontWeight: 'bold', color: 'var(--text)'}}>
              📅 Filtri Data e Orario
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
                  width: '100%',
                  padding: '7px 12px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '12px'
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
            </div>

            <div style={{flex: '1', minWidth: '160px'}}>
              <label style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--text)', display: 'block', marginBottom: '4px'}}>
                ⏰ Filtro Orario
              </label>
              <div style={{display: 'flex', background: 'var(--surface)', borderRadius: '6px', padding: '3px', border: '1px solid var(--border)'}}>
                <button
                  onClick={() => setFiltroOrario('dopo_ora')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: filtroOrario === 'dopo_ora' ? 'bold' : 'normal',
                    background: filtroOrario === 'dopo_ora' ? 'var(--accent)' : 'transparent',
                    color: filtroOrario === 'dopo_ora' ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                >
                  ⏰ Dopo ora
                </button>
                <button
                  onClick={() => setFiltroOrario('giorno_intero')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: filtroOrario === 'giorno_intero' ? 'bold' : 'normal',
                    background: filtroOrario === 'giorno_intero' ? 'var(--accent)' : 'transparent',
                    color: filtroOrario === 'giorno_intero' ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                >
                  📅 Giorno intero
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 4: CASUALITÀ */}
        <div style={{
          marginBottom: '20px',
          padding: '14px 16px',
          background: 'var(--surface)',
          borderRadius: '10px',
          border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            borderBottom: '1px solid var(--border)',
            paddingBottom: '8px',
            marginBottom: '10px'
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
                type="range"
                min="0"
                max="100"
                step="5"
                value={casualitaLevel}
                onChange={e => setCasualitaLevel(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#8e44ad',
                  height: '6px',
                  borderRadius: '3px',
                  background: 'var(--surface)',
                  cursor: 'pointer'
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
          marginBottom: '16px',
          padding: '10px 16px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px'}}>
            <span>📊 <b>{partiteDisponibili.length}</b> partite disponibili</span>
            <span>🏆 <b>{campionatiSelezionati.length}</b> campionati attivi</span>
            <span>📅 Range: <b>{giorniRange} giorno/i</b></span>
            <span>⭐ Media score: <b style={{color: 'var(--accent)'}}>
              {partiteDisponibili.length > 0 ? Math.round(partiteDisponibili.reduce((s, m) => s + m.score, 0) / partiteDisponibili.length) : 0}%
            </b></span>
            <span>🎯 Selezionate: <b style={{color: 'var(--win)'}}>{partiteSelezionate.length}</b> / {numeroPartiteDaSelezionare}</span>
          </div>
        </div>

        {/* SEZIONE 6: SELEZIONE NUMERO PARTITE */}
        <div style={{
          marginBottom: '16px',
          padding: '14px 16px',
          background: 'var(--surface)',
          borderRadius: '10px',
          border: '2px solid var(--border)'
        }}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '5px 14px', borderRadius: '8px', border: '1px solid var(--border)'}}>
              <span style={{fontSize: '13px', fontWeight: 'bold', color: 'var(--text)'}}>📊 Numero partite:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={numeroPartiteDaSelezionare}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setNumeroPartiteDaSelezionare(Math.min(10, Math.max(1, val)));
                }}
                style={{
                  width: '44px',
                  padding: '4px 6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  background: 'var(--background)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  outline: 'none'
                }}
              />
              <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>(1-10)</span>
            </div>

            <button
              className="btn"
              onClick={() => selezionaNumeroPartite(numeroPartiteDaSelezionare)}
              style={{background: 'var(--accent2)', color: '#000', padding: '6px 16px', fontWeight: 'bold'}}
            >
              ⚡ Seleziona
            </button>

            <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto'}}>
              <button className="btn" onClick={() => selezionaNumeroPartite(3)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 3</button>
              <button className="btn" onClick={() => selezionaNumeroPartite(5)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 5</button>
              <button className="btn" onClick={() => selezionaNumeroPartite(10)} style={{fontSize: '12px', padding: '5px 12px'}}>Top 10</button>
              <button
                className="btn"
                onClick={() => selezionaNumeroPartite(partiteDisponibili.length)}
                style={{fontSize: '11px', padding: '5px 12px'}}
              >
                📋 Tutte ({partiteDisponibili.length})
              </button>
            </div>
          </div>
        </div>

        {/* SEZIONE 7: PULSANTI AZIONE */}
        <div style={{
          marginBottom: '12px',
          padding: '12px 16px',
          background: 'var(--surface)',
          borderRadius: '10px',
          border: '2px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center'
        }}>
          <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
            <button className="btn" onClick={selezionaCasuale} style={{background: '#8e44ad', color: '#fff', fontWeight: 'bold'}}>
              🎲 Casuale
            </button>
            <button className="btn" onClick={rigeneraSchedina} style={{background: 'var(--accent2)', color: '#000', fontWeight: 'bold'}}>
              🔄 Rigenera {casualitaLevel > 50 ? '🎲' : ''}
            </button>
            <button className="btn btn-secondary" onClick={resettaSchedina}>
              🗑️ Resetta
            </button>
          </div>

          <button
            className="btn"
            onClick={creaSchedina}
            disabled={partiteSelezionate.length < 2 || loading}
            style={{
              marginLeft: 'auto',
              background: partiteSelezionate.length >= 2 ? 'var(--accent)' : 'var(--surface)',
              color: partiteSelezionate.length >= 2 ? '#000' : 'var(--text-muted)',
              fontWeight: 'bold',
              padding: '8px 20px',
              fontSize: '14px'
            }}
          >
            {loading ? '⏳ Creazione...' : `🎯 Crea Schedina (${partiteSelezionate.length})`}
          </button>
        </div>
      </div>

      {/* LISTA PARTITE CON QUOTE */}
      <div className="card" style={{marginTop: '16px'}}>
        <h4 style={{marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
          <span>📋 Partite Disponibili ({partiteDisponibili.length})</span>
          {partiteSelezionate.length > 0 && (
            <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>
              {partiteSelezionate.length} selezionate ✅
            </span>
          )}
        </h4>
        {partiteDisponibili.length === 0 ? (
          <div className="empty-state" style={{padding: '30px', textAlign: 'center', color: 'var(--text-muted)'}}>
            <div style={{fontSize: '24px', marginBottom: '8px'}}>⏰</div>
            <p>Nessuna partita disponibile per i filtri selezionati.</p>
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(243, 156, 18, 0.08)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    gap: '8px',
                    flexWrap: 'wrap'
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

                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    minWidth: '320px'
                  }}>
                    {m.top3 && m.top3.length > 0 ? (
                      m.top3.map((g, idx) => {
                        const isGGNG = g.familyId === 'gg_ng';
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: g.isBomb ? '2px solid var(--accent)' : (isGGNG ? '1px solid #e74c3c' : '1px solid var(--border)'),
                              background: g.isBomb ? 'rgba(243, 156, 18, 0.10)' : (isGGNG ? 'rgba(231, 76, 60, 0.06)' : 'var(--surface)'),
                              minWidth: '95px'
                            }}
                            title={`${g.familyIcon} ${g.familyLabel}`}
                          >
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 'bold',
                              color: isGGNG ? '#e74c3c' : 'var(--accent)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '90px'
                            }}>
                              {g.displayLabel || g.label}
                            </span>
                            <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`} style={{fontSize: '11px', padding: '1px 6px'}}>
                              {g.pct}% {g.isBomb && '💣'}
                            </span>
                            <QuotaInline match={m} familyId={g.familyId} giocata={g.giocata} pctTua={g.pct} size="sm" />
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

      {/* SCHEDINE SALVATE */}
      {schedineSalvate.length > 0 && (
        <div className="card" style={{marginTop: '16px', border: '2px solid var(--accent)'}}>
          <h4 style={{color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            💾 Schedine Salvate ({schedineSalvate.length})
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (confirm('⚠️ Eliminare TUTTE le schedine salvate?')) {
                  localStorage.setItem('ft_schedine_salvate', '[]');
                  setSchedineSalvate([]);
                  showAlert('success', '🗑️ Tutte le schedine eliminate!');
                }
              }}
              style={{fontSize: '10px', padding: '2px 12px', marginLeft: 'auto'}}
            >
              🗑️ Elimina Tutte
            </button>
          </h4>

          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {schedineSalvate.map((s, idx) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '150px'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--accent)', fontSize: '12px'}}>#{idx + 1}</span>
                  <span style={{fontSize: '12px', color: 'var(--text)'}}>
                    📅 {s.dataFormattata || s.timestamp || 'N/D'}
                  </span>
                  <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                    {s.numPartite} partite • Media: <b style={{color: 'var(--accent)'}}>{s.media}%</b>
                  </span>
                </div>

                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                  <button
                    className="btn"
                    onClick={() => caricaSchedinaSalvata(s)}
                    style={{fontSize: '10px', padding: '4px 12px'}}
                  >
                    📂 Carica
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const text = formatSchedinaText(s);
                      navigator.clipboard?.writeText?.(text);
                      showAlert('success', '📋 Schedina copiata!');
                    }}
                    style={{fontSize: '10px', padding: '4px 12px'}}
                  >
                    📋 Copia
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => eliminaSchedinaSalvata(s.id)}
                    style={{fontSize: '10px', padding: '4px 12px'}}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL SCHEDINA */}
      {showSchedinaModal && schedinaCreata && (
        <div className="heatmap-detail-overlay" onClick={() => setShowSchedinaModal(false)}>
          <div className="heatmap-detail-modal" onClick={e => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'}}>
            <button className="close-btn" onClick={() => setShowSchedinaModal(false)}>✖</button>

            <div style={{padding: '10px 0'}}>
              <h2 style={{color: 'var(--accent)', textAlign: 'center', marginBottom: '4px'}}>🎯 SCHEDINA GesssAI-Pro</h2>
              <p style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px'}}>
                📅 {schedinaCreata.dataFormattata || new Date().toLocaleString('it-IT')} • {schedinaCreata.numPartite} partite • Media: <b style={{color: 'var(--accent)'}}>{schedinaCreata.media}%</b>
              </p>

              <div style={{borderTop: '2px solid var(--accent)', paddingTop: '12px'}}>
                {schedinaCreata.partite.map((m, idx) => {
                  const top3 = m.top3 || (m.giocata ? [m.giocata] : []);

                  return (
                    <div key={idx} style={{
                      padding: '8px 12px',
                      marginBottom: '6px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)'
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
                          const displayLabel = g.displayLabel || formatGiocataLabel(g.familyId, g.label);
                          return (
                            <div key={i} style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '1px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: g.isBomb ? '2px solid var(--accent)' : (isGGNG ? '1px solid #e74c3c' : '1px solid var(--border)'),
                              background: g.isBomb ? 'rgba(243, 156, 18, 0.10)' : 'var(--surface)'
                            }}>
                              <span style={{fontSize: '9px', color: 'var(--text-muted)'}}>{medal}</span>
                              <span style={{fontSize: '11px', fontWeight: 'bold', color: isGGNG ? '#e74c3c' : 'var(--accent)'}}>
                                {displayLabel}
                              </span>
                              <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`} style={{fontSize: '12px', padding: '1px 6px'}}>
                                {g.pct}% {g.isBomb && '💣'}
                              </span>
                              <QuotaInline match={m} familyId={g.familyId} giocata={g.giocata} pctTua={g.pct} size="lg" />
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

              <div style={{borderTop: '2px solid var(--accent)', marginTop: '12px', paddingTop: '12px', textAlign: 'center'}}>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: 'var(--accent)'}}>
                  ⭐ Media Score: {schedinaCreata.media}%
                </div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px'}}>
                  💣 GesssAI-Pro v3.0 • ⚠️ Le scommesse comportano rischi finanziari.
                </div>
              </div>
            </div>

            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', justifyContent: 'center'}}>
              <button className="btn" onClick={copySchedinaToClipboard} style={{background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'}}>
                📋 Copia
              </button>

              <button className="btn" onClick={salvaSchedinaLocale} style={{background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'}}>
                💾 Salva
              </button>

              <button
                className="btn"
                onClick={shareOnWhatsApp}
                style={{background: '#25D366', color: '#fff', border: 'none'}}
              >
                WhatsApp
              </button>

              <button
                className="btn"
                onClick={shareOnTelegram}
                style={{background: '#0088cc', color: '#fff', border: 'none'}}
              >
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
console.log('✅ SchedinaComponent v6 caricato - 8 opzioni MG + etichette formattate');