import { useEffect, useState, type ReactNode } from "react";
import { api, type User } from "./api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { user } = await api.auth.login(email, password);
    setUser(user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const { user } = await api.auth.signup(name, email, password);
    setUser(user);
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const updateBaseCurrency = async (base_currency: string) => {
    const { user } = await api.auth.updateCurrency(base_currency);
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateBaseCurrency }}>
      {children}
    </AuthContext.Provider>
  );
}
