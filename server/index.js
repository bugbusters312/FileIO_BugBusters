// // Required modules
const { exec } = require('child_process');
const os = require('os');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const DiscoveryService = require('./discovery');
const Security = require('./security');
const cors = require("cors");


// Server setup
const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
app.use(cors());

const deviceName = os.hostname();
const discoveryService = new DiscoveryService(PORT, deviceName);
const security = new Security();
const connectedClients = new Map();

const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, 'downloads'); // Directory to save received files
let connectedDevices = {}; // Store active devices

// Ensure the download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Store active file streams
const activeTransfers = new Map();

// Ensure Wi-Fi Direct is enabled for offline connection
defaultSetupWiFiDirect();

function defaultSetupWiFiDirect() {
    console.log('Setting up Wi-Fi Direct connection...');
    exec('netsh wlan set hostednetwork mode=allow ssid=FileTransfer key=12345678', (error, stdout, stderr) => {
        if (error) {
            console.error('Failed to setup Wi-Fi Direct:', stderr);
        } else {
            console.log('Wi-Fi Direct enabled. SSID: FileTransfer');
            exec('netsh wlan start hostednetwork');
        }
    });
}

// Handle device discovery with Wi-Fi Direct
app.get('/api/device-info', (req, res) => {
    console.log("called")
    const deviceInfo = discoveryService.getDeviceInfo();
    res.json({
        ...deviceInfo,
        publicKey: security.getPublicKey()
    });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Save device info
    // connectedDevices[socket.id] = { id: socket.id, name: `Device-${socket.id}` };

    // // Notify all clients about the updated device list
    // io.emit('deviceListUpdate', Object.values(connectedDevices));

    socket.on('key_exchange', ({ clientId, publicKey }) => {
        console.log(`Key exchange with ${clientId}`);
        const success = security.computeSharedSecret(publicKey, clientId);
        if (success) {
            connectedClients.set(clientId, { socketId: socket.id, deviceName: clientId });
            socket.emit('key_exchange_response', { success: true, serverPublicKey: security.getPublicKey() });
        } else {
            socket.emit('key_exchange_response', { success: false, message: 'Failed to establish secure connection' });
        }
    });

    socket.on('secure_message', ({clientId, encryptedMessage}) => {
        console.log("Asfaa", clientId)
        const decryptedMessage = security.decrypt(encryptedMessage,clientId)
        console.log(decryptedMessage)
    })

    socket.on("verify_connection", ({clientId}) => {
        console.log("verifying...",clientId)
        socket.emit("connection_verified", {success: true})
    })

    // Start receiving a file
    socket.on('start_file_transfer', ({ fileName, fileSize }) => {
        const filePath = path.join(DOWNLOAD_DIR, fileName);
        console.log(filePath,fileName,fileSize)

        console.log(`📥 Receiving file: ${fileName} (${fileSize} bytes)`);

        // Open a write stream
        const fileStream = fs.createWriteStream(filePath);
        activeTransfers.set(socket.id, { fileStream, fileName, filePath });

        socket.emit('file_transfer_ready', { success: true });
    });

    // Start file transfer
    // socket.on('startFileTransfer', ({ files }) => {
    //     activeTransfers.set(socket.id, []);
    //     files.forEach(({ fileName }) => {
    //         const filePath = path.join(UPLOAD_DIR, fileName);
    //         const fileStream = fs.createWriteStream(filePath);
    //         activeTransfers.get(socket.id).push({ fileStream, filePath });
    //         console.log(`Receiving file: ${fileName}`);
    //     });
    //     socket.emit('fileTransferStarted', { success: true });
    // });

    // Receiving file chunks
    socket.on('file_chunk', ({ fileName, chunk }) => {
        const transfer = activeTransfers.get(socket.id);
        if (transfer && transfer.fileName === fileName) {
            transfer.fileStream.write(Buffer.from(chunk));
        }
    });

    // Receive file chunks
    // socket.on('fileChunk', ({ fileIndex, chunk }) => {
    //     const transfer = activeTransfers.get(socket.id);
    //     if (transfer && transfer[fileIndex]) {
    //         transfer[fileIndex].fileStream.write(Buffer.from(chunk));
    //     }
    // });

    // Finish file transfer
    socket.on('end_file_transfer', ({ fileName }) => {
        const transfer = activeTransfers.get(socket.id);
        if (transfer && transfer.fileName === fileName) {
            transfer.fileStream.end(); // Close file stream
            console.log(`✅ File saved: ${transfer.filePath}`);
            socket.emit('file_received', { success: true, filePath: transfer.filePath });
            activeTransfers.delete(socket.id);
        }
    });
    // // End file transfer
    // socket.on('endFileTransfer', () => {
    //     const transfer = activeTransfers.get(socket.id);
    //     if (transfer) {
    //         transfer.forEach(({ fileStream }) => fileStream.end());
    //         console.log(`All files received for client ${socket.id}`);
    //         socket.emit('fileTransferComplete', { success: true });
    //     }
    //     activeTransfers.delete(socket.id);
    // });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        connectedClients.forEach((client, clientId) => {
            if (client.socketId === socket.id) {
                connectedClients.delete(clientId);
                security.removeClient(clientId);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running offline on port ${PORT}`);
    discoveryService.startAdvertising();
});

process.on('SIGINT', () => {
    console.log('Shutting down server...');
    discoveryService.destroy();
    process.exit();
});

