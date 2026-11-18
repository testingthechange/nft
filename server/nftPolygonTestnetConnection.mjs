// Read-only Amoy handoff connectivity check.
// Only verifies that the handoff is non-executable and the RPC is on chain 80002.
import { preparePolygonHandoff } from './nftPolygonHandoff.mjs';
import { readPolygonAmoyStatus, POLYGON_AMOY_CHAIN_ID } from './polygonAmoy.mjs';
export async function inspectPolygonTestnetHandoff(frame, { statusReader = readPolygonAmoyStatus } = {}) {
  const manifest = preparePolygonHandoff(frame);
  const network = await statusReader();
  if (network?.connected !== true || network.chain_id !== POLYGON_AMOY_CHAIN_ID ||
      network.read_only !== true || network.mint_enabled !== false) {
    return Object.freeze({ connected: false, reason: 'testnet_not_verified',
      chain_id: POLYGON_AMOY_CHAIN_ID, handoff_prepared: true,
      broadcast: false, minted: false });
  }
  return Object.freeze({ connected: true, network: 'polygon-amoy',
    chain_id: POLYGON_AMOY_CHAIN_ID, block_number: network.block_number,
    handoff_schema: manifest.schemaVersion, handoff_prepared: true,
    broadcast: false, minted: false });
}
