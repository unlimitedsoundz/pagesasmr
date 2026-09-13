import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ydymhzdoptmpblmejcjs.supabase.co';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeW1oemRvcHRtcGJsbWVqY2pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc3ODg1OSwiZXhwIjoyMTA0MzU0ODU5fQ.3PftOAibqREafTOqQqXLuF510J04DW4Sip1wjy8bJyQ';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

async function cleanupReferralTestCreators() {
  console.log('====================================================');
  console.log('--- CLEANING UP REFERRAL LINK TEST CREATORS & DATA ---');
  console.log('====================================================\n');

  if (!fs.existsSync(DB_PATH)) {
    console.error('database.json not found!');
    return;
  }

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw);

  const testEmailPatterns = [
    'sarah.jenkins',
    'jennifer.adams',
    'referred_user_',
    'referrer_test_',
  ];

  const testNamePatterns = [
    'sarah jenkins',
    'jennifer adams',
    'test referrer creator',
    'referred new creator',
  ];

  const testCreatorIds = new Set<string>();

  const keptProfiles = (db.profiles || []).filter((p: any) => {
    const emailMatch = p.email && testEmailPatterns.some((pattern) => p.email.toLowerCase().includes(pattern));
    const nameMatch = p.display_name && testNamePatterns.some((pattern) => p.display_name.toLowerCase().includes(pattern));

    if (emailMatch || nameMatch) {
      testCreatorIds.add(p.id);
      console.log(`[REMOVING] Test Creator Profile: "${p.display_name}" <${p.email}> (ID: ${p.id})`);
      return false;
    }
    return true;
  });

  console.log(`\nFound ${testCreatorIds.size} referral test creator profile(s) to remove.\n`);

  if (testCreatorIds.size === 0) {
    console.log('No referral test creator profiles found. Data is already clean.');
    return;
  }

  const testCreatorIdArray = Array.from(testCreatorIds);

  // Filter referrals
  const keptReferrals = (db.referrals || []).filter((r: any) => {
    const isTest = testCreatorIds.has(r.referrer_id) || testCreatorIds.has(r.referred_user_id);
    if (isTest) {
      console.log(`[REMOVING] Referral entry: ${r.id} (Referrer: ${r.referrer_id}, Referred: ${r.referred_user_id})`);
      return false;
    }
    return true;
  });

  // Filter submissions
  const testSubmissionIds = new Set<string>();
  const keptSubmissions = (db.submissions || []).filter((s: any) => {
    const isTest = testCreatorIds.has(s.creator_id) || (s.title && s.title.includes('Test Production Video'));
    if (isTest) {
      testSubmissionIds.add(s.id);
      console.log(`[REMOVING] Test Submission: "${s.title}" (ID: ${s.id})`);
      return false;
    }
    return true;
  });

  // Filter submission versions
  const keptVersions = (db.submission_versions || []).filter((v: any) => {
    return !testSubmissionIds.has(v.submission_id);
  });

  // Filter earnings ledger
  const keptLedger = (db.earnings_ledger || []).filter((e: any) => {
    const isTest = testCreatorIds.has(e.creator_id) || (e.submission_id && testSubmissionIds.has(e.submission_id));
    if (isTest) {
      console.log(`[REMOVING] Ledger Entry: ${e.id} ($${e.amount_usd}, ${e.type}, desc: "${e.description}")`);
      return false;
    }
    return true;
  });

  // Filter payouts
  const keptPayouts = (db.payout_requests || []).filter((p: any) => {
    const isTest = testCreatorIds.has(p.creator_id);
    if (isTest) {
      console.log(`[REMOVING] Payout Request: ${p.id} ($${p.amount_usd})`);
      return false;
    }
    return true;
  });

  // Filter notifications
  const keptNotifications = (db.notifications || []).filter((n: any) => {
    const isTest = testCreatorIds.has(n.user_id) || (n.meta?.submissionId && testSubmissionIds.has(n.meta.submissionId));
    if (isTest) {
      console.log(`[REMOVING] Notification: "${n.title}" (ID: ${n.id})`);
      return false;
    }
    return true;
  });

  // Update local DB object
  db.profiles = keptProfiles;
  db.referrals = keptReferrals;
  db.submissions = keptSubmissions;
  db.submission_versions = keptVersions;
  db.earnings_ledger = keptLedger;
  db.payout_requests = keptPayouts;
  db.notifications = keptNotifications;

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log('\n✅ Successfully updated data/database.json');

  // Now clean Supabase tables if connected
  console.log('\nCleaning up Supabase records...');
  try {
    // Delete referrals
    const { error: refErr } = await supabaseAdmin
      .from('referrals')
      .delete()
      .or(`referrer_id.in.(${testCreatorIdArray.join(',')}),referred_user_id.in.(${testCreatorIdArray.join(',')})`);
    if (refErr) console.warn('Supabase referrals delete warning:', refErr.message);
    else console.log('Cleaned referrals from Supabase.');

    // Delete earnings ledger entries
    const { error: elErr } = await supabaseAdmin
      .from('earnings_ledger')
      .delete()
      .in('creator_id', testCreatorIdArray);
    if (elErr) console.warn('Supabase earnings_ledger delete warning:', elErr.message);
    else console.log('Cleaned earnings_ledger from Supabase.');

    // Delete submissions
    if (testSubmissionIds.size > 0) {
      const { error: subErr } = await supabaseAdmin
        .from('submissions')
        .delete()
        .in('id', Array.from(testSubmissionIds));
      if (subErr) console.warn('Supabase submissions delete warning:', subErr.message);
      else console.log('Cleaned submissions from Supabase.');
    }

    // Delete profiles
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .in('id', testCreatorIdArray);
    if (profErr) console.warn('Supabase profiles delete warning:', profErr.message);
    else console.log('Cleaned profiles from Supabase.');
  } catch (err: any) {
    console.warn('Supabase cleanup non-critical error:', err.message);
  }

  console.log('\n====================================================');
  console.log(' CLEANUP COMPLETE! Remaining creator profiles count:', db.profiles.length);
  console.log('====================================================');
}

cleanupReferralTestCreators().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
