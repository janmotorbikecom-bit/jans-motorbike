const API_URL = 'https://script.google.com/macros/s/AKfycbzMg1ilHtrHXvTboGF3K8v9AtkWyWCnEGxh_tbvb-PnGHT-vyug8o1pegN_bKUOX4B-4A/exec';
const API_SECRET = 'JANS_SECRET_2026';

async function testUpdate(vaiTro) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: 'updateKhachHang',
        secret: API_SECRET,
        args: [{ tenKH: 'TestUserDummy', bienSo: '9999', vaiTro: vaiTro, taiKhoan: 'Châu Vân' }, { taiKhoan: 'Châu Vân', vaiTro: vaiTro }]
      })
    });
    const text = await res.text();
    console.log(`[${vaiTro}] => ${text}`);
  } catch(e) {}
}

async function run() {
  await testUpdate('Quản trị');
  await testUpdate('Quản trị viên');
  await testUpdate('Admin');
  await testUpdate('Nhân viên');
}
run();
