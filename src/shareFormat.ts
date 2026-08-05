/** Share-time choice: PNG image, multi-page PDF, or plain text. */
export type ShareFormat = 'png' | 'pdf' | 'text';

export const DEFAULT_SHARE_FORMAT: ShareFormat = 'png';

/** Formats shown when a screen does not opt into Text. */
export const DEFAULT_SHARE_FORMATS: ShareFormat[] = ['png', 'pdf'];
