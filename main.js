document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------
    // 1. Data Simulation (Replace with API calls later)
    // ---------------------------------------------

    const simulatedData = {
        currentGameweek: 18,
        deadlineTime: new Date('2025-12-20T11:00:00Z'), // Example deadline: Dec 20, 2025, 11:00 AM UTC
        mostCaptain: 'Erling Haaland (MCI)',
        transfersIn: [
            { name: 'Cole Palmer', team: 'CHE', count: '150k' },
            { name: 'Dominic Solanke', team: 'BOU', count: '120k' },
            { name: 'Phil Foden', team: 'MCI', count: '85k' }
        ],
        transfersOut: [
            { name: 'Trent Alexander-Arnold', team: 'LIV', count: '130k' },
            { name: 'Kieran Trippier', team: 'NEW', count: '90k' },
            { name: 'Gabriel Martinelli', team: 'ARS', count: '75k' }
        ],
        injuries: [
            { name: 'Reece James', team: 'CHE', status: 'Hamstring Injury', return: 'Expected Feb 2026' },
            { name: 'Sven Botman', team: 'NEW', status: 'Knee Injury', return: '75% Chance of Playing' },
            { name: 'Kevin De Bruyne', team: 'MCI', status: 'Long-term Injury', return: 'Expected March 2026' },
            { name: 'Gabriel', team: 'ARS', status: 'Illness', return: 'Late Fitness Test' }
        ],
        newsArticles: [
            { title: 'Scout Picks: Who to Captain for Double Gameweek 18?', summary: 'Our panel picks the best 15 players for the upcoming round of fixtures.' },
            { title: 'The Differential Defenders You Need to Consider Now', summary: 'Low-owned options that could provide a massive boost to your rank.' },
            { title: 'FPL General: My Team Selection & Transfer Plans (GW18)', summary: 'The G.O.A.T. reveals his latest moves and thoughts on the captaincy.' }
        ],
        fplGeneralLeague: {
            rank: 1,
            manager: "FPL General",
            points: 1254
        }
    };

    // ---------------------------------------------
    // 2. Deadline Countdown Timer
    // ---------------------------------------------

    const deadlineElement = document.getElementById('countdown-timer');
    const deadlineDate = simulatedData.deadlineTime;

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = deadlineDate - now;

        // Calculate time
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result
        if (distance < 0) {
            clearInterval(timerInterval);
            deadlineElement.innerHTML = "DEADLINE PASSED!";
        } else {
            deadlineElement.innerHTML = `${hours}h ${minutes}m ${seconds}s`;
        }
    }

    const timerInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Run immediately to avoid initial delay

    // ---------------------------------------------
    // 3. Populate Dynamic Content
    // ---------------------------------------------

    // Update Gameweek and Captain
    document.getElementById('current-gw').textContent = simulatedData.currentGameweek;
    document.getElementById('most-captained').textContent = `${simulatedData.mostCaptain}`;
    
    // Update Transfer Headings
    document.querySelector('.transfer-card h3').textContent = `Most Transferred In (GW ${simulatedData.currentGameweek})`;
    document.querySelector('.data-flex .transfer-card:nth-child(2) h3').textContent = `Most Transferred Out (GW ${simulatedData.currentGameweek})`;

    // Function to render a list of players (Transfers)
    const renderPlayerList = (players, listId, isTransferIn) => {
        const listEl = document.getElementById(listId);
        listEl.innerHTML = ''; // Clear existing content
        players.forEach(player => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span class="player-name">${player.name} (${player.team})</span>
                <span class="transfer-count" style="color: ${isTransferIn ? 'var(--primary-color)' : '#ff4d4d'};">
                    ${isTransferIn ? '+' : '-'} ${player.count}
                </span>
            `;
            listEl.appendChild(listItem);
        });
    };

    // Render Transfer Data
    renderPlayerList(simulatedData.transfersIn, 'transferred-in-list', true);
    renderPlayerList(simulatedData.transfersOut, 'transferred-out-list', false);

    // Render Injuries
    const injuryListEl = document.querySelector('.injury-list');
    injuryListEl.innerHTML = '';
    simulatedData.injuries.forEach(player => {
        const card = document.createElement('div');
        card.className = 'injury-card card';
        card.innerHTML = `
            <i class="fa-solid fa-bed-pulse"></i>
            <div class="injury-info">
                <h4>${player.name} (${player.team})</h4>
                <p><strong>Status:</strong> ${player.status}</p>
                <p><strong>Return:</strong> ${player.return}</p>
            </div>
        `;
        injuryListEl.appendChild(card);
    });

    // Render News Articles
    const newsGridEl = document.querySelector('.news-grid');
    newsGridEl.innerHTML = '';
    simulatedData.newsArticles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'news-card card';
        card.innerHTML = `
            <h4>${article.title}</h4>
            <p>${article.summary}</p>
        `;
        newsGridEl.appendChild(card);
    });

    // FPL General League/Scores Summary
    const scoresSummaryEl = document.getElementById('gw-scores-summary');
    scoresSummaryEl.innerHTML = `
        <p><strong>FPL General League:</strong></p>
        <p>Rank: <span class="transfer-count">${simulatedData.fplGeneralLeague.rank}</span></p>
        <p>GW ${simulatedData.currentGameweek} Avg Score: <strong>72</strong></p>
        <button onclick="alert('Viewing full league table for FPL General League!')">View Full League</button>
    `;

    // Global function for league view (used in the button above)
    window.viewLeague = () => {
        alert('Navigating to the Full League Standings Page!');
    };
});
