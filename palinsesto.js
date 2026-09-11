// ============================================================
// palinsesto.js - Modulo Palinsesto esterno
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo } = React;

  // ============================================================
  // MATCH TAB (card partita con giocate)
  // ============================================================

  const MatchTab = ({ match, allMatches, onSelect, selectedFamiglie, weatherCache }) => {
    const computeMatchStats = window.computeMatchStats;
    const calcFormAndStats = window.calcFormAndStats;
    const getChampColor = window.getChampColor;
    const formatDateEU = window.formatDateEU;
    const TeamLogo = window.TeamLogo;
    const FAMIGLIE_GIOCATE = window.FAMIGLIE_GIOCATE;
    const getBestBetForFamily = window.getBestBetForFamily;
    const getMultigolRange = window.getMultigolRange;
    const getPercentualeClasse = window.getPercentualeClasse;

    if (!match) return null;

    const homeForm = calcFormAndStats(allMatches, match.casa);
    const awayForm = calcFormAndStats(allMatches, match.ospiti);
    const champColor = getChampColor(match.campionato);
    const diff = Math.abs(homeForm.pct - awayForm.pct);
    const stats = computeMatchStats(match, allMatches);

    stats._allMatches = allMatches;
    stats._homeTeam = match.casa;
    stats._awayTeam = match.ospiti;

    const renderFormSquares = (formStr) => {
      if (!formStr) return <span>N/D</span>;
      return [...formStr].map((letter, idx) => (
        <div key={idx} className={`form-square form-square-${letter}`}>{letter}</div>
      ));
    };

    const renderXgValue = (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return <span className="xg-value xg-white">N/A</span>;
      let cls = 'xg-white';
      if (num >= 2) cls = 'xg-blue';
      else if (num < 1) cls = 'xg-red';
      return <span className={`xg-value ${cls}`}>{num.toFixed(1)}</span>;
    };

    const getColorForPct = (valore) => {
      if (valore >= 90) return '#f39c12';
      if (valore >= 66.67) return '#6fcf97';
      if (valore >= 33.34) return '#8b949e';
      return '#eb5757';
    };

    const getBadgeBackground = (valore) => {
      if (valore >= 90) return 'rgba(243, 156, 18, 0.2)';
      if (valore >= 66.67) return 'rgba(111, 207, 151, 0.2)';
      if (valore >= 33.34) return 'rgba(139, 148, 158, 0.2)';
      return 'rgba(235, 87, 87, 0.2)';
    };

    const getBadgeBorder = (valore) => {
      if (valore >= 90) return '2px solid #f39c12';
      if (valore >= 66.67) return '1px solid #6fcf97';
      if (valore >= 33.34) return '1px solid #8b949e';
      return '1px solid #eb5757';
    };

    const getGiocateDaMostrare = () => {
      if (stats.error) return [];
      const homeMG = stats.homeMG || {};
      const awayMG = stats.awayMG || {};
      const mgTot = stats.mgTot || {};
      const homeRange = getMultigolRange(match.casa, allMatches);
      const awayRange = getMultigolRange(match.ospiti, allMatches);
      const giocateDaMostrare = [];

      selectedFamiglie.forEach(familyId => {
        const family = FAMIGLIE_GIOCATE[familyId];
        if (!family) return;
        const best = getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
        if (best && best.pct > 0) {
          giocateDaMostrare.push({
            familyId,
            familyLabel: family.label,
            familyIcon: family.icon,
            label: best.label,
            familyName: family.label,
            pct: best.pct,
            isBomb: best.pct >= 90,
            giocata: best.giocata
          });
        }
      });

      return giocateDaMostrare.sort((a, b) => b.pct - a.pct);
    };

    const giocateDaMostrare = getGiocateDaMostrare();
    const score = giocateDaMostrare.length > 0
      ? Math.round(giocateDaMostrare.reduce((s, g) => s + g.pct, 0) / giocateDaMostrare.length)
      : 0;
    const hasBomb = giocateDaMostrare.some(g => g.isBomb);

    const handleClick = (e) => {
      e.stopPropagation();
      onSelect(match.id);
    };

    const formattedDate = match.data ? formatDateEU(match.data) : 'N/D';

    return (
      <div className="match-tab" style={{ borderLeftColor: champColor }} onClick={handleClick}>
        <div className="score-badge">
          <span className={`giocata-pct ${getPercentualeClasse(score)}`}>
            {isNaN(score) ? 0 : score}%
          </span>
          {hasBomb && <span className="bomb-inline">💣</span>}
        </div>

        <div className="tab-header" style={{ background: champColor }}>
          <span>{match.campionato || 'N/D'}</span>
        </div>

        <div className="match-info">{match.campionato} - Giornata: {match.round || 'N/A'}</div>
        <div className="match-info">📅 {formattedDate} - ⏰ {match.ora || 'TBD'}</div>

        <div className="teams-row">
          <div className="team">
            <TeamLogo teamName={match.casa} championship={match.campionato} size={50} />
            <div className="team-name">{match.casa || 'Casa'}</div>
          </div>
          <div className="vs">VS</div>
          <div className="team">
            <TeamLogo teamName={match.ospiti} championship={match.campionato} size={50} />
            <div className="team-name">{match.ospiti || 'Ospite'}</div>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-block-compact">
            <div className="form-label">Forma</div>
            <div className="form-squares">{renderFormSquares(homeForm.form)}</div>
            <div className="form-pct-compact">{homeForm.pct || 0}%</div>
            <div className="form-bar"><div className="form-bar-fill" style={{ width: (homeForm.pct || 0) + '%' }}></div></div>
          </div>
          <div className="form-block-compact">
            <div className="form-label">Forma</div>
            <div className="form-squares">{renderFormSquares(awayForm.form)}</div>
            <div className="form-pct-compact">{awayForm.pct || 0}%</div>
            <div className="form-bar"><div className="form-bar-fill" style={{ width: (awayForm.pct || 0) + '%' }}></div></div>
          </div>
        </div>

        <div className="form-diff">📊 Differenza forma: <span>{isNaN(diff) ? 0 : diff}%</span></div>

        <div className="form-xg">
          <span className="xg-home">⚽ xG {match.casa}: {renderXgValue(homeForm.mediaGolFatti || 0)}</span>
          <span className="xg-away">⚽ xG {match.ospiti}: {renderXgValue(awayForm.mediaGolFatti || 0)}</span>
        </div>

        <div className="bet-row-vertical">
          {giocateDaMostrare.length > 0 ? (
            giocateDaMostrare.map((g, idx) => {
              const pctColor = getColorForPct(g.pct);
              const bgColor = getBadgeBackground(g.pct);
              const borderStyle = getBadgeBorder(g.pct);
              const isBomb = g.pct >= 90;

              return (
                <div key={idx}
                  className={`bet-item-vertical ${isBomb ? 'bomb' : ''}`}
                  style={{
                    borderColor: pctColor,
                    background: isBomb ? 'var(--accent)' : bgColor,
                    border: isBomb ? '2px solid var(--accent)' : borderStyle,
                    animation: isBomb ? 'bomb-glow 1s infinite alternate' : 'none'
                  }}>
                  <span className="bet-label" style={{ color: isBomb ? '#000' : pctColor }}>
                    {isBomb && '💣 '}
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: isBomb ? '#000' : pctColor }}>
                      {g.label}
                    </span>
                  </span>
                  <span className="bet-value">
                    <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`}>
                      {g.pct}% {isBomb && <span className="bomb-icon">💣</span>}
                    </span>
                    <div className="combinata-detail" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {g.familyIcon} {g.familyName}
                    </div>
                  </span>
                </div>
              );
            })
          ) : (
            <div className="bet-item-vertical" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <span>Nessuna giocata disponibile</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // FILTRI
  // ============================================================

  const GiorniFilters = ({ selected, onChange }) => {
    const options = [1, 2, 3, 4, 5];
    return (
      <div className="giorni-filters">
        {options.map(g => (
          <button key={g}
            className={`giorno-btn ${selected === g ? 'active' : 'inactive'}`}
            onClick={() => onChange(g)}>
            📅 {g} {g === 1 ? 'Giorno' : 'Giorni'}
          </button>
        ))}
      </div>
    );
  };

  const ChampFilters = ({ selectedChamps, onToggle, onSelectAll, onClearAll }) => {
    const CHAMPIONSHIP_LIST = window.CHAMPIONSHIP_LIST;
    const getChampColor = window.getChampColor;
    const activeCount = Object.values(selectedChamps).filter(v => v).length;
    const total = Object.keys(selectedChamps).length;

    return (
      <div className="champ-filters-container">
        <div className="champ-filters-grid">
          {CHAMPIONSHIP_LIST.map(champ => {
            const isActive = selectedChamps[champ] !== false;
            const color = getChampColor(champ);
            return (
              <button key={champ}
                className={`champ-filter-btn ${isActive ? 'active' : 'inactive'}`}
                style={{
                  borderColor: isActive ? color : 'var(--border)',
                  background: isActive ? color : 'var(--surface)',
                  color: isActive ? '#000' : 'var(--text-muted)',
                }}
                onClick={() => onToggle(champ)}
                title={champ}>
                <span className="champ-color-dot" style={{ background: color }} />
                <span className="champ-name">{champ.length > 20 ? champ.substring(0, 18) + '…' : champ}</span>
              </button>
            );
          })}
        </div>
        <div className="champ-actions">
          <button className="btn-sm btn-select-all" onClick={onSelectAll}>✅ Seleziona Tutti</button>
          <button className="btn-sm btn-clear-all" onClick={onClearAll}>❌ Svuota Selezione</button>
          <span className="champ-count-badge">{activeCount} / {total}</span>
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTE PRINCIPALE
  // ============================================================

  function PalinsestoComponent({ matches, selectedFamiglie, onSelectMatch, weatherCache }) {
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;
    const addDaysToDateStr = window.addDaysToDateStr;
    const CHAMPIONSHIP_LIST = window.CHAMPIONSHIP_LIST;

    const [selectedGiorni, setSelectedGiorni] = useState(1);
    const [selectedChamps, setSelectedChamps] = useState(() => {
      const all = {};
      CHAMPIONSHIP_LIST.forEach(c => { all[c] = true; });
      return all;
    });

    const toggleChamp = (champName) => {
      setSelectedChamps(prev => ({ ...prev, [champName]: !prev[champName] }));
    };
    const selectAllChamps = () => {
      const all = {};
      CHAMPIONSHIP_LIST.forEach(c => { all[c] = true; });
      setSelectedChamps(all);
    };
    const clearAllChamps = () => {
      const none = {};
      CHAMPIONSHIP_LIST.forEach(c => { none[c] = false; });
      setSelectedChamps(none);
    };

    const getActiveChamps = () => Object.keys(selectedChamps).filter(c => selectedChamps[c]);

    const futureMatches = useMemo(() => {
      try {
        const activeChamps = getActiveChamps();
        const todayStr = getTodayStr();
        const maxDateStr = addDaysToDateStr(todayStr, selectedGiorni);

        let list = matches.filter(m => m.stato === 'Futura');
        if (activeChamps.length > 0) {
          list = list.filter(m => activeChamps.includes(m.campionato));
        }
        list = list.filter(m => {
          if (!m.data) return false;
          const normalized = normalizeDate(m.data);
          if (!normalized) return false;
          return normalized >= todayStr && normalized <= maxDateStr;
        });
        list.sort((a, b) => {
          const da = normalizeDate(a.data);
          const db = normalizeDate(b.data);
          if (!da || !db) return 0;
          return da.localeCompare(db);
        });
        return list;
      } catch (e) {
        console.error('Errore filtro Palinsesto:', e);
        return [];
      }
    }, [matches, selectedGiorni, selectedChamps]);

    return (
      <div>
        <div style={{ marginBottom: '12px' }}>
          <GiorniFilters selected={selectedGiorni} onChange={setSelectedGiorni} />
          <ChampFilters
            selectedChamps={selectedChamps}
            onToggle={toggleChamp}
            onSelectAll={selectAllChamps}
            onClearAll={clearAllChamps}
          />
        </div>

        <h2 style={{ marginBottom: '14px' }}>
          📅 Palinsesto - Prossimi {selectedGiorni} {selectedGiorni > 1 ? 'Giorni' : 'Giorno'}
        </h2>

        {futureMatches.length === 0 ? (
          <div className="empty-state">
            Nessuna partita disponibile nelle prossime {selectedGiorni} giornate.
          </div>
        ) : (
          <div className="matches-grid">
            {futureMatches.map(m => {
              const weatherKey = `${m.campionato}_${m.data}`;
              const weather = weatherCache[weatherKey] || null;
              return (
                <MatchTab
                  key={m.id}
                  match={m}
                  allMatches={matches}
                  onSelect={onSelectMatch}
                  selectedFamiglie={selectedFamiglie}
                  weatherCache={weatherCache}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  window.PalinsestoComponent = PalinsestoComponent;
  console.log('✅ Modulo Palinsesto caricato');

})();