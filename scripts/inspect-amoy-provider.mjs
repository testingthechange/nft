// Read-only, redacted provider selection report. Never print RPC URLs or keys.
import { readPolygonAmoyStatus } from '../server/polygonAmoy.mjs';
export function classifyAmoyProvider(raw = process.env.POLYGON_AMOY_RPC_URL) {
  if (!raw) return { provider:'public_fallback', configured:false };
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password)
      return { provider:'invalid', configured:true };
    const host=url.hostname.toLowerCase();
    if (host === 'polygon-amoy.g.alchemy.com')
      return { provider:'alchemy', configured:true };
    return { provider:'custom_rpc', configured:true };
  } catch {
    return { provider:'invalid', configured:true };
  }
}
export async function inspectAmoyProvider({rpcUrl=process.env.POLYGON_AMOY_RPC_URL,statusReader=readPolygonAmoyStatus}={}) {
  const provider=classifyAmoyProvider(rpcUrl);
  if (provider.provider==='invalid') return {...provider,connected:false,reason:'invalid_rpc_configuration'};
  const status=await statusReader(rpcUrl ? {rpcUrl} : {});
  return {...provider,connected:status.connected===true,chain_id:status.chain_id??null,
    read_only:status.read_only===true,mint_enabled:status.mint_enabled===true,
    reason:status.connected===true?null:(status.reason??'rpc_unavailable')};
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  inspectAmoyProvider().then(result=>{console.log(JSON.stringify(result));if(!result.connected)process.exitCode=1})
    .catch(()=>{console.error('provider_check_failed');process.exitCode=1});
}
