// Lists the Android libraries packed into the release APK, for the in-app license notices.
// Writes src/data/android-libraries.json. Run after changing Android dependencies:
//   node scripts/android-libraries.mjs
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = { ...process.env, JAVA_HOME: process.env.JAVA_HOME ?? `${process.env.HOME}/.local/opt/jdk-21.0.13+9` }
const tree = execFileSync('./gradlew', ['-q', ':app:dependencies', '--configuration', 'releaseRuntimeClasspath'], { cwd: join(root, 'android'), env, encoding: 'utf8' })

// Every library pulled in today is published under Apache-2.0. Fail loudly when a new group shows up,
// so its license gets checked instead of being assumed.
const APACHE = [/^androidx\./, /^org\.jetbrains(\.|$)/, /^org\.jetbrains\.kotlinx?$/, /^com\.google\.guava$/, /^org\.apache\.cordova$/, /^org\.jspecify$/]

const libs = new Map()
for (const m of tree.matchAll(/([\w.-]+):([\w.-]+):([\w.-]+)(?: -> ([\w.-]+))?/g)) {
  const [, group, name, requested, resolved] = m
  libs.set(`${group}:${name}`, { group, name, version: resolved ?? requested })
}
const list = [...libs.values()].sort((a, b) => `${a.group}:${a.name}`.localeCompare(`${b.group}:${b.name}`))
const unknown = list.filter((l) => !APACHE.some((re) => re.test(l.group)))
if (unknown.length) {
  console.error('Unreviewed licenses:', unknown.map((l) => `${l.group}:${l.name}`).join(', '))
  process.exit(1)
}
writeFileSync(join(root, 'src/data/android-libraries.json'), JSON.stringify(list.map((l) => ({ ...l, license: 'Apache-2.0' })), null, 1) + '\n')
console.log(`${list.length} Android libraries, all Apache-2.0`)
