/**
 * Secure JWT secret configuration provider.
 * Prevents insecure string fallbacks in production.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be defined in production.');
    }
    return 'dev_only_jwt_secret_never_use_in_production_32char';
  }
  return secret;
};
