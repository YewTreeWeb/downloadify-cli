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
* [`downloadify crunchyroll URL`](#downloadify-crunchyroll-url)
* [`downloadify help [COMMANDS]`](#downloadify-help-commands)
* [`downloadify hidive URL`](#downloadify-hidive-url)
* [`downloadify iplayer PID`](#downloadify-iplayer-pid)
* [`downloadify other URL`](#downloadify-other-url)
* [`downloadify plugins`](#downloadify-plugins)
* [`downloadify plugins:install PLUGIN...`](#downloadify-pluginsinstall-plugin)
* [`downloadify plugins:inspect PLUGIN...`](#downloadify-pluginsinspect-plugin)
* [`downloadify plugins:install PLUGIN...`](#downloadify-pluginsinstall-plugin-1)
* [`downloadify plugins:link PLUGIN`](#downloadify-pluginslink-plugin)
* [`downloadify plugins:uninstall PLUGIN...`](#downloadify-pluginsuninstall-plugin)
* [`downloadify plugins:uninstall PLUGIN...`](#downloadify-pluginsuninstall-plugin-1)
* [`downloadify plugins:uninstall PLUGIN...`](#downloadify-pluginsuninstall-plugin-2)
* [`downloadify plugins update`](#downloadify-plugins-update)
* [`downloadify youtube URL`](#downloadify-youtube-url)

## `downloadify crunchyroll URL`

The crunchyroll command gives the user the ability to download videos from the Crunchyroll website.

```
USAGE
  $ downloadify crunchyroll URL [-a] [-f <value>] [-v] [-y]

ARGUMENTS
  URL  The URL of the show you would like to download

FLAGS
  -a, --all_subs        Download all available subtitles
  -f, --filter=<value>  Download a range of episodes e.g. S1-S3,S4E2-S4E6
  -v, --verbose         If you want to include debug information in the output
  -y, --yes             Sometimes different seasons have the same season number, this flag suppresses this interactive
                        prompt and just downloads all seasons

DESCRIPTION
  The crunchyroll command gives the user the ability to download videos from the Crunchyroll website.

EXAMPLES
  $ downloadify crunchyroll https://www.crunchyroll.com/series/GYEXQKJG6/dr-stone
```

_See code: [dist/commands/crunchyroll.ts](https://github.com/YewTreeWeb/downloadify-cli/blob/v0.0.0/dist/commands/crunchyroll.ts)_

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

## `downloadify hidive URL`

hidive commands gives the user the ability to download videos from the HiDive website

```
USAGE
  $ downloadify hidive URL [-s] [-f <value>] [-a] [-v]

ARGUMENTS
  URL  The URl of the videos you want to download

FLAGS
  -a, --all_subs        Download all available subtitles
  -f, --filter=<value>  Download a range of episodes e.g. 1-5
  -s, --season          Would you like to download the entire season
  -v, --verbose         If you want to include debug information in the output

DESCRIPTION
  hidive commands gives the user the ability to download videos from the HiDive website

EXAMPLES
  $ downloadify hidive https://www.hidive.com/stream/the-eminence-in-shadow
```

_See code: [dist/commands/hidive.ts](https://github.com/YewTreeWeb/downloadify-cli/blob/v0.0.0/dist/commands/hidive.ts)_

## `downloadify iplayer PID`

The iplayer command gives the user the ability to download videos from the iPlayer UK website by providing the PID of the show/episode.

```
USAGE
  $ downloadify iplayer PID [-s] [-v] [-d]

ARGUMENTS
  PID  The PID of the videos you want to download. The BBC Programme Identifier can be found in the URL after "episode/"

FLAGS
  -d, --default  Skip the majority of the choices and use predefined settings.
  -s, --season   Would you like to download the entire season
  -v, --verbose  If you want to include debug information in the output

DESCRIPTION
  The iplayer command gives the user the ability to download videos from the iPlayer UK website by providing the PID of
  the show/episode.

EXAMPLES
  $ downloadify iplayer m001rswk
```

_See code: [dist/commands/iplayer.ts](https://github.com/YewTreeWeb/downloadify-cli/blob/v0.0.0/dist/commands/iplayer.ts)_

## `downloadify other URL`

Other command allows for videos to be download from multiple different websites by providing the URL.

```
USAGE
  $ downloadify other URL [-a] [-v] [-d]

ARGUMENTS
  URL  The URl of the videos you want to download

FLAGS
  -a, --all_subs  Download all available subtitles
  -d, --default   Skip the majority of the choices and use predefined settings.
  -v, --verbose   If you want to include debug information in the output

DESCRIPTION
  Other command allows for videos to be download from multiple different websites by providing the URL.

EXAMPLES
  $ downloadify other https://www.dailymotion.com/video/x8k1i6w
```

_See code: [dist/commands/other.ts](https://github.com/YewTreeWeb/downloadify-cli/blob/v0.0.0/dist/commands/other.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.4.0/src/commands/plugins/index.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.4.0/src/commands/plugins/inspect.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.4.0/src/commands/plugins/install.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.4.0/src/commands/plugins/link.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.4.0/src/commands/plugins/uninstall.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.4.0/src/commands/plugins/update.ts)_

## `downloadify youtube URL`

This command allows the user to download videos on YouTube

```
USAGE
  $ downloadify youtube URL [-p] [-v] [-d]

ARGUMENTS
  URL  The URl of the videos you want to download

FLAGS
  -d, --default   Skip the majority of the choices and use predefined settings.
  -p, --playlist  Download the playlist, if the URL refers to a video and a playlist
  -v, --verbose   If you want to include debug information in the output

DESCRIPTION
  This command allows the user to download videos on YouTube

EXAMPLES
  $ downloadify youtube https://www.youtube.com/watch?v=XPo8Z3tzyH0
```

_See code: [dist/commands/youtube.ts](https://github.com/YewTreeWeb/downloadify-cli/blob/v0.0.0/dist/commands/youtube.ts)_
<!-- commandsstop -->
