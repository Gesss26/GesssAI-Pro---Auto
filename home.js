// ============================================================
// home.js - Modulo Home v9 (FUTURISTIC)
// ✅ Vista "Giornata" con sidebar campionati + partite
// ✅ Bollini notifica campionati
// ✅ Loghi campionati nei bottoni
// ✅ Bottom panel partite di oggi
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

  // ============================================================
  // FIX: Chinese Super League erroneamente etichettata
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
  // SEZIONE GIORNATA CAMPIONATO
  // ============================================================
  const GiornataCampionato = ({ campionato, matches, onSelectMatch, selectedFamiglie }) => {
    const getChampColor = window.getChampColor;
    const TeamLogo = window.TeamLogo;
    const normalizeDate = window.normalizeDate;
    const formatDateEU = window.formatDateEU;
    const getTodayStr = window.getTodayStr;

    if (!campionato) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👈</div>
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '8px', fontFamily: 'Orbitron, sans-serif' }}>
            Seleziona un campionato
          </h3>
          <p style={{ color: 'var(--text-dim)' }}>
            Clicca su un campionato nella sidebar per vedere la giornata completa
          </p>
        </div>
      );
    }

    const partiteCampionato = matches
      .filter(m => m.campionato === campionato)
      .sort((a, b) => {
        const da = normalizeDate(a.data);
        const db = normalizeDate(b.data);
        if (da !== db) return (da || '').localeCompare(db || '');
        return (a.ora || '').localeCompare(b.ora || '');
      });

    const color = getChampColor(campionato);
    const todayStr = getTodayStr();

    // Raggruppa per data
    const partitePerData = {};
    partiteCampionato.forEach(m => {
      const d = normalizeDate(m.data) || 'N/D';
      if (!partitePerData[d]) partitePerData[d] = [];
      partitePerData[d].push(m);
    });

    const dateOrdinate = Object.keys(partitePerData).sort();
    const ChampLogo = window.ChampLogo;

    return (
      <div>
        <div style={{
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          borderRadius: '14px', padding: '16px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '14px',
          boxShadow: `0 8px 32px ${color}55`,
          border: `1px solid ${color}`,
        }}>
          {ChampLogo && <ChampLogo campionato={campionato} size={40} />}
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '18px', fontWeight: 900,
              color: '#000', letterSpacing: '2px', textTransform: 'uppercase',
            }}>{campionato}</div>
            <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
              {partiteCampionato.length} partite totali • {dateOrdinate.length} giornate
            </div>
          </div>
        </div>

        {dateOrdinate.map(data => {
          const partite = partitePerData[data];
          const oggi = data === todayStr;
          return (
            <div key={data} style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '10px', paddingBottom: '6px',
                borderBottom: '1px dashed var(--border)',
              }}>
                <span style={{
                  fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontWeight: 700,
                  color: oggi ? 'var(--neon-red)' : 'var(--neon-cyan)',
                  letterSpacing: '2px', textTransform: 'uppercase',
                  textShadow: oggi ? '0 0 10px var(--neon-red)' : '0 0 10px var(--neon-cyan)',
                }}>
                  {oggi ? '🔴 OGGI' : `📅 ${formatDateEU(data)}`}
                </span>
                <span style={{
                  fontSize: '10px', color: 'var(--text-dim)',
                  background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '8px',
                }}>{partite.length} partite</span>
              </div>

              <div className="matches-grid">
                {partite.map(m => {
                  const MatchTab = window.PalinsestoComponent ? null : null;
                  // Uso direttamente il componente MatchTab esposto
                  const MT = window.__MatchTabComponent;
                  if (MT) {
                    return (
                      <MT
                        key={m.id}
                        match={m}
                        allMatches={matches}
                        onSelect={onSelectMatch}
                        selectedFamiglie={selectedFamiglie}
                        weatherCache={{}}
                      />
                    );
                  }
                  // Fallback: card semplice
                  return (
                    <div key={m.id} className="match-tab" style={{ borderLeftColor: color }}>
                      <div className="tab-header" style={{ background: color }}>
                        {ChampLogo && <ChampLogo campionato={m.campionato} size={16} />}
                        <span>{m.campionato}</span>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                        📅 {formatDateEU(m.data)} • ⏰ {m.ora || 'TBD'}
                      </div>
                      <div className="teams-row">
                        <div className="team">
                          <TeamLogo teamName={m.casa} championship={m.campionato} size={50} />
                          <div className="team-name">{m.casa}</div>
                        </div>
                        <div className="vs">VS</div>
                        <div className="team">
                          <TeamLogo teamName={m.ospiti} championship={m.campionato} size={50} />
                          <div className="team-name">{m.ospiti}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: 'var(--text-dim)' }}>
                        Clicca per statistiche →
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '60vh', overflowY: 'auto' }}>
          {campionatiConPartite.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '12px' }}>
              Nessuna partita disponibile
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
  // COMPONENTE PRINCIPALE: HOME
  // ============================================================
  function HomeComponent({ matches, championships, onSelectMatch, setTab, selectedFamiglie, weatherCache }) {
    const [homeTab, setHomeTab] = useState('Giornata');
    const [champSelezionato, setChampSelezionato] = useState(null);

    const { filtro: filtroCampionati, campionatiAttivi } =
      window.FiltriCampionati.useFiltroCampionato();

    const matchesPuliti = useMemo(() => {
      const normalizzati = normalizeMatches(matches);
      return window.FiltriCampionati.filtraPartitePerCampionato(normalizzati);
    }, [matches, filtroCampionati]);

    // Auto-selezione primo campionato con partite
    useEffect(() => {
      if (!champSelezionato && matchesPuliti.length > 0) {
        const primoCampionato = window.CHAMPIONSHIP_LIST.find(champ =>
          matchesPuliti.some(m => m.campionato === champ)
        );
        if (primoCampionato) setChampSelezionato(primoCampionato);
      }
    }, [matchesPuliti, champSelezionato]);

    if (!matches || matches.length === 0) {
      return (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌍</div>
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '8px' }}>Nessuna partita disponibile</h3>
          <p style={{ color: 'var(--text-dim)' }}>
            Importa un campionato da <b>Impostazioni → Importa Campionato</b>
          </p>
        </div>
      );
    }

    const renderTabContent = () => {
      if (homeTab === 'GestioneConto') {
        return window.GestioneContoComponent ? (
          <window.GestioneContoComponent />
        ) : (
          <div className="alert alert-info">⏳ Caricamento Gestione Conto...</div>
        );
      }

      if (homeTab === 'Performance') {
        return window.PerformanceComponent ? (
          <window.PerformanceComponent matches={matches} championships={championships} onSelectMatch={onSelectMatch} />
        ) : (
          <div className="alert alert-info">⏳ Caricamento Performance...</div>
        );
      }

      // VISTA GIORNATA
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 260px) 1fr',
          gap: '20px',
          alignItems: 'start',
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
  // ESPOSIZIONE GLOBALE
  // ============================================================
  window.HomeComponent = HomeComponent;

  window.HomeUtils = {
    formatGiocataLabel,
    calcolaTop3Giocate,
    leggiSelezioniSchedina,
    scriviSelezioniSchedina,
    toggleSelezioneSchedina,
    normalizeMatches,
    normalizeCampionato,
    CHINESE_TEAMS,
  };

  // Helper functions (exposed for compatibility)
  function formatGiocataLabel(familyId, label) {
    if (!label) return '—';
    if (label.startsWith('Over '))  return label;
    if (label.startsWith('Under ')) return label.replace('.', ',');
    return label;
  }

  function calcolaTop3Giocate() { return []; }
  function leggiSelezioniSchedina() {
    try { return JSON.parse(localStorage.getItem('ft_schedina_selezioni') || '[]'); }
    catch (e) { return []; }
  }
  function scriviSelezioniSchedina(arr) {
    try { localStorage.setItem('ft_schedina_selezioni', JSON.stringify(arr)); }
    catch (e) {}
  }
  function toggleSelezioneSchedina() { return false; }

  console.log('✅ Modulo Home v9 FUTURISTIC caricato');

})();