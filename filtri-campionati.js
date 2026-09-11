// ============================================================
// filtri-campionati.js
// Sistema centralizzato di filtro campionati + giorni.
// Il PALINSESTO è la fonte di verità: scrive la selezione.
// Tutti gli altri tab la leggono e si sincronizzano.
// ============================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'ft_campionati_selezionati';
  const EVENT_NAME = 'campionati-filter-updated';

  const GIORNI_STORAGE_KEY = 'ft_giorni_range';
  const GIORNI_EVENT_NAME = 'giorni-range-updated';
  const GIORNI_DEFAULT = 1;
  const GIORNI_MIN = 1;
  const GIORNI_MAX = 7;

  const getChampList = () => {
    const list = window.CHAMPIONSHIP_LIST || [];
    return Array.isArray(list) ? list : [];
  };

  // ============================================================
  // CAMPIONATI
  // ============================================================

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

  const salvaFiltroCampionati = (filtro) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtro));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: filtro }));
    } catch (e) {
      console.warn('Errore salvataggio filtro campionati:', e);
    }
  };

  const getCampionatiAttivi = () => {
    const filtro = leggiFiltroCampionati();
    return Object.keys(filtro).filter(c => filtro[c]);
  };

  const isCampionatoAttivo = (nome) => {
    const filtro = leggiFiltroCampionati();
    return filtro[nome] !== false;
  };

  const filtraPartitePerCampionato = (matches) => {
    const attivi = new Set(getCampionatiAttivi());
    return matches.filter(m => attivi.has(m.campionato));
  };

  // ============================================================
  // GIORNI RANGE
  // ============================================================

  const leggiGiorniRange = () => {
    try {
      const raw = localStorage.getItem(GIORNI_STORAGE_KEY);
      if (raw !== null) {
        const num = parseInt(raw, 10);
        if (!isNaN(num) && num >= GIORNI_MIN && num <= GIORNI_MAX) return num;
      }
    } catch (e) {
      console.warn('Errore lettura giorni range:', e);
    }
    return GIORNI_DEFAULT;
  };

  const salvaGiorniRange = (giorni) => {
    try {
      const num = Math.max(GIORNI_MIN, Math.min(GIORNI_MAX, parseInt(giorni, 10) || GIORNI_DEFAULT));
      localStorage.setItem(GIORNI_STORAGE_KEY, String(num));
      window.dispatchEvent(new CustomEvent(GIORNI_EVENT_NAME, { detail: num }));
    } catch (e) {
      console.warn('Errore salvataggio giorni range:', e);
    }
  };

  // ============================================================
  // HOOK: useFiltroCampionati
  // ============================================================

  const useFiltroCampionati = () => {
    const { useState, useEffect, useCallback, useMemo } = React;

    const [filtro, setFiltroState] = useState(() => leggiFiltroCampionati());

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
  // HOOK: useGiorniRange
  // ============================================================

  const useGiorniRange = () => {
    const { useState, useEffect, useCallback } = React;

    const [giorni, setGiorniState] = useState(() => leggiGiorniRange());

    useEffect(() => {
      const handler = (e) => {
        setGiorniState(typeof e.detail === 'number' ? e.detail : leggiGiorniRange());
      };
      const storageHandler = (e) => {
        if (e.key === GIORNI_STORAGE_KEY) setGiorniState(leggiGiorniRange());
      };
      window.addEventListener(GIORNI_EVENT_NAME, handler);
      window.addEventListener('storage', storageHandler);
      return () => {
        window.removeEventListener(GIORNI_EVENT_NAME, handler);
        window.removeEventListener('storage', storageHandler);
      };
    }, []);

    const setGiorni = useCallback((nuovo) => {
      const num = typeof nuovo === 'function' ? nuovo(leggiGiorniRange()) : nuovo;
      salvaGiorniRange(num);
      setGiorniState(Math.max(GIORNI_MIN, Math.min(GIORNI_MAX, parseInt(num, 10) || GIORNI_DEFAULT)));
    }, []);

    return {
      giorni,
      setGiorni,
      GIORNI_MIN,
      GIORNI_MAX,
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
    GIORNI_STORAGE_KEY,
    GIORNI_EVENT_NAME,
    GIORNI_DEFAULT,
    GIORNI_MIN,
    GIORNI_MAX,
    leggiGiorniRange,
    salvaGiorniRange,
    useGiorniRange,
  };

  console.log('✅ Modulo FiltriCampionati caricato (campionati + giorni)');
})();