export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  base_currency: string;
  created_at?: string | Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  base_currency: string;
  created_at?: string | Date;
}

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  baseCurrency: string;
}

export interface SignupInput {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  base_currency?: unknown;
}

export interface LoginInput {
  email?: unknown;
  password?: unknown;
}
