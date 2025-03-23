const express = require('express');
const http = require('http');
const { io: SocketIOClient } = require('socket.io-client');
const DiscoveryClient = require('./discovery');
const Security = require('./security');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create client app (for receiving files from server if needed)
const app = express();
const server = http.createServer(app);
const PORT = process.env.CLIENT_PORT || 3030;

// Initialize discovery client
const discoveryClient = new DiscoveryClient();
const security = new Security();

// Generate a unique client ID
const clientId = `Mobile-${Math.floor(Math.random() * 10000)}`;

// Variables to store connection state
let socket = null;
let connectedServer = null;
let connectionEstablished = false;

// Set up CLI interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to display discovered servers and let user select one
const displayServersMenu = () => {
  const servers = discoveryClient.getDiscoveredServers();
  
  if (servers.length === 0) {
    console.log('No servers discovered yet. Waiting...');
    return;
  }
  
  console.log('\nDiscovered Servers:');
  servers.forEach((server, index) => {
    console.log(`${index + 1}. ${server.name} (${server.host}:${server.port})`);
  });
  
  rl.question('\nEnter server number to connect (or 0 to refresh): ', (answer) => {
    const selection = parseInt(answer);
    
    if (selection === 0) {
      displayServersMenu();
      return;
    }
    
    if (selection > 0 && selection <= servers.length) {
      const selectedServer = servers[selection - 1];
      connectToServer(selectedServer);
    } else {
      console.log('Invalid selection. Please try again.');
      displayServersMenu();
    }
  });
};

// Function to connect to a selected server
const connectToServer = (server) => {
  console.log(`Connecting to server: ${server.name} at ${server.host}:${server.port}`);
  
  // Store server info
  connectedServer = server;
  
  // Connect to the server's Socket.IO
  const socketUrl = `http://${server.host}:${server.port}`;
  socket = SocketIOClient(socketUrl, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  
  // Socket connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected. Initiating key exchange...');
    
    // Initiate key exchange
    socket.emit('key_exchange', {
      clientId: clientId,
      publicKey: security.getPublicKey()
    });
  });
  
  socket.on('key_exchange_response', (response) => {
    if (response.success) {
      // Compute shared secret with server's public key
      const success = security.computeSharedSecret(response.serverPublicKey);
      
      if (success) {
        connectionEstablished = true;
        console.log('Secure connection established with the server.');
        
        // Verify connection
        socket.emit('verify_connection', { clientId });
      } else {
        console.error('Failed to compute shared secret.');
        socket.disconnect();
      }
    } else {
      console.error('Key exchange failed:', response.message);
      socket.disconnect();
    }
  });
  
  socket.on('connection_verified', (response) => {
    if (response.success) {
      console.log('Connection verified:', response.message);
      showCommandMenu();
    } else {
      console.error('Connection verification failed:', response.message);
      disconnectFromServer();
    }
  });
  
  socket.on('secure_message_response', (data) => {
    try {
      const decryptedMessage = security.decrypt(data.encryptedMessage);
      console.log(`\nServer response: ${decryptedMessage}`);
      showCommandMenu();
    } catch (error) {
      console.error('Error decrypting message:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server.');
    connectionEstablished = false;
    connectedServer = null;
    security.reset();
    displayServersMenu();
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    socket.disconnect();
    displayServersMenu();
  });
};

// Function to disconnect from the server
const disconnectFromServer = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  connectionEstablished = false;
  connectedServer = null;
  security.reset();
  console.log('Disconnected from server.');
  displayServersMenu();
};

// Function to send a secure message to the server
const sendSecureMessage = (message) => {
  if (!socket || !connectionEstablished) {
    console.error('Not connected to any server.');
    return;
  }
  
  try {
    const encryptedMessage = security.encrypt(message);
    socket.emit('secure_message', {
      clientId: clientId,
      encryptedMessage: encryptedMessage
    });
    socket.emit("yuu",{x:"hibro"})
    showCommandMenu();
  } catch (error) {
    console.error('Error encrypting message:', error);
  }
};

// Function to send a file
const sendFile = (filePath) => {
  if (!socket || !connectionEstablished) {
    console.error('❌ Not connected to any server.');
    return;
  }

  // Get file details
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  console.log(`📤 Sending file: ${fileName} (${fileSize} bytes)`);

  // Notify server about file transfer
  socket.emit("start_file_transfer", { fileName, fileSize });

  // Read and send file in chunks
  const CHUNK_SIZE = 1024 * 64; // 64KB per chunk
  const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

  fileStream.on("data", (chunk) => {
    socket.emit("file_chunk", { fileName, chunk });
  });

  fileStream.on("end", () => {
    socket.emit("end_file_transfer", { fileName });
    console.log(`✅ File sent successfully: ${fileName}`);
  });

  fileStream.on("error", (err) => {
    console.error("❌ Error reading file:", err);
  });
};

// Show command menu after connection
const showCommandMenu = () => {
  if (!connectionEstablished) {
    displayServersMenu();
    return;
  }
  
  console.log('\nCommands:');
  console.log('1. Send test message');
  console.log('2. Send a file');
  console.log('3. Disconnect');
  
  rl.question('Enter command number: ', (answer) => {
    switch (answer) {
      case '1':
        rl.question('Enter message to send: ', (message) => {
          sendSecureMessage(message);
        });
        break;
      case '2':
        rl.question('Enter file path: ', (filePath) => {
          if (fs.existsSync(filePath)) {
            sendFile(filePath);
          } else {
            console.error('❌ File not found.');
          }
          showCommandMenu();
        });
        break;
      case '3':
        disconnectFromServer();
        break;
      default:
        console.log('❌ Invalid command.');
        showCommandMenu();
        break;
    }
  });
};

// Start the client
server.listen(PORT, () => {
  console.log(`Client running on port ${PORT}`);
  console.log(`Client ID: ${clientId}`);
  
  // Set up discovery callbacks
  discoveryClient.setOnServerDiscovered((server) => {
    console.log(`\nNew server discovered: ${server.name}`);
    if (discoveryClient.getDiscoveredServers().length === 1) {
      displayServersMenu();
    }
  });
  
  discoveryClient.setOnServerRemoved((server) => {
    console.log(`\nServer removed: ${server.name}`);
    if (connectedServer && connectedServer.id === server.id) {
      console.log('Currently connected server went down.');
      socket.disconnect();
    }
  });
  
  // Start browsing for servers
  discoveryClient.startBrowsing();
  console.log('Discovering servers on the network...');
  
  // Initial display of servers menu after a delay
  setTimeout(displayServersMenu, 2000);
});

// Handle application shutdown
process.on('SIGINT', () => {
  console.log('Shutting down client...');
  if (socket) {
    socket.disconnect();
  }
  discoveryClient.destroy();
  rl.close();
  process.exit();
});