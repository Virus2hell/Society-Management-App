// Who is logged in, and which society they are currently "inside".
//
//   user             -> the account (name, email)
//   memberships      -> every society the user created / joined / asked to join,
//                       each with role (secretary | resident | watchman), flat and
//                       status (pending | approved | rejected | removed)
//   activeMembership -> the approved membership the app is showing right now
//
// Any screen can call useAuth() to read these or call login / signup /
// logout / refresh / selectSociety.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setAuthToken, setNotMemberHandler, setSocietyId, setUnauthorizedHandler } from '../api/client';
import { deleteItem, getItem, saveItem } from '../utils/storage';

const TOKEN_KEY = 'society_auth_token';
const SOCIETY_KEY = 'society_active_id';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [chosenSocietyId, setChosenSocietyId] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check the saved token

  const approved = memberships.filter((m) => m.status === 'approved');

  // The society we are inside: the one the user picked, or automatically
  // the only one if they belong to exactly one society.
  const activeMembership =
    approved.find((m) => m.societyId === chosenSocietyId) || (approved.length === 1 ? approved[0] : null);

  // Keep the API header in sync right away (before child screens fetch data)
  setSocietyId(activeMembership?.societyId);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setSocietyId(null);
    setUser(null);
    setMemberships([]);
    setChosenSocietyId(null);
    await deleteItem(TOKEN_KEY);
    await deleteItem(SOCIETY_KEY);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.put('/auth/push-token', { token: null });
    } catch {}
    await clearSession();
  }, [clearSession]);

  // Reload user + memberships (after joining, approval, removal...)
  const refresh = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    setMemberships(data.memberships);
    return data.memberships;
  }, []);

  // On app start: restore saved login + last opened society.
  // The ref makes sure this runs once (React runs effects twice in dev mode).
  const restoredRef = useRef(false);
  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
    setNotMemberHandler(() => refresh().catch(() => {}));
    if (restoredRef.current) return;
    restoredRef.current = true;
    (async () => {
      try {
        const token = await getItem(TOKEN_KEY);
        const savedSociety = await getItem(SOCIETY_KEY);
        if (savedSociety) setChosenSocietyId(Number(savedSociety));
        if (token) {
          setAuthToken(token);
          await refresh();
        }
      } catch (e) {
        // Token rejected -> log out. Network problem -> keep the token so the
        // user is not logged out just because the server was unreachable.
        if (e.response?.status === 401) await clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearSession, refresh]);

  const startSession = useCallback(async (data) => {
    setAuthToken(data.token);
    await saveItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setMemberships(data.memberships || []);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await startSession(data);
  }, [startSession]);

  const signup = useCallback(async (form) => {
    const { data } = await api.post('/auth/signup', form);
    await startSession(data);
  }, [startSession]);

  // Enter a society (used by the "My societies" screen)
  const selectSociety = useCallback(async (societyId) => {
    setSocietyId(societyId);
    setChosenSocietyId(societyId);
    await saveItem(SOCIETY_KEY, String(societyId));
  }, []);

  const value = useMemo(
    () => ({ user, memberships, activeMembership, loading, login, signup, logout, refresh, selectSociety }),
    [user, memberships, activeMembership, loading, login, signup, logout, refresh, selectSociety]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
