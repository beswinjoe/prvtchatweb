import { createRelayServer } from './relay';

const port = Number(process.env.PORT) || 4040;
const { server, relay } = createRelayServer(port);

console.log('='.repeat(65));
console.log('  PRVTCHAT RAM-ONLY ZERO-PERSISTENCE NETWORK RELAY SERVER');
console.log('='.repeat(65));
console.log(`- Running on: http://localhost:${port} (WebSocket & HTTP)`);
console.log('- Mode: RAM-Only Volatile Memory (Zero Disk Writes / Zero Database)');
console.log('- E2EE: Encryption keys remain strictly in client URL fragments');
console.log('- Lifetime: Hard 7-day ceiling per room with active 5s memory shredder');
console.log('='.repeat(65));

// Graceful shutdown
const shutdown = () => {
  console.log('\n[Relay] Shutting down. Actively wiping all in-memory rooms...');
  relay.close();
  server.close(() => {
    console.log('[Relay] Server terminated. All volatile memory released.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
