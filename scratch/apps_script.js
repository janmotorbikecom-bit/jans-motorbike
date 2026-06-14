// Dán toàn bộ source code Apps Script của bạn vào đây nhé!
// =================================================================
// CODE.GS - Quản Lý Cho Thuê Xe Máy - JAN'S MOTORBIKE
// =================================================================
// VERSION: 2026-05-19-BILL-RECEIPT-V3
// Features: ✅ Cột Xe/Hãng | ✅ Receipt cho Thuê mới + Tiền thuê tháng | ✅ Checkbox Bill đã gửi
// Verify: tìm "TC_ALL_V3" và "updateBillSentStatus" trong file.
// =================================================================

const CONFIG = {
    SHEET_XE: 'QL Xe',
    SHEET_KH: 'QL Khách Hàng',
    SHEET_KH_NOTES: 'QL Ghi Chú KH',
    SHEET_SETTINGS: 'QL Cài Đặt',
    XE_DATA_START: 2,
    KH_DATA_START: 4,
    DRIVE_FOLDER_ID: '1c5fPFRE2Isi1rL38N-oIufYcYZOV77mu',
    MANAGER_EMAIL: 'jan.giangnguyen@gmail.com',
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    BAO_DUONG_CANH_BAO_TRUOC: 7,
    XE_COL: { TEN: 0, NAM: 1, MAU: 2, BIEN_SO: 3, GIA_VON: 4, HANG: 5, GHI_CHU: 6 },
    KH_COL: {
        TEN: 0, LIEN_LAC: 1, XE_THUE: 2, BIEN_SO: 3,
        KM_HIEN_TAI: 4, KM_KE_TIEP: 5, GHI_CHU: 6,
        GIA_THUE: 7, TIEN_COC: 8, GIU_COC: 9, PHUONG_THUC_COC: 9,
        GIAY_TO_URLS: 10,       // Cột K — JSON array of {url,name,date}
        NGAY_BAT_DAU: 11, NGAY_KET_THUC: 12,
        CONG_TAC_VIEN: 13,      // Cột N
        TY_LE_HOA_HONG: 14      // Cột O — Tỉ lệ hoa hồng CTV (%)
    },
    KH_NOTE_COL: {
        THOI_GIAN: 0, TEN_KH: 1, BIEN_SO: 2, LOAI: 3, NOI_DUNG: 4,
        NGUOI_TAO: 5, TRANG_THAI: 6, ID: 7
    }
};

const TC_CONFIG = {
    SHEET_TC: 'QL Thu',     // Sheet Thu
    SHEET_CHI: 'QL Chi',    // Sheet Chi riêng
    SHEET_SOLD: 'Xe Đã Bán',
    TC_START: 2,
    SOLD_START: 2,
    BRANCHES_DEFAULT: ['Chi Nhánh A', 'Chi Nhánh B', 'Chi Nhánh C'],
    COL: {
        NGAY: 0, LOAI: 1, DANH_MUC: 2, BIEN_SO: 3,
        KHACH: 4, SO_TIEN: 5, GHI_CHU: 6, CHI_NHANH: 7, BAT_DAU: 8, KET_THUC: 9,
        CONG_TAC_VIEN_TC: 10, TY_LE_HOA_HONG_TC: 11,
        CHUNG_TU: 12, MODEL: 13, GIA_VON: 14, GIA_BAN: 15, LOI_NHUAN: 16, NGUOI_MUA: 17, LIEN_LAC: 18, DIA_CHI: 19, MA_BAN: 20, MA_XE: 21,
        // [2026-05] Cột W (index 22): trạng thái "Bill đã gửi cho khách"
        // Chỉ áp dụng cho danh mục "Thuê mới" và "Tiền thuê tháng".
        // Giá trị: TRUE/FALSE (checkbox) hoặc chuỗi 'TRUE'/'FALSE'/'1'/'0' — server tự normalize.
        BILL_SENT: 22
    },
    SOLD_COL: {
        MA_BAN: 0, NGAY_BAN: 1, MA_XE: 2, MODEL: 3, HANG_XE: 4, MAU: 5, NAM: 6, BIEN_SO: 7,
        GIA_VON_GOC: 8, GIA_BAN: 9, LOI_NHUAN: 10, NGUOI_MUA: 11, SO_DIEN_THOAI: 12, DIA_CHI: 13,
        CHI_NHANH: 14, NHAN_VIEN_BAN: 15, GHI_CHU_BAN: 16, LICH_SU_XE: 17, MA_GD_TC: 18, THOI_GIAN_TAO: 19, NGUOI_TAO: 20
    },
    // [v3] Mở rộng danh mục Thu: thêm Thuê ngắn + Bảo dưỡng
    DANH_MUC_THU: ['Thuê mới', 'Tiền thuê tháng', 'Thuê ngắn', 'Bảo dưỡng', 'Phụ thu', 'Bán xe', 'Khác'],
    DANH_MUC_CHI: ['Sửa chữa', 'Bảo dưỡng', 'Thay phụ tùng', 'Nhiên liệu',
        'Thuế / Phí đường bộ', 'Bảo hiểm', 'Mua xe mới', 'Chi phí khác']
};

// =================================================================
// HỆ THỐNG NGƯỜI DÙNG & PHÂN QUYỀN
// =================================================================
const SYS = {
    SHEET_USERS: 'QL Người Dùng',
    SHEET_HISTORY: 'LS Chỉnh Sửa',
    // Vai trò: Admin | Nhân viên | Chỉ xem
    USERS_COL: { TEN: 0, EMAIL: 1, VAI_TRO: 2, PIN: 3, TRANG_THAI: 4, GHI_CHU: 5 },
    HISTORY_COL: { THOI_GIAN: 0, NGUOI_DUNG: 1, HANH_DONG: 2, MODULE: 3, DOI_TUONG: 4, CHI_TIET: 5 }
};

// =================================================================
// TỐI ƯU TẢI DỮ LIỆU
// - CacheService giúp Apps Script không phải đọc lại Sheet liên tục khi mở app.
// - Client vẫn có localStorage snapshot để hiện dữ liệu ngay; cache này là lớp server.
// =================================================================
const JMB_CACHE = {
    XE_ALL: 'XE_ALL',
    KH_ALL: 'KH_ALL',
    // [FIX 2026-05-23] Bump cache key sau khi sửa lỗi đọc thiếu cột W/BILL_SENT.
    TC_ALL: 'TC_ALL_V4_BILL_SENT',
    XEBAN_ALL: 'XEBAN_ALL',
    // [OPT 2026-05-20] Cache map xe-thuê-ngắn dùng trong getXeData / buildBienSoToKhachMap.
    SHORT_RENTAL_MAP: 'JMB_SHORT_RENTAL_MAP_V1'
};
function clearAppDataCache_(keys) {
    try {
        const list = keys && keys.length ? keys : [JMB_CACHE.XE_ALL, JMB_CACHE.KH_ALL, JMB_CACHE.TC_ALL, JMB_CACHE.XEBAN_ALL, JMB_CACHE.SHORT_RENTAL_MAP];
        CacheService.getScriptCache().removeAll(list);
    } catch (e) { }
}
// [OPT 2026-05-20] Version-stamp cho cache KH_DETAIL — bump version để invalidate tất cả entry cũ
// thay vì phải xóa từng key (CacheService không hỗ trợ removeByPrefix).
function _getKhDetailCacheVersion_() {
    try {
        var c = CacheService.getScriptCache();
        var v = c.get('KH_DETAIL_VER');
        if (!v) { v = String(Date.now()); c.put('KH_DETAIL_VER', v, 21600); }
        return v;
    } catch (_) { return '0'; }
}
function _bumpKhDetailCacheVersion_() {
    try { CacheService.getScriptCache().put('KH_DETAIL_VER', String(Date.now()), 21600); } catch (_) { }
}
function clearXeKhCache_() {
    clearAppDataCache_([JMB_CACHE.XE_ALL, JMB_CACHE.KH_ALL, JMB_CACHE.SHORT_RENTAL_MAP]);
    _bumpKhDetailCacheVersion_();
}
function clearThuChiRelatedCache_() {
    clearAppDataCache_([JMB_CACHE.TC_ALL, JMB_CACHE.KH_ALL, JMB_CACHE.XE_ALL, JMB_CACHE.XEBAN_ALL, JMB_CACHE.SHORT_RENTAL_MAP]);
    _bumpKhDetailCacheVersion_();
}

function getOrCreateUsersSheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SYS.SHEET_USERS);
    if (!sh) {
        sh = ss.insertSheet(SYS.SHEET_USERS);
        sh.getRange(1, 1, 1, 6).setValues([['Tên Hiển Thị', 'Email', 'Vai Trò', 'PIN', 'Trạng Thái', 'Ghi Chú']]);
        sh.getRange(1, 1, 1, 6).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
        sh.setFrozenRows(1);
        // Add default admin
        const ownerEmail = Session.getEffectiveUser().getEmail();
        sh.appendRow(['Quản Trị Viên', ownerEmail, 'Admin', '', 'Hoạt động', 'Tự động tạo']);
    }
    return sh;
}

function getOrCreateHistorySheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SYS.SHEET_HISTORY);
    if (!sh) {
        sh = ss.insertSheet(SYS.SHEET_HISTORY);
        sh.getRange(1, 1, 1, 6).setValues([['Thời Gian', 'Người Dùng', 'Hành Động', 'Module', 'Đối Tượng', 'Chi Tiết']]);
        sh.getRange(1, 1, 1, 6).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
        sh.setFrozenRows(1);
    }
    return sh;
}

function getUserRole_(userInfo) {
    const role = String((userInfo && userInfo.vaiTro) || '').trim();
    if (/^admin$/i.test(role)) return 'Admin';
    if (/^(nhân viên|nhan vien)$/i.test(role)) return 'Nhân viên';
    if (/^(chỉ xem|chi xem)$/i.test(role)) return 'Chỉ xem';
    return '';
}
function isAdminUser_(userInfo) {
    return getUserRole_(userInfo) === 'Admin';
}
function canManageXeKh_(userInfo) {
    const r = getUserRole_(userInfo);
    return r === 'Admin' || r === 'Nhân viên';
}
function canManageThuChi_(userInfo) {
    const r = getUserRole_(userInfo);
    return r === 'Admin' || r === 'Nhân viên';
}
function canDeleteThuChi_(userInfo) {
    return isAdminUser_(userInfo);
}
function assertAdmin_(userInfo, feature) {
    if (!isAdminUser_(userInfo)) throw new Error('Bạn không có quyền ' + (feature || 'thực hiện thao tác này') + '.');
}
function assertXeKhWrite_(userInfo, feature) {
}
function assertThuChiWrite_(userInfo, feature) {
    if (!canManageThuChi_(userInfo)) throw new Error('Bạn không có quyền nhập liệu Thu/Chi.');
}
function assertThuChiDelete_(userInfo) {
    if (!canDeleteThuChi_(userInfo)) throw new Error('Nhân viên không có quyền xóa Thu/Chi.');
}

/** Ghi nhật ký. userInfo = {ten, email} */
function logActivity_(userInfo, hanhDong, module, doiTuong, chiTiet) {
    try {
        const sh = getOrCreateHistorySheet_();
        const now = new Date();
        const thoiGian = String(now.getDate()).padStart(2, '0') + '/' +
            String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear() + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');
        const nguoiDung = userInfo ? ((userInfo.ten || '') + (userInfo.email ? ' <' + userInfo.email + '>' : '')) : 'Hệ thống';
        sh.appendRow([thoiGian, nguoiDung, hanhDong, module, doiTuong || '', chiTiet || '']);
        // Giới hạn 2000 dòng history
        const lastRow = sh.getLastRow();
        if (lastRow > 2001) sh.deleteRows(2, lastRow - 2001);
    } catch (e) { Logger.log('logActivity_: ' + e.message); }
}

/** Lấy danh sách người dùng. */
function getUsers() {
    try {
        const sh = getOrCreateUsersSheet_();
        const lastRow = sh.getLastRow();
        if (lastRow < 2) return { success: true, data: [] };
        const raw = sh.getRange(2, 1, lastRow - 1, 6).getValues();
        const users = raw.map((r, i) => ({
            rowNum: i + 2,
            ten: String(r[SYS.USERS_COL.TEN] || '').trim(),
            email: String(r[SYS.USERS_COL.EMAIL] || '').trim(),
            vaiTro: String(r[SYS.USERS_COL.VAI_TRO] || '').trim(),
            hasPin: String(r[SYS.USERS_COL.PIN] || '').trim() !== '',
            trangThai: String(r[SYS.USERS_COL.TRANG_THAI] || '').trim(),
            ghiChu: String(r[SYS.USERS_COL.GHI_CHU] || '').trim()
        })).filter(u => u.ten);
        return { success: true, data: users };
    } catch (e) { return { success: false, error: e.message }; }
}

/** Kiểm tra login: tự nhập ID/email/tên + mật khẩu/PIN. */
function loginUser(loginId, password) {
    try {
        loginId = String(loginId || '').trim();
        password = String(password || '').trim();
        if (!loginId) return { success: false, error: 'Vui lòng nhập ID đăng nhập.' };
        if (!password) return { success: false, error: 'Vui lòng nhập mật khẩu.' };

        const sh = getOrCreateUsersSheet_();
        const lastRow = sh.getLastRow();
        if (lastRow < 2) return { success: false, error: 'Chưa có người dùng nào.' };
        const raw = sh.getRange(2, 1, lastRow - 1, 6).getValues();
        const key = loginId.toLowerCase();

        // Cho phép đăng nhập bằng Tên Hiển Thị hoặc Email trong sheet QL Người Dùng.
        const user = raw.find(r => {
            const ten = String(r[SYS.USERS_COL.TEN] || '').trim().toLowerCase();
            const email = String(r[SYS.USERS_COL.EMAIL] || '').trim().toLowerCase();
            return ten === key || email === key;
        });

        if (!user) return { success: false, error: 'Không tìm thấy tài khoản "' + loginId + '".' };
        if (String(user[SYS.USERS_COL.TRANG_THAI] || '').trim() !== 'Hoạt động')
            return { success: false, error: 'Tài khoản đã bị vô hiệu hóa.' };

        const storedPassword = String(user[SYS.USERS_COL.PIN] || '').trim();
        if (!storedPassword) return { success: false, error: 'Tài khoản này chưa có mật khẩu/PIN trong sheet QL Người Dùng.' };
        if (storedPassword !== password)
            return { success: false, error: 'Sai mật khẩu.' };

        const ten = String(user[SYS.USERS_COL.TEN] || '').trim();
        const email = String(user[SYS.USERS_COL.EMAIL] || '').trim();
        logActivity_({ ten, email }, 'ĐĂNG NHẬP', 'Hệ thống', ten, 'Đăng nhập thành công');
        return {
            success: true, data: {
                ten: ten,
                email: email,
                vaiTro: String(user[SYS.USERS_COL.VAI_TRO] || '').trim()
            }
        };
    } catch (e) { return { success: false, error: e.message }; }
}

/** Lưu người dùng (thêm mới hoặc cập nhật theo rowNum). */
function saveUser(data, userInfo) {
    try {
        const sh = getOrCreateUsersSheet_();
        if (!data.ten || !data.ten.trim()) throw new Error('Tên không được để trống.');
        if (!data.vaiTro) throw new Error('Vui lòng chọn vai trò.');
        const row = [data.ten || '', data.email || '', data.vaiTro || 'Nhân viên',
        data.pin || '', data.trangThai || 'Hoạt động', data.ghiChu || ''];
        if (data.rowNum && data.rowNum >= 2) {
            // Update: giữ PIN cũ nếu không nhập mới
            if (!data.pin) {
                const oldPin = sh.getRange(data.rowNum, SYS.USERS_COL.PIN + 1).getValue();
                row[SYS.USERS_COL.PIN] = oldPin;
            }
            sh.getRange(data.rowNum, 1, 1, 6).setValues([row]);
            logActivity_(userInfo, 'SỬA NGƯỜI DÙNG', 'Người Dùng', data.ten, 'Cập nhật vai trò: ' + data.vaiTro);
            return { success: true, message: 'Đã cập nhật người dùng "' + data.ten + '".' };
        } else {
            sh.appendRow(row);
            logActivity_(userInfo, 'THÊM NGƯỜI DÙNG', 'Người Dùng', data.ten, 'Vai trò: ' + data.vaiTro);
            return { success: true, message: 'Đã thêm người dùng "' + data.ten + '".' };
        }
    } catch (e) { return { success: false, error: e.message }; }
}

/** Xóa người dùng. */
function deleteUser(rowNum, userInfo) {
    try {
        const sh = getOrCreateUsersSheet_();
        if (!rowNum || rowNum < 2) throw new Error('Không hợp lệ.');
        const ten = String(sh.getRange(rowNum, SYS.USERS_COL.TEN + 1).getValue() || '');
        sh.deleteRow(rowNum);
        logActivity_(userInfo, 'XÓA NGƯỜI DÙNG', 'Người Dùng', ten, '');
        return { success: true, message: 'Đã xóa người dùng "' + ten + '".' };
    } catch (e) { return { success: false, error: e.message }; }
}

/** Lấy lịch sử chỉnh sửa (gần nhất trước). */
function getEditHistory(limit) {
    try {
        const sh = getOrCreateHistorySheet_();
        const lastRow = sh.getLastRow();
        if (lastRow < 2) return { success: true, data: [] };
        const n = Math.min(parseInt(limit) || 100, lastRow - 1);
        const startRow = Math.max(2, lastRow - n + 1);
        const raw = sh.getRange(startRow, 1, lastRow - startRow + 1, 6).getValues();
        raw.reverse();
        return {
            success: true, data: raw.map(r => ({
                thoiGian: String(r[0] || ''),
                nguoiDung: String(r[1] || ''),
                hanhDong: String(r[2] || ''),
                module: String(r[3] || ''),
                doiTuong: String(r[4] || ''),
                chiTiet: String(r[5] || '')
            }))
        };
    } catch (e) { return { success: false, error: e.message }; }
}

// ---------------------------------------------------------------
// HELPER: GIẤY TỜ NHIỀU TẤM
// ---------------------------------------------------------------
/** Parse ô giấy tờ → [{url, name, date}] */
function parseDocsCell_(val) {
    if (!val || val === '') return [];
    const s = String(val).trim();
    if (s.startsWith('[')) {
        try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; }
        catch (e) { }
    }
    if (s.startsWith('http')) return [{ url: s, name: 'Giấy tờ', date: '' }];
    return [];
}
function serializeDocsCell_(docs) {
    if (!docs || !docs.length) return '';
    return JSON.stringify(docs);
}

// ---------------------------------------------------------------
// ENTRY POINT
// ---------------------------------------------------------------
function doGet() {
    return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle("JAN'S MOTORBIKE - Quản Lý Cho Thuê")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---------------------------------------------------------------
// [OPT 2026-05-20] BUNDLE ENDPOINT
// Gom 4 RPC (getXeData / getKhachHangData / getThuChiData / getXeDaBanData) thành 1.
// Client gọi 1 lần thay vì 4 → giảm overhead khứ hồi mạng + serialize.
// Mỗi hàm con đã tự cache nên gọi tuần tự vẫn nhanh (hit cache sau lần đầu).
// ---------------------------------------------------------------
function getAppBundle(force) {
    const t0 = Date.now();
    const f = !!force;
    const out = { success: true, ts: t0 };
    try { out.xe = getXeData(f); } catch (e) { out.xe = { success: false, error: e.message }; }
    try { out.kh = getKhachHangData(f); } catch (e) { out.kh = { success: false, error: e.message }; }
    try { out.tc = getThuChiData('', '', '', f); } catch (e) { out.tc = { success: false, error: e.message }; }
    try { out.xeban = getXeDaBanData('', '', '', '', f); } catch (e) { out.xeban = { success: false, error: e.message }; }
    try { out.cfg = getThuChiConfig(); } catch (e) { out.cfg = null; }
    out.elapsedMs = Date.now() - t0;
    return out;
}

// [OPT 2026-05-20] Bundle nhẹ — chỉ tải Xe + Khách Hàng (dùng cho refresh nhanh sau khi sửa).
function getXeKhBundle(force) {
    const t0 = Date.now();
    const f = !!force;
    const out = { success: true, ts: t0 };
    try { out.xe = getXeData(f); } catch (e) { out.xe = { success: false, error: e.message }; }
    try { out.kh = getKhachHangData(f); } catch (e) { out.kh = { success: false, error: e.message }; }
    out.elapsedMs = Date.now() - t0;
    return out;
}

// ---------------------------------------------------------------
// TIỆN ÍCH CHUNG
// ---------------------------------------------------------------
function parseMoneyValue(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    const n = parseFloat(String(v).replace(/[^0-9]/g, ''));
    return isNaN(n) ? 0 : n;
}
function formatDateForSheet(iso) {
    if (!iso || !String(iso).trim()) return '';
    const p = String(iso).trim().split('-');
    if (p.length !== 3) return String(iso);
    return p[2] + '/' + p[1] + '/' + p[0];
}
function formatDate(d) {
    return String(d.getDate()).padStart(2, '0') + '/' +
        String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
function readDateFromCell(val) {
    if (!val || val === '') return '';
    if (val instanceof Date) return isNaN(val.getTime()) ? '' : formatDate(val);
    const s = String(val).trim();
    if (!s) return '';
    // [FIX 2026-05] Pad số ngày/tháng để đảm bảo định dạng dd/MM/yyyy
    // Trước đây string "6/5/2026" hoặc "6/05/2026" được trả về nguyên trạng,
    // gây hiển thị thiếu số 0 đứng trước trong các bảng (Xe Đã Bán, Thu/Chi).
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : formatDate(d);
}
function tryParseDate(str) {
    if (!str) return null;
    if (str instanceof Date) return isNaN(str.getTime()) ? null : str;
    const s = String(str).trim();
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m1) { const d = new Date(+m1[3], +m1[2] - 1, +m1[1]); return isNaN(d.getTime()) ? null : d; }
    const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m2) { const d = new Date(+m2[1], +m2[2] - 1, +m2[3]); return isNaN(d.getTime()) ? null : d; }
    const p = new Date(s); return isNaN(p.getTime()) ? null : p;
}
function isShortRentalCategory_(danhMuc) {
    return normalizeVN_(danhMuc) === 'thue ngan';
}

function isLongRentalCustomerCategory_(danhMuc) {
    // Chỉ 2 danh mục này được ghi/cập nhật vào sheet QL Khách Hàng.
    // Thuê ngắn vẫn nằm trong QL Thu để tính doanh thu, nhưng không tạo khách master.
    return ['thue moi', 'tien thue thang'].indexOf(normalizeVN_(danhMuc)) >= 0;
}

function _buildActiveShortRentalVehicleMap_() {
    // [OPT 2026-05-20] Cache 60s — hàm này được gọi cả trong getXeData và buildBienSoToKhachMap
    // (chạy mỗi lần renderXe), trước đây quét full QL Thu mỗi lần.
    try {
        const cache = CacheService.getScriptCache();
        const cached = cache.get('JMB_SHORT_RENTAL_MAP_V1');
        if (cached) { try { return JSON.parse(cached); } catch (_) { } }
    } catch (_) { }
    const map = {};
    try {
        const sh = getOrCreateThuChiSheet_();
        const lastRow = sh.getLastRow();
        if (lastRow < TC_CONFIG.TC_START) {
            try { CacheService.getScriptCache().put('JMB_SHORT_RENTAL_MAP_V1', JSON.stringify(map), 60); } catch (_) { }
            return map;
        }

        const needCols = Math.max(sh.getLastColumn(), TC_CONFIG.COL.KET_THUC + 1);
        const raw = sh.getRange(TC_CONFIG.TC_START, 1, lastRow - TC_CONFIG.TC_START + 1, needCols).getValues();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const latestByPlate = {};

        raw.forEach(function (r, i) {
            const loai = String(r[TC_CONFIG.COL.LOAI] || '').trim();
            const danhMuc = String(r[TC_CONFIG.COL.DANH_MUC] || '').trim();
            if (loai !== 'Thu' || !isShortRentalCategory_(danhMuc)) return;

            const khach = String(r[TC_CONFIG.COL.KHACH] || '').trim();
            const bienSo = String(r[TC_CONFIG.COL.BIEN_SO] || '').trim();
            if (!khach || !bienSo) return;

            const startDate = tryParseDate(r[TC_CONFIG.COL.BAT_DAU]) || tryParseDate(readDateFromCell(r[TC_CONFIG.COL.BAT_DAU]));
            const endDate = tryParseDate(r[TC_CONFIG.COL.KET_THUC]) || tryParseDate(readDateFromCell(r[TC_CONFIG.COL.KET_THUC]));
            // Thuê ngắn chỉ làm xe bận khi đang nằm trong kỳ thuê.
            // Không có ngày kết thúc thì bỏ qua để tránh giữ xe bận sai.
            if (!endDate) return;
            const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
            if (endTime < today) return;
            if (startDate) {
                const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
                if (startTime > today) return;
            }

            const plateKey = String(bienSo).toUpperCase();
            const rowNum = TC_CONFIG.TC_START + i;
            const old = latestByPlate[plateKey];
            if (!old || endTime > old.endTime || (endTime === old.endTime && rowNum > old.rowNum)) {
                latestByPlate[plateKey] = { khach: khach, endTime: endTime, rowNum: rowNum };
            }
        });

        Object.keys(latestByPlate).forEach(function (bs) {
            map[bs] = latestByPlate[bs].khach;
        });
    } catch (e) {
        Logger.log('_buildActiveShortRentalVehicleMap_: ' + e.message);
    }
    try { CacheService.getScriptCache().put('JMB_SHORT_RENTAL_MAP_V1', JSON.stringify(map), 60); } catch (_) { }
    return map;
}

function buildBienSoToKhachMap() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const map = {};

    // 1) Khách dài hạn/tháng từ QL Khách Hàng
    const sh = ss.getSheetByName(CONFIG.SHEET_KH);
    if (sh) {
        const lastRow = sh.getLastRow();
        if (lastRow >= CONFIG.KH_DATA_START) {
            const data = sh.getRange(CONFIG.KH_DATA_START, 1, lastRow - CONFIG.KH_DATA_START + 1, CONFIG.KH_COL.BIEN_SO + 1).getValues();
            data.forEach(r => {
                const ten = String(r[CONFIG.KH_COL.TEN] || '').trim();
                const bs = String(r[CONFIG.KH_COL.BIEN_SO] || '').trim().toUpperCase();
                if (ten && bs) map[bs] = ten;
            });
        }
    }

    // 2) Khách thuê ngắn đang hoạt động từ QL Thu — không ghi vào QL Khách Hàng
    const shortMap = _buildActiveShortRentalVehicleMap_();
    Object.keys(shortMap).forEach(function (bs) { map[bs] = shortMap[bs]; });

    return map;
}


// ---------------------------------------------------------------
// CÀI ĐẶT DASHBOARD / APP
// ---------------------------------------------------------------
const APP_SETTING_KEYS = {
    VON_CHU_KY_TRUOC: 'VON_CHU_KY_TRUOC'
};

function getOrCreateSettingsSheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(CONFIG.SHEET_SETTINGS);
    if (!sh) {
        sh = ss.insertSheet(CONFIG.SHEET_SETTINGS);
        sh.getRange(1, 1, 1, 4).setValues([['Khóa', 'Giá Trị', 'Cập Nhật Lúc', 'Người Cập Nhật']]);
        sh.setFrozenRows(1);
        try {
            sh.getRange(1, 1, 1, 4)
                .setBackground('#111827')
                .setFontColor('#ffffff')
                .setFontWeight('bold');
            sh.autoResizeColumns(1, 4);
        } catch (_) { }
    }
    return sh;
}

function getSettingRecord_(key) {
    const sh = getOrCreateSettingsSheet_();
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { row: 0, value: '', updatedAt: '', updatedBy: '' };
    const data = sh.getRange(2, 1, lastRow - 1, 4).getValues();
    const k = String(key || '').trim();
    for (let i = 0; i < data.length; i++) {
        if (String(data[i][0] || '').trim() === k) {
            return { row: i + 2, value: data[i][1], updatedAt: data[i][2], updatedBy: data[i][3] };
        }
    }
    return { row: 0, value: '', updatedAt: '', updatedBy: '' };
}

function saveSettingRecord_(key, value, userInfo) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const sh = getOrCreateSettingsSheet_();
        const rec = getSettingRecord_(key);
        const userName = (userInfo && (userInfo.ten || userInfo.email)) ? String(userInfo.ten || userInfo.email) : '';
        const rowData = [String(key || '').trim(), value, new Date(), userName];
        if (rec.row) sh.getRange(rec.row, 1, 1, 4).setValues([rowData]);
        else sh.appendRow(rowData);
        try { sh.autoResizeColumns(1, 4); } catch (_) { }
        return rowData;
    } finally {
        lock.releaseLock();
    }
}

function getDashboardCapital_() {
    const rec = getSettingRecord_(APP_SETTING_KEYS.VON_CHU_KY_TRUOC);
    return {
        vonChuKy: parseMoneyValue(rec.value),
        updatedAt: rec.updatedAt ? readDateFromCell(rec.updatedAt) : '',
        updatedBy: rec.updatedBy || ''
    };
}

