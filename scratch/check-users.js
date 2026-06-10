const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function checkUser(loginId) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: 'loginUser',
        args: [loginId, 'wrong-password-test-123'],
        secret: API_SECRET
      })
    });
    const data = await res.json();
    const inner = data.data;
    const exists = inner && inner.error && !inner.error.includes("Không tìm thấy tài khoản");
    console.log(`User [${loginId}] => exists: ${!!exists}, response: ${JSON.stringify(inner)}`);
    return exists;
  } catch (e) {
    console.log(`User [${loginId}] check failed:`, e.message);
    return false;
  }
}

async function run() {
  const users = [
    'admin', 'Châu Vân', 'Minh Minh', 'Ân', 'Nghĩa', 'Tường', 'JCAR', 
    'Chau Van', 'MinhMinh', 'An', 'Nghia', 'Tuong', 'Giang'
  ];
  for (const user of users) {
    await checkUser(user);
    // Add small delay to avoid rate limit
    await new Promise(r => setTimeout(r, 500));
  }
}

run();
