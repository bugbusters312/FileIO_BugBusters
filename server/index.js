// const express = require('express');
// const http = require('http');
// const socketIO = require('socket.io');
// const cors = require('cors');
// const DiscoveryService = require('./discovery');
// const Security = require('./security');
// const os = require('os');

// // Server configuration
// const PORT = process.env.PORT || 3000;
// const app = express();
// const server = http.createServer(app);

// // Enable CORS
// app.use(cors());
// app.use(express.json());

// // Create Socket.IO server with CORS enabled
// const io = socketIO(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// // Get device name from hostname
// const deviceName = os.hostname();

// // Initialize discovery service
// const discoveryService = new DiscoveryService(PORT, deviceName);

// // Initialize security
// const security = new Security();

// // Connected clients
// const connectedClients = new Map();

// // API endpoint to get device information and public key
// app.get('/api/device-info', (req, res) => {
//   const deviceInfo = discoveryService.getDeviceInfo();
//   res.json({
//     ...deviceInfo,
//     publicKey: security.getPublicKey()
//   });
// });

// // Socket.IO connection handling
// io.on('connection', (socket) => {
//   console.log(`New client connected: ${socket.id}`);

//   // Handle key exchange
//   socket.on('key_exchange', ({ clientId, publicKey }) => {
//     console.log(`Key exchange initiated with client: ${clientId}`);
    
//     // Compute shared secret using client's public key
//     const success = security.computeSharedSecret(publicKey, clientId);
    
//     if (success) {
//       // Store client information
//       connectedClients.set(clientId, {
//         socketId: socket.id,
//         deviceName: clientId
//       });
      
//       // Send server's public key in response
//       socket.emit('key_exchange_response', {
//         success: true,
//         serverPublicKey: security.getPublicKey()
//       });
      
//       // Broadcast new client connection to all other clients
//       socket.broadcast.emit('client_connected', {
//         clientId,
//         deviceName: clientId
//       });
//     } else {
//       socket.emit('key_exchange_response', {
//         success: false,
//         message: 'Failed to establish secure connection'
//       });
//     }
//   });

//   // Handle secure messaging
//   socket.on('secure_message', ({ clientId, encryptedMessage }) => {
//     try {
//       // Decrypt the message
//       const decryptedMessage = security.decrypt(encryptedMessage, clientId);
//       console.log(`Decrypted message from ${clientId}: ${decryptedMessage}`);
      
//       // Respond with an encrypted message
//       const response = security.encrypt(`Server received: ${decryptedMessage}`, clientId);
//       socket.emit('secure_message_response', { encryptedMessage: response });
//     } catch (error) {
//       console.error('Error handling secure message:', error);
//       socket.emit('error', { message: 'Failed to process secure message' });
//     }
//   });

//   // Handle connection verification
//   socket.on('verify_connection', ({ clientId }) => {
//     if (connectedClients.has(clientId)) {
//       socket.emit('connection_verified', { 
//         success: true,
//         message: 'Connection established and verified'
//       });
//     } else {
//       socket.emit('connection_verified', { 
//         success: false,
//         message: 'Connection not verified. Try reconnecting.'
//       });
//     }
//   });

//   // Handle client disconnect
//   socket.on('disconnect', () => {
//     console.log(`Client disconnected: ${socket.id}`);
    
//     // Find and remove the client
//     for (const [clientId, client] of connectedClients.entries()) {
//       if (client.socketId === socket.id) {
//         connectedClients.delete(clientId);
//         security.removeClient(clientId);
        
//         // Notify other clients about the disconnection
//         socket.broadcast.emit('client_disconnected', { clientId });
//         break;
//       }
//     }
//   });
// });

// // Start the server
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
//   // Start advertising this server on the network for discovery
//   discoveryService.startAdvertising();
// });

// // Handle application shutdown
// process.on('SIGINT', () => {
//   console.log('Shutting down server...');
//   discoveryService.destroy();
//   process.exit();
// });


// Required modules
const { exec } = require('child_process');
const os = require('os');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const DiscoveryService = require('./discovery');
const Security = require('./security');

// Server setup
const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const deviceName = os.hostname();
const discoveryService = new DiscoveryService(PORT, deviceName);
const security = new Security();
const connectedClients = new Map();

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
    const deviceInfo = discoveryService.getDeviceInfo();
    res.json({
        ...deviceInfo,
        publicKey: security.getPublicKey()
    });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

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

    // Placeholder for file transfer
    socket.on('file_transfer', ({ clientId }) => {
        console.log(`File transfer requested from ${clientId}`);
        socket.emit('file_transfer_response', { message: 'file transfer' });
    });

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
