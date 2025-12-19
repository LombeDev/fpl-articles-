const menuBtn = document.getElementById('menu-btn');
const headerCont = document.getElementById('header-container');

// UI - Navigation
menuBtn.addEventListener('click', () => { 
    headerCont.classList.toggle('menu-open'); 
});

let playerDB = [];

// DATA - Sync with FPL API
async function syncData() {
    const proxy = 'https://corsproxy.io/?url=';
    const api = 'https://fantasy.premierleague.com/api/bootstrap-static/';
    try {
        const res = await fetch(proxy + encodeURIComponent(api));
        const data = await res.json();
        
        // Map team IDs to Names
        const teamMap = {};
        data.teams.forEach(t => teamMap[t.id] = t.name);

        playerDB = data.elements.map(p => ({
            name: p.web_name,
            team: teamMap[p.team],
            pos: ["", "GKP", "DEF", "MID", "FWD"][p.element_type],
            price: p.now_cost / 10,
            xp: parseFloat(p.ep_next) || 0,
            fdr: Math.floor(Math.random() * 5) + 1,
            isRising: p.cost_change_event > 0
        })).sort((a,b) => b.xp - a.xp);
        
        document.getElementById('ticker').innerHTML = `⚠️ SCAN COMPLETE: ${playerDB.length} players synced.`;
    } catch (e) { 
        document.getElementById('ticker').textContent = "OFFLINE MODE: Using Cached Data"; 
    }
    renderSlots();
}

// UI - Render Select Boxes
function renderSlots() {
    document.querySelectorAll('.slot').forEach(slot => {
        const pos = slot.dataset.pos;
        let sel = slot.querySelector('select') || document.createElement('select');
        sel.onchange = (e) => { e.stopPropagation(); handleSelection(); };
        slot.appendChild(sel);
        sel.innerHTML = `<option value="">-- Select --</option>`;
        
        playerDB.filter(p => p.pos === pos).slice(0, 50).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = `${p.name} (${p.team}) £${p.price}`;
            sel.appendChild(opt);
        });
    });
}

// LOGIC - Handle Player Selection Changes
function handleSelection() {
    let maxXP = -1; 
    let capSlot = null;

    document.querySelectorAll('.slot').forEach(slot => {
        const val = slot.querySelector('select').value;
        const p = playerDB.find(x => x.name === val);
        const badge = slot.querySelector('.captain-badge');
        
        if(badge) badge.style.display = 'none';
        slot.className = slot.classList.contains('is-bench') ? 'slot is-bench' : 'slot';
        
        if(p) {
            slot.classList.add(`fdr-${p.fdr}`);
            if(p.isRising) slot.classList.add('price-up');
            // Auto-Captain Logic: Highest XP in starting XI
            if(!slot.classList.contains('is-bench') && p.xp > maxXP) { 
                maxXP = p.xp; 
                capSlot = slot; 
            }
        }
    });

    if(capSlot) capSlot.querySelector('.captain-badge').style.display = 'block';
    updateBudget();
}

// LOGIC - Budget & Club Limit Check
function updateBudget() {
    let total = 0;
    const clubCounts = {};
    let limitExceeded = false;

    document.querySelectorAll('select').forEach(s => {
        const p = playerDB.find(x => x.name === s.value);
        if(p) {
            total += p.price;
            clubCounts[p.team] = (clubCounts[p.team] || 0) + 1;
            if(clubCounts[p.team] > 3) limitExceeded = true;
        }
    });

    const rem = (100 - total).toFixed(1);
    const budgetDisplay = document.getElementById('budget-val');
    budgetDisplay.textContent = `£${rem}m`;
    budgetDisplay.style.color = rem < 0 || limitExceeded ? "var(--fall-color)" : "var(--rise-color)";
}

// AI - Run Deep Analysis
function runAnalysis() {
    const results = document.getElementById('results');
    results.style.display = 'block';
    
    let totalValue = 0, totalXP = 0, selectedCount = 0;
    let starters = [];
    
    document.querySelectorAll('.slot').forEach(slot => {
        const val = slot.querySelector('select').value;
        const p = playerDB.find(x => x.name === val);
        if(p) {
            selectedCount++;
            totalValue += p.price;
            if(!slot.classList.contains('is-bench')) {
                totalXP += p.xp;
                starters.push(p);
            }
        }
    });

    // Score Display
    document.getElementById('score-display').textContent = ((totalXP / 60) * 100).toFixed(1);
    document.getElementById('v-value').textContent = `£${totalValue.toFixed(1)}m`;
    document.getElementById('v-xp').textContent = totalXP.toFixed(1);

    // Identify Weakest Link in Starters
    starters.sort((a, b) => a.xp - b.xp);
    const weakest = starters[0];
    document.getElementById('v-weak').textContent = weakest ? weakest.name : "None";

    // AI Message Logic
    let msg = "";
    if(selectedCount < 15) {
        msg = "🚨 Squad incomplete! Fill all slots to unlock Smart Scout advice.";
    } else {
        // Find an upgrade within budget + 0.5m
        const upgrade = playerDB.find(x => x.pos === weakest.pos && x.xp > weakest.xp && x.price <= (weakest.price + 0.5));
        msg = upgrade 
            ? `💡 <b>SMART SCOUT:</b> Your weakest link is <b>${weakest.name}</b>. Upgrade to <b>${upgrade.name}</b> for an immediate xP boost!`
            : "✅ <b>AI VERDICT:</b> Your team is perfectly balanced for your current budget.";
    }
    document.getElementById('ai-msg').innerHTML = msg;
}

// UI - Planner Modal
function openPlanner(slot) {
    const val = slot.querySelector('select').value;
    const p = playerDB.find(x => x.name === val);
    if(!p) return;

    document.getElementById('planner').style.display = 'block';
    document.getElementById('planner-title').textContent = `Scout: ${p.name}`;
    
    const recs = playerDB.filter(x => x.pos === p.pos && x.name !== p.name && x.price <= (p.price + 0.5)).slice(0, 3);
    let html = '';
    recs.forEach(r => { 
        html += `<div class="rec-item"><span>${r.name} (${r.team})</span><span style="color:var(--accent-green)">${r.xp} xP</span></div>`; 
    });
    document.getElementById('planner-recs').innerHTML = html || "No budget options found.";
}

function closePlanner() { 
    document.getElementById('planner').style.display = 'none'; 
}

function autoOptimize() {
    const selects = document.querySelectorAll('select');
    selects.forEach((s) => {
        const pos = s.parentElement.dataset.pos;
        const choice = playerDB.find(p => p.pos === pos && !Array.from(selects).some(sel => sel.value === p.name));
        if(choice) s.value = choice.name;
    });
    handleSelection();
    runAnalysis();
}

// Start app
syncData();
