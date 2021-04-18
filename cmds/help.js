const menus = {
  main: `
    aptugo [command] <options>

    build .............. builds an application
    config ............. setup Aptugo
    new ................ create a new application
    remove ............. removes an application
    version ............ show package version
    help ............... show help menu for a command`,

  config: `
    aptugo config <options>

    --view, -v ......... view current configured settings
  `,

  new: `
    aptugo new [application name] <options>

    --location, -l ..... the location to use`,

  build: `
    aptugo build [application name] <options>

    --clean ............ clean the Build folder before build (default: false)
    --skip ............. comma separated list of skip options (copy, pages, post)
  `
}

module.exports = (args) => {
  const subCmd = args._[0] === 'help'
    ? args._[1]
    : args._[0]

  console.log(menus[subCmd] || menus.main)
}
