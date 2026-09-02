// ============================================================
// COMPONENTE QUOTA 3 (STANDALONE)
// ============================================================

const { useState } = React;

const Quota3 = ({ showAlert }) => {
  // Stato principale
  const [importoBase, setImportoBase] = useState(10);
  const [importoInput, setImportoInput] = useState(10);
  const [stepCorrente, setStepCorrente] = useState(0);
  const [storico, setStorico] = useState([]);
  const [depositoTotale, setDepositoTotale] = useState(0);
  const [percorsoAttivo, setPercorsoAttivo] = useState(false);
  const [partitaCorrente, setPartitaCorrente] = useState(null);
  const [stepBloccato, setStepBloccato] = useState(false);
  const [riepilogo, setRiepilogo] = useState('');

  // Avvia percorso
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

  // Gestione esito
  const gestisciEsito = (esito) => {
    if (!partitaCorrente || stepBloccato) return;
    if (stepCorrente >= 10) {
      setRiepilogo('🏁 Percorso completato (10 step massimi).');
      setPercorsoAttivo(false);
      return;
    }

    const importo = partitaCorrente.importo;
    const quota = partitaCorrente.quota;
    let depositoAggiunto = 0;
    let nuovoImporto = 0;
    let nuovoStorico = [...storico];

    if (esito === 'vinta') {
      const vincita = quota;
      depositoAggiunto = vincita / 3;
      nuovoImporto = (vincita * 2) / 3;
      
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
      setDepositoTotale(prev => prev + depositoAggiunto);

      if (stepCorrente + 1 >= 10) {
        setStepCorrente(9);
        setPartitaCorrente(null);
        setStepBloccato(true);
        setPercorsoAttivo(false);
        setRiepilogo(`🏁 Percorso completato! Deposito totale: €${(depositoTotale + depositoAggiunto).toFixed(2)}.`);
        if (showAlert) showAlert('success', `🎉 Percorso completato! Deposito: €${(depositoTotale + depositoAggiunto).toFixed(2)}`);
        return;
      }

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
      setRiepilogo(`✅ Step ${nuovoStep+1}: importo €${nuovoImporto.toFixed(2)}, quota €${(nuovoImporto*3).toFixed(2)}. Deposito +€${depositoAggiunto.toFixed(2)}`);
      if (showAlert) showAlert('success', `✅ Step vinto! Prossimo importo: €${nuovoImporto.toFixed(2)}`);
    } else {
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
      setRiepilogo(`❌ Step ${stepCorrente+1} perso. Deposito totale: €${depositoTotale.toFixed(2)}. Vuoi ricominciare?`);
      if (showAlert) showAlert('error', `❌ Step perso! Deposito finale: €${depositoTotale.toFixed(2)}`);
    }
  };

  // Reset
  const resetPercorso = () => {
    setPercorsoAttivo(false);
    setStepCorrente(0);
    setStorico([]);
    setDepositoTotale(0);
    setPartitaCorrente(null);
    setStepBloccato(false);
    setRiepilogo('');
    setImportoInput(importoBase);
    if (showAlert) showAlert('info', '🔄 Percorso resettato.');
  };

  // Conferma importo
  const confermaImporto = () => {
    if (percorsoAttivo) {
      if (showAlert) showAlert('warning', '⚠️ Un percorso è già attivo.');
      return;
    }
    const val = parseFloat(importoInput) || 10;
    if (val <= 0) {
      if (showAlert) showAlert('error', 'Inserisci un importo valido > 0');
      return;
    }
    avviaPercorso(val);
  };

  const renderStepAttuale = () => {
    if (!percorsoAttivo && !partitaCorrente && stepCorrente === 0) {
      return <div className="text-muted">Nessun percorso attivo. Imposta importo e clicca "Conferma".</div>;
    }
    if (partitaCorrente && !stepBloccato) {
      const p = partitaCorrente;
      return (
        <div style={{background: '#1a2028', borderRadius: '12px', padding: '16px 20px', borderLeft: '6px solid #f39c12', margin: '16px 0'}}>
          <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <strong style={{color: '#ffff00'}}>Step {p.step || stepCorrente+1}</strong>
              <div>Importo: €{p.importo.toFixed(2)}</div>
              <div>Quota (x3): €{p.quota.toFixed(2)}</div>
            </div>
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <button className="btn btn-success" style={{padding: '6px 14px', fontSize: '14px'}} onClick={() => gestisciEsito('vinta')}>✅ Vinta</button>
              <button className="btn btn-danger" style={{padding: '6px 14px', fontSize: '14px'}} onClick={() => gestisciEsito('persa')}>❌ Persa</button>
            </div>
          </div>
        </div>
      );
    }
    if (stepBloccato || !percorsoAttivo) {
      return (
        <div style={{background: '#1a2028', borderRadius: '12px', padding: '16px 20px', borderLeft: '6px solid #eb5757', margin: '16px 0'}}>
          <p><strong>Percorso terminato</strong> (step {stepCorrente+1}/10)</p>
          <p>Deposito totale: €{depositoTotale.toFixed(2)}</p>
          <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
            <button className="btn btn-success" style={{padding: '6px 14px', fontSize: '14px'}} onClick={() => avviaPercorso(importoBase)}>✅ Sì, ricomincia</button>
            <button className="btn btn-secondary" style={{padding: '6px 14px', fontSize: '14px'}} onClick={resetPercorso}>❌ No, ferma</button>
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
        if (storicoItem.esito === 'vinta') checkCell = <span style={{background: '#6fcf97', color: '#000', padding: '4px 12px', borderRadius: '30px', fontWeight: 'bold', fontSize: '13px'}}>✅ Vinta</span>;
        else if (storicoItem.esito === 'persa') checkCell = <span style={{background: '#eb5757', color: '#fff', padding: '4px 12px', borderRadius: '30px', fontWeight: 'bold', fontSize: '13px'}}>❌ Persa</span>;
        else checkCell = <span style={{background: '#f2c94c', color: '#000', padding: '4px 12px', borderRadius: '30px', fontWeight: 'bold', fontSize: '13px'}}>⏳</span>;
      } else if (i === stepCorrente && partitaCorrente && !stepBloccato) {
        checkCell = (
          <span style={{display: 'flex', gap: '4px'}}>
            <button className="btn btn-success" style={{padding: '4px 10px', fontSize: '12px'}} onClick={() => gestisciEsito('vinta')}>✅</button>
            <button className="btn btn-danger" style={{padding: '4px 10px', fontSize: '12px'}} onClick={() => gestisciEsito('persa')}>❌</button>
          </span>
        );
      } else {
        checkCell = <span className="text-muted">-</span>;
      }

      rows.push(
        <div key={i} style={{padding: '8px 4px', borderBottom: '1px solid #30363d'}}>
          <span style={{fontWeight: 700, color: i === stepCorrente ? '#f39c12' : '#e6edf3'}}>{i+1}</span>
        </div>,
        <div key={`imp-${i}`} style={{padding: '8px 4px', borderBottom: '1px solid #30363d'}}>{importo}</div>,
        <div key={`quota-${i}`} style={{padding: '8px 4px', borderBottom: '1px solid #30363d'}}>{quota}</div>,
        <div key={`dep-${i}`} style={{padding: '8px 4px', borderBottom: '1px solid #30363d'}}>{deposito}</div>,
        <div key={`check-${i}`} style={{padding: '8px 4px', borderBottom: '1px solid #30363d'}}>{checkCell}</div>
      );
    }
    return (
      <div style={{display: 'grid', gridTemplateColumns: '60px 120px 110px 120px 140px', gap: '6px 12px', fontSize: '14px', margin: '16px 0'}}>
        <div style={{fontWeight: 700, color: '#ffff00', borderBottom: '2px solid #30363d', paddingBottom: '8px'}}>Step</div>
        <div style={{fontWeight: 700, color: '#ffff00', borderBottom: '2px solid #30363d', paddingBottom: '8px'}}>Importo</div>
        <div style={{fontWeight: 700, color: '#ffff00', borderBottom: '2px solid #30363d', paddingBottom: '8px'}}>Quota (x3)</div>
        <div style={{fontWeight: 700, color: '#ffff00', borderBottom: '2px solid #30363d', paddingBottom: '8px'}}>Deposito</div>
        <div style={{fontWeight: 700, color: '#ffff00', borderBottom: '2px solid #30363d', paddingBottom: '8px'}}>Check</div>
        {rows}
      </div>
    );
  };

  return (
    <div>
      <div className="card">
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end'}}>
          <div style={{flex: 1, minWidth: '180px'}}>
            <label style={{fontWeight: 600, color: '#ffff00', display: 'block', marginBottom: '4px', fontSize: '14px'}}>💰 Importo iniziale (€)</label>
            <input 
              type="number" 
              min="1" 
              step="1" 
              value={importoInput} 
              onChange={(e) => setImportoInput(e.target.value)}
              disabled={percorsoAttivo}
              style={{width: '100%', maxWidth: '220px', padding: '12px 16px', background: '#1a2028', color: '#e6edf3', border: '1px solid #30363d', borderRadius: '10px', fontSize: '16px'}}
            />
          </div>
          <div>
            <button className="btn" onClick={confermaImporto} disabled={percorsoAttivo} style={{padding: '12px 28px'}}>
              {percorsoAttivo ? '⏳ In corso...' : 'Conferma'}
            </button>
          </div>
          <div>
            <button className="btn btn-secondary" onClick={resetPercorso} style={{padding: '12px 28px'}}>🔄 Reset</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{color: '#ffff00', marginBottom: '12px'}}>📊 Step (max 10)</h3>
        <div style={{overflowX: 'auto'}}>
          {renderGrid()}
        </div>
      </div>

      <div className="card">
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '16px'}}>
          <div style={{flex: 1, minWidth: '200px'}}>
            <h4 style={{color: '#f39c12'}}>📈 Stato percorso</h4>
            {renderStepAttuale()}
          </div>
          <div style={{minWidth: '180px'}}>
            <h4 style={{color: '#f39c12'}}>💰 Deposito totale</h4>
            <div style={{fontSize: '28px', fontWeight: 'bold', color: '#6fcf97'}}>€{depositoTotale.toFixed(2)}</div>
          </div>
        </div>

        {riepilogo && (
          <div style={{background: '#1a2028', borderRadius: '12px', padding: '16px 20px', border: '1px solid #30363d', marginTop: '16px'}}>
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

window.Quota3 = Quota3;
console.log('✅ Quota3 caricato correttamente!');