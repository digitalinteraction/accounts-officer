import { checkEnvObject, pluck } from 'valid-env'

/** The app environment */
export type EnvRecord = ReturnType<typeof loadEnv>

/** Load in the environment and validate it against the type */
export function loadEnv(base = process.env) {
  const NODE_ENV = base.NODE_ENV ?? 'production'

  return checkEnvObject({
    ...pluck(
      base,
      'AIRTABLE_API_KEY',
      'DO_API_KEY',
      'GODADDY_API_KEY',
      'GODADDY_API_SECRET',
      'SENDGRID_API_KEY'
    ),
    NODE_ENV,
  })
}

/** The typed app environment */
export const env = loadEnv()
