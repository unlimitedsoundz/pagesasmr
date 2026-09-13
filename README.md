# The Pink Room — Page Turning (pages.pinkroom.online)

Faceless Page-Turning ASMR Creator Platform & Video Production Studio.

## Highlights
- **Rate**: Flat $50.00 USD per approved video (180s / 3:00 min minimum unbroken duration)
- **Payout Gate**: 8 approved videos = $400.00 USD threshold
- **Payment Methods**: Wise, PayPal, ACH/Direct Deposit, Wire, and Nigerian Bank NUBAN
- **Platform Scope**: Isolated under `platform_id = 'pinkroom_pages'`
- **Brand Identity**: Identical design, dark/light luxury theme, and layout matching The Pink Room main platform.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure:
- `NEXT_PUBLIC_APP_URL=https://pages.pinkroom.online`
- `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (`notifications@pages.pinkroom.online`), `RESEND_REPLY_TO` (`opheliaadeleke@gmail.com`)
- `ADMIN_NOTIFICATION_EMAIL=opheliaadeleke@gmail.com`

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build Production Bundle
```bash
npm run build
```

## Admin Access
- Administrative review queue: `/admin/submissions`
- Payout approval & disbursal: `/admin/payouts`
- Admin overview: `/admin`
