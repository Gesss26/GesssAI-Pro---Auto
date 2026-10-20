// ============================================================
// filtri-campionati.js
// Sistema centralizzato di filtro campionati + giorni + modalità giocate.
// Il PALINSESTO è la fonte di verità: scrive la selezione.
// Tutti gli altri tab la leggono e si sincronizzano.
// ⭐ v3: FIX switch Scelte/Calcolate
//        - valori allineati a 'scelte' | 'calcolate'
//        - retrocompatibile con 'tutte' salvato in passato
//        - setMode ora dispatcha correttamente l'evento
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // COSTANTI
  // ============================================================
  const STORAGE_KEY = 'ft_campionati_selezionati';
  const EVENT_NAME = 'campionati-filter-updated';

  const GIORNI_STORAGE_KEY = 'ft_giorni_range';
  const GIORNI_EVENT_NAME = 'giorni-range-updated';
  const GIORNI_DEFAULT = 1;
  const GIORNI_MIN = 1;
  const GIORNI_MAX = 7;

  // ⭐ FIX: modalità visualizzazione giocate con valori 'scelte' | 'calcolate'
  const GIOCATE_MODE_STORAGE_KEY = 'ft_visualizza_giocate_mode';
  const GIOCATE_MODE_EVENT_NAME = 'visualizza-giocate-mode-updated';
  const GIOCATE_MODE_DEFAULT = 'scelte';

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
  // ⭐ MODALITÀ VISUALIZZAZIONE GIOCATE (FIX)
  // ============================================================

  /**
   * Normalizza un valore arbitrario in 'scelte' o 'calcolate'.
   * Accetta 'tutte' come sinonimo di 'calcolate' (retrocompatibile
   * con eventuali valori salvati in localStorage da versioni precedenti).
   */
  const normalizzaGiocateMode = (mode) => {
    if (mode === 'calcolate' || mode === 'tutte') return 'calcolate';
    return 'scelte';
  };

  const leggiVisualizzaGiocateMode = () => {
    try {
      const raw = localStorage.getItem(GIOCATE_MODE_STORAGE_KEY);
      if (raw) return normalizzaGiocateMode(raw);
    } catch (e) {
      console.warn('Errore lettura visualizza giocate mode:', e);
    }
    return GIOCATE_MODE_DEFAULT;
  };

  const salvaVisualizzaGiocateMode = (mode) => {
    try {
      // ⭐ FIX: normalizza e salva sempre 'scelte' o 'calcolate'
      const val = normalizzaGiocateMode(mode);
      localStorage.setItem(GIOCATE_MODE_STORAGE_KEY, val);
      window.dispatchEvent(new CustomEvent(GIOCATE_MODE_EVENT_NAME, { detail: val }));
    } catch (e) {
      console.warn('Errore salvataggio visualizza giocate mode:', e);
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
  // ⭐ HOOK: useVisualizzaGiocateMode (FIX)
  // ============================================================

  const useVisualizzaGiocateMode = () => {
    const { useState, useEffect, useCallback } = React;

    const [mode, setModeState] = useState(() => leggiVisualizzaGiocateMode());

    useEffect(() => {
      const handler = (e) => {
        const val = typeof e.detail === 'string'
          ? normalizzaGiocateMode(e.detail)
          : leggiVisualizzaGiocateMode();
        setModeState(val);
      };
      const storageHandler = (e) => {
        if (e.key === GIOCATE_MODE_STORAGE_KEY) {
          setModeState(leggiVisualizzaGiocateMode());
        }
      };
      window.addEventListener(GIOCATE_MODE_EVENT_NAME, handler);
      window.addEventListener('storage', storageHandler);
      return () => {
        window.removeEventListener(GIOCATE_MODE_EVENT_NAME, handler);
        window.removeEventListener('storage', storageHandler);
      };
    }, []);

    const setMode = useCallback((nuovo) => {
      // ⭐ FIX: normalizza prima di salvare e aggiornare lo stato
      const val = normalizzaGiocateMode(nuovo);
      salvaVisualizzaGiocateMode(val);
      setModeState(val);
    }, []);

    return { mode, setMode };
  };

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.FiltriCampionati = {
    // Campionati
    STORAGE_KEY,
    EVENT_NAME,
    leggiFiltroCampionati,
    salvaFiltroCampionati,
    getCampionatiAttivi,
    isCampionatoAttivo,
    filtraPartitePerCampionato,
    useFiltroCampionati,

    // Giorni
    GIORNI_STORAGE_KEY,
    GIORNI_EVENT_NAME,
    GIORNI_DEFAULT,
    GIORNI_MIN,
    GIORNI_MAX,
    leggiGiorniRange,
    salvaGiorniRange,
    useGiorniRange,

    // Modalità giocate (⭐ FIX)
    GIOCATE_MODE_STORAGE_KEY,
    GIOCATE_MODE_EVENT_NAME,
    GIOCATE_MODE_DEFAULT,
    normalizzaGiocateMode,
    leggiVisualizzaGiocateMode,
    salvaVisualizzaGiocateMode,
    useVisualizzaGiocateMode,
  };

  console.log('✅ FiltriCampionati v3 — FIX switch Scelte/Calcolate');
})();