function getDashboardCapital() {
    try {
        return { success: true, data: getDashboardCapital_() };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function saveDashboardCapital(value, userInfo) {
    try {
        const amount = parseMoneyValue(value);
        saveSettingRecord_(APP_SETTING_KEYS.VON_CHU_KY_TRUOC, amount, userInfo);
        try { clearXeKhCache_(); } catch (_) { }
        try { logActivity_(userInfo, 'CẬP NHẬT', 'Dashboard', 'Vốn chu kỳ trước', String(amount)); } catch (_) { }
        return { success: true, message: 'Đã lưu vốn chu kỳ trước.', data: getDashboardCapital_() };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ---------------------------------------------------------------
// QUẢN LÝ CHI NHÁNH
// ---------------------------------------------------------------
function getBranches() {
    try {
        const stored = PropertiesService.getScriptProperties().getProperty('TC_BRANCHES');
        if (stored) {
            const arr = JSON.parse(stored);
            if (Array.isArray(arr) && arr.length > 0) return { success: true, data: arr };
        }
    } catch (e) { }
    return { success: true, data: TC_CONFIG.BRANCHES_DEFAULT };
}
function saveBranches(branches, userInfo) {
    try {
        assertAdmin_(userInfo, 'quản lý chi nhánh');
        if (!Array.isArray(branches)) throw new Error('Dữ liệu chi nhánh không hợp lệ.');
        const cleaned = branches.map(b => String(b).trim()).filter(Boolean);
        if (cleaned.length === 0) throw new Error('Phải có ít nhất 1 chi nhánh.');
        PropertiesService.getScriptProperties().setProperty('TC_BRANCHES', JSON.stringify(cleaned));
        return { success: true, message: 'Đã lưu ' + cleaned.length + ' chi nhánh.', data: cleaned };
    } catch (e) { return { success: false, error: e.message }; }
}


function normalizeBrandName_(brand) {
    const raw = String(brand || '').trim();
    if (!raw) return '';
    const key = raw.toLowerCase();
    const map = {
        'honda': 'Honda',
        'yamaha': 'Yamaha',
        'suzuki': 'Suzuki',
        'sym': 'SYM',
        'kawasaki': 'Kawasaki',
        'kymco': 'Kymco',
        'vinfast': 'Vinfast',
        'oto': 'ÔTÔ',
        'ô tô': 'ÔTÔ',
        'ôtô': 'ÔTÔ',
        'o to': 'ÔTÔ'
    };
    return map[key] || raw;
}
function inferXeBrand_(tenXe, hangXe) {
    const direct = String(hangXe || '').trim();
    const isPlaceholder = /^[-–—.x?n\/a]+$/i.test(direct) || direct === '';
    if (direct && !isPlaceholder) return normalizeBrandName_(direct);
    const s = String(tenXe || '').trim().toLowerCase();
    if (!s) return '';
    if (/(airblade|air blade|vision|winner|wave|vario|future|blade|dream|sh\b|lead|pcx|click|spacy|forza|cb|cbr|adv|genio|beat|msx|scr|cub|super cub|sonic|rsx)/.test(s)) return 'Honda';
    if (/(exciter|nvx|janus|freego|sirius|jupiter|grande|latte|lexi|mt-|yzf|fazzio|pg-1|pg1|xsr|wr155|r15)/.test(s)) return 'Yamaha';
    if (/(raider|satria|gsx|hayate|impulse|address|gd110|v-strom|burgman)/.test(s)) return 'Suzuki';
    if (/(attila|elegant|angel|shark|elite|passing|joyride|starx|sym\b)/.test(s)) return 'SYM';
    // [2026-05] Các hãng mới bổ sung
    if (/(ninja|z\s*[12345678]\d{2}|versys|er-?6|w\s*\d{3}|kx\s*\d{2,3}|kawasaki)/.test(s)) return 'Kawasaki';
    if (/(agility|like\s*\d|xciting|downtown|people|jockey|movie|kymco)/.test(s)) return 'Kymco';
    if (/(klara|feliz|evo|vento|theon|vf\s?e?34|vf\s?5|vf\s?6|vf\s?7|vf\s?8|vf\s?9|lux|fadil|president|vinfast)/.test(s)) return 'Vinfast';
    if (/(mazda|toyota|kia|hyundai|ford|mitsubishi|chevrolet|nissan|honda city|honda civic|honda crv|honda cr-v|mercedes|bmw 3|bmw 5|bmw 7|audi|lexus|porsche|peugeot|subaru|isuzu|suzuki xl7|suzuki ertiga|vinfast vf|vinfast lux|vinfast fadil|vinfast president|fortuner|innova|vios|yaris|camry|corolla|altis|cx-|bt-50|ranger|everest|pajero|xpander|outlander|accent|elantra|seltos|sonet|santa fe|santafe|cerato|morning|mazda 2|mazda 3|mazda2|mazda3)/.test(s)) return 'ÔTÔ';
    return '';
}
function buildHangStats_(vehicles) {
    const brands = ['Honda', 'Yamaha', 'Suzuki', 'SYM', 'Kawasaki', 'Kymco', 'Vinfast', 'ÔTÔ'];
    // Map lowercase → tên chuẩn để normalize
    const normMap = {};
    brands.forEach(b => normMap[b.toLowerCase()] = b);
    const map = {};
    brands.forEach(b => map[b] = 0);
    map['Khác'] = 0;
    vehicles.forEach(v => {
        const b = String(v.hangXe || '').trim();
        if (!b) { map['Khác'] += 1; return; }
        const norm = normMap[b.toLowerCase()];
        if (norm) map[norm] += 1;
        else map['Khác'] += 1;
    });
    return map;
}

// ---------------------------------------------------------------
// MODULE: QUẢN LÝ XE
// ---------------------------------------------------------------
function getXeData(_force) {
    try {
        // Cache 60s — tránh đọc lại sheet khi reload nhanh
        const _cache = CacheService.getScriptCache();
        if (_force) { try { _cache.remove(JMB_CACHE.XE_ALL); } catch (_) { } }
        else {
            const _cached = _cache.get(JMB_CACHE.XE_ALL);
            if (_cached) { try { return JSON.parse(_cached); } catch (_) { } }
        }
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_XE);
        if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_XE + '"');
        const lastRow = sh.getLastRow();
        if (lastRow < CONFIG.XE_DATA_START) {
            const cap = getDashboardCapital_();
            return { success: true, data: [], stats: { tongXe: 0, tongVon: 0, xeTrong: 0, xeDangThue: 0, hangStats: buildHangStats_([]), vonChuKyTruoc: cap.vonChuKy, vonChuKyUpdatedAt: cap.updatedAt, vonChuKyUpdatedBy: cap.updatedBy } };
        }
        const raw = sh.getRange(CONFIG.XE_DATA_START, 1, lastRow - CONFIG.XE_DATA_START + 1, 7).getValues();
        const map = buildBienSoToKhachMap();
        const vehicles = []; let tongVon = 0, xeTrong = 0, xeDangThue = 0;
        raw.forEach(r => {
            const tenXe = String(r[CONFIG.XE_COL.TEN] || '').trim();
            if (!tenXe) return;
            const bienSo = String(r[CONFIG.XE_COL.BIEN_SO] || '').trim();
            const giaVon = parseMoneyValue(r[CONFIG.XE_COL.GIA_VON]);
            const hangXe = normalizeBrandName_(inferXeBrand_(tenXe, r[CONFIG.XE_COL.HANG]));
            let trangThai = 'Trống';
            if (bienSo && map[bienSo.toUpperCase()]) { trangThai = 'Đang thuê - ' + map[bienSo.toUpperCase()]; xeDangThue++; }
            else { xeTrong++; }
            tongVon += giaVon;
            const maXe = 'XE-' + bienSo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            vehicles.push({
                stt: vehicles.length + 1, maXe, tenXe, nam: r[CONFIG.XE_COL.NAM] || '',
                mauSon: String(r[CONFIG.XE_COL.MAU] || '').trim(), bienSo, giaVon, hangXe, trangThai,
                ghiChu: String(r[CONFIG.XE_COL.GHI_CHU] || '').trim()
            });
        });
        const cap = getDashboardCapital_();
        const _result = { success: true, data: vehicles, stats: { tongXe: vehicles.length, tongVon, xeTrong, xeDangThue, hangStats: buildHangStats_(vehicles), vonChuKyTruoc: cap.vonChuKy, vonChuKyUpdatedAt: cap.updatedAt, vonChuKyUpdatedBy: cap.updatedBy } };
        try { _cache.put(JMB_CACHE.XE_ALL, JSON.stringify(_result), 300); } catch (_) { }
        return _result;
    } catch (e) { return { success: false, error: e.message }; }
}
function getAvailableXe() {
    try { const r = getXeData(); if (!r.success) throw new Error(r.error); return { success: true, data: r.data.filter(x => x.trangThai === 'Trống') }; }
    catch (e) { return { success: false, error: e.message }; }
}
function addXe(formData, userInfo) {
    try {
        assertXeKhWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_XE);
        if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_XE + '"');
        if (!formData.tenXe || !formData.tenXe.trim()) throw new Error('Tên xe không được để trống.');
        if (!formData.bienSo || !formData.bienSo.trim()) throw new Error('Biển số không được để trống.');
        const lastRow = sh.getLastRow();
        if (lastRow >= CONFIG.XE_DATA_START) {
            const bss = sh.getRange(CONFIG.XE_DATA_START, CONFIG.XE_COL.BIEN_SO + 1, lastRow - CONFIG.XE_DATA_START + 1, 1).getValues().flat();
            if (bss.some(b => String(b).trim().toUpperCase() === formData.bienSo.trim().toUpperCase()))
                throw new Error('Biển số "' + formData.bienSo + '" đã tồn tại!');
        }
        sh.appendRow([formData.tenXe || '', formData.nam || '', formData.mauSon || '', formData.bienSo || '', formData.giaVon || 0, normalizeBrandName_(formData.hangXe || inferXeBrand_(formData.tenXe, '')) || '', formData.ghiChu || '']);
        try { clearXeKhCache_(); } catch (_) { }
        logActivity_(userInfo, 'THÊM XE', 'Xe', formData.bienSo, 'Tên: ' + formData.tenXe + ' · Hãng: ' + ((normalizeBrandName_(formData.hangXe || inferXeBrand_(formData.tenXe, ''))) || '--'));
        return { success: true, message: 'Thêm xe "' + formData.tenXe + '" thành công!' };
    } catch (e) { return { success: false, error: e.message }; }
}
function updateXe(originalBienSo, formData, userInfo) {
    try {
        assertXeKhWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_XE);
        if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_XE + '"');
        if (!formData.tenXe || !formData.tenXe.trim()) throw new Error('Tên xe không được để trống.');
        if (!formData.bienSo || !formData.bienSo.trim()) throw new Error('Biển số không được để trống.');
        const lastRow = sh.getLastRow();
        if (lastRow < CONFIG.XE_DATA_START) throw new Error('Không tìm thấy xe.');
        const bssRange = sh.getRange(CONFIG.XE_DATA_START, CONFIG.XE_COL.BIEN_SO + 1, lastRow - CONFIG.XE_DATA_START + 1, 1).getValues();
        let rowNum = -1;
        for (let i = 0; i < bssRange.length; i++) {
            if (String(bssRange[i][0]).trim().toUpperCase() === originalBienSo.trim().toUpperCase()) { rowNum = CONFIG.XE_DATA_START + i; break; }
        }
        if (rowNum === -1) throw new Error('Không tìm thấy xe với biển số: "' + originalBienSo + '"');
        if (formData.bienSo.trim().toUpperCase() !== originalBienSo.trim().toUpperCase()) {
            if (bssRange.some((b, i) => String(b[0]).trim().toUpperCase() === formData.bienSo.trim().toUpperCase() && (CONFIG.XE_DATA_START + i) !== rowNum))
                throw new Error('Biển số "' + formData.bienSo + '" đã tồn tại!');
        }
        sh.getRange(rowNum, 1, 1, 7).setValues([[
            formData.tenXe || '', formData.nam || '', formData.mauSon || '',
            formData.bienSo || '', parseMoneyValue(formData.giaVon) || 0, normalizeBrandName_(formData.hangXe || inferXeBrand_(formData.tenXe, '')) || '', formData.ghiChu || ''
        ]]);
        try { clearXeKhCache_(); } catch (_) { }
        logActivity_(userInfo, 'SỬA XE', 'Xe', formData.bienSo, 'Tên: ' + formData.tenXe + ' · Hãng: ' + ((normalizeBrandName_(formData.hangXe || inferXeBrand_(formData.tenXe, ''))) || '--'));
        return { success: true, message: 'Đã cập nhật xe "' + formData.tenXe + '".' };
    } catch (e) { Logger.log('updateXe: ' + e.message); return { success: false, error: e.message }; }
}


// ---------------------------------------------------------------
// MODULE: GHI CHÚ KHÁCH HÀNG — nhiều ghi chú / 1 khách
// Sheet: QL Ghi Chú KH
// ---------------------------------------------------------------
function getOrCreateKhachHangNotesSheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(CONFIG.SHEET_KH_NOTES || 'QL Ghi Chú KH');
    if (!sh) {
        sh = ss.insertSheet(CONFIG.SHEET_KH_NOTES || 'QL Ghi Chú KH');
        sh.getRange(1, 1, 1, 8).setValues([['Thời Gian', 'Tên KH', 'Biển Số', 'Loại Ghi Chú', 'Nội Dung', 'Người Tạo', 'Trạng Thái', 'Mã Ghi Chú']]);
        sh.getRange(1, 1, 1, 8).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
        sh.setFrozenRows(1);
        try {
            sh.setColumnWidth(1, 145);
            sh.setColumnWidth(2, 160);
            sh.setColumnWidth(3, 130);
            sh.setColumnWidth(4, 130);
            sh.setColumnWidth(5, 360);
            sh.setColumnWidth(6, 160);
            sh.setColumnWidth(7, 100);
            sh.setColumnWidth(8, 120);
        } catch (_) { }
    }
    return sh;
}

function _dateTimeVi_(d) {
    d = d || new Date();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function _normText_(v) {
    return String(v || '').trim().toLowerCase();
}

function _normHeaderKey_(v) {
    return String(v || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function _getKhColByAliases_(sh, aliases, fallbackIndex) {
    try {
        const headerRow = Math.max(1, CONFIG.KH_DATA_START - 1);
        const lastCol = sh.getLastColumn();
        if (!lastCol) return fallbackIndex;
        const headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(_normHeaderKey_);
        const keys = (aliases || []).map(_normHeaderKey_);
        for (let k = 0; k < keys.length; k++) {
            for (let i = 0; i < headers.length; i++) {
                if (headers[i] === keys[k]) return i;
            }
        }
    } catch (_) { }
    return fallbackIndex;
}

function _getKhPhuongThucCocCol_(sh) {
    return _getKhColByAliases_(sh, ['Phương thức cọc', 'Phuong thuc coc', 'Hình thức cọc', 'Hinh thuc coc', 'Giữ cọc', 'Giu coc'], CONFIG.KH_COL.PHUONG_THUC_COC || CONFIG.KH_COL.GIU_COC);
}

function _readKhPhuongThucCoc_(row, sh) {
    const idx = _getKhPhuongThucCocCol_(sh);
    return String(row[idx] || row[CONFIG.KH_COL.GIU_COC] || '').trim();
}

function _writeKhPhuongThucCoc_(sh, rowNum, value) {
    try {
        const idx = _getKhPhuongThucCocCol_(sh);
        if (idx >= 0) sh.getRange(rowNum, idx + 1).setValue(value || '');
    } catch (_) { }
}

function _canAddKhNote_(userInfo) {
    const r = getUserRole_(userInfo);
    return r === 'Admin' || r === 'Nhân viên';
}

function _assertKhNoteWrite_(userInfo) {
    if (!_canAddKhNote_(userInfo)) throw new Error('Bạn không có quyền thêm ghi chú khách hàng.');
}

function getKhachHangNotes_(tenKH, bienSo) {
    const sh = getOrCreateKhachHangNotesSheet_();
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return [];
    const raw = sh.getRange(2, 1, lastRow - 1, 8).getValues();
    const nameKey = _normText_(tenKH);
    const plateKey = _normText_(bienSo);
    const notes = [];
    raw.forEach((r, idx) => {
        const rowNum = idx + 2;
        const ten = String(r[CONFIG.KH_NOTE_COL.TEN_KH] || '').trim();
        const bs = String(r[CONFIG.KH_NOTE_COL.BIEN_SO] || '').trim();
        const status = String(r[CONFIG.KH_NOTE_COL.TRANG_THAI] || 'Hoạt động').trim();
        if (/^(xóa|xoa|deleted|ẩn|an)$/i.test(status)) return;
        const matchName = nameKey && _normText_(ten) === nameKey;
        const matchPlate = plateKey && _normText_(bs) === plateKey;
        if (!matchName && !matchPlate) return;
        notes.push({
            rowNum,
            thoiGian: String(r[CONFIG.KH_NOTE_COL.THOI_GIAN] || '').trim(),
            tenKH: ten,
            bienSo: bs,
            loai: String(r[CONFIG.KH_NOTE_COL.LOAI] || 'Ghi chú').trim(),
            noiDung: String(r[CONFIG.KH_NOTE_COL.NOI_DUNG] || '').trim(),
            nguoiTao: String(r[CONFIG.KH_NOTE_COL.NGUOI_TAO] || '').trim(),
            trangThai: status || 'Hoạt động',
            id: String(r[CONFIG.KH_NOTE_COL.ID] || '').trim()
        });
    });
    notes.sort((a, b) => b.rowNum - a.rowNum);
    return notes;
}

function getKhachHangNotes(tenKH, bienSo) {
    try {
        return { success: true, notes: getKhachHangNotes_(tenKH, bienSo) };
    } catch (e) {
        Logger.log('getKhachHangNotes: ' + e.message);
        return { success: false, error: e.message, notes: [] };
    }
}

function addKhachHangNote(payload, userInfo) {
    try {
        _assertKhNoteWrite_(userInfo);
        payload = payload || {};
        const tenKH = String(payload.tenKH || '').trim();
        const bienSo = String(payload.bienSo || '').trim();
        const loai = String(payload.loai || 'Ghi chú').trim() || 'Ghi chú';
        const noiDung = String(payload.noiDung || '').trim();
        if (!tenKH) throw new Error('Thiếu tên khách hàng.');
        if (!noiDung) throw new Error('Vui lòng nhập nội dung ghi chú.');
        const nguoiTao = userInfo ? ((userInfo.ten || '') || (userInfo.email || '')) : 'Hệ thống';
        const id = 'GC' + Utilities.getUuid().slice(0, 8).toUpperCase();
        const sh = getOrCreateKhachHangNotesSheet_();
        sh.appendRow([_dateTimeVi_(new Date()), tenKH, bienSo, loai, noiDung, nguoiTao, 'Hoạt động', id]);
        logActivity_(userInfo, 'THÊM GHI CHÚ KH', 'Khách Hàng', tenKH, loai + ': ' + noiDung.slice(0, 120));
        return { success: true, message: 'Đã thêm ghi chú cho ' + tenKH + '.', notes: getKhachHangNotes_(tenKH, bienSo) };
    } catch (e) {
        Logger.log('addKhachHangNote: ' + e.message);
        return { success: false, error: e.message };
    }
}

function deleteKhachHangNote(payload, userInfo) {
    try {
        _assertKhNoteWrite_(userInfo);
        payload = payload || {};
        const noteId = String(payload.id || payload.noteId || '').trim();
        const rowNumInput = parseInt(payload.rowNum || payload.row || 0, 10) || 0;
        const sh = getOrCreateKhachHangNotesSheet_();
        const lastRow = sh.getLastRow();
        if (lastRow < 2) throw new Error('Chưa có ghi chú để xóa.');

        let rowNum = -1;
        if (noteId) {
            const ids = sh.getRange(2, CONFIG.KH_NOTE_COL.ID + 1, lastRow - 1, 1).getValues();
            for (let i = 0; i < ids.length; i++) {
                if (String(ids[i][0] || '').trim() === noteId) {
                    rowNum = i + 2;
                    break;
                }
            }
        }
        if (rowNum === -1 && rowNumInput >= 2 && rowNumInput <= lastRow) rowNum = rowNumInput;
        if (rowNum === -1) throw new Error('Không tìm thấy ghi chú cần xóa.');

        const row = sh.getRange(rowNum, 1, 1, 8).getValues()[0];
        const tenKH = String(payload.tenKH || row[CONFIG.KH_NOTE_COL.TEN_KH] || '').trim();
        const bienSo = String(payload.bienSo || row[CONFIG.KH_NOTE_COL.BIEN_SO] || '').trim();
        const oldText = String(row[CONFIG.KH_NOTE_COL.NOI_DUNG] || '').trim();
        sh.getRange(rowNum, CONFIG.KH_NOTE_COL.TRANG_THAI + 1).setValue('Xóa');
        logActivity_(userInfo, 'XÓA GHI CHÚ KH', 'Khách Hàng', tenKH, oldText.slice(0, 120));
        return { success: true, message: 'Đã xóa ghi chú.', notes: getKhachHangNotes_(tenKH, bienSo) };
    } catch (e) {
        Logger.log('deleteKhachHangNote: ' + e.message);
        return { success: false, error: e.message };
    }
}

// ---------------------------------------------------------------
// MODULE: QUẢN LÝ KHÁCH HÀNG (14 columns)
// ---------------------------------------------------------------
function getKhachHangData_uncached_() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');
        const lastRow = sh.getLastRow();
        if (lastRow < CONFIG.KH_DATA_START) return { success: true, data: [], stats: { tongKhach: 0, tongCoc: 0, tongGiaThue: 0 } };
        // Đảm bảo sheet có ít nhất 15 cột
        const numCols = Math.min(sh.getLastColumn(), 15);
        const raw = sh.getRange(CONFIG.KH_DATA_START, 1, lastRow - CONFIG.KH_DATA_START + 1, Math.max(numCols, 13)).getValues();
        const customers = []; let tongCoc = 0, tongGiaThue = 0;
        raw.forEach(r => {
            const tenKH = String(r[CONFIG.KH_COL.TEN] || '').trim();
            if (!tenKH) return;
            const tienCoc = parseMoneyValue(r[CONFIG.KH_COL.TIEN_COC]);
            const giaThue = parseMoneyValue(r[CONFIG.KH_COL.GIA_THUE]);
            tongCoc += tienCoc; tongGiaThue += giaThue;
            const docs = parseDocsCell_(r[CONFIG.KH_COL.GIAY_TO_URLS]);
            customers.push({
                stt: customers.length + 1, tenKH,
                lienLac: String(r[CONFIG.KH_COL.LIEN_LAC] || '').trim(),
                xeThue: String(r[CONFIG.KH_COL.XE_THUE] || '').trim(),
                bienSo: String(r[CONFIG.KH_COL.BIEN_SO] || '').trim(),
                kmHienTai: String(r[CONFIG.KH_COL.KM_HIEN_TAI] || '').trim(),
                kmKeTiep: String(r[CONFIG.KH_COL.KM_KE_TIEP] || '').trim(),
                ghiChu: String(r[CONFIG.KH_COL.GHI_CHU] || '').trim(),
                giaThue, tienCoc,
                giuCoc: String(r[CONFIG.KH_COL.GIU_COC] || '').trim(),
                phuongThucCoc: _readKhPhuongThucCoc_(r, sh),
                giayToUrl: docs.length > 0 ? docs[0].url : '',  // backward compat
                docs,
                ngayBatDau: readDateFromCell(r[CONFIG.KH_COL.NGAY_BAT_DAU]),
                ngayKetThuc: readDateFromCell(r[CONFIG.KH_COL.NGAY_KET_THUC]),
                congTacVien: numCols >= 14 ? String(r[CONFIG.KH_COL.CONG_TAC_VIEN] || '').trim() : '',
                tyLeHoaHong: numCols >= 15 ? parseFloat(r[CONFIG.KH_COL.TY_LE_HOA_HONG] || 0) || 0 : 0,
                chuKy: null
            });
        });
        // ── [OPT 2026-05-20] ONE-PASS QL Thu: gộp 2 lần quét cũ thành 1 ──────
        // Trước: hàm này quét QL Thu 2 lần (kyMap + payMap), kết quả block 1 bị block 2 ghi đè.
        // Sau: chỉ quét 1 lần để build payMap, đồng thời cập nhật max ngayKetThuc theo các kỳ thuê.
        var payMap = {};
        var maxKtByKh = {}; // key tenKH lowercase → Date của ngày kết thúc lớn nhất
        try {
            var thuShCk = ss.getSheetByName(TC_CONFIG.SHEET_TC || 'QL Thu');
            if (thuShCk) {
                var tcStart = TC_CONFIG.TC_START || 2;
                var thuLR = thuShCk.getLastRow();
                if (thuLR >= tcStart) {
                    var thuCols = Math.min(thuShCk.getLastColumn(), 10);
                    if (thuCols >= 6) {
                        var thuRaw = thuShCk.getRange(tcStart, 1, thuLR - tcStart + 1, thuCols).getValues();
                        thuRaw.forEach(function (r) {
                            var kh2 = String(r[4] || '').trim();
                            var dm2 = String(r[2] || '').trim();
                            var amt = parseMoneyValue(r[5]);
                            if (!kh2 || !amt || !isRentalRevenueCategory_(dm2)) return;
                            var key2 = kh2.toLowerCase();
                            var batDau = thuCols >= 9 ? readDateFromCell(r[8]) : '';
                            var ketThuc = thuCols >= 10 ? readDateFromCell(r[9]) : '';
                            (payMap[key2] = payMap[key2] || []).push({
                                ngay: readDateFromCell(r[0]),
                                soTien: amt,
                                batDau: batDau,
                                ketThuc: ketThuc,
                                dm: dm2
                            });
                            if (ketThuc) {
                                var d = tryParseDate(ketThuc);
                                if (d && (!maxKtByKh[key2] || d > maxKtByKh[key2])) maxKtByKh[key2] = d;
                            }
                        });
                    }
                }
            }
        } catch (_thuScanErr) { Logger.log('one-pass thu scan err: ' + _thuScanErr.message); }

        // [v8 2026-05-15] FIX SYNC HH: Lấy ngày kết thúc LỚN NHẤT giữa KH master và các kỳ Thu thuê
        // (Trước đây ở block thứ nhất; nay áp dụng trực tiếp lên từng KH trước khi tính chu kỳ.)
        customers.forEach(function (kh) {
            var key = (kh.tenKH || '').trim().toLowerCase();
            var mx = maxKtByKh[key];
            if (mx) {
                var cur = tryParseDate(kh.ngayKetThuc);
                if (!cur || mx > cur) {
                    kh.ngayKetThuc = ('0' + mx.getDate()).slice(-2) + '/' + ('0' + (mx.getMonth() + 1)).slice(-2) + '/' + mx.getFullYear();
                }
            }
        });

        if (thuShCk) {
            // Helper
            function addM_(d, n) {
                var r = new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
                if (r.getDate() !== d.getDate()) r = new Date(r.getFullYear(), r.getMonth(), 0);
                return r;
            }
            function pD_(s) {
                if (!s) return null;
                var p = String(s).split('/');
                if (p.length !== 3) return null;
                var d = new Date(+p[2], +p[1] - 1, +p[0]);
                return isNaN(d) ? null : d;
            }
            function fD_(d) { return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }

            customers.forEach(function (kh) {
                var bd = pD_(kh.ngayBatDau);
                if (!bd) { kh.chuKy = { dsKyChuKy: [], soKy: 0, soKyDaTra: 0, tongDaTra: 0, kyTiepTheo: '', trangThai: 'Chưa có GD' }; return; }
                var now2 = new Date(); now2.setHours(0, 0, 0, 0);
                var kt = pD_(kh.ngayKetThuc) || now2;
                var genTo = kt < now2 ? kt : now2;

                // Sinh danh sách kỳ từ ngày BD đến hôm nay
                var kyArr = [];
                for (var i = 0; i <= 60; i++) {
                    var ks = addM_(bd, i), ke = addM_(bd, i + 1);
                    if (ks > genTo) break;
                    kyArr.push({ start: ks, end: ke, startStr: fD_(ks), endStr: fD_(ke) });
                }

                // [FIX 2026-05] Match khoản thu với kỳ — hỗ trợ giao dịch trả nhiều tháng (vd 13/12 → 13/05).
                // Trước đây chỉ match 1 kỳ theo batDau gần ks → giao dịch 5 tháng chỉ đánh dấu 1 kỳ paid → app báo "1/6 kỳ" sai.
                // Sửa: nếu giao dịch có cả batDau + ketThuc, đánh dấu paid cho mọi kỳ có start nằm trong [batDau-3, ketThuc-3] ngày.
                var pays = (payMap[kh.tenKH.trim().toLowerCase()] || []).slice();
                var DAY = 86400000, TOL = 3 * DAY;
                // Pre-parse batDau/ketThuc của mỗi giao dịch
                var paysP = pays.map(function (p) {
                    var pBd = pD_(p.batDau) || pD_(p.ngay);
                    var pKt = pD_(p.ketThuc);
                    // Nếu chỉ có 1 ngày → coi như giao dịch 1 tháng từ pBd
                    if (pBd && !pKt) pKt = addM_(pBd, 1);
                    return { raw: p, bd: pBd, kt: pKt };
                });
                var dsKy = kyArr.map(function (ky, ki) {
                    // Tìm giao dịch đầu tiên có khoảng [bd,kt] phủ kỳ này (lệch ±3 ngày)
                    var match = null;
                    for (var j = 0; j < paysP.length; j++) {
                        var pp = paysP[j];
                        if (!pp.bd || !pp.kt) continue;
                        // Kỳ được coi là "paid" nếu start kỳ nằm trong [bd-TOL, kt-TOL]
                        if (ky.start >= pp.bd - TOL && ky.start <= pp.kt - TOL) { match = pp; break; }
                    }
                    var paid = !!match, pInfo = match ? match.raw : null;
                    var st = 'upcoming';
                    if (paid) st = 'paid';
                    else {
                        var dEnd = Math.ceil((ky.end - now2) / DAY);
                        if (ky.end < now2) st = 'overdue';
                        else if (dEnd <= 7) st = 'due-soon';
                    }
                    return {
                        kyNum: ki + 1, startStr: ky.startStr, endStr: ky.endStr,
                        paid: paid, status: st,
                        soTien: paid ? (kh.giaThue || pInfo.soTien || 0) : (kh.giaThue || 0),
                        ngayTra: paid ? (pInfo.ngay || '') : '', dm: paid ? (pInfo.dm || 'Tiền thuê tháng') : ''
                    };
                });

                var soKyDaTra = dsKy.filter(function (k) { return k.paid; }).length;
                // [FIX 2026-05] Tổng đã trả = sum số tiền giao dịch thực tế, không phải cộng theo kỳ
                // (vì 1 giao dịch trả nhiều tháng → nhiều kỳ paid, không nên double-count).
                var tongDaTra = pays.reduce(function (s, p) { return s + (parseInt(p.soTien, 10) || 0); }, 0);
                var nextKy = dsKy.find(function (k) { return !k.paid; });
                var kyTiep = nextKy ? nextKy.startStr + ' → ' + nextKy.endStr : '';

                var tt = 'Đang thuê';
                if (kt) { var df = Math.ceil((kt - now2) / 86400000); if (df < 0) tt = 'Đã hết hạn'; else if (df <= 7) tt = 'Sắp đến hạn'; }
                if (dsKy.length === 0) tt = 'Chưa có GD';

                kh.chuKy = {
                    dsKyChuKy: dsKy, soKy: dsKy.length, soKyDaTra: soKyDaTra,
                    tongDaTra: tongDaTra, kyTiepTheo: kyTiep, trangThai: tt
                };
            });
        }
        return { success: true, data: customers, stats: { tongKhach: customers.length, tongCoc, tongGiaThue } };
    } catch (e) { return { success: false, error: e.message }; }
}

function getKhachHangData(_force) {
    try {
        const cache = CacheService.getScriptCache();
        if (_force) { try { cache.remove(JMB_CACHE.KH_ALL); } catch (_) { } }
        else {
            try {
                const cached = cache.get(JMB_CACHE.KH_ALL);
                if (cached) return JSON.parse(cached);
            } catch (_ce) { }
        }
        const result = getKhachHangData_uncached_();
        if (result && result.success) {
            // [OPT 2026-05-20] TTL 300s (cũ 180s) — cache sẽ tự được clear khi có sửa Xe/KH/Thu/Chi
            try { cache.put(JMB_CACHE.KH_ALL, JSON.stringify(result), 300); } catch (_pe) { }
        }
        return result;
    } catch (e) { return { success: false, error: e.message }; }
}


/**
 * [FIXED 2026-05-13] Lazy load chu kỳ thanh toán cho danh sách KH.
 * Front-end gọi hàm này sau khi đã render bảng KH để cập nhật chuKy.
 * Hiện tại getKhachHangData đã trả về chuKy sẵn → hàm này chỉ là safety net
 * để tránh lỗi "[fn] is not a function".
 *
 * @param {Array} khList - Mảng {tenKH, ngayBatDau, ngayKetThuc, giaThue}
 * @return {{success:boolean, data?:Object<string,Object>, error?:string}}
 */
function getKhachHangChuKy(khList) {
    try {
        if (!Array.isArray(khList) || !khList.length) {
            return { success: true, data: {} };
        }
        // Tận dụng logic đã có trong getKhachHangData() để tính lại chuKy
        const full = getKhachHangData();
        if (!full || !full.success) {
            return { success: false, error: (full && full.error) || 'Không lấy được dữ liệu KH.' };
        }
        const map = {};
        (full.data || []).forEach(kh => {
            if (kh && kh.tenKH && kh.chuKy) {
                map[kh.tenKH] = kh.chuKy;
            }
        });
        return { success: true, data: map };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Upload 1 file lên Drive folder cấu hình.
 * @param {string} base64Data - Nội dung file ở dạng base64.
 * @param {string} fileName   - Tên file gốc (vd: "img_001.png"). Dùng để lấy extension.
 * @param {string} mimeType   - MIME type.
 * @param {string} [overrideName] - Nếu truyền vào, file sẽ được rename theo tên này
 *                                  (extension được tự động giữ từ fileName gốc).
 *                                  Ví dụ overrideName='Richard012' + fileName='photo.png'
 *                                  → file trên Drive sẽ tên "Richard012.png".
 */
function uploadFileToDrive(base64Data, fileName, mimeType, overrideName) {
    try {
        if (!CONFIG.DRIVE_FOLDER_ID || CONFIG.DRIVE_FOLDER_ID === 'PASTE_YOUR_FOLDER_ID_HERE') throw new Error('Chưa cấu hình DRIVE_FOLDER_ID.');
        if (Math.round(base64Data.length * 0.75) > CONFIG.MAX_FILE_SIZE) throw new Error('File quá lớn.');
        // [v2] Determine final filename
        let finalName = String(fileName || 'file');
        if (overrideName && String(overrideName).trim()) {
            const baseName = String(overrideName).trim();
            // Lấy extension từ fileName gốc (giữ nguyên đuôi file)
            const m = String(fileName || '').match(/\.([a-zA-Z0-9]{1,8})$/);
            const ext = m ? m[1].toLowerCase() : '';
            finalName = ext ? (baseName + '.' + ext) : baseName;
        }
        const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, finalName);
        const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return { success: true, url: file.getUrl(), fileId: file.getId(), savedName: finalName };
    } catch (e) { Logger.log('uploadFileToDrive: ' + e.message); return { success: false, error: e.message }; }
}

/**
 * [v2] Sinh tên file theo định dạng "<TenKH><STT 3 chữ số>".
 * Ví dụ: "Richard001", "Richard002"... Index dựa trên số file đã có của KH đó.
 * @param {string} tenKH - Tên khách hàng (sẽ được sanitize: bỏ dấu, bỏ khoảng trắng).
 * @param {Array}  existingDocs - Mảng giấy tờ hiện có (mỗi item có .name) để xác định index tiếp theo.
 * @param {number} [offset=0] - Số file đang upload trước đó trong cùng batch (để tránh trùng).
 */
function buildDocFileBaseName_(tenKH, existingDocs, offset) {
    // Sanitize tên: bỏ dấu tiếng Việt, ký tự đặc biệt, khoảng trắng
    const raw = String(tenKH || '').trim();
    let base = raw
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')      // bỏ dấu
        .replace(/[đĐ]/g, 'd').replace(/[Đ]/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '')                           // chỉ giữ chữ + số
        .trim();
    if (!base) base = 'KH';
    // Tìm số thứ tự lớn nhất hiện có trong các tên file kiểu "Tencua001"
    const docs = Array.isArray(existingDocs) ? existingDocs : [];
    const re = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d{1,5})(?:\\.[^.]+)?$', 'i');
    let maxIdx = 0;
    docs.forEach(d => {
        const n = String(d && d.name || '');
        const m = n.match(re);
        if (m) { const num = parseInt(m[1], 10); if (num > maxIdx) maxIdx = num; }
    });
    const next = maxIdx + 1 + (offset || 0);
    return base + String(next).padStart(3, '0');
}

function addKhachHang(formData, userInfo) {
    try {
        assertXeKhWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');
        if (!formData.tenKH || !formData.tenKH.trim()) throw new Error('Tên khách hàng không được để trống.');
        if (!formData.bienSo) throw new Error('Vui lòng chọn xe.');
        let docsJson = '';
        // [v2] Hỗ trợ cả 2 dạng: formData.files (array nhiều file) + backward compat fileBase64 (1 file)
        const filesArr = Array.isArray(formData.files) ? formData.files : [];
        const docsAccumulated = [];
        if (filesArr.length > 0) {
            // Multiple files - auto rename theo "TenKH###"
            filesArr.forEach((f, i) => {
                if (!f || !f.fileBase64 || f.fileBase64.length < 100 || !f.fileName || !f.fileMimeType) return;
                try {
                    const base = buildDocFileBaseName_(formData.tenKH, docsAccumulated, 0);
                    const r = uploadFileToDrive(f.fileBase64, f.fileName, f.fileMimeType, base);
                    if (r.success) {
                        docsAccumulated.push({ url: r.url, name: r.savedName || base, date: formatDate(new Date()) });
                    }
                } catch (e) { Logger.log('Upload skip file ' + i + ': ' + e.message); }
            });
        } else {
            // Backward compat: 1 file đơn lẻ qua fileBase64/fileName/fileMimeType
            const hasFile = formData.fileBase64 && formData.fileBase64.length > 100 && formData.fileName && formData.fileMimeType;
            if (hasFile) {
                try {
                    const base = buildDocFileBaseName_(formData.tenKH, docsAccumulated, 0);
                    const r = uploadFileToDrive(formData.fileBase64, formData.fileName, formData.fileMimeType, base);
                    if (r.success) {
                        docsAccumulated.push({ url: r.url, name: r.savedName || base, date: formatDate(new Date()) });
                    }
                } catch (e) { Logger.log('Upload skip: ' + e.message); }
            }
        }
        if (docsAccumulated.length > 0) docsJson = serializeDocsCell_(docsAccumulated);
        sh.appendRow([
            formData.tenKH || '', formData.lienLac || '', formData.xeThue || '', formData.bienSo || '',
            formData.kmHienTai || '', formData.kmKeTiep || '', formData.ghiChu || '',
            formData.giaThue || 0, formData.tienCoc || 0, formData.giuCoc || '',
            docsJson,
            formatDateForSheet(formData.ngayBatDau || ''), formatDateForSheet(formData.ngayKetThuc || ''),
            formData.congTacVien || '',
            parseFloat(formData.tyLeHoaHong || 0) || 0
        ]);
        _writeKhPhuongThucCoc_(sh, sh.getLastRow(), formData.phuongThucCoc || formData.giuCoc || '');
        clearXeKhCache_();
        logActivity_(userInfo, 'THÊM KH', 'Khách Hàng', formData.tenKH, 'Xe: ' + formData.bienSo + ', CTV: ' + (formData.congTacVien || '') + (docsAccumulated.length > 0 ? ', Giấy tờ: ' + docsAccumulated.length + ' file' : ''));
        return { success: true, uploadedCount: docsAccumulated.length, message: 'Thêm khách hàng "' + formData.tenKH + '" thành công!' + (docsAccumulated.length > 0 ? ' Đã upload ' + docsAccumulated.length + ' giấy tờ.' : '') };
    } catch (e) { Logger.log('addKhachHang: ' + e.message); return { success: false, error: e.message }; }
}

function findKhachHangRow_(customerName, bienSo = '') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(CONFIG.SHEET_KH);
    if (!sh) return -1;
    const lastRow = sh.getLastRow();
    if (lastRow < CONFIG.KH_DATA_START) return -1;
    const data = sh.getRange(CONFIG.KH_DATA_START, 1, lastRow - CONFIG.KH_DATA_START + 1, sh.getLastColumn()).getValues();
    const kw = customerName.trim().toLowerCase();
    const plateKw = String(bienSo || '').trim().toLowerCase();
    
    if (plateKw) {
        for (let i = 0; i < data.length; i++) {
             if (String(data[i][CONFIG.KH_COL.TEN] || '').trim().toLowerCase() === kw &&
                 String(data[i][CONFIG.KH_COL.BIEN_SO] || '').trim().toLowerCase() === plateKw) {
                 return CONFIG.KH_DATA_START + i;
             }
        }
    }
    
    for (let i = 0; i < data.length; i++) {
         if (String(data[i][CONFIG.KH_COL.TEN] || '').trim().toLowerCase() === kw) {
             return CONFIG.KH_DATA_START + i;
         }
    }
    return -1;
}

