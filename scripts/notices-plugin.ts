// Vite plugin: writes third-party-notices.json next to the built app, with the name, version,
// license and license text of every npm package whose code ends up in the bundle, plus packages
// that ship native Android code. The in-app Licenses screen reads it.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import type { Plugin } from 'vite'

interface Notice {
  name: string
  version: string
  license: string
  author?: string
  homepage?: string
  text: string
}

/** npm packages that ship native code into the APK rather than JavaScript into the bundle. */
const NATIVE_PACKAGES = ['@capacitor/android']

function packageRoot(file: string): string | null {
  const marker = `${sep}node_modules${sep}`
  const at = file.lastIndexOf(marker)
  if (at === -1) return null
  const rest = file.slice(at + marker.length).split(sep)
  const depth = rest[0].startsWith('@') ? 2 : 1
  return file.slice(0, at + marker.length) + rest.slice(0, depth).join(sep)
}

function readNotice(dir: string): Notice | null {
  const pkgFile = join(dir, 'package.json')
  if (!existsSync(pkgFile)) return null
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
  const licenseFile = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f))
  const author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name
  const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'see text')
  return {
    name: pkg.name,
    version: pkg.version,
    license,
    author,
    homepage: pkg.homepage ?? (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url),
    text: licenseFile ? readFileSync(join(dir, licenseFile), 'utf8').trim() : `${license} (no license file shipped with the package)`,
  }
}

export function thirdPartyNotices(root: string): Plugin {
  return {
    name: 'third-party-notices',
    apply: 'build',
    generateBundle() {
      const roots = new Set<string>()
      for (const id of this.getModuleIds()) {
        const file = id.replace(/^\0/, '').split('?')[0]
        const pkg = packageRoot(file)
        if (pkg) roots.add(pkg)
      }
      for (const name of NATIVE_PACKAGES) roots.add(join(root, 'node_modules', name))

      const byName = new Map<string, Notice>()
      for (const dir of roots) {
        const notice = readNotice(dir)
        // nested helper folders (e.g. .../dist/node_modules) have no name; walk up to the real package
        if (notice?.name) byName.set(`${notice.name}@${notice.version}`, notice)
        else {
          const parent = packageRoot(dirname(dir))
          const fallback = parent ? readNotice(parent) : null
          if (fallback?.name) byName.set(`${fallback.name}@${fallback.version}`, fallback)
        }
      }

      const android = JSON.parse(readFileSync(join(root, 'src/data/android-libraries.json'), 'utf8'))
      const notices = {
        packages: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
        android: { libraries: android, license: 'Apache-2.0', text: readFileSync(join(root, 'licenses/Apache-2.0.txt'), 'utf8').trim() },
      }
      this.emitFile({ type: 'asset', fileName: 'third-party-notices.json', source: JSON.stringify(notices) })
    },
  }
}
