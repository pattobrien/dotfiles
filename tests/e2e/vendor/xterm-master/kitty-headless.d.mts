/**
 * Types for the vendored kitty-graphics bundle (xterm.js master
 * addons/addon-image, headless entry — see README.md).
 *
 * Constructor parameters typed loosely: the real classes take the addon's
 * internal ImageRenderer / ImageStorage / ITerminalExt, which the headless
 * harness replaces with minimal stubs.
 */

export interface IKittyImageData {
  id: number;
  data: Blob;
  width: number;
  height: number;
  format: 24 | 32 | 100;
  compression: string;
}

export interface IKittyCommand {
  action?: string;
  id?: number;
  [key: string]: unknown;
}

export declare class KittyImageStorage {
  constructor(storage: unknown);
  readonly images: ReadonlyMap<number, IKittyImageData>;
  readonly kittyIdToStorageId: ReadonlyMap<number, number>;
  readonly lastImageId: number;
  getImage(kittyId: number): IKittyImageData | undefined;
  reset(): void;
  dispose(): void;
}

/** xterm.js parser IApcHandler — registered via registerApcHandler({ final: "G" }, handler). */
export declare class KittyGraphicsHandler {
  constructor(
    opts: { kittySizeLimit: number; pixelLimit: number },
    renderer: unknown,
    storage: KittyImageStorage,
    terminal: unknown,
  );
  start(): void;
  put(data: Uint32Array, start: number, end: number): void;
  end(success: boolean): boolean | Promise<boolean>;
  reset(): void;
  dispose(): void;
  readonly images: ReadonlyMap<number, IKittyImageData>;
}

export declare function parseKittyCommand(data: string): IKittyCommand;
