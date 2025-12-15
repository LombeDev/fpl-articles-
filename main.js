/* -----------------------------------------
    GLOBAL SETUP
----------------------------------------- */
// Using the more reliable proxy for cross-origin requests
const proxy = "https://corsproxy.io/?";

// Global variables initialized at the top
let teamMap = {};    // Team ID -> Abbreviation (e.g., 1 -> 'ARS')
let playerMap = {};  // Player ID -> Full Name
let currentGameweekId = null;

// Deadline Countdown Globals
let nextDeadlineDate = null; 
let countdownInterval = null; 

// Mini-League Analyzer Globals
const LEAGUE_ID = "101712"; // The target league ID
let leagueData = [];        // Global store for the detailed league data
let defaultSortColumn = 'total-points';
let defaultSortDirection = 'desc';


/* -----------------------------------------
    NEW: LOADER MANAGEMENT
----------------------------------------- */
/**
 * Hides the loading overlay with a smooth fade-out.
 * Called ONLY after all critical data loading functions complete.
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
        // Assume you have CSS for the .hidden class to handle opacity transition
        overlay.classList.add('hidden'); 
        
        // Remove it from the DOM completely after the CSS transition completes (500ms)
        setTimeout(() => {
            overlay.remove();
        }, 500); 
    }
}

/**
 * NEW: Manages all critical data fetching and hides the loader when complete.
 */
async function startDataLoadingAndTrackCompletion() {
    try {
        // 1. Start the crucial bootstrap data load first.
        await loadFPLBootstrapData(); 

        // 2. Start all other independent loads simultaneously and wait for ALL.
        await Promise.all([
            loadGeneralLeagueStandings(),
            loadMiniLeagueAnalyzer(),
        ]);

        // 3. Ensure a minimum display time for the loader (e.g., 500ms) before hiding.
        await new Promise(resolve => setTimeout(resolve, 500));
        
        hideLoadingOverlay();

    } catch (err) {
        console.error("Critical loading failed:", err);
        // Ensure the loader is hidden even if the load fails, so the error messages are visible.
        hideLoadingOverlay();
    }
}


/* -----------------------------------------
    LIGHT / DARK / MULTI-COLOR MODE TOGGLE + SAVE
    (NOTE: Theme Toggle logic from original script, but needs HTML elements with IDs: 
    themeToggle and classes: dark-mode if reactivated.)
----------------------------------------- */
// const themeToggle = document.getElementById("themeToggle");
// const body = document.body;
// // ... (Rest of original theme logic here) ...


/* -----------------------------------------
    NAVIGATION MENU TOGGLES
----------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const headerContainer = document.querySelector('.header-container');

    // 1. Hamburger Menu Toggle Logic
    if (menuToggle && headerContainer) {
        menuToggle.addEventListener('click', function() {
            // Toggle the 'menu-open' class on the header container
            headerContainer.classList.toggle('menu-open');
            
            // Accessibility update
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
            menuToggle.setAttribute('aria-expanded', !isExpanded);
        });
    }

    // NOTE: Kebab and outside click logic removed as it was not in the provided HTML.
});


/* -----------------------------------------
    LAZY LOADING FADE-IN
----------------------------------------- */
const lazyElements = document.querySelectorAll(".lazy");

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("lazy-loaded");
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

lazyElements.forEach((el) => observer.observe(el));

/* -----------------------------------------
    FPL API FETCHING
----------------------------------------- */

// On page load 
window.addEventListener("DOMContentLoaded", () => {
    // We now call the loading manager instead of individual functions.
    startDataLoadingAndTrackCompletion();
});


/**
 * Helper function to create the HTML for rank/price change icons.
 * @param {number} changeValue - The magnitude of the change.
 * @param {boolean} isPriceChange - True if the icon is for a price change (uses different arrows/colors).
 * @returns {string} HTML span tag with the appropriate icon.
 */
function getChangeIconHtml(changeValue, isPriceChange) {
    if (changeValue > 0) {
        const icon = isPriceChange ? '▲' : '⬆️';
        const colorClass = isPriceChange ? 'change-up price-up' : 'change-up';
        return `<span class="${colorClass}">${icon}</span>`;
    } else if (changeValue < 0) {
        const icon = isPriceChange ? '▼' : '⬇️';
        const colorClass = isPriceChange ? 'change-down price-down' : 'change-down';
        return `<span class="${colorClass}">${icon}</span>`;
    } else {
        return `<span class="change-no-change">━</span>`;
    }
}


// 📅 GAMRWEEK DEADLINE COUNTDOWN IMPLEMENTATION
// -------------------------------------------------------------

