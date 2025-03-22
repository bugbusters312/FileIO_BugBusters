require("dotenv").config();
const dgram = require("dgram");

const PORT = process.env.DISCOVERY_PORT || 5000;
const socket = dgram.createSocket("udp4");

socket.on("message", (msg, rinfo) => {
    console.log(`✅ Found device at ${rinfo.address}:${rinfo.port} - Message: ${msg}`);
});

socket.bind(PORT, () => {
    console.log(`🔍 Listening for device broadcasts on port ${PORT}...`);
});
