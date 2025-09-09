export interface PresentationData {
  plain_text: string;
  length: number;
  template: string;
  language: string;
  fetch_images: boolean;
  tone: string;
  verbosity: string;
  custom_user_instructions: string;
}

export interface ScreenParams {
  topic: string;
  language?: string;
  tone?: string;
  textAmount?: string;
  addImages?: string;
  presentationLength?: string;
  template?: string;
  presentationData?: string;
}

export interface DownloadDetails {
  id: string;
  topic: string;
  downloadUrl: string;
  localPath: string;
  downloadDate: string;
  fileSize?: number;
  status: 'downloaded' | 'downloading' | 'failed';
  template: string;
  presentationData: PresentationData;
}
