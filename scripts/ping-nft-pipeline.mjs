// Synthetic, read-only NFT board-to-Polygon ping. Never mints or writes.
import {buildNftGatheringBoard} from '../server/nftGatheringBoard.mjs';
import {assembleFromGatheringBoard} from '../server/nftAssemblyAdapter.mjs';
import {inspectPolygonTestnetHandoff} from '../server/nftPolygonTestnetConnection.mjs';
export async function pingNftPipeline({statusReader}={}) {
  const registrationId='PING-REG-001';
  const board=buildNftGatheringBoard({verifiedRegistration:{verified:true,record:{
    registration_id:registrationId,album_id:'ALBUM-BETA-PING',album_copy_number:'COPY-BETA-PING'
  }}});
  // This verified flag is an in-memory fixture, NOT evidence of a real purchase.
  const rules={version:'ajine-nft-rules-board-v1',registrationId,decision:'eligible',
    permissions:{burnForRewards:false,convertToCollectibles:false,exportToWallet:false}};
  const frame=assembleFromGatheringBoard(board,rules);
  const result=await inspectPolygonTestnetHandoff(frame,statusReader?{statusReader}:{});
  return Object.freeze({test:'synthetic-readonly-pipeline-ping',fixtureOnly:true,
    stages:{gathering:board.mode,rules:frame.decision,assembly:frame.status,
      handoff:result.handoff_prepared===true,amoy:result.connected===true?'connected':'unverified'},
    network:result.connected===true?'polygon-amoy':null,chainId:result.chain_id,
    passed:result.connected===true,broadcast:false,minted:false,stored:false});
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
  pingNftPipeline().then(r=>{console.log(JSON.stringify(r));if(!r.passed)process.exitCode=1})
    .catch(e=>{console.error('ping_failed: '+e.message);process.exitCode=1});
}
