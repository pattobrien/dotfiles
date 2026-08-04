/**
 * Browser addon entry for rendered-pixel graphics tests: the complete
 * ImageAddon (DOM renderer + kitty handler) bundled as an IIFE global for
 * the dotfiles e2e suite (see tests/e2e/vendor/xterm-master there). The
 * matching Terminal IIFE is bundled from src/browser/public/Terminal.ts.
 */

export { ImageAddon } from './ImageAddon';
