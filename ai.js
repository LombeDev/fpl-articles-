// --- CONFIGURATION & STATE ---
let playerDB = [];
let selectedSlotId = null;

let squad = [
    { id: 0, pos: 'GKP', name: '', isBench: false },
    { id: 1, pos: 'DEF', name: '', isBench: false }, { id: 2, pos: 'DEF', name: '', isBench: false },
    { id: 3, pos: 'DEF', name: '', isBench: false }, { id: 4, pos: 'DEF', name: '', isBench: false },
    { id: 5, pos: 'MID', name: '', isBench: false }, { id: 6, pos: 'MID', name: '', isBench: false },
    { id: 7, pos: 'MID', name: '', isBench: false }, { id: 8, pos: 'MID', name: '', isBench: false },
    { id: 9, pos: 'FWD', name: '', isBench: false }, { id: 10, pos: 'FWD', name: '', isBench: false },
    { id: 11, pos: 'GKP', name: '', isBench: true }, { id: 12, pos: 'DEF', name: '', isBench: true },
    { id: 13, pos: 'MID', name: '', isBench: true }, { id: 14, pos: 'FWD', name: '', isBench: true }
];

// --- DATA SYNC ---
async function syncData() {
    const ticker = document.getElementById('ticker');
    const proxy = 'https://corsproxy.io/?url=';
    const api = 'https://fantasy.premierleague.com/api/bootstrap-static/';
    
    try {
        const res = await fetch(proxy + encodeURIComponent(api));
        const data = await res.json();
        
        playerDB = data.elements.map(p => ({
            name: p.web_name,
            pos: ["", "GKP", "DEF", "MID", "FWD"][p.element_type],
            price: p.now_cost / 10,
            xp: parseFloat(p.ep_next) || 0,
            xp3: parseFloat(p.ep_threesome) || 0, // 3-Gameweek Projection
            form: parseFloat(p.form) || 0
        })).sort((a,b) => b.xp3 - a.xp3);
        
        ticker.textContent = "✅ LIVE 3-GW DATA CONNECTED";
    } catch (e) {
        ticker.textContent = "⚠️ OFFLINE MODE: Using Mock Data";
        playerDB = [
            { name: "Haaland", pos: "FWD", price: 15.2, xp: 8.5, xp3: 25.1 },
            { name: "Salah", pos: "MID", price: 12.8, xp: 8.2, xp3: 24.5 },
            { name: "Saka", pos: "MID", price: 10.1, xp: 7.1, xp3: 21.0 },
            { name: "Foden", pos: "MID", price: 9.2, xp: 6.5, xp3: 19.8 },
            { name: "Thiago", pos: "FWD", price: 7.2, xp: 5.5, xp3: 16.5 }
        ];
    }
    renderPitch();
}

