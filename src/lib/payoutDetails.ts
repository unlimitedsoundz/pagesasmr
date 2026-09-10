export interface FormattedPayoutLine {
  label: string;
  value: string;
  copyable?: boolean;
}

export interface FormattedPayoutInfo {
  method: string;
  methodLabel: string;
  badgeLabel: string;
  badgeColor: string;
  isConfigured: boolean;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  routingNumber?: string;
  email?: string;
  provider?: string;
  phone?: string;
  notes?: string;
  summary: string;
  fullCopyText: string;
  lines: FormattedPayoutLine[];
  rawDetails?: any;
}

export function formatCreatorPayoutInfo(creatorOrPayout: any, fallbackPayout?: any): FormattedPayoutInfo {
  if (!creatorOrPayout && !fallbackPayout) {
    return {
      method: 'NOT_SET',
      methodLabel: 'Not Configured',
      badgeLabel: 'No Payout Info',
      badgeColor: 'bg-neutral-100 text-neutral-600 border-neutral-200',
      isConfigured: false,
      summary: 'No payout account on file',
      fullCopyText: 'No payout account configured',
      lines: [],
    };
  }

  // Merge creator and fallback payout if provided
  const creator = creatorOrPayout?.payment_details !== undefined || creatorOrPayout?.email
    ? creatorOrPayout
    : (fallbackPayout || {});

  const payout = creatorOrPayout?.amount_usd !== undefined || creatorOrPayout?.payment_destination !== undefined
    ? creatorOrPayout
    : (fallbackPayout || {});

  const d = creator?.payment_details || creator?.creator_payment_details || {};
  const rawMethod = (
    creator?.payment_method ||
    creator?.creator_payment_method ||
    payout?.payment_method ||
    ''
  ).toUpperCase();

  const destinationStr = (payout?.payment_destination || creator?.payment_destination || '').trim();

  // Extract bank name
  let bankName = (
    d.nigerian_bank_name ||
    d.nigerianBankName ||
    d.bank_name ||
    d.bankName ||
    ''
  ).trim();

  // Extract account number
  let accountNumber = (
    d.nigerian_account_number ||
    d.nigerianAccountNumber ||
    d.account_number ||
    d.accountNumber ||
    ''
  ).trim();

  // Extract account/beneficiary name
  let accountName = (
    d.nigerian_account_name ||
    d.beneficiary_name ||
    d.beneficiaryName ||
    ''
  ).trim();

  // Extract routing / sort code
  let routingNumber = (d.routing_number || d.routingNumber || '').trim();

  // Extract PayPal / Wise emails
  let paypalEmail = (d.paypal_email || d.paypalEmail || '').trim();
  let wiseEmail = (d.wise_email || d.wiseEmail || '').trim();

  // Extract Mobile Money
  let momoProvider = (d.mobile_money_provider || d.mobileNetwork || '').trim();
  let momoPhone = (d.mobile_money_phone || d.mobileNumber || '').trim();
  let momoName = (d.mobile_money_account_name || '').trim();
  const notes = (d.notes || '').trim();

  // Parse destinationStr if details were empty but destination string is present
  if (!accountNumber && !paypalEmail && !wiseEmail && !momoPhone && destinationStr) {
    if (destinationStr.includes('NUBAN:')) {
      const match = destinationStr.match(/^(.*?)\s*-\s*NUBAN:\s*(\d+)(?:\s*\((.*?)\))?/);
      if (match) {
        if (!bankName) bankName = match[1]?.trim() || '';
        accountNumber = match[2]?.trim() || '';
        if (match[3] && !accountName) accountName = match[3]?.trim() || '';
      }
    } else if (destinationStr.includes('@')) {
      if (rawMethod === 'WISE') wiseEmail = destinationStr;
      else paypalEmail = destinationStr;
    } else if (destinationStr.includes('Routing:')) {
      const accMatch = destinationStr.match(/Acc(?:ount)?:\s*([^\s,]+)/i);
      const rMatch = destinationStr.match(/Routing:\s*([^\s,]+)/i);
      const benMatch = destinationStr.match(/Beneficiary:\s*([^,]+)/i);
      if (accMatch) accountNumber = accMatch[1];
      if (rMatch) routingNumber = rMatch[1];
      if (benMatch) accountName = benMatch[1].trim();
    }
  }

  // Determine actual configured payment method
  let method = rawMethod;
  if (!method) {
    if (accountNumber && (bankName.toLowerCase().includes('opay') || bankName.toLowerCase().includes('bank') || creator?.country === 'Nigeria')) {
      method = 'NIGERIA_BANK';
    } else if (routingNumber || (accountNumber && bankName)) {
      method = 'ACH';
    } else if (paypalEmail) {
      method = 'PAYPAL';
    } else if (wiseEmail) {
      method = 'WISE';
    } else if (momoPhone) {
      method = 'MOBILE_MONEY';
    }
  }

  const isConfigured = Boolean(accountNumber || paypalEmail || wiseEmail || momoPhone || bankName || destinationStr);

  if (!isConfigured) {
    return {
      method: 'NOT_SET',
      methodLabel: 'Not Configured',
      badgeLabel: 'No Payout Info',
      badgeColor: 'bg-neutral-100 text-neutral-500 border-neutral-200',
      isConfigured: false,
      summary: 'No payout account on file',
      fullCopyText: 'No payout account configured',
      lines: [],
      rawDetails: d,
    };
  }

  const lines: FormattedPayoutLine[] = [];

  const buildFullCopyText = (items: { label: string; val: string }[]) => {
    return items
      .filter((i) => Boolean(i.val))
      .map((i) => `${i.label}: ${i.val}`)
      .join('\n');
  };

  if (method === 'NIGERIA_BANK') {
    if (bankName) lines.push({ label: 'Bank Name', value: bankName, copyable: true });
    if (accountNumber) lines.push({ label: 'NUBAN Account Number', value: accountNumber, copyable: true });
    if (accountName) lines.push({ label: 'Account Holder Name', value: accountName, copyable: true });
    if (notes) lines.push({ label: 'Notes', value: notes });

    const copyText = buildFullCopyText([
      { label: 'Payment Method', val: 'Nigerian Bank Transfer' },
      { label: 'Bank', val: bankName },
      { label: 'NUBAN Account Number', val: accountNumber },
      { label: 'Account Name', val: accountName },
      { label: 'Notes', val: notes },
    ]);

    return {
      method: 'NIGERIA_BANK',
      methodLabel: 'Nigerian Bank Transfer',
      badgeLabel: `🇳🇬 ${bankName || 'NG Bank'}`,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      isConfigured: true,
      bankName,
      accountNumber,
      accountName,
      notes,
      summary: `${bankName ? bankName + ' • ' : ''}${accountNumber ? accountNumber : ''}${accountName ? ' (' + accountName + ')' : ''}`,
      fullCopyText: copyText,
      lines,
      rawDetails: d,
    };
  }

  if (method === 'ACH' || method === 'WIRE') {
    if (bankName) lines.push({ label: 'Bank Name', value: bankName, copyable: true });
    if (routingNumber) lines.push({ label: 'Routing Number (ABA)', value: routingNumber, copyable: true });
    if (accountNumber) lines.push({ label: 'Account Number', value: accountNumber, copyable: true });
    if (accountName) lines.push({ label: 'Beneficiary Name', value: accountName, copyable: true });
    if (notes) lines.push({ label: 'Notes', value: notes });

    const copyText = buildFullCopyText([
      { label: 'Payment Method', val: method === 'WIRE' ? 'International Wire' : 'US Bank ACH Direct Deposit' },
      { label: 'Bank Name', val: bankName },
      { label: 'Account Number', val: accountNumber },
      { label: 'Routing Number', val: routingNumber },
      { label: 'Beneficiary Name', val: accountName },
      { label: 'Notes', val: notes },
    ]);

    return {
      method: method,
      methodLabel: method === 'WIRE' ? 'International Wire' : 'US Bank ACH Direct Deposit',
      badgeLabel: `🏦 ${bankName || 'US Bank'}`,
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      isConfigured: true,
      bankName,
      accountNumber,
      accountName,
      routingNumber,
      notes,
      summary: `${bankName ? bankName + ' • ' : ''}Acc: ${accountNumber}${routingNumber ? ' (Routing: ' + routingNumber + ')' : ''}`,
      fullCopyText: copyText,
      lines,
      rawDetails: d,
    };
  }

  if (method === 'PAYPAL') {
    if (paypalEmail) lines.push({ label: 'PayPal Email', value: paypalEmail, copyable: true });
    if (accountName) lines.push({ label: 'Recipient Name', value: accountName, copyable: true });
    if (notes) lines.push({ label: 'Notes', value: notes });

    const copyText = buildFullCopyText([
      { label: 'Payment Method', val: 'PayPal' },
      { label: 'PayPal Email', val: paypalEmail },
      { label: 'Recipient Name', val: accountName },
      { label: 'Notes', val: notes },
    ]);

    return {
      method: 'PAYPAL',
      methodLabel: 'PayPal',
      badgeLabel: '💳 PayPal',
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
      isConfigured: true,
      email: paypalEmail,
      accountName,
      notes,
      summary: paypalEmail || accountName || 'PayPal configured',
      fullCopyText: copyText,
      lines,
      rawDetails: d,
    };
  }

  if (method === 'WISE') {
    if (wiseEmail) lines.push({ label: 'Wise Email / Account', value: wiseEmail, copyable: true });
    if (accountName) lines.push({ label: 'Recipient Name', value: accountName, copyable: true });
    if (notes) lines.push({ label: 'Notes', value: notes });

    const copyText = buildFullCopyText([
      { label: 'Payment Method', val: 'Wise (TransferWise)' },
      { label: 'Wise Email', val: wiseEmail },
      { label: 'Recipient Name', val: accountName },
      { label: 'Notes', val: notes },
    ]);

    return {
      method: 'WISE',
      methodLabel: 'Wise (TransferWise)',
      badgeLabel: '🌐 Wise',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      isConfigured: true,
      email: wiseEmail,
      accountName,
      notes,
      summary: wiseEmail || accountName || 'Wise configured',
      fullCopyText: copyText,
      lines,
      rawDetails: d,
    };
  }

  if (method === 'MOBILE_MONEY') {
    const provider = momoProvider || 'M-Pesa / Mobile Money';
    if (provider) lines.push({ label: 'Mobile Provider', value: provider, copyable: true });
    if (momoPhone) lines.push({ label: 'Phone Number', value: momoPhone, copyable: true });
    if (momoName || accountName) lines.push({ label: 'Account Name', value: momoName || accountName, copyable: true });
    if (notes) lines.push({ label: 'Notes', value: notes });

    const copyText = buildFullCopyText([
      { label: 'Payment Method', val: 'Mobile Money' },
      { label: 'Provider', val: provider },
      { label: 'Phone', val: momoPhone },
      { label: 'Account Name', val: momoName || accountName },
      { label: 'Notes', val: notes },
    ]);

    return {
      method: 'MOBILE_MONEY',
      methodLabel: 'Mobile Money',
      badgeLabel: `📱 ${provider}`,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      isConfigured: true,
      provider,
      phone: momoPhone,
      accountName: momoName || accountName,
      notes,
      summary: `${provider} • ${momoPhone}`,
      fullCopyText: copyText,
      lines,
      rawDetails: d,
    };
  }

  // Generic fallback
  if (bankName) lines.push({ label: 'Bank Name', value: bankName, copyable: true });
  if (accountNumber) lines.push({ label: 'Account Number', value: accountNumber, copyable: true });
  if (accountName) lines.push({ label: 'Beneficiary Name', value: accountName, copyable: true });
  if (destinationStr && !accountNumber) lines.push({ label: 'Destination', value: destinationStr, copyable: true });
  if (notes) lines.push({ label: 'Notes', value: notes });

  const copyText = buildFullCopyText([
    { label: 'Payment Method', val: method || 'Custom Payout' },
    { label: 'Bank Name', val: bankName },
    { label: 'Account Number', val: accountNumber },
    { label: 'Beneficiary Name', val: accountName },
    { label: 'Destination', val: destinationStr },
    { label: 'Notes', val: notes },
  ]);

  return {
    method: method || 'OTHER',
    methodLabel: method || 'Custom Payout',
    badgeLabel: method || 'Payout Info',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    isConfigured: true,
    bankName,
    accountNumber,
    accountName,
    notes,
    summary: destinationStr || `${bankName ? bankName + ' • ' : ''}${accountNumber}`,
    fullCopyText: copyText,
    lines,
    rawDetails: d,
  };
}
