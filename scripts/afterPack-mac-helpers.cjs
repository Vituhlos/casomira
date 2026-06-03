/**
 * Workaround: electron-builder #9771 — macOS 26 arm64 SIGTRAP (exit 133)
 * https://github.com/electron-userland/electron-builder/issues/9771
 *
 * electron-builder přejmenuje Helper .app na "{productName} Helper", ale hlavní
 * Electron binárka zůstane neupravená a hledá "Electron Helper.app".
 * Přejmenujeme Helpers zpět na původní názvy.
 */
const fs = require('fs')
const path = require('path')

/** @param {import('app-builder-lib').AfterPackContext} context */
exports.default = async function afterPackMacHelpers(context) {
  const { appOutDir, packager } = context
  if (packager.platform.name !== 'mac') return

  const product = packager.appInfo.productFilename
  const frameworksDir = path.join(appOutDir, `${product}.app`, 'Contents', 'Frameworks')
  const suffixes = ['', ' (GPU)', ' (Plugin)', ' (Renderer)']

  for (const suffix of suffixes) {
    const src = path.join(frameworksDir, `${product} Helper${suffix}.app`)
    const dst = path.join(frameworksDir, `Electron Helper${suffix}.app`)
    if (!fs.existsSync(src) || fs.existsSync(dst)) continue

    fs.renameSync(src, dst)

    const macOSDir = path.join(dst, 'Contents', 'MacOS')
    const oldBin = path.join(macOSDir, `${product} Helper${suffix}`)
    const newBin = path.join(macOSDir, `Electron Helper${suffix}`)
    if (fs.existsSync(oldBin)) fs.renameSync(oldBin, newBin)
  }
}