/**
 * Parses the FPL data to find the next deadline and initiates the countdown.
 * @param {object} data - The full data object from FPL bootstrap-static.
 */
function processDeadlineDisplay(data) {
    const countdownEl = document.getElementById("countdown-timer");
    const gwNumEl = document.getElementById("current-gw");

    if (!countdownEl || !gwNumEl) return;

    // Find the next active Gameweek (is_next will be true, or is_current if none is next)
    const nextEvent = data.events.find(e => e.is_next || e.is_current);

    if (!nextEvent) {
        countdownEl.textContent = "Season ended or schedule unavailable.";
        return;
    }

    // Set global variables
    currentGameweekId = nextEvent.id;
    nextDeadlineDate = new Date(nextEvent.deadline_time);
    
    gwNumEl.textContent = currentGameweekId;
    
    // Start the countdown logic
    updateCountdown(countdownEl);
    countdownInterval = setInterval(() => updateCountdown(countdownEl), 1000);
}


/**
 * Updates the countdown timer display every second.
 * @param {HTMLElement} countdownEl - The element to display the countdown in.
 */
function updateCountdown(countdownEl) {
    if (!nextDeadlineDate) {
        clearInterval(countdownInterval);
        return;
    }
    
    const now = new Date().getTime();
    const distance = nextDeadlineDate.getTime() - now;

    if (distance < 0) {
        clearInterval(countdownInterval);
        countdownEl.textContent = "Deadline Passed! 🛑";
        countdownEl.classList.add('deadline-passed');
        return;
    }

    // Time calculations
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Format the output
    if (days > 0) {
         countdownEl.textContent = `${days}d ${hours}h ${minutes}m`;
    } else {
         countdownEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    }
}


/**
 * Fetches FPL bootstrap data, creates maps, and initializes dependent loads.
 * @returns {Promise<object>} The raw bootstrap data.
 */
async function loadFPLBootstrapData() {
    try {
        const response = await fetch(
            proxy + "https://fantasy.premierleague.com/api/bootstrap-static/"
        );
        const data = await response.json();

        // 1. Create maps
        data.teams.forEach(team => {
            teamMap[team.id] = team.short_name;
        });

        data.elements.forEach(player => {
            playerMap[player.id] = `${player.first_name} ${player.second_name}`;
        });

        // 2. Process Deadline and set currentGameweekId
        processDeadlineDisplay(data); 

        // 3. Load other lists (now that currentGameweekId is set)
        loadCurrentGameweekFixtures();
        loadPriceChanges(data);
        loadMostTransferred(data);
        loadMostTransferredOut(data);
        loadMostCaptained(data);
        loadPlayerStatusUpdates(data);
        loadSimpleEPLTable(data); 

        // CRITICAL: Return the data for parent function logic
        return data;

    } catch (err) {
        console.error("Error fetching FPL Bootstrap data:", err);
        const sections = ["price-changes-list", "most-transferred-list", "most-transferred-out-list", "most-captained-list", "fixtures-list", "status-list", "countdown-timer"];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "Failed to load data. Check FPL API/Proxy.";
        });
        throw err; // Re-throw to be caught by startDataLoadingAndTrackCompletion
    }
}


// -----------------------------------------
// Mini-League Analyzer & Manager Detail Fetching
// -----------------------------------------

/**
 * Main control function to load league standings and detailed manager data.
 */
