function HomeComponent({ matches, championships, onSelectMatch, setTab, selectedFamiglie, weatherCache }) {
  // ⭐ NUOVO: switch Gestione Conto / Nazioni / Performance
  const [homeTab, setHomeTab] = useState('GestioneConto');
  const [nazioneSelezionata, setNazioneSelezionata] = useState(null);

  const { filtro: filtroCampionati, campionatiAttivi } =
    window.FiltriCampionati.useFiltroCampionati();

  const matchesPuliti = useMemo(() => {
    const normalizzati = normalizeMatches(matches);
    return window.FiltriCampionati.filtraPartitePerCampionato(normalizzati);
  }, [matches, filtroCampionati]);

  if (!matches || matches.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '60px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌍</div>
        <h3 style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Nessuna partita disponibile
        </h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Importa un campionato da <b>Impostazioni → Importa Campionato</b>
        </p>
      </div>
    );
  }

  const BannerFiltro = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      padding: '10px 14px', marginBottom: '14px',
      background: 'var(--surface)', borderRadius: '8px',
      border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)'
    }}>
      <span>🏆 <b style={{ color: 'var(--accent)' }}>{campionatiAttivi.length}</b> campionati attivi</span>
      <span>•</span>
      <span>📊 <b style={{ color: 'var(--accent)' }}>{matchesPuliti.length}</b> partite totali</span>
      <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
        Modifica i filtri nel <b>Palinsesto</b> 📅
      </span>
    </div>
  );

  const renderTabContent = () => {
    // ⭐ GESTIONE CONTO
    if (homeTab === 'GestioneConto') {
      return window.GestioneContoComponent ? (
        <window.GestioneContoComponent />
      ) : (
        <div className="alert alert-info">⏳ Caricamento Gestione Conto... (gestione-conto.js)</div>
      );
    }

    if (homeTab === 'Performance') {
      return window.PerformanceComponent ? (
        <window.PerformanceComponent
          matches={matches}
          championships={championships}
          onSelectMatch={onSelectMatch}
        />
      ) : (
        <div className="alert alert-info">⏳ Caricamento Performance... (performance.js)</div>
      );
    }

    if (nazioneSelezionata) {
      return (
        <VistaNazione
          nazione={nazioneSelezionata}
          matches={matchesPuliti}
          onBack={() => setNazioneSelezionata(null)}
        />
      );
    }
    return (
      <GrigliaNazioni
        matches={matchesPuliti}
        onSelectNazione={setNazioneSelezionata}
      />
    );
  };

  return (
    <div>
      {window.QuoteManager?.BannerScadenzaQuote && (
        <window.QuoteManager.BannerScadenzaQuote />
      )}

      {/* Banner filtro visibile solo nelle tab Nazioni/Performance */}
      {homeTab !== 'GestioneConto' && <BannerFiltro />}

      {/* ⭐ SWITCH CON 3 TAB */}
      <div className="sub-tabs" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          className={homeTab === 'GestioneConto' ? 'active' : ''}
          onClick={() => { setHomeTab('GestioneConto'); setNazioneSelezionata(null); }}
        >
          💰 Gestione Conto
        </button>
        <button
          className={homeTab === 'Nazioni' ? 'active' : ''}
          onClick={() => { setHomeTab('Nazioni'); setNazioneSelezionata(null); }}
        >
          🌍 Seleziona una Nazione
        </button>
        <button
          className={homeTab === 'Performance' ? 'active' : ''}
          onClick={() => setHomeTab('Performance')}
        >
          📈 Performance
        </button>
      </div>

      {renderTabContent()}
    </div>
  );
}