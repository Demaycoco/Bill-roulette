export interface WorldCurrency {
  code: string;
  name: string;
  country: string;
  flag: string;
  symbol: string;
  popular?: boolean;
}

export const WORLD_CURRENCIES: WorldCurrency[] = [
  // Top / Popular Currencies & Africa
  { code: 'NGN', name: 'Nigerian Naira', country: 'Nigeria', flag: '🇳🇬', symbol: '₦', popular: true },
  { code: 'USD', name: 'US Dollar', country: 'United States', flag: '🇺🇸', symbol: '$', popular: true },
  { code: 'EUR', name: 'Euro', country: 'European Union', flag: '🇪🇺', symbol: '€', popular: true },
  { code: 'GBP', name: 'British Pound Sterling', country: 'United Kingdom', flag: '🇬🇧', symbol: '£', popular: true },
  { code: 'KES', name: 'Kenyan Shilling', country: 'Kenya', flag: '🇰🇪', symbol: 'KSh', popular: true },
  { code: 'GHS', name: 'Ghanaian Cedi', country: 'Ghana', flag: '🇬🇭', symbol: 'GH₵', popular: true },
  { code: 'ZAR', name: 'South African Rand', country: 'South Africa', flag: '🇿🇦', symbol: 'R', popular: true },
  { code: 'EGP', name: 'Egyptian Pound', country: 'Egypt', flag: '🇪🇬', symbol: 'E£', popular: true },
  { code: 'CAD', name: 'Canadian Dollar', country: 'Canada', flag: '🇨🇦', symbol: 'CA$', popular: true },
  { code: 'AUD', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺', symbol: 'A$', popular: true },
  { code: 'JPY', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵', symbol: '¥', popular: true },
  { code: 'INR', name: 'Indian Rupee', country: 'India', flag: '🇮🇳', symbol: '₹', popular: true },
  { code: 'BRL', name: 'Brazilian Real', country: 'Brazil', flag: '🇧🇷', symbol: 'R$', popular: true },
  { code: 'AED', name: 'UAE Dirham', country: 'United Arab Emirates', flag: '🇦🇪', symbol: 'AED', popular: true },
  { code: 'SAR', name: 'Saudi Riyal', country: 'Saudi Arabia', flag: '🇸🇦', symbol: 'SAR', popular: true },
  { code: 'SGD', name: 'Singapore Dollar', country: 'Singapore', flag: '🇸🇬', symbol: 'S$', popular: true },
  { code: 'CHF', name: 'Swiss Franc', country: 'Switzerland', flag: '🇨🇭', symbol: 'CHF', popular: true },
  { code: 'CNY', name: 'Chinese Yuan', country: 'China', flag: '🇨🇳', symbol: '¥', popular: true },
  { code: 'MXN', name: 'Mexican Peso', country: 'Mexico', flag: '🇲🇽', symbol: 'Mex$', popular: true },
  { code: 'PHP', name: 'Philippine Peso', country: 'Philippines', flag: '🇵🇭', symbol: '₱', popular: true },

  // African Nations
  { code: 'UGX', name: 'Ugandan Shilling', country: 'Uganda', flag: '🇺🇬', symbol: 'USh' },
  { code: 'TZS', name: 'Tanzanian Shilling', country: 'Tanzania', flag: '🇹🇿', symbol: 'TSh' },
  { code: 'RWF', name: 'Rwandan Franc', country: 'Rwanda', flag: '🇷🇼', symbol: 'FRw' },
  { code: 'ETB', name: 'Ethiopian Birr', country: 'Ethiopia', flag: '🇪🇹', symbol: 'Br' },
  { code: 'MAD', name: 'Moroccan Dirham', country: 'Morocco', flag: '🇲🇦', symbol: 'MAD' },
  { code: 'ZMW', name: 'Zambian Kwacha', country: 'Zambia', flag: '🇿🇲', symbol: 'ZK' },
  { code: 'AOA', name: 'Angolan Kwanza', country: 'Angola', flag: '🇦🇴', symbol: 'Kz' },
  { code: 'BWP', name: 'Botswana Pula', country: 'Botswana', flag: '🇧🇼', symbol: 'P' },
  { code: 'XOF', name: 'West African CFA Franc', country: 'Senegal / Ivory Coast', flag: '🇸🇳', symbol: 'CFA' },
  { code: 'XAF', name: 'Central African CFA Franc', country: 'Cameroon / Gabon', flag: '🇨🇲', symbol: 'FCFA' },
  { code: 'DZD', name: 'Algerian Dinar', country: 'Algeria', flag: '🇩🇿', symbol: 'DA' },
  { code: 'TND', name: 'Tunisian Dinar', country: 'Tunisia', flag: '🇹🇳', symbol: 'DT' },
  { code: 'LYD', name: 'Libyan Dinar', country: 'Libya', flag: '🇱🇾', symbol: 'LD' },
  { code: 'MUR', name: 'Mauritian Rupee', country: 'Mauritius', flag: '🇲🇺', symbol: '₨' },
  { code: 'MZN', name: 'Mozambican Metical', country: 'Mozambique', flag: '🇲🇿', symbol: 'MT' },
  { code: 'NAD', name: 'Namibian Dollar', country: 'Namibia', flag: '🇳🇦', symbol: 'N$' },
  { code: 'SCR', name: 'Seychellois Rupee', country: 'Seychelles', flag: '🇸🇨', symbol: 'SR' },
  { code: 'SZL', name: 'Eswatini Lilangeni', country: 'Eswatini', flag: '🇸🇿', symbol: 'L' },
  { code: 'LSL', name: 'Lesotho Loti', country: 'Lesotho', flag: '🇱🇸', symbol: 'M' },
  { code: 'GMD', name: 'Gambian Dalasi', country: 'Gambia', flag: '🇬🇲', symbol: 'D' },
  { code: 'GNF', name: 'Guinean Franc', country: 'Guinea', flag: '🇬🇳', symbol: 'FG' },
  { code: 'SLL', name: 'Sierra Leonean Leone', country: 'Sierra Leone', flag: '🇸🇱', symbol: 'Le' },
  { code: 'LRD', name: 'Liberian Dollar', country: 'Liberia', flag: '🇱🇷', symbol: 'L$' },
  { code: 'MWK', name: 'Malawian Kwacha', country: 'Malawi', flag: '🇲🇼', symbol: 'MK' },
  { code: 'BIF', name: 'Burundian Franc', country: 'Burundi', flag: '🇧🇮', symbol: 'FBu' },
  { code: 'CDF', name: 'Congolese Franc', country: 'DR Congo', flag: '🇨🇩', symbol: 'FC' },
  { code: 'DJF', name: 'Djiboutian Franc', country: 'Djibouti', flag: '🇩🇯', symbol: 'Fdj' },
  { code: 'SOS', name: 'Somali Shilling', country: 'Somalia', flag: '🇸🇴', symbol: 'Sh' },
  { code: 'SDG', name: 'Sudanese Pound', country: 'Sudan', flag: '🇸🇩', symbol: 'SDG' },
  { code: 'SSP', name: 'South Sudanese Pound', country: 'South Sudan', flag: '🇸🇸', symbol: 'SSP' },
  { code: 'CVE', name: 'Cape Verdean Escudo', country: 'Cape Verde', flag: '🇨🇻', symbol: 'Esc' },
  { code: 'STN', name: 'São Tomé and Príncipe Dobra', country: 'São Tomé & Príncipe', flag: '🇸🇹', symbol: 'Db' },
  { code: 'KMF', name: 'Comorian Franc', country: 'Comoros', flag: '🇰🇲', symbol: 'CF' },

  // Asia & Pacific
  { code: 'KRW', name: 'South Korean Won', country: 'South Korea', flag: '🇰🇷', symbol: '₩' },
  { code: 'HKD', name: 'Hong Kong Dollar', country: 'Hong Kong', flag: '🇭🇰', symbol: 'HK$' },
  { code: 'TWD', name: 'New Taiwan Dollar', country: 'Taiwan', flag: '🇹🇼', symbol: 'NT$' },
  { code: 'IDR', name: 'Indonesian Rupiah', country: 'Indonesia', flag: '🇮🇩', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', country: 'Malaysia', flag: '🇲🇾', symbol: 'RM' },
  { code: 'THB', name: 'Thai Baht', country: 'Thailand', flag: '🇹🇭', symbol: '฿' },
  { code: 'VND', name: 'Vietnamese Dong', country: 'Vietnam', flag: '🇻🇳', symbol: '₫' },
  { code: 'PKR', name: 'Pakistani Rupee', country: 'Pakistan', flag: '🇵🇰', symbol: '₨' },
  { code: 'BDT', name: 'Bangladeshi Taka', country: 'Bangladesh', flag: '🇧🇩', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', country: 'Sri Lanka', flag: '🇱🇰', symbol: 'Rs' },
  { code: 'NPR', name: 'Nepalese Rupee', country: 'Nepal', flag: '🇳🇵', symbol: '₨' },
  { code: 'NZD', name: 'New Zealand Dollar', country: 'New Zealand', flag: '🇳🇿', symbol: 'NZ$' },
  { code: 'FJD', name: 'Fijian Dollar', country: 'Fiji', flag: '🇫🇯', symbol: 'FJ$' },
  { code: 'PGK', name: 'Papua New Guinean Kina', country: 'Papua New Guinea', flag: '🇵🇬', symbol: 'K' },
  { code: 'WST', name: 'Samoan Tala', country: 'Samoa', flag: '🇼🇸', symbol: 'WS$' },
  { code: 'TOP', name: 'Tongan Paʻanga', country: 'Tonga', flag: '🇹🇴', symbol: 'T$' },
  { code: 'VUV', name: 'Vanuatu Vatu', country: 'Vanuatu', flag: '🇻🇺', symbol: 'VT' },
  { code: 'SBD', name: 'Solomon Islands Dollar', country: 'Solomon Islands', flag: '🇸🇧', symbol: 'SI$' },
  { code: 'MVR', name: 'Maldivian Rufiyaa', country: 'Maldives', flag: '🇲🇻', symbol: 'Rf' },
  { code: 'BND', name: 'Brunei Dollar', country: 'Brunei', flag: '🇧🇳', symbol: 'B$' },
  { code: 'KHR', name: 'Cambodian Riel', country: 'Cambodia', flag: '🇰🇭', symbol: '៛' },
  { code: 'LAK', name: 'Lao Kip', country: 'Laos', flag: '🇱🇦', symbol: '₭' },
  { code: 'MMK', name: 'Myanmar Kyat', country: 'Myanmar', flag: '🇲🇲', symbol: 'K' },
  { code: 'MNT', name: 'Mongolian Tugrik', country: 'Mongolia', flag: '🇲🇳', symbol: '₮' },
  { code: 'KZT', name: 'Kazakhstani Tenge', country: 'Kazakhstan', flag: '🇰🇿', symbol: '₸' },
  { code: 'UZS', name: 'Uzbekistani Som', country: 'Uzbekistan', flag: '🇺🇿', symbol: "so'm" },
  { code: 'KGS', name: 'Kyrgyzstani Som', country: 'Kyrgyzstan', flag: '🇰🇬', symbol: 'с' },
  { code: 'TJS', name: 'Tajikistani Somoni', country: 'Tajikistan', flag: '🇹🇯', symbol: 'SM' },
  { code: 'AFN', name: 'Afghan Afghani', country: 'Afghanistan', flag: '🇦🇫', symbol: '؋' },
  { code: 'BTN', name: 'Bhutanese Ngultrum', country: 'Bhutan', flag: '🇧🇹', symbol: 'Nu.' },
  { code: 'MOP', name: 'Macanese Pataca', country: 'Macau', flag: '🇲🇴', symbol: 'MOP$' },

  // Middle East
  { code: 'QAR', name: 'Qatari Riyal', country: 'Qatar', flag: '🇶🇦', symbol: 'QR' },
  { code: 'KWD', name: 'Kuwaiti Dinar', country: 'Kuwait', flag: '🇰🇼', symbol: 'KD' },
  { code: 'OMR', name: 'Omani Rial', country: 'Oman', flag: '🇴🇲', symbol: 'RO' },
  { code: 'BHD', name: 'Bahraini Dinar', country: 'Bahrain', flag: '🇧🇭', symbol: 'BD' },
  { code: 'JOD', name: 'Jordanian Dinar', country: 'Jordan', flag: '🇯🇴', symbol: 'JD' },
  { code: 'ILS', name: 'Israeli New Shekel', country: 'Israel', flag: '🇮🇱', symbol: '₪' },
  { code: 'IQD', name: 'Iraqi Dinar', country: 'Iraq', flag: '🇮🇶', symbol: 'IQD' },
  { code: 'LBP', name: 'Lebanese Pound', country: 'Lebanon', flag: '🇱🇧', symbol: 'LL' },
  { code: 'YER', name: 'Yemeni Rial', country: 'Yemen', flag: '🇾🇪', symbol: 'YR' },
  { code: 'IRR', name: 'Iranian Rial', country: 'Iran', flag: '🇮🇷', symbol: 'Rl' },

  // Europe (Non-Euro)
  { code: 'TRY', name: 'Turkish Lira', country: 'Turkey', flag: '🇹🇷', symbol: '₺' },
  { code: 'SEK', name: 'Swedish Krona', country: 'Sweden', flag: '🇸🇪', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', country: 'Norway', flag: '🇳🇴', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', country: 'Denmark', flag: '🇩🇰', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', country: 'Poland', flag: '🇵🇱', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', country: 'Czech Republic', flag: '🇨🇿', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', country: 'Hungary', flag: '🇭🇺', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', country: 'Romania', flag: '🇷🇴', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', country: 'Bulgaria', flag: '🇧🇬', symbol: 'лв' },
  { code: 'ISK', name: 'Icelandic Krona', country: 'Iceland', flag: '🇮🇸', symbol: 'kr' },
  { code: 'RSD', name: 'Serbian Dinar', country: 'Serbia', flag: '🇷🇸', symbol: 'din.' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', country: 'Bosnia & Herzegovina', flag: '🇧🇦', symbol: 'KM' },
  { code: 'MKD', name: 'Macedonian Denar', country: 'North Macedonia', flag: '🇲🇰', symbol: 'ден' },
  { code: 'ALL', name: 'Albanian Lek', country: 'Albania', flag: '🇦🇱', symbol: 'Lek' },
  { code: 'MDL', name: 'Moldovan Leu', country: 'Moldova', flag: '🇲🇩', symbol: 'L' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', country: 'Ukraine', flag: '🇺🇦', symbol: '₴' },
  { code: 'GEL', name: 'Georgian Lari', country: 'Georgia', flag: '🇬🇪', symbol: '₾' },
  { code: 'AMD', name: 'Armenian Dram', country: 'Armenia', flag: '🇦🇲', symbol: '֏' },
  { code: 'AZN', name: 'Azerbaijani Manat', country: 'Azerbaijan', flag: '🇦🇿', symbol: '₼' },

  // Americas & Caribbean
  { code: 'ARS', name: 'Argentine Peso', country: 'Argentina', flag: '🇦🇷', symbol: '$' },
  { code: 'CLP', name: 'Chilean Peso', country: 'Chile', flag: '🇨🇱', symbol: '$' },
  { code: 'COP', name: 'Colombian Peso', country: 'Colombia', flag: '🇨🇴', symbol: '$' },
  { code: 'PEN', name: 'Peruvian Sol', country: 'Peru', flag: '🇵🇪', symbol: 'S/' },
  { code: 'UYU', name: 'Uruguayan Peso', country: 'Uruguay', flag: '🇺🇾', symbol: '$U' },
  { code: 'PYG', name: 'Paraguayan Guarani', country: 'Paraguay', flag: '🇵🇾', symbol: '₲' },
  { code: 'BOB', name: 'Bolivian Boliviano', country: 'Bolivia', flag: '🇧🇴', symbol: 'Bs.' },
  { code: 'CRC', name: 'Costa Rican Colon', country: 'Costa Rica', flag: '🇨🇷', symbol: '₡' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', country: 'Guatemala', flag: '🇬🇹', symbol: 'Q' },
  { code: 'HNL', name: 'Honduran Lempira', country: 'Honduras', flag: '🇭🇳', symbol: 'L' },
  { code: 'NIO', name: 'Nicaraguan Cordoba', country: 'Nicaragua', flag: '🇳🇮', symbol: 'C$' },
  { code: 'PAB', name: 'Panamanian Balboa', country: 'Panama', flag: '🇵🇦', symbol: 'B/.' },
  { code: 'DOP', name: 'Dominican Peso', country: 'Dominican Republic', flag: '🇩🇴', symbol: 'RD$' },
  { code: 'JMD', name: 'Jamaican Dollar', country: 'Jamaica', flag: '🇯🇲', symbol: 'J$' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', country: 'Trinidad & Tobago', flag: '🇹🇹', symbol: 'TT$' },
  { code: 'BBD', name: 'Barbadian Dollar', country: 'Barbados', flag: '🇧🇧', symbol: 'Bds$' },
  { code: 'BSD', name: 'Bahamian Dollar', country: 'Bahamas', flag: '🇧🇸', symbol: 'B$' },
  { code: 'BZD', name: 'Belize Dollar', country: 'Belize', flag: '🇧🇿', symbol: 'BZ$' },
  { code: 'GYD', name: 'Guyanese Dollar', country: 'Guyana', flag: '🇬🇾', symbol: 'G$' },
  { code: 'SRD', name: 'Surinamese Dollar', country: 'Suriname', flag: '🇸🇷', symbol: 'Sr$' },
  { code: 'HTG', name: 'Haitian Gourde', country: 'Haiti', flag: '🇭🇹', symbol: 'G' },
  { code: 'XCD', name: 'East Caribbean Dollar', country: 'Eastern Caribbean', flag: '🇦🇬', symbol: 'EC$' },
  { code: 'AWG', name: 'Aruban Florin', country: 'Aruba', flag: '🇦🇼', symbol: 'Afl.' },
  { code: 'ANG', name: 'Netherlands Antillean Guilder', country: 'Curaçao / Sint Maarten', flag: '🇨🇼', symbol: 'NAƒ' },
  { code: 'BMD', name: 'Bermudian Dollar', country: 'Bermuda', flag: '🇧🇲', symbol: 'BD$' },
  { code: 'KYD', name: 'Cayman Islands Dollar', country: 'Cayman Islands', flag: '🇰🇾', symbol: 'CI$' },
];

export function findCurrencyByCode(code: string): WorldCurrency | undefined {
  const upper = code.trim().toUpperCase();
  return WORLD_CURRENCIES.find((c) => c.code === upper);
}

export function searchCurrencies(query: string): WorldCurrency[] {
  if (!query || !query.trim()) return WORLD_CURRENCIES;
  const q = query.toLowerCase().trim();

  return WORLD_CURRENCIES.filter((c) => {
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  });
}
