/**
 * Safely validates a redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the destination is strictly an internal relative path starting with '/',
 * and never a protocol-relative path ('//') or absolute URL scheme ('http:', 'https:', 'javascript:').
 *
 * @param redirectParam The raw redirect string from query parameters or state
 * @param defaultPath Fallback path if the parameter is absent or invalid (defaults to '/')
 */
export function getSafeRedirectUrl(
  redirectParam: string | null | undefined,
  defaultPath = '/'
): string {
  if (!redirectParam) {
    return defaultPath;
  }

  const trimmed = redirectParam.trim();

  // Block empty strings
  if (!trimmed) {
    return defaultPath;
  }

  // Must begin with '/' and NOT with '//' (protocol-relative)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return defaultPath;
  }

  // Block any scheme injection or backslashes
  if (
    trimmed.includes('://') ||
    trimmed.includes('\\') ||
    trimmed.toLowerCase().startsWith('/\\')
  ) {
    return defaultPath;
  }

  // Prevent redirect loops back to login/register
  const cleanPath = trimmed.split('?')[0].toLowerCase();
  if (cleanPath === '/login' || cleanPath === '/register') {
    return defaultPath;
  }

  return trimmed;
}

