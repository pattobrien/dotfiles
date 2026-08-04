var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/sixel/lib/Colors.js
var require_Colors = __commonJS({
  "node_modules/sixel/lib/Colors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_FOREGROUND = exports.DEFAULT_BACKGROUND = exports.PALETTE_ANSI_256 = exports.PALETTE_VT340_GREY = exports.PALETTE_VT340_COLOR = exports.normalizeHLS = exports.normalizeRGB = exports.nearestColorIndex = exports.fromRGBA8888 = exports.toRGBA8888 = exports.alpha = exports.blue = exports.green = exports.red = exports.BIG_ENDIAN = void 0;
    exports.BIG_ENDIAN = new Uint8Array(new Uint32Array([4278190080]).buffer)[0] === 255;
    if (exports.BIG_ENDIAN) {
      console.warn("BE platform detected. This version of node-sixel works only on LE properly.");
    }
    function red(n) {
      return n & 255;
    }
    exports.red = red;
    function green(n) {
      return n >>> 8 & 255;
    }
    exports.green = green;
    function blue(n) {
      return n >>> 16 & 255;
    }
    exports.blue = blue;
    function alpha(n) {
      return n >>> 24 & 255;
    }
    exports.alpha = alpha;
    function toRGBA88882(r, g, b, a = 255) {
      return ((a & 255) << 24 | (b & 255) << 16 | (g & 255) << 8 | r & 255) >>> 0;
    }
    exports.toRGBA8888 = toRGBA88882;
    function fromRGBA8888(color) {
      return [color & 255, color >> 8 & 255, color >> 16 & 255, color >>> 24];
    }
    exports.fromRGBA8888 = fromRGBA8888;
    function nearestColorIndex(color, palette) {
      const r = red(color);
      const g = green(color);
      const b = blue(color);
      let min = Number.MAX_SAFE_INTEGER;
      let idx = -1;
      for (let i = 0; i < palette.length; ++i) {
        const dr = r - palette[i][0];
        const dg = g - palette[i][1];
        const db = b - palette[i][2];
        const d = dr * dr + dg * dg + db * db;
        if (!d)
          return i;
        if (d < min) {
          min = d;
          idx = i;
        }
      }
      return idx;
    }
    exports.nearestColorIndex = nearestColorIndex;
    function clamp(low, high, value) {
      return Math.max(low, Math.min(value, high));
    }
    function h2c(t1, t2, c) {
      if (c < 0)
        c += 1;
      if (c > 1)
        c -= 1;
      return c * 6 < 1 ? t2 + (t1 - t2) * 6 * c : c * 2 < 1 ? t1 : c * 3 < 2 ? t2 + (t1 - t2) * (4 - c * 6) : t2;
    }
    function HLStoRGB(h, l, s) {
      if (!s) {
        const v = Math.round(l * 255);
        return toRGBA88882(v, v, v);
      }
      const t1 = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const t2 = 2 * l - t1;
      return toRGBA88882(clamp(0, 255, Math.round(h2c(t1, t2, h + 1 / 3) * 255)), clamp(0, 255, Math.round(h2c(t1, t2, h) * 255)), clamp(0, 255, Math.round(h2c(t1, t2, h - 1 / 3) * 255)));
    }
    function normalizeRGB(r, g, b) {
      return (4278190080 | Math.round(b / 100 * 255) << 16 | Math.round(g / 100 * 255) << 8 | Math.round(r / 100 * 255)) >>> 0;
    }
    exports.normalizeRGB = normalizeRGB;
    function normalizeHLS(h, l, s) {
      return HLStoRGB((h + 240 % 360) / 360, l / 100, s / 100);
    }
    exports.normalizeHLS = normalizeHLS;
    exports.PALETTE_VT340_COLOR = new Uint32Array([
      normalizeRGB(0, 0, 0),
      normalizeRGB(20, 20, 80),
      normalizeRGB(80, 13, 13),
      normalizeRGB(20, 80, 20),
      normalizeRGB(80, 20, 80),
      normalizeRGB(20, 80, 80),
      normalizeRGB(80, 80, 20),
      normalizeRGB(53, 53, 53),
      normalizeRGB(26, 26, 26),
      normalizeRGB(33, 33, 60),
      normalizeRGB(60, 26, 26),
      normalizeRGB(33, 60, 33),
      normalizeRGB(60, 33, 60),
      normalizeRGB(33, 60, 60),
      normalizeRGB(60, 60, 33),
      normalizeRGB(80, 80, 80)
    ]);
    exports.PALETTE_VT340_GREY = new Uint32Array([
      normalizeRGB(0, 0, 0),
      normalizeRGB(13, 13, 13),
      normalizeRGB(26, 26, 26),
      normalizeRGB(40, 40, 40),
      normalizeRGB(6, 6, 6),
      normalizeRGB(20, 20, 20),
      normalizeRGB(33, 33, 33),
      normalizeRGB(46, 46, 46),
      normalizeRGB(0, 0, 0),
      normalizeRGB(13, 13, 13),
      normalizeRGB(26, 26, 26),
      normalizeRGB(40, 40, 40),
      normalizeRGB(6, 6, 6),
      normalizeRGB(20, 20, 20),
      normalizeRGB(33, 33, 33),
      normalizeRGB(46, 46, 46)
    ]);
    exports.PALETTE_ANSI_256 = (() => {
      const p = [
        toRGBA88882(0, 0, 0),
        toRGBA88882(205, 0, 0),
        toRGBA88882(0, 205, 0),
        toRGBA88882(205, 205, 0),
        toRGBA88882(0, 0, 238),
        toRGBA88882(205, 0, 205),
        toRGBA88882(0, 250, 205),
        toRGBA88882(229, 229, 229),
        toRGBA88882(127, 127, 127),
        toRGBA88882(255, 0, 0),
        toRGBA88882(0, 255, 0),
        toRGBA88882(255, 255, 0),
        toRGBA88882(92, 92, 255),
        toRGBA88882(255, 0, 255),
        toRGBA88882(0, 255, 255),
        toRGBA88882(255, 255, 255)
      ];
      const d = [0, 95, 135, 175, 215, 255];
      for (let r = 0; r < 6; ++r) {
        for (let g = 0; g < 6; ++g) {
          for (let b = 0; b < 6; ++b) {
            p.push(toRGBA88882(d[r], d[g], d[b]));
          }
        }
      }
      for (let v = 8; v <= 238; v += 10) {
        p.push(toRGBA88882(v, v, v));
      }
      return new Uint32Array(p);
    })();
    exports.DEFAULT_BACKGROUND = toRGBA88882(0, 0, 0, 255);
    exports.DEFAULT_FOREGROUND = toRGBA88882(255, 255, 255, 255);
  }
});

// node_modules/inwasm-runtime/lib/index.cjs
var require_lib = __commonJS({
  "node_modules/inwasm-runtime/lib/index.cjs"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InWasm = InWasm;
    var z = (s) => {
      if (Uint8Array.fromBase64)
        return Uint8Array.fromBase64(s);
      if (typeof Buffer !== "undefined")
        return Buffer.from(s, "base64");
      const b = atob(s);
      const r = new Uint8Array(b.length);
      for (let i = 0; i < r.length; ++i)
        r[i] = b.charCodeAt(i);
      return r;
    };
    function InWasm(def) {
      if (def.d) {
        const { t, s, d } = def;
        let b;
        let m;
        const W = WebAssembly;
        if (t === 0) {
          if (s)
            return (e) => new W.Instance(m || (m = new W.Module(b || (b = z(d)))), e);
          return (e) => m ? W.instantiate(m, e) : W.instantiate(b || (b = z(d)), e).then((r) => (m = r.module) && r.instance);
        }
        if (t === 1) {
          if (s)
            return () => m || (m = new W.Module(b || (b = z(d))));
          return () => m ? Promise.resolve(m) : W.compile(b || (b = z(d))).then((r) => m = r);
        }
        if (s)
          return () => b || (b = z(d));
        return () => Promise.resolve(b || (b = z(d)));
      }
      if (typeof _wasmCtx === "undefined")
        throw new Error('must run "inwasm"');
      _wasmCtx.add(def);
    }
  }
});

