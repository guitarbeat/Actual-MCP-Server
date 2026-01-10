/**
 * Escapes special characters in a string to prevent XSS.
 * @param unsafe - The string or number to escape
 * @returns The escaped string
 */
export const escapeHtml = (unsafe: string | number): string => {
  if (unsafe === null || unsafe === undefined) {
    return '';
  }
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
