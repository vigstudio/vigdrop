const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');

// Kiểm tra xem thư mục uploads có tồn tại không
if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist');
    process.exit(0);
}

// Đọc danh sách file trong thư mục uploads
fs.readdir(uploadsDir, (err, files) => {
    if (err) {
        console.error('Error reading uploads directory:', err);
        process.exit(1);
    }

    // Nếu không có file nào
    if (files.length === 0) {
        console.log('No files to clean');
        process.exit(0);
    }

    // Xóa từng file
    let deletedCount = 0;
    files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${file}:`, err);
            } else {
                console.log(`Deleted: ${file}`);
                deletedCount++;
            }

            // Nếu đã xóa hết file, hiển thị thông báo
            if (deletedCount === files.length) {
                console.log(`\nCleaned ${deletedCount} files from uploads directory`);
                process.exit(0);
            }
        });
    });
}); 