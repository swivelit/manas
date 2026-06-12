import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './api';
import { useAuthStore } from './auth';
import type { SessionCallConfig } from './sessionCall';
import { VIDEO_UPLOAD_MAX_BYTES } from './videoUpload';

// ---- Categories & Topics ----
export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
}

export function useCategoryTopics(slug: string) {
  return useQuery({ queryKey: ['topics', slug], queryFn: () => api.get(`/categories/${slug}/topics`).then(r => r.data) });
}

export function useTopic(slug: string) {
  return useQuery({ queryKey: ['topic', slug], queryFn: () => api.get(`/topics/${slug}`).then(r => r.data) });
}

// ---- Coaches ----
export function useCoaches(topicSlug?: string) {
  return useQuery({
    queryKey: ['coaches', topicSlug],
    queryFn: () => api.get('/coaches', { params: topicSlug ? { topicSlug } : {} }).then(r => r.data),
  });
}

export function useCoach(id: string) {
  return useQuery({ queryKey: ['coach', id], queryFn: () => api.get(`/coaches/${id}`).then(r => r.data) });
}

export function useCoachAvailability(coachId: string, date: string) {
  return useQuery({
    queryKey: ['coach-availability', coachId, date],
    queryFn: () => api.get(`/coaches/${coachId}/availability`, { params: { date } }).then(r => r.data),
    enabled: !!coachId && !!date,
  });
}

// ---- Sessions ----
export function useSessions() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data),
    enabled: !!token,
  });
}

export function useSession(id: string) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => api.get(`/sessions/${id}`).then(r => r.data),
    enabled: !!token && !!id,
  });
}

export function useBookSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { coachId: string; topicId: string; scheduledAt: string; type: string }) =>
      api.post('/sessions', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; scheduledAt?: string; notes?: string }) =>
      api.patch(`/sessions/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useSessionMessages(sessionId: string) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['session-messages', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/messages`).then(r => r.data),
    enabled: !!token && !!sessionId,
    refetchInterval: 4000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const token = useAuthStore(s => s.token);
  return useMutation({
    mutationFn: ({ sessionId, body }: { sessionId: string; body: string }) => {
      if (!token) throw new Error('Sign in required to send messages.');
      return api.post(`/sessions/${sessionId}/messages`, { body }).then(r => r.data);
    },
    onSuccess: (_message, vars) => {
      qc.invalidateQueries({ queryKey: ['session-messages', vars.sessionId] });
    },
  });
}

