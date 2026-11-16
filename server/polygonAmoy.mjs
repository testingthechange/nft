import { JsonRpcProvider } from 'ethers';

// Read-only Polygon Amoy connectivity. Do not add wallets, private keys or signers here.
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_RPC_DEFAULT = 'https://polygon-amoy.api.onfinality.io/public';

export async function readPolygonAmoyStatus({
  rpcUrl = process.env.POLYGON_AMOY_RPC_URL || POLYGON_AMOY_RPC_DEFAULT,
  makeProvider = (url) => new JsonRpcProvider(url),
} = {}) {
  // Only HTTP(S) RPC; do not accidentally accept file:, local, or insecure URLs.
  let url;
  try {
    url = new URL(rpcUrl);
    if (url.protocol !== 'https:' || url.username || url.password) {
      return { connected: false, reason: 'invalid_rpc_configuration' };
    }
  } catch {
    return { connected: false, reason: 'invalid_rpc_configuration' };
  }

  let provider;
  try {
    provider = makeProvider(url.href);
    const chainHex = await provider.send('eth_chainId', []);
    if (typeof chainHex !== 'string' || !/^0x[0-9a-f]+$/i.test(chainHex)) {
      return { connected: false, reason: 'invalid_chain_id' };
    }
    const chainId = Number.parseInt(chainHex, 16);
    if (chainId !== POLYGON_AMOY_CHAIN_ID) {
      return { connected: false, reason: 'unexpected_chain', expected_chain_id: POLYGON_AMOY_CHAIN_ID };
    }
    const blockHex = await provider.send('eth_blockNumber', []);
    if (typeof blockHex !== 'string' || !/^0x[0-9a-f]+$/i.test(blockHex)) {
      return { connected: false, reason: 'invalid_block_number' };
    }
    const blockNumber = Number.parseInt(blockHex, 16);
    if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) {
      return { connected: false, reason: 'invalid_block_number' };
    }
    return {
      connected: true,
      network: 'polygon-amoy',
      chain_id: POLYGON_AMOY_CHAIN_ID,
      block_number: blockNumber,
      read_only: true,
      mint_enabled: false,
      wallet_configured: false,
    };
  } catch {
    return { connected: false, reason: 'rpc_unavailable' };
  } finally {
    // Ethers v6 provider can maintain internal resources; close per-request usage.
    if (provider?.destroy) provider.destroy();
  }
}