function updateKhachHang(originalName, formData, userInfo) {
    try {
        assertXeKhWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');
        const rowNum = findKhachHangRow_(originalName, formData.bienSo);
        if (rowNum === -1) throw new Error('Không tìm thấy khách hàng: "' + originalName + '"');
        // Giữ docs cũ
        const currentDocsRaw = String(sh.getRange(rowNum, CONFIG.KH_COL.GIAY_TO_URLS + 1).getValue() || '').trim();
        const existing = parseDocsCell_(currentDocsRaw);
        let docsJson = currentDocsRaw;
        
        // [New] If frontend explicitly provides giayToUrls, use it
        let uploadedCount = 0;
        if (formData.giayToUrls !== undefined) {
            docsJson = formData.giayToUrls;
        } else {
            // [v2] Hỗ trợ cả 2 dạng: formData.files (array) + backward compat fileBase64 (1 file)
            const filesArr = Array.isArray(formData.files) ? formData.files : [];
            const tenKHForName = formData.tenKH || originalName;
            if (filesArr.length > 0) {
                filesArr.forEach((f, i) => {
                    if (!f || !f.fileBase64 || f.fileBase64.length < 100 || !f.fileName || !f.fileMimeType) return;
                    try {
                        const base = buildDocFileBaseName_(tenKHForName, existing, 0);
                        const r = uploadFileToDrive(f.fileBase64, f.fileName, f.fileMimeType, base);
                        if (r.success) {
                            existing.push({ url: r.url || r.fileUrl, name: r.savedName || base, date: formatDate(new Date()) });
                            uploadedCount++;
                        }
                    } catch (e) { Logger.log('Upload skip file ' + i + ': ' + e.message); }
                });
                docsJson = serializeDocsCell_(existing);
            } else {
                const hasFile = formData.fileBase64 && formData.fileBase64.length > 100 && formData.fileName && formData.fileMimeType;
                if (hasFile) {
                    try {
                        const base = buildDocFileBaseName_(tenKHForName, existing, 0);
                        const r = uploadFileToDrive(formData.fileBase64, formData.fileName, formData.fileMimeType, base);
                        if (r.success) {
                            existing.push({ url: r.url || r.fileUrl, name: r.savedName || base, date: formatDate(new Date()) });
                            uploadedCount++;
                            docsJson = serializeDocsCell_(existing);
                        }
                    } catch (e) { Logger.log('Upload skip: ' + e.message); }
                }
            }
        }
        sh.getRange(rowNum, 1, 1, 15).setValues([[
            formData.tenKH || '', formData.lienLac || '', formData.xeThue || '', formData.bienSo || '',
            formData.kmHienTai || '', formData.kmKeTiep || '', formData.ghiChu || '',
            formData.giaThue || 0, formData.tienCoc || 0, formData.giuCoc || '',
            docsJson,
            formatDateForSheet(formData.ngayBatDau || ''), formatDateForSheet(formData.ngayKetThuc || ''),
            formData.congTacVien || '',
            parseFloat(formData.tyLeHoaHong || 0) || 0
        ]]);
        _writeKhPhuongThucCoc_(sh, rowNum, formData.phuongThucCoc || formData.giuCoc || '');
        clearXeKhCache_();
        logActivity_(userInfo, 'SỬA KH', 'Khách Hàng', formData.tenKH || originalName, 'CTV: ' + (formData.congTacVien || '') + (uploadedCount > 0 ? ', Thêm ' + uploadedCount + ' giấy tờ' : ''));
        return { success: true, uploadedCount, message: 'Cập nhật khách hàng "' + (formData.tenKH || originalName) + '" thành công!' + (uploadedCount > 0 ? ' Đã thêm ' + uploadedCount + ' giấy tờ.' : '') };
    } catch (e) { Logger.log('updateKhachHang: ' + e.message); return { success: false, error: e.message }; }
}

const _KH_DELETED_KEY_ = 'jmb_deleted_kh_v1';
function _getDeletedKhSet_() { try { return new Set(JSON.parse(PropertiesService.getScriptProperties().getProperty(_KH_DELETED_KEY_) || '[]')); } catch (e) { return new Set(); } }
function _addDeletedKh_(name) { try { const s = _getDeletedKhSet_(); s.add(String(name || '').trim().toLowerCase()); PropertiesService.getScriptProperties().setProperty(_KH_DELETED_KEY_, JSON.stringify(Array.from(s).slice(-500))); } catch (e) { } }
function _isKhDeleted_(name) { try { return _getDeletedKhSet_().has(String(name || '').trim().toLowerCase()); } catch (e) { return false; } }
function deleteKhachHang(customerName, userInfo) {
    try {
        assertXeKhWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');
        const rowNum = findKhachHangRow_(customerName);
        if (rowNum === -1) throw new Error('Không tìm thấy khách hàng: "' + customerName + '"');
        sh.deleteRow(rowNum);
        _addDeletedKh_(customerName);
        clearXeKhCache_();
        logActivity_(userInfo, 'XÓA KH', 'Khách Hàng', customerName, '');
        return { success: true, message: 'Đã xóa khách hàng "' + customerName + '".' };
    } catch (e) { Logger.log('deleteKhachHang: ' + e.message); return { success: false, error: e.message }; }
}

function updateRentalDates(tenKH, ngayBD, ngayKT, userInfo) {
    try {
        assertThuChiWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet KH');
        const rowNum = findKhachHangRow_(tenKH);
        if (rowNum === -1) throw new Error('Không tìm thấy khách hàng: "' + tenKH + '"');
        if (ngayBD) sh.getRange(rowNum, CONFIG.KH_COL.NGAY_BAT_DAU + 1).setValue(formatDateForSheet(ngayBD));
        if (ngayKT) sh.getRange(rowNum, CONFIG.KH_COL.NGAY_KET_THUC + 1).setValue(formatDateForSheet(ngayKT));
        clearXeKhCache_();
        return { success: true, message: 'Đã cập nhật thời gian thuê của "' + tenKH + '".' };
    } catch (e) { Logger.log('updateRentalDates: ' + e.message); return { success: false, error: e.message }; }
}

/** [v2] Thêm 1 giấy tờ mới vào danh sách của khách hàng - file được rename "TenKH###". */
function addKhachHangDoc(tenKH, fileBase64, fileName, mimeType, userInfo) {
    try {
        assertXeKhWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet KH');
        const rowNum = findKhachHangRow_(tenKH);
        if (rowNum === -1) throw new Error('Không tìm thấy khách hàng: "' + tenKH + '"');
        // Đọc docs hiện có để tính số thứ tự kế tiếp
        const cellVal = String(sh.getRange(rowNum, CONFIG.KH_COL.GIAY_TO_URLS + 1).getValue() || '').trim();
        const docs = parseDocsCell_(cellVal);
        const baseName = buildDocFileBaseName_(tenKH, docs, 0);
        const r = uploadFileToDrive(fileBase64, fileName, mimeType, baseName);
        if (!r.success) throw new Error(r.error);
        docs.push({ url: r.url, name: r.savedName || baseName, date: formatDate(new Date()) });
        sh.getRange(rowNum, CONFIG.KH_COL.GIAY_TO_URLS + 1).setValue(serializeDocsCell_(docs));
        logActivity_(userInfo, 'THÊM GIẤY TỜ', 'Khách Hàng', tenKH, 'File: ' + (r.savedName || baseName));
        return { success: true, url: r.url, docs, savedName: r.savedName || baseName, message: 'Đã thêm giấy tờ "' + (r.savedName || baseName) + '".' };
    } catch (e) { Logger.log('addKhachHangDoc: ' + e.message); return { success: false, error: e.message }; }
}

/**
 * [v2] Thêm NHIỀU giấy tờ cùng lúc cho 1 khách hàng. Mỗi file được rename theo định dạng "TenKH###".
 * @param {string} tenKH
 * @param {Array<{fileBase64:string,fileName:string,fileMimeType:string}>} files
 */
function addKhachHangDocs(tenKH, files, userInfo) {
    try {
        assertXeKhWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet KH');
        const rowNum = findKhachHangRow_(tenKH);
        if (rowNum === -1) throw new Error('Không tìm thấy khách hàng: "' + tenKH + '"');
        if (!Array.isArray(files) || files.length === 0) throw new Error('Chưa có file nào để upload.');
        const cellVal = String(sh.getRange(rowNum, CONFIG.KH_COL.GIAY_TO_URLS + 1).getValue() || '').trim();
        const docs = parseDocsCell_(cellVal);
        let uploadedCount = 0;
        const errors = [];
        files.forEach((f, i) => {
            if (!f || !f.fileBase64 || !f.fileName || !f.fileMimeType) {
                errors.push('File ' + (i + 1) + ': thiếu dữ liệu'); return;
            }
            try {
                const baseName = buildDocFileBaseName_(tenKH, docs, 0);
                const r = uploadFileToDrive(f.fileBase64, f.fileName, f.fileMimeType, baseName);
                if (r.success) {
                    docs.push({ url: r.url, name: r.savedName || baseName, date: formatDate(new Date()) });
                    uploadedCount++;
                } else {
                    errors.push('File ' + (i + 1) + ': ' + (r.error || 'lỗi'));
                }
            } catch (e) { errors.push('File ' + (i + 1) + ': ' + e.message); }
        });
        if (uploadedCount > 0) {
            sh.getRange(rowNum, CONFIG.KH_COL.GIAY_TO_URLS + 1).setValue(serializeDocsCell_(docs));
            try { clearXeKhCache_(); } catch (_) { }
            SpreadsheetApp.flush();
        }
        logActivity_(userInfo, 'THÊM GIẤY TỜ', 'Khách Hàng', tenKH, 'Đã upload ' + uploadedCount + '/' + files.length + ' file');
        return {
            success: uploadedCount > 0,
            uploadedCount,
            docs,
            errors: errors.length > 0 ? errors : null,
            message: uploadedCount > 0
                ? ('Đã thêm ' + uploadedCount + ' giấy tờ' + (errors.length > 0 ? ' (có ' + errors.length + ' file lỗi)' : '.'))
                : 'Không upload được file nào.'
        };
    } catch (e) { Logger.log('addKhachHangDocs: ' + e.message); return { success: false, error: e.message }; }
}

/** Xóa 1 giấy tờ theo index. */
function removeKhachHangDoc(tenKH, docIndex, userInfo) {
    try {
        assertXeKhWrite_(userInfo);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet KH');
        const rowNum = findKhachHangRow_(tenKH);
        if (rowNum === -1) throw new Error('Không tìm thấy khách hàng: "' + tenKH + '"');
        const cellVal = String(sh.getRange(rowNum, CONFIG.KH_COL.GIAY_TO_URLS + 1).getValue() || '').trim();
        const docs = parseDocsCell_(cellVal);
        if (docIndex < 0 || docIndex >= docs.length) throw new Error('Giấy tờ không hợp lệ.');
        const removed = docs.splice(docIndex, 1)[0];
        sh.getRange(rowNum, CONFIG.KH_COL.GIAY_TO_URLS + 1).setValue(serializeDocsCell_(docs));
        logActivity_(userInfo, 'XÓA GIẤY TỜ', 'Khách Hàng', tenKH, 'File: ' + (removed.name || ''));
        return { success: true, docs, message: 'Đã xóa giấy tờ.' };
    } catch (e) { Logger.log('removeKhachHangDoc: ' + e.message); return { success: false, error: e.message }; }
}

