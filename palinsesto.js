// ============================================================
// palinsesto.js - Modulo Palinsesto con quote visibili
// Mostra quote PDF accanto a ogni giocata (con value bet)
// È la FONTE DI VERITÀ per il filtro campionati, giorni e modalità giocate.
// Etichette MG: 8 opzioni (Casa/Ospite 0-2, 1-3, 2-5 + Tot 1-4, 2-5)
// ✅ FIX v6: Multigol con 8 opzioni + etichette già formattate
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

  // ============================================================
  // FORMATTAZIONE ETICHETTE GIOCATE
  // Le etichette MG arrivano già formattate ('MG Casa 0-2', 'MG Tot 1-4', ecc.)
  // ============================================================
  const formatGiocataLabel = (familyId, label) => {
    if (!label) return '—';

    if (label.startsWith('Over '))  return label;
    if (label.startsWith('Under ')) return label.replace('.', ',');

    if (familyId === 'multigol') {
      // Le etichette sono già formattate dal sistema: 'MG Casa 0-2', ecc.
      return label;
    }

    if (familyId === 'mg_casa_ospite') {
      const parts = label.split('+');
      if (parts.length === 2) {
        return `MG ${parts[0]} Casa + MG ${parts[1]} Ospite`;
      }
    }

    if (familyId === 'dc_multigol') {
      const parts = label.split('+');
      if (parts.length === 2) return `${parts[0]} + ${parts[1]}`;
    }

    if (familyId === 'dc_under') {
      const parts = label.split('+');
      if (parts.length === 2) {
        const uLabel = parts[1].replace('U', 'Under ').replace('.', ',');
        return `${parts[0]} + ${uLabel}`;
      }
    }

    if (familyId === 'dc_over') {
      const parts = label.split('+');
      if (parts.length === 2) {
        const oLabel = parts[1].replace('O', 'Over ').replace('.', ',');
        return `${parts[0]} + ${oLabel}`;
      }
    }

    if (familyId === 'gg_ng') {
      if (label === 'Goal-Goal') return 'GG';
      if (label === 'No Goal') return 'NG';
    }

    return label;
  };

  // ============================================================
  // UTILITY: CERCA QUOTA PDF PER GIOCATA
  // ============================================================
  const getQuotaInfo = (match, familyId, giocata, pctTua) => {
    if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') {
      return null;
    }
    try {
      return window.QuoteManager.analizzaGiocata(match, familyId, giocata, pctTua);
    } catch (e) {
      return null;
    }
  };

  // ============================================================
  // COMPONENTE: BOX QUOTA
  // ============================================================
  const QuotaBox = ({ match, familyId, giocata, pctTua }) => {
    const [quotaInfo, setQuotaInfo] = useState(null);

    const { numPartite, dataMaxPDF } = window.QuoteManager ? window.QuoteManager.useQuote() : { numPartite: 0, dataMaxPDF: null };

    useEffect(() => {
      const info = getQuotaInfo(match, familyId, giocata, pctTua);
      setQuotaInfo(info);
    }, [match.id, familyId, giocata, pctTua, numPartite, dataMaxPDF]);

    if (!quotaInfo || !quotaInfo.quotaBook) {
      return null;
    }

    const { quotaBook, edge, isValue } = quotaInfo;

    const bgColor = isValue
      ? 'rgba(111, 207, 151, 0.15)'
      : 'rgba(255, 255, 255, 0.05)';
    const borderColor = isValue ? 'var(--win)' : 'var(--border)';
    const textColor = isValue ? 'var(--win)' : 'var(--text)';

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        marginLeft: '6px',
        borderRadius: '4px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        fontSize: '11px',
        fontWeight: 'bold',
        color: textColor,
        whiteSpace: 'nowrap',
      }}
        title={isValue ? `VALUE BET! Edge: +${edge}%` : `Quota Marathonbet`}
      >
        <span>💰</span>
        <span>{quotaBook.toFixed(2)}</span>
      </div>
    );
  };

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
    const calcolaGG_NG = window.calcolaGG_NG;

    const { mode: visualizzaMode } = window.FiltriCampionati.useVisualizzaGiocateMode();

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

      let famiglieDaAnalizzare;
      if (visualizzaMode === 'tutte') {
        famiglieDaAnalizzare = Object.keys(FAMIGLIE_GIOCATE);
      } else {
        famiglieDaAnalizzare = selectedFamiglie || [];
      }

      famiglieDaAnalizzare = [...new Set(famiglieDaAnalizzare)].filter(
        id => FAMIGLIE_GIOCATE[id]
      );

      famiglieDaAnalizzare.forEach(familyId => {
        const family = FAMIGLIE_GIOCATE[familyId];
        if (!family) return;

        let best = null;

        if (familyId === 'gg_ng') {
          const ggNgResult = calcolaGG_NG ? calcolaGG_NG(stats) : null;
          if (ggNgResult) {
            best = {
              ...ggNgResult,
              familyId: 'gg_ng',
              familyLabel: family.label,
              familyIcon: family.icon,
            };
          }
        } else {
          best = getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
        }

        if (best && best.pct > 0) {
          giocateDaMostrare.push({
            familyId,
            familyLabel: family.label,
            familyIcon: family.icon,
            label: best.label,
            displayLabel: formatGiocataLabel(familyId, best.label),
            familyName: family.label,
            pct: best.pct,
            isBomb: best.pct >= 90,
            giocata: best.giocata,
          });
        }
      });

      return giocateDaMostrare.sort((a, b) => b.pct - a.pct).slice(0, 3);
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

        <div className="form-diff">
          📊 Differenza forma:{' '}
          <span className={diff >= 20 ? 'diff-alta' : 'diff-bassa'}>
            {isNaN(diff) ? 0 : diff}%
          </span>
        </div>

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
                      {g.displayLabel || g.label}
                    </span>
                  </span>
                  <span className="bet-value">
                    <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`}>
                      {g.pct}% {isBomb && <span className="bomb-icon">💣</span>}
                    </span>
                    <QuotaBox
                      match={match}
                      familyId={g.familyId}
                      giocata={g.giocata}
                      pctTua={g.pct}
                    />
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
    const options = [1, 2, 3, 4, 5, 6, 7];
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

  const VisualizzaGiocateSwitch = ({ mode, setMode, selectedFamiglie }) => {
    const countScelte = (selectedFamiglie || []).length;
    const totalFamiglie = Object.keys(window.FAMIGLIE_GIOCATE || {}).length;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginTop: '12px',
        padding: '10px 14px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '2px solid var(--border)',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>
          🎯 Giocate da mostrare:
        </span>
        <div style={{
          display: 'flex',
          background: 'var(--card)',
          borderRadius: '8px',
          padding: '3px',
          border: '1px solid var(--border)',
        }}>
          <button
            onClick={() => setMode('scelte')}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: mode === 'scelte' ? 'bold' : 'normal',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'scelte' ? 'var(--accent)' : 'transparent',
              color: mode === 'scelte' ? '#000' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            ⭐ Scelte ({countScelte})
          </button>
          <button
            onClick={() => setMode('tutte')}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: mode === 'tutte' ? 'bold' : 'normal',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'tutte' ? 'var(--accent)' : 'transparent',
              color: mode === 'tutte' ? '#000' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            🌐 Tutte ({totalFamiglie})
          </button>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {mode === 'scelte'
            ? 'Mostra le 3 migliori giocate tra le famiglie scelte in Impostazioni'
            : 'Mostra le 3 migliori giocate tra tutte le famiglie disponibili (incluso GG/NG)'}
        </span>
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

    const { giorni: selectedGiorni, setGiorni: setSelectedGiorni } =
      window.FiltriCampionati.useGiorniRange();

    const {
      filtro: selectedChamps,
      toggleCampionato: toggleChamp,
      selezionaTutti: selectAllChamps,
      deselezionaTutti: clearAllChamps,
    } = window.FiltriCampionati.useFiltroCampionati();

    const { mode: visualizzaMode, setMode: setVisualizzaMode } =
      window.FiltriCampionati.useVisualizzaGiocateMode();

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

          <VisualizzaGiocateSwitch
            mode={visualizzaMode}
            setMode={setVisualizzaMode}
            selectedFamiglie={selectedFamiglie}
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
  console.log('✅ Modulo Palinsesto v6 caricato - 8 opzioni MG + etichette formattate');

})();