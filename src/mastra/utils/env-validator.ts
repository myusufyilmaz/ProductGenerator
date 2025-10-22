export function validateEnvironment() {
  const required = {
    'DATABASE_URL': 'Postgres database connection string',
    'GOOGLE_DRIVE_DTF_FOLDER_ID': 'Google Drive DTF folder ID',
    'GOOGLE_DRIVE_POD_FOLDER_ID': 'Google Drive POD folder ID',
    'GOOGLE_CLOUD_VISION_API_KEY': 'Google Cloud Vision API key',
    'PERPLEXITY_API_KEY': 'Perplexity AI API key',
    'SHOPIFY_STORE_URL': 'Shopify store URL',
    'SHOPIFY_ACCESS_TOKEN': 'Shopify admin API access token',
    'AI_INTEGRATIONS_OPENAI_BASE_URL': 'OpenAI API base URL',
    'AI_INTEGRATIONS_OPENAI_API_KEY': 'OpenAI API key',
  };

  const missing: string[] = [];
  const placeholder: string[] = [];

  for (const [key, description] of Object.entries(required)) {
    const value = process.env[key];

    if (!value) {
      missing.push(`${key} (${description})`);
    } else if (value.startsWith('your_') || value.startsWith('your-') || value === 'YOUR_DB_PASSWORD') {
      placeholder.push(`${key} (${description})`);
    }
  }

  return { missing, placeholder, isValid: missing.length === 0 && placeholder.length === 0 };
}

export function getEnvironmentStatus() {
  const validation = validateEnvironment();

  if (validation.isValid) {
    return { status: 'ready', message: 'All environment variables configured' };
  }

  let message = '';

  if (validation.missing.length > 0) {
    message += `Missing environment variables:\n${validation.missing.map(v => `  - ${v}`).join('\n')}`;
  }

  if (validation.placeholder.length > 0) {
    if (message) message += '\n\n';
    message += `Placeholder values detected (need real values):\n${validation.placeholder.map(v => `  - ${v}`).join('\n')}`;
  }

  return { status: 'incomplete', message };
}
