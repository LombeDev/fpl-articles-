/* -----------------------------------------
    GAMEWEEK WRAPPED (COMPLETED)
----------------------------------------- */
/**
 * Loads and displays the summary data for the completed Gameweek.
 */
async function loadGameweekWrapped() {
    const container = document.getElementById("gw-wrapped-content");
    if (!container) return;
    
    const completedGwId = currentGameweekId - 1; 

    if (completedGwId <= 0) {
        container.innerHTML = '<p class="no-data">Gameweek 1 has not finished yet! No review available.</p>';
        return;
    }

    container.innerHTML = `<p class="loading-message">Loading Review for Gameweek ${completedGwId}...</p>`;

    try {
        const response = await fetch(proxy + `https://fantasy.premierleague.com/api/event/${completedGwId}/live/`);
        const liveData = await response.json();
        
        // Note: FPL bootstrap-static actually contains the high-level event summary
        const bootstrapResponse = await fetch(proxy + "https://fantasy.premierleague.com/api/bootstrap-static/");
        const bootData = await bootstrapResponse.json();
        const eventInfo = bootData.events.find(e => e.id === completedGwId);

        const averageScore = eventInfo?.average_entry_score || 0;
        const highestScore = eventInfo?.highest_score || 0;
        const topPlayerId = eventInfo?.top_element;
        const topPlayerName = playerMap[topPlayerId] || "Unknown";

        // Finding most captained from live data (approximation)
        let mostCaptainedId = null;
        let maxCount = -1;
        liveData.elements.forEach(el => {
            if (el.stats.captain_points_total > maxCount) {
                maxCount = el.stats.captain_points_total;
                mostCaptainedId = el.id;
            }
        });

        container.innerHTML = `
            <h3>Gameweek ${completedGwId} Summary</h3>
            <div class="gw-stats-grid">
                <div class="stat-card">
                    <p class="stat-label">Average Score</p>
                    <p class="stat-value">${averageScore}</p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">Highest Score</p>
                    <p class="stat-value">${highestScore}</p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">Top Player</p>
                    <p class="stat-value">${topPlayerName}</p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">Most Captained</p>
                    <p class="stat-value">${playerMap[mostCaptainedId] || 'N/A'}</p>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Error loading Gameweek Wrapped:", err);
        container.innerHTML = '<p class="error-message">Failed to load Gameweek Review.</p>';
    }
}

/* -----------------------------------------
    MISSING HELPER FUNCTIONS
----------------------------------------- */

async function loadCurrentGameweekFixtures() {
    const list = document.getElementById("fixtures-list");
    if (!list) return;
    try {
        const res = await fetch(proxy + `https://fantasy.premierleague.com/api/fixtures/?event=${currentGameweekId}`);
        const fixtures = await res.json();
        list.innerHTML = fixtures.map(f => `
            <div class="fixture-item">
                <span>${teamMap[f.team_h]} vs ${teamMap[f.team_a]}</span>
                <strong>${f.kickoff_time ? new Date(f.kickoff_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBC'}</strong>
            </div>
        `).join('');
    } catch (e) { console.error("Fixtures load failed", e); }
}

function loadPriceChanges(data) {
    const container = document.getElementById("price-changes-list");
    if (!container) return;
    // Filter players with a cost_change_event != 0
    const risers = data.elements
        .filter(p => p.cost_change_event !== 0)
        .sort((a, b) => b.cost_change_event - a.cost_change_event)
        .slice(0, 5);
    
    container.innerHTML = risers.length ? risers.map(p => `
        <li>${p.web_name}: £${(p.now_cost/10).toFixed(1)} ${getChangeIconHtml(p.cost_change_event, true)}</li>
    `).join('') : "<li>No recent changes</li>";
}

function loadMostTransferred(data) {
    const el = document.getElementById("transfers-in-list");
    if (!el) return;
    const topIn = [...data.elements].sort((a, b) => b.transfers_in_event - a.transfers_in_event).slice(0, 5);
    el.innerHTML = topIn.map(p => `<li>${p.web_name} (+${p.transfers_in_event.toLocaleString()})</li>`).join('');
}

function loadMostTransferredOut(data) {
    const el = document.getElementById("transfers-out-list");
    if (!el) return;
    const topOut = [...data.elements].sort((a, b) => b.transfers_out_event - a.transfers_out_event).slice(0, 5);
    el.innerHTML = topOut.map(p => `<li>${p.web_name} (-${p.transfers_out_event.toLocaleString()})</li>`).join('');
}

function loadMostCaptained(data) {
    // Note: FPL bootstrap doesn't provide "Most Captained" directly, 
    // usually requires entry-level scraping or specialized endpoints. 
    // Using Selected By % as a proxy for this simple version.
    const el = document.getElementById("most-captained-list");
    if (!el) return;
    const popular = [...data.elements].sort((a, b) => b.selected_by_percent - a.selected_by_percent).slice(0, 5);
    el.innerHTML = popular.map(p => `<li>${p.web_name} (${p.selected_by_percent}%)</li>`).join('');
}

function loadPlayerStatusUpdates(data) {
    const el = document.getElementById("status-updates-list");
    if (!el) return;
    const flagged = data.elements.filter(p => p.news).slice(0, 5);
    el.innerHTML = flagged.map(p => `<li><strong>${p.web_name}:</strong> ${p.news}</li>`).join('');
}

function loadSimpleEPLTable(data) {
    const el = document.getElementById("epl-table-body");
    if (!el) return;
    const sortedTeams = [...data.teams].sort((a, b) => a.position - b.position);
    el.innerHTML = sortedTeams.map(t => `
        <tr>
            <td>${t.position}</td>
            <td>${t.name}</td>
            <td>${t.played}</td>
            <td><strong>${t.points}</strong></td>
        </tr>
    `).join('');
}
