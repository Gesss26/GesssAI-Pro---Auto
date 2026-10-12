// ============================================================
// home.js - Modulo Home v13 (DUAL-SCROLL)
// ✅ Sidebar scrollabile finché non selezioni campionato
// ✅ Poi main scrollabile, sidebar locked
// ✅ Sidebar a 2 colonne per nazione
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

  // ============================================================
  // FIX Chinese Super League
  // ============================================================
  const CHINESE_TEAMS = new Set([
    'Chengdu Better City', 'Sichuan Jiuniu', 'Tianjin Teda', 'Shandong Luneng',
    'Shanghai Shenhua', 'Dalian Zhixing', 'SHANGHAI SIPG', 'Henan Jianye',
    'Yunnan Yukun', 'Qingdao Jonoon', 'Hangzhou Greentown', 'Qingdao Youth Island',
    'Wuhan Three Towns', 'Beijing Guoan', 'Shenyang Urban', 'Chongqing Tongliang Long',
  ]);

  const normalizeCampionato = (match) => {
    const camp = (match.campionato || '').trim();
    const casa = (match.casa || '').trim();
    const ospiti = (match.ospiti || '').trim();
    if (camp === 'Super League Grecia' && (CHINESE_TEAMS.has(casa) || CHINESE_TEAMS.has(ospiti))) {
      return { ...match, campionato: 'Chinese Super League' };
    }
    return match;
  };

  const normalizeMatches = (matches) => {
    if (!Array.isArray(matches)) return [];
    return matches.map(normalizeCampionato);
  };

  // ============================================================
  // DETECT MOBILE
  // ============================================================
  const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
    useEffect(() => {
      const handler = () => setIsMobile(window.innerWidth < 900);
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
  };

  // ============================================================
  // TROVA GIORNATA CORRENTE
  // ============================================================
  const getGiornataCorrente = (matchesCampionato) => {
    if (!matchesCampionato || matchesCampionato.length === 0) return null;
    const todayStr = window.getTodayStr();
    const normalizeDate = window.normalizeDate;

    const oggi = matchesCampionato.filter(m => normalizeDate(m.data) === todayStr);
    if (oggi.length > 0) {
      const roundCount = {};
      oggi.forEach(m => {
        const r = m.round || 'N/A';
        roundCount[r] = (roundCount[r] || 0) + 1;
      });
      let best = null, bestCount = 0;
      for (const [r, c] of Object.entries(roundCount)) {
        if (c > bestCount) { best = r; bestCount = c; }
      }
      return best;
    }

    const future = matchesCampionato
      .filter(m => m.stato === 'Futura' && m.data)
      .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));
    if (future.length > 0) return future[0].round || null;

    const played = matchesCampionato
      .filter(m => m.stato === 'Giocata' && m.data)
      .sort((a, b) => window.parseDate(b.data, b.ora) - window.parseDate(a.data, a.ora));
    if (played.length > 0) return played[0].round || null;

    return null;
  };

  // ============================================================
  // SEZIONE GIORNATA CAMPIONATO
  // ============================================================
  const GiornataCampionato = ({ campionato, matches, onSelectMatch, selectedFamiglie, onBack }) => {
    const getChampColor = window.getChampColor;
    const normalizeDate = window.normalizeDate;
    const isMobile = useIsMobile();

    if (!campionato) return null;

    try {
      const partiteCampionato = matches.filter(m => m.campionato === campionato);
      const color = getChampColor(campionato);
      const giornataCorrente = getGiornataCorrente(partiteCampionato);

      const partiteGiornata = giornataCorrente
        ? partiteCampionato
            .filter(m => String(m.round) === String(giornataCorrente))
            .sort((a, b) => {
              const da = normalizeDate(a.data);
              const db = normalizeDate(b.data);
              if (da !== db) return (da || '').localeCompare(db || '');
              return (a.ora || '').localeCompare(b.ora || '');
            })
        : partiteCampionato;

      const ChampLogo = window.ChampLogo;
      const MatchTabComp = window.__MatchTabComponent;

      return (
        <div style={{ position: 'relative' }}>
          {isMobile && onBack && (
            <button
              onClick={onBack}
              style={{
                position: 'fixed',
                top: '80px',
                left: '12px',
                zIndex: 300,
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
                color: '#000',
                border: '2px solid var(--neon-cyan)',
                borderRadius: '50px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 900,
                fontFamily: 'Orbitron, sans-serif',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0, 245, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase',
              }}
            >
              ← Indietro
            </button>
          )}

          <div style={{
            background: `linear-gradient(135deg, ${color}, ${color}99)`,
            borderRadius: '14px', padding: '16px 20px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '14px',
            boxShadow: `0 8px 32px ${color}55`,
            border: `1px solid ${color}`,
            marginTop: isMobile ? '50px' : '0',
          }}>
            {ChampLogo && <ChampLogo campionato={campionato} size={isMobile ? 36 : 40} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: isMobile ? '14px' : '18px',
                fontWeight: 900,
                color: '#000', letterSpacing: isMobile ? '1px' : '2px',
                textTransform: 'uppercase',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{campionato}</div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
                {giornataCorrente ? `Giornata ${giornataCorrente}` : 'Giornata N/D'} • {partiteGiornata.length} partite
              </div>
            </div>
          </div>

          {partiteGiornata.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <div style={{ color: 'var(--text-dim)' }}>Nessuna partita</div>
            </div>
          ) : (
            <div className="matches-grid">
              {partiteGiornata.map(m => MatchTabComp && (
                <MatchTabComp
                  key={m.id}
                  match={m}
                  allMatches={matches}
                  onSelect={onSelectMatch}
                  selectedFamiglie={selectedFamiglie}
                  weatherCache={{}}
                />
              ))}
            </div>
          )}
        </div>
      );
    } catch (e) {
      console.error('❌ Errore in GiornataCampionato:', e);
      return null;
    }
  };

  // ============================================================
  // SIDEBAR CAMPIONATI HOME
  // ============================================================
  const SidebarCampionatiHome = ({ matches, onSelectChamp, champSelezionato }) => {
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;
    const addDaysToDateStr = window.addDaysToDateStr;
    const ChampLogo = window.ChampLogo;

    const NAZIONE_CAMPIONATI = window.__NAZIONE_CAMPIONATI || {
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

    const todayStr = getTodayStr();
    const tomorrowStr = addDaysToDateStr(todayStr, 1);

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
        stats[champ] = { oggi: 0, domani: 0, totali: 0 };
      });
      matches.forEach(m => {
        if (m.stato !== 'Futura') return;
        if (!stats[m.campionato]) stats[m.campionato] = { oggi: 0, domani: 0, totali: 0 };
        const d = normalizeDate(m.data);
        stats[m.campionato].totali++;
        if (d === todayStr) stats[m.campionato].oggi++;
        else if (d === tomorrowStr) stats[m.campionato].domani++;
      });
      return stats;
    }, [matches, todayStr, tomorrowStr]);

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
                        whiteSpace: 'nowrap',
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
                        const st = statsCampionati[champ] || { oggi: 0, domani: 0, totali: 0 };
                        const hasTodayChamp = st.oggi > 0;
                        const isSelected = champSelezionato === champ;

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
                              lineHeight: '1.1', maxWidth: '100%',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
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
                              {!hasTodayChamp && st.domani > 0 && <span style={{ color: 'var(--neon-gold)' }}>🟡{st.domani}</span>}
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
  // COMPONENTE PRINCIPALE: HOME
  // ============================================================
  function HomeComponent({ matches, championships, onSelectMatch, setTab, selectedFamiglie, weatherCache }) {
    const [homeTab, setHomeTab] = useState('Giornata');
    const [champSelezionato, setChampSelezionato] = useState(null);
    const isMobile = useIsMobile();

    const { filtro: filtroCampionati } =
      window.FiltriCampionati.useFiltroCampionati();

    const matchesPuliti = useMemo(() => {
      const normalizzati = normalizeMatches(matches);
      return window.FiltriCampionati.filtraPartitePerCampionato(normalizzati);
    }, [matches, filtroCampionati]);

    // Auto-selezione primo campionato (solo PC)
    useEffect(() => {
      if (!isMobile && !champSelezionato && matchesPuliti.length > 0 && homeTab === 'Giornata') {
        const primoCampionato = window.CHAMPIONSHIP_LIST.find(champ =>
          matchesPuliti.some(m => m.campionato === champ)
        );
        if (primoCampionato) setChampSelezionato(primoCampionato);
      }
    }, [matchesPuliti, champSelezionato, isMobile, homeTab]);

    // ⭐ Blocca scroll body su PC quando siamo in dual-scroll
    useEffect(() => {
      if (!isMobile && homeTab === 'Giornata') {
        document.body.classList.add('scroll-locked');
        return () => document.body.classList.remove('scroll-locked');
      }
    }, [isMobile, homeTab]);

    if (!matches || matches.length === 0) {
      return (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌍</div>
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '8px' }}>Nessuna partita</h3>
          <p style={{ color: 'var(--text-dim)' }}>
            Importa un campionato da <b>Impostazioni</b>
          </p>
        </div>
      );
    }

    const renderTabContent = () => {
      if (homeTab === 'GestioneConto') {
        return window.GestioneContoComponent ? (
          <window.GestioneContoComponent />
        ) : (
          <div className="alert alert-info">⏳ Caricamento...</div>
        );
      }

      if (homeTab === 'Performance') {
        return window.PerformanceComponent ? (
          <window.PerformanceComponent matches={matches} championships={championships} onSelectMatch={onSelectMatch} />
        ) : (
          <div className="alert alert-info">⏳ Caricamento...</div>
        );
      }

      // MOBILE
      if (isMobile) {
        return (
          <div>
            {!champSelezionato ? (
              <SidebarCampionatiHome
                matches={matchesPuliti}
                onSelectChamp={(champ) => setChampSelezionato(champ)}
                champSelezionato={champSelezionato}
              />
            ) : (
              <GiornataCampionato
                campionato={champSelezionato}
                matches={matchesPuliti}
                onSelectMatch={onSelectMatch}
                selectedFamiglie={selectedFamiglie}
                onBack={() => setChampSelezionato(null)}
              />
            )}
          </div>
        );
      }

      // ⭐ PC: DUAL-SCROLL
      const sidebarLocked = !!champSelezionato;

      return (
        <div className="dual-scroll-layout">
          {/* SIDEBAR */}
          <div className={`dual-scroll-sidebar ${sidebarLocked ? 'locked' : ''}`}>
            <SidebarCampionatiHome
              matches={matchesPuliti}
              onSelectChamp={(champ) => setChampSelezionato(champ)}
              champSelezionato={champSelezionato}
            />
          </div>

          {/* MAIN */}
          <div className={`dual-scroll-main ${!champSelezionato ? 'locked' : ''}`} style={{ position: 'relative' }}>
            {champSelezionato && (
              <button
                className="cambia-campionato-btn"
                onClick={() => setChampSelezionato(null)}
                title="Torna alla lista campionati"
              >
                ✖ Cambia campionato
              </button>
            )}

            {!champSelezionato ? (
              <div className="card" style={{
                textAlign: 'center', padding: '80px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: '400px',
              }}>
                <div style={{ fontSize: '80px', marginBottom: '20px' }}>👈</div>
                <h3 style={{
                  color: 'var(--neon-cyan)', marginBottom: '12px',
                  fontFamily: 'Orbitron, sans-serif', fontSize: '18px',
                }}>
                  Seleziona un campionato
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                  Clicca su un campionato nella lista a sinistra
                </p>
              </div>
            ) : (
              <div style={{ paddingTop: '50px' }}>
                <GiornataCampionato
                  campionato={champSelezionato}
                  matches={matchesPuliti}
                  onSelectMatch={onSelectMatch}
                  selectedFamiglie={selectedFamiglie}
                />
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div>
        {window.QuoteManager?.BannerScadenzaQuote && <window.QuoteManager.BannerScadenzaQuote />}

        <div className="sub-tabs" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            className={homeTab === 'Giornata' ? 'active' : ''}
            onClick={() => setHomeTab('Giornata')}
          >
            ⚽ Giornata
          </button>
          <button
            className={homeTab === 'GestioneConto' ? 'active' : ''}
            onClick={() => setHomeTab('GestioneConto')}
          >
            💰 Gestione Conto
          </button>
          <button
            className={homeTab === 'Performance' ? 'active' : ''}
            onClick={() => setHomeTab('Performance')}
          >
            📈 Performance
          </button>
        </div>

        {renderTabContent()}

        {window.BottomPanelPartiteOggi && homeTab === 'Giornata' && isMobile && (
          <window.BottomPanelPartiteOggi matches={matchesPuliti} />
        )}
      </div>
    );
  }

  function formatGiocataLabel(familyId, label) {
    if (!label) return '—';
    if (label.startsWith('Over '))  return label;
    if (label.startsWith('Under ')) return label.replace('.', ',');
    return label;
  }

  window.HomeComponent = HomeComponent;
  window.HomeUtils = {
    formatGiocataLabel,
    normalizeMatches,
    normalizeCampionato,
    CHINESE_TEAMS,
  };

  console.log('✅ Modulo Home v13 - DUAL-SCROLL');

})();