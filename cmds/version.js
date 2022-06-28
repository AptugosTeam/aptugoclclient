import pkg from '../package.json' assert { type: "json" }

export default (args) => {
  return `v${pkg.version}`
}
