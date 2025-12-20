/* -----------------------------------------
    GLOBAL SETUP
----------------------------------------- */
// Using the more reliable proxy for cross-origin requests
const proxy = "https://corsproxy.io/?";

// Global variables initialized at the top
let teamMap = {};    // Team ID -> Abbreviation (e.g., 1 -> 'ARS')
let playerMap = {};  // Player ID -> Full Name
let currentGameweekId = null;

// Deadline Countdown Globals
let nextDeadlineDate = null; 
let countdownInterval = null; 

// --- Mini-League Analyzer Globals ---
const LEAGUE_ID = "101712"; // The target league ID
let leagueData = [];        // Global store for the detailed league data
let defaultSortColumn = 'total-points';
let defaultSortDirection = 'desc';

// --- Advanced Player Stats Globals ---
let allPlayersData = []; // Global store for the full, raw player dataset
let currentSortColumnPlayer = 'TSB'; // Default sort: Total Score (which is Total Points)
let currentSortDirectionPlayer = 'desc';
const posMap = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };


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
 * Manages all critical data fetching and hides the loader when complete.
 */
async function startDataLoadingAndTrackCompletion() {
    try {
        // 1. Start the crucial bootstrap data load first.
        await loadFPLBootstrapData(); 

        // 2. Start all other independent loads simultaneously and wait for ALL.
        await Promise.all([
            loadGeneralLeagueStandings(),
            loadMiniLeagueAnalyzer(),
            loadAdvancedPlayerStats(), 
            loadGameweekWrapped(),     // <-- NEW: Gameweek Wrapped is now loaded
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

    // Call the data loader manager
    startDataLoadingAndTrackCompletion();
});


/* -----------------------------------------
    LAZY LOADING FADE-IN (If you add this CSS)
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
    FPL API FETCHING - CORE HELPERS
----------------------------------------- */

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
        const sections = ["countdown-timer"]; // Basic critical element
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

    // 1. Sort the data using current global settings
    const sortDirectionValue = defaultSortDirection === 'asc' ? 1 : -1;

    const sortedData = [...data].sort((a, b) => {
        // Construct the correct key name, handling the "sort_" prefix
        const keyName = `sort_${defaultSortColumn.replace('-', '_')}`;
        const valA = a[keyName] || a[defaultSortColumn.replace('-', '_')];
        const valB = b[keyName] || b[defaultSortColumn.replace('-', '_')];

        // Handle string sorting (Manager Name, Team Name)
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDirectionValue * valA.localeCompare(valB);
        }

        // Handle numeric sorting
        if (valA < valB) return sortDirectionValue * -1;
        if (valA > valB) return sortDirectionValue * 1;
        return 0;
    });

    // 2. Update table headers based on view/sort
    headerRow.querySelectorAll('th').forEach(th => {
        th.classList.remove('active-sort-column');
        const icon = th.querySelector('i');
        if (icon) {
             icon.classList.add('fa-sort');
             icon.classList.remove('fa-arrow-up', 'fa-arrow-down');
        }
    });

    // Highlight the active sort column and update its icon
    const activeCol = document.querySelector(`th[data-sort="${defaultSortColumn}"]`);
    if(activeCol) {
        activeCol.classList.add('active-sort-column');
        const activeIcon = activeCol.querySelector('i');
        if (activeIcon) {
            activeIcon.classList.remove('fa-sort');
            activeIcon.classList.add(defaultSortDirection === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down');
        }
    }
    
    // 3. Render Rows
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

    // 1. Filter Dropdown Change
    filterSelect.addEventListener('change', (e) => {
        const view = e.target.value;
        if (view === 'transfers') {
            defaultSortColumn = 'transfers';
            defaultSortDirection = 'desc';
        } else if (view === 'value') {
            defaultSortColumn = 'tv';
            defaultSortDirection = 'desc';
        } else if (view === 'current') {
            defaultSortColumn = 'total-points';
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
            
            // Toggle sort direction
            if (defaultSortColumn === sortColumn) {
                defaultSortDirection = defaultSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                defaultSortColumn = sortColumn;
                // Default descending for points/rank/transfers/value, ascending for name
                if (sortColumn === 'manager' || sortColumn === 'team-name') {
                    defaultSortDirection = 'asc';
                } else {
                    defaultSortDirection = 'desc';
                }
            }

            // Re-render the table with new sort
            const currentView = filterSelect.value;
            renderAnalyzerTable(leagueData, currentView);
        });
    });
}


