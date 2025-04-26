const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const http = require('http');
const io = require('socket.io');
const multer = require('multer');

// Mock database functions
jest.mock('../database', () => ({
    saveDevice: jest.fn(),
    getAllDevices: jest.fn(),
    cleanupInactiveDevices: jest.fn()
}));

// Configure multer for testing
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'test-file-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Create test server
const app = express();
const server = http.createServer(app);
const socketServer = io(server);

// Mock server routes and middleware
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file was uploaded');
    }
    res.json({
        id: req.file.filename,
        name: req.file.originalname,
        size: req.file.size,
        path: '/uploads/' + req.file.filename
    });
});

// Socket.IO handlers
socketServer.on('connection', (socket) => {
    socket.on('registerDevice', async (deviceInfo) => {
        await db.saveDevice(deviceInfo);
        const devices = await db.getAllDevices();
        socketServer.emit('deviceList', devices);
    });
});

beforeAll((done) => {
    server.listen(3001);
    done();
});

afterAll((done) => {
    server.close();
    done();
});

describe('Server Tests', () => {
    beforeEach(() => {
        // Clear mock data
        jest.clearAllMocks();
    });

    describe('GET /', () => {
        it('should return index.html', async () => {
            const response = await request(app).get('/');
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
        });
    });

    describe('POST /upload', () => {
        it('should handle file upload', async () => {
            const testFilePath = path.join(__dirname, 'test-file.txt');
            const response = await request(app)
                .post('/upload')
                .attach('file', testFilePath)
                .field('senderId', 'test-sender')
                .field('receiverId', 'test-receiver');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', 'test-file.txt');
            expect(response.body).toHaveProperty('size');
            expect(response.body).toHaveProperty('path');
        });

        it('should return 400 if no file is uploaded', async () => {
            const response = await request(app)
                .post('/upload')
                .field('senderId', 'test-sender')
                .field('receiverId', 'test-receiver');

            expect(response.status).toBe(400);
            expect(response.text).toBe('No file was uploaded');
        });
    });

    describe('WebSocket Connection', () => {
        it('should handle device registration', (done) => {
            const deviceInfo = {
                id: 'test-device',
                name: 'Test Device',
                type: 'desktop'
            };

            // Mock database response
            db.saveDevice.mockResolvedValueOnce(true);
            db.getAllDevices.mockResolvedValueOnce([deviceInfo]);

            const socket = require('socket.io-client')('http://localhost:3001', {
                transports: ['websocket'],
                forceNew: true
            });

            socket.on('connect', () => {
                socket.emit('registerDevice', deviceInfo);
            });

            socket.on('deviceList', (devices) => {
                expect(devices).toContainEqual(deviceInfo);
                socket.disconnect();
                done();
            });
        });
    });
}); 