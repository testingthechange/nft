// Read-only Polygon Amoy RPC connectivity. ethers.js remains installed for
// future contract reads, but status probes use cancellable native fetch so an
// unresponsive RPC cannot leave the HTTP request hanging indefinitely.
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_RPC_DEFAULT = 'https://polygon-amoy.api.onfinality.io/public';
export const POLYGON_RPC_TIMEOUT_MS = 7000;

function validHex(value) {
  return typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value);
}

export async function readPolygonAmoyStatus({
  rpcUrl = process.env.POLYGON_AMOY_RPC_URL || POLYGON_AMOY_RPC_DEFAULT,
  fetchImpl = fetch,
  timeoutMs = POLYGON_RPC_TIMEOUT_MS,
} = {}) {
  let url;
  try {
    url = new URL(rpcUrl);
    if (url.protocol !== 'https:' || url.username || url.password) {
      return { connected: false, reason: 'invalid_rpc_configuration' };
    }
  } catch {
    return { connected: false, reason: 'invalid_rpc_configuration' };
  }

  // Apply a single deadline to BOTH RPC operations. No secrets, full URLs,
  // provider error bodies or response payloads are exposed.
  const controller = new AbortController();
  let stage = 'chain_id';
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  async function rpc(method, id) {
    const response = await fetchImpl(url.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params: [] }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = Error('rpc_http_error');
      error.category = 'http_error';
      error.httpStatus = response.status;
      throw error;
    }
    const data = await response.json();
    if (data?.jsonrpc !== '2.0' || data.id !== id || data.error) {
      const error = Error('invalid_rpc_response');
      error.category = 'invalid_response';
      throw error;
    }
    return data.result;
  }

  try {
    const chainHex = await rpc('eth_chainId', 1);
    if (!validHex(chainHex)) {
      return { connected: false, reason: 'invalid_chain_id' };
    }
    if (Number.parseInt(chainHex, 16) !== POLYGON_AMOY_CHAIN_ID) {
      return { connected: false, reason: 'unexpected_chain', expected_chain_id: POLYGON_AMOY_CHAIN_ID };
    }
    stage = 'block_number';
    const blockHex = await rpc('eth_blockNumber', 2);
    if (!validHex(blockHex)) {
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
  } catch (error) {
    if (controller.signal.aborted) {
      return { connected: false, reason: 'rpc_timeout', stage };
    }
    if (error?.category === 'http_error') {
      return { connected: false, reason: 'rpc_http_error', stage,
        upstream_status: error.httpStatus };
    }
    if (error?.category === 'invalid_response') {
      return { connected: false, reason: 'invalid_rpc_response', stage };
    }
    return { connected: false, reason: 'rpc_unavailable', stage };
  } finally {
    clearTimeout(timeout);
  }
}
