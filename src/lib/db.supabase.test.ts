import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db';
import { supabaseAdmin } from './supabase';

const originalFrom = supabaseAdmin.from.bind(supabaseAdmin);

test('createProfileAsync persists all required profile fields to Supabase', async () => {
  const calls: any[] = [];
  supabaseAdmin.from = ((table: string) => {
    const call: any = {
      table,
      upsert: async (payload: any, options?: any) => {
        calls.push({ table, payload, options });
        return { data: payload, error: null };
      },
      insert: async (payload: any) => {
        calls.push({ table, payload, operation: 'insert' });
        return { data: payload, error: null };
      },
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      select: () => ({
        eq: async () => ({ data: [], error: null }),
        or: async () => ({ data: [], error: null }),
      }),
    };
    return call;
  }) as any;

  const profile = await db.createProfileAsync({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'pinkroom.test.creator@example.com',
    display_name: 'Test Creator',
    role: 'CREATOR',
    country: 'Nigeria',
    preferred_category: 'PAGE_TURNING',
    is_adult_confirmed: true,
    sample_status: 'NOT_SUBMITTED',
    password: 'secret123',
    created_at: new Date().toISOString(),
  });

  assert.ok(profile.id);
  const profileUpsert = calls.find((call) => call.table === 'profiles');
  assert.ok(profileUpsert, 'expected profiles upsert call');
  assert.equal(profileUpsert.payload.email, 'pinkroom.test.creator@example.com');
  assert.equal(profileUpsert.payload.preferred_category, 'PAGE_TURNING');
  assert.equal(profileUpsert.payload.sample_status, 'NOT_SUBMITTED');
  assert.equal(profileUpsert.payload.is_adult_confirmed, true);
  assert.equal(profileUpsert.payload.country, 'Nigeria');
});

test('createSubmission persists page-turning submission to Supabase with platform info', async () => {
  const calls: any[] = [];
  supabaseAdmin.from = ((table: string) => {
    const call: any = {
      table,
      upsert: async (payload: any, options?: any) => {
        calls.push({ table, payload, options });
        return { data: payload, error: null };
      },
      insert: async (payload: any) => {
        calls.push({ table, payload, operation: 'insert' });
        return { data: payload, error: null };
      },
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      select: () => ({
        eq: async () => ({ data: [], error: null }),
        or: async () => ({ data: [], error: null }),
      }),
    };
    return call;
  }) as any;

  const creatorId = '22222222-2222-4222-8222-222222222222';
  db.createProfileAsync({
    id: creatorId,
    email: 'pinkroom.test.creator2@example.com',
    display_name: 'Test Creator 2',
    role: 'CREATOR',
    country: 'Nigeria',
    preferred_category: 'PAGE_TURNING',
    is_adult_confirmed: true,
    sample_status: 'APPROVED',
    created_at: new Date().toISOString(),
  });

  const submission = db.createSubmission({
    creator_id: creatorId,
    creator_name: 'Test Creator 2',
    creator_email: 'pinkroom.test.creator2@example.com',
    title: 'Page-turning upload test',
    category: 'PAGE_TURNING',
    duration_seconds: 190,
    file_url: '/api/videos/test.mp4',
    file_name: 'test.mp4',
    file_size_bytes: 1500000,
    notes: 'Example submission',
    is_sample: false,
  });

  assert.equal(submission.platform_id, 'pinkroom_pages');
  const submissionUpsert = calls.find((call) => call.table === 'submissions');
  assert.ok(submissionUpsert, 'expected submissions upsert call');
  assert.equal(submissionUpsert.payload.platform_id, 'pinkroom_pages');
  assert.equal(submissionUpsert.payload.creator_id, creatorId);
  assert.equal(submissionUpsert.payload.category, 'PAGE_TURNING');
});

process.on('exit', () => {
  supabaseAdmin.from = originalFrom;
});
