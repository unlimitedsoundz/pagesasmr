export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  const profiles = db.getProfiles();
  return NextResponse.json(
    {
      user,
      availablePersonas: profiles.map((p) => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        role: p.role,
        country: p.country,
      })),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
