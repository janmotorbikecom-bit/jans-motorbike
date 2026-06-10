const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function testFn(fnName, args = []) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: fnName,
        args: args,
        secret: API_SECRET
      })
    });
    const data = await res.json();
    console.log(`\n--- Result for ${fnName} ---`);
    console.log(JSON.stringify(data).substring(0, 500));
  } catch (e) {
    console.log(`\n--- Error for ${fnName}:`, e.message);
  }
}

async function run() {
  const fns = [
    'getNhanVienData',
    'getUsers',
    'getUserList',
    'getTaiKhoanData',
    'getNhanVien',
    'getThuChiData',
    'getXeDaBanData' // Check if this exists as well since /xe-da-ban page is linked in the Sidebar Nav
  ];
  for (const fn of fns) {
    await testFn(fn);
  }
}

run();
