import bcrypt from "bcryptjs";
import type { IAuthRepository } from "../repositories/authRepository.js";
import { AuthRepository } from "../repositories/authRepository.js";
import { ConflictError, UnauthorizedError, ValidationError } from "../errors/appError.js";
import type {
  LoginInput,
  PublicUser,
  SignupInput,
  UserRecord,
} from "../types/user.js";

export const MIN_PASSWORD_LENGTH = 8;
export const DEFAULT_BASE_CURRENCY = "PKR";
export const DEFAULT_BCRYPT_ROUNDS = 12;

const SIGNUP_REQUIRED_MESSAGE = "Name, email, and password are required.";
const PASSWORD_TOO_SHORT_MESSAGE = "Password must be at least 8 characters.";
const EMAIL_TAKEN_MESSAGE = "An account with that email already exists.";
const LOGIN_REQUIRED_MESSAGE = "Email and password are required.";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
const NOT_AUTHENTICATED_MESSAGE = "Not authenticated";
const BASE_CURRENCY_REQUIRED_MESSAGE = "base_currency is required.";

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number = DEFAULT_BCRYPT_ROUNDS) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

export class AuthService {
  constructor(
    private readonly repo: IAuthRepository = new AuthRepository(),
    private readonly hasher: PasswordHasher = new BcryptPasswordHasher()
  ) {}

  async signup(input: SignupInput): Promise<PublicUser> {
    const { name, email, password } = input ?? {};

    if (!name || !email || !password) {
      throw new ValidationError(SIGNUP_REQUIRED_MESSAGE);
    }
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(PASSWORD_TOO_SHORT_MESSAGE);
    }

    const normalizedEmail = this.normalizeEmail(email);
    if (await this.repo.findByEmail(normalizedEmail)) {
      throw new ConflictError(EMAIL_TAKEN_MESSAGE);
    }

    const passwordHash = await this.hasher.hash(password);
    const baseCurrency = this.resolveBaseCurrency(input.base_currency);

    return this.repo.create({
      name: String(name),
      email: normalizedEmail,
      passwordHash,
      baseCurrency,
    });
  }

  async login(input: LoginInput): Promise<PublicUser> {
    const { email, password } = input ?? {};

    if (!email || !password) {
      throw new ValidationError(LOGIN_REQUIRED_MESSAGE);
    }

    const user = await this.repo.findByEmail(this.normalizeEmail(email));
    if (!user) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await this.hasher.compare(String(password), user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.toPublicUser(user);
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.repo.findPublicById(userId);
    if (!user) {
      throw new UnauthorizedError(NOT_AUTHENTICATED_MESSAGE);
    }
    return user;
  }

  async updateBaseCurrency(userId: string, baseCurrency: unknown): Promise<PublicUser> {
    if (!baseCurrency || typeof baseCurrency !== "string") {
      throw new ValidationError(BASE_CURRENCY_REQUIRED_MESSAGE);
    }

    const user = await this.repo.updateBaseCurrency(userId, baseCurrency);
    if (!user) {
      throw new UnauthorizedError(NOT_AUTHENTICATED_MESSAGE);
    }
    return user;
  }

  private normalizeEmail(email: unknown): string {
    return String(email).trim().toLowerCase();
  }

  private resolveBaseCurrency(value: unknown): string {
    return typeof value === "string" ? value : DEFAULT_BASE_CURRENCY;
  }

  private toPublicUser(user: UserRecord): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      base_currency: user.base_currency,
    };
  }
}