// node_modules/xterm-wasm-parts/lib/base64/Base64Decoder.wasm.js
var require_Base64Decoder_wasm = __commonJS({
  "node_modules/xterm-wasm-parts/lib/base64/Base64Decoder.wasm.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var inwasm_runtime_1 = require_lib();
    var wasmDecode = (0, inwasm_runtime_1.InWasm)(
      /*inwasm#828e69684093b2c6:rdef-start:"decode"*/
      { s: 1, t: 0, d: "AGFzbQEAAAABBQFgAAF/Ag8BA2VudgZtZW1vcnkCAAEDAwIAAAcNAgNkZWMAAANlbmQAAQqLBgKZBAEKf0GIKCgCAEGgKGohAUGEKCgCACIDQaAoaiEAQYAoKAIAQQFrQXxxIgRBoChqIQUgBEEQayADSgRAIARBkChqIQMDQCABIABBA2otAABBAnQoAoAgIABBAmotAABBAnQoAoAYIABBAWotAABBAnQoAoAQIAAtAABBAnQoAoAIcnJyIgY2AgAgAUEDaiAAQQdqLQAAQQJ0KAKAICAAQQZqLQAAQQJ0KAKAGCAAQQVqLQAAQQJ0KAKAECAAQQRqLQAAQQJ0KAKACHJyciIHNgIAIAFBBmogAEELai0AAEECdCgCgCAgAEEKai0AAEECdCgCgBggAEEJai0AAEECdCgCgBAgAEEIai0AAEECdCgCgAhycnIiCDYCACABQQlqIABBD2otAABBAnQoAoAgIABBDmotAABBAnQoAoAYIABBDWotAABBAnQoAoAQIABBDGotAABBAnQoAoAIcnJyIgk2AgAgAiAGciAHciAIciAJciECIAFBDGohASAAQRBqIgAgA0kNAAsLIAAgBUkEQANAIAEgAEEDai0AAEECdCgCgCAgAEECai0AAEECdCgCgBggAEEBai0AAEECdCgCgBAgAC0AAEECdCgCgAhycnIiAzYCACACIANyIQIgAUEDaiEBIABBBGoiACAFSQ0ACwtBfyEAIAJB////B00Ef0GEKCAENgIAQYgoIAFBoChrNgIAQQAFQX8LC+0BAQR/AkBBgCgoAgAiAUGEKCgCACIAa0EFTgRAQX8hAxAADQFBgCgoAgAhAUGEKCgCACEAC0F/IQMgASAAayIBQQJIDQAgAC0AoShBAnQoAoAQIAAtAKAoQQJ0KAKACHIhAgJ/IAFBBEYEQEEDQQQgAC0AoyhBPUYbIAAtAKIoQT1GayEBC0EBIAFBA0kNABogAC0AoihBAnQoAoAYIAJyIQJBAiABQQRHDQAaIAAtAKMoQQJ0KAKAICACciECQQMLIQEgAkH///8HSw0AQQAhA0GIKCgCACIAIAI2AKAoQYgoIAAgAWo2AgALIAML" }
      /*inwasm#828e69684093b2c6:rdef-end:"decode"*/
    );
    var MAP = new Uint8Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("").map((el) => el.charCodeAt(0)));
    var D = new Uint32Array(1024);
    D.fill(4278190080);
    for (let i = 0; i < MAP.length; ++i)
      D[MAP[i]] = i << 2;
    for (let i = 0; i < MAP.length; ++i)
      D[256 + MAP[i]] = i >> 4 | (i << 4 & 255) << 8;
    for (let i = 0; i < MAP.length; ++i)
      D[512 + MAP[i]] = i >> 2 << 8 | (i << 6 & 255) << 16;
    for (let i = 0; i < MAP.length; ++i)
      D[768 + MAP[i]] = i << 16;
    var EMPTY = new Uint8Array(0);
    var Base64Decoder2 = class {
      /**
       * @param keepSize Keep the wasm instance below this limit when calling `release()`.
       * @param maxBytes Max allowed bytes to allocate.
       * @param initialBytes Initial bytes to allocate.
       */
      constructor(keepSize, maxBytes, initialBytes) {
        this._inst = null;
        this._ended = true;
        this._bytes = 0;
        this.keepSize = keepSize !== null && keepSize !== void 0 ? keepSize : 1048576;
        this.maxBytes = maxBytes !== null && maxBytes !== void 0 ? maxBytes : 4294901760;
        this._bytes = initialBytes !== null && initialBytes !== void 0 ? initialBytes : 32768;
        if (this._bytes > this.maxBytes || this.maxBytes > 4294901760) {
          throw new Error("invalid byte settings");
        }
      }
      /**
       * Currently decoded bytes (borrowed).
       * Must be accessed before calling `release` or `init`.
       */
      get data8() {
        return this._inst ? this._d.subarray(0, this._m32[
          1282
          /* P32.STATE_DP */
        ]) : EMPTY;
      }
      /**
       * Release memory conditionally based on `keepSize`.
       * If memory gets released, also the wasm instance will be freed and recreated on next `init`,
       * otherwise the instance will be reused.
       */
      release() {
        if (!this._inst)
          return;
        if (this._bytes > this.keepSize) {
          this._inst = this._m32 = this._d = this._mem = null;
        } else {
          this._m32[
            1280
            /* P32.STATE_WP */
          ] = 0;
          this._m32[
            1281
            /* P32.STATE_SP */
          ] = 0;
          this._m32[
            1282
            /* P32.STATE_DP */
          ] = 0;
        }
      }
      /**
       * Initializes the decoder for new base64 data.
       * Must be called before doing any decoding attempts.
       * The method will either spawn a new wasm instance or grow
       * the needed memory of an existing instance.
       * @param maxBytes Max allowed bytes to allocate (overwrites ctor value).
       * @param initialBytes Initial bytes to allocate (overwrites ctor value).
       */
      init(maxBytes, initialBytes) {
        this.maxBytes = maxBytes !== null && maxBytes !== void 0 ? maxBytes : this.maxBytes;
        this._bytes = initialBytes !== null && initialBytes !== void 0 ? initialBytes : Math.min(this._bytes, this.maxBytes);
        if (this._bytes > this.maxBytes || this.maxBytes > 4294901760) {
          throw Error("invalid byte settings");
        }
        let m = this._m32;
        const bytes = this._bytes + 5152;
        if (!this._inst) {
          this._mem = new WebAssembly.Memory({ initial: Math.ceil(bytes / 65536) });
          this._inst = wasmDecode({ env: { memory: this._mem } });
          m = new Uint32Array(this._mem.buffer, 0);
          m.set(
            D,
            256
            /* P32.D0 */
          );
          this._d = new Uint8Array(
            this._mem.buffer,
            5152
            /* Bytes._DATA_OFFSET */
          );
        } else if (this._mem.buffer.byteLength < bytes) {
          this._mem.grow(Math.ceil((bytes - this._mem.buffer.byteLength) / 65536));
          m = new Uint32Array(this._mem.buffer, 0);
          this._d = new Uint8Array(
            this._mem.buffer,
            5152
            /* Bytes._DATA_OFFSET */
          );
        }
        m[
          1280
          /* P32.STATE_WP */
        ] = 0;
        m[
          1281
          /* P32.STATE_SP */
        ] = 0;
        m[
          1282
          /* P32.STATE_DP */
        ] = 0;
        this._m32 = m;
        this._ended = false;
      }
      /**
       * Realloc memory. Realloc only happens, if the requested
       * size doesn't fit in the current memory.
       * The new size will be capped by `maxBytes`.
       * @param requested Bytes to be stored.
       */
      _realloc(requested) {
        const needed = this._m32[
          1280
          /* P32.STATE_WP */
        ] + requested;
        if (this._bytes < needed) {
          if (needed > this.maxBytes) {
            return -3;
          }
          let newSize = this._bytes;
          while ((newSize *= 2) < needed) {
          }
          newSize = Math.min(newSize, this.maxBytes);
          if (newSize < needed) {
            return -3;
          }
          if (newSize + 5152 > this._mem.buffer.byteLength) {
            const addPages = Math.ceil((newSize + 5152 - this._mem.buffer.byteLength) / 65536);
            this._mem.grow(addPages);
            this._m32 = new Uint32Array(this._mem.buffer, 0);
            this._d = new Uint8Array(
              this._mem.buffer,
              5152
              /* Bytes._DATA_OFFSET */
            );
          }
          this._bytes = newSize;
        }
        return 0;
      }
      /**
       * Put bytes in `data` into the decoder.
       * Additionally decodes the payload, if it reached 2^17 bytes.
       * The return value indicates the type of issue.
       * @param data Bytes to be loaded.
       */
      put(data) {
        if (!this._inst || this._ended) {
          return -2;
        }
        if (this._realloc(data.length)) {
          return -3;
        }
        const m = this._m32;
        this._d.set(data, m[
          1280
          /* P32.STATE_WP */
        ]);
        m[
          1280
          /* P32.STATE_WP */
        ] += data.length;
        return m[
          1280
          /* P32.STATE_WP */
        ] - m[
          1281
          /* P32.STATE_SP */
        ] >= 131072 ? this._inst.exports.dec() : 0;
      }
      /**
       * End the current decoding.
       * Also decodes leftover payload from previous put calls.
       */
      end() {
        this._ended = true;
        return this._inst ? this._inst.exports.end() : -2;
      }
      /**
       * Bytes loaded into the decoder.
       */
      get loadedBytes() {
        return this._inst ? this._m32[
          1280
          /* P32.STATE_WP */
        ] : 0;
      }
      /**
       * Free bytes to feed to the decoder.
       */
      get freeBytes() {
        return this._inst ? this.maxBytes - this._m32[
          1280
          /* P32.STATE_WP */
        ] : 0;
      }
    };
    exports.default = Base64Decoder2;
  }
});

