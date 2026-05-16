drop index if exists offers_chain_external_offer_idx;

create unique index if not exists offers_chain_external_offer_idx
  on offers (chain_id, external_offer_id);
