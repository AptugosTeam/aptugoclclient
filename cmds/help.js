const menus = {
  main: `
    aptugo [command] <options>

    build .............. builds an application
    config ............. setup Aptugo
    new ................ create a new application
    model .............. allows you to create models/entities
    remove ............. removes an application
    renderer ........... functions related with rendering options into code
    templates .......... permits interaction with templates
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
  `,

  model: `
    aptugo model [entity name] [single entity name] <options>
  `,

  templates: `
    aptugo templates list <options> ........ returns a list of all available templates

    --extended ......... results get table formated
    --raw .............. results in JSON format

    aptugo templates setoption <options> ... sets an option for a template

    --template ......... the ID of the template to set the option for
    --optionName ....... the name of the option
    --optionValue ...... the valur of the option

    aptugo templates setfield <options> .... set a field type for the template

    --template ......... the ID of the template to set the field for
    --name ............. the name of the field
  `,

  renderer: `
    aptugo renderer <options>
  `
}

module.exports = (args) => {
  const subCmd = args._[0] === 'help'
    ? args._[1]
    : args._[0]

  console.log(menus[subCmd] || menus.main)
}
