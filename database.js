const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'devices.db'));

// Create devices table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'desktop',
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Save device information
function saveDevice(device) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO devices (id, name, type, last_seen) 
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [device.id, device.name, device.type],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// Get device information
function getDevice(id) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM devices WHERE id = ?',
            [id],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

// Get all devices list
function getAllDevices() {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM devices',
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Remove inactive devices
function cleanupInactiveDevices() {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM devices 
             WHERE last_seen < datetime('now', '-1 hour')`,
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

module.exports = {
    saveDevice,
    getDevice,
    getAllDevices,
    cleanupInactiveDevices
}; 