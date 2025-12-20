/* -----------------------------------------
    GLOBAL SETUP
----------------------------------------- */
const proxy = "https://corsproxy.io/?";

let teamMap = {};    // Team ID -> Abbreviation (e.g., 1 -> 'ARS')
let playerMap = {};  // Player ID -> Full Name
let currentGameweekId = null;
let nextDeadlineDate = null; 
let countdownInterval = null; 

// League & Player Data Globals
const LEAGUE_ID = "101712"; 
let leagueData = [];        
let defaultSortColumn = 'total-points';
let defaultSortDirection = 'desc';

let allPlayersData = []; 
let currentSortColumnPlayer = 'TSB'; 
let currentSortDirectionPlayer = 'desc';
const posMap = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };

/* -----------------------------------------
    LOADER MANAGEMENT
----------------------------------------- */
function hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
        overlay.classList.add('hidden'); 
        setTimeout(() => { overlay.remove(); }, 500); 
    }
}

async function startDataLoadingAndTrackCompletion() {
    try {
        await loadFPLBootstrapData(); 

        await Promise.all([
            loadGeneralLeagueStandings(),
            loadMiniLeagueAnalyzer(),
            loadAdvancedPlayerStats(), 
            loadGameweekWrapped(),
        ]);

        await new Promise(resolve => setTimeout(resolve, 500));
        hideLoadingOverlay();
    } catch (err) {
        console.error("Critical loading failed:", err);
        hideLoadingOverlay();
    }
}

/* -----------------------------------------
    CORE HELPERS & DEADLINE
----------------------------------------- */
function getChangeIconHtml(changeValue, isPriceChange) {
    if (changeValue > 0) {
        const icon = isPriceChange ? '▲' : '⬆️';
        return `<span class="${isPriceChange ? 'change-up price-up' : 'change-up'}">${icon}</span>`;
    } else if (changeValue < 0) {
        const icon = isPriceChange ? '▼' : '⬇️';
        return `<span class="${isPriceChange ? 'change-down price-down' : 'change-down'}">${icon}</span>`;
    }
    return `<span class="change-no-change">━</span>`;
}

function processDeadlineDisplay(data) {
    const countdownEl = document.getElementById("countdown-timer");
    const gwNumEl = document.getElementById("current-gw");
    if (!countdownEl || !gwNumEl) return;

    const nextEvent = data.events.find(e => e.is_next || e.is_current);
    if (!nextEvent) {
        countdownEl.textContent = "Season ended.";
        return;
    }

    currentGameweekId = nextEvent.id;
    nextDeadlineDate = new Date(nextEvent.deadline_time);
    gwNumEl.textContent = currentGameweekId;
    
    updateCountdown(countdownEl);
    countdownInterval = setInterval(() => updateCountdown(countdownEl), 1000);
}

function updateCountdown(countdownEl) {
    const now = new Date().getTime();
    const distance = nextDeadlineDate.getTime() - now;

    if (distance < 0) {
        clearInterval(countdownInterval);
        countdownEl.textContent = "Deadline Passed! 🛑";
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    countdownEl.textContent = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`;
}

/* -----------------------------------------
    MAIN DATA LOADING (Bootstrap)
----------------------------------------- */
async function loadFPLBootstrapData() {
    try {
        const response = await fetch(proxy + "https://fantasy.premierleague.com/api/bootstrap-static/");
        const data = await response.json();

        data.teams.forEach(t => teamMap[t.id] = t.short_name);
        data.elements.forEach(p => playerMap[p.id] = `${p.first_name} ${p.second_name}`);

        processDeadlineDisplay(data); 

        // Load dependent lists
        loadCurrentGameweekFixtures();
        // (Placeholder calls for other features you have)
        if (typeof loadPriceChanges === "function") loadPriceChanges(data);
        if (typeof loadSimpleEPLTable === "function") loadSimpleEPLTable(data);

        return data;
    } catch (err) {
        console.error("Bootstrap error:", err);
        throw err;
    }
}

/* -----------------------------------------
    GAMRWEEK FIXTURES (HIDDEN IF ENDED)
----------------------------------------- */
async function loadCurrentGameweekFixtures() {
    const container = document.getElementById("fixtures-list");
    if (!container) return;

    try {
        const response = await fetch(proxy + `https://fantasy.premierleague.com/api/fixtures/?event=${currentGameweekId}`);
        const fixtures = await response.json();

        // CHECK: If all matches are finished, we hide the display
        const allFinished = fixtures.every(f => f.finished === true);

        if (allFinished) {
            container.innerHTML = `<div class="gw-finished-msg">Gameweek matches have ended. Check the GW Review below! 🏁</div>`;
            return;
        }

        container.innerHTML = ''; 
        fixtures.forEach(fix => {
            const isLive = fix.started && !fix.finished;
            const fixRow = document.createElement("div");
            fixRow.className = `fixture-row ${isLive ? 'live-match' : ''}`;
            fixRow.innerHTML = `
                <div class="fix-team">${teamMap[fix.team_h]}</div>
                <div class="fix-score">${fix.started ? `${fix.team_h_score} - ${fix.team_a_score}` : 'vs'}</div>
                <div class="fix-team">${teamMap[fix.team_a]}</div>
                ${isLive ? '<span class="live-badge">LIVE</span>' : ''}
            `;
            container.appendChild(fixRow);
        });
    } catch (err) {
        container.innerHTML = "Fixture data unavailable.";
    }
}