// ---------------------------------------------------------------
// MODULE: CHI TIẾT KHÁCH HÀNG
// ---------------------------------------------------------------
function getCustomerDetails(customerName, bienSoHint) {
    // [OPT 2026-05-20] Cache 60s cho popup khách hàng — đây là RPC chậm nhất khi mở popup
    // do quét toàn bộ QL Thu + QL Chi + QL Ghi Chú KH. Cache tự invalidate khi sửa Thu/Chi/KH
    // qua việc bump KH_DETAIL_VER (xem clearXeKhCache_/clearThuChiRelatedCache_).
    const _cacheVer = _getKhDetailCacheVersion_();
    const _cacheKey = 'KH_DETAIL_v' + _cacheVer + ':' + String(customerName || '').trim().toLowerCase() + '|' + String(bienSoHint || '').trim().toLowerCase();
    try {
        const _cached = CacheService.getScriptCache().get(_cacheKey);
        if (_cached) return JSON.parse(_cached);
    } catch (_) { }
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');
        const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
        if (lastRow < CONFIG.KH_DATA_START) throw new Error('Sheet chưa có dữ liệu.');
        const allHeaders = sh.getRange(CONFIG.KH_DATA_START - 1, 1, 1, lastCol).getValues()[0];
        const allData = sh.getRange(CONFIG.KH_DATA_START, 1, lastRow - CONFIG.KH_DATA_START + 1, lastCol).getValues();
        // [FIX 2026-05] Trường hợp 1 khách thuê nhiều xe (mỗi xe 1 dòng trong QL KH):
        // ưu tiên match theo cặp (Tên + Biển số) thay vì chỉ match theo tên.
        // Trước đây findIndex chỉ theo tên → luôn trả về dòng KH đầu tiên trong sheet, gây sai popup.
        const _nameKey_ = _textKey_(customerName);
        const _plateHintKey_ = _plateKey_(bienSoHint || '');
        let rowIndex = -1;
        if (_plateHintKey_) {
            rowIndex = allData.findIndex(r =>
                _textKey_(r[CONFIG.KH_COL.TEN]) === _nameKey_ &&
                _plateKey_(r[CONFIG.KH_COL.BIEN_SO]) === _plateHintKey_
            );
        }
        if (rowIndex < 0) {
            rowIndex = allData.findIndex(r => _textKey_(r[CONFIG.KH_COL.TEN]) === _nameKey_);
        }
        const row = rowIndex >= 0 ? allData[rowIndex] : null;
        // [v4] Nếu không có trong QL KH → vẫn tạo profile tối giản, tìm lịch sử từ TC
        const isGuestOnly = !row;
        const thongTin = isGuestOnly ? {
            tenKH: customerName.trim(),
            lienLac: '', xeThue: '', bienSo: '',
            giaThue: 0, tienCoc: 0, giuCoc: '', phuongThucCoc: '',
            kmHienTai: '', kmKeTiep: '',
            ngayBatDau: '', ngayKetThuc: '',
            congTacVien: '', tyLeHoaHong: 0,
            isGuestOnly: true
        } : {
            tenKH: String(row[CONFIG.KH_COL.TEN] || '').trim(),
            lienLac: String(row[CONFIG.KH_COL.LIEN_LAC] || '').trim(),
            xeThue: String(row[CONFIG.KH_COL.XE_THUE] || '').trim(),
            bienSo: String(row[CONFIG.KH_COL.BIEN_SO] || '').trim(),
            giaThue: parseMoneyValue(row[CONFIG.KH_COL.GIA_THUE]),
            tienCoc: parseMoneyValue(row[CONFIG.KH_COL.TIEN_COC]),
            giuCoc: String(row[CONFIG.KH_COL.GIU_COC] || '').trim(),
            phuongThucCoc: _readKhPhuongThucCoc_(row, sh),
            kmHienTai: String(row[CONFIG.KH_COL.KM_HIEN_TAI] || '').trim(),
            kmKeTiep: String(row[CONFIG.KH_COL.KM_KE_TIEP] || '').trim(),
            ngayBatDau: readDateFromCell(row[CONFIG.KH_COL.NGAY_BAT_DAU]),
            ngayKetThuc: readDateFromCell(row[CONFIG.KH_COL.NGAY_KET_THUC]),
            congTacVien: lastCol >= 14 ? String(row[CONFIG.KH_COL.CONG_TAC_VIEN] || '').trim() : '',
            tyLeHoaHong: lastCol >= 15 ? parseFloat(row[CONFIG.KH_COL.TY_LE_HOA_HONG] || 0) || 0 : 0
        };
        // [OPT 2026-05-20] GỘP 2 lần quét QL Thu thành 1.
        // Trước: _findLatestLongRentalRecordForCustomer_ quét QL Thu, rồi bên dưới lại quét QL Thu để build lichSu → 2x.
        // Sau: 1 pass quét QL Thu duy nhất, đồng thời tính latestRental + lichSu.
        let latestRental = null;
        let bestSamePlate = null;
        let bestAnyPlate = null;
        const _wantedPlateKey = _plateKey_((thongTin && thongTin.bienSo) || bienSoHint || '');
        const lichSu = []; let tongDaThanhToan = 0;
        const _nameKeyForScan = _textKey_(customerName);
        const tcSh = ss.getSheetByName(TC_CONFIG.SHEET_TC);
        if (tcSh) {
            const tcLR = tcSh.getLastRow();
            if (tcLR >= TC_CONFIG.TC_START) {
                const ncols = Math.min(tcSh.getLastColumn(), 12);
                const tcRaw = tcSh.getRange(TC_CONFIG.TC_START, 1, tcLR - TC_CONFIG.TC_START + 1, ncols).getValues();
                tcRaw.forEach((r, idx) => {
                    const loai = String(r[TC_CONFIG.COL.LOAI] || '').trim();
                    const khach = String(r[TC_CONFIG.COL.KHACH] || '').trim();
                    if (_textKey_(khach) !== _nameKeyForScan) return;
                    const soTien = parseMoneyValue(r[TC_CONFIG.COL.SO_TIEN]);
                    const dm = String(r[TC_CONFIG.COL.DANH_MUC] || '').trim();
                    const batDau = ncols >= 9 ? readDateFromCell(r[TC_CONFIG.COL.BAT_DAU]) : '';
                    const ketThuc = ncols >= 10 ? readDateFromCell(r[TC_CONFIG.COL.KET_THUC]) : '';

                    // Lịch sử Thu
                    if (loai === 'Thu' && soTien > 0) {
                        lichSu.push({
                            thoiGian: readDateFromCell(r[TC_CONFIG.COL.NGAY]),
                            danhMuc: dm,
                            chiNhanh: ncols >= 8 ? String(r[TC_CONFIG.COL.CHI_NHANH] || '').trim() : '',
                            ghiChu: String(r[TC_CONFIG.COL.GHI_CHU] || '').trim(),
                            batDau: batDau, ketThuc: ketThuc, soTien, nguon: 'TC'
                        });
                        tongDaThanhToan += soTien;
                    }

                    // Track kỳ thuê dài hạn mới nhất (logic _findLatestLongRentalRecordForCustomer_)
                    if (loai === 'Thu' && isRentalRevenueCategory_(dm) && (batDau || ketThuc)) {
                        const endDate = tryParseDate(ketThuc);
                        const bienSoRec = String(r[TC_CONFIG.COL.BIEN_SO] || '').trim();
                        const rec = {
                            rowNum: TC_CONFIG.TC_START + idx,
                            ngay: readDateFromCell(r[TC_CONFIG.COL.NGAY]),
                            loai: loai, danhMuc: dm, bienSo: bienSoRec,
                            khach: khach, soTien: soTien,
                            ghiChu: String(r[TC_CONFIG.COL.GHI_CHU] || '').trim(),
                            chiNhanh: ncols >= 8 ? String(r[TC_CONFIG.COL.CHI_NHANH] || '').trim() : '',
                            batDau: batDau, ketThuc: ketThuc, endDate: endDate,
                            congTacVien: ncols >= 11 ? String(r[TC_CONFIG.COL.CONG_TAC_VIEN_TC] || '').trim() : '',
                            tyLeHoaHong: ncols >= 12 ? parseFloat(r[TC_CONFIG.COL.TY_LE_HOA_HONG_TC] || 0) || 0 : 0
                        };
                        bestAnyPlate = _chooseLatestRentalRecord_(bestAnyPlate, rec);
                        if (!_wantedPlateKey || !bienSoRec || _plateKey_(bienSoRec) === _wantedPlateKey) {
                            bestSamePlate = _chooseLatestRentalRecord_(bestSamePlate, rec);
                        }
                    }
                });
            }
        }
        latestRental = bestSamePlate || bestAnyPlate;

        // [PATCH] Popup khách hàng luôn ưu tiên kỳ thuê dài hạn mới nhất từ QL Thu.
        if (latestRental) {
            if (latestRental.batDau) thongTin.ngayBatDau = latestRental.batDau;
            if (latestRental.ketThuc) thongTin.ngayKetThuc = latestRental.ketThuc;
            if (latestRental.bienSo) thongTin.bienSo = latestRental.bienSo;
            if (latestRental.soTien > 0 && !thongTin.giaThue) thongTin.giaThue = latestRental.soTien;
            if (latestRental.congTacVien) thongTin.congTacVien = latestRental.congTacVien;
            if (latestRental.tyLeHoaHong > 0) thongTin.tyLeHoaHong = latestRental.tyLeHoaHong;

            const latestXeName = _cleanVehicleNameFromNote_(latestRental.ghiChu);
            if (latestXeName && (!thongTin.xeThue || thongTin.xeThue === thongTin.bienSo)) thongTin.xeThue = latestXeName;

            // [OPT 2026-05-20] Write-back vào QL KH KHÔNG còn flush() để không chặn response popup.
            // Apps Script tự commit khi handler kết thúc. Cache KH cũ sẽ tự clear ở pass này.
            if (!isGuestOnly && rowIndex >= 0) {
                const sheetRowNum = CONFIG.KH_DATA_START + rowIndex;
                let wroteBack = false;
                const oldBD = readDateFromCell(row[CONFIG.KH_COL.NGAY_BAT_DAU]);
                const oldKT = readDateFromCell(row[CONFIG.KH_COL.NGAY_KET_THUC]);
                if ((latestRental.batDau && oldBD !== latestRental.batDau) || (latestRental.ketThuc && oldKT !== latestRental.ketThuc)) {
                    sh.getRange(sheetRowNum, CONFIG.KH_COL.NGAY_BAT_DAU + 1, 1, 2)
                        .setValues([[latestRental.batDau || oldBD || '', latestRental.ketThuc || oldKT || '']]);
                    wroteBack = true;
                }
                const currentGiaThueInSheet = parseMoneyValue(row[CONFIG.KH_COL.GIA_THUE]);
                if (latestRental.soTien > 0 && currentGiaThueInSheet === 0) {
                    sh.getRange(sheetRowNum, CONFIG.KH_COL.GIA_THUE + 1).setValue(latestRental.soTien);
                    wroteBack = true;
                }
                if (latestRental.bienSo && !String(row[CONFIG.KH_COL.BIEN_SO] || '').trim()) {
                    sh.getRange(sheetRowNum, CONFIG.KH_COL.BIEN_SO + 1).setValue(latestRental.bienSo);
                    wroteBack = true;
                }
                if (latestRental.congTacVien && String(row[CONFIG.KH_COL.CONG_TAC_VIEN] || '').trim() !== latestRental.congTacVien) {
                    sh.getRange(sheetRowNum, CONFIG.KH_COL.CONG_TAC_VIEN + 1).setValue(latestRental.congTacVien);
                    wroteBack = true;
                }
                if (latestRental.tyLeHoaHong > 0 && Number(row[CONFIG.KH_COL.TY_LE_HOA_HONG] || 0) !== latestRental.tyLeHoaHong) {
                    sh.getRange(sheetRowNum, CONFIG.KH_COL.TY_LE_HOA_HONG + 1).setValue(latestRental.tyLeHoaHong);
                    wroteBack = true;
                }
                if (wroteBack) {
                    // Không flush ở đây — Apps Script tự commit. Chỉ invalidate cache để lần load KH kế tiếp lấy bản mới.
                    try { clearXeKhCache_(); } catch (_c) { }
                    try { invalidateTCCache_(); } catch (_t) { }
                }
            }
        }

        const docs = isGuestOnly ? [] : parseDocsCell_(row[CONFIG.KH_COL.GIAY_TO_URLS]);
        const ghiChu = isGuestOnly ? '' : String(row[CONFIG.KH_COL.GHI_CHU] || '').trim();
        const notes = getKhachHangNotes_(customerName, thongTin.bienSo);
        // Legacy columns (chỉ khi có row trong QL KH)
        if (!isGuestOnly) {
            const PAYMENT_START = CONFIG.KH_COL.NGAY_KET_THUC + 1;
            for (let i = PAYMENT_START; i < lastCol; i++) {
                const header = String(allHeaders[i] || '').trim();
                const amount = parseMoneyValue(row[i]);
                if (header && amount > 0) { lichSu.push({ thoiGian: header, loai: 'Thu', danhMuc: '', chiNhanh: '', ghiChu: '', soTien: amount, nguon: 'legacy' }); }
            }
        }
        // [v4] Thêm lịch sử Chi liên quan đến biển số xe của khách
        const bienSoKhach = thongTin.bienSo ? thongTin.bienSo.trim().toLowerCase() : '';
        const chiSh = ss.getSheetByName(TC_CONFIG.SHEET_CHI);
        if (chiSh && bienSoKhach) {
            const chiLR = chiSh.getLastRow();
            if (chiLR >= TC_CONFIG.TC_START) {
                const ncolsChi = Math.min(chiSh.getLastColumn(), 12);
                const chiRaw = chiSh.getRange(TC_CONFIG.TC_START, 1, chiLR - TC_CONFIG.TC_START + 1, ncolsChi).getValues();
                chiRaw.forEach(r => {
                    const bs = String(r[TC_CONFIG.COL.BIEN_SO] || '').trim().toLowerCase();
                    const soTien = parseMoneyValue(r[TC_CONFIG.COL.SO_TIEN]);
                    if (bs === bienSoKhach && soTien > 0) {
                        lichSu.push({
                            thoiGian: readDateFromCell(r[TC_CONFIG.COL.NGAY]),
                            loai: 'Chi',
                            danhMuc: String(r[TC_CONFIG.COL.DANH_MUC] || '').trim(),
                            chiNhanh: ncolsChi >= 8 ? String(r[TC_CONFIG.COL.CHI_NHANH] || '').trim() : '',
                            ghiChu: String(r[TC_CONFIG.COL.GHI_CHU] || '').trim(),
                            batDau: '', ketThuc: '', soTien, nguon: 'Chi'
                        });
                    }
                });
            }
        }
        // [v4] Đánh loai cho tất cả bản ghi Thu (cũ chưa có loai field)
        lichSu.forEach(r => { if (!r.loai) r.loai = 'Thu'; });
        lichSu.sort((a, b) => { const da = tryParseDate(a.thoiGian), db = tryParseDate(b.thoiGian); if (!da || !db) return 0; return db - da; });
        // Tính tổng Thu / Chi riêng
        const tongThu = lichSu.filter(r => r.loai === 'Thu').reduce((s, r) => s + r.soTien, 0);
        const tongChi = lichSu.filter(r => r.loai === 'Chi').reduce((s, r) => s + r.soTien, 0);
        const _result = { success: true, data: { thongTin, docs, ghiChu, notes, lichSuThanhToan: lichSu, tongDaThanhToan: tongThu, tongDaChi: tongChi, soThang: lichSu.length } };
        // Cache 60s — tự clear khi sửa KH/TC qua app
        try { CacheService.getScriptCache().put(_cacheKey, JSON.stringify(_result), 60); } catch (_pc) { }
        return _result;
    } catch (e) { Logger.log('getCustomerDetails: ' + e.message); return { success: false, error: e.message }; }
}
function getCustomerHistory(n) { return getCustomerDetails(n); }

// ---------------------------------------------------------------
// [2026-05] MODULE: BILL INVOICE — Xuất bill thanh toán cho KH quá hạn
// ---------------------------------------------------------------

// Lấy thông tin shop từ Script Properties (chỉ Admin set/sửa)
function getShopInfo() {
    try {
        const props = PropertiesService.getScriptProperties();
        return {
            success: true,
            data: {
                shopName: props.getProperty('SHOP_NAME') || "JAN'S MOTORBIKE",
                shopAddress: props.getProperty('SHOP_ADDRESS') || 'Hồ Chí Minh',
                shopPhone: props.getProperty('SHOP_PHONE') || '',
                shopNote: props.getProperty('SHOP_NOTE') || 'Vui lòng thanh toán đúng hạn. Xin cảm ơn!',
                bankName: props.getProperty('BANK_NAME') || '',
                bankAccount: props.getProperty('BANK_ACCOUNT') || '',
                bankHolder: props.getProperty('BANK_HOLDER') || ''
            }
        };
    } catch (e) { return { success: false, error: e.message }; }
}

// Lưu thông tin shop (Admin only)
function setShopInfo(formData, userInfo) {
    try {
        if (!userInfo || !isAdminUser_(userInfo)) {
            return { success: false, error: 'Chỉ Admin mới được cập nhật thông tin shop.' };
        }
        const props = PropertiesService.getScriptProperties();
        const keys = ['shopName', 'shopAddress', 'shopPhone', 'shopNote', 'bankName', 'bankAccount', 'bankHolder'];
        const propKeys = ['SHOP_NAME', 'SHOP_ADDRESS', 'SHOP_PHONE', 'SHOP_NOTE', 'BANK_NAME', 'BANK_ACCOUNT', 'BANK_HOLDER'];
        keys.forEach((k, i) => {
            const v = String(formData && formData[k] != null ? formData[k] : '').trim();
            props.setProperty(propKeys[i], v);
        });
        logActivity_(userInfo, 'CẬP NHẬT INFO SHOP', 'Bill', '', 'Tên: ' + (formData.shopName || '') + ' · SĐT: ' + (formData.shopPhone || ''));
        return { success: true, message: 'Đã cập nhật thông tin shop.' };
    } catch (e) { return { success: false, error: e.message }; }
}

// Build dữ liệu bill cho 1 khách (kết hợp customer details + shop info)
function getBillData(customerName, bienSoHint) {
    try {
        const cd = getCustomerDetails(customerName, bienSoHint);
        if (!cd.success) return cd;
        const shop = getShopInfo().data;
        const d = cd.data;
        const ti = d.thongTin || {};
        const lichSu = (d.lichSuThanhToan || []).filter(r => r.loai === 'Thu');

        // Tính chu kỳ thanh toán giống logic getKhachHangDataInternal
        const cycles = _calcBillCycles_(ti, lichSu);

        // Tổng đã thanh toán (chỉ tính tiền thuê)
        const tongDaTra = lichSu
            .filter(r => isRentalRevenueCategory_(r.danhMuc || ''))
            .reduce((s, r) => s + (parseInt(r.soTien, 10) || 0), 0);

        // Tổng cần thanh toán = tổng các kỳ chưa thanh toán
        const tongCanTra = cycles.unpaidCycles.reduce((s, c) => s + c.soTien, 0);

        // Số ngày quá hạn
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const kt = _parseDateDmy_(ti.ngayKetThuc);
        let quaHan = 0;
        if (kt) quaHan = Math.ceil((today - kt) / 86400000);

        return {
            success: true,
            data: {
                shop: shop,
                customer: {
                    tenKH: ti.tenKH || customerName,
                    lienLac: ti.lienLac || '',
                    xeThue: ti.xeThue || '',
                    bienSo: ti.bienSo || bienSoHint || '',
                    giaThue: parseInt(ti.giaThue, 10) || 0,
                    tienCoc: parseInt(ti.tienCoc, 10) || 0,
                    phuongThucCoc: ti.phuongThucCoc || ti.giuCoc || '',
                    ngayBatDau: ti.ngayBatDau || '',
                    ngayKetThuc: ti.ngayKetThuc || '',
                    quaHan: quaHan
                },
                cycles: cycles,
                summary: {
                    tongDaTra: tongDaTra,
                    tongCanTra: tongCanTra,
                    soKyDaTra: cycles.paidCycles.length,
                    soKyChuaTra: cycles.unpaidCycles.length,
                    soKy: cycles.allCycles.length
                },
                billDate: Utilities.formatDate(today, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy')
            }
        };
    } catch (e) {
        Logger.log('getBillData: ' + e.message);
        return { success: false, error: e.message };
    }
}

// Helper: parse "dd/MM/yyyy" → Date
function _parseDateDmy_(s) {
    if (!s) return null;
    const p = String(s).split('/');
    if (p.length !== 3) return null;
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    return isNaN(d) ? null : d;
}

// Tính các kỳ thanh toán giống logic chính của app — trả về paid/unpaid/all
function _calcBillCycles_(ti, lichSu) {
    const bd = _parseDateDmy_(ti.ngayBatDau);
    if (!bd) return { allCycles: [], paidCycles: [], unpaidCycles: [] };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const kt = _parseDateDmy_(ti.ngayKetThuc) || today;
    const giaThue = parseInt(ti.giaThue, 10) || 0;

    function addM(d, n) {
        const r = new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
        if (r.getDate() !== d.getDate()) r.setDate(0);
        return r;
    }
    function fD(d) {
        return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
    }

    // Parse payments
    const pays = (lichSu || [])
        .filter(r => isRentalRevenueCategory_(r.danhMuc || ''))
        .map(r => ({
            bd: _parseDateDmy_(r.batDau) || _parseDateDmy_(r.ngay),
            kt: _parseDateDmy_(r.ketThuc),
            soTien: parseInt(r.soTien, 10) || 0,
            ngay: r.ngay || ''
        }));
    pays.forEach(p => { if (p.bd && !p.kt) p.kt = addM(p.bd, 1); });

    // [FIX 2026-05] Xác định mốc "đã trả đến" (paidThrough):
    // - Nếu có payments trong QL Thu → dùng ketThuc mới nhất của payment
    // - Nếu KHÔNG có payment → dùng ngayKetThuc hợp đồng (khách trả trước khi ký)
    // → Bill CHỈ sinh các kỳ RENEWAL sau mốc này, không re-bill kỳ gốc.
    let paidThrough = kt;
    pays.forEach(p => { if (p.kt && p.kt > paidThrough) paidThrough = p.kt; });

    // Sinh kỳ RENEWAL bắt đầu từ paidThrough (tối đa 12 kỳ về tương lai)
    const DAY = 86400000, TOL = 3 * DAY;
    const paidCycles = [], unpaidCycles = [];

    for (let i = 0; i < 12; i++) {
        const ks = addM(paidThrough, i);
        const ke = addM(paidThrough, i + 1);
        // [FIX] Dùng >= để KHÔNG bao gồm kỳ bắt đầu đúng ngày hôm nay trở đi (chưa đến hạn)
        if (ks >= today) break;

        // Tìm payment cover kỳ này
        let matchPay = null;
        for (const p of pays) {
            if (!p.bd || !p.kt) continue;
            if (ks >= p.bd - TOL && ks <= p.kt - TOL) { matchPay = p; break; }
        }

        if (matchPay) {
            paidCycles.push({
                kyNum: i + 1,
                startStr: fD(ks),
                endStr: fD(ke),
                soTien: giaThue,
                ngayTra: matchPay.ngay || ''
            });
        } else {
            unpaidCycles.push({
                kyNum: i + 1,
                startStr: fD(ks),
                endStr: fD(ke),
                soTien: giaThue,
                overdueDays: ke < today ? Math.ceil((today - ke) / DAY) : 0
            });
        }
    }

    return {
        allCycles: [...paidCycles, ...unpaidCycles].map(c => ({
            kyNum: c.kyNum, startStr: c.startStr, endStr: c.endStr
        })),
        paidCycles: paidCycles,
        unpaidCycles: unpaidCycles
    };
}

// ---------------------------------------------------------------
// [2026-05] MODULE: RECEIPT — Xác nhận thanh toán cho từng giao dịch Thu
// Nhân viên và Admin đều có thể xuất. Không hiển thị CTV/hoa hồng.
// ---------------------------------------------------------------
function getReceiptData(rowNum) {
    try {
        // Lấy tất cả Thu Chi rồi tìm dòng có rowNum khớp
        const tc = getThuChiData(null, null, null, false);
        if (!tc.success) return { success: false, error: tc.error };
        const record = (tc.data || []).find(r => r.rowNum === rowNum && r.loai === 'Thu');
        if (!record) return { success: false, error: 'Không tìm thấy giao dịch thu rowNum=' + rowNum };
        // [2026-05] Receipt chỉ áp dụng cho 2 danh mục: Thuê mới + Tiền thuê tháng.
        // Các giao dịch Thu khác (Bán xe, Phụ thu, Bảo dưỡng...) không xuất receipt.
        const RECEIPTABLE = ['Thuê mới', 'Tiền thuê tháng'];
        if (RECEIPTABLE.indexOf(String(record.danhMuc || '').trim()) === -1) {
            return { success: false, error: 'Danh mục "' + record.danhMuc + '" không hỗ trợ xuất receipt. Chỉ áp dụng cho Thuê mới và Tiền thuê tháng.' };
        }
        const shop = getShopInfo().data;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        // Số receipt tự sinh: RC + rowNum + năm
        const year = today.getFullYear();
        const receiptNo = 'RC' + String(rowNum).padStart(4, '0') + '-' + year;
        return {
            success: true,
            data: {
                shop: shop,
                receiptNo: receiptNo,
                receiptDate: Utilities.formatDate(today, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
                transaction: {
                    ngay: record.ngay || '',
                    danhMuc: record.danhMuc || '',
                    soTien: record.soTien || 0,
                    khach: record.khach || '',
                    bienSo: record.bienSo || '',
                    // [2026-05] Ưu tiên tenXe đã enrich (lookup theo biển số), fallback record.model
                    xeThue: record.tenXe || record.model || '',
                    tenXe: record.tenXe || record.model || '',
                    hangXe: record.hangXe || '',
                    batDau: record.batDau || '',
                    ketThuc: record.ketThuc || '',
                    chiNhanh: record.chiNhanh || '',
                    ghiChu: record.ghiChu || '',
                    nguoiTao: record.nguoiTao || '',
                    chungTuUrl: record.chungTuUrl || ''
                }
            }
        };
    } catch (e) {
        Logger.log('getReceiptData: ' + e.message);
        return { success: false, error: e.message };
    }
}

/**
 * [2026-05] Cập nhật trạng thái "Bill Đã Gửi" cho 1 dòng trong sheet QL Thu.
 *
 * Chỉ áp dụng cho 2 danh mục: "Thuê mới" và "Tiền thuê tháng".
 * Quyền: Admin + Nhân viên (canManageThuChi_). User "Chỉ xem" bị từ chối ở server.
 *
 * @param {number}  rowNum    Số dòng trong sheet QL Thu (1-based, đã bao gồm header).
 * @param {boolean} isSent    true = đã gửi bill cho khách, false = bỏ tick.
 * @param {object}  userInfo  Thông tin user hiện tại (truyền từ client).
 * @return {{success:boolean, billSent?:boolean, error?:string}}
 */
function updateBillSentStatus(rowNum, isSent, userInfo) {
    try {
        // [2026-05] Permission gate — Admin + Nhân viên (không cho "Chỉ xem" bypass)
        try {
            assertThuChiWrite_(userInfo);
        } catch (permErr) {
            return { success: false, error: permErr.message || 'Không có quyền cập nhật trạng thái bill.' };
        }

        rowNum = parseInt(rowNum, 10);
        if (!rowNum || rowNum < TC_CONFIG.TC_START) {
            return { success: false, error: 'rowNum không hợp lệ' };
        }
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(TC_CONFIG.SHEET_TC);
        if (!sh) return { success: false, error: 'Không tìm thấy sheet QL Thu' };
        if (rowNum > sh.getLastRow()) {
            return { success: false, error: 'Dòng không tồn tại' };
        }

        // Đảm bảo cột BILL_SENT (cột 23 / W) tồn tại
        const targetCol = TC_CONFIG.COL.BILL_SENT + 1; // 1-based
        if (sh.getLastColumn() < targetCol) {
            sh.insertColumnsAfter(sh.getLastColumn(), targetCol - sh.getLastColumn());
            // Ghi header
            sh.getRange(1, targetCol).setValue('Bill Đã Gửi')
                .setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
        }

        // Kiểm tra danh mục dòng — chỉ cho phép Thuê mới / Tiền thuê tháng
        const danhMuc = String(sh.getRange(rowNum, TC_CONFIG.COL.DANH_MUC + 1).getValue() || '').trim();
        const ALLOWED = ['Thuê mới', 'Tiền thuê tháng'];
        if (ALLOWED.indexOf(danhMuc) === -1) {
            return { success: false, error: 'Chỉ áp dụng cho Thuê mới hoặc Tiền thuê tháng (dòng này: ' + danhMuc + ')' };
        }

        const cell = sh.getRange(rowNum, targetCol);
        // Bật checkbox + set giá trị
        try { cell.insertCheckboxes(); } catch (_e) { }
        const newVal = !!isSent;
        cell.setValue(newVal);

        // Invalidate cache để lần load tiếp theo đọc giá trị mới
        try { invalidateTCCache_(); } catch (_) { }

        // Log lịch sử (nếu hệ thống có sẵn)
        try {
            if (typeof logHistory_ === 'function') {
                logHistory_('Cập nhật Bill', 'TC', 'Dòng ' + rowNum,
                    (newVal ? '✅ Đã gửi bill' : '⬜ Bỏ đánh dấu') + ' | Danh mục: ' + danhMuc);
            }
        } catch (_lh) { }

        invalidateTCCache_();
        return { success: true, billSent: newVal };
    } catch (e) {
        Logger.log('updateBillSentStatus: ' + e.message);
        return { success: false, error: e.message };
    }
}

function getOrCreateThuChiSheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(TC_CONFIG.SHEET_TC);
    // [2026-05] Cột 23 (W) = "Bill Đã Gửi" — checkbox cho Thuê mới / Tiền thuê tháng.
    const headers = ['Ngày', 'Loại', 'Danh Mục', 'Biển Số Xe', 'Khách Hàng', 'Số Tiền', 'Ghi Chú', 'Chi Nhánh', 'Bắt Đầu', 'Kết Thúc', 'Cộng Tác Viên', 'Tỉ Lệ HH%', 'Chứng Từ URL', 'Model / Tên Xe', 'Giá Vốn', 'Giá Bán', 'Lợi Nhuận', 'Người Mua', 'Liên Lạc', 'Địa Chỉ', 'Mã Bán', 'Mã Xe', 'Bill Đã Gửi'];
    if (!sh) {
        sh = ss.insertSheet(TC_CONFIG.SHEET_TC);
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
        sh.setFrozenRows(1);
        return sh;
    }
    const lc = sh.getLastColumn();
    if (lc < headers.length) sh.insertColumnsAfter(lc, headers.length - lc);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
}

function getOrCreateChiSheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(TC_CONFIG.SHEET_CHI);
    const headers = ['Ngày', 'Loại', 'Danh Mục', 'Biển Số Xe', 'Khách Hàng', 'Số Tiền', 'Ghi Chú', 'Chi Nhánh', 'Bắt Đầu', 'Kết Thúc', 'Chứng Từ URL', 'Model / Tên Xe', 'Giá Vốn', 'Giá Bán', 'Lợi Nhuận', 'Người Mua', 'Liên Lạc', 'Địa Chỉ', 'Mã Bán', 'Mã Xe'];
    if (!sh) {
        sh = ss.insertSheet(TC_CONFIG.SHEET_CHI);
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
        sh.setFrozenRows(1);
        return sh;
    }
    const lc = sh.getLastColumn();
    if (lc < headers.length) sh.insertColumnsAfter(lc, headers.length - lc);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
}

const TC_CHI_ROW_OFFSET = 1000000;

// [OPT] Xóa cache Thu/Chi sau khi ghi dữ liệu
function invalidateTCCache_() {
    try { CacheService.getScriptCache().remove(JMB_CACHE.TC_ALL); } catch (e) { }
}
function getThuChiTargetSheet_(loai) {
    return String(loai || '').trim() === 'Chi' ? getOrCreateChiSheet_() : getOrCreateThuChiSheet_();
}
function resolveThuChiSheetAndRow_(rowNum) {
    rowNum = parseInt(rowNum, 10);
    if (!rowNum || rowNum < TC_CONFIG.TC_START) throw new Error('Dòng không hợp lệ.');
    if (rowNum >= TC_CHI_ROW_OFFSET) {
        return { sheet: getOrCreateChiSheet_(), rowNum: rowNum - TC_CHI_ROW_OFFSET, loai: 'Chi' };
    }
    return { sheet: getOrCreateThuChiSheet_(), rowNum: rowNum, loai: 'Thu' };
}

function getOrCreateXeDaBanSheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(TC_CONFIG.SHEET_SOLD);
    const headers = ['Mã Bán', 'Ngày Bán', 'Mã Xe', 'Model / Tên Xe', 'Hãng Xe', 'Màu', 'Năm', 'Biển Số', 'Giá Vốn Gốc', 'Giá Bán', 'Lợi Nhuận', 'Người Mua', 'Số Điện Thoại', 'Địa Chỉ', 'Chi Nhánh', 'Nhân Viên Bán', 'Ghi Chú Bán', 'Lịch Sử Xe', 'Mã Giao Dịch Thu Chi', 'Thời Gian Tạo', 'Người Tạo'];
    if (!sh) {
        sh = ss.insertSheet(TC_CONFIG.SHEET_SOLD);
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
        sh.setFrozenRows(1);
        return sh;
    }
    const lc = sh.getLastColumn();
    if (lc < headers.length) sh.insertColumnsAfter(lc, headers.length - lc);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
}
function generateSaleId_() {
    const d = new Date();
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
    return 'SALE-' + y + m + da + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}
