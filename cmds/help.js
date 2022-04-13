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
    structures ......... permits interaction with structures
    version ............ show package version
    help ............... show help menu for a command`,

  config: `
    aptugo config <options>

    set ................ sets a config value
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
    aptugo templates [command]

    list ............... returns a list of the available templates
    version ............ displays the current version of your templates
    
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

  structures: `
    aptugo structures [command]

    list ............... returns a list of the available structures

    aptugo structures list <options> ........ returns a list of all available structures

    --raw .............. results in JSON format
    --pipe ............. stringifies the result

    aptugo structures icon <options> ........ returns the Base64 encoded icon for the structure

    --structure ........ the ID of the structure to retrieve the icon from
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
