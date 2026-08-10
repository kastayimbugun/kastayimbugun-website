const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS favicon_image text;
`;

supabase.from('site_settings').select('id').maybeSingle().then(async ({ error: e }) => {
  if (e) { console.error('Connection error:', e.message); return; }

  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (res.ok) {
    console.log('✅ Favicon migration applied!');
  } else {
    console.log('SQL to run in Supabase SQL Editor:');
    console.log(sql);
  }
});
