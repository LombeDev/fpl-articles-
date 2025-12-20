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

// --- Mini-League Analyzer Globals ---
const LEAGUE_ID = "101712"; // The target league ID
let leagueData = [];        // Global store for the detailed league data
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
            loadGameweekWrapped(),     // <-- NEW: Gameweek Wrapped is now loaded
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


/* -----------------------------------------
    UPDATED DEADLINE COUNTDOWN LOGIC
----------------------------------------- */

/**
 * Updates the countdown timer display every second.
 * Ensures a consistent 00d 00h 00m 00s format.
 * @param {HTMLElement} countdownEl - The element to display the countdown in.
 */
function updateCountdown(countdownEl) {
    if (!nextDeadlineDate) {
        clearInterval(countdownInterval);
        return;
    }
    
    const now = new Date().getTime();
    const distance = nextDeadlineDate.getTime() - now;

    // If the deadline has passed
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

    // Helper to add leading zeros (e.g., 5 becomes 05)
    const pad = (num) => String(num).padStart(2, '0');

    // Format the output: "00d 00h 00m 00s"
    // We show Days only if there is at least 1 day remaining
    if (days > 0) {
        countdownEl.textContent = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    } else {
        // If less than a day, show just hours, mins, and secs
        countdownEl.textContent = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
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
            TSB: p.total_points,      // Total Score/Points
            ICT: p.ict_index_rank,    // ICT Index Rank (lower is better rank) - FPL returns rank here
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
                    <p class="stat-label">Most Captained Player</p>
                    <p class="stat-value">${maxCaptainedCount.toLocaleString()}</p>
                    <p class="stat-detail">${topCaptainedName}</p>
                </div>
            </div>
            <p class="note">* Data is based on FPL global stats for the completed Gameweek.</p>
        `;

    } catch (err) {
        console.error("Error loading Gameweek Wrapped:", err);
        container.innerHTML = '<p class="error-message">❌ Failed to load Gameweek Review data.</p>';
    }
}


// 🌍 GENERAL LEAGUE STANDINGS (Placeholder/Skipped)
async function loadGeneralLeagueStandings() {
    // NOTE: This feature has been skipped, focusing on the main analyzer instead.
}


// 🚑 INJURY & SUSPENSION LIST
/**
 * Loads and displays player status updates (Injured, Doubtful, Suspended)
 */
async function loadPlayerStatusUpdates(data) {
    const container = document.getElementById("injury-list"); 
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
    const container = document.getElementById("live-scores").querySelector('.scores-grid'); 
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
 * @param {object} data - The full data object from FPL bootstrap-static.
 */
async function loadSimpleEPLTable(data) {
    const container = document.getElementById("fpl").querySelector('.fpl-grid'); 
    if (!container || !data || !data.teams) return;

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

// Placeholder function used in HTML sidebar
function viewLeague() {
    // For now, trigger scroll to the league analyzer section
    const analyzerSection = document.getElementById('mini-league-analyzer');
    if (analyzerSection) {
        analyzerSection.scrollIntoView({ behavior: 'smooth' });
    }
}


// -----------------------------------------
// REFINED: FDR Heatmap Ticker
// -----------------------------------------

async function loadFDRTicker() {
    const container = document.getElementById("fdr-ticker-container");
    if (!container) return;

    container.innerHTML = '<p class="loading-message">Generating Fixture Heatmap...</p>';

    try {
        const [fixtures, bootstrap] = await Promise.all([
            fetch(proxy + "https://fantasy.premierleague.com/api/fixtures/").then(r => r.json()),
            fetch(proxy + "https://fantasy.premierleague.com/api/bootstrap-static/").then(r => r.json())
        ]);

        const teams = bootstrap.teams;
        const currentGW = bootstrap.events.find(e => e.is_current)?.id || 1;
        const next5GWs = [currentGW, currentGW + 1, currentGW + 2, currentGW + 3, currentGW + 4];

        let tableHtml = `
            <table class="fdr-heatmap">
                <thead>
                    <tr>
                        <th class="fdr-team-col">Team</th>
                        ${next5GWs.map(gw => `<th>GW${gw}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        // Sort teams alphabetically
        teams.sort((a, b) => a.name.localeCompare(b.name)).forEach(team => {
            tableHtml += `<tr><td class="fdr-team-name">${team.short_name}</td>`;

            next5GWs.forEach(gw => {
                const fixture = fixtures.find(f => f.event === gw && (f.team_h === team.id || f.team_a === team.id));
                
                if (fixture) {
                    const isHome = fixture.team_h === team.id;
                    const opponentId = isHome ? fixture.team_a : fixture.team_h;
                    const opponent = teamMap[opponentId] || "???";
                    const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
                    
                    // Logic: Uppercase for Home, Lowercase for Away
                    const displayOpponent = isHome ? opponent.toUpperCase() : opponent.toLowerCase();

                    tableHtml += `
                        <td class="fdr-cell fdr-bg-${difficulty}">
                            ${displayOpponent}
                        </td>
                    `;
                } else {
                    tableHtml += `<td class="fdr-cell fdr-bg-blank">---</td>`;
                }
            });

            tableHtml += `</tr>`;
        });

        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

    } catch (err) {
        console.error("FDR Heatmap Error:", err);
        container.innerHTML = '<p class="error-message">❌ Failed to load FDR Heatmap.</p>';
    }
}


function loadInjuryList(players, teams) {
    const container = document.querySelector(".injury-list");
    
    // Quick team lookup map
    const teamMap = {};
    teams.forEach(t => teamMap[t.id] = t.name);

    // 1. Filter specifically for Doubtful (d), Injured (i), and Suspended (s)
    const flaggedPlayers = players.filter(p => ['d', 'i', 's'].includes(p.status));

    if (flaggedPlayers.length === 0) {
        container.innerHTML = "<p>No active injuries or suspensions found.</p>";
        return;
    }

    // 2. Generate HTML with Status-Specific Labels
    container.innerHTML = flaggedPlayers.map(p => {
        let statusLabel = "";
        let statusClass = "";

        // Apply your specific mapping
        if (p.status === 'd') {
            statusLabel = "DOUBTFUL";
            statusClass = "injury-doubtful"; // Yellow/Orange
        } else if (p.status === 'i') {
            statusLabel = "INJURED";
            statusClass = "injury-out";      // Red
        } else if (p.status === 's') {
            statusLabel = "SUSPENDED";
            statusClass = "injury-suspended"; // Black/Grey
        }

        return `
            <div class="injury-card ${statusClass}">
                <div class="injury-header">
                    <span class="status-badge">${statusLabel}</span>
                    <span class="team-tag">${teamMap[p.team]}</span>
                </div>
                <h4 class="player-name">${p.web_name}</h4>
                <p class="injury-news">${p.news}</p>
                ${p.status === 'd' ? `<div class="chance-tag">${p.chance_of_playing_next_round}% chance of playing</div>` : ''}
            </div>
        `;
    }).join('');
}
