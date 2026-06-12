import { readFileSync } from 'node:fs'

const tag = (process.argv[2] || '').trim()
if (!tag) {
  console.error('Usage: node scripts/check-release.mjs vX.Y.Z[-suffix]')
  process.exit(1)
}

const version = tag.replace(/^v/, '')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const changelog = readFileSync('CHANGELOG.md', 'utf8')

const errors = []
if (pkg.version !== version) {
  errors.push(`package.json version is ${pkg.version}, expected ${version} from tag ${tag}`)
}

const versionEsc = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
if (!new RegExp(`^## \\[${versionEsc}\\]`, 'm').test(changelog)) {
  errors.push(`CHANGELOG.md does not contain a section for [${version}]`)
}

if (errors.length > 0) {
  console.error(errors.map((e) => `- ${e}`).join('\n'))
  process.exit(1)
}

console.log(`release check ok: ${tag}`)
