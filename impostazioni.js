// ============================================================
// impostazioni.js
// ============================================================

(function () {
  'use strict';

  const { useState, useRef, useEffect } = React;

  // ============================================================
  // FAMIGLIE SELECTOR
  // ============================================================

  const FamiglieSelector = ({ selectedFamiglie, setSelectedFamiglie, showAlert }) => {
    const FAMIGLIE_GIOCATE = window.FAMIGLIE_GIOCATE;
    const DEFAULT_FAMIGLIE = window.DEFAULT_FAMIGLIE;
    const [tempSelected, setTempSelected] = useState(selectedFamiglie);

    const toggleFamiglia = (familyId) => {
      setTempSelected(prev => {
        if (prev.includes(familyId)) return prev.filter(id => id !== familyId);
        if (prev.length >= 3) {
          showAlert('error', '⚠️ Massimo 3 famiglie!');
          return prev;
        }
        return [...prev, familyId];
      });
    };

    const isActive = (id) => tempSelected.includes(id);

    const confirmFamiglie = () => {
      if (tempSelected.length === 0) {
        showAlert('error', '⚠️ Seleziona almeno una famiglia!');
        return;
      }
      setSelectedFamiglie(tempSelected);
      const names = tempSelected.map(id => FAMIGLIE_GIOCATE[id].label);
      showAlert('success', `✅ Famiglie: ${names.join(', ')}`);
    };

    const resetToDefault = () => {
      setTempSelected(DEFAULT_FAMIGLIE);
      setSelectedFamiglie(DEFAULT_FAMIGLIE);
      const names = DEFAULT_FAMIGLIE.map(id => FAMIGLIE_GIOCATE[id].label);
      showAlert('info', `🔄 Ripristinate: ${names.join(', ')}`);
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--accent)' }}>🎯 Seleziona Famiglie di Giocate</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Ogni famiglia mostra la MIGLIORE giocata (max 3)
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="selected-count">Selezionate: <span className="count-num">{tempSelected.length}</span>/3</span>
            <button className="btn btn-secondary" onClick={resetToDefault} style={{ fontSize: '12px', padding: '6px 14px' }}>🔄 Default</button>
            <button className="btn" onClick={confirmFamiglie} style={{ fontSize: '12px', padding: '6px 18px' }}>✅ Conferma</button>
          </div>
        </div>

        <div className="giocate-selector-grid">
          {Object.entries(FAMIGLIE_GIOCATE).map(([key, family]) => (
            <div key={key} className={`giocate-category ${isActive(key) ? 'active' : ''}`} onClick={() => toggleFamiglia(key)}>
              <div className="category-title">
                <span className="icon">{family.icon}</span> {family.label}
                <span className="badge">{family.options.length} opzioni</span>
              </div>
              <div className="category-sub">{family.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================
  // FILE IMPORTER
  // ============================================================

  const FileImporter = ({ matches, setMatches, championships, setChampionships, loading, setLoading, showAlert }) => {
    const normalizeDate = window.normalizeDate;
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [mapping, setMapping] = useState({
      campionato: '', giornata: '', data: '', ora: '', squadraCasa: '', squadraOspite: '', golCasa: '', golOspite: '', stato: '', risultato: ''
    });
    const [isDragging, setIsDragging] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    const requiredFields = ['campionato', 'data', 'squadraCasa', 'squadraOspite'];

    const processFile = (file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        showAlert('error', '❌ Formato non supportato');
        return;
      }
      setFile(file);
      setImporting(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
          if (jsonData.length === 0) {
            showAlert('error', '❌ File vuoto');
            setImporting(false);
            return;
          }
          const cols = Object.keys(jsonData[0]);
          setColumns(cols);
          setParsedData(jsonData);

          const colLower = cols.map(c => c.toLowerCase().trim());
          const findCol = (keywords) => {
            for (const kw of keywords) {
              const idx = colLower.findIndex(c => c.includes(kw));
              if (idx !== -1) return cols[idx];
            }
            return '';
          };

          setMapping({
            campionato: findCol(['campionato', 'league']),
            giornata: findCol(['giornata', 'round']),
            data: findCol(['data', 'date']),
            ora: findCol(['ora', 'time']),
            squadraCasa: findCol(['squadra casa', 'home']),
            squadraOspite: findCol(['squadra ospite', 'away']),
            golCasa: findCol(['gol casa']),
            golOspite: findCol(['gol ospite']),
            stato: findCol(['stato', 'status']),
            risultato: findCol(['risultato', 'result', 'score'])
          });
          showAlert('info', `📊 ${jsonData.length} righe caricate`);
        } catch (err) {
          showAlert('error', '❌ Errore lettura: ' + err.message);
        }
        setImporting(false);
      };
      reader.readAsArrayBuffer(file);
    };

    const isMappingValid = () => requiredFields.every(f => mapping[f] && mapping[f].trim() !== '');

    const importFromFile = () => {
      if (!isMappingValid() || parsedData.length === 0) {
        showAlert('error', '❌ Verifica il mapping');
        return;
      }
      setImporting(true);
      setLoading(true);
      try {
        const existingKeys = new Set(matches.map(m => `${m.campionato}|${m.data}|${m.ora}|${m.casa}|${m.ospiti}`));
        const newMatches = [];
        const championshipsSet = new Set(championships.map(c => c.name));
        let giocateCount = 0, futureCount = 0, skippedCount = 0;

        for (const row of parsedData) {
          const campionato = row[mapping.campionato]?.toString().trim() || 'Sconosciuto';
          const giornata = row[mapping.giornata]?.toString().trim() || 'N/A';
          const dataRaw = row[mapping.data]?.toString().trim() || '';
          const oraRaw = row[mapping.ora]?.toString().trim() || '';
          const casa = row[mapping.squadraCasa]?.toString().trim() || '';
          const ospite = row[mapping.squadraOspite]?.toString().trim() || '';
          const risultatoRaw = row[mapping.risultato]?.toString().trim() || '';

          if (!casa || !ospite) { skippedCount++; continue; }
          const dataNorm = normalizeDate(dataRaw);
          if (!dataNorm) { skippedCount++; continue; }

          let stato = 'Futura', golCasa = 0, golOspite = 0, risultato = '';
          if (risultatoRaw) {
            const mr = risultatoRaw.match(/(\d+)\s*[-–:.]\s*(\d+)/);
            if (mr) {
              golCasa = parseInt(mr[1], 10);
              golOspite = parseInt(mr[2], 10);
              risultato = `${golCasa}-${golOspite}`;
              stato = 'Giocata';
            }
          }

          const key = `${campionato}|${dataNorm}|${oraRaw}|${casa}|${ospite}`;
          if (existingKeys.has(key)) { skippedCount++; continue; }
          existingKeys.add(key);

          newMatches.push({
            id: Math.random().toString(36).slice(2) + Date.now().toString(36),
            campionato, round: giornata, data: dataNorm, ora: oraRaw || 'TBD',
            casa, ospiti: ospite, stato,
            golCasa: stato === 'Giocata' ? golCasa : 0,
            golOspite: stato === 'Giocata' ? golOspite : 0,
            risultato: stato === 'Giocata' ? risultato : '',
            citta: 'N/D'
          });

          if (stato === 'Giocata') giocateCount++; else futureCount++;
          championshipsSet.add(campionato);
        }

        setMatches([...matches, ...newMatches]);
        setChampionships(Array.from(championshipsSet).map(name => ({ name, importedAt: new Date().toISOString() })));

        showAlert('success', `✅ Importate ${newMatches.length} partite (${giocateCount} giocate, ${futureCount} future)`);

        setFile(null);
        setParsedData([]);
        setColumns([]);
        setMapping({ campionato: '', giornata: '', data: '', ora: '', squadraCasa: '', squadraOspite: '', golCasa: '', golOspite: '', stato: '', risultato: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        showAlert('error', '❌ Errore: ' + err.message);
      }
      setImporting(false);
      setLoading(false);
    };

    const resetFile = () => {
      setFile(null);
      setParsedData([]);
      setColumns([]);
      setMapping({ campionato: '', giornata: '', data: '', ora: '', squadraCasa: '', squadraOspite: '', golCasa: '', golOspite: '', stato: '', risultato: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
      <div className="card">
        <h4 style={{ marginBottom: '8px' }}>📁 Importa da File (XLSX / CSV)</h4>
        <div
          className={`file-drop-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '48px' }}>📂</div>
          <p style={{ margin: '8px 0', fontWeight: 'bold' }}>{file ? file.name : 'Trascina o clicca per selezionare'}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supporta .xlsx, .xls, .csv</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files.length > 0 && processFile(e.target.files[0])} style={{ display: 'none' }} />
        </div>

        {file && parsedData.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px' }}>📊 {parsedData.length} righe</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={resetFile} disabled={importing}>🗑️ Rimuovi</button>
                <button className="btn" onClick={importFromFile} disabled={!isMappingValid() || importing || loading}>
                  {importing || loading ? '⏳ Importazione...' : '📥 Importa'}
                </button>
              </div>
            </div>

            <div className="column-mapping">
              {[
                ['campionato', 'Campionato *'],
                ['giornata', 'Giornata'],
                ['data', 'Data *'],
                ['ora', 'Ora'],
                ['squadraCasa', 'Squadra Casa *'],
                ['squadraOspite', 'Squadra Ospite *'],
                ['golCasa', 'Gol Casa'],
                ['golOspite', 'Gol Ospite'],
                ['stato', 'Stato'],
                ['risultato', 'Risultato (es. 2-1)']
              ].map(([field, label]) => (
                <div key={field} className="mapping-item">
                  <label>{label}</label>
                  <select value={mapping[field]} onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}>
                    <option value="">-- Seleziona colonna --</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // MAIN
  // ============================================================

  function ImpostazioniComponent(props) {
    const {
      matches, setMatches, championships, setChampionships,
      theme, setTheme, customTheme, setCustomTheme,
      loading, setLoading, showAlert,
      viewMode, setViewMode, fontSize, setFontSize,
      selectedFamiglie, setSelectedFamiglie
    } = props;

    const THEMES = window.THEMES;
    const CHAMPIONSHIP_LIST = window.CHAMPIONSHIP_LIST;
    const getChampColor = window.getChampColor;

    const [settingsTab, setSettingsTab] = useState('Temi');
    const SETTINGS_TABS = ['Temi', 'Dati Locali', 'Importa Campionato', 'Giocate', 'Grandezza Caratteri', 'Visuale'];

    const saveLocal = () => {
      const data = { championships, matches, theme, customTheme, selectedFamiglie, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      a.href = url;
      a.download = `GesssAi-${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}.json`;
      a.click();
      showAlert('success', '💾 Backup scaricato!');
    };

    const loadLocal = (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.championships) setChampionships(data.championships);
          if (data.matches) setMatches(data.matches);
          if (data.theme) setTheme(data.theme);
          if (data.customTheme) setCustomTheme(data.customTheme);
          if (data.selectedFamiglie) setSelectedFamiglie(data.selectedFamiglie);
          showAlert('success', '📂 Dati caricati!');
        } catch (err) { showAlert('error', 'File non valido'); }
      };
      reader.readAsText(file);
    };

    const clearAllChampionships = () => {
      if (championships.length === 0) {
        showAlert('info', 'ℹ️ Nessun campionato.');
        return;
      }
      if (confirm(`⚠️ Eliminare TUTTI i ${championships.length} campionati?`)) {
        setChampionships([]);
        setMatches([]);
        showAlert('success', '🗑️ Resettato.');
      }
    };

    return (
      <div>
        <div className="tabs-sub">
          {SETTINGS_TABS.map(t => (
            <button key={t} className={settingsTab === t ? 'active' : ''} onClick={() => setSettingsTab(t)}>
              {t === 'Temi' && '🎨 '}
              {t === 'Dati Locali' && '💾 '}
              {t === 'Importa Campionato' && '📥 '}
              {t === 'Giocate' && '🎯 '}
              {t === 'Grandezza Caratteri' && '📏 '}
              {t === 'Visuale' && '📱 '}
              {t}
            </button>
          ))}
        </div>

        {settingsTab === 'Temi' && (
          <div>
            <h3 style={{ marginBottom: '12px' }}>🎨 Scegli un Tema</h3>
            <div className="theme-grid">
              {Object.entries(THEMES).map(([name, t]) => (
                <div key={name} className={`theme-card ${theme === name ? 'active' : ''}`}
                  style={{ background: t.card, color: t.text, borderColor: theme === name ? t.accent : t.border }}
                  onClick={() => setTheme(name)}>
                  <div className="theme-name" style={{ color: t.accent }}>{name}</div>
                </div>
              ))}
              <div className={`theme-card ${theme === 'Custom' ? 'active' : ''}`}
                style={{ background: customTheme.card, color: customTheme.text, borderColor: theme === 'Custom' ? customTheme.accent : customTheme.border }}
                onClick={() => setTheme('Custom')}>
                <div className="theme-name" style={{ color: customTheme.accent }}>🎨 Custom</div>
              </div>
            </div>

            {theme === 'Custom' && (
              <div className="card" style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '12px' }}>Personalizza Colori</h3>
                {[['Sfondo','bg'],['Superficie','surface'],['Card','card'],['Banner','banner'],['Testo','text'],['Testo Muted','textMuted'],['Accento','accent'],['Accento 2','accent2'],['Bordo','border']].map(([label, key]) => (
                  <div key={key} className="color-picker-row">
                    <input type="color" value={customTheme[key]} onChange={e => setCustomTheme({ ...customTheme, [key]: e.target.value })} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {settingsTab === 'Dati Locali' && (
          <div>
            <h3 style={{ marginBottom: '12px' }}>💾 Salvataggio / Caricamento</h3>
            <div className="card">
              <button className="btn" onClick={saveLocal}>💾 Scarica Backup JSON</button>
              <hr style={{ margin: '14px 0', borderColor: 'var(--border)' }} />
              <label style={{ display: 'block', marginBottom: '6px' }}>📂 Carica Backup JSON</label>
              <input type="file" accept=".json" onChange={e => e.target.files[0] && loadLocal(e.target.files[0])} />
              <hr style={{ margin: '14px 0', borderColor: 'var(--border)' }} />
              <button className="btn btn-danger" onClick={() => {
                if (confirm('Vuoi davvero resettare TUTTI i dati?')) {
                  localStorage.clear();
                  setChampionships([]);
                  setMatches([]);
                  showAlert('success', '🗑️ Dati resettati.');
                }
              }}>🗑️ Reset Completo</button>
            </div>
          </div>
        )}

        {settingsTab === 'Importa Campionato' && (
          <div>
            <h3 style={{ marginBottom: '12px' }}>📥 Importa Campionato</h3>
            <FileImporter
              matches={matches} setMatches={setMatches}
              championships={championships} setChampionships={setChampionships}
              loading={loading} setLoading={setLoading} showAlert={showAlert}
            />
            <hr style={{ borderColor: 'var(--border)', margin: '20px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>📋 Campionati Importati</h3>
              <button className="btn btn-danger" onClick={clearAllChampionships}>🗑️ Elimina Tutti</button>
            </div>
            {championships.length === 0 ? (
              <div className="empty-state">Nessun campionato importato.</div>
            ) : (
              <div className="champ-list">
                {championships.map(c => {
                  const total = matches.filter(m => m.campionato === c.name).length;
                  const future = matches.filter(m => m.campionato === c.name && m.stato === 'Futura').length;
                  const played = matches.filter(m => m.campionato === c.name && m.stato === 'Giocata').length;
                  return (
                    <div key={c.name} className="champ-item" style={{ borderLeft: `4px solid ${getChampColor(c.name)}`, paddingLeft: '12px' }}>
                      <div>
                        <b>{c.name}</b>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {total} partite ({future} future, {played} giocate)
                        </div>
                      </div>
                      <button className="btn btn-danger" onClick={() => {
                        if (confirm(`Eliminare ${c.name}?`)) {
                          setChampionships(championships.filter(x => x.name !== c.name));
                          setMatches(matches.filter(m => m.campionato !== c.name));
                        }
                      }}>🗑️ Elimina</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {settingsTab === 'Giocate' && (
          <FamiglieSelector
            selectedFamiglie={selectedFamiglie}
            setSelectedFamiglie={setSelectedFamiglie}
            showAlert={showAlert}
          />
        )}

        {settingsTab === 'Grandezza Caratteri' && (
          <div className="card">
            <h3 style={{ marginBottom: '12px' }}>📏 Grandezza Caratteri</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setFontSize(prev => Math.max(70, prev - 5))}
                style={{ fontSize: '18px', fontWeight: 'bold', padding: '8px 16px', minWidth: '44px', minHeight: '44px' }}>−</button>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <input type="range" min="70" max="150" step="5" value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span>70 %</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{fontSize}%</span>
                  <span>150%</span>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setFontSize(prev => Math.min(150, prev + 5))}
                style={{ fontSize: '18px', fontWeight: 'bold', padding: '8px 16px', minWidth: '44px', minHeight: '44px' }}>+</button>
              <button className="btn btn-secondary" onClick={() => setFontSize(100)}
                style={{ fontSize: '12px', padding: '8px 16px' }}>🔄 Reset (100%)</button>
            </div>
          </div>
        )}

        {settingsTab === 'Visuale' && (
          <div className="card">
            <h3 style={{ marginBottom: '12px' }}>📱 Cambia Visuale</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button className={`btn ${viewMode === 'pc' ? '' : 'btn-secondary'}`}
                onClick={() => { setViewMode('pc'); localStorage.setItem('ft_view_mode', 'pc'); }}
                style={{ flex: 1, minWidth: '120px' }}>🖥️ PC</button>
              <button className={`btn ${viewMode === 'mobile' ? '' : 'btn-secondary'}`}
                onClick={() => { setViewMode('mobile'); localStorage.setItem('ft_view_mode', 'mobile'); }}
                style={{ flex: 1, minWidth: '120px' }}>📱 Telefono</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  window.ImpostazioniComponent = ImpostazioniComponent;
  console.log('✅ Modulo Impostazioni caricato');

})();