import fs from 'fs';
import path from 'path';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'The Pink Room <notifications@pinkroom.online>';

async function main() {
  console.log('1. Checking Supabase project secrets & functions...');
  
  // Set secrets
  const secretsRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      { name: 'RESEND_API_KEY', value: RESEND_API_KEY },
      { name: 'RESEND_FROM_EMAIL', value: RESEND_FROM_EMAIL },
      { name: 'ADMIN_NOTIFICATION_EMAIL', value: 'unlymitedsoundz@gmail.com' },
    ]),
  });

  console.log('Secrets set status:', secretsRes.status);
  if (!secretsRes.ok) {
    const err = await secretsRes.text();
    console.warn('Secrets set error:', err);
  } else {
    console.log('Secrets set successfully on project:', PROJECT_REF);
  }

  // Check existing functions
  const listRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}` },
  });
  console.log('List functions status:', listRes.status);
  const functions = await listRes.json();
  console.log('Existing functions:', functions);
}

main().catch(console.error);