// --- UI RENDERING ---
function renderPitch() {
    const pitch = document.getElementById('pitch-container');
    const bench = document.getElementById('bench-container');
    pitch.innerHTML = ''; bench.innerHTML = '';

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
    label.style.fontSize = '8px'; label.style.fontWeight = 'bold';
    label.textContent = slotData.pos;
    div.appendChild(label);

    const select = document.createElement('select');
    select.onclick = (e) => e.stopPropagation();
    select.innerHTML = `<option value="">-- Pick --</option>`;
    
    playerDB.filter(p => p.pos === slotData.pos).slice(0, 50).forEach(p => {
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

// --- CORE LOGIC ---
function handleSwap(id) {
    if (selectedSlotId === null) {
        selectedSlotId = id;
    } else {
        const p1 = squad.find(s => s.id === selectedSlotId);
        const p2 = squad.find(s => s.id === id);
        if (p1.isBench !== p2.isBench) {
            if (validateFormation(p1, p2)) {
                const temp = p1.isBench;
                p1.isBench = p2.isBench;
                p2.isBench = temp;
            } else {
                alert("Invalid Formation!");
            }
        }
        selectedSlotId = null;
    }
    renderPitch();
    updateStats();
}

function validateFormation(p1, p2) {
    const test = squad.filter(s => !s.isBench).map(s => s.id === p1.id ? p2 : (s.id === p2.id ? p1 : s));
    const d = test.filter(s => s.pos === 'DEF').length;
    const m = test.filter(s => s.pos === 'MID').length;
    const f = test.filter(s => s.pos === 'FWD').length;
    return (d >= 3 && d <= 5 && m >= 2 && m <= 5 && f >= 1 && f <= 3);
}

function updateStats() {
    let totalValue = 0, totalXP = 0, totalXP3 = 0;
    squad.forEach(s => {
        const p = playerDB.find(x => x.name === s.name);
        if (p) {
            totalValue += p.price;
            if (!s.isBench) { totalXP += p.xp; totalXP3 += p.xp3; }
        }
    });
    document.getElementById('budget-val').textContent = `£${(100 - totalValue).toFixed(1)}m`;
    return { totalValue, totalXP, totalXP3 };
}

function updateFormationUI() {
    const s = squad.filter(p => !p.isBench);
    document.getElementById('formation-ticker').textContent = `Formation: ${s.filter(p=>p.pos==='DEF').length}-${s.filter(p=>p.pos==='MID').length}-${s.filter(p=>p.pos==='FWD').length}`;
}

// --- ANALYSIS & SCOUTING ---
function showTopTargets() {
    const listBody = document.getElementById('target-list');
    document.getElementById('scout-report').style.display = 'block';
    listBody.innerHTML = '';
    
    const currentNames = squad.map(s => s.name);
    const targets = playerDB.filter(p => !currentNames.includes(p.name)).slice(0, 5);

    targets.forEach(p => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #222";
        row.innerHTML = `
            <td style="padding: 10px 5px;"><b>${p.name}</b></td>
            <td>${p.pos}</td>
            <td>£${p.price}m</td>
            <td style="color: #00ff87;">${p.xp3.toFixed(1)}</td>
        `;
        listBody.appendChild(row);
    });
}

function runAnalysis() {
    const stats = updateStats();
    const resultsArea = document.getElementById('results');
    resultsArea.style.display = 'block';

    let starters = squad.filter(s => !s.isBench).map(s => playerDB.find(p => p.name === s.name)).filter(Boolean);
    if (starters.length < 11) {
        document.getElementById('ai-msg').innerHTML = "🚨 <b>SQUAD INCOMPLETE!</b>";
        return;
    }

    const sortedByXP3 = [...starters].sort((a, b) => b.xp3 - a.xp3);
    const captain = sortedByXP3[0];
    const weakest = sortedByXP3[sortedByXP3.length - 1];

    document.getElementById('score-display').textContent = stats.totalXP.toFixed(1);
    document.getElementById('score-display-3gw').textContent = stats.totalXP3.toFixed(1);
    document.getElementById('v-value').textContent = `£${stats.totalValue.toFixed(1)}m`;
    document.getElementById('v-xp').textContent = stats.totalXP.toFixed(1);
    document.getElementById('v-xp-3gw').textContent = stats.totalXP3.toFixed(1);
    document.getElementById('v-weak').textContent = weakest.name;

    document.getElementById('ai-msg').innerHTML = `📅 <b>3-WEEK PLAN:</b> Armband on <b>${captain.name}</b> (${captain.xp3} xP).<br>💡 <b>TRANSFER:</b> Look to sell <b>${weakest.name}</b> for someone in the Scout Report below.`;
    
    showTopTargets();
}

function autoOptimize() {
    let usedNames = [];
    squad.forEach(slot => {
        const choice = playerDB.find(p => p.pos === slot.pos && !usedNames.includes(p.name));
        if (choice) { slot.name = choice.name; usedNames.push(choice.name); }
    });
    renderPitch(); updateStats(); runAnalysis();
}

syncData();
