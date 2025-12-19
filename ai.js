let playerDB = [];
let selectedSlotId = null;

// Initial Squad Structure (15 players)
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
    // Bench
    { id: 11, pos: 'GKP', name: '', isBench: true },
    { id: 12, pos: 'DEF', name: '', isBench: true },
    { id: 13, pos: 'MID', name: '', isBench: true },
    { id: 14, pos: 'FWD', name: '', isBench: true }
];

async function syncData() {
    const proxy = 'https://corsproxy.io/?url=';
    const api = 'https://fantasy.premierleague.com/api/bootstrap-static/';
    try {
        const res = await fetch(proxy + encodeURIComponent(api));
        const data = await res.json();
        playerDB = data.elements.map(p => ({
            name: p.web_name,
            pos: ["", "GKP", "DEF", "MID", "FWD"][p.element_type],
            price: p.now_cost / 10,
            xp: parseFloat(p.ep_next) || 0
        })).sort((a,b) => b.xp - a.xp);
        document.getElementById('ticker').textContent = "✅ LIVE API DATA CONNECTED";
    } catch (e) {
        document.getElementById('ticker').textContent = "⚠️ OFFLINE MODE";
    }
    renderPitch();
}

function renderPitch() {
    const pitch = document.getElementById('pitch-container');
    const bench = document.getElementById('bench-container');
    pitch.innerHTML = ''; bench.innerHTML = '';

    const positions = ['GKP', 'DEF', 'MID', 'FWD'];
    const starters = squad.filter(s => !s.isBench);
    
    // Draw Starter Rows
    positions.forEach(pos => {
        const rowPlayers = starters.filter(p => p.pos === pos);
        if (rowPlayers.length > 0) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            rowPlayers.forEach(p => rowDiv.appendChild(createSlotUI(p)));
            pitch.appendChild(rowDiv);
        }
    });

    // Draw Bench Row
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
    label.style.fontSize = '8px'; label.textContent = slotData.pos;
    div.appendChild(label);

    const select = document.createElement('select');
    select.onclick = (e) => e.stopPropagation();
    select.innerHTML = `<option value="">--</option>`;
    playerDB.filter(p => p.pos === slotData.pos).slice(0, 40).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.selected = slotData.name === p.name;
        opt.textContent = `${p.name} (£${p.price})`;
        select.appendChild(opt);
    });

    select.onchange = (e) => {
        slotData.name = e.target.value;
        updateStats();
    };

    div.appendChild(select);
    return div;
}

function handleSwap(id) {
    if (selectedSlotId === null) {
        selectedSlotId = id;
    } else {
        const p1 = squad.find(s => s.id === selectedSlotId);
        const p2 = squad.find(s => s.id === id);

        if (p1.isBench !== p2.isBench && validateFormation(p1, p2)) {
            const tempStatus = p1.isBench;
            p1.isBench = p2.isBench;
            p2.isBench = tempStatus;
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

function updateStats() {
    let totalValue = 0, totalXP = 0;
    squad.forEach(s => {
        const p = playerDB.find(x => x.name === s.name);
        if (p) {
            totalValue += p.price;
            if (!s.isBench) totalXP += p.xp;
        }
    });

    document.getElementById('budget-val').textContent = `£${(100 - totalValue).toFixed(1)}m`;
    document.getElementById('budget-val').style.color = (100 - totalValue) < 0 ? 'var(--fall-color)' : 'var(--rise-color)';
    return { totalValue, totalXP };
}

function updateFormationUI() {
    const starters = squad.filter(s => !s.isBench);
    const d = starters.filter(s => s.pos === 'DEF').length;
    const m = starters.filter(s => s.pos === 'MID').length;
    const f = starters.filter(s => s.pos === 'FWD').length;
    document.getElementById('formation-ticker').textContent = `FORMATION: ${d}-${m}-${f}`;
}

function runAnalysis() {
    document.getElementById('results').style.display = 'block';
    const stats = updateStats();
    
    document.getElementById('score-display').textContent = (stats.totalXP * 2).toFixed(1);
    document.getElementById('v-value').textContent = `£${stats.totalValue.toFixed(1)}m`;
    document.getElementById('v-xp').textContent = stats.totalXP.toFixed(1);
    
    const filled = squad.filter(s => s.name !== '').length;
    document.getElementById('ai-msg').innerHTML = filled < 15 
        ? "🚨 Complete your 15-man squad for a deep scout report." 
        : "🔥 <b>AI VERDICT:</b> Formation is balanced. Captain your highest xP player for maximum gains.";
}

function autoOptimize() {
    squad.forEach(slot => {
        const choice = playerDB.find(p => p.pos === slot.pos && !squad.some(s => s.name === p.name));
        if (choice) slot.name = choice.name;
    });
    renderPitch();
    updateStats();
}

syncData();
