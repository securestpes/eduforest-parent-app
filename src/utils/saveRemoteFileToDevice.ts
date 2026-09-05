import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type SaveFileResult = 'saved' | 'shared' | 'cancelled';

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || 'file';
  return trimmed.replace(/[/\\?%*:|"<>]/g, '_');
}

function downloadBlobInBrowser(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads a remote file to the device (or browser) so parents can keep homework photos and PDFs.
 */
export async function saveRemoteFileToDevice(options: {
  url: string;
  fileName: string;
  mimeType?: string;
}): Promise<SaveFileResult> {
  const fileName = sanitizeFileName(options.fileName);
  const mimeType = options.mimeType || 'application/octet-stream';
  const headers = { 'ngrok-skip-browser-warning': 'true' };

  if (Platform.OS === 'web') {
    const res = await fetch(options.url, { headers });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }
    downloadBlobInBrowser(await res.blob(), fileName);
    return 'saved';
  }

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    throw new Error('No writable directory available');
  }
  const cacheUri = `${dir}${fileName}`;
  const downloaded = await FileSystem.downloadAsync(options.url, cacheUri, { headers });
  if (downloaded.status !== 200) {
    throw new Error(`Download failed (${downloaded.status})`);
  }

  if (Platform.OS === 'android') {
    try {
      const saf = FileSystem.StorageAccessFramework;
      const downloadsHint = saf.getUriForDirectoryInRoot('Download');
      const permissions = await saf.requestDirectoryPermissionsAsync(downloadsHint);
      if (!permissions.granted) {
        return 'cancelled';
      }
      const destination = await saf.createFileAsync(
        permissions.directoryUri,
        fileName,
        mimeType
      );
      const base64 = await FileSystem.readAsStringAsync(downloaded.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(destination, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return 'saved';
    } catch {
      // Fall through to share sheet.
    }
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(downloaded.uri, {
    mimeType,
    dialogTitle: fileName,
  });
  return 'shared';
}
