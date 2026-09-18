// ============================================================
// gestione-conto.js - Gestione conto MULTI-UTENTE con password
// - Ogni utente ha il suo conto protetto da password (SHA-256)
// - File Excel separati: excel/gestione_<username>.xlsx (branch master)
// - ⭐ Sync utenti su GitHub (excel/utenti.json) con MERGE intelligente
// - ⭐ PAT hardcodato per uso interno (tutti i dispositivi lo usano)
// - ⭐ PAT mascherato nel pannello (mostra solo ultimi 3 caratteri)
// - ⭐ FIX: eliminaUtente ora rimuove DAVVERO l'utente da GitHub
// - ⭐ FIX: creaUtente crea anche il file Excel iniziale su GitHub
// - ⭐ Export/Import manuale utenti (backup JSON)
// - ⭐ FIX: parsing SALDO INIZIALE dal file Excel
// - ⭐ FIX: saldo 0€ gestito correttamente
// - Settimana: Giovedì → Mercoledì successivo
// - Input data italiano GG/MM/AAAA
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  // ============================================================
  // CONFIGURAZIONE GITHUB
  // ============================================================

  const GITHUB_USER = 'Gesss26';
  const GITHUB_REPO = 'GesssAI-Pro---Auto';
  const GITHUB_BRANCH = 'master';
  const EXCEL_DIR = 'excel';

  const STORAGE_USERS = 'ft_gestione_utenti';
  const STORAGE_SESSION = 'ft_gestione_sessione';
  const STORAGE_PAT = 'ft_github_pat';
  const DEFAULT_SALDO_INIZIALE = 1000;

  const USERS_FILE = 'excel/utenti.json';

  // ============================================================
  // ⭐ PAT HARDCODATO (default per tutti i dispositivi)
  // ⚠️ ATTENZIONE: se il repo è pubblico, GitHub potrebbe invalidare
  //    automaticamente il token. Usa un repo PRIVATO o un token
  //    con permessi limitati al solo repo.
  // ============================================================

  // ⭐ SOSTITUISCI QUESTO CON IL TUO PAT REALE
  const DEFAULT_PAT = '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';

  const storageKeyConto = (user) => `ft_gestione_conto_${user}`;
  const storageKeySaldo = (user) => `ft_gestione_saldo_${user}`;
  const excelFilename = (user) => `gestione_${user}.xlsx`;

  // ============================================================
  // CRIPTO: SHA-256
  // ============================================================

  const sha256 = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const hashPassword = async (username, password) => {
    return await sha256(`gesssai::${username.toLowerCase()}::${password}`);
  };

  // ============================================================
  // PAT: getter/setter con fallback a DEFAULT_PAT
  // ============================================================

  const getPAT = () => {
    const savedPAT = localStorage.getItem(STORAGE_PAT);
    if (savedPAT && savedPAT.trim()) return savedPAT.trim();
    return DEFAULT_PAT;
  };

  const setPAT = (pat) => {
    if (pat && pat.trim()) localStorage.setItem(STORAGE_PAT, pat.trim());
    else localStorage.removeItem(STORAGE_PAT);
  };

  const isUsingDefaultPAT = () => {
    const savedPAT = localStorage.getItem(STORAGE_PAT);
    return !savedPAT || !savedPAT.trim();
  };

  // ⭐ Maschera un PAT mostrando solo gli ultimi 3 caratteri
  const mascheraPAT = (pat) => {
    if (!pat || pat.length < 4) return 'xxx...xxx';
    const ultimi3 = pat.slice(-3);
    return `xxx...xxx${ultimi3}`;
  };

  // ============================================================
  // UTILITÀ SALDO
  // ============================================================

  const parseSaldoSafe = (value, fallback = DEFAULT_SALDO_INIZIALE) => {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) return fallback;
    return parsed;
  };

  const coalesceSaldo = (primary, secondary = DEFAULT_SALDO_INIZIALE) => {
    if (primary !== null && primary !== undefined && primary !== '') {
      const parsed = typeof primary === 'number' ? primary : parseFloat(primary);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    if (secondary !== null && secondary !== undefined && secondary !== '') {
      const parsed = typeof secondary === 'number' ? secondary : parseFloat(secondary);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return DEFAULT_SALDO_INIZIALE;
  };

  // ============================================================
  // GESTIONE UTENTI (locale)
  // ============================================================

  const loadUtenti = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  };

  const saveUtenti = (utenti) => {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(utenti));
  };

  const getUtente = (username) => {
    return loadUtenti().find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  };

  // ============================================================
  // MERGE UTENTI (locali + remoti) - solo per aggiungere
  // ============================================================

  const mergeUtenti = (locali, remoti) => {
    const map = new Map();
    (remoti || []).forEach(u => {
      if (u && u.username) map.set(u.username.toLowerCase(), u);
    });
    (locali || []).forEach(u => {
      if (!u || !u.username) return;
      const key = u.username.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, u);
      } else {
        const dataLocal = new Date(u.creatoIl || 0);
        const dataRemote = new Date(existing.creatoIl || 0);
        if (dataLocal > dataRemote || (!existing.hash && u.hash)) {
          map.set(key, u);
        }
      }
    });
    return Array.from(map.values());
  };

  // ============================================================
  // SINCRONIZZAZIONE UTENTI SU GITHUB
  // ============================================================

  const scaricaUtentiDaGitHub = async () => {
    const urls = [
      `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${USERS_FILE}?t=${Date.now()}`,
      `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${USERS_FILE}?t=${Date.now()}`,
    ];

    for (const url of urls) {
      try {
        const resp = await fetch(url, { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            console.log(`✅ Utenti scaricati da GitHub: ${data.length}`);
            return data;
          }
        }
      } catch (e) {
        console.warn('Tentativo fallito:', url.split('/')[2]);
      }
    }
    return null;
  };

  // ⭐ Upload con MERGE (per AGGIUNGERE utenti senza perdere quelli di altri dispositivi)
  const caricaUtentiSuGitHub = async () => {
    const pat = getPAT();
    if (!pat) {
      console.warn('⚠️ PAT non configurato, skip upload utenti');
      return { ok: false, error: 'PAT non configurato' };
    }

    const locali = loadUtenti();
    let remoti = [];
    try {
      const downloaded = await scaricaUtentiDaGitHub();
      if (Array.isArray(downloaded)) {
        remoti = downloaded;
        console.log(`📥 Remoti scaricati per merge: ${remoti.length} utenti`);
      }
    } catch (e) {
      console.warn('⚠️ Impossibile scaricare remoti per merge:', e);
    }

    const merged = mergeUtenti(locali, remoti);
    console.log(`🔄 Merge per upload: ${locali.length} locali + ${remoti.length} remoti = ${merged.length} totali`);

    if (merged.length !== locali.length || JSON.stringify(merged) !== JSON.stringify(locali)) {
      saveUtenti(merged);
    }

    const json = JSON.stringify(merged, null, 2);
    const encoder = new TextEncoder();
    const content = encoder.encode(json);

    return await caricaFileSuGitHub(
      USERS_FILE,
      content,
      `Update utenti.json - ${new Date().toISOString().slice(0, 19)}`
    );
  };

  // ⭐ NUOVO: Upload FORZATO senza merge (per ELIMINARE utenti)
  const caricaUtentiSuGitHubForzato = async () => {
    const pat = getPAT();
    if (!pat) {
      console.warn('⚠️ PAT non configurato');
      return { ok: false, error: 'PAT non configurato' };
    }

    // NON fare merge: usa SOLO la lista locale
    const utenti = loadUtenti();
    console.log(`📤 Upload FORZATO (no merge): ${utenti.length} utenti →`, utenti.map(u => u.username));

    const json = JSON.stringify(utenti, null, 2);
    const encoder = new TextEncoder();
    const content = encoder.encode(json);

    return await caricaFileSuGitHub(
      USERS_FILE,
      content,
      `Update utenti.json (forzato) - ${new Date().toISOString().slice(0, 19)}`
    );
  };

  const sincronizzaUtenti = async (silent = false) => {
    try {
      const locali = loadUtenti();
      const remoti = await scaricaUtentiDaGitHub();

      if (remoti === null) {
        if (!silent) console.log('ℹ️ Nessun utenti.json remoto trovato');
        return { ok: false, motivo: 'no-remote', utenti: locali };
      }

      const merged = mergeUtenti(locali, remoti);

      if (merged.length !== locali.length || JSON.stringify(merged) !== JSON.stringify(locali)) {
        saveUtenti(merged);
        console.log(`🔄 Utenti sincronizzati: ${locali.length} locali + ${remoti.length} remoti = ${merged.length}`);

        if (getPAT() && merged.length > remoti.length) {
          await caricaUtentiSuGitHub();
        }
      }

      return { ok: true, utenti: merged };
    } catch (e) {
      console.warn('Errore sincronizzazione utenti:', e);
      return { ok: false, error: e.message, utenti: loadUtenti() };
    }
  };

  // ============================================================
  // CRUD UTENTI
  // ============================================================

  const creaUtente = async (username, password) => {
    const uname = username.trim();
    if (!uname || uname.length < 2) throw new Error('Username troppo corto (min 2 caratteri)');
    if (!/^[a-zA-Z0-9_-]+$/.test(uname)) throw new Error('Solo lettere, numeri, _ e - consentiti');
    if (!password || password.length < 3) throw new Error('Password troppo corta (min 3 caratteri)');
    if (getUtente(uname)) throw new Error('Username già esistente');

    const hash = await hashPassword(uname, password);
    const utenti = loadUtenti();
    utenti.push({
      username: uname,
      hash,
      creatoIl: new Date().toISOString(),
    });
    saveUtenti(utenti);

    // ⭐ 1. Upload utenti.json con merge (non perdere utenti di altri)
    if (getPAT()) {
      caricaUtentiSuGitHub().then(r => {
        if (r.ok) console.log('✅ utenti.json aggiornato su GitHub dopo registrazione');
        else console.warn('⚠️ Upload utenti fallito:', r.error);
      });
    }

    // ⭐ 2. Crea anche file Excel vuoto su GitHub (per far esistere il file)
    if (getPAT()) {
      (async () => {
        try {
          const wb = buildWorkbook(uname, [], DEFAULT_SALDO_INIZIALE);
          const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          const filepath = `${EXCEL_DIR}/${excelFilename(uname)}`;
          const result = await caricaFileSuGitHub(
            filepath,
            wbout,
            `Crea file gestione iniziale per ${uname} - ${new Date().toISOString().slice(0, 19)}`
          );
          if (result.ok) console.log(`✅ File Excel iniziale creato per ${uname}`);
          else console.warn(`⚠️ File Excel per ${uname} non creato:`, result.error);
        } catch (e) {
          console.warn('⚠️ Errore creazione file Excel iniziale:', e);
        }
      })();
    }

    return uname;
  };

  // ⭐ FIX: eliminaUtente ora usa upload FORZATO (no merge)
  const eliminaUtente = (username) => {
    const utenti = loadUtenti().filter(u => u.username !== username);
    saveUtenti(utenti);
    localStorage.removeItem(storageKeyConto(username));
    localStorage.removeItem(storageKeySaldo(username));
    const sessione = loadSessione();
    if (sessione && sessione.toLowerCase() === username.toLowerCase()) {
      localStorage.removeItem(STORAGE_SESSION);
    }

    // ⭐ FIX: upload FORZATO senza merge (per rimuovere davvero da GitHub)
    if (getPAT()) {
      caricaUtentiSuGitHubForzato().then(r => {
        if (r.ok) console.log('✅ utenti.json aggiornato su GitHub (delete forzato)');
        else console.warn('⚠️ Upload utenti fallito:', r.error);
      });
    }
  };

  const verificaPassword = async (username, password) => {
    const u = getUtente(username);
    if (!u) return false;
    const hash = await hashPassword(u.username, password);
    return hash === u.hash;
  };

  const loadSessione = () => localStorage.getItem(STORAGE_SESSION) || null;
  const saveSessione = (username) => {
    if (username) localStorage.setItem(STORAGE_SESSION, username);
    else localStorage.removeItem(STORAGE_SESSION);
  };

  // ============================================================
  // UPLOAD SU GITHUB (Contents API)
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

  async function caricaFileSuGitHub(filepath, content, commitMessage = 'Update da GesssAI-Pro') {
    const pat = getPAT();
    if (!pat) {
      console.warn('PAT GitHub non configurato');
      return { ok: false, error: 'PAT non configurato' };
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filepath}`;

    let sha = null;
    try {
      const checkResp = await fetch(apiUrl + `?ref=${GITHUB_BRANCH}`, {
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

    const body = {
      message: commitMessage,
      content: base64,
      branch: GITHUB_BRANCH,
    };
    if (sha) body.sha = sha;

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

      if (resp.ok) {
        return { ok: true };
      } else {
        const err = await resp.json().catch(() => ({}));
        let msg = err.message || `HTTP ${resp.status}`;
        if (resp.status === 401) msg = 'PAT non valido o scaduto';
        if (resp.status === 403) msg = 'Permessi insufficienti (serve scope "repo")';
        if (resp.status === 404) msg = 'Repo non trovato o PAT senza accesso';
        return { ok: false, error: msg };
      }
    } catch (e) {
      return { ok: false, error: 'Errore rete: ' + e.message };
    }
  }

  // ============================================================
  // DOWNLOAD DA GITHUB
  // ============================================================

  const getDownloadUrls = (user) => [
    `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${EXCEL_DIR}/${excelFilename(user)}?t=${Date.now()}`,
    `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${EXCEL_DIR}/${excelFilename(user)}?t=${Date.now()}`,
    `/${GITHUB_REPO}/${EXCEL_DIR}/${excelFilename(user)}?t=${Date.now()}`,
  ];

  // ============================================================
  // UTILITÀ DATE
  // ============================================================

  const getGiovediSettimana = (dateInput) => {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    let offset;
    if (day === 4) offset = 0;
    else if (day === 5) offset = -1;
    else if (day === 6) offset = -2;
    else if (day === 0) offset = -3;
    else if (day === 1) offset = -4;
    else if (day === 2) offset = -5;
    else offset = -6;
    const giovedi = new Date(d);
    giovedi.setDate(d.getDate() + offset);
    return giovedi;
  };

  const getMercolediSuccessivo = (giovedi) => {
    const mercoledi = new Date(giovedi);
    mercoledi.setDate(giovedi.getDate() + 6);
    return mercoledi;
  };

  const formatDateIT = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const toDateStr = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getWeekLabel = (giovedi) => {
    const mercoledi = getMercolediSuccessivo(giovedi);
    return `${formatDateIT(toDateStr(giovedi))} → ${formatDateIT(toDateStr(mercoledi))}`;
  };

  const getMonthLabel = (dateInput) => {
    const d = new Date(dateInput);
    const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    return `${mesi[d.getMonth()]} ${d.getFullYear()}`;
  };

  // ============================================================
  // PARSING EXCEL
  // ============================================================

  const parseExcelGestione = (arrayBuffer) => {
    try {
      if (typeof XLSX === 'undefined') return null;
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) return { movimenti: [], saldoIniziale: DEFAULT_SALDO_INIZIALE };

      const headers = Object.keys(rows[0]);
      const findCol = (keys) => {
        for (const k of keys) {
          const found = headers.find(h => h.toLowerCase().includes(k.toLowerCase()));
          if (found) return found;
        }
        return null;
      };

      const colData = findCol(['data', 'date']);
      const colImporto = findCol(['importo giocato', 'importo', 'puntata', 'stake']);
      const colEsito = findCol(['esito', 'vinta', 'risultato', 'stato']);
      const colVincita = findCol(['importo vinto', 'vincita', 'vinto', 'ritorno']);

      const movimenti = [];
      let saldoIniziale = DEFAULT_SALDO_INIZIALE;
      let saldoTrovato = false;

      rows.forEach((row, i) => {
        if (!saldoTrovato && colEsito && colVincita) {
          const esito = String(row[colEsito] || '').toUpperCase().trim();
          if (esito.includes('SALDO INIZIALE') || esito === 'SALDO') {
            const sv = parseFloat(row[colVincita]);
            if (!isNaN(sv) && sv >= 0) {
              saldoIniziale = sv;
              saldoTrovato = true;
              console.log('💰 SALDO INIZIALE trovato nel file:', sv);
            }
            return;
          }
        }

        const dataRaw = row[colData];
        const importoGiocato = parseFloat(row[colImporto]) || 0;
        const esitoRaw = String(row[colEsito] || '').trim().toLowerCase();
        const importoVinto = parseFloat(row[colVincita]) || 0;

        if (!dataRaw || importoGiocato <= 0) return;

        let dataStr;
        if (typeof dataRaw === 'number') {
          const epoch = new Date(1899, 11, 30);
          dataStr = toDateStr(new Date(epoch.getTime() + dataRaw * 86400000));
        } else if (String(dataRaw).match(/^\d{4}-\d{2}-\d{2}/)) {
          dataStr = String(dataRaw).slice(0, 10);
        } else if (String(dataRaw).match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const p = String(dataRaw).split('/');
          dataStr = `${p[2]}-${p[1]}-${p[0]}`;
        } else {
          const d = new Date(dataRaw);
          if (isNaN(d.getTime())) return;
          dataStr = toDateStr(d);
        }

        let esito = 'pending';
        if (esitoRaw === 'vinta' || esitoRaw === 'win' || esitoRaw === 'won' || esitoRaw === 'si') esito = 'win';
        else if (esitoRaw === 'persa' || esitoRaw === 'loss' || esitoRaw === 'lost' || esitoRaw === 'no') esito = 'loss';

        movimenti.push({
          id: 'excel_' + i + '_' + Date.now().toString(36),
          data: dataStr,
          importoGiocato,
          esito,
          importoVinto: esito === 'win' ? importoVinto : 0,
          note: String(row['note'] || row['descrizione'] || ''),
        });
      });

      console.log('📊 Parsing completato:', { movimenti: movimenti.length, saldoIniziale });
      return { movimenti, saldoIniziale };
    } catch (e) {
      console.error('Errore parsing gestione.xlsx:', e);
      return null;
    }
  };

  // ============================================================
  // LOAD/SAVE GESTIONE LOCALE
  // ============================================================

  const loadGestioneFromLocal = (username) => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKeyConto(username)) || 'null');
      const saldoRaw = localStorage.getItem(storageKeySaldo(username));

      const saldoLocale = parseSaldoSafe(saldoRaw, null);

      if (saved && Array.isArray(saved.movimenti)) {
        const savedSaldo = coalesceSaldo(
          saved.saldoIniziale,
          saldoLocale !== null ? saldoLocale : DEFAULT_SALDO_INIZIALE
        );
        return { movimenti: saved.movimenti, saldoIniziale: savedSaldo };
      }

      if (saldoLocale !== null) {
        return { movimenti: [], saldoIniziale: saldoLocale };
      }
    } catch (e) {
      console.warn('Errore loadGestioneFromLocal:', e);
    }
    return { movimenti: [], saldoIniziale: DEFAULT_SALDO_INIZIALE };
  };

  const saveGestioneToLocal = (username, movimenti, saldoIniziale) => {
    try {
      const saldoDaSalvare = (saldoIniziale !== null && saldoIniziale !== undefined && !isNaN(saldoIniziale))
        ? saldoIniziale
        : DEFAULT_SALDO_INIZIALE;

      localStorage.setItem(
        storageKeyConto(username),
        JSON.stringify({
          movimenti,
          saldoIniziale: saldoDaSalvare,
          updatedAt: new Date().toISOString(),
        })
      );
      localStorage.setItem(storageKeySaldo(username), String(saldoDaSalvare));
    } catch (e) {
      console.warn('Errore salvataggio gestione:', e);
    }
  };

  // ============================================================
  // GENERAZIONE WORKBOOK
  // ============================================================

  const buildWorkbook = (username, movimenti, saldoIniziale) => {
    const righe = movimenti
      .slice()
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .map(m => ({
        'Data': m.data,
        'Importo Giocato': m.importoGiocato,
        'Esito': m.esito === 'win' ? 'Vinta' : m.esito === 'loss' ? 'Persa' : 'In attesa',
        'Importo Vinto': m.esito === 'win' ? m.importoVinto : 0,
        'Profitto': m.esito === 'win' ? (m.importoVinto - m.importoGiocato) : m.esito === 'loss' ? -m.importoGiocato : 0,
        'Note': m.note || '',
      }));

    righe.unshift({
      'Data': '',
      'Importo Giocato': '',
      'Esito': 'SALDO INIZIALE',
      'Importo Vinto': saldoIniziale,
      'Profitto': '',
      'Note': `Utente: ${username} - Generato il ${formatDateIT(toDateStr(new Date()))}`,
    });

    const ws = XLSX.utils.json_to_sheet(righe);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gestione');
    return wb;
  };

  const esportaExcel = (username, movimenti, saldoIniziale) => {
    if (typeof XLSX === 'undefined') {
      alert('Libreria XLSX non disponibile');
      return;
    }
    const wb = buildWorkbook(username, movimenti, saldoIniziale);
    XLSX.writeFile(wb, excelFilename(username));
  };

  // ============================================================
  // CALCOLI STATISTICHE
  // ============================================================

  const calcolaSaldoCorrente = (movimenti, saldoIniziale) => {
    let saldo = saldoIniziale;
    movimenti.forEach(m => {
      if (m.esito === 'win') saldo += (m.importoVinto - m.importoGiocato);
      else if (m.esito === 'loss') saldo -= m.importoGiocato;
    });
    return saldo;
  };

  const calcolaStatistiche = (movimenti, saldoIniziale) => {
    const completati = movimenti.filter(m => m.esito === 'win' || m.esito === 'loss');
    const vinte = completati.filter(m => m.esito === 'win');
    const perse = completati.filter(m => m.esito === 'loss');
    const pending = movimenti.filter(m => m.esito === 'pending');

    const totaleGiocato = completati.reduce((s, m) => s + m.importoGiocato, 0);
    const totaleVinto = vinte.reduce((s, m) => s + m.importoVinto, 0);
    const profitto = totaleVinto - totaleGiocato;
    const roi = totaleGiocato > 0 ? (profitto / totaleGiocato) * 100 : 0;
    const winRate = completati.length > 0 ? (vinte.length / completati.length) * 100 : 0;

    return {
      saldoCorrente: saldoIniziale + profitto,
      totaleGiocato,
      totaleVinto,
      profitto,
      roi,
      winRate,
      numVinte: vinte.length,
      numPerse: perse.length,
      numPending: pending.length,
      numTotale: completati.length,
    };
  };

  const raggruppaPerPeriodo = (movimenti, saldoIniziale, tipo) => {
    const completati = movimenti
      .filter(m => m.esito === 'win' || m.esito === 'loss')
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    if (completati.length === 0) return [];
    const groups = new Map();

    completati.forEach(m => {
      const d = new Date(m.data + 'T00:00:00');
      let key, label;
      if (tipo === 'giornaliero') {
        key = m.data; label = formatDateIT(m.data);
      } else if (tipo === 'settimanale') {
        const gio = getGiovediSettimana(d);
        key = toDateStr(gio); label = getWeekLabel(gio);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = getMonthLabel(d);
      }
      if (!groups.has(key)) groups.set(key, { key, label, giocato: 0, vinto: 0, profitto: 0, count: 0, dataOrdine: key });
      const g = groups.get(key);
      g.giocato += m.importoGiocato;
      if (m.esito === 'win') g.vinto += m.importoVinto;
      g.profitto = g.vinto - g.giocato;
      g.count++;
    });

    return Array.from(groups.values()).sort((a, b) => a.dataOrdine.localeCompare(b.dataOrdine));
  };

  // ============================================================
  // INPUT DATA ITALIANO
  // ============================================================

  const DataInputItaliano = ({ value, onChange }) => {
    const parseISO = (iso) => {
      if (!iso) return { g: '', m: '', a: '' };
      const parts = iso.split('-');
      if (parts.length !== 3) return { g: '', m: '', a: '' };
      return { g: parts[2], m: parts[1], a: parts[0] };
    };

    const [giorno, setGiorno] = useState(() => parseISO(value).g);
    const [mese, setMese] = useState(() => parseISO(value).m);
    const [anno, setAnno] = useState(() => parseISO(value).a);

    const meseRef = useRef(null);
    const annoRef = useRef(null);

    useEffect(() => {
      const p = parseISO(value);
      setGiorno(p.g); setMese(p.m); setAnno(p.a);
    }, [value]);

    const emitChange = (g, m, a) => {
      if (g && m && a && g.length === 2 && m.length === 2 && a.length === 4) {
        onChange(`${a}-${m}-${g}`);
      }
    };

    const handleGiorno = (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 2);
      setGiorno(v);
      if (v.length === 2) meseRef.current?.focus();
      emitChange(v, mese, anno);
    };

    const handleMese = (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 2);
      if (v.length === 2) {
        const n = parseInt(v, 10);
        if (n > 12) v = '12';
        if (n < 1) v = '01';
      }
      setMese(v);
      if (v.length === 2) annoRef.current?.focus();
      emitChange(giorno, v, anno);
    };

    const handleAnno = (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
      setAnno(v);
      emitChange(giorno, mese, v);
    };

    const handleBlur = (campo) => {
      if (campo === 'g' && giorno.length === 1) {
        const nv = '0' + giorno;
        setGiorno(nv); emitChange(nv, mese, anno);
      }
      if (campo === 'm' && mese.length === 1) {
        const n = parseInt(mese, 10);
        const nv = n < 10 ? '0' + n : String(n);
        setMese(nv); emitChange(giorno, nv, anno);
      }
    };

    const inputStyle = {
      padding: '8px 6px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      color: 'var(--text)',
      borderRadius: '6px',
      fontSize: '14px',
      textAlign: 'center',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      letterSpacing: '1px',
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input type="text" inputMode="numeric" placeholder="GG"
          value={giorno} onChange={handleGiorno} onBlur={() => handleBlur('g')} maxLength={2}
          style={{ ...inputStyle, width: '48px', flex: '0 0 auto' }} />
        <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '16px' }}>/</span>
        <input ref={meseRef} type="text" inputMode="numeric" placeholder="MM"
          value={mese} onChange={handleMese} onBlur={() => handleBlur('m')} maxLength={2}
          style={{ ...inputStyle, width: '48px', flex: '0 0 auto' }} />
        <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '16px' }}>/</span>
        <input ref={annoRef} type="text" inputMode="numeric" placeholder="AAAA"
          value={anno} onChange={handleAnno} maxLength={4}
          style={{ ...inputStyle, flex: 1, minWidth: '60px' }} />
      </div>
    );
  };

  // ============================================================
  // SCHERMATA REGISTRAZIONE
  // ============================================================

  const SchermataRegistrazione = ({ onRegistrato }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);

    const handleSubmit = async () => {
      setMsg(null);
      if (password !== password2) {
        setMsg({ type: 'error', text: '⚠️ Le password non coincidono' });
        return;
      }
      setBusy(true);
      try {
        const uname = await creaUtente(username, password);
        setMsg({ type: 'success', text: '✅ Utente creato! Accesso in corso...' });
        setTimeout(() => onRegistrato(uname), 800);
      } catch (e) {
        setMsg({ type: 'error', text: '⚠️ ' + e.message });
      } finally {
        setBusy(false);
      }
    };

    return (
      <div style={{
        maxWidth: '420px', margin: '60px auto', padding: '32px',
        background: 'var(--card)', borderRadius: '16px',
        border: '2px solid var(--accent)', boxShadow: '0 8px 40px rgba(243, 156, 18, 0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '56px', marginBottom: '8px' }}>👤</div>
          <h2 style={{ color: 'var(--accent)', margin: '0 0 6px 0' }}>Benvenuto in GesssAI-Pro</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Crea il tuo account per gestire il conto
          </p>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
            👤 Username
          </label>
          <input type="text" value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Es. Mario"
            style={{ width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '8px', fontSize: '14px' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
            🔒 Password
          </label>
          <input type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 3 caratteri"
            style={{ width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '8px', fontSize: '14px' }} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
            🔒 Conferma Password
          </label>
          <input type="password" value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ripeti password"
            style={{ width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '8px', fontSize: '14px' }} />
        </div>

        <button onClick={handleSubmit} disabled={busy}
          style={{
            width: '100%', padding: '14px', background: 'var(--accent)', color: '#000',
            border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px',
            cursor: busy ? 'wait' : 'pointer', transition: 'all 0.15s',
            opacity: busy ? 0.6 : 1,
          }}>
          {busy ? '⏳ Creazione...' : '✨ Registrati'}
        </button>

        {msg && (
          <div style={{
            marginTop: '14px', padding: '10px 14px', borderRadius: '6px',
            background: msg.type === 'success' ? 'rgba(111, 207, 151, 0.15)' : 'rgba(235, 87, 87, 0.15)',
            border: `1px solid ${msg.type === 'success' ? 'var(--win)' : 'var(--lose)'}`,
            color: msg.type === 'success' ? 'var(--win)' : 'var(--lose)',
            fontSize: '13px', fontWeight: 'bold', textAlign: 'center',
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ marginTop: '18px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.5' }}>
          🔐 Le password sono hashate con SHA-256 e non vengono mai salvate in chiaro.
        </div>
      </div>
    );
  };

  // ============================================================
  // SCHERMATA SELEZIONE UTENTE
  // ============================================================

  const SchermataSelezioneUtente = ({ utenti, onLogin, onUtentiCambiati }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [nuovoUser, setNuovoUser] = useState('');
    const [nuovaPass, setNuovaPass] = useState('');
    const [nuovaPass2, setNuovaPass2] = useState('');
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
      setSyncing(true);
      setMsg({ type: 'info', text: '🔄 Sincronizzazione...' });
      const result = await sincronizzaUtenti(false);
      setSyncing(false);
      if (result.ok) {
        setMsg({ type: 'success', text: `✅ ${result.utenti.length} utenti sincronizzati` });
        onUtentiCambiati();
      } else {
        setMsg({ type: 'error', text: '❌ Impossibile sincronizzare con GitHub' });
      }
      setTimeout(() => setMsg(null), 3000);
    };

    const handleLogin = async () => {
      if (!selectedUser) return;
      setBusy(true); setMsg(null);
      const ok = await verificaPassword(selectedUser.username, password);
      if (ok) {
        setMsg({ type: 'success', text: '✅ Accesso consentito' });
        setTimeout(() => onLogin(selectedUser.username), 400);
      } else {
        setMsg({ type: 'error', text: '❌ Password errata' });
        setPassword('');
      }
      setBusy(false);
    };

    const handleAdd = async () => {
      setMsg(null);
      if (nuovaPass !== nuovaPass2) {
        setMsg({ type: 'error', text: '⚠️ Le password non coincidono' });
        return;
      }
      setBusy(true);
      try {
        await creaUtente(nuovoUser, nuovaPass);
        setMsg({ type: 'success', text: '✅ Utente creato!' });
        setNuovoUser(''); setNuovaPass(''); setNuovaPass2('');
        setTimeout(() => { setShowAdd(false); onUtentiCambiati(); }, 800);
      } catch (e) {
        setMsg({ type: 'error', text: '⚠️ ' + e.message });
      } finally {
        setBusy(false);
      }
    };

    const handleDelete = (user) => {
      if (!window.confirm(`Eliminare l'utente "${user.username}" e TUTTI i suoi dati?`)) return;
      eliminaUtente(user.username);
      onUtentiCambiati();
    };

    return (
      <div style={{
        maxWidth: '680px', margin: '40px auto', padding: '32px',
        background: 'var(--card)', borderRadius: '16px',
        border: '2px solid var(--border)', boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '56px', marginBottom: '8px' }}>👥</div>
          <h2 style={{ color: 'var(--accent)', margin: '0 0 6px 0' }}>Chi sta usando il conto?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Seleziona il tuo profilo e inserisci la password
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <button onClick={handleSync} disabled={syncing}
            style={{
              padding: '6px 16px', background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '6px',
              fontSize: '11px', fontWeight: 'bold', cursor: syncing ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
            🔄 {syncing ? 'Sincronizzazione...' : 'Sincronizza da GitHub'}
          </button>
        </div>

        {!selectedUser && !showAdd && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px', marginBottom: '16px',
            }}>
              {utenti.map(u => (
                <div key={u.username} style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setSelectedUser(u); setPassword(''); setMsg(null); }}
                    style={{
                      width: '100%', padding: '16px 12px', background: 'var(--surface)',
                      border: '2px solid var(--border)', borderRadius: '12px',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: 'var(--accent)', color: '#000', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', fontWeight: 'bold',
                    }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>
                      {u.username}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    title="Elimina utente"
                    style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      background: 'var(--lose)', color: '#fff', border: 'none',
                      borderRadius: '50%', width: '24px', height: '24px',
                      cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                  >✕</button>
                </div>
              ))}

              <button
                onClick={() => { setShowAdd(true); setMsg(null); }}
                style={{
                  padding: '16px 12px', background: 'transparent',
                  border: '2px dashed var(--border)', borderRadius: '12px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  color: 'var(--text-muted)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <div style={{ fontSize: '32px' }}>➕</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Nuovo utente</div>
              </button>
            </div>
          </>
        )}

        {selectedUser && !showAdd && (
          <div style={{
            padding: '20px', background: 'var(--surface)', borderRadius: '12px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'var(--accent)', color: '#000', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: 'bold',
              }}>
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text)' }}>
                  {selectedUser.username}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Inserisci la password per accedere
                </div>
              </div>
            </div>

            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="🔒 Password"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', background: 'var(--card)',
                border: '1px solid var(--border)', color: 'var(--text)',
                borderRadius: '8px', fontSize: '15px', marginBottom: '12px',
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setSelectedUser(null); setPassword(''); setMsg(null); }}
                style={{
                  padding: '10px 18px', background: 'var(--surface)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                }}
              >← Cambia utente</button>
              <button
                onClick={handleLogin} disabled={busy || !password}
                style={{
                  flex: 1, padding: '10px 18px', background: 'var(--accent)', color: '#000',
                  border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px',
                  cursor: busy || !password ? 'not-allowed' : 'pointer',
                  opacity: busy || !password ? 0.5 : 1,
                }}
              >
                {busy ? '⏳ Verifica...' : '🔓 Accedi'}
              </button>
            </div>
          </div>
        )}

        {showAdd && (
          <div style={{
            padding: '20px', background: 'var(--surface)', borderRadius: '12px',
            border: '2px solid var(--accent)',
          }}>
            <h3 style={{ margin: '0 0 14px 0', color: 'var(--accent)', fontSize: '15px' }}>
              ➕ Nuovo Utente
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
                👤 Username
              </label>
              <input type="text" value={nuovoUser}
                onChange={(e) => setNuovoUser(e.target.value)}
                placeholder="Es. Luca"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '8px', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
                🔒 Password
              </label>
              <input type="password" value={nuovaPass}
                onChange={(e) => setNuovaPass(e.target.value)}
                placeholder="Min 3 caratteri"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '8px', fontSize: '14px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
                🔒 Conferma Password
              </label>
              <input type="password" value={nuovaPass2}
                onChange={(e) => setNuovaPass2(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Ripeti password"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '8px', fontSize: '14px' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setShowAdd(false); setMsg(null); }}
                style={{
                  padding: '10px 18px', background: 'var(--surface)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                }}
              >← Annulla</button>
              <button
                onClick={handleAdd} disabled={busy}
                style={{
                  flex: 1, padding: '10px 18px', background: 'var(--accent)', color: '#000',
                  border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px',
                  cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                }}
              >{busy ? '⏳...' : '✨ Crea Utente'}</button>
            </div>
          </div>
        )}

        {msg && (
          <div style={{
            marginTop: '14px', padding: '10px 14px', borderRadius: '6px',
            background: msg.type === 'success' ? 'rgba(111, 207, 151, 0.15)'
              : msg.type === 'error' ? 'rgba(235, 87, 87, 0.15)'
              : 'rgba(52, 152, 219, 0.15)',
            border: `1px solid ${msg.type === 'success' ? 'var(--win)' : msg.type === 'error' ? 'var(--lose)' : '#3498db'}`,
            color: msg.type === 'success' ? 'var(--win)' : msg.type === 'error' ? 'var(--lose)' : '#3498db',
            fontSize: '13px', fontWeight: 'bold', textAlign: 'center',
          }}>
            {msg.text}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // FORM INSERIMENTO
  // ============================================================

  const FormInserimento = ({ onAdd, movimenti, saldoIniziale }) => {
    const [data, setData] = useState(() => toDateStr(new Date()));
    const [importoGiocato, setImportoGiocato] = useState('');
    const [importoVinto, setImportoVinto] = useState('');
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState(null);

    const saldoCorrente = useMemo(
      () => calcolaSaldoCorrente(movimenti, saldoIniziale),
      [movimenti, saldoIniziale]
    );

    const dataItaliana = useMemo(() => {
      if (!data) return '';
      const p = data.split('-');
      if (p.length !== 3) return '';
      return `${p[2]}/${p[1]}/${p[0]}`;
    }, [data]);

    const handleAdd = (esito) => {
      const ig = parseFloat(importoGiocato);
      if (!data || isNaN(ig) || ig <= 0) {
        setMsg({ type: 'error', text: '⚠️ Inserisci data e importo giocato validi' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }
      const iv = parseFloat(importoVinto);
      if (esito === 'win' && (isNaN(iv) || iv <= 0)) {
        setMsg({ type: 'error', text: '⚠️ Inserisci l\'importo vinto per la giocata vincente' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }
      onAdd({
        id: 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        data,
        importoGiocato: ig,
        esito,
        importoVinto: esito === 'win' ? iv : 0,
        note: note.trim(),
      });
      setImportoGiocato('');
      setImportoVinto('');
      setNote('');
      setMsg({ type: 'success', text: esito === 'win' ? '✅ Giocata VINTA registrata!' : '❌ Giocata PERSA registrata!' });
      setTimeout(() => setMsg(null), 2500);
    };

    return (
      <div style={{
        background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)',
        padding: '18px', marginBottom: '20px',
      }}>
        <h4 style={{ margin: '0 0 14px 0', color: 'var(--accent)', fontSize: '15px' }}>
          ➕ Nuova Giocata
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
              📅 Data {dataItaliana && <span style={{ color: 'var(--accent)', fontWeight: 'normal' }}>({dataItaliana})</span>}
            </label>
            <DataInputItaliano value={data} onChange={setData} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
              💵 Importo Giocato (€)
            </label>
            <input type="number" step="0.01" min="0" value={importoGiocato}
              onChange={(e) => setImportoGiocato(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
              🏆 Importo Vinto (€)
            </label>
            <input type="number" step="0.01" min="0" value={importoVinto}
              onChange={(e) => setImportoVinto(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
              📝 Note (opz.)
            </label>
            <input type="text" value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Es. Milan-Roma Over 2.5"
              style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => handleAdd('win')}
            style={{
              flex: 1, minWidth: '140px', padding: '12px 20px',
              background: 'var(--win)', color: '#000', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(111, 207, 151, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >✅ VINTA</button>
          <button onClick={() => handleAdd('loss')}
            style={{
              flex: 1, minWidth: '140px', padding: '12px 20px',
              background: 'var(--lose)', color: '#fff', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(235, 87, 87, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >❌ PERSA</button>
          <div style={{
            padding: '10px 16px', background: 'var(--surface)', borderRadius: '8px',
            border: '1px solid var(--border)', fontSize: '13px', fontWeight: 'bold',
          }}>
            💰 Saldo: <span style={{ color: saldoCorrente >= saldoIniziale ? 'var(--win)' : 'var(--lose)' }}>
              €{saldoCorrente.toFixed(2)}
            </span>
          </div>
        </div>

        {msg && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '6px',
            background: msg.type === 'success' ? 'rgba(111, 207, 151, 0.15)' : 'rgba(235, 87, 87, 0.15)',
            border: `1px solid ${msg.type === 'success' ? 'var(--win)' : 'var(--lose)'}`,
            color: msg.type === 'success' ? 'var(--win)' : 'var(--lose)',
            fontSize: '13px', fontWeight: 'bold',
          }}>
            {msg.text}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // GRAFICO SVG
  // ============================================================

  const GraficoAndamento = ({ movimenti, saldoIniziale }) => {
    const [hoverIdx, setHoverIdx] = useState(null);

    const punti = useMemo(() => {
      const completati = movimenti
        .filter(m => m.esito === 'win' || m.esito === 'loss')
        .sort((a, b) => new Date(a.data) - new Date(b.data));
      let saldo = saldoIniziale;
      const arr = [{ idx: 0, data: 'Inizio', saldo }];
      completati.forEach((m) => {
        if (m.esito === 'win') saldo += (m.importoVinto - m.importoGiocato);
        else saldo -= m.importoGiocato;
        arr.push({ data: formatDateIT(m.data), saldo });
      });
      return arr;
    }, [movimenti, saldoIniziale]);

    if (punti.length < 2) {
      return (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)',
          background: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--border)',
        }}>
          📈 Nessun dato sufficiente per il grafico.
          <br />
          <span style={{ fontSize: '12px' }}>Inserisci almeno una giocata con esito.</span>
        </div>
      );
    }

    const W = 900, H = 320;
    const PAD_L = 60, PAD_R = 20, PAD_T = 20, PAD_B = 50;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    const saldi = punti.map(p => p.saldo);
    const minS = Math.min(...saldi, saldoIniziale);
    const maxS = Math.max(...saldi, saldoIniziale);
    const range = (maxS - minS) || 1;
    const padded_min = minS - range * 0.1;
    const padded_max = maxS + range * 0.1;

    const xScale = (i) => PAD_L + (i / (punti.length - 1)) * innerW;
    const yScale = (v) => PAD_T + innerH - ((v - padded_min) / (padded_max - padded_min)) * innerH;

    const pathD = punti.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.saldo)}`).join(' ');
    const areaD = `${pathD} L ${xScale(punti.length - 1)} ${yScale(padded_min)} L ${xScale(0)} ${yScale(padded_min)} Z`;
    const yIniziale = yScale(saldoIniziale);

    const numGrid = 5;
    const gridLines = [];
    for (let i = 0; i <= numGrid; i++) {
      const v = padded_min + (i / numGrid) * (padded_max - padded_min);
      gridLines.push({ v, y: yScale(v) });
    }

    const isProfitto = punti[punti.length - 1].saldo >= saldoIniziale;
    const lineColor = isProfitto ? '#6fcf97' : '#eb5757';

    return (
      <div style={{
        background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)',
        padding: '16px', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '15px' }}>📈 Andamento Stagione</h4>
          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Iniziale: <b style={{ color: 'var(--text)' }}>€{saldoIniziale.toFixed(2)}</b></span>
            <span>Attuale: <b style={{ color: isProfitto ? 'var(--win)' : 'var(--lose)' }}>€{punti[punti.length - 1].saldo.toFixed(2)}</b></span>
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {gridLines.map((g, i) => (
              <g key={i}>
                <line x1={PAD_L} y1={g.y} x2={W - PAD_R} y2={g.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <text x={PAD_L - 8} y={g.y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">€{g.v.toFixed(0)}</text>
              </g>
            ))}
            <line x1={PAD_L} y1={yIniziale} x2={W - PAD_R} y2={yIniziale} stroke="var(--accent)" strokeWidth="1" strokeDasharray="5 5" opacity="0.6" />
            <path d={areaD} fill="url(#areaGrad)" />
            <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {punti.map((p, i) => (
              <g key={i}>
                {hoverIdx === i && <circle cx={xScale(i)} cy={yScale(p.saldo)} r="6" fill={lineColor} stroke="#fff" strokeWidth="2" />}
                <circle cx={xScale(i)} cy={yScale(p.saldo)} r="10" fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)} />
              </g>
            ))}
            {hoverIdx !== null && (
              <g>
                <rect
                  x={Math.min(Math.max(xScale(hoverIdx) - 70, PAD_L), W - PAD_R - 140)}
                  y={Math.max(yScale(punti[hoverIdx].saldo) - 55, 5)}
                  width="140" height="46" rx="6"
                  fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
                <text x={Math.min(Math.max(xScale(hoverIdx) - 70, PAD_L), W - PAD_R - 140) + 70}
                  y={Math.max(yScale(punti[hoverIdx].saldo) - 55, 5) + 18}
                  textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                  {punti[hoverIdx].data}
                </text>
                <text x={Math.min(Math.max(xScale(hoverIdx) - 70, PAD_L), W - PAD_R - 140) + 70}
                  y={Math.max(yScale(punti[hoverIdx].saldo) - 55, 5) + 36}
                  textAnchor="middle" fontSize="14" fontWeight="bold" fill={lineColor}>
                  €{punti[hoverIdx].saldo.toFixed(2)}
                </text>
              </g>
            )}
            <text x={PAD_L} y={H - 20} fontSize="11" fill="var(--text-muted)" textAnchor="start">{punti[0].data}</text>
            <text x={W - PAD_R} y={H - 20} fontSize="11" fill="var(--text-muted)" textAnchor="end">{punti[punti.length - 1].data}</text>
          </svg>
        </div>
      </div>
    );
  };

  // ============================================================
  // TABELLA PERIODI
  // ============================================================

  const TabellaPeriodi = ({ movimenti, saldoIniziale, tipo }) => {
    const dati = useMemo(() => raggruppaPerPeriodo(movimenti, saldoIniziale, tipo), [movimenti, saldoIniziale, tipo]);

    if (dati.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nessun dato per il periodo selezionato.
        </div>
      );
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>
                {tipo === 'giornaliero' ? 'Giorno' : tipo === 'settimanale' ? 'Settimana (Gio → Mer)' : 'Mese'}
              </th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Giocate</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Tot. Giocato</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Tot. Vinto</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Profitto</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {dati.map((d) => {
              const roi = d.giocato > 0 ? (d.profitto / d.giocato) * 100 : 0;
              const cls = d.profitto > 0 ? 'var(--win)' : d.profitto < 0 ? 'var(--lose)' : 'var(--text-muted)';
              return (
                <tr key={d.key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{d.label}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{d.count}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>€{d.giocato.toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>€{d.vinto.toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: cls, fontWeight: 'bold' }}>
                    {d.profitto >= 0 ? '+' : ''}€{d.profitto.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: cls, fontWeight: 'bold' }}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface)', fontWeight: 'bold' }}>
              <td style={{ padding: '10px' }}>TOTALE</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{dati.reduce((s, d) => s + d.count, 0)}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>€{dati.reduce((s, d) => s + d.giocato, 0).toFixed(2)}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>€{dati.reduce((s, d) => s + d.vinto, 0).toFixed(2)}</td>
              <td style={{ padding: '10px', textAlign: 'right', color: dati.reduce((s, d) => s + d.profitto, 0) >= 0 ? 'var(--win)' : 'var(--lose)' }}>
                {dati.reduce((s, d) => s + d.profitto, 0) >= 0 ? '+' : ''}€{dati.reduce((s, d) => s + d.profitto, 0).toFixed(2)}
              </td>
              <td style={{ padding: '10px', textAlign: 'right' }}>
                {(() => {
                  const tg = dati.reduce((s, d) => s + d.giocato, 0);
                  const tp = dati.reduce((s, d) => s + d.profitto, 0);
                  const r = tg > 0 ? (tp / tg) * 100 : 0;
                  return `${r >= 0 ? '+' : ''}${r.toFixed(1)}%`;
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // ============================================================
  // LISTA MOVIMENTI
  // ============================================================

  const ListaMovimenti = ({ movimenti, onUpdate, onDelete }) => {
    const [filtro, setFiltro] = useState('all');

    const filtrati = useMemo(() => {
      let arr = movimenti.slice().sort((a, b) => new Date(b.data) - new Date(a.data));
      if (filtro === 'win') arr = arr.filter(m => m.esito === 'win');
      else if (filtro === 'loss') arr = arr.filter(m => m.esito === 'loss');
      else if (filtro === 'pending') arr = arr.filter(m => m.esito === 'pending');
      return arr;
    }, [movimenti, filtro]);

    if (movimenti.length === 0) {
      return (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nessuna giocata registrata. Inserisci la prima sopra ☝️
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {[
            { k: 'all', label: `Tutte (${movimenti.length})` },
            { k: 'win', label: `✅ Vinte (${movimenti.filter(m => m.esito === 'win').length})` },
            { k: 'loss', label: `❌ Perse (${movimenti.filter(m => m.esito === 'loss').length})` },
            { k: 'pending', label: `⏳ In attesa (${movimenti.filter(m => m.esito === 'pending').length})` },
          ].map(f => (
            <button key={f.k} onClick={() => setFiltro(f.k)}
              style={{
                padding: '5px 12px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                border: '1px solid var(--border)',
                background: filtro === f.k ? 'var(--accent)' : 'var(--surface)',
                color: filtro === f.k ? '#000' : 'var(--text-muted)',
                fontWeight: 'bold',
              }}>{f.label}</button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Data</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Giocato</th>
                <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Esito</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Vinto</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Profitto</th>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Note</th>
                <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map(m => {
                const profitto = m.esito === 'win' ? (m.importoVinto - m.importoGiocato) : m.esito === 'loss' ? -m.importoGiocato : 0;
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{formatDateIT(m.data)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>€{m.importoGiocato.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                        background: m.esito === 'win' ? 'var(--win)' : m.esito === 'loss' ? 'var(--lose)' : 'var(--text-muted)',
                        color: m.esito === 'loss' ? '#fff' : '#000',
                      }}>
                        {m.esito === 'win' ? '✅ VINTA' : m.esito === 'loss' ? '❌ PERSA' : '⏳ ATTESA'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {m.esito === 'win' ? `€${m.importoVinto.toFixed(2)}` : '—'}
                    </td>
                    <td style={{
                      padding: '8px', textAlign: 'right', fontWeight: 'bold',
                      color: profitto > 0 ? 'var(--win)' : profitto < 0 ? 'var(--lose)' : 'var(--text-muted)',
                    }}>
                      {profitto >= 0 ? '+' : ''}€{profitto.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.note || '—'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {m.esito !== 'win' && (
                          <button onClick={() => onUpdate(m.id, { esito: 'win' })}
                            title="Segna come VINTA"
                            style={{ padding: '3px 8px', fontSize: '10px', background: 'var(--win)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>V</button>
                        )}
                        {m.esito !== 'loss' && (
                          <button onClick={() => onUpdate(m.id, { esito: 'loss' })}
                            title="Segna come PERSA"
                            style={{ padding: '3px 8px', fontSize: '10px', background: 'var(--lose)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>P</button>
                        )}
                        <button onClick={() => { if (window.confirm('Eliminare questa giocata?')) onDelete(m.id); }}
                          title="Elimina"
                          style={{ padding: '3px 8px', fontSize: '10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // STAT CARD
  // ============================================================

  const StatCard = ({ icon, label, value, sub, color }) => (
    <div style={{
      background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)',
      padding: '12px 14px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '20px', marginBottom: '2px' }}>{icon}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: color || 'var(--text)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );

  // ============================================================
  // SCHERMATA PRINCIPALE GESTIONE CONTO
  // ============================================================

  function GestioneContoLoggato({ username, onCambiaUtente }) {
    const [movimenti, setMovimenti] = useState([]);
    const [saldoIniziale, setSaldoIniziale] = useState(DEFAULT_SALDO_INIZIALE);
    const [loading, setLoading] = useState(true);
    const [periodoTipo, setPeriodoTipo] = useState('settimanale');
    const [msg, setMsg] = useState(null);
    const [editSaldo, setEditSaldo] = useState(false);
    const [saldoInput, setSaldoInput] = useState('');
    const [autoSynced, setAutoSynced] = useState(false);
    const [uploadBusy, setUploadBusy] = useState(false);

    const autoSaveEnabled = useRef(false);

    useEffect(() => {
      const local = loadGestioneFromLocal(username);
      setMovimenti(local.movimenti);
      setSaldoIniziale(local.saldoIniziale);
      setSaldoInput(String(local.saldoIniziale));

      console.log('🔵 Load da localStorage:', {
        saldo: local.saldoIniziale,
        movimenti: local.movimenti.length
      });

      (async () => {
        try {
          const urls = getDownloadUrls(username);
          for (const url of urls) {
            try {
              const resp = await fetch(url, { cache: 'no-store' });
              if (resp.ok) {
                const buf = await resp.arrayBuffer();
                const parsed = parseExcelGestione(buf);
                if (parsed && parsed.movimenti) {
                  const localIds = new Set(local.movimenti.map(m => `${m.data}|${m.importoGiocato}|${m.esito}`));
                  const merge = [...local.movimenti];
                  parsed.movimenti.forEach(em => {
                    const key = `${em.data}|${em.importoGiocato}|${em.esito}`;
                    if (!localIds.has(key)) {
                      merge.push(em);
                      localIds.add(key);
                    }
                  });

                  const localUpdatedAt = (() => {
                    try {
                      const saved = JSON.parse(localStorage.getItem(storageKeyConto(username)) || 'null');
                      return saved?.updatedAt ? new Date(saved.updatedAt).getTime() : 0;
                    } catch (e) { return 0; }
                  })();
                  const localModificatoDiRecente = (Date.now() - localUpdatedAt) < 10 * 60 * 1000;

                  let saldoFinale;
                  if (localModificatoDiRecente && local.saldoIniziale !== undefined && local.saldoIniziale !== null) {
                    saldoFinale = local.saldoIniziale;
                    console.log('💰 Saldo LOCALE ha priorità (modificato di recente):', saldoFinale);
                  } else {
                    saldoFinale = coalesceSaldo(parsed.saldoIniziale, local.saldoIniziale);
                    console.log('💰 Saldo REMOTO ha priorità:', saldoFinale);
                  }

                  setMovimenti(merge);
                  setSaldoIniziale(saldoFinale);
                  setSaldoInput(String(saldoFinale));
                  saveGestioneToLocal(username, merge, saldoFinale);
                  setAutoSynced(true);
                  console.log('✅ Gestione caricata da:', url.split('/').slice(0, 5).join('/'), '- saldo finale:', saldoFinale);
                }
                break;
              }
            } catch (e) {
              console.warn('URL non disponibile:', url.split('/').slice(0, 6).join('/'));
            }
          }
        } catch (e) {}
        setLoading(false);
        setTimeout(() => {
          autoSaveEnabled.current = true;
          console.log('🔓 Auto-save ABILITATO');
        }, 3000);
      })();
    }, [username]);

    useEffect(() => {
      if (loading) return;
      if (!autoSaveEnabled.current) {
        console.log('🔒 Auto-save bloccato (in attesa di init)');
        return;
      }
      saveGestioneToLocal(username, movimenti, saldoIniziale);
    }, [movimenti, saldoIniziale, loading, username]);

    const stats = useMemo(() => calcolaStatistiche(movimenti, saldoIniziale), [movimenti, saldoIniziale]);

    const handleAdd = useCallback((mov) => setMovimenti(prev => [...prev, mov]), []);

    const handleUpdate = useCallback((id, patch) => {
      setMovimenti(prev => prev.map(m => {
        if (m.id !== id) return m;
        const updated = { ...m, ...patch };
        if (patch.esito === 'win' && !updated.importoVinto) {
          const v = window.prompt('Importo vinto (€):', String(updated.importoGiocato * 2));
          const n = parseFloat(v);
          updated.importoVinto = !isNaN(n) && n > 0 ? n : updated.importoGiocato * 2;
        }
        if (patch.esito === 'loss') updated.importoVinto = 0;
        return updated;
      }));
    }, []);

    const handleDelete = useCallback((id) => setMovimenti(prev => prev.filter(m => m.id !== id)), []);

    const handleExportDownload = () => {
      esportaExcel(username, movimenti, saldoIniziale);
      setMsg({ type: 'success', text: '📥 File ' + excelFilename(username) + ' scaricato!' });
      setTimeout(() => setMsg(null), 3000);
    };

    const handleUploadGitHub = async () => {
      if (!getPAT()) {
        setMsg({ type: 'error', text: '⚠️ PAT non configurato' });
        setTimeout(() => setMsg(null), 4000);
        return;
      }

      setUploadBusy(true);
      try {
        const wb = buildWorkbook(username, movimenti, saldoIniziale);
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        const filepath = `${EXCEL_DIR}/${excelFilename(username)}`;
        const result = await caricaFileSuGitHub(
          filepath,
          wbout,
          `Update ${username} - ${new Date().toISOString().slice(0, 19)}`
        );

        if (result.ok) {
          setMsg({ type: 'success', text: '✅ File caricato su GitHub!' });
          fetch(`https://purge.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${filepath}`).catch(() => {});
        } else {
          setMsg({ type: 'error', text: '❌ ' + result.error });
        }
      } catch (e) {
        setMsg({ type: 'error', text: '❌ Errore: ' + e.message });
      } finally {
        setUploadBusy(false);
        setTimeout(() => setMsg(null), 5000);
      }
    };

    const handleSaveSaldo = () => {
      const v = parseFloat(saldoInput);
      if (!isNaN(v) && v >= 0) {
        setSaldoIniziale(v);
        setEditSaldo(false);
        saveGestioneToLocal(username, movimenti, v);
        setMsg({ type: 'success', text: `✅ Saldo iniziale aggiornato a €${v.toFixed(2)}` });
        setTimeout(() => setMsg(null), 2500);
      } else {
        setMsg({ type: 'error', text: '⚠️ Inserisci un valore valido (≥ 0)' });
        setTimeout(() => setMsg(null), 3000);
      }
    };

    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
          padding: '12px 16px', background: 'var(--card)', borderRadius: '10px',
          border: '1px solid var(--border)', flexWrap: 'wrap',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--accent)', color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 'bold',
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Utente attivo
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent)' }}>
              {username}
            </div>
          </div>
          <button
            onClick={onCambiaUtente}
            style={{
              padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
            }}
          >🔄 Cambia utente</button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px',
          marginBottom: '20px',
        }}>
          <StatCard icon="💰" label="Saldo Corrente"
            value={`€${stats.saldoCorrente.toFixed(2)}`}
            color={stats.saldoCorrente >= saldoIniziale ? 'var(--win)' : 'var(--lose)'} />
          <StatCard icon="📊" label="Profitto"
            value={`${stats.profitto >= 0 ? '+' : ''}€${stats.profitto.toFixed(2)}`}
            color={stats.profitto >= 0 ? 'var(--win)' : 'var(--lose)'} />
          <StatCard icon="📈" label="ROI"
            value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
            color={stats.roi >= 0 ? 'var(--win)' : 'var(--lose)'} />
          <StatCard icon="🎯" label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.numVinte}V / ${stats.numPerse}P`}
            color="var(--accent)" />
          <StatCard icon="🎲" label="Giocate"
            value={stats.numTotale}
            sub={stats.numPending > 0 ? `${stats.numPending} in attesa` : ''}
            color="var(--accent)" />
        </div>

        <FormInserimento onAdd={handleAdd} movimenti={movimenti} saldoIniziale={saldoIniziale} />

        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
          marginBottom: '20px', padding: '12px 16px', background: 'var(--card)',
          borderRadius: '10px', border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>💵 Saldo iniziale:</span>
            {editSaldo ? (
              <>
                <input type="number" step="0.01" min="0" value={saldoInput}
                  onChange={(e) => setSaldoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSaldo()}
                  style={{ width: '110px', padding: '4px 8px', fontSize: '13px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px' }} />
                <button onClick={handleSaveSaldo} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--win)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                <button onClick={() => { setEditSaldo(false); setSaldoInput(String(saldoIniziale)); }} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent)' }}>€{saldoIniziale.toFixed(2)}</span>
                <button onClick={() => { setSaldoInput(String(saldoIniziale)); setEditSaldo(true); }} style={{ padding: '3px 10px', fontSize: '11px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>✏️ Modifica</button>
              </>
            )}
          </div>

          <button onClick={handleExportDownload}
            style={{
              padding: '10px 16px', background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
            📥 Download Excel
          </button>

          <button onClick={handleUploadGitHub} disabled={uploadBusy}
            style={{
              padding: '10px 16px', background: 'var(--accent)', color: '#000',
              border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '12px',
              cursor: uploadBusy ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: uploadBusy ? 0.6 : 1,
            }}>
            {uploadBusy ? '⏳ Upload...' : '🚀 Salva su GitHub'}
          </button>

          {autoSynced && (
            <span style={{ fontSize: '11px', color: 'var(--win)', fontWeight: 'bold' }}>
              ✅ Sincronizzato da GitHub
            </span>
          )}
        </div>

        {msg && (
          <div style={{
            marginBottom: '16px', padding: '10px 14px', borderRadius: '6px',
            background: msg.type === 'success' ? 'rgba(111, 207, 151, 0.15)' : 'rgba(235, 87, 87, 0.15)',
            border: `1px solid ${msg.type === 'success' ? 'var(--win)' : 'var(--lose)'}`,
            color: msg.type === 'success' ? 'var(--win)' : 'var(--lose)',
            fontSize: '13px', fontWeight: 'bold',
          }}>
            {msg.text}
          </div>
        )}

        <GraficoAndamento movimenti={movimenti} saldoIniziale={saldoIniziale} />

        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, flex: 1, color: 'var(--accent)', fontSize: '15px' }}>
              📊 Riepilogo Periodi
            </h4>
            {[
              { k: 'giornaliero', label: '📅 Giornaliero' },
              { k: 'settimanale', label: '🗓️ Settimanale (Gio→Mer)' },
              { k: 'mensile', label: '📆 Mensile' },
            ].map(p => (
              <button key={p.k} onClick={() => setPeriodoTipo(p.k)}
                style={{
                  padding: '7px 14px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: periodoTipo === p.k ? 'var(--accent)' : 'var(--surface)',
                  color: periodoTipo === p.k ? '#000' : 'var(--text)',
                  fontWeight: 'bold',
                }}>{p.label}</button>
            ))}
          </div>

          <div style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <TabellaPeriodi movimenti={movimenti} saldoIniziale={saldoIniziale} tipo={periodoTipo} />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent)', fontSize: '15px' }}>
            📋 Storico Giocate
          </h4>
          <div style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '12px' }}>
            <ListaMovimenti movimenti={movimenti} onUpdate={handleUpdate} onDelete={handleDelete} />
          </div>
        </div>

        <div style={{
          marginTop: '16px', padding: '12px 16px', background: 'var(--surface)',
          borderRadius: '8px', border: '1px solid var(--border)', fontSize: '11px',
          color: 'var(--text-muted)', lineHeight: '1.6',
        }}>
          <b style={{ color: 'var(--accent)' }}>💡 Info:</b> La settimana va da <b>Giovedì</b> a <b>Mercoledì</b> successivo.
          File sincronizzato da <code>excel/{excelFilename(username)}</code> (branch <code>master</code>).
          Usa <b>🚀 Salva su GitHub</b> per caricare automaticamente tramite PAT.
        </div>
      </div>
    );
  }

  // ============================================================
  // COMPONENTE PRINCIPALE
  // ============================================================

  function GestioneContoComponent() {
    const [utenti, setUtenti] = useState(() => loadUtenti());
    const [utenteLoggato, setUtenteLoggato] = useState(() => loadSessione());
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        setSyncing(true);
        const result = await sincronizzaUtenti(true);
        if (!cancelled) {
          setUtenti(loadUtenti());
          setSyncing(false);
          if (result.ok && result.utenti) {
            console.log(`✅ Sync completata: ${result.utenti.length} utenti`);
          }
        }
      })();
      return () => { cancelled = true; };
    }, []);

    if (syncing && utenti.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
          <p>Caricamento utenti da GitHub...</p>
        </div>
      );
    }

    if (utenti.length === 0) {
      return (
        <SchermataRegistrazione
          onRegistrato={(uname) => {
            saveSessione(uname);
            setUtenti(loadUtenti());
            setUtenteLoggato(uname);
          }}
        />
      );
    }

    if (!utenteLoggato || !getUtente(utenteLoggato)) {
      return (
        <SchermataSelezioneUtente
          utenti={utenti}
          onLogin={(uname) => {
            saveSessione(uname);
            setUtenteLoggato(uname);
          }}
          onUtentiCambiati={() => setUtenti(loadUtenti())}
        />
      );
    }

    return (
      <GestioneContoLoggato
        username={utenteLoggato}
        onCambiaUtente={() => {
          saveSessione(null);
          setUtenteLoggato(null);
        }}
      />
    );
  }

  // ============================================================
  // PANNELLO GESTIONE UTENTI (per Impostazioni)
  // ============================================================

  function GestioneUtentiPanel() {
    const [utenti, setUtenti] = useState(() => loadUtenti());
    const [pat, setPatState] = useState(() => {
      const savedPAT = localStorage.getItem(STORAGE_PAT);
      if (savedPAT && savedPAT.trim()) return savedPAT.trim();
      return '';
    });
    const [msg, setMsg] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [nuovoUser, setNuovoUser] = useState('');
    const [nuovaPass, setNuovaPass] = useState('');
    const [nuovaPass2, setNuovaPass2] = useState('');
    const [busy, setBusy] = useState(false);
    const [patVisible, setPatVisible] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        setSyncing(true);
        await sincronizzaUtenti(true);
        if (!cancelled) {
          setUtenti(loadUtenti());
          setSyncing(false);
        }
      })();
      return () => { cancelled = true; };
    }, []);

    const handleSyncManuale = async () => {
      setSyncing(true);
      setMsg({ type: 'info', text: '⏳ Sincronizzazione in corso...' });
      try {
        const result = await sincronizzaUtenti(false);
        setUtenti(loadUtenti());
        if (result.ok) {
          setMsg({ type: 'success', text: `✅ Sincronizzati ${result.utenti.length} utenti` });
        } else {
          setMsg({ type: 'error', text: '❌ utenti.json non trovato su GitHub' });
        }
      } catch (e) {
        setMsg({ type: 'error', text: '❌ ' + e.message });
      } finally {
        setSyncing(false);
        setTimeout(() => setMsg(null), 5000);
      }
    };

    const handleForzaUpload = async () => {
      if (utenti.length === 0) {
        setMsg({ type: 'error', text: '⚠️ Nessun utente locale da caricare' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }
      setSyncing(true);
      setMsg({ type: 'info', text: `⏳ Caricamento utenti su GitHub (con merge)...` });
      try {
        const result = await caricaUtentiSuGitHub();
        setUtenti(loadUtenti());
        if (result.ok) {
          setMsg({ type: 'success', text: `✅ Utenti caricati su GitHub!` });
        } else {
          setMsg({ type: 'error', text: '❌ ' + result.error });
        }
      } catch (e) {
        setMsg({ type: 'error', text: '❌ ' + e.message });
      } finally {
        setSyncing(false);
        setTimeout(() => setMsg(null), 6000);
      }
    };

    // ⭐ NUOVO: upload forzato (no merge) - per rimuovere utenti
    const handleForzaUploadSenzaMerge = async () => {
      if (utenti.length === 0) {
        setMsg({ type: 'error', text: '⚠️ Nessun utente locale' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }
      if (!window.confirm('⚠️ Attenzione: questo upload SOVRASCRIVE la lista su GitHub con SOLO i tuoi utenti locali.\n\nUsa SOLO se vuoi rimuovere utenti.\n\nContinuare?')) return;
      
      setSyncing(true);
      setMsg({ type: 'info', text: `⏳ Upload forzato (no merge)...` });
      try {
        const result = await caricaUtentiSuGitHubForzato();
        setUtenti(loadUtenti());
        if (result.ok) {
          setMsg({ type: 'success', text: `✅ Utenti caricati (forzato)! Ora su GitHub ci sono solo i tuoi.` });
        } else {
          setMsg({ type: 'error', text: '❌ ' + result.error });
        }
      } catch (e) {
        setMsg({ type: 'error', text: '❌ ' + e.message });
      } finally {
        setSyncing(false);
        setTimeout(() => setMsg(null), 6000);
      }
    };

    const handleEsportaUtenti = () => {
      const json = JSON.stringify(utenti, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utenti_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg({ type: 'success', text: '📥 Backup utenti scaricato' });
      setTimeout(() => setMsg(null), 2500);
    };

    const handleImportaUtenti = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const importati = JSON.parse(ev.target.result);
          if (!Array.isArray(importati)) throw new Error('Formato non valido');
          const merged = mergeUtenti(loadUtenti(), importati);
          saveUtenti(merged);
          setUtenti(merged);
          setMsg({ type: 'success', text: `✅ Importati ${importati.length} utenti (totale: ${merged.length})` });
          if (getPAT()) await caricaUtentiSuGitHub();
        } catch (err) {
          setMsg({ type: 'error', text: '❌ ' + err.message });
        }
        setTimeout(() => setMsg(null), 3000);
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    const handleAdd = async () => {
      setMsg(null);
      if (nuovaPass !== nuovaPass2) {
        setMsg({ type: 'error', text: '⚠️ Le password non coincidono' });
        return;
      }
      setBusy(true);
      try {
        await creaUtente(nuovoUser, nuovaPass);
        setMsg({ type: 'success', text: '✅ Utente creato!' });
        setNuovoUser(''); setNuovaPass(''); setNuovaPass2('');
        setShowAdd(false);
        setUtenti(loadUtenti());
      } catch (e) {
        setMsg({ type: 'error', text: '⚠️ ' + e.message });
      } finally {
        setBusy(false);
      }
    };

    const handleDelete = (user) => {
      if (!window.confirm(`Eliminare l'utente "${user.username}"?`)) return;
      eliminaUtente(user.username);
      setUtenti(loadUtenti());
      setMsg({ type: 'success', text: `🗑️ Utente ${user.username} eliminato` });
    };

    const handleSavePAT = () => {
      setPAT(pat);
      setMsg({ type: 'success', text: pat ? '✅ PAT personale salvato' : '✅ PAT di sistema ripristinato' });
      setTimeout(() => setMsg(null), 2500);
    };

    const handleTestPAT = async () => {
      const patToTest = pat && pat.trim() ? pat.trim() : getPAT();
      if (!patToTest) {
        setMsg({ type: 'error', text: '⚠️ Nessun PAT disponibile' });
        return;
      }
      setMsg({ type: 'info', text: '⏳ Verifica PAT...' });
      try {
        const resp = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}`, {
          headers: { 'Authorization': `token ${patToTest}` },
        });
        if (resp.ok) {
          setMsg({ type: 'success', text: `✅ PAT valido! (${isUsingDefaultPAT() ? 'sistema' : 'personale'})` });
        } else if (resp.status === 401) {
          setMsg({ type: 'error', text: '❌ PAT non valido o scaduto' });
        } else if (resp.status === 404) {
          setMsg({ type: 'error', text: '❌ Repo non trovato o PAT senza permessi' });
        } else {
          setMsg({ type: 'error', text: `❌ Errore HTTP ${resp.status}` });
        }
      } catch (e) {
        setMsg({ type: 'error', text: '❌ Errore rete: ' + e.message });
      }
    };

    const patEffettivo = getPAT();
    const patMascherato = mascheraPAT(patEffettivo);

    return (
      <div>
        <div className="card" style={{ padding: '18px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--accent)', fontSize: '16px' }}>
            👥 Utenti Registrati ({utenti.length})
            {syncing && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px', fontWeight: 'normal' }}>🔄 sync...</span>}
          </h3>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button onClick={handleSyncManuale} disabled={syncing}
              style={{
                padding: '6px 14px', background: 'var(--accent)', color: '#000',
                border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px',
                cursor: syncing ? 'wait' : 'pointer', opacity: syncing ? 0.6 : 1,
              }}>
              🔄 {syncing ? 'Sync...' : 'Sincronizza GitHub'}
            </button>

            <button onClick={handleForzaUpload} disabled={syncing || utenti.length === 0}
              style={{
                padding: '6px 14px', background: '#3498db', color: '#fff',
                border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px',
                cursor: (syncing || utenti.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (syncing || utenti.length === 0) ? 0.5 : 1,
              }}
              title="Carica gli utenti locali su GitHub (con merge - mantiene utenti di altri dispositivi)">
              📤 Carica (merge) ({utenti.length})
            </button>

            {/* ⭐ NUOVO: upload forzato senza merge */}
            <button onClick={handleForzaUploadSenzaMerge} disabled={syncing || utenti.length === 0}
              style={{
                padding: '6px 14px', background: '#e67e22', color: '#fff',
                border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px',
                cursor: (syncing || utenti.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (syncing || utenti.length === 0) ? 0.5 : 1,
              }}
              title="SOVRASCRIVE la lista su GitHub con SOLO i tuoi utenti locali (per rimuovere utenti)">
              ⚠️ Upload forzato
            </button>

            <button onClick={handleEsportaUtenti}
              style={{
                padding: '6px 14px', background: 'var(--surface)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '6px',
                fontWeight: 'bold', fontSize: '11px', cursor: 'pointer',
              }}>
              📥 Esporta
            </button>
            <label style={{
              padding: '6px 14px', background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '6px',
              fontWeight: 'bold', fontSize: '11px', cursor: 'pointer',
            }}>
              📤 Importa
              <input type="file" accept=".json" onChange={handleImportaUtenti} style={{ display: 'none' }} />
            </label>
          </div>

          {utenti.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {syncing ? '⏳ Caricamento da GitHub...' : 'Nessun utente registrato.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {utenti.map(u => (
                <div key={u.username} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: '10px',
                }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'var(--accent)', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 'bold',
                  }}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>
                      {u.username}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Creato il {formatDateIT(u.creatoIl.slice(0, 10))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(u)}
                    style={{
                      padding: '6px 12px', background: 'var(--lose)', color: '#fff',
                      border: 'none', borderRadius: '6px', cursor: 'pointer',
                      fontWeight: 'bold', fontSize: '11px',
                    }}>
                    🗑️ Elimina
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                marginTop: '14px', padding: '10px 18px', background: 'var(--accent)', color: '#000',
                border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px',
                cursor: 'pointer',
              }}>
              ➕ Aggiungi Utente
            </button>
          ) : (
            <div style={{
              marginTop: '14px', padding: '16px', background: 'var(--surface)',
              border: '2px solid var(--accent)', borderRadius: '10px',
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent)', fontSize: '14px' }}>
                ➕ Nuovo Utente
              </h4>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
                  👤 Username
                </label>
                <input type="text" value={nuovoUser}
                  onChange={(e) => setNuovoUser(e.target.value)}
                  placeholder="Es. Giulia"
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
                  🔒 Password
                </label>
                <input type="password" value={nuovaPass}
                  onChange={(e) => setNuovaPass(e.target.value)}
                  placeholder="Min 3 caratteri"
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
                  🔒 Conferma Password
                </label>
                <input type="password" value={nuovaPass2}
                  onChange={(e) => setNuovaPass2(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="Ripeti password"
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setShowAdd(false); setMsg(null); }}
                  style={{
                    padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: '6px',
                    cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                  }}>Annulla</button>
                <button onClick={handleAdd} disabled={busy}
                  style={{
                    flex: 1, padding: '8px 16px', background: 'var(--accent)', color: '#000',
                    border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px',
                    cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                  }}>{busy ? '⏳...' : '✨ Crea'}</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent)', fontSize: '16px' }}>
            🔑 GitHub Personal Access Token (PAT)
          </h3>

          <div style={{
            padding: '10px 14px',
            marginBottom: '14px',
            borderRadius: '8px',
            background: isUsingDefaultPAT()
              ? 'rgba(111, 207, 151, 0.15)'
              : 'rgba(52, 152, 219, 0.15)',
            border: `1px solid ${isUsingDefaultPAT() ? 'var(--win)' : '#3498db'}`,
            fontSize: '12px',
            fontWeight: 'bold',
            color: isUsingDefaultPAT() ? 'var(--win)' : '#3498db',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '18px' }}>
              {isUsingDefaultPAT() ? '✅' : '🔵'}
            </span>
            <span style={{ flex: 1 }}>
              {isUsingDefaultPAT()
                ? 'PAT di sistema attivo (hardcodato)'
                : 'PAT personale attivo (sovrascrive quello di sistema)'}
            </span>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              background: 'rgba(0,0,0,0.3)',
              padding: '3px 10px',
              borderRadius: '5px',
              letterSpacing: '1px',
            }}>
              {patMascherato}
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px 0', lineHeight: '1.5' }}>
            Il PAT è già <b>configurato di default</b> nel sistema. Puoi inserire il tuo PAT personale
            qui sotto solo se vuoi sovrascriverlo.
            <br />
            ⚠️ Lascia vuoto per usare il PAT di sistema.
          </p>

          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              type={patVisible ? 'text' : 'password'}
              value={pat}
              onChange={(e) => setPatState(e.target.value)}
              placeholder="(opzionale) incolla qui il tuo PAT personale"
              style={{
                width: '100%', padding: '10px 44px 10px 12px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text)', borderRadius: '8px',
                fontSize: '13px', fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => setPatVisible(v => !v)}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '16px', color: 'var(--text-muted)',
              }}
              title={patVisible ? 'Nascondi' : 'Mostra'}
            >{patVisible ? '🙈' : '👁️'}</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleSavePAT}
              style={{
                padding: '8px 18px', background: 'var(--accent)', color: '#000',
                border: 'none', borderRadius: '6px', fontWeight: 'bold',
                fontSize: '13px', cursor: 'pointer',
              }}>
              💾 {pat && pat.trim() ? 'Salva PAT personale' : 'Rimuovi PAT personale'}
            </button>
            <button onClick={handleTestPAT}
              style={{
                padding: '8px 18px', background: 'var(--surface)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '6px',
                fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
              }}>🧪 Testa PAT</button>
          </div>

          <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <b>Scope necessari:</b> <code>repo</code> (per repo privati) o <code>public_repo</code> (per repo pubblici).
            <br />
            <b>Nota:</b> il PAT mostrato sopra è solo una <b>versione mascherata</b> (ultimi 3 caratteri visibili) per sicurezza.
          </div>
        </div>

        {msg && (
          <div style={{
            marginTop: '14px', padding: '10px 14px', borderRadius: '6px',
            background: msg.type === 'success' ? 'rgba(111, 207, 151, 0.15)'
              : msg.type === 'error' ? 'rgba(235, 87, 87, 0.15)'
              : 'rgba(52, 152, 219, 0.15)',
            border: `1px solid ${msg.type === 'success' ? 'var(--win)' : msg.type === 'error' ? 'var(--lose)' : '#3498db'}`,
            color: msg.type === 'success' ? 'var(--win)' : msg.type === 'error' ? 'var(--lose)' : '#3498db',
            fontSize: '13px', fontWeight: 'bold',
          }}>
            {msg.text}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.GestioneContoComponent = GestioneContoComponent;
  window.GestioneUtentiPanel = GestioneUtentiPanel;

  window.GestioneContoUtils = {
    getGiovediSettimana,
    getMercolediSuccessivo,
    getWeekLabel,
    calcolaSaldoCorrente,
    calcolaStatistiche,
    raggruppaPerPeriodo,
    esportaExcel,
    caricaFileSuGitHub,
    getPAT,
    setPAT,
    isUsingDefaultPAT,
    mascheraPAT,
    loadUtenti,
    mergeUtenti,
    sincronizzaUtenti,
    scaricaUtentiDaGitHub,
    caricaUtentiSuGitHub,
    caricaUtentiSuGitHubForzato,  // ⭐ NUOVO
    parseSaldoSafe,
    coalesceSaldo,
    parseExcelGestione,
    loadGestioneFromLocal,
    saveGestioneToLocal,
    formatDateIT,
    excelFilename,
    GITHUB_USER,
    GITHUB_REPO,
    GITHUB_BRANCH,
    USERS_FILE,
    DEFAULT_PAT,
  };

  console.log('✅ Modulo Gestione Conto caricato - con FIX eliminazione utenti + creazione file Excel iniziale');

})();
