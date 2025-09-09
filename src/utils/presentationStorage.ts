import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the presentation interface
export interface RecentPresentation {
  id: string;
  title: string;
  slides: number;
  createdAt: string; // Store as ISO string for proper date handling
  downloadUrl: string;
  filePath?: string;
  templateName: string;
  color?: string;
  topic?: string;
}

// Keys for AsyncStorage
const RECENT_PRESENTATIONS_KEY = '@recent_presentations';
const MAX_RECENT_PRESENTATIONS = 10;

/**
 * Save a presentation to the recently created list
 * @param presentation The presentation to save
 */
export const saveRecentPresentation = async (presentation: RecentPresentation): Promise<void> => {
  try {
    // Get existing presentations
    const existingPresentations = await getRecentPresentations();

    // Check if this presentation already exists (by ID)
    const existingIndex = existingPresentations.findIndex(p => p.id === presentation.id);

    if (existingIndex !== -1) {
      // Update existing presentation
      existingPresentations[existingIndex] = presentation;
    } else {
      // Add new presentation to the beginning of the array
      existingPresentations.unshift(presentation);
    }

    // Keep only the most recent presentations
    const recentPresentations = existingPresentations.slice(0, MAX_RECENT_PRESENTATIONS);

    // Save to AsyncStorage
    await AsyncStorage.setItem(RECENT_PRESENTATIONS_KEY, JSON.stringify(recentPresentations));
    console.log('Presentation saved to recent list:', presentation.title);
  } catch (error) {
    console.error('Error saving recent presentation:', error);
  }
};

/**
 * Get all recently created presentations
 * @returns Array of recent presentations
 */
export const getRecentPresentations = async (): Promise<RecentPresentation[]> => {
  try {
    const presentationsJson = await AsyncStorage.getItem(RECENT_PRESENTATIONS_KEY);
    if (presentationsJson) {
      const presentations = JSON.parse(presentationsJson);

      // Migrate old presentations that have 'date' field to 'createdAt'
      const migratedPresentations = presentations.map((presentation: any) => {
        if (presentation.date && !presentation.createdAt) {
          // Convert old date format to ISO string
          const date = new Date(presentation.date);
          return {
            ...presentation,
            createdAt: date.toISOString(),
            date: undefined, // Remove old field
          };
        }
        return presentation;
      });

      // Save migrated data back to storage
      if (JSON.stringify(presentations) !== JSON.stringify(migratedPresentations)) {
        await AsyncStorage.setItem(RECENT_PRESENTATIONS_KEY, JSON.stringify(migratedPresentations));
      }

      return migratedPresentations;
    }
    return [];
  } catch (error) {
    console.error('Error getting recent presentations:', error);
    return [];
  }
};

/**
 * Delete a presentation from the recently created list
 * @param id The ID of the presentation to delete
 */
export const deleteRecentPresentation = async (id: string): Promise<void> => {
  try {
    const presentations = await getRecentPresentations();
    const updatedPresentations = presentations.filter(p => p.id !== id);
    await AsyncStorage.setItem(RECENT_PRESENTATIONS_KEY, JSON.stringify(updatedPresentations));
    console.log('Presentation deleted from recent list:', id);
  } catch (error) {
    console.error('Error deleting recent presentation:', error);
  }
};

/**
 * Get a specific presentation by ID
 * @param id The ID of the presentation to retrieve
 * @returns The presentation if found, null otherwise
 */
export const getRecentPresentationById = async (id: string): Promise<RecentPresentation | null> => {
  try {
    const presentations = await getRecentPresentations();
    const presentation = presentations.find(p => p.id === id);
    return presentation || null;
  } catch (error) {
    console.error('Error getting presentation by ID:', error);
    return null;
  }
};

/**
 * Update a presentation's file path
 * @param id The ID of the presentation to update
 * @param filePath The new file path
 */
export const updatePresentationFilePath = async (id: string, filePath: string): Promise<void> => {
  try {
    const presentations = await getRecentPresentations();
    const presentationIndex = presentations.findIndex(p => p.id === id);
    
    if (presentationIndex !== -1) {
      presentations[presentationIndex].filePath = filePath;
      await AsyncStorage.setItem(RECENT_PRESENTATIONS_KEY, JSON.stringify(presentations));
      console.log('Presentation file path updated:', id);
    }
  } catch (error) {
    console.error('Error updating presentation file path:', error);
  }
};

/**
 * Check if a presentation exists by ID
 * @param id The ID of the presentation to check
 * @returns True if the presentation exists, false otherwise
 */
export const presentationExists = async (id: string): Promise<boolean> => {
  try {
    const presentations = await getRecentPresentations();
    return presentations.some(p => p.id === id);
  } catch (error) {
    console.error('Error checking if presentation exists:', error);
    return false;
  }
};

/**
 * Update a presentation in the recently created list
 * @param id The ID of the presentation to update
 * @param updates The updates to apply
 */
export const updateRecentPresentation = async (id: string, updates: Partial<RecentPresentation>): Promise<void> => {
  try {
    const presentations = await getRecentPresentations();
    const updatedPresentations = presentations.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });
    await AsyncStorage.setItem(RECENT_PRESENTATIONS_KEY, JSON.stringify(updatedPresentations));
    console.log('Presentation updated in recent list:', id);
  } catch (error) {
    console.error('Error updating recent presentation:', error);
  }
};

/**
 * Clear all recently created presentations
 */
export const clearRecentPresentations = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_PRESENTATIONS_KEY);
    console.log('All recent presentations cleared');
  } catch (error) {
    console.error('Error clearing recent presentations:', error);
  }
};

// Helper function to generate a random color for presentation thumbnails
export const getRandomColor = (): string => {
  const colors = ['#9747FF', '#3273DC', '#4F67ED', '#00C58E', '#FF7A00'];
  return colors[Math.floor(Math.random() * colors.length)];
};
