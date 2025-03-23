const crypto = require('crypto');
const CryptoJS = require('crypto-js');

class Security {
  constructor() {
    // Generate ECDH key pair for this instance
    this.ecdh = crypto.createECDH('prime256v1');
    this.ecdh.generateKeys();
    this.sharedSecret = null;
    this.serverPublicKey = null;
  }

  // Get the public key for sharing
  getPublicKey() {
    return this.ecdh.getPublicKey().toString('base64');
  }

  // Compute shared secret when receiving server's public key
  computeSharedSecret(serverPublicKey) {
    try {
      this.serverPublicKey = serverPublicKey;
      const serverPubKeyBuffer = Buffer.from(serverPublicKey, 'base64');
      const sharedSecret = this.ecdh.computeSecret(serverPubKeyBuffer);
      
      // Store the shared secret
      this.sharedSecret = sharedSecret.toString('hex');
      return true;
    } catch (error) {
      console.error('Error computing shared secret:', error);
      return false;
    }
  }

  // Encrypt a message using AES-256 with the shared secret
  encrypt(message) {
    if (!this.sharedSecret) {
      throw new Error('No shared secret established');
    }
    
    return CryptoJS.AES.encrypt(message, this.sharedSecret).toString();
  }

  // Decrypt a message using AES-256 with the shared secret
  decrypt(encryptedMessage) {
    if (!this.sharedSecret) {
      throw new Error('No shared secret established');
    }
    
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, this.sharedSecret);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Reset security when disconnecting
  reset() {
    this.sharedSecret = null;
    this.serverPublicKey = null;
  }
}

module.exports = Security;