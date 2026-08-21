// Stub database client. Replace with @vercel/postgres, neon, or supabase-js when deploying.
// Set DATABASE_URL in .env.local and install the appropriate client package.

export async function query<T>(_sql: string, _params?: unknown[]): Promise<T[]> {
  throw new Error(
    'Database not configured. Set DATABASE_URL in .env.local and install a DB client.'
  );
}
