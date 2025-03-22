const WebSocket = require("ws");

const SERVER_URL = "ws://localhost:3000"; // Change to actual server IP if needed
const ws = new WebSocket(SERVER_URL);

ws.on("open", () => {
    console.log("✅ Connected to WebSocket server");
    
    // Send a message to the server
    ws.send("Hello from Client!");

    // Send periodic heartbeat messages
    setInterval(() => {
        ws.send("ping");
    }, 5000);
});

ws.on("message", (message) => {
    console.log(`📩 Received from server: ${message}`);
});

ws.on("close", () => {
    console.log("❌ Disconnected from WebSocket server");
});
