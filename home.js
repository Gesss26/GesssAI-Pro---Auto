// ============================================================
// home.js - Modulo Home (FUTURISTIC + MOBILE FIX + SWITCH CALCOLATE/SCELTE)
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

  // ... [CHINESE_TEAMS, normalizeCampionato, normalizeMatches, useIsMobile, injectNazioniStyles rimangono invariati] ...

  // ============================================================
  // CALCOLO TOP3 GIOCATE CON SUPPORTO SCELTE
  // ============================================================
  
  // ⭐ NUOVO: legge le giocate selezionate dal localStorage (stessa chiave di schedina.js)
  const leggiGiocateSelezionate = () => {
    try {
      return JSON.parse(localStorage.getItem('ft_giocate_selezionate') || '["tutte"]');
    } catch (e) {
      return ['tutte'];
    }
  };

  const calcolaTop3Giocate = (match, allMatches, tipoGiocate = 'calcolate') => {
    if (!match) return [];
    const stats = window.computeMatchStats(match, allMatches);
    if (stats.error) return [];

    stats._allMatches = allMatches;
    stats._homeTeam = match.casa;
    stats._awayTeam = match.ospiti;

    const homeMG = stats.homeMG || {};
    const awayMG = stats.awayMG || {};
    const mgTot = stats.mgTot || {};
    const homeRange = window.getMultigolRange(match.casa, allMatches);
    const awayRange = window.getMultigolRange(match.ospiti, allMatches);

    // ============================================================
    // TOP 3 CALCOLATE (comportamento originale)
    // ============================================================
    if (tipoGiocate === 'calcolate') {
      const tutte = [];

      Object.keys(window.FAMIGLIE_GIOCATE).forEach(familyId => {
        const family = window.FAMIGLIE_GIOCATE[familyId];
        if (!family) return;

        let best = null;

        if (familyId === 'gg_ng') {
          const ggNgResult = window.calcolaGG_NG ? window.calcolaGG_NG(stats) : null;
          if (ggNgResult) {
            best = { ...ggNgResult, familyId: 'gg_ng', familyLabel: family.label, familyIcon: family.icon };
          }
        } else {
          best = window.getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
        }

        if (best && best.pct > 0) {
          tutte.push({
            familyId, familyLabel: family.label, familyIcon: family.icon,
            giocata: best.giocata, label: best.label, pct: best.pct, isBomb: best.pct >= 90,
          });
        }
      });

      tutte.sort((a, b) => b.pct - a.pct);
      return tutte.slice(0, 3);
    }

    // ============================================================
    // TOP 3 SCELTE (dall'utente in schedina.js)
    // ============================================================
    const giocateSelezionate = leggiGiocateSelezionate();
    const isTutteMode = giocateSelezionate.includes('tutte') || giocateSelezionate.length === 0;

    if (isTutteMode) {
      // Se in schedina è attivo "tutte", mostriamo le calcolate
      // (non ci sono giocate specifiche da mostrare)
      const tutte = [];
      Object.keys(window.FAMIGLIE_GIOCATE).forEach(familyId => {
        const family = window.FAMIGLIE_GIOCATE[familyId];
        if (!family) return;
        let best = null;
        if (familyId === 'gg_ng') {
          const ggNgResult = window.calcolaGG_NG ? window.calcolaGG_NG(stats) : null;
          if (ggNgResult) {
            best = { ...ggNgResult, familyId: 'gg_ng', familyLabel: family.label, familyIcon: family.icon };
          }
        } else {
          best = window.getBestBetForFamily(familyId, stats, homeRange, awayRange, homeMG, awayMG, mgTot);
        }
        if (best && best.pct > 0) {
          tutte.push({
            familyId, familyLabel: family.label, familyIcon: family.icon,
            giocata: best.giocata, label: best.label, pct: best.pct, isBomb: best.pct >= 90,
          });
        }
      });
      tutte.sort((a, b) => b.pct - a.pct);
      return tutte.slice(0, 3);
    }

    // Modalità "Scelte": mostra solo le giocate specifiche selezionate
    const top3Scelte = [];

    giocateSelezionate.forEach(sel => {
      if (typeof sel !== 'object' || !sel.familyId || !sel.giocata) return;

      const { familyId, giocata } = sel;
      const family = window.FAMIGLIE_GIOCATE[familyId];
      if (!family) return;

      let pct = 0;

      if (familyId === 'gg_ng') {
        const ggNg = window.calcolaGG_NG ? window.calcolaGG_NG(stats) : null;
        if (ggNg) {
          pct = giocata === 'GG' ? ggNg.gg : ggNg.ng;
        }
      } else {
        pct = window.getGiocataPct(giocata, stats, homeMG, awayMG, mgTot);
      }

      if (pct > 0) {
        top3Scelte.push({
          familyId,
          familyLabel: family.label,
          familyIcon: family.icon,
          giocata,
          label: giocata,
          pct: Math.round(pct),
          isBomb: pct >= 90,
        });
      }
    });

    top3Scelte.sort((a, b) => b.pct - a.pct);
    return top3Scelte.slice(0, 3);
  };

  // ... [NazioneBandiera, formatGiocataLabel, getGiornataCorrente rimangono invariati] ...

  // ============================================================
  // RIGA PARTITA CON SWITCH CALCOLATE/SCELTE
  // ============================================================
  const RigaPartita = ({ match, allMatches, tipoGiocate }) => {
    const [top3, setTop3] = useState([]);

    useEffect(() => {
      const res = calcolaTop3Giocate(match, allMatches, tipoGiocate);
      const formatted = res.map(g => ({ ...g, label: formatGiocataLabel(g.familyId, g.label) }));
      setTop3(formatted);
    }, [match.id, tipoGiocate]);

    const dataEU = match.data ? window.formatDateEU(match.data) : 'N/D';
    const ora = match.ora || 'TBD';

    const cellStyle = {
      padding: '8px 10px',
      borderBottom: '1px solid var(--border)',
      fontSize: '13px',
      verticalAlign: 'middle',
    };

    return (
      <tr style={{ transition: 'background 0.15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: 'var(--text-dim)', width: '90px' }}>{dataEU}</td>
        <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: 'var(--neon-cyan)', fontWeight: 'bold', width: '60px' }}>{ora}</td>
        <td style={{ ...cellStyle, minWidth: '180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <window.TeamLogo teamName={match.casa} championship={match.campionato} size={20} />
            <span style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '13px' }}>
              {match.casa} - {match.ospiti}
            </span>
            <window.TeamLogo teamName={match.ospiti} championship={match.campionato} size={20} />
          </div>
        </td>
        <td style={{ ...cellStyle, width: '160px' }}>
          {top3[0] ? <GiocataBadge match={match} giocataObj={top3[0]} /> : <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>—</span>}
        </td>
        <td style={{ ...cellStyle, width: '160px' }}>
          {top3[1] ? <GiocataBadge match={match} giocataObj={top3[1]} /> : <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>—</span>}
        </td>
        <td style={{ ...cellStyle, width: '160px' }}>
          {top3[2] ? <GiocataBadge match={match} giocataObj={top3[2]} /> : <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>—</span>}
        </td>
      </tr>
    );
  };

  // ============================================================
  // SEZIONE CAMPIONATO CON SWITCH
  // ============================================================
  const SezioneCampionato = ({ campionato, matches, allMatches, hideHeader = false, tipoGiocate = 'calcolate' }) => {
    const partiteCampionato = matches
      .filter(m => m.campionato === campionato)
      .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));

    if (partiteCampionato.length === 0) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
          Nessuna partita per {campionato}
        </div>
      );
    }

    const giornata = getGiornataCorrente(partiteCampionato);
    const color = window.getChampColor(campionato);

    let partiteDaMostrare = partiteCampionato;
    if (giornata) {
      const sameRound = partiteCampionato.filter(m => String(m.round) === String(giornata));
      if (sameRound.length > 0) partiteDaMostrare = sameRound;
    }

    return (
      <div style={{ marginBottom: '24px' }}>
        {!hideHeader && (
          <div style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#000',
            padding: '10px 16px', borderRadius: '8px 8px 0 0',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {window.ChampLogo && <window.ChampLogo campionato={campionato} size={24} />}
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{campionato}</span>
              {giornata && (
                <span style={{
                  background: 'rgba(0,0,0,0.2)', color: '#000', padding: '2px 12px',
                  borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
                }}>
                  Giornata {giornata}
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.8 }}>
              {partiteDaMostrare.length} partite
            </span>
          </div>
        )}

        <div style={{
          overflowX: 'auto', background: 'var(--card)',
          border: '1px solid var(--border)',
          borderTop: hideHeader ? '1px solid var(--border)' : 'none',
          borderRadius: hideHeader ? '12px' : '0 0 8px 8px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>Data</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>Ora</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>Partita</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>🥇 Giocata 1</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>🥈 Giocata 2</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)' }}>🥉 Giocata 3</th>
              </tr>
            </thead>
            <tbody>
              {partiteDaMostrare.map(m => (
                <RigaPartita key={m.id} match={m} allMatches={allMatches} tipoGiocate={tipoGiocate} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // VISTA NAZIONE CON SWITCH
  // ============================================================
  const VistaNazione = ({ nazione, matches, onBack, tipoGiocate }) => {
    const info = NAZIONI[nazione];
    if (!info) return null;

    const [schedinaCount, setSchedinaCount] = useState(() => leggiSelezioniSchedina().length);

    useEffect(() => {
      const handler = (e) => setSchedinaCount((e.detail || []).length);
      window.addEventListener('schedina-updated', handler);
      return () => window.removeEventListener('schedina-updated', handler);
    }, []);

    const campionatiDaMostrare = info.campionati.filter(c =>
      matches.some(m => m.campionato === c)
    );

    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
          padding: '12px 16px', background: 'var(--card)', borderRadius: '10px',
          border: '1px solid var(--border)', flexWrap: 'wrap',
        }}>
          <button onClick={onBack} style={{
            background: 'var(--bg-elevated)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: '8px',
            padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
          }}>← Indietro</button>

          <NazioneBandiera nazione={nazione} size={44} />

          <h2 style={{ margin: 0, flex: 1, color: 'var(--neon-cyan)' }}>{nazione}</h2>

          {schedinaCount > 0 && (
            <span style={{
              background: 'var(--neon-green)', color: '#000', padding: '4px 14px',
              borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
            }}>
              🎯 {schedinaCount} in schedina
            </span>
          )}
        </div>

        {campionatiDaMostrare.length === 0 ? (
          <div className="empty-state">
            Nessuna partita disponibile per i campionati attivi di {nazione}.
          </div>
        ) : (
          campionatiDaMostrare.map(camp => (
            <SezioneCampionato
              key={camp}
              campionato={camp}
              matches={matches}
              allMatches={matches}
              tipoGiocate={tipoGiocate}
            />
          ))
        )}
      </div>
    );
  };

  // ============================================================
  // MOBILE: VISTA GIORNATA CON SWITCH
  // ============================================================
  const MobileVistaGiornata = ({ campionato, matches, onBack, tipoGiocate }) => {
    const color = window.getChampColor(campionato);
    const partiteCampionato = matches
      .filter(m => m.campionato === campionato)
      .sort((a, b) => window.parseDate(a.data, a.ora) - window.parseDate(b.data, b.ora));

    const giornata = getGiornataCorrente(partiteCampionato);
    let partiteDaMostrare = partiteCampionato;
    if (giornata) {
      const sameRound = partiteCampionato.filter(m => String(m.round) === String(giornata));
      if (sameRound.length > 0) partiteDaMostrare = sameRound;
    }

    return (
      <div>
        <button className="mobile-back-btn" onClick={onBack}>
          ← Cambia Campionato
        </button>

        <div style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          borderRadius: '12px', padding: '14px 16px', marginBottom: '14px',
          display: 'flex', alignItems: 'center', gap: '12px',
          marginTop: '55px',
          boxShadow: `0 6px 24px ${color}55`,
        }}>
          {window.ChampLogo && <window.ChampLogo campionato={campionato} size={36} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900,
              color: '#000', textTransform: 'uppercase',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{campionato}</div>
            <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
              {giornata ? `Giornata ${giornata}` : 'Giornata N/D'} • {partiteDaMostrare.length} partite
            </div>
          </div>
        </div>

        <div style={{
          overflowX: 'auto', background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: '12px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {partiteDaMostrare.map(m => (
                <RigaPartita key={m.id} match={m} allMatches={matches} tipoGiocate={tipoGiocate} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTE PRINCIPALE CON SWITCH
  // ============================================================
  function HomeComponent({ matches, championships, onSelectMatch, setTab, selectedFamiglie, weatherCache }) {
    const [homeTab, setHomeTab] = useState('Nazioni');
    const [nazioneSelezionata, setNazioneSelezionata] = useState(null);
    const [campionatoMobile, setCampionatoMobile] = useState(null);
    const [tipoGiocate, setTipoGiocate] = useState('calcolate'); // ⭐ NUOVO
    const isMobile = useIsMobile();

    const { filtro: filtroCampionati, campionatiAttivi } =
      window.FiltriCampionati.useFiltroCampionati();

    const matchesPuliti = useMemo(() => {
      const normalizzati = normalizeMatches(matches);
      return window.FiltriCampionati.filtraPartitePerCampionato(normalizzati);
    }, [matches, filtroCampionati]);

    // ⭐ Ascolta i cambiamenti delle giocate selezionate in schedina.js
    useEffect(() => {
      const handler = () => {
        // Forza re-render quando cambiano le giocate selezionate
        setTipoGiocate(prev => prev); // trigger re-render
      };
      window.addEventListener('giocate-selezionate-updated', handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('giocate-selezionate-updated', handler);
        window.removeEventListener('storage', handler);
      };
    }, []);

    if (!matches || matches.length === 0) {
      return (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
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

      // MOBILE
      if (isMobile) {
        if (campionatoMobile) {
          return (
            <MobileVistaGiornata
              campionato={campionatoMobile}
              matches={matchesPuliti}
              onBack={() => setCampionatoMobile(null)}
              tipoGiocate={tipoGiocate}
            />
          );
        }

        if (nazioneSelezionata) {
          const info = NAZIONI[nazioneSelezionata];

          if (!info) {
            return (
              <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
                <div style={{ color: 'var(--neon-red)', marginBottom: '12px' }}>
                  Nazione non trovata
                </div>
                <button className="btn" onClick={() => setNazioneSelezionata(null)}>
                  ← Torna alle nazioni
                </button>
              </div>
            );
          }

          const campionatiNazione = info.campionati
            .filter(c => matchesPuliti.some(m => m.campionato === c))
            .map(c => ({
              nome: c,
              nPartite: matchesPuliti.filter(m => m.campionato === c).length,
            }));

          return (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px',
                padding: '12px 14px', background: 'var(--card)', borderRadius: '12px',
                border: '1px solid var(--border)',
              }}>
                <button onClick={() => setNazioneSelezionata(null)} style={{
                  background: 'var(--bg-elevated)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '8px 14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                }}>← Indietro</button>
                <NazioneBandiera nazione={nazioneSelezionata} size={36} />
                <h2 style={{ margin: 0, flex: 1, color: 'var(--neon-cyan)', fontSize: '18px' }}>
                  {nazioneSelezionata}
                </h2>
              </div>

              {campionatiNazione.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                  Nessun campionato disponibile per {nazioneSelezionata}
                </div>
              ) : (
                <MobileCampScelta
                  campionati={campionatiNazione}
                  onSelect={(camp) => setCampionatoMobile(camp)}
                />
              )}
            </div>
          );
        }

        return (
          <GrigliaNazioni
            matches={matchesPuliti}
            onSelectNazione={setNazioneSelezionata}
          />
        );
      }

      // PC
      if (nazioneSelezionata) {
        return (
          <VistaNazione
            nazione={nazioneSelezionata}
            matches={matchesPuliti}
            onBack={() => setNazioneSelezionata(null)}
            tipoGiocate={tipoGiocate}
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

        {homeTab !== 'GestioneConto' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            padding: '10px 14px', marginBottom: '14px',
            background: 'var(--bg-elevated)', borderRadius: '8px',
            border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-dim)',
          }}>
            <span>🏆 <b style={{ color: 'var(--neon-cyan)' }}>{campionatiAttivi.length}</b> campionati attivi</span>
            <span>•</span>
            <span>📊 <b style={{ color: 'var(--neon-cyan)' }}>{matchesPuliti.length}</b> partite totali</span>
            <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
              Modifica i filtri nel <b>Palinsesto</b> 📅
            </span>
          </div>
        )}

        <div className="sub-tabs" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            className={homeTab === 'Nazioni' ? 'active' : ''}
            onClick={() => { setHomeTab('Nazioni'); setNazioneSelezionata(null); setCampionatoMobile(null); }}
          >
            🌍 Seleziona una Nazione
          </button>
          <button
            className={homeTab === 'GestioneConto' ? 'active' : ''}
            onClick={() => { setHomeTab('GestioneConto'); setNazioneSelezionata(null); setCampionatoMobile(null); }}
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

        {/* ⭐ SWITCH CALCOLATE / SCELTE (solo per tab Nazioni) */}
        {homeTab === 'Nazioni' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '14px',
            padding: '8px 14px',
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
              🎯 Giocate
            </span>
            <div style={{
              display: 'flex',
              background: 'var(--bg-deep)',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid var(--border)',
            }}>
              <button
                onClick={() => setTipoGiocate('calcolate')}
                title="Mostra le 3 giocate con % più alta"
                style={{
                  padding: '6px 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: tipoGiocate === 'calcolate' ? 'var(--neon-cyan)' : 'transparent',
                  color: tipoGiocate === 'calcolate' ? '#000' : 'var(--text-dim)',
                  transition: 'all 0.2s',
                }}
              >
                🎯 Calcolate
              </button>
              <button
                onClick={() => setTipoGiocate('scelte')}
                title="Mostra le giocate selezionate in Schedina"
                style={{
                  padding: '6px 16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: tipoGiocate === 'scelte' ? 'var(--neon-green)' : 'transparent',
                  color: tipoGiocate === 'scelte' ? '#000' : 'var(--text-dim)',
                  transition: 'all 0.2s',
                }}
              >
                ✅ Scelte
              </button>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              {tipoGiocate === 'calcolate'
                ? '🎯 Top 3 per percentuale'
                : '✅ Solo giocate selezionate in Schedina'}
            </span>
          </div>
        )}

        {renderTabContent()}
      </div>
    );
  }

  window.HomeComponent = HomeComponent;
  window.HomeUtils = {
    NAZIONI, NAZIONI_BASE_PATH, SCHEDINA_STORAGE_KEY,
    formatGiocataLabel, getGiornataCorrente, calcolaTop3Giocate,
    leggiSelezioniSchedina, scriviSelezioniSchedina, toggleSelezioneSchedina,
    normalizeMatches, normalizeCampionato, CHINESE_TEAMS,
  };

  console.log('✅ Modulo Home FUTURISTIC caricato (FIX MOBILE + SWITCH CALCOLATE/SCELTE)');

})();