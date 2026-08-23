import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '../services/api';
import type { DashboardAnalytics } from '@repo/shared';

export function useDashboardAnalytics() {
  return useQuery<DashboardAnalytics>({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardAnalytics>>('/api/analytics/dashboard');
      return data.data!;
    },
  });
}
