const crypto = require('crypto');
const CryptoJS = require('crypto-js');

class Security {
  constructor() {
    // Generate ECDH key pair for this instance
    this.ecdh = crypto.createECDH('prime256v1');
    this.ecdh.generateKeys();
    this.sharedSecrets = new Map(); // Store shared secrets for each client
  }

  // Get the public key for sharing
  getPublicKey() {
    return this.ecdh.getPublicKey().toString('base64');
  }

  // Compute shared secret when receiving client's public key
  computeSharedSecret(clientPublicKey, clientId) {
    try {
      const clientPubKeyBuffer = Buffer.from(clientPublicKey, 'base64');
      const sharedSecret = this.ecdh.computeSecret(clientPubKeyBuffer);
      
      // Store the shared secret for this client
      const sharedSecretHex = sharedSecret.toString('hex');
      this.sharedSecrets.set(clientId, sharedSecretHex);
      
      return true;
    } catch (error) {
      console.error('Error computing shared secret:', error);
      return false;
    }
  }

  // Encrypt a message using AES-256 with the shared secret
  encrypt(message, clientId) {
    const sharedSecret = this.sharedSecrets.get(clientId);
    if (!sharedSecret) {
      throw new Error('No shared secret established for this client');
    }
    
    return CryptoJS.AES.encrypt(message, sharedSecret).toString();
  }

  // Decrypt a message using AES-256 with the shared secret
  decrypt(encryptedMessage, clientId) {
    const sharedSecret = this.sharedSecrets.get(clientId);
    if (!sharedSecret) {
      throw new Error('No shared secret established for this client');
    }
    
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, sharedSecret);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Remove a client's shared secret (when disconnected)
  removeClient(clientId) {
    this.sharedSecrets.delete(clientId);
  }
}

module.exports = Security;