// -----------------------------------------
// Advanced Player Stats Centre (Top 20 Only)
// -----------------------------------------


/**
 * Fetches all player data and prepares the initial stats table view.
 */
async function loadAdvancedPlayerStats() {
    const tableBody = document.querySelector("#player-stats-table tbody");
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-message">Loading player stats...</td></tr>';

    try {
        // Fetch bootstrap data if not already done (for robustness)
        if (Object.keys(playerMap).length === 0) {
             const response = await fetch(
                proxy + "https://fantasy.premierleague.com/api/bootstrap-static/"
            );
            const data = await response.json();
            data.teams.forEach(team => { teamMap[team.id] = team.short_name; });
            data.elements.forEach(player => { playerMap[player.id] = `${player.first_name} ${player.second_name}`; });
            allPlayersData = data.elements;
        } else {
            // Re-fetching to ensure we have the latest static data
             const response = await fetch(
                proxy + "https://fantasy.premierleague.com/api/bootstrap-static/"
            );
            const data = await response.json();
            allPlayersData = data.elements;
        }
        
        // Enhance player data with readable keys for the table
        const enhancedPlayers = allPlayersData.map(p => ({
            id: p.id,
            name: `${p.first_name} ${p.second_name}`,
            team: teamMap[p.team] || 'N/A',
            pos: posMap[p.element_type] || 'N/A',
            price: (p.now_cost / 10).toFixed(1),
            // Metrics (using FPL API keys)
            TSB: p.total_points,      // Total Score/Points
            ICT: p.ict_index_rank,    // ICT Index Rank (lower is better rank) - FPL returns rank here
            PPM: (p.points_per_game / (p.now_cost / 10)).toFixed(2), // Simple Points Per Million approximation
            // Raw values for sorting
            sort_name: `${p.first_name} ${p.second_name}`,
            sort_team: teamMap[p.team] || 'N/A',
            sort_pos: p.element_type,
            sort_price: p.now_cost,
            sort_TSB: p.total_points,
            sort_ICT: parseFloat(p.ict_index), // Use the actual index value
            sort_PPM: parseFloat(p.points_per_game) / (p.now_cost / 10),
        }));

        allPlayersData = enhancedPlayers; // Store the processed data globally
        
        // Initial render (All positions, sorted by TSB/Total Points descending)
        applyFiltersAndRenderStats(allPlayersData, 'ALL');
        setupStatsCentreListeners();


    } catch (err) {
        console.error("Error loading Advanced Player Stats:", err);
        tableBody.innerHTML = '<tr><td colspan="7" class="error-message">❌ Failed to load player stats data.</td></tr>';
    }
}


/**
 * Filters and sorts the player data before calling the renderer.
 * **Limits the final displayed data to the top 20 players.**
 * * @param {object[]} data - The full player dataset.
 * @param {string} posFilter - The position filter ('ALL', 'GKP', 'DEF', 'MID', 'FWD').
 */
