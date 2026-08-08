import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { RevenueReportDownload } from '@/lib/api/statistics';

export async function saveRevenueReport(
  report: RevenueReportDownload,
  dialogTitle: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    downloadOnWeb(report);
    return;
  }

  const file = new File(Paths.cache, report.filename);
  file.create({ overwrite: true });
  file.write(report.bytes);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('FILE_SHARING_UNAVAILABLE');
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle,
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}

function downloadOnWeb(report: RevenueReportDownload): void {
  const blob = new Blob([report.bytes], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = report.filename;
  link.click();
  URL.revokeObjectURL(url);
}
