const token = 'sbp_fccf0a010ac4bee3c039733822e44497a81ae5e8';
const ref = 'ydymhzdoptmpblmejcjs';

async function checkPolicies() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;"
    })
  });
  const data = await res.json();
  console.log('Current RLS policies in Supabase:', JSON.stringify(data, null, 2));
}

checkPolicies().catch(console.error);
