import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import solc from 'solc';
const require=createRequire(import.meta.url);
export function compileBurnableBetaNft(){
const base='contracts/BetaAlbumCopyNFT.sol',target='contracts/BetaBurnableAlbumCopyNFT.sol';
const input={language:'Solidity',sources:Object.fromEntries([base,target].map(p=>[p,{content:readFileSync(p,'utf8')}])),settings:{optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
const output=JSON.parse(solc.compile(JSON.stringify(input),{import:name=>{try{if(!name.startsWith('@openzeppelin/contracts/'))return {error:'disallowed_import'};return {contents:readFileSync(require.resolve(name),'utf8')};}catch{return {error:'missing_import'};}}}));
const errors=(output.errors||[]).filter(e=>e.severity==='error');
if(errors.length)throw Error(errors.map(e=>e.formattedMessage).join('\n'));
const artifact=output.contracts[target].BetaBurnableAlbumCopyNFT;
if(!artifact.abi.some(e=>e.type==='function'&&e.name==='burnBetaCopy'))throw Error('BURN_ABI_MISSING');
return {abi:artifact.abi,bytecode:artifact.evm.bytecode.object};
}
if(process.argv[1] && resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){const artifact=compileBurnableBetaNft();console.log(JSON.stringify({ok:true,contract:'BetaBurnableAlbumCopyNFT',bytecode_bytes:artifact.bytecode.length/2,deployed:false}));}