export function useSessionCallConfig(sessionId: string, enabled = true) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['session-call-config', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/call-config`).then(r => r.data as SessionCallConfig),
    enabled: !!token && !!sessionId && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

// ---- Videos ----
export function useVideos(params?: { type?: string; topicId?: string }) {
  return useQuery({
    queryKey: ['videos', params],
    queryFn: () => api.get('/videos', { params }).then(r => r.data),
  });
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      try {
        const r = await api.get(`/videos/${id}`);
        return { video: r.data, paywalled: false as const };
      } catch (e: any) {
        if (e?.response?.status === 402) {
          return { video: null, paywalled: true as const };
        }
        throw e;
      }
    },
    enabled: !!id,
    retry: (failureCount, err: any) => err?.response?.status !== 402 && failureCount < 1,
  });
}

export function useVideoProgress() {
  const qc = useQueryClient();
  const token = useAuthStore(s => s.token);
  return useMutation({
    mutationFn: ({ id, progressSec, completed }: { id: string; progressSec: number; completed?: boolean }) => {
      if (!token) throw new Error('Sign in required to save video progress.');
      return api.post(`/videos/${id}/progress`, { progressSec, completed }).then(r => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['videos'] }),
  });
}

export function useBookmarkVideo() {
  const qc = useQueryClient();
  const token = useAuthStore(s => s.token);
  return useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Sign in required to bookmark videos.');
      return api.post(`/videos/${id}/bookmark`).then(r => r.data as { bookmarked: boolean });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-bookmarks'] });
      qc.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useLikeVideo() {
  const qc = useQueryClient();
  const token = useAuthStore(s => s.token);
  return useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Sign in required to like videos.');
      return api.post(`/videos/${id}/like`).then(r => r.data as { liked: boolean; likeCount: number });
    },
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['video', id] });
      qc.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useVideoBookmarks() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['video-bookmarks'],
    queryFn: () => api.get('/videos/bookmarks').then(r => r.data),
    enabled: !!token,
  });
}

export type ToyAudioUploadInput = {
  uri: string;
  durationMs: number;
  mimeType?: string;
};

export type ToyAudioUploadResult = {
  url: string;
  durationMs: number;
  sizeBytes: number;
};

export function useUploadToyAudio() {
  const token = useAuthStore(s => s.token);
  return useMutation({
    mutationFn: async ({ uri, durationMs, mimeType = 'audio/m4a' }: ToyAudioUploadInput) => {
      if (!token) throw new Error('Sign in required to upload audio.');
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return api.post('/videos/toy-audio', { audioBase64, durationMs, mimeType }).then(r => r.data as ToyAudioUploadResult);
    },
  });
}

export type VideoUploadInput = {
  uri: string;
  mimeType: string;
  sizeBytes?: number;
  fileName?: string;
};

export type VideoUploadResult = {
  url: string;
  thumbnailUrl: string | null;
  sizeBytes: number;
};

export function useUploadVideo() {
  const token = useAuthStore(s => s.token);
  return useMutation({
    mutationFn: async ({ uri, mimeType, sizeBytes, fileName }: VideoUploadInput) => {
      if (!token) throw new Error('Sign in required to upload video.');
      if (sizeBytes && sizeBytes > VIDEO_UPLOAD_MAX_BYTES) {
        throw new Error('Choose a video smaller than 100 MB.');
      }
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw new Error('Could not read the selected video file.');
      if (info.size && info.size > VIDEO_UPLOAD_MAX_BYTES) {
        throw new Error('Choose a video smaller than 100 MB.');
      }
      const videoBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return api.post('/videos/upload', { videoBase64, mimeType, fileName }).then(r => r.data as VideoUploadResult);
    },
  });
}

// ---- Me ----
export function useMe() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/me').then(r => r.data),
    enabled: !!token,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; timezone?: string; avatarUrl?: string }) =>
      api.patch('/me', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

// ---- Mood ----
export function useMoodEntries(limit = 30) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['mood', limit],
    queryFn: () => api.get('/mood', { params: { limit } }).then(r => r.data),
    enabled: !!token,
  });
}

export function useCreateMoodEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { mood: number; note?: string }) => api.post('/mood', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mood'] }),
  });
}

// ---- Notifications ----
export function useNotifications() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    enabled: !!token,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ---- Topics (all, for pickers) ----
export function useAllTopics() {
  return useQuery({ queryKey: ['all-topics'], queryFn: () => api.get('/topics').then(r => r.data) });
}

// ---- Coach surface ----
export function useCoachAppointments() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['coach-appointments'],
    queryFn: () => api.get('/coach/appointments').then(r => r.data),
    enabled: !!token,
  });
}

export function useUpdateCoachSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' }) =>
      api.patch(`/coach/sessions/${id}`, { status }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-appointments'] }),
  });
}

export function useMyAvailability() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['coach-my-availability'],
    queryFn: () => api.get('/coach/availability').then(r => r.data),
    enabled: !!token,
  });
}

export type AvailabilityRow = { dayOfWeek: number; startTime: string; endTime: string };

export function useReplaceAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (availability: AvailabilityRow[]) =>
      api.put('/coach/availability', { availability }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-my-availability'] }),
  });
}

export function useCreateCoachVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string; description: string; url: string; thumbnailUrl?: string;
      toyDescription?: string; toyAudioUrl?: string;
      type: string; isPremium?: boolean; topicId?: string; durationSec?: number;
    }) => api.post('/coach/videos', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['videos'] }),
  });
}

// ---- Admin surface ----
export function useAdminStats() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    enabled: !!token,
  });
}

export function useAdminUsers(page = 1, pageSize = 50) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['admin-users', page, pageSize],
    queryFn: () => api.get('/admin/users', { params: { page, pageSize } }).then(r => r.data),
    enabled: !!token,
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; role?: string; isPremium?: boolean; isActive?: boolean }) =>
      api.patch(`/admin/users/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useAdminCoaches() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['admin-coaches'],
    queryFn: () => api.get('/admin/coaches').then(r => r.data),
    enabled: !!token,
  });
}

export function usePromoteCoach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; specialty?: string; bio?: string }) =>
      api.post('/admin/coaches', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coaches'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useAdminVideos() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['admin-videos'],
    queryFn: () => api.get('/admin/videos').then(r => r.data),
    enabled: !!token,
  });
}

export function useUpdateAdminVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; approved?: boolean; isPremium?: boolean }) =>
      api.patch(`/admin/videos/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-videos'] });
      qc.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useCreateAdminVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string; description: string; url: string; thumbnailUrl?: string; subtitleUrl?: string;
      toyDescription?: string; toyAudioUrl?: string;
      durationSec?: number; type: string; isPremium?: boolean; approved?: boolean; topicId?: string;
    }) => api.post('/admin/videos', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-videos'] });
      qc.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useDeleteAdminVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/videos/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-videos'] });
      qc.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useBroadcast() {
  return useMutation({
    mutationFn: (data: { title: string; body: string }) =>
      api.post('/admin/notifications/broadcast', data).then(r => r.data),
  });
}
