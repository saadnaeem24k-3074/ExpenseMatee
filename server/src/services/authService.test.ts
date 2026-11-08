import { describe, it, expect, beforeEach } from "vitest";
import {
  AuthService,
  DEFAULT_BASE_CURRENCY,
  MIN_PASSWORD_LENGTH,
  type PasswordHasher,
} from "./authService.js";
import type { IAuthRepository } from "../repositories/authRepository.js";
import type { NewUser, PublicUser, UserRecord } from "../types/user.js";
import { ConflictError, UnauthorizedError, ValidationError } from "../errors/appError.js";

class FakeAuthRepository implements IAuthRepository {
  private readonly users = new Map<string, UserRecord>();
  private sequence = 0;

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.users.get(email) ?? null;
  }

  async findPublicById(userId: string): Promise<PublicUser | null> {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return this.toPublic(user);
      }
    }
    return null;
  }

  async create(data: NewUser): Promise<PublicUser> {
    this.sequence++;
    const user: UserRecord = {
      id: `user-${this.sequence}`,
      name: data.name,
      email: data.email,
      password_hash: data.passwordHash,
      base_currency: data.baseCurrency,
    };
    this.users.set(user.email, user);
    return this.toPublic(user);
  }

  async updateBaseCurrency(userId: string, baseCurrency: string): Promise<PublicUser | null> {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        user.base_currency = baseCurrency;
        return this.toPublic(user);
      }
    }
    return null;
  }

  private toPublic(user: UserRecord): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      base_currency: user.base_currency,
    };
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

const validSignup = {
  name: "Alice",
  email: "alice@example.com",
  password: "password123",
};

describe("AuthService", () => {
  let repo: FakeAuthRepository;
  let service: AuthService;

  beforeEach(() => {
    repo = new FakeAuthRepository();
    service = new AuthService(repo, new FakePasswordHasher());
  });

  describe("signup", () => {
    it("creates a user with a hashed password and defaults to PKR", async () => {
      const user = await service.signup(validSignup);

      expect(user).toEqual({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
        base_currency: DEFAULT_BASE_CURRENCY,
      });
      const stored = await repo.findByEmail("alice@example.com");
      expect(stored?.password_hash).toBe("hashed:password123");
      expect(stored?.password_hash).not.toBe(validSignup.password);
    });

    it("normalises the email and honours a supplied base currency", async () => {
      const user = await service.signup({
        ...validSignup,
        email: "  Alice@Example.COM ",
        base_currency: "USD",
      });

      expect(user.email).toBe("alice@example.com");
      expect(user.base_currency).toBe("USD");
    });

    it("accepts a password exactly at the minimum length", async () => {
      const password = "a".repeat(MIN_PASSWORD_LENGTH);
      const user = await service.signup({ ...validSignup, password });
      expect(user.email).toBe("alice@example.com");
    });

    it("rejects missing required fields", async () => {
      await expect(service.signup({ email: "a@b.com" })).rejects.toThrow(
        new ValidationError("Name, email, and password are required.")
      );
    });

    it("rejects a password below the minimum length", async () => {
      const password = "a".repeat(MIN_PASSWORD_LENGTH - 1);
      await expect(service.signup({ ...validSignup, password })).rejects.toThrow(
        "Password must be at least 8 characters."
      );
    });

    it("rejects a non-string password", async () => {
      await expect(service.signup({ ...validSignup, password: 12345678 })).rejects.toThrow(
        "Password must be at least 8 characters."
      );
    });

    it("rejects a duplicate email", async () => {
      await service.signup(validSignup);
      await expect(service.signup(validSignup)).rejects.toThrow(ConflictError);
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await service.signup(validSignup);
    });

    it("returns the public user for the correct password", async () => {
      const user = await service.login({
        email: " ALICE@example.com ",
        password: "password123",
      });

      expect(user).toEqual({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
        base_currency: "PKR",
      });
      expect(user).not.toHaveProperty("password_hash");
    });

    it("rejects a wrong password with the generic message", async () => {
      await expect(
        service.login({ email: "alice@example.com", password: "wrong-password" })
      ).rejects.toThrow("Invalid email or password.");
    });

    it("rejects an unknown email with the generic message", async () => {
      await expect(
        service.login({ email: "nobody@example.com", password: "password123" })
      ).rejects.toThrow("Invalid email or password.");
    });

    it("rejects missing credentials", async () => {
      await expect(service.login({ email: "alice@example.com" })).rejects.toThrow(
        "Email and password are required."
      );
    });
  });

  describe("profile", () => {
    it("returns the current user by id", async () => {
      const created = await service.signup(validSignup);
      const user = await service.getCurrentUser(created.id);
      expect(user.email).toBe("alice@example.com");
    });

    it("rejects an unknown user id as unauthenticated", async () => {
      await expect(service.getCurrentUser("missing")).rejects.toThrow(UnauthorizedError);
    });

    it("updates the base currency", async () => {
      const created = await service.signup(validSignup);
      const user = await service.updateBaseCurrency(created.id, "GBP");
      expect(user.base_currency).toBe("GBP");
    });

    it("rejects a missing or non-string base currency", async () => {
      const created = await service.signup(validSignup);
      await expect(service.updateBaseCurrency(created.id, "")).rejects.toThrow(
        "base_currency is required."
      );
      await expect(service.updateBaseCurrency(created.id, 42)).rejects.toThrow(
        "base_currency is required."
      );
    });
  });
});
