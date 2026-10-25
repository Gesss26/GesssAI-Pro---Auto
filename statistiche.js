// ============================================================
// statistiche.js - Modulo Statistiche (v15)
// - Pulsante rinominato "Formazioni e Assenze"
// - Formazioni con Mv/Fm medi per titolari e panchina
// - Resto invariato rispetto alla v14
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

  // ============================================================
  // CACHE PARAMETRI + CACHE MATRICI DIXON (in memoria)
  // ============================================================
  const _paramCache = new Map();
  const _mcCache = new Map();

  const _cacheKey = (team, champ) => `${team}__${champ}`;
  const _avgKey = (champ) => `__avg__${champ}`;

  const clearStatsCache = () => {
    _paramCache.clear();
    _mcCache.clear();
  };

  // ============================================================
  // FORMATTAZIONE ETICHETTE
  // ============================================================
  const formatGiocataLabel = (familyId, label) => {
    if (typeof window.formatGiocataLabel === 'function') {
      return window.formatGiocataLabel(familyId, label);
    }
    if (!label) return '—';
    if (label.startsWith('Over '))  return label.replace('.', ',');
    if (label.startsWith('Under ')) return label.replace('.', ',');
    if (familyId === 'multigol') return label;
    if (familyId === 'mg_casa_ospite') {
      const parts = label.split('+');
      if (parts.length === 2) return `MG ${parts[0]} C + MG ${parts[1]} O`;
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
      if (label === 'Goal-Goal' || label === 'GG') return 'GG';
      if (label === 'No Goal' || label === 'NG') return 'NG';
    }
    return label;
  };

  // ============================================================
  // MOTORE PREDITTIVO DIXON-COLES
  // ============================================================
  const getLeagueAverages = (championship, allMatches) => {
    const key = _avgKey(championship);
    if (_paramCache.has(key)) return _paramCache.get(key);

    const played = allMatches.filter(m =>
      m.campionato === championship && m.stato === 'Giocata'
    );

    if (played.length === 0) {
      const fallback = { avgHome: 1.4, avgAway: 1.1, n: 0 };
      _paramCache.set(key, fallback);
      return fallback;
    }

    let totHome = 0, totAway = 0;
    played.forEach(m => {
      totHome += m.golCasa;
      totAway += m.golOspite;
    });

    const result = {
      avgHome: totHome / played.length,
      avgAway: totAway / played.length,
      n: played.length,
    };
    _paramCache.set(key, result);
    return result;
  };

  const getTeamParams = (teamName, championship, allMatches, halfLifeDays = 365) => {
    const key = _cacheKey(teamName, championship);
    if (_paramCache.has(key)) return _paramCache.get(key);

    const played = allMatches.filter(m =>
      m.campionato === championship &&
      m.stato === 'Giocata' &&
      (m.casa === teamName || m.ospiti === teamName)
    );

    if (played.length < 3) {
      const weak = {
        attackHome: 1, defenseHome: 1,
        attackAway: 1, defenseAway: 1,
        n: played.length, weak: true,
      };
      _paramCache.set(key, weak);
      return weak;
    }

    const today = new Date();
    const decay = (dateStr) => {
      if (!dateStr) return 1;
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return 1;
      const days = Math.max(0, (today - d) / 86400000);
      return Math.exp(-Math.log(2) * days / halfLifeDays);
    };

    let wHome = 0, gfHome = 0, gsHome = 0;
    let wAway = 0, gfAway = 0, gsAway = 0;

    played.forEach(m => {
      const w = decay(m.data);
      if (m.casa === teamName) {
        wHome += w;
        gfHome += w * m.golCasa;
        gsHome += w * m.golOspite;
      } else {
        wAway += w;
        gfAway += w * m.golOspite;
        gsAway += w * m.golCasa;
      }
    });

    const avg = getLeagueAverages(championship, allMatches);
    const safe = (num, den, fallback = 1) => den > 0 ? num / den : fallback;

    const avgHomeSafe = avg.avgHome > 0 ? avg.avgHome : 1.4;
    const avgAwaySafe = avg.avgAway > 0 ? avg.avgAway : 1.1;

    const result = {
      attackHome:  safe(gfHome, wHome) / avgHomeSafe,
      defenseHome: safe(gsHome, wHome) / avgAwaySafe,
      attackAway:  safe(gfAway, wAway) / avgAwaySafe,
      defenseAway: safe(gsAway, wAway) / avgHomeSafe,
      n: played.length,
      wHome, wAway,
    };
    _paramCache.set(key, result);
    return result;
  };

  const _factCache = [1, 1];
  const factorial = (n) => {
    if (n < 0) return 1;
    if (_factCache[n] !== undefined) return _factCache[n];
    let r = _factCache[_factCache.length - 1];
    for (let i = _factCache.length; i <= n; i++) {
      r *= i;
      _factCache[i] = r;
    }
    return r;
  };

  const poissonPmf = (lambda, k) => {
    if (lambda <= 0) return k === 0 ? 1 : 0;
    return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
  };

  const buildScoreMatrix = (lambdaHome, lambdaAway, rho = -0.10, maxGol = 8) => {
    const matrix = {};
    let sum = 0;

    for (let i = 0; i <= maxGol; i++) {
      for (let j = 0; j <= maxGol; j++) {
        let p = poissonPmf(lambdaHome, i) * poissonPmf(lambdaAway, j);

        if (i === 0 && j === 0) p *= (1 - lambdaHome * lambdaAway * rho);
        else if (i === 0 && j === 1) p *= (1 + lambdaHome * rho);
        else if (i === 1 && j === 0) p *= (1 + lambdaAway * rho);
        else if (i === 1 && j === 1) p *= (1 - rho);

        if (p < 0) p = 0;
        matrix[`${i}-${j}`] = p;
        sum += p;
      }
    }

    if (sum > 0) {
      Object.keys(matrix).forEach(k => { matrix[k] /= sum; });
    }

    return matrix;
  };

  const simulateMatches = (homeTeam, awayTeam, championship, allMatches) => {
    const hp = getTeamParams(homeTeam, championship, allMatches);
    const ap = getTeamParams(awayTeam, championship, allMatches);
    const avg = getLeagueAverages(championship, allMatches);

    const avgHomeSafe = avg.avgHome > 0 ? avg.avgHome : 1.4;
    const avgAwaySafe = avg.avgAway > 0 ? avg.avgAway : 1.1;

    let pesoAttaccoHome = 0, pesoDifesaHome = 0;
    let pesoAttaccoAway = 0, pesoDifesaAway = 0;
    let dettagliAssenzeHome = null, dettagliAssenzeAway = null;

    if (window.AssenzeDB && typeof window.AssenzeDB.calcolaPesi === 'function') {
      const hAss = window.AssenzeDB.calcolaPesi(homeTeam);
      const aAss = window.AssenzeDB.calcolaPesi(awayTeam);
      pesoAttaccoHome = hAss.pesoAttacco;
      pesoDifesaHome = hAss.pesoDifesa;
      pesoAttaccoAway = aAss.pesoAttacco;
      pesoDifesaAway = aAss.pesoDifesa;
      dettagliAssenzeHome = hAss;
      dettagliAssenzeAway = aAss;
    }

    const lambdaHome = hp.attackHome * (1 - pesoAttaccoHome)
                     * ap.defenseAway * (1 + pesoDifesaAway)
                     * avgHomeSafe;
    const lambdaAway = ap.attackAway * (1 - pesoAttaccoAway)
                     * hp.defenseHome * (1 + pesoDifesaHome)
                     * avgAwaySafe;

    const matrix = buildScoreMatrix(lambdaHome, lambdaAway);

    let hw = 0, dr = 0, aw = 0;
    let o15 = 0, o25 = 0, o35 = 0, o45 = 0;
    let gg = 0, c12u45 = 0;
    let maxKey = '0-0', maxP = 0;

    Object.entries(matrix).forEach(([k, p]) => {
      const [gc, go] = k.split('-').map(Number);
      const tot = gc + go;

      if (gc > go) hw += p;
      else if (gc === go) dr += p;
      else aw += p;

      if (tot > 1.5) o15 += p;
      if (tot > 2.5) o25 += p;
      if (tot > 3.5) o35 += p;
      if (tot > 4.5) o45 += p;

      if (gc > 0 && go > 0) gg += p;
      if (gc !== go && tot < 4.5) c12u45 += p;

      if (p > maxP) { maxP = p; maxKey = k; }
    });

    const pct = (v) => Math.round(v * 100);

    return {
      homeWins: pct(hw),
      draws: pct(dr),
      awayWins: pct(aw),
      over15: pct(o15), under15: pct(1 - o15),
      over25: pct(o25), under25: pct(1 - o25),
      over35: pct(o35), under35: pct(1 - o35),
      over45: pct(o45), under45: pct(1 - o45),
      gg: pct(gg), ng: pct(1 - gg),
      pct12Under45: pct(c12u45),
      maxResult: maxKey,
      maxResultPct: pct(maxP),
      lambdaCasa: lambdaHome.toFixed(2),
      lambdaOspite: lambdaAway.toFixed(2),
      homeAttacco: hp.attackHome.toFixed(2),
      homeDifesa: hp.defenseHome.toFixed(2),
      awayAttacco: ap.attackAway.toFixed(2),
      awayDifesa: ap.defenseAway.toFixed(2),
      partiteAnalizzate: Math.min(hp.n, ap.n),
      numSimulations: 10000,
      risultati: matrix,
      leagueAvgHome: avgHomeSafe.toFixed(2),
      leagueAvgAway: avgAwaySafe.toFixed(2),
      weakHome: !!hp.weak,
      weakAway: !!ap.weak,
      assenze: {
        home: dettagliAssenzeHome,
        away: dettagliAssenzeAway,
        impattoHome: {
          attacco: Math.round(pesoAttaccoHome * 100),
          difesa: Math.round(pesoDifesaHome * 100),
        },
        impattoAway: {
          attacco: Math.round(pesoAttaccoAway * 100),
          difesa: Math.round(pesoDifesaAway * 100),
        },
      },
    };
  };

  // ============================================================
  // CALCOLO DC / COMBINATE
  // ============================================================
  const calcDC = (mc, dcCode) => {
    if (!mc) return 0;
    const hw = mc.homeWins || 0;
    const d  = mc.draws || 0;
    const aw = mc.awayWins || 0;
    const total = hw + d + aw;
    if (total === 0) return 0;
    const norm = 100 / total;
    if (dcCode === '1X') return Math.round((hw + d) * norm);
    if (dcCode === '12') return Math.round((hw + aw) * norm);
    if (dcCode === 'X2') return Math.round((d + aw) * norm);
    return 0;
  };

  const calcolaCombinata = (mc, dcCode, tipo, soglia) => {
    if (!mc || !mc.risultati) return 0;
    let count = 0, total = 0;
    for (const [key, p] of Object.entries(mc.risultati)) {
      const [gC, gO] = key.split('-').map(Number);
      const totale = gC + gO;
      total += p;
      let dcOk = false;
      if (dcCode === '1X') dcOk = gC >= gO;
      else if (dcCode === '12') dcOk = gC !== gO;
      else if (dcCode === 'X2') dcOk = gO >= gC;
      if (!dcOk) continue;
      let ouOk = false;
      if (tipo === 'over')  ouOk = totale > soglia;
      else if (tipo === 'under') ouOk = totale < soglia;
      if (ouOk) count += p;
    }
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const calcolaCombinataDCMultigol = (mc, dcCode, mgLabel) => {
    if (!mc || !mc.risultati) return 0;
    const mgMatch = mgLabel.match(/MG\s+(Casa|Ospite|Tot)\s+(\d+)-(\d+)/) ||
                    mgLabel.match(/(\d+)-(\d+)/);
    if (!mgMatch) return 0;
    let target = 'Tot', minV, maxV;
    if (mgMatch.length === 4) {
      target = mgMatch[1];
      minV = parseInt(mgMatch[2], 10);
      maxV = parseInt(mgMatch[3], 10);
    } else if (mgMatch.length === 3) {
      minV = parseInt(mgMatch[1], 10);
      maxV = parseInt(mgMatch[2], 10);
    } else { return 0; }

    let count = 0, total = 0;
    for (const [key, p] of Object.entries(mc.risultati)) {
      const [gC, gO] = key.split('-').map(Number);
      const totale = gC + gO;
      total += p;
      let dcOk = false;
      if (dcCode === '1X') dcOk = gC >= gO;
      else if (dcCode === '12') dcOk = gC !== gO;
      else if (dcCode === 'X2') dcOk = gO >= gC;
      if (!dcOk) continue;
      let mgOk = false;
      if (target === 'Casa')        mgOk = gC >= minV && gC <= maxV;
      else if (target === 'Ospite') mgOk = gO >= minV && gO <= maxV;
      else                          mgOk = totale >= minV && totale <= maxV;
      if (mgOk) count += p;
    }
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const calcolaCombinataMGCasaOspite = (mc, label) => {
    if (!mc || !mc.risultati) return 0;
    const parts = label.split('+');
    if (parts.length !== 2) return 0;
    const parseRange = (s) => {
      const m = s.match(/(\d+)-(\d+)/);
      if (!m) return null;
      return { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };
    };
    const r1 = parseRange(parts[0]);
    const r2 = parseRange(parts[1]);
    if (!r1 || !r2) return 0;

    let count = 0, total = 0;
    for (const [key, p] of Object.entries(mc.risultati)) {
      const [gC, gO] = key.split('-').map(Number);
      total += p;
      if (gC >= r1.min && gC <= r1.max && gO >= r2.min && gO <= r2.max) {
        count += p;
      }
    }
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const calcolaMultigol = (mc, label) => {
    if (!mc || !mc.risultati) return 0;
    const mgMatch = label.match(/MG\s+(Casa|Ospite|Tot)\s+(\d+)-(\d+)/) ||
                    label.match(/^(\d+)-(\d+)$/);
    if (!mgMatch) return 0;
    let target = 'Tot', minV, maxV;
    if (mgMatch.length === 4) {
      target = mgMatch[1];
      minV = parseInt(mgMatch[2], 10);
      maxV = parseInt(mgMatch[3], 10);
    } else if (mgMatch.length === 3) {
      minV = parseInt(mgMatch[1], 10);
      maxV = parseInt(mgMatch[2], 10);
    } else { return 0; }

    let count = 0, total = 0;
    for (const [key, p] of Object.entries(mc.risultati)) {
      const [gC, gO] = key.split('-').map(Number);
      const totale = gC + gO;
      total += p;
      let ok = false;
      if (target === 'Casa')        ok = gC >= minV && gC <= maxV;
      else if (target === 'Ospite') ok = gO >= minV && gO <= maxV;
      else                          ok = totale >= minV && totale <= maxV;
      if (ok) count += p;
    }
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const calcolaPctGiocata = (familyId, opt, mc, stats) => {
    if (mc && mc.risultati) {
      if (familyId === 'fisse') {
        if (opt === '1') return mc.homeWins || 0;
        if (opt === 'X') return mc.draws || 0;
        if (opt === '2') return mc.awayWins || 0;
      }
      if (familyId === 'dc') return calcDC(mc, opt);
      if (familyId === 'gg_ng') {
        if (opt === 'GG' || opt === 'Goal-Goal') return mc.gg || 0;
        if (opt === 'NG' || opt === 'No Goal')   return mc.ng || 0;
      }
      if (familyId === 'over') {
        if (opt === 'Over 1.5') return mc.over15 || 0;
        if (opt === 'Over 2.5') return mc.over25 || 0;
        if (opt === 'Over 3.5') return mc.over35 || 0;
        if (opt === 'Over 4.5') return mc.over45 || 0;
      }
      if (familyId === 'under') {
        if (opt === 'Under 1.5') return mc.under15 || 0;
        if (opt === 'Under 2.5') return mc.under25 || 0;
        if (opt === 'Under 3.5') return mc.under35 || 0;
        if (opt === 'Under 4.5') return mc.under45 || 0;
      }
      if (familyId === 'multigol') return calcolaMultigol(mc, opt);
      if (familyId === 'dc_over') {
        const parts = opt.split('+');
        if (parts.length === 2) {
          const dcCode = parts[0];
          const oPart = parts[1].replace('O', '').replace(',', '.');
          const soglia = parseFloat(oPart);
          if (!isNaN(soglia)) return calcolaCombinata(mc, dcCode, 'over', soglia);
        }
      }
      if (familyId === 'dc_under') {
        const parts = opt.split('+');
        if (parts.length === 2) {
          const dcCode = parts[0];
          const uPart = parts[1].replace('U', '').replace(',', '.');
          const soglia = parseFloat(uPart);
          if (!isNaN(soglia)) return calcolaCombinata(mc, dcCode, 'under', soglia);
        }
      }
      if (familyId === 'dc_multigol') {
        const parts = opt.split('+');
        if (parts.length === 2) {
          const dcCode = parts[0];
          const mgLabel = parts[1];
          return calcolaCombinataDCMultigol(mc, dcCode, mgLabel);
        }
      }
      if (familyId === 'mg_casa_ospite') return calcolaCombinataMGCasaOspite(mc, opt);
    }
    if (typeof window.getGiocataPct === 'function' && stats) {
      return window.getGiocataPct(opt, stats, stats.homeMG, stats.awayMG, stats.mgTot) || 0;
    }
    return 0;
  };

  // ============================================================
  // GET DIXON PCT
  // ============================================================
  window.getDixonPct = function(familyId, giocata, match, allMatches) {
    if (!match || !allMatches || allMatches.length === 0) return 0;
    try {
      let mc = _mcCache.get(match.id);
      if (!mc) {
        mc = simulateMatches(match.casa, match.ospiti, match.campionato, allMatches);
        _mcCache.set(match.id, mc);
      }
      return calcolaPctGiocata(familyId, giocata, mc, null);
    } catch (e) {
      console.warn('Errore in window.getDixonPct:', e);
      return 0;
    }
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
        const result = simulateMatches(homeTeam, awayTeam, match.campionato, allMatches);
        _mcCache.set(match.id, result);
        setMc(result);
      } catch (e) {
        console.warn('Errore Dixon-Coles:', e);
      }
      setLoading(false);
    };

    useEffect(() => {
      if (!match) return;
      const cached = _mcCache.get(match.id);
      if (cached) { setMc(cached); return; }

      const legacy = localStorage.getItem(`ft_mc_${match.id}`);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed && parsed.lambdaCasa && parsed.risultati) {
            _mcCache.set(match.id, parsed);
            setMc(parsed);
            try { localStorage.removeItem(`ft_mc_${match.id}`); } catch (e) {}
            return;
          }
        } catch (e) {}
      }
      if (match && allMatches.length > 0) runSimulation(match.casa, match.ospiti);
    }, [match]);

    const refresh = () => {
      if (match) {
        _mcCache.delete(match.id);
        try { localStorage.removeItem(`ft_mc_${match.id}`); } catch (e) {}
        setMc(null);
        runSimulation(match.casa, match.ospiti);
      }
    };

    const calcPctFromSim = (familyId, giocata) => {
      return calcolaPctGiocata(familyId, giocata, mc, null);
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
      return <div className="ai-analysis-loading">⏳ Calcolo matrice Dixon-Coles in corso...</div>;
    }

    if (!mc) {
      return (
        <div className="card">
          <p style={{ color: 'var(--text-dim)', marginBottom: '8px' }}>⏳ Caricamento...</p>
          <button className="btn" onClick={() => runSimulation(match.casa, match.ospiti)}>📊 Avvia Analisi</button>
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
            📊 Modello Dixon-Coles
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }} title="Matrice esatta su 9x9 risultati">
              🎯 λ {mc.lambdaCasa} - {mc.lambdaOspite}
            </span>
            <button onClick={refresh} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '13px' }}>🔄 Rigenera</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'var(--card)', padding: '12px', borderRadius: '8px', border: '2px solid var(--neon-cyan)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>1 - X - 2</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              <span style={{ color: mc.homeWins > mc.awayWins ? 'var(--neon-green)' : 'var(--text)' }}>{mc.homeWins}%</span>
              <span style={{ color: 'var(--neon-gold)', margin: '0 4px' }}>|</span>
              <span style={{ color: mc.draws > mc.homeWins && mc.draws > mc.awayWins ? 'var(--neon-gold)' : 'var(--text)' }}>{mc.draws}%</span>
              <span style={{ color: 'var(--neon-gold)', margin: '0 4px' }}>|</span>
              <span style={{ color: mc.awayWins > mc.homeWins ? 'var(--neon-red)' : 'var(--text)' }}>{mc.awayWins}%</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>12 + Under 4.5</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              <span className={`giocata-pct ${getPercentualeClasse(mc.pct12Under45)}`}>{mc.pct12Under45}%</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Risultato più probabile</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--neon-gold)' }}>
              {mc.maxResult} <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>({mc.maxResultPct}%)</span>
            </div>
          </div>
        </div>

        {mc.assenze && (mc.assenze.impattoHome.attacco > 0 || mc.assenze.impattoHome.difesa > 0
                       || mc.assenze.impattoAway.attacco > 0 || mc.assenze.impattoAway.difesa > 0) && (
          <div style={{
            marginTop: '8px', padding: '8px 12px', borderRadius: '6px',
            background: 'rgba(255, 0, 229, 0.10)',
            border: '1px solid rgba(255, 0, 229, 0.4)',
            fontSize: '11px',
          }}>
            <div style={{ fontWeight: 900, color: 'var(--neon-magenta)', marginBottom: '4px' }}>
              🏥 Impatto assenze sui λ
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>
                🏠 {match.casa}:{' '}
                <b style={{ color: '#ff6b35' }}>-{mc.assenze.impattoHome.attacco}% att</b>{' '}
                <b style={{ color: '#3498db' }}>-{mc.assenze.impattoHome.difesa}% dif</b>
              </span>
              <span>
                ✈️ {match.ospiti}:{' '}
                <b style={{ color: '#ff6b35' }}>-{mc.assenze.impattoAway.attacco}% att</b>{' '}
                <b style={{ color: '#3498db' }}>-{mc.assenze.impattoAway.difesa}% dif</b>
              </span>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '8px', marginTop: '8px', fontSize: '11px', color: 'var(--text-dim)'
        }}>
          <div style={{ background: 'var(--surface)', padding: '6px 10px', borderRadius: '6px', textAlign: 'center' }}>
            🏠 Casa: att {mc.homeAttacco} / dif {mc.homeDifesa}
          </div>
          <div style={{ background: 'var(--surface)', padding: '6px 10px', borderRadius: '6px', textAlign: 'center' }}>
            ✈️ Ospite: att {mc.awayAttacco} / dif {mc.awayDifesa}
          </div>
          <div style={{ background: 'var(--surface)', padding: '6px 10px', borderRadius: '6px', textAlign: 'center' }}>
            📈 Media camp: {mc.leagueAvgHome} / {mc.leagueAvgAway}
          </div>
          <div style={{ background: 'var(--surface)', padding: '6px 10px', borderRadius: '6px', textAlign: 'center' }}>
            📊 Campione: {mc.partiteAnalizzate} partite
          </div>
        </div>

        {(mc.weakHome || mc.weakAway) && (
          <div style={{
            marginTop: '8px', padding: '8px 12px', borderRadius: '6px',
            background: 'rgba(255,165,0,0.15)', border: '1px solid var(--neon-gold)',
            fontSize: '11px', color: 'var(--neon-gold)'
          }}>
            ⚠️ {mc.weakHome ? match.casa : match.ospiti} ha meno di 3 partite: previsione poco affidabile
          </div>
        )}

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
                border: isBomb ? '2px solid var(--neon-gold)' : (isGGNG ? '2px solid #e74c3c' : '1px solid var(--border)')
              }}>
                <div style={{ fontSize: '11px', color: isGGNG ? '#e74c3c' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
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
  // PANNELLO ASSENZE E INFORTUNI
  // ============================================================
  const AssenzePanel = ({ squadra, teamColor }) => {
    const [, setVersion] = useState(0);

    useEffect(() => {
      const h = () => setVersion(v => v + 1);
      window.addEventListener('assenze-updated', h);
      window.addEventListener('stats-giocatori-pronte', h);
      return () => {
        window.removeEventListener('assenze-updated', h);
        window.removeEventListener('stats-giocatori-pronte', h);
      };
    }, []);

    const assenze = window.AssenzeDB?.getAssenze(squadra) || [];
    const pesi = window.AssenzeDB?.calcolaPesi(squadra);
    const aggiornato = window.AssenzeDB?.aggiornato;

    const getImportanzaColor = (imp) => {
      if (imp === 'chiave') return '#ff00e5';
      if (imp === 'rotazione') return 'var(--neon-gold)';
      return 'var(--text-dim)';
    };

    const getRuoloBadge = (r) => {
      const map = {
        P: { label: 'POR', color: '#e67e22' },
        D: { label: 'DIF', color: '#3498db' },
        C: { label: 'CEN', color: '#2ecc71' },
        A: { label: 'ATT', color: '#e74c3c' },
      };
      return map[r] || { label: r || '?', color: '#95a5a6' };
    };

    return (
      <div className="card" style={{ padding: '14px', borderTop: `3px solid ${teamColor || 'var(--neon-cyan)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: teamColor || 'var(--neon-cyan)' }}>
            🏥 {squadra}
          </h4>
          {aggiornato && (
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              agg. {aggiornato.split('-').reverse().join('/')}
            </span>
          )}
        </div>

        {assenze.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--neon-green)', fontSize: '13px' }}>
            ✅ Nessuna assenza
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
              {assenze.map((a, idx) => {
                const rb = getRuoloBadge(a.ruolo);
                const col = getImportanzaColor(a.importanza);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 8px', borderRadius: '6px',
                      background: 'var(--surface)',
                      borderLeft: `3px solid ${col}`,
                      fontSize: '11px',
                    }}
                  >
                    <span style={{
                      background: rb.color, color: '#000', fontWeight: 900,
                      padding: '1px 5px', borderRadius: '3px', fontSize: '9px',
                      minWidth: '26px', textAlign: 'center',
                    }}>{rb.label}</span>
                    <span style={{ flex: 1, fontWeight: 'bold', color: 'var(--text)' }}>
                      {a.nome}
                    </span>
                    <span style={{ fontSize: '9px', color: col, fontWeight: 900, textTransform: 'uppercase' }}>
                      {a.importanza}
                    </span>
                  </div>
                );
              })}
            </div>

            {pesi && (pesi.pesoAttacco > 0 || pesi.pesoDifesa > 0) && (
              <div style={{
                background: 'rgba(255, 0, 229, 0.08)',
                border: '1px solid rgba(255, 0, 229, 0.4)',
                borderRadius: '6px', padding: '8px',
                fontSize: '10px', color: 'var(--text-dim)',
              }}>
                <div style={{ fontWeight: 900, color: 'var(--neon-magenta)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  📉 Impatto su Dixon-Coles
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span>⚔️ Attacco: <b style={{ color: '#ff6b35' }}>-{Math.round(pesi.pesoAttacco * 100)}%</b></span>
                  <span>🛡️ Difesa: <b style={{ color: '#3498db' }}>-{Math.round(pesi.pesoDifesa * 100)}%</b></span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ============================================================
  // PANNELLO FORMAZIONI (con Mv/Fm medi)
  // ============================================================
  const FormazionePanel = ({ nomeSquadra, formazione, colore }) => {
    const MvKeys = ['Mv', 'mv', 'media voto', 'Media Voto'];
    const FmKeys = ['Fm', 'fm', 'fantamedia', 'FantaMedia'];

    const getGiocatoreStats = (nomeGiocatore) => {
      const g = window.AssenzeDB?.getGiocatore(nomeGiocatore);
      if (!g) return null;
      return g;
    };

    // Ritorna {mv, fm, count, countMv, countFm}
    const calcolaMedie = (listaNomi) => {
      let sumMv = 0, sumFm = 0;
      let countMv = 0, countFm = 0;
      listaNomi.forEach(nome => {
        const g = getGiocatoreStats(nome);
        if (!g) return;
        const mv = parseFloat(g.Mv ?? g.Mv);
        const fm = parseFloat(g.Fm ?? g.Fm);
        if (!isNaN(mv) && mv > 0) { sumMv += mv; countMv++; }
        if (!isNaN(fm) && fm > 0) { sumFm += fm; countFm++; }
      });
      return {
        mv: countMv > 0 ? sumMv / countMv : null,
        fm: countFm > 0 ? sumFm / countFm : null,
        countMv, countFm,
        tot: listaNomi.length,
      };
    };

    const titolari = formazione?.titolari || [];
    const panchina = formazione?.panchina || [];
    const mod = formazione?.modulo;

    const medieTitolari = calcolaMedie(titolari);
    const mediePanchina = calcolaMedie(panchina);

    const fmt = (v) => (v === null || v === undefined) ? '—' : v.toFixed(2);

    const renderBadgeMedia = (label, medie, colorBg) => (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 6px', borderRadius: '4px',
        background: colorBg, fontSize: '10px', fontWeight: 'bold',
      }}>
        <span style={{ opacity: 0.8 }}>{label}</span>
        <span style={{ color: '#fff' }}>{fmt(medie.mv)}</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span style={{ color: '#fbbf24' }}>{fmt(medie.fm)}</span>
      </div>
    );

    const renderListaGiocatori = (lista, bg, borderColor) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
        {lista.map((n, i) => {
          const g = getGiocatoreStats(n);
          const mv = g ? parseFloat(g.Mv ?? g.Mv) : NaN;
          const fm = g ? parseFloat(g.Fm ?? g.Fm) : NaN;
          const mvTxt = (!isNaN(mv) && mv > 0) ? mv.toFixed(1) : '—';
          const fmTxt = (!isNaN(fm) && fm > 0) ? fm.toFixed(1) : '—';
          return (
            <span
              key={i}
              title={g ? `${n} · Mv ${mvTxt} · Fm ${fmTxt} (${g.Pv || 0} pres.)` : `${n} (stats non disponibili)`}
              style={{
                padding: '3px 6px',
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                fontSize: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>{n}</span>
              <span style={{ fontSize: '9px', color: '#4ade80', fontWeight: 'bold' }}>{mvTxt}</span>
              <span style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 'bold' }}>{fmTxt}</span>
            </span>
          );
        })}
      </div>
    );

    return (
      <div style={{
        background: 'var(--surface)', borderRadius: '8px',
        padding: '10px', fontSize: '11px',
        borderTop: `3px solid ${colore || 'var(--neon-cyan)'}`,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px',
        }}>
          <div style={{ fontWeight: 900, color: colore || 'var(--neon-cyan)', fontSize: '13px' }}>
            {nomeSquadra} {mod ? `· ${mod}` : ''}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {renderBadgeMedia('TIT', medieTitolari, 'rgba(0,255,136,0.18)')}
            {renderBadgeMedia('PAN', mediePanchina, 'rgba(255,255,255,0.08)')}
          </div>
        </div>

        <div style={{ color: 'var(--neon-green)', marginBottom: '4px', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}>
          Titolari ({titolari.length}) — media Mv {fmt(medieTitolari.mv)} · Fm {fmt(medieTitolari.fm)}
        </div>
        {renderListaGiocatori(titolari, 'rgba(0,255,136,0.12)', 'rgba(0,255,136,0.25)')}

        <div style={{ color: 'var(--text-dim)', marginBottom: '4px', marginTop: '8px', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}>
          Panchina ({panchina.length}) — media Mv {fmt(mediePanchina.mv)} · Fm {fmt(mediePanchina.fm)}
        </div>
        {renderListaGiocatori(panchina, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)')}

        <div style={{
          marginTop: '8px', paddingTop: '6px',
          borderTop: '1px dashed var(--border)',
          fontSize: '10px', color: 'var(--text-dim)',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px',
        }}>
          <span>
            📊 Titolari con Mv: {medieTitolari.countMv}/{medieTitolari.tot}
          </span>
          <span>
            📊 Panchina con Mv: {mediePanchina.countMv}/{mediePanchina.tot}
          </span>
        </div>
      </div>
    );
  };

  // ============================================================
  // MATCH DETAIL
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
          <span style={{ color: 'var(--text-dim)', fontSize: '20px' }}>VS</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <TeamLogo teamName={match.ospiti} championship={match.campionato} size={50} />
            <span style={{ marginTop: '8px', color: getChampColor(match.campionato) }}>{match.ospiti}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '8px 0' }}>
          <div>
            <h4 style={{ color: getChampColor(match.campionato) }}>{match.casa}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Forma:</span>
              <div className="form-squares" style={{ display: 'inline-flex' }}>{renderFormSquares(homeForm.form)}</div>
            </div>
            <div>Media Gol: {renderXgValue(homeForm.mediaGolFatti || 0)}</div>
          </div>
          <div>
            <h4 style={{ color: getChampColor(match.campionato) }}>{match.ospiti}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Forma:</span>
              <div className="form-squares" style={{ display: 'inline-flex' }}>{renderFormSquares(awayForm.form)}</div>
            </div>
            <div>Media Gol: {renderXgValue(awayForm.mediaGolFatti || 0)}</div>
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
  // TUTTE LE FAMIGLIE PANEL
  // ============================================================
  const TutteLeFamigliePanel = ({ match, allMatches }) => {
    const getPercentualeClasse = window.getPercentualeClasse;
    const FAMIGLIE = window.FAMIGLIE_GIOCATE;
    const stats = window.computeMatchStats(match, allMatches);
    if (!stats || stats.error) return null;

    const ORDINE = ['fisse', 'dc', 'gg_ng', 'over', 'under', 'multigol', 'dc_over', 'dc_under', 'mg_casa_ospite', 'dc_multigol'];
    const hasQM = !!(window.QuoteManager && typeof window.QuoteManager.analizzaGiocata === 'function');

    const sezioni = ORDINE
      .filter(familyId => FAMIGLIE[familyId])
      .map(familyId => {
        const family = FAMIGLIE[familyId];
        const opzioni = family.options.map(opt => {
          const pct = calcolaPctGiocata(familyId, opt, null, stats);
          let quota = null, isValue = false;
          if (hasQM) {
            try {
              const q = window.QuoteManager.analizzaGiocata(match, familyId, opt, pct);
              if (q && q.quotaBook) { quota = q.quotaBook; isValue = q.isValue; }
            } catch (e) {}
          }
          return { opt, pct, quota, isValue };
        });
        return { familyId, family, opzioni };
      });

    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '8px' }}>
          📊 Tutte le Giocate (Statistiche Reali) — {match.casa} vs {match.ospiti}
        </h3>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>
          Basato sulle medie storiche reali delle due squadre
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {sezioni.map(({ familyId, family, opzioni }) => (
            <div key={familyId} style={{
              background: 'var(--surface)', borderRadius: '10px',
              border: familyId === 'gg_ng' ? '2px solid #e74c3c' : '1px solid var(--border)',
              padding: '12px',
            }}>
              <h4 style={{
                color: familyId === 'gg_ng' ? '#e74c3c' : 'var(--neon-cyan)',
                marginBottom: '8px', fontSize: '14px',
              }}>
                {family.icon} {family.label}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {opzioni.map(({ opt, pct, quota, isValue }) => (
                  <div key={opt} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 8px', borderRadius: '6px',
                    background: 'var(--card)', fontSize: '12px',
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
                        <span style={{
                          fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                          background: isValue ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 215, 0, 0.15)',
                          color: isValue ? 'var(--neon-green)' : 'var(--neon-gold)',
                          fontWeight: 'bold',
                        }}>💰 {quota.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================
  // TUTTE LE FAMIGLIE PANEL DIXON
  // ============================================================
  const TutteLeFamigliePanelDixon = ({ match, allMatches }) => {
    const getPercentualeClasse = window.getPercentualeClasse;
    const FAMIGLIE = window.FAMIGLIE_GIOCATE;

    const ORDINE = ['fisse', 'dc', 'gg_ng', 'over', 'under', 'multigol', 'dc_over', 'dc_under', 'mg_casa_ospite', 'dc_multigol'];
    const hasQM = !!(window.QuoteManager && typeof window.QuoteManager.analizzaGiocata === 'function');

    let mcCache = _mcCache.get(match.id);
    if (!mcCache) {
      try {
        mcCache = simulateMatches(match.casa, match.ospiti, match.campionato, allMatches);
        _mcCache.set(match.id, mcCache);
      } catch (e) {
        console.warn('Dixon-Coles fallito', e);
        mcCache = null;
      }
    }

    if (!mcCache) {
      return (
        <div className="card" style={{ marginTop: '20px' }}>
          <p style={{ color: 'var(--text-dim)' }}>⚠️ Impossibile calcolare la matrice Dixon-Coles.</p>
        </div>
      );
    }

    const sezioni = ORDINE
      .filter(familyId => FAMIGLIE[familyId])
      .map(familyId => {
        const family = FAMIGLIE[familyId];
        const opzioni = family.options.map(opt => {
          const pct = calcolaPctGiocata(familyId, opt, mcCache, null);
          let quota = null, isValue = false;
          if (hasQM) {
            try {
              const q = window.QuoteManager.analizzaGiocata(match, familyId, opt, pct);
              if (q && q.quotaBook) { quota = q.quotaBook; isValue = q.isValue; }
            } catch (e) {}
          }
          return { opt, pct, quota, isValue };
        });
        return { familyId, family, opzioni };
      });

    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ color: 'var(--neon-magenta, #ff00e5)', marginBottom: '8px' }}>
          🧮 Tutte le Giocate (Dixon-Coles) — {match.casa} vs {match.ospiti}
        </h3>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>
          Basato sulla matrice esatta λ {mcCache.lambdaCasa} - {mcCache.lambdaOspite} con correzione τ
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {sezioni.map(({ familyId, family, opzioni }) => (
            <div key={familyId} style={{
              background: 'var(--surface)', borderRadius: '10px',
              border: familyId === 'gg_ng' ? '2px solid #e74c3c' : '2px solid rgba(255,0,229,0.3)',
              padding: '12px',
            }}>
              <h4 style={{
                color: familyId === 'gg_ng' ? '#e74c3c' : 'var(--neon-magenta, #ff00e5)',
                marginBottom: '8px', fontSize: '14px',
              }}>
                {family.icon} {family.label}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {opzioni.map(({ opt, pct, quota, isValue }) => (
                  <div key={opt} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 8px', borderRadius: '6px',
                    background: 'var(--card)', fontSize: '12px',
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
                        <span style={{
                          fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                          background: isValue ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 215, 0, 0.15)',
                          color: isValue ? 'var(--neon-green)' : 'var(--neon-gold)',
                          fontWeight: 'bold',
                        }}>💰 {quota.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
    const calcFormAndStats = window.calcFormAndStats;

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
      .map(([name, stats], index) => {
        const hasPlayed = stats.pg > 0;
        const formData = hasPlayed ? calcFormAndStats(matches, name) : { form: '-----' };
        const multigol = hasPlayed ? getMultigolRange(name, matches) : { label: 'N/A', pct: 0, range: 'default' };
        return {
          pos: index + 1,
          name,
          ...stats,
          form: formData.form,
          multigolLabel: multigol.label,
          multigolPct: multigol.pct,
          multigolRange: multigol.range,
        };
      });

    const champToShow = filterChampionship && filterChampionship !== 'Tutti' ? filterChampionship : null;

    const renderFormSquares = (formStr) => {
      if (!formStr) return <span>N/D</span>;
      return (
        <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
          {[...formStr].map((letter, idx) => (
            <span key={idx} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '20px', height: '20px', borderRadius: '4px',
              background: letter === 'V' ? 'var(--neon-green)' :
                         letter === 'P' ? 'var(--neon-gold)' :
                         letter === 'S' ? 'var(--neon-red)' : 'var(--text-dim)',
              color: '#000', fontWeight: 900, fontSize: '11px',
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: letter === 'V' ? '0 0 8px var(--neon-green)' :
                         letter === 'P' ? '0 0 8px var(--neon-gold)' :
                         letter === 'S' ? '0 0 8px var(--neon-red)' : 'none',
            }}>{letter}</span>
          ))}
        </div>
      );
    };

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
                <th className="col-pos">#</th>
                <th className="col-team">Squadra</th>
                <th className="col-num">PG</th>
                <th className="col-num">Punti</th>
                <th className="col-num">V</th>
                <th className="col-num">P</th>
                <th className="col-num">S</th>
                <th className="col-num">GF</th>
                <th className="col-num">GS</th>
                <th className="col-num">DR</th>
                <th className="col-form">Forma</th>
                <th className="col-mg">Fascia Gol</th>
                <th className="col-pct">%</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const isHighlighted = highlightTeams.includes(row.name);
                const hasPlayed = row.pg > 0;
                return (
                  <tr
                    key={row.name}
                    className={isHighlighted ? 'highlighted-row' : ''}
                    style={{ opacity: hasPlayed ? 1 : 0.5 }}
                  >
                    <td className="pos">{row.pos}</td>
                    <td className="team-cell">
                      <div className="team-name-cell">
                        <TeamLogo teamName={row.name} championship={champToShow || 'Tutti'} size={20} />
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
                    <td className="num dr-cell" style={{ color: row.dr > 0 ? 'var(--neon-green)' : (row.dr < 0 ? 'var(--neon-red)' : 'var(--text-dim)') }}>
                      {row.dr > 0 ? '+' : ''}{row.dr}
                    </td>
                    <td className="num form-cell">
                      {hasPlayed ? renderFormSquares(row.form) : <span>—</span>}
                    </td>
                    <td className="num mg-cell">
                      {hasPlayed ? (
                        <span className={`multigol-badge range-${row.multigolRange}`}>
                          {row.multigolLabel}
                        </span>
                      ) : <span>—</span>}
                    </td>
                    <td className="num pct-cell">{hasPlayed ? row.multigolPct + '%' : '—'}</td>
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
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>Nessuna partita</div>
        </div>
      );
    }

    const totalMatches = data.reduce((sum, d) => sum + d.count, 0);
    const getResultColor = (tipo) => tipo === 'V' ? 'var(--neon-green)' : (tipo === 'P' ? 'var(--neon-gold)' : 'var(--neon-red)');

    return (
      <div className="card" style={{ height: '100%', minHeight: '280px', overflow: 'hidden' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>📊 Risultati Frequenti - {teamName}</h4>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>📅 {totalMatches} partite giocate</div>
        <div className="freq-table-wrap">
          <table className="freq-table">
            <thead><tr><th>#</th><th>Risultato</th><th>Freq.</th><th>%</th></tr></thead>
            <tbody>
              {data.map((d, idx) => {
                const pct = Math.round((d.count / totalMatches) * 100);
                const color = getResultColor(d.tipo);
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold', color: 'var(--neon-gold)' }}>#{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '4px', backgroundColor: color }} />
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
    const teamMatches = allMatches.filter(m => m.stato === 'Giocata' && (m.casa === teamName || m.ospiti === teamName));

    if (teamMatches.length === 0) {
      return (
        <div className="card" style={{ padding: '12px', height: '100%', minHeight: '150px' }}>
          <h4 style={{ fontSize: '13px', marginBottom: '6px' }}>⚽ Frequenza Gol - {teamName}</h4>
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '12px 0' }}>Nessuna partita</div>
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
    const colorMap = { 0: 'var(--neon-red)', 1: 'var(--neon-gold)', 2: 'var(--neon-green)', 3: 'var(--neon-green)', 4: 'var(--neon-cyan)', '5+': 'var(--neon-magenta)' };

    return (
      <div className="card" style={{ padding: '12px', height: '100%', minHeight: '150px' }}>
        <h4 style={{ fontSize: '13px', marginBottom: '6px' }}>⚽ Frequenza Gol - {teamName}</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
          <span>📊 {total} partite</span>
          <span>🎯 Media: <span style={{ fontSize: '18px', color: 'var(--neon-gold)' }}>{mediaGol}</span> gol/partita</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginTop: '4px' }}>
          {Object.entries(freq).map(([key, count]) => {
            const pct = Math.round((count / total) * 100);
            const color = colorMap[key] || 'var(--text-dim)';
            return (
              <div key={key} style={{ textAlign: 'center', background: 'var(--surface)', padding: '4px 2px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{key}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: color }}>{pct}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>({count})</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // INDICE AFFIDABILITÀ
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: affidabilita > 70 ? 'var(--neon-green)' : 'var(--neon-gold)' }}>
              {Math.round(affidabilita)}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Affidabilità</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: stabilita > 60 ? 'var(--neon-green)' : 'var(--neon-gold)' }}>
              {Math.round(stabilita)}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Stabilità</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Partite</div>
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
          <p style={{ color: 'var(--text-dim)' }}>Nessuna partita giocata per {teamName}.</p>
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
    const getResultColor = (r) => r === 'win' ? 'var(--neon-green)' : (r === 'draw' ? 'var(--neon-gold)' : 'var(--neon-red)');

    return (
      <div className="card" style={{ padding: '12px' }}>
        <h4 style={{ color: getChampColor(teamName), marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamLogo teamName={teamName} championship={championship} size={20} />
          {teamName}
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: 'auto' }}>
            {teamMatches.length} partite
          </span>
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {teamMatches.map(m => {
            const result = getResult(m, teamName);
            const opponent = getOpponent(m, teamName);
            const rc = getResultColor(result);
            const isHome = m.casa === teamName;
            let rl = result === 'win' ? 'V' : (result === 'draw' ? 'P' : 'S');

            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', background: 'var(--surface)', borderRadius: '6px',
                border: `2px solid ${rc}`, borderLeft: `6px solid ${rc}`,
                gap: '8px', flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '180px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', minWidth: '70px' }}>{formatDateEU(m.data)}</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>
                    {isHome ? (
                      <>
                        <span style={{ color: 'var(--neon-cyan)' }}>{teamName}</span>
                        <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>-</span>
                        <span>{opponent}</span>
                      </>
                    ) : (
                      <>
                        <span>{opponent}</span>
                        <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>-</span>
                        <span style={{ color: 'var(--neon-cyan)' }}>{teamName}</span>
                      </>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-block', backgroundColor: rc, color: '#000', fontWeight: 'bold',
                    padding: '2px 14px', borderRadius: '6px', minWidth: '50px', textAlign: 'center',
                    fontSize: '16px'
                  }}>
                    {m.golCasa} - {m.golOspite}
                  </span>
                  <span style={{
                    fontSize: '14px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px',
                    background: rc, color: '#000', minWidth: '24px', textAlign: 'center'
                  }}>{rl}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // WEATHER
  // ============================================================
  const WeatherProfessionale = ({ weatherData, city, matchDate }) => {
    if (!weatherData) {
      return (
        <div className="weather-professionale" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🌤️</div>
          <p>Dati meteo non disponibili per {city || 'questa località'}</p>
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

    const icon = getWeatherIcon(weatherData.weather, weatherData.rain);

    return (
      <div className="weather-professionale">
        <div className="weather-header">
          <div className="weather-icon-main">{icon}</div>
          <div className="weather-info-main">
            <div className="weather-temp-main">{Math.round(weatherData.temp)}°C</div>
            <div className="weather-desc-main">{weatherData.weather || 'N/A'}</div>
            <div className="weather-city-main">📍 {city || 'N/D'} • 📅 {weatherData.forecast_date || matchDate || 'N/A'}</div>
          </div>
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
      () => window.FiltriCampionati.filtaPartitePerCampionato(matches),
      [matches, filtroCampionati]
    );

    useEffect(() => {
      clearStatsCache();
    }, [matchesFiltrati.length]);

    const selectedMatch = matchesFiltrati.find(m => m.id === selectedMatchId);

    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          padding: '10px 14px', marginBottom: '14px',
          background: 'var(--surface)', borderRadius: '8px',
          border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-dim)'
        }}>
          <span>🏆 <b style={{ color: 'var(--neon-cyan)' }}>{campionatiAttivi.length}</b> campionati attivi</span>
          <span>•</span>
          <span>📊 <b style={{ color: 'var(--neon-cyan)' }}>{matchesFiltrati.length}</b> partite totali</span>
        </div>

        <div className="sub-tabs">
          <button className={statsSubTab === 'Classifica' ? 'active' : ''} onClick={() => setStatsSubTab('Classifica')}>📊 Classifica</button>
          <button className={statsSubTab === 'Scontri' ? 'active' : ''} onClick={() => setStatsSubTab('Scontri')}>⚔️ Scontri</button>
          <button className={statsSubTab === 'RiepilogoAI' ? 'active' : ''} onClick={() => setStatsSubTab('RiepilogoAI')}>🤖 Riepilogo AI</button>
          <button className={statsSubTab === 'DixonColes' ? 'active' : ''} onClick={() => setStatsSubTab('DixonColes')}>🧮 Dixon-Coles</button>
          <button className={statsSubTab === 'Assenze' ? 'active' : ''} onClick={() => setStatsSubTab('Assenze')}>🏥 Formazioni e Assenze</button>
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

        {statsSubTab === 'DixonColes' && (
          <div>
            {selectedMatch ? (
              <div>
                <AIAnalysis match={selectedMatch} allMatches={matchesFiltrati} selectedFamiglie={selectedFamiglie} />
                <TutteLeFamigliePanelDixon match={selectedMatch} allMatches={matchesFiltrati} />
              </div>
            ) : (
              <div className="stats-placeholder"><p>👈 Seleziona una partita per l'analisi Dixon-Coles.</p></div>
            )}
          </div>
        )}

        {statsSubTab === 'Assenze' && (
          <div>
            {selectedMatch ? (
              <div>
                <div style={{
                  padding: '10px 14px', marginBottom: '14px',
                  background: 'linear-gradient(135deg, rgba(255, 0, 229, 0.08), rgba(0, 245, 255, 0.05))',
                  borderRadius: '10px', border: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--text-dim)',
                }}>
                  🏥 <b style={{ color: 'var(--neon-magenta)' }}>Formazioni e Assenze</b> —{' '}
                  {selectedMatch.casa} vs {selectedMatch.ospiti}
                  <br />
                  <span style={{ fontSize: '11px' }}>
                    ℹ️ Le assenze dei giocatori chiave modificano i λ del modello Dixon-Coles (riducendo attacco e difesa)
                  </span>
                </div>

                {/* ─── Formazioni titolari / panchina con medie ─── */}
                {(() => {
                  const fHome = window.AssenzeDB?.getFormazione(selectedMatch.casa);
                  const fAway = window.AssenzeDB?.getFormazione(selectedMatch.ospiti);
                  if (!fHome && !fAway) {
                    return (
                      <div style={{
                        background: 'var(--surface)', borderRadius: '8px',
                        padding: '12px', fontSize: '12px',
                        color: 'var(--text-dim)', marginBottom: '14px',
                      }}>
                        ℹ️ Formazioni non ancora caricate. Esegui il parser e aggiorna <code>data/formazioni_seriea.json</code>.
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      <FormazionePanel
                        nomeSquadra={selectedMatch.casa}
                        formazione={fHome}
                        colore={getChampColor(selectedMatch.campionato)}
                      />
                      <FormazionePanel
                        nomeSquadra={selectedMatch.ospiti}
                        formazione={fAway}
                        colore={getChampColor(selectedMatch.campionato)}
                      />
                    </div>
                  );
                })()}

                {/* ─── Pannelli assenze esistenti ─── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <AssenzePanel squadra={selectedMatch.casa} teamColor={getChampColor(selectedMatch.campionato)} />
                  <AssenzePanel squadra={selectedMatch.ospiti} teamColor={getChampColor(selectedMatch.campionato)} />
                </div>
              </div>
            ) : (
              <div className="stats-placeholder"><p>👈 Seleziona una partita per vedere formazioni e assenze.</p></div>
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
                    return <p style={{ color: 'var(--text-dim)' }}>Giornata non numerica.</p>;
                  }
                  const prevMatches = matchesFiltrati.filter(m =>
                    m.campionato === selectedMatch.campionato &&
                    m.round === String(prevRound) &&
                    m.stato === 'Giocata'
                  );
                  if (prevMatches.length === 0) {
                    return (
                      <div className="card">
                        <p style={{ color: 'var(--text-dim)' }}>⚠️ Nessuna partita per la giornata {prevRound}.</p>
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
                          <div key={m.id} className="match-tab" style={{ borderLeftColor: getChampColor(m.campionato) }}>
                            <div className="tab-header" style={{ background: getChampColor(m.campionato) }}>{m.campionato}</div>
                            <div className="match-info">{m.casa} vs {m.ospiti}</div>
                            <div className="match-info">📅 {window.formatDateEU(m.data)}</div>
                            <div className="teams-row">
                              <div className="team">
                                <window.TeamLogo teamName={m.casa} championship={m.campionato} size={40} />
                                <div className="team-name" style={{ fontSize: '14px' }}>{m.casa}</div>
                              </div>
                              <div className="score" style={{
                                fontSize: '24px', fontWeight: 'bold', padding: '0 12px',
                                color: m.golCasa > m.golOspite ? 'var(--neon-green)' : (m.golCasa === m.golOspite ? 'var(--neon-gold)' : 'var(--neon-red)')
                              }}>
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
  // EXPORT GLOBALI
  // ============================================================
  window.StatisticheComponent = StatisticheComponent;
  window.AIAnalysis = AIAnalysis;
  window.AssenzePanel = AssenzePanel;
  window.FormazionePanel = FormazionePanel;
  window.WeatherProfessionale = WeatherProfessionale;
  window.IndiceAffidabilita = IndiceAffidabilita;
  window.RisultatiFrequenti = RisultatiFrequenti;
  window.FrequenzaGol = FrequenzaGol;
  window.Standings = Standings;
  window.TeamMatchesHistory = TeamMatchesHistory;
  window.TutteLeFamigliePanel = TutteLeFamigliePanel;
  window.TutteLeFamigliePanelDixon = TutteLeFamigliePanelDixon;
  window.simulateMatches = simulateMatches;
  window.clearStatsCache = clearStatsCache;

  console.log('✅ statistiche.js v15 - Formazioni con Mv/Fm medi');
})();