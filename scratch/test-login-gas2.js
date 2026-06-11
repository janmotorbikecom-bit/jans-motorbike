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
  // loginUser với taiKhoan + matKhau riêng lẻ
  await t('loginUser 2 args', {
    fn: 'loginUser', secret: API_SECRET,
    args: ['admin', 'admin123']
  });

  await t('loginUser 2 args chauvan', {
    fn: 'loginUser', secret: API_SECRET,
    args: ['Châu Vân', '123456']
  });

  // Thử đọc tên hàm từ GAS
  await t('listFunctions', {
    fn: 'listFunctions', secret: API_SECRET, args: []
  });
}
run();