function applyFiltersAndRenderStats(data, posFilter) {
    let filteredData = data;
    const metricFilter = document.getElementById("metric-filter")?.value || 'TSB';

    // 1. Filter by Position
    if (posFilter !== 'ALL') {
        filteredData = data.filter(p => p.pos === posFilter);
    }
    
    // 2. Sort the data
    const sortKey = `sort_${currentSortColumnPlayer}`;
    const sortDirection = currentSortDirectionPlayer === 'asc' ? 1 : -1;

    const sortedData = [...filteredData].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        // Handle string sorting (Player Name, Team)
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDirection * valA.localeCompare(valB);
        }

        // Handle numeric sorting
        if (valA < valB) return sortDirection * -1;
        if (valA > valB) return sortDirection * 1;
        return 0; 
    });

    // 3. APPLY LIMITATION: Slice the sorted data to only include the top 20 players
    const top20Data = sortedData.slice(0, 20);

    // 4. Render the table
    renderPlayerStatsTable(top20Data, metricFilter);
}


/**
 * Renders the advanced player stats table and updates column visibility.
 * @param {object[]} players - The filtered and sorted player data (now max 20).
 * @param {string} activeMetric - The currently selected metric (TSB, ICT, PPM).
 */
function renderPlayerStatsTable(players, activeMetric) {
    const tableBody = document.querySelector("#player-stats-table tbody");
    const tableHeaders = document.querySelectorAll("#player-stats-table th[data-sort]");
    if (!tableBody) return;
    
    tableBody.innerHTML = ''; // Clear previous data

    if (players.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-data-message">No players match the current filters.</td></tr>';
        return;
    }

    // 1. Update Header Visuals (Active Sort)
    tableHeaders.forEach(th => {
        const dataSort = th.dataset.sort;
        const isCurrentSort = dataSort === currentSortColumnPlayer;
        
        // Reset classes
        th.classList.remove('active-sort-column', 'sort-asc', 'sort-desc');
        
        const icon = th.querySelector('i');
        if (icon) {
             icon.classList.add('fa-sort');
             icon.classList.remove('fa-arrow-up', 'fa-arrow-down');
        }

        // Set active sort class
        if (isCurrentSort) {
            th.classList.add('active-sort-column');
            th.classList.add(`sort-${currentSortDirectionPlayer}`);

            if (icon) {
                icon.classList.remove('fa-sort');
                icon.classList.add(currentSortDirectionPlayer === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down');
            }
        }
    });

    // 2. Render Rows
    players.forEach((player) => {
        const row = tableBody.insertRow();
        
        // Highlight top performers for the current metric
        if (activeMetric === 'TSB' && player.sort_TSB >= 100) row.classList.add('top-performer');
        
        row.innerHTML = `
            <td>${player.name}</td>
            <td>${player.team}</td>
            <td><span class="pos-badge pos-${player.pos}">${player.pos}</span></td>
            <td>£${player.price}m</td>
            <td data-metric="TSB">${player.TSB}</td>
            <td data-metric="ICT">${player.ICT}</td>
            <td data-metric="PPM">${player.PPM}</td>
        `;
    });
}


/**
 * Sets up event listeners for the player stats filters and table header sorting.
 */
function setupStatsCentreListeners() {
    const posFilter = document.getElementById("pos-filter");
    const metricFilter = document.getElementById("metric-filter");
    const table = document.getElementById("player-stats-table");

    if (!posFilter || !metricFilter || !table) return;

    // Avoid setting up multiple listeners
    if (posFilter.dataset.listenerSetup) return;
    posFilter.dataset.listenerSetup = true;

    // 1. Filter Change (Position or Metric)
    const filterChangeHandler = () => {
        const selectedPos = posFilter.value;
        const selectedMetric = metricFilter.value;
        
        // When metric changes, we should update the default sort column to match it
        currentSortColumnPlayer = selectedMetric;
        currentSortDirectionPlayer = 'desc'; // Default to descending for all metrics

        applyFiltersAndRenderStats(allPlayersData, selectedPos);
    };

    posFilter.addEventListener('change', filterChangeHandler);
    metricFilter.addEventListener('change', filterChangeHandler);


    // 2. Table Header Sorting
    table.querySelectorAll('th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const sortColumn = header.dataset.sort; 
            
            // Map the header name to the data key
            const newSortKey = sortColumn; 

            // Toggle sort direction
            if (currentSortColumnPlayer === newSortKey) {
                currentSortDirectionPlayer = currentSortDirectionPlayer === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumnPlayer = newSortKey;
                // Default descending for most stats, ascending for Price/Rank
                if (sortColumn === 'price' || sortColumn === 'ICT' || sortColumn === 'name' || sortColumn === 'team' || sortColumn === 'pos') {
                    currentSortDirectionPlayer = 'asc';
                } else {
                    currentSortDirectionPlayer = 'desc';
                }
            }

            // Re-render the table with new sort and current filters
            const selectedPos = posFilter.value;
            applyFiltersAndRenderStats(allPlayersData, selectedPos);
        });
    });
}


