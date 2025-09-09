declare module 'react-native-intent-launcher' {
  interface IntentOptions {
    action?: string;
    category?: string | string[];
    type?: string;
    package?: string;
    component?: string;
    flags?: number;
    data?: string;
    extra?: Record<string, any>;
  }

  const ACTION_VIEW: string;
  const ACTION_EDIT: string;
  const ACTION_SEND: string;
  const ACTION_MAIN: string;
  const ACTION_DEFAULT: string;
  const CATEGORY_DEFAULT: string;
  const CATEGORY_LAUNCHER: string;
  const FLAG_ACTIVITY_NEW_TASK: number;
  const FLAG_ACTIVITY_CLEAR_TOP: number;
  const FLAG_GRANT_READ_URI_PERMISSION: number;
  const FLAG_GRANT_WRITE_URI_PERMISSION: number;

  function startActivity(options: IntentOptions): Promise<void>;
  function isAppInstalled(packageName: string): Promise<boolean>;
  function getInstalledApps(): Promise<any[]>;

  export {
    ACTION_VIEW,
    ACTION_EDIT,
    ACTION_SEND,
    ACTION_MAIN,
    ACTION_DEFAULT,
    CATEGORY_DEFAULT,
    CATEGORY_LAUNCHER,
    FLAG_ACTIVITY_NEW_TASK,
    FLAG_ACTIVITY_CLEAR_TOP,
    FLAG_GRANT_READ_URI_PERMISSION,
    FLAG_GRANT_WRITE_URI_PERMISSION,
    startActivity,
    isAppInstalled,
    getInstalledApps,
  };

  export default {
    ACTION_VIEW,
    ACTION_EDIT,
    ACTION_SEND,
    ACTION_MAIN,
    ACTION_DEFAULT,
    CATEGORY_DEFAULT,
    CATEGORY_LAUNCHER,
    FLAG_ACTIVITY_NEW_TASK,
    FLAG_ACTIVITY_CLEAR_TOP,
    FLAG_GRANT_READ_URI_PERMISSION,
    FLAG_GRANT_WRITE_URI_PERMISSION,
    startActivity,
    isAppInstalled,
    getInstalledApps,
  };
}
