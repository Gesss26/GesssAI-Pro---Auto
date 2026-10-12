// ============================================================
// palinsesto.js - Modulo Palinsesto v13 (DUAL-SCROLL + TUTTI)
// ✅ Bottone [Tutti i Campionati] in cima
// ✅ Click campionato → solo partite di oggi di quel campionato
// ✅ Dual-scroll: sidebar → main
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

  // ============================================================
  // MAPPA NAZIONE → CAMPIONATI
  // ============================================================
  const NAZIONE_CAMPIONATI = {
    'Italia': ['Serie A', 'Serie B', 'Serie C - Girone A', 'Serie C - Girone B', 'Serie C - Girone C'],
    'Inghilterra': ['Premier League', 'EFL Championship'],
    'Spagna': ['La Liga', 'Segunda División'],
    'Germania': ['Bundesliga', '2. Bundesliga'],
    'Francia': ['Ligue 1', 'Ligue 2'],
    'Olanda': ['Eredivisie', 'Eerste Divisie'],
    'Portogallo': ['Primeira Liga'],
    'Belgio': ['Jupiler Pro League'],
    'Turchia': ['Süper Lig'],
    'Scozia': ['Scottish Premiership'],
    'Giappone': ['J1 League'],
    'Corea': ['K League 1'],
  };

  // ============================================================
  // CHAMP LOGO
  // ============================================================
  const ChampLogo = ({ campionato, size = 24 }) => {
    const [hasError, setHasError] = useState(false);
    const logoPath = window.getChampLogo ? window.getChampLogo(campionato) : null;

    if (!logoPath || hasError) {
      const color = window.getChampColor ? window.getChampColor(campionato) : '#00f5ff';
      return (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', color: '#000', fontSize: size * 0.38, flexShrink: 0,
          boxShadow: `0 0 10px ${color}`,
        }}>
          {campionato.substring(0, 2).toUpperCase()}
        </div>
      );
    }

    return (
      <img
        src={logoPath}
        alt={campionato}
        onError={() => setHasError(true)}
        style={{
          width: size, height: size, objectFit: 'contain', flexShrink: 0,
          filter: 'drop-shadow(0 0 6px rgba(0, 245, 255, 0.5))',
        }}
      />
    );
  };

  // ============================================================
  // FORMATTAZIONE
  // ============================================================
  const formatGiocataLabel = (familyId, label) => {
    if (!label) return '—';
    if (label.startsWith('Over '))  return label;
    if (label.startsWith('Under ')) return label.replace('.', ',');
    if (familyId === 'multigol') return label;
    if (familyId === 'mg_casa_ospite') {
      const parts = label.split('+');
      if (parts.length === 2) return `MG ${parts[0]} Casa + MG ${parts[1]} Ospite`;
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
  // QUOTA BOX
  // ============================================================
  const QuotaBox = ({ match, familyId, giocata, pctTua }) => {
    const [quotaInfo, setQuotaInfo] = useState(null);
    const { numPartite, dataMaxPDF } = window.QuoteManager ? window.QuoteManager.useQuote() : { numPartite: 0 };

    useEffect(() => {
      const info = (() => {
        if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') return null;
        try { return window.QuoteManager.analizzaGiocata(match, familyId, giocata, pctTua); }
        catch (e) { return null; }
      })();
      setQuotaInfo(info);
    }, [match.id, familyId, giocata, pctTua, numPartite, dataMaxPDF]);

    if (!quotaInfo || !quotaInfo.quotaBook) return null;
    const { quotaBook, edge, isValue } = quotaInfo;

    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 8px', marginLeft: '6px',
        borderRadius: '6px',
        background: isValue ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${isValue ? 'var(--neon-green)' : 'var(--border)'}`,
        fontSize: '11px', fontWeight: 'bold',
        color: isValue ? 'var(--neon-green)' : 'var(--text)',
        boxShadow: isValue ? '0 0 10px rgba(0, 255, 136, 0.3)' : 'none',
        whiteSpace: 'nowrap',
      }}
        title={isValue ? `VALUE BET! Edge: +${edge}%` : `Quota Marathonbet`}
      >
        <span>💰</span><span>{quotaBook.toFixed(2)}</span>
      </div>
    );
  };

  // ============================================================
  // MATCH TAB
  // ============================================================
  const MatchTab = ({ match, allMatches, onSelect, selectedFamiglie, weatherCache }) => {
    const computeMatchStats = window.computeMatchStats;
    const calcFormAndStats = window.calcFormAndStats;
    const getChampColor = window.getChampColor;
    const formatDateEU = window.formatDateEU;
    const TeamLogo = window.TeamLogo;
    const FAMIGLIE_GIOCATE = window.FAMIGLIE_GIOCATE;
    const getGiocataPct = window.getGiocataPct;
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

    const getColorForPct = (valore) => {
      if (valore >= 90) return 'var(--neon-gold)';
      if (valore >= 66.67) return 'var(--neon-green)';
      if (valore >= 33.34) return 'var(--text-dim)';
      return 'var(--neon-red)';
    };

    const getGiocateDaMostrare = () => {
      if (stats.error) return [];
      const homeMG = stats.homeMG || {};
      const awayMG = stats.awayMG || {};
      const mgTot = stats.mgTot || {};
      const giocateDaMostrare = [];

      let famiglieDaAnalizzare;
      if (visualizzaMode === 'tutte') {
        famiglieDaAnalizzare = Object.keys(FAMIGLIE_GIOCATE);
      } else {
        famiglieDaAnalizzare = selectedFamiglie || [];
      }

      famiglieDaAnalizzare = [...new Set(famiglieDaAnalizzare)].filter(id => FAMIGLIE_GIOCATE[id]);

      famiglieDaAnalizzare.forEach(familyId => {
        const family = FAMIGLIE_GIOCATE[familyId];
        if (!family) return;

        let best = null;

        if (familyId === 'gg_ng') {
          const ggNgResult = calcolaGG_NG ? calcolaGG_NG(stats) : null;
          if (ggNgResult) {
            best = { label: ggNgResult.giocata, giocata: ggNgResult.giocata, pct: ggNgResult.pct };
          }
        } else {
          let bestPct = -1;
          let bestOpt = null;
          family.options.forEach(opt => {
            let pct = 0;
            try { pct = getGiocataPct(opt, stats, homeMG, awayMG, mgTot) || 0; }
            catch (e) { pct = 0; }
            if (pct > bestPct) { bestPct = pct; bestOpt = opt; }
          });
          if (bestOpt && bestPct > 0) best = { label: bestOpt, giocata: bestOpt, pct: bestPct };
        }

        if (best && best.pct > 0) {
          giocateDaMostrare.push({
            familyId,
            familyLabel: family.label,
            familyIcon: family.icon,
            label: best.label,
            displayLabel: formatGiocataLabel(familyId, best.label),
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

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '8px', flexWrap: 'wrap',
        }}>
          <div className="tab-header" style={{ background: champColor, marginBottom: 0 }}>
            <ChampLogo campionato={match.campionato} size={16} />
            <span>{match.campionato || 'N/D'}</span>
          </div>
          <span style={{
            fontSize: '10px', fontWeight: 700,
            color: 'var(--neon-cyan)',
            background: 'var(--bg-elevated)',
            padding: '3px 8px', borderRadius: '6px',
            border: '1px solid var(--border)',
            fontFamily: 'Orbitron, sans-serif',
            letterSpacing: '0.5px', whiteSpace: 'nowrap',
          }}>
            G.{match.round || 'N/A'}
          </span>
        </div>

        <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginBottom: '6px', textAlign: 'center' }}>
          📅 {formattedDate} • ⏰ {match.ora || 'TBD'}
        </div>

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
          </div>
          <div className="form-block-compact">
            <div className="form-label">Forma</div>
            <div className="form-squares">{renderFormSquares(awayForm.form)}</div>
            <div className="form-pct-compact">{awayForm.pct || 0}%</div>
          </div>
        </div>

        <div className="form-diff">
          📊 Differenza forma:{' '}
          <span className={diff >= 20 ? 'diff-alta' : 'diff-bassa'}>
            {isNaN(diff) ? 0 : diff}%
          </span>
        </div>

        <div className="bet-row-vertical">
          {giocateDaMostrare.length > 0 ? (
            giocateDaMostrare.map((g, idx) => {
              const pctColor = getColorForPct(g.pct);
              const isBomb = g.pct >= 90;

              return (
                <div key={idx}
                  className={`bet-item-vertical ${isBomb ? 'bomb' : ''}`}
                  style={{ borderColor: pctColor }}>
                  <span className="bet-label" style={{ color: isBomb ? 'var(--neon-gold)' : pctColor, fontWeight: 700 }}>
                    {isBomb && '💣 '}
                    {g.displayLabel || g.label}
                  </span>
                  <span className="bet-value">
                    <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`}>
                      {g.pct}%
                    </span>
                    <QuotaBox match={match} familyId={g.familyId} giocata={g.giocata} pctTua={g.pct} />
                  </span>
                </div>
              );
            })
          ) : (
            <div className="bet-item-vertical" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
              <span>Nessuna giocata</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // SIDEBAR CAMPIONATI + [TUTTI I CAMPIONATI]
  // ============================================================
  const SidebarCampionati = ({ matches, onSelectChamp, champFocus, onSelectAll }) => {
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;
    const ChampLogo = window.ChampLogo;

    const todayStr = getTodayStr();

    const [nazioniAperte, setNazioniAperte] = useState(() => {
      const aperte = {};
      Object.entries(NAZIONE_CAMPIONATI).forEach(([nazione, camps]) => {
        const hasToday = camps.some(c => 
          matches.some(m => m.campionato === c && m.stato === 'Futura' && normalizeDate(m.data) === todayStr)
        );
        aperte[nazione] = hasToday;
      });
      return aperte;
    });

    const toggleNazione = (nazione) => {
      setNazioniAperte(prev => ({ ...prev, [nazione]: !prev[nazione] }));
    };

    const statsCampionati = useMemo(() => {
      const stats = {};
      Object.values(NAZIONE_CAMPIONATI).flat().forEach(champ => {
        stats[champ] = { oggi: 0, totali: 0 };
      });
      matches.forEach(m => {
        if (m.stato !== 'Futura') return;
        if (!stats[m.campionato]) stats[m.campionato] = { oggi: 0, totali: 0 };
        const d = normalizeDate(m.data);
        stats[m.campionato].totali++;
        if (d === todayStr) stats[m.campionato].oggi++;
      });
      return stats;
    }, [matches, todayStr]);

    // Totale partite di oggi (tutti campionati)
    const totPartiteOggi = useMemo(() => {
      return matches.filter(m => m.stato === 'Futura' && normalizeDate(m.data) === todayStr).length;
    }, [matches, todayStr]);

    const nazioniDaMostrare = Object.entries(NAZIONE_CAMPIONATI)
      .map(([nazione, campionati]) => ({
        nazione,
        campionati: campionati.filter(c => statsCampionati[c] && statsCampionati[c].totali > 0),
      }))
      .filter(n => n.campionati.length > 0);

    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 40, 66, 0.7), rgba(20, 27, 46, 0.9))',
        border: '1px solid var(--border)', borderRadius: '16px', padding: '14px',
        backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontWeight: 700,
            color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase',
          }}>🏆 Campionati</span>
        </div>

        {/* ⭐ BOTTONE [TUTTI I CAMPIONATI] */}
        <button
          onClick={() => onSelectAll('__TUTTI__')}
          style={{
            width: '100%',
            marginBottom: '10px',
            padding: '12px 14px',
            borderRadius: '12px',
            border: champFocus === '__TUTTI__' 
              ? '2px solid var(--neon-magenta)' 
              : '2px solid var(--neon-cyan)',
            background: champFocus === '__TUTTI__'
              ? 'linear-gradient(135deg, var(--neon-magenta), var(--neon-purple))'
              : 'linear-gradient(135deg, rgba(0, 245, 255, 0.15), rgba(0, 245, 255, 0.05))',
            color: '#000',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            transition: 'all 0.25s ease',
            boxShadow: champFocus === '__TUTTI__'
              ? '0 0 25px rgba(255, 0, 229, 0.6)'
              : '0 0 15px rgba(0, 245, 255, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🌍</span>
            <span style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '12px', fontWeight: 900,
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              Tutti i Campionati
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 900,
            background: 'rgba(0,0,0,0.25)',
            padding: '3px 10px',
            borderRadius: '10px',
          }}>
            {totPartiteOggi}
          </span>
        </button>

        {/* LISTA NAZIONI */}
        {nazioniDaMostrare.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '12px' }}>
            Nessuna partita
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {nazioniDaMostrare.map(({ nazione, campionati }) => {
              const aperta = nazioniAperte[nazione];
              const hasToday = campionati.some(c => statsCampionati[c] && statsCampionati[c].oggi > 0);
              const totalPartite = campionati.reduce((s, c) => s + (statsCampionati[c]?.totali || 0), 0);

              return (
                <div key={nazione} className={`nazione-block ${aperta ? 'open' : ''}`}>
                  <div className="nazione-header" onClick={() => toggleNazione(nazione)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                      <span className="nazione-arrow">▶</span>
                      <span style={{
                        fontSize: '11px', fontWeight: 700,
                        color: 'var(--neon-cyan)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontFamily: 'Orbitron, sans-serif',
                      }}>
                        🌍 {nazione}
                      </span>
                      {hasToday && (
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: 'var(--neon-red)',
                          boxShadow: '0 0 8px var(--neon-red)',
                          animation: 'notif-pulse 1.5s infinite',
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <span style={{
                      fontSize: '9px',
                      color: 'var(--text-dim)',
                      background: 'var(--bg-elevated)',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      flexShrink: 0,
                    }}>
                      {campionati.length} • {totalPartite}
                    </span>
                  </div>

                  {aperta && (
                    <div className="nazione-camps">
                      {campionati.map(champ => {
                        const color = window.getChampColor(champ);
                        const st = statsCampionati[champ] || { oggi: 0, totali: 0 };
                        const hasTodayChamp = st.oggi > 0;
                        const isSelected = champFocus === champ;

                        return (
                          <button
                            key={champ}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectChamp(champ);
                            }}
                            style={{
                              position: 'relative',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                              padding: '6px 4px', borderRadius: '8px',
                              border: isSelected ? `2px solid ${color}` : '1px solid var(--border)',
                              background: isSelected
                                ? `linear-gradient(135deg, ${color}33, ${color}11)`
                                : 'var(--bg-elevated)',
                              cursor: 'pointer', textAlign: 'center',
                              transition: 'all 0.25s ease',
                              boxShadow: isSelected ? `0 0 12px ${color}66` : 'none',
                              minHeight: '58px',
                              overflow: 'hidden',
                            }}
                          >
                            {ChampLogo && <ChampLogo campionato={champ} size={22} />}
                            <div style={{
                              fontSize: '9px', fontWeight: 700,
                              color: isSelected ? 'var(--text)' : 'var(--text-dim)',
                              lineHeight: '1.1',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {champ
                                .replace(' - Girone A', '/A')
                                .replace(' - Girone B', '/B')
                                .replace(' - Girone C', '/C')
                                .replace('Jupiler Pro League', 'Jupiler')
                                .replace('EFL Championship', 'Championship')
                                .replace('Scottish Premiership', 'Scottish')
                                .replace('Segunda División', 'Segunda')
                                .replace('2. Bundesliga', '2. Bundes')
                                .replace('Eerste Divisie', 'Eerste')
                              }
                            </div>
                            <div style={{
                              fontSize: '8px', color: 'var(--text-dim)',
                              display: 'flex', gap: '4px', flexWrap: 'wrap',
                              justifyContent: 'center',
                            }}>
                              <span>📊{st.totali}</span>
                              {hasTodayChamp && <span style={{ color: 'var(--neon-red)', fontWeight: 700 }}>🔴{st.oggi}</span>}
                            </div>
                            {hasTodayChamp && (
                              <div className="champ-notification-badge" style={{
                                position: 'absolute', top: '-4px', right: '-4px',
                                width: '16px', height: '16px', fontSize: '9px',
                              }}>
                                {st.oggi}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // BOTTOM PANEL
  // ============================================================
  const BottomPanelPartiteOggi = ({ matches }) => {
    const [collapsed, setCollapsed] = useState(true);
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;

    const todayStr = getTodayStr();

    const partiteOggi = useMemo(() => {
      return matches
        .filter(m => normalizeDate(m.data) === todayStr)
        .sort((a, b) => (a.ora || '99:99').localeCompare(b.ora || '99:99'));
    }, [matches, todayStr]);

    return (
      <div className={`bottom-panel ${collapsed ? 'collapsed' : ''}`}>
        <div className="bottom-panel-header" onClick={() => setCollapsed(!collapsed)}>
          <div className="bottom-panel-title">
            <span style={{ fontSize: '18px' }}>📅</span>
            <span>Partite di Oggi</span>
            <span style={{
              background: partiteOggi.length > 0 ? 'var(--neon-cyan)' : 'var(--text-dim)',
              color: '#000', padding: '2px 10px', borderRadius: '10px',
              fontSize: '11px', fontWeight: 900,
            }}>{partiteOggi.length}</span>
          </div>
          <button className="bottom-panel-toggle">
            {collapsed ? '▲ Apri' : '▼ Chiudi'}
          </button>
        </div>

        {!collapsed && (
          <div className="bottom-panel-content">
            {partiteOggi.map(m => (
              <div key={m.id} className="bottom-panel-match">
                <span className="bp-time">{m.ora || '--:--'}</span>
                <ChampLogo campionato={m.campionato} size={20} />
                <span className="bp-champ">{m.campionato}</span>
                <span className="bp-teams">{m.casa} - {m.ospiti}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // VISUALIZZA GIOCATE SWITCH
  // ============================================================
  const VisualizzaGiocateSwitch = ({ mode, setMode, selectedFamiglie }) => {
    const countScelte = (selectedFamiglie || []).length;
    const totalFamiglie = Object.keys(window.FAMIGLIE_GIOCATE || {}).length;

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        marginTop: '12px', padding: '10px 14px',
        background: 'var(--bg-elevated)', borderRadius: '12px',
        border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          🎯 Giocate
        </span>
        <div style={{ display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setMode('scelte')}
            style={{
              padding: '6px 16px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: mode === 'scelte' ? 'var(--neon-cyan)' : 'transparent',
              color: mode === 'scelte' ? '#000' : 'var(--text-dim)',
            }}
          >⭐ Scelte ({countScelte})</button>
          <button
            onClick={() => setMode('tutte')}
            style={{
              padding: '6px 16px', fontSize: '11px', fontWeight: 700,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: mode === 'tutte' ? 'var(--neon-magenta)' : 'transparent',
              color: mode === 'tutte' ? '#000' : 'var(--text-dim)',
            }}
          >🌐 Tutte ({totalFamiglie})</button>
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

    const { mode: visualizzaMode, setMode: setVisualizzaMode } =
      window.FiltriCampionati.useVisualizzaGiocateMode();

    // ⭐ default: 'Tutti i Campionati'
    const [champFocus, setChampFocus] = useState('__TUTTI__');

    const isMobile = window.innerWidth < 900;

    // Blocca scroll body su PC
    useEffect(() => {
      if (!isMobile) {
        document.body.classList.add('scroll-locked');
        return () => document.body.classList.remove('scroll-locked');
      }
    }, [isMobile]);

    // ⭐ Partite di OGGI (filtrate per campionato o tutti)
    const partiteOggi = useMemo(() => {
      const todayStr = getTodayStr();
      let list = matches.filter(m =>
        m.stato === 'Futura' && normalizeDate(m.data) === todayStr
      );

      if (champFocus && champFocus !== '__TUTTI__') {
        list = list.filter(m => m.campionato === champFocus);
      }

      return list.sort((a, b) => {
        if (champFocus === '__TUTTI__') {
          // Ordina per campionato poi per ora
          if (a.campionato !== b.campionato) {
            return a.campionato.localeCompare(b.campionato);
          }
        }
        return (a.ora || '99:99').localeCompare(b.ora || '99:99');
      });
    }, [matches, champFocus]);

    // MOBILE
    if (isMobile) {
      return (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(255, 0, 229, 0.05))',
              borderRadius: '14px',
              border: '1px solid var(--border)',
            }}>
              <span style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900,
                color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase',
              }}>📅 Palinsesto Oggi</span>
            </div>
            <VisualizzaGiocateSwitch
              mode={visualizzaMode}
              setMode={setVisualizzaMode}
              selectedFamiglie={selectedFamiglie}
            />
          </div>

          {champFocus === '__TUTTI__' || !champFocus ? (
            <div>
              <div style={{
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
                borderRadius: '14px', padding: '14px 18px', marginBottom: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 8px 32px rgba(0, 245, 255, 0.4)',
              }}>
                <div>
                  <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900, color: '#000' }}>
                    🌍 TUTTI I CAMPIONATI
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
                    {partiteOggi.length} partite oggi
                  </div>
                </div>
              </div>
              {partiteOggi.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>😴</div>
                  <div style={{ color: 'var(--text-dim)' }}>Nessuna partita oggi</div>
                </div>
              ) : (
                <div className="matches-grid">
                  {partiteOggi.map(m => window.__MatchTabComponent && (
                    <window.__MatchTabComponent
                      key={m.id}
                      match={m}
                      allMatches={matches}
                      onSelect={onSelectMatch}
                      selectedFamiglie={selectedFamiglie}
                      weatherCache={weatherCache}
                    />
                  ))}
                </div>
              )}
              <SidebarCampionati
                matches={matches}
                onSelectChamp={(c) => setChampFocus(c)}
                champFocus={champFocus}
                onSelectAll={(c) => setChampFocus(c)}
              />
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setChampFocus('__TUTTI__')}
                style={{
                  position: 'fixed', top: '80px', left: '12px', zIndex: 300,
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
                  color: '#000', border: '2px solid var(--neon-cyan)',
                  borderRadius: '50px', padding: '10px 18px',
                  fontSize: '13px', fontWeight: 900,
                  fontFamily: 'Orbitron, sans-serif', cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(0, 245, 255, 0.6)',
                  textTransform: 'uppercase',
                }}
              >
                ← Indietro
              </button>
              <div style={{ paddingTop: '50px' }}>
                <div style={{
                  background: `linear-gradient(135deg, ${window.getChampColor(champFocus)}, ${window.getChampColor(champFocus)}99)`,
                  borderRadius: '14px', padding: '14px 18px', marginBottom: '14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <ChampLogo campionato={champFocus} size={32} />
                  <div>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900, color: '#000' }}>
                      {champFocus}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
                      {partiteOggi.length} partite oggi
                    </div>
                  </div>
                </div>
                {partiteOggi.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>😴</div>
                    <div style={{ color: 'var(--text-dim)' }}>Nessuna partita oggi per {champFocus}</div>
                  </div>
                ) : (
                  <div className="matches-grid">
                    {partiteOggi.map(m => window.__MatchTabComponent && (
                      <window.__MatchTabComponent
                        key={m.id}
                        match={m}
                        allMatches={matches}
                        onSelect={onSelectMatch}
                        selectedFamiglie={selectedFamiglie}
                        weatherCache={weatherCache}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ⭐ PC: DUAL-SCROLL
    const isTuttiMode = champFocus === '__TUTTI__' || !champFocus;

    return (
      <div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(255, 0, 229, 0.05))',
            borderRadius: '14px',
            border: '1px solid var(--border)',
          }}>
            <span style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontWeight: 900,
              color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase',
              textShadow: '0 0 12px var(--neon-cyan)',
            }}>📅 Palinsesto Oggi</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
              {isTuttiMode ? 'Tutti i campionati' : champFocus}
            </span>
          </div>

          <VisualizzaGiocateSwitch
            mode={visualizzaMode}
            setMode={setVisualizzaMode}
            selectedFamiglie={selectedFamiglie}
          />
        </div>

        <div className="dual-scroll-layout">
          {/* SIDEBAR */}
          <div className="dual-scroll-sidebar">
            <SidebarCampionati
              matches={matches}
              onSelectChamp={(c) => setChampFocus(c)}
              champFocus={champFocus}
              onSelectAll={(c) => setChampFocus(c)}
            />
          </div>

          {/* MAIN */}
          <div className="dual-scroll-main" style={{ position: 'relative' }}>
            {/* Header dinamico */}
            <div style={{
              background: isTuttiMode
                ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))'
                : `linear-gradient(135deg, ${window.getChampColor(champFocus)}, ${window.getChampColor(champFocus)}99)`,
              borderRadius: '14px', padding: '14px 18px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: '0 8px 32px rgba(0, 245, 255, 0.3)',
            }}>
              {isTuttiMode ? (
                <span style={{ fontSize: '32px' }}>🌍</span>
              ) : (
                <ChampLogo campionato={champFocus} size={32} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontWeight: 900,
                  color: '#000', letterSpacing: '1.5px',
                }}>
                  {isTuttiMode ? 'TUTTI I CAMPIONATI' : champFocus.toUpperCase()}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
                  {partiteOggi.length} partite oggi • Giornata odierna
                </div>
              </div>
            </div>

            {partiteOggi.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>😴</div>
                <h3 style={{ color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>
                  Nessuna partita oggi
                </h3>
                <p style={{ color: 'var(--text-dim)' }}>
                  {isTuttiMode ? 'Non ci sono partite in programma oggi' : `Nessuna partita di ${champFocus} oggi`}
                </p>
              </div>
            ) : (
              <div className="matches-grid">
                {partiteOggi.map(m => window.__MatchTabComponent && (
                  <window.__MatchTabComponent
                    key={m.id}
                    match={m}
                    allMatches={matches}
                    onSelect={onSelectMatch}
                    selectedFamiglie={selectedFamiglie}
                    weatherCache={weatherCache}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  window.PalinsestoComponent = PalinsestoComponent;
  window.ChampLogo = ChampLogo;
  window.SidebarCampionati = SidebarCampionati;
  window.BottomPanelPartiteOggi = BottomPanelPartiteOggi;
  window.__MatchTabComponent = MatchTab;
  window.__NAZIONE_CAMPIONATI = NAZIONE_CAMPIONATI;
  console.log('✅ Modulo Palinsesto v13 - Dual-Scroll + [Tutti i Campionati]');

})();