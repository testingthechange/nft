import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import solc from 'solc';

const require = createRequire(import.meta.url);
const CONTRACT_PATH = resolve('contracts/BetaAlbumCopyNFT.sol');

function findImports(name) {
  try {
    if (!name.startsWith('@openzeppelin/contracts/')) return {error:'disallowed_import'};
    const path = require.resolve(name);
    return {contents:readFileSync(path,'utf8')};
  } catch {
    return {error:'missing_import'};
  }
}

export function compileBetaAlbumNft() {
  const source=readFileSync(CONTRACT_PATH,'utf8');
  const input={
    language:'Solidity',
    sources:{'contracts/BetaAlbumCopyNFT.sol':{content:source}},
    settings:{
      optimizer:{enabled:true,runs:200},
      outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}
    }
  };
  const output=JSON.parse(solc.compile(JSON.stringify(input),{import:findImports}));
  const errors=(output.errors || []).filter(e=>e.severity==='error');
  if(errors.length)throw Error('Solidity compilation failed: '+errors.map(e=>e.formattedMessage).join('\n'));
  const contract=output.contracts?.['contracts/BetaAlbumCopyNFT.sol']?.BetaAlbumCopyNFT;
  if(!contract?.evm?.bytecode?.object || !contract?.abi)throw Error('missing_contract_artifacts');
  return {abi:contract.abi,bytecode:contract.evm.bytecode.object};
}

if(process.argv[1] && resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)) {
  const artifact=compileBetaAlbumNft();
  console.log(JSON.stringify({
    ok:true,contract:'BetaAlbumCopyNFT',
    abi_entries:artifact.abi.length,bytecode_bytes:artifact.bytecode.length / 2,
    deployed:false,minted:false
  }));
}
