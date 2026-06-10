const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function testPayload(name, payload) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`[${name}] => ${await res.text()}`);
  } catch(e) {}
}

async function run() {
  await testPayload('deleteKhachHang - Chau Van - Admin', {
    fn: 'deleteKhachHang', secret: API_SECRET,
    args: ['TestUserDummy', '9999', { taiKhoan: 'Châu Vân', vaiTro: 'Admin' }]
  });
}
run();