function findXeRowByBienSo_(bienSo) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(CONFIG.SHEET_XE);
    if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_XE + '"');
    const lastRow = sh.getLastRow();
    if (lastRow < CONFIG.XE_DATA_START) return null;
    const data = sh.getRange(CONFIG.XE_DATA_START, 1, lastRow - CONFIG.XE_DATA_START + 1, 7).getValues();
    const key = _salePlateKey_(bienSo);
    for (let i = 0; i < data.length; i++) {
        const bsRaw = String(data[i][CONFIG.XE_COL.BIEN_SO] || '').trim();
        const bsKey = _salePlateKey_(bsRaw);
        if (bsKey === key) {
            const tenXe = String(data[i][CONFIG.XE_COL.TEN] || '').trim();
            return {
                rowNum: CONFIG.XE_DATA_START + i, vehicle: {
                    maXe: 'XE-' + bsKey, tenXe: tenXe, nam: data[i][CONFIG.XE_COL.NAM] || '',
                    mauSon: String(data[i][CONFIG.XE_COL.MAU] || '').trim(), bienSo: bsRaw, giaVon: parseMoneyValue(data[i][CONFIG.XE_COL.GIA_VON]),
                    hangXe: normalizeBrandName_(inferXeBrand_(tenXe, data[i][CONFIG.XE_COL.HANG])), ghiChu: String(data[i][CONFIG.XE_COL.GHI_CHU] || '').trim()
                }
            };
        }
    }
    return null;
}
function _salePlateKey_(bienSo) {
    return String(bienSo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// [FIX 2026-05-21] Lookup thông tin xe theo biển số cho khung Bán xe.
// Dùng cho frontend auto-fill giá vốn, và backend fallback khi sửa giao dịch bán cũ.
function findVehicleSaleInfoByBienSo_(bienSo) {
    const key = _salePlateKey_(bienSo);
    if (!key) return null;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1) Ưu tiên QL Xe: xe chưa bán / còn trong fleet.
    const xeSh = ss.getSheetByName(CONFIG.SHEET_XE);
    if (xeSh) {
        const lr = xeSh.getLastRow();
        if (lr >= CONFIG.XE_DATA_START) {
            const raw = xeSh.getRange(CONFIG.XE_DATA_START, 1, lr - CONFIG.XE_DATA_START + 1, 7).getValues();
            for (let i = 0; i < raw.length; i++) {
                const r = raw[i];
                const bs = String(r[CONFIG.XE_COL.BIEN_SO] || '').trim();
                if (_salePlateKey_(bs) !== key) continue;
                const tenXe = String(r[CONFIG.XE_COL.TEN] || '').trim();
                return {
                    source: 'QL Xe', rowNum: CONFIG.XE_DATA_START + i,
                    bienSo: bs, maXe: 'XE-' + _salePlateKey_(bs), tenXe: tenXe, model: tenXe,
                    hangXe: normalizeBrandName_(inferXeBrand_(tenXe, r[CONFIG.XE_COL.HANG])),
                    mauSon: String(r[CONFIG.XE_COL.MAU] || '').trim(), nam: String(r[CONFIG.XE_COL.NAM] || '').trim(),
                    giaVon: parseMoneyValue(r[CONFIG.XE_COL.GIA_VON])
                };
            }
        }
    }

    // 2) Fallback Xe Đã Bán: dùng khi sửa lại giao dịch bán cũ, xe đã bị chuyển khỏi QL Xe.
    const soldSh = ss.getSheetByName(TC_CONFIG.SHEET_SOLD);
    if (soldSh) {
        const lr = soldSh.getLastRow();
        if (lr >= TC_CONFIG.SOLD_START) {
            const raw = soldSh.getRange(TC_CONFIG.SOLD_START, 1, lr - TC_CONFIG.SOLD_START + 1, Math.min(soldSh.getLastColumn(), 21)).getValues();
            for (let i = raw.length - 1; i >= 0; i--) {
                const r = raw[i];
                const bs = String(r[TC_CONFIG.SOLD_COL.BIEN_SO] || '').trim();
                if (_salePlateKey_(bs) !== key) continue;
                const model = String(r[TC_CONFIG.SOLD_COL.MODEL] || '').trim();
                return {
                    source: 'Xe Đã Bán', rowNum: TC_CONFIG.SOLD_START + i,
                    bienSo: bs, maXe: String(r[TC_CONFIG.SOLD_COL.MA_XE] || '').trim(),
                    tenXe: model, model: model, hangXe: String(r[TC_CONFIG.SOLD_COL.HANG_XE] || '').trim(),
                    mauSon: String(r[TC_CONFIG.SOLD_COL.MAU] || '').trim(), nam: String(r[TC_CONFIG.SOLD_COL.NAM] || '').trim(),
                    giaVon: parseMoneyValue(r[TC_CONFIG.SOLD_COL.GIA_VON_GOC]),
                    giaBan: parseMoneyValue(r[TC_CONFIG.SOLD_COL.GIA_BAN]),
                    loiNhuan: parseMoneyValue(r[TC_CONFIG.SOLD_COL.LOI_NHUAN])
                };
            }
        }
    }

    // 3) Fallback cuối: tìm trong QL Thu các dòng Bán xe đã từng lưu giá vốn.
    const tcSh = ss.getSheetByName(TC_CONFIG.SHEET_TC);
    if (tcSh) {
        const lr = tcSh.getLastRow();
        if (lr >= TC_CONFIG.TC_START) {
            const raw = tcSh.getRange(TC_CONFIG.TC_START, 1, lr - TC_CONFIG.TC_START + 1, Math.min(tcSh.getLastColumn(), 22)).getValues();
            for (let i = raw.length - 1; i >= 0; i--) {
                const r = raw[i];
                const bs = String(r[TC_CONFIG.COL.BIEN_SO] || '').trim();
                if (_salePlateKey_(bs) !== key || String(r[TC_CONFIG.COL.DANH_MUC] || '').trim() !== 'Bán xe') continue;
                const model = String(r[TC_CONFIG.COL.MODEL] || '').trim();
                return {
                    source: 'QL Thu', rowNum: TC_CONFIG.TC_START + i,
                    bienSo: bs, maXe: String(r[TC_CONFIG.COL.MA_XE] || '').trim(),
                    tenXe: model, model: model,
                    giaVon: parseMoneyValue(r[TC_CONFIG.COL.GIA_VON]),
                    giaBan: parseMoneyValue(r[TC_CONFIG.COL.GIA_BAN]),
                    loiNhuan: parseMoneyValue(r[TC_CONFIG.COL.LOI_NHUAN])
                };
            }
        }
    }
    return null;
}

function getVehicleSaleInfoByBienSo(bienSo) {
    try {
        const info = findVehicleSaleInfoByBienSo_(bienSo);
        return { success: true, data: info };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function buildVehicleHistorySnapshot_(vehicle) {
    const parts = [];
    parts.push('Model: ' + (vehicle.tenXe || ''));
    parts.push('Biển số: ' + (vehicle.bienSo || ''));
    parts.push('Hãng: ' + (vehicle.hangXe || ''));
    parts.push('Màu: ' + (vehicle.mauSon || ''));
    parts.push('Năm: ' + (vehicle.nam || ''));
    parts.push('Giá vốn gốc: ' + parseMoneyValue(vehicle.giaVon));
    if (vehicle.ghiChu) parts.push('Ghi chú xe: ' + vehicle.ghiChu);
    return parts.join(' | ');
}
function getXeDaBanData_uncached_(filterMonth, filterBranch, keyword, buyer) {
    try {
        const sh = getOrCreateXeDaBanSheet_();
        const lastRow = sh.getLastRow();
        if (lastRow < TC_CONFIG.SOLD_START) return { success: true, data: [], stats: { soXeDaBan: 0, doanhThu: 0, loiNhuan: 0 } };
        const raw = sh.getRange(TC_CONFIG.SOLD_START, 1, lastRow - TC_CONFIG.SOLD_START + 1, 21).getValues();
        let data = raw.map((r, i) => ({
            rowNum: TC_CONFIG.SOLD_START + i, maBan: String(r[0] || ''), ngayBan: readDateFromCell(r[1]), maXe: String(r[2] || ''),
            model: String(r[3] || ''), hangXe: String(r[4] || ''), mau: String(r[5] || ''), nam: String(r[6] || ''), bienSo: String(r[7] || ''),
            giaVon: parseMoneyValue(r[8]), giaBan: parseMoneyValue(r[9]), loiNhuan: parseMoneyValue(r[10]), nguoiMua: String(r[11] || ''),
            soDienThoai: String(r[12] || ''), diaChi: String(r[13] || ''), chiNhanh: String(r[14] || ''), nhanVienBan: String(r[15] || ''),
            ghiChuBan: String(r[16] || ''), lichSuXe: String(r[17] || ''), maGdTc: String(r[18] || ''), thoiGianTao: String(r[19] || ''), nguoiTao: String(r[20] || '')
        }));
        if (filterMonth) data = data.filter(x => { const p = (x.ngayBan || '').split('/'); return p.length === 3 && (p[1] + '/' + p[2]) === filterMonth; });
        if (filterBranch) data = data.filter(x => x.chiNhanh === filterBranch);
        if (buyer) data = data.filter(x => x.nguoiMua === buyer);
        const kw = String(keyword || '').trim().toLowerCase();
        if (kw) data = data.filter(x => [x.model, x.bienSo, x.nguoiMua, x.soDienThoai, x.chiNhanh].join(' ').toLowerCase().includes(kw));
        data.sort((a, b) => { const da = tryParseDate(a.ngayBan), db = tryParseDate(b.ngayBan); if (!da || !db) return 0; return db - da; });
        data.forEach((x, i) => x.stt = i + 1);
        const stats = { soXeDaBan: data.length, doanhThu: data.reduce((s, x) => s + x.giaBan, 0), loiNhuan: data.reduce((s, x) => s + x.loiNhuan, 0) };
        return { success: true, data, stats };
    } catch (e) { return { success: false, error: e.message }; }
}

function getXeDaBanData(filterMonth, filterBranch, keyword, buyer, _force) {
    try {
        const hasFilter = filterMonth || filterBranch || keyword || buyer;
        const cache = CacheService.getScriptCache();
        if (_force) { try { cache.remove(JMB_CACHE.XEBAN_ALL); } catch (_) { } }
        if (!hasFilter && !_force) {
            try { const cached = cache.get(JMB_CACHE.XEBAN_ALL); if (cached) return JSON.parse(cached); } catch (_ce) { }
        }
        const result = getXeDaBanData_uncached_(filterMonth, filterBranch, keyword, buyer);
        if (!hasFilter && result && result.success) { try { cache.put(JMB_CACHE.XEBAN_ALL, JSON.stringify(result), 300); } catch (_pe) { } }
        return result;
    } catch (e) { return { success: false, error: e.message }; }
}

function getXeDaBanDetail(maBan) {
    try {
        const r = getXeDaBanData(); if (!r.success) throw new Error(r.error);
        const rec = r.data.find(x => x.maBan === maBan); if (!rec) throw new Error('Không tìm thấy xe đã bán.');
        return { success: true, data: rec };
    } catch (e) { return { success: false, error: e.message }; }
}

function getThuChiData(filterLoai, filterMonth, filterBranch, _force) {
    try {
        const hasFilter = filterLoai || filterMonth || filterBranch;
        const cache = CacheService.getScriptCache();
        if (_force) { try { cache.remove(JMB_CACHE.TC_ALL); } catch (_) { } }
        if (!hasFilter && !_force) {
            try { const cached = cache.get(JMB_CACHE.TC_ALL); if (cached) return JSON.parse(cached); } catch (_ce) { }
        }

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const thuSh = getOrCreateThuChiSheet_();
        const chiSh = getOrCreateChiSheet_();
        const khMap = {};
        const khSh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (khSh) {
            const khLR = khSh.getLastRow();
            if (khLR >= CONFIG.KH_DATA_START) {
                khSh.getRange(CONFIG.KH_DATA_START, 1, khLR - CONFIG.KH_DATA_START + 1, 15).getValues().forEach(r => {
                    const t = String(r[CONFIG.KH_COL.TEN] || '').trim();
                    if (t) khMap[t.toLowerCase()] = {
                        ngayKetThuc: readDateFromCell(r[CONFIG.KH_COL.NGAY_KET_THUC]),
                        congTacVien: String(r[CONFIG.KH_COL.CONG_TAC_VIEN] || '').trim(),
                        tyLeHoaHong: parseFloat(r[CONFIG.KH_COL.TY_LE_HOA_HONG] || 0) || 0
                    };
                });
            }
        }

        const xeMap = {};
        try {
            const xeSh = ss.getSheetByName(CONFIG.SHEET_XE);
            if (xeSh) {
                const xeLR = xeSh.getLastRow();
                if (xeLR >= CONFIG.XE_DATA_START) {
                    const xeData = xeSh.getRange(CONFIG.XE_DATA_START, 1, xeLR - CONFIG.XE_DATA_START + 1, 7).getValues();
                    xeData.forEach(r => {
                        const tenXe = String(r[CONFIG.XE_COL.TEN] || '').trim();
                        const bienSo = String(r[CONFIG.XE_COL.BIEN_SO] || '').trim();
                        if (!bienSo) return;
                        const hangXe = normalizeBrandName_(inferXeBrand_(tenXe, r[CONFIG.XE_COL.HANG]));
                        xeMap[bienSo.toUpperCase()] = { tenXe: tenXe, hangXe: hangXe, giaVon: parseMoneyValue(r[CONFIG.XE_COL.GIA_VON]), maXe: 'XE-' + _salePlateKey_(bienSo) };
                    });
                }
            }
        } catch (_eXe) { Logger.log('build xeMap (QL Xe): ' + _eXe.message); }
        try {
            const soldSh = ss.getSheetByName(TC_CONFIG.SHEET_SOLD);
            if (soldSh) {
                const soldLR = soldSh.getLastRow();
                if (soldLR >= TC_CONFIG.SOLD_START) {
                    const soldData = soldSh.getRange(TC_CONFIG.SOLD_START, 1, soldLR - TC_CONFIG.SOLD_START + 1, Math.min(soldSh.getLastColumn(), 21)).getValues();
                    soldData.forEach(r => {
                        const bienSo = String(r[TC_CONFIG.SOLD_COL.BIEN_SO] || '').trim();
                        if (!bienSo) return;
                        const up = bienSo.toUpperCase();
                        if (xeMap[up]) return;
                        const tenXe = String(r[TC_CONFIG.SOLD_COL.MODEL] || '').trim();
                        const hangXeRaw = String(r[TC_CONFIG.SOLD_COL.HANG_XE] || '').trim();
                        const hangXe = normalizeBrandName_(inferXeBrand_(tenXe, hangXeRaw));
                        xeMap[up] = { tenXe: tenXe, hangXe: hangXe, giaVon: parseMoneyValue(r[TC_CONFIG.SOLD_COL.GIA_VON_GOC]), maXe: String(r[TC_CONFIG.SOLD_COL.MA_XE] || '').trim() };
                    });
                }
            }
        } catch (_eSold) { Logger.log('build xeMap (Xe Đã Bán): ' + _eSold.message); }

        let records = [];
        function readSheet_(sh, defaultLoai, rowOffset) {
            const lastRow = sh.getLastRow();
            if (lastRow < TC_CONFIG.TC_START) return;
            const _shLastCol = sh.getLastColumn();
            const _hasBillSent = (_shLastCol >= TC_CONFIG.COL.BILL_SENT + 1);
            const numCols = _shLastCol;
            const raw = sh.getRange(TC_CONFIG.TC_START, 1, lastRow - TC_CONFIG.TC_START + 1, numCols).getValues();
            raw.forEach((r, idx) => {
                let loai = String(r[TC_CONFIG.COL.LOAI] || '').trim() || defaultLoai;
                const soTien = parseMoneyValue(r[TC_CONFIG.COL.SO_TIEN]);
                const danhMucRaw = String(r[TC_CONFIG.COL.DANH_MUC] || '').trim();
                if (!loai) return;
                if (!soTien && danhMucRaw !== 'Bán xe') return;
                const khach = String(r[TC_CONFIG.COL.KHACH] || '').trim();
                const khInfo = khach ? khMap[khach.toLowerCase()] || {} : {};
                const sourceRowNum = TC_CONFIG.TC_START + idx;
                const congTacVien = numCols >= 11 ? String(r[TC_CONFIG.COL.CONG_TAC_VIEN_TC] || '').trim() : '';
                const rawTyLe = numCols >= 12 ? parseFloat(r[TC_CONFIG.COL.TY_LE_HOA_HONG_TC] || 0) || 0 : 0;
                let tyLeHoaHong, hoaHong, hhType;
                if (rawTyLe < 0) { hhType = 'fixed'; tyLeHoaHong = 0; hoaHong = Math.abs(rawTyLe); }
                else { hhType = 'percent'; tyLeHoaHong = rawTyLe; hoaHong = (loai === 'Thu' && congTacVien && tyLeHoaHong > 0) ? Math.round(soTien * tyLeHoaHong / 100) : 0; }

                const bienSoRecord = String(r[TC_CONFIG.COL.BIEN_SO] || '').trim();
                const xeInfo = bienSoRecord ? (xeMap[bienSoRecord.toUpperCase()] || null) : null;
                const modelOnRow = numCols >= 14 ? String(r[TC_CONFIG.COL.MODEL] || '').trim() : '';
                const tenXeEnriched = (xeInfo && xeInfo.tenXe) || modelOnRow || '';
                const hangXeEnriched = (xeInfo && xeInfo.hangXe) || (modelOnRow ? normalizeBrandName_(inferXeBrand_(modelOnRow, '')) : '') || '';

                records.push({
                    rowNum: sourceRowNum + (rowOffset || 0), sourceRowNum, sourceSheet: sh.getName(), stt: records.length + 1,
                    ngay: readDateFromCell(r[TC_CONFIG.COL.NGAY]), loai,
                    danhMuc: String(r[TC_CONFIG.COL.DANH_MUC] || '').trim(),
                    bienSo: String(r[TC_CONFIG.COL.BIEN_SO] || '').trim(),
                    khach, soTien,
                    ghiChu: String(r[TC_CONFIG.COL.GHI_CHU] || '').trim(),
                    chiNhanh: numCols >= 8 ? String(r[TC_CONFIG.COL.CHI_NHANH] || '').trim() : '',
                    batDau: numCols >= 9 ? readDateFromCell(r[TC_CONFIG.COL.BAT_DAU]) : '',
                    ketThuc: numCols >= 10 ? readDateFromCell(r[TC_CONFIG.COL.KET_THUC]) : '',
                    chungTuUrl: numCols >= 13 ? String(r[TC_CONFIG.COL.CHUNG_TU] || '').trim() : '',
                    ngayKetThucKH: khInfo.ngayKetThuc || '',
                    model: numCols >= 14 ? String(r[TC_CONFIG.COL.MODEL] || '').trim() : '',
                    tenXe: tenXeEnriched,
                    hangXe: hangXeEnriched,
                    giaVon: (numCols >= 15 ? parseMoneyValue(r[TC_CONFIG.COL.GIA_VON]) : 0) || ((xeInfo && xeInfo.giaVon) ? parseMoneyValue(xeInfo.giaVon) : 0),
                    giaBan: numCols >= 16 ? parseMoneyValue(r[TC_CONFIG.COL.GIA_BAN]) : 0,
                    loiNhuan: numCols >= 17 ? parseMoneyValue(r[TC_CONFIG.COL.LOI_NHUAN]) : 0,
                    nguoiMua: numCols >= 18 ? String(r[TC_CONFIG.COL.NGUOI_MUA] || '').trim() : '',
                    lienLacMua: numCols >= 19 ? String(r[TC_CONFIG.COL.LIEN_LAC] || '').trim() : '',
                    diaChiMua: numCols >= 20 ? String(r[TC_CONFIG.COL.DIA_CHI] || '').trim() : '',
                    maBan: numCols >= 21 ? String(r[TC_CONFIG.COL.MA_BAN] || '').trim() : '',
                    maXe: numCols >= 22 ? String(r[TC_CONFIG.COL.MA_XE] || '').trim() : '',
                    billSent: (function () {
                        if (!_hasBillSent) return false;
                        const v = r[TC_CONFIG.COL.BILL_SENT];
                        if (v === true) return true;
                        if (v === false || v === '' || v == null) return false;
                        const s = String(v).trim().toLowerCase();
                        return s === 'true' || s === '1' || s === 'x' || s === 'yes' || s === 'có';
                    })(),
                    congTacVien, tyLeHoaHong, hoaHong, hhType
                });
            });
        }
        readSheet_(thuSh, 'Thu', 0);
        readSheet_(chiSh, 'Chi', TC_CHI_ROW_OFFSET);
        if (filterLoai) records = records.filter(r => r.loai === filterLoai);
        if (filterMonth) records = records.filter(r => { if (!r.ngay) return false; const p = r.ngay.split('/'); return p.length === 3 ? (p[1] + '/' + p[2]) === filterMonth : false; });
        if (filterBranch) records = records.filter(r => r.chiNhanh === filterBranch);
        records.sort((a, b) => {
            const da = tryParseDate(a.ngay), db = tryParseDate(b.ngay);
            const ta = da ? da.getTime() : 0, tb = db ? db.getTime() : 0;
            if (tb !== ta) return tb - ta;              // ngày mới hơn lên trước
            const ra = Number(a.rowNum || a.sourceRowNum || 0), rb = Number(b.rowNum || b.sourceRowNum || 0);
            return rb - ra;                          // cùng ngày: dòng nhập sau lên trước
        });
        records.forEach((r, i) => r.stt = i + 1);

        // [v8 2026-05-15] FIX SYNC HH KH: Lấy ngày kết thúc LỚN NHẤT của mỗi khách
        // = max(KH master ngayKetThuc, các bản ghi Thu thuê có cột Kết Thúc).
        // Khắc phục trường hợp user nhập tay vào sheet Thu (gia hạn) mà chưa update sheet KH master.
        try {
            const RENTAL_CATS = ['Tiền thuê tháng', 'Thuê ngắn', 'Thuê mới'];
            const khEndMap = {}; // key = tên KH lowercase, value = Date object max
            // Seed từ KH master
            Object.keys(khMap).forEach(k => {
                const v = khMap[k] || {};
                if (v.ngayKetThuc) {
                    const d = tryParseDate(v.ngayKetThuc);
                    if (d) khEndMap[k] = d;
                }
            });
            // Quét records, lấy ketThuc của các bản ghi thuê
            records.forEach(r => {
                if (r.loai !== 'Thu') return;
                if (!RENTAL_CATS.includes(r.danhMuc)) return;
                const k = (r.khach || '').toLowerCase().trim();
                if (!k) return;
                if (!r.ketThuc) return;
                const d = tryParseDate(r.ketThuc);
                if (!d) return;
                if (!khEndMap[k] || d > khEndMap[k]) khEndMap[k] = d;
            });
            // Format Date → dd/MM/yyyy
            const fmtDMY = (d) => ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
            // Gán lại ngayKetThucKH cho từng record
            records.forEach(r => {
                const k = (r.khach || '').toLowerCase().trim();
                if (k && khEndMap[k]) r.ngayKetThucKH = fmtDMY(khEndMap[k]);
            });
        } catch (_eMaxKt) { Logger.log('maxKetThuc per KH error: ' + _eMaxKt.message); }

        const _tcResult = { success: true, data: records, stats: buildTCStats(records), branchStats: buildBranchStats(records) };
        // [FIX 2026-06] Không cache TC — đọc thẳng sheet
        return _tcResult;
    } catch (e) { Logger.log('getThuChiData: ' + e.message); return { success: false, error: e.message }; }
}
function buildTCStats(records) {
    let tongThu = 0, tongChi = 0;
    records.forEach(r => { if (r.loai === 'Thu') tongThu += r.soTien; else tongChi += r.soTien; });
    return { tongThu, tongChi, loiNhuan: tongThu - tongChi, soGiaoDich: records.length };
}
function buildBranchStats(records) {
    const map = {};
    records.forEach(r => {
        const bn = r.chiNhanh || 'Chưa phân loại';
        if (!map[bn]) map[bn] = { thu: 0, chi: 0, count: 0 };
        if (r.loai === 'Thu') map[bn].thu += r.soTien; else map[bn].chi += r.soTien;
        map[bn].count++;
    });
    Object.keys(map).forEach(k => map[k].loiNhuan = map[k].thu - map[k].chi);
    return map;
}


function isRentalRevenueCategory_(danhMuc) {
    // Chỉ danh mục thuê dài hạn/tháng mới được đồng bộ vào sheet QL Khách Hàng.
    // Thuê ngắn vẫn ghi nhận doanh thu ở QL Thu và vẫn có thể làm xe bận trong QL Xe,
    // nhưng KH thuê ngắn không được lưu vào danh sách khách hàng master.
    return isLongRentalCustomerCategory_(danhMuc);
}


function _textKey_(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function _plateKey_(s) {
    return String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
}
function _fmtDateObj_(d) {
    if (!d || isNaN(d.getTime())) return '';
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}
function _cleanVehicleNameFromNote_(note) {
    const s = String(note || '').trim();
    if (!s) return '';
    // Ví dụ: "Vision V1 - Cọc 3tr" → "Vision V1"
    return s.split(/\s+-\s+|\s+–\s+|\s+—\s+/)[0].trim();
}
function _parseDepositFromText_(txt) {
    const s = normalizeVN_(txt || '');
    const m = s.match(/coc\s*(\d+(?:[\.,]\d+)?)(\s*)(tr|trieu|k|ngan|nghin|ty)?/i);
    if (!m) return 0;
    let n = parseFloat(String(m[1]).replace(',', '.'));
    if (isNaN(n)) return 0;
    const unit = String(m[3] || '').toLowerCase();
    if (unit === 'ty') return Math.round(n * 1000000000);
    if (unit === 'tr' || unit === 'trieu' || !unit) return Math.round(n * 1000000);
    if (unit === 'k' || unit === 'ngan' || unit === 'nghin') return Math.round(n * 1000);
    return Math.round(n);
}
function _getVehicleMapByPlate_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(CONFIG.SHEET_XE);
    const map = {};
    if (!sh) return map;
    const lastRow = sh.getLastRow();
    if (lastRow < CONFIG.XE_DATA_START) return map;
    const raw = sh.getRange(CONFIG.XE_DATA_START, 1, lastRow - CONFIG.XE_DATA_START + 1, 7).getValues();
    raw.forEach(function (r, i) {
        const bs = _plateKey_(r[CONFIG.XE_COL.BIEN_SO]);
        if (!bs) return;
        map[bs] = {
            rowNum: CONFIG.XE_DATA_START + i,
            tenXe: String(r[CONFIG.XE_COL.TEN] || '').trim(),
            bienSo: String(r[CONFIG.XE_COL.BIEN_SO] || '').trim()
        };
    });
    return map;
}
function _readCustomerMap_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(CONFIG.SHEET_KH);
    const map = {};
    if (!sh) return { sheet: null, map: {}, rows: [] };
    const lastRow = sh.getLastRow();
    if (lastRow < CONFIG.KH_DATA_START) return { sheet: sh, map: {}, rows: [] };
    const numRows = lastRow - CONFIG.KH_DATA_START + 1;
    const raw = sh.getRange(CONFIG.KH_DATA_START, 1, numRows, 15).getValues();
    raw.forEach(function (r, i) {
        const name = String(r[CONFIG.KH_COL.TEN] || '').trim();
        if (!name) return;
        map[_textKey_(name)] = { rowNum: CONFIG.KH_DATA_START + i, row: r };
    });
    return { sheet: sh, map: map, rows: raw };
}
function _readRentalRowsFromThu_() {
    const sh = getOrCreateThuChiSheet_();
    const lastRow = sh.getLastRow();
    const records = [];
    if (lastRow < TC_CONFIG.TC_START) return records;
    const needCols = Math.max(12, sh.getLastColumn(), TC_CONFIG.COL.KET_THUC + 1, TC_CONFIG.COL.TY_LE_HOA_HONG_TC + 1);
    const raw = sh.getRange(TC_CONFIG.TC_START, 1, lastRow - TC_CONFIG.TC_START + 1, needCols).getValues();
    raw.forEach(function (r, i) {
        const rowNum = TC_CONFIG.TC_START + i;
        const loai = String(r[TC_CONFIG.COL.LOAI] || '').trim();
        const dm = String(r[TC_CONFIG.COL.DANH_MUC] || '').trim();
        if (loai !== 'Thu' || !isRentalRevenueCategory_(dm)) return;

        const khach = String(r[TC_CONFIG.COL.KHACH] || '').trim();
        if (!khach) return;

        const batDau = readDateFromCell(r[TC_CONFIG.COL.BAT_DAU]);
        const ketThuc = readDateFromCell(r[TC_CONFIG.COL.KET_THUC]);
        const endDate = tryParseDate(r[TC_CONFIG.COL.KET_THUC]) || tryParseDate(ketThuc);
        const txDate = tryParseDate(r[TC_CONFIG.COL.NGAY]) || tryParseDate(readDateFromCell(r[TC_CONFIG.COL.NGAY]));

        records.push({
            rowNum: rowNum,
            ngay: readDateFromCell(r[TC_CONFIG.COL.NGAY]),
            txDate: txDate,
            loai: loai,
            danhMuc: dm,
            bienSo: String(r[TC_CONFIG.COL.BIEN_SO] || '').trim(),
            khach: khach,
            soTien: parseMoneyValue(r[TC_CONFIG.COL.SO_TIEN]),
            ghiChu: String(r[TC_CONFIG.COL.GHI_CHU] || '').trim(),
            chiNhanh: String(r[TC_CONFIG.COL.CHI_NHANH] || '').trim(),
            batDau: batDau,
            ketThuc: ketThuc,
            endDate: endDate,
            congTacVien: String(r[TC_CONFIG.COL.CONG_TAC_VIEN_TC] || '').trim(),
            tyLeHoaHong: parseFloat(r[TC_CONFIG.COL.TY_LE_HOA_HONG_TC] || 0) || 0
        });
    });
    return records;
}
function _chooseLatestRentalRecord_(current, rec) {
    if (!current) return rec;
    const cEnd = current.endDate ? current.endDate.getTime() : 0;
    const rEnd = rec.endDate ? rec.endDate.getTime() : 0;
    if (rEnd !== cEnd) return rEnd > cEnd ? rec : current;
    const cTx = current.txDate ? current.txDate.getTime() : 0;
    const rTx = rec.txDate ? rec.txDate.getTime() : 0;
    if (rTx !== cTx) return rTx > cTx ? rec : current;
    return rec.rowNum > current.rowNum ? rec : current;
}

function _findLatestLongRentalRecordForCustomer_(customerName, plateOpt) {
    // Lấy kỳ thuê dài hạn mới nhất trực tiếp từ QL Thu.
    // Dùng cho popup khách hàng để tránh tình trạng QL Khách Hàng còn giữ ngày cũ.
    const target = _textKey_(customerName);
    if (!target) return null;
    const wantedPlate = _plateKey_(plateOpt || '');
    let bestSamePlate = null;
    let bestAnyPlate = null;

    _readRentalRowsFromThu_().forEach(function (rec) {
        if (_textKey_(rec.khach) !== target) return;
        if (!rec.ketThuc && !rec.batDau) return;

        bestAnyPlate = _chooseLatestRentalRecord_(bestAnyPlate, rec);

        // Nếu popup đang có biển số thì ưu tiên giao dịch cùng biển số.
        // Nếu dòng giao dịch thiếu biển số, vẫn cho phép dùng vì nhiều dòng gia hạn cũ có thể để trống biển số.
        if (!wantedPlate || !rec.bienSo || _plateKey_(rec.bienSo) === wantedPlate) {
            bestSamePlate = _chooseLatestRentalRecord_(bestSamePlate, rec);
        }
    });

    return bestSamePlate || bestAnyPlate;
}

function cleanShortRentalCustomersFromKhachHang(userInfo) {
    // Chạy thủ công nếu muốn dọn các khách thuê ngắn đã từng bị lưu vào QL Khách Hàng trước đây.
    // Chỉ xóa dòng KH có cặp Tên + Biển số xuất hiện ở QL Thu với danh mục Thuê ngắn
    // và không có lịch sử Thuê mới/Tiền thuê tháng cùng cặp Tên + Biển số.
    const lock = LockService.getDocumentLock();
    try {
        lock.waitLock(30000);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const khSh = ss.getSheetByName(CONFIG.SHEET_KH);
        const thuSh = getOrCreateThuChiSheet_();
        if (!khSh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');

        const shortKeys = {};
        const longKeys = {};
        const thuLast = thuSh.getLastRow();
        if (thuLast >= TC_CONFIG.TC_START) {
            const needCols = Math.max(thuSh.getLastColumn(), TC_CONFIG.COL.KET_THUC + 1);
            const rows = thuSh.getRange(TC_CONFIG.TC_START, 1, thuLast - TC_CONFIG.TC_START + 1, needCols).getValues();
            rows.forEach(function (r) {
                const loai = String(r[TC_CONFIG.COL.LOAI] || '').trim();
                const dm = String(r[TC_CONFIG.COL.DANH_MUC] || '').trim();
                if (loai !== 'Thu') return;
                const ten = _textKey_(r[TC_CONFIG.COL.KHACH]);
                const bs = _plateKey_(r[TC_CONFIG.COL.BIEN_SO]);
                if (!ten || !bs) return;
                const key = ten + '|' + bs;
                if (isShortRentalCategory_(dm)) shortKeys[key] = true;
                if (isLongRentalCustomerCategory_(dm)) longKeys[key] = true;
            });
        }

        const khLast = khSh.getLastRow();
        if (khLast < CONFIG.KH_DATA_START) return { success: true, deleted: 0, message: 'QL Khách Hàng chưa có dữ liệu.' };
        const numRows = khLast - CONFIG.KH_DATA_START + 1;
        const khRows = khSh.getRange(CONFIG.KH_DATA_START, 1, numRows, 15).getValues();
        const rowsToDelete = [];
        khRows.forEach(function (r, i) {
            const ten = _textKey_(r[CONFIG.KH_COL.TEN]);
            const bs = _plateKey_(r[CONFIG.KH_COL.BIEN_SO]);
            if (!ten || !bs) return;
            const key = ten + '|' + bs;
            if (shortKeys[key] && !longKeys[key]) rowsToDelete.push(CONFIG.KH_DATA_START + i);
        });

        rowsToDelete.reverse().forEach(function (rowNum) { khSh.deleteRow(rowNum); });
        if (rowsToDelete.length) {
            SpreadsheetApp.flush();
            try { clearXeKhCache_(); } catch (_c) { }
            try { invalidateTCCache_(); } catch (_t) { }
            logActivity_(userInfo, 'DỌN KH THUÊ NGẮN', 'Khách Hàng', 'QL Khách Hàng', 'Đã xóa ' + rowsToDelete.length + ' dòng khách thuê ngắn khỏi KH master');
        }
        return { success: true, deleted: rowsToDelete.length, message: 'Đã dọn ' + rowsToDelete.length + ' khách thuê ngắn khỏi QL Khách Hàng.' };
    } catch (e) {
        Logger.log('cleanShortRentalCustomersFromKhachHang: ' + e.message);
        return { success: false, error: e.message };
    } finally {
        try { lock.releaseLock(); } catch (_e) { }
    }
}

// [OPT/FIX 2026-05-21] Cache key cho fingerprint QL Thu để bỏ qua sync khi thật sự không có thay đổi.
// Bản cũ chỉ nhìn dòng cuối nên khi nhập/sửa "Thuê mới" ở giữa bảng, app có thể bỏ qua sync.
// Bản này hash toàn bộ vùng A:L — các cột ảnh hưởng đến sync KH/Xe.
const _RENTAL_SYNC_FP_KEY = 'JMB_RENTAL_SYNC_FP_V1';

function _md5Hex_(text) {
    const bytes = Utilities.computeDigest(
        Utilities.DigestAlgorithm.MD5,
        String(text || ''),
        Utilities.Charset.UTF_8
    );
    return bytes.map(function (b) {
        return ('0' + (b & 0xFF).toString(16)).slice(-2);
    }).join('');
}

function _computeThuFingerprint_() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName(TC_CONFIG.SHEET_TC);
        if (!sh) return '';

        const lr = sh.getLastRow();
        if (lr < TC_CONFIG.TC_START) return 'empty';

        // Theo dõi vùng A:L vì đây là vùng ảnh hưởng trực tiếp đến đồng bộ thuê:
        // Ngày, Loại, Danh mục, Biển số, Khách, Số tiền, Ghi chú, Chi nhánh,
        // Bắt đầu, Kết thúc, Cộng tác viên, Tỉ lệ HH.
        const watchCols = Math.min(Math.max(sh.getLastColumn(), 1), 12);
        const numRows = lr - TC_CONFIG.TC_START + 1;
        const values = sh.getRange(TC_CONFIG.TC_START, 1, numRows, watchCols).getValues();

        const raw = values.map(function (row) {
            return row.map(function (v) {
                if (v instanceof Date) return v.getTime();
                return String(v || '').trim();
            }).join('§');
        }).join('¶');

        return _md5Hex_(lr + '|' + watchCols + '|' + raw);
    } catch (e) {
        Logger.log('_computeThuFingerprint_: ' + e.message);
        return '';
    }
}

function _invalidateRentalSyncFingerprint_() {
    try { PropertiesService.getScriptProperties().deleteProperty(_RENTAL_SYNC_FP_KEY); } catch (_fp) { }
}

function repairRentalSyncNow(userInfo) {
    _invalidateRentalSyncFingerprint_();
    try { clearThuChiRelatedCache_(); } catch (_c) { }
    try { invalidateTCCache_(); } catch (_t) { }
    return syncAllRentalDataFromThuChi(userInfo || null);
}

function forceRentalSyncFromThuChi(userInfo) {
    return repairRentalSyncNow(userInfo || null);
}

function syncAllRentalDataFromThuChi(userInfo) {
    const lock = LockService.getDocumentLock();
    try {
        lock.waitLock(30000);

        // [OPT 2026-05-20] Skip toàn bộ sync nếu QL Thu không thay đổi từ lần sync trước.
        // Đây là lý do chính khiến mở app + chuyển tab bị chậm: mỗi session đều chạy lại full sync.
        const fpNow = _computeThuFingerprint_();
        const props = PropertiesService.getScriptProperties();
        const fpOld = props.getProperty(_RENTAL_SYNC_FP_KEY) || '';
        if (fpNow && fpNow === fpOld) {
            return { success: true, created: 0, updated: 0, scanned: 0, touched: 0, skipped: true, message: 'Bỏ qua: QL Thu không có thay đổi.' };
        }

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const khInfo = _readCustomerMap_();
        const khSh = khInfo.sheet;
        if (!khSh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');

        const vehicleMap = _getVehicleMapByPlate_();
        const records = _readRentalRowsFromThu_();
        const latestByCustomer = {};

        records.forEach(function (rec) {
            const key = _textKey_(rec.khach);
            if (!key) return;

            // Nếu dòng Thu không có biển số, fallback theo KH đang có trong QL KH.
            if (!rec.bienSo && khInfo.map[key]) {
                rec.bienSo = String(khInfo.map[key].row[CONFIG.KH_COL.BIEN_SO] || '').trim();
            }
            // Với khách mới, bắt buộc phải có biển số để gán xe.
            if (!rec.bienSo) return;
            latestByCustomer[key] = _chooseLatestRentalRecord_(latestByCustomer[key], rec);
        });

        // [OPT 2026-05-20] Gom các dòng cần update thành nhóm liên tục để giảm số lần setValues.
        let created = 0, updated = 0, touched = 0;
        const pendingUpdates = []; // {rowNum, row}
        const newRows = [];        // hàng mới sẽ append

        Object.keys(latestByCustomer).forEach(function (key) {
            const rec = latestByCustomer[key];
            const plateKey = _plateKey_(rec.bienSo);
            const vehicle = vehicleMap[plateKey] || null;
            const tenXe = (vehicle && vehicle.tenXe) || _cleanVehicleNameFromNote_(rec.ghiChu) || rec.bienSo;
            const deposit = rec.danhMuc === 'Thuê mới' ? _parseDepositFromText_(rec.ghiChu) : 0;
            const old = khInfo.map[key];

            if (old) {
                const row = old.row.slice();
                let changed = false;
                function setCol(idx, val) {
                    if (val === undefined || val === null) return;
                    const newVal = String(val).trim();
                    const oldVal = String(row[idx] || '').trim();
                    if (newVal && oldVal !== newVal) { row[idx] = val; changed = true; }
                }
                // [FIX 2026-06] Xe + biển số: CHỈ ghi khi ô đang trống
                // Tránh giao dịch Thu cũ đè ngược xe/biển số mới đã cập nhật cho khách
                if (tenXe && !String(row[CONFIG.KH_COL.XE_THUE] || '').trim()) { row[CONFIG.KH_COL.XE_THUE] = tenXe; changed = true; }
                if (rec.bienSo && !String(row[CONFIG.KH_COL.BIEN_SO] || '').trim()) { row[CONFIG.KH_COL.BIEN_SO] = rec.bienSo; changed = true; }
                const _existingGia_ = parseMoneyValue(row[CONFIG.KH_COL.GIA_THUE]);
                if (rec.soTien > 0 && _existingGia_ === 0) { row[CONFIG.KH_COL.GIA_THUE] = rec.soTien; changed = true; }
                if (deposit > 0 && parseMoneyValue(row[CONFIG.KH_COL.TIEN_COC]) !== deposit) { row[CONFIG.KH_COL.TIEN_COC] = deposit; changed = true; }
                setCol(CONFIG.KH_COL.NGAY_BAT_DAU, rec.batDau);
                setCol(CONFIG.KH_COL.NGAY_KET_THUC, rec.ketThuc);
                setCol(CONFIG.KH_COL.CONG_TAC_VIEN, rec.congTacVien);
                if (rec.tyLeHoaHong > 0 && Number(row[CONFIG.KH_COL.TY_LE_HOA_HONG] || 0) !== rec.tyLeHoaHong) { row[CONFIG.KH_COL.TY_LE_HOA_HONG] = rec.tyLeHoaHong; changed = true; }

                if (changed) {
                    pendingUpdates.push({ rowNum: old.rowNum, row: row });
                    old.row = row;
                    updated++;
                }
            } else {
                // [FIX 2026-06] Không tạo lại KH đã bị xóa thủ công (blacklist)
                if (typeof _isKhDeleted_ === 'function' && _isKhDeleted_(rec.khach)) { touched++; return; }
                const newRow = new Array(15).fill('');
                newRow[CONFIG.KH_COL.TEN] = rec.khach;
                newRow[CONFIG.KH_COL.XE_THUE] = tenXe;
                newRow[CONFIG.KH_COL.BIEN_SO] = rec.bienSo;
                newRow[CONFIG.KH_COL.GHI_CHU] = rec.ghiChu || '';
                newRow[CONFIG.KH_COL.GIA_THUE] = rec.soTien || 0;
                newRow[CONFIG.KH_COL.TIEN_COC] = deposit || 0;
                newRow[CONFIG.KH_COL.NGAY_BAT_DAU] = rec.batDau || '';
                newRow[CONFIG.KH_COL.NGAY_KET_THUC] = rec.ketThuc || '';
                newRow[CONFIG.KH_COL.CONG_TAC_VIEN] = rec.congTacVien || '';
                newRow[CONFIG.KH_COL.TY_LE_HOA_HONG] = rec.tyLeHoaHong || 0;
                newRows.push(newRow);
                created++;
            }
            touched++;
        });

        // [OPT] Ghi tất cả update bằng các block liền kề (giảm số getRange + setValues).
        // Sắp xếp theo rowNum, gom các rowNum liên tiếp thành 1 block setValues.
        if (pendingUpdates.length) {
            pendingUpdates.sort(function (a, b) { return a.rowNum - b.rowNum; });
            let i = 0;
            while (i < pendingUpdates.length) {
                let j = i;
                while (j + 1 < pendingUpdates.length && pendingUpdates[j + 1].rowNum === pendingUpdates[j].rowNum + 1) j++;
                const block = pendingUpdates.slice(i, j + 1).map(function (p) { return p.row; });
                khSh.getRange(pendingUpdates[i].rowNum, 1, block.length, 15).setValues(block);
                i = j + 1;
            }
        }

        // [OPT] Append nhiều dòng mới bằng 1 lệnh setValues cuối sheet.
        if (newRows.length) {
            const startRow = khSh.getLastRow() + 1;
            khSh.getRange(startRow, 1, newRows.length, 15).setValues(newRows);
            // Cập nhật khInfo.map cho dòng vừa append
            Object.keys(latestByCustomer).forEach(function (key) {
                if (!khInfo.map[key]) {
                    // không update vì append đã xong, người gọi tiếp theo sẽ đọc lại
                }
            });
        }

        if (created || updated) {
            // Lưu fingerprint mới
            try { props.setProperty(_RENTAL_SYNC_FP_KEY, fpNow); } catch (_fp) { }
            // Không gọi SpreadsheetApp.flush() ở đây — Apps Script đã commit sau khi handler kết thúc.
            try { clearThuChiRelatedCache_(); } catch (_c) { }
            try { invalidateTCCache_(); } catch (_t) { }
            try { syncXeStatusToSheet(); } catch (_x) { Logger.log('syncXeStatusToSheet after rental sync: ' + _x.message); }
            logActivity_(userInfo, 'ĐỒNG BỘ THU → KH/XE', 'Thu Chi', 'QL Thu', 'Tạo mới KH: ' + created + ' · Cập nhật KH: ' + updated + ' · Quét: ' + touched);
        } else if (fpNow) {
            // Không có thay đổi thực sự nhưng vẫn lưu fingerprint để session sau không quét lại.
            try { props.setProperty(_RENTAL_SYNC_FP_KEY, fpNow); } catch (_fp) { }
        }

        return { success: true, created: created, updated: updated, scanned: records.length, touched: touched, message: 'Đồng bộ xong: tạo mới ' + created + ' KH, cập nhật ' + updated + ' KH.' };
    } catch (e) {
        Logger.log('syncAllRentalDataFromThuChi: ' + e.message);
        return { success: false, error: e.message };
    } finally {
        try { lock.releaseLock(); } catch (_e) { }
    }
}

// [OPT 2026-05-20] Sync NHẸ chỉ cho 1 KH + 1 xe vừa được sửa bởi Thu/Chi.
// Dùng thay cho syncAllRentalDataFromThuChi trong add/update/delete Thu/Chi để rút gọn thời gian.
function _syncSingleKhFromTC_(formData, userInfo) {
    try {
        const tenKH = String((formData && formData.khach) || '').trim();
        const bienSo = String((formData && formData.bienSo) || '').trim();
        if (!tenKH || !bienSo) return null;
        if (!isLongRentalCustomerCategory_(formData.danhMuc)) return null;

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const khSh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!khSh) return null;

        // Lookup tên xe từ QL Xe (1 lần đọc full cột Tên+Biển Số là chấp nhận được)
        var tenXe = '';
        const xeSh = ss.getSheetByName(CONFIG.SHEET_XE);
        if (xeSh) {
            const xeLR = xeSh.getLastRow();
            if (xeLR >= CONFIG.XE_DATA_START) {
                const xeData = xeSh.getRange(CONFIG.XE_DATA_START, 1, xeLR - CONFIG.XE_DATA_START + 1, CONFIG.XE_COL.BIEN_SO + 1).getValues();
                const bsLower = bienSo.toLowerCase();
                for (let i = 0; i < xeData.length; i++) {
                    if (String(xeData[i][CONFIG.XE_COL.BIEN_SO] || '').trim().toLowerCase() === bsLower) {
                        tenXe = String(xeData[i][CONFIG.XE_COL.TEN] || '').trim();
                        break;
                    }
                }
            }
        }
        if (!tenXe) tenXe = _cleanVehicleNameFromNote_((formData && formData.ghiChu) || '') || bienSo;

        const batDau = formatDateForSheet(formData.batDau || '');
        const ketThuc = formatDateForSheet(formData.ketThuc || '');
        const soTien = parseMoneyValue(formData.soTien);
        const deposit = formData.danhMuc === 'Thuê mới' ? _parseDepositFromText_(formData.ghiChu || '') : 0;
        const ctv = String(formData.congTacVien || '').trim();
        const tlhh = parseFloat(formData.tyLeHoaHong || 0) || 0;

        const khRowNum = findKhachHangRow_(tenKH);
        if (khRowNum === -1) {
            if (typeof _isKhDeleted_ === 'function' && _isKhDeleted_(tenKH)) return { created: 0, updated: 0 };
            // Tạo mới — 1 lệnh appendRow
            const newRow = new Array(15).fill('');
            newRow[CONFIG.KH_COL.TEN] = tenKH;
            newRow[CONFIG.KH_COL.XE_THUE] = tenXe;
            newRow[CONFIG.KH_COL.BIEN_SO] = bienSo;
            newRow[CONFIG.KH_COL.GHI_CHU] = formData.ghiChu || '';
            newRow[CONFIG.KH_COL.GIA_THUE] = soTien || 0;
            newRow[CONFIG.KH_COL.TIEN_COC] = deposit || 0;
            newRow[CONFIG.KH_COL.NGAY_BAT_DAU] = batDau;
            newRow[CONFIG.KH_COL.NGAY_KET_THUC] = ketThuc;
            newRow[CONFIG.KH_COL.CONG_TAC_VIEN] = ctv;
            newRow[CONFIG.KH_COL.TY_LE_HOA_HONG] = tlhh;
            khSh.appendRow(newRow);
            return { created: 1, updated: 0 };
        }

        // Cập nhật KH cũ — đọc 1 dòng, sửa rồi ghi 1 lần
        const row = khSh.getRange(khRowNum, 1, 1, 15).getValues()[0];
        let changed = false;
        function setCol(idx, val) {
            if (val === undefined || val === null) return;
            const newVal = String(val).trim();
            const oldVal = String(row[idx] || '').trim();
            if (newVal && oldVal !== newVal) { row[idx] = val; changed = true; }
        }
        // [FIX 2026-06] Xe + biển số: CHỈ ghi khi ô đang trống
        if (tenXe && !String(row[CONFIG.KH_COL.XE_THUE] || '').trim()) { row[CONFIG.KH_COL.XE_THUE] = tenXe; changed = true; }
        if (bienSo && !String(row[CONFIG.KH_COL.BIEN_SO] || '').trim()) { row[CONFIG.KH_COL.BIEN_SO] = bienSo; changed = true; }
        const _curGia = parseMoneyValue(row[CONFIG.KH_COL.GIA_THUE]);
        if (soTien > 0 && _curGia === 0) { row[CONFIG.KH_COL.GIA_THUE] = soTien; changed = true; }
        if (deposit > 0 && parseMoneyValue(row[CONFIG.KH_COL.TIEN_COC]) !== deposit) { row[CONFIG.KH_COL.TIEN_COC] = deposit; changed = true; }
        // Ngày BD: chỉ set nếu KH chưa có (giữ lịch sử ngày bắt đầu gốc)
        const _curBD = String(row[CONFIG.KH_COL.NGAY_BAT_DAU] || '').trim();
        if (batDau && !_curBD) { row[CONFIG.KH_COL.NGAY_BAT_DAU] = batDau; changed = true; }
        // Ngày KT: lấy MAX để gia hạn liên tục
        if (ketThuc) {
            const oldD = tryParseDate(String(row[CONFIG.KH_COL.NGAY_KET_THUC] || '').trim());
            const newD = tryParseDate(ketThuc);
            if (newD && (!oldD || newD > oldD)) { row[CONFIG.KH_COL.NGAY_KET_THUC] = ketThuc; changed = true; }
        }
        setCol(CONFIG.KH_COL.CONG_TAC_VIEN, ctv);
        if (tlhh > 0 && Number(row[CONFIG.KH_COL.TY_LE_HOA_HONG] || 0) !== tlhh) {
            row[CONFIG.KH_COL.TY_LE_HOA_HONG] = tlhh; changed = true;
        }
        if (changed) {
            khSh.getRange(khRowNum, 1, 1, 15).setValues([row]);
            return { created: 0, updated: 1 };
        }
        return { created: 0, updated: 0 };
    } catch (e) {
        Logger.log('_syncSingleKhFromTC_: ' + e.message);
        return null;
    }
}

// [OPT 2026-05-20] Cập nhật trạng thái chỉ MỘT dòng QL Xe theo biển số.
function _updateOneXeStatus_(bienSo) {
    try {
        if (!bienSo) return;
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const xeSh = ss.getSheetByName(CONFIG.SHEET_XE);
        if (!xeSh) return;
        const lastRow = xeSh.getLastRow();
        if (lastRow < CONFIG.XE_DATA_START) return;
        // Map biển số → khách (tính cả thuê ngắn)
        const map = buildBienSoToKhachMap();
        const target = String(bienSo).trim().toUpperCase();
        const bsArr = xeSh.getRange(CONFIG.XE_DATA_START, CONFIG.XE_COL.BIEN_SO + 1, lastRow - CONFIG.XE_DATA_START + 1, 1).getValues();
        for (let i = 0; i < bsArr.length; i++) {
            if (String(bsArr[i][0] || '').trim().toUpperCase() === target) {
                const rowNum = CONFIG.XE_DATA_START + i;
                const STATUS_COL = 8, KHACH_COL = 9;
                // Header (set 1 lần, idempotent)
                xeSh.getRange(1, STATUS_COL).setValue('Trạng Thái');
                xeSh.getRange(1, KHACH_COL).setValue('Khách Thuê');
                const kh = map[target] || '';
                const isRented = !!kh;
                const tt = isRented ? 'Đang thuê' : 'Trống';
                xeSh.getRange(rowNum, STATUS_COL).setValue(tt)
                    .setFontColor(isRented ? '#1d4ed8' : '#15803d')
                    .setBackground(isRented ? '#eff6ff' : '#f0fdf4');
                xeSh.getRange(rowNum, KHACH_COL).setValue(kh);
                return;
            }
        }
    } catch (e) { Logger.log('_updateOneXeStatus_: ' + e.message); }
}

function findLatestRentalDatesByCustomer_() {
    const result = {};
    const sheets = [getOrCreateThuChiSheet_()]; // Thu nằm ở QL Thu Chi; QL Chi không cần quét

    sheets.forEach(sh => {
        const lastRow = sh.getLastRow();
        if (lastRow < TC_CONFIG.TC_START) return;

        const numCols = Math.min(sh.getLastColumn(), 20);
        const rows = sh.getRange(TC_CONFIG.TC_START, 1, lastRow - TC_CONFIG.TC_START + 1, numCols).getValues();

        rows.forEach(r => {
            const loai = String(r[TC_CONFIG.COL.LOAI] || '').trim();
            const danhMuc = String(r[TC_CONFIG.COL.DANH_MUC] || '').trim();
            const khach = String(r[TC_CONFIG.COL.KHACH] || '').trim();
            if (loai !== 'Thu' || !khach || !isRentalRevenueCategory_(danhMuc)) return;

            const batDauRaw = r[TC_CONFIG.COL.BAT_DAU];
            const ketThucRaw = r[TC_CONFIG.COL.KET_THUC];
            const batDau = readDateFromCell(batDauRaw);
            const ketThuc = readDateFromCell(ketThucRaw);
            const endDate = tryParseDate(ketThucRaw) || tryParseDate(ketThuc);
            if (!ketThuc || !endDate) return;

            const key = _textKey_(khach);
            if (!result[key] || endDate > result[key].endDate) {
                result[key] = { khach, batDau, ketThuc, endDate };
            }
        });
    });

    return result;
}

function syncCustomerRentalDatesFromThuChi(customerName, userInfo) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const khSh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!khSh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');

        const target = _textKey_(customerName);
        if (!target) throw new Error('Thiếu tên khách hàng để đồng bộ.');

        const latestMap = findLatestRentalDatesByCustomer_();
        const latest = latestMap[target];
        if (!latest) return { success: true, updated: false, message: 'Không tìm thấy kỳ thuê mới để đồng bộ cho khách hàng này.' };

        const rowNum = findKhachHangRow_(customerName);
        if (rowNum === -1) throw new Error('Không tìm thấy khách hàng trong QL Khách Hàng: "' + customerName + '"');

        khSh.getRange(rowNum, CONFIG.KH_COL.NGAY_BAT_DAU + 1).setValue(latest.batDau || '');
        khSh.getRange(rowNum, CONFIG.KH_COL.NGAY_KET_THUC + 1).setValue(latest.ketThuc || '');
        SpreadsheetApp.flush();

        logActivity_(userInfo, 'ĐỒNG BỘ HẠN THUÊ', 'Khách Hàng', latest.khach, 'Từ Thu/Chi: ' + (latest.batDau || '--') + ' → ' + latest.ketThuc);
        return { success: true, updated: true, message: 'Đã đồng bộ hạn thuê mới nhất cho ' + latest.khach + ': ' + latest.ketThuc };
    } catch (e) { Logger.log('syncCustomerRentalDatesFromThuChi: ' + e.message); return { success: false, error: e.message }; }
}

