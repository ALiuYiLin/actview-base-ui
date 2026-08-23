export function stringifyLocale(locale?: Intl.LocalesArgument) {
  if (locale == null) {
    return '';
  }
  if (typeof locale === 'string') {
    return locale;
  }
  if (Array.isArray(locale)) {
    return locale.join(',');
  }
  return locale.toString();
}
