import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuthStore } from './auth';

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

export function useVideoBookmarks() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: ['video-bookmarks'],
    queryFn: () => api.get('/videos/bookmarks').then(r => r.data),
    enabled: !!token,
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