/* -----------------------------------------
    MINI-LEAGUE ANALYZER
----------------------------------------- */
async function loadMiniLeagueAnalyzer() {
    const tableBody = document.querySelector("#league-analyzer-table tbody");
    if (!tableBody) return;

    try {
        const res = await fetch(proxy + `https://fantasy.premierleague.com/api/leagues-classic/${LEAGUE_ID}/standings/`);
        const standingsData = await res.json();
        const standings = standingsData.standings.results;

        const managerDetails = await fetchManagerDetails(standings.map(s => s.entry), currentGameweekId);

        leagueData = standings.map(s => {
            const d = managerDetails.find(det => det.entry === s.entry);
            return {
                ...s,
                gw_points: d?.current_gw_points ?? 0,
                transfers: d?.transfers_made ?? 0,
                value: (d?.team_value / 10).toFixed(1) ?? 'N/A',
                overall_rank: d?.overall_rank ?? 'N/A',
                sort_total_points: s.total,
                sort_gw_points: d?.current_gw_points ?? 0,
                sort_transfers: d?.transfers_made ?? 0,
                sort_value: d?.team_value ?? 0,
                sort_orank: d?.overall_rank ?? 9999999
            };
        });

        renderAnalyzerTable(leagueData, 'current');
        setupAnalyzerListeners();
    } catch (err) {
        console.error("Analyzer error:", err);
    }
}

async function fetchManagerDetails(ids, gw) {
    const fetchPromises = ids.map(async (id) => {
        try {
            const [ov, hist] = await Promise.all([
                fetch(proxy + `https://fantasy.premierleague.com/api/entry/${id}/`).then(r => r.json()),
                fetch(proxy + `https://fantasy.premierleague.com/api/entry/${id}/history/`).then(r => r.json())
            ]);
            const curHist = hist.current.find(h => h.event === gw);
            return {
                entry: id,
                current_gw_points: curHist ? (curHist.points - curHist.event_transfers_cost) : 0,
                transfers_made: curHist?.event_transfers ?? 0,
                team_value: ov.summary_event_value,
                overall_rank: ov.summary_overall_rank
            };
        } catch (e) { return { entry: id }; }
    });
    return Promise.all(fetchPromises);
}