// addons/addon-image/src/ImageRenderer.ts
var import_Colors = __toESM(require_Colors());

// src/common/Lifecycle.ts
function toDisposable(fn) {
  return { dispose: fn };
}
var DisposableStore = class {
  constructor() {
    this._disposables = /* @__PURE__ */ new Set();
    this._isDisposed = false;
  }
  get isDisposed() {
    return this._isDisposed;
  }
  add(o) {
    if (this._isDisposed) {
      o.dispose();
    } else {
      this._disposables.add(o);
    }
    return o;
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.clear();
  }
  clear() {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.clear();
  }
};
var Disposable = class {
  constructor() {
    this._store = new DisposableStore();
  }
  dispose() {
    this._store.dispose();
  }
  _register(o) {
    return this._store.add(o);
  }
};
Disposable.None = Object.freeze({ dispose() {
} });
var MutableDisposable = class {
  constructor() {
    this._isDisposed = false;
  }
  get value() {
    return this._isDisposed ? void 0 : this._value;
  }
  set value(value) {
    if (this._isDisposed || value === this._value) {
      return;
    }
    this._value?.dispose();
    this._value = value;
  }
  clear() {
    this.value = void 0;
  }
  dispose() {
    this._isDisposed = true;
    this._value?.dispose();
    this._value = void 0;
  }
};

