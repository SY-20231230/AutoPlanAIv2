export const formatDate = (dateInput: Date | string | number, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat(locale, options).format(date);
};

export const formatCurrency = (amount: number, locale: string = 'en-US', currency: string = 'USD', options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    ...options,
  }).format(amount);
};

export const formatNumber = (num: number, locale: string = 'en-US', options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat(locale, options).format(num);
};