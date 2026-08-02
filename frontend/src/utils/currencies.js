export const ALL_CURRENCIES = [
  { code: 'MYR', name: 'Malaysian Ringgit (RM)', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', name: 'Euro (€)', symbol: '€' },
  { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' },
  { code: 'BDT', name: 'Bangladeshi Taka (৳)', symbol: '৳' },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar (C$)', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc (CHF)', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan (¥)', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham (AED)', symbol: 'AED' },
  { code: 'IDR', name: 'Indonesian Rupiah (Rp)', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso (₱)', symbol: '₱' },
  { code: 'THB', name: 'Thai Baht (฿)', symbol: '฿' },
  { code: 'KRW', name: 'South Korean Won (₩)', symbol: '₩' },
  { code: 'TWD', name: 'New Taiwan Dollar (NT$)', symbol: 'NT$' },
  { code: 'NZD', name: 'New Zealand Dollar (NZ$)', symbol: 'NZ$' },
  { code: 'HKD', name: 'Hong Kong Dollar (HK$)', symbol: 'HK$' },
  { code: 'SEK', name: 'Swedish Krona (kr)', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone (kr)', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone (kr)', symbol: 'kr' },
  { code: 'RUB', name: 'Russian Ruble (₽)', symbol: '₽' },
  { code: 'BRL', name: 'Brazilian Real (R$)', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand (R)', symbol: 'R' },
  { code: 'MXN', name: 'Mexican Peso ($)', symbol: '$' },
  { code: 'SAR', name: 'Saudi Riyal (SAR)', symbol: 'SAR' },
  { code: 'QAR', name: 'Qatari Riyal (QAR)', symbol: 'QAR' },
  { code: 'KWD', name: 'Kuwaiti Dinar (KWD)', symbol: 'KWD' },
  { code: 'PKR', name: 'Pakistani Rupee (Rs)', symbol: 'Rs' },
  { code: 'LKR', name: 'Sri Lankan Rupee (Rs)', symbol: 'Rs' },
  { code: 'VND', name: 'Vietnamese Dong (₫)', symbol: '₫' },
  { code: 'TRY', name: 'Turkish Lira (₺)', symbol: '₺' },
  { code: 'EGP', name: 'Egyptian Pound (E£)', symbol: 'E£' },
];

export const getPreferredCurrencies = (user, currentCurrency = null) => {
  const baseCurr = user?.baseCurrency || 'MYR';
  const preferred = (user?.preferredCurrencies && user.preferredCurrencies.length > 0)
    ? user.preferredCurrencies
    : ['MYR', 'USD', 'EUR', 'SGD'];

  const codes = [...new Set([baseCurr, ...preferred, ...(currentCurrency ? [currentCurrency] : [])])].filter(Boolean);

  return codes.map(code => {
    const found = ALL_CURRENCIES.find(c => c.code === code);
    return found || { code, name: `${code} (${code})`, symbol: code };
  });
};
