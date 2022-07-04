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

    Other options

    --download ......... Downloads standard templates from Aptugo's repository
    --create ........... Creates a new template system
    --delete ........... Deletes an existing template system
    --get .............. Retrieves a template system
    --setfile .......... Updates a file belonging to the template system
    --filesource ....... Retrieves the source for a specific file
  `,

  structures: `
    aptugo structures [command]

    list ............... returns a list of the available structures
    icon ............... returns the Base64 encoded icon for the structure
    run ................ runs a structure

    aptugo structures list <options> ........ returns a list of all available structures

    --raw .............. results in JSON format
    --pipe ............. stringifies the result

    aptugo structures icon <options> ........ returns the Base64 encoded icon for the structure

    --structure ........ the ID of the structure to retrieve the icon from

    aptugo structures run <options> ......... runs a structure
    example: aptugo structures run --structure "New Page" --app by6u6lwoD7bBP0xO --parentPage dZp7PwnX

    --structure ........ the ID of the structure to run
    --app .............. the ID of the APP to run this structure into
    --<any> ............ Structures import parameters and this is the way you set those
  `,

  renderer: `
    aptugo renderer <options>
  `
}

module.exports = (args) => {
  const subCmd = args._[0] === 'help'
    ? args._[1]
    : args._[0]

  return menus[subCmd] || menus.main
}