// addons/addon-image/src/ImageRenderer.ts
var ImageRenderer = class _ImageRenderer extends Disposable {
  constructor(_terminal) {
    super();
    this._terminal = _terminal;
    this._layers = /* @__PURE__ */ new Map();
    this._optionsRefresh = this._register(new MutableDisposable());
    this._oldOpen = this._terminal._core.open;
    this._terminal._core.open = (parent) => {
      this._oldOpen?.call(this._terminal._core, parent);
      this._open();
    };
    if (this._terminal._core.screenElement) {
      this._open();
    }
    this._optionsRefresh.value = this._terminal._core.optionsService.onOptionChange((option) => {
      if (option === "fontSize") {
        this.rescaleCanvas();
        this._renderService?.refreshRows(0, this._terminal.rows);
      }
    });
    this._register(toDisposable(() => {
      this.removeLayerFromDom();
      this.removeLayerFromDom("bottom");
      if (this._terminal._core && this._oldOpen) {
        this._terminal._core.open = this._oldOpen;
        this._oldOpen = void 0;
      }
      if (this._renderService && this._oldSetRenderer) {
        this._renderService.setRenderer = this._oldSetRenderer;
        this._oldSetRenderer = void 0;
      }
      this._renderService = void 0;
      this._layers.clear();
      this._placeholderBitmap?.close();
      this._placeholderBitmap = void 0;
      this._placeholder = void 0;
    }));
  }
  /** @deprecated Kept for backward compat — points to top layer canvas. */
  get canvas() {
    return this._layers.get("top")?.canvas;
  }
  // drawing primitive - canvas
  static createCanvas(localDocument, width, height) {
    const canvas = (localDocument ?? document).createElement("canvas");
    canvas.width = width | 0;
    canvas.height = height | 0;
    return canvas;
  }
  // drawing primitive - ImageData with optional buffer
  static createImageData(ctx, width, height, buffer) {
    if (typeof ImageData !== "function") {
      const imgData = ctx.createImageData(width, height);
      if (buffer) {
        imgData.data.set(new Uint8ClampedArray(buffer, 0, width * height * 4));
      }
      return imgData;
    }
    return buffer ? new ImageData(new Uint8ClampedArray(buffer, 0, width * height * 4), width, height) : new ImageData(width, height);
  }
  // drawing primitive - ImageBitmap
  static createImageBitmap(img) {
    if (typeof createImageBitmap !== "function") {
      return Promise.resolve(void 0);
    }
    return createImageBitmap(img);
  }
  /**
   * Enable the placeholder.
   */
  showPlaceholder(value) {
    if (value) {
      if (!this._placeholder && this.cellSize.height !== -1) {
        this._createPlaceHolder(Math.max(this.cellSize.height + 1, 24 /* PLACEHOLDER_HEIGHT */));
      }
    } else {
      this._placeholderBitmap?.close();
      this._placeholderBitmap = void 0;
      this._placeholder = void 0;
    }
    this._renderService?.refreshRows(0, this._terminal.rows);
  }
  /**
   * Dimensions of the terminal.
   * Forwarded from internal render service.
   */
  get dimensions() {
    return this._terminal.dimensions;
  }
  /**
   * Current cell size (float).
   */
  get cellSize() {
    return {
      width: this.dimensions?.css.cell.width || -1,
      height: this.dimensions?.css.cell.height || -1
    };
  }
  /**
   * Clear a region of the image layer canvas.
   */
  clearLines(start, end, layer) {
    const y = start * (this.dimensions?.css.cell.height || 0);
    const w = this.dimensions?.css.canvas.width || 0;
    const h = (end + 1 - start) * (this.dimensions?.css.cell.height || 0);
    if (!layer || layer === "top") {
      this._layers.get("top")?.clearRect(0, y, w, h);
    }
    if (!layer || layer === "bottom") {
      this._layers.get("bottom")?.clearRect(0, y, w, h);
    }
  }
  /**
   * Clear whole image canvas.
   */
  clearAll(layer) {
    if (!layer || layer === "top") {
      const ctx = this._layers.get("top");
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    if (!layer || layer === "bottom") {
      const ctx = this._layers.get("bottom");
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }
  /**
   * Draw neighboring tiles on the image layer canvas.
   */
  draw(imgSpec, tileId, col, row, count = 1) {
    const ctx = this._layers.get(imgSpec.layer);
    if (!ctx) {
      return;
    }
    const { width, height } = this.cellSize;
    if (width === -1 || height === -1) {
      return;
    }
    this._rescaleImage(imgSpec, width, height);
    const img = imgSpec.actual;
    const cols = Math.ceil(img.width / width);
    const sx = tileId % cols * width;
    const sy = Math.floor(tileId / cols) * height;
    const dx = col * width;
    const dy = row * height;
    const finalWidth = count * width + sx > img.width ? img.width - sx : count * width;
    const finalHeight = sy + height > img.height ? img.height - sy : height;
    ctx.drawImage(
      img,
      Math.floor(sx),
      Math.floor(sy),
      Math.ceil(finalWidth),
      Math.ceil(finalHeight),
      Math.floor(dx),
      Math.floor(dy),
      Math.ceil(finalWidth),
      Math.ceil(finalHeight)
    );
  }
  /**
   * Extract a single tile from an image.
   */
  extractTile(imgSpec, tileId) {
    const { width, height } = this.cellSize;
    if (width === -1 || height === -1) {
      return;
    }
    this._rescaleImage(imgSpec, width, height);
    const img = imgSpec.actual;
    const cols = Math.ceil(img.width / width);
    const sx = tileId % cols * width;
    const sy = Math.floor(tileId / cols) * height;
    const finalWidth = width + sx > img.width ? img.width - sx : width;
    const finalHeight = sy + height > img.height ? img.height - sy : height;
    const canvas = _ImageRenderer.createCanvas(this.document, finalWidth, finalHeight);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(
        img,
        Math.floor(sx),
        Math.floor(sy),
        Math.floor(finalWidth),
        Math.floor(finalHeight),
        0,
        0,
        Math.floor(finalWidth),
        Math.floor(finalHeight)
      );
      return canvas;
    }
  }
  /**
   * Draw a line with placeholder on the image layer canvas.
   */
  drawPlaceholder(col, row, count = 1) {
    const ctx = this._layers.get("top");
    if (ctx) {
      const { width, height } = this.cellSize;
      if (width === -1 || height === -1) {
        return;
      }
      if (!this._placeholder) {
        this._createPlaceHolder(Math.max(height + 1, 24 /* PLACEHOLDER_HEIGHT */));
      } else if (height >= this._placeholder.height) {
        this._createPlaceHolder(height + 1);
      }
      if (!this._placeholder) return;
      ctx.drawImage(
        this._placeholderBitmap ?? this._placeholder,
        col * width,
        row * height % 2 ? 0 : 1,
        // needs %2 offset correction
        width * count,
        height,
        col * width,
        row * height,
        width * count,
        height
      );
    }
  }
  /**
   * Rescale image layer canvas if needed.
   * Checked once from `ImageStorage.render`.
   */
  rescaleCanvas() {
    const w = this.dimensions?.css.canvas.width || 0;
    const h = this.dimensions?.css.canvas.height || 0;
    for (const ctx of this._layers.values()) {
      if (ctx.canvas.width !== w || ctx.canvas.height !== h) {
        ctx.canvas.width = w;
        ctx.canvas.height = h;
      }
    }
  }
  /**
   * Rescale image in storage if needed.
   */
  _rescaleImage(spec, currentWidth, currentHeight) {
    if (currentWidth === spec.actualCellSize.width && currentHeight === spec.actualCellSize.height) {
      return;
    }
    const { width: originalWidth, height: originalHeight } = spec.origCellSize;
    if (currentWidth === originalWidth && currentHeight === originalHeight) {
      spec.actual = spec.orig;
      spec.actualCellSize.width = originalWidth;
      spec.actualCellSize.height = originalHeight;
      return;
    }
    const canvas = _ImageRenderer.createCanvas(
      this.document,
      Math.ceil(spec.orig.width * currentWidth / originalWidth),
      Math.ceil(spec.orig.height * currentHeight / originalHeight)
    );
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(spec.orig, 0, 0, canvas.width, canvas.height);
      spec.actual = canvas;
      spec.actualCellSize.width = currentWidth;
      spec.actualCellSize.height = currentHeight;
    }
  }
  /**
   * Lazy init for the renderer.
   */
  _open() {
    this._renderService = this._terminal._core._renderService;
    this._oldSetRenderer = this._renderService.setRenderer.bind(this._renderService);
    this._renderService.setRenderer = (renderer) => {
      for (const key of [...this._layers.keys()]) {
        this.removeLayerFromDom(key);
      }
      this._oldSetRenderer?.call(this._renderService, renderer);
    };
  }
  insertLayerToDom(layer = "top") {
    if (!this.document || !this._terminal._core.screenElement) {
      console.warn("image addon: cannot insert output canvas to DOM, missing document or screenElement");
      return;
    }
    if (this._layers.has(layer)) {
      return;
    }
    const canvas = _ImageRenderer.createCanvas(
      this.document,
      this.dimensions?.css.canvas.width || 0,
      this.dimensions?.css.canvas.height || 0
    );
    canvas.classList.add(`xterm-image-layer-${layer}`);
    const screenElement = this._terminal._core.screenElement;
    screenElement.style.isolation = "isolate";
    if (layer === "bottom") {
      canvas.style.zIndex = "-1";
      screenElement.insertBefore(canvas, screenElement.firstChild);
    } else {
      canvas.style.zIndex = "0";
      screenElement.appendChild(canvas);
    }
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      canvas.remove();
      return;
    }
    this._layers.set(layer, ctx);
    this.clearAll(layer);
  }
  removeLayerFromDom(layer = "top") {
    const ctx = this._layers.get(layer);
    if (ctx) {
      ctx.canvas.remove();
      this._layers.delete(layer);
    }
  }
  hasLayer(layer) {
    return this._layers.has(layer);
  }
  _createPlaceHolder(height = 24 /* PLACEHOLDER_HEIGHT */) {
    this._placeholderBitmap?.close();
    this._placeholderBitmap = void 0;
    const bWidth = 32;
    const blueprint = _ImageRenderer.createCanvas(this.document, bWidth, height);
    const ctx = blueprint.getContext("2d", { alpha: false });
    if (!ctx) return;
    const imgData = _ImageRenderer.createImageData(ctx, bWidth, height);
    const d32 = new Uint32Array(imgData.data.buffer);
    const black = (0, import_Colors.toRGBA8888)(0, 0, 0);
    const white = (0, import_Colors.toRGBA8888)(255, 255, 255);
    d32.fill(black);
    for (let y = 0; y < height; ++y) {
      const shift = y % 2;
      const offset = y * bWidth;
      for (let x = 0; x < bWidth; x += 2) {
        d32[offset + x + shift] = white;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const width = screen.width + bWidth - 1 & ~(bWidth - 1) || 4096 /* PLACEHOLDER_LENGTH */;
    this._placeholder = _ImageRenderer.createCanvas(this.document, width, height);
    const ctx2 = this._placeholder.getContext("2d", { alpha: false });
    if (!ctx2) {
      this._placeholder = void 0;
      return;
    }
    for (let i = 0; i < width; i += bWidth) {
      ctx2.drawImage(blueprint, i, 0);
    }
    _ImageRenderer.createImageBitmap(this._placeholder).then((bitmap) => this._placeholderBitmap = bitmap);
  }
  get document() {
    return this._terminal._core._coreBrowserService?.window.document;
  }
};

// src/common/buffer/Constants.ts
var DEFAULT_COLOR = 0;
var DEFAULT_ATTR = 0 << 18 | DEFAULT_COLOR << 9 | 256 << 0;

// addons/addon-image/src/ImageStorage.ts
var CELL_SIZE_DEFAULT = {
  width: 7,
  height: 14
};
var ExtendedAttrsImage = class _ExtendedAttrsImage {
  constructor(ext = 0, urlId = 0, imageId = -1, tileId = -1) {
    this.imageId = imageId;
    this.tileId = tileId;
    this._ext = 0;
    this._urlId = 0;
    this._ext = ext;
    this._urlId = urlId;
  }
  get ext() {
    if (this._urlId) {
      return this._ext & ~469762048 /* UNDERLINE_STYLE */ | this.underlineStyle << 26;
    }
    return this._ext;
  }
  set ext(value) {
    this._ext = value;
  }
  get underlineStyle() {
    if (this._urlId) {
      return 5 /* DASHED */;
    }
    return (this._ext & 469762048 /* UNDERLINE_STYLE */) >> 26;
  }
  set underlineStyle(value) {
    this._ext &= ~469762048 /* UNDERLINE_STYLE */;
    this._ext |= value << 26 & 469762048 /* UNDERLINE_STYLE */;
  }
  get underlineColor() {
    return this._ext & (50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
  }
  set underlineColor(value) {
    this._ext &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
    this._ext |= value & (50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
  }
  get underlineVariantOffset() {
    const val = (this._ext & 3758096384 /* VARIANT_OFFSET */) >> 29;
    if (val < 0) {
      return val ^ 4294967288;
    }
    return val;
  }
  set underlineVariantOffset(value) {
    this._ext &= ~3758096384 /* VARIANT_OFFSET */;
    this._ext |= value << 29 & 3758096384 /* VARIANT_OFFSET */;
  }
  get urlId() {
    return this._urlId;
  }
  set urlId(value) {
    this._urlId = value;
  }
  clone() {
    return new _ExtendedAttrsImage(this._ext, this._urlId, this.imageId, this.tileId);
  }
  isEmpty() {
    return this.underlineStyle === 0 /* NONE */ && this._urlId === 0 && this.imageId === -1;
  }
};
var EMPTY_ATTRS = new ExtendedAttrsImage();

// addons/addon-image/src/kitty/KittyGraphicsHandler.ts
var import_Base64Decoder = __toESM(require_Base64Decoder_wasm());

// addons/addon-image/src/kitty/KittyGraphicsTypes.ts
function parseKittyCommand(data) {
  const cmd = {};
  const parts = data.split(",");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.substring(0, eqIdx);
    const value = part.substring(eqIdx + 1);
    if (key === "a" /* ACTION */) {
      cmd.action = value;
      continue;
    }
    if (key === "o" /* COMPRESSION */) {
      cmd.compression = value;
      continue;
    }
    if (key === "t" /* TRANSMISSION */) {
      cmd.transmission = value;
      continue;
    }
    if (key === "d" /* DELETE_SELECTOR */) {
      cmd.deleteSelector = value;
      continue;
    }
    const numValue = parseInt(value, 10);
    switch (key) {
      case "f" /* FORMAT */:
        cmd.format = numValue;
        break;
      case "i" /* ID */:
        cmd.id = numValue;
        break;
      case "I" /* IMAGE_NUMBER */:
        cmd.imageNumber = numValue;
        break;
      case "s" /* WIDTH */:
        cmd.width = numValue;
        break;
      case "v" /* HEIGHT */:
        cmd.height = numValue;
        break;
      case "x" /* X_OFFSET */:
        cmd.x = numValue;
        break;
      case "y" /* Y_OFFSET */:
        cmd.y = numValue;
        break;
      case "w" /* SOURCE_WIDTH */:
        cmd.sourceWidth = numValue;
        break;
      case "h" /* SOURCE_HEIGHT */:
        cmd.sourceHeight = numValue;
        break;
      case "X" /* X_PLACEMENT_OFFSET */:
        cmd.xOffset = numValue;
        break;
      case "Y" /* Y_PLACEMENT_OFFSET */:
        cmd.yOffset = numValue;
        break;
      case "c" /* COLUMNS */:
        cmd.columns = numValue;
        break;
      case "r" /* ROWS */:
        cmd.rows = numValue;
        break;
      case "m" /* MORE */:
        cmd.more = numValue;
        break;
      case "q" /* QUIET */:
        cmd.quiet = numValue;
        break;
      case "C" /* CURSOR_MOVEMENT */:
        cmd.cursorMovement = numValue;
        break;
      case "z" /* Z_INDEX */:
        cmd.zIndex = numValue;
        break;
      case "p" /* PLACEMENT_ID */:
        cmd.placementId = numValue;
        break;
    }
  }
  return cmd;
}

// addons/addon-image/src/kitty/KittyGraphicsHandler.ts
var DECODER_OK = 0 /* DECODER_OK */;
var KittyGraphicsHandler = class {
  constructor(_opts, _renderer, _kittyStorage, _coreTerminal) {
    this._opts = _opts;
    this._renderer = _renderer;
    this._kittyStorage = _kittyStorage;
    this._coreTerminal = _coreTerminal;
    this._aborted = false;
    this._decodeError = false;
    this._activeDecoder = null;
    // Streaming related states
    // True while receiving control data (before semicolon).
    this._inControlData = true;
    // Buffer for control data.
    this._controlData = new Uint32Array(512 /* MAX_CONTROL_DATA_SIZE */);
    this._controlLength = 0;
    // Pre-calculated encoded size limit
    this._encodedSizeLimit = 0;
    this._totalEncodedSize = 0;
    // Parsed command. These are the control data before semicolon.
    this._parsedCommand = null;
    // Storage related states
    this._pendingTransmissions = /* @__PURE__ */ new Map();
    this._maxEncodedBytes = Math.ceil(this._opts.kittySizeLimit * 4 / 3);
    this._initialEncodedBytes = Math.min(4194304 /* DECODER_INITIAL_DATA */, this._maxEncodedBytes);
  }
  reset() {
    this._cleanupAllPending();
    if (this._activeDecoder) {
      this._activeDecoder.release();
      this._activeDecoder = null;
    }
    this._kittyStorage.reset();
  }
  dispose() {
    this.reset();
  }
  _removePendingEntry(key) {
    this._pendingTransmissions.delete(key);
    if (this._lastPendingKey === key) {
      this._lastPendingKey = void 0;
    }
  }
  _cleanupAllPending() {
    for (const pending of this._pendingTransmissions.values()) {
      pending.decoder.release();
    }
    this._pendingTransmissions.clear();
    this._lastPendingKey = void 0;
  }
  start() {
    this._aborted = false;
    this._decodeError = false;
    this._inControlData = true;
    this._controlLength = 0;
    this._parsedCommand = null;
    this._encodedSizeLimit = this._maxEncodedBytes;
    this._totalEncodedSize = 0;
    this._activeDecoder = null;
  }
  put(data, start, end) {
    if (this._aborted) return;
    if (!this._inControlData) {
      this._streamPayload(data, start, end);
    } else {
      let controlEnd = end;
      for (let i = start; i < end; i++) {
        if (data[i] === 59 /* SEMICOLON */) {
          this._inControlData = false;
          controlEnd = i;
          break;
        }
      }
      const copyLength = controlEnd - start;
      if (this._controlLength + copyLength > 512 /* MAX_CONTROL_DATA_SIZE */) {
        this._aborted = true;
        return;
      }
      this._controlData.set(data.subarray(start, controlEnd), this._controlLength);
      this._controlLength += copyLength;
      if (!this._inControlData) {
        this._parsedCommand = parseKittyCommand(this._parseControlDataString());
        if (this._parsedCommand.id !== void 0 && this._parsedCommand.imageNumber !== void 0) {
          this._sendResponse(this._parsedCommand.id, "EINVAL:cannot specify both i and I keys", this._parsedCommand.quiet ?? 0);
          this._aborted = true;
          return;
        }
        if (this._parsedCommand.action === "d" /* DELETE */) {
          return;
        }
        const payloadStart = controlEnd + 1;
        if (payloadStart < end) {
          this._streamPayload(data, payloadStart, end);
        }
      }
    }
  }
  // Stream payload bytes into the base64 decoder.
  _streamPayload(data, start, end) {
    if (this._aborted) return;
    const pendingKey = this._parsedCommand?.id ?? this._lastPendingKey ?? 0;
    const pending = this._pendingTransmissions.get(pendingKey);
    const previousEncodedSize = pending?.totalEncodedSize ?? 0;
    this._totalEncodedSize += end - start;
    const cumulativeEncodedSize = previousEncodedSize + this._totalEncodedSize;
    if (cumulativeEncodedSize > this._encodedSizeLimit) {
      const decoderToRelease = this._activeDecoder ?? pending?.decoder;
      if (decoderToRelease) {
        decoderToRelease.release();
      }
      this._activeDecoder = null;
      if (pending) {
        this._removePendingEntry(pendingKey);
      }
      this._aborted = true;
      return;
    }
    if (this._decodeError) return;
    if (pending?.decoder && !this._activeDecoder) {
      this._activeDecoder = pending.decoder;
    }
    if (!this._activeDecoder) {
      this._activeDecoder = new import_Base64Decoder.default(4194304 /* DECODER_KEEP_DATA */, this._maxEncodedBytes, this._initialEncodedBytes);
      this._activeDecoder.init();
    }
    if (this._activeDecoder.put(data.subarray(start, end)) !== DECODER_OK) {
      this._activeDecoder.release();
      this._activeDecoder = null;
      this._decodeError = true;
      if (pending) {
        this._removePendingEntry(pendingKey);
      }
    }
  }
  end(success) {
    if (this._aborted || !success) {
      if (this._activeDecoder) {
        this._activeDecoder.release();
        this._activeDecoder = null;
      }
      return true;
    }
    if (this._inControlData) {
      return this._handleNoPayloadCommand();
    }
    const cmd = this._parsedCommand;
    if (cmd.action === "d" /* DELETE */) {
      return this._handleDelete(cmd);
    }
    const pendingKey = cmd.id ?? this._lastPendingKey ?? 0;
    const isMoreComing = cmd.more === 1;
    const pending = this._pendingTransmissions.get(pendingKey);
    if (isMoreComing) {
      if (this._activeDecoder) {
        if (pending) {
          pending.totalEncodedSize += this._totalEncodedSize;
          pending.decodeError = pending.decodeError || this._decodeError;
        } else {
          this._pendingTransmissions.set(pendingKey, {
            cmd: { ...cmd },
            decoder: this._activeDecoder,
            totalEncodedSize: this._totalEncodedSize,
            decodeError: this._decodeError
          });
        }
        this._lastPendingKey = pendingKey;
        this._activeDecoder = null;
      }
      return true;
    }
    if (pending) {
      this._lastPendingKey = void 0;
    }
    let decodeError = this._decodeError;
    let finalCmd = cmd;
    let decoder = this._activeDecoder;
    if (pending) {
      finalCmd = pending.cmd;
      decoder = pending.decoder;
      decodeError = decodeError || pending.decodeError;
      this._pendingTransmissions.delete(pendingKey);
    }
    let imageBytes = new Uint8Array(0);
    if (decoder) {
      if (decoder.end() !== DECODER_OK) {
        decodeError = true;
      }
      imageBytes = decoder.data8;
    }
    this._activeDecoder = null;
    const result = this._handleCommandWithBytesAndCmd(finalCmd, imageBytes, decodeError);
    if (decoder) {
      decoder.release();
    }
    return result;
  }
  // Command handling
  _parseControlDataString() {
    let str = "";
    for (let i = 0; i < this._controlLength; i++) {
      str += String.fromCodePoint(this._controlData[i]);
    }
    return str;
  }
  _handleNoPayloadCommand() {
    const cmd = parseKittyCommand(this._parseControlDataString());
    if (cmd.id !== void 0 && cmd.imageNumber !== void 0) {
      this._sendResponse(cmd.id, "EINVAL:cannot specify both i and I keys", cmd.quiet ?? 0);
      return true;
    }
    const action = cmd.action ?? "t";
    switch (action) {
      case "d" /* DELETE */:
        return this._handleDelete(cmd);
      case "q" /* QUERY */:
        this._sendResponse(cmd.id ?? 0, "OK", cmd.quiet ?? 0);
        return true;
      case "p" /* PLACEMENT */:
        return this._handlePlacement(cmd);
      default:
        if (cmd.id !== void 0) {
          this._sendResponse(cmd.id, "EINVAL:unsupported action", cmd.quiet ?? 0);
        }
        return true;
    }
  }
  _handleCommandWithBytesAndCmd(cmd, bytes, decodeError) {
    const action = cmd.action ?? "t";
    switch (action) {
      case "t" /* TRANSMIT */: {
        const result = this._handleTransmit(cmd, bytes, decodeError);
        if ((cmd.transmission ?? "d") === "d" && cmd.id !== void 0) {
          if (decodeError) {
            this._sendResponse(cmd.id, "EINVAL:invalid base64 data", cmd.quiet ?? 0);
          } else if (bytes.length > 0) {
            this._sendResponse(cmd.id, "OK", cmd.quiet ?? 0);
          }
        }
        return result;
      }
      case "T" /* TRANSMIT_DISPLAY */:
        return this._handleTransmitDisplay(cmd, bytes, decodeError);
      case "q" /* QUERY */:
        return this._handleQuery(cmd, bytes, decodeError);
      case "p" /* PLACEMENT */:
        return this._handlePlacement(cmd);
      default:
        if (cmd.id !== void 0) {
          this._sendResponse(cmd.id, "EINVAL:unsupported action", cmd.quiet ?? 0);
        }
        return true;
    }
  }
  _handlePlacement(cmd) {
    if (cmd.id === void 0) {
      return true;
    }
    const id = cmd.id;
    const image = this._kittyStorage.getImage(id);
    if (!image) {
      this._sendResponse(id, "ENOENT:image not found", cmd.quiet ?? 0, cmd.placementId);
      return true;
    }
    const result = this._displayImage(image, cmd);
    return result.then((success) => {
      this._sendResponse(id, success ? "OK" : "EINVAL:image rendering failed", cmd.quiet ?? 0, cmd.placementId);
      return true;
    });
  }
  _handleTransmit(cmd, bytes, decodeError) {
    const transmission = cmd.transmission ?? "d";
    if (transmission !== "d") {
      if (cmd.id !== void 0) {
        this._sendResponse(cmd.id, "EINVAL:unsupported transmission medium", cmd.quiet ?? 0);
      }
      return true;
    }
    if (decodeError || bytes.length === 0) return true;
    this._kittyStorage.storeImage(cmd.id, {
      data: new Blob([bytes]),
      width: cmd.width ?? 0,
      height: cmd.height ?? 0,
      format: cmd.format ?? 32 /* RGBA */,
      compression: cmd.compression ?? ""
    });
    return true;
  }
  _handleTransmitDisplay(cmd, bytes, decodeError) {
    if (decodeError) {
      if (cmd.id !== void 0) {
        this._sendResponse(cmd.id, "EINVAL:invalid base64 data", cmd.quiet ?? 0);
      }
      return true;
    }
    this._handleTransmit(cmd, bytes, decodeError);
    const id = cmd.id ?? this._kittyStorage.lastImageId;
    const image = this._kittyStorage.getImage(id);
    if (image) {
      const result = this._displayImage(image, cmd);
      if (cmd.id !== void 0) {
        return result.then((success) => {
          this._sendResponse(id, success ? "OK" : "EINVAL:image rendering failed", cmd.quiet ?? 0);
          return true;
        });
      }
      return result.then(() => true);
    }
    return true;
  }
  _handleQuery(cmd, bytes, decodeError) {
    const id = cmd.id ?? 0;
    const quiet = cmd.quiet ?? 0;
    const transmission = cmd.transmission ?? "d";
    if (transmission !== "d") {
      this._sendResponse(id, "EINVAL:unsupported transmission medium", quiet);
      return true;
    }
    if (decodeError) {
      this._sendResponse(id, "EINVAL:invalid base64 data", quiet);
      return true;
    }
    if (bytes.length === 0) {
      this._sendResponse(id, "OK", quiet);
      return true;
    }
    const format = cmd.format ?? 32 /* RGBA */;
    if (format === 100 /* PNG */) {
      this._sendResponse(id, "OK", quiet);
    } else {
      const width = cmd.width ?? 0;
      const height = cmd.height ?? 0;
      if (!width || !height) {
        this._sendResponse(id, "EINVAL:width and height required for raw pixel data", quiet);
        return true;
      }
      const bytesPerPixel = format === 32 /* RGBA */ ? 4 /* BYTES_PER_PIXEL_RGBA */ : 3 /* BYTES_PER_PIXEL_RGB */;
      const expectedBytes = width * height * bytesPerPixel;
      if (bytes.length < expectedBytes) {
        this._sendResponse(id, `EINVAL:insufficient pixel data`, quiet);
        return true;
      }
      this._sendResponse(id, "OK", quiet);
    }
    return true;
  }
  _handleDelete(cmd) {
    const selector = cmd.deleteSelector ?? "a";
    switch (selector) {
      case "a":
      case "A":
        this._cleanupAllPending();
        this._kittyStorage.deleteAll();
        break;
      case "i":
      case "I":
        if (cmd.id !== void 0) {
          const pending = this._pendingTransmissions.get(cmd.id);
          if (pending) {
            pending.decoder.release();
          }
          this._removePendingEntry(cmd.id);
          this._kittyStorage.deleteById(cmd.id);
        }
        break;
      default:
        break;
    }
    return true;
  }
  _sendResponse(id, message, quiet, placementId) {
    const isOk = message === "OK";
    if (isOk && quiet >= 1) return;
    if (!isOk && quiet >= 2) return;
    const pPart = placementId ? `,p=${placementId}` : "";
    const response = `\x1B_Gi=${id}${pPart};${message}\x1B\\`;
    this._coreTerminal._core.coreService.triggerDataEvent(response);
  }
  // Image display
  _displayImage(image, cmd) {
    return this._decodeAndDisplay(image, cmd).then(() => true).catch(() => false);
  }
  async _decodeAndDisplay(image, cmd) {
    let bitmap = await this._createBitmap(image);
    try {
      const cropX = Math.max(0, cmd.x ?? 0);
      const cropY = Math.max(0, cmd.y ?? 0);
      const cropW = cmd.sourceWidth || bitmap.width - cropX;
      const cropH = cmd.sourceHeight || bitmap.height - cropY;
      const maxCropW = Math.max(0, bitmap.width - cropX);
      const maxCropH = Math.max(0, bitmap.height - cropY);
      const finalCropW = Math.max(0, Math.min(cropW, maxCropW));
      const finalCropH = Math.max(0, Math.min(cropH, maxCropH));
      if (finalCropW === 0 || finalCropH === 0) {
        throw new Error("invalid source rectangle");
      }
      if (cropX !== 0 || cropY !== 0 || finalCropW !== bitmap.width || finalCropH !== bitmap.height) {
        const cropped = await createImageBitmap(bitmap, cropX, cropY, finalCropW, finalCropH);
        bitmap.close();
        bitmap = cropped;
      }
      const cw = this._renderer.dimensions?.css.cell.width || CELL_SIZE_DEFAULT.width;
      const ch = this._renderer.dimensions?.css.cell.height || CELL_SIZE_DEFAULT.height;
      let imgCols;
      let imgRows;
      if (cmd.columns !== void 0 && cmd.rows !== void 0) {
        imgCols = cmd.columns;
        imgRows = cmd.rows;
      } else if (cmd.columns !== void 0) {
        imgCols = cmd.columns;
        imgRows = Math.max(1, Math.ceil(bitmap.height / bitmap.width * (imgCols * cw) / ch));
      } else if (cmd.rows !== void 0) {
        imgRows = cmd.rows;
        imgCols = Math.max(1, Math.ceil(bitmap.width / bitmap.height * (imgRows * ch) / cw));
      } else {
        imgCols = Math.ceil(bitmap.width / cw);
        imgRows = Math.ceil(bitmap.height / ch);
      }
      let w = bitmap.width;
      let h = bitmap.height;
      if (cmd.columns !== void 0 || cmd.rows !== void 0) {
        w = Math.round(imgCols * cw);
        h = Math.round(imgRows * ch);
      }
      if (w * h > this._opts.pixelLimit) {
        throw new Error("image exceeds pixel limit");
      }
      const buffer = this._coreTerminal._core.buffer;
      const savedX = buffer.x;
      const savedY = buffer.y;
      const savedYbase = buffer.ybase;
      const wantsBottom = cmd.zIndex !== void 0 && cmd.zIndex < 0;
      const layer = wantsBottom ? "bottom" : "top";
      if (w !== bitmap.width || h !== bitmap.height) {
        const scaled = await createImageBitmap(bitmap, { resizeWidth: w, resizeHeight: h });
        bitmap.close();
        bitmap = scaled;
      }
      const xOffset = Math.min(Math.max(0, cmd.xOffset ?? 0), cw - 1);
      const yOffset = Math.min(Math.max(0, cmd.yOffset ?? 0), ch - 1);
      if (xOffset !== 0 || yOffset !== 0) {
        const canvasW = cmd.columns !== void 0 ? Math.round(imgCols * cw) : bitmap.width + xOffset;
        const canvasH = cmd.rows !== void 0 ? Math.round(imgRows * ch) : bitmap.height + yOffset;
        const offsetCanvas = ImageRenderer.createCanvas(window.document, canvasW, canvasH);
        const offsetCtx = offsetCanvas.getContext("2d");
        if (!offsetCtx) {
          throw new Error("Failed to create offset canvas context");
        }
        offsetCtx.drawImage(bitmap, xOffset, yOffset);
        const offsetBitmap = await createImageBitmap(offsetCanvas);
        offsetCanvas.width = offsetCanvas.height = 0;
        bitmap.close();
        bitmap = offsetBitmap;
        w = bitmap.width;
        h = bitmap.height;
        if (w * h > this._opts.pixelLimit) {
          throw new Error("image exceeds pixel limit");
        }
        if (cmd.columns === void 0) {
          imgCols = Math.ceil(bitmap.width / cw);
        }
        if (cmd.rows === void 0) {
          imgRows = Math.ceil(bitmap.height / ch);
        }
      }
      const zIndex = cmd.zIndex ?? 0;
      this._kittyStorage.addImage(image.id, bitmap, true, layer, zIndex);
      bitmap = void 0;
      if (cmd.cursorMovement === 1) {
        const scrolled = buffer.ybase - savedYbase;
        buffer.x = savedX;
        buffer.y = Math.max(savedY - scrolled, 0);
      } else {
        buffer.x = Math.min(savedX + imgCols, this._coreTerminal.cols);
      }
    } catch (e) {
      bitmap?.close();
      throw e;
    }
  }
  // Create ImageBitmap from already-decoded image data.
  async _createBitmap(image) {
    let bytes = new Uint8Array(await image.data.arrayBuffer());
    if (image.compression === "z" /* ZLIB */) {
      bytes = await this._decompressZlib(bytes);
    }
    if (image.format === 100 /* PNG */) {
      const blob = new Blob([bytes], { type: "image/png" });
      if (!window.createImageBitmap) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        return new Promise((resolve, reject) => {
          img.addEventListener("load", () => {
            URL.revokeObjectURL(url);
            const canvas = ImageRenderer.createCanvas(window.document, img.width, img.height);
            canvas.getContext("2d")?.drawImage(img, 0, 0);
            createImageBitmap(canvas).then(resolve).catch(reject);
          });
          img.addEventListener("error", () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
          });
          img.src = url;
        });
      }
      return createImageBitmap(blob);
    }
    const width = image.width;
    const height = image.height;
    if (!width || !height) {
      throw new Error("Width and height required for raw pixel data");
    }
    const bytesPerPixel = image.format === 32 /* RGBA */ ? 4 /* BYTES_PER_PIXEL_RGBA */ : 3 /* BYTES_PER_PIXEL_RGB */;
    const expectedBytes = width * height * bytesPerPixel;
    if (bytes.length < expectedBytes) {
      throw new Error("Insufficient pixel data");
    }
    const pixelCount = width * height;
    if (image.format === 32 /* RGBA */) {
      return createImageBitmap(new ImageData(new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, pixelCount * 4 /* BYTES_PER_PIXEL_RGBA */), width, height));
    }
    const data = new Uint8ClampedArray(pixelCount * 4 /* BYTES_PER_PIXEL_RGBA */);
    const src32 = new Uint32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
    const dst32 = new Uint32Array(data.buffer);
    const alignedPixels = pixelCount & ~3;
    let srcOffset = 0;
    let dstOffset = 0;
    for (let i = 0; i < alignedPixels; i += 4) {
      const b0 = src32[srcOffset++];
      const b1 = src32[srcOffset++];
      const b2 = src32[srcOffset++];
      dst32[dstOffset++] = 4278190080 | b0;
      dst32[dstOffset++] = 4278190080 | b0 >>> 24 | b1 << 8;
      dst32[dstOffset++] = 4278190080 | b1 >>> 16 | b2 << 16;
      dst32[dstOffset++] = 4278190080 | b2 >>> 8;
    }
    let srcByte = alignedPixels * 3 /* BYTES_PER_PIXEL_RGB */;
    let dstByte = alignedPixels * 4 /* BYTES_PER_PIXEL_RGBA */;
    for (let i = alignedPixels; i < pixelCount; i++) {
      data[dstByte] = bytes[srcByte];
      data[dstByte + 1] = bytes[srcByte + 1];
      data[dstByte + 2] = bytes[srcByte + 2];
      data[dstByte + 3] = 255 /* ALPHA_OPAQUE */;
      srcByte += 3 /* BYTES_PER_PIXEL_RGB */;
      dstByte += 4 /* BYTES_PER_PIXEL_RGBA */;
    }
    return createImageBitmap(new ImageData(data, width, height));
  }
  async _decompressZlib(compressed) {
    try {
      return await this._decompress(compressed, "deflate");
    } catch {
      return await this._decompress(compressed, "deflate-raw");
    }
  }
  async _decompress(compressed, format) {
    const ds = new DecompressionStream(format);
    const writer = ds.writable.getWriter();
    writer.write(compressed);
    writer.close();
    const chunks = [];
    const reader = ds.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
  get images() {
    return this._kittyStorage.images;
  }
  get _kittyIdToStorageId() {
    return this._kittyStorage.kittyIdToStorageId;
  }
  get pendingTransmissions() {
    return this._pendingTransmissions;
  }
};

