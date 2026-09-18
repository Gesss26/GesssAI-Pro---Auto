// ============================================================
// gestione-conto.js - Gestione conto con persistenza Excel
// Salva/carica da: excel/gestione.xlsx (GitHub)
// Settimana: Giovedì → Mercoledì successivo
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  // ============================================================
  // CONFIGURAZIONE
  // ============================================================

  const EXCEL_PATHS = [
    '/GesssAI-Pro---Auto/excel/gestione.xlsx',
    '/excel/gestione.xlsx',
    'https://gesss26.github.io/GesssAI-Pro---Auto/excel/gestione.xlsx',
  ];
  const EXCEL_FILENAME = 'gestione.xlsx';
  const STORAGE_KEY = 'ft_gestione_conto';
  const SALDO_INIZIALE_KEY = 'ft_gestione_saldo_iniziale';
  const DEFAULT_SALDO_INIZIALE = 1000;

  // ============================================================
  // UTILITÀ DATE - Settimana Giovedì → Mercoledì
  // ============================================================

  /**
   * Restituisce il giovedì della settimana di una data (o il giovedì precedente)
   * La settimana va da Giovedì a Mercoledì successivo
   */
  const getGiovediSettimana = (dateInput) => {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Dom, 1=Lun, ..., 4=Gio, 5=Ven, 6=Sab
    
    // Se siamo Giovedì(4), Venerdì(5), Sabato(6), Domenica(0), Lunedì(1), Martedì(2), Mercoledì(3)
    // il giovedì di riferimento è:
    // - Gio(4): oggi
    // - Ven(5): ieri (giovedì)
    // - Sab(6): 2 giorni fa
    // - Dom(0): 3 giorni fa
    // - Lun(1): 4 giorni fa
    // - Mar(2): 5 giorni fa
    // - Mer(3): 6 giorni fa
    
    let offset;
    if (day === 4) offset = 0;        // Giovedì
    else if (day === 5) offset = -1;  // Venerdì
    else if (day === 6) offset = -2;  // Sabato
    else if (day === 0) offset = -3;  // Domenica
    else if (day === 1) offset = -4;  // Lunedì
    else if (day === 2) offset = -5;  // Martedì
    else offset = -6;                  // Mercoledì
    
    const giovedi = new Date(d);
    giovedi.setDate(d.getDate() + offset);
    return giovedi;
  };

  const getMercolediSuccessivo = (giovedi) => {
    const mercoledi = new Date(giovedi);
    mercoledi.setDate(giovedi.getDate() + 6);
    return mercoledi;
  };

  const formatDateIT = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const toDateStr = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getWeekLabel = (giovedi) => {
    const mercoledi = getMercolediSuccessivo(giovedi);
    return `${formatDateIT(toDateStr(giovedi))} → ${formatDateIT(toDateStr(mercoledi))}`;
  };

  const getMonthLabel = (dateInput) => {
    const d = new Date(dateInput);
    const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    return `${mesi[d.getMonth()]} ${d.getFullYear()}`;
  };

  // ============================================================
  // PARSING / SERIALIZZAZIONE EXCEL
  // ============================================================

  const parseExcelGestione = (arrayBuffer) => {
    try {
      if (typeof XLSX === 'undefined') return null;
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) return { movimenti: [], saldoIniziale: DEFAULT_SALDO_INIZIALE };

      const headers = Object.keys(rows[0]);
      const findCol = (keys) => {
        for (const k of keys) {
          const found = headers.find(h => h.toLowerCase().includes(k.toLowerCase()));
          if (found) return found;
        }
        return null;
      };

      const colData = findCol(['data', 'date']);
      const colImporto = findCol(['importo giocato', 'importo', 'puntata', 'stake']);
      const colEsito = findCol(['esito', 'vinta', 'risultato', 'stato']);
      const colVincita = findCol(['importo vinto', 'vincita', 'vinto', 'ritorno']);
      const colSaldo = findCol(['saldo iniziale', 'saldo']);

      const movimenti = [];
      let saldoIniziale = DEFAULT_SALDO_INIZIALE;

      rows.forEach((row, i) => {
        if (colSaldo && row[colSaldo] && saldoIniziale === DEFAULT_SALDO_INIZIALE) {
          const sv = parseFloat(row[colSaldo]);
          if (!isNaN(sv) && sv > 0) saldoIniziale = sv;
        }

        const dataRaw = row[colData];
        const importoGiocato = parseFloat(row[colImporto]) || 0;
        const esitoRaw = String(row[colEsito] || '').trim().toLowerCase();
        const importoVinto = parseFloat(row[colVincita]) || 0;

        if (!dataRaw || importoGiocato <= 0) return;

        let dataStr;
        if (typeof dataRaw === 'number') {
          const epoch = new Date(1899, 11, 30);
          dataStr = toDateStr(new Date(epoch.getTime() + dataRaw * 86400000));
        } else if (String(dataRaw).match(/^\d{4}-\d{2}-\d{2}/)) {
          dataStr = String(dataRaw).slice(0, 10);
        } else if (String(dataRaw).match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const p = String(dataRaw).split('/');
          dataStr = `${p[2]}-${p[1]}-${p[0]}`;
        } else {
          const d = new Date(dataRaw);
          if (isNaN(d.getTime())) return;
          dataStr = toDateStr(d);
        }

        let esito = 'pending';
        if (esitoRaw === 'vinta' || esitoRaw === 'win' || esitoRaw === 'won' || esitoRaw === 'si') esito = 'win';
        else if (esitoRaw === 'persa' || esitoRaw === 'loss' || esitoRaw === 'lost' || esitoRaw === 'no') esito = 'loss';

        movimenti.push({
          id: 'excel_' + i + '_' + Date.now().toString(36),
          data: dataStr,
          importoGiocato,
          esito,
          importoVinto: esito === 'win' ? importoVinto : 0,
          note: String(row['note'] || row['descrizione'] || ''),
        });
      });

      return { movimenti, saldoIniziale };
    } catch (e) {
      console.error('Errore parsing gestione.xlsx:', e);
      return null;
    }
  };

  const loadGestioneFromLocal = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      const saldoIniziale = parseFloat(localStorage.getItem(SALDO_INIZIALE_KEY)) || DEFAULT_SALDO_INIZIALE;
      if (saved && Array.isArray(saved.movimenti)) {
        return { movimenti: saved.movimenti, saldoIniziale: saved.saldoIniziale || saldoIniziale };
      }
    } catch (e) {}
    return { movimenti: [], saldoIniziale: DEFAULT_SALDO_INIZIALE };
  };

  const saveGestioneToLocal = (movimenti, saldoIniziale) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ movimenti, saldoIniziale, updatedAt: new Date().toISOString() }));
      localStorage.setItem(SALDO_INIZIALE_KEY, String(saldoIniziale));
    } catch (e) {
      console.warn('Errore salvataggio gestione:', e);
    }
  };

  // ============================================================
  // ESPORTAZIONE EXCEL
  // ============================================================

  const esportaExcel = (movimenti, saldoIniziale) => {
    if (typeof XLSX === 'undefined') {
      alert('Libreria XLSX non disponibile');
      return;
    }

    const righe = movimenti
      .slice()
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .map(m => ({
        'Data': m.data,
        'Importo Giocato': m.importoGiocato,
        'Esito': m.esito === 'win' ? 'Vinta' : m.esito === 'loss' ? 'Persa' : 'In attesa',
        'Importo Vinto': m.esito === 'win' ? m.importoVinto : 0,
        'Profitto': m.esito === 'win' ? (m.importoVinto - m.importoGiocato) : m.esito === 'loss' ? -m.importoGiocato : 0,
        'Note': m.note || '',
      }));

    // Riga iniziale con saldo iniziale
    righe.unshift({
      'Data': '',
      'Importo Giocato': '',
      'Esito': 'SALDO INIZIALE',
      'Importo Vinto': saldoIniziale,
      'Profitto': '',
      'Note': '',
    });

    const ws = XLSX.utils.json_to_sheet(righe);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gestione');

    XLSX.writeFile(wb, EXCEL_FILENAME);
  };

  // ============================================================
  // CALCOLI STATISTICHE
  // ============================================================

  const calcolaSaldoCorrente = (movimenti, saldoIniziale) => {
    let saldo = saldoIniziale;
    movimenti.forEach(m => {
      if (m.esito === 'win') saldo += (m.importoVinto - m.importoGiocato);
      else if (m.esito === 'loss') saldo -= m.importoGiocato;
    });
    return saldo;
  };

  const calcolaStatistiche = (movimenti, saldoIniziale) => {
    const completati = movimenti.filter(m => m.esito === 'win' || m.esito === 'loss');
    const vinte = completati.filter(m => m.esito === 'win');
    const perse = completati.filter(m => m.esito === 'loss');
    const pending = movimenti.filter(m => m.esito === 'pending');

    const totaleGiocato = completati.reduce((s, m) => s + m.importoGiocato, 0);
    const totaleVinto = vinte.reduce((s, m) => s + m.importoVinto, 0);
    const profitto = totaleVinto - totaleGiocato;
    const roi = totaleGiocato > 0 ? (profitto / totaleGiocato) * 100 : 0;
    const winRate = completati.length > 0 ? (vinte.length / completati.length) * 100 : 0;

    return {
      saldoCorrente: saldoIniziale + profitto,
      totaleGiocato,
      totaleVinto,
      profitto,
      roi,
      winRate,
      numVinte: vinte.length,
      numPerse: perse.length,
      numPending: pending.length,
      numTotale: completati.length,
    };
  };

  const raggruppaPerPeriodo = (movimenti, saldoIniziale, tipo) => {
    const completati = movimenti
      .filter(m => m.esito === 'win' || m.esito === 'loss')
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    if (completati.length === 0) return [];

    const groups = new Map();

    completati.forEach(m => {
      const d = new Date(m.data + 'T00:00:00');
      let key, label;

      if (tipo === 'giornaliero') {
        key = m.data;
        label = formatDateIT(m.data);
      } else if (tipo === 'settimanale') {
        const gio = getGiovediSettimana(d);
        key = toDateStr(gio);
        label = getWeekLabel(gio);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = getMonthLabel(d);
      }

      if (!groups.has(key)) {
        groups.set(key, { key, label, giocato: 0, vinto: 0, profitto: 0, count: 0, dataOrdine: key });
      }
      const g = groups.get(key);
      g.giocato += m.importoGiocato;
      if (m.esito === 'win') g.vinto += m.importoVinto;
      g.profitto = g.vinto - g.giocato;
      g.count++;
    });

    return Array.from(groups.values()).sort((a, b) => a.dataOrdine.localeCompare(b.dataOrdine));
  };

  // ============================================================
  // COMPONENTE GRAFICO SVG
  // ============================================================

  const GraficoAndamento = ({ movimenti, saldoIniziale }) => {
    const [hoverIdx, setHoverIdx] = useState(null);
    const svgRef = useRef(null);

    const punti = useMemo(() => {
      const completati = movimenti
        .filter(m => m.esito === 'win' || m.esito === 'loss')
        .sort((a, b) => new Date(a.data) - new Date(b.data));

      let saldo = saldoIniziale;
      const arr = [{ idx: 0, data: 'Inizio', saldo }];
      completati.forEach((m, i) => {
        if (m.esito === 'win') saldo += (m.importoVinto - m.importoGiocato);
        else saldo -= m.importoGiocato;
        arr.push({ idx: i + 1, data: formatDateIT(m.data), saldo });
      });
      return arr;
    }, [movimenti, saldoIniziale]);

    if (punti.length < 2) {
      return (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)',
          background: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--border)',
        }}>
          📈 Nessun dato sufficiente per il grafico.
          <br />
          <span style={{ fontSize: '12px' }}>Inserisci almeno una giocata con esito.</span>
        </div>
      );
    }

    const W = 900, H = 320;
    const PAD_L = 60, PAD_R = 20, PAD_T = 20, PAD_B = 50;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    const saldi = punti.map(p => p.saldo);
    const minS = Math.min(...saldi, saldoIniziale);
    const maxS = Math.max(...saldi, saldoIniziale);
    const range = (maxS - minS) || 1;
    const padded_min = minS - range * 0.1;
    const padded_max = maxS + range * 0.1;

    const xScale = (i) => PAD_L + (i / (punti.length - 1)) * innerW;
    const yScale = (v) => PAD_T + innerH - ((v - padded_min) / (padded_max - padded_min)) * innerH;

    const pathD = punti.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.saldo)}`).join(' ');
    const areaD = `${pathD} L ${xScale(punti.length - 1)} ${yScale(padded_min)} L ${xScale(0)} ${yScale(padded_min)} Z`;

    // Linea saldo iniziale
    const yIniziale = yScale(saldoIniziale);

    // Griglia Y
    const numGrid = 5;
    const gridLines = [];
    for (let i = 0; i <= numGrid; i++) {
      const v = padded_min + (i / numGrid) * (padded_max - padded_min);
      gridLines.push({ v, y: yScale(v) });
    }

    const isProfitto = punti[punti.length - 1].saldo >= saldoIniziale;
    const lineColor = isProfitto ? '#6fcf97' : '#eb5757';

    return (
      <div style={{
        background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)',
        padding: '16px', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '15px' }}>
            📈 Andamento Stagione
          </h4>
          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Iniziale: <b style={{ color: 'var(--text)' }}>€{saldoIniziale.toFixed(2)}</b></span>
            <span>Attuale: <b style={{ color: isProfitto ? 'var(--win)' : 'var(--lose)' }}>
              €{punti[punti.length - 1].saldo.toFixed(2)}
            </b></span>
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Griglia */}
            {gridLines.map((g, i) => (
              <g key={i}>
                <line x1={PAD_L} y1={g.y} x2={W - PAD_R} y2={g.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <text x={PAD_L - 8} y={g.y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                  €{g.v.toFixed(0)}
                </text>
              </g>
            ))}

            {/* Linea saldo iniziale */}
            <line x1={PAD_L} y1={yIniziale} x2={W - PAD_R} y2={yIniziale} stroke="var(--accent)" strokeWidth="1" strokeDasharray="5 5" opacity="0.6" />

            {/* Area */}
            <path d={areaD} fill="url(#areaGrad)" />

            {/* Linea */}
            <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Punti (solo hover) */}
            {punti.map((p, i) => (
              <g key={i}>
                {hoverIdx === i && (
                  <circle cx={xScale(i)} cy={yScale(p.saldo)} r="6" fill={lineColor} stroke="#fff" strokeWidth="2" />
                )}
                <circle
                  cx={xScale(i)} cy={yScale(p.saldo)} r="10" fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              </g>
            ))}

            {/* Tooltip */}
            {hoverIdx !== null && (
              <g>
                <rect
                  x={Math.min(Math.max(xScale(hoverIdx) - 70, PAD_L), W - PAD_R - 140)}
                  y={Math.max(yScale(punti[hoverIdx].saldo) - 55, 5)}
                  width="140" height="46" rx="6"
                  fill="var(--surface)" stroke="var(--border)" strokeWidth="1"
                />
                <text
                  x={Math.min(Math.max(xScale(hoverIdx) - 70, PAD_L), W - PAD_R - 140) + 70}
                  y={Math.max(yScale(punti[hoverIdx].saldo) - 55, 5) + 18}
                  textAnchor="middle" fontSize="11" fill="var(--text-muted)"
                >
                  {punti[hoverIdx].data}
                </text>
                <text
                  x={Math.min(Math.max(xScale(hoverIdx) - 70, PAD_L), W - PAD_R - 140) + 70}
                  y={Math.max(yScale(punti[hoverIdx].saldo) - 55, 5) + 36}
                  textAnchor="middle" fontSize="14" fontWeight="bold" fill={lineColor}
                >
                  €{punti[hoverIdx].saldo.toFixed(2)}
                </text>
              </g>
            )}

            {/* Asse X label inizio/fine */}
            <text x={PAD_L} y={H - 20} fontSize="11" fill="var(--text-muted)" textAnchor="start">
              {punti[0].data}
            </text>
            <text x={W - PAD_R} y={H - 20} fontSize="11" fill="var(--text-muted)" textAnchor="end">
              {punti[punti.length - 1].data}
            </text>
          </svg>
        </div>
      </div>
    );
  };

  // ============================================================
  // TABELLA RIEPILOGO PERIODI
  // ============================================================

  const TabellaPeriodi = ({ movimenti, saldoIniziale, tipo }) => {
    const dati = useMemo(() => raggruppaPerPeriodo(movimenti, saldoIniziale, tipo), [movimenti, saldoIniziale, tipo]);

    if (dati.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nessun dato per il periodo selezionato.
        </div>
      );
    }

    // Raggruppa per anno/mese per separatori visivi (solo settimanale/giornaliero)
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>
                {tipo === 'giornaliero' ? 'Giorno' : tipo === 'settimanale' ? 'Settimana (Gio → Mer)' : 'Mese'}
              </th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Giocate</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Tot. Giocato</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Tot. Vinto</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Profitto</th>
              <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {dati.map((d, i) => {
              const roi = d.giocato > 0 ? (d.profitto / d.giocato) * 100 : 0;
              const cls = d.profitto > 0 ? 'var(--win)' : d.profitto < 0 ? 'var(--lose)' : 'var(--text-muted)';
              return (
                <tr key={d.key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{d.label}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{d.count}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>€{d.giocato.toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>€{d.vinto.toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: cls, fontWeight: 'bold' }}>
                    {d.profitto >= 0 ? '+' : ''}€{d.profitto.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: cls, fontWeight: 'bold' }}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface)', fontWeight: 'bold' }}>
              <td style={{ padding: '10px' }}>TOTALE</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{dati.reduce((s, d) => s + d.count, 0)}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>€{dati.reduce((s, d) => s + d.giocato, 0).toFixed(2)}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>€{dati.reduce((s, d) => s + d.vinto, 0).toFixed(2)}</td>
              <td style={{
                padding: '10px', textAlign: 'right',
                color: dati.reduce((s, d) => s + d.profitto, 0) >= 0 ? 'var(--win)' : 'var(--lose)',
              }}>
                {dati.reduce((s, d) => s + d.profitto, 0) >= 0 ? '+' : ''}€{dati.reduce((s, d) => s + d.profitto, 0).toFixed(2)}
              </td>
              <td style={{ padding: '10px', textAlign: 'right' }}>
                {(() => {
                  const tg = dati.reduce((s, d) => s + d.giocato, 0);
                  const tp = dati.reduce((s, d) => s + d.profitto, 0);
                  const r = tg > 0 ? (tp / tg) * 100 : 0;
                  return `${r >= 0 ? '+' : ''}${r.toFixed(1)}%`;
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // ============================================================
  // FORM INSERIMENTO
  // ============================================================

  const FormInserimento = ({ onAdd, onUpdate, movimenti, saldoIniziale }) => {
    const [data, setData] = useState(() => toDateStr(new Date()));
    const [importoGiocato, setImportoGiocato] = useState('');
    const [importoVinto, setImportoVinto] = useState('');
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState(null);

    const saldoCorrente = useMemo(
      () => calcolaSaldoCorrente(movimenti, saldoIniziale),
      [movimenti, saldoIniziale]
    );

    const handleAdd = (esito) => {
      const ig = parseFloat(importoGiocato);
      if (!data || isNaN(ig) || ig <= 0) {
        setMsg({ type: 'error', text: '⚠️ Inserisci data e importo giocato validi' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }

      const iv = parseFloat(importoVinto);
      if (esito === 'win' && (isNaN(iv) || iv <= 0)) {
        setMsg({ type: 'error', text: '⚠️ Inserisci l\'importo vinto per la giocata vincente' });
        setTimeout(() => setMsg(null), 3000);
        return;
      }

      onAdd({
        id: 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        data,
        importoGiocato: ig,
        esito,
        importoVinto: esito === 'win' ? iv : 0,
        note: note.trim(),
      });

      setImportoGiocato('');
      setImportoVinto('');
      setNote('');
      setMsg({ type: 'success', text: esito === 'win' ? '✅ Giocata VINTA registrata!' : '❌ Giocata PERSA registrata!' });
      setTimeout(() => setMsg(null), 2500);
    };

    return (
      <div style={{
        background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)',
        padding: '18px', marginBottom: '20px',
      }}>
        <h4 style={{ margin: '0 0 14px 0', color: 'var(--accent)', fontSize: '15px' }}>
          ➕ Nuova Giocata
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
              📅 Data
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
              💵 Importo Giocato (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={importoGiocato}
              onChange={(e) => setImportoGiocato(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
              🏆 Importo Vinto (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={importoVinto}
              onChange={(e) => setImportoVinto(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
              📝 Note (opz.)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Es. Milan-Roma Over 2.5"
              style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => handleAdd('win')}
            style={{
              flex: 1, minWidth: '140px', padding: '12px 20px',
              background: 'var(--win)', color: '#000', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(111, 207, 151, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            ✅ VINTA
          </button>

          <button
            onClick={() => handleAdd('loss')}
            style={{
              flex: 1, minWidth: '140px', padding: '12px 20px',
              background: 'var(--lose)', color: '#fff', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(235, 87, 87, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            ❌ PERSA
          </button>

          <div style={{
            padding: '10px 16px', background: 'var(--surface)', borderRadius: '8px',
            border: '1px solid var(--border)', fontSize: '13px', fontWeight: 'bold',
          }}>
            💰 Saldo: <span style={{ color: saldoCorrente >= saldoIniziale ? 'var(--win)' : 'var(--lose)' }}>
              €{saldoCorrente.toFixed(2)}
            </span>
          </div>
        </div>

        {msg && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '6px',
            background: msg.type === 'success' ? 'rgba(111, 207, 151, 0.15)' : 'rgba(235, 87, 87, 0.15)',
            border: `1px solid ${msg.type === 'success' ? 'var(--win)' : 'var(--lose)'}`,
            color: msg.type === 'success' ? 'var(--win)' : 'var(--lose)',
            fontSize: '13px', fontWeight: 'bold',
          }}>
            {msg.text}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // LISTA MOVIMENTI (con modifica esito)
  // ============================================================

  const ListaMovimenti = ({ movimenti, onUpdate, onDelete }) => {
    const [filtro, setFiltro] = useState('all');

    const filtrati = useMemo(() => {
      let arr = movimenti.slice().sort((a, b) => new Date(b.data) - new Date(a.data));
      if (filtro === 'win') arr = arr.filter(m => m.esito === 'win');
      else if (filtro === 'loss') arr = arr.filter(m => m.esito === 'loss');
      else if (filtro === 'pending') arr = arr.filter(m => m.esito === 'pending');
      return arr;
    }, [movimenti, filtro]);

    if (movimenti.length === 0) {
      return (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nessuna giocata registrata. Inserisci la prima sopra ☝️
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {[
            { k: 'all', label: `Tutte (${movimenti.length})` },
            { k: 'win', label: `✅ Vinte (${movimenti.filter(m => m.esito === 'win').length})` },
            { k: 'loss', label: `❌ Perse (${movimenti.filter(m => m.esito === 'loss').length})` },
            { k: 'pending', label: `⏳ In attesa (${movimenti.filter(m => m.esito === 'pending').length})` },
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setFiltro(f.k)}
              style={{
                padding: '5px 12px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                border: '1px solid var(--border)',
                background: filtro === f.k ? 'var(--accent)' : 'var(--surface)',
                color: filtro === f.k ? '#000' : 'var(--text-muted)',
                fontWeight: 'bold',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Data</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Giocato</th>
                <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Esito</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Vinto</th>
                <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Profitto</th>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Note</th>
                <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map(m => {
                const profitto = m.esito === 'win' ? (m.importoVinto - m.importoGiocato) : m.esito === 'loss' ? -m.importoGiocato : 0;
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{formatDateIT(m.data)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>€{m.importoGiocato.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                        background: m.esito === 'win' ? 'var(--win)' : m.esito === 'loss' ? 'var(--lose)' : 'var(--text-muted)',
                        color: m.esito === 'loss' ? '#fff' : '#000',
                      }}>
                        {m.esito === 'win' ? '✅ VINTA' : m.esito === 'loss' ? '❌ PERSA' : '⏳ ATTESA'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {m.esito === 'win' ? `€${m.importoVinto.toFixed(2)}` : '—'}
                    </td>
                    <td style={{
                      padding: '8px', textAlign: 'right', fontWeight: 'bold',
                      color: profitto > 0 ? 'var(--win)' : profitto < 0 ? 'var(--lose)' : 'var(--text-muted)',
                    }}>
                      {profitto >= 0 ? '+' : ''}€{profitto.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.note || '—'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {m.esito !== 'win' && (
                          <button
                            onClick={() => onUpdate(m.id, { esito: 'win' })}
                            title="Segna come VINTA"
                            style={{ padding: '3px 8px', fontSize: '10px', background: 'var(--win)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >V</button>
                        )}
                        {m.esito !== 'loss' && (
                          <button
                            onClick={() => onUpdate(m.id, { esito: 'loss' })}
                            title="Segna come PERSA"
                            style={{ padding: '3px 8px', fontSize: '10px', background: 'var(--lose)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >P</button>
                        )}
                        <button
                          onClick={() => { if (window.confirm('Eliminare questa giocata?')) onDelete(m.id); }}
                          title="Elimina"
                          style={{ padding: '3px 8px', fontSize: '10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                        >✕</button>
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
  // COMPONENTE PRINCIPALE: GESTIONE CONTO
  // ============================================================

  function GestioneContoComponent() {
    const [movimenti, setMovimenti] = useState([]);
    const [saldoIniziale, setSaldoIniziale] = useState(DEFAULT_SALDO_INIZIALE);
    const [loading, setLoading] = useState(true);
    const [periodoTipo, setPeriodoTipo] = useState('settimanale');
    const [msg, setMsg] = useState(null);
    const [editSaldo, setEditSaldo] = useState(false);
    const [saldoInput, setSaldoInput] = useState('');
    const [autoSynced, setAutoSynced] = useState(false);

    // Carica da localStorage + Excel all'avvio
    useEffect(() => {
      const local = loadGestioneFromLocal();
      setMovimenti(local.movimenti);
      setSaldoIniziale(local.saldoIniziale);
      setSaldoInput(String(local.saldoIniziale));

      // Prova a caricare da Excel remoto
      (async () => {
        try {
          for (const path of EXCEL_PATHS) {
            try {
              const resp = await fetch(path + '?t=' + Date.now());
              if (resp.ok) {
                const buf = await resp.arrayBuffer();
                const parsed = parseExcelGestione(buf);
                if (parsed && parsed.movimenti) {
                  // Merge: mantieni locali + aggiungi Excel non duplicati
                  const localIds = new Set(local.movimenti.map(m => `${m.data}|${m.importoGiocato}|${m.esito}`));
                  const merge = [...local.movimenti];
                  parsed.movimenti.forEach(em => {
                    const key = `${em.data}|${em.importoGiocato}|${em.esito}`;
                    if (!localIds.has(key)) {
                      merge.push(em);
                      localIds.add(key);
                    }
                  });
                  setMovimenti(merge);
                  setSaldoIniziale(parsed.saldoIniziale || local.saldoIniziale);
                  saveGestioneToLocal(merge, parsed.saldoIniziale || local.saldoIniziale);
                  setAutoSynced(true);
                  console.log('✅ Gestione caricata da Excel:', parsed.movimenti.length, 'movimenti');
                }
                break;
              }
            } catch (e) {
              console.warn('Excel gestione non disponibile:', path);
            }
          }
        } catch (e) {}
        setLoading(false);
      })();
    }, []);

    // Salva su localStorage ad ogni modifica
    useEffect(() => {
      if (!loading) {
        saveGestioneToLocal(movimenti, saldoIniziale);
      }
    }, [movimenti, saldoIniziale, loading]);

    const stats = useMemo(() => calcolaStatistiche(movimenti, saldoIniziale), [movimenti, saldoIniziale]);

    const handleAdd = useCallback((mov) => {
      setMovimenti(prev => [...prev, mov]);
    }, []);

    const handleUpdate = useCallback((id, patch) => {
      setMovimenti(prev => prev.map(m => {
        if (m.id !== id) return m;
        const updated = { ...m, ...patch };
        // Se diventa "win" e non c'è importoVinto, chiedi o imposta 0
        if (patch.esito === 'win' && !updated.importoVinto) {
          const v = window.prompt('Importo vinto (€):', String(updated.importoGiocato * 2));
          const n = parseFloat(v);
          updated.importoVinto = !isNaN(n) && n > 0 ? n : updated.importoGiocato * 2;
        }
        if (patch.esito === 'loss') updated.importoVinto = 0;
        return updated;
      }));
    }, []);

    const handleDelete = useCallback((id) => {
      setMovimenti(prev => prev.filter(m => m.id !== id));
    }, []);

    const handleExport = () => {
      esportaExcel(movimenti, saldoIniziale);
      setMsg({ type: 'success', text: '📥 File ' + EXCEL_FILENAME + ' scaricato!' });
      setTimeout(() => setMsg(null), 3000);
    };

    const handleSaveSaldo = () => {
      const v = parseFloat(saldoInput);
      if (!isNaN(v) && v >= 0) {
        setSaldoIniziale(v);
        setEditSaldo(false);
      }
    };

    return (
      <div>
        {/* HEADER con stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px',
          marginBottom: '20px',
        }}>
          <StatCard
            icon="💰"
            label="Saldo Corrente"
            value={`€${stats.saldoCorrente.toFixed(2)}`}
            color={stats.saldoCorrente >= saldoIniziale ? 'var(--win)' : 'var(--lose)'}
          />
          <StatCard
            icon="📊"
            label="Profitto"
            value={`${stats.profitto >= 0 ? '+' : ''}€${stats.profitto.toFixed(2)}`}
            color={stats.profitto >= 0 ? 'var(--win)' : 'var(--lose)'}
          />
          <StatCard
            icon="📈"
            label="ROI"
            value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
            color={stats.roi >= 0 ? 'var(--win)' : 'var(--lose)'}
          />
          <StatCard
            icon="🎯"
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.numVinte}V / ${stats.numPerse}P`}
            color="var(--accent)"
          />
          <StatCard
            icon="🎲"
            label="Giocate"
            value={stats.numTotale}
            sub={stats.numPending > 0 ? `${stats.numPending} in attesa` : ''}
            color="var(--accent)"
          />
        </div>

        {/* Form inserimento */}
        <FormInserimento
          onAdd={handleAdd}
          movimenti={movimenti}
          saldoIniziale={saldoIniziale}
        />

        {/* Saldo iniziale + Export */}
        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
          marginBottom: '20px', padding: '12px 16px', background: 'var(--card)',
          borderRadius: '10px', border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>💵 Saldo iniziale:</span>
            {editSaldo ? (
              <>
                <input
                  type="number" step="0.01" value={saldoInput}
                  onChange={(e) => setSaldoInput(e.target.value)}
                  style={{ width: '110px', padding: '4px 8px', fontSize: '13px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px' }}
                />
                <button onClick={handleSaveSaldo} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--win)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                <button onClick={() => setEditSaldo(false)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent)' }}>€{saldoIniziale.toFixed(2)}</span>
                <button onClick={() => setEditSaldo(true)} style={{ padding: '3px 10px', fontSize: '11px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>✏️ Modifica</button>
              </>
            )}
          </div>

          <button
            onClick={handleExport}
            style={{
              padding: '10px 20px', background: 'var(--accent)', color: '#000', border: 'none',
              borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            💾 Salva su Excel (gestione.xlsx)
          </button>

          {autoSynced && (
            <span style={{ fontSize: '11px', color: 'var(--win)', fontWeight: 'bold' }}>
              ✅ Sincronizzato da GitHub
            </span>
          )}
        </div>

        {msg && (
          <div style={{
            marginBottom: '16px', padding: '10px 14px', borderRadius: '6px',
            background: 'rgba(111, 207, 151, 0.15)', border: '1px solid var(--win)',
            color: 'var(--win)', fontSize: '13px', fontWeight: 'bold',
          }}>
            {msg.text}
          </div>
        )}

        {/* Grafico */}
        <GraficoAndamento movimenti={movimenti} saldoIniziale={saldoIniziale} />

        {/* Periodo selettore */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, flex: 1, color: 'var(--accent)', fontSize: '15px' }}>
              📊 Riepilogo Periodi
            </h4>
            {[
              { k: 'giornaliero', label: '📅 Giornaliero' },
              { k: 'settimanale', label: '🗓️ Settimanale (Gio→Mer)' },
              { k: 'mensile', label: '📆 Mensile' },
            ].map(p => (
              <button
                key={p.k}
                onClick={() => setPeriodoTipo(p.k)}
                style={{
                  padding: '7px 14px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: periodoTipo === p.k ? 'var(--accent)' : 'var(--surface)',
                  color: periodoTipo === p.k ? '#000' : 'var(--text)',
                  fontWeight: 'bold',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <TabellaPeriodi movimenti={movimenti} saldoIniziale={saldoIniziale} tipo={periodoTipo} />
          </div>
        </div>

        {/* Lista movimenti */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent)', fontSize: '15px' }}>
            📋 Storico Giocate
          </h4>
          <div style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '12px' }}>
            <ListaMovimenti movimenti={movimenti} onUpdate={handleUpdate} onDelete={handleDelete} />
          </div>
        </div>

        {/* Info */}
        <div style={{
          marginTop: '16px', padding: '12px 16px', background: 'var(--surface)',
          borderRadius: '8px', border: '1px solid var(--border)', fontSize: '11px',
          color: 'var(--text-muted)', lineHeight: '1.6',
        }}>
          <b style={{ color: 'var(--accent)' }}>💡 Info:</b> La settimana va da <b>Giovedì</b> a <b>Mercoledì</b> successivo.
          I dati sono salvati localmente e sincronizzati da <code>excel/gestione.xlsx</code> su GitHub.
          Usa <b>Salva su Excel</b> per esportare e ricaricare il file su GitHub.
        </div>
      </div>
    );
  }

  // ============================================================
  // STAT CARD
  // ============================================================

  const StatCard = ({ icon, label, value, sub, color }) => (
    <div style={{
      background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)',
      padding: '12px 14px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '20px', marginBottom: '2px' }}>{icon}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: color || 'var(--text)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );

  // ============================================================
  // ESPOSIZIONE GLOBALE
  // ============================================================

  window.GestioneContoComponent = GestioneContoComponent;

  window.GestioneContoUtils = {
    getGiovediSettimana,
    getMercolediSuccessivo,
    getWeekLabel,
    calcolaSaldoCorrente,
    calcolaStatistiche,
    raggruppaPerPeriodo,
    esportaExcel,
    EXCEL_FILENAME,
  };

  console.log('✅ Modulo Gestione Conto caricato');
})();