function syncAllCustomerRentalDatesFromThuChi(userInfo) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const khSh = ss.getSheetByName(CONFIG.SHEET_KH);
        if (!khSh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_KH + '"');

        const latestMap = findLatestRentalDatesByCustomer_();
        const lastRow = khSh.getLastRow();
        if (lastRow < CONFIG.KH_DATA_START) return { success: true, updatedCount: 0, message: 'Sheet khách hàng chưa có dữ liệu.' };

        const numRows = lastRow - CONFIG.KH_DATA_START + 1;
        const names = khSh.getRange(CONFIG.KH_DATA_START, CONFIG.KH_COL.TEN + 1, numRows, 1).getValues();
        const oldDates = khSh.getRange(CONFIG.KH_DATA_START, CONFIG.KH_COL.NGAY_BAT_DAU + 1, numRows, 2).getValues();
        const newDates = oldDates.map(r => r.slice());

        let updatedCount = 0;
        names.forEach((r, i) => {
            const name = String(r[0] || '').trim();
            if (!name) return;
            const latest = latestMap[_textKey_(name)];
            if (!latest) return;

            const oldBD = readDateFromCell(oldDates[i][0]);
            const oldKT = readDateFromCell(oldDates[i][1]);
            if (oldBD !== latest.batDau || oldKT !== latest.ketThuc) {
                newDates[i][0] = latest.batDau || '';
                newDates[i][1] = latest.ketThuc || '';
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            khSh.getRange(CONFIG.KH_DATA_START, CONFIG.KH_COL.NGAY_BAT_DAU + 1, numRows, 2).setValues(newDates);
            SpreadsheetApp.flush();
            logActivity_(userInfo, 'ĐỒNG BỘ HẠN THUÊ', 'Khách Hàng', 'Tất cả', 'Đã cập nhật ' + updatedCount + ' khách hàng từ Thu/Chi');
        }

        return { success: true, updatedCount, message: 'Đã đồng bộ ' + updatedCount + ' khách hàng.' };
    } catch (e) { Logger.log('syncAllCustomerRentalDatesFromThuChi: ' + e.message); return { success: false, error: e.message }; }
}

