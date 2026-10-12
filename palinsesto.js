// ============================================================
// palinsesto.js - Modulo Palinsesto (FUTURISTIC + CHAMP BAR GRIGLIA 3 RIGHE)
// ✅ PC: Griglia a colonne per nazione — 3 righe: maggiori / minori / extra
// ✅ PC: Tutte le colonne della stessa larghezza (no sfasamenti)
// ✅ PC: "Tutti i Campionati" a sinistra, span verticale su 3 righe
// ✅ Mobile: lista campionati scrollabile → click → giornata
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

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

  const getQuotaInfo = (match, familyId, giocata, pctTua) => {
    if (!window.QuoteManager || typeof window.QuoteManager.analizzaGiocata !== 'function') return null;
    try { return window.QuoteManager.analizzaGiocata(match, familyId, giocata, pctTua); }
    catch (e) { return null; }
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
  // STRUTTURA NAZIONI → CAMPIONATI (3 righe per nazione)
  // Riga 1: maggiore | Riga 2: minore | Riga 3: extra
  // ============================================================
  const NAZIONI_CAMPIONATI = [
    {
      nazione: 'ITALIA',
      maggiore: 'Serie A',
      minore: 'Serie B',
      extra: ['Serie C - Girone A', 'Serie C - Girone B', 'Serie C - Girone C'],
    },
    {
      nazione: 'FRANCIA',
      maggiore: 'Ligue 1',
      minore: 'Ligue 2',
      extra: [],
    },
    {
      nazione: 'SPAGNA',
      maggiore: 'La Liga',
      minore: 'Segunda División',
      extra: [],
    },
    {
      nazione: 'INGHILTERRA',
      maggiore: 'Premier League',
      minore: 'EFL Championship',
      extra: [],
    },
    {
      nazione: 'GERMANIA',
      maggiore: 'Bundesliga',
      minore: '2. Bundesliga',
      extra: [],
    },
    {
      nazione: 'OLANDA',
      maggiore: 'Eredivisie',
      minore: 'Eerste Divisie',
      extra: [],
    },
    {
      nazione: 'PORTOGALLO',
      maggiore: 'Primeira Liga',
      minore: '',
      extra: [],
    },
    {
      nazione: 'BELGIO',
      maggiore: 'Jupiler Pro League',
      minore: '',
      extra: [],
    },
    {
      nazione: 'SCOZIA',
      maggiore: '',
      minore: '',
      extra: ['Scottish Premiership'],
    },
    {
      nazione: 'TURCHIA',
      maggiore: '',
      minore: '',
      extra: ['Süper Lig'],
    },
    {
      nazione: 'COREA',
      maggiore: '',
      minore: '',
      extra: ['K League 1'],
    },
    {
      nazione: 'GIAPPONE',
      maggiore: '',
      minore: '',
      extra: ['J1 League'],
    },
  ];

  // ============================================================
  // CHAMP LOGO
  // ============================================================
  const ChampLogo = ({ campionato, size = 24 }) => {
    const [hasError, setHasError] = useState(false);
    const logoPath = window.getChampLogo ? window.getChampLogo(campionato) : null;
    if (!logoPath || hasError) {
      const color = window.getChampColor(campionato);
      return (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', color: '#000', fontSize: size * 0.38, flexShrink: 0,
        }}>
          {campionato.substring(0, 2).toUpperCase()}
        </div>
      );
    }
    return (
      <img src={logoPath} alt={campionato} onError={() => setHasError(true)}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
    );
  };

  // ============================================================
  // QUOTA BOX
  // ============================================================
  const QuotaBox = ({ match, familyId, giocata, pctTua }) => {
    const [quotaInfo, setQuotaInfo] = useState(null);
    const { numPartite, dataMaxPDF } = window.QuoteManager ? window.QuoteManager.useQuote() : { numPartite: 0 };

    useEffect(() => {
      const info = getQuotaInfo(match, familyId, giocata, pctTua);
      setQuotaInfo(info);
    }, [match.id, familyId, giocata, pctTua, numPartite, dataMaxPDF]);

    if (!quotaInfo || !quotaInfo.quotaBook) return null;
    const { quotaBook, edge, isValue } = quotaInfo;

    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 6px', marginLeft: '6px', borderRadius: '4px',
        background: isValue ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${isValue ? 'var(--neon-green)' : 'var(--border)'}`,
        fontSize: '11px', fontWeight: 'bold',
        color: isValue ? 'var(--neon-green)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }} title={isValue ? `VALUE BET! Edge: +${edge}%` : `Quota Marathonbet`}>
        <span>💰</span><span>{quotaBook.toFixed(2)}</span>
      </div>
    );
  };

  // ============================================================
  // MATCH TAB (card partita)
  // ============================================================
  const MatchTab = ({ match, allMatches, onSelect, selectedFamiglie }) => {
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
          const r = calcolaGG_NG ? calcolaGG_NG(stats) : null;
          if (r) best = { label: r.giocata, giocata: r.giocata, pct: r.pct };
        } else {
          let bestPct = -1, bestOpt = null;
          family.options.forEach(opt => {
            let pct = 0;
            try { pct = getGiocataPct(opt, stats, homeMG, awayMG, mgTot) || 0; } catch (e) { pct = 0; }
            if (pct > bestPct) { bestPct = pct; bestOpt = opt; }
          });
          if (bestOpt && bestPct > 0) best = { label: bestOpt, giocata: bestOpt, pct: bestPct };
        }
        if (best && best.pct > 0) {
          giocateDaMostrare.push({
            familyId, familyLabel: family.label, familyIcon: family.icon,
            label: best.label, displayLabel: formatGiocataLabel(familyId, best.label),
            familyName: family.label, pct: best.pct, isBomb: best.pct >= 90, giocata: best.giocata,
          });
        }
      });

      return giocateDaMostrare.sort((a, b) => b.pct - a.pct).slice(0, 3);
    };

    const giocateDaMostrare = getGiocateDaMostrare();
    const score = giocateDaMostrare.length > 0
      ? Math.round(giocateDaMostrare.reduce((s, g) => s + g.pct, 0) / giocateDaMostrare.length) : 0;
    const hasBomb = giocateDaMostrare.some(g => g.isBomb);

    const handleClick = (e) => { e.stopPropagation(); onSelect(match.id); };
    const formattedDate = match.data ? formatDateEU(match.data) : 'N/D';

    return (
      <div className="match-tab" style={{ borderLeftColor: champColor }} onClick={handleClick}>
        <div className="score-badge">
          <span className={`giocata-pct ${getPercentualeClasse(score)}`}>
            {isNaN(score) ? 0 : score}%
          </span>
          {hasBomb && <span className="bomb-inline">💣</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <div className="tab-header" style={{ background: champColor, marginBottom: 0 }}>
            <ChampLogo campionato={match.campionato} size={16} />
            <span>{match.campionato || 'N/D'}</span>
          </div>
          <span style={{
            fontSize: '10px', fontWeight: 700, color: 'var(--neon-cyan)',
            background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: '6px',
            border: '1px solid var(--border)',
          }}>G.{match.round || 'N/A'}</span>
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
          <span className={diff >= 20 ? 'diff-alta' : 'diff-bassa'}>{isNaN(diff) ? 0 : diff}%</span>
        </div>

        <div className="bet-row-vertical">
          {giocateDaMostrare.length > 0 ? (
            giocateDaMostrare.map((g, idx) => {
              const pctColor = getColorForPct(g.pct);
              const isBomb = g.pct >= 90;
              return (
                <div key={idx} className={`bet-item-vertical ${isBomb ? 'bomb' : ''}`} style={{ borderColor: pctColor }}>
                  <span className="bet-label" style={{ color: isBomb ? 'var(--neon-gold)' : pctColor, fontWeight: 700 }}>
                    {isBomb && '💣 '}{g.displayLabel || g.label}
                  </span>
                  <span className="bet-value">
                    <span className={`giocata-pct ${getPercentualeClasse(g.pct)}`}>{g.pct}%</span>
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
  // CHAMP BAR A GRIGLIA — 3 righe per nazione
  // Riga 1: maggiore | Riga 2: minore | Riga 3: extra
  // "Tutti i Campionati" a sinistra, span verticale su 3 righe
  // ============================================================
  const ChampBar = ({ matches, champFocus, onSelect }) => {
    const normalizeDate = window.normalizeDate;
    const todayStr = window.getTodayStr();

    // Filtra solo le nazioni che hanno almeno un campionato presente nei dati
    const nazioniAttive = useMemo(() => {
      return NAZIONI_CAMPIONATI.filter(n => {
        if (n.maggiore && matches.some(m => m.campionato === n.maggiore)) return true;
        if (n.minore && matches.some(m => m.campionato === n.minore)) return true;
        return n.extra.some(c => matches.some(m => m.campionato === c));
      }).map(n => ({
        ...n,
        maggiorePresente: n.maggiore && matches.some(m => m.campionato === n.maggiore),
        minorePresente: n.minore && matches.some(m => m.campionato === n.minore),
        extraPresenti: n.extra.filter(c => matches.some(m => m.campionato === c)),
      }));
    }, [matches]);

    const totaleOggi = useMemo(() => {
      return matches.filter(m => m.stato === 'Futura' && normalizeDate(m.data) === todayStr).length;
    }, [matches, todayStr]);

    const countOggi = (camp) => matches.filter(m =>
      m.campionato === camp && m.stato === 'Futura' && normalizeDate(m.data) === todayStr
    ).length;

    const abbreviate = (camp) => camp
      .replace(' - Girone A', '/A')
      .replace(' - Girone B', '/B')
      .replace(' - Girone C', '/C')
      .replace('Jupiler Pro League', 'Jupiler')
      .replace('EFL Championship', 'Championship')
      .replace('Scottish Premiership', 'Scottish')
      .replace('Segunda División', 'Segunda')
      .replace('2. Bundesliga', '2. Bundes')
      .replace('Eerste Divisie', 'Eerste');

    // Calcola il numero massimo di righe totali (3: maggiore + minore + extra)
    // Ma per l'Italia, gli "extra" sono 3 (Serie C A/B/C) → potrebbero servire più righe
    const maxExtraRows = Math.max(1, ...nazioniAttive.map(n => n.extraPresenti.length));
    const totalRows = 2 + maxExtraRows; // 2 (maggiore + minore) + extra

    const renderCell = (camp, tier) => {
      if (!camp) {
        return (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '6px 4px', fontSize: '10px', color: 'var(--text-dim)',
            opacity: 0.35, fontStyle: 'italic',
          }}>
            —
          </div>
        );
      }
      const color = window.getChampColor(camp);
      const isActive = champFocus === camp;
      const nOggi = countOggi(camp);
      // tier: 1 = maggiore, 2 = minore, 3+ = extra
      const borderWidth = tier === 1 ? '2px' : '1px';
      const opacity = tier === 1 ? 1 : (tier === 2 ? 0.9 : 0.8);
      return (
        <button
          onClick={() => onSelect(camp)}
          className={`champ-bar-item ${isActive ? 'active' : ''}`}
          style={{
            borderColor: isActive ? 'var(--neon-cyan)' : `${color}66`,
            width: '100%',
            justifyContent: 'center',
            padding: '5px 6px',
            minHeight: '32px',
            borderWidth,
            opacity,
          }}
          title={camp}
        >
          <ChampLogo campionato={camp} size={14} />
          <span className="champ-bar-name" style={{
            fontSize: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '80px',
          }}>
            {abbreviate(camp)}
          </span>
          {nOggi > 0 && <span className="champ-bar-badge">{nOggi}</span>}
        </button>
      );
    };

    return (
      <div
        className="champ-bar-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `auto repeat(${nazioniAttive.length}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${totalRows}, auto)`,
          gap: '4px',
          marginBottom: '16px',
          padding: '10px 12px',
          background: 'linear-gradient(135deg, rgba(30, 40, 66, 0.7), rgba(20, 27, 46, 0.9))',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflowX: 'auto',
        }}
      >
        {/* ⭐ "Tutti i Campionati" a sinistra, span verticale su tutte le righe */}
        <button
          onClick={() => onSelect('__TUTTI__')}
          className={`champ-bar-item ${champFocus === '__TUTTI__' ? 'active' : ''}`}
          style={{
            gridColumn: '1',
            gridRow: `1 / span ${totalRows}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px 14px',
            borderColor: champFocus === '__TUTTI__' ? 'var(--neon-magenta)' : 'var(--neon-cyan)',
            background: champFocus === '__TUTTI__'
              ? 'linear-gradient(135deg, var(--neon-magenta), var(--neon-purple))'
              : 'linear-gradient(135deg, rgba(0, 245, 255, 0.15), rgba(0, 245, 255, 0.05))',
            color: '#000',
            minWidth: '100px',
            whiteSpace: 'normal',
            textAlign: 'center',
            lineHeight: '1.1',
          }}
        >
          <span style={{ fontSize: '18px' }}>🌍</span>
          <span className="champ-bar-name" style={{ fontSize: '10px' }}>
            Tutti i Campionati
          </span>
          {totaleOggi > 0 && (
            <span className="champ-bar-badge" style={{ position: 'static', marginTop: '2px' }}>
              {totaleOggi}
            </span>
          )}
        </button>

        {/* ⭐ Una colonna per nazione: 3 righe (maggiore / minore / extra) */}
        {nazioniAttive.map((naz, colIdx) => {
          const gridCol = colIdx + 2; // +2 perché la colonna 1 è "Tutti"
          const cells = [];

          // Riga 1: campionato maggiore
          cells.push(
            <div key={`${naz.nazione}-mag-${colIdx}`} style={{ gridColumn: gridCol, gridRow: 1 }}>
              {renderCell(naz.maggiorePresente ? naz.maggiore : null, 1)}
            </div>
          );

          // Riga 2: campionato minore
          cells.push(
            <div key={`${naz.nazione}-min-${colIdx}`} style={{ gridColumn: gridCol, gridRow: 2 }}>
              {renderCell(naz.minorePresente ? naz.minore : null, 2)}
            </div>
          );

          // Righe 3+: campionati extra (uno per riga)
          naz.extraPresenti.forEach((camp, i) => {
            cells.push(
              <div key={`${naz.nazione}-extra-${i}`} style={{ gridColumn: gridCol, gridRow: i + 3 }}>
                {renderCell(camp, 3)}
              </div>
            );
          });

          // Riempi le righe extra vuote per allineare tutte le colonne
          for (let r = naz.extraPresenti.length + 3; r <= totalRows; r++) {
            cells.push(
              <div key={`${naz.nazione}-empty-${r}`} style={{ gridColumn: gridCol, gridRow: r }}>
                {renderCell(null, 3)}
              </div>
            );
          }

          return cells;
        })}
      </div>
    );
  };

  // ============================================================
  // SELEZIONE VISUALIZZAZIONE GIOCATE
  // ============================================================
  const VisualizzaGiocateSwitch = ({ mode, setMode, selectedFamiglie }) => {
    const countScelte = (selectedFamiglie || []).length;
    const totalFamiglie = Object.keys(window.FAMIGLIE_GIOCATE || {}).length;

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        marginBottom: '14px', padding: '10px 14px',
        background: 'var(--bg-elevated)', borderRadius: '12px',
        border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
          🎯 Giocate
        </span>
        <div style={{ display: 'flex', background: 'var(--bg-deep)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
          <button onClick={() => setMode('scelte')} style={{
            padding: '6px 16px', fontSize: '11px', fontWeight: 700,
            borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: mode === 'scelte' ? 'var(--neon-cyan)' : 'transparent',
            color: mode === 'scelte' ? '#000' : 'var(--text-dim)',
          }}>⭐ Scelte ({countScelte})</button>
          <button onClick={() => setMode('tutte')} style={{
            padding: '6px 16px', fontSize: '11px', fontWeight: 700,
            borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: mode === 'tutte' ? 'var(--neon-magenta)' : 'transparent',
            color: mode === 'tutte' ? '#000' : 'var(--text-dim)',
          }}>🌐 Tutte ({totalFamiglie})</button>
        </div>
      </div>
    );
  };

  // ============================================================
  // MOBILE: LISTA CAMPIONATI (scrollabile)
  // ============================================================
  const MobileListaCampionati = ({ matches, onSelect }) => {
    const normalizeDate = window.normalizeDate;
    const todayStr = window.getTodayStr();

    const campionatiDisponibili = useMemo(() => {
      return window.CHAMPIONSHIP_LIST
        .filter(c => matches.some(m => m.campionato === c))
        .map(c => ({
          nome: c,
          totali: matches.filter(m => m.campionato === c).length,
          oggi: matches.filter(m => m.campionato === c && m.stato === 'Futura' && normalizeDate(m.data) === todayStr).length,
        }))
        .filter(c => c.totali > 0);
    }, [matches, todayStr]);

    const totaleOggi = matches.filter(m => m.stato === 'Futura' && normalizeDate(m.data) === todayStr).length;

    return (
      <div className="mobile-sidebar-scroll">
        <div className="card" style={{ padding: '14px' }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontWeight: 700,
            color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '2px',
            marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)',
          }}>
            🏆 Campionati
          </div>

          {/* Tutti i Campionati */}
          <button
            onClick={() => onSelect('__TUTTI__')}
            style={{
              width: '100%', marginBottom: '10px',
              padding: '14px 16px', borderRadius: '12px',
              border: '2px solid var(--neon-magenta)',
              background: 'linear-gradient(135deg, var(--neon-magenta), var(--neon-purple))',
              color: '#000', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 0 25px rgba(255, 0, 229, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🌍</span>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '13px', fontWeight: 900 }}>
                TUTTI I CAMPIONATI
              </span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 900, background: 'rgba(0,0,0,0.25)', padding: '3px 10px', borderRadius: '10px' }}>
              {totaleOggi}
            </span>
          </button>

          {/* Lista campionati */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {campionatiDisponibili.map(camp => {
              const color = window.getChampColor(camp.nome);
              const hasToday = camp.oggi > 0;
              return (
                <button
                  key={camp.nome}
                  onClick={() => onSelect(camp.nome)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '12px',
                    border: `2px solid ${hasToday ? 'var(--neon-red)' : color}`,
                    background: hasToday
                      ? `linear-gradient(135deg, ${color}33, ${color}11)`
                      : 'var(--bg-elevated)',
                    cursor: 'pointer', textAlign: 'left',
                    boxShadow: hasToday ? `0 0 20px ${color}55` : 'none',
                  }}
                >
                  <ChampLogo campionato={camp.nome} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                      {camp.nome}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', gap: '8px' }}>
                      <span>📊 {camp.totali}</span>
                      {hasToday && <span style={{ color: 'var(--neon-red)', fontWeight: 700 }}>🔴 {camp.oggi} oggi</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: 'var(--neon-cyan)' }}>→</span>
                </button>
              );
            })}
          </div>
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
    const isMobile = useIsMobile();

    const { mode: visualizzaMode, setMode: setVisualizzaMode } =
      window.FiltriCampionati.useVisualizzaGiocateMode();

    const [champFocus, setChampFocus] = useState('__TUTTI__');

    // Partite di OGGI (filtrate per campionato se selezionato)
    const partiteOggi = useMemo(() => {
      const todayStr = getTodayStr();
      let list = matches.filter(m => m.stato === 'Futura' && normalizeDate(m.data) === todayStr);
      if (champFocus && champFocus !== '__TUTTI__') {
        list = list.filter(m => m.campionato === champFocus);
      }
      return list.sort((a, b) => (a.ora || '99:99').localeCompare(b.ora || '99:99'));
    }, [matches, champFocus]);

    const isTuttiMode = champFocus === '__TUTTI__';

    // ⭐ MOBILE
    if (isMobile) {
      // Se campionato selezionato → vista partite
      if (champFocus) {
        const color = isTuttiMode ? 'var(--neon-cyan)' : window.getChampColor(champFocus);
        return (
          <div>
            <button className="mobile-back-btn" onClick={() => setChampFocus(null)}>
              ← Cambia Campionato
            </button>

            <div style={{ marginTop: '55px', marginBottom: '14px' }}>
              <div style={{
                background: isTuttiMode
                  ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))'
                  : `linear-gradient(135deg, ${color}, ${color}cc)`,
                borderRadius: '12px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: `0 6px 24px ${isTuttiMode ? 'rgba(0,245,255,0.4)' : color + '55'}`,
              }}>
                {isTuttiMode
                  ? <span style={{ fontSize: '32px' }}>🌍</span>
                  : <ChampLogo campionato={champFocus} size={36} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900,
                    color: '#000', textTransform: 'uppercase',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {isTuttiMode ? 'TUTTI I CAMPIONATI' : champFocus}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
                    {partiteOggi.length} partite oggi
                  </div>
                </div>
              </div>

              <VisualizzaGiocateSwitch
                mode={visualizzaMode}
                setMode={setVisualizzaMode}
                selectedFamiglie={selectedFamiglie}
              />
            </div>

            {partiteOggi.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>😴</div>
                <div style={{ color: 'var(--text-dim)' }}>Nessuna partita oggi</div>
              </div>
            ) : (
              <div className="matches-grid">
                {partiteOggi.map(m => (
                  <MatchTab key={m.id} match={m} allMatches={matches}
                    onSelect={onSelectMatch} selectedFamiglie={selectedFamiglie} />
                ))}
              </div>
            )}
          </div>
        );
      }

      // Altrimenti → lista campionati
      return (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', marginBottom: '12px',
            background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(255, 0, 229, 0.05))',
            borderRadius: '14px', border: '1px solid var(--border)',
          }}>
            <span style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '14px', fontWeight: 900,
              color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase',
            }}>📅 Palinsesto Oggi</span>
          </div>
          <MobileListaCampionati matches={matches} onSelect={(c) => setChampFocus(c)} />
        </div>
      );
    }

    // ⭐ PC
    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          padding: '10px 16px', marginBottom: '12px',
          background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(255, 0, 229, 0.05))',
          borderRadius: '14px', border: '1px solid var(--border)',
        }}>
          <span style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '16px', fontWeight: 900,
            color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase',
            textShadow: '0 0 12px var(--neon-cyan)',
          }}>📅 Palinsesto Oggi</span>
          <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
            {isTuttiMode ? 'Tutti i campionati' : champFocus} • {partiteOggi.length} partite
          </span>
        </div>

        <VisualizzaGiocateSwitch
          mode={visualizzaMode}
          setMode={setVisualizzaMode}
          selectedFamiglie={selectedFamiglie}
        />

        {/* ⭐ SIDEBAR A GRIGLIA 3 RIGHE: MAGGIORI / MINORI / EXTRA */}
        <ChampBar
          matches={matches}
          champFocus={champFocus}
          onSelect={(c) => setChampFocus(c)}
        />

        {/* Header campionato selezionato */}
        {!isTuttiMode && (
          <div style={{
            background: `linear-gradient(135deg, ${window.getChampColor(champFocus)}, ${window.getChampColor(champFocus)}99)`,
            borderRadius: '12px', padding: '12px 16px', marginBottom: '14px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <ChampLogo campionato={champFocus} size={32} />
            <div>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '15px', fontWeight: 900, color: '#000' }}>
                {champFocus}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)', fontWeight: 700 }}>
                {partiteOggi.length} partite oggi
              </div>
            </div>
          </div>
        )}

        {partiteOggi.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>😴</div>
            <h3 style={{ color: 'var(--neon-cyan)' }}>
              Nessuna partita oggi
            </h3>
            <p style={{ color: 'var(--text-dim)' }}>
              {isTuttiMode ? 'Non ci sono partite in programma oggi' : `Nessuna partita di ${champFocus} oggi`}
            </p>
          </div>
        ) : (
          <div className="matches-grid">
            {partiteOggi.map(m => (
              <MatchTab key={m.id} match={m} allMatches={matches}
                onSelect={onSelectMatch} selectedFamiglie={selectedFamiglie} />
            ))}
          </div>
        )}
      </div>
    );
  }

  window.PalinsestoComponent = PalinsestoComponent;
  window.ChampLogo = ChampLogo;
  console.log('✅ Modulo Palinsesto FUTURISTIC caricato — ChampBar griglia 3 righe');

})();