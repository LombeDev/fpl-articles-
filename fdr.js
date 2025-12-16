// Old way: const proxy = "https://cors-anywhere.herokuapp.com/";
// New way: Use your local redirect path
const fplApiBase = "/api/"; 

async function loadFDRTicker() {
    // ... setup code ...
    try {
        const [fixturesRes, bootstrapRes] = await Promise.all([
            fetch(`${fplApiBase}fixtures/`),
            fetch(`${fplApiBase}bootstrap-static/`)
        ]);
        // ... rest of the code ...
    }
}
