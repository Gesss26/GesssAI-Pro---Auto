// ============================================================
// quote-importer.jsx
// Componente React per importare PDF quote Marathonbet
// CON AUTO-DOWNLOAD MULTI-FILE DA GITHUB all'apertura del tab
// E supporto import manuale di PIÙ file PDF contemporaneamente
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo, useEffect, useRef } = React;

  // ============================================================
  // CONFIGURAZIONE GITHUB
  // Deve rispecchiare la stessa lista di quote-manager.js
  // ============================================================

  const REPO_BASE_URL = 'https://gesss26.github.io/GesssAI-Pro---Auto';

  // ⭐ LISTA DEI PDF DA SCARICARE E UNIRE
  // Aggiungi/rimuovi file qui. Se un file non esiste su GitHub, viene saltato.
  const PDF_FILES = [
    'quote/marathonbet.pdf',
    'quote/marathonbet-2.pdf',
    // 'quote/marathonbet-3.pdf',
  ];

  // Anti-doppio download: max 1 download ogni 5 minuti
  const CACHE_DURATION_MS = 5 * 60 * 1000;
  const CACHE_KEY = 'ft_pdf_quote_last_download';

  // ============================================================
  // COMPONENTE PRINCIPALE
  // ============================================================

  function QuoteImporter({ matches, selectedFamiglie, showAlert }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [valueBets, setValueBets] = useState([]);
    const [soloValueBets, setSoloValueBets] = useState(true);
    const [sogliaEdge, setSogliaEdge] = useState(5);
    const [filtroCampionato, setFiltroCampionato] = useState('Tutti');
    const [fonteLabel, setFonteLabel] = useState('');
    const [autoTentato, setAutoTentato] = useState(false);
    const [erroreAuto, setErroreAuto] = useState(null);
    const [avvisiFile, setAvvisiFile] = useState([]); // ⭐ file falliti ma non bloccanti

    const downloadInCorso = useRef(false);

    // ============================================================
    // CORE: ELABORA UN SINGOLO PDF (blob o file)
    // Aggiunge le quote al localStorage tramite aggiungiQuote (MERGE)
    // ============================================================

    const elaboraPDFSingolo = async (pdfBlobOrFile) => {
      if (!window.PDFQuoteParser || typeof window.PDFQuoteParser.estraiRigheDaPDF !== 'function') {
        throw new Error('Parser PDF non caricato. Verifica che pdf-quote-parser.js sia incluso nell\'HTML.');
      }
      const righe = await window.PDFQuoteParser.estraiRigheDaPDF(pdfBlobOrFile);
      const partite = window.PDFQuoteParser.parseMarathonbetPDF(righe);
      if (partite.length > 0) {
        window.PDFQuoteParser.aggiungiQuote(partite);
      }
      return partite;
    };

    // ============================================================
    // CALCOLA VALUE BET (dopo aver caricato tutti i file)
    // ============================================================

    const calcolaValueBets = async (soglia) => {
      const quote = window.PDFQuoteParser.leggiQuote();
      const partitePDF = Object.values(quote);

      const vb = [];
      let partiteMatchate = 0;

      for (const p of partitePDF) {
        const matchResult = window.PDFQuoteParser.trovaMatchApp(p, matches);
        if (!matchResult) continue;

        partiteMatchate++;
        const matchApp = matchResult.match;

        const stats = window.computeMatchStats(matchApp, matches);
        if (stats.error) continue;

        stats._allMatches = matches;
        stats._homeTeam = matchApp.casa;
        stats._awayTeam = matchApp.ospiti;

        const analisi = window.PDFQuoteParser.analizzaValueBet(p, matchApp, stats);
        const valueOnly = analisi.filter(a => a.edge > soglia);

        if (valueOnly.length > 0) {
          vb.push({
            partitaPDF: p,
            matchApp,
            matchScore: matchResult.score,
            valueBets: valueOnly,
            analisiCompleta: analisi,
          });
        }
      }

      vb.sort((a, b) => {
        const maxA = Math.max(...a.valueBets.map(v => v.edge));
        const maxB = Math.max(...b.valueBets.map(v => v.edge));
        return maxB - maxA;
      });

      return { vb, partiteMatchate, totalePartite: partitePDF.length };
    };

    // ============================================================
    // DOWNLOAD AUTOMATICO MULTI-FILE DA GITHUB
    // ============================================================

    const caricaDaGitHub = async (forza = false) => {
      if (downloadInCorso.current) {
        console.log('⏳ Download già in corso, skip');
        return;
      }

      // Check cache (evita download ripetuti)
      if (!forza) {
        try {
          const last = localStorage.getItem(CACHE_KEY);
          if (last) {
            const elapsed = Date.now() - parseInt(last, 10);
            if (elapsed < CACHE_DURATION_MS && valueBets.length > 0) {
              console.log('⏩ Cache recente, skip download automatico');
              return;
            }
          }
        } catch (e) {}
      }

      downloadInCorso.current = true;
      setLoading(true);
      setProgress('🌐 Connessione a GitHub...');
      setFonteLabel('GitHub');
      setErroreAuto(null);
      setAvvisiFile([]);

      try {
        // ⭐ RESETTA le quote vecchie prima di riscaricare tutti i file
        window.PDFQuoteParser.resetQuote();

        let totalePartite = 0;
        const errori = [];

        for (const percorso of PDF_FILES) {
          const url = `${REPO_BASE_URL}/${percorso}?t=${Date.now()}`;
          setProgress(`📥 Download ${percorso}...`);
          console.log('🌐 Download PDF da:', url);

          try {
            const response = await fetch(url, {
              cache: 'no-store',
              headers: { 'Accept': 'application/pdf' },
            });

            if (!response.ok) {
              if (response.status === 404) {
                errori.push(`${percorso}: non trovato (404)`);
              } else {
                errori.push(`${percorso}: HTTP ${response.status}`);
              }
              continue;
            }

            const blob = await response.blob();
            console.log(`✅ PDF scaricato: ${percorso} (${(blob.size / 1024).toFixed(0)} KB)`);

            if (blob.size < 1000) {
              errori.push(`${percorso}: file troppo piccolo`);
              continue;
            }

            const fakeFile = new File([blob], percorso.split('/').pop(), { type: 'application/pdf' });
            const partite = await elaboraPDFSingolo(fakeFile);

            if (partite.length === 0) {
              errori.push(`${percorso}: 0 partite estratte`);
              continue;
            }

            totalePartite += partite.length;
            console.log(`✅ ${percorso}: ${partite.length} partite`);

          } catch (errFile) {
            console.error(`❌ ${percorso}:`, errFile.message);
            errori.push(`${percorso}: ${errFile.message}`);
          }
        }

        if (totalePartite === 0) {
          throw new Error(`Nessun PDF caricato correttamente.\n${errori.join('\n')}`);
        }

        setProgress(`🎯 ${totalePartite} partite caricate, calcolo value bet...`);

        const { vb, partiteMatchate } = await calcolaValueBets(sogliaEdge);
        setValueBets(vb);
        setFile({ name: `${PDF_FILES.length} file GitHub` });
        setAvvisiFile(errori);

        // Salva timestamp
        try { localStorage.setItem(CACHE_KEY, String(Date.now())); } catch (e) {}

        setProgress(`🎯 ${partiteMatchate}/${totalePartite} matchate • ${vb.length} con value bet`);

        if (errori.length > 0) {
          showAlert('warning', `⚠️ ${totalePartite} partite caricate. File con problemi: ${errori.length}`);
        } else {
          showAlert('success', `✅ ${totalePartite} partite, ${partiteMatchate} matchate, ${vb.length} con value bet!`);
        }

      } catch (err) {
        console.error('❌ Errore download GitHub:', err);
        setErroreAuto(err.message);
        showAlert('error', `❌ ${err.message.split('\n')[0]}`);
      } finally {
        setLoading(false);
        downloadInCorso.current = false;
      }
    };

    // ============================================================
    // AUTO-DOWNLOAD ALL'APERTURA
    // ============================================================

    useEffect(() => {
      if (autoTentato) return;
      setAutoTentato(true);

      // Aspetta 800ms per lasciare renderizzare la UI
      const timer = setTimeout(() => {
        console.log('🚀 Auto-download PDF da GitHub (multi-file)...');
        caricaDaGitHub(false).catch(() => {});
      }, 800);

      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ============================================================
    // HANDLE FILE MANUALE (multi-file)
    // ============================================================

    const handleFiles = async (files) => {
      const pdfFiles = files.filter(f => f && f.name && f.name.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        showAlert('error', '❌ Solo file PDF supportati');
        return;
      }

      setFonteLabel('Manuale');
      setErroreAuto(null);
      setAvvisiFile([]);
      setLoading(true);
      setProgress('📄 Lettura PDF...');

      try {
        // ⭐ Reset per evitare accumulo di quote vecchie
        window.PDFQuoteParser.resetQuote();

        let totale = 0;
        const errori = [];

        for (const f of pdfFiles) {
          setProgress(`📄 Lettura ${f.name}...`);
          try {
            const partite = await elaboraPDFSingolo(f);
            totale += partite.length;
            console.log(`✅ ${f.name}: ${partite.length} partite`);
          } catch (errFile) {
            console.error(`❌ ${f.name}:`, errFile.message);
            errori.push(`${f.name}: ${errFile.message}`);
          }
        }

        if (totale === 0) {
          throw new Error(`Nessun file elaborato correttamente.\n${errori.join('\n')}`);
        }

        setProgress(`🎯 ${totale} partite, calcolo value bet...`);
        const { vb, partiteMatchate } = await calcolaValueBets(sogliaEdge);

        setValueBets(vb);
        setFile({ name: `${pdfFiles.length} file manuali` });
        setAvvisiFile(errori);
        setProgress(`🎯 ${partiteMatchate}/${totale} matchate • ${vb.length} con value bet`);

        if (errori.length > 0) {
          showAlert('warning', `⚠️ ${totale} partite caricate. File con problemi: ${errori.length}`);
        } else {
          showAlert('success', `✅ ${totale} partite da ${pdfFiles.length} file!`);
        }

      } catch (err) {
        console.error('Errore elaborazione PDF:', err);
        showAlert('error', '❌ Errore: ' + err.message.split('\n')[0]);
        setErroreAuto(err.message);
      } finally {
        setLoading(false);
      }
    };

    // ============================================================
    // RESET
    // ============================================================

    const reset = () => {
      setFile(null);
      setValueBets([]);
      setProgress('');
      setFonteLabel('');
      setErroreAuto(null);
      setAvvisiFile([]);

      // Riprova auto-download
      setTimeout(() => caricaDaGitHub(true), 300);
    };

    // ============================================================
    // FILTRI + ORDINAMENTO
    // ============================================================

    const campionatiDisponibili = useMemo(() => {
      const set = new Set();
      valueBets.forEach(vb => {
        if (vb.matchApp.campionato) set.add(vb.matchApp.campionato);
      });
      return Array.from(set).sort();
    }, [valueBets]);

    const valueBetsFiltrate = useMemo(() => {
      let list = valueBets;
      if (filtroCampionato !== 'Tutti') {
        list = list.filter(vb => vb.matchApp.campionato === filtroCampionato);
      }
      return list;
    }, [valueBets, filtroCampionato]);

    const tutteLeAnalisi = useMemo(() => {
      const tutte = [];
      valueBets.forEach(vb => {
        vb.analisiCompleta.forEach(a => {
          tutte.push({
            ...a,
            matchApp: vb.matchApp,
            matchScore: vb.matchScore,
          });
        });
      });
      return tutte.sort((a, b) => b.edge - a.edge);
    }, [valueBets]);

    // ============================================================
    // RENDER — STATO LOADING
    // ============================================================

    if (loading) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
            animation: 'pulse 1.4s ease-in-out infinite'
          }}>⏳</div>
          <h3 style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            {fonteLabel === 'GitHub' ? `🌐 Download da GitHub (${PDF_FILES.length} file)` : 'Analisi in corso'}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{progress}</p>
          {fonteLabel === 'GitHub' && (
            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {PDF_FILES.map((f, i) => (
                <div key={i}>{REPO_BASE_URL}/{f}</div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ============================================================
    // RENDER — STATO INIZIALE (con errore auto o pronto)
    // ============================================================

    if (!file && valueBets.length === 0) {
      return (
        <div>
          {/* HEADER */}
          <div className="card" style={{
            padding: '14px 16px',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '10px',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '8px', fontSize: '18px' }}>
              📄 Quote Book — Marathonbet
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Le quote vengono <b>scaricate automaticamente da GitHub</b> ({PDF_FILES.length} file uniti)
              e confrontate con le tue percentuali per trovare le <b style={{ color: 'var(--win)' }}>VALUE BET</b>.
            </p>
          </div>

          {/* ERRORE AUTO-DOWNLOAD */}
          {erroreAuto && (
            <div className="card" style={{
              padding: '14px 16px',
              background: 'rgba(235, 87, 87, 0.1)',
              border: '2px solid var(--lose)',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <b style={{ color: 'var(--lose)' }}>Download automatico fallito</b>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                {erroreAuto}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                File tentati:
              </p>
              <ul style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '20px', marginTop: '4px' }}>
                {PDF_FILES.map((f, i) => (
                  <li key={i}><code>{REPO_BASE_URL}/{f}</code></li>
                ))}
              </ul>
            </div>
          )}

          {/* PULSANTE DOWNLOAD MANUALE / RIPROVA */}
          <button
            className="btn"
            onClick={() => caricaDaGitHub(true)}
            disabled={downloadInCorso.current}
            style={{
              width: '100%',
              padding: '18px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              cursor: downloadInCorso.current ? 'wait' : 'pointer',
              marginBottom: '16px',
              boxShadow: '0 4px 20px rgba(243, 156, 18, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            🌐 {erroreAuto ? 'Riprova Download da GitHub' : `Scarica ${PDF_FILES.length} PDF da GitHub`}
          </button>

          {/* SEPARATORE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>oppure carica manualmente (anche più file)</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* DROP ZONE MANUALE MULTI-FILE */}
          <div
            className="file-drop-area"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
            onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('dragging');
              if (e.dataTransfer.files.length > 0) handleFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => document.getElementById('pdf-quote-input').click()}
            style={{ padding: '30px 20px' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📂</div>
            <p style={{ fontWeight: 'bold', fontSize: '14px', margin: '8px 0 4px' }}>
              Trascina uno o più PDF Marathonbet
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              oppure clicca per selezionare (multi-selezione supportata)
            </p>
            <input
              id="pdf-quote-input"
              type="file"
              accept=".pdf"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files.length > 0 && handleFiles(Array.from(e.target.files))}
            />
          </div>

          {/* INFO */}
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'var(--surface)',
            borderRadius: '8px',
            border: '1px dashed var(--border)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: '1.6'
          }}>
            <b style={{ color: 'var(--accent)' }}>💡 Come funziona:</b>
            <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
              <li>🌐 <b>Auto-download</b> di {PDF_FILES.length} file da GitHub all'apertura del tab</li>
              <li>📂 <b>Manuale multi-file</b>: trascina più PDF insieme, vengono uniti automaticamente</li>
              <li>Estrae <b>20 mercati</b>: 1X2, DC, GG/NG, U/O 1.5-4.5, MG 1-4, MG 2-5</li>
              <li>Calcola <b>quota fair</b>, <b>edge %</b> e <b>Kelly stake</b></li>
              <li>Evidenzia <b style={{ color: 'var(--win)' }}>VALUE BET</b> con edge &gt; 5%</li>
            </ul>
          </div>
        </div>
      );
    }

    // ============================================================
    // RENDER — RISULTATI
    // ============================================================

    return (
      <div>
        {/* HEADER RISULTATI */}
        <div className="card" style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.15), rgba(243, 156, 18, 0.05))',
          border: '2px solid var(--accent)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: '18px' }}>
                🎯 Value Bet Trovate
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                📄 {file?.name} • 🎯 {valueBets.length} partite con value bet • 📊 {tutteLeAnalisi.length} analisi totali
                {fonteLabel === 'GitHub' && <span style={{ color: 'var(--win)', marginLeft: '8px' }}>🌐 da GitHub ({PDF_FILES.length} file)</span>}
                {fonteLabel === 'Manuale' && <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>📂 manuale</span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn"
                onClick={() => caricaDaGitHub(true)}
                style={{ fontSize: '12px', padding: '6px 14px', background: 'var(--accent)', color: '#000' }}
                title="Riscarica tutti i PDF da GitHub"
              >
                🔄 Ricarica
              </button>
              <button className="btn btn-secondary" onClick={reset} style={{ fontSize: '12px', padding: '6px 14px' }}>
                🗑️ Reset
              </button>
            </div>
          </div>
        </div>

        {/* ⭐ AVVISI FILE FALLITI (non bloccanti) */}
        {avvisiFile.length > 0 && (
          <div className="card" style={{
            padding: '10px 14px',
            background: 'rgba(243, 156, 18, 0.10)',
            border: '2px solid var(--accent)',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '12px',
            color: 'var(--text)',
          }}>
            <b style={{ color: 'var(--accent)' }}>⚠️ Alcuni file non sono stati caricati:</b>
            <ul style={{ marginTop: '4px', paddingLeft: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {avvisiFile.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </div>
        )}

        {/* FILTRI */}
        <div className="card" style={{ padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Soglia edge:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={sogliaEdge}
                onChange={e => setSogliaEdge(parseFloat(e.target.value) || 0)}
                style={{ width: '60px', padding: '4px 8px', fontSize: '12px' }}
              />
              <span style={{ fontSize: '12px' }}>%</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Campionato:</label>
              <select
                value={filtroCampionato}
                onChange={e => setFiltroCampionato(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', maxWidth: '200px' }}
              >
                <option value="Tutti">Tutti ({valueBets.length})</option>
                {campionatiDisponibili.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={soloValueBets}
                onChange={e => setSoloValueBets(e.target.checked)}
              />
              Mostra solo value bet
            </label>

            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
              {soloValueBets ? valueBetsFiltrate.length : tutteLeAnalisi.length} risultati
            </span>
          </div>
        </div>

        {/* LISTA VALUE BET */}
        {valueBetsFiltrate.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Nessuna value bet trovata</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {filtroCampionato !== 'Tutti'
                ? `Nessuna value bet per il campionato "${filtroCampionato}".`
                : `Nessuna partita ha edge > ${sogliaEdge}%. Prova ad abbassare la soglia.`}
            </p>
          </div>
        )}

        {valueBetsFiltrate.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {valueBetsFiltrate.map((vb, idx) => (
              <div key={idx} className="card" style={{ padding: '14px 16px' }}>
                {/* HEADER PARTITA */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      ⚽ {vb.matchApp.casa} vs {vb.matchApp.ospiti}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      🏆 {vb.matchApp.campionato}
                      {vb.matchApp.data && ` • 📅 ${window.formatDateEU ? window.formatDateEU(vb.matchApp.data) : vb.matchApp.data}`}
                      {vb.matchApp.ora && ` • ⏰ ${vb.matchApp.ora}`}
                      <span style={{ marginLeft: '8px', color: 'var(--win)', fontWeight: 'bold' }}>
                        (match {Math.round(vb.matchScore * 100)}%)
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    📄 PDF: {vb.partitaPDF.casa} - {vb.partitaPDF.ospiti}
                  </div>
                </div>

                {/* VALUE BETS */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: '8px'
                }}>
                  {vb.valueBets.map((v, i) => {
                    const isExcellent = v.edge > 20;
                    const isGood = v.edge > 10;
                    const borderColor = isExcellent ? 'var(--win)' : isGood ? 'var(--win)' : 'var(--accent)';
                    const bgColor = isExcellent
                      ? 'rgba(111, 207, 151, 0.15)'
                      : isGood
                        ? 'rgba(111, 207, 151, 0.08)'
                        : 'rgba(243, 156, 18, 0.08)';

                    return (
                      <div key={i} style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: bgColor,
                        border: `${isExcellent ? '2px' : '1px'} solid ${borderColor}`,
                      }}>
                        <div style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          fontWeight: 'bold'
                        }}>
                          {v.classificazione}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '3px', color: 'var(--text)' }}>
                          {v.giocata}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}>
                          <span>📊 Tua: <b style={{ color: 'var(--accent)' }}>{v.pctTua}%</b></span>
                          <span>💰 Book: <b style={{ color: 'var(--win)' }}>{v.quotaBook.toFixed(2)}</b></span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '4px',
                          fontSize: '11px',
                          color: 'var(--text-muted)'
                        }}>
                          <span>Fair: {v.quotaFair.toFixed(2)}</span>
                          <span style={{ color: 'var(--win)', fontWeight: 'bold' }}>
                            +{v.edge}%
                          </span>
                        </div>
                        {v.kellyStake > 0 && (
                          <div style={{
                            marginTop: '5px',
                            fontSize: '10px',
                            textAlign: 'center',
                            color: 'var(--accent)',
                            padding: '2px 4px',
                            background: 'rgba(243, 156, 18, 0.1)',
                            borderRadius: '4px'
                          }}>
                            💡 Kelly: {v.kellyStake}% bankroll
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* MOSTRA TUTTE LE ANALISI */}
                {!soloValueBets && vb.analisiCompleta.length > vb.valueBets.length && (
                  <details style={{ marginTop: '10px', fontSize: '11px' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                      Mostra tutte le {vb.analisiCompleta.length} analisi (incluse non-value)
                    </summary>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '6px',
                      marginTop: '8px'
                    }}>
                      {vb.analisiCompleta.map((v, i) => (
                        <div key={i} style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          fontSize: '11px'
                        }}>
                          <div style={{ fontWeight: 'bold' }}>{v.giocata}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span>{v.pctTua}%</span>
                            <span style={{ color: v.isValue ? 'var(--win)' : 'var(--text-muted)' }}>
                              {v.quotaBook.toFixed(2)}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '10px',
                            color: v.edge > 0 ? 'var(--win)' : 'var(--lose)',
                            textAlign: 'right'
                          }}>
                            {v.edge > 0 ? '+' : ''}{v.edge}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  window.QuoteImporter = QuoteImporter;
  console.log('✅ QuoteImporter caricato (con multi-file auto-download + manuale)');

})();