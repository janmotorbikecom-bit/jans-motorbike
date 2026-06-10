const fs = require('fs');
const path = require('path');

function run() {
  const getXe = JSON.parse(fs.readFileSync(path.join(__dirname, 'getXeData.json'), 'utf8'));
  const getKH = JSON.parse(fs.readFileSync(path.join(__dirname, 'getKhachHangData.json'), 'utf8'));
  const getTC = JSON.parse(fs.readFileSync(path.join(__dirname, 'getThuChiData.json'), 'utf8'));

  console.log('--- VEHICLES ---');
  const xeList = getXe.data.data || getXe.data || [];
  console.log('Total vehicles:', xeList.length);
  const xeStatuses = {};
  xeList.forEach(x => {
    xeStatuses[x.trangThai] = (xeStatuses[x.trangThai] || 0) + 1;
  });
  console.log('Vehicle statuses:', xeStatuses);

  console.log('\n--- CUSTOMERS ---');
  const khList = getKH.data.data || getKH.data || [];
  console.log('Total customers:', khList.length);

  console.log('\n--- TRANSACTIONS (THU CHI) ---');
  const tcList = getTC.data.data || getTC.data || [];
  console.log('Total transactions:', tcList.length);

  const sheets = {};
  const branches = {};
  const categories = {};
  let soldTransactions = [];

  tcList.forEach(t => {
    sheets[t.sourceSheet] = (sheets[t.sourceSheet] || 0) + 1;
    branches[t.chiNhanh] = (branches[t.chiNhanh] || 0) + 1;
    categories[t.danhMuc] = (categories[t.danhMuc] || 0) + 1;
    
    // Check if it's a vehicle sale transaction
    if (t.nguoiMua || t.maBan || t.giaBan > 0 || (t.danhMuc && t.danhMuc.toLowerCase().includes('bán'))) {
      soldTransactions.push(t);
    }
  });

  console.log('Source sheets:', sheets);
  console.log('Branches:', branches);
  console.log('Categories:', categories);
  console.log('Sold transactions count:', soldTransactions.length);
  if (soldTransactions.length > 0) {
    console.log('Sample sold transaction:', JSON.stringify(soldTransactions[0], null, 2));
  }
}

run();
