import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { parseISO } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors, type AppColors } from '../../../theme/appTheme';
import { StatusPopup, useAppLanguage, type StatusPopupVariant } from '../../../common';
import type { AppLanguage } from '../../../common/contexts/parentTranslations';
import { formatAppDate } from '../../../utils/appDateLocale';
import { normalizeUploadUrl } from '../../../common/helpers/normalizeUploadUrl';
import { saveRemoteFileToDevice } from '../../../utils/saveRemoteFileToDevice';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;

type Kind = 'image' | 'pdf' | 'file';

function fileKind(url: string): Kind {
  if (IMAGE_EXT.test(url)) return 'image';
  if (PDF_EXT.test(url)) return 'pdf';
  return 'file';
}

function extensionFromUrl(url: string, kind: Kind): string {
  try {
    const path = decodeURIComponent(url.split('?')[0] || '');
    const last = path.split('/').filter(Boolean).pop() || '';
    const dot = last.lastIndexOf('.');
    if (dot > 0) return last.slice(dot).toLowerCase();
  } catch {
    // ignore
  }
  if (kind === 'image') return '.jpg';
  if (kind === 'pdf') return '.pdf';
  return '';
}

function stampFromDate(value: string | null | undefined, language: AppLanguage): string {
  if (value) {
    try {
      const iso = value.length <= 10 ? `${value}T00:00:00` : value;
      const date = parseISO(iso);
      if (!Number.isNaN(date.getTime())) {
        return value.length <= 10
          ? formatAppDate(date, 'd MMM yyyy', language)
          : formatAppDate(date, 'd MMM yyyy, h:mm a', language);
      }
    } catch {
      // fall through
    }
  }
  return formatAppDate(new Date(), 'd MMM yyyy, h:mm a', language);
}

function mimeFor(kind: Kind, name: string): string {
  if (kind === 'pdf') return 'application/pdf';
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (kind === 'image') return 'image/jpeg';
  return 'application/octet-stream';
}

export function HomeworkAttachments({
  urls,
  title,
  assignedDate,
}: {
  urls: string[];
  title: string;
  assignedDate?: string | null;
}) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const styles = useMemo(() => createAttachStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    variant: StatusPopupVariant;
    title: string;
  } | null>(null);

  const items = useMemo(() => {
    const stamp = stampFromDate(assignedDate, language);
    const base = (title || t('homework.title')).trim();
    return urls.map((raw, index) => {
      const url = normalizeUploadUrl(raw);
      const kind = fileKind(url || raw);
      const ext = extensionFromUrl(url || raw, kind);
      const suffix = urls.length > 1 ? ` (${index + 1})` : '';
      const fileName = `${base} ${stamp}${suffix}${ext}`;
      return { key: `${raw}-${index}`, url, kind, fileName };
    });
  }, [urls, title, assignedDate, t, language]);

  const download = async (item: (typeof items)[number]) => {
    if (!item.url || downloadingKey) return;
    setDownloadingKey(item.key);
    try {
      const result = await saveRemoteFileToDevice({
        url: item.url,
        fileName: item.fileName,
        mimeType: mimeFor(item.kind, item.fileName),
      });
      if (result === 'cancelled') return;
      setStatus({
        variant: 'success',
        title: result === 'shared' ? t('homework.fileShared') : t('homework.fileSaved'),
      });
    } catch (e: unknown) {
      setStatus({
        variant: 'error',
        title: e instanceof Error ? e.message : t('homework.downloadFailed'),
      });
    } finally {
      setDownloadingKey(null);
    }
  };

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>{t('homework.files')}</Text>
      {items.map((item) => {
        const busy = downloadingKey === item.key;
        if (item.kind === 'image') {
          return (
            <View key={item.key} style={styles.row}>
              <Pressable
                onPress={() => setPreviewUri(item.url)}
                style={styles.thumbWrap}
                accessibilityRole="button"
                accessibilityLabel={t('homework.viewPhoto')}
              >
                <Image
                  source={{
                    uri: item.url,
                    headers: { 'ngrok-skip-browser-warning': 'true' },
                  }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              </Pressable>
              <View style={styles.copy}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.fileName}
                </Text>
                <Pressable onPress={() => setPreviewUri(item.url)}>
                  <Text style={styles.link}>{t('homework.viewPhoto')}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => void download(item)}
                disabled={busy}
                style={styles.iconBtn}
                accessibilityLabel={t('homework.downloadFile')}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons name="download" size={22} color={colors.primary} />
                )}
              </Pressable>
            </View>
          );
        }

        return (
          <View key={item.key} style={styles.row}>
            <View style={styles.docIcon}>
              <MaterialCommunityIcons
                name={item.kind === 'pdf' ? 'file-pdf-box' : 'file-document-outline'}
                size={28}
                color={colors.primary}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.name} numberOfLines={2}>
                {item.fileName}
              </Text>
              <Pressable onPress={() => void download(item)} disabled={busy}>
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.link}>
                    {item.kind === 'pdf' ? t('homework.downloadPdf') : t('homework.downloadFile')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        );
      })}

      <Modal
        visible={previewUri != null}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={[styles.preview, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.previewBar}>
            <Pressable onPress={() => setPreviewUri(null)} style={styles.previewAction}>
              <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              <Text style={styles.previewActionText}>{t('common.close')}</Text>
            </Pressable>
            {previewUri ? (
              <Pressable
                onPress={() => {
                  const item = items.find((row) => row.url === previewUri);
                  if (item) void download(item);
                }}
                style={styles.previewAction}
                disabled={!!downloadingKey}
              >
                {downloadingKey ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="download" size={22} color="#FFFFFF" />
                    <Text style={styles.previewActionText}>{t('homework.downloadFile')}</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
          {previewUri ? (
            <Image
              source={{
                uri: previewUri,
                headers: { 'ngrok-skip-browser-warning': 'true' },
              }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
      <StatusPopup
        visible={status != null}
        variant={status?.variant}
        title={status?.title ?? ''}
        onDismiss={() => setStatus(null)}
      />
    </View>
  );
}

function createAttachStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: { marginTop: 16, gap: 10 },
  section: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 10,
  },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumb: { width: '100%', height: '100%' },
  docIcon: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 13, fontWeight: '700' },
  link: { marginTop: 4, color: colors.primary, fontSize: 13, fontWeight: '700' },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.96)',
  },
  previewBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  previewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  previewActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  previewImage: { flex: 1, width: '100%' },
  });
}
