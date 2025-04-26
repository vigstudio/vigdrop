const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 3000; // Default port

for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--port') {
        port = parseInt(args[i + 1]);
        if (isNaN(port)) {
            console.error('Invalid port number');
            process.exit(1);
        }
        break;
    }
}

// Configure upload directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file upload handling
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store information about connected devices
const connectedDevices = new Map();

// Store file expiration times
const fileExpiryTimes = new Map();

// Function to delete files after specified time
function scheduleFileDeletion(filePath, fileId) {
    const expiryTime = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const deleteTime = Date.now() + expiryTime;
    
    fileExpiryTimes.set(fileId, deleteTime);
    
    setTimeout(() => {
        try {
            fs.unlinkSync(filePath);
            fileExpiryTimes.delete(fileId);
            console.log(`File deleted: ${filePath}`);
            
            // Notify clients about file deletion
            io.emit('fileDeleted', { fileId });
        } catch (err) {
            console.error(`Error deleting file: ${err.message}`);
        }
    }, expiryTime);
}

// Route for file upload
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file was uploaded');
    }
    
    const fileId = req.file.filename;
    const filePath = path.join(uploadsDir, fileId);
    
    const fileInfo = {
        id: fileId,
        name: req.file.originalname,
        size: req.file.size,
        path: '/uploads/' + fileId,
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // Expiration time
        sender: req.body.senderId,
        receiver: req.body.receiverId
    };
    
    // Schedule file deletion
    scheduleFileDeletion(filePath, fileId);
    
    // Send notification to specific receiving device
    if (fileInfo.receiver) {
        const receiverSocket = connectedDevices.get(fileInfo.receiver);
        if (receiverSocket) {
            receiverSocket.emit('newFile', fileInfo);
        }
    }
    
    res.json(fileInfo);
});

// Handle WebSocket connections
io.on('connection', async (socket) => {
    console.log('Client connected');
    
    // Save device information on connection
    socket.on('registerDevice', async (deviceInfo) => {
        try {
            // Save device information to database
            await db.saveDevice(deviceInfo);
            connectedDevices.set(deviceInfo.id, socket);
            
            // Send device list to all clients
            await broadcastDeviceList();
        } catch (err) {
            console.error('Error registering device:', err);
        }
    });

    // Handle device name change
    socket.on('updateDeviceName', async (deviceInfo) => {
        try {
            const deviceSocket = connectedDevices.get(deviceInfo.id);
            if (deviceSocket) {
                // Save new name to database
                await db.saveDevice(deviceInfo);
                deviceSocket.deviceName = deviceInfo.name;
                
                // Send update notification to all clients
                io.emit('deviceNameUpdated', {
                    id: deviceInfo.id,
                    name: deviceInfo.name
                });
                
                // Update device list
                await broadcastDeviceList();
            }
        } catch (err) {
            console.error('Error updating device name:', err);
        }
    });
    
    socket.on('disconnect', async () => {
        console.log('Client disconnected');
        // Remove device from list on disconnect
        for (const [id, sock] of connectedDevices.entries()) {
            if (sock === socket) {
                connectedDevices.delete(id);
                await broadcastDeviceList();
                break;
            }
        }
    });
});

// Function to send device list to all clients
async function broadcastDeviceList() {
    try {
        // Get device list from database
        const devices = await db.getAllDevices();
        
        // Filter online devices
        const onlineDevices = devices.filter(device => 
            connectedDevices.has(device.id)
        ).map(device => ({
            id: device.id,
            name: device.name,
            type: device.type
        }));
        
        io.emit('deviceList', onlineDevices);
    } catch (err) {
        console.error('Error sending device list:', err);
    }
}

// Clean up inactive devices every hour
setInterval(async () => {
    try {
        await db.cleanupInactiveDevices();
    } catch (err) {
        console.error('Error cleaning up inactive devices:', err);
    }
}, 60 * 60 * 1000);

// Start server
http.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 