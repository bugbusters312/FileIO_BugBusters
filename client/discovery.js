const { Bonjour } = require('bonjour-service');

class DiscoveryClient {
  constructor() {
    this.bonjour = new Bonjour();
    this.browser = null;
    this.discoveredServers = new Map();
    this.onServerDiscovered = null;
    this.onServerRemoved = null;
  }

  // Start browsing for device discovery servers
  startBrowsing() {
    if (this.browser) {
      console.log('Already browsing for servers');
      return;
    }

    try {
      this.browser = this.bonjour.find({ type: 'device-discovery' });
      
      // Handle when a server is found
      this.browser.on('up', (service) => {
        console.log(`Discovered server: ${service.name} at ${service.host}:${service.port}`);
        
        const serverInfo = {
          id: service.name,
          name: service.name,
          host: service.host,
          port: service.port,
          addresses: service.addresses,
          type: service.txt.deviceType || 'unknown',
          version: service.txt.version || '1.0.0',
          rawInfo: service
        };
        
        this.discoveredServers.set(service.name, serverInfo);
        
        // Notify through callback if set
        if (this.onServerDiscovered) {
          this.onServerDiscovered(serverInfo);
        }
      });
      
      // Handle when a server goes down
      this.browser.on('down', (service) => {
        console.log(`Server went down: ${service.name}`);
        
        // Remove from discovered servers
        if (this.discoveredServers.has(service.name)) {
          const removedServer = this.discoveredServers.get(service.name);
          this.discoveredServers.delete(service.name);
          
          // Notify through callback if set
          if (this.onServerRemoved) {
            this.onServerRemoved(removedServer);
          }
        }
      });
      
      console.log('Started browsing for device discovery servers');
    } catch (error) {
      console.error('Error starting browser:', error);
    }
  }

  // Stop browsing
  stopBrowsing() {
    if (this.browser) {
      this.browser.stop();
      this.browser = null;
      console.log('Stopped browsing for servers');
    }
  }

  // Get all discovered servers
  getDiscoveredServers() {
    return Array.from(this.discoveredServers.values());
  }

  // Set callback for server discovery
  setOnServerDiscovered(callback) {
    this.onServerDiscovered = callback;
  }

  // Set callback for server removal
  setOnServerRemoved(callback) {
    this.onServerRemoved = callback;
  }

  // Clean up resources
  destroy() {
    this.stopBrowsing();
    this.bonjour.destroy();
  }
}

module.exports = DiscoveryClient;