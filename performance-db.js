// ============================================================
// performance-db.js
// Client GitHub per il database Performance.
// - Legge/scrive snapshot giornalieri in /data/performance/YYYY-MM-DD.json
// - Solo gli admin (vedi gestione-conto.js) possono scrivere
// - Cache locale 5 min per non ri-scaricare file già letti
// - Merge download-before-upload per evitare sovrascritture
// - ⭐ FIX v2: retry automatico su 409 Conflict (SHA cambiato)
// - ⭐ FIX v2: sopprime 404 rumorosi in console (opzionale)
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // CONFIGURAZIONE
  // ============================================================

  const GITHUB_USER = 'Gesss26';
  const GITHUB_REPO = 'GesssAI-Pro---Auto';
  const GITHUB_BRANCH = 'master';
  const DB_DIR = 'data/performance';

  const CACHE_KEY_PREFIX = 'ft_perfdb_cache_';
  const CACHE_TTL_MS = 5 * 60 * 1000;

  const DEBUG = true;

  // ============================================================
  // UTILITY: PAT
  // ============================================================

  const getPAT = () => {
    const saved = localStorage.getItem('ft_github_pat');
    if (saved && saved.trim()) return saved.trim();
    if (window.GestioneContoUtils && window.GestioneContoUtils.DEFAULT_PAT) {
      return window.GestioneContoUtils.DEFAULT_PAT;
    }
    return null;
  };

  // ============================================================
  // UTILITY: RUOLO UTENTE
  // ============================================================

  const getCurrentUser = () => {
    const username = localStorage.getItem('ft_gestione_sessione');
    if (!username) return null;
    try {
      const utenti = JSON.parse(localStorage.getItem('ft_gestione_utenti') || '[]');
      return utenti.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    } catch (e) {
      return null;
    }
  };

  const isWriter = () => {
    const u = getCurrentUser();
    if (!u) return false;
    return u.role === 'admin';
  };

  // ============================================================
  // UTILITY: URL E DATE
  // ============================================================

  const urlRaw = (dateStr) =>
    `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${DB_DIR}/${dateStr}.json`;

  const urlCdn = (dateStr) =>
    `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${DB_DIR}/${dateStr}.json`;

  const urlApi = (dateStr) =>
    `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DB_DIR}/${dateStr}.json`;

  const toDateStr = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };

  const addDays = (dateStr, n) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return toDateStr(d);
  };

  // ============================================================
  // CACHE LOCALE
  // ============================================================

  const leggiCache = (dateStr) => {
    try {
      const raw = localStorage.getItem(CACHE_KEY_PREFIX + dateStr);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.t > CACHE_TTL_MS) return null;
      return obj.d;
    } catch (e) {
      return null;
    }
  };

  const scriviCache = (dateStr, data) => {
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + dateStr, JSON.stringify({
        t: Date.now(),
        d: data,
      }));
    } catch (e) {}
  };

  const clearCache = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    if (DEBUG) console.log(`🗑️ PerformanceDB: cache pulita (${keys.length} chiavi)`);
  };

  // ============================================================
  // LETTURA SINGOLO GIORNO
  // ============================================================

  const leggiGiorno = async (dateStr, options) => {
    const opts = options || {};
    const bypassCache = opts.bypassCache === true;

    if (!bypassCache) {
      const cached = leggiCache(dateStr);
      if (cached) {
        if (DEBUG) console.log(`📦 PerformanceDB: cache hit ${dateStr}`);
        return cached;
      }
    }

    const urls = [urlRaw(dateStr), urlCdn(dateStr)];

    for (const url of urls) {
      try {
        const resp = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
        if (!resp.ok) {
          // Silenzio sui 404 (file giorno non esistente) — è normale
          continue;
        }
        const data = await resp.json();
        scriviCache(dateStr, data);
        if (DEBUG) console.log(`✅ PerformanceDB: letto ${dateStr} (${data.snapshots ? data.snapshots.length : 0} snapshot)`);
        return data;
      } catch (e) {
        if (DEBUG) console.warn(`⚠️ PerformanceDB: ${url.split('/')[2]} errore:`, e.message);
      }
    }

    // Nessun file per questo giorno (comportamento normale)
    return { date: dateStr, snapshots: [] };
  };

  // ============================================================
  // LETTURA INTERVALLO
  // ============================================================

  const leggiIntervallo = async (fromDate, toDate, onProgress) => {
    const giorni = [];
    let cur = fromDate;
    while (cur <= toDate) {
      giorni.push(cur);
      cur = addDays(cur, 1);
    }

    if (DEBUG) console.log(`📥 PerformanceDB: lettura ${giorni.length} giorni...`);

    const CONCURRENCY = 8;
    const risultati = [];
    let completati = 0;

    for (let i = 0; i < giorni.length; i += CONCURRENCY) {
      const batch = giorni.slice(i, i + CONCURRENCY);
      const batchRes = await Promise.all(batch.map(d => leggiGiorno(d)));
      batchRes.forEach(r => risultati.push(r));
      completati += batch.length;

      if (typeof onProgress === 'function') {
        onProgress(completati, giorni.length);
      }
    }

    const allSnapshots = [];
    risultati.forEach(r => {
      if (r && Array.isArray(r.snapshots)) {
        allSnapshots.push(...r.snapshots);
      }
    });

    if (DEBUG) console.log(`✅ PerformanceDB: letti ${allSnapshots.length} snapshot in totale`);
    return allSnapshots;
  };

  // ============================================================
  // LISTA FILE DISPONIBILI (via GitHub Contents API)
  // ============================================================

  const listaGiorniDisponibili = async () => {
    const pat = getPAT();
    if (!pat) {
      if (DEBUG) console.warn('⚠️ PerformanceDB: listaGiorniDisponibili senza PAT');
      return [];
    }

    try {
      const resp = await fetch(
        `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DB_DIR}?ref=${GITHUB_BRANCH}`,
        {
          headers: {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github+json',
          },
        }
      );

      if (!resp.ok) {
        if (resp.status === 404) return [];
        throw new Error(`HTTP ${resp.status}`);
      }

      const items = await resp.json();
      const giorni = items
        .filter(f => f.name && /^\d{4}-\d{2}-\d{2}\.json$/.test(f.name))
        .map(f => f.name.replace('.json', ''))
        .sort();

      if (DEBUG && giorni.length > 0) console.log(`📋 PerformanceDB: ${giorni.length} giorni disponibili (${giorni[0]} → ${giorni[giorni.length - 1]})`);
      return giorni;
    } catch (e) {
      if (DEBUG) console.warn('⚠️ PerformanceDB: listaGiorniDisponibili errore:', e.message);
      return [];
    }
  };

  // ============================================================
  // SCRITTURA (solo admin)
  // ============================================================

  const salvaGiorno = async (dateStr, snapshots) => {
    if (!isWriter()) {
      if (DEBUG) console.warn('⚠️ PerformanceDB: salvaGiorno chiamato ma utente non admin');
      return { ok: false, error: 'Solo l\'admin può scrivere' };
    }

    const pat = getPAT();
    if (!pat) return { ok: false, error: 'PAT non configurato' };

    // 1. Download del file attuale (se esiste) per merge
    let esistenti = [];
    try {
      const attuale = await leggiGiorno(dateStr, { bypassCache: true });
      if (attuale && Array.isArray(attuale.snapshots)) {
        esistenti = attuale.snapshots;
      }
    } catch (e) {}

    // 2. Merge per matchKey
    const map = new Map();
    esistenti.forEach(s => {
      if (s && s.matchKey) map.set(s.matchKey, s);
    });

    snapshots.forEach(s => {
      if (!s || !s.matchKey) return;
      const prev = map.get(s.matchKey);
      if (prev) {
        map.set(s.matchKey, Object.assign({}, prev, s, {
          giocate: s.giocate && s.giocate.length ? s.giocate : (prev.giocate || []),
        }));
      } else {
        map.set(s.matchKey, s);
      }
    });

    const mergedSnapshots = Array.from(map.values());

    const payload = {
      date: dateStr,
      aggiornatoIl: new Date().toISOString(),
      numSnapshot: mergedSnapshots.length,
      snapshots: mergedSnapshots,
    };

    const json = JSON.stringify(payload, null, 0);
    const encoder = new TextEncoder();
    const content = encoder.encode(json);

    // 3. Controllo dimensione (limite 1 MB Contents API, margine a 900 KB)
    if (content.byteLength > 900 * 1024) {
      return { ok: false, error: `File troppo grande (${(content.byteLength / 1024).toFixed(0)} KB > 900 KB)` };
    }

    // 4. Upload via Contents API
    const result = await caricaFileSuGitHub(dateStr, content);
    if (result.ok) {
      localStorage.removeItem(CACHE_KEY_PREFIX + dateStr);
      if (DEBUG) console.log(`✅ PerformanceDB: salvato ${dateStr} (${mergedSnapshots.length} snapshot, ${(content.byteLength / 1024).toFixed(1)} KB)`);
    }
    return result;
  };

  // ============================================================
  // UPLOAD FILE SU GITHUB (Contents API) — con retry su 409
  // ============================================================

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  async function caricaFileSuGitHub(dateStr, content) {
    const pat = getPAT();
    if (!pat) return { ok: false, error: 'PAT non configurato' };

    const apiUrl = urlApi(dateStr);

    // Recupera SHA esistente
    let sha = null;
    try {
      const checkResp = await fetch(apiUrl + `?ref=${GITHUB_BRANCH}&t=${Date.now()}`, {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github+json',
        },
      });
      if (checkResp.ok) {
        const existing = await checkResp.json();
        sha = existing.sha;
      }
    } catch (e) {}

    const base64 = arrayBufferToBase64(content);

    const buildBody = (shaVal) => {
      const b = {
        message: `Performance DB update ${dateStr} - ${new Date().toISOString().slice(0, 19)}`,
        content: base64,
        branch: GITHUB_BRANCH,
      };
      if (shaVal) b.sha = shaVal;
      return b;
    };

    // Retry su 409 Conflict (SHA cambiato tra GET e PUT)
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      const body = buildBody(sha);

      try {
        const resp = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (resp.ok) return { ok: true };

        // 409 Conflict → rileggi SHA e riprova
        if (resp.status === 409 && tentativo < 2) {
          if (DEBUG) console.log(`🔄 Retry ${tentativo + 1}/3 per ${dateStr} (409 Conflict)`);
          try {
            const shaResp = await fetch(apiUrl + `?ref=${GITHUB_BRANCH}&t=${Date.now()}`, {
              headers: {
                'Authorization': `token ${pat}`,
                'Accept': 'application/vnd.github+json',
              },
            });
            if (shaResp.ok) {
              const shaData = await shaResp.json();
              sha = shaData.sha;
            }
          } catch (e) {}
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const err = await resp.json().catch(() => ({}));
        let msg = err.message || `HTTP ${resp.status}`;
        if (resp.status === 401) msg = 'PAT non valido o scaduto';
        if (resp.status === 403) msg = 'Permessi insufficienti';
        if (resp.status === 404) msg = 'Repo non trovato';
        if (resp.status === 409) msg = 'Conflitto SHA (dopo 3 tentativi)';
        if (resp.status === 422) msg = 'File troppo grande o SHA non valido';
        return { ok: false, error: msg };
      } catch (e) {
        if (tentativo === 2) {
          return { ok: false, error: 'Errore rete: ' + e.message };
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return { ok: false, error: 'Troppi tentativi falliti' };
  }

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.PerformanceDB = {
    isWriter,
    getCurrentUser,
    toDateStr,
    addDays,
    DB_DIR,
    GITHUB_USER,
    GITHUB_REPO,
    GITHUB_BRANCH,
    leggiGiorno,
    leggiIntervallo,
    listaGiorniDisponibili,
    salvaGiorno,
    clearCache,
  };

  console.log('✅ PerformanceDB v2 caricato - DB GitHub in ' + DB_DIR + ' + retry su 409');

})();