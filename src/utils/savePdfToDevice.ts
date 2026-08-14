import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type SavePdfResult = 'saved' | 'shared' | 'cancelled';

function downloadBlobInBrowser(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Saves a base64 PDF on device (or triggers browser download on web).
 */
export async function savePdfToDevice(options: {
  fileName: string;
  contentBase64: string;
  mimeType?: string;
}): Promise<SavePdfResult> {
  const mimeType = options.mimeType || 'application/pdf';

  if (Platform.OS === 'web') {
    const bytes = Uint8Array.from(atob(options.contentBase64), (c) =>
      c.charCodeAt(0)
    );
    downloadBlobInBrowser(new Blob([bytes], { type: mimeType }), options.fileName);
    return 'saved';
  }

  if (Platform.OS === 'android') {
    try {
      const saf = FileSystem.StorageAccessFramework;
      const downloadsHint = saf.getUriForDirectoryInRoot('Download');
      const permissions =
        await saf.requestDirectoryPermissionsAsync(downloadsHint);
      if (!permissions.granted) {
        return 'cancelled';
      }
      const destination = await saf.createFileAsync(
        permissions.directoryUri,
        options.fileName,
        mimeType
      );
      await FileSystem.writeAsStringAsync(destination, options.contentBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return 'saved';
    } catch {
      // Fall through to share sheet.
    }
  }

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    throw new Error('No writable directory available');
  }
  const uri = `${dir}${options.fileName}`;
  await FileSystem.writeAsStringAsync(uri, options.contentBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: options.fileName,
    UTI: 'com.adobe.pdf',
  });
  return 'shared';
}
