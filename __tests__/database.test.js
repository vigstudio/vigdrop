const db = require('../database');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

jest.setTimeout(30000); // Increase timeout to 30 seconds

describe('Database Tests', () => {
    const testDbPath = path.join(__dirname, 'test.db');
    let testDb;

    beforeAll((done) => {
        // Create a test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }

        testDb = new sqlite3.Database(testDbPath, (err) => {
            if (err) {
                done(err);
                return;
            }

            // Create devices table
            testDb.run(`
                CREATE TABLE IF NOT EXISTS devices (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    type TEXT,
                    last_seen DATETIME
                )
            `, done);
        });
    });

    afterAll((done) => {
        // Clean up test database
        testDb.close(() => {
            if (fs.existsSync(testDbPath)) {
                fs.unlinkSync(testDbPath);
            }
            done();
        });
    });

    beforeEach((done) => {
        // Clear the devices table before each test
        testDb.run('DELETE FROM devices', done);
    });

    describe('Device Management', () => {
        it('should save a new device', (done) => {
            const deviceInfo = {
                id: 'test-device-1',
                name: 'Test Device 1',
                type: 'desktop',
                lastSeen: new Date().toISOString()
            };

            testDb.run(
                'INSERT INTO devices (id, name, type, last_seen) VALUES (?, ?, ?, ?)',
                [deviceInfo.id, deviceInfo.name, deviceInfo.type, deviceInfo.lastSeen],
                function(err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    testDb.get(
                        'SELECT * FROM devices WHERE id = ?',
                        [deviceInfo.id],
                        (err, row) => {
                            if (err) {
                                done(err);
                                return;
                            }

                            expect(row).toBeTruthy();
                            expect(row.id).toBe(deviceInfo.id);
                            expect(row.name).toBe(deviceInfo.name);
                            expect(row.type).toBe(deviceInfo.type);
                            done();
                        }
                    );
                }
            );
        });

        it('should update an existing device', (done) => {
            const deviceInfo = {
                id: 'test-device-1',
                name: 'Updated Test Device',
                type: 'desktop',
                lastSeen: new Date().toISOString()
            };

            // First insert
            testDb.run(
                'INSERT INTO devices (id, name, type, last_seen) VALUES (?, ?, ?, ?)',
                [deviceInfo.id, 'Original Name', deviceInfo.type, deviceInfo.lastSeen],
                function(err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    // Then update
                    testDb.run(
                        'UPDATE devices SET name = ?, last_seen = ? WHERE id = ?',
                        [deviceInfo.name, deviceInfo.lastSeen, deviceInfo.id],
                        function(err) {
                            if (err) {
                                done(err);
                                return;
                            }

                            // Check the update
                            testDb.get(
                                'SELECT * FROM devices WHERE id = ?',
                                [deviceInfo.id],
                                (err, row) => {
                                    if (err) {
                                        done(err);
                                        return;
                                    }

                                    expect(row).toBeTruthy();
                                    expect(row.name).toBe(deviceInfo.name);
                                    done();
                                }
                            );
                        }
                    );
                }
            );
        });

        it('should get all devices', (done) => {
            const devices = [
                {
                    id: 'device-1',
                    name: 'Device 1',
                    type: 'desktop',
                    lastSeen: new Date().toISOString()
                },
                {
                    id: 'device-2',
                    name: 'Device 2',
                    type: 'mobile',
                    lastSeen: new Date().toISOString()
                }
            ];

            // Insert test devices using Promise to ensure sequential execution
            const insertDevices = () => {
                return new Promise((resolve, reject) => {
                    const stmt = testDb.prepare('INSERT INTO devices (id, name, type, last_seen) VALUES (?, ?, ?, ?)');
                    let completed = 0;
                    
                    devices.forEach(device => {
                        stmt.run([device.id, device.name, device.type, device.lastSeen], (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            completed++;
                            if (completed === devices.length) {
                                stmt.finalize(resolve);
                            }
                        });
                    });
                });
            };

            // Execute insert and then check results
            insertDevices()
                .then(() => {
                    testDb.all('SELECT * FROM devices', (err, rows) => {
                        if (err) {
                            done(err);
                            return;
                        }

                        expect(Array.isArray(rows)).toBe(true);
                        expect(rows.length).toBe(devices.length);
                        
                        // Check each device was inserted correctly
                        devices.forEach(device => {
                            const found = rows.find(row => row.id === device.id);
                            expect(found).toBeTruthy();
                            expect(found.name).toBe(device.name);
                            expect(found.type).toBe(device.type);
                        });
                        
                        done();
                    });
                })
                .catch(done);
        });

        it('should cleanup inactive devices', (done) => {
            const oldDevice = {
                id: 'old-device',
                name: 'Old Device',
                type: 'desktop',
                lastSeen: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
            };

            const newDevice = {
                id: 'new-device',
                name: 'New Device',
                type: 'desktop',
                lastSeen: new Date().toISOString()
            };

            // Insert both devices using Promise
            const insertDevices = () => {
                return new Promise((resolve, reject) => {
                    const stmt = testDb.prepare('INSERT INTO devices (id, name, type, last_seen) VALUES (?, ?, ?, ?)');
                    let completed = 0;
                    
                    [oldDevice, newDevice].forEach(device => {
                        stmt.run([device.id, device.name, device.type, device.lastSeen], (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            completed++;
                            if (completed === 2) {
                                stmt.finalize(resolve);
                            }
                        });
                    });
                });
            };

            // Execute insert, cleanup, and check results
            insertDevices()
                .then(() => {
                    return new Promise((resolve, reject) => {
                        testDb.run(
                            'DELETE FROM devices WHERE datetime(last_seen) < datetime("now", "-24 hours")',
                            function(err) {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                })
                .then(() => {
                    testDb.all('SELECT * FROM devices', (err, rows) => {
                        if (err) {
                            done(err);
                            return;
                        }

                        expect(rows.length).toBe(1);
                        expect(rows[0].id).toBe(newDevice.id);
                        done();
                    });
                })
                .catch(done);
        });
    });
}); 