/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `attach` command */
  export type Attach = ExtensionPreferences & {}
  /** Preferences accessible in the `switch` command */
  export type Switch = ExtensionPreferences & {}
  /** Preferences accessible in the `remove` command */
  export type Remove = ExtensionPreferences & {}
  /** Preferences accessible in the `projects` command */
  export type Projects = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `attach` command */
  export type Attach = {
  /** Working directory */
  "cwd": string
}
  /** Arguments passed to the `switch` command */
  export type Switch = {
  /** Working directory */
  "cwd": string
}
  /** Arguments passed to the `remove` command */
  export type Remove = {
  /** Working directory */
  "cwd": string
}
  /** Arguments passed to the `projects` command */
  export type Projects = {}
}

