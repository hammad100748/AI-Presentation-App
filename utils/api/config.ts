// API Configuration
export const API_CONFIG = {
  // SlidesGPT API Configuration
  SLIDESGPT: {
    API_KEY: 'ng0q8cta8591wwtgkxonxb3473jhym99', // Your actual SlidesGPT API key
    BASE_URL: 'https://api.slidesgpt.com/v1',
    TIMEOUT: 30000, // 30 seconds
  },
  
  // Environment
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  
  // Debug mode
  DEBUG: process.env.NODE_ENV === 'development' || false,
  
  // 🧪 MOCK MODE - Set to true to use mock responses instead of real API calls
  MOCK_MODE: false, // Change this to false when ready for production
};

// Log the current configuration (only in development)
if (API_CONFIG.DEBUG) {
  console.log('🚀 PRODUCTION MODE: API Configuration loaded:');
  console.log('   Mock Mode:', API_CONFIG.MOCK_MODE ? '✅ ENABLED' : '❌ DISABLED (PRODUCTION)');
  console.log('   Environment:', API_CONFIG.ENVIRONMENT);
  console.log('   Debug Mode:', API_CONFIG.DEBUG ? '✅ ENABLED' : '❌ DISABLED');
  console.log('   🔑 API Key: ✅ CONFIGURED (Production Ready!)');
  console.log('   🎯 Status: READY FOR LIVE USERS!');
}

// Helper function to check if API key is configured
export const isApiKeyConfigured = () => {
  // If mock mode is enabled, always return false (use mock)
  if (API_CONFIG.MOCK_MODE) {
    return false;
  }
  
  // Otherwise, check if real API key is configured
  return API_CONFIG.SLIDESGPT.API_KEY && 
         API_CONFIG.SLIDESGPT.API_KEY !== 'YOUR_API_KEY_HERE';
};

// Helper function to get API key
export const getApiKey = () => {
  if (!isApiKeyConfigured()) {
    throw new Error('API key not configured. Please add your SlidesGPT API key in utils/api/config.ts');
  }
  return API_CONFIG.SLIDESGPT.API_KEY;
};
