// ============================================================
// storico.js - Modulo Storico esterno
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

    const playedMatches = useMemo(() => {
      let list = matches.filter(m => {
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
    }, [matches, selectedChamp]);

    const senzaRisultato = playedMatches.filter(m => m.stato === 'Futura' && isDatePassed(m.data));

    return (
      <div>
        <h2 style={{ marginBottom: '14px' }}>📜 Storico Partite Giocate</h2>

        <div className="form-group">
          <label>Filtra per Campionato</label>
          <select value={selectedChamp} onChange={e => setSelectedChamp(e.target.value)}>
            <option value="Tutti">Tutti</option>
            {championships.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {senzaRisultato.length > 0 && (
          <div className="alert alert-info" style={{ marginBottom: '12px' }}>
            ⚠️ {senzaRisultato.length} partite hanno data passata ma non hanno risultato.
          </div>
        )}

        {playedMatches.length === 0 ? (
          <div className="empty-state">Nessuna partita giocata o con data passata.</div>
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
  console.log('✅ Modulo Storico caricato');

})();