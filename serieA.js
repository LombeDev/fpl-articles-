// 1. Mobile Menu Toggle
const menuToggle = document.getElementById('mobile-menu');
const mainNav = document.getElementById('main-nav');

menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('active');
});

// 2. API Configuration
const PROXY_URL = '/api/competitions/SA/'; 

async function init() {
    const loader = document.getElementById('loader');
    loader.style.display = 'block';
    
    try {
        const [standingsRes, scorersRes, fixturesRes] = await Promise.all([
            fetch(`${PROXY_URL}standings`),
            fetch(`${PROXY_URL}scorers`),
            getFixtures()
        ]);

        const sData = await standingsRes.json();
        const scData = await scorersRes.json();
        const fData = await fixturesRes.json();

        if (sData.standings) renderStandings(sData.standings[0].table);
        if (scData.scorers) renderScorers(scData.scorers);
        if (fData.matches) renderFixtures(fData.matches);

    } catch (err) {
        console.error("Dashboard Sync Error:", err);
    } finally {
        loader.style.display = 'none';
    }
}

async function getFixtures() {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 10);
    return fetch(`${PROXY_URL}matches?dateFrom=${today}&dateTo=${nextWeek.toISOString().split('T')[0]}`);
}

function renderStandings(data) {
    const body = document.getElementById('standings-body');
    body.innerHTML = data.map(team => `
        <tr>
            <td>${team.position}</td>
            <td><img src="${team.team.crest}" class="crest" alt=""> ${team.team.shortName}</td>
            <td>${team.won}/${team.draw}/${team.lost}</td>
            <td>${team.goalDifference}</td>
            <td class="pts">${team.points}</td>
        </tr>
    `).join('');
}

function renderScorers(data) {
    const body = document.getElementById('scorers-body');
    body.innerHTML = data.slice(0, 10).map(s => `
        <tr>
            <td><strong>${s.player.name}</strong><br><small style="color:var(--text-dim)">${s.team.name}</small></td>
            <td class="pts">${s.goals}</td>
        </tr>
    `).join('');
}

function renderFixtures(matches) {
    const list = document.getElementById('fixtures-list');
    if (!matches || matches.length === 0) {
        list.innerHTML = '<p style="color:var(--text-dim); text-align:center;">No upcoming matches.</p>';
        return;
    }

    list.innerHTML = matches.map(m => {
        const date = new Date(m.utcDate).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `
            <div class="fixture-row">
                <div style="font-size:0.75rem; background:#2a2a35; padding:2px 8px; border-radius:4px;">${date}</div>
                <div style="flex:1; text-align:right;"><img src="${m.homeTeam.crest}" class="crest"> ${m.homeTeam.shortName}</div>
                <div style="padding:0 10px; color:var(--text-dim)">vs</div>
                <div style="flex:1; text-align:left;">${m.awayTeam.shortName} <img src="${m.awayTeam.crest}" class="crest"></div>
            </div>
        `;
    }).join('');
}

// Start the app
init();
