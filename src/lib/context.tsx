import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Command, Workspace } from './types';
import { repository, isDemo, supabase } from './repository';
import { errorText } from './utils';

type Context = {
  data: Workspace | null;
  loading: boolean;
  authenticated: boolean;
  activeStore: string;
  setActiveStore: (id: string) => void;
  refresh: () => Promise<void>;
  run: (command: Command, message?: string) => Promise<Workspace>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  toast: (message: string, error?: boolean) => void;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeStore, setActiveStoreState] = useState('all');
  const [notification, setNotification] = useState<{ message: string; error: boolean } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((message: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setNotification({ message, error });
    timer.current = setTimeout(() => setNotification(null), 5000);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const auth = await repository.session();
      setAuthenticated(auth);
      setData(auth ? await repository.load() : null);
    } catch (e) {
      toast(errorText(e), true);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => {
    void refresh();
    const update = () => void refresh();
    window.addEventListener('storage', update);
    window.addEventListener('kiosku-update', update);
    const sub = supabase?.auth.onAuthStateChange(() => {
      setTimeout(update, 0);
    });
    const channel =
      !isDemo && supabase
        ? supabase
            .channel('merchant-updates')
            .on('postgres_changes', { event: '*', schema: 'public' }, update)
            .subscribe()
        : null;
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('kiosku-update', update);
      sub?.data.subscription.unsubscribe();
      if (channel) void supabase?.removeChannel(channel);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);
  const run = useCallback(
    async (command: Command, message = 'Perubahan tersimpan.') => {
      try {
        const result = await repository.command(command);
        setData(result);
        if (message) toast(message);
        return result;
      } catch (e) {
        toast(errorText(e), true);
        throw e;
      }
    },
    [toast],
  );
  const setActiveStore = (id: string) => setActiveStoreState(id);
  return (
    <AppContext.Provider
      value={{
        data,
        loading,
        authenticated,
        activeStore,
        setActiveStore,
        refresh,
        run,
        toast,
        loginDemo: async () => {
          await repository.demoLogin();
          await refresh();
        },
        logout: async () => {
          await repository.signOut();
          setActiveStore('all');
          await refresh();
        },
      }}
    >
      {children}
      {notification && (
        <div
          className={`toast ${notification.error ? 'error' : ''}`}
          role={notification.error ? 'alert' : 'status'}
        >
          <span>{notification.message}</span>
          <button aria-label="Tutup pemberitahuan" onClick={() => setNotification(null)}>
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider diperlukan.');
  return value;
}
