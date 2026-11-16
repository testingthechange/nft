#!/usr/bin/env node
// AJINE-only, additive Directus schema installer. Node 18+.
const BASE = 'https://directus-on-nft.onrender.com';
const token = process.env.AJINE_DIRECTUS_TOKEN;
const apply = process.argv.includes('--apply');
if (!token) { console.error('Set AJINE_DIRECTUS_TOKEN locally; never commit it.'); process.exit(1); }
const definitions = {
  Abum_Registration: [['album_id','string'],['album_copy_number','string'],['registration_id','string'],['registered_owner_id','string'],['purchase_transaction_id','string'],['cc_transaction_reference','string'],['registration_date','timestamp'],['registration_status','string']],
  Rarity_Printer: [['registration_id','string'],['character_name','string'],['rarity_tier','string'],['edition_limit','integer'],['assigned_number','integer'],['assignment_date','timestamp'],['assignment_status','string']],
  NFT_Registry: [['registration_id','string'],['contract_address','string'],['token_id','string'],['polygon_network','string'],['owner_wallet','string'],['mint_status','string'],['transaction_hash','string'],['metadata_url','string'],['mint_confirmation_date','timestamp']],
  Burn_Registry: [['nft_id','string'],['original_album_copy_number','string'],['burn_transaction_hash','string'],['burn_date','timestamp'],['burn_status','string'],['reward_selection','string']],
  Jingle_Collectibles: [['burn_number','string'],['character_design','string'],['rarity','string'],['serial_number','string'],['collectible_image','string'],['current_owner_reference','string'],['issue_date','timestamp'],['verification_status','string']],
  Provenance_Registry: [['collectible_id','string'],['qr_code_reference','string'],['album_id','string'],['album_copy_number','string'],['nft_reference','string'],['burn_reference','string'],['jingle_reference','string'],['authenticity_status','string'],['public_product_data_sheet','json'],['last_verified_date','timestamp']],
  Commerce_Listings: [['collectible_id','string'],['seller_id','string'],['asking_price','decimal'],['currency','string'],['listing_images','json'],['listing_status','string'],['ajine_review_status','string'],['published_date','timestamp']],
  Commerce_Transactions: [['listing_id','string'],['buyer_id','string'],['seller_id','string'],['sale_price','decimal'],['buyer_premium','decimal'],['payment_status','string'],['ownership_transfer_status','string'],['completion_date','timestamp']],
  Owners_Accounts: [['display_name','string'],['email','string'],['wallet_address','string'],['account_status','string'],['verification_status','string']],
  Integration_Events: [['registration_id','string'],['source_system','string'],['event_type','string'],['payload_reference','string'],['processing_status','string'],['retry_count','integer'],['created_date','timestamp'],['completed_date','timestamp']]
};
async function api(path, method='GET', body) {
  const res = await fetch(BASE + path, { method, headers: {Authorization: 'Bearer ' + token, 'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined });
  const raw = await res.text(); let parsed; try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  if (!res.ok) throw new Error(method + ' ' + path + ' returned ' + res.status + ': ' + JSON.stringify(parsed.errors || raw).slice(0,400));
  return parsed.data;
}
async function main() {
  const me = await api('/users/me?fields=id,role');
  if (!me?.id) throw new Error('Token did not authenticate.');
  const existing = new Set((await api('/collections')).map(x => x.collection));
  console.log('Target:', BASE, '| Mode:', apply ? 'APPLY' : 'DRY RUN');
  for (const [collection, fields] of Object.entries(definitions)) {
    if (!existing.has(collection)) {
      console.log('+ collection', collection);
      if (apply) await api('/collections','POST',{collection, schema:{}, meta:{note:'AJINE NFT schema installer'}});
    }
    const present = existing.has(collection) ? new Set((await api('/fields/' + encodeURIComponent(collection))).map(f => f.field)) : new Set(['id']);
    for (const [field,type] of fields) {
      if (present.has(field)) continue;
      console.log('  + field', field, type);
      if (apply) await api('/fields/' + encodeURIComponent(collection),'POST',{field,type,meta:{interface:type==='timestamp'?'datetime':type==='json'?'input-code':'input'}});
    }
  }
  console.log(apply ? 'Completed additive field installation. Review relationships, constraints and permissions separately.' : 'Dry run complete. Re-run with --apply to install.');
}
main().catch(e => { console.error(e.message); process.exit(1); });
