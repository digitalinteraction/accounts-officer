import fs from 'fs'
import { object, string, Infer, assert } from 'superstruct'

/** A structure to validate and type a config for the app */
const AppConfigStruct = object({
  base: string(),

  tables: object({
    aws: string(),
    do: string(),
    godaddy: string(),
    sendgrid: string(),
  }),
})

/** A config for the app */
export type AppConfig = Infer<typeof AppConfigStruct>

/** Read in a config from the root of the project and assert it's structure */
export function readConfig(): AppConfig {
  try {
    const file = fs.readFileSync('config.json', 'utf8')
    const json = JSON.parse(file)

    assert(json, AppConfigStruct)

    return json
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

/** Read in the app config and expose as a singleton */
export const appConfig = readConfig()
