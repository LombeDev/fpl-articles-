// --- CONFIGURATION & STATE ---
let playerDB = [];
let teamsDB = {}; // NEW: Helper to map team IDs to names
let selectedSlotId = null;

let squad = [
    { id: 0, pos: 'GKP', name: '', isBench: false },
    { id: 1, pos: 'DEF', name: '', isBench: false },
    { id: 2, pos: 'DEF', name: '', isBench: false },
    { id: 3, pos: 'DEF', name: '', isBench: false },
    { id: 4, pos: 'DEF', name: '', isBench: false },
    { id: 5, pos: 'MID', name: '', isBench: false },
    { id: 6, pos: 'MID', name: '', isBench: false },
    { id: 7, pos: 'MID', name: '', isBench: false },
    { id: 8, pos: 'MID', name: '', isBench: false },
    { id: 9, pos: 'FWD', name: '', isBench: false },
    { id: 10, pos: 'FWD', name: '', isBench: false },
    { id: 11, pos: 'GKP', name: '', isBench: true },
    { id: 12, pos: 'DEF', name: '', isBench: true },
    { id: 13, pos: 'MID', name: '', isBench: true },
    { id: 14, pos: 'FWD', name: '', isBench: true }
];

// --- DATA SYNC ---
async function syncData() {
    const ticker = document.getElementById('ticker');
    const proxy = 'https://corsproxy.io/?url=';
    const api = 'https://fantasy.premierleague.com/api/bootstrap-static/';
    
    try {
        const res = await fetch(proxy + encodeURIComponent(api));
        const data = await res.json();
        
        // NEW: Populate teams lookup (e.g., { 1: "Arsenal" })
        data.teams.forEach(t => teamsDB[t.id] = t.name);
        
        playerDB = data.elements.map(p => ({
            name: p.web_name,
            team: teamsDB[p.team], // NEW: Store team name
            pos: ["", "GKP", "DEF", "MID", "FWD"][p.element_type],
            price: p.now_cost / 10,
            xp: parseFloat(p.ep_next) || 0,
            form: parseFloat(p.form) || 0
        })).sort((a,b) => b.xp - a.xp);
        
        ticker.textContent = "✅ Get your team rated by our AI";
    } catch (e) {
        ticker.textContent = "⚠️ OFFLINE MODE: Using Mock Data";
        playerDB = [
            { name: "Salah", pos: "MID", price: 12.5, xp: 8.5, team: "Liverpool" },
            { name: "Haaland", pos: "FWD", price: 14.0, xp: 9.2, team: "Man City" },
            { name: "Saka", pos: "MID", price: 10.0, xp: 7.1, team: "Arsenal" }
        ];
    }
    renderPitch();
}

// --- NEW: TEAM LIMIT VALIDATION ---
function canAddPlayer(playerName) {
    const newPlayer = playerDB.find(p => p.name === playerName);
    if (!newPlayer) return true;

    // Count how many players from this club are already in the squad
    const clubCount = squad.filter(s => {
        const p = playerDB.find(x => x.name === s.name);
        return p && p.team === newPlayer.team;
    }).length;

    return clubCount < 3;
}

// --- UI RENDERING ---
function renderPitch() {
    const pitch = document.getElementById('pitch-container');
    const bench = document.getElementById('bench-container');
    pitch.innerHTML = ''; 
    bench.innerHTML = '';

    const positions = ['GKP', 'DEF', 'MID', 'FWD'];
    const starters = squad.filter(s => !s.isBench);
    
    positions.forEach(pos => {
        const rowPlayers = starters.filter(p => p.pos === pos);
        if (rowPlayers.length > 0) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            rowPlayers.forEach(p => rowDiv.appendChild(createSlotUI(p)));
            pitch.appendChild(rowDiv);
        }
    });

    const benchRow = document.createElement('div');
    benchRow.className = 'row';
    squad.filter(s => s.isBench).forEach(p => benchRow.appendChild(createSlotUI(p)));
    bench.appendChild(benchRow);

    updateFormationUI();
}

function createSlotUI(slotData) {
    const div = document.createElement('div');
    div.className = `slot ${slotData.isBench ? 'is-bench' : ''} ${selectedSlotId === slotData.id ? 'selected' : ''}`;
    div.onclick = () => handleSwap(slotData.id);

    const label = document.createElement('div');
    label.style.fontSize = '8px'; 
    label.style.fontWeight = 'bold';
    label.textContent = slotData.pos;
    div.appendChild(label);

    const select = document.createElement('select');
    select.onclick = (e) => e.stopPropagation(); 
    select.innerHTML = `<option value="">-- Pick --</option>`;
    
    playerDB.filter(p => p.pos === slotData.pos).slice(0, 50).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.selected = slotData.name === p.name;
        opt.textContent = `${p.name} (${p.team}) £${p.price}`;
        select.appendChild(opt);
    });

    select.onchange = (e) => {
        const selectedName = e.target.value;
        
        // NEW: Check limit before allowing change
        if (selectedName === "" || canAddPlayer(selectedName) || selectedName === slotData.name) {
            slotData.name = selectedName;
            updateStats();
        } else {
            const player = playerDB.find(p => p.name === selectedName);
            alert(`⚠️ Rules Violation: You already have 3 players from ${player.team}!`);
            e.target.value = slotData.name; // Revert selection
        }
    };

    div.appendChild(select);
    return div;
}

