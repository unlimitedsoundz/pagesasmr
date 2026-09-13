import { db, ensureUuid } from '../src/lib/db';

async function testReferralSystem() {
  console.log('====================================================');
  console.log('--- TESTING $35 REFERRAL LINK SYSTEM END-TO-END ---');
  console.log('====================================================\n');

  // 1. Create test referrer profile
  const referrerEmail = `sarah.jenkins.${Date.now()}@gmail.com`;
  const referrer = await db.createProfileAsync({
    id: ensureUuid(),
    email: referrerEmail,
    display_name: 'Sarah Jenkins',
    role: 'CREATOR',
    country: 'United States',
    date_of_birth: '1995-01-01',
    password: 'password123',
    preferred_category: 'THIGH_FLAPPING_AND_GUM_CHEWING',
    is_adult_confirmed: true,
    sample_status: 'APPROVED',
  });

  const referralCode = db.getReferralCodeForProfile(referrer.id);
  console.log(`1. Created Referrer Creator: ${referrer.display_name} (${referrer.id})`);
  console.log(`   Generated Referral Code: ${referralCode}`);

  // 2. Create referred user profile using referral code
  const referredEmail = `jennifer.adams.${Date.now()}@gmail.com`;
  const referredUser = await db.createProfileAsync({
    id: ensureUuid(),
    email: referredEmail,
    display_name: 'Jennifer Adams',
    role: 'CREATOR',
    country: 'Nigeria',
    date_of_birth: '2000-05-15',
    password: 'password123',
    preferred_category: 'THIGH_FLAPPING_AND_GUM_CHEWING',
    is_adult_confirmed: true,
    sample_status: 'NOT_SUBMITTED',
    referred_by_id: referrer.id,
  });

  const referral = db.createReferral(referrer.id, referredUser.id);
  console.log(`\n2. Registered Referred Creator: ${referredUser.display_name} (${referredUser.id})`);
  console.log(`   Bound to Referrer ID: ${referral.referrer_id}`);
  console.log(`   Initial Referral Status: ${referral.reward_status} (Reward: $${referral.reward_amount_usd})`);

  // Assert initial state is PENDING
  if (referral.reward_status !== 'PENDING') {
    throw new Error(`Assertion failed: expected PENDING status, got ${referral.reward_status}`);
  }

  // 3. Pass Audition Sample for Referred Creator
  referredUser.sample_status = 'APPROVED';
  db.updateProfile(referredUser.id, { sample_status: 'APPROVED' });
  db.checkAndUpdateReferralMilestone(referredUser.id);

  const refAfterAudition = db.getReferralsByReferrer(referrer.id).find((r) => r.referred_user_id === referredUser.id);
  console.log(`\n3. Audition Sample Approved for Referred Creator.`);
  console.log(`   Audition Gate Passed: ${refAfterAudition?.audition_passed}`);
  console.log(`   Referral Reward Status: ${refAfterAudition?.reward_status} (Milestone reached: ${refAfterAudition?.milestone_reached})`);

  if (refAfterAudition?.reward_status !== 'PENDING') {
    throw new Error('Assertion failed: Audition alone should NOT unlock $35 reward until 8 videos milestone is reached.');
  }

  // 4. Create 7 approved production videos
  console.log(`\n4. Simulating 7 approved production video submissions...`);
  const adminUser = db.getProfiles('ADMIN')[0];

  for (let i = 1; i <= 7; i++) {
    const sub = db.createSubmission({
      creator_id: referredUser.id,
      creator_name: referredUser.display_name,
      creator_email: referredUser.email,
      title: `Test Production Video #${i}`,
      category: 'THIGH_FLAPPING_AND_GUM_CHEWING',
      duration_seconds: 200,
      file_url: `/api/videos/test-video-${i}.mp4/stream`,
      file_name: `test-video-${i}.mp4`,
      file_size_bytes: 10000000,
      status: 'SUBMITTED',
      is_sample: false,
      version_number: 1,
    });

    db.approveSubmission(sub.id, adminUser);
  }

  const refAfter7 = db.getReferralsByReferrer(referrer.id).find((r) => r.referred_user_id === referredUser.id);
  console.log(`   Approved Videos Count: ${refAfter7?.videos_completed_count} / 8`);
  console.log(`   Referral Reward Status: ${refAfter7?.reward_status}`);

  if (refAfter7?.reward_status !== 'PENDING') {
    throw new Error('Assertion failed: 7 videos should NOT trigger $35 reward. Requires 8 videos milestone!');
  }

  // 5. Create 8th approved video -> MUST TRIGGER $35 REWARD!
  console.log(`\n5. Submitting 8th approved video (Milestone Trigger)...`);
  const sub8 = db.createSubmission({
    creator_id: referredUser.id,
    creator_name: referredUser.display_name,
    creator_email: referredUser.email,
    title: `Test Production Video #8 (Milestone Trigger)`,
    category: 'THIGH_FLAPPING_AND_GUM_CHEWING',
    duration_seconds: 210,
    file_url: `/api/videos/test-video-8.mp4/stream`,
    file_name: `test-video-8.mp4`,
    file_size_bytes: 12000000,
    status: 'SUBMITTED',
    is_sample: false,
    version_number: 1,
  });

  db.approveSubmission(sub8.id, adminUser);

  const refAfter8 = db.getReferralsByReferrer(referrer.id).find((r) => r.referred_user_id === referredUser.id);
  console.log(`   Approved Videos Count: ${refAfter8?.videos_completed_count} / 8`);
  console.log(`   Referral Reward Status: ${refAfter8?.reward_status} (Milestone Reached: ${refAfter8?.milestone_reached})`);

  if (refAfter8?.reward_status !== 'REWARDED' || !refAfter8?.milestone_reached) {
    throw new Error('Assertion failed: 8th approved video MUST trigger REWARDED milestone status!');
  }

  // Verify Referrer's Earnings Ledger has +$35.00 CREDIT
  const ledger = db.getLedgerEntries().filter((l) => l.creator_id === referrer.id);
  const referralCredit = ledger.find((l) => l.amount_usd === 35.0 && l.type === 'CREDIT');
  console.log(`   Referrer Ledger Entries Count: ${ledger.length}`);
  console.log(`   $35 Referral Credit Entry Found: ${Boolean(referralCredit)} ("${referralCredit?.description}")`);

  if (!referralCredit) {
    throw new Error('Assertion failed: $35.00 Referral Credit Entry was not found in referrer ledger!');
  }

  // 6. Idempotency Check: Approving 9th video
  console.log(`\n6. Idempotency Check: Approving 9th video...`);
  const sub9 = db.createSubmission({
    creator_id: referredUser.id,
    creator_name: referredUser.display_name,
    creator_email: referredUser.email,
    title: `Test Production Video #9`,
    category: 'THIGH_FLAPPING_AND_GUM_CHEWING',
    duration_seconds: 195,
    file_url: `/api/videos/test-video-9.mp4/stream`,
    file_name: `test-video-9.mp4`,
    file_size_bytes: 11000000,
    status: 'SUBMITTED',
    is_sample: false,
    version_number: 1,
  });

  db.approveSubmission(sub9.id, adminUser);

  const referralCreditsCount = db.getLedgerEntries().filter((l) => l.creator_id === referrer.id && l.amount_usd === 35.0).length;
  console.log(`   Referral $35 Credits Count: ${referralCreditsCount} (Expected: 1)`);

  if (referralCreditsCount !== 1) {
    throw new Error(`Idempotency failure: expected exactly 1 referral credit entry, found ${referralCreditsCount}`);
  }

  // Cleanup test profiles
  await db.removeCreatorById(referrer.id);
  await db.removeCreatorById(referredUser.id);

  console.log('\n====================================================');
  console.log(' SUCCESS: ALL REFERRAL SYSTEM ASSERTS PASSED PERFECTLY!');
  console.log('====================================================');
}

testReferralSystem().catch((err) => {
  console.error('\nREFERRAL FLOW TEST ERROR:', err);
  process.exit(1);
});
