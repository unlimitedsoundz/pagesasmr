import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ydymhzdoptmpblmejcjs.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeW1oemRvcHRtcGJsbWVqY2pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc3ODg1OSwiZXhwIjoyMTA0MzU0ODU5fQ.3PftOAibqREafTOqQqXLuF510J04DW4Sip1wjy8bJyQ';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

async function main() {
  console.log('--- Cleaning Up Test Creators and Test Submissions ---');

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw);

  // 1. Identify test creators
  const testCreatorIds = new Set<string>();
  const keptProfiles = db.profiles.filter((p: any) => {
    const isTest =
      p.email?.toLowerCase().includes('test_amara') ||
      p.email?.toLowerCase().includes('@example.com') ||
      (p.display_name && p.display_name.toLowerCase().includes('amara test'));
    if (isTest) {
      testCreatorIds.add(p.id);
      console.log(`Identified test creator: ${p.display_name} (${p.email}, id: ${p.id})`);
      return false;
    }
    return true;
  });

  // 2. Identify test submissions
  const testSubmissionIds = new Set<string>();
  const keptSubmissions = db.submissions.filter((s: any) => {
    const isTest =
      s.title?.startsWith('Test Video For Refund') ||
      s.title === '15a2a4bbd25e22437e5bc592634bb6bc' ||
      testCreatorIds.has(s.creator_id);
    if (isTest) {
      testSubmissionIds.add(s.id);
      console.log(`Identified test submission: "${s.title}" (id: ${s.id})`);
      return false;
    }
    return true;
  });

  console.log(`\nKept ${keptProfiles.length} profiles, removed ${testCreatorIds.size} test creator(s).`);
  console.log(`Kept ${keptSubmissions.length} submissions, removed ${testSubmissionIds.size} test submission(s).`);

  // 3. Clean test payouts
  const keptPayouts = (db.payout_requests || []).filter((pay: any) => {
    const hasTestSubmissions = (pay.submission_ids || []).some((sid: string) => testSubmissionIds.has(sid));
    const isTestCreator = testCreatorIds.has(pay.creator_id);
    const isTestDestination = pay.payment_destination === 'test-creator@wise.me';
    if (hasTestSubmissions || isTestCreator || isTestDestination) {
      console.log(`Identified test payout: ${pay.id} ($${pay.amount_usd}, ${pay.status}, dest: ${pay.payment_destination})`);
      return false;
    }
    return true;
  });

  const removedPayoutIds = new Set(
    (db.payout_requests || [])
      .filter((p: any) => !keptPayouts.some((kp: any) => kp.id === p.id))
      .map((p: any) => p.id)
  );

  // 4. Clean test ledger entries
  const keptLedger = (db.earnings_ledger || []).filter((entry: any) => {
    const isRemovedPayout = entry.payout_id && removedPayoutIds.has(entry.payout_id);
    const isTestCreator = testCreatorIds.has(entry.creator_id);
    if (isRemovedPayout || isTestCreator) {
      console.log(`Identified test ledger entry: ${entry.id} ($${entry.amount_usd}, ${entry.type})`);
      return false;
    }
    return true;
  });

  // 5. Clean test notifications
  const keptNotifications = (db.notifications || []).filter((notif: any) => {
    if (testCreatorIds.has(notif.user_id)) return false;
    if (notif.meta?.submissionId && testSubmissionIds.has(notif.meta.submissionId)) return false;
    if (notif.meta?.payoutId && removedPayoutIds.has(notif.meta.payoutId)) return false;
    if (notif.title?.includes('Test Video For Refund')) return false;
    return true;
  });

  // 6. Clean test submission versions
  const keptVersions = (db.submission_versions || []).filter((v: any) => {
    return !testSubmissionIds.has(v.submission_id);
  });

  // Write updated data/database.json
  db.profiles = keptProfiles;
  db.submissions = keptSubmissions;
  db.payout_requests = keptPayouts;
  db.earnings_ledger = keptLedger;
  db.notifications = keptNotifications;
  db.submission_versions = keptVersions;

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log('\nUpdated data/database.json successfully.');

  // Also clean Supabase if records exist there
  try {
    // 1. Delete test earnings ledger entries first to satisfy foreign key constraint
    if (testSubmissionIds.size > 0 || removedPayoutIds.size > 0) {
      const sids = Array.from(testSubmissionIds);
      const pids = Array.from(removedPayoutIds);
      
      console.log('Cleaning test entries from Supabase earnings_ledger...');
      if (sids.length > 0) {
        const { error: leErr1 } = await supabaseAdmin
          .from('earnings_ledger')
          .delete()
          .in('submission_id', sids);
        if (leErr1) console.warn('Supabase earnings_ledger delete by submission_id warning:', leErr1.message);
        else console.log('Deleted test submission entries from Supabase earnings_ledger.');
      }

      // Also remove any remaining test ledger records (e.g. from test-payout-refund or test disbursements)
      const { error: leErr2 } = await supabaseAdmin
        .from('earnings_ledger')
        .delete()
        .or('description.ilike.%Test Video For Refund%,description.ilike.%15a2a4bbd25e22437e5bc592634bb6bc%,description.ilike.%BANK-TEST-REF-998877%,description.ilike.%BANK-APP-MTSHL5Q4%');
      if (leErr2) console.warn('Supabase earnings_ledger delete test records warning:', leErr2.message);
      else console.log('Cleaned test entries from Supabase earnings_ledger.');
    }

    if (testSubmissionIds.size > 0) {
      const sids = Array.from(testSubmissionIds);
      const { error } = await supabaseAdmin.from('submissions').delete().in('id', sids);
      if (error) console.warn('Supabase submissions delete warning:', error.message);
      else console.log(`Deleted ${sids.length} test submission(s) from Supabase.`);
    }

    if (removedPayoutIds.size > 0) {
      const pids = Array.from(removedPayoutIds);
      const { error } = await supabaseAdmin.from('payout_requests').delete().in('id', pids);
      if (error) console.warn('Supabase payout_requests delete warning:', error.message);
      else console.log(`Deleted ${pids.length} test payout(s) from Supabase.`);
    }

    if (testCreatorIds.size > 0) {
      const ids = Array.from(testCreatorIds);
      const { error } = await supabaseAdmin.from('profiles').delete().in('id', ids);
      if (error) console.warn('Supabase profiles delete warning:', error.message);
      else console.log(`Deleted ${ids.length} test profile(s) from Supabase.`);
    }
  } catch (err: any) {
    console.warn('Supabase cleanup non-critical error:', err.message);
  }

  console.log('\n--- Final Summary ---');
  console.log('Active Creators count:', db.profiles.length);
  console.log('Active Submissions count:', db.submissions.length);
  console.log('Active Payouts count:', db.payout_requests.length);
  console.log('Submissions remaining:');
  db.submissions.forEach((s: any) => {
    console.log(` - [${s.status}] "${s.title}" (creator: ${s.creator_id})`);
  });
}

main().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
