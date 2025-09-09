
// API Environment configuration
export const BASE_URL = 'https://ai-presentation-4806f/us-central1';
const LOCAL_URL = 'http://127.0.0.1:5001';

// Environment configurations
export const ENV = {
  dev: {
    deleteAccount: 'https://deleteaccount-arlkyu6kda-uc.a.run.app',
    addTokens: 'https://addtokens-arlkyu6kda-uc.a.run.app',
    // SlidesGPT API endpoints
    presentationGenerate: 'https://api.slidesgpt.com/v1/presentations/generate',
    presentationStatus: 'https://api.slidesgpt.com/v1/presentations',
  },
  devLocal: {
    // Local development endpoints
    deleteAccount: `${LOCAL_URL}/ai-presentation-4806f/us-central1/deleteAccount`,
    addTokens: `${LOCAL_URL}/ai-presentation-4806f/us-central1/addTokens`,
    // SlidesGPT API endpoints for local development (can use same URLs)
    presentationGenerate: 'https://api.slidesgpt.com/v1/presentations/generate',
    presentationStatus: 'https://api.slidesgpt.com/v1/presentations',
  },
  prod: {
    deleteAccount: 'https://deleteaccount-arlkyu6kda-uc.a.run.app',
    addTokens: 'https://addtokens-arlkyu6kda-uc.a.run.app',
    // SlidesGPT API endpoints (production)
    presentationGenerate: 'https://api.slidesgpt.com/v1/presentations/generate',
    presentationStatus: 'https://api.slidesgpt.com/v1/presentations',
  },
};

// Determine if we're in development or production
const getEnvironment = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Running in development mode');
    return 'dev';
  }
  console.log('Running in production mode');
  return 'prod';
};

// Get the current environment
const currentEnv = getEnvironment();
console.log(`API Environment: ${currentEnv}`);

// Export the API endpoints
export const API = {
  deleteAccount: ENV[currentEnv].deleteAccount,
  addTokens: ENV[currentEnv].addTokens,
  presentationGenerate: ENV[currentEnv].presentationGenerate,
  presentationStatus: ENV[currentEnv].presentationStatus,
};

console.log('API Endpoints:');
console.log('- Delete Account:', API.deleteAccount);
console.log('- Add Tokens:', API.addTokens);
console.log('- Presentation Generate:', API.presentationGenerate);
console.log('- Presentation Status:', API.presentationStatus);

// Helper function to switch environment manually if needed
export const switchEnvironment = (env: 'dev' | 'prod') => {
  console.log(`Manually switching environment to: ${env}`);
  if (env in ENV) {
    return ENV[env];
  }
  throw new Error(`Environment ${env} not supported`);
};


