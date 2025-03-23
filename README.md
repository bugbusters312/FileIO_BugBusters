# Cross-Device File Transfer Application
## 📌 Project Overview
The Cross-Device File Transfer Application is a peer-to-peer (P2P) file-sharing solution that enables **fast, secure, and completely offline file transfers** between multiple devices. It supports various connection methods, ensuring that devices can discover and connect to each other seamlessly without requiring an internet connection.

## 🚀 Features (Planned & Implemented)
### ✅ **Implemented Features:**
* **Device Discovery**: Uses **Wi-Fi Direct** to find nearby devices automatically.
* **Secure Connection Establishment**: Implements **ECDH-based encryption** to securely exchange keys between devices.
* **Offline Functionality**: Works without the internet utilizing **Wi-Fi Direct**
* **Real-time Connection Handling**: Manages multiple connections dynamically.

### 🔜 **Upcoming Features:**
* **Seamless File Transfer**: Transfer files of any size with high-speed connections.
* **Multi-Platform Support**: Compatible with **Windows, Linux, Android, and iOS**.
* **Multiple Connection Modes**: Uses **Bluetooth, Hotspot, Wi-Fi Direct, and LAN**.
* **Automatic Best Connection Selection**: Dynamically chooses the fastest available transfer mode.
* **Cross-Network Transfer**: Support for transferring files even when devices are on different networks.

## 🔧 Installation & Setup
### **Prerequisites**
* **Node.js v16+**
* **NPM**

### **Steps to Set Up the Project**
1. **Clone the repository:**

```bash
git clone https://github.com/bugbusters312/FileIO_BugBusters.git
cd FileIO_BugBusters
```

2. **Install dependencies:**

```bash
npm install
```

3. **Start the backend server:**

First Device:
```bash
npm run start:server
```

Second Device:
```bash
npm run start:client
```

4. **Ensure Wi-Fi Direct is enabled** (for peer-to-peer discovery).
5. **Connect a client device** and start testing secure connections.

## 🛠️ How It Works
1. **Device Discovery**: The server advertises itself using **Wi-Fi Direct** and clients browse for available servers.
2. **Secure Connection**: Uses **ECDH (Elliptic Curve Diffie-Hellman) key exchange** to establish a secure channel.
3. **File Transfer**: Once a connection is established, file transfer can occur securely.

## 📌 Current Progress
The project currently implements **device discovery and secure peer-to-peer connection establishment using Wi-Fi Direct**. The **next phase will focus on integrating efficient file transfer mechanisms** over these secure connections.

## 📢 Stay tuned for more updates as we enhance the capabilities of this application!
