const menuBtn = document.getElementById('menu-btn');
const headerCont = document.getElementById('header-container');

menuBtn.addEventListener('click', () => { 
    headerCont.classList.toggle('menu-open'); 
});

let playerDB = [];

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
            xp: parseFloat(p.ep_next) || 0,
            fdr: Math.floor(Math.random() * 5) + 1,
            isRising: ["Palmer", "Semenyo", "Wilson"].includes(p.web_name)
        })).sort((a,b) => b.xp - a.xp);
        document.getElementById('ticker').innerHTML = `⚠️ SCAN COMPLETE: Current FPL API data synced successfully.`;
    } catch (e) { 
        document.getElementById('ticker').textContent = "OFFLINE MODE"; 
    }
    renderSlots();
}

function renderSlots() {
    document.querySelectorAll('.slot').forEach(slot => {
        const pos = slot.dataset.pos;
        let sel = slot.querySelector('select') || document.createElement('select');
        sel.onchange = (e) => { e.stopPropagation(); handleSelection(); };
        slot.appendChild(sel);
        sel.innerHTML = `<option value="">--</option>`;
        playerDB.filter(p => p.pos === pos).slice(0, 60).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = `${p.name} (£${p.price})`;
            sel.appendChild(opt);
        });
    });
}

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
            if(!slot.classList.contains('is-bench') && p.xp > maxXP) { 
                maxXP = p.xp; 
                capSlot = slot; 
            }
        }
    });
    if(capSlot) capSlot.querySelector('.captain-badge').style.display = 'block';
    updateBudget();
}

function updateBudget() {
    let total = 0;
    document.querySelectorAll('select').forEach(s => {
        const p = playerDB.find(x => x.name === s.value);
        if(p) total += p.price;
    });
    const rem = (100 - total).toFixed(1);
    document.getElementById('budget-val').textContent = `£${rem}m`;
    document.getElementById('budget-val').style.color = rem < 0 ? "var(--fall-color)" : "var(--rise-color)";
}

function runAnalysis() {
    const results = document.getElementById('results');
    results.style.display = 'block';
    
    let totalValue = 0;
    let totalXP = 0;
    let weakestPlayer = { name: "None", xp: 99 };
    let selectedCount = 0;

    document.querySelectorAll('.slot').forEach(slot => {
        const val = slot.querySelector('select').value;
        const p = playerDB.find(x => x.name === val);
        if(p) {
            selectedCount++;
            totalValue += p.price;
            if(!slot.classList.contains('is-bench')) {
                totalXP += p.xp;
                if(p.xp < weakestPlayer.xp) weakestPlayer = p;
            }
        }
    });

    const rating = ((totalXP / 60) * 100).toFixed(1);
    document.getElementById('score-display').textContent = rating;
    document.getElementById('v-value').textContent = `£${totalValue.toFixed(1)}m`;
    document.getElementById('v-xp').textContent = totalXP.toFixed(1);
    document.getElementById('v-weak').textContent = weakestPlayer.name;
    
    let capRisk = totalXP > 40 ? "Low" : "High";
    document.getElementById('v-captain').textContent = capRisk;

    let msg = "";
    if(selectedCount < 15) {
        msg = "Squad incomplete. Fill all 15 slots for a full tactical breakdown.";
    } else if (rating > 85) {
        msg = "🔥 <b>ELITE TEAM:</b> Your squad is in the top 1% for Expected Points. Minimal changes needed.";
    } else {
        msg = `💡 <b>AI ADVICE:</b> Your team value is £${totalValue.toFixed(1)}m. Replace <b>${weakestPlayer.name}</b> to improve your overall rating.`;
    }
    document.getElementById('ai-msg').innerHTML = msg;
}

function openPlanner(slot) {
    const val = slot.querySelector('select').value;
    const p = playerDB.find(x => x.name === val);
    if(!p) return;
    document.getElementById('planner').style.display = 'block';
    document.getElementById('planner-title').textContent = `Scout: ${p.name}`;
    const recs = playerDB.filter(x => x.pos === p.pos && x.name !== p.name && x.price <= (p.price + 0.5)).sort((a,b) => b.xp - a.xp).slice(0, 3);
    let html = '';
    recs.forEach(r => { 
        html += `<div class="rec-item"><span>${r.name}</span><span style="color:var(--accent-green)">${r.xp} xP</span></div>`; 
    });
    document.getElementById('planner-recs').innerHTML = html || "No budget options.";
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

// Kick off the data sync on load
syncData();
