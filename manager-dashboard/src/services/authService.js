import api from './api.js';

export async function login(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password });
  return data.data; // { token, user }
}

export async function getMe() {
  const { data } = await api.get('/api/auth/me');
  return data.data;
}
