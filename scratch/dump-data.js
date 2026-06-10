const fs = require('fs');
const path = require('path');

const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function fetchData(fnName) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: fnName,
        args: [],
        secret: API_SECRET
      })
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error(`Error fetching ${fnName}:`, e.message);
    return null;
  }
}

async function run() {
  const endpoints = ['getXeData', 'getKhachHangData', 'getThuChiData'];
  for (const fn of endpoints) {
    console.log(`Fetching ${fn}...`);
    const data = await fetchData(fn);
    if (data) {
      const filePath = path.join(__dirname, `${fn}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Saved ${fn} to ${filePath}`);
    }
  }
  console.log('All data fetched and saved.');
}

run();
