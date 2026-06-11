const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function t(name, payload) {
  const res = await fetch(API_URL, {
    method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(`[${name}] => ${await res.text()}`);
}

async function run() {
  // Test loginUser để xem cách nó trả về user object
  await t('loginUser admin', {
    fn: 'loginUser', secret: API_SECRET,
    args: [{ taiKhoan: 'admin', matKhau: 'admin123' }]
  });

  // Test loginUser với tài khoản khác
  await t('loginUser chauvan', {
    fn: 'loginUser', secret: API_SECRET,
    args: [{ taiKhoan: 'Châu Vân', matKhau: '123456' }]
  });
}
run();
