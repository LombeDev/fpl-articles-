// --- CONFIGURATION & STATE ---
let playerDB = [];
let teamsDB = {}; // To store Team IDs and Names
let selectedSlotId = null;

// ... (squad array remains the same) ...

// --- DATA SYNC ---
async function syncData() {
    const ticker = document.getElementById('ticker');
    const proxy = 'https://corsproxy.io/?url=';
    const api = 'https://fantasy.premierleague.com/api/bootstrap-static/';
    
    try {
        const res = await fetch(proxy + encodeURIComponent(api));
        const data = await res.json();
        
        // Map Team IDs to Names (e.g., 1: "Arsenal")
        data.teams.forEach(t => teamsDB[t.id] = t.name);

        playerDB = data.elements.map(p => ({
            name: p.web_name,
            team: teamsDB[p.team], // Store the team name
            pos: ["", "GKP", "DEF", "MID", "FWD"][p.element_type],
            price: p.now_cost / 10,
            xp: parseFloat(p.ep_next) || 0,
            xp3: parseFloat(p.ep_threesome) || 0,
            form: parseFloat(p.form) || 0
        })).sort((a,b) => b.xp3 - a.xp3);
        
        ticker.textContent = "✅ LIVE DATA & TEAM LIMITS ACTIVE";
    } catch (e) {
        ticker.textContent = "⚠️ OFFLINE MODE";
        // Mock data with teams for testing
        playerDB = [
            { name: "Saka", team: "Arsenal", pos: "MID", price: 10.1, xp: 7, xp3: 21 },
            { name: "Odegaard", team: "Arsenal", pos: "MID", price: 8.5, xp: 6, xp3: 18 },
            { name: "Havertz", team: "Arsenal", pos: "FWD", price: 8.1, xp: 5, xp3: 15 },
            { name: "Saliba", team: "Arsenal", pos: "DEF", price: 6.0, xp: 4, xp3: 12 }
        ];
    }
    renderPitch();
}

// --- SEARCHABLE UI ---
function createSlotUI(slotData) {
    const div = document.createElement('div');
    div.className = `slot ${slotData.isBench ? 'is-bench' : ''}`;
    
    // Position Label
    const label = document.createElement('div');
    label.className = "pos-label";
    label.textContent = slotData.pos;
    div.appendChild(label);

    // Search Input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = slotData.name || "Search...";
    input.setAttribute('list', `list-${slotData.id}`);
    input.className = "player-search";

    // Datalist for Autocomplete
    const dl = document.createElement('datalist');
    dl.id = `list-${slotData.id}`;
    
    // Filter DB by position and show Team name in search
    playerDB.filter(p => p.pos === slotData.pos).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.team} - £${p.price}m`;
        dl.appendChild(opt);
    });

    input.onchange = (e) => {
        const selectedName = e.target.value;
        const player = playerDB.find(p => p.name === selectedName && p.pos === slotData.pos);
        
        if (player) {
            if (checkTeamLimit(player.team, slotData.name)) {
                slotData.name = player.name;
                updateStats();
                runAnalysis();
            } else {
                alert(`⚠️ Rules Violation: You already have 3 players from ${player.team}!`);
                e.target.value = slotData.name || ""; // Reset
            }
        }
    };

    div.appendChild(input);
    div.appendChild(dl);
    return div;
}

// --- TEAM LIMIT VALIDATION ---
function checkTeamLimit(newTeamName, oldPlayerName) {
    let teamCounts = {};
    
    squad.forEach(s => {
        if (s.name && s.name !== oldPlayerName) {
            const p = playerDB.find(x => x.name === s.name);
            if (p) {
                teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
            }
        }
    });

    return (teamCounts[newTeamName] || 0) < 3;
}