// addons/addon-image/src/kitty/KittyImageStorage.ts
var _KittyImageStorage = class _KittyImageStorage {
  constructor(_storage) {
    this._storage = _storage;
    this._nextImageId = 1;
    this._images = /* @__PURE__ */ new Map();
    // TODO: Support multiple placements per image. The kitty spec identifies
    // placements by an (image id, placement id) pair — same i + different p
    // values should coexist, and same i + same p should replace the prior
    // placement. Currently we track only one storage entry per kitty image id,
    // so multiple placements of the same image overwrite each other. Fixing
    // this requires changing these maps to Map<number, Map<number, number>>
    // (kittyId → placementId → storageId) and updating addImage/deleteById
    // accordingly. The underlying shared ImageStorage would also need to
    // support multiple entries per logical image.
    this._kittyIdToStorageId = /* @__PURE__ */ new Map();
    this._storageIdToKittyId = /* @__PURE__ */ new Map();
    this._handleStorageImageDeleted = (storageId) => {
      const kittyId = this._storageIdToKittyId.get(storageId);
      if (kittyId !== void 0) {
        this._kittyIdToStorageId.delete(kittyId);
        this._storageIdToKittyId.delete(storageId);
        this._images.delete(kittyId);
      }
    };
    this._addImageOpts = { scrolling: true, layer: "top", zIndex: 0, cursorPos: "iip" };
    this._previousOnImageDeleted = this._storage.onImageDeleted;
    this._wrappedOnImageDeleted = (storageId) => {
      this._previousOnImageDeleted?.(storageId);
      this._handleStorageImageDeleted(storageId);
    };
    this._storage.onImageDeleted = this._wrappedOnImageDeleted;
  }
  reset() {
    this._nextImageId = 1;
    this._images.clear();
    this._kittyIdToStorageId.clear();
    this._storageIdToKittyId.clear();
  }
  dispose() {
    this.reset();
    if (this._storage.onImageDeleted === this._wrappedOnImageDeleted) {
      this._storage.onImageDeleted = this._previousOnImageDeleted;
    }
  }
  storeImage(id, imageData) {
    const imageId = id ?? this._nextImageId++;
    const oldStorageId = this._kittyIdToStorageId.get(imageId);
    if (oldStorageId !== void 0) {
      this._storage.deleteImage(oldStorageId);
      this._kittyIdToStorageId.delete(imageId);
      this._storageIdToKittyId.delete(oldStorageId);
    }
    if (!this._images.has(imageId) && this._images.size >= _KittyImageStorage._maxStoredImages) {
      this._evictUndisplayedImages();
    }
    this._images.set(imageId, {
      ...imageData,
      id: imageId
    });
    return imageId;
  }
  addImage(kittyId, image, scrolling, layer, zIndex) {
    const oldStorageId = this._kittyIdToStorageId.get(kittyId);
    if (oldStorageId !== void 0) {
      this._storageIdToKittyId.delete(oldStorageId);
    }
    this._addImageOpts.scrolling = scrolling;
    this._addImageOpts.layer = layer;
    this._addImageOpts.zIndex = zIndex;
    const storageId = this._storage.addImage(image, this._addImageOpts);
    this._kittyIdToStorageId.set(kittyId, storageId);
    this._storageIdToKittyId.set(storageId, kittyId);
  }
  getImage(kittyId) {
    return this._images.get(kittyId);
  }
  deleteById(kittyId) {
    this._images.delete(kittyId);
    const storageId = this._kittyIdToStorageId.get(kittyId);
    if (storageId !== void 0) {
      this._storage.deleteImage(storageId);
      this._kittyIdToStorageId.delete(kittyId);
      this._storageIdToKittyId.delete(storageId);
    }
  }
  deleteAll() {
    this._images.clear();
    for (const storageId of this._kittyIdToStorageId.values()) {
      this._storage.deleteImage(storageId);
    }
    this._kittyIdToStorageId.clear();
    this._storageIdToKittyId.clear();
  }
  get images() {
    return this._images;
  }
  get kittyIdToStorageId() {
    return this._kittyIdToStorageId;
  }
  get lastImageId() {
    return this._nextImageId - 1;
  }
  _evictUndisplayedImages() {
    for (const [kittyId] of this._images) {
      if (this._images.size <= _KittyImageStorage._maxStoredImages / 2) {
        break;
      }
      if (!this._kittyIdToStorageId.has(kittyId)) {
        this._images.delete(kittyId);
      }
    }
  }
};
_KittyImageStorage._maxStoredImages = 256;
var KittyImageStorage = _KittyImageStorage;
export {
  KittyGraphicsHandler,
  KittyImageStorage,
  parseKittyCommand
};
/**
 * Copyright (c) 2024-2026 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * Minimal lifecycle utilities for xterm.js core.
 * Simplified from VS Code's lifecycle.ts - no tracking/leak detection.
 */
/**
 * Copyright (c) 2020 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2019 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2026 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * Kitty graphics protocol types, constants, and parsing utilities.
 */
/**
 * Copyright (c) 2026 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/*! Bundled license information:

sixel/lib/Colors.js:
  (**
   * Copyright (c) 2019 Joerg Breitbart.
   * @license MIT
   *)

inwasm-runtime/lib/index.cjs:
  (**
   * Copyright (c) 2022, 2026 Joerg Breitbart
   * @license MIT
   *)

xterm-wasm-parts/lib/base64/Base64Decoder.wasm.js:
  (**
   * Copyright (c) 2023, 2026 The xterm.js authors. All rights reserved.
   * @license MIT
   *)
*/
