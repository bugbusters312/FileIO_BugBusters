const { Bonjour } = require('bonjour-service');

class DiscoveryService {
  constructor(port, deviceName) {
    this.bonjour = new Bonjour();
    this.deviceName = deviceName || `Laptop-${Math.floor(Math.random() * 10000)}`;
    this.port = port;
    this.service = null;
  }

  // Start advertising this device on the network
  startAdvertising() {
    if (this.service) {
      console.log('Service already advertising');
      return;
    }

    try {
      // Publish a service with type 'device-discovery'
      this.service = this.bonjour.publish({
        name: this.deviceName,
        type: 'device-discovery',
        port: this.port,
        txt: {
          deviceType: 'laptop',
          version: '1.0.0'
        }
      });

      console.log(`Service "${this.deviceName}" is now being advertised on port ${this.port}`);
    } catch (error) {
      console.error('Error starting advertisement:', error);
    }
  }

  // Stop advertising
  stopAdvertising() {
    if (this.service) {
      this.service.stop();
      this.service = null;
      console.log('Advertisement stopped');
    }
  }

  // Get device information
  getDeviceInfo() {
    return {
      deviceName: this.deviceName,
      deviceType: 'laptop',
      port: this.port
    };
  }

  // Clean up resources
  destroy() {
    this.stopAdvertising();
    this.bonjour.destroy();
  }
}

module.exports = DiscoveryService;