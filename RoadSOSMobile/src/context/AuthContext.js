import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);
const STORAGE_KEY = '@roadsos_auth';

export const AuthProvider = ({children}) => {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed.user);
          setToken(parsed.token);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const login = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({user: userData, token: authToken}))
      .catch(err => console.warn('[Auth] persist error:', err.message));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = {...prev, ...updates};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({user: updated, token}))
        .catch(() => {});
      return updated;
    });
  }, [token]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      userId:    user?._id ?? null,
      isLoggedIn: !!user,
      ready,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