function addThuChi(formData, userInfo) {
    try {
        assertThuChiWrite_(userInfo);
        if (String(formData.danhMuc || '').trim() === 'Bán xe') return sellVehicleFromThuChi_(formData, userInfo);
        if (!formData.loai) throw new Error('Vui lòng chọn Loại (Thu/Chi).');
        const sh = getThuChiTargetSheet_(formData.loai);
        if (!formData.danhMuc) throw new Error('Vui lòng chọn Danh Mục.');
        if (!formData.soTien || parseMoneyValue(formData.soTien) <= 0) throw new Error('Số tiền phải lớn hơn 0.');
        const batDau = formData.batDau ? formatDateForSheet(formData.batDau) : '';
        const ketThuc = formData.ketThuc ? formatDateForSheet(formData.ketThuc) : '';
        // [v3] Chỉ bắt buộc ngày BĐ/KT cho danh mục thuê (tháng + ngắn), không phải Bảo dưỡng/Phụ thu/Cọc
        const REQUIRE_DATES = isLongRentalCustomerCategory_(formData.danhMuc) || isShortRentalCategory_(formData.danhMuc);
        if (formData.loai === 'Thu' && formData.khach && REQUIRE_DATES && (!batDau || !ketThuc)) {
            throw new Error('Vui lòng nhập Bắt đầu và Kết thúc kỳ thuê.');
        }
        const loai = String(formData.loai || '').trim();
        const ctvTc = loai === 'Thu' ? String(formData.congTacVien || '').trim() : '';
        let tlTc = 0;
        if (loai === 'Thu' && ctvTc) {
            if (String(formData.hhType || '') === 'fixed') { const fHH = parseMoneyValue(formData.hoaHong || 0); tlTc = fHH > 0 ? -fHH : 0; }
            else { tlTc = parseFloat(formData.tyLeHoaHong || 0) || 0; }
        }
        const row = [formData.ngay || formatDate(new Date()), loai, formData.danhMuc || '', formData.bienSo || '', loai === 'Thu' ? (formData.khach || '') : '', parseMoneyValue(formData.soTien), formData.ghiChu || '', formData.chiNhanh || '', batDau, ketThuc, ctvTc, tlTc, '', '', 0, 0, 0, '', '', '', '', '', false];
        // ^ index 22 = BILL_SENT = false — đảm bảo cột W luôn tồn tại
        sh.appendRow(row);
        clearThuChiRelatedCache_(); // [OPT] xóa cache sau khi ghi
        // [OPT 2026-05-20] Đồng bộ NHẸ: chỉ chạm đúng 1 KH + 1 xe vừa ảnh hưởng,
        // thay vì quét toàn bộ QL Thu / QL KH / QL Xe (chậm 1–3 giây/lần).
        let giaHanMsg = '';
        if (loai === 'Thu' && isRentalRevenueCategory_(formData.danhMuc)) {
            try {
                const syncR = _syncSingleKhFromTC_(formData, userInfo);
                if (syncR) giaHanMsg = ' · Đã đồng bộ KH/Xe.';
                // Cập nhật trạng thái xe (chỉ 1 dòng)
                _updateOneXeStatus_(formData.bienSo);
                // Invalidate fingerprint để lần sync full tiếp theo (nếu có) sẽ chạy lại
                try { PropertiesService.getScriptProperties().deleteProperty(_RENTAL_SYNC_FP_KEY); } catch (_) { }
            } catch (e) { Logger.log('addThuChi targeted sync: ' + e.message); }
        } else if (loai === 'Thu' && isShortRentalCategory_(formData.danhMuc)) {
            try {
                // Thuê ngắn không lưu vào QL KH, chỉ cập nhật trạng thái 1 xe.
                _updateOneXeStatus_(formData.bienSo);
                giaHanMsg = ' · Thuê ngắn không lưu vào QL Khách Hàng.';
            } catch (e) { Logger.log('addThuChi _updateOneXeStatus_ short rental: ' + e.message); }
        } else if (formData.loai === 'Thu') {
            autoSyncFromThuChi_(formData, userInfo);
        }
        logActivity_(userInfo, 'THÊM TC', 'Thu Chi', formData.loai + ' ' + formData.danhMuc, parseMoneyValue(formData.soTien) + ' đ');
        return { success: true, message: 'Đã ghi nhận ' + formData.loai.toLowerCase() + ': ' + formData.danhMuc + giaHanMsg };
    } catch (e) { Logger.log('addThuChi: ' + e.message); return { success: false, error: e.message }; }
}
function sellVehicleFromThuChi_(formData, userInfo) {
    const lock = LockService.getDocumentLock();
    try {
        lock.waitLock(30000);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const tcSh = getOrCreateThuChiSheet_();
        const soldSh = getOrCreateXeDaBanSheet_();
        if (String(formData.loai || '') !== 'Thu') throw new Error('Bán xe phải là giao dịch Thu.');
        const bienSo = String(formData.bienSo || '').trim().toUpperCase();
        if (!bienSo) throw new Error('Vui lòng chọn xe bán.');
        const xeInfo = findXeRowByBienSo_(bienSo);
        if (!xeInfo) throw new Error('Không tìm thấy xe cần bán trong QL Xe.');
        const vehicle = xeInfo.vehicle;
        const giaVon = parseMoneyValue(formData.giaVon || vehicle.giaVon);
        const giaBan = parseMoneyValue(formData.giaBan || formData.soTien);
        if (giaBan <= 0) throw new Error('Giá bán phải lớn hơn 0.');
        const loiNhuan = giaBan - giaVon;
        const maBan = generateSaleId_();
        const ngayBan = formData.ngay || formatDate(new Date());
        const lichSu = buildVehicleHistorySnapshot_(vehicle);
        soldSh.appendRow([maBan, ngayBan, vehicle.maXe, vehicle.tenXe, vehicle.hangXe, vehicle.mauSon, vehicle.nam, vehicle.bienSo, vehicle.giaVon, giaBan, loiNhuan, formData.nguoiMua || '', formData.lienLac || '', formData.diaChi || '', formData.chiNhanh || '', (userInfo && userInfo.ten) || '', formData.ghiChu || '', lichSu, maBan, new Date(), (userInfo && userInfo.email) || ((userInfo && userInfo.ten) || '')]);
        tcSh.appendRow([ngayBan, 'Thu', 'Bán xe', vehicle.bienSo, '', loiNhuan, formData.ghiChu || '', formData.chiNhanh || '', '', '', '', 0, '', vehicle.tenXe, giaVon, giaBan, loiNhuan, formData.nguoiMua || '', formData.lienLac || '', formData.diaChi || '', maBan, vehicle.maXe]);
        ss.getSheetByName(CONFIG.SHEET_XE).deleteRow(xeInfo.rowNum);
        SpreadsheetApp.flush();
        clearThuChiRelatedCache_(); // [OPT] xóa cache sau khi bán xe
        try { clearXeKhCache_(); } catch (_) { }
        logActivity_(userInfo, 'BÁN XE', 'Xe Đã Bán', vehicle.bienSo, 'Mã bán: ' + maBan + ' · Giá bán: ' + giaBan);
        return { success: true, message: 'Đã bán xe ' + vehicle.bienSo + ' và chuyển sang module Xe Đã Bán.', saleId: maBan };
    } catch (e) { return { success: false, error: e.message }; }
    finally { try { lock.releaseLock(); } catch (_e) { } }
}
function updateThuChi(rowNum, formData, userInfo) {
    try {
        assertAdmin_(userInfo, 'sửa Thu/Chi');
        const resolved = resolveThuChiSheetAndRow_(rowNum);
        const sh = resolved.sheet;
        rowNum = resolved.rowNum;
        const existing = sh.getRange(rowNum, 1, 1, 22).getValues()[0];
        const maBan = String(existing[TC_CONFIG.COL.MA_BAN] || '').trim();
        if (String(formData.danhMuc || '').trim() === 'Bán xe' || maBan) {
            const lookupInfo = findVehicleSaleInfoByBienSo_(formData.bienSo || existing[TC_CONFIG.COL.BIEN_SO] || '');
            const giaVon = parseMoneyValue(formData.giaVon || existing[TC_CONFIG.COL.GIA_VON] || ((lookupInfo && lookupInfo.giaVon) || 0));
            const giaBan = parseMoneyValue(formData.giaBan || formData.soTien || existing[TC_CONFIG.COL.GIA_BAN] || existing[TC_CONFIG.COL.SO_TIEN]);
            const loiNhuan = giaBan - giaVon;
            const model = formData.model || existing[TC_CONFIG.COL.MODEL] || ((lookupInfo && (lookupInfo.tenXe || lookupInfo.model)) || '');
            sh.getRange(rowNum, 1, 1, 22).setValues([[formData.ngay || existing[0], 'Thu', 'Bán xe', formData.bienSo || existing[3], '', loiNhuan, formData.ghiChu || '', formData.chiNhanh || '', '', '', '', 0, existing[TC_CONFIG.COL.CHUNG_TU] || '', model, giaVon, giaBan, loiNhuan, formData.nguoiMua || '', formData.lienLac || '', formData.diaChi || '', maBan || generateSaleId_(), formData.maXe || existing[TC_CONFIG.COL.MA_XE] || ((lookupInfo && lookupInfo.maXe) || '')]]);
            const soldSh = getOrCreateXeDaBanSheet_();
            const soldData = soldSh.getRange(TC_CONFIG.SOLD_START, 1, Math.max(0, soldSh.getLastRow() - 1), 21).getValues();
            for (let i = 0; i < soldData.length; i++) {
                if (String(soldData[i][0] || '').trim() === (maBan || existing[TC_CONFIG.COL.MA_BAN] || '')) {
                    soldData[i][1] = formData.ngay || existing[0]; soldData[i][9] = giaBan; soldData[i][10] = loiNhuan; soldData[i][11] = formData.nguoiMua || ''; soldData[i][12] = formData.lienLac || ''; soldData[i][13] = formData.diaChi || ''; soldData[i][14] = formData.chiNhanh || ''; soldData[i][16] = formData.ghiChu || '';
                    soldSh.getRange(TC_CONFIG.SOLD_START + i, 1, 1, 21).setValues([soldData[i]]); break;
                }
            }
            clearThuChiRelatedCache_();
            logActivity_(userInfo, 'SỬA GIAO DỊCH BÁN', 'Xe Đã Bán', formData.bienSo || existing[3], '');
            return { success: true, message: 'Đã cập nhật giao dịch bán xe.' };
        }
        const batDau = formData.batDau ? formatDateForSheet(formData.batDau) : '';
        const ketThuc = formData.ketThuc ? formatDateForSheet(formData.ketThuc) : '';
        const _loaiU = String(formData.loai || existing[1] || '').trim();
        const _ctvU = String(formData.congTacVien || existing[TC_CONFIG.COL.CONG_TAC_VIEN_TC] || '').trim();
        let tlTcU;
        if (_loaiU === 'Thu' && _ctvU && formData.hhType === 'fixed') { const fHH = parseMoneyValue(formData.hoaHong || 0); tlTcU = fHH > 0 ? -fHH : 0; }
        else { tlTcU = parseFloat(formData.tyLeHoaHong ?? existing[TC_CONFIG.COL.TY_LE_HOA_HONG_TC] ?? 0) || 0; }
        sh.getRange(rowNum, 1, 1, 22).setValues([[formData.ngay || existing[0], formData.loai || existing[1], formData.danhMuc || existing[2], formData.bienSo || existing[3], formData.khach || existing[4], parseMoneyValue(formData.soTien || existing[5]), formData.ghiChu || '', formData.chiNhanh || '', batDau, ketThuc, _ctvU, tlTcU, existing[TC_CONFIG.COL.CHUNG_TU] || '', existing[TC_CONFIG.COL.MODEL] || '', existing[TC_CONFIG.COL.GIA_VON] || '', existing[TC_CONFIG.COL.GIA_BAN] || '', existing[TC_CONFIG.COL.LOI_NHUAN] || '', existing[TC_CONFIG.COL.NGUOI_MUA] || '', existing[TC_CONFIG.COL.LIEN_LAC] || '', existing[TC_CONFIG.COL.DIA_CHI] || '', existing[TC_CONFIG.COL.MA_BAN] || '', existing[TC_CONFIG.COL.MA_XE] || '']]);
        const updatedLoai = String(formData.loai || existing[1] || '').trim();
        const updatedDm = String(formData.danhMuc || existing[2] || '').trim();
        const updatedKhach = String(formData.khach || existing[4] || '').trim();
        const updatedBienSo = String(formData.bienSo || existing[3] || '').trim();
        if (updatedLoai === 'Thu' && updatedKhach && isRentalRevenueCategory_(updatedDm)) {
            try {
                // [OPT 2026-05-20] Sync nhẹ thay cho syncAllRentalDataFromThuChi (chỉ 1 KH + 1 xe).
                _syncSingleKhFromTC_({
                    khach: updatedKhach, bienSo: updatedBienSo, danhMuc: updatedDm,
                    batDau: formData.batDau, ketThuc: formData.ketThuc,
                    soTien: formData.soTien, ghiChu: formData.ghiChu,
                    congTacVien: formData.congTacVien, tyLeHoaHong: formData.tyLeHoaHong
                }, userInfo);
                _updateOneXeStatus_(updatedBienSo);
                try { PropertiesService.getScriptProperties().deleteProperty(_RENTAL_SYNC_FP_KEY); } catch (_) { }
            } catch (e) { Logger.log('updateThuChi targeted sync: ' + e.message); }
        } else if (updatedLoai === 'Thu' && updatedKhach && isShortRentalCategory_(updatedDm)) {
            try { _updateOneXeStatus_(updatedBienSo); } catch (e) { Logger.log('updateThuChi _updateOneXeStatus_ short rental: ' + e.message); }
        }
        clearThuChiRelatedCache_(); // [OPT] xóa cache sau khi sửa
        logActivity_(userInfo, 'SỬA TC', 'Thu Chi', String(formData.loai || existing[1]) + ' ' + String(formData.danhMuc || existing[2]), '');
        return { success: true, message: 'Đã cập nhật Thu/Chi.' };
    } catch (e) { return { success: false, error: e.message }; }
}
function deleteThuChi(rowNum, userInfo) {

    try {
        assertThuChiDelete_(userInfo);
        const resolved = resolveThuChiSheetAndRow_(rowNum);
        const sh = resolved.sheet;
        rowNum = resolved.rowNum;
        const row = sh.getRange(rowNum, 1, 1, 22).getValues()[0];
        const maBan = String(row[TC_CONFIG.COL.MA_BAN] || '').trim();
        if (maBan) {
            const soldSh = getOrCreateXeDaBanSheet_();
            const lr = soldSh.getLastRow();
            if (lr >= TC_CONFIG.SOLD_START) {
                const vals = soldSh.getRange(TC_CONFIG.SOLD_START, 1, lr - TC_CONFIG.SOLD_START + 1, 1).getValues().flat();
                for (let i = 0; i < vals.length; i++) { if (String(vals[i] || '').trim() === maBan) { soldSh.deleteRow(TC_CONFIG.SOLD_START + i); break; } }
            }
            logActivity_(userInfo, 'XÓA GIAO DỊCH BÁN', 'Xe Đã Bán', String(row[TC_CONFIG.COL.BIEN_SO] || ''), maBan);
        }
        const deletedKhach = String(row[TC_CONFIG.COL.KHACH] || '').trim();
        const deletedBienSo = String(row[TC_CONFIG.COL.BIEN_SO] || '').trim();
        const deletedLoai = String(row[TC_CONFIG.COL.LOAI] || '').trim();
        const deletedDanhMuc = String(row[TC_CONFIG.COL.DANH_MUC] || '').trim();
        sh.deleteRow(rowNum);
        clearThuChiRelatedCache_(); // [OPT] xóa cache sau khi xóa
        if (deletedLoai === 'Thu' && deletedKhach && isRentalRevenueCategory_(deletedDanhMuc)) {
            try {
                // [OPT 2026-05-20] Khi xóa có thể làm thay đổi ngày kết thúc max → invalidate fingerprint
                // để lần sync full kế tiếp sẽ chạy lại. Trạng thái xe vẫn cập nhật ngay (1 dòng).
                try { PropertiesService.getScriptProperties().deleteProperty(_RENTAL_SYNC_FP_KEY); } catch (_) { }
                _updateOneXeStatus_(deletedBienSo);
            } catch (e) { Logger.log('deleteThuChi targeted sync: ' + e.message); }
        } else if (deletedLoai === 'Thu' && deletedKhach && isShortRentalCategory_(deletedDanhMuc)) {
            try { _updateOneXeStatus_(deletedBienSo); } catch (e) { Logger.log('deleteThuChi _updateOneXeStatus_ short rental: ' + e.message); }
        }
        logActivity_(userInfo, 'XÓA TC', 'Thu Chi', String(row[1]) + ' ' + String(row[2]), '');
        return { success: true, message: 'Đã xóa bản ghi.' };
    } catch (e) { Logger.log('deleteThuChi: ' + e.message); return { success: false, error: e.message }; }
}
function addTCAttachment(rowNum, fileBase64, fileName, mimeType, userInfo) {
    try {
        assertThuChiWrite_(userInfo);
        const resolved = resolveThuChiSheetAndRow_(rowNum);
        const sh = resolved.sheet;
        rowNum = resolved.rowNum;
        const r = uploadFileToDrive(fileBase64, fileName, mimeType);
        if (!r.success) throw new Error(r.error);
        sh.getRange(rowNum, TC_CONFIG.COL.CHUNG_TU + 1).setValue(r.url);
        return { success: true, url: r.url, message: 'Đã đính kèm chứng từ.' };
    } catch (e) { Logger.log('addTCAttachment: ' + e.message); return { success: false, error: e.message }; }
}

function migrateChiToSeparateSheet() {
    const thuSh = getOrCreateThuChiSheet_();
    const chiSh = getOrCreateChiSheet_();
    const lastRow = thuSh.getLastRow();
    if (lastRow < TC_CONFIG.TC_START) return { success: true, message: 'Không có dữ liệu để chuyển.' };
    const numCols = Math.min(thuSh.getLastColumn(), 20);
    const raw = thuSh.getRange(TC_CONFIG.TC_START, 1, lastRow - TC_CONFIG.TC_START + 1, numCols).getValues();
    const chiRows = [];
    const rowsToDelete = [];
    raw.forEach((r, idx) => {
        const loai = String(r[TC_CONFIG.COL.LOAI] || '').trim();
        if (loai === 'Chi') {
            const row = r.slice(0, 20);
            while (row.length < 20) row.push('');
            row[TC_CONFIG.COL.LOAI] = 'Chi';
            row[TC_CONFIG.COL.KHACH] = '';
            chiRows.push(row);
            rowsToDelete.push(TC_CONFIG.TC_START + idx);
        }
    });
    if (chiRows.length) {
        chiSh.getRange(chiSh.getLastRow() + 1, 1, chiRows.length, 20).setValues(chiRows);
        rowsToDelete.reverse().forEach(rn => thuSh.deleteRow(rn));
    }
    return { success: true, message: 'Đã chuyển ' + chiRows.length + ' dòng Chi sang sheet QL Chi.' };
}

function getThuChiConfig() {
    const br = getBranches();
    return {
        success: true,
        danhMucThu: TC_CONFIG.DANH_MUC_THU,
        danhMucChi: TC_CONFIG.DANH_MUC_CHI,
        branches: br.data || TC_CONFIG.BRANCHES_DEFAULT,
        saleFields: true
    };
}

// ---------------------------------------------------------------
// MODULE: NHẮC BẢO DƯỠNG (ĐÃ TẮT)
// ---------------------------------------------------------------
function checkBaoDuong() {
    Logger.log('checkBaoDuong: disabled');
    return { success: true, message: 'Đã tắt chức năng bảo dưỡng và nhắc bảo dưỡng.' };
}
function buildBaoDuongEmailHtml_() {
    return '';
}

function debugSheet() { const ss = SpreadsheetApp.getActiveSpreadsheet(); const sh = ss.getSheetByName(CONFIG.SHEET_XE); if (!sh) { Logger.log('KHÔNG THẤY: ' + CONFIG.SHEET_XE); return; } Logger.log('lastRow=' + sh.getLastRow()); sh.getRange(1, 1, Math.min(12, sh.getLastRow()), 7).getValues().forEach((r, i) => Logger.log('Dong ' + (i + 1) + ': ' + JSON.stringify(r))); }
function testDriveAccess() { try { const f = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID); Logger.log('✅ Folder: ' + f.getName()); const t = f.createFile('_test.txt', 'test', MimeType.PLAIN_TEXT); t.setTrashed(true); Logger.log('✅ Drive OK!'); } catch (e) { Logger.log('❌ ' + e.message); } }

// ---------------------------------------------------------------
// MODULE: DANH MỤC HÃNG XE (DM Hãng Xe)
// [2026-05] Cho phép Admin tự quản lý danh sách hãng xe qua sheet riêng.
// ---------------------------------------------------------------
const BRAND_CONFIG = {
    SHEET_NAME: 'DM Hãng Xe',
    HEADER: ['Tên Hãng', 'Icon', 'Thứ Tự', 'Ghi Chú'],
    COL: { TEN: 0, ICON: 1, THU_TU: 2, GHI_CHU: 3 },
    DATA_START: 2,
    CACHE_KEY: 'jmb_brand_list_v1',
    CACHE_TTL: 60, // giây
    DEFAULT_BRANDS: [
        ['Honda', 'bi-bicycle', 1, ''],
        ['Yamaha', 'bi-lightning-charge', 2, ''],
        ['Suzuki', 'bi-speedometer2', 3, ''],
        ['SYM', 'bi-stars', 4, ''],
        ['Kawasaki', 'bi-fire', 5, ''],
        ['Kymco', 'bi-circle', 6, ''],
        ['Vinfast', 'bi-ev-front', 7, ''],
        ['ÔTÔ', 'bi-car-front-fill', 8, '']
    ]
};

// Tự tạo sheet DM Hãng Xe nếu chưa có; trả về sheet object.
function _ensureBrandSheet_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(BRAND_CONFIG.SHEET_NAME);
    if (sh) return sh;
    sh = ss.insertSheet(BRAND_CONFIG.SHEET_NAME);
    // Header
    sh.getRange(1, 1, 1, BRAND_CONFIG.HEADER.length).setValues([BRAND_CONFIG.HEADER])
        .setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
    // 12 hãng default
    sh.getRange(2, 1, BRAND_CONFIG.DEFAULT_BRANDS.length, 4).setValues(BRAND_CONFIG.DEFAULT_BRANDS);
    sh.setColumnWidth(1, 160); sh.setColumnWidth(2, 200); sh.setColumnWidth(3, 80); sh.setColumnWidth(4, 260);
    sh.setFrozenRows(1);
    return sh;
}

function _invalidateBrandCache_() {
    try { CacheService.getScriptCache().remove(BRAND_CONFIG.CACHE_KEY); } catch (e) { }
}

// Đọc danh sách hãng (có cache 60s).
function getBrandList(_force) {
    try {
        const cache = CacheService.getScriptCache();
        if (!_force) {
            const cached = cache.get(BRAND_CONFIG.CACHE_KEY);
            if (cached) return { success: true, data: JSON.parse(cached) };
        }
        const sh = _ensureBrandSheet_();
        const last = sh.getLastRow();
        if (last < BRAND_CONFIG.DATA_START) {
            return { success: true, data: [] };
        }
        const rows = sh.getRange(BRAND_CONFIG.DATA_START, 1, last - BRAND_CONFIG.DATA_START + 1, 4).getValues();
        const list = rows
            .map((r, i) => ({
                tenHang: String(r[BRAND_CONFIG.COL.TEN] || '').trim(),
                icon: String(r[BRAND_CONFIG.COL.ICON] || '').trim() || 'bi-tag',
                thuTu: Number(r[BRAND_CONFIG.COL.THU_TU]) || 9999,
                ghiChu: String(r[BRAND_CONFIG.COL.GHI_CHU] || '').trim(),
                rowNum: BRAND_CONFIG.DATA_START + i
            }))
            .filter(b => b.tenHang)
            .sort((a, b) => a.thuTu - b.thuTu || a.tenHang.localeCompare(b.tenHang, 'vi'));
        cache.put(BRAND_CONFIG.CACHE_KEY, JSON.stringify(list), BRAND_CONFIG.CACHE_TTL);
        return { success: true, data: list };
    } catch (e) {
        Logger.log('getBrandList: ' + e.message);
        return { success: false, error: e.message };
    }
}

// Public alias: dropdown cũ dùng getXeBrandOptions → bây giờ đọc từ sheet.
function getXeBrandOptions() {
    const r = getBrandList();
    if (!r.success) return { success: true, data: BRAND_CONFIG.DEFAULT_BRANDS.map(b => b[0]) };
    return { success: true, data: r.data.map(b => b.tenHang) };
}

// Đếm số xe trong sheet QL Xe và QL Đã Bán đang dùng 1 hãng (so sánh case-insensitive).
function _countVehiclesByBrand_(brandName) {
    const target = String(brandName || '').trim().toLowerCase();
    if (!target) return 0;
    let count = 0;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Sheet QL Xe
    try {
        const shXe = ss.getSheetByName(CONFIG.SHEET_XE);
        if (shXe && shXe.getLastRow() >= CONFIG.XE_DATA_START) {
            const rows = shXe.getRange(CONFIG.XE_DATA_START, 1, shXe.getLastRow() - CONFIG.XE_DATA_START + 1, shXe.getLastColumn()).getValues();
            rows.forEach(r => {
                const tenXe = String(r[CONFIG.XE_COL.TEN] || '').trim();
                const hangRaw = String(r[CONFIG.XE_COL.HANG] || '').trim();
                if (!tenXe && !hangRaw) return;
                const inferred = String(inferXeBrand_(tenXe, hangRaw) || hangRaw).trim().toLowerCase();
                if (inferred === target) count++;
            });
        }
    } catch (e) { Logger.log('count Xe: ' + e.message); }
    // Sheet Xe Đã Bán
    try {
        const shBan = ss.getSheetByName(CONFIG.SHEET_SOLD);
        if (shBan && shBan.getLastRow() >= 2) {
            const rows = shBan.getRange(2, 1, shBan.getLastRow() - 1, shBan.getLastColumn()).getValues();
            rows.forEach(r => {
                const model = String(r[CONFIG.SOLD_COL.MODEL] || '').trim();
                const hangRaw = String(r[CONFIG.SOLD_COL.HANG_XE] || '').trim();
                if (!model && !hangRaw) return;
                const inferred = String(inferXeBrand_(model, hangRaw) || hangRaw).trim().toLowerCase();
                if (inferred === target) count++;
            });
        }
    } catch (e) { Logger.log('count Sold: ' + e.message); }
    return count;
}

// Thêm hãng mới. Chỉ Admin.
function addBrand(formData, userInfo) {
    try {
        if (!userInfo || !isAdminUser_(userInfo)) {
            return { success: false, error: 'Chỉ Admin mới được quản lý danh mục hãng xe.' };
        }
        const tenHang = String(formData && formData.tenHang || '').trim();
        const icon = String(formData && formData.icon || '').trim() || 'bi-tag';
        const thuTu = parseInt(formData && formData.thuTu, 10) || 999;
        const ghiChu = String(formData && formData.ghiChu || '').trim();
        if (!tenHang) return { success: false, error: 'Vui lòng nhập tên hãng.' };
        if (tenHang.length > 50) return { success: false, error: 'Tên hãng quá dài (tối đa 50 ký tự).' };
        const sh = _ensureBrandSheet_();
        // Check trùng (case-insensitive)
        const existing = getBrandList(true).data || [];
        const key = tenHang.toLowerCase();
        if (existing.some(b => b.tenHang.toLowerCase() === key)) {
            return { success: false, error: 'Hãng "' + tenHang + '" đã tồn tại.' };
        }
        sh.appendRow([tenHang, icon, thuTu, ghiChu]);
        _invalidateBrandCache_();
        logActivity_(userInfo, 'THÊM HÃNG XE', 'DM Hãng Xe', tenHang, 'Icon: ' + icon + ' · Thứ tự: ' + thuTu);
        return { success: true, message: 'Đã thêm hãng "' + tenHang + '".' };
    } catch (e) {
        Logger.log('addBrand: ' + e.message);
        return { success: false, error: e.message };
    }
}

