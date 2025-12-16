/* -----------------------------------------
    GLOBAL SETUP
----------------------------------------- */
const proxy = "https://corsproxy.io/?";

let teamMap = {};    // Team ID -> Abbreviation (e.g., 1 -> 'ARS')
let playerMap = {};  // Player ID -> Full Name
let currentGameweekId = null;

let nextDeadlineDate = null; 
let countdownInterval = null; 

// --- Mini-League Analyzer Globals ---
const LEAGUE_ID = "101712"; 
let leagueData = [];        
let defaultSortColumn = 'total-points';
let defaultSortDirection = 'desc';

// --- Advanced Player Stats Globals ---
let allPlayersData = []; 
let currentSortColumnPlayer = 'TSB'; 
currentSortDirectionPlayer = 'desc';
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
    CORE DATA LOADING (BOOTSTRAP)
----------------------------------------- */
async function loadFPLBootstrapData() {
    try {
        const response = await fetch(proxy + "https://fantasy.premierleague.com/api/bootstrap-static/");
        const data = await response.json();

        // 1. Create maps
        data.teams.forEach(team => {
            teamMap[team.id] = team.short_name;
        });

        data.elements.forEach(player => {
            playerMap[player.id] = `${player.first_name} ${player.second_name}`;
        });

        // 2. Process Deadline
        processDeadlineDisplay(data); 

        // 3. RUN NEW SECTIONS
        loadInjuryList(data); 
        loadEssentials(data.elements);

        // 4. Load other existing lists
        loadCurrentGameweekFixtures();
        loadPriceChanges(data);
        loadMostTransferred(data);
        loadMostTransferredOut(data);
        loadMostCaptained(data);
        loadPlayerStatusUpdates(data);
        loadSimpleEPLTable(data); 

        return data;

    } catch (err) {
        console.error("Error fetching FPL Bootstrap data:", err);
        throw err;
    }
}

/* -----------------------------------------
    SECTION: INJURY & SUSPENSION LIST
----------------------------------------- */
function loadInjuryList(data) {
    const container = document.querySelector(".injury-list");
    if (!container) return;

    const players = data.elements;
    
    // Filter for d: Doubtful, i: Injured, s: Suspended
    const flagged = players.filter(p => ['i', 's', 'd'].includes(p.status));

    // Sort by team name
    flagged.sort((a, b) => teamMap[a.team].localeCompare(teamMap[b.team]));

    if (flagged.length === 0) {
        container.innerHTML = "<p>No current injuries or suspensions reported.</p>";
        return;
    }

    container.innerHTML = flagged.map(p => {
        let typeLabel = "";
        let colorClass = "";

        if (p.status === 'i') { typeLabel = "INJURED"; colorClass = "status-out"; }
        else if (p.status === 's') { typeLabel = "SUSPENDED"; colorClass = "status-suspended"; }
        else if (p.status === 'd') { typeLabel = "DOUBTFUL"; colorClass = "status-doubtful"; }

        return `
            <div class="injury-card ${colorClass}">
                <div class="injury-header">
                    <span class="status-badge">${typeLabel}</span>
                    <span class="team-tag">${teamMap[p.team]}</span>
                </div>
                <h4 class="player-name">${p.web_name}</h4>
                <p class="injury-news">${p.news}</p>
                ${p.status === 'd' ? `<div class="chance-tag">${p.chance_of_playing_next_round}% chance</div>` : ''}
            </div>
        `;
    }).join('');
}

/* -----------------------------------------
    SECTION: ESSENTIALS (TEMPLATE)
----------------------------------------- */
function loadEssentials(players) {
    const container = document.getElementById('essential-list-container');
    if (!container) return;
    
    const essentials = players
        .filter(p => parseFloat(p.selected_by_percent) > 30)
        .sort((a, b) => parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent));

    container.innerHTML = essentials.map(player => `
        <div class="shield-card">
            <div class="shield-header">
                <span class="shield-name">${player.web_name}</span>
                <span class="shield-percent">${player.selected_by_percent}%</span>
            </div>
            <div class="shield-bar-bg">
                <div class="shield-bar-fill" style="width: ${player.selected_by_percent}%"></div>
            </div>
            <div class="shield-meta">
                <span>£${(player.now_cost / 10).toFixed(1)}m</span>
                <span>Points: ${player.total_points}</span>
            </div>
        </div>
    `).join('');
}

/* -----------------------------------------
    DEADLINE COUNTDOWN
----------------------------------------- */
function processDeadlineDisplay(data) {
    const countdownEl = document.getElementById("countdown-timer");
    const gwNumEl = document.getElementById("current-gw");
    if (!countdownEl || !gwNumEl) return;

    const nextEvent = data.events.find(e => e.is_next || e.is_current);
    if (!nextEvent) return;

    currentGameweekId = nextEvent.id;
    nextDeadlineDate = new Date(nextEvent.deadline_time);
    gwNumEl.textContent = currentGameweekId;
    
    updateCountdown(countdownEl);
    countdownInterval = setInterval(() => updateCountdown(countdownEl), 1000);
}

function updateCountdown(countdownEl) {
    if (!nextDeadlineDate) return;
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
    INITIALIZATION
----------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const headerContainer = document.querySelector('.header-container');

    if (menuToggle && headerContainer) {
        menuToggle.addEventListener('click', () => {
            headerContainer.classList.toggle('menu-open');
        });
    }

    startDataLoadingAndTrackCompletion();
});

// ... Add your existing loadMiniLeagueAnalyzer, loadAdvancedPlayerStats, etc. below ...
