// ============================================================
// filtri-campionati.js
// Sistema centralizzato di filtro campionati.
// Il PALINSESTO è la fonte di verità: scrive la selezione.
// Tutti gli altri tab la leggono e si sincronizzano.
// ============================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'ft_campionati_selezionati';
  const EVENT_NAME = 'campionati-filter-updated';

  // Legge dinamicamente la lista (evita problemi di ordine di caricamento)
  const getChampList = () => {
    const list = window.CHAMPIONSHIP_LIST || [];
    return Array.isArray(list) ? list : [];
  };

  // ============================================================
  // LEGGI / SCRIVI SU LOCALSTORAGE
  // ============================================================

  /**
   * Ritorna { [nomeCampionato]: boolean }.
   * Default: tutti true se non esiste nulla in localStorage.
   * Normalizza: campionati non presenti nell'oggetto salvato → true.
   */
  const leggiFiltroCampionati = () => {
    const list = getChampList();
    let parsed = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (e) {
      console.warn('Errore lettura filtro campionati:', e);
    }
    const result = {};
    list.forEach(c => {
      result[c] = parsed ? parsed[c] !== false : true;
    });
    return result;
  };

  /**
   * Salva il filtro su localStorage e notifica tutti i tab.
   */
  const salvaFiltroCampionati = (filtro) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtro));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: filtro }));
    } catch (e) {
      console.warn('Errore salvataggio filtro campionati:', e);
    }
  };

  /**
   * Lista dei campionati ATTIVI (true).
   */
  const getCampionatiAttivi = () => {
    const filtro = leggiFiltroCampionati();
    return Object.keys(filtro).filter(c => filtro[c]);
  };

  const isCampionatoAttivo = (nome) => {
    const filtro = leggiFiltroCampionati();
    return filtro[nome] !== false;
  };

  /**
   * Filtra un array di partite in base ai campionati attivi.
   */
  const filtraPartitePerCampionato = (matches) => {
    const attivi = new Set(getCampionatiAttivi());
    return matches.filter(m => attivi.has(m.campionato));
  };

  // ============================================================
  // HOOK REACT: useFiltroCampionati
  // ============================================================

  const useFiltroCampionati = () => {
    const { useState, useEffect, useCallback, useMemo } = React;

    const [filtro, setFiltroState] = useState(() => leggiFiltroCampionati());

    // Sync con eventi custom + storage (multi-tab)
    useEffect(() => {
      const handler = (e) => {
        setFiltroState(e.detail ? e.detail : leggiFiltroCampionati());
      };
      const storageHandler = (e) => {
        if (e.key === STORAGE_KEY) setFiltroState(leggiFiltroCampionati());
      };
      window.addEventListener(EVENT_NAME, handler);
      window.addEventListener('storage', storageHandler);
      return () => {
        window.removeEventListener(EVENT_NAME, handler);
        window.removeEventListener('storage', storageHandler);
      };
    }, []);

    const setFiltro = useCallback((nuovoFiltro) => {
      const valore = typeof nuovoFiltro === 'function'
        ? nuovoFiltro(leggiFiltroCampionati())
        : nuovoFiltro;
      salvaFiltroCampionati(valore);
      setFiltroState(valore);
    }, []);

    const toggleCampionato = useCallback((nome) => {
      setFiltro(prev => ({ ...prev, [nome]: !prev[nome] }));
    }, [setFiltro]);

    const selezionaTutti = useCallback(() => {
      const all = {};
      getChampList().forEach(c => { all[c] = true; });
      setFiltro(all);
    }, [setFiltro]);

    const deselezionaTutti = useCallback(() => {
      const none = {};
      getChampList().forEach(c => { none[c] = false; });
      setFiltro(none);
    }, [setFiltro]);

    const campionatiAttivi = useMemo(
      () => Object.keys(filtro).filter(c => filtro[c]),
      [filtro]
    );

    return {
      filtro,
      setFiltro,
      toggleCampionato,
      selezionaTutti,
      deselezionaTutti,
      campionatiAttivi,
    };
  };

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.FiltriCampionati = {
    STORAGE_KEY,
    EVENT_NAME,
    leggiFiltroCampionati,
    salvaFiltroCampionati,
    getCampionatiAttivi,
    isCampionatoAttivo,
    filtraPartitePerCampionato,
    useFiltroCampionati,
  };

  console.log('✅ Modulo FiltriCampionati caricato');
})();