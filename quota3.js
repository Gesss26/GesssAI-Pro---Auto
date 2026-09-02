<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>GesssAI-Pro v3.0 • Quota 3</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; }
  body { background: #0f1419; color: #e6edf3; padding: 20px; }
  .container { max-width: 1100px; margin: 0 auto; }
  .card { background: #232b36; border: 1px solid #30363d; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
  .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
  .col { flex: 1; min-width: 180px; }
  label { font-weight: 600; color: #ffff00; display: block; margin-bottom: 4px; font-size: 14px; }
  input, button { border-radius: 10px; border: none; padding: 12px 16px; font-size: 16px; }
  input { background: #1a2028; color: #e6edf3; border: 1px solid #30363d; width: 100%; max-width: 220px; }
  input:focus { outline: 2px solid #f39c12; }
  .btn { background: #f39c12; color: #000; font-weight: 700; cursor: pointer; transition: 0.2s; border: none; padding: 12px 28px; border-radius: 40px; font-size: 16px; }
  .btn:hover { background: #e67e22; transform: scale(1.02); }
  .btn:active { transform: scale(0.97); }
  .btn-secondary { background: #2c3642; color: #e6edf3; }
  .btn-secondary:hover { background: #3b4757; }
  .btn-success { background: #6fcf97; color: #000; }
  .btn-danger { background: #eb5757; color: #fff; }
  .btn-sm { padding: 6px 14px; font-size: 14px; }
  .btn-group { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .grid { display: grid; grid-template-columns: 60px 120px 100px 110px 120px 140px; gap: 6px 12px; align-items: center; font-size: 14px; margin: 16px 0; }
  .grid-header { font-weight: 700; color: #ffff00; border-bottom: 2px solid #30363d; padding-bottom: 8px; margin-bottom: 6px; }
  .grid-item { padding: 6px 4px; border-bottom: 1px solid #30363d; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 30px; font-weight: 700; font-size: 13px; }
  .status-win { background: #6fcf97; color: #000; }
  .status-loss { background: #eb5757; color: #fff; }
  .status-pending { background: #f2c94c; color: #000; }
  .deposit-box { background: #1a2028; border-radius: 12px; padding: 16px 20px; border-left: 6px solid #f39c12; margin: 16px 0; }
  .summary { background: #1a2028; border-radius: 12px; padding: 16px 20px; border: 1px solid #30363d; margin-top: 16px; }
  .summary p { margin: 6px 0; }
  .flex { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .mt-12 { margin-top: 12px; }
  .mb-8 { margin-bottom: 8px; }
  .text-muted { color: #8b949e; }
  .text-accent { color: #f39c12; }
  .text-win { color: #6fcf97; }
  .text-loss { color: #eb5757; }
  .hidden { display: none; }
  .tab-bar { display: flex; gap: 4px; background: #1a2028; padding: 6px; border-radius: 14px; margin-bottom: 28px; flex-wrap: wrap; }
  .tab-btn { background: transparent; border: none; padding: 12px 24px; color: #8b949e; font-weight: 600; border-radius: 10px; cursor: pointer; transition: 0.2s; font-size: 15px; }
  .tab-btn.active { background: #f39c12; color: #000; }
  .tab-btn:hover { background: #2c3642; color: #fff; }

  /* tolgo l'aurea quadrata d'oro intorno al logo */
  .splash-logo { border: none !important; box-shadow: none !important; outline: none !important; }
  .logo-wrapper { border: none !important; box-shadow: none !important; }
</style>
</head>
<body>

<div id="root"></div>

<!-- React, Babel, XLSX -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

<script type="text/babel">
// ============================================================
// COMPONENTE QUOTA 3 (STANDALONE)
// ============================================================

const Quota3 = ({ showAlert }) => {
  // Stato principale
  const [importoBase, setImportoBase] = useState(10);
  const [importoInput, setImportoInput] = useState(10);
  const [stepCorrente, setStepCorrente] = useState(0);          // 0..9
  const [storico, setStorico] = useState([]);                  // array { step, importo, quota, vincita, deposito, esito }
  const [depositoTotale, setDepositoTotale] = useState(0);
  const [percorsoAttivo, setPercorsoAttivo] = useState(false);
  const [partitaCorrente, setPartitaCorrente] = useState(null); // { importo, quota, vincita, deposito, esito }
  const [stepBloccato, setStepBloccato] = useState(false);      // attesa esito

  // Riepilogo per visualizzazione sotto griglia
  const [riepilogo, setRiepilogo] = useState('');

  // Funzione per iniziare un nuovo percorso
  const avviaPercorso = (importo) => {
    const val = parseFloat(importo) || 10;
    setImportoBase(val);
    setImportoInput(val);
    setStepCorrente(0);
    setStorico([]);
    setDepositoTotale(0);
    setPercorsoAttivo(true);
    setStepBloccato(false);
    setPartitaCorrente(null);
    setRiepilogo('');
    // Crea il primo step
    const primo = {
      step: 1,
      importo: val,
      quota: val * 3,
      vincita: 0,
      deposito: 0,
      esito: 'in corso'
    };
    setPartitaCorrente(primo);
    setRiepilogo(`🎯 Step 1: importo €${val.toFixed(2)}, quota €${(val*3).toFixed(2)}. In attesa di esito.`);
    if (showAlert) showAlert('info', `💰 Nuovo percorso iniziato con €${val.toFixed(2)}`);
  };

  // Gestione esito: Vinta o Persa
  const gestisciEsito = (esito) => {
    if (!partitaCorrente || stepBloccato) return;
    if (stepCorrente >= 10) {
      setRiepilogo('🏁 Percorso completato (10 step massimi). Puoi iniziare un nuovo percorso.');
      setPercorsoAttivo(false);
      return;
    }

    const importo = partitaCorrente.importo;
    const quota = partitaCorrente.quota;
    let depositoAggiunto = 0;
    let nuovoImporto = 0;
    let nuovoStorico = [...storico];
    let esitoLabel = '';

    if (esito === 'vinta') {
      // Vincita = quota intera, 1/3 va in deposito, 2/3 per lo step successivo
      const vincita = quota; // importo * 3
      depositoAggiunto = vincita / 3;
      nuovoImporto = (vincita * 2) / 3; // 2/3 della vincita
      esitoLabel = '✅ Vinta';
      // Aggiorna deposito
      setDepositoTotale(prev => prev + depositoAggiunto);
      // Registra nello storico
      const record = {
        step: stepCorrente + 1,
        importo: importo,
        quota: quota,
        vincita: vincita,
        deposito: depositoAggiunto,
        esito: 'vinta'
      };
      nuovoStorico.push(record);
      setStorico(nuovoStorico);

      // Se abbiamo raggiunto 10 step, fine
      if (stepCorrente + 1 >= 10) {
        setStepCorrente(9);
        setPartitaCorrente(null);
        setStepBloccato(true);
        setPercorsoAttivo(false);
        setRiepilogo(`🏁 Percorso completato! Deposito totale: €${(depositoTotale + depositoAggiunto).toFixed(2)}. Hai vinto tutti gli step.`);
        if (showAlert) showAlert('success', `🎉 Percorso completato! Deposito: €${(depositoTotale + depositoAggiunto).toFixed(2)}`);
        return;
      }

      // Prossimo step
      const nuovoStep = stepCorrente + 1;
      setStepCorrente(nuovoStep);
      setPartitaCorrente({
        step: nuovoStep + 1,
        importo: nuovoImporto,
        quota: nuovoImporto * 3,
        vincita: 0,
        deposito: 0,
        esito: 'in corso'
      });
      setStepBloccato(false);
      setRiepilogo(`✅ Step ${nuovoStep+1}: importo €${nuovoImporto.toFixed(2)}, quota €${(nuovoImporto*3).toFixed(2)}. In attesa di esito. Deposito +€${depositoAggiunto.toFixed(2)}`);
      if (showAlert) showAlert('success', `✅ Step vinto! Prossimo importo: €${nuovoImporto.toFixed(2)}`);
    } else if (esito === 'persa') {
      // Persa: si ferma il percorso, chiede se ricominciare
      esitoLabel = '❌ Persa';
      const record = {
        step: stepCorrente + 1,
        importo: importo,
        quota: quota,
        vincita: 0,
        deposito: 0,
        esito: 'persa'
      };
      nuovoStorico.push(record);
      setStorico(nuovoStorico);
      setStepBloccato(true);
      setPercorsoAttivo(false);
      setPartitaCorrente(null);
      setRiepilogo(`❌ Step ${stepCorrente+1} perso. Percorso terminato. Deposito totale: €${depositoTotale.toFixed(2)}. Vuoi ricominciare?`);
      if (showAlert) showAlert('error', `❌ Step perso! Deposito finale: €${depositoTotale.toFixed(2)}`);
    }
  };

  // Reset / ricomincia
  const resetPercorso = () => {
    setPercorsoAttivo(false);
    setStepCorrente(0);
    setStorico([]);
    setDepositoTotale(0);
    setPartitaCorrente(null);
    setStepBloccato(false);
    setRiepilogo('');
    setImportoInput(importoBase);
    if (showAlert) showAlert('info', '🔄 Percorso resettato. Imposta un nuovo importo e clicca "Conferma".');
  };

  // Conferma importo iniziale
  const confermaImporto = () => {
    if (percorsoAttivo) {
      if (showAlert) showAlert('warning', '⚠️ Un percorso è già attivo. Resetta o completa prima.');
      return;
    }
    const val = parseFloat(importoInput) || 10;
    if (val <= 0) {
      if (showAlert) showAlert('error', 'Inserisci un importo valido > 0');
      return;
    }
    avviaPercorso(val);
  };

  // Render step attuale
  const renderStepAttuale = () => {
    if (!percorsoAttivo && !partitaCorrente && stepCorrente === 0) {
      return <div className="text-muted">Nessun percorso attivo. Imposta importo e clicca "Conferma".</div>;
    }
    if (partitaCorrente && !stepBloccato) {
      const p = partitaCorrente;
      return (
        <div className="deposit-box">
          <div className="flex" style={{justifyContent: 'space-between'}}>
            <div>
              <strong style={{color: '#ffff00'}}>Step {p.step || stepCorrente+1}</strong>
              <div>Importo: €{p.importo.toFixed(2)}</div>
              <div>Quota (x3): €{p.quota.toFixed(2)}</div>
            </div>
            <div className="btn-group">
              <button className="btn btn-success btn-sm" onClick={() => gestisciEsito('vinta')}>✅ Vinta</button>
              <button className="btn btn-danger btn-sm" onClick={() => gestisciEsito('persa')}>❌ Persa</button>
            </div>
          </div>
        </div>
      );
    }
    if (stepBloccato || !percorsoAttivo) {
      return (
        <div className="deposit-box" style={{borderLeftColor: '#eb5757'}}>
          <p><strong>Percorso terminato</strong> (step {stepCorrente+1}/10)</p>
          <p>Deposito totale: €{depositoTotale.toFixed(2)}</p>
          <div className="btn-group mt-12">
            <button className="btn btn-success btn-sm" onClick={() => avviaPercorso(importoBase)}>✅ Sì, ricomincia</button>
            <button className="btn btn-secondary btn-sm" onClick={resetPercorso}>❌ No, ferma</button>
          </div>
        </div>
      );
    }
    return null;
  };

  // Griglia 10 step
  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const storicoItem = storico.find(s => s.step === i+1);
      let esito = storicoItem ? storicoItem.esito : (i === stepCorrente && partitaCorrente ? 'in corso' : '');
      let importo = '';
      let quota = '';
      let deposito = '';
      if (storicoItem) {
        importo = storicoItem.importo.toFixed(2);
        quota = storicoItem.quota.toFixed(2);
        deposito = storicoItem.deposito ? storicoItem.deposito.toFixed(2) : '0.00';
      } else if (i === stepCorrente && partitaCorrente) {
        importo = partitaCorrente.importo.toFixed(2);
        quota = partitaCorrente.quota.toFixed(2);
        deposito = '-';
      } else {
        importo = '-';
        quota = '-';
        deposito = '-';
      }

      let checkCell = '';
      if (storicoItem) {
        if (storicoItem.esito === 'vinta') checkCell = <span className="status-badge status-win">✅ Vinta</span>;
        else if (storicoItem.esito === 'persa') checkCell = <span className="status-badge status-loss">❌ Persa</span>;
        else checkCell = <span className="status-badge status-pending">⏳</span>;
      } else if (i === stepCorrente && partitaCorrente && !stepBloccato) {
        checkCell = (
          <span className="btn-group" style={{gap: '4px'}}>
            <button className="btn btn-success btn-sm" style={{padding: '4px 10px', fontSize: '12px'}} onClick={() => gestisciEsito('vinta')}>✅</button>
            <button className="btn btn-danger btn-sm" style={{padding: '4px 10px', fontSize: '12px'}} onClick={() => gestisciEsito('persa')}>❌</button>
          </span>
        );
      } else if (i === stepCorrente && stepBloccato) {
        checkCell = <span className="status-badge status-pending">⏳</span>;
      } else {
        checkCell = <span className="text-muted">-</span>;
      }

      rows.push(
        <div key={i} className="grid-item">
          <span style={{fontWeight: 700, color: i === stepCorrente ? '#f39c12' : '#e6edf3'}}>{i+1}</span>
        </div>,
        <div key={`imp-${i}`} className="grid-item">{importo}</div>,
        <div key={`quota-${i}`} className="grid-item">{quota}</div>,
        <div key={`dep-${i}`} className="grid-item">{deposito}</div>,
        <div key={`check-${i}`} className="grid-item">{checkCell}</div>
      );
    }
    // Aggiungo anche la colonna "Data" fittizia (la nascondo visivamente ma tengo struttura)
    return (
      <>
        <div className="grid-header" style={{gridColumn: '1 / 2'}}>Step</div>
        <div className="grid-header" style={{gridColumn: '2 / 3'}}>Importo</div>
        <div className="grid-header" style={{gridColumn: '3 / 4'}}>Quota (x3)</div>
        <div className="grid-header" style={{gridColumn: '4 / 5'}}>Deposito</div>
        <div className="grid-header" style={{gridColumn: '5 / 6'}}>Check</div>
        {rows}
      </>
    );
  };

  return (
    <div>
      <div className="card">
        <div className="row">
          <div className="col">
            <label>💰 Importo iniziale (€)</label>
            <input 
              type="number" 
              min="1" 
              step="1" 
              value={importoInput} 
              onChange={(e) => setImportoInput(e.target.value)}
              disabled={percorsoAttivo}
            />
          </div>
          <div className="col" style={{display: 'flex', alignItems: 'flex-end'}}>
            <button className="btn" onClick={confermaImporto} disabled={percorsoAttivo}>
              {percorsoAttivo ? '⏳ In corso...' : 'Conferma'}
            </button>
          </div>
          <div className="col" style={{textAlign: 'right'}}>
            <button className="btn btn-secondary" onClick={resetPercorso}>🔄 Reset</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{color: '#ffff00', marginBottom: '12px'}}>📊 Step (max 10)</h3>
        <div style={{overflowX: 'auto'}}>
          <div className="grid" style={{gridTemplateColumns: '60px 120px 110px 120px 140px'}}>
            {renderGrid()}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <div className="col">
            <h4 style={{color: '#f39c12'}}>📈 Stato percorso</h4>
            {renderStepAttuale()}
          </div>
          <div className="col" style={{minWidth: '200px'}}>
            <h4 style={{color: '#f39c12'}}>💰 Deposito totale</h4>
            <div style={{fontSize: '28px', fontWeight: 'bold', color: '#6fcf97'}}>€{depositoTotale.toFixed(2)}</div>
          </div>
        </div>

        {riepilogo && (
          <div className="summary">
            <p style={{color: '#e6edf3'}}><strong>📋 Riepilogo</strong></p>
            <p>{riepilogo}</p>
            {storico.length > 0 && (
              <div style={{fontSize: '13px', marginTop: '8px', borderTop: '1px solid #30363d', paddingTop: '8px'}}>
                {storico.map((s, idx) => (
                  <span key={idx} style={{marginRight: '12px'}}>
                    Step {s.step}: {s.esito === 'vinta' ? '✅' : '❌'} 
                    {s.esito === 'vinta' && ` +€${s.deposito.toFixed(2)}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{marginTop: '20px', fontSize: '12px', color: '#8b949e', textAlign: 'center', borderTop: '1px solid #30363d', paddingTop: '16px'}}>
        ⚠️ Le scommesse comportano rischi finanziari. Gioca responsabilmente.
      </div>
    </div>
  );
};

// ============================================================
// APP PRINCIPALE (con TAB + Quota 3)
// ============================================================

const App = () => {
  const [tab, setTab] = useState('Quota 3');

  // Splash e logo rimossi (non richiesti)

  return (
    <div className="container">
      <div style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'}}>
        <h1 style={{color: '#f39c12', fontSize: '28px', letterSpacing: '1px'}}>GesssAI-Pro v3.0</h1>
        <span style={{background: '#1a2028', padding: '4px 16px', borderRadius: '30px', color: '#ffff00', fontSize: '14px'}}>Quota 3</span>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'Quota 3' ? 'active' : ''}`} onClick={() => setTab('Quota 3')}>🎯 Quota 3</button>
        <button className="tab-btn" onClick={() => setTab('Palinsesto')}>📅 Palinsesto</button>
        <button className="tab-btn" onClick={() => setTab('Statistiche')}>📊 Statistiche</button>
        <button className="tab-btn" onClick={() => setTab('Schedina')}>🎯 Schedina</button>
        <button className="tab-btn" onClick={() => setTab('Impostazioni')}>⚙️ Impostazioni</button>
      </div>

      {tab === 'Quota 3' && <Quota3 showAlert={(type, msg) => console.log(type, msg)} />}
      {tab !== 'Quota 3' && (
        <div className="card" style={{textAlign: 'center', padding: '60px 20px', color: '#8b949e'}}>
          <div style={{fontSize: '48px'}}>📂</div>
          <p style={{fontSize: '18px', marginTop: '12px'}}>Modulo <strong>{tab}</strong> in fase di caricamento...</p>
          <p style={{fontSize: '14px'}}>Le funzionalità complete sono disponibili nella tab <strong>Quota 3</strong>.</p>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>

</body>
</html>