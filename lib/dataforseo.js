/**
 * DataForSEO API Helper
 * Uses environment variables as default, falls back to user credentials
 */

export function getDataForSeoCredentials(user) {
  // First check environment variables (hardcoded/global)
  const envLogin = process.env.DATAFORSEO_LOGIN;
  const envPassword = process.env.DATAFORSEO_PASSWORD;

  if (envLogin && envPassword) {
    return {
      login: envLogin,
      password: envPassword,
      source: 'environment'
    };
  }

  // Fall back to user-specific credentials
  if (user?.dataForSeoLogin && user?.dataForSeoPassword) {
    return {
      login: user.dataForSeoLogin,
      password: user.dataForSeoPassword,
      source: 'user'
    };
  }

  return null;
}

export function getAuthHeader(credentials) {
  if (!credentials) return null;
  const encoded = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64');
  return `Basic ${encoded}`;
}

export async function dataForSeoRequest(endpoint, body, user) {
  const credentials = getDataForSeoCredentials(user);

  if (!credentials) {
    throw new Error('DataForSEO credentials not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables or configure in Settings.');
  }

  const response = await fetch(`https://api.dataforseo.com/v3${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(credentials),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.status_message || 'DataForSEO API error');
  }

  return data;
}

export function hasCredentials(user) {
  return !!getDataForSeoCredentials(user);
}
