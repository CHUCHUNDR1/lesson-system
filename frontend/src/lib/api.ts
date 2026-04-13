import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

export const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});
