export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bankCode = (body.bankCode || body.bank_code || '').toString().trim();
    const rawAccount = (body.accountNumber || body.account_number || '').toString().trim();
    const accountNumber = rawAccount.replace(/\D/g, '');

    if (!bankCode) {
      return NextResponse.json({ error: 'Bank code is required' }, { status: 400 });
    }

    if (accountNumber.length !== 10) {
      return NextResponse.json(
        { error: 'Account number must be exactly 10 digits' },
        { status: 400 }
      );
    }

    // 1. Paystack Integration
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecret) {
      try {
        const paystackRes = await fetch(
          `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
            accountNumber
          )}&bank_code=${encodeURIComponent(bankCode)}`,
          {
            headers: {
              Authorization: `Bearer ${paystackSecret}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        );

        const data = await paystackRes.json();
        if (paystackRes.ok && data?.status && data?.data?.account_name) {
          return NextResponse.json({
            success: true,
            accountName: data.data.account_name,
            accountNumber,
            bankCode,
            provider: 'paystack',
          });
        }

        return NextResponse.json(
          {
            error:
              data?.message ||
              'Could not resolve bank account. Please check the account number and bank.',
          },
          { status: 400 }
        );
      } catch (err: any) {
        console.error('Paystack resolve error:', err);
      }
    }

    // 2. Flutterwave Integration
    const flutterwaveSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (flutterwaveSecret) {
      try {
        const flwRes = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${flutterwaveSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_number: accountNumber,
            account_bank: bankCode,
          }),
          cache: 'no-store',
        });

        const data = await flwRes.json();
        if (flwRes.ok && data?.status === 'success' && data?.data?.account_name) {
          return NextResponse.json({
            success: true,
            accountName: data.data.account_name,
            accountNumber,
            bankCode,
            provider: 'flutterwave',
          });
        }

        return NextResponse.json(
          {
            error:
              data?.message ||
              'Could not resolve bank account. Please check the account number and bank.',
          },
          { status: 400 }
        );
      } catch (err: any) {
        console.error('Flutterwave resolve error:', err);
      }
    }

    // 3. Fallback for Local / Sandbox / Dev environment when API keys are not configured yet
    let fallbackName = 'VERIFIED CREATOR ACCOUNT';
    try {
      const user = await requireUser();
      const profile = await db.getProfileByIdAsync(user.id);
      if (profile?.display_name) {
        fallbackName = profile.display_name.toUpperCase();
      }
    } catch {
      // Not authenticated or fallback
    }

    return NextResponse.json({
      success: true,
      accountName: fallbackName,
      accountNumber,
      bankCode,
      isSimulated: true,
      notice:
        'Simulated NIBSS verification (configure PAYSTACK_SECRET_KEY or FLUTTERWAVE_SECRET_KEY for live interbank lookup).',
    });
  } catch (error: any) {
    console.error('Account resolution error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error resolving account number' },
      { status: 500 }
    );
  }
}
