import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Serviço de criptografia AES-256-GCM para credenciais do Studus
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly SALT_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Gera uma chave derivada da senha usando scrypt
   */
  private static deriveKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, 32);
  }

  /**
   * Criptografa um texto usando AES-256-GCM
   * @param text Texto a ser criptografado (senha do Studus)
   * @param masterPassword Senha mestre (do ambiente)
   * @returns Objeto criptografado com salt, iv, tag e dados
   */
  static encrypt(text: string, masterPassword: string): string {
    const salt = randomBytes(this.SALT_LENGTH);
    const iv = randomBytes(this.IV_LENGTH);
    const key = this.deriveKey(masterPassword, salt);

    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combinar tudo: salt:iv:tag:encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);

    return combined.toString('base64');
  }

  /**
   * Descriptografa um texto usando AES-256-GCM
   * @param encryptedData Dado criptografado (base64)
   * @param masterPassword Senha mestre (do ambiente)
   * @returns Texto descriptografado
   */
  static decrypt(encryptedData: string, masterPassword: string): string {
    const combined = Buffer.from(encryptedData, 'base64');

    // Extrair componentes
    const salt = combined.subarray(0, this.SALT_LENGTH);
    const iv = combined.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    const tag = combined.subarray(
      this.SALT_LENGTH + this.IV_LENGTH,
      this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH
    );
    const encrypted = combined.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);

    const key = this.deriveKey(masterPassword, salt);

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Verifica se um texto parece estar criptografado
   * @param text Texto para verificar
   * @returns true se parece estar criptografado (base64 válido)
   */
  static isEncrypted(text: string): boolean {
    if (!text) return false;

    try {
      const buffered = Buffer.from(text, 'base64');
      return buffered.length >= this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH;
    } catch {
      return false;
    }
  }
}