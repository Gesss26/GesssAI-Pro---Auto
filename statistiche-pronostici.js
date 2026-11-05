// ============================================================
// statistiche-pronostici.js - Pannello "Statistiche Pronostici"
// Card partite con ✅/❌ + tabella riepilogo per campionato
// v2: giocate divise in 2 colonne (Storico / Dixon-Coles)
//     bordo verde/rosso sui singoli box in base all'esito
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

  const formatGiocataLabel = (familyId, label) => {
    if (typeof window.formatGiocataLabel === 'function') {
      return window.formatGiocataLabel(familyId, label);
    }
    return label || '—';
  };

  const getChampColor = (c) => (typeof window.getChampColor === 'function' ? window.getChampColor(c) : '#3498db');
  const TeamLogo = (props) => (window.TeamLogo ? React.createElement(window.TeamLogo, props) : null);
  const formatDateEU = (d) => (typeof window.formatDateEU === 'function' ? window.formatDateEU(d) : d);

  function StatistichePronosticiComponent({ matches }) {
    const ieri = useMemo(() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }, []);

    const [dataFiltro, setDataFiltro] = useState(ieri);
    const [fonteFiltro, setFonteFiltro] = useState('tutti');
    const [esitoFiltro, setEsitoFiltro] = useState('tutti');
    const [soloBombe, setSoloBombe] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Verifica al mount e quando cambiano i match
    useEffect(() => {
      if (window.PronosticiDB) {
        try {
          const n = window.PronosticiDB.verificaTutti(matches || []);
          if (n > 0) console.log(`🎯 Verificati ${n} pronostici`);
        } catch (e) {
          console.warn('Errore verifica:', e);
        }
        setRefreshKey(k => k + 1);
      }
    }, [matches]);

    const pronostici = useMemo(() => {
      if (!window.PronosticiDB) return [];
      return window.PronosticiDB.getPronostici({
        data: dataFiltro,
        fonte: fonteFiltro,
        esito: esitoFiltro,
        soloBombe,
      });
    }, [dataFiltro, fonteFiltro, esitoFiltro, soloBombe, refreshKey]);

    const perPartita = useMemo(() => {
      const map = new Map();
      pronostici.forEach(r => {
        if (!map.has(r.matchId)) {
          map.set(r.matchId, {
            matchId: r.matchId,
            campionato: r.campionato,
            casa: r.casa,
            ospiti: r.ospiti,
            data: r.data,
            ora: r.ora,
            round: r.round,
            golCasa: r.golCasa,
            golOspite: r.golOspite,
            giocate: [],
          });
        }
        map.get(r.matchId).giocate.push(r);
      });
      return [...map.values()].sort((a, b) => {
        if (a.data !== b.data) return (a.data || '').localeCompare(b.data || '');
        return (a.ora || '99:99').localeCompare(b.ora || '99:99');
      });
    }, [pronostici]);

    const stats = useMemo(() => {
      if (!window.PronosticiDB) return null;
      return window.PronosticiDB.statistiche({
        data: dataFiltro,
        fonte: fonteFiltro,
        soloBombe,
      });
    }, [dataFiltro, fonteFiltro, soloBombe, refreshKey]);

    const FAMIGLIE = window.FAMIGLIE_GIOCATE || {};

    // ---- Helper: render singola giocata ----
    const renderGiocata = (r, i, fonteColonna) => {
      const esitoOk = r.esito === 'vinto';
      const esitoKo = r.esito === 'perso';
      const borderCol = esitoOk ? 'var(--neon-green)' : esitoKo ? 'var(--neon-red)' : 'var(--border)';
      const bgCol = esitoOk ? 'rgba(0,255,136,0.12)' : esitoKo ? 'rgba(255,51,102,0.12)' : 'var(--surface)';
      const icon = esitoOk ? '✅' : esitoKo ? '❌' : '⏳';
      const fam = FAMIGLIE[r.familyId];

      // percentuale da mostrare: solo quella della colonna di appartenenza
      const pctDaMostrare = fonteColonna === 'storico' ? r.pctStorico : r.pctDixon;
      const pctLabel = fonteColonna === 'storico' ? '📊' : '🧮';
      const pctColor = fonteColonna === 'storico' ? 'var(--neon-cyan)' : 'var(--neon-magenta)';

      return (
        <div
          key={`${fonteColonna}-${i}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 8px', borderRadius: '6px',
            background: bgCol,
            border: `2px solid ${borderCol}`,
            fontSize: '11px',
          }}
        >
          <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
          <span style={{ flex: 1, fontWeight: 'bold', color: 'var(--text)' }}>
            {formatGiocataLabel(r.familyId, r.giocata)}
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {fam ? `${fam.icon} ${fam.label}` : r.familyId}
          </span>
          {pctDaMostrare != null && (
            <span
              title={fonteColonna === 'storico' ? 'Storico' : 'Dixon'}
              style={{ fontSize: '10px', color: pctColor, fontWeight: 700 }}
            >
              {pctLabel}{pctDaMostrare}%
            </span>
          )}
        </div>
      );
    };

    // ---- Card partita ----
    const PronosticoCard = ({ partita }) => {
      const champColor = getChampColor(partita.campionato);
      const risultato = (partita.golCasa != null && partita.golOspite != null)
        ? `${partita.golCasa}-${partita.golOspite}`
        : null;

      const giocateStorico = partita.giocate.filter(r => r.pctStorico != null);
      const giocateDixon = partita.giocate.filter(r => r.pctDixon != null);

      return (
        <div className="match-tab" style={{
          border: `2px solid ${champColor}`,
          borderLeftWidth: '6px',
          borderLeftColor: champColor,
          boxShadow: `0 0 12px ${champColor}66`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div className="tab-header" style={{ background: champColor, marginBottom: 0 }}>
              <span>{partita.campionato || 'N/D'}</span>
            </div>
            {partita.round && (
              <span style={{
                fontSize: '10px', fontWeight: 700, color: 'var(--neon-cyan)',
                background: 'var(--bg-elevated)', padding: '3px 8px',
                borderRadius: '6px', border: '1px solid var(--border)',
              }}>
                G.{partita.round}
              </span>
            )}
            {risultato && (
              <span style={{
                marginLeft: 'auto',
                background: 'var(--neon-gold)',
                color: '#000',
                fontWeight: 900,
                fontSize: '16px',
                padding: '2px 12px',
                borderRadius: '8px',
                fontFamily: 'Orbitron, sans-serif',
              }}>
                {risultato}
              </span>
            )}
          </div>

          <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginBottom: '6px', textAlign: 'center' }}>
            📅 {formatDateEU(partita.data)} • ⏰ {partita.ora || 'TBD'}
          </div>

          <div className="teams-row">
            <div className="team">
              <TeamLogo teamName={partita.casa} championship={partita.campionato} size={40} />
              <div className="team-name">{partita.casa}</div>
            </div>
            <div className="vs">VS</div>
            <div className="team">
              <TeamLogo teamName={partita.ospiti} championship={partita.campionato} size={40} />
              <div className="team-name">{partita.ospiti}</div>
            </div>
          </div>

          {/* === DUE COLONNE: STORICO | DIXON === */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            {/* COLONNA STORICO */}
            <div>
              <div style={{
                fontSize: '10px', fontWeight: 900, color: 'var(--neon-cyan)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: '4px', textAlign: 'center',
              }}>
                📊 Storico
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {giocateStorico.length > 0
                  ? giocateStorico.map((r, i) => renderGiocata(r, i, 'storico'))
                  : <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', padding: '8px 0' }}>—</div>}
              </div>
            </div>

            {/* COLONNA DIXON */}
            <div>
              <div style={{
                fontSize: '10px', fontWeight: 900, color: 'var(--neon-magenta)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: '4px', textAlign: 'center',
              }}>
                🧮 Dixon-Coles
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {giocateDixon.length > 0
                  ? giocateDixon.map((r, i) => renderGiocata(r, i, 'dixon'))
                  : <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', padding: '8px 0' }}>—</div>}
              </div>
            </div>
          </div>
        </div>
      );
    };

    // ---- Tabella riepilogo per campionato ----
    const TabellaCampionati = () => {
      if (!stats || !stats.perCampionato || stats.perCampionato.length === 0) return null;
      return (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '12px', fontFamily: 'Orbitron, sans-serif' }}>
            🏆 Riepilogo per Campionato — {formatDateEU(dataFiltro)}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface)' }}>
                  {['Campionato', 'Emessi', '✅ Vinti', '❌ Persi', '⏳ Attesa', '🎯 Hit Rate'].map(h => (
                    <th key={h} style={{
                      padding: '10px', textAlign: h === 'Campionato' ? 'left' : 'center',
                      fontSize: '11px', textTransform: 'uppercase',
                      color: 'var(--text-dim)', borderBottom: '2px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.perCampionato.map(c => (
                  <tr key={c.campionato}>
                    <td style={{ padding: '8px 10px', fontWeight: 'bold', color: 'var(--text)' }}>
                      {c.campionato}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-dim)' }}>{c.emessi}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--neon-green)', fontWeight: 900 }}>{c.vinti}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--neon-red)', fontWeight: 900 }}>{c.persi}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-dim)' }}>{c.inAttesa}</td>
                    <td style={{
                      padding: '8px 10px', textAlign: 'center',
                      fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
                      color: c.hitRate == null ? 'var(--text-dim)'
                        : c.hitRate >= 66 ? 'var(--neon-green)'
                        : c.hitRate >= 50 ? 'var(--neon-gold)'
                        : 'var(--neon-red)',
                    }}>
                      {c.hitRate == null ? '—' : `${c.hitRate}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    const TotaleBanner = () => {
      if (!stats) return null;
      const t = stats.totali;
      const items = [
        { label: '📋 Emessi', value: t.emessi, color: 'var(--text)' },
        { label: '✅ Vinti', value: t.vinti, color: 'var(--neon-green)' },
        { label: '❌ Persi', value: t.persi, color: 'var(--neon-red)' },
        { label: '⏳ In attesa', value: t.inAttesa, color: 'var(--text-dim)' },
        {
          label: '🎯 Hit Rate',
          value: t.hitRate == null ? '—' : `${t.hitRate}%`,
          color: t.hitRate >= 66 ? 'var(--neon-green)' : t.hitRate >= 50 ? 'var(--neon-gold)' : 'var(--neon-red)',
        },
      ];
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '10px',
          marginBottom: '16px',
        }}>
          {items.map((x, i) => (
            <div key={i} style={{
              background: 'var(--card)', padding: '10px 12px', borderRadius: '8px',
              border: '1px solid var(--border)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>{x.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: x.color, fontFamily: 'Orbitron, sans-serif' }}>{x.value}</div>
            </div>
          ))}
        </div>
      );
    };

    const inputStyle = {
      padding: '8px 12px',
      background: 'var(--bg-elevated)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 700,
      outline: 'none',
    };

    return (
      <div>
        {/* Barra filtri */}
        <div style={{
          display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
          padding: '10px 14px', marginBottom: '14px',
          background: 'var(--surface)', borderRadius: '10px',
          border: '1px solid var(--border)',
        }}>
          <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700 }}>
            📅 Data:
          </label>
          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            style={inputStyle}
          />

          <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700 }}>
            🎯 Fonte:
          </label>
          <select value={fonteFiltro} onChange={(e) => setFonteFiltro(e.target.value)} style={inputStyle}>
            <option value="tutti">Tutte</option>
            <option value="storico">📊 Storico</option>
            <option value="dixon">🧮 Dixon</option>
            <option value="entrambi">✓ Entrambi</option>
          </select>

          <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700 }}>
            ✅ Esito:
          </label>
          <select value={esitoFiltro} onChange={(e) => setEsitoFiltro(e.target.value)} style={inputStyle}>
            <option value="tutti">Tutti</option>
            <option value="vinto">✅ Vinti</option>
            <option value="perso">❌ Persi</option>
            <option value="in-attesa">⏳ In attesa</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-gold)', fontWeight: 700, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={soloBombe}
              onChange={(e) => setSoloBombe(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            💣 Solo bombe (≥90%)
          </label>
        </div>

        <TotaleBanner />

        {perPartita.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div>Nessun pronostico emesso per questa data / filtro.</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>
              I pronostici vengono registrati automaticamente aprendo le partite dal Palinsesto o dalla sezione Dixon-Coles.
            </div>
          </div>
        ) : (
          <div className="matches-grid">
            {perPartita.map(p => (
              <PronosticoCard key={p.matchId} partita={p} />
            ))}
          </div>
        )}

        <TabellaCampionati />
      </div>
    );
  }

  window.StatistichePronosticiComponent = StatistichePronosticiComponent;
  console.log('✅ statistiche-pronostici.js v2 caricato — 2 colonne Storico/Dixon + bordo esito');
})();