async function loadMiniLeagueAnalyzer() {
    const tableBody = document.querySelector("#league-analyzer-table tbody");
    const gwEl = document.getElementById("analyzer-gw");
    const currentGwNum = currentGameweekId || 1; 

    // 1. Initial Setup
    if (!tableBody || !gwEl) return;
    tableBody.innerHTML = '<tr><td colspan="8" class="loading-message">Loading league data...</td></tr>';
    gwEl.textContent = currentGwNum;

    try {
        // Fetch League Standings (to get manager entry IDs)
        const standingsResponse = await fetch(
            proxy + `https://fantasy.premierleague.com/api/leagues-classic/${LEAGUE_ID}/standings/`
        ).then(r => r.json());

        const standings = standingsResponse.standings.results;
        if (!standings || standings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="error-message">No managers found in the league.</td></tr>';
            return;
        }

        // 2. Extract Manager Entry IDs
        const managerEntryIds = standings.map(s => s.entry);

        // 3. Fetch Detailed Manager Data Concurrently
        const managerDetails = await fetchManagerDetails(managerEntryIds, currentGwNum);

        // 4. Combine Standings and Details
        leagueData = standings.map(standing => {
            const details = managerDetails.find(d => d.entry === standing.entry);
            
            // Format player ID for Overall Rank lookup
            const playerId = standingsResponse.new_entries.results.find(e => e.id === standing.entry)?.player_entry_id;

            return {
                // Standings data
                rank: standing.rank,
                rank_change: standing.rank_change,
                player_name: standing.player_name,
                entry_name: standing.entry_name,
                total_points: standing.total,
                // Details data
                gw_points: details?.current_gw_points ?? 0,
                transfers: details?.transfers_made ?? 0,
                value: (details?.team_value / 10).toFixed(1) ?? 'N/A', // Team value is in pence/10
                overall_rank: details?.overall_rank ?? 'N/A',
                entry_id: standing.entry,
                player_id: playerId,
                // For sorting
                sort_total_points: standing.total,
                sort_gw_points: details?.current_gw_points ?? 0,
                sort_transfers: details?.transfers_made ?? 0,
                sort_value: details?.team_value ?? 0,
                sort_orank: details?.overall_rank ?? 9999999,
            };
        });

        // 5. Render the initial view
        renderAnalyzerTable(leagueData, 'current');
        
        // 6. Set up event listeners 
        setupAnalyzerListeners(); 

    } catch (err) {
        console.error("Error loading Mini-League Analyzer:", err);
        tableBody.innerHTML = '<tr><td colspan="8" class="error-message">❌ Failed to load league data. Check FPL API/Proxy.</td></tr>';
    }
}


/**
 * Fetches detailed stats for a list of managers concurrently.
 * @param {number[]} entryIds - Array of FPL manager entry IDs.
 * @param {number} currentGw - The current or next gameweek ID.
 * @returns {Promise<object[]>} Array of objects with detailed manager data.
 */
async function fetchManagerDetails(entryIds, currentGw) {
    const fetchPromises = entryIds.map(async (id) => {
        try {
            // Fetch the Manager's overall data (for team value and overall rank)
            const overallResponse = await fetch(
                proxy + `https://fantasy.premierleague.com/api/entry/${id}/`
            ).then(r => r.json());

            // Fetch the Manager's GW history (for GW points and transfers)
            const historyResponse = await fetch(
                proxy + `https://fantasy.premierleague.com/api/entry/${id}/history/`
            ).then(r => r.json());
            
            // Find the current GW entry in the history
            const currentGwHistory = historyResponse.current.find(h => h.event === currentGw);

            return {
                entry: id,
                current_gw_points: currentGwHistory?.points - currentGwHistory?.event_transfers_cost ?? 0, // GW points adjusted for hits
                transfers_made: currentGwHistory?.event_transfers ?? 0,
                team_value: overallResponse.summary_event_value, // This is in pence/10
                overall_rank: overallResponse.summary_overall_rank,
            };
        } catch (error) {
            console.error(`Error fetching details for entry ${id}:`, error);
            return { entry: id }; // Return minimal object to keep the structure
        }
    });

    return Promise.all(fetchPromises);
}


/**
 * Renders the league analyzer table based on the selected view/filter and sorting.
 * @param {object[]} data - The detailed league data.
 * @param {string} view - The current view ('current', 'transfers', 'value').
 */
function renderAnalyzerTable(data, view) {
    const tableBody = document.querySelector("#league-analyzer-table tbody");
    const headerRow = document.querySelector("#league-analyzer-table thead tr");
    if (!tableBody || !headerRow) return;

    tableBody.innerHTML = ''; // Clear previous data

    // 1. Determine sort column for view defaults
    let sortKey = defaultSortColumn;
    
    // 2. Sort the data using current global settings
    const sortDirectionValue = defaultSortDirection === 'asc' ? 1 : -1;

    const sortedData = [...data].sort((a, b) => {
        const valA = a[defaultSortColumn];
        const valB = b[defaultSortColumn];

        // Handle string sorting (Manager Name, Team Name)
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDirectionValue * valA.localeCompare(valB);
        }

        // Handle numeric sorting
        if (valA < valB) return sortDirectionValue * -1;
        if (valA > valB) return sortDirectionValue * 1;
        return 0;
    });

    // 3. Update table headers based on view/sort
    headerRow.querySelectorAll('th').forEach(th => {
        th.classList.remove('active-sort-column');
        const icon = th.querySelector('i');
        if (icon) {
             icon.classList.add('fa-sort');
             icon.classList.remove('fa-arrow-up', 'fa-arrow-down');
        }
    });

    // Highlight the active sort column and update its icon
    const activeCol = document.querySelector(`th[data-sort="${defaultSortColumn.replace('sort_', '').replace('_points', '-points')}"]`);
    if(activeCol) {
        activeCol.classList.add('active-sort-column');
        const activeIcon = activeCol.querySelector('i');
        if (activeIcon) {
            activeIcon.classList.remove('fa-sort');
            activeIcon.classList.add(defaultSortDirection === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down');
        }
    }
    
    // 4. Render Rows
    sortedData.forEach((manager, index) => {
        const rankChangeHtml = getChangeIconHtml(manager.rank_change, false); 
        
        const row = tableBody.insertRow();
        
        // Determine coloring for the top 3 (based on current visual sort order)
        if (index === 0) row.classList.add('top-rank');
        else if (index === 1) row.classList.add('second-rank');
        else if (index === 2) row.classList.add('third-rank');

        row.innerHTML = `
            <td>
                <span class="rank-number">${index + 1}.</span> 
                ${rankChangeHtml}
            </td>
            <td class="manager-name">${manager.player_name}</td>
            <td class="team-name">${manager.entry_name}</td>
            <td data-value="${manager.sort_gw_points}">${manager.gw_points}</td>
            <td data-value="${manager.sort_total_points}"><strong>${manager.total_points}</strong></td>
            <td data-value="${manager.sort_transfers}" class="transfers-cell">${manager.transfers}</td>
            <td data-value="${manager.sort_value}" class="value-cell">£${manager.value}m</td>
            <td data-value="${manager.sort_orank}" class="overall-rank-cell">${manager.overall_rank.toLocaleString()}</td>
        `;
    });
}

