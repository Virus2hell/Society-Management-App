// Loads data from the API when the screen is opened (focused) and
// optionally keeps refreshing it every `pollMs` milliseconds.
//
//   const { data, loading, refreshing, error, refresh } = useApi('/bills');
//
// It reloads automatically when the user switches to another society.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useApi(path, { params, pollMs, initial = null } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const paramsKey = JSON.stringify(params || {});
  const mounted = useRef(true);
  const societyId = useAuth().activeMembership?.societyId;

  const load = useCallback(async (mode = 'silent') => {
    if (mode === 'pull') setRefreshing(true);
    try {
      const res = await api.get(path, { params: JSON.parse(paramsKey) });
      if (mounted.current) {
        setData(res.data);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError(errorMessage(e));
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [path, paramsKey, societyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      load();
      const timer = pollMs ? setInterval(load, pollMs) : null;
      return () => {
        mounted.current = false;
        if (timer) clearInterval(timer);
      };
    }, [load, pollMs])
  );

  const refresh = useCallback(() => load('pull'), [load]);
  return { data, setData, loading, refreshing, error, refresh, reload: load };
}
