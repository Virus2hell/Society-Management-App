// Axios instance used by every screen. It adds the login token to each
// request and turns server errors into a readable message.
import axios from 'axios';
import { API_URL } from './config';

let authToken = null;
let societyId = null; // the society the user is currently inside
let onUnauthorized = null;
let onNotMember = null;

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  // Free hosting (Render) sleeps after 15 min idle and needs ~50s to wake up
  timeout: 60000,
});

export function setAuthToken(token) {
  authToken = token;
}

// Every society-scoped request sends "X-Society-Id" so the API knows
// which society's data to return (and checks we are a member).
export function setSocietyId(id) {
  societyId = id || null;
}

// AuthContext registers callbacks: log out when the token expires,
// refresh memberships when we were removed from a society.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}
export function setNotMemberHandler(handler) {
  onNotMember = handler;
}

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  if (societyId) config.headers['X-Society-Id'] = String(societyId);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log out if the rejected request used the CURRENT token
    // (an old request that finishes late must not log out a fresh session)
    const sentToken = error.config?.headers?.Authorization;
    if (error.response?.status === 401 && authToken && sentToken === `Bearer ${authToken}` && onUnauthorized) {
      onUnauthorized();
    }
    if (error.response?.data?.code === 'NOT_MEMBER' && onNotMember) onNotMember();
    return Promise.reject(error);
  }
);

// Use in catch blocks: Alert.alert('Error', errorMessage(e))
export function errorMessage(error) {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.status >= 500) return 'Server error. Please try again.';
  if (error?.code === 'ECONNABORTED') return 'Server took too long to respond. If it was asleep, try again in a few seconds.';
  if (error?.message === 'Network Error') {
    return `Cannot reach the server at ${API_URL}. Is the backend running and is your phone on the same Wi-Fi?`;
  }
  return error?.message || 'Something went wrong';
}

// File upload (complaint photo). Uses fetch because it handles
// React Native FormData more reliably than axios.
export async function uploadForm(path, formData) {
  const response = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(societyId ? { 'X-Society-Id': String(societyId) } : {}),
    },
    body: formData,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body.message || 'Upload failed');
    err.response = { data: body, status: response.status };
    throw err;
  }
  return body;
}
