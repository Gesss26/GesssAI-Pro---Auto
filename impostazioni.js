// ============================================================
// impostazioni.js
// Tab: Temi | Giocate | Gestione Utenti | Grandezza Caratteri | Visuale
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
  // MAIN COMPONENT
  // ============================================================

  function ImpostazioniComponent(props) {
    const {
      theme, setTheme, customTheme, setCustomTheme,
      showAlert,
      viewMode, setViewMode, fontSize, setFontSize,
      selectedFamiglie, setSelectedFamiglie
    } = props;

    const THEMES = window.THEMES;

    const [settingsTab, setSettingsTab] = useState('Temi');
    const SETTINGS_TABS = ['Temi', 'Giocate', 'Gestione Utenti', 'Grandezza Caratteri', 'Visuale'];

    return (
      <div>
        <div className="tabs-sub">
          {SETTINGS_TABS.map(t => (
            <button key={t} className={settingsTab === t ? 'active' : ''} onClick={() => setSettingsTab(t)}>
              {t === 'Temi' && '🎨 '}
              {t === 'Giocate' && '🎯 '}
              {t === 'Gestione Utenti' && '👥 '}
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

        {settingsTab === 'Giocate' && (
          <FamiglieSelector
            selectedFamiglie={selectedFamiglie}
            setSelectedFamiglie={setSelectedFamiglie}
            showAlert={showAlert}
          />
        )}

        {settingsTab === 'Gestione Utenti' && (
          <div>
            {window.GestioneUtentiPanel ? (
              <window.GestioneUtentiPanel />
            ) : (
              <div className="alert alert-info">
                ⏳ Caricamento Gestione Utenti... (gestione-conto.js)
              </div>
            )}
          </div>
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
  console.log('✅ Modulo Impostazioni caricato - con Gestione Utenti');

})();