const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Đường dẫn đến file database
const dbPath = path.join(__dirname, '..', 'devices.db');

// Kiểm tra xem file database có tồn tại không
if (!fs.existsSync(dbPath)) {
    console.log('Không tìm thấy file database');
    process.exit(0);
}

// Kết nối đến database
const db = new sqlite3.Database(dbPath);

// Hàm xóa toàn bộ dữ liệu trong bảng devices
function cleanDatabase() {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM devices`,
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Đã xóa ${this.changes} thiết bị`);
                    resolve();
                }
            }
        );
    });
}

// Thực hiện dọn dẹp
async function cleanup() {
    try {
        await cleanDatabase();
        console.log('Đã xóa sạch database');
    } catch (err) {
        console.error('Lỗi khi xóa database:', err);
    } finally {
        db.close();
    }
}

cleanup(); 