/**
 * Sets up event listeners for the analyzer filters and table header sorting.
 */
function setupAnalyzerListeners() {
    const filterSelect = document.getElementById("analyzer-view-filter");
    const refreshBtn = document.getElementById("update-analyzer-btn");
    const table = document.getElementById("league-analyzer-table");
    
    // Avoid setting up multiple listeners
    if (filterSelect.dataset.listenerSetup) return;
    filterSelect.dataset.listenerSetup = true;

    // 1. Filter Dropdown Change: When the view changes, we change the default sort key, 
    //    then render the table using the new settings.
    filterSelect.addEventListener('change', (e) => {
        const view = e.target.value;
        if (view === 'transfers') {
            defaultSortColumn = 'sort_transfers';
            defaultSortDirection = 'desc';
        } else if (view === 'value') {
            defaultSortColumn = 'sort_value';
            defaultSortDirection = 'desc';
        } else if (view === 'current') {
            defaultSortColumn = 'sort_total_points';
            defaultSortDirection = 'desc';
        }
        renderAnalyzerTable(leagueData, view);
    });

    // 2. Refresh Button
    refreshBtn.addEventListener('click', () => {
        loadMiniLeagueAnalyzer();
    });

    // 3. Table Header Sorting
    table.querySelectorAll('th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const sortColumn = header.dataset.sort;
            const sortKeyMap = {
                'rank': 'sort_total_points',
                'manager': 'player_name',
                'team-name': 'entry_name',
                'gw-points': 'sort_gw_points',
                'total-points': 'sort_total_points',
                'transfers': 'sort_transfers',
                'tv': 'sort_value',
                'orank': 'sort_orank'
            };
            
            const newSortKey = sortKeyMap[sortColumn];

            // Toggle sort direction
            if (defaultSortColumn === newSortKey) {
                defaultSortDirection = defaultSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                defaultSortColumn = newSortKey;
                // Default descending for points/rank/transfers/value, ascending for name
                defaultSortDirection = (defaultSortColumn.includes('points') || defaultSortColumn.includes('rank') || defaultSortColumn.includes('transfers') || defaultSortColumn.includes('value')) ? 'desc' : 'asc';
            }

            // Re-render the table with new sort
            const currentView = filterSelect.value;
            renderAnalyzerTable(leagueData, currentView);
        });
    });
}


// 🌍 GENERAL LEAGUE STANDINGS (Collapsible Section Content)
/**
 * Loads and displays standings for a list of general leagues.
 * The content for these leagues will be collapsible/expandable.
 */
