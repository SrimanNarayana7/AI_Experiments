import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : 'Request failed';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
