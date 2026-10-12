// ============================================================
// home.js - Modulo Home v11 (FUTURISTIC + MOBILE FIX)
// ✅ Click campionato → giornata corrente only
// ✅ Mobile: pulsante indietro overlay
// ✅ PC: 3 card per fila
// ✅ Numero giornata sotto nome campionato
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
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
      const handler = () => setIsMobile(window.innerWidth < 768);
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

    // 1) Cerca partite di oggi → prendi il round più frequente
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

    // 2) Prossima partita futura
    const future = matchesCampionato
      .filter(m => m.stato === 'Futura' && m.data)
      .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));
    if (future.length > 0) return future[0].round || null;

    // 3) Ultima partita giocata
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
    const formatDateEU = window.formatDateEU;
    const isMobile = useIsMobile();

    if (!campionato) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👈</div>
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '8px', fontFamily: 'Orbitron, sans-serif' }}>
            Seleziona un campionato
          </h3>
          <p style={{ color: 'var(--text-dim)' }}>
            Clicca su un campionato nella sidebar per vedere la giornata corrente
          </p>
        </div>
      );
    }

    try {
      const partiteCampionato = matches.filter(m => m.campionato === campionato);
      const color = getChampColor(campionato);
      const giornataCorrente = getGiornataCorrente(partiteCampionato);

      // ⭐ FILTRA SOLO LA GIORNATA CORRENTE
      const partiteGiornata = giornataCorrente
        ? partiteCampionato
            .filter(m => String(m.round) === String(giornataCorrente))
            .sort((a, b) => {
              const da = normalizeDate(a.data);
              const db = normalizeDate(b.data);
              if (da !== db) return (da || '').localeCompare(db || '');
              return (a.ora || '').localeCompare(b.ora || '');
            })
        : partiteCampionato.sort((a, b) => {
            const da = normalizeDate(a.data);
            const db = normalizeDate(b.data);
            if (da !== db) return (da || '').localeCompare(db || '');
            return (a.ora || '').localeCompare(b.ora || '');
          });

      const ChampLogo = window.ChampLogo;
      const MatchTabComp = window.__MatchTabComponent;

      return (
        <div style={{ position: 'relative' }}>
          {/* ⭐ PULSANTE INDIETRO (mobile only) */}
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
                letterSpacing: '1px',
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
              <div style={{ color: 'var(--text-dim)' }}>Nessuna partita in questa giornata</div>
            </div>
          ) : (
            <div className="matches-grid">
              {partiteGiornata.map(m => {
                if (MatchTabComp) {
                  return (
                    <MatchTabComp
                      key={m.id}
                      match={m}
                      allMatches={matches}
                      onSelect={onSelectMatch}
                      selectedFamiglie={selectedFamiglie}
                      weatherCache={{}}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      );
    } catch (e) {
      console.error('❌ Errore in GiornataCampionato:', e);
      return (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ color: 'var(--neon-red)', fontWeight: 700, marginBottom: '8px' }}>
            Errore nel rendering
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontFamily: 'monospace' }}>
            {e.message}
          </div>
        </div>
      );
    }
  };

  // ============================================================
  // SIDEBAR CAMPIONATI HOME
  // ============================================================
  const SidebarCampionatiHome = ({ matches, onSelectChamp, champSelezionato }) => {
    const CHAMPIONSHIP_LIST = window.CHAMPIONSHIP_LIST;
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;
    const addDaysToDateStr = window.addDaysToDateStr;
    const ChampLogo = window.ChampLogo;

    const todayStr = getTodayStr();
    const tomorrowStr = addDaysToDateStr(todayStr, 1);

    const statsCampionati = useMemo(() => {
      const stats = {};
      CHAMPIONSHIP_LIST.forEach(champ => {
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
    }, [matches, todayStr, tomorrowStr, CHAMPIONSHIP_LIST]);

    const campionatiConPartite = CHAMPIONSHIP_LIST.filter(champ => {
      const st = statsCampionati[champ];
      return st && st.totali > 0;
    });

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {campionatiConPartite.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '12px' }}>
              Nessuna partita
            </div>
          ) : (
            campionatiConPartite.map(champ => {
              const color = window.getChampColor(champ);
              const st = statsCampionati[champ] || { oggi: 0, domani: 0, totali: 0 };
              const hasToday = st.oggi > 0;
              const isSelected = champSelezionato === champ;

              return (
                <button
                  key={champ}
                  onClick={() => onSelectChamp(champ)}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '10px',
                    border: isSelected ? `2px solid ${color}` : '1px solid var(--border)',
                    background: isSelected
                      ? `linear-gradient(135deg, ${color}33, ${color}11)`
                      : 'var(--bg-elevated)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.25s ease',
                    boxShadow: isSelected ? `0 0 20px ${color}66` : 'none',
                  }}
                >
                  {ChampLogo && <ChampLogo campionato={champ} size={26} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '11px', fontWeight: 700,
                      color: isSelected ? 'var(--text)' : 'var(--text-dim)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{champ}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-dim)', display: 'flex', gap: '8px' }}>
                      <span>📊 {st.totali}</span>
                      {hasToday && <span style={{ color: 'var(--neon-red)', fontWeight: 700 }}>🔴 {st.oggi} oggi</span>}
                      {!hasToday && st.domani > 0 && <span style={{ color: 'var(--neon-gold)' }}>🟡 {st.domani} domani</span>}
                    </div>
                  </div>

                  {hasToday && (
                    <div className="champ-notification-badge">{st.oggi}</div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTE PRINCIPALE
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
      if (!isMobile && !champSelezionato && matchesPuliti.length > 0) {
        const primoCampionato = window.CHAMPIONSHIP_LIST.find(champ =>
          matchesPuliti.some(m => m.campionato === champ)
        );
        if (primoCampionato) setChampSelezionato(primoCampionato);
      }
    }, [matchesPuliti, champSelezionato, isMobile]);

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

      // VISTA GIORNATA - Layout diverso per mobile/PC
      if (isMobile) {
        // MOBILE: mostra solo sidebar O giornata
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

      // PC: sidebar + giornata affiancati
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 380px) 1fr',
          gap: '20px',
          alignItems: 'start',
          width: '100%',
        }}>
          <div style={{ position: 'sticky', top: '90px' }}>
            <SidebarCampionatiHome
              matches={matchesPuliti}
              onSelectChamp={(champ) => setChampSelezionato(champ)}
              champSelezionato={champSelezionato}
            />
          </div>

          <div>
            <GiornataCampionato
              campionato={champSelezionato}
              matches={matchesPuliti}
              onSelectMatch={onSelectMatch}
              selectedFamiglie={selectedFamiglie}
            />
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

        {window.BottomPanelPartiteOggi && homeTab === 'Giornata' && (
          <window.BottomPanelPartiteOggi matches={matchesPuliti} />
        )}
      </div>
    );
  }

  // ============================================================
  // HELPER
  // ============================================================
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

  console.log('✅ Modulo Home v11 - MOBILE FIX + GIORNATA CORRENTE');

})();