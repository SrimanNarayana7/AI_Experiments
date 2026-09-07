import { useQuery } from '@tanstack/react-query';

async function fetchProjects(): Promise<{ projects: string[] }> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
}
