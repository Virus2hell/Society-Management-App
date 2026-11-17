// Polls /api/notifications every few seconds while logged in.
// New items are shown as phone notifications (unless real push is
// working) and counted for the bell badge in the header.
// Tapping a notification switches to the right society and opens the screen.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { Notifications, registerForPush, setupNotifications, showLocalNotification } from '../utils/notifications';

const POLL_MS = 6000;
const NotificationContext = createContext(null);

// Turns the "url" the server sent into a real screen for the given role
function resolveUrl(url, role) {
  if (!url || url === '/') return `/${role}`;
  if (url === '/notices') return `/${role}/notices`;
  return url;
}

export function NotificationProvider({ children }) {
  const { user, memberships, refresh, selectSociety } = useAuth();
  const [items, setItems] = useState([]);
  const lastIdRef = useRef(0);
  const hasRemotePushRef = useRef(false);
  const firstLoadRef = useRef(true);
  const membershipsRef = useRef(memberships);
  membershipsRef.current = memberships;

  // Open the screen a notification points to
  const openNotification = useCallback(async (data = {}) => {
    let list = membershipsRef.current;
    if (data.type === 'membership' || data.type === 'join_request') {
      list = await refresh().catch(() => list);
    }
    const target = list.find((m) => m.societyId === data.societyId && m.status === 'approved');
    if (!target) {
      router.push('/societies'); // e.g. request rejected, or removed
      return;
    }
    await selectSociety(target.societyId);
    router.push(resolveUrl(data.url, target.role));
  }, [refresh, selectSociety]);

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { after: lastIdRef.current } });
      if (!data.length) return;
      lastIdRef.current = Math.max(lastIdRef.current, ...data.map((n) => n.id));
      setItems((prev) => {
        const known = new Set(prev.map((n) => n.id));
        return [...data.filter((n) => !known.has(n.id)), ...prev].slice(0, 50);
      });
      if (!firstLoadRef.current) {
        // Approved / removed: reload memberships so the app updates by itself
        if (data.some((n) => n.data?.type === 'membership')) refresh().catch(() => {});
        if (!hasRemotePushRef.current) {
          data.filter((n) => !n.read).slice(0, 3).forEach((n) => showLocalNotification(n.title, n.body, n.data));
        }
      }
    } catch {
      // network hiccup: try again next tick
    } finally {
      firstLoadRef.current = false;
    }
  }, [refresh]);

  // Start/stop polling when the user logs in/out
  useEffect(() => {
    if (!user) {
      setItems([]);
      lastIdRef.current = 0;
      firstLoadRef.current = true;
      hasRemotePushRef.current = false;
      return;
    }
    (async () => {
      const allowed = await setupNotifications();
      if (allowed) {
        const token = await registerForPush();
        if (token) {
          hasRemotePushRef.current = true;
          api.put('/auth/push-token', { token }).catch(() => {});
        }
      }
    })();
    poll();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') poll();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [user?.id, poll]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tapping a phone notification
  useEffect(() => {
    if (!user) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification.request.content.data || {});
    });
    return () => sub.remove();
  }, [user?.id, openNotification]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.post('/notifications/read-all');
    } catch {}
  }, []);

  const unread = items.filter((n) => !n.read).length;
  return (
    <NotificationContext.Provider value={{ items, unread, markAllRead, openNotification, refresh: poll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
