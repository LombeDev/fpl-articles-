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


    document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------
    // 1. Simulated Data (REPLACE THIS WITH API CALLS LATER)
    // ---------------------------------------------

    const simulatedData = {
        currentGameweek: 18,
        deadlineTime: new Date('2025-12-20T11:00:00Z'), // Example deadline: Dec 20, 2025, 11:00 AM UTC
        mostCaptain: 'Erling Haaland (MCI) - 165%',
        
        // FPL Data Snapshot
        fplSnapshot: [
            { label: 'GW Avg Score', value: 58, unit: 'pts', color: '#ffc400' },
            { label: 'Total Transfers', value: 2.1, unit: 'M', color: 'var(--primary-color)' },
            { label: 'Highest Score', value: 125, unit: 'pts', color: 'var(--secondary-color)' },
            { label: 'Most Sold', value: 'Trippier', unit: 'DEF', color: '#ff4d4d' },
        ],

        // Transfers Data (used for sidebar and price tracker)
        transfersIn: [
            { name: 'Cole Palmer', team: 'CHE', count: '150k' },
            { name: 'Dominic Solanke', team: 'BOU', count: '120k' },
            { name: 'Phil Foden', team: 'MCI', count: '85k' },
            { name: 'Bukayo Saka', team: 'ARS', count: '75k' },
            { name: 'Virgil van Dijk', team: 'LIV', count: '60k' }
        ],
        transfersOut: [
            { name: 'Kieran Trippier', team: 'NEW', count: '130k' },
            { name: 'Trent Alexander-Arnold', team: 'LIV', count: '90k' },
            { name: 'Gabriel Martinelli', team: 'ARS', count: '75k' },
            { name: 'Marcus Rashford', team: 'MUN', count: '60k' },
            { name: 'Raheem Sterling', team: 'CHE', count: '55k' }
        ],
        
        // Price Change Data
        priceChanges: {
            rising: [
                { name: 'Ollie Watkins', team: 'AVL', price: '8.6' },
                { name: 'Jeremy Doku', team: 'MCI', price: '6.5' },
                { name: 'Pape Matar Sarr', team: 'TOT', price: '4.5' },
                { name: 'Dominic Solanke', team: 'BOU', price: '6.7' },
                { name: 'Pascal Gross', team: 'BHA', price: '6.3' },
                { name: 'Gabriel', team: 'ARS', price: '5.0' },
                { name: 'Alfie Doughty', team: 'LUT', price: '4.5' },
                { name: 'Matty Cash', team: 'AVL', price: '4.8' },
                { name: 'Son Heung-min', team: 'TOT', price: '9.8' },
                { name: 'Anthony Elanga', team: 'NOT', price: '5.1' },
            ],
            falling: [
                { name: 'Kieran Trippier', team: 'NEW', price: '6.8' },
                { name: 'Marcus Rashford', team: 'MUN', price: '8.3' },
                { name: 'Gabriel Martinelli', team: 'ARS', price: '7.7' },
                { name: 'Pedro Porro', team: 'TOT', price: '5.1' },
                { name: 'Raheem Sterling', team: 'CHE', price: '7.0' },
                { name: 'Phil Foden', team: 'MCI', price: '8.1' },
            ]
        },

        // Gameweek Wrapped Data
        gwWrapped: [
            { name: 'GW Average Score', value: 58, unit: 'pts', color: 'var(--primary-color)' },
            { name: 'Highest Score', value: 125, unit: 'pts', color: '#03f6f4' },
            { name: 'Bench Points Lost', value: 15, unit: 'pts', color: '#ff4d4d' },
            { name: 'Most Captained (EO)', value: 'Haaland (160%)', unit: 'EO', color: 'var(--primary-color)' },
            { name: 'Most Transfered In', value: 'Palmer', unit: 'Player', color: '#ffc400' },
        ],

        // Live Scores Data
        liveScores: [
            { home: 'ARS', away: 'CHE', score: '1 - 0', minute: '65', status: 'live' },
            { home: 'MCI', away: 'LIV', score: '2 - 2', minute: 'HT', status: 'half-time' },
            { home: 'NEW', away: 'TOT', score: '3 - 1', minute: 'FT', status: 'ft' },
            { home: 'BOU', away: 'EVE', score: '0 - 0', minute: 'Upcoming (15:00)', status: 'upcoming' },
        ],

        // Fixture Difficulty Rating (FDR) Data
        fdrData: [
            { team: 'Man City', fixtures: [{ opp: 'EVE', diff: 2 }, { opp: 'ARS', diff: 4 }, { opp: 'BOU', diff: 1 }, { opp: 'AVL', diff: 3 }, { opp: 'MUN', diff: 4 }] },
            { team: 'Arsenal', fixtures: [{ opp: 'WHU', diff: 3 }, { opp: 'MCI', diff: 4 }, { opp: 'LIV', diff: 5 }, { opp: 'CRY', diff: 2 }, { opp: 'CHE', diff: 3 }] },
            { team: 'Bournemouth', fixtures: [{ opp: 'LIV', diff: 5 }, { opp: 'LUT', diff: 1 }, { opp: 'MCI', diff: 1 }, { opp: 'WHU', diff: 2 }, { opp: 'NEW', diff: 3 }] },
            { team: 'Liverpool', fixtures: [{ opp: 'BOU', diff: 1 }, { opp: 'BUR', diff: 1 }, { opp: 'ARS', diff: 5 }, { opp: 'TOT', diff: 4 }, { opp: 'FUL', diff: 2 }] },
        ],

        // Player Stats Data
        playerStats: [
            { name: 'Erling Haaland', team: 'MCI', pos: 'FWD', price: 14.0, TSB: 180, ICT: 150.5, PPM: 12.8 },
            { name: 'Mohamed Salah', team: 'LIV', pos: 'MID', price: 13.0, TSB: 170, ICT: 145.2, PPM: 13.1 },
            { name: 'Julian Alvarez', team: 'MCI', pos: 'FWD', price: 6.8, TSB: 105, ICT: 105.1, PPM: 15.4 },
            { name: 'Trent Alexander-Arnold', team: 'LIV', pos: 'DEF', price: 8.5, TSB: 85, ICT: 90.0, PPM: 10.0 },
            { name: 'Alphonse Areola', team: 'WHU', pos: 'GKP', price: 4.2, TSB: 70, ICT: 65.5, PPM: 16.7 },
        ],

        // League Analyzer Data
        leagueData: [
            { rank: 1, manager: 'Manager X', teamName: 'Title Winners', gwPoints: 95, totalPoints: 1250, transfers: 0, tv: 104.5, orank: '12k', rankChange: 'up', teamID: 1 },
            { rank: 2, manager: 'FPL General', teamName: 'General\'s Army', gwPoints: 72, totalPoints: 1245, transfers: 3, tv: 105.0, orank: '15k', rankChange: 'up', teamID: 2 },
            { rank: 3, manager: 'You (My Team)', teamName: 'Fantasy Hub', gwPoints: 75, totalPoints: 1240, transfers: 1, tv: 103.8, orank: '20k', rankChange: 'same', teamID: 3 }, // <- Your team
            { rank: 4, manager: 'Rival A', teamName: '40 Point Hits', gwPoints: 50, totalPoints: 1230, transfers: 4, tv: 102.5, orank: '30k', rankChange: 'down', teamID: 4 },
            { rank: 5, manager: 'Rival B', teamName: 'Wildcard FC', gwPoints: 90, totalPoints: 1225, transfers: 0, tv: 104.1, orank: '35k', rankChange: 'up', teamID: 5 },
            { rank: 6, manager: 'Rival C', teamName: 'Bench Boosters', gwPoints: 60, totalPoints: 1210, transfers: 2, tv: 103.0, orank: '50k', rankChange: 'down', teamID: 6 },
        ],
    };

    // ---------------------------------------------
    // 2. Deadline Countdown Timer
    // ---------------------------------------------

    const deadlineElement = document.getElementById('countdown-timer');
    const deadlineDate = simulatedData.deadlineTime;

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = deadlineDate - now;

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (distance < 0) {
            clearInterval(timerInterval);
            deadlineElement.innerHTML = "DEADLINE PASSED!";
        } else {
            deadlineElement.innerHTML = `${hours}h ${minutes}m ${seconds}s`;
        }
    }

    const timerInterval = setInterval(updateCountdown, 1000);
    updateCountdown();

    // ---------------------------------------------
    // 3. Initial Static Content Population
    // ---------------------------------------------

    // Sidebar & GW Wrapped Header
    document.getElementById('current-gw').textContent = simulatedData.currentGameweek;
    document.getElementById('most-captained').textContent = simulatedData.mostCaptain;
    document.getElementById('gw-wrapped-num').textContent = simulatedData.currentGameweek - 1;
    document.getElementById('current-gw-fpl-data').textContent = simulatedData.currentGameweek;

    // ---------------------------------------------
    // 4. Feature Rendering Functions
    // ---------------------------------------------

    // --- RENDER SIDEBAR TRANSFERS ---
    const renderSidebarTransfers = () => {
        const sidebarList = document.getElementById('sidebar-transfers-list');
        sidebarList.innerHTML = '';
        
        const topIn = simulatedData.transfersIn.slice(0, 2);
        const topOut = simulatedData.transfersOut.slice(0, 2);
        
        [...topIn, ...topOut].forEach((player, index) => {
            const isTransferIn = index < topIn.length;
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span class="player-name">
                    <i class="fa-solid fa-arrow-${isTransferIn ? 'up' : 'down'}" 
                       style="color: ${isTransferIn ? 'var(--primary-color)' : '#ff4d4d'}; margin-right: 5px;"></i>
                    ${player.name} (${player.team})
                </span>
                <span class="transfer-count" style="color: ${isTransferIn ? 'var(--primary-color)' : '#ff4d4d'};">
                    ${isTransferIn ? '+' : '-'} ${player.count}
                </span>
            `;
            sidebarList.appendChild(listItem);
        });
    };

    // --- RENDER FPL SNAPSHOT DATA ---
    const renderFPLSnapshot = () => {
        const fplGrid = document.querySelector('#fpl .fpl-grid');
        fplGrid.innerHTML = '';

        simulatedData.fplSnapshot.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.borderTopColor = item.color;
            card.innerHTML = `
                <div class="fpl-value" style="color: ${item.color}">${item.value}</div>
                <div class="fpl-label">${item.label} (${item.unit})</div>
            `;
            fplGrid.appendChild(card);
        });
    };

    // --- RENDER PRICE CHANGE TRACKER ---
    const renderPriceChanges = () => {
        const renderTable = (list, tableId) => {
            const tbody = document.querySelector(`#${tableId} tbody`);
            tbody.innerHTML = '';
            list.slice(0, 10).forEach(player => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${player.name}</td>
                    <td>${player.team}</td>
                    <td class="${tableId.includes('rising') ? 'rise' : 'fall'}">£${player.price}</td>
                `;
                tbody.appendChild(row);
            });
        };

        renderTable(simulatedData.priceChanges.rising, 'rising-table');
        renderTable(simulatedData.priceChanges.falling, 'falling-table');
    };

    // --- RENDER GW WRAPPED ---
    const renderGwWrapped = () => {
        const wrappedGrid = document.querySelector('.wrapped-grid');
        wrappedGrid.innerHTML = '';

        simulatedData.gwWrapped.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'wrapped-card';
            card.style.borderTopColor = stat.color;

            card.innerHTML = `
                <h4>${stat.name}</h4>
                <div class="wrapped-value" style="color: ${stat.color};">${stat.value}</div>
                <div class="wrapped-stat-name">${stat.unit}</div>
            `;
            wrappedGrid.appendChild(card);
        });
    };

    // --- RENDER LIVE SCORES ---
    const renderLiveScores = () => {
        const scoresGrid = document.querySelector('.scores-grid');
        scoresGrid.innerHTML = ''; 

        simulatedData.liveScores.forEach(match => {
            const card = document.createElement('div');
            card.className = 'match-card';

            let statusClass = '';
            let statusText = '';

            if (match.status === 'live') {
                statusClass = 'live';
                statusText = `${match.minute}'`;
            } else if (match.status === 'half-time') {
                statusClass = 'live';
                statusText = 'Half Time';
            } else if (match.status === 'ft') {
                statusClass = 'ft';
                statusText = 'Full Time';
            } else {
                statusText = match.minute;
            }
            
            const [homeScore, awayScore] = match.score.split(' - ');

            card.innerHTML = `
                <div class="match-header">
                    <span>Premier League</span>
                    <span class="match-status ${statusClass}">${statusText}</span>
                </div>
                <div class="match-teams">
                    <span class="team-name">${match.home}</span>
                    <span class="team-score">${homeScore.trim()}</span>
                </div>
                <div class="match-teams">
                    <span class="team-name">${match.away}</span>
                    <span class="team-score">${awayScore.trim()}</span>
                </div>
            `;
            scoresGrid.appendChild(card);
        });
    };

    // --- RENDER FDR TICKET ---
    const renderFDR = () => {
        const fdrContainer = document.querySelector('#fdr-ticker .fdr-grid');
        fdrContainer.innerHTML = ''; 

        // Add team rows
        simulatedData.fdrData.forEach(teamData => {
            const card = document.createElement('div');
            card.className = 'fdr-team-card';
            
            let fixturesHTML = '';
            teamData.fixtures.forEach((fixture, index) => {
                fixturesHTML += `
                    <div>
                        <span>GW ${simulatedData.currentGameweek + index} vs ${fixture.opp}</span>
                        <span class="fdr-badge fdr-${fixture.diff}">${fixture.diff}</span>
                    </div>
                `;
            });

            card.innerHTML = `
                <h3>${teamData.team}</h3>
                <div class="fdr-fixtures">${fixturesHTML}</div>
            `;
            fdrContainer.appendChild(card);
        });
    };

    // --- RENDER NEWS (Simplified Placeholder) ---
    const renderNews = () => {
        const newsGrid = document.querySelector('#news .news-grid');
        newsGrid.innerHTML = '';
        
        for (let i = 0; i < 6; i++) {
             const card = document.createElement('div');
            card.className = 'card news-card';
            card.style.borderLeftColor = ['#ffc400', 'var(--secondary-color)', 'var(--primary-color)'][i % 3];
            card.innerHTML = `
                <h3>Article Title ${i + 1}</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            `;
            newsGrid.appendChild(card);
        }
    };
    
    // --- RENDER INJURIES (Simplified Placeholder) ---
    const renderInjuries = () => {
        const injuryList = document.querySelector('#injury .injury-list');
        injuryList.innerHTML = '';
        
        const injuryData = [
            { name: 'R. James', team: 'CHE', status: 'Injured', type: 'injured' },
            { name: 'K. Trippier', team: 'NEW', status: 'Doubtful (75%)', type: 'doubt' },
            { name: 'B. White', team: 'ARS', status: 'Suspended', type: 'suspended' },
            { name: 'E. Haaland', team: 'MCI', status: 'Fit', type: 'fit' }
        ];

        injuryData.forEach(player => {
            const card = document.createElement('div');
            card.className = `card injury-card ${player.type}`;
            card.innerHTML = `
                <h4>${player.name} (${player.team}) <span class="status-badge ${player.type}">${player.status}</span></h4>
            `;
            injuryList.appendChild(card);
        });
    };


    // ---------------------------------------------
    // 5. Interactive Table Logic (Sorting & Filtering)
    // ---------------------------------------------
    
    // --- PLAYER STATS TABLE LOGIC ---
    let currentPlayerSort = { key: 'ICT', direction: 'desc' }; // Default sort

    const renderPlayerStats = (data, sortKey = currentPlayerSort.key, sortDirection = currentPlayerSort.direction) => {
        const tbody = document.querySelector('#player-stats-table tbody');
        tbody.innerHTML = '';

        // Filtering Logic
        const posFilter = document.getElementById('pos-filter').value;
        const metricFilter = document.getElementById('metric-filter').value;
        
        let filteredData = data.filter(player => {
            return posFilter === 'ALL' || player.pos === posFilter;
        });

        // Sorting Logic
        filteredData.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            let comparison = 0;
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
            
            return sortDirection === 'asc' ? comparison : comparison * -1;
        });

        // Render Rows
        filteredData.forEach(player => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.team}</td>
                <td>${player.pos}</td>
                <td>${player.price.toFixed(1)}</td>
                <td>${player.TSB}</td>
                <td>${player.ICT.toFixed(1)}</td>
                <td>${player.PPM.toFixed(1)}</td>
            `;
            tbody.appendChild(row);
        });
    };
    
    // Player Table Event Listeners
    document.querySelectorAll('#player-stats-table th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const newSortKey = header.getAttribute('data-sort');
            
            if (currentPlayerSort.key === newSortKey) {
                currentPlayerSort.direction = currentPlayerSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentPlayerSort.key = newSortKey;
                currentPlayerSort.direction = 'desc'; 
            }

            document.querySelectorAll('#player-stats-table th i').forEach(icon => {
                icon.className = 'fa-solid fa-sort'; 
            });
            const currentIcon = header.querySelector('i');
            currentIcon.className = `fa-solid fa-sort-${currentPlayerSort.direction}`;

            renderPlayerStats(simulatedData.playerStats);
        });
    });

    document.getElementById('pos-filter').addEventListener('change', () => renderPlayerStats(simulatedData.playerStats));
    document.getElementById('metric-filter').addEventListener('change', () => renderPlayerStats(simulatedData.playerStats));
    

    // --- LEAGUE ANALYZER LOGIC ---
    let currentAnalyzerSort = { key: 'rank', direction: 'asc' };

    const renderLeagueAnalyzer = (data, sortKey = currentAnalyzerSort.key, sortDirection = currentAnalyzerSort.direction) => {
        const tbody = document.querySelector('#league-analyzer-table tbody');
        const headers = document.querySelectorAll('#league-analyzer-table th');
        tbody.innerHTML = '';
        
        document.getElementById('analyzer-gw').textContent = simulatedData.currentGameweek;
        let filteredData = [...data];

        filteredData.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            let comparison = 0;
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
            
            return sortDirection === 'asc' ? comparison : comparison * -1;
        });

        filteredData.forEach(team => {
            const row = document.createElement('tr');
            if (team.manager.includes('You')) {
                row.classList.add('my-team-row');
            }

            let rankMovementHTML = '';
            let rankIconClass = 'fa-solid ';
            if (team.rankChange === 'up') {
                rankIconClass += 'fa-chevron-up rank-up';
            } else if (team.rankChange === 'down') {
                rankIconClass += 'fa-chevron-down rank-down';
            } else {
                rankIconClass += 'fa-circle rank-same';
            }
            rankMovementHTML = `<span class="rank-movement"><i class="${rankIconClass}"></i></span>`;

            row.innerHTML = `
                <td>${team.rank}${rankMovementHTML}</td>
                <td>${team.manager}</td>
                <td>${team.teamName}</td>
                <td>${team.gwPoints}</td>
                <td>${team.totalPoints}</td>
                <td>${team.transfers}</td>
                <td>£${team.tv.toFixed(1)}</td>
                <td>${team.orank}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Apply filter to hide columns
        const view = document.getElementById('analyzer-view-filter').value;
        const columnDisplay = ['table-cell', 'table-cell', 'table-cell', 'table-cell', 'table-cell', 'table-cell', 'table-cell', 'table-cell']; // Default all shown

        if (view === 'transfers') {
            columnDisplay[4] = 'none'; // Total Pts
            columnDisplay[6] = 'none'; // Team Value
            columnDisplay[7] = 'none'; // O-Rank
        } else if (view === 'value') {
            columnDisplay[5] = 'none'; // Transfers
            columnDisplay[7] = 'none'; // O-Rank
        } 
        
        document.querySelectorAll('#league-analyzer-table th, #league-analyzer-table td').forEach((cell, index) => {
            const columnIndex = index % headers.length;
            cell.style.display = columnDisplay[columnIndex];
        });
    };

    // League Table Event Listeners
    document.querySelectorAll('#league-analyzer-table th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const newSortKey = header.getAttribute('data-sort');
            
            if (currentAnalyzerSort.key === newSortKey) {
                currentAnalyzerSort.direction = currentAnalyzerSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentAnalyzerSort.key = newSortKey;
                currentAnalyzerSort.direction = 'desc'; 
            }

            document.querySelectorAll('#league-analyzer-table th i').forEach(icon => {
                icon.className = 'fa-solid fa-sort'; 
            });
            const currentIcon = header.querySelector('i');
            currentIcon.className = `fa-solid fa-sort-${currentAnalyzerSort.direction}`;

            renderLeagueAnalyzer(simulatedData.leagueData);
        });
    });

    document.getElementById('analyzer-view-filter').addEventListener('change', () => renderLeagueAnalyzer(simulatedData.leagueData));

    document.getElementById('update-analyzer-btn').addEventListener('click', () => {
        alert('Fetching latest mini-league data... (Data refreshed in prototype)');
        renderLeagueAnalyzer(simulatedData.leagueData);
    });

    // Global function used by the sidebar button
    window.viewLeague = () => {
        alert('Navigating to the Full League Standings Page!');
    };


    // ---------------------------------------------
    // 6. Execute All Render Functions
    // ---------------------------------------------
    renderSidebarTransfers();
    renderFPLSnapshot();
    renderPriceChanges();
    renderGwWrapped();
    renderLiveScores();
    renderFDR();
    renderNews(); 
    renderInjuries();
    renderPlayerStats(simulatedData.playerStats); // Initial render for stats table
    renderLeagueAnalyzer(simulatedData.leagueData); // Initial render for league table

});

    // Global function for league view (used in the button above)
    window.viewLeague = () => {
        alert('Navigating to the Full League Standings Page!');
    };
});
