// --- UPDATED DATA SYNC ---
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
            xpNext: parseFloat(p.ep_next) || 0, // Points for next GW
            xp3GW: parseFloat(p.ep_threesome) || 0, // Points for next 3 GWs
            form: parseFloat(p.form) || 0
        })).sort((a,b) => b.xpNext - a.xpNext);
        
        ticker.textContent = "✅ LIVE 3-GW DATA CONNECTED";
    } catch (e) {
        ticker.textContent = "⚠️ OFFLINE MODE: Using Mock Data";
        playerDB = [
            { name: "Salah", pos: "MID", price: 12.5, xpNext: 8.5, xp3GW: 24.1 },
            { name: "Haaland", pos: "FWD", price: 14.0, xpNext: 9.2, xp3GW: 26.5 },
            { name: "Saka", pos: "MID", price: 10.0, xpNext: 7.1, xp3GW: 20.2 }
        ];
    }
    renderPitch();
}

// --- UPDATED STATS & ANALYSIS ---
function updateStats() {
    let totalValue = 0;
    let totalXPNext = 0;
    let totalXP3GW = 0;
    
    squad.forEach(s => {
        const p = playerDB.find(x => x.name === s.name);
        if (p) {
            totalValue += p.price;
            if (!s.isBench) {
                totalXPNext += p.xpNext;
                totalXP3GW += p.xp3GW;
            }
        }
    });

    const bank = (100 - totalValue).toFixed(1);
    const budgetEl = document.getElementById('budget-val');
    budgetEl.textContent = `£${bank}m`;
    budgetEl.style.color = bank < 0 ? 'var(--fall-color)' : 'var(--rise-color)';

    return { totalValue, totalXPNext, totalXP3GW };
}

function runAnalysis() {
    const stats = updateStats();
    const resultsArea = document.getElementById('results');
    resultsArea.style.display = 'block';

    let starters = [];
    squad.forEach(s => {
        const p = playerDB.find(x => x.name === s.name);
        if (p && !s.isBench) starters.push(p);
    });

    if (starters.length < 11) {
        document.getElementById('ai-msg').innerHTML = "🚨 <b>SQUAD INCOMPLETE:</b> Pick 11 starters.";
        return;
    }

    // Sort by 3rd Gameweek Horizon for Long-term planning
    const sortedByLongTerm = [...starters].sort((a, b) => b.xp3GW - a.xp3GW);
    const captain = sortedByLongTerm[0];
    const weakest = sortedByLongTerm[sortedByLongTerm.length - 1];

    // Find Long-term Upgrade
    const upgrade = playerDB.find(p => 
        p.pos === weakest.pos && 
        p.xp3GW > weakest.xp3GW && 
        p.price <= (weakest.price + 0.5) &&
        !starters.some(s => s.name === p.name)
    );

    // Update UI Elements
    // Assuming you have elements with these IDs in your HTML
    document.getElementById('score-display').textContent = stats.totalXPNext.toFixed(1);
    document.getElementById('v-xp').textContent = stats.totalXPNext.toFixed(1);
    
    // Add 3GW specific display (Make sure to add this ID to your HTML)
    const xp3Element = document.getElementById('v-xp-3gw');
    if(xp3Element) xp3Element.textContent = stats.totalXP3GW.toFixed(1);

    let msg = `📅 <b>3-GW PROJECTION:</b> Your squad is expected to score <b>${stats.totalXP3GW.toFixed(1)}</b> pts over the next 3 weeks.<br>`;
    msg += `⭐ <b>CAPTAIN:</b> <b>${captain.name}</b> has the highest 3-week ceiling (${captain.xp3GW} xP).<br>`;
    
    if (upgrade) {
        msg += `💡 <b>TRANSFER:</b> Buy <b>${upgrade.name}</b> for <b>${weakest.name}</b>. Better long-term potential (+${(upgrade.xp3GW - weakest.xp3GW).toFixed(1)} xP).`;
    }

    document.getElementById('ai-msg').innerHTML = msg;
}