// -----------------------------------------
// NEW: Gameweek Wrapped / Review
// -----------------------------------------

/**
 * Loads and displays the summary data for the completed Gameweek (currentGameweekId - 1).
 */
async function loadGameweekWrapped() {
    const container = document.getElementById("gw-wrapped-content");
    if (!container) return;
    
    // Determine the completed Gameweek ID
    const completedGwId = currentGameweekId - 1; 

    if (completedGwId <= 0) {
        container.innerHTML = '<p class="no-data">Gameweek 1 has not finished yet! No review available.</p>';
        return;
    }

    container.innerHTML = `<p class="loading-message">Loading Review for Gameweek ${completedGwId}...</p>`;

    try {
        // 1. Fetch the Gameweek History/Status (This endpoint has overall GW stats)
        const statusResponse = await fetch(
            proxy + `https://fantasy.premierleague.com/api/event/${completedGwId}/status/`
        ).then(r => r.json());

        // 2. Fetch the Player Picks/Data for this GW
        const picksResponse = await fetch(
            proxy + `https://fantasy.premierleague.com/api/event/${completedGwId}/live/`
        ).then(r => r.json());
        
        // 3. Extract Key Stats from Status/Picks
        const eventStatus = statusResponse.status;
        const highestScoringEntry = eventStatus.find(s => s.type === 'hsc')?.entry;
        const highestScore = eventStatus.find(s => s.type === 'hsc')?.points;
        const averageScore = statusResponse.game.average_entry_score;
        const highestScorePlayerId = statusResponse.game.top_element;
        const highestScorePoints = statusResponse.game.top_element_info.points;

        // Find the most captained player using the current gameweek's selections from live data
        // NOTE: This approach is an approximation. FPL live data is player-centric.
        // We iterate through all players in the GW to find the one with the highest 'captained_by' count
        let mostCaptainedPlayer = null;
        let maxCaptainedCount = -1;

        picksResponse.elements.forEach(player => {
            if (player.stats.captained_by > maxCaptainedCount) {
                maxCaptainedCount = player.stats.captained_by;
                mostCaptainedPlayer = player.id;
            }
        });
        
        // Use maps to get names
        const topPlayerName = playerMap[highestScorePlayerId] || 'N/A';
        const topCaptainedName = playerMap[mostCaptainedPlayer] || 'N/A';
        
        // 4. Construct the HTML
        container.innerHTML = `
            <h3>Gameweek ${completedGwId} Summary</h3>
            <div class="gw-stats-grid">
                <div class="stat-card stat-average">
                    <p class="stat-label">Average Score</p>
                    <p class="stat-value">${averageScore}</p>
                </div>
                <div class="stat-card stat-high-score">
                    <p class="stat-label">Highest Score</p>
                    <p class="stat-value">${highestScore || 'N/A'}</p>
                    <p class="stat-detail">${highestScoringEntry ? `(Manager ID: ${highestScoringEntry})` : ''}</p>
                </div>
                <div class="stat-card stat-top-player">
                    <p class="stat-label">Top Player</p>
                    <p class="stat-value">${highestScorePoints} pts</p>
                    <p class="stat-detail">${topPlayerName}</p>
                </div>
                <div class="stat-card stat-captain">
                    <p class="stat-label"