function renderAnalyzerTable(data, view) {
    const tableBody = document.querySelector("#league-analyzer-table tbody");
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const sorted = [...data].sort((a, b) => {
        const key = `sort_${defaultSortColumn.replace('-', '_')}`;
        const valA = a[key] ?? a[defaultSortColumn];
        const valB = b[key] ?? b[defaultSortColumn];
        return defaultSortDirection === 'desc' ? (valB - valA) : (valA - valB);
    });

    sorted.forEach((m, i) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${i + 1}. ${getChangeIconHtml(m.rank_change, false)}</td>
            <td>${m.player_name}</td>
            <td>${m.entry_name}</td>
            <td>${m.gw_points}</td>
            <td><strong>${m.total}</strong></td>
            <td>${m.transfers}</td>
            <td>£${m.value}m</td>
            <td>${m.overall_rank.toLocaleString()}</td>
        `;
    });
}

function setupAnalyzerListeners() {
    const refreshBtn = document.getElementById("update-analyzer-btn");
    if (refreshBtn) refreshBtn.onclick = () => loadMiniLeagueAnalyzer();
}

/* -----------------------------------------
    PLAYER STATS CENTRE (TOP 20)
----------------------------------------- */
async function loadAdvancedPlayerStats() {
    try {
        const res = await fetch(proxy + "https://fantasy.premierleague.com/api/bootstrap-static/");
        const data = await res.json();
        allPlayersData = data.elements.map(p => ({
            name: `${p.first_name} ${p.second_name}`,
            team: teamMap[p.team],
            pos: posMap[p.element_type],
            price: (p.now_cost / 10).toFixed(1),
            TSB: p.total_points,
            ICT: parseFloat(p.ict_index),
            PPM: (p.points_per_game / (p.now_cost / 10)).toFixed(2),
            sort_TSB: p.total_points,
            sort_ICT: parseFloat(p.ict_index),
            sort_price: p.now_cost
        }));
        applyFiltersAndRenderStats(allPlayersData, 'ALL');
        setupStatsCentreListeners();
    } catch (e) { console.error("Stats Error:", e); }
}

function applyFiltersAndRenderStats(data, posFilter) {
    let filtered = posFilter === 'ALL' ? data : data.filter(p => p.pos === posFilter);
    const key = `sort_${currentSortColumnPlayer}`;
    filtered.sort((a, b) => currentSortDirectionPlayer === 'desc' ? (b[key] - a[key]) : (a[key] - b[key]));
    
    const top20 = filtered.slice(0, 20);
    const tableBody = document.querySelector("#player-stats-table tbody");
    if (!tableBody) return;
    tableBody.innerHTML = top20.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.team}</td>
            <td><span class="pos-badge pos-${p.pos}">${p.pos}</span></td>
            <td>£${p.price}m</td>
            <td>${p.TSB}</td>
            <td>${p.ICT}</td>
            <td>${p.PPM}</td>
        </tr>
    `).join('');
}

function setupStatsCentreListeners() {
    document.getElementById("pos-filter")?.addEventListener('change', (e) => applyFiltersAndRenderStats(allPlayersData, e.target.value));
}

/* -----------------------------------------
    GAMEWEEK WRAPPED (REVIEW)
----------------------------------------- */
async function loadGameweekWrapped() {
    const container = document.getElementById("gw-wrapped-content");
    if (!container) return;
    
    const completedGwId = currentGameweekId - 1; 

    if (completedGwId <= 0) {
        container.innerHTML = '<p class="no-data">Season is just starting. No review yet!</p>';
        return;
    }

    try {
        const [statusRes, liveRes] = await Promise.all([
            fetch(proxy + `https://fantasy.premierleague.com/api/event/${completedGwId}/status/`).then(r => r.json()),
            fetch(proxy + `https://fantasy.premierleague.com/api/event/${completedGwId}/live/`).then(r => r.json())
        ]);

        const highestScore = statusRes.status.find(s => s.type === 'hsc')?.points || 'N/A';
        const averageScore = statusRes.game?.average_entry_score || 0;
        
        // Finding the best player of the GW
        let topPlayer = { id: 0, pts: 0 };
        liveRes.elements.forEach(el => {
            if (el.stats.total_points > topPlayer.pts) {
                topPlayer = { id: el.id, pts: el.stats.total_points };
            }
        });

        container.innerHTML = `
            <div class="gw-review-header">Gameweek ${completedGwId} Review</div>
            <div class="gw-stats-grid">
                <div class="stat-card">
                    <span class="label">Avg Score</span>
                    <span class="value">${averageScore}</span>
                </div>
                <div class="stat-card">
                    <span class="label">Highest Score</span>
                    <span class="value">${highestScore}</span>
                </div>
                <div class="stat-card">
                    <span class="label">Top Player</span>
                    <span class="value">${topPlayer.pts} pts</span>
                    <span class="detail">${playerMap[topPlayer.id] || 'N/A'}</span>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = "Review currently unavailable.";
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    startDataLoadingAndTrackCompletion();
});
