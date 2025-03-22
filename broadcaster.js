require("dotenv").config();
const dgram = require("dgram");

const PORT = process.env.DISCOVERY_PORT || 5000;
const BROADCAST_IP = "255.255.255.255"; // Broadcast to all devices

const socket = dgram.createSocket("udp4");

// Allow broadcasting
socket.bind(() => {
    socket.setBroadcast(true);
});

// Send broadcast message every 2 seconds
setInterval(() => {
    const message = Buffer.from("FileIO-Discovery");
    socket.send(message, 0, message.length, PORT, BROADCAST_IP, () => {
        console.log("📡 Broadcasting discovery message...");
    });
}, 2000);

