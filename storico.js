// ============================================================
// storico.js - Modulo Storico esterno
// LEGGE il filtro campionati dal Palinsesto (fonte di verità).
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo } = React;

  const MatchTabHistory = ({ match, onSelect }) => {
    const getChampColor = window.getChampColor;
    const formatDateEU = window.formatDateEU;
    const TeamLogo = window.TeamLogo;

    if (!match) return null;
    const champColor = getChampColor(match.campionato);
    let scoreClass = '';
    if (match.golCasa > match.golOspite) scoreClass = 'score-win';
    else if (match.golCasa === match.golOspite) scoreClass = 'score-draw';
    else scoreClass = 'score-loss';
    const formattedDate = match.data ? formatDateEU(match.data) : 'N/D';

    return (
      <div className="match-tab-history" style={{ borderLeftColor: champColor }} onClick={() => onSelect(match.id)}>
        <div className="tab-header" style={{ background: champColor }}>
          <span>{match.campionato || 'N/D'}</span>
        </div>
        <div className="match-info">{match.campionato} - Giornata: {match.round || 'N/A'}</div>
        <div className="match-info">📅 {formattedDate} - ⏰ {match.ora || 'TBD'}</div>
        <div className="teams-row">
          <div className="team">
            <TeamLogo teamName={match.casa} championship={match.campionato} size={50} />
            <div className="team-name" style={{ fontSize: '16px' }}>{match.casa || 'Casa'}</div>
          </div>
          <div className="score">
            <span className={scoreClass}>{match.golCasa || 0} - {match.golOspite || 0}</span>
          </div>
          <div className="team">
            <TeamLogo teamName={match.ospiti} championship={match.campionato} size={50} />
            <div className="team-name" style={{ fontSize: '16px' }}>{match.ospiti || 'Ospite'}</div>
          </div>
        </div>
      </div>
    );
  };

  function StoricoComponent({ matches, championships, onSelectMatch }) {
    const [selectedChamp, setSelectedChamp] = useState('Tutti');
    const normalizeDate = window.normalizeDate;
    const isDatePassed = window.isDatePassed;

    // Filtro di sicurezza lato UI
    const CAMPIONATI_ESCLUSI = window.CAMPIONATI_ESCLUSI;

    // ⭐ FILTRO CAMPIONATI GLOBALE (letto dal Palinsesto)
    const { filtro: filtroCampionati, campionatiAttivi } =
      window.FiltriCampionati.useFiltroCampionati();

    // Partite filtrate per campionati attivi
    const matchesFiltrati = useMemo(
      () => window.FiltriCampionati.filtraPartitePerCampionato(matches),
      [matches, filtroCampionati]
    );

    const campionatiDisponibili = useMemo(() => {
      let lista = championships;
      if (CAMPIONATI_ESCLUSI) {
        lista = lista.filter(c => !CAMPIONATI_ESCLUSI.has(c.name));
      }
      // Mostra solo campionati attivi (dal filtro globale)
      lista = lista.filter(c => filtroCampionati[c.name] !== false);
      return lista;
    }, [championships, CAMPIONATI_ESCLUSI, filtroCampionati]);

    const playedMatches = useMemo(() => {
      let list = matchesFiltrati.filter(m => {
        if (CAMPIONATI_ESCLUSI && CAMPIONATI_ESCLUSI.has(m.campionato)) return false;
        if (m.stato === 'Giocata') return true;
        if (m.stato === 'Futura' && isDatePassed(m.data)) return true;
        return false;
      });
      if (selectedChamp !== 'Tutti') {
        list = list.filter(m => m.campionato === selectedChamp);
      }
      list.sort((a, b) => {
        const da = normalizeDate(a.data);
        const db = normalizeDate(b.data);
        if (!da || !db) return 0;
        return db.localeCompare(da);
      });
      return list;
    }, [matchesFiltrati, selectedChamp, CAMPIONATI_ESCLUSI]);

    const senzaRisultato = playedMatches.filter(m => m.stato === 'Futura' && isDatePassed(m.data));

    return (
      <div>
        <h2 style={{ marginBottom: '14px' }}>📜 Storico Partite Giocate</h2>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          padding: '10px 14px', marginBottom: '14px',
          background: 'var(--surface)', borderRadius: '8px',
          border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)'
        }}>
          <span>🏆 <b style={{ color: 'var(--accent)' }}>{campionatiAttivi.length}</b> campionati attivi</span>
          <span>•</span>
          <span>📜 <b style={{ color: 'var(--accent)' }}>{matchesFiltrati.length}</b> partite totali</span>
          <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
            Modifica i filtri nel <b>Palinsesto</b> 📅
          </span>
        </div>

        <div className="form-group">
          <label>Filtra per Campionato</label>
          <select value={selectedChamp} onChange={e => setSelectedChamp(e.target.value)}>
            <option value="Tutti">Tutti</option>
            {campionatiDisponibili.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {senzaRisultato.length > 0 && (
          <div className="alert alert-info" style={{ marginBottom: '12px' }}>
            ⚠️ {senzaRisultato.length} partite hanno data passata ma non hanno risultato.
          </div>
        )}

        {playedMatches.length === 0 ? (
          <div className="empty-state">
            Nessuna partita giocata o con data passata per i campionati attivi.
            <br />
            <span style={{ fontSize: '12px' }}>Modifica i filtri nel Palinsesto 📅</span>
          </div>
        ) : (
          <div className="matches-grid">
            {playedMatches.map(m => (
              <MatchTabHistory key={m.id} match={m} onSelect={onSelectMatch} />
            ))}
          </div>
        )}
      </div>
    );
  }

  window.StoricoComponent = StoricoComponent;
  console.log('✅ Modulo Storico caricato - legge filtro campionati dal Palinsesto');

})();