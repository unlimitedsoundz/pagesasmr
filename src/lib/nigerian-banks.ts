export interface NigerianBankInfo {
  name: string;
  code: string;
}

export const NIGERIAN_BANKS_WITH_CODES: NigerianBankInfo[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'OPay', code: '100004' },
  { name: 'Palmpay', code: '100033' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Wema Bank (ALAT)', code: '035' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Taj Bank', code: '302' },
];

export const NIGERIAN_BANKS = [
  'Access Bank',
  'Zenith Bank',
  'Guaranty Trust Bank (GTBank)',
  'First Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Kuda Bank',
  'OPay',
  'Palmpay',
  'Moniepoint',
  'Stanbic IBTC Bank',
  'Fidelity Bank',
  'First City Monument Bank (FCMB)',
  'Union Bank of Nigeria',
  'Sterling Bank',
  'Wema Bank (ALAT)',
  'Polaris Bank',
  'Ecobank Nigeria',
  'Keystone Bank',
  'Jaiz Bank',
  'Taj Bank',
  'Other Nigerian Commercial Bank',
] as const;

export type NigerianBankName = (typeof NIGERIAN_BANKS)[number];

export function getBankCodeByName(bankName: string): string | null {
  const bank = NIGERIAN_BANKS_WITH_CODES.find(
    (b) => b.name.toLowerCase() === bankName.toLowerCase()
  );
  return bank ? bank.code : null;
}
