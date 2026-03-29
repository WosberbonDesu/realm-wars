/**
 * Clipboard wrapper — centralizes clipboard access.
 * Currently uses the deprecated react-native Clipboard API.
 * To upgrade: npm install @react-native-clipboard/clipboard
 * then swap the import below.
 */
import { Clipboard as RNClipboard } from 'react-native';

// Future: import Clipboard from '@react-native-clipboard/clipboard';

export const ClipboardService = {
  async getString(): Promise<string> {
    try {
      return await RNClipboard.getString();
    } catch {
      return '';
    }
  },
  setString(text: string) {
    RNClipboard.setString(text);
  },
};
