import { db } from '../src/lib/db';
import { Profile } from '../src/types';

async function runTest() {
  console.log('--- Starting Payout Refund Verification ---');

  const adminUser: Profile = {
    id: '694d15ea-ff2c-43ff-967d-80b7817534a8',
    email: 'unlymitedsoundz@gmail.com',
    display_name: 'Studio Admin',
    role: 'ADMIN',
    country: 'Nigeria',
    preferred_category: 'BOTH',
    is_adult_confirmed: true,
    created_at: new Date().toISOString(),
  };

  // 1. Pick a creator
  const creator = db.getProfiles().find((p) => p.role === 'CREATOR');
  if (!creator) {
    throw new Error('No creator found in database.');
  }
  console.log(`Using creator: ${creator.display_name} (${creator.id})`);

  // Cleanup any lingering previous test payout if needed
  const lingeringIdx = (db as any).data.payout_requests.findIndex((p: any) => p.payment_destination === 'test-creator@wise.me');
  if (lingeringIdx !== -1) {
    const lingering = (db as any).data.payout_requests[lingeringIdx];
    for (const sId of lingering.submission_ids) {
      const s = db.getSubmissionById(sId);
      if (s) { s.payout_status = 'UNPAID'; s.payout_id = undefined; }
    }
    (db as any).data.payout_requests.splice(lingeringIdx, 1);
    (db as any).data.earnings_ledger = (db as any).data.earnings_ledger.filter((l: any) => l.payout_id !== lingering.id);
    (db as any).save();
  }

  // Ensure creator has at least 8 approved submissions
  const existingSubs = db.getSubmissions({ creatorId: creator.id });
  const approvedSubs = existingSubs.filter((s) => s.status === 'APPROVED' && !s.is_sample);

  const needed = Math.max(0, 8 - approvedSubs.length);
  const createdSubIds: string[] = [];

  for (let i = 0; i < needed; i++) {
    const sub = db.createSubmission({
      creator_id: creator.id,
      title: `Test Video For Refund ${Date.now()}_${i}`,
      file_url: 'https://example.com/test.mp4',
      duration_seconds: 200,
      file_name: `test_${i}.mp4`,
      category: 'PAGE_TURNING',
      version_number: 1,
      is_sample: false,
    } as any);
    createdSubIds.push(sub.id);
  }

  // Get 8 eligible unpaid submissions
  const allEligible = db.getSubmissions({ creatorId: creator.id }).filter((s) => s.status === 'APPROVED' && !s.is_sample && s.payout_status === 'UNPAID');
  if (allEligible.length < 8) {
    throw new Error(`Insufficient eligible submissions: found ${allEligible.length}`);
  }

  // Record balance before payout request
  const statsBefore = db.getCreatorStats(creator.id);
  console.log(`Available balance before request: $${statsBefore.availablePayoutBalance}`);

  // 2. Request Payout
  const payout = db.requestPayout(creator.id, 'WISE', 'test-creator@wise.me');
  console.log(`Created payout request #${payout.id}, status: ${payout.status}`);
  const actualSubIds = payout.submission_ids;

  // Verify submissions are now RESERVED
  for (const id of actualSubIds) {
    const sub = db.getSubmissionById(id);
    if (sub?.payout_status !== 'RESERVED') {
      throw new Error(`Expected submission ${id} to be RESERVED, got ${sub?.payout_status}`);
    }
  }

  // 3. Confirm Payout Paid
  const paidPayout = db.confirmPayoutPaid(payout.id, 'BANK-TEST-REF-998877', adminUser);
  console.log(`Confirmed payout #${paidPayout.id} as PAID, reference: ${paidPayout.payment_reference}`);

  // Verify submissions are now PAID
  for (const id of actualSubIds) {
    const sub = db.getSubmissionById(id);
    if (sub?.payout_status !== 'PAID') {
      throw new Error(`Expected submission ${id} to be PAID, got ${sub?.payout_status}`);
    }
  }

  const statsPaid = db.getCreatorStats(creator.id);
  console.log(`Total paid out for creator: $${statsPaid.totalPaid}`);

  // 4. Test validation: cannot refund without reason
  try {
    db.refundPayout(payout.id, '', adminUser);
    throw new Error('Should have failed when refunding without reason');
  } catch (err: any) {
    console.log(`Expected validation passed: "${err.message}"`);
  }

  // 5. Refund the completed payout
  const refundReason = 'Bank wire bounced back; beneficiary account routing was incorrect.';
  const refundedPayout = db.refundPayout(payout.id, refundReason, adminUser);
  console.log(`Refunded payout #${refundedPayout.id}, status: ${refundedPayout.status}, reason: ${refundedPayout.failure_reason}`);

  if (refundedPayout.status !== 'REFUNDED') {
    throw new Error(`Expected status REFUNDED, got ${refundedPayout.status}`);
  }

  // Verify submissions are reverted to UNPAID and payout_id cleared
  for (const id of actualSubIds) {
    const sub = db.getSubmissionById(id);
    if (sub?.payout_status !== 'UNPAID') {
      throw new Error(`Expected submission ${id} to be reverted to UNPAID, got ${sub?.payout_status}`);
    }
    if (sub?.payout_id) {
      throw new Error(`Expected submission ${id} payout_id to be cleared, got ${sub?.payout_id}`);
    }
  }
  console.log(`Verified all ${actualSubIds.length} submissions restored to UNPAID!`);

  // Verify stats: available balance restored
  const statsAfterRefund = db.getCreatorStats(creator.id);
  console.log(`Available balance after refund: $${statsAfterRefund.availablePayoutBalance}`);

  if (statsAfterRefund.availablePayoutBalance < statsPaid.availablePayoutBalance + payout.amount_usd) {
    throw new Error(`Expected available balance to increase by $${payout.amount_usd}`);
  }

  // Verify earnings ledger has RELEASED entry
  const ledger = db.getEarningsLedger(creator.id);
  const releaseEntry = ledger.find((l) => l.payout_id === payout.id && l.type === 'RELEASED');
  if (!releaseEntry) {
    throw new Error('Expected RELEASED entry in ledger for refunded payout');
  }
  console.log(`Verified ledger entry: ${releaseEntry.description} (+$${releaseEntry.amount_usd})`);

  // Verify notification was generated
  const notifs = db.getNotifications(creator.id);
  const refundNotif = notifs.find((n) => n.title.includes('Refunded'));
  if (!refundNotif) {
    throw new Error('Expected refund notification for creator');
  }
  console.log(`Verified creator notification: "${refundNotif.title}" - "${refundNotif.message}"`);

  // Clean up test created submissions if any
  for (const id of createdSubIds) {
    const idx = (db as any).data.submissions.findIndex((s: any) => s.id === id);
    if (idx !== -1) (db as any).data.submissions.splice(idx, 1);
  }
  // Clean up test payout and ledger entries
  const pIdx = (db as any).data.payout_requests.findIndex((p: any) => p.id === payout.id);
  if (pIdx !== -1) (db as any).data.payout_requests.splice(pIdx, 1);
  (db as any).data.earnings_ledger = (db as any).data.earnings_ledger.filter((l: any) => l.payout_id !== payout.id);
  (db as any).save();

  console.log('--- All Payout Refund Tests Passed Successfully! ---');
}

runTest().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