// --- CORE LOGIC: SWAPPING & VALIDATION ---
function handleSwap(id) {
    if (selectedSlotId === null) {
        selectedSlotId = id;
    } else {
        const p1 = squad.find(s => s.id === selectedSlotId);
        const p2 = squad.find(s => s.id === id);

        if (p1.isBench !== p2.isBench) {
            if (validateFormation(p1, p2)) {
                const tempStatus = p1.isBench;
                p1.isBench = p2.isBench;
                p2.isBench = tempStatus;
            } else {
                alert("Invalid Swap! FPL rules require: 1 GKP, 3-5 DEF, 2-5 MID, 1-3 FWD.");
            }
        }
        selectedSlotId = null;
    }
    renderPitch();
    updateStats();
}

function validateFormation(p1, p2) {
    const starters = squad.filter(s => !s.isBench);
    const testStarters = starters.map(s => s.id === p1.id ? p2 : (s.id === p2.id ? p1 : s));
    
    const d = testStarters.filter(s => s.pos === 'DEF').length;
    const m = testStarters.filter(s => s.pos === 'MID').length;
    const f = testStarters.filter(s => s.pos === 'FWD').length;
    const g = testStarters.filter(s => s.pos === 'GKP').length;

    return (g === 1 && d >= 3 && d <= 5 && m >= 2 && m <= 5 && f >= 1 && f <= 3);
}

// --- STATS & ANALYSIS ---
function updateStats() {
    let totalValue = 0;
    let totalXP = 0;
    
    squad.forEach(s => {
        const p = playerDB.find(x => x.name === s.name);
        if (p) {
            totalValue += p.price;
            if (!s.isBench) totalXP += p.xp;
        }
    });

    const bank = (100 - totalValue).toFixed(1);
    const budgetEl = document.getElementById('budget-val');
    if (budgetEl) {
        budgetEl.textContent = `£${bank}m`;
        budgetEl.style.color = bank < 0 ? 'var(--fall-color)' : 'var(--rise-color)';
    }

    return { totalValue, totalXP };
}

function updateFormationUI() {
    const starters = squad.filter(s => !s.isBench);
    const d = starters.filter(s => s.pos === 'DEF').length;
    const m = starters.filter(s => s.pos === 'MID').length;
    const f = starters.filter(s => s.pos === 'FWD').length;
    const el = document.getElementById('formation-ticker');
    if (el) el.textContent = `FORMATION: ${d}-${m}-${f}`;
}

function runAnalysis() {
    const stats = updateStats();
    const resultsArea = document.getElementById('results');
    if (resultsArea) resultsArea.style.display = 'block';

    let starters = [];
    squad.forEach(s => {
        const p = playerDB.find(x => x.name === s.name);
        if (p && !s.isBench) starters.push(p);
    });

    if (starters.length < 11) {
        const msgEl = document.getElementById('ai-msg');
        if (msgEl) msgEl.innerHTML = "🚨 <b>SQUAD INCOMPLETE:</b> Pick 11 starters to see full analysis.";
        return;
    }

    const sortedByXP = [...starters].sort((a, b) => b.xp - a.xp);
    const captain = sortedByXP[0];
    const weakest = sortedByXP[sortedByXP.length - 1];

    const upgrade = playerDB.find(p => 
        p.pos === weakest.pos && 
        p.xp > weakest.xp && 
        p.price <= (weakest.price + 0.5) &&
        !squad.some(s => s.name === p.name) &&
        canAddPlayer(p.name) // NEW: Ensure scout upgrade follows 3-player rule
    );

    const scoreDisp = document.getElementById('score-display');
    const vValue = document.getElementById('v-value');
    const vXp = document.getElementById('v-xp');
    const vWeak = document.getElementById('v-weak');
    const vStatus = document.getElementById('v-status');

    if (scoreDisp) scoreDisp.textContent = (stats.totalXP).toFixed(1);
    if (vValue) vValue.textContent = `£${stats.totalValue.toFixed(1)}m`;
    if (vXp) vXp.textContent = stats.totalXP.toFixed(1);
    if (vWeak) vWeak.textContent = weakest.name;
    if (vStatus) vStatus.textContent = "Verified";

    let msg = `⭐ <b>CAPTAIN:</b> Trust <b>${captain.name}</b> with the armband (+${captain.xp} xP).<br>`;
    if (upgrade) {
        msg += `💡 <b>SCOUT:</b> Replace <b>${weakest.name}</b> with <b>${upgrade.name}</b> for a +${(upgrade.xp - weakest.xp).toFixed(1)} boost.`;
    } else {
        msg += `✅ <b>COMMENT BY MWAMBA:</b> Your team is highly optimized, select a team which will be under your budget and team value.`;
    }
    const aiMsgEl = document.getElementById('ai-msg');
    if (aiMsgEl) aiMsgEl.innerHTML = msg;
}

function autoOptimize() {
    squad.forEach(slot => {
        const choice = playerDB.find(p => 
            p.pos === slot.pos && 
            !squad.some(s => s.name === p.name) &&
            canAddPlayer(p.name) // NEW: Enforce limit during auto-optimize
        );
        if (choice) slot.name = choice.name;
    });
    renderPitch();
    updateStats();
    runAnalysis();
}

syncData();
