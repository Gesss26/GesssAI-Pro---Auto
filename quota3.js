// ============================================================
// QUOTA 3 - Componente Autonomo con localStorage
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // STILI INLINE PER IL COMPONENTE
    // ============================================================
    const styles = `
        .quota3-container {
            max-width: 100%;
            margin: 0 auto;
            padding: 0;
        }
        .quota3-container .card {
            background: #232b36;
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .quota3-container .card h3 {
            color: #ffff00;
            margin-bottom: 12px;
            font-size: 18px;
        }
        .quota3-container .card h4 {
            color: #f39c12;
            margin-bottom: 8px;
            font-size: 16px;
        }
        .quota3-container .flex {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: flex-end;
        }
        .quota3-container .flex-between {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: center;
            justify-content: space-between;
        }
        .quota3-container label {
            font-weight: 600;
            color: #ffff00;
            display: block;
            margin-bottom: 4px;
            font-size: 14px;
        }
        .quota3-container input[type="number"] {
            width: 100%;
            max-width: 200px;
            padding: 10px 14px;
            background: #1a2028;
            color: #e6edf3;
            border: 1px solid #30363d;
            border-radius: 8px;
            font-size: 16px;
        }
        .quota3-container input[type="number"]:focus {
            outline: 2px solid #f39c12;
        }
        .quota3-container input[type="number"]:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .quota3-container .btn {
            padding: 10px 22px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s;
        }
        .quota3-container .btn:hover {
            transform: translateY(-2px);
        }
        .quota3-container .btn:active {
            transform: scale(0.95);
        }
        .quota3-container .btn-primary {
            background: #f39c12;
            color: #000;
        }
        .quota3-container .btn-primary:hover {
            background: #e67e22;
            box-shadow: 0 4px 20px rgba(243, 156, 18, 0.3);
        }
        .quota3-container .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .quota3-container .btn-secondary {
            background: #2c3642;
            color: #e6edf3;
            border: 1px solid #30363d;
        }
        .quota3-container .btn-secondary:hover {
            background: #3b4757;
        }
        .quota3-container .btn-success {
            background: #6fcf97;
            color: #000;
        }
        .quota3-container .btn-success:hover {
            background: #5bbf8a;
        }
        .quota3-container .btn-danger {
            background: #eb5757;
            color: #fff;
        }
        .quota3-container .btn-danger:hover {
            background: #d63031;
        }
        .quota3-container .btn-sm {
            padding: 6px 14px;
            font-size: 13px;
        }
        .quota3-container .btn-xs {
            padding: 4px 10px;
            font-size: 12px;
        }
        .quota3-container .btn-check-win {
            background: #6fcf97;
            color: #000;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
            transition: all 0.2s;
            margin: 0 2px;
        }
        .quota3-container .btn-check-win:hover {
            background: #5bbf8a;
            transform: scale(1.05);
        }
        .quota3-container .btn-check-loss {
            background: #eb5757;
            color: #fff;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
            transition: all 0.2s;
            margin: 0 2px;
        }
        .quota3-container .btn-check-loss:hover {
            background: #d63031;
            transform: scale(1.05);
        }
        .quota3-container .btn-check-disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        .quota3-container .status-box {
            background: #1a2028;
            border-radius: 12px;
            padding: 16px 20px;
            margin: 12px 0;
            border-left: 6px solid #f39c12;
        }
        .quota3-container .status-box.ended {
            border-left-color: #eb5757;
        }
        .quota3-container .status-box .step-label {
            font-size: 13px;
            color: #8b949e;
        }
        .quota3-container .status-box .step-value {
            font-size: 18px;
            font-weight: bold;
            color: #e6edf3;
        }
        .quota3-container .status-box .highlight {
            color: #f39c12;
        }
        .quota3-container .grid-container {
            overflow-x: auto;
            margin: 12px 0;
            width: 100%;
        }
        .quota3-container .grid {
            display: grid;
            grid-template-columns: 60px 110px 100px 100px 1fr;
            gap: 6px 12px;
            font-size: 14px;
            min-width: 480px;
            width: 100%;
        }
        .quota3-container .grid-header {
            font-weight: 700;
            color: #ffff00;
            border-bottom: 2px solid #30363d;
            padding-bottom: 8px;
            margin-bottom: 4px;
        }
        .quota3-container .grid-item {
            padding: 8px 4px;
            border-bottom: 1px solid #30363d;
            display: flex;
            align-items: center;
            transition: all 0.3s ease;
            min-height: 44px;
        }
        .quota3-container .grid-item.active-step {
            background: rgba(243, 156, 18, 0.1);
            border-radius: 4px;
        }
        .quota3-container .grid-item.row-win {
            background: rgba(0, 255, 136, 0.15) !important;
            border-radius: 4px;
            border-left: 4px solid #00ff88;
            color: #00ff88 !important;
        }
        .quota3-container .grid-item.row-win .step-number,
        .quota3-container .grid-item.row-win .badge-win {
            color: #00ff88 !important;
        }
        .quota3-container .grid-item.row-loss {
            background: rgba(255, 68, 68, 0.15) !important;
            border-radius: 4px;
            border-left: 4px solid #ff4444;
            color: #ff4444 !important;
        }
        .quota3-container .grid-item.row-loss .step-number,
        .quota3-container .grid-item.row-loss .badge-loss {
            color: #ff4444 !important;
        }
        .quota3-container .step-number {
            font-weight: 700;
            font-size: 16px;
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        .quota3-container .step-number.active {
            color: #f39c12;
            background: rgba(243, 156, 18, 0.2);
        }
        .quota3-container .step-number.done {
            color: #00ff88 !important;
            background: rgba(0, 255, 136, 0.15);
            font-weight: 800;
            text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }
        .quota3-container .step-number.failed {
            color: #ff4444 !important;
            background: rgba(255, 68, 68, 0.15);
        }
        .quota3-container .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 30px;
            font-weight: bold;
            font-size: 13px;
        }
        .quota3-container .badge-win {
            background: #00ff88;
            color: #000;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }
        .quota3-container .badge-loss {
            background: #ff4444;
            color: #fff;
        }
        .quota3-container .badge-pending {
            background: #f2c94c;
            color: #000;
        }
        .quota3-container .badge-waiting {
            background: #8b949e;
            color: #000;
        }
        .quota3-container .badge-empty {
            color: #8b949e;
        }
        .quota3-container .deposit-display {
            font-size: 32px;
            font-weight: bold;
            color: #00ff88;
        }
        .quota3-container .summary-box {
            background: #1a2028;
            border-radius: 12px;
            padding: 16px 20px;
            border: 1px solid #30363d;
            margin-top: 12px;
        }
        .quota3-container .summary-box p {
            margin: 4px 0;
        }
        .quota3-container .summary-box .history-list {
            font-size: 13px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #30363d;
        }
        .quota3-container .summary-box .history-list span {
            margin-right: 12px;
        }
        .quota3-container .summary-box .history-list .win {
            color: #00ff88;
        }
        .quota3-container .summary-box .history-list .loss {
            color: #ff4444;
        }
        .quota3-container .disclaimer {
            margin-top: 24px;
            padding: 16px 20px;
            background: #1a2028;
            border-radius: 8px;
            border: 1px solid #30363d;
            font-size: 11px;
            color: #8b949e;
            text-align: center;
            line-height: 1.6;
        }
        .quota3-container .disclaimer strong {
            color: #e6edf3;
        }
        .quota3-container .disclaimer .highlight {
            color: #f39c12;
            font-weight: bold;
        }

        @media (max-width: 768px) {
            .quota3-container .grid {
                grid-template-columns: 50px 90px 80px 80px 1fr;
                font-size: 12px;
                min-width: 390px;
            }
            .quota3-container .card {
                padding: 14px;
            }
            .quota3-container .deposit-display {
                font-size: 26px;
            }
            .quota3-container .btn {
                padding: 8px 16px;
                font-size: 13px;
            }
            .quota3-container input[type="number"] {
                max-width: 150px;
                padding: 8px 12px;
                font-size: 14px;
            }
            .quota3-container .flex-between {
                flex-direction: column;
                align-items: stretch;
            }
            .quota3-container .flex-between .btn-group {
                justify-content: center;
            }
        }

        @media (max-width: 500px) {
            .quota3-container .grid {
                grid-template-columns: 40px 70px 60px 60px 1fr;
                font-size: 11px;
                min-width: 310px;
                gap: 4px 6px;
            }
            .quota3-container .grid-item {
                padding: 6px 2px;
                min-height: 36px;
            }
            .quota3-container .badge {
                font-size: 10px;
                padding: 2px 6px;
            }
            .quota3-container .deposit-display {
                font-size: 22px;
            }
            .quota3-container .btn-check-win,
            .quota3-container .btn-check-loss {
                font-size: 10px;
                padding: 2px 8px;
            }
        }
    `;

    // ============================================================
    // LOGICA PRINCIPALE
    // ============================================================

    let containerElement = null;
    let isInitialized = false;
    let state = {
        importoBase: 10,
        importoInput: 10,
        stepCorrente: 0,
        storico: [],
        depositoTotale: 0,
        percorsoAttivo: false,
        partitaCorrente: null,
        stepBloccato: false,
        riepilogo: ''
    };

    const STORAGE_KEY = 'quota3_data';

    // ============================================================
    // SALVA/CARICA LOCALSTORAGE
    // ============================================================

    function salvaState() {
        try {
            const data = {
                importoBase: state.importoBase,
                stepCorrente: state.stepCorrente,
                storico: state.storico,
                depositoTotale: state.depositoTotale,
                percorsoAttivo: state.percorsoAttivo,
                partitaCorrente: state.partitaCorrente,
                stepBloccato: state.stepBloccato,
                riepilogo: state.riepilogo
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('💾 Quota3: dati salvati');
        } catch (e) {
            console.warn('⚠️ Errore salvataggio:', e);
        }
    }

    function caricaState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                state.importoBase = data.importoBase || 10;
                state.stepCorrente = data.stepCorrente || 0;
                state.storico = data.storico || [];
                state.depositoTotale = data.depositoTotale || 0;
                state.percorsoAttivo = data.percorsoAttivo || false;
                state.partitaCorrente = data.partitaCorrente || null;
                state.stepBloccato = data.stepBloccato || false;
                state.riepilogo = data.riepilogo || '';
                state.importoInput = state.importoBase;
                console.log('📂 Quota3: dati caricati da localStorage');
                return true;
            }
        } catch (e) {
            console.warn('⚠️ Errore caricamento:', e);
        }
        return false;
    }

    // ============================================================
    // FUNZIONI DI UTILITÀ
    // ============================================================

    function formatEuro(val) {
        return '€' + val.toFixed(2);
    }

    // ============================================================
    // RENDER GRIGLIA
    // ============================================================

    function renderGrid() {
        const gridContainer = containerElement.querySelector('#gridContainer');
        if (!gridContainer) return;

        // Costruiamo le righe della griglia come in quota3.html
        let html = '';
        
        // Header
        html += `
            <div class="grid-header">Step</div>
            <div class="grid-header">Importo</div>
            <div class="grid-header">Quota (x3)</div>
            <div class="grid-header">Deposito</div>
            <div class="grid-header">Check</div>
        `;

        // 10 righe per gli step
        for (let i = 0; i < 10; i++) {
            const stepNum = i + 1;
            const storicoItem = state.storico.find(s => s.step === stepNum);
            
            let importo = '';
            let quota = '';
            let deposito = '';
            let check = '';

            if (storicoItem) {
                // Step già giocato
                importo = storicoItem.importo.toFixed(2);
                quota = storicoItem.quota.toFixed(2);
                deposito = storicoItem.deposito ? storicoItem.deposito.toFixed(2) : '0.00';
                
                if (storicoItem.esito === 'vinta') {
                    check = `<span class="badge badge-win">✅ Vinta</span>`;
                } else if (storicoItem.esito === 'persa') {
                    check = `<span class="badge badge-loss">❌ Persa</span>`;
                } else {
                    check = `<span class="badge badge-pending">⏳</span>`;
                }
            } else if (i === state.stepCorrente && state.partitaCorrente && !state.stepBloccato) {
                // Step corrente in corso
                const p = state.partitaCorrente;
                importo = p.importo.toFixed(2);
                quota = p.quota.toFixed(2);
                deposito = '-';
                
                check = `
                    <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        <button class="btn-check-win" onclick="Quota3.gestisciEsito('vinta')">✅ Vinta</button>
                        <button class="btn-check-loss" onclick="Quota3.gestisciEsito('persa')">❌ Persa</button>
                    </div>
                `;
            } else {
                // Step futuro o non disponibile
                importo = '-';
                quota = '-';
                deposito = '-';
                check = `<span class="badge badge-empty">-</span>`;
            }

            // Determina lo stato della riga
            const isActive = i === state.stepCorrente && state.partitaCorrente && !state.stepBloccato;
            const isDone = storicoItem && storicoItem.esito === 'vinta';
            const isFailed = storicoItem && storicoItem.esito === 'persa';

            let numClass = 'step-number';
            let rowClass = '';

            if (isActive) {
                numClass += ' active';
                rowClass = 'active-step';
            } else if (isDone) {
                numClass += ' done';
                rowClass = 'row-win';
            } else if (isFailed) {
                numClass += ' failed';
                rowClass = 'row-loss';
            }

            // Aggiungi le celle della riga
            html += `
                <div class="grid-item ${rowClass}"><span class="${numClass}">${stepNum}</span></div>
                <div class="grid-item ${rowClass}">${importo}</div>
                <div class="grid-item ${rowClass}">${quota}</div>
                <div class="grid-item ${rowClass}">${deposito}</div>
                <div class="grid-item ${rowClass}">${check}</div>
            `;
        }

        gridContainer.innerHTML = html;
    }

    // ============================================================
    // RENDER STATO PERCORSO
    // ============================================================

    function renderStato() {
        const statusBox = containerElement.querySelector('#statusBox');
        const depositoDisplay = containerElement.querySelector('#depositoDisplay');
        if (!statusBox || !depositoDisplay) return;

        let html = '';

        if (!state.percorsoAttivo && !state.partitaCorrente && state.stepCorrente === 0) {
            html = `
                <div class="status-box">
                    <div class="step-label">Nessun percorso attivo</div>
                    <div class="step-value">Imposta un importo e clicca "Conferma"</div>
                </div>
            `;
        } else if (state.partitaCorrente && !state.stepBloccato) {
            const p = state.partitaCorrente;
            html = `
                <div class="status-box">
                    <div class="flex-between">
                        <div>
                            <div class="step-label">Step ${p.step || state.stepCorrente + 1}</div>
                            <div class="step-value">Importo: <span class="highlight">${formatEuro(p.importo)}</span></div>
                            <div class="step-value" style="font-size:14px; color:#8b949e;">Quota (x3): ${formatEuro(p.quota)}</div>
                        </div>
                        <div class="btn-group" style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="btn btn-success btn-sm" onclick="Quota3.gestisciEsito('vinta')">✅ Vinta</button>
                            <button class="btn btn-danger btn-sm" onclick="Quota3.gestisciEsito('persa')">❌ Persa</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (state.stepBloccato || !state.percorsoAttivo) {
            html = `
                <div class="status-box ended">
                    <div class="step-label">Percorso terminato (step ${state.stepCorrente + 1}/10)</div>
                    <div class="step-value" style="font-size:16px;">
                        Deposito totale: <span class="highlight">${formatEuro(state.depositoTotale)}</span>
                    </div>
                    <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
                        <button class="btn btn-success btn-sm" onclick="Quota3.avviaPercorso(${state.importoBase})">✅ Sì, ricomincia</button>
                        <button class="btn btn-secondary btn-sm" onclick="Quota3.resetPercorso()">❌ No, ferma</button>
                    </div>
                </div>
            `;
        }

        statusBox.innerHTML = html;
        depositoDisplay.textContent = formatEuro(state.depositoTotale);
    }

    // ============================================================
    // RENDER RIEPILOGO
    // ============================================================

    function renderRiepilogo() {
        const riepilogoContainer = containerElement.querySelector('#riepilogoContainer');
        if (!riepilogoContainer) return;

        let html = '';

        if (state.riepilogo) {
            html += `
                <div class="summary-box">
                    <p><strong>📋 Riepilogo</strong></p>
                    <p>${state.riepilogo}</p>
            `;

            if (state.storico.length > 0) {
                html += `
                    <div class="history-list">
                        ${state.storico.map((s, idx) => `
                            <span class="${s.esito === 'vinta' ? 'win' : 'loss'}">
                                Step ${s.step}: ${s.esito === 'vinta' ? '✅' : '❌'} 
                                ${s.esito === 'vinta' ? ` +${formatEuro(s.deposito)}` : ''}
                            </span>
                        `).join('')}
                    </div>
                `;
            }

            html += `</div>`;
        }

        riepilogoContainer.innerHTML = html;
    }

    // ============================================================
    // FUNZIONI DI LOGICA
    // ============================================================

    function avviaPercorso(importo) {
        const val = parseFloat(importo) || 10;
        if (val <= 0) {
            alert('Inserisci un importo valido > 0');
            return;
        }

        state.importoBase = val;
        state.importoInput = val;
        state.stepCorrente = 0;
        state.storico = [];
        state.depositoTotale = 0;
        state.percorsoAttivo = true;
        state.stepBloccato = false;
        state.partitaCorrente = null;
        state.riepilogo = '';

        const primo = {
            step: 1,
            importo: val,
            quota: val * 3,
            vincita: 0,
            deposito: 0,
            esito: 'in corso'
        };
        state.partitaCorrente = primo;
        state.riepilogo = `🎯 Step 1: importo ${formatEuro(val)}, quota ${formatEuro(val * 3)}. In attesa di esito.`;

        const importoInput = containerElement.querySelector('#importoInput');
        if (importoInput) importoInput.value = val;
        
        salvaState();
        renderTutto();
    }

    function gestisciEsito(esito) {
        if (!state.partitaCorrente || state.stepBloccato) return;
        if (state.stepCorrente >= 10) {
            state.riepilogo = '🏁 Percorso completato (10 step massimi).';
            state.percorsoAttivo = false;
            salvaState();
            renderTutto();
            return;
        }

        const importo = state.partitaCorrente.importo;
        const quota = state.partitaCorrente.quota;
        let depositoAggiunto = 0;
        let nuovoImporto = 0;

        if (esito === 'vinta') {
            const vincita = quota;
            depositoAggiunto = vincita / 3;
            nuovoImporto = (vincita * 2) / 3;

            const record = {
                step: state.stepCorrente + 1,
                importo: importo,
                quota: quota,
                vincita: vincita,
                deposito: depositoAggiunto,
                esito: 'vinta'
            };
            state.storico.push(record);
            state.depositoTotale += depositoAggiunto;

            if (state.stepCorrente + 1 >= 10) {
                state.stepCorrente = 9;
                state.partitaCorrente = null;
                state.stepBloccato = true;
                state.percorsoAttivo = false;
                state.riepilogo = `🏁 Percorso completato! Deposito totale: ${formatEuro(state.depositoTotale)}.`;
                salvaState();
                renderTutto();
                return;
            }

            const nuovoStep = state.stepCorrente + 1;
            state.stepCorrente = nuovoStep;
            state.partitaCorrente = {
                step: nuovoStep + 1,
                importo: nuovoImporto,
                quota: nuovoImporto * 3,
                vincita: 0,
                deposito: 0,
                esito: 'in corso'
            };
            state.stepBloccato = false;
            state.riepilogo = `✅ Step ${nuovoStep+1}: importo ${formatEuro(nuovoImporto)}, quota ${formatEuro(nuovoImporto*3)}. Deposito +${formatEuro(depositoAggiunto)}`;

        } else {
            const record = {
                step: state.stepCorrente + 1,
                importo: importo,
                quota: quota,
                vincita: 0,
                deposito: 0,
                esito: 'persa'
            };
            state.storico.push(record);
            state.stepBloccato = true;
            state.percorsoAttivo = false;
            state.partitaCorrente = null;
            state.riepilogo = `❌ Step ${state.stepCorrente+1} perso. Deposito totale: ${formatEuro(state.depositoTotale)}. Vuoi ricominciare?`;
        }

        salvaState();
        renderTutto();
    }

    function resetPercorso() {
        state.percorsoAttivo = false;
        state.stepCorrente = 0;
        state.storico = [];
        state.depositoTotale = 0;
        state.partitaCorrente = null;
        state.stepBloccato = false;
        state.riepilogo = '';
        state.importoInput = state.importoBase;
        const importoInput = containerElement.querySelector('#importoInput');
        if (importoInput) importoInput.value = state.importoBase;
        salvaState();
        renderTutto();
    }

    function confermaImporto() {
        if (state.percorsoAttivo) {
            alert('⚠️ Un percorso è già attivo. Resetta o completa prima.');
            return;
        }
        const importoInput = containerElement.querySelector('#importoInput');
        if (!importoInput) return;
        const val = parseFloat(importoInput.value) || 10;
        if (val <= 0) {
            alert('Inserisci un importo valido > 0');
            return;
        }
        avviaPercorso(val);
    }

    // ============================================================
    // RENDER TUTTO
    // ============================================================

    function renderTutto() {
        renderGrid();
        renderStato();
        renderRiepilogo();

        const btnConferma = containerElement.querySelector('#btnConferma');
        const importoInput = containerElement.querySelector('#importoInput');
        
        if (btnConferma) {
            btnConferma.disabled = state.percorsoAttivo;
            btnConferma.textContent = state.percorsoAttivo ? '⏳ In corso...' : 'Conferma';
        }
        if (importoInput) {
            importoInput.disabled = state.percorsoAttivo;
        }
    }

    // ============================================================
    // INIZIALIZZAZIONE
    // ============================================================

    function init(container) {
        if (!container) {
            console.error('❌ Quota3: container non valido');
            return;
        }

        if (isInitialized) {
            console.log('⚠️ Quota3: già inizializzato');
            return;
        }

        containerElement = container;
        isInitialized = true;
        
        // Aggiungi stili
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        containerElement.appendChild(styleEl);

        // Crea HTML
        containerElement.innerHTML = `
            <div class="quota3-container">
                <!-- IMPORTO INIZIALE -->
                <div class="card">
                    <div class="flex">
                        <div style="flex:1; min-width:160px;">
                            <label>💰 Importo iniziale (€)</label>
                            <input type="number" id="importoInput" min="1" step="1" value="${state.importoBase}" />
                        </div>
                        <div>
                            <button class="btn btn-primary" id="btnConferma">Conferma</button>
                        </div>
                        <div>
                            <button class="btn btn-secondary" id="btnReset">🔄 Reset</button>
                        </div>
                    </div>
                </div>

                <!-- GRIGLIA STEP -->
                <div class="card">
                    <h3>📊 Step (max 10)</h3>
                    <div class="grid-container">
                        <div class="grid" id="gridContainer">
                            <!-- Le celle vengono generate da renderGrid() -->
                        </div>
                    </div>
                </div>

                <!-- STATO PERCORSO -->
                <div class="card">
                    <div class="flex-between">
                        <div>
                            <h4>📈 Stato percorso</h4>
                            <div id="statoPercorso" style="margin-top:8px;">
                                <div class="status-box" id="statusBox">
                                    <div class="step-label">Nessun percorso attivo</div>
                                    <div class="step-value">Imposta un importo e clicca "Conferma"</div>
                                </div>
                            </div>
                        </div>
                        <div style="min-width:160px; text-align:center;">
                            <h4>💰 Deposito totale</h4>
                            <div class="deposit-display" id="depositoDisplay">€0.00</div>
                        </div>
                    </div>

                    <div id="riepilogoContainer">
                        <!-- Riepilogo generato dinamicamente -->
                    </div>
                </div>

                <!-- DISCLAIMER -->
                <div class="disclaimer">
                    <strong>⚠️ Disclaimer</strong><br />
                    Le scommesse comportano rischi finanziari. <span class="highlight">Gioca responsabilmente.</span><br />
                    I dati vengono salvati automaticamente nel browser (localStorage).
                </div>
            </div>
        `;

        // Carica stato
        const loaded = caricaState();

        if (!loaded) {
            state.importoBase = 10;
            state.importoInput = 10;
            const input = containerElement.querySelector('#importoInput');
            if (input) input.value = 10;
            resetPercorso();
        } else {
            const input = containerElement.querySelector('#importoInput');
            if (input) input.value = state.importoBase;
            renderTutto();
        }

        // Event listeners
        const btnConferma = containerElement.querySelector('#btnConferma');
        const btnReset = containerElement.querySelector('#btnReset');
        const importoInput = containerElement.querySelector('#importoInput');

        if (btnConferma) {
            btnConferma.addEventListener('click', confermaImporto);
        }
        if (btnReset) {
            btnReset.addEventListener('click', resetPercorso);
        }
        if (importoInput) {
            importoInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    confermaImporto();
                }
            });
        }

        console.log('✅ Quota3 caricato con localStorage');
    }

    // ============================================================
    // AUTO-INIZIALIZZAZIONE
    // ============================================================

    function autoInit() {
        const container = document.getElementById('quota3-container');
        if (container && !isInitialized) {
            console.log('🚀 Quota3: auto-inizializzazione in corso...');
            init(container);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        setTimeout(autoInit, 100);
    }

    // ============================================================
    // ESPORTA API PUBBLICA
    // ============================================================

    window.Quota3 = {
        init: init,
        destroy: function() {
            if (containerElement) {
                containerElement.innerHTML = '';
                containerElement = null;
                isInitialized = false;
            }
        },
        avviaPercorso: avviaPercorso,
        gestisciEsito: gestisciEsito,
        resetPercorso: resetPercorso,
        confermaImporto: confermaImporto,
        renderTutto: renderTutto,
        salvaState: salvaState,
        caricaState: caricaState,
        getState: function() { return state; }
    };

    console.log('✅ Quota3 caricato come modulo autonomo con auto-inizializzazione');

})();