// Sửa hãng (theo tên cũ). Đồng bộ luôn xe trong QL Xe và Xe Đã Bán nếu đổi tên.
function updateBrand(oldName, formData, userInfo) {
    try {
        if (!userInfo || !isAdminUser_(userInfo)) {
            return { success: false, error: 'Chỉ Admin mới được quản lý danh mục hãng xe.' };
        }
        const oldKey = String(oldName || '').trim().toLowerCase();
        if (!oldKey) return { success: false, error: 'Thiếu tên hãng cũ.' };
        const newName = String(formData && formData.tenHang || '').trim();
        const newIcon = String(formData && formData.icon || '').trim() || 'bi-tag';
        const newThuTu = parseInt(formData && formData.thuTu, 10) || 999;
        const newGhiChu = String(formData && formData.ghiChu || '').trim();
        if (!newName) return { success: false, error: 'Vui lòng nhập tên hãng.' };
        const sh = _ensureBrandSheet_();
        const last = sh.getLastRow();
        if (last < BRAND_CONFIG.DATA_START) return { success: false, error: 'Sheet danh mục trống.' };
        const all = sh.getRange(BRAND_CONFIG.DATA_START, 1, last - BRAND_CONFIG.DATA_START + 1, 4).getValues();
        let foundRow = -1;
        for (let i = 0; i < all.length; i++) {
            if (String(all[i][BRAND_CONFIG.COL.TEN] || '').trim().toLowerCase() === oldKey) { foundRow = i; break; }
        }
        if (foundRow < 0) return { success: false, error: 'Không tìm thấy hãng "' + oldName + '".' };
        // Check trùng tên mới (nếu đổi tên)
        const newKey = newName.toLowerCase();
        if (newKey !== oldKey) {
            for (let i = 0; i < all.length; i++) {
                if (i !== foundRow && String(all[i][BRAND_CONFIG.COL.TEN] || '').trim().toLowerCase() === newKey) {
                    return { success: false, error: 'Hãng "' + newName + '" đã tồn tại.' };
                }
            }
        }
        const rowNum = BRAND_CONFIG.DATA_START + foundRow;
        sh.getRange(rowNum, 1, 1, 4).setValues([[newName, newIcon, newThuTu, newGhiChu]]);
        // Nếu đổi tên → sync xe trong QL Xe và Xe Đã Bán
        let syncedXe = 0, syncedSold = 0;
        if (newKey !== oldKey) {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            // QL Xe
            try {
                const shXe = ss.getSheetByName(CONFIG.SHEET_XE);
                if (shXe && shXe.getLastRow() >= CONFIG.XE_DATA_START) {
                    const xeRange = shXe.getRange(CONFIG.XE_DATA_START, CONFIG.XE_COL.HANG + 1, shXe.getLastRow() - CONFIG.XE_DATA_START + 1, 1);
                    const xeVals = xeRange.getValues();
                    for (let i = 0; i < xeVals.length; i++) {
                        if (String(xeVals[i][0] || '').trim().toLowerCase() === oldKey) {
                            xeVals[i][0] = newName; syncedXe++;
                        }
                    }
                    if (syncedXe) xeRange.setValues(xeVals);
                }
            } catch (e) { Logger.log('sync Xe: ' + e.message); }
            // Xe Đã Bán
            try {
                const shBan = ss.getSheetByName(CONFIG.SHEET_SOLD);
                if (shBan && shBan.getLastRow() >= 2) {
                    const banRange = shBan.getRange(2, CONFIG.SOLD_COL.HANG_XE + 1, shBan.getLastRow() - 1, 1);
                    const banVals = banRange.getValues();
                    for (let i = 0; i < banVals.length; i++) {
                        if (String(banVals[i][0] || '').trim().toLowerCase() === oldKey) {
                            banVals[i][0] = newName; syncedSold++;
                        }
                    }
                    if (syncedSold) banRange.setValues(banVals);
                }
            } catch (e) { Logger.log('sync Sold: ' + e.message); }
            // Clear cache liên quan
            try { CacheService.getScriptCache().remove(JMB_CACHE.XE_ALL); } catch (_) { }
        }
        _invalidateBrandCache_();
        const detail = (newKey !== oldKey ? ('Đổi tên: ' + oldName + ' → ' + newName + ' (sync ' + syncedXe + ' xe + ' + syncedSold + ' xe đã bán)') : ('Cập nhật: ' + newName));
        logActivity_(userInfo, 'SỬA HÃNG XE', 'DM Hãng Xe', newName, detail);
        return { success: true, message: 'Đã cập nhật hãng "' + newName + '".' + (syncedXe || syncedSold ? ' Đồng bộ ' + syncedXe + ' xe + ' + syncedSold + ' xe đã bán.' : '') };
    } catch (e) {
        Logger.log('updateBrand: ' + e.message);
        return { success: false, error: e.message };
    }
}

// Xóa hãng. Chặn nếu còn xe đang dùng (cả QL Xe và Xe Đã Bán).
function deleteBrand(brandName, userInfo) {
    try {
        if (!userInfo || !isAdminUser_(userInfo)) {
            return { success: false, error: 'Chỉ Admin mới được quản lý danh mục hãng xe.' };
        }
        const key = String(brandName || '').trim().toLowerCase();
        if (!key) return { success: false, error: 'Thiếu tên hãng.' };
        const inUse = _countVehiclesByBrand_(brandName);
        if (inUse > 0) {
            return { success: false, error: 'Không thể xóa: còn ' + inUse + ' xe đang dùng hãng "' + brandName + '". Hãy đổi hãng cho các xe đó trước hoặc đổi tên hãng này.' };
        }
        const sh = _ensureBrandSheet_();
        const last = sh.getLastRow();
        if (last < BRAND_CONFIG.DATA_START) return { success: false, error: 'Sheet danh mục trống.' };
        const all = sh.getRange(BRAND_CONFIG.DATA_START, 1, last - BRAND_CONFIG.DATA_START + 1, 4).getValues();
        let foundRow = -1;
        for (let i = 0; i < all.length; i++) {
            if (String(all[i][BRAND_CONFIG.COL.TEN] || '').trim().toLowerCase() === key) { foundRow = i; break; }
        }
        if (foundRow < 0) return { success: false, error: 'Không tìm thấy hãng "' + brandName + '".' };
        sh.deleteRow(BRAND_CONFIG.DATA_START + foundRow);
        _invalidateBrandCache_();
        logActivity_(userInfo, 'XÓA HÃNG XE', 'DM Hãng Xe', brandName, 'Xóa hãng khỏi danh mục');
        return { success: true, message: 'Đã xóa hãng "' + brandName + '".' };
    } catch (e) {
        Logger.log('deleteBrand: ' + e.message);
        return { success: false, error: e.message };
    }
}



// ---------------------------------------------------------------
// HELPER GIỮ LẠI: normalizeVN_ (dùng bởi isShortRentalCategory_,
// isLongRentalCustomerCategory_, _parseDepositFromText_).
// Các helper text-parsing AI khác đã được gỡ bỏ.
// ---------------------------------------------------------------
function normalizeVN_(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}


// ---------------------------------------------------------------
// TIỆN ÍCH: VÁ BIỂN SỐ CÒN THIẾU CHO CÁC DÒNG NHẬP TAY CŨ
// ---------------------------------------------------------------
/**
 * Chạy 1 lần từ Apps Script Editor để tự điền biển số còn thiếu
 * cho tất cả dòng trong QL Thu có tên khách nhưng chưa có biển số.
 */
function fillMissingBienSo() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const thuSh = ss.getSheetByName(TC_CONFIG.SHEET_TC);
    const khSh = ss.getSheetByName(CONFIG.SHEET_KH);
    if (!thuSh || !khSh) { Logger.log('Không tìm thấy sheet.'); return; }

    // Build map: tên KH (lowercase) → biển số
    const khLastRow = khSh.getLastRow();
    if (khLastRow < CONFIG.KH_DATA_START) return;
    const khData = khSh.getRange(CONFIG.KH_DATA_START, 1, khLastRow - CONFIG.KH_DATA_START + 1, CONFIG.KH_COL.BIEN_SO + 1).getValues();
    const bsMap = {};
    khData.forEach(r => {
        const ten = String(r[CONFIG.KH_COL.TEN] || '').trim().toLowerCase();
        const bs = String(r[CONFIG.KH_COL.BIEN_SO] || '').trim();
        if (ten && bs) bsMap[ten] = bs;
    });

    // Duyệt QL Thu, điền biển số còn thiếu
    const lastRow = thuSh.getLastRow();
    if (lastRow < TC_CONFIG.TC_START) return;
    const numCols = Math.max(TC_CONFIG.COL.BIEN_SO + 1, TC_CONFIG.COL.KHACH + 1);
    const data = thuSh.getRange(TC_CONFIG.TC_START, 1, lastRow - TC_CONFIG.TC_START + 1, numCols).getValues();

    let filled = 0;
    data.forEach((r, idx) => {
        const khach = String(r[TC_CONFIG.COL.KHACH] || '').trim();
        const bienSo = String(r[TC_CONFIG.COL.BIEN_SO] || '').trim();
        if (!khach || bienSo) return; // bỏ qua nếu không có khách hoặc đã có biển số
        const found = bsMap[khach.toLowerCase()];
        if (found) {
            thuSh.getRange(TC_CONFIG.TC_START + idx, TC_CONFIG.COL.BIEN_SO + 1).setValue(found);
            filled++;
        }
    });

    SpreadsheetApp.flush();
    Logger.log('✅ Đã điền biển số cho ' + filled + ' dòng.');
    SpreadsheetApp.getUi().alert('✅ Hoàn tất! Đã điền biển số cho ' + filled + ' dòng trong QL Thu.');
}
/**
 * Trigger onEdit: khi nhập tên khách hàng vào cột E (Khách Hàng) của sheet QL Thu,
 * tự động tra cứu và điền biển số vào cột D (Biển Số Xe).
 * Chỉ áp dụng khi nhập tay — không ảnh hưởng đến app ghi dữ liệu qua API.
 */
function onEdit(e) {
    try {
        if (!e || !e.range) return;
        const sheet = e.range.getSheet();
        const sheetName = sheet.getName();

        // Chỉ xử lý sheet QL Thu
        if (sheetName !== TC_CONFIG.SHEET_TC) return;

        const col = e.range.getColumn();
        const row = e.range.getRow();
        const lastCol = col + e.range.getNumColumns() - 1;

        if (row < TC_CONFIG.TC_START) return;

        // Khi nhập tên khách ở cột E: tự động điền biển số nếu KH đã tồn tại.
        if (col <= TC_CONFIG.COL.KHACH + 1 && lastCol >= TC_CONFIG.COL.KHACH + 1) {
            const tenKH = String(sheet.getRange(row, TC_CONFIG.COL.KHACH + 1).getValue() || '').trim();
            const bienSoCell = sheet.getRange(row, TC_CONFIG.COL.BIEN_SO + 1);
            if (!tenKH) {
                // Không xóa biển số nếu đang paste nhiều cột; chỉ xóa khi sửa riêng cột KH.
                if (col === TC_CONFIG.COL.KHACH + 1 && e.range.getNumColumns() === 1) bienSoCell.setValue('');
            } else if (!String(bienSoCell.getValue() || '').trim()) {
                const ss = SpreadsheetApp.getActiveSpreadsheet();
                const khSh = ss.getSheetByName(CONFIG.SHEET_KH);
                if (khSh) {
                    const lastRow = khSh.getLastRow();
                    if (lastRow >= CONFIG.KH_DATA_START) {
                        const data = khSh.getRange(CONFIG.KH_DATA_START, 1, lastRow - CONFIG.KH_DATA_START + 1, CONFIG.KH_COL.BIEN_SO + 1).getValues();
                        const kw = _textKey_(tenKH);
                        const found = data.find(r => _textKey_(r[CONFIG.KH_COL.TEN]) === kw);
                        if (found) {
                            const bienSo = String(found[CONFIG.KH_COL.BIEN_SO] || '').trim();
                            if (bienSo) bienSoCell.setValue(bienSo);
                        }
                    }
                }
            }
        }

        // FIX 2026-05-21: nếu nhập/sửa trực tiếp QL Thu ở các cột A:L,
        // phải xóa fingerprint trước rồi mới sync. Nếu không, khi sửa/thêm "Thuê mới"
        // ở giữa bảng, app có thể hiểu nhầm QL Thu không đổi và bỏ qua đồng bộ KH/Xe.
        const touchesRentalCols = !(lastCol < 1 || col > 12);
        if (touchesRentalCols) {
            _invalidateRentalSyncFingerprint_();
            try { clearThuChiRelatedCache_(); } catch (_c) { }
            try { invalidateTCCache_(); } catch (_t) { }
            const syncResult = syncAllRentalDataFromThuChi(null);
            Logger.log('onEdit auto-sync result: ' + JSON.stringify(syncResult));
        }
    } catch (err) {
        // Không làm crash sheet khi trigger lỗi
        Logger.log('onEdit auto-sync: ' + err.message);
    }
}

// ── [v4] Báo cáo lợi nhuận theo từng xe ────────────────────────
function getXeProfitReport(bienSo) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // ── Lấy thông tin xe ──────────────────────────────────────
        const xeSh = ss.getSheetByName(CONFIG.SHEET_XE);
        var xeInfo = null;
        if (xeSh) {
            const xeLR = xeSh.getLastRow();
            if (xeLR >= CONFIG.XE_DATA_START) {
                const xeRaw = xeSh.getRange(CONFIG.XE_DATA_START, 1, xeLR - CONFIG.XE_DATA_START + 1, 7).getValues();
                const row = xeRaw.find(r => String(r[CONFIG.XE_COL.BIEN_SO] || '').trim().toLowerCase() === bienSo.trim().toLowerCase());
                if (row) xeInfo = {
                    tenXe: String(row[CONFIG.XE_COL.TEN] || '').trim(),
                    bienSo: String(row[CONFIG.XE_COL.BIEN_SO] || '').trim(),
                    giaVon: parseMoneyValue(row[CONFIG.XE_COL.GIA_VON]),
                    hangXe: String(row[CONFIG.XE_COL.HANG] || '').trim(),
                    nam: row[CONFIG.XE_COL.NAM] || '',
                    mauSon: String(row[CONFIG.XE_COL.MAU] || '').trim()
                };
            }
        }

        const bsKey = bienSo.trim().toLowerCase();

        // ── Lấy Thu theo biển số ──────────────────────────────────
        const thuSh = ss.getSheetByName(TC_CONFIG.SHEET_TC);
        var thuList = [];
        if (thuSh) {
            const thuLR = thuSh.getLastRow();
            const thuCols = Math.min(thuSh.getLastColumn(), 10);
            if (thuLR >= TC_CONFIG.TC_START) {
                thuSh.getRange(TC_CONFIG.TC_START, 1, thuLR - TC_CONFIG.TC_START + 1, thuCols).getValues().forEach(function (r) {
                    const bs = String(r[TC_CONFIG.COL.BIEN_SO] || '').trim().toLowerCase();
                    if (bs !== bsKey) return;
                    const amt = parseMoneyValue(r[TC_CONFIG.COL.SO_TIEN]);
                    if (!amt) return;
                    thuList.push({
                        ngay: readDateFromCell(r[TC_CONFIG.COL.NGAY]),
                        danhMuc: String(r[TC_CONFIG.COL.DANH_MUC] || '').trim(),
                        khach: String(r[TC_CONFIG.COL.KHACH] || '').trim(),
                        soTien: amt,
                        ghiChu: String(r[TC_CONFIG.COL.GHI_CHU] || '').trim()
                    });
                });
            }
        }

        // ── Lấy Chi theo biển số ──────────────────────────────────
        const chiSh = ss.getSheetByName(TC_CONFIG.SHEET_CHI);
        var chiList = [];
        if (chiSh) {
            const chiLR = chiSh.getLastRow();
            const chiCols = Math.min(chiSh.getLastColumn(), 10);
            if (chiLR >= TC_CONFIG.TC_START) {
                chiSh.getRange(TC_CONFIG.TC_START, 1, chiLR - TC_CONFIG.TC_START + 1, chiCols).getValues().forEach(function (r) {
                    const bs = String(r[TC_CONFIG.COL.BIEN_SO] || '').trim().toLowerCase();
                    if (bs !== bsKey) return;
                    const amt = parseMoneyValue(r[TC_CONFIG.COL.SO_TIEN]);
                    if (!amt) return;
                    chiList.push({
                        ngay: readDateFromCell(r[TC_CONFIG.COL.NGAY]),
                        danhMuc: String(r[TC_CONFIG.COL.DANH_MUC] || '').trim(),
                        soTien: amt,
                        ghiChu: String(r[TC_CONFIG.COL.GHI_CHU] || '').trim()
                    });
                });
            }
        }

        // ── Tính tổng ─────────────────────────────────────────────
        const CAT_THUE = ['Tiền thuê tháng', 'Thuê ngắn'];
        const CAT_DICH_VU = ['Phụ thu', 'Bảo dưỡng'];
        const CAT_BAN = ['Bán xe'];
        const CAT_SUA = ['Sửa chữa', 'Thay phụ tùng', 'Nhiên liệu', 'Bảo dưỡng (Chi)'];
        const CAT_KHAC_CHI = ['Thuế / Phí đường bộ', 'Bảo hiểm', 'Chi phí khác', 'Mua xe mới'];

        var tongThuThue = thuList.filter(r => CAT_THUE.includes(r.danhMuc)).reduce((s, r) => s + r.soTien, 0);
        var tongDichVu = thuList.filter(r => CAT_DICH_VU.includes(r.danhMuc)).reduce((s, r) => s + r.soTien, 0);
        var tongBanXe = thuList.filter(r => CAT_BAN.includes(r.danhMuc)).reduce((s, r) => s + r.soTien, 0);
        var tongThuKhac = thuList.filter(r => ![...CAT_THUE, ...CAT_DICH_VU, ...CAT_BAN].includes(r.danhMuc)).reduce((s, r) => s + r.soTien, 0);
        var tongThu = tongThuThue + tongDichVu + tongBanXe + tongThuKhac;

        var tongSua = chiList.filter(r => CAT_SUA.includes(r.danhMuc)).reduce((s, r) => s + r.soTien, 0);
        var tongChiKhac = chiList.filter(r => CAT_KHAC_CHI.includes(r.danhMuc)).reduce((s, r) => s + r.soTien, 0);
        var tongChi = tongSua + tongChiKhac;

        const giaVon = xeInfo ? xeInfo.giaVon : 0;
        const loiNhuan = tongThu - tongChi - giaVon;
        const roi = giaVon > 0 ? Math.round((loiNhuan / giaVon) * 100) : null;

        // Thời gian hoàn vốn (tháng) = (giaVon + tongChi) / doanh thu thuê/tháng trung bình
        var hoiVonThang = null;
        if (tongThuThue > 0 && thuList.length > 0) {
            // Tính số tháng hoạt động từ giao dịch đầu đến cuối
            const dates = thuList.map(r => tryParseDate(r.ngay)).filter(Boolean).sort((a, b) => a - b);
            if (dates.length >= 2) {
                const months = Math.max(1, Math.round((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24 * 30)));
                const avgPerMonth = tongThuThue / months;
                if (avgPerMonth > 0) hoiVonThang = Math.round((giaVon + tongChi) / avgPerMonth * 10) / 10;
            }
        }

        return {
            success: true,
            data: {
                xeInfo, bienSo,
                thu: { thue: tongThuThue, dichVu: tongDichVu, banXe: tongBanXe, khac: tongThuKhac, tong: tongThu },
                chi: { suaChua: tongSua, khac: tongChiKhac, tong: tongChi },
                giaVon, loiNhuan, roi, hoiVonThang,
                thuList: thuList.sort((a, b) => (tryParseDate(b.ngay) || 0) - (tryParseDate(a.ngay) || 0)).slice(0, 50),
                chiList: chiList.sort((a, b) => (tryParseDate(b.ngay) || 0) - (tryParseDate(a.ngay) || 0)).slice(0, 50)
            }
        };
    } catch (e) {
        Logger.log('getXeProfitReport: ' + e.message);
        return { success: false, error: e.message };
    }
}

// ── [v4] Sync trạng thái + tên khách vào sheet QL Xe ─────────────
function syncXeStatusToSheet() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const xeSh = ss.getSheetByName(CONFIG.SHEET_XE);
        if (!xeSh) return { success: false, error: 'Không tìm thấy sheet QL Xe' };

        const lastRow = xeSh.getLastRow();
        if (lastRow < CONFIG.XE_DATA_START) return { success: true, updated: 0 };

        // Tìm hoặc tạo cột Trạng Thái (col H = index 7, sau GHI CHU)
        // CONFIG.XE_COL: TEN:0, NAM:1, MAU:2, BIEN_SO:3, GIA_VON:4, HANG:5, GHI_CHU:6
        // → Trạng Thái = cột H (index 7 = col 8)
        const STATUS_COL = 8; // cột H, 1-based
        const KHACH_COL = 9; // cột I, 1-based

        // Đảm bảo header
        xeSh.getRange(1, STATUS_COL).setValue('Trạng Thái');
        xeSh.getRange(1, KHACH_COL).setValue('Khách Thuê');

        // Build map biển số → tên khách
        const map = buildBienSoToKhachMap();

        // Đọc tất cả biển số
        const numRows = lastRow - CONFIG.XE_DATA_START + 1;
        const bsArr = xeSh.getRange(CONFIG.XE_DATA_START, CONFIG.XE_COL.BIEN_SO + 1, numRows, 1).getValues();

        // Ghi trạng thái + tên khách
        const statusVals = [];
        const khachVals = [];
        const fontColors = [];
        const bgColors = [];
        bsArr.forEach(function (r) {
            const bs = String(r[0] || '').trim();
            const kh = bs ? (map[bs.toUpperCase()] || '') : '';
            const isRented = !!kh;
            statusVals.push([isRented ? 'Đang thuê' : 'Trống']);
            khachVals.push([kh || '']);
            fontColors.push([isRented ? '#1d4ed8' : '#15803d']);
            bgColors.push([isRented ? '#eff6ff' : '#f0fdf4']);
        });

        // [OPT 2026-05-20] Batch values + formatting trong 4 lần gọi API (thay vì 2*N).
        const statusRange = xeSh.getRange(CONFIG.XE_DATA_START, STATUS_COL, numRows, 1);
        statusRange.setValues(statusVals);
        statusRange.setFontColors(fontColors);
        statusRange.setBackgrounds(bgColors);
        xeSh.getRange(CONFIG.XE_DATA_START, KHACH_COL, numRows, 1).setValues(khachVals);

        return { success: true, updated: numRows };
    } catch (e) {
        Logger.log('syncXeStatusToSheet: ' + e.message);
        return { success: false, error: e.message };
    }
}

// Tự động sync khi mở app (trigger onOpen)
function onOpen() {
    try { syncXeStatusToSheet(); } catch (_) { }
}

// ── [v5] Tự động tạo/cập nhật KH + cập nhật trạng thái Xe khi nhập Thu ──────
function autoSyncFromThuChi_(formData, userInfo) {
    try {
        // Không tạo/cập nhật QL Khách Hàng cho khách thuê ngắn.
        // Thuê ngắn chỉ nằm ở QL Thu và được buildBienSoToKhachMap() dùng để đánh dấu xe bận tạm thời.
        if (!isLongRentalCustomerCategory_(formData.danhMuc)) return;
        if (!formData.khach || !formData.bienSo) return;

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const khSh = ss.getSheetByName(CONFIG.SHEET_KH);
        const xeSh = ss.getSheetByName(CONFIG.SHEET_XE);
        if (!khSh || !xeSh) return;

        const tenKH = String(formData.khach || '').trim();
        const bienSo = String(formData.bienSo || '').trim();
        const batDau = formatDateForSheet(formData.batDau || '');
        const ketThuc = formatDateForSheet(formData.ketThuc || '');
        const soTien = parseMoneyValue(formData.soTien);

        // 1. Tìm xe trong QL Xe theo biển số
        var tenXe = '';
        var xeRowNum = -1;
        const xeLR = xeSh.getLastRow();
        if (xeLR >= CONFIG.XE_DATA_START) {
            const xeData = xeSh.getRange(CONFIG.XE_DATA_START, 1, xeLR - CONFIG.XE_DATA_START + 1, 7).getValues();
            xeData.forEach(function (r, i) {
                if (String(r[CONFIG.XE_COL.BIEN_SO] || '').trim().toLowerCase() === bienSo.toLowerCase()) {
                    tenXe = String(r[CONFIG.XE_COL.TEN] || '').trim();
                    xeRowNum = CONFIG.XE_DATA_START + i;
                }
            });
        }

        // 2. Tìm KH trong QL Khách Hàng
        const khLR = khSh.getLastRow();
        var khRowNum = -1;
        if (khLR >= CONFIG.KH_DATA_START) {
            const khData = khSh.getRange(CONFIG.KH_DATA_START, 1, khLR - CONFIG.KH_DATA_START + 1, 4).getValues();
            khData.forEach(function (r, i) {
                if (String(r[CONFIG.KH_COL.TEN] || '').trim().toLowerCase() === tenKH.toLowerCase()) {
                    khRowNum = CONFIG.KH_DATA_START + i;
                }
            });
        }

        // 3. Nếu chưa có KH → tạo mới
        if (khRowNum === -1) {
            // [FIX 2026-06] Không tạo lại KH đã xóa thủ công
            if (typeof _isKhDeleted_ === 'function' && _isKhDeleted_(tenKH)) {
                Logger.log('autoSync: Bỏ qua tạo lại KH đã xóa "' + tenKH + '"');
                return;
            }
            var newRow = new Array(15).fill('');
            newRow[CONFIG.KH_COL.TEN] = tenKH;
            newRow[CONFIG.KH_COL.XE_THUE] = tenXe || bienSo;
            newRow[CONFIG.KH_COL.BIEN_SO] = bienSo;
            newRow[CONFIG.KH_COL.GIA_THUE] = soTien;
            newRow[CONFIG.KH_COL.NGAY_BAT_DAU] = batDau;
            newRow[CONFIG.KH_COL.NGAY_KET_THUC] = ketThuc;
            khSh.appendRow(newRow);
            Logger.log('autoSync: Tạo mới KH "' + tenKH + '"');
        } else {
            // Cập nhật KH đã có
            // [FIX 2026-06] Xe + biển số: CHỈ ghi khi ô đang trống
            const _curXe_ = String(khSh.getRange(khRowNum, CONFIG.KH_COL.XE_THUE + 1).getValue() || '').trim();
            if (tenXe && !_curXe_) khSh.getRange(khRowNum, CONFIG.KH_COL.XE_THUE + 1).setValue(tenXe);
            const _curBS_ = String(khSh.getRange(khRowNum, CONFIG.KH_COL.BIEN_SO + 1).getValue() || '').trim();
            if (bienSo && !_curBS_) khSh.getRange(khRowNum, CONFIG.KH_COL.BIEN_SO + 1).setValue(bienSo);
            // [FIX 2026-05] Chỉ ghi giaThue khi sheet chưa có giá (0/trống), không override giá thủ công
            const _curGia_ = parseMoneyValue(khSh.getRange(khRowNum, CONFIG.KH_COL.GIA_THUE + 1).getValue());
            if (soTien > 0 && _curGia_ === 0) khSh.getRange(khRowNum, CONFIG.KH_COL.GIA_THUE + 1).setValue(soTien);
            if (batDau) khSh.getRange(khRowNum, CONFIG.KH_COL.NGAY_BAT_DAU + 1).setValue(batDau);
            if (ketThuc) khSh.getRange(khRowNum, CONFIG.KH_COL.NGAY_KET_THUC + 1).setValue(ketThuc);
            Logger.log('autoSync: Cập nhật KH "' + tenKH + '"');
        }

        // 4. Cập nhật trạng thái Xe trong sheet QL Xe (cột H=8, I=9)
        if (xeRowNum !== -1) {
            xeSh.getRange(xeRowNum, 8).setValue('Đang thuê')
                .setBackground('#eff6ff').setFontColor('#1d4ed8');
            xeSh.getRange(xeRowNum, 9).setValue(tenKH);
        }

        SpreadsheetApp.flush();
        try { clearXeKhCache_(); } catch (_c) { }
        try { invalidateTCCache_(); } catch (_t) { }
        try { syncXeStatusToSheet(); } catch (_x) { }
        logActivity_(userInfo, 'AUTO SYNC', 'KH+Xe', tenKH,
            bienSo + ' | ' + (batDau || '--') + '→' + (ketThuc || '--'));

    } catch (e) {
        Logger.log('autoSyncFromThuChi_: ' + e.message);
        // Không throw — không ảnh hưởng giao dịch chính
    }
}

// ============================================================
// [2026-06] REST API — cho phép Next.js gọi qua HTTP
// ============================================================
function doPost(e) {
    try {
        const body = JSON.parse(e.postData.contents);
        const { fn, args, secret } = body;

        // Bảo mật đơn giản bằng secret key
        if (secret !== 'JANS_SECRET_2026') {
            return _jsonOut({ success: false, error: 'Unauthorized' });
        }

        const API = {
            getKhachHangData,
            addKhachHang,
            updateKhachHang,
            deleteKhachHang,
            getThuChiData,
            addThuChi,
            updateThuChi,
            deleteThuChi,
            getXeData,
            getBranches,
            getThuChiConfig,
            loginUser,
            uploadFileToDrive,
            updateBillSentStatus,
        };

        if (!API[fn]) {
            return _jsonOut({ success: false, error: 'Function not found: ' + fn });
        }

        const result = API[fn](...(args || []));
        return _jsonOut({ success: true, data: result });

    } catch (err) {
        return _jsonOut({ success: false, error: err.message });
    }
}

function doGet(e) {
    return _jsonOut({ status: 'JAN MOTORBIKE API OK', version: '2.0' });
}

function _jsonOut(obj) {
    return ContentService
        .createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}
function uploadFileToDrive(base64Data, fileName, mimeType, overrideName) {
    try {
        // Tự động lấy DRIVE_FOLDER_ID từ CONFIG của bạn
        var folder;
        try {
            if (CONFIG && CONFIG.DRIVE_FOLDER_ID && CONFIG.DRIVE_FOLDER_ID !== 'PASTE_YOUR_FOLDER_ID_HERE') {
                folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
            } else {
                folder = DriveApp.getRootFolder();
            }
        } catch (e) {
            folder = DriveApp.getRootFolder();
        }

        // Tạo thư mục con mang tên khách hàng (VD: "Chong Mun Wai - 59N1 213.08")
        var customerFolderName = String(overrideName || "Khác").trim();
        var subFolders = folder.getFoldersByName(customerFolderName);
        var subFolder;
        if (subFolders.hasNext()) {
            subFolder = subFolders.next();
        } else {
            subFolder = folder.createFolder(customerFolderName);
        }

        // Lưu file vào thư mục khách hàng
        var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType || "application/octet-stream", fileName || "file");
        var file = subFolder.createFile(blob);

        return {
            success: true,
            fileUrl: file.getUrl(),
            url: file.getUrl(),
            savedName: file.getName()
        };
    } catch (err) {
        return {
            success: false,
            error: err.toString()
        };
    }
}




