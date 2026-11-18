/*
 * AJINE Album Rarity Engine / Layer 1: Copy Number evaluator.
 * DRAFT DESIGN PREVIEW ONLY. No permanent assignment, stamp, wallet, or I/O.
 * No default thresholds or priorities: they must be explicitly approved.
 */
import {prepareAlbumRarityFrame,LAYER_ONE_GROUPS,LAYER_ONE_LUCKY_NUMBERS} from "./albumRarityEngineFrame.mjs";
export const LAYER_ONE_EVALUATOR_VERSION = "ajine-album-copy-number-evaluator-v1";
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const title=Object.freeze({
 first_issue:"First Issue",milestone:"Milestone Edition",
 repeating:"Repeating Edition",sequential:"Sequential Edition",
 round_number:"Round Number Edition",lucky_clover:"Lucky Clover",
 palindrome:"Mirror Edition",
});
const validInt=n=>Number.isSafeInteger(n)&&n>0;
const sortedUnique=a=>Array.isArray(a)&&a.every(validInt)&&new Set(a).size===a.length;
const freezeResult=(r)=>Object.freeze(r);
const blocked=(reason)=>freezeResult({
 ok:false,reason,stage:"design_preview",evaluatorVersion:LAYER_ONE_EVALUATOR_VERSION,
 policyVersion:null,identity:null,qualifyingGroups:Object.freeze([]),
 primaryGroup:null,primaryTitle:null,assigned:false,finalized:false,persisted:false,stamp:null
});
/*
 * Explicitly supplied immutable policy. No arbitrary code, regex or expression
 * supplied by the caller may execute. The three lucky numbers are fixed.
 * Use a concrete version for every revision. A new ruleset never rewrites
 * previously finalized assignments (future persistence responsibility).
 */
export function validateLayerOnePolicy(policy){
 if(!policy||typeof policy!=="object"||Array.isArray(policy))return "missing_policy";
 if(typeof policy.version!=="string"||!/^draft-[a-z0-9._-]{1,50}$/.test(policy.version))
  return "policy_not_draft_versioned";
 if(!validInt(policy.firstIssueEnd))return "invalid_first_issue_end";
 if(!sortedUnique(policy.milestones))return "invalid_milestones";
 if(!sortedUnique(policy.roundNumbers))return "invalid_round_numbers";
 if(!validInt(policy.minRepeatLength)||policy.minRepeatLength<2)return "invalid_repeat_rule";
 if(!validInt(policy.minSequenceLength)||policy.minSequenceLength<2||policy.minSequenceLength>9)
  return "invalid_sequence_rule";
 if(!validInt(policy.minPalindromeLength)||policy.minPalindromeLength<2)
  return "invalid_palindrome_rule";
 if(!Array.isArray(policy.priority)||policy.priority.length!==LAYER_ONE_GROUPS.length||
    new Set(policy.priority).size!==LAYER_ONE_GROUPS.length||
    policy.priority.some(name=>!LAYER_ONE_GROUPS.includes(name)))return "invalid_priority";
 if(has(policy,"luckyNumbers") &&
    JSON.stringify(policy.luckyNumbers)!==JSON.stringify(LAYER_ONE_LUCKY_NUMBERS))
    return "lucky_numbers_fixed";
 return null;
}
const ascending=(s)=>s.length>=2&&[...s].every((ch,i)=>i===0||
 Number(ch)===Number(s[i-1])+1); // no wrapping, #789 is not followed by 0.
export function evaluateAlbumCopyNumberPreview(gatheringBoard,policy){
 const issue=validateLayerOnePolicy(policy);
 if(issue)return blocked(issue);
 const frame=prepareAlbumRarityFrame(gatheringBoard);
 if(frame.status!=="input_ready" && frame.status!=="preview_ready")return blocked(frame.reason||"invalid_frame");
 // Synthetic COPY-BETA-001 is not a numeric copy; never invent a numeric identity.
 const copy=frame.identity.copyNumber;
 if(!/^[1-9][0-9]*$/.test(copy)||!Number.isSafeInteger(Number(copy)))
   return blocked("numeric_copy_required");
 const n=Number(copy), s=String(copy), matches=[];
 if(n<=policy.firstIssueEnd)matches.push("first_issue");
 if(policy.milestones.includes(n))matches.push("milestone");
 if(s.length>=policy.minRepeatLength&&[...s].every(ch=>ch===s[0]))matches.push("repeating");
 if(s.length>=policy.minSequenceLength&&ascending(s))matches.push("sequential");
 if(policy.roundNumbers.includes(n))matches.push("round_number");
 if(LAYER_ONE_LUCKY_NUMBERS.includes(n))matches.push("lucky_clover");
 if(s.length>=policy.minPalindromeLength&&s===s.split("").reverse().join(""))matches.push("palindrome");
 const primaryGroup=policy.priority.find(group=>matches.includes(group))??"standard";
 return freezeResult({
  ok:true,stage:"design_preview",evaluatorVersion:LAYER_ONE_EVALUATOR_VERSION,
  policyVersion:policy.version,identity:frame.identity,
  qualifyingGroups:Object.freeze([...matches]),
  primaryGroup,
  primaryTitle:primaryGroup==="standard"?"Standard Edition":title[primaryGroup],
  assigned:false,finalized:false,persisted:false,stamp:null,
 });
}
