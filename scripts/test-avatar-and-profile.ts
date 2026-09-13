import fs from 'fs';
import path from 'path';

async function testAvatarAndProfile() {
  console.log('--- Testing Profile Settings and Avatar Upload Endpoints ---');

  // Step 1: Sign in or set session cookie for creator Elena
  // Cookie: asmr_session_user=creator-elena-002
  const cookie = 'asmr_session_user=creator-elena-002';

  // Step 2: Test GET /api/creator/profile
  console.log('1. Fetching current profile via GET /api/creator/profile...');
  const getRes = await fetch('http://localhost:3000/api/creator/profile', {
    headers: { Cookie: cookie },
  });
  console.log('GET profile status:', getRes.status);
  const getData = await getRes.json();
  console.log('Current profile display name:', getData.profile?.display_name, 'Country:', getData.profile?.country);

  // Step 3: Test PATCH /api/creator/profile with bio and country
  console.log('2. Updating profile bio, country, and alias via PATCH /api/creator/profile...');
  const patchRes = await fetch('http://localhost:3000/api/creator/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      displayName: 'Elena Rostova (Master ASMRtist)',
      country: 'Canada',
      bio: 'Pioneer of high-fidelity binaural thigh-flapping ASMR. Equipped with dual 3Dio Free Space binaural mics and custom sound-treated studio.',
      preferredCategory: 'THIGH_FLAPPING_AND_GUM_CHEWING',
    }),
  });
  console.log('PATCH profile status:', patchRes.status);
  const patchData = await patchRes.json();
  console.log('Updated profile display name:', patchData.profile?.display_name);
  console.log('Updated bio:', patchData.profile?.bio);

  // Step 4: Test POST /api/creator/avatar with a sample PNG image
  console.log('3. Uploading avatar image via POST /api/creator/avatar...');
  // Create a minimal 1x1 transparent PNG buffer
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  const formData = new FormData();
  const blob = new Blob([pngHeader], { type: 'image/png' });
  formData.append('avatar', blob, 'test_avatar.png');

  const uploadRes = await fetch('http://localhost:3000/api/creator/avatar', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: formData,
  });

  console.log('Upload avatar status:', uploadRes.status);
  const uploadData = await uploadRes.json();
  console.log('Avatar upload response:', uploadData);

  if (uploadData.avatarUrl) {
    // Step 5: Test GET /api/avatars/[filename]
    console.log('4. Verifying streaming of uploaded avatar...');
    const streamRes = await fetch(`http://localhost:3000${uploadData.avatarUrl}`);
    console.log('Stream avatar status:', streamRes.status, 'Content-Type:', streamRes.headers.get('content-type'));
    const streamBytes = await streamRes.arrayBuffer();
    console.log('Streamed byte count:', streamBytes.byteLength);
  }

  console.log('--- Avatar and Profile Settings Verification COMPLETE ---');
}

testAvatarAndProfile().catch(console.error);
