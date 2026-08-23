import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '../services/api';
import type { Job, CreateJobInput, UpdateJobInput, UpdateJobStatusInput } from '@repo/shared';

const JOBS_KEY = 'jobs';

export function useJobs(filters?: Record<string, string | undefined>) {
  return useQuery<Job[]>({
    queryKey: [JOBS_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters ?? {})) {
        if (value) params.set(key, value);
      }
      const { data } = await api.get<ApiResponse<Job[]>>(`/api/jobs?${params.toString()}`);
      return data.data ?? [];
    },
  });
}

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: [JOBS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Job>>(`/api/jobs/${id}`);
      return data.data!;
    },
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      const { data } = await api.post<ApiResponse<Job>>('/api/jobs', input);
      return data.data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [JOBS_KEY] }),
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UpdateJobStatusInput['status'] }) => {
      const { data } = await api.patch<ApiResponse<Job>>(`/api/jobs/${id}/status`, { status });
      return data.data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [JOBS_KEY] }),
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/jobs/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [JOBS_KEY] }),
  });
}
