const fs = require('fs');
const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function fetchAll() {
  const payload = { fn: 'getAppStore', secret: API_SECRET, args: [] };
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  fs.writeFileSync('scratch/dump.json', text);
  console.log("Dumped to scratch/dump.json");
}

fetchAll();
