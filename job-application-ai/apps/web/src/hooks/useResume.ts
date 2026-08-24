import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '../services/api';
import type { MasterResume, ResumeLibraryItem, ResumeVersion } from '@repo/shared';

const RESUME_KEY = 'resumes';

function requireData<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error ?? 'The resume request did not return data.');
  }
  return response.data;
}

export function useActiveResume() {
  return useQuery<MasterResume>({
    queryKey: [RESUME_KEY, 'active'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MasterResume>>('/api/resumes/active');
      return data.data!;
    },
  });
}

export function useCreateResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content: string; rawText: string }) => {
      const { data } = await api.post<ApiResponse<MasterResume>>('/api/resumes', input);
      return data.data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [RESUME_KEY] }),
  });
}

export function useResumeLibrary(filters?: Record<string, string | undefined>) {
  return useQuery<{
    masterResume: MasterResume | null;
    masterResumes: MasterResume[];
    companyResumes: ResumeLibraryItem[];
    recentDocuments: ResumeLibraryItem[];
  }>({
    queryKey: [RESUME_KEY, 'library', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters ?? {}).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const { data } = await api.get<ApiResponse<{
        masterResume: MasterResume | null;
        masterResumes: MasterResume[];
        companyResumes: ResumeLibraryItem[];
        recentDocuments: ResumeLibraryItem[];
      }>>(`/api/resumes/library?${params.toString()}`);
      return data.data ?? { masterResume: null, masterResumes: [], companyResumes: [], recentDocuments: [] };
    },
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post<ApiResponse<MasterResume>>('/api/resumes/upload', formData);
      return requireData(data);
    },
    onSuccess: async (resume) => {
      queryClient.setQueryData([RESUME_KEY, 'active'], resume);
      await queryClient.invalidateQueries({ queryKey: [RESUME_KEY] });
    },
  });
}

export function useReplaceResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const { data } = await api.post<ApiResponse<MasterResume>>(`/api/resumes/${id}/replace`, formData);
      return requireData(data);
    },
    onSuccess: async (resume) => {
      queryClient.setQueryData([RESUME_KEY, 'active'], resume);
      await queryClient.invalidateQueries({ queryKey: [RESUME_KEY] });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/resumes/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [RESUME_KEY] }),
  });
}
