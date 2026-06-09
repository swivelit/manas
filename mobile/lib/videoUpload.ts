import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export const VIDEO_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

export type PickedVideoFile = {
  uri: string;
  mimeType: string;
  fileName: string;
  sizeBytes?: number;
  durationMs?: number;
  source: 'gallery' | 'files';
};

const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg',
  ogv: 'video/ogg',
};

const SUPPORTED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
  'video/x-matroska',
  'video/3gpp',
  'video/3gpp2',
  'video/avi',
  'video/msvideo',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/mpeg',
  'video/ogg',
]);

const DOCUMENT_PICKER_TYPES = [
  'video/*',
  ...Array.from(SUPPORTED_VIDEO_MIME_TYPES),
];

function getFileNameFromUri(uri: string) {
  const withoutQuery = uri.split('?')[0]?.split('#')[0] ?? uri;
  const name = decodeURIComponent(withoutQuery.split('/').pop() ?? '').trim();
  return name || 'video';
}

function getExtension(value?: string | null) {
  if (!value) return null;
  const clean = value.split('?')[0]?.split('#')[0] ?? value;
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match?.[1].toLowerCase() ?? null;
}

function normalizeMimeType(mimeType?: string | null) {
  return mimeType?.split(';')[0]?.trim().toLowerCase() || null;
}

export function inferVideoMimeType(input: { mimeType?: string | null; fileName?: string | null; uri: string }) {
  const normalized = normalizeMimeType(input.mimeType);
  if (normalized && SUPPORTED_VIDEO_MIME_TYPES.has(normalized)) return normalized;

  const ext = getExtension(input.fileName) ?? getExtension(input.uri);
  if (ext && VIDEO_MIME_BY_EXTENSION[ext]) return VIDEO_MIME_BY_EXTENSION[ext];

  return normalized;
}

function assertSupportedVideo(file: PickedVideoFile) {
  if (!SUPPORTED_VIDEO_MIME_TYPES.has(file.mimeType)) {
    throw new Error('Choose a supported video file such as MP4, MOV, M4V, WEBM, MKV, 3GP, AVI, WMV, MPEG, or OGV.');
  }
  if (file.sizeBytes && file.sizeBytes > VIDEO_UPLOAD_MAX_BYTES) {
    throw new Error('Choose a video smaller than 100 MB.');
  }
}

export async function pickVideoFromGallery(): Promise<PickedVideoFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Media library permission is required to choose a video.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset || asset.type !== 'video') {
    throw new Error('Choose a video from your gallery.');
  }

  const fileName = asset.fileName ?? getFileNameFromUri(asset.uri);
  const mimeType = inferVideoMimeType({ mimeType: asset.mimeType, fileName, uri: asset.uri });
  const file: PickedVideoFile = {
    uri: asset.uri,
    mimeType: mimeType ?? '',
    fileName,
    sizeBytes: asset.fileSize,
    durationMs: asset.duration ?? undefined,
    source: 'gallery',
  };
  assertSupportedVideo(file);
  return file;
}

export async function pickVideoFromFiles(): Promise<PickedVideoFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: DOCUMENT_PICKER_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  const fileName = asset.name || getFileNameFromUri(asset.uri);
  const mimeType = inferVideoMimeType({ mimeType: asset.mimeType, fileName, uri: asset.uri });
  const file: PickedVideoFile = {
    uri: asset.uri,
    mimeType: mimeType ?? '',
    fileName,
    sizeBytes: asset.size,
    source: 'files',
  };
  assertSupportedVideo(file);
  return file;
}

export function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function durationMsToSeconds(durationMs?: number) {
  if (!durationMs || durationMs <= 0) return null;
  return Math.max(1, Math.round(durationMs / 1000));
}

export function getReadableErrorMessage(err: unknown, fallback: string) {
  const responseError = (err as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  if (typeof responseError === 'string') return responseError;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
