// ============================================================
// palinsesto.js - Modulo Palinsesto (FUTURISTIC + CHAMP BAR GRIGLIA 5x5)
// ============================================================

(function () {
  'use strict';

  const { useState, useMemo, useEffect } = React;

  // ⭐ Normalizza accenti per kebab-case
  const normalizzaAccenti = (str) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/ø/g, 'o')
      .replace(/æ/g, 'ae');
  };

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
  // LISTA CAMPIONATI ORDINATA ALFABETICAMENTE
  // ============================================================
  const getCampionatiOrdinati = () => {
    const list = (window.CHAMPIONSHIP_LIST && window.CHAMPIONSHIP_LIST.length > 0)
      ? window.CHAMPIONSHIP_LIST
      : [];
    return [...list].sort((a, b) =>
      (a || '').localeCompare(b || '', 'it', { sensitivity: 'base' })
    );
  };

  // ============================================================
  // CHAMP LOGO (con normalizzazione accenti)
  // ============================================================
  const ChampLogo = ({ campionato, size = 24 }) => {
    const [hasError, setHasError] = useState(false);
    const [pathIndex, setPathIndex] = useState(0);

    const getPaths = (champ) => {
      if (!champ) return [];
      const normalized = normalizzaAccenti(champ);
      const kebab = normalized
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const snake = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      return [
        `logos/campionati/${kebab}.png`,
        `logos/campionati/${snake}.png`,
        `logos/campionati/${champ}.png`,
        `logos/campionati/${kebab}.jpg`,
        `logos/campionati/${snake}.jpg`,
      ];
    };

    const paths = getPaths(campionato);

    if (hasError || pathIndex >= paths.length || paths.length === 0) {
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
      <img
        key={paths[pathIndex]}
        src={paths[pathIndex]}
        alt={campionato}
        onError={() => {
          if (pathIndex + 1 < paths.length) setPathIndex(pathIndex + 1);
          else setHasError(true);
        }}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      />
    );
  };

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
      }}>
        <span>💰</span><span>{quotaBook.toFixed(2)}</span>
      </div>
    );
  };

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
  // CHAMP BAR — GRIGLIA 5 COLONNE × 5 RIGHE
  // ============================================================
  const ChampBar = ({ matches, champFocus, onSelect }) => {
    const normalizeDate = window.normalizeDate;
    const todayStr = window.getTodayStr();

    const totaleOggi = useMemo(() => {
      return matches.filter(m => m.stato === 'Futura' && normalizeDate(m.data) === todayStr).length;
    }, [matches, todayStr]);

    const countOggi = (camp) => {
      if (!camp) return 0;
      return matches.filter(m =>
        m.campionato === camp && m.stato === 'Futura' && normalizeDate(m.data) === todayStr
      ).length;
    };

    const isPresente = (camp) => {
      if (!camp) return false;
      return matches.some(m => m.campionato === camp);
    };

    const campionatiOrdinati = useMemo(() => getCampionatiOrdinati(), []);

    const renderCella = (campionato, idx) => {
      const gridCol = (idx % 5) + 2;
      const gridRow = Math.floor(idx / 5) + 1;

      if (!campionato || !isPresente(campionato)) {
        return (
          <div key={`empty-${idx}`} style={{ gridColumn: gridCol, gridRow }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px 4px', fontSize: '10px', color: 'var(--text-dim)',
              opacity: 0.3, fontStyle: 'italic', minHeight: '36px',
            }}>—</div>
          </div>
        );
      }

      const color = window.getChampColor(campionato);
      const isActive = champFocus === campionato;
      const nOggi = countOggi(campionato);
      const label = campionato.length > 16 ? campionato.substring(0, 14) + '…' : campionato;

      return (
        <div key={`${campionato}-${idx}`} style={{ gridColumn: gridCol, gridRow }}>
          <button
            onClick={() => onSelect(campionato)}
            className={`champ-bar-item ${isActive ? 'active' : ''}`}
            style={{
              borderColor: isActive ? 'var(--neon-cyan)' : `${color}66`,
              width: '100%',
              justifyContent: 'center',
              padding: '5px 6px',
              minHeight: '36px',
              borderWidth: '1px',
            }}
            title={campionato}
          >
            <ChampLogo campionato={campionato} size={14} />
            <span className="champ-bar-name" style={{
              fontSize: '10px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '75px',
            }}>
              {label}
            </span>
            {nOggi > 0 && <span className="champ-bar-badge">{nOggi}</span>}
          </button>
        </div>
      );
    };

    return (
      <div
        className="champ-bar-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `auto repeat(5, minmax(0, 1fr))`,
          gridTemplateRows: 'repeat(5, auto)',
          gap: '4px',
          marginBottom: '16px',
          padding: '10px 12px',
          background: 'linear-gradient(135deg, rgba(30, 40, 66, 0.7), rgba(20, 27, 46, 0.9))',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => onSelect('__TUTTI__')}
          className={`champ-bar-item ${champFocus === '__TUTTI__' ? 'active' : ''}`}
          style={{
            gridColumn: '1',
            gridRow: '1 / span 5',
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

        {campionatiOrdinati.map((campionato, idx) => renderCella(campionato, idx))}
      </div>
    );
  };

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

  const MobileListaCampionati = ({ matches, onSelect }) => {
    const normalizeDate = window.normalizeDate;
    const todayStr = window.getTodayStr();

    const campionatiDisponibili = useMemo(() => {
      const lista = getCampionatiOrdinati();
      return lista
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

  function PalinsestoComponent({ matches, selectedFamiglie, onSelectMatch, weatherCache }) {
    const normalizeDate = window.normalizeDate;
    const getTodayStr = window.getTodayStr;
    const isMobile = useIsMobile();

    const { mode: visualizzaMode, setMode: setVisualizzaMode } =
      window.FiltriCampionati.useVisualizzaGiocateMode();

    const [champFocus, setChampFocus] = useState('__TUTTI__');

    const partiteOggi = useMemo(() => {
      const todayStr = getTodayStr();
      let list = matches.filter(m => m.stato === 'Futura' && normalizeDate(m.data) === todayStr);
      if (champFocus && champFocus !== '__TUTTI__') {
        list = list.filter(m => m.campionato === champFocus);
      }
      return list.sort((a, b) => (a.ora || '99:99').localeCompare(b.ora || '99:99'));
    }, [matches, champFocus]);

    const isTuttiMode = champFocus === '__TUTTI__';

    if (isMobile) {
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

        <ChampBar
          matches={matches}
          champFocus={champFocus}
          onSelect={(c) => setChampFocus(c)}
        />

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
            <h3 style={{ color: 'var(--neon-cyan)' }}>Nessuna partita oggi</h3>
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
  console.log('✅ Modulo Palinsesto FUTURISTIC caricato — ChampBar griglia 5×5 + accenti fix');

})();