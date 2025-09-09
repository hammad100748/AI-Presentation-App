# SlidesGPT API Setup

## 🔑 Configure Your API Key

To use the SlidesGPT API, you need to add your API key:

1. **Get your API key** from [SlidesGPT](https://slidesgpt.com)
2. **Open** `utils/api/config.ts`
3. **Replace** `'YOUR_API_KEY_HERE'` with your actual API key:

```typescript
export const API_CONFIG = {
  SLIDESGPT: {
    API_KEY: 'sk-your-actual-api-key-here', // ← Replace this
    BASE_URL: 'https://api.slidesgpt.com/v1',
    TIMEOUT: 30000,
  },
  // ... rest of config
};
```

## 🧪 Test Mode

When no API key is configured, the app runs in **mock mode**:
- ✅ Generates fake presentation IDs
- ✅ Simulates API delays
- ✅ Allows testing the UI flow
- ⚠️ No real presentations are created

## 🚀 Production Mode

Once you add your API key:
- ✅ Real API calls to SlidesGPT
- ✅ Actual presentation generation
- ✅ PowerPoint Online embedding
- ✅ File downloads

## 🔒 Security Note

**Never commit your API key to version control!**
Consider using environment variables for production apps.
