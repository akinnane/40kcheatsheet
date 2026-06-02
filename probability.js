/** WH40K 11th Edition Core Rules — probability helpers (player-advantage framing) */
const Probability = (function () {
    'use strict';

    function pD6Success(target, rollMod = 0, opts = {}) {
        const nat1Fails = opts.nat1Fails !== false;
        const nat6Crit = opts.nat6Crit || false;
        let success = 0;
        for (let d = 1; d <= 6; d++) {
            const mod = d + rollMod;
            if (nat1Fails && d === 1) continue;
            if (nat6Crit && d === 6) { success++; continue; }
            if (mod >= target) success++;
        }
        return success / 6;
    }

    function p2D6Gte(target) {
        let success = 0;
        for (let a = 1; a <= 6; a++) {
            for (let b = 1; b <= 6; b++) {
                if (a + b >= target) success++;
            }
        }
        return success / 36;
    }

    function p2D6AtLeast(distance) {
        return p2D6Gte(distance);
    }

    function p1D6AtLeast(minRoll) {
        if (minRoll <= 1) return 1;
        if (minRoll > 6) return 0;
        return (7 - minRoll) / 6;
    }

    function pct(p) {
        return (p * 100).toFixed(1) + '%';
    }

    /** Mandatory re-roll: must accept the second result (Command Re-roll, Twin-linked, etc.) */
    function pWithMandatoryReroll(p) {
        return 1 - (1 - p) * (1 - p);
    }

    function pD6WithReroll(target, rollMod = 0, opts = {}) {
        return pWithMandatoryReroll(pD6Success(target, rollMod, opts));
    }

    function p2D6GteWithFullReroll(target) {
        return pWithMandatoryReroll(p2D6Gte(target));
    }

    /** 2D6 vs target; if fail, re-roll one die (player picks — optimal: re-roll lower die) */
    function p2D6GteWithOneDieReroll(target) {
        let successWeight = 0;
        for (let a = 1; a <= 6; a++) {
            for (let b = 1; b <= 6; b++) {
                if (a + b >= target) {
                    successWeight += 1;
                    continue;
                }
                const hi = Math.max(a, b);
                let rerollSuccess = 0;
                for (let r = 1; r <= 6; r++) {
                    if (hi + r >= target) rerollSuccess++;
                }
                successWeight += rerollSuccess / 6;
            }
        }
        return successWeight / 36;
    }

    function cellPair(p) {
        return pct(p) + ' / ' + pct(pWithMandatoryReroll(p));
    }

    function cellClass(p) {
        return probClass(pWithMandatoryReroll(p));
    }

    function woundRequired(s, t) {
        if (s >= 2 * t) return 2;
        if (s > t) return 3;
        if (s === t) return 4;
        if (s < t && s > t / 2) return 5;
        return 6;
    }

    const BS_VALUES = [2, 3, 4, 5, 6];
    const ST_MIN = 2;
    const ST_MAX = 13;
    const AP_VALUES = [0, -1, -2, -3, -4];
    const SV_VALUES = [2, 3, 4, 5, 6];

    function stRange() {
        const values = [];
        for (let v = ST_MIN; v <= ST_MAX; v++) values.push(v);
        return values;
    }

    function apHeader(ap) {
        return ap === 0 ? 'AP 0' : 'AP' + ap;
    }

    function matrixWrap(html) {
        return '<div class="prob-matrix-wrap">' + html + '</div>';
    }

    function buildHitMatrix() {
        const mods = [-2, -1, 0, 1, 2];
        const rows = [];
        BS_VALUES.forEach(bs => {
            const row = { bs: bs + '+', cells: [] };
            mods.forEach(m => {
                const effective = Math.min(6, Math.max(2, bs - m));
                row.cells.push({ mod: m, p: pD6Success(effective, 0, { nat6Crit: false }) });
            });
            row.cells.push({ mod: 'char -1 BS', p: pD6Success(Math.min(6, bs + 1), 0) });
            row.cells.push({ mod: 'char +1 BS', p: pD6Success(Math.max(2, bs - 1), 0) });
            rows.push(row);
        });
        return rows;
    }

    function buildWoundMatrix() {
        const strengths = stRange();
        const toughnesses = stRange();
        const rows = [];
        strengths.forEach(s => {
            const row = { s, cells: [] };
            toughnesses.forEach(t => {
                const req = woundRequired(s, t);
                row.cells.push({ t, req: req + '+', p: pD6Success(req, 0, { nat6Crit: false }) });
            });
            rows.push(row);
        });
        return rows;
    }

    function buildSaveMatrix() {
        const rows = [];
        SV_VALUES.forEach(sv => {
            const row = { sv: sv + '+', cells: [] };
            AP_VALUES.forEach(ap => {
                row.cells.push({ ap, p: pD6Success(sv, ap) });
            });
            rows.push(row);
        });
        return rows;
    }

    function buildLeadershipTable() {
        const rows = [];
        for (let ld = 2; ld <= 12; ld++) {
            rows.push({
                ld: ld + '+',
                p: p2D6Gte(ld),
                pOneReroll: p2D6GteWithOneDieReroll(ld),
                pFullReroll: p2D6GteWithFullReroll(ld)
            });
        }
        return rows;
    }

    function buildChargeTable() {
        const rows = [];
        for (let d = 2; d <= 12; d++) {
            const p = p2D6AtLeast(d);
            rows.push({ distance: d + '"', p, pReroll: p2D6GteWithFullReroll(d) });
        }
        return rows;
    }

    function buildAdvanceTable() {
        const rows = [];
        for (let x = 1; x <= 6; x++) {
            rows.push({ roll: x + '+', p: p1D6AtLeast(x) });
        }
        const mValues = [5, 6, 7, 8, 9, 10, 11, 12];
        const totals = [];
        mValues.forEach(m => {
            for (let total = m + 1; total <= m + 6; total++) {
                const need = total - m;
                totals.push({ m: m + '"', total: total + '"', p: p1D6AtLeast(need) });
            }
        });
        return { roll: rows, combined: totals };
    }

    function buildFnpTable() {
        const rows = [];
        for (let x = 2; x <= 6; x++) {
            const p = pD6Success(x);
            rows.push({ x: x + '+', p, pReroll: pWithMandatoryReroll(p) });
        }
        return rows;
    }

    function binomialAtLeast(n, pSuccess, minSuccess) {
        let total = 0;
        const pFail = 1 - pSuccess;
        for (let k = minSuccess; k <= n; k++) {
            let comb = 1;
            for (let i = 0; i < k; i++) comb = comb * (n - i) / (i + 1);
            total += comb * Math.pow(pSuccess, k) * Math.pow(pFail, n - k);
        }
        return total;
    }

    function buildExplosivesTable() {
        const p4 = 0.5;
        const rows = [];
        for (let mw = 0; mw <= 6; mw++) {
            rows.push({ mw: mw === 0 ? '0 MW' : '\u2265' + mw + ' MW', p: binomialAtLeast(6, p4, mw) });
        }
        return rows;
    }

    function probClass(p) {
        if (p >= 2/3) return 'prob-high';
        if (p >= 1/3) return 'prob-mid';
        return 'prob-low';
    }

    function el(id) {
        return document.getElementById(id);
    }

    function renderHitMatrix(containerId, opts) {
        const hitEl = el(containerId);
        if (!hitEl) return;
        opts = opts || {};
        const hit = buildHitMatrix();
        let html = '';
        if (opts.wsNote) {
            html += '<p class="pdf-ref">WS uses the same percentages as BS.</p>';
        }
        if (opts.showNote !== false) {
            html += '<p class="pdf-ref">Ranges: BS/WS 2+–6+. Cells: <b>base % / +1 re-roll %</b> (Command Re-roll — mandatory second roll). Hit rolls capped at 2+ best / 6+ worst after modifiers; unmod 1 always fails, unmod 6 always hits (Critical Hit).</p>';
        }
        html += '<table class="prob-matrix"><tr><th>BS/WS</th><th>−2</th><th>−1</th><th>0</th><th>+1</th><th>+2</th><th>Cover (−1 BS)</th><th>Plunging (+1 BS)</th></tr>';
        hit.forEach(row => {
            html += '<tr><td><b>' + row.bs + '</b></td>';
            row.cells.forEach(c => {
                html += '<td class="' + cellClass(c.p) + '" title="base ' + pct(c.p) + ', re-roll ' + pct(pWithMandatoryReroll(c.p)) + '">' + cellPair(c.p) + '</td>';
            });
            html += '</tr>';
        });
        html += '</table>';
        hitEl.innerHTML = matrixWrap(html);
    }

    function renderWoundMatrix(containerId, opts) {
        const woundEl = el(containerId);
        if (!woundEl) return;
        opts = opts || {};
        const wound = buildWoundMatrix();
        let html = '';
        if (opts.showNote !== false) {
            html += '<p class="pdf-ref">Cells: <b>base % / if re-roll taken %</b> — second value uses mandatory re-roll maths as an upper bound when [TWIN-LINKED] wound re-roll is always taken. [LANCE] +1 wound = treat required roll as one step easier (e.g. 4+ → 3+).</p>';
        }
        const toughnesses = stRange();
        html += '<table class="prob-matrix"><tr><th>S \\ T</th>';
        toughnesses.forEach(t => { html += '<th>T' + t + '</th>'; });
        html += '</tr>';
        wound.forEach(row => {
            html += '<tr><td><b>S' + row.s + '</b></td>';
            row.cells.forEach(c => {
                html += '<td class="' + cellClass(c.p) + '" title="' + c.req + '">' + cellPair(c.p) + '</td>';
            });
            html += '</tr>';
        });
        html += '</table>';
        html += '<p class="pdf-ref">Ranges: Strength 2–13 vs Toughness 2–13. Cell tooltip shows required wound roll (2+–6+).</p>';
        woundEl.innerHTML = matrixWrap(html);
    }

    function renderSaveMatrix(containerId, opts) {
        const saveEl = el(containerId);
        if (!saveEl) return;
        opts = opts || {};
        const save = buildSaveMatrix();
        let html = '';
        if (opts.showNote !== false) {
            html += '<p class="pdf-ref">Cells: <b>base % / +1 re-roll %</b> (Command Re-roll on save)</p>';
        }
        html += '<table class="prob-matrix"><tr><th>Sv</th>';
        AP_VALUES.forEach(ap => { html += '<th>' + apHeader(ap) + '</th>'; });
        html += '</tr>';
        save.forEach(row => {
            html += '<tr><td><b>' + row.sv + '</b></td>';
            row.cells.forEach(c => {
                html += '<td class="' + cellClass(c.p) + '" title="' + apHeader(c.ap) + '">' + cellPair(c.p) + '</td>';
            });
            html += '</tr>';
        });
        html += '</table>';
        html += '<p class="pdf-ref">Ranges: Sv 2+–6+ · AP 0 to −4. Use the <b>better</b> of modified armour save or Invulnerable save (Invuln not shown). Cells at 0.0% = impossible on a D6 (e.g. Sv 6+ vs AP-4 needs 10+).</p>';
        saveEl.innerHTML = matrixWrap(html);
    }

    function renderLeadership(containerId) {
        const ldEl = el(containerId);
        if (!ldEl) return;
        const ld = buildLeadershipTable();
        let html = '<table><tr><th>Ld</th><th>% to pass (2D6)</th><th>+ re-roll 1 die</th><th>+ re-roll both (charge-style)</th></tr>';
        ld.forEach(r => {
            html += '<tr><td>' + r.ld + '</td>';
            html += '<td class="' + probClass(r.p) + '">' + pct(r.p) + '</td>';
            html += '<td class="' + probClass(r.pOneReroll) + '">' + pct(r.pOneReroll) + '</td>';
            html += '<td class="' + probClass(r.pFullReroll) + '">' + pct(r.pFullReroll) + '</td></tr>';
        });
        html += '</table>';
        ldEl.innerHTML = html;
    }

    function renderCharge(containerId) {
        const chgEl = el(containerId);
        if (!chgEl) return;
        const chg = buildChargeTable();
        let html = '<table><tr><th>Min distance</th><th>% to charge ≥</th><th>+ Command Re-roll (2D6)</th></tr>';
        chg.forEach(r => {
            html += '<tr><td>' + r.distance + '</td>';
            html += '<td class="' + probClass(r.p) + '">' + pct(r.p) + '</td>';
            html += '<td class="' + probClass(r.pReroll) + '">' + pct(r.pReroll) + '</td></tr>';
        });
        html += '</table>';
        chgEl.innerHTML = html;
    }

    function renderAdvance(containerId, opts) {
        const advEl = el(containerId);
        if (!advEl) return;
        opts = opts || {};
        const adv = buildAdvanceTable();
        const combinedLimit = opts.combinedLimit != null ? opts.combinedLimit : adv.combined.length;
        let html = '<h4>Advance roll (1D6 added to M)</h4><table><tr><th>Roll at least</th><th>Base</th><th>+ re-roll</th></tr>';
        adv.roll.forEach(r => {
            const pr = pWithMandatoryReroll(r.p);
            html += '<tr><td>' + r.roll + '</td>';
            html += '<td class="' + probClass(r.p) + '">' + pct(r.p) + '</td>';
            html += '<td class="' + probClass(pr) + '">' + pct(pr) + '</td></tr>';
        });
        html += '</table><h4>Total advance move (M + D6)</h4><table><tr><th>M</th><th>Need total</th><th>Base</th><th>+ re-roll D6</th></tr>';
        adv.combined.slice(0, combinedLimit).forEach(r => {
            const pr = pWithMandatoryReroll(r.p);
            html += '<tr><td>' + r.m + '</td><td>' + r.total + '</td>';
            html += '<td class="' + probClass(r.p) + '">' + pct(r.p) + '</td>';
            html += '<td class="' + probClass(pr) + '">' + pct(pr) + '</td></tr>';
        });
        html += '</table>';
        if (combinedLimit < adv.combined.length) {
            html += '<p class="pdf-ref">Showing common M + D6 totals; full table on Movement tab.</p>';
        }
        advEl.innerHTML = html;
    }

    function renderFnp(containerId) {
        const fnpEl = el(containerId);
        if (!fnpEl) return;
        const fnp = buildFnpTable();
        let html = '<table><tr><th>Feel No Pain</th><th>% to ignore</th><th>+ re-roll</th></tr>';
        fnp.forEach(r => {
            html += '<tr><td>' + r.x + '</td>';
            html += '<td class="' + probClass(r.p) + '">' + pct(r.p) + '</td>';
            html += '<td class="' + probClass(r.pReroll) + '">' + pct(r.pReroll) + '</td></tr>';
        });
        html += '</table>';
        fnpEl.innerHTML = html;
    }

    function renderRerollExamples(containerId) {
        const rerollEl = el(containerId);
        if (!rerollEl) return;
        let html = '<table><tr><th>Roll type</th><th>Base target</th><th>Base %</th><th>With 1 re-roll</th><th>Rule</th></tr>';
        const examples = [
            { type: 'Hit roll', target: 'BS 4+', p: pD6Success(4), rule: 'Command Re-roll (15.02)' },
            { type: 'Hit roll', target: 'BS 3+', p: pD6Success(3), rule: 'Command Re-roll' },
            { type: 'Wound roll', target: '4+', p: pD6Success(4), rule: '[TWIN-LINKED] (24.38)' },
            { type: 'Save roll', target: 'Sv 4+, AP-1', p: pD6Success(4, -1), rule: 'Command Re-roll' },
            { type: 'Charge', target: '≥9"', p: p2D6Gte(9), rule: 'Re-roll both dice (15.02)' },
            { type: 'Battle-shock', target: 'Ld 8+', p: p2D6Gte(8), rule: 'Re-roll one die (15.02)' },
            { type: 'Advance', target: 'D6 ≥4', p: p1D6AtLeast(4), rule: 'Command Re-roll' },
            { type: 'Hazard', target: 'avoid 1–2', p: 2/3, rule: 'Command Re-roll' },
            { type: 'Feel No Pain', target: '5+', p: pD6Success(5), rule: 'Per wound (if allowed)' }
        ];
        examples.forEach(ex => {
            let pR = pWithMandatoryReroll(ex.p);
            if (ex.type === 'Charge') pR = p2D6GteWithFullReroll(9);
            if (ex.type === 'Battle-shock') pR = p2D6GteWithOneDieReroll(8);
            html += '<tr><td>' + ex.type + '</td><td>' + ex.target + '</td>';
            html += '<td class="' + probClass(ex.p) + '">' + pct(ex.p) + '</td>';
            html += '<td class="' + probClass(pR) + '">' + pct(pR) + '</td>';
            html += '<td>' + ex.rule + '</td></tr>';
        });
        html += '</table>';
        rerollEl.innerHTML = html;
    }

    function renderHazard(containerId) {
        const hazardEl = el(containerId);
        if (!hazardEl) return;
        const pAvoid = 2 / 3;
        const pReroll = pWithMandatoryReroll(pAvoid);
        let html = '<table><tr><th>Roll</th><th>Outcome</th><th>Base</th><th>+ Command Re-roll</th></tr>';
        html += '<tr><td>Desperate Escape / Combat Disembark</td><td>Avoid MW (not 1–2)</td>';
        html += '<td class="' + probClass(pAvoid) + '">' + pct(pAvoid) + '</td>';
        html += '<td class="' + probClass(pReroll) + '">' + pct(pReroll) + '</td></tr>';
        html += '<tr><td>[HAZARDOUS] weapons</td><td>Avoid MW (not 1–2)</td>';
        html += '<td class="' + probClass(pAvoid) + '">' + pct(pAvoid) + '</td>';
        html += '<td class="' + probClass(pReroll) + '">' + pct(pReroll) + '</td></tr>';
        html += '</table>';
        hazardEl.innerHTML = html;
    }

    function renderCrushingImpact(containerId) {
        const crushingEl = el(containerId);
        if (!crushingEl) return;
        let html = '<table><tr><th>Per D6 (roll = T)</th><th>Outcome</th><th>Probability</th></tr>';
        html += '<tr><td>1</td><td>Self takes 1 MW</td><td class="prob-low">' + pct(1/6) + '</td></tr>';
        html += '<tr><td>2–4</td><td>No effect</td><td class="prob-mid">' + pct(3/6) + '</td></tr>';
        html += '<tr><td>5+</td><td>Enemy takes 1 MW (max 6)</td><td class="prob-mid">' + pct(2/6) + '</td></tr>';
        html += '</table>';
        html += '<h4>Expected mortal wounds (per D6 rolled = T)</h4><table><tr><th>T (D6 count)</th><th>E[self MW]</th><th>E[enemy MW]</th></tr>';
        for (let t = 1; t <= 10; t++) {
            const eSelf = t * (1/6);
            const eEnemy = Math.min(6, t * (2/6));
            html += '<tr><td>' + t + '</td><td>' + eSelf.toFixed(2) + '</td><td>' + eEnemy.toFixed(2) + '</td></tr>';
        }
        html += '</table>';
        html += '<p class="pdf-ref">Used just after each MON/Veh charge move (15.06), not at end of phase.</p>';
        crushingEl.innerHTML = html;
    }

    function renderHazardUnit(containerId) {
        const hazardEl = el(containerId);
        if (!hazardEl) return;
        let html = '<p class="pdf-ref">Chance to take <b>zero</b> MW from hazard rolls (each model: fail on 1–2).</p>';
        html += '<table><tr><th>Models rolled</th><th>P(no MW)</th><th>P(at least 1 MW)</th></tr>';
        for (let n = 1; n <= 10; n++) {
            const pNone = Math.pow(2/3, n);
            html += '<tr><td>' + n + '</td><td class="' + probClass(pNone) + '">' + pct(pNone) + '</td><td class="' + probClass(1 - pNone) + '">' + pct(1 - pNone) + '</td></tr>';
        }
        html += '</table>';
        hazardEl.innerHTML = html;
    }

    function renderCombinedAttack(containerId) {
        const cEl = el(containerId);
        if (!cEl) return;
        const examples = [
            { label: 'BS 4+, S4 vs T4, Sv 4+ AP0', hit: 4, wound: 4, save: 4, ap: 0 },
            { label: 'BS 3+, S5 vs T4, Sv 3+ AP-1', hit: 3, wound: 3, save: 3, ap: -1 },
            { label: 'WS 3+, S6 vs T6, Sv 4+ AP-2', hit: 3, wound: 4, save: 4, ap: -2 }
        ];
        let html = '<table><tr><th>Profile</th><th>P(wound)</th><th>P(not saved)</th><th>P(wound × unsaved)</th></tr>';
        examples.forEach(function (ex) {
            const pHit = pD6Success(ex.hit);
            const pWound = pD6Success(ex.wound);
            const pSave = pD6Success(ex.save, ex.ap);
            const combined = pHit * pWound * (1 - pSave);
            html += '<tr><td>' + ex.label + '</td>';
            html += '<td>' + pct(pHit * pWound) + '</td><td>' + pct(1 - pSave) + '</td>';
            html += '<td class="' + probClass(combined) + '"><b>' + pct(combined) + '</b></td></tr>';
        });
        html += '</table>';
        html += '<p class="pdf-ref">Per attack dice, before modifiers like [LETHAL HITS], FNP, or MW. Multiply by A for expected wounds (rough).</p>';
        cEl.innerHTML = html;
    }

    function renderShootingSpecial(containerId) {
        const specEl = el(containerId);
        if (!specEl) return;
        let html = '<table><tr><th>Roll type</th><th>Player advantage</th></tr>';
        html += '<tr><td>Snap Shooting / Fire Overwatch hit</td><td class="prob-low">' + pct(1/6) + '</td></tr>';
        html += '<tr><td>[TORRENT] hit</td><td class="prob-high">100.0%</td></tr>';
        html += '<tr><td>Indirect Fire hit (1–5 fail)</td><td class="prob-low">' + pct(1/6) + '</td></tr>';
        html += '<tr><td>Indirect Fire hit (1–3 fail, stationary + friendly LoS)</td><td class="prob-mid">' + pct(0.5) + '</td></tr>';
        html += '<tr><td>[HAZARDOUS] — avoid MW (not 1–2)</td><td class="prob-high">' + pct(2/3) + '</td></tr>';
        html += '</table>';
        specEl.innerHTML = html;
    }

    function renderExplosives(containerId) {
        const expEl = el(containerId);
        if (!expEl) return;
        const exp = buildExplosivesTable();
        let html = '<p class="pdf-ref">Explosives stratagem: roll 6D6; each 4+ = 1 MW.</p>';
        html += '<table><tr><th>Outcome</th><th>Probability</th></tr>';
        exp.forEach(r => {
            html += '<tr><td>' + r.mw + '</td><td class="' + probClass(r.p) + '">' + pct(r.p) + '</td></tr>';
        });
        html += '</table>';
        expEl.innerHTML = html;
    }

    function renderSpecialAll(containerId) {
        const specEl = el(containerId);
        if (!specEl) return;
        const exp = buildExplosivesTable();
        let html = '<table><tr><th>Roll type</th><th>Player advantage</th></tr>';
        html += '<tr><td>Hazard (avoid 1–2)</td><td class="prob-high">' + pct(2/3) + '</td></tr>';
        html += '<tr><td>Deadly Demise (trigger on 6)</td><td class="prob-low">' + pct(1/6) + '</td></tr>';
        html += '<tr><td>Crushing Impact — avoid self MW (not 1)</td><td class="prob-high">' + pct(5/6) + '</td></tr>';
        html += '<tr><td>Crushing Impact — enemy MW (5+)</td><td class="prob-mid">' + pct(2/6) + '</td></tr>';
        html += '<tr><td>Snap Shooting / Overwatch hit</td><td class="prob-low">' + pct(1/6) + '</td></tr>';
        html += '<tr><td>[TORRENT] hit</td><td class="prob-high">100.0%</td></tr>';
        html += '<tr><td>Indirect Fire hit (1–5 fail)</td><td class="prob-low">' + pct(1/6) + '</td></tr>';
        html += '<tr><td>Indirect Fire hit (1–3 fail, friendly LoS)</td><td class="prob-mid">' + pct(0.5) + '</td></tr>';
        html += '</table><h4>Explosives stratagem (6D6, 4+ = 1 MW each)</h4><table><tr><th>Outcome</th><th>Probability</th></tr>';
        exp.forEach(r => {
            html += '<tr><td>' + r.mw + '</td><td class="' + probClass(r.p) + '">' + pct(r.p) + '</td></tr>';
        });
        html += '</table>';
        specEl.innerHTML = html;
    }

    function renderMatrixRangesLegend(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = '<p class="prob-note"><b>Matrix ranges:</b> BS/WS 2+–6+ · Strength / Toughness 2–13 · Save 2+–6+ · AP 0 to −4 · Leadership 2+–12+ (2D6) · Charge distance 2"–12" (2D6) · Feel No Pain 2+–6+.</p>';
    }

    function renderAll() {
        renderMatrixRangesLegend('prob-ranges-legend');
        renderHitMatrix('prob-hit-matrix');
        renderWoundMatrix('prob-wound-matrix');
        renderSaveMatrix('prob-save-matrix');
        renderLeadership('prob-leadership-table');
        renderCharge('prob-charge-table');
        renderAdvance('prob-advance-table');
        renderFnp('prob-fnp-table');
        renderRerollExamples('prob-reroll-table');
        renderSpecialAll('prob-special-table');
        renderCombinedAttack('prob-combined-table');
    }

    function renderForTab(tabId) {
        if (tabId === 'prob') {
            renderAll();
            return;
        }
        const renderers = {
            cmd: function () { renderLeadership('cmd-prob-leadership'); },
            mov: function () {
                renderAdvance('mov-prob-advance');
                renderHazard('mov-prob-hazard');
                renderHazardUnit('mov-prob-hazard-unit');
            },
            sht: function () {
                renderHitMatrix('sht-prob-hit', { showNote: true });
                renderWoundMatrix('sht-prob-wound', { showNote: true });
                renderSaveMatrix('sht-prob-save', { showNote: true });
                renderShootingSpecial('sht-prob-special');
            },
            chg: function () {
                renderCharge('chg-prob-charge');
                renderCrushingImpact('chg-prob-crushing');
            },
            fgt: function () {
                renderHitMatrix('fgt-prob-hit', { wsNote: true, showNote: true });
                renderWoundMatrix('fgt-prob-wound', { showNote: true });
                renderSaveMatrix('fgt-prob-save', { showNote: true });
                renderFnp('fgt-prob-fnp');
            },
            obj: function () { renderExplosives('obj-prob-explosives'); },
            adv: function () {
                renderFnp('adv-prob-fnp');
                renderHazard('adv-prob-hazard');
            }
        };
        if (renderers[tabId]) renderers[tabId]();
    }

    return {
        pD6Success, p2D6Gte, p2D6AtLeast, p1D6AtLeast, pct,
        pWithMandatoryReroll, pD6WithReroll, p2D6GteWithFullReroll, p2D6GteWithOneDieReroll,
        buildHitMatrix, buildWoundMatrix, buildSaveMatrix,
        buildLeadershipTable, buildChargeTable, buildAdvanceTable,
        buildFnpTable, buildExplosivesTable,
        renderHitMatrix, renderWoundMatrix, renderSaveMatrix,
        renderLeadership, renderCharge, renderAdvance, renderFnp,
        renderHazard, renderCrushingImpact, renderShootingSpecial, renderExplosives,
        renderHazardUnit, renderCombinedAttack,
        renderAll, renderForTab, probClass
    };
})();
