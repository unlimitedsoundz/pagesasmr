export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  ratePerUsd: number;
}

export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyInfo> = {
  'Nigeria': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', ratePerUsd: 1550 },
  'Kenya': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', ratePerUsd: 129 },
  'Ghana': { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', ratePerUsd: 15.5 },
  'Uganda': { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', ratePerUsd: 3700 },
  'Tanzania': { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', ratePerUsd: 2600 },
  'Rwanda': { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', ratePerUsd: 1350 },
  'Zambia': { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', ratePerUsd: 26.5 },
  'South Africa': { code: 'ZAR', symbol: 'R', name: 'South African Rand', ratePerUsd: 18.2 },
  'Cameroon': { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', ratePerUsd: 605 },
  'Ivory Coast': { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', ratePerUsd: 605 },
  'Senegal': { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', ratePerUsd: 605 },
  'Benin': { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', ratePerUsd: 605 },
  'United Kingdom': { code: 'GBP', symbol: '£', name: 'British Pound', ratePerUsd: 0.77 },
  'Germany': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'France': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'Spain': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'Italy': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'Netherlands': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'Ireland': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'Portugal': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'Belgium': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'Austria': { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92 },
  'Canada': { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', ratePerUsd: 1.36 },
  'Australia': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', ratePerUsd: 1.50 },
  'India': { code: 'INR', symbol: '₹', name: 'Indian Rupee', ratePerUsd: 83.5 },
  'Philippines': { code: 'PHP', symbol: '₱', name: 'Philippine Peso', ratePerUsd: 58.5 },
  'Brazil': { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', ratePerUsd: 5.60 },
  'Mexico': { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', ratePerUsd: 19.8 },
  'Japan': { code: 'JPY', symbol: '¥', name: 'Japanese Yen', ratePerUsd: 148 },
  'United States': { code: 'USD', symbol: '$', name: 'US Dollar', ratePerUsd: 1.00 },
};

export const AFRICAN_MOBILE_MONEY_COUNTRIES = [
  'Kenya',
  'Ghana',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Zambia',
  'Cameroon',
  'Ivory Coast',
  'Senegal',
  'Benin',
  'South Africa',
  'Nigeria',
  'Ethiopia',
  'Zimbabwe',
  'Malawi',
  'Mozambique',
];

export const MOBILE_MONEY_PROVIDERS: Record<string, string[]> = {
  'Kenya': ['M-Pesa (Safaricom)', 'Airtel Money'],
  'Ghana': ['MTN Mobile Money', 'Telecel / Vodafone Cash', 'AirtelTigo Money'],
  'Uganda': ['MTN Mobile Money', 'Airtel Money'],
  'Tanzania': ['M-Pesa (Vodacom)', 'Tigo Pesa', 'Airtel Money', 'Halopesa'],
  'Rwanda': ['MTN MoMo', 'Airtel Money'],
  'Zambia': ['MTN MoMo', 'Airtel Money', 'Zamtel'],
  'Cameroon': ['MTN MoMo', 'Orange Money'],
  'Ivory Coast': ['MTN MoMo', 'Orange Money', 'Wave', 'Moov Money'],
  'Senegal': ['Wave', 'Orange Money', 'Free Money'],
  'Benin': ['MTN MoMo', 'Moov Money'],
  'South Africa': ['eWallet / Mobile Money', 'Ozow'],
  'Other': ['M-Pesa', 'MTN Mobile Money', 'Airtel Money', 'Orange Money', 'Wave', 'Other Mobile Money'],
};

export function getLocalCurrency(country?: string, method?: string): CurrencyInfo {
  if (method === 'NIGERIA_BANK') {
    return COUNTRY_CURRENCY_MAP['Nigeria'];
  }
  if (country && COUNTRY_CURRENCY_MAP[country]) {
    return COUNTRY_CURRENCY_MAP[country];
  }
  return { code: 'USD', symbol: '$', name: 'US Dollar', ratePerUsd: 1.00 };
}

export function formatLocalFx(amountUsd: number, currency: CurrencyInfo): string {
  const localAmount = amountUsd * currency.ratePerUsd;
  if (currency.code === 'USD') {
    return `$${amountUsd.toFixed(2)} USD`;
  }
  return `${currency.symbol}${localAmount.toLocaleString('en-US', {
    minimumFractionDigits: currency.ratePerUsd > 100 ? 0 : 2,
    maximumFractionDigits: currency.ratePerUsd > 100 ? 0 : 2,
  })} ${currency.code}`;
}
