const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function testFn(fnName) {
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
    if (data && data.success) {
      console.log(`\n[SUCCESS] Function "${fnName}" exists!`);
      console.log(JSON.stringify(data.data || data).substring(0, 1000));
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

async function run() {
  const fns = [
    'getTaiKhoan',
    'getAdminData',
    'getAdmin',
    'getUsersData',
    'getAccountData',
    'getAccounts',
    'getBranchData',
    'getChiNhanhData',
    'getChiNhanh',
    'getConfigData',
    'getConfig',
    'getCauHinhData',
    'getCauHinh',
    'getSettings',
    'getSettingsData',
    'getNhanVienList',
    'getUsersList',
    'getAccountList',
    'getTaiKhoanList'
  ];
  console.log(`Probing ${fns.length} potential backend functions...`);
  for (const fn of fns) {
    await testFn(fn);
  }
  console.log('Probing finished.');
}

run();