async function loadGeneralLeagueStandings() {
    const container = document.getElementById("general-leagues-list");
    // NOTE: This container is not present in your HTML but keeping the logic
    if (!container) return;

    // --- 1. Define the leagues to load (IDs provided by the user) ---
    const leaguesToLoad = [
        { id: "101712", name: "Kopala FPL", type: "Classic" }, 
        { id: "147133", name: "Bayporteers", type: "Classic" }, 
        { id: "258", name: "Zambia", type: "Classic" }, 
        { id: "315", name: "Overall", type: "Classic" }, 
        { id: "276", name: "Gameweek 1", type: "Classic" }, 
        { id: "333", name: "Second Chance", type: "H2H" }, 
    ];

    container.innerHTML = ""; // Clear the initial loading content

    const loadPromises = leaguesToLoad.map(async (leagueConfig) => {
        // Create a dedicated sub-container for this league
        const leagueItem = document.createElement('div');
        leagueItem.classList.add('general-league-item');

        // Create the header for this specific league list
        const leagueHeader = document.createElement('div');
        leagueHeader.classList.add('general-league-header');
        leagueHeader.innerHTML = `
            <h4>${leagueConfig.name} League Standings</h4>
            <span class="league-type">(${leagueConfig.type})</span>
            <span class="loader-small"></span>
        `;
        
        // This is where the actual standings will go
        const standingsContent = document.createElement('div');
        standingsContent.classList.add('league-standings-content');
        
        leagueItem.appendChild(leagueHeader);
        leagueItem.appendChild(standingsContent);
        container.appendChild(leagueItem);

        // Add click listener to toggle the individual league standing content
        leagueHeader.addEventListener('click', () => {
            // Simple toggle for individual leagues
            standingsContent.classList.toggle('visible');
            leagueHeader.classList.toggle('active');
        });


        try {
            // Determine API endpoint based on league type (Classic or H2H)
            const apiEndpoint = leagueConfig.type === "H2H" 
                ? `https://fantasy.premierleague.com/api/leagues-h2h/${leagueConfig.id}/standings/`
                : `https://fantasy.premierleague.com/api/leagues-classic/${leagueConfig.id}/standings/`;

            const data = await fetch(
                proxy + apiEndpoint
            ).then((r) => r.json());

            // Check if the league has results
            const results = data.standings?.results;
            const loader = leagueHeader.querySelector('.loader-small');
            if (loader) loader.remove(); // Remove loader on success

            if (!results || results.length === 0) {
                standingsContent.innerHTML = `<p class="error-message">No teams found in this league.</p>`;
                return; // Exit this map iteration
            }

            // --- 2. Render Standings Table ---
            const list = document.createElement('ul');
            list.classList.add('standings-list-general'); // Use a specific class for styling

            results.forEach((team) => {
                // Get the HTML for rank change indicator using the helper function
                const rankChangeHtml = getChangeIconHtml(team.rank_change, false); 

                const listItem = document.createElement("li");
                listItem.innerHTML = `
                    <span class="rank-number">${team.rank}.</span> 
                    <span class="manager-name">${team.player_name} (${team.entry_name})</span> 
                    ${rankChangeHtml} <span><strong>${team.total}</strong> pts</span>
                `;

                if (team.rank === 1) listItem.classList.add("top-rank-general"); 
                
                list.appendChild(listItem);
            });

            standingsContent.appendChild(list);

        } catch (err) {
            console.error(`Error loading standings for ${leagueConfig.name}:`, err);
            const loader = leagueHeader.querySelector('.loader-small');
            if (loader) loader.remove();
            standingsContent.innerHTML = `<p class="error-message">❌ Failed to load standings for ${leagueConfig.name}.</p>`;
        }
    });
    
    // Wait for all league loads to finish before returning the overall promise
    await Promise.all(loadPromises);
}


/**
 * Loads and displays player status updates (Injured, Doubtful, Suspended)
 */
async function loadPlayerStatusUpdates(data) {
    const container = document.getElementById("injury-list"); // Updated ID to match your HTML
    if (!container || !data) return;

    container.innerHTML = ''; // Clear loading content

    try {
        // Filter players who are NOT fully available ('a') AND have a news message
        const unavailablePlayers = data.elements
            .filter(player =>
                player.status !== 'a' && player.news.trim().length > 0
            ).sort((a, b) => {
                // Sort by status: Injured (i) first, then Doubtful (d)
                return b.status.localeCompare(a.status);
            });

        if (unavailablePlayers.length === 0) {
            container.innerHTML = '<div class="player-news-item"><p class="no-data">🥳 All relevant players are currently available.</p></div>';
            return;
        }

        const newsHtml = unavailablePlayers.map(player => {
            const teamShortName = teamMap[player.team] || 'N/A';
            const fullName = `${player.first_name} ${player.second_name}`;
            
            let statusLabel = '';
            let statusClass = 'status-default';

            switch (player.status) {
                case 'd':
                    statusLabel = 'Doubtful';
                    statusClass = 'status-doubtful';
                    break;
                case 'i':
                    statusLabel = 'Injured';
                    statusClass = 'status-injured';
                    break;
                case 's':
                    statusLabel = 'Suspended';
                    statusClass = 'status-injured';
                    break;
                case 'u':
                    statusLabel = 'Unavailable';
                    statusClass = 'status-unavailable';
                    break;
                default:
                    statusLabel = 'Uncertain';
                    break;
            }

            return `
                <div class="player-news-item">
                    <div class="player-info">
                        <strong>${fullName} (${teamShortName})</strong>
                        <span class="status-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <p class="news-detail">${player.news}</p>
                </div>
            `;
        }).join('');

        container.innerHTML = newsHtml;

    } catch (error) {
        console.error("Failed to load player status updates:", error);
        container.innerHTML = '<p class="error-message">❌ Could not load player status updates. Check FPL API/Proxy.</p>';
    }
}


