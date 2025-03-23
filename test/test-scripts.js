const axios = require('axios');
const { io: SocketIOClient } = require('socket.io-client');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');

// Function to test server discovery and connection
const testDeviceDiscovery = async (serverUrl = 'http://localhost:3000') => {
  console.log('=== Testing Device Discovery and Connection ===');
  
  try {
    // Test 1: Get device info from server
    console.log('\nTest 1: Fetching device info from server...');
    const response = await axios.get(`${serverUrl}/api/device-info`);
    
    if (response.status === 200 && response.data) {
      console.log('✅ Successfully retrieved device info:');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ Failed to retrieve device info');
      return;
    }
    
    // Test 2: Establish socket connection and test key exchange
    console.log('\nTest 2: Testing Socket.IO connection and key exchange...');
    
    const socket = SocketIOClient(serverUrl);
    const clientId = `TestClient-${Math.floor(Math.random() * 10000)}`;
    
    // Generate ephemeral ECDH key pair
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.generateKeys();
    const clientPublicKey = ecdh.getPublicKey().toString('base64');
    
    // Handle connection
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      
      // Initiate key exchange
      socket.emit('key_exchange', {
        clientId,
        publicKey: clientPublicKey
      });
    });
    
    // Handle key exchange response
    socket.on('key_exchange_response', (response) => {
      if (response.success) {
        console.log('✅ Key exchange successful');
        
        // Compute shared secret
        const serverPubKey = Buffer.from(response.serverPublicKey, 'base64');
        const sharedSecret = ecdh.computeSecret(serverPubKey).toString('hex');
        
        // Test encryption/decryption
        const testMessage = 'Hello from test client!';
        const encryptedMessage = CryptoJS.AES.encrypt(testMessage, sharedSecret).toString();
        
        console.log('\nTest 3: Testing secure message exchange...');
        
        // Send encrypted message
        socket.emit('secure_message', {
          clientId,
          encryptedMessage
        });
        
        // Verify connection
        socket.emit('verify_connection', { clientId });
        
      } else {
        console.log('❌ Key exchange failed:', response.message);
        socket.disconnect();
      }
    });
    
    // Handle secure message response
    socket.on('secure_message_response', (data) => {
      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedMessage, sharedSecret);
        const decryptedMessage = bytes.toString(CryptoJS.enc.Utf8);
        
        console.log('✅ Received encrypted response from server');
        console.log(`Decrypted message: ${decryptedMessage}`);
        
        // Test complete, disconnect
        console.log('\nAll tests completed successfully!');
        socket.disconnect();
      } catch (error) {
        console.log('❌ Failed to decrypt message:', error.message);
        socket.disconnect();
      }
    });
    
    // Handle connection verification
    socket.on('connection_verified', (response) => {
      if (response.success) {
        console.log('✅ Connection verified:', response.message);
      } else {
        console.log('❌ Connection verification failed:', response.message);
        socket.disconnect();
      }
    });
    
    // Handle errors
    socket.on('connect_error', (error) => {
      console.log('❌ Connection error:', error.message);
    });
    
    socket.on('error', (error) => {
      console.log('❌ Socket error:', error.message);
    });
    
    // Leave the socket connection open for response handling
    // The test will complete when we receive and process the secure message response
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
};

// Run the test
testDeviceDiscovery();

module.exports = {
  testDeviceDiscovery
};