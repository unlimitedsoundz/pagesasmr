const token = 'sbp_fccf0a010ac4bee3c039733822e44497a81ae5e8';
const ref = 'ydymhzdoptmpblmejcjs';

async function checkTables() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    })
  });
  const data = await res.json();
  console.log('Tables in Supabase public schema:', data);
}

checkTables().catch(console.error);
