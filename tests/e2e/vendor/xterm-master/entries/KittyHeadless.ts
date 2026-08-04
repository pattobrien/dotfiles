/**
 * Headless entry for the kitty graphics MVP: exposes the protocol handler and
 * storage classes without the DOM-bound ImageAddon wiring. Bundled for the
 * dotfiles e2e suite (see tests/e2e/vendor/README.md there).
 */

export { KittyGraphicsHandler } from './kitty/KittyGraphicsHandler';
export { KittyImageStorage } from './kitty/KittyImageStorage';
export { parseKittyCommand } from './kitty/KittyGraphicsTypes';
export type { IKittyCommand, IKittyImageData } from './kitty/KittyGraphicsTypes';
export type { IImageAddonOptions } from './Types';
