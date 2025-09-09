import { Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  request,
  openSettings,
  Permission,
} from 'react-native-permissions';

/**
 * Utility functions for handling download permissions
 */
export const DownloadPermissions = {
  /**
   * Get the appropriate permission based on platform and Android version
   * Note: We use app-specific directories to avoid needing permissions
   */
  getPermission: (): Permission[] => {
    // Since we're using app-specific directories (DocumentDirectoryPath),
    // we don't need any special permissions on either platform
    return [];
  },

  /**
   * Check if download permissions are granted
   * @returns Promise<boolean> - True if permissions are granted
   */
  checkPermissions: async (): Promise<boolean> => {
    // Since we use app-specific directories, we always have permission
    return true;
  },

  /**
   * Request download permissions
   * @returns Promise<boolean> - True if permissions are granted
   */
  requestPermissions: async (): Promise<boolean> => {
    // Since we use app-specific directories, we always have permission
    return true;
  },

  /**
   * Open app settings if permissions are denied
   */
  openSettings: async (): Promise<void> => {
    await openSettings();
  },
};
