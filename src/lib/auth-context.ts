import { createContext } from "react";
import type { User } from "./api";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateBaseCurrency: (base_currency: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
