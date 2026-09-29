const SUPABASE_URL = "https://fymalafgyoiwjxbkkmta.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_BONoTx6NCnML5GL_GGriGQ_XT2Rb1i2";

window.connectSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
