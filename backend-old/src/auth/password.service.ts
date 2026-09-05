import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Spec reference: Section 6 (Authentication - password security).
 * Decision record: docs/decisions/ADR-008-jwt-auth-bcrypt.md
 *
 * This is the only place bcrypt is called directly - every other service
 * goes through this class so the cost factor and algorithm are defined in
 * exactly one place, and so it's straightforward to swap to argon2 later
 * (ADR-008, "What would cause us to reconsider") without touching callers.
 */
@Injectable()
export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, PasswordService.SALT_ROUNDS);
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
