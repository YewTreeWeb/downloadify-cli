oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g downloadify-cli
$ downloadify COMMAND
running command...
$ downloadify (--version)
downloadify-cli/0.0.0 darwin-x64 node-v19.3.0
$ downloadify --help [COMMAND]
USAGE
  $ downloadify COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`downloadify hello PERSON`](#downloadify-hello-person)
* [`downloadify hello world`](#downloadify-hello-world)
* [`downloadify help [COMMANDS]`](#downloadify-help-commands)
* [`downloadify plugins`](#downloadify-plugins)
* [`downloadify plugins:install PLUGIN...`](#downloadify-pluginsinstall-plugin)
* [`downloadify plugins:inspect PLUGIN...`](#downloadify-pluginsinspect-plugin)
* [`downloadify plugins:install PLUGIN...`](#downloadify-pluginsinstall-plugin-1)
* [`downloadify plugins:link PLUGIN`](#downloadify-pluginslink-plugin)
* [`downloadify plugins:uninstall PLUGIN...`](#downloadify-pluginsuninstall-plugin)
* [`downloadify plugins:uninstall PLUGIN...`](#downloadify-pluginsuninstall-plugin-1)
* [`downloadify plugins:uninstall PLUGIN...`](#downloadify-pluginsuninstall-plugin-2)
* [`downloadify plugins update`](#downloadify-plugins-update)

## `downloadify hello PERSON`

Say hello

```
USAGE
  $ downloadify hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/YewTreeWeb/downloadify-cli/blob/v0.0.0/dist/commands/hello/index.ts)_

## `downloadify hello world`

Say hello world

```
USAGE
  $ downloadify hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ downloadify hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [dist/commands/hello/world.ts](https://github.com/YewTreeWeb/downloadify-cli/blob/v0.0.0/dist/commands/hello/world.ts)_

## `downloadify help [COMMANDS]`

Display help for downloadify.

```
USAGE
  $ downloadify help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for downloadify.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.17/src/commands/help.ts)_

## `downloadify plugins`

List installed plugins.

```
USAGE
  $ downloadify plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ downloadify plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.3.0/src/commands/plugins/index.ts)_

## `downloadify plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ downloadify plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ downloadify plugins add

EXAMPLES
  $ downloadify plugins:install myplugin 

  $ downloadify plugins:install https://github.com/someuser/someplugin

  $ downloadify plugins:install someuser/someplugin
```

## `downloadify plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ downloadify plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ downloadify plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.3.0/src/commands/plugins/inspect.ts)_

## `downloadify plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ downloadify plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ downloadify plugins add

EXAMPLES
  $ downloadify plugins:install myplugin 

  $ downloadify plugins:install https://github.com/someuser/someplugin

  $ downloadify plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.3.0/src/commands/plugins/install.ts)_

## `downloadify plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ downloadify plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ downloadify plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.3.0/src/commands/plugins/link.ts)_

## `downloadify plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ downloadify plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ downloadify plugins unlink
  $ downloadify plugins remove
```

## `downloadify plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ downloadify plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ downloadify plugins unlink
  $ downloadify plugins remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.3.0/src/commands/plugins/uninstall.ts)_

## `downloadify plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ downloadify plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ downloadify plugins unlink
  $ downloadify plugins remove
```

## `downloadify plugins update`

Update installed plugins.

```
USAGE
  $ downloadify plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.3.0/src/commands/plugins/update.ts)_
<!-- commandsstop -->
