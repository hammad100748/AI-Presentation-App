# API Structure

This directory contains the API configuration and services for the AI Presentation app.

## Structure

```
utils/api/
├── endpoints.ts      # API endpoint configurations
├── index.ts         # Main exports
└── README.md        # This file
```

## Usage

### Importing the API

```typescript
import { API } from '../utils/api';

// Access endpoints
const generateUrl = API.presentationGenerate;
const statusUrl = API.presentationStatus;
```

### Available Endpoints

- `API.deleteAccount` - User account deletion
- `API.addTokens` - Add tokens to user account
- `API.presentationGenerate` - SlidesGPT presentation generation
- `API.presentationStatus` - SlidesGPT presentation status

### Available Services

- `generatePresentation()` - Create new presentations
- `checkPresentationStatus()` - Check generation progress
- `downloadPresentation()` - Download completed presentations by ID
- `getPresentationEmbedUrl()` - Get embed URL for PowerPoint Online
- `getPowerPointOnlineInstructions()` - Get user instructions for PowerPoint Online access

### Environment Configuration

The API automatically detects the environment:
- **Development**: Uses local development URLs
- **Production**: Uses production URLs

### Adding New Endpoints

1. Add the endpoint to `ENV` object in `endpoints.ts`
2. Add it to the `API` export object
3. Update the console.log statements

### Example Service Implementation

```typescript
// utils/api/presentationService.ts
import { API } from './endpoints';

export const generatePresentation = async (data: SlidesGPTGenerateRequest) => {
  const response = await fetch(API.presentationGenerate, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLIDESGPT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
};

export const checkPresentationStatus = async (presentationId: string) => {
  const response = await fetch(`${API.presentationStatus}/${presentationId}`, {
    headers: {
      'Authorization': `Bearer ${SLIDESGPT_API_KEY}`,
    },
  });
  return response.json();
};

export const downloadPresentation = async (presentationId: string) => {
  const downloadUrl = `${API.presentationStatus.replace('/status', '')}/${presentationId}/download`;
  const response = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${SLIDESGPT_API_KEY}`,
      'Accept': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
  });
  return response;
};

export const getPresentationEmbedUrl = (presentationId: string) => {
  return `https://api.slidesgpt.com/v1/presentations/${presentationId}/embed`;
};

## Downloading Presentations

The SlidesGPT API allows you to download generated presentations as PowerPoint (.pptx) files using the presentation ID:

```typescript
import { downloadPresentation } from './presentationService';

// Download a presentation by ID
const response = await downloadPresentation('presentation-id-123');
const arrayBuffer = await response.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// Save to file system
const filePath = await saveToFile(buffer, 'presentation-name');
```

### Download Flow

1. **Generate Presentation** → Get presentation ID from response
2. **Check Status** → Monitor generation progress  
3. **Download File** → Use ID to download .pptx file
4. **Save Locally** → Store in app's document directory
5. **Track in Recent** → Save to recent presentations with ID

### File Naming Convention

Files are saved with the format: `Title_ID - Slide AI_UniqueID.pptx`

- **Title**: Sanitized presentation title
- **ID**: SlidesGPT presentation ID
- **UniqueID**: Random 4-character string to prevent conflicts

## Embedding Presentations

**⚠️ Important Note**: The SlidesGPT embed endpoint requires authentication and cannot be opened directly in a browser. The embed URL is meant for server-side use with proper API headers.

### Current Implementation

The app shows an alert with instructions for accessing the presentation in PowerPoint Online:

1. **Go to SlidesGPT Dashboard**: https://slidesgpt.com
2. **Sign in** to your account
3. **Find the presentation** using the generated ID
4. **Click "View" or "Open in PowerPoint"**

### Using the Embed URL (Server-side)

```typescript
import { getPresentationEmbedUrl } from '../utils/api';

// Get the embed URL for a presentation
const embedUrl = getPresentationEmbedUrl('presentation-id-123');

// Note: This URL requires authentication headers
// It cannot be opened directly in a browser
```

### Alternative Approaches

For direct PowerPoint Online access, you would need to:
1. **Use a WebView component** with proper authentication
2. **Implement server-side proxy** to handle the API call
3. **Use SlidesGPT's public dashboard** (current approach)

## Next Steps

1. ✅ Replace placeholder URLs with actual API endpoints
2. ✅ Implement the presentation service
3. ✅ Update the GeneratingPresentation screen to use the new API
4. ✅ Test the complete flow
5. ✅ Add embed functionality to your UI
6. 🔑 **Configure your SlidesGPT API key** (see `SETUP.md`)

## 🔑 API Key Configuration

**Important**: You need to configure your SlidesGPT API key before using the real API.

See `SETUP.md` for detailed setup instructions.

## UI Integration

The GeneratingPresentation screen now includes:
- **Embed Button**: Appears when presentation is ready
- **PowerPoint Online View**: Opens presentation in PowerPoint Online
- **Real-time Status**: Shows generation progress and completion
- **Download Ready**: Navigates to download screen when complete