// 📅 CURRENT GAMEWEEK FIXTURES
async function loadCurrentGameweekFixtures() {
    const container = document.getElementById("live-scores").querySelector('.scores-grid'); // Changed ID to match your HTML
    if (!container) return;

    if (!currentGameweekId) {
        container.innerHTML = "<p>Current Gameweek information is not yet available.</p>";
        return;
    }

    try {
        const data = await fetch(
            proxy + "https://fantasy.premierleague.com/api/fixtures/"
        ).then((r) => r.json());

        const currentGWFixtures = data.filter(f => f.event === currentGameweekId);

        if (currentGWFixtures.length === 0) {
            container.innerHTML = `<p>No fixtures found for Gameweek ${currentGameweekId}.</p>`;
            return;
        }

        container.innerHTML = ''; // Clear loading content

        const list = document.createElement('ul');
        list.classList.add('fixtures-list-items');

        currentGWFixtures.forEach(fixture => {
            const homeTeamAbbr = teamMap[fixture.team_h] || `T${fixture.team_h}`;
            const awayTeamAbbr = teamMap[fixture.team_a] || `T${fixture.team_a}`;

            let scoreDisplay = `<span class="vs-label">vs</span>`;
            let statusClass = 'match-pending';
            let statusText = 'Upcoming';

            if (fixture.finished) {
                scoreDisplay = `<span class="score-home">${fixture.team_h_score}</span> : <span class="score-away">${fixture.team_a_score}</span>`;
                statusClass = 'match-finished';
                statusText = 'Finished';
            } else if (fixture.started) {
                scoreDisplay = `<span class="score-home">${fixture.team_h_score}</span> : <span class="score-away">${fixture.team_a_score}</span>`;
                statusClass = 'match-live';
                statusText = 'Live';
            } else {
                const kickoffTime = new Date(fixture.kickoff_time);
                scoreDisplay = `<span class="vs-label-time">${kickoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
            }

            const listItem = document.createElement('li');
            listItem.classList.add(statusClass);

            listItem.innerHTML = `
                <div class="fixture-summary">
                    <span class="fixture-team home-team">
                        <span class="team-label home-label">${homeTeamAbbr}</span> 
                    </span> 
                    ${scoreDisplay}
                    <span class="fixture-team away-team">
                        <span class="team-label away-label">${awayTeamAbbr}</span> 
                    </span>
                    <span class="match-status-tag">${statusText}</span>
                </div>
            `;

            let actionHtml = '';
            let hasDetails = false;

            if (fixture.started) {
                const stats = fixture.stats || [];

                const extractStats = (identifier) => {
                    const stat = stats.find(s => s.identifier === identifier);
                    return stat ? (stat.a || []).concat(stat.h || []) : [];
                };

                const goalsData = extractStats('goals_scored');
                const assistsData = extractStats('assists');
                const redCardsData = extractStats('red_cards');

                const allActions = [];

                const processActions = (actionArray, type) => {
                    actionArray.forEach(action => {
                        const playerName = playerMap[action.element] || `Player ${action.element}`;
                        for (let i = 0; i < action.value; i++) {
                            allActions.push({ type: type, name: playerName });
                        }
                    });
                };

                processActions(goalsData, 'goal');
                processActions(assistsData, 'assist');
                processActions(redCardsData, 'red_card');

                if (allActions.length > 0) {
                    hasDetails = true;
                    const groupedActions = allActions.reduce((acc, action) => {
                        if (!acc[action.type]) acc[action.type] = new Set();
                        acc[action.type].add(action.name);
                        return acc;
                    }, {});

                    actionHtml += '<div class="fixture-details">';

                    if (groupedActions.goal) {
                        actionHtml += `<p><span class="action-label action-goal">⚽ Goals:</span> ${Array.from(groupedActions.goal).join(', ')}</p>`;
                    }
                    if (groupedActions.assist) {
                        actionHtml += `<p><span class="action-label action-assist">👟 Assists:</span> ${Array.from(groupedActions.assist).join(', ')}</p>`;
                    }
                    if (groupedActions.red_card) {
                        actionHtml += `<p><span class="action-label action-red-card">🟥 Red Cards:</span> ${Array.from(groupedActions.red_card).join(', ')}</p>`;
                    }

                    actionHtml += '</div>';
                }
            }

            if (hasDetails) {
                listItem.innerHTML += actionHtml;
                listItem.classList.add('has-details');
            }

            list.appendChild(listItem);
        });

        container.appendChild(list);

    } catch (err) {
        console.error("Error loading fixtures:", err);
        container.textContent = "Failed to load fixtures data. Check FPL API/Proxy.";
    }
}


// MINI-LEAGUE STANDINGS (Original for 'standings-list' - Not in new HTML, keeping for completeness)
async function loadStandings() {
    const container = document.getElementById("standings-list");
    if (!container) return;
    try {
        const leagueID = "101712";
        const data = await fetch(
            proxy + `https://fantasy.premierleague.com/api/leagues-classic/${leagueID}/standings/`
        ).then((r) => r.json());

        container.innerHTML = "";
        data.standings.results.forEach((team, index) => {
            // Using setTimeout for staggered reveal, but note this doesn't block the loader
            setTimeout(() => {
                // Use the helper function for dynamic rank change arrows
                const rankChangeHtml = getChangeIconHtml(team.rank_change, false);

                const div = document.createElement("div");
                div.classList.add("standing-row");
                div.innerHTML = `<span class="rank-number">${team.rank}.</span> <span class="manager-name">${team.player_name} (${team.entry_name})</span> ${rankChangeHtml} <span>${team.total} pts</span>`;

                if (team.rank === 1) div.classList.add("top-rank");
                else if (team.rank === 2) div.classList.add("second-rank");
                else if (team.rank === 3) div.classList.add("third-rank");

                container.appendChild(div);
            }, index * 30);
        });
    } catch (err) {
        console.error("Error loading standings:", err);
        container.textContent = "Failed to load standings. Check league ID or proxy.";
    }
}

// 💰 FPL PRICE CHANGES 
async function loadPriceChanges(data) {
    const risingContainer = document.getElementById("rising-table").querySelector('tbody');
    const fallingContainer = document.getElementById("falling-table").querySelector('tbody');

    if (!risingContainer || !fallingContainer || !data) return;

    const priceChangedPlayers = data.elements
        .filter(p => p.cost_change_event !== 0);

    const risers = priceChangedPlayers
        .filter(p => p.cost_change_event > 0)
        .sort((a, b) => b.cost_change_event - a.cost_change_event)
        .slice(0, 10);

    const fallers = priceChangedPlayers
        .filter(p => p.cost_change_event < 0)
        .sort((a, b) => a.cost_change_event - b.cost_change_event)
        .slice(0, 10);
        
    risingContainer.innerHTML = '';
    fallingContainer.innerHTML = '';

    const createTableRow = (player) => {
        const row = document.createElement('tr');
        const teamAbbreviation = teamMap[player.team] || 'N/A';
        const playerPrice = (player.now_cost / 10).toFixed(1);
        const change = player.cost_change_event / 10;
        const sign = change > 0 ? '+' : '';

        row.innerHTML = `
            <td>${player.first_name} ${player.second_name}</td>
            <td>${teamAbbreviation}</td>
            <td>£${playerPrice}m (${sign}${change.toFixed(1)})</td>
        `;
        return row;
    };

    risers.forEach(p => risingContainer.appendChild(createTableRow(p)));
    fallers.forEach(p => fallingContainer.appendChild(createTableRow(p)));
}

// ➡️ MOST TRANSFERRED IN (Using sidebar container)
async function loadMostTransferred(data) {
    const container = document.getElementById("sidebar-transfers-list");
    if (!container || !data) return;

    const topTransferred = data.elements
        .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
        .slice(0, 3); // Showing top 3 in sidebar

    container.innerHTML = "<li><strong>IN:</strong></li>";

    topTransferred.forEach((p) => {
        const listItem = document.createElement("li");
        const transfers = p.transfers_in_event.toLocaleString();
        const teamAbbreviation = teamMap[p.team] || 'N/A';
        listItem.textContent = `${p.second_name} (${teamAbbreviation}) - ${transfers}`;
        listItem.classList.add("transfer-in");
        container.appendChild(listItem);
    });
}

// ⬅️ MOST TRANSFERRED OUT 
async function loadMostTransferredOut(data) {
    const container = document.getElementById("sidebar-transfers-list");
    if (!container || !data) return;

    const topTransferredOut = data.elements
        .sort((a, b) => b.transfers_out_event - a.transfers_out_event)
        .slice(0, 3); // Showing top 3 in sidebar
        
    const titleItem = document.createElement("li");
    titleItem.innerHTML = "<li><strong>OUT:</strong></li>";
    container.appendChild(titleItem);


    topTransferredOut.forEach((p) => {
        const listItem = document.createElement("li");
        const transfers = p.transfers_out_event.toLocaleString();
        const teamAbbreviation = teamMap[p.team] || 'N/A';
        
        listItem.textContent = `${p.second_name} (${teamAbbreviation}) - ${transfers}`;
        listItem.classList.add("transfer-out");

        container.appendChild(listItem);
    });
}


// ©️ MOST CAPTAINED PLAYER 
async function loadMostCaptained(data) {
    const container = document.getElementById("most-captained");
    if (!container || !data) return;

    const currentEvent = data.events.find(e => e.is_next || e.is_current);

    if (!currentEvent || !currentEvent.most_captained) {
        container.textContent = "Data not yet available.";
        return;
    }

    const mostCaptainedId = currentEvent.most_captained;
    const captain = data.elements.find(p => p.id === mostCaptainedId);

    if (!captain) {
        container.textContent = "Could not find captain.";
        return;
    }

    const playerPrice = (captain.now_cost / 10).toFixed(1);
    const captaincyPercentage = captain.selected_by_percent; 
    const teamAbbreviation = teamMap[captain.team] || 'N/A';

    container.innerHTML = `
        <span class="player-name">${captain.second_name} (${teamAbbreviation})</span>
        <span class="captaincy-detail">| ${captaincyPercentage}%</span>
    `;
}


// 🥇 CURRENT EPL TABLE (STANDINGS) - Simplified FPL Data Only
/**
 * Loads and displays a simplified EPL Table using only FPL Bootstrap data.
 * NOTE: This is implemented against the generic 'fpl-grid' for placement.
 * @param {object} data - The full data object from FPL bootstrap-static.
 */
async function loadSimpleEPLTable(data) {
    // NOTE: HTML does not have 'epl-table-list', using a section inside the FPL grid
    const container = document.getElementById("fpl").querySelector('.fpl-grid'); 
    if (!container || !data || !data.teams) return;

    // FPL team data already contains standings information (position, points, etc.)
    const sortedTeams = data.teams.sort((a, b) => a.position - b.position);

    // Create a new div specifically for the table within the grid
    const tableWrapper = document.createElement('div');
    tableWrapper.classList.add('epl-table-wrapper', 'card', 'lazy');
    tableWrapper.innerHTML = "<h3>Current Premier League Standings 🏆 (FPL Data)</h3>";


    const table = document.createElement('table');
    table.classList.add('simple-epl-table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>#</th>
                <th class="team-name-header">Team</th>
                <th>Pl</th>
                <th>W</th>
                <th>L</th>
                <th>Pts</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector('tbody');

    sortedTeams.forEach((team) => {
        const row = tbody.insertRow();
        
        // Determine coloring based on position (rank) - uses FPL's fields
        let rowClass = '';
        if (team.position <= 4) {
            rowClass = "champions-league";
        } else if (team.position === 5) {
            rowClass = "europa-league";
        } else if (team.position >= 18) {
            rowClass = "relegation-zone";
        }

        if(rowClass) row.classList.add(rowClass);

        row.innerHTML = `
            <td>${team.position}</td>
            <td class="team-name">${team.name}</td>
            <td>${team.played}</td>
            <td>${team.win}</td>
            <td>${team.loss}</td>
            <td>${team.points}</td>
        `;
    });
    
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
}

// Placeholder function (replace with your actual logic) - used in HTML
function viewLeague() {
    // For now, trigger scroll to the league analyzer section
    const analyzerSection = document.getElementById('mini-league-analyzer');
    if (analyzerSection) {
        analyzerSection.scrollIntoView({ behavior: 'smooth' });
    }
}


 <script>
        document.addEventListener('DOMContentLoaded', function () {
            const menuToggle = document.querySelector('.menu-toggle');
            const headerContainer = document.querySelector('.header-container');

            if (menuToggle && headerContainer) {
                menuToggle.addEventListener('click', function() {
                    // Toggle the 'menu-open' class on the header container
                    headerContainer.classList.toggle('menu-open');
                    
                    // Accessibility update
                    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
                    menuToggle.setAttribute('aria-expanded', !isExpanded);
                });
            }
        });

        // Placeholder function (replace with your actual logic)
        function viewLeague() {
            alert('Viewing Full League Table...');
        }
    </script>
