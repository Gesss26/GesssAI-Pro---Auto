// ============================================================
// quote-importer.jsx
// Componente React per importare PDF quote Marathonbet
// e trovare value bet confrontandole con le % dell'app
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo } = React;

  // ============================================================
  // COMPONENTE PRINCIPALE
  // ============================================================

  function QuoteImporter({ matches, selectedFamiglie, showAlert }) {
    const [file, setFile] = useState(null);
    const [partiteEstratte, setPartiteEstratte] = useState([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [valueBets, setValueBets] = useState([]);
    const [soloValueBets, setSoloValueBets] = useState(true);
    const [sogliaEdge, setSogliaEdge] = useState(5);
    const [filtroCampionato, setFiltroCampionato] = useState('Tutti');

    // ============================================================
    // HANDLE FILE
    // ============================================================

    const handleFile = async (f) => {
      if (!f || !f.name.toLowerCase().endsWith('.pdf')) {
        showAlert('error', '❌ Solo file PDF supportati');
        return;
      }
      setFile(f);
      setLoading(true);
      setProgress('📄 Lettura PDF...');

      try {
        const righe = await window.PDFQuoteParser.estraiRigheDaPDF(f);
        setProgress(`🔍 Analisi ${righe.length} righe...`);

        await new Promise(r => setTimeout(r, 50));

        const partite = window.PDFQuoteParser.parseMarathonbetPDF(righe);
        setProgress(`✅ ${partite.length} partite trovate`);

        await new Promise(r => setTimeout(r, 50));

        setProgress('🎯 Calcolo value bet...');

        const vb = [];
        let partiteMatchate = 0;

        for (const p of partite) {
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

          const valueOnly = analisi.filter(a => a.edge > sogliaEdge);

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

        setValueBets(vb);
        setProgress(`🎯 ${partiteMatchate}/${partite.length} partite matchate • ${vb.length} con value bet`);

        showAlert('success', `✅ ${partite.length} partite estratte, ${partiteMatchate} matchate, ${vb.length} con value bet!`);
      } catch (err) {
        console.error(err);
        showAlert('error', '❌ Errore: ' + err.message);
      }

      setLoading(false);
    };

    const reset = () => {
      setFile(null);
      setPartiteEstratte([]);
      setValueBets([]);
      setProgress('');
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
    // RENDER
    // ============================================================

    // ===== STATO INIZIALE: DROP ZONE =====
    if (!file && !loading && valueBets.length === 0) {
      return (
        <div>
          <div className="card" style={{
            padding: '14px 16px',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '10px',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '8px', fontSize: '18px' }}>
              📄 Importa Quote da PDF Marathonbet
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Carica il PDF delle quote Marathonbet per confrontarle con le tue percentuali
              e trovare le <b style={{ color: 'var(--win)' }}>VALUE BET</b> (quote book più alte del fair value).
            </p>
          </div>

          <div
            className="file-drop-area"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
            onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('dragging');
              if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => document.getElementById('pdf-quote-input').click()}
            style={{ padding: '40px 20px' }}
          >
            <div style={{ fontSize: '64px', marginBottom: '8px' }}>📂</div>
            <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '8px 0 4px' }}>
              Trascina qui il PDF Marathonbet
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              oppure clicca per selezionare il file
            </p>
            <input
              id="pdf-quote-input"
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files.length > 0 && handleFile(e.target.files[0])}
            />
          </div>

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
              <li>Estrae automaticamente <b>20 mercati</b>: 1X2, Doppia Chance, GG/NG, Under/Over 1.5-4.5, MG 1-4, MG 2-5</li>
              <li>Confronta le quote book con le tue percentuali calcolate</li>
              <li>Calcola <b>quota fair</b>, <b>edge %</b> e <b>Kelly stake</b> suggerito</li>
              <li>Evidenzia le <b style={{ color: 'var(--win)' }}>VALUE BET</b> con edge &gt; 5%</li>
            </ul>
          </div>
        </div>
      );
    }

    // ===== STATO LOADING =====
    if (loading) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
            animation: 'pulse 1.4s ease-in-out infinite'
          }}>⏳</div>
          <h3 style={{ color: 'var(--accent)', marginBottom: '8px' }}>Analisi in corso</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{progress}</p>
        </div>
      );
    }

    // ===== STATO RISULTATI =====
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
              </p>
            </div>
            <button className="btn btn-secondary" onClick={reset} style={{ fontSize: '12px', padding: '6px 14px' }}>
              🗑️ Importa un altro PDF
            </button>
          </div>
        </div>

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

                {/* MOSTRA TUTTE LE ANALISI (se non solo value) */}
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
  console.log('✅ QuoteImporter caricato');

})();