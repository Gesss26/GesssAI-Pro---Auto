// ============================================================
// statistiche.js - Modulo Statistiche (v3)
// - MatchDetail semplificato (solo info partita + form + avversari)
// - Tutte le giocate con percentuali + quote PDF affiancate
// - Ordine: FISSE → DC → OVER → UNDER → GG/NG → Multigol → resto
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

  // ============================================================
  // FORMATTAZIONE ETICHETTE GIOCATE
  // ============================================================
  const formatGiocataLabel = (familyId, label) => {
    if (!label) return '—';

    if (label.startsWith('Over '))  return label;
    if (label.startsWith('Under ')) return label;

    if (familyId === 'multigol') return label;

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
        const uLabel = parts[1].replace('U', 'Under ').replace(',', '.');
        return `${parts[0]} + ${uLabel}`;
      }
    }

    if (familyId === 'dc_over') {
      const parts = label.split('+');
      if (parts.length === 2) {
        const oLabel = parts[1].replace('O', 'Over ').replace(',', '.');
        return `${parts[0]} + ${oLabel}`;
      }
    }

    if (familyId === 'gg_ng') {
      if (label === 'Goal-Goal' || label === 'GG') return 'GG';
      if (label === 'No Goal' || label === 'NG') return 'NG';
    }

    return label;
  };

  // ============================================================
  // HELPER: CALCOLO DOPPIA CHANCE
  // ============================================================
  const calcDC = (mc, dcCode) => {
    if (!mc) return 0;
    const hw = mc.homeWins || 0;
    const d  = mc.draws || 0;
    const aw = mc.awayWins || 0;
    if (dcCode === '1X') return Math.min(100, hw + d);
    if (dcCode === '12') return Math.min(100, hw + aw);
    if (dcCode === 'X2') return Math.min(100, d + aw);
    return 0;
  };

  // ============================================================
  // SIMULAZIONE MONTE CARLO (per AIAnalysis)
  // ============================================================
  const getTeamPoissonParams = (teamName, allMatches) => {
    const matches = allMatches.filter(m =>
      m.stato === 'Giocata' && (m.casa === teamName || m.ospiti === teamName)
    );
    if (matches.length < 3) return { attacco: 1.2, difesa: 1.2, partite: matches.length };

    let golFatti = 0, golSubiti = 0;
    matches.forEach(m => {
      const isHome = m.casa === teamName;
      golFatti += isHome ? m.golCasa : m.golOspite;
      golSubiti += isHome ? m.golOspite : m.golCasa;
    });
    const mediaFatti = golFatti / matches.length;
    const mediaSubiti = golSubiti / matches.length;
    const leagueAvg = 1.35;
    return {
      attacco: Math.max(0.3, mediaFatti / leagueAvg),
      difesa: Math.max(0.3, mediaSubiti / leagueAvg),
      partite: matches.length
    };
  };

  const simulatePoissonMatch = (lambdaCasa, lambdaOspite) => {
    const poisson = (lambda) => {
      if (lambda < 0) lambda = 0;
      let L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do { k++; p *= Math.random(); } while (p > L);
      return k - 1;
    };
    const rfc = 0.85 + Math.random() * 0.3;
    const rfo = 0.85 + Math.random() * 0.3;
    return {
      golCasa: poisson(lambdaCasa * rfc),
      golOspite: poisson(lambdaOspite * rfo)
    };
  };

  const simulateMatches = (homeTeam, awayTeam, allMatches, numSimulations = 10000) => {
    const homeParams = getTeamPoissonParams(homeTeam, allMatches);
    const awayParams = getTeamPoissonParams(awayTeam, allMatches);

    const homeAttacco = Math.max(0.5, homeParams.attacco);
    const homeDifesa = Math.max(0.5, homeParams.difesa);
    const awayAttacco = Math.max(0.5, awayParams.attacco);
    const awayDifesa = Math.max(0.5, awayParams.difesa);

    const lambdaCasa = homeAttacco * awayDifesa * 1.1;
    const lambdaOspite = awayAttacco * homeDifesa * 0.9;

    let homeWins = 0, draws = 0, awayWins = 0;
    let over15 = 0, over25 = 0, over35 = 0, over45 = 0;
    let under15 = 0, under25 = 0, under35 = 0, under45 = 0;
    let gg = 0, ng = 0;
    let risultati = {};

    for (let i = 0; i < numSimulations; i++) {
      const r = simulatePoissonMatch(lambdaCasa, lambdaOspite);
      const gC = r.golCasa, gO = r.golOspite, total = gC + gO;

      if (gC > gO) homeWins++;
      else if (gC === gO) draws++;
      else awayWins++;

      if (total > 1.5) over15++; else under15++;
      if (total > 2.5) over25++; else under25++;
      if (total > 3.5) over35++; else under35++;
      if (total > 4.5) over45++; else under45++;

      if (gC > 0 && gO > 0) gg++; else ng++;

      const key = `${gC}-${gO}`;
      if (!risultati[key]) risultati[key] = 0;
      risultati[key]++;
    }

    const n = numSimulations;
    const pct = (val) => Math.round((val / n) * 100);

    let maxResult = '', maxCount = 0;
    for (const [key, count] of Object.entries(risultati)) {
      if (count > maxCount) { maxCount = count; maxResult = key; }
    }

    let c12U45 = 0;
    for (const [key, count] of Object.entries(risultati)) {
      const [gC, gO] = key.split('-').map(Number);
      if (gC !== gO && (gC + gO) < 4.5) c12U45 += count;
    }

    return {
      homeWins: pct(homeWins), draws: pct(draws), awayWins: pct(awayWins),
      over15: pct(over15), under15: pct(under15),
      over25: pct(over25), under25: pct(under25),
      over35: pct(over35), under35: pct(under35),
      over45: pct(over45), under45: pct(under45),
      gg: pct(gg), ng: pct(ng),
      pct12Under45: Math.round((c12U45 / n) * 100),
      maxResult, maxResultPct: pct(maxCount),
      lambdaCasa: lambdaCasa.toFixed(2), lambdaOspite: lambdaOspite.toFixed(2),
      homeAttacco: homeAttacco.toFixed(2), homeDifesa: homeDifesa.toFixed(2),
      awayAttacco: awayAttacco.toFixed(2), awayDifesa: awayDifesa.toFixed(2),
      partiteAnalizzate: Math.min(homeParams.partite, awayParams.partite),
      numSimulations: n, risultati
    };
  };

  // ============================================================
  // AI ANALYSIS
  // ============================================================
  const AIAnalysis = ({ match, allMatches, selectedFamiglie }) => {
    const getChampColor = window.getChampColor;
    const getPercentualeClasse = window.getPercentualeClasse;
    const FAMIGLIE_GIOCATE = window.FAMIGLIE_GIOCATE;

    const [mc, setMc] = useState(null);
    const [loading, setLoading] = useState(false);

    const runSimulation = (homeTeam, awayTeam) => {
      setLoading(true);
      try {
        const result = simulateMatches(homeTeam, awayTeam, allMatches, 10000);
        setMc(result);
        localStorage.setItem(`ft_mc_${match.id}`, JSON.stringify(result));
      } catch (e) {
        console.warn('Errore MC:', e);
      }
      setLoading(false);
    };

    useEffect(() => {
      if (!match) return;
      const saved = localStorage.getItem(`ft_mc_${match.id}`);
      if (saved) {
        try { setMc(JSON.parse(saved)); return; } catch (e) {}
      }
      if (match && allMatches.length > 0) runSimulation(match.casa, match.ospiti);
    }, [match]);

    const refresh = () => {
      if (match) {
        localStorage.removeItem(`ft_mc_${match.id}`);
        setMc(null);
        runSimulation(match.casa, match.ospiti);
      }
    };

    const calcPctFromSim = (familyId, giocata) => {
      const totalSim = mc?.numSimulations || 10000;

      if (familyId === 'gg_ng') {
        if (giocata === 'GG') return mc?.gg || 0;
        if (giocata === 'NG') return mc?.ng || 0;
      }
      if (familyId === 'fisse') {
        if (giocata === '1') return mc?.homeWins || 0;
        if (giocata === 'X') return mc?.draws || 0;
        if (giocata === '2') return mc?.awayWins || 0;
      }
      if (familyId === 'dc') {
        if (giocata === '1X') return calcDC(mc, '1X');
        if (giocata === '12') return calcDC(mc, '12');
        if (giocata === 'X2') return calcDC(mc, 'X2');
      }
      if (familyId === 'over') {
        if (giocata === 'Over 1.5') return mc?.over15 || 0;
        if (giocata === 'Over 2.5') return mc?.over25 || 0;
        if (giocata === 'Over 3.5') return mc?.over35 || 0;
        if (giocata === 'Over 4.5') return mc?.over45 || 0;
      }
      if (familyId === 'under') {
        if (giocata === 'Under 1.5') return mc?.under15 || 0;
        if (giocata === 'Under 2.5') return mc?.under25 || 0;
        if (giocata === 'Under 3.5') return mc?.under35 || 0;
        if (giocata === 'Under 4.5') return mc?.under45 || 0;
      }
      if (familyId === 'multigol') {
        let count = 0;
        for (const [key, c] of Object.entries(mc?.risultati || {})) {
          const [gC, gO] = key.split('-').map(Number);
          const total = gC + gO;
          let matchMG = false;
          if (giocata === 'MG Casa 0-2' && gC <= 2) matchMG = true;
          else if (giocata === 'MG Ospite 0-2' && gO <= 2) matchMG = true;
          else if (giocata === 'MG Casa 1-3' && gC >= 1 && gC <= 3) matchMG = true;
          else if (giocata === 'MG Ospite 1-3' && gO >= 1 && gO <= 3) matchMG = true;
          else if (giocata === 'MG Casa 2-5' && gC >= 2 && gC <= 5) matchMG = true;
          else if (giocata === 'MG Ospite 2-5' && gO >= 2 && gO <= 5) matchMG = true;
          else if (giocata === 'MG Tot 1-4' && total >= 1 && total <= 4) matchMG = true;
          else if (giocata === 'MG Tot 2-5' && total >= 2 && total <= 5) matchMG = true;
          if (matchMG) count += c;
        }
        return Math.round((count / totalSim) * 100);
      }
      return 0;
    };

    const getBestFamily = (familyId) => {
      const family = FAMIGLIE_GIOCATE[familyId];
      if (!family) return null;
      let bestPct = -1, bestLabel = '';
      family.options.forEach(opt => {
        const pct = calcPctFromSim(familyId, opt);
        if (pct > bestPct) { bestPct = pct; bestLabel = opt; }
      });
      return {
        giocata: bestLabel, label: bestLabel, pct: bestPct,
        isBomb: bestPct >= 90,
        familyIcon: family.icon, familyLabel: family.label
      };
    };

    if (!match) return null;

    if (loading) {
      return <div className="ai-analysis-loading">⏳ Simulazione Monte Carlo in corso... (10000 partite)</div>;
    }

    if (!mc) {
      return (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>⏳ Caricamento...</p>
          <button className="btn" onClick={() => runSimulation(match.casa, match.ospiti)}>📊 Avvia Simulazione</button>
        </div>
      );
    }

    const famiglieDaMostrare = (() => {
      const ORDINE_PREFERITO = ['gg_ng', 'fisse', 'dc', 'over', 'under', 'multigol', 'dc_over', 'dc_under', 'mg_casa_ospite', 'dc_multigol'];
      const selezionate = (selectedFamiglie || []).slice(0, 3);
      const selezionateOrdinate = [...selezionate].sort((a, b) => {
        const ia = ORDINE_PREFERITO.indexOf(a);
        const ib = ORDINE_PREFERITO.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
      const lista = [];
      selezionateOrdinate.forEach(fid => {
        if (fid && !lista.includes(fid)) lista.push(fid);
      });
      if (!lista.includes('gg_ng')) {
        const posUnder = lista.indexOf('under');
        const posOver = lista.indexOf('over');
        if (posUnder !== -1) lista.splice(posUnder + 1, 0, 'gg_ng');
        else if (posOver !== -1) lista.splice(posOver + 1, 0, 'gg_ng');
        else lista.push('gg_ng');
      }
      return lista;
    })();

    return (
      <div className="ai-analysis-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ color: getChampColor(match.campionato), margin: 0, fontSize: '18px' }}>
            📊 Simulazione Poisson + Monte Carlo
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🔢 {mc.numSimulations} simulazioni</span>
            <button onClick={refresh} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>🔄 Rigenera</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'var(--card)', padding: '12px', borderRadius: '8px', border: '2px solid var(--accent)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>1 - X - 2</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              <span style={{ color: mc.homeWins > mc.awayWins ? 'var(--win)' : 'var(--text)' }}>{mc.homeWins}%</span>
              <span style={{ color: 'var(--draw)', margin: '0 4px' }}>|</span>
              <span style={{ color: mc.draws > mc.homeWins && mc.draws > mc.awayWins ? 'var(--draw)' : 'var(--text)' }}>{mc.draws}%</span>
              <span style={{ color: 'var(--draw)', margin: '0 4px' }}>|</span>
              <span style={{ color: mc.awayWins > mc.homeWins ? 'var(--lose)' : 'var(--text)' }}>{mc.awayWins}%</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>12 + Under 4.5</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              <span className={`giocata-pct ${getPercentualeClasse(mc.pct12Under45)}`}>{mc.pct12Under45}%</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risultato più probabile</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}>
              {mc.maxResult} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({mc.maxResultPct}%)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {famiglieDaMostrare.map((familyId, idx) => {
            const best = getBestFamily(familyId);
            if (!best || best.pct < 0) {
              return <div key={idx} style={{ background: 'var(--card)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>N/D</div>;
            }
            const isBomb = best.isBomb;
            const isGGNG = familyId === 'gg_ng';
            const displayLabel = formatGiocataLabel(familyId, best.label);
            return (
              <div key={idx} style={{
                background: 'var(--card)', padding: '12px 16px', borderRadius: '8px',
                textAlign: 'center',
                border: isBomb ? '2px solid var(--accent)' : (isGGNG ? '2px solid #e74c3c' : '1px solid var(--border)')
              }}>
                <div style={{ fontSize: '11px', color: isGGNG ? '#e74c3c' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {best.familyIcon} {best.familyLabel}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px', fontWeight: 'bold' }}>
                  {displayLabel}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>
                  <span className={`giocata-pct ${getPercentualeClasse(best.pct)}`}>
                    {best.pct}% {isBomb && <span className="bomb-icon">💣</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // MATCH DETAIL (SEMPLIFICATO: solo info + form + avversari)
  // ============================================================
  const MatchDetail = ({ match, allMatches }) => {
    const calcFormAndStats = window.calcFormAndStats;
    const getChampColor = window.getChampColor;
    const formatDateEU = window.formatDateEU;
    const TeamLogo = window.TeamLogo;
    const parseDate = window.parseDate;
    const getXgClasse = window.getXgClasse;

    const homeForm = calcFormAndStats(allMatches, match.casa);
    const awayForm = calcFormAndStats(allMatches, match.ospiti);

    const renderFormSquares = (formStr) => [...formStr].map((letter, idx) => (
      <div key={idx} className={`form-square form-square-${letter}`}>{letter}</div>
    ));

    const getResultColor = (game, team) => {
      const isHome = game.casa === team;
      const tg = isHome ? game.golCasa : game.golOspite;
      const og = isHome ? game.golOspite : game.golCasa;
      if (tg > og) return 'win';
      if (tg === og) return 'draw';
      return 'loss';
    };

    const getLast5Games = (teamName) => {
      return allMatches
        .filter(m => m.stato === 'Giocata' && (m.casa === teamName || m.ospiti === teamName))
        .sort((a, b) => parseDate(b.data, b.ora) - parseDate(a.data, a.ora))
        .slice(0, 5);
    };

    const last5Home = getLast5Games(match.casa);
    const last5Away = getLast5Games(match.ospiti);

    const renderXgValue = (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return <span className="xg-value xg-white">N/A</span>;
      const cls = getXgClasse(num);
      return <span className={`xg-value ${cls}`}>{num.toFixed(1)}</span>;
    };

    return (
      <div className="card">
        <h2 style={{ color: getChampColor(match.campionato) }}>{match.campionato}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '8px 0' }}>
          <span><b>Giornata:</b> {match.round}</span>
          <span><b>Data:</b> {formatDateEU(match.data)}</span>
          <span><b>Ora:</b> {match.ora || 'TBD'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '24px', fontWeight: 'bold', margin: '12px 0', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <TeamLogo teamName={match.casa} championship={match.campionato} size={50} />
            <span style={{ marginTop: '8px', color: getChampColor(match.campionato) }}>{match.casa}</span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '20px' }}>VS</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <TeamLogo teamName={match.ospiti} championship={match.campionato} size={50} />
            <span style={{ marginTop: '8px', color: getChampColor(match.campionato) }}>{match.ospiti}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '8px 0' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h4 style={{ color: getChampColor(match.campionato) }}>{match.casa}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Forma:</span>
              <div className="form-squares" style={{ display: 'inline-flex' }}>{renderFormSquares(homeForm.form)}</div>
            </div>
            <div>xG: {renderXgValue(homeForm.mediaGolFatti || 0)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h4 style={{ color: getChampColor(match.campionato) }}>{match.ospiti}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Forma:</span>
              <div className="form-squares" style={{ display: 'inline-flex' }}>{renderFormSquares(awayForm.form)}</div>
            </div>
            <div>xG: {renderXgValue(awayForm.mediaGolFatti || 0)}</div>
          </div>
        </div>

        <div className="opponents-row">
          <div className="opponents-col">
            <b>Ultimi avversari ({match.casa})</b>
            {last5Home.map(g => {
              const rc = getResultColor(g, match.casa);
              const oppName = g.casa === match.casa ? g.ospiti : g.casa;
              return (
                <div key={g.id} className="opp-item">
                  <span>{oppName}</span>
                  <span>
                    <span className={`opp-result-indicator ${rc}`}></span>
                    ({g.golCasa}-{g.golOspite})
                  </span>
                </div>
              );
            })}
            <div className="opp-form-pct">{homeForm.pct}%</div>
            <div className="opp-form-bar"><div className="opp-form-bar-fill" style={{ width: homeForm.pct + '%' }}></div></div>
          </div>
          <div className="opponents-col">
            <b>Ultimi avversari ({match.ospiti})</b>
            {last5Away.map(g => {
              const rc = getResultColor(g, match.ospiti);
              const oppName = g.casa === match.ospiti ? g.ospiti : g.casa;
              return (
                <div key={g.id} className="opp-item">
                  <span>{oppName}</span>
                  <span>
                    <span className={`opp-result-indicator ${rc}`}></span>
                    ({g.golCasa}-{g.golOspite})
                  </span>
                </div>
              );
            })}
            <div className="opp-form-pct">{awayForm.pct}%</div>
            <div className="opp-form-bar"><div className="opp-form-bar-fill" style={{ width: awayForm.pct + '%' }}></div></div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // TUTTE LE FAMIGLIE (con ordine + quote PDF)
  // ============================================================
  const TutteLeFamigliePanel = ({ match, allMatches }) => {
    const getChampColor = window.getChampColor;
    const getPercentualeClasse = window.getPercentualeClasse;
    const FAMIGLIE = window.FAMIGLIE_GIOCATE;
    const getGiocataPct = window.getGiocataPct;

    const stats = window.computeMatchStats(match, allMatches);
    if (stats.error) return null;

    // ⭐ ORDINE RICHIESTO: FISSE → DC → OVER → UNDER → GG/NG → Multigol → resto
    const ORDINE = ['fisse', 'dc', 'over', 'under', 'gg_ng', 'multigol', 'dc_over', 'dc_under', 'mg_casa_ospite', 'dc_multigol'];

    const sezioni = ORDINE
      .filter(familyId => FAMIGLIE[familyId])
      .map(familyId => {
        const family = FAMIGLIE[familyId];
        const opzioni = family.options.map(opt => {
          let pct = 0;

          if (familyId === 'gg_ng') {
            const ggNg = window.calcolaGG_NG(stats);
            pct = opt === 'GG' ? (ggNg?.gg || 0) : (ggNg?.ng || 0);
          } else {
            pct = getGiocataPct(opt, stats, stats.homeMG, stats.awayMG, stats.mgTot);
          }

          // QUOTA PDF
          let quota = null;
          let edge = null;
          let isValue = false;

          if (window.QuoteManager && typeof window.QuoteManager.analizzaGiocata === 'function') {
            try {
              const q = window.QuoteManager.analizzaGiocata(match, familyId, opt, pct);
              if (q && q.quotaBook) {
                quota = q.quotaBook;
                edge = q.edge;
                isValue = q.isValue;
              }
            } catch (e) {}
          }

          return { opt, pct, quota, edge, isValue };
        });

        return { familyId, family, opzioni };
      });

    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ color: 'var(--accent)', marginBottom: '16px' }}>
          📊 Tutte le Giocate — {match.casa} vs {match.ospiti}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {sezioni.map(({ familyId, family, opzioni }) => (
            <div key={familyId} style={{
              background: 'var(--surface)', borderRadius: '10px',
              border: familyId === 'gg_ng' ? '2px solid #e74c3c' : '1px solid var(--border)',
              padding: '12px',
            }}>
              <h4 style={{
                color: familyId === 'gg_ng' ? '#e74c3c' : 'var(--accent)',
                marginBottom: '8px', fontSize: '14px',
              }}>
                {family.icon} {family.label}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {opzioni.map(({ opt, pct, quota, edge, isValue }) => (
                  <div key={opt} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 8px', borderRadius: '6px',
                    background: 'var(--card)',
                    fontSize: '12px',
                  }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text)', flex: 1 }}>
                      {formatGiocataLabel(familyId, opt)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`giocata-pct ${getPercentualeClasse(pct)}`}
                        style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {pct}%
                      </span>
                      {quota && (
                        <span
                          title={isValue ? `VALUE BET! Edge: +${edge}%` : `Quota Marathonbet`}
                          style={{
                            fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                            background: isValue ? 'rgba(111, 207, 151, 0.2)' : 'rgba(243, 156, 18, 0.15)',
                            color: isValue ? 'var(--win)' : 'var(--accent)',
                            fontWeight: 'bold',
                            border: isValue ? '1px solid var(--win)' : '1px solid transparent',
                          }}>
                          💰 {quota.toFixed(2)}
                          {isValue && edge && <span> +{edge}%</span>}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          💰 = Quota Marathonbet (PDF) • Se assente, il mercato non è offerto o il PDF non è aggiornato
        </div>
      </div>
    );
  };

  // ============================================================
  // STANDINGS
  // ============================================================
  const Standings = ({ matches, filterChampionship, highlightTeams = [] }) => {
    const [view, setView] = useState('generale');
    const TeamLogo = window.TeamLogo;
    const getMultigolRange = window.getMultigolRange;

    let allMatchesInChamp = matches;
    if (filterChampionship && filterChampionship !== 'Tutti') {
      allMatchesInChamp = allMatchesInChamp.filter(m => m.campionato === filterChampionship);
    }

    const playedMatches = allMatchesInChamp.filter(m => m.stato === 'Giocata');
    if (allMatchesInChamp.length === 0) return <div className="empty-state">Nessuna partita disponibile.</div>;

    const allTeams = new Set();
    allMatchesInChamp.forEach(m => {
      if (m.casa) allTeams.add(m.casa);
      if (m.ospiti) allTeams.add(m.ospiti);
    });

    const teamStats = {};
    allTeams.forEach(team => {
      if (!team || team.trim() === '') return;
      teamStats[team] = { pg: 0, punti: 0, v: 0, p: 0, s: 0, gf: 0, gs: 0, dr: 0 };
    });

    const addGame = (team, golFatti, golSubiti) => {
      if (!teamStats[team]) teamStats[team] = { pg: 0, punti: 0, v: 0, p: 0, s: 0, gf: 0, gs: 0, dr: 0 };
      const t = teamStats[team];
      t.pg++;
      t.gf += golFatti;
      t.gs += golSubiti;
      if (golFatti > golSubiti) { t.v++; t.punti += 3; }
      else if (golFatti === golSubiti) { t.p++; t.punti += 1; }
      else { t.s++; }
    };

    playedMatches.forEach(m => {
      if (view === 'generale' || view === 'casa') addGame(m.casa, m.golCasa, m.golOspite);
      if (view === 'generale' || view === 'ospite') addGame(m.ospiti, m.golOspite, m.golCasa);
    });

    Object.values(teamStats).forEach(t => { t.dr = t.gf - t.gs; });

    const sorted = Object.entries(teamStats)
      .filter(([name]) => name && name.trim() !== '')
      .sort((a, b) => {
        if (b[1].punti !== a[1].punti) return b[1].punti - a[1].punti;
        if (b[1].dr !== a[1].dr) return b[1].dr - a[1].dr;
        return b[1].gf - a[1].gf;
      })
      .map(([name, stats], index) => ({ pos: index + 1, name, ...stats }));

    const getMultigolForTeam = (teamName) => getMultigolRange(teamName, matches);
    const champToShow = filterChampionship && filterChampionship !== 'Tutti' ? filterChampionship : null;

    return (
      <div>
        <div className="sub-tabs">
          <button className={view === 'generale' ? 'active' : ''} onClick={() => setView('generale')}>Generale</button>
          <button className={view === 'casa' ? 'active' : ''} onClick={() => setView('casa')}>Casa</button>
          <button className={view === 'ospite' ? 'active' : ''} onClick={() => setView('ospite')}>Ospite</button>
        </div>

        <div className="standings-table-wrap">
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Squadra</th>
                <th className="num">PG</th>
                <th className="num">Punti</th>
                <th className="num">V</th>
                <th className="num">P</th>
                <th className="num">S</th>
                <th className="num">GF</th>
                <th className="num">GS</th>
                <th className="num">DR</th>
                <th className="num">Fascia Gol</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const isHighlighted = highlightTeams.includes(row.name);
                const multigol = getMultigolForTeam(row.name);
                const hasPlayed = row.pg > 0;
                return (
                  <tr key={row.name} className={isHighlighted ? 'highlighted' : ''} style={{ opacity: hasPlayed ? 1 : 0.5 }}>
                    <td className="pos">{row.pos}</td>
                    <td>
                      <div className="team-name-cell">
                        <TeamLogo teamName={row.name} championship={champToShow || 'Tutti'} size={18} />
                        <span className="team-name">{row.name}</span>
                      </div>
                    </td>
                    <td className="num">{row.pg}</td>
                    <td className="points">{row.punti}</td>
                    <td className="num">{row.v}</td>
                    <td className="num">{row.p}</td>
                    <td className="num">{row.s}</td>
                    <td className="num">{row.gf}</td>
                    <td className="num">{row.gs}</td>
                    <td className="num" style={{ color: row.dr > 0 ? 'var(--win)' : (row.dr < 0 ? 'var(--lose)' : 'var(--text-muted)') }}>
                      {row.dr > 0 ? '+' : ''}{row.dr}
                    </td>
                    <td className="num">
                      {hasPlayed ? <span className={`multigol-badge range-${multigol.range}`}>{multigol.label}</span> : <span>—</span>}
                    </td>
                    <td className="num">{hasPlayed ? multigol.pct + '%' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // RISULTATI FREQUENTI
  // ============================================================
  const RisultatiFrequenti = ({ teamName, allMatches }) => {
    const parseDate = window.parseDate;
    const getFrequenti = (team) => {
      const matches = allMatches
        .filter(m => m.stato === 'Giocata' && (m.casa === team || m.ospiti === team))
        .sort((a, b) => parseDate(b.data, b.ora) - parseDate(a.data, a.ora));
      if (matches.length === 0) return [];
      const freq = {};
      matches.forEach(m => {
        const isHome = m.casa === team;
        const tg = isHome ? m.golCasa : m.golOspite;
        const og = isHome ? m.golOspite : m.golCasa;
        let rt = '';
        if (tg > og) rt = 'V'; else if (tg === og) rt = 'P'; else rt = 'S';
        const key = `${tg}-${og}`;
        if (!freq[key]) freq[key] = { risultato: key, count: 0, tipo: rt };
        freq[key].count++;
      });
      return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 8);
    };

    const data = getFrequenti(teamName);
    if (data.length === 0) {
      return (
        <div className="card" style={{ height: '100%', minHeight: '200px' }}>
          <h4>📊 Risultati Frequenti - {teamName}</h4>
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Nessuna partita</div>
        </div>
      );
    }

    const totalMatches = data.reduce((sum, d) => sum + d.count, 0);
    const getResultColor = (tipo) => tipo === 'V' ? 'var(--win)' : (tipo === 'P' ? 'var(--draw)' : 'var(--lose)');

    return (
      <div className="card" style={{ height: '100%', minHeight: '280px', overflow: 'hidden' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>📊 Risultati Frequenti - {teamName}</h4>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>📅 {totalMatches} partite giocate</div>
        <div className="freq-table-wrap">
          <table className="freq-table">
            <thead><tr><th>#</th><th>Risultato</th><th>Freq.</th><th>%</th></tr></thead>
            <tbody>
              {data.map((d, idx) => {
                const pct = Math.round((d.count / totalMatches) * 100);
                const color = getResultColor(d.tipo);
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>#{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '4px', backgroundColor: color, border: '1px solid var(--border)' }} />
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: color }}>{d.risultato}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{d.count}x</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: color, fontSize: '13px' }}>{pct}%</span>
                        <div className="form-bar" style={{ width: '40px', margin: '0' }}>
                          <div className="form-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // FREQUENZA GOL
  // ============================================================
  const FrequenzaGol = ({ teamName, allMatches }) => {
    const getChampColor = window.getChampColor;
    const teamMatches = allMatches.filter(m => m.stato === 'Giocata' && (m.casa === teamName || m.ospiti === teamName));

    if (teamMatches.length === 0) {
      return (
        <div className="card" style={{ padding: '12px', height: '100%', minHeight: '150px' }}>
          <h4 style={{ fontSize: '13px', marginBottom: '6px' }}>⚽ Frequenza Gol - {teamName}</h4>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0' }}>Nessuna partita</div>
        </div>
      );
    }

    const golFatti = teamMatches.map(m => m.casa === teamName ? m.golCasa : m.golOspite);
    const total = golFatti.length;
    const sommaGol = golFatti.reduce((s, g) => s + g, 0);
    const mediaGol = (sommaGol / total).toFixed(2);
    const freq = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0 };
    golFatti.forEach(g => {
      if (g === 0) freq[0]++;
      else if (g === 1) freq[1]++;
      else if (g === 2) freq[2]++;
      else if (g === 3) freq[3]++;
      else if (g === 4) freq[4]++;
      else freq['5+']++;
    });
    const colorMap = { 0: 'var(--lose)', 1: 'var(--draw)', 2: 'var(--win)', 3: 'var(--win)', 4: 'var(--accent)', '5+': 'var(--accent2)' };

    return (
      <div className="card" style={{ padding: '12px', height: '100%', minHeight: '150px' }}>
        <h4 style={{ fontSize: '13px', marginBottom: '6px', color: getChampColor(teamName) }}>⚽ Frequenza Gol - {teamName}</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold' }}>
          <span>📊 {total} partite</span>
          <span>🎯 Media: <span style={{ fontSize: '18px', color: '#ffff00' }}>{mediaGol}</span> gol/partita</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginTop: '4px' }}>
          {Object.entries(freq).map(([key, count]) => {
            const pct = Math.round((count / total) * 100);
            const color = colorMap[key] || 'var(--text-muted)';
            return (
              <div key={key} style={{ textAlign: 'center', background: 'var(--surface)', padding: '4px 2px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{key}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: color }}>{pct}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({count})</div>
                <div className="form-bar" style={{ height: '3px', marginTop: '2px' }}>
                  <div className="form-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // INDICE AFFIDABILITA
  // ============================================================
  const IndiceAffidabilita = ({ teamName, allMatches }) => {
    const teamMatches = allMatches.filter(m => m.stato === 'Giocata' && (m.casa === teamName || m.ospiti === teamName));
    const count = teamMatches.length;
    if (count === 0) return null;
    const affidabilita = Math.min(count / 20 * 100, 100);
    const results = teamMatches.map(m => {
      const isHome = m.casa === teamName;
      const tg = isHome ? m.golCasa : m.golOspite;
      const og = isHome ? m.golOspite : m.golCasa;
      return tg > og ? 3 : (tg === og ? 1 : 0);
    });
    const media = results.reduce((s, r) => s + r, 0) / results.length;
    const varianza = results.reduce((s, r) => s + Math.pow(r - media, 2), 0) / results.length;
    const stabilita = Math.max(0, 100 - (varianza / 4 * 100));

    return (
      <div className="card">
        <h4>🎯 Indice di Affidabilità - {teamName}</h4>
        <div className="affidabilita-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: affidabilita > 70 ? 'var(--win)' : 'var(--draw)' }}>
              {Math.round(affidabilita)}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Affidabilità</div>
            <div className="form-bar"><div className="form-bar-fill" style={{ width: `${affidabilita}%`, background: affidabilita > 70 ? 'var(--win)' : 'var(--draw)' }}></div></div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: stabilita > 60 ? 'var(--win)' : 'var(--draw)' }}>
              {Math.round(stabilita)}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Stabilità</div>
            <div className="form-bar"><div className="form-bar-fill" style={{ width: `${stabilita}%`, background: stabilita > 60 ? 'var(--win)' : 'var(--draw)' }}></div></div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent)' }}>{count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Partite analizzate</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{count < 10 ? '⚠️ Poche partite' : '✅ Campione sufficiente'}</div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // TEAM MATCHES HISTORY
  // ============================================================
  const TeamMatchesHistory = ({ teamName, championship, allMatches }) => {
    const parseDate = window.parseDate;
    const formatDateEU = window.formatDateEU;
    const getChampColor = window.getChampColor;
    const TeamLogo = window.TeamLogo;

    const teamMatches = allMatches.filter(m =>
      m.campionato === championship &&
      m.stato === 'Giocata' &&
      (m.casa === teamName || m.ospiti === teamName)
    ).sort((a, b) => parseDate(b.data, b.ora) - parseDate(a.data, a.ora));

    if (teamMatches.length === 0) {
      return (
        <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nessuna partita giocata per {teamName}.</p>
        </div>
      );
    }

    const getResult = (match, team) => {
      const isHome = match.casa === team;
      const tg = isHome ? match.golCasa : match.golOspite;
      const og = isHome ? match.golOspite : match.golCasa;
      if (tg > og) return 'win';
      if (tg === og) return 'draw';
      return 'loss';
    };

    const getOpponent = (match, team) => match.casa === team ? match.ospiti : match.casa;
    const getResultColor = (r) => r === 'win' ? 'var(--win)' : (r === 'draw' ? 'var(--draw)' : 'var(--lose)');

    return (
      <div className="card" style={{ padding: '12px' }}>
        <h4 style={{ color: getChampColor(teamName), marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamLogo teamName={teamName} championship={championship} size={20} />
          {teamName}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: 'auto' }}>
            {teamMatches.length} partite
          </span>
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {teamMatches.map(m => {
            const result = getResult(m, teamName);
            const opponent = getOpponent(m, teamName);
            const rc = getResultColor(result);
            const isHome = m.casa === teamName;
            let emoji = '', rl = '';
            if (result === 'win') { emoji = '✅'; rl = 'V'; }
            else if (result === 'draw') { emoji = '➖'; rl = 'P'; }
            else { emoji = '❌'; rl = 'S'; }

            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', background: 'var(--surface)', borderRadius: '6px',
                border: `2px solid ${rc}`, borderLeft: `6px solid ${rc}`,
                gap: '8px', flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '180px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '70px' }}>{formatDateEU(m.data)}</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>
                    {isHome ? (
                      <>
                        <span style={{ color: 'var(--accent)' }}>{teamName}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>-</span>
                        <span>{opponent}</span>
                      </>
                    ) : (
                      <>
                        <span>{opponent}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>-</span>
                        <span style={{ color: 'var(--accent)' }}>{teamName}</span>
                      </>
                    )}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {isHome ? '🏠 Casa' : '✈️ Trasferta'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-block', backgroundColor: rc, color: '#000', fontWeight: 'bold',
                    padding: '2px 14px', borderRadius: '6px', minWidth: '50px', textAlign: 'center',
                    fontSize: '16px', border: `1px solid ${rc}`
                  }}>
                    {m.golCasa} - {m.golOspite}
                  </span>
                  <span style={{
                    fontSize: '14px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px',
                    background: rc, color: '#000', minWidth: '24px', textAlign: 'center'
                  }}>{rl}</span>
                  <span style={{ fontSize: '16px' }}>{emoji}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // WEATHER PROFESSIONALE
  // ============================================================
  const WeatherProfessionale = ({ weatherData, city, matchDate }) => {
    if (!weatherData) {
      return (
        <div className="weather-professionale" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🌤️</div>
          <p>Dati meteo non disponibili per {city || 'questa località'}</p>
          <p style={{ fontSize: '12px' }}>Open-Meteo è gratuito e non richiede chiave API</p>
        </div>
      );
    }

    const getWeatherIcon = (desc, rain) => {
      if (!desc) return '🌤️';
      const d = desc.toLowerCase();
      if (rain > 5) return '🌧️';
      if (rain > 1) return '🌦️';
      if (d.includes('sereno')) return '☀️';
      if (d.includes('nuvoloso') || d.includes('coperto')) return '☁️';
      if (d.includes('nebbia')) return '🌫️';
      if (d.includes('pioggia')) return '🌧️';
      if (d.includes('temporale')) return '⛈️';
      if (d.includes('neve')) return '❄️';
      return '🌤️';
    };

    const getRiskLevel = (weather) => {
      let risk = 0;
      if (weather.rain > 5) risk += 3;
      else if (weather.rain > 1) risk += 2;
      else if (weather.rain > 0.5) risk += 1;
      if (weather.wind_speed > 15) risk += 3;
      else if (weather.wind_speed > 10) risk += 2;
      else if (weather.wind_speed > 5) risk += 1;
      if (weather.temp < -5 || weather.temp > 35) risk += 2;
      else if (weather.temp < 0 || weather.temp > 30) risk += 1;
      if (weather.weather && (weather.weather.includes('Temporale') || weather.weather.includes('temporale'))) risk += 3;
      if (risk >= 6) return { level: 'high', label: '🔴 ALTO - Rischio di rinvio o condizioni proibitive' };
      if (risk >= 4) return { level: 'medium', label: '🟡 MEDIO - Possibili difficoltà per i giocatori' };
      if (risk >= 2) return { level: 'low', label: '🟢 BASSO - Condizioni accettabili' };
      return { level: 'low', label: '🟢 OTTIMALE - Condizioni perfette per il calcio' };
    };

    const risk = getRiskLevel(weatherData);
    const icon = getWeatherIcon(weatherData.weather, weatherData.rain);

    return (
      <div className="weather-professionale">
        <div className="weather-header">
          <div className="weather-icon-main">{icon}</div>
          <div className="weather-info-main">
            <div className="weather-temp-main">{Math.round(weatherData.temp)}°C</div>
            <div className="weather-desc-main">{weatherData.weather || 'N/A'}</div>
            <div className="weather-city-main">📍 {city || 'Località non specificata'} • 📅 {weatherData.forecast_date || matchDate || 'N/A'}</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '100px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Temp. min / max</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}>
              {Math.round(weatherData.temp_min)}° / {Math.round(weatherData.temp_max)}°
            </div>
          </div>
        </div>

        <div className="weather-details-grid">
          <div className="weather-detail-item">
            <div className="wd-icon">💨</div>
            <div className="wd-value">{Math.round(weatherData.wind_speed)} m/s</div>
            <div className="wd-label">Vento</div>
          </div>
          <div className="weather-detail-item">
            <div className="wd-icon">🌧️</div>
            <div className="wd-value">{weatherData.rain > 0 ? weatherData.rain + ' mm' : '0 mm'}</div>
            <div className="wd-label">Precipitazioni</div>
          </div>
        </div>

        <div className="weather-risk">
          <span className="risk-icon">⚠️</span>
          <span className="risk-text"><b>Valutazione meteo:</b> {risk.label}</span>
          <span className={`risk-badge ${risk.level}`}>{risk.level.toUpperCase()}</span>
        </div>
      </div>
    );
  };

  // ============================================================
  // COMPONENTE PRINCIPALE
  // ============================================================
  function StatisticheComponent({ matches, selectedMatchId, selectedFamiglie, weatherCache }) {
    const [statsSubTab, setStatsSubTab] = useState('Classifica');
    const getChampColor = window.getChampColor;

    const { filtro: filtroCampionati, campionatiAttivi } =
      window.FiltriCampionati.useFiltroCampionati();

    const matchesFiltrati = useMemo(
      () => window.FiltriCampionati.filtraPartitePerCampionato(matches),
      [matches, filtroCampionati]
    );

    const selectedMatch = matchesFiltrati.find(m => m.id === selectedMatchId);

    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          padding: '10px 14px', marginBottom: '14px',
          background: 'var(--surface)', borderRadius: '8px',
          border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)'
        }}>
          <span>🏆 <b style={{ color: 'var(--accent)' }}>{campionatiAttivi.length}</b> campionati attivi</span>
          <span>•</span>
          <span>📊 <b style={{ color: 'var(--accent)' }}>{matchesFiltrati.length}</b> partite totali</span>
          <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
            Modifica i filtri nel <b>Palinsesto</b> 📅
          </span>
        </div>

        <div className="sub-tabs">
          <button className={statsSubTab === 'Classifica' ? 'active' : ''} onClick={() => setStatsSubTab('Classifica')}>📊 Classifica</button>
          <button className={statsSubTab === 'Scontri' ? 'active' : ''} onClick={() => setStatsSubTab('Scontri')}>⚔️ Scontri</button>
          <button className={statsSubTab === 'RiepilogoAI' ? 'active' : ''} onClick={() => setStatsSubTab('RiepilogoAI')}>🤖 Riepilogo AI</button>
          <button className={statsSubTab === 'UltimaGiornata' ? 'active' : ''} onClick={() => setStatsSubTab('UltimaGiornata')}>📅 Ultima Giornata</button>
        </div>

        {statsSubTab === 'Classifica' && (
          <div>
            <div className="stats-two-col">
              <div>
                {selectedMatch ? (
                  <MatchDetail match={selectedMatch} allMatches={matchesFiltrati} />
                ) : (
                  <div className="stats-placeholder">
                    <p>👈 Seleziona una partita dal <b>Palinsesto</b> per vedere le statistiche.</p>
                  </div>
                )}
              </div>
              <div>
                {selectedMatch ? (
                  <>
                    <h3 style={{ marginBottom: '12px', color: getChampColor(selectedMatch.campionato) }}>
                      Classifica - {selectedMatch.campionato}
                    </h3>
                    <Standings matches={matchesFiltrati} filterChampionship={selectedMatch.campionato}
                      highlightTeams={[selectedMatch.casa, selectedMatch.ospiti]} />
                  </>
                ) : (
                  <div className="stats-placeholder"><p>📊 Seleziona una partita per la classifica.</p></div>
                )}
              </div>
            </div>

            {/* VISTA TUTTE LE FAMIGLIE */}
            {selectedMatch && (
              <TutteLeFamigliePanel match={selectedMatch} allMatches={matchesFiltrati} />
            )}
          </div>
        )}

        {statsSubTab === 'Scontri' && (
          <div>
            {selectedMatch ? (
              <div className="stats-two-col" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <TeamMatchesHistory teamName={selectedMatch.casa} championship={selectedMatch.campionato} allMatches={matchesFiltrati} />
                <TeamMatchesHistory teamName={selectedMatch.ospiti} championship={selectedMatch.campionato} allMatches={matchesFiltrati} />
              </div>
            ) : (
              <div className="stats-placeholder"><p>👈 Seleziona una partita per gli scontri.</p></div>
            )}
          </div>
        )}

        {statsSubTab === 'RiepilogoAI' && (
          <div>
            {selectedMatch ? (
              <div>
                {(() => {
                  const getCityForMatch = window.getCityForMatch || ((t) => 'N/D');
                  const city = getCityForMatch(selectedMatch.casa, selectedMatch.campionato);
                  const weatherKey = `${selectedMatch.campionato}_${selectedMatch.data}`;
                  const weather = weatherCache[weatherKey] || null;
                  return <WeatherProfessionale weatherData={weather} city={city} matchDate={selectedMatch.data} />;
                })()}
                <AIAnalysis match={selectedMatch} allMatches={matchesFiltrati} selectedFamiglie={selectedFamiglie} />
                <div className="analisi-compact" style={{ marginTop: '16px' }}>
                  <div>
                    <RisultatiFrequenti teamName={selectedMatch.casa} allMatches={matchesFiltrati} />
                    <FrequenzaGol teamName={selectedMatch.casa} allMatches={matchesFiltrati} />
                    <IndiceAffidabilita teamName={selectedMatch.casa} allMatches={matchesFiltrati} />
                  </div>
                  <div>
                    <RisultatiFrequenti teamName={selectedMatch.ospiti} allMatches={matchesFiltrati} />
                    <FrequenzaGol teamName={selectedMatch.ospiti} allMatches={matchesFiltrati} />
                    <IndiceAffidabilita teamName={selectedMatch.ospiti} allMatches={matchesFiltrati} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="stats-placeholder"><p>👈 Seleziona una partita per il riepilogo AI.</p></div>
            )}
          </div>
        )}

        {statsSubTab === 'UltimaGiornata' && (
          <div>
            {selectedMatch ? (
              <div>
                {(() => {
                  const parseDate = window.parseDate;
                  const currentRound = selectedMatch.round;
                  const prevRound = parseInt(currentRound) > 0 ? parseInt(currentRound) - 1 : null;
                  if (prevRound === null || isNaN(prevRound)) {
                    return <p style={{ color: 'var(--text-muted)' }}>Giornata non numerica.</p>;
                  }
                  const prevMatches = matchesFiltrati.filter(m =>
                    m.campionato === selectedMatch.campionato &&
                    m.round === String(prevRound) &&
                    m.stato === 'Giocata'
                  );
                  if (prevMatches.length === 0) {
                    return (
                      <div className="card">
                        <p style={{ color: 'var(--text-muted)' }}>⚠️ Nessuna partita per la giornata {prevRound}.</p>
                      </div>
                    );
                  }
                  const sortedPrev = [...prevMatches].sort((a, b) => parseDate(a.data, a.ora) - parseDate(b.data, b.ora));
                  return (
                    <div>
                      <h3 style={{ color: getChampColor(selectedMatch.campionato), marginBottom: '12px' }}>
                        📅 Giornata {prevRound} - {selectedMatch.campionato}
                      </h3>
                      <div className="matches-grid">
                        {sortedPrev.map(m => (
                          <div key={m.id} className="match-tab-history" style={{ borderLeftColor: getChampColor(m.campionato) }}>
                            <div className="tab-header" style={{ background: getChampColor(m.campionato) }}>{m.campionato}</div>
                            <div className="match-info">{m.casa} vs {m.ospiti}</div>
                            <div className="match-info">📅 {window.formatDateEU(m.data)}</div>
                            <div className="teams-row">
                              <div className="team">
                                <window.TeamLogo teamName={m.casa} championship={m.campionato} size={40} />
                                <div className="team-name" style={{ fontSize: '14px' }}>{m.casa}</div>
                              </div>
                              <div className="score" style={{ color: m.golCasa > m.golOspite ? 'var(--win)' : (m.golCasa === m.golOspite ? 'var(--draw)' : 'var(--lose)') }}>
                                {m.golCasa} - {m.golOspite}
                              </div>
                              <div className="team">
                                <window.TeamLogo teamName={m.ospiti} championship={m.campionato} size={40} />
                                <div className="team-name" style={{ fontSize: '14px' }}>{m.ospiti}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="stats-placeholder"><p>👈 Seleziona una partita per vedere la giornata precedente.</p></div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================
  window.StatisticheComponent = StatisticheComponent;
  window.AIAnalysis = AIAnalysis;
  window.WeatherProfessionale = WeatherProfessionale;
  window.IndiceAffidabilita = IndiceAffidabilita;
  window.RisultatiFrequenti = RisultatiFrequenti;
  window.FrequenzaGol = FrequenzaGol;
  window.Standings = Standings;
  window.TeamMatchesHistory = TeamMatchesHistory;
  window.TutteLeFamigliePanel = TutteLeFamigliePanel;

  console.log('✅ Modulo Statistiche v3 caricato - MatchDetail semplificato + quote + ordine FISSE/DC/OVER/UNDER/GG-NG');

})();