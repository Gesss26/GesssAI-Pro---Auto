// ============================================================
// QUOTA 3 - Componente Autonomo con localStorage
// Versione con griglia come immagine
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // STILI INLINE PER IL COMPONENTE
    // ============================================================
    const styles = `
        .quota3-container {
            max-width: 1000px;
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

        /* ===== TABELLA GRIGLIA STILE IMMAGINE ===== */
        .quota3-container .table-wrap {
            overflow-x: auto;
            margin: 8px 0;
        }
        .quota3-container .quota-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 15px;
            min-width: 650px;
            background: var(--surface, #1a2028);
            border-radius: 8px;
            overflow: hidden;
        }
        .quota3-container .quota-table th {
            background: var(--surface, #1a2028);
            color: #ffff00;
            padding: 10px 12px;
            text-align: center;
            border-bottom: 2px solid #30363d;
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .quota3-container .quota-table td {
            padding: 10px 12px;
            text-align: center;
            border-bottom: 1px solid #30363d;
            vertical-align: middle;
            transition: all 0.3s ease;
        }
        .quota3-container .quota-table tr {
            transition: all 0.3s ease;
        }
        .quota3-container .quota-table tr.row-win td {
            background: rgba(0, 255, 136, 0.15) !important;
            color: #00ff88 !important;
            border-left: 4px solid #00ff88;
        }
        .quota3-container .quota-table tr.row-win td .step-num {
            color: #00ff88 !important;
            font-weight: 800;
        }
        .quota3-container .quota-table tr.row-loss td {
            background: rgba(255, 68, 68, 0.15) !important;
            color: #ff4444 !important;
            border-left: 4px solid #ff4444;
        }
        .quota3-container .quota-table tr.row-loss td .step-num {
            color: #ff4444 !important;
            font-weight: 800;
        }
        .quota3-container .quota-table tr.active-step td {
            background: rgba(243, 156, 18, 0.08);
            border-left: 4px solid #f39c12;
        }
        .quota3-container .quota-table tr:hover td {
            background: rgba(255,255,255,0.03);
        }
        .quota3-container .quota-table .step-num {
            font-weight: 700;
            font-size: 18px;
            display: inline-block;
            min-width: 28px;
        }
        .quota3-container .quota-table .step-num.active {
            color: #f39c12;
        }
        .quota3-container .quota-table .step-num.done {
            color: #00ff88 !important;
        }
        .quota3-container .quota-table .step-num.failed {
            color: #ff4444 !important;
        }
        .quota3-container .quota-table .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 30px;
            font-weight: bold;
            font-size: 13px;
        }
        .quota3-container .quota-table .badge-win {
            background: #00ff88;
            color: #000;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }
        .quota3-container .quota-table .badge-loss {
            background: #ff4444;
            color: #fff;
        }
        .quota3-container .quota-table .badge-pending {
            background: #f2c94c;
            color: #000;
        }
        .quota3-container .quota-table .badge-empty {
            color: #8b949e;
        }
        .quota3-container .quota-table .btn-group-actions {
            display: flex;
            gap: 6px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .quota3-container .quota-table .btn-xs {
            padding: 4px 12px;
            font-size: 12px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }
        .quota3-container .quota-table .btn-xs:hover {
            transform: scale(1.05);
        }
        .quota3-container .quota-table .btn-win {
            background: #00ff88;
            color: #000;
        }
        .quota3-container .quota-table .btn-win:hover {
            background: #00e67a;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }
        .quota3-container .quota-table .btn-loss {
            background: #ff4444;
            color: #fff;
        }
        .quota3-container .quota-table .btn-loss:hover {
            background: #e63a3a;
            box-shadow: 0 0 20px rgba(255, 68, 68, 0.3);
        }
        .quota3-container .quota-table .btn-xs:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none !important;
        }

        /* ===== STATO PERCORSO ===== */
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
            .quota3-container .quota-table {
                font-size: 13px;
                min-width: 500px;
            }
            .quota3-container .quota-table th,
            .quota3-container .quota-table td {
                padding: 6px 8px;
            }
            .quota3-container .quota-table .btn-xs {
                padding: 3px 8px;
                font-size: 11px;
            }
        }
        @media (max-width: 500px) {
            .quota3-container .quota-table {
                font-size: 12px;
                min-width: 420px;
            }
            .quota3-container .quota-table th,
            .quota3-container .quota-table td {
                padding: 4px 6px;
            }
            .quota3-container .quota-table .btn-xs {
                padding: 2px 6px;
                font-size: 10px;
            }
            .quota3-container .deposit-display {
                font-size: 22px;
            }
        }
    `;

    // ============================================================
    // LOGICA PRINCIPALE
    // ============================================================

    let containerElement = null;
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

    function getDataOdierna() {
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        return `${d}/${m}/${y}`;
    }

    function getDataStep(step) {
        // Aggiunge giorni allo step (step 1 = oggi, step 2 = domani, ecc.)
        const now = new Date();
        now.setDate(now.getDate() + (step - 1));
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        return `${d}/${m}/${y}`;
    }

    // ============================================================
    // RENDER GRIGLIA (stile immagine)
    // ============================================================

    function renderGrid() {
        const tableBody = containerElement.querySelector('#quotaTableBody');
        if (!tableBody) return;

        let html = '';

        for (let i = 0; i < 10; i++) {
            const stepNum = i + 1;
            const storicoItem = state.storico.find(s => s.step === stepNum);
            
            let importo = '';
            let quota = '';
            let deposito = '';
            let esito = '';
            let data = getDataStep(stepNum);

            // Calcola importo teorico
            let importoTeorico = state.importoBase;
            if (i > 0) {
                importoTeorico = state.importoBase * Math.pow(2, i);
            }

            if (storicoItem) {
                importo = storicoItem.importo.toFixed(2);
                quota = storicoItem.quota.toFixed(2);
                deposito = storicoItem.deposito ? storicoItem.deposito.toFixed(2) : '0.00';
                esito = storicoItem.esito;
                data = getDataStep(stepNum);
            } else if (i === state.stepCorrente && state.partitaCorrente && !state.stepBloccato) {
                importo = state.partitaCorrente.importo.toFixed(2);
                quota = state.partitaCorrente.quota.toFixed(2);
                deposito = state.depositoTotale.toFixed(2);
                esito = 'in corso';
            } else if (i < state.stepCorrente && !storicoItem) {
                // Step precedenti senza storico (dovrebbe essere raro)
                importo = importoTeorico.toFixed(2);
                quota = (importoTeorico * 3).toFixed(2);
                deposito = state.depositoTotale.toFixed(2);
                esito = '';
            } else {
                importo = importoTeorico.toFixed(2);
                quota = (importoTeorico * 3).toFixed(2);
                deposito = i === 0 ? (-state.importoBase).toFixed(2) : 
                           (state.importoBase * (Math.pow(2, i) - 1)).toFixed(2);
                esito = '';
            }

            // Determina classe riga
            let rowClass = '';
            let numClass = 'step-num';
            
            const isActive = i === state.stepCorrente && state.partitaCorrente && !state.stepBloccato;
            const isDone = storicoItem && storicoItem.esito === 'vinta';
            const isFailed = storicoItem && storicoItem.esito === 'persa';

            if (isActive) {
                rowClass = 'active-step';
                numClass += ' active';
            } else if (isDone) {
                rowClass = 'row-win';
                numClass += ' done';
            } else if (isFailed) {
                rowClass = 'row-loss';
                numClass += ' failed';
            }

            // Colonna Check
            let checkCell = '';
            if (storicoItem) {
                if (storicoItem.esito === 'vinta') {
                    checkCell = `<span class="badge badge-win">✅ Vinta</span>`;
                } else if (storicoItem.esito === 'persa') {
                    checkCell = `<span class="badge badge-loss">❌ Persa</span>`;
                } else {
                    checkCell = `<span class="badge badge-pending">⏳</span>`;
                }
            } else if (isActive) {
                checkCell = `
                    <div class="btn-group-actions">
                        <button class="btn-xs btn-win" onclick="Quota3.gestisciEsito('vinta')">✅ Vinta</button>
                        <button class="btn-xs btn-loss" onclick="Quota3.gestisciEsito('persa')">❌ Persa</button>
                    </div>
                `;
            } else {
                checkCell = `<span class="badge badge-empty">-</span>`;
            }

            // Calcola deposito cumulativo per la visualizzazione
            let depositoDisplay = deposito;
            if (isDone && storicoItem) {
                depositoDisplay = stato