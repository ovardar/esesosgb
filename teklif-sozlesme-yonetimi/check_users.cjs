const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: admins } = await supabase.from('super_admins').select('*');
  console.log('Super Admins:', JSON.stringify(admins, null, 2));

  const { data: users } = await supabase.from('tenant_users').select('*');
  console.log('Tenant Users:', JSON.stringify(users, null, 2));
}

main();
