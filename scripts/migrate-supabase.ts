import fs from 'fs';
import path from 'path';

const projectRef = 'ydymhzdoptmpblmejcjs';
const accessToken = 'sbp_fccf0a010ac4bee3c039733822e44497a81ae5e8';

async function runMigration() {
  console.log('Connecting to Supabase Management API...');

  const migrationFile = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(migrationFile, 'utf-8');

  console.log(`Executing SQL migration on project ${projectRef}...`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await res.text();
  console.log(`Response Status: ${res.status}`);

  if (!res.ok) {
    console.error('Migration error response:', body);
    process.exit(1);
  }

  console.log('Migration executed successfully on Supabase PostgreSQL!');
  console.log('Tables, constraints, foreign keys, RLS policies, and platform settings are now live.');
}

runMigration().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
