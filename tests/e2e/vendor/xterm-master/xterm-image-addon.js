"use strict";
var XtermImageAddon = (() => {
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
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
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
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

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
      function toRGBA88883(r, g, b, a = 255) {
        return ((a & 255) << 24 | (b & 255) << 16 | (g & 255) << 8 | r & 255) >>> 0;
      }
      exports.toRGBA8888 = toRGBA88883;
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
          return toRGBA88883(v, v, v);
        }
        const t1 = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const t2 = 2 * l - t1;
        return toRGBA88883(clamp(0, 255, Math.round(h2c(t1, t2, h + 1 / 3) * 255)), clamp(0, 255, Math.round(h2c(t1, t2, h) * 255)), clamp(0, 255, Math.round(h2c(t1, t2, h - 1 / 3) * 255)));
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
          toRGBA88883(0, 0, 0),
          toRGBA88883(205, 0, 0),
          toRGBA88883(0, 205, 0),
          toRGBA88883(205, 205, 0),
          toRGBA88883(0, 0, 238),
          toRGBA88883(205, 0, 205),
          toRGBA88883(0, 250, 205),
          toRGBA88883(229, 229, 229),
          toRGBA88883(127, 127, 127),
          toRGBA88883(255, 0, 0),
          toRGBA88883(0, 255, 0),
          toRGBA88883(255, 255, 0),
          toRGBA88883(92, 92, 255),
          toRGBA88883(255, 0, 255),
          toRGBA88883(0, 255, 255),
          toRGBA88883(255, 255, 255)
        ];
        const d = [0, 95, 135, 175, 215, 255];
        for (let r = 0; r < 6; ++r) {
          for (let g = 0; g < 6; ++g) {
            for (let b = 0; b < 6; ++b) {
              p.push(toRGBA88883(d[r], d[g], d[b]));
            }
          }
        }
        for (let v = 8; v <= 238; v += 10) {
          p.push(toRGBA88883(v, v, v));
        }
        return new Uint32Array(p);
      })();
      exports.DEFAULT_BACKGROUND = toRGBA88883(0, 0, 0, 255);
      exports.DEFAULT_FOREGROUND = toRGBA88883(255, 255, 255, 255);
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
      var Base64Decoder3 = class {
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
      exports.default = Base64Decoder3;
    }
  });

  // node_modules/xterm-wasm-parts/lib/qoi/QoiDecoder.wasm.js
  var require_QoiDecoder_wasm = __commonJS({
    "node_modules/xterm-wasm-parts/lib/qoi/QoiDecoder.wasm.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var inwasm_runtime_1 = require_lib();
      var wasmQoiDecode = (0, inwasm_runtime_1.InWasm)(
        /*inwasm#459f9e1bfb80b1a8:rdef-start:"qoi_decode"*/
        { s: 1, t: 0, d: "AGFzbQEAAAABCgJgAABgA39/fwACDwEDZW52Bm1lbW9yeQIAAQMDAgABBwcBA2RlYwABCAEACu4EAgwAQQBBAEGAAvwLAAveBAEJf0EAQQBBgAL8CwAgAUEXTgRAIAAgAWpBCGshCkGACCEBIAJBAnRBgAhqIQsgAEEOaiEDQf8BIQZBACECA0AgA0EBaiEHIAMtAAAiCEE/cSEAAkACQCAIQcABcSIJRQRAIABBAnQiAC0AAyEGIAAtAAIhBCAALQABIQUgAC0AACECIAchAwwBCwJAIAhB/QFLDQAgCUHAAUcNACAFQQVsIAJBA2xqIARBB2xqIAZBC2xqQT9xQQJ0IgMgBDoAAiADIAU6AAEgAyACOgAAIANBA2ogBjoAAANAIAEgAjoAACABQQNqIAY6AAAgAUECaiAEOgAAIAFBAWogBToAACABQQRqIQEgAEUEQCAHIQMMBAsgAEEBayEAIAEgC0kNAAsgByEDDAILAn8CQAJAAkAgCEH+AWsOAgABAgsgAy0AAyEEIAMtAAIhBSADLQABIQIgA0EEagwCCyADKAIBIgJBGHYhBiACQRB2IQQgAkEIdiEFIANBBWoMAQsgCUGAAUcEQCAHIAlBwABHDQEaIAQgCEEDcWpBAmshBCACIABBBHZqQQJrIQIgBSAIQQJ2QQNxakECayEFIAcMAQsgBCAAQShrIgkgAy0AASIHQQ9xamohBCACIAdBBHYgCWpqIQIgACAFakEgayEFIANBAmoLIQMgBUEFbCACQQNsaiAEQQdsaiAGQQtsakE/cUECdCIAIAQ6AAIgACAFOgABIAAgAjoAACAAQQNqIAY6AAALIAEgBjoAAyABIAQ6AAIgASAFOgABIAEgAjoAACABQQRqIQELIAMgCkkNAAsLCw==" }
        /*inwasm#459f9e1bfb80b1a8:rdef-end:"qoi_decode"*/
      );
      var QoiDecoder2 = class {
        constructor(keepSize) {
          this.keepSize = keepSize;
          this.width = 0;
          this.height = 0;
        }
        decode(d) {
          this.width = d[4] << 24 | d[5] << 16 | d[6] << 8 | d[7];
          this.height = d[8] << 24 | d[9] << 16 | d[10] << 8 | d[11];
          const pixels = this.width * this.height;
          const ib = pixels * 4;
          const dl = d.length;
          const bytes = Math.max(ib, dl) + (Math.min(ib, dl) >> 1) + 4096;
          if (!this._inst) {
            this._mem = new WebAssembly.Memory({ initial: Math.ceil(bytes / 65536) });
            this._inst = wasmQoiDecode({ env: { memory: this._mem } });
          } else if (this._mem.buffer.byteLength < bytes) {
            this._mem.grow(Math.ceil((bytes - this._mem.buffer.byteLength) / 65536));
            this._d = null;
          }
          if (!this._d) {
            this._d = new Uint8Array(this._mem.buffer);
          }
          const chunkP = this._mem.buffer.byteLength - dl & ~255;
          this._d.set(d, chunkP);
          this._inst.exports.dec(chunkP, dl, pixels);
          return this._d.subarray(1024, 1024 + ib);
        }
        release() {
          if (!this._inst)
            return;
          if (this._mem.buffer.byteLength > this.keepSize) {
            this._inst = this._d = this._mem = null;
          }
        }
      };
      exports.default = QoiDecoder2;
    }
  });

  // node_modules/sixel/lib/wasm.js
  var require_wasm = __commonJS({
    "node_modules/sixel/lib/wasm.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.LIMITS = void 0;
      exports.LIMITS = {
        CHUNK_SIZE: 16384,
        PALETTE_SIZE: 4096,
        MAX_WIDTH: 16384,
        BYTES: "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AEHAiwIgADcDAEG4iwIgADcDAEGwiwIgADcDAEGoiwIgADcDAEGgiwIgADcDAEGYiwIgADcDAEGQiwIgADcDAEGIiwIgADcDAEGAiwIgADcDAEH4igIgADcDAEHwigIgADcDAEHoigIgADcDAEHgigIgADcDAEHYigIgADcDAEHQigIgADcDAEHIigIgADcDAEHAigIgADcDAEG4igIgADcDAEGwigIgADcDAEGoigIgADcDAEGgigIgADcDAEGYigIgADcDAEGQigIgADcDAEGIigIgADcDAEGAigIgADcDAEH4iQIgADcDAEHwiQIgADcDAEHoiQIgADcDAEHgiQIgADcDAEHYiQIgADcDAEHQiQIgADcDAEHIiQIgADcDAEHAiQIgADcDAEG4iQIgADcDAEGwiQIgADcDAEGoCCgCACIEQf8AakGAAW0hCAJAIARBgQFIDQBBASEBIAhBAiAIQQJKG0EBayICQQFxIQMgBEGBAk4EQCACQX5xIQIDQCABQQl0IgdBEHJBoIkCakGwiQJBgAT8CgAAIAdBsI0CakGwiQJBgAT8CgAAIAFBAmohASACQQJrIgINAAsLIANFDQAgAUEJdEEQckGgiQJqQbCJAkGABPwKAAALAkAgBEEBSA0AIAhBASAIQQFKGyIDQQFxIQUCQCADQQFrIgdFBEBBACEBDAELIANB/v///wdxIQJBACEBA0AgAUEJdCIGQRByQbCJBmpBsIkCQYAE/AoAACAGQZAEckGwiQZqQbCJAkGABPwKAAAgAUECaiEBIAJBAmsiAg0ACwsgBQRAIAFBCXRBEHJBsIkGakGwiQJBgAT8CgAACyAEQQFIDQAgA0EBcSEFIAcEfyADQf7///8HcSECQQAhAQNAIAFBCXQiBkEQckHAiQpqQbCJAkGABPwKAAAgBkGQBHJBwIkKakGwiQJBgAT8CgAAIAFBAmohASACQQJrIgINAAsgAUEHdEEEcgVBBAshASAFBEAgAUECdEHAiQpqQbCJAkGABPwKAAALIARBAUgNACADQQFxIQUgBwR/IANB/v///wdxIQJBACEBA0AgAUEJdCIGQRByQdCJDmpBsIkCQYAE/AoAACAGQZAEckHQiQ5qQbCJAkGABPwKAAAgAUECaiEBIAJBAmsiAg0ACyABQQd0QQRyBUEECyEBIAUEQCABQQJ0QdCJ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"
      };
    }
  });

  // node_modules/sixel/lib/Decoder.js
  var require_Decoder = __commonJS({
    "node_modules/sixel/lib/Decoder.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.decodeAsync = exports.decode = exports.Decoder = exports.DecoderAsync = void 0;
      var Colors_1 = require_Colors();
      var wasm_1 = require_wasm();
      function decodeBase64(s) {
        if (typeof Buffer !== "undefined") {
          return Buffer.from(s, "base64");
        }
        const bytestring = atob(s);
        const result = new Uint8Array(bytestring.length);
        for (let i = 0; i < result.length; ++i) {
          result[i] = bytestring.charCodeAt(i);
        }
        return result;
      }
      var WASM_BYTES = decodeBase64(wasm_1.LIMITS.BYTES);
      var WASM_MODULE;
      var NULL_CANVAS = new Uint32Array();
      var CallbackProxy = class {
        constructor() {
          this.bandHandler = (width) => 1;
          this.modeHandler = (mode) => 1;
        }
        handle_band(width) {
          return this.bandHandler(width);
        }
        mode_parsed(mode) {
          return this.modeHandler(mode);
        }
      };
      var DEFAULT_OPTIONS2 = {
        memoryLimit: 2048 * 65536,
        sixelColor: Colors_1.DEFAULT_FOREGROUND,
        fillColor: Colors_1.DEFAULT_BACKGROUND,
        palette: Colors_1.PALETTE_VT340_COLOR,
        paletteLimit: wasm_1.LIMITS.PALETTE_SIZE,
        truncate: true
      };
      function DecoderAsync2(opts) {
        const cbProxy = new CallbackProxy();
        const importObj = {
          env: {
            handle_band: cbProxy.handle_band.bind(cbProxy),
            mode_parsed: cbProxy.mode_parsed.bind(cbProxy)
          }
        };
        return WebAssembly.instantiate(WASM_MODULE || WASM_BYTES, importObj).then((inst) => {
          WASM_MODULE = WASM_MODULE || inst.module;
          return new Decoder2(opts, inst.instance || inst, cbProxy);
        });
      }
      exports.DecoderAsync = DecoderAsync2;
      var Decoder2 = class {
        /**
         * Synchonous ctor. Can be called from nodejs or a webworker context.
         * For instantiation in the browser main thread use `WasmDecoderAsync` instead.
         */
        constructor(opts, _instance, _cbProxy) {
          this._PIXEL_OFFSET = wasm_1.LIMITS.MAX_WIDTH + 4;
          this._canvas = NULL_CANVAS;
          this._bandWidths = [];
          this._maxWidth = 0;
          this._minWidth = wasm_1.LIMITS.MAX_WIDTH;
          this._lastOffset = 0;
          this._currentHeight = 0;
          this._opts = Object.assign({}, DEFAULT_OPTIONS2, opts);
          if (this._opts.paletteLimit > wasm_1.LIMITS.PALETTE_SIZE) {
            throw new Error(`DecoderOptions.paletteLimit must not exceed ${wasm_1.LIMITS.PALETTE_SIZE}`);
          }
          if (!_instance) {
            const module2 = WASM_MODULE || (WASM_MODULE = new WebAssembly.Module(WASM_BYTES));
            _instance = new WebAssembly.Instance(module2, {
              env: {
                handle_band: this._handle_band.bind(this),
                mode_parsed: this._initCanvas.bind(this)
              }
            });
          } else {
            _cbProxy.bandHandler = this._handle_band.bind(this);
            _cbProxy.modeHandler = this._initCanvas.bind(this);
          }
          this._instance = _instance;
          this._wasm = this._instance.exports;
          this._chunk = new Uint8Array(this._wasm.memory.buffer, this._wasm.get_chunk_address(), wasm_1.LIMITS.CHUNK_SIZE);
          this._states = new Uint32Array(this._wasm.memory.buffer, this._wasm.get_state_address(), 12);
          this._palette = new Uint32Array(this._wasm.memory.buffer, this._wasm.get_palette_address(), wasm_1.LIMITS.PALETTE_SIZE);
          this._palette.set(this._opts.palette);
          this._pSrc = new Uint32Array(this._wasm.memory.buffer, this._wasm.get_p0_address());
          this._wasm.init(Colors_1.DEFAULT_FOREGROUND, 0, this._opts.paletteLimit, 0);
        }
        // some readonly parser states for internal usage
        get _fillColor() {
          return this._states[0];
        }
        get _truncate() {
          return this._states[8];
        }
        get _rasterWidth() {
          return this._states[6];
        }
        get _rasterHeight() {
          return this._states[7];
        }
        get _width() {
          return this._states[2] ? this._states[2] - 4 : 0;
        }
        get _height() {
          return this._states[3];
        }
        get _level() {
          return this._states[9];
        }
        get _mode() {
          return this._states[10];
        }
        get _paletteLimit() {
          return this._states[11];
        }
        _initCanvas(mode) {
          if (mode === 2) {
            const pixels = this.width * this.height;
            if (pixels > this._canvas.length) {
              if (this._opts.memoryLimit && pixels * 4 > this._opts.memoryLimit) {
                this.release();
                throw new Error("image exceeds memory limit");
              }
              this._canvas = new Uint32Array(pixels);
            }
            this._maxWidth = this._width;
          } else if (mode === 1) {
            if (this._level === 2) {
              const pixels = Math.min(this._rasterWidth, wasm_1.LIMITS.MAX_WIDTH) * this._rasterHeight;
              if (pixels > this._canvas.length) {
                if (this._opts.memoryLimit && pixels * 4 > this._opts.memoryLimit) {
                  this.release();
                  throw new Error("image exceeds memory limit");
                }
                this._canvas = new Uint32Array(pixels);
              }
            } else {
              if (this._canvas.length < 65536) {
                this._canvas = new Uint32Array(65536);
              }
            }
          }
          return 0;
        }
        _realloc(offset, additionalPixels) {
          const pixels = offset + additionalPixels;
          if (pixels > this._canvas.length) {
            if (this._opts.memoryLimit && pixels * 4 > this._opts.memoryLimit) {
              this.release();
              throw new Error("image exceeds memory limit");
            }
            const newCanvas = new Uint32Array(Math.ceil(pixels / 65536) * 65536);
            newCanvas.set(this._canvas);
            this._canvas = newCanvas;
          }
        }
        _handle_band(width) {
          const adv = this._PIXEL_OFFSET;
          let offset = this._lastOffset;
          if (this._mode === 2) {
            let remaining = this.height - this._currentHeight;
            let c = 0;
            while (c < 6 && remaining > 0) {
              this._canvas.set(this._pSrc.subarray(adv * c, adv * c + width), offset + width * c);
              c++;
              remaining--;
            }
            this._lastOffset += width * c;
            this._currentHeight += c;
          } else if (this._mode === 1) {
            this._realloc(offset, width * 6);
            this._maxWidth = Math.max(this._maxWidth, width);
            this._minWidth = Math.min(this._minWidth, width);
            for (let i = 0; i < 6; ++i) {
              this._canvas.set(this._pSrc.subarray(adv * i, adv * i + width), offset + width * i);
            }
            this._bandWidths.push(width);
            this._lastOffset += width * 6;
            this._currentHeight += 6;
          }
          return 0;
        }
        /**
         * Width of the image data.
         * Returns the rasterWidth in level2/truncating mode,
         * otherwise the max width, that has been seen so far.
         */
        get width() {
          return this._mode !== 1 ? this._width : Math.max(this._maxWidth, this._wasm.current_width());
        }
        /**
         * Height of the image data.
         * Returns the rasterHeight in level2/truncating mode,
         * otherwise height touched by sixels.
         */
        get height() {
          return this._mode !== 1 ? this._height : this._wasm.current_width() ? this._bandWidths.length * 6 + this._wasm.current_height() : this._bandWidths.length * 6;
        }
        /**
         * Get active palette colors as RGBA8888[] (borrowed).
         */
        get palette() {
          return this._palette.subarray(0, this._paletteLimit);
        }
        /**
         * Get the memory used by the decoder.
         *
         * This is a rough estimate accounting the wasm instance memory
         * and pixel buffers held on JS side (real value will be slightly
         * higher due to JS book-keeping).
         * Note that the decoder does not free ressources on its own,
         * call `release` to free excess memory.
         */
        get memoryUsage() {
          return this._canvas.byteLength + this._wasm.memory.buffer.byteLength + 8 * this._bandWidths.length;
        }
        /**
         * Get various properties of the decoder and the current image.
         */
        get properties() {
          return {
            width: this.width,
            height: this.height,
            mode: this._mode,
            level: this._level,
            truncate: !!this._truncate,
            paletteLimit: this._paletteLimit,
            fillColor: this._fillColor,
            memUsage: this.memoryUsage,
            rasterAttributes: {
              numerator: this._states[4],
              denominator: this._states[5],
              width: this._rasterWidth,
              height: this._rasterHeight
            }
          };
        }
        /**
         * Initialize decoder for next image. Must be called before
         * any calls to `decode` or `decodeString`.
         */
        // FIXME: reorder arguments, better palette handling
        init(fillColor = this._opts.fillColor, palette = this._opts.palette, paletteLimit = this._opts.paletteLimit, truncate = this._opts.truncate) {
          this._wasm.init(this._opts.sixelColor, fillColor, paletteLimit, truncate ? 1 : 0);
          if (palette) {
            this._palette.set(palette.subarray(0, wasm_1.LIMITS.PALETTE_SIZE));
          }
          this._bandWidths.length = 0;
          this._maxWidth = 0;
          this._minWidth = wasm_1.LIMITS.MAX_WIDTH;
          this._lastOffset = 0;
          this._currentHeight = 0;
        }
        /**
         * Decode next chunk of data from start to end index (exclusive).
         * @throws Will throw if the image exceeds the memory limit.
         */
        decode(data, start = 0, end = data.length) {
          let p = start;
          while (p < end) {
            const length = Math.min(end - p, wasm_1.LIMITS.CHUNK_SIZE);
            this._chunk.set(data.subarray(p, p += length));
            this._wasm.decode(0, length);
          }
        }
        /**
         * Decode next chunk of string data from start to end index (exclusive).
         * Note: Decoding from string data is rather slow, use `decode` with byte data instead.
         * @throws Will throw if the image exceeds the memory limit.
         */
        decodeString(data, start = 0, end = data.length) {
          let p = start;
          while (p < end) {
            const length = Math.min(end - p, wasm_1.LIMITS.CHUNK_SIZE);
            for (let i = 0, j = p; i < length; ++i, ++j) {
              this._chunk[i] = data.charCodeAt(j);
            }
            p += length;
            this._wasm.decode(0, length);
          }
        }
        /**
         * Get current pixel data as 32-bit typed array (RGBA8888).
         * Also peeks into pixel data of the current band, that got not pushed yet.
         */
        get data32() {
          if (this._mode === 0 || !this.width || !this.height) {
            return NULL_CANVAS;
          }
          const currentWidth = this._wasm.current_width();
          if (this._mode === 2) {
            let remaining = this.height - this._currentHeight;
            if (remaining > 0) {
              const adv = this._PIXEL_OFFSET;
              let offset = this._lastOffset;
              let c = 0;
              while (c < 6 && remaining > 0) {
                this._canvas.set(this._pSrc.subarray(adv * c, adv * c + currentWidth), offset + currentWidth * c);
                c++;
                remaining--;
              }
              if (remaining) {
                this._canvas.fill(this._fillColor, offset + currentWidth * c);
              }
            }
            return this._canvas.subarray(0, this.width * this.height);
          }
          if (this._mode === 1) {
            if (this._minWidth === this._maxWidth) {
              let escape = false;
              if (currentWidth) {
                if (currentWidth !== this._minWidth) {
                  escape = true;
                } else {
                  const adv = this._PIXEL_OFFSET;
                  let offset = this._lastOffset;
                  this._realloc(offset, currentWidth * 6);
                  for (let i = 0; i < 6; ++i) {
                    this._canvas.set(this._pSrc.subarray(adv * i, adv * i + currentWidth), offset + currentWidth * i);
                  }
                }
              }
              if (!escape) {
                return this._canvas.subarray(0, this.width * this.height);
              }
            }
            const final = new Uint32Array(this.width * this.height);
            final.fill(this._fillColor);
            let finalOffset = 0;
            let start = 0;
            for (let i = 0; i < this._bandWidths.length; ++i) {
              const bw = this._bandWidths[i];
              for (let p = 0; p < 6; ++p) {
                final.set(this._canvas.subarray(start, start += bw), finalOffset);
                finalOffset += this.width;
              }
            }
            if (currentWidth) {
              const adv = this._PIXEL_OFFSET;
              const currentHeight = this._wasm.current_height();
              for (let i = 0; i < currentHeight; ++i) {
                final.set(this._pSrc.subarray(adv * i, adv * i + currentWidth), finalOffset + this.width * i);
              }
            }
            return final;
          }
          return NULL_CANVAS;
        }
        /**
         * Same as `data32`, but returning pixel data as Uint8ClampedArray suitable
         * for direct usage with `ImageData`.
         */
        get data8() {
          return new Uint8ClampedArray(this.data32.buffer, 0, this.width * this.height * 4);
        }
        /**
         * Release image ressources on JS side held by the decoder.
         *
         * The decoder tries to re-use memory ressources of a previous image
         * to lower allocation and GC pressure. Decoding a single big image
         * will grow the memory usage of the decoder permanently.
         * Call `release` to reset the internal buffers and free the memory.
         * Note that this destroys the image data, call it when done processing
         * a rather big image, otherwise it is not needed. Use `memoryUsage`
         * to decide, whether the held memory is still within your limits.
         * This does not affect the wasm module (operates on static memory).
         */
        release() {
          this._canvas = NULL_CANVAS;
          this._bandWidths.length = 0;
          this._maxWidth = 0;
          this._minWidth = wasm_1.LIMITS.MAX_WIDTH;
          this._wasm.init(Colors_1.DEFAULT_FOREGROUND, 0, this._opts.paletteLimit, 0);
        }
      };
      exports.Decoder = Decoder2;
      function decode(data, opts) {
        const dec = new Decoder2(opts);
        dec.init();
        typeof data === "string" ? dec.decodeString(data) : dec.decode(data);
        return {
          width: dec.width,
          height: dec.height,
          data32: dec.data32,
          data8: dec.data8
        };
      }
      exports.decode = decode;
      async function decodeAsync(data, opts) {
        const dec = await DecoderAsync2(opts);
        dec.init();
        typeof data === "string" ? dec.decodeString(data) : dec.decode(data);
        return {
          width: dec.width,
          height: dec.height,
          data32: dec.data32,
          data8: dec.data8
        };
      }
      exports.decodeAsync = decodeAsync;
    }
  });

  // addons/addon-image/src/BrowserKitty.ts
  var BrowserKitty_exports = {};
  __export(BrowserKitty_exports, {
    ImageAddon: () => ImageAddon
  });

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

  // src/common/Event.ts
  var Emitter = class {
    constructor() {
      this._listeners = [];
      this._disposed = false;
    }
    get event() {
      if (this._event) {
        return this._event;
      }
      this._event = (listener, thisArgs, disposables) => {
        if (this._disposed) {
          return toDisposable(() => {
          });
        }
        const entry = { fn: listener, thisArgs };
        this._listeners.push(entry);
        const result = toDisposable(() => {
          const idx = this._listeners.indexOf(entry);
          if (idx !== -1) {
            this._listeners.splice(idx, 1);
          }
        });
        if (disposables) {
          if (Array.isArray(disposables)) {
            disposables.push(result);
          } else {
            disposables.add(result);
          }
        }
        return result;
      };
      return this._event;
    }
    fire(event) {
      if (this._disposed) {
        return;
      }
      switch (this._listeners.length) {
        case 0:
          return;
        case 1: {
          const { fn, thisArgs } = this._listeners[0];
          fn.call(thisArgs, event);
          return;
        }
        default: {
          const listeners = this._listeners.slice();
          for (const { fn, thisArgs } of listeners) {
            fn.call(thisArgs, event);
          }
        }
      }
    }
    dispose() {
      if (this._disposed) {
        return;
      }
      this._disposed = true;
      this._listeners.length = 0;
    }
  };
  var EventUtils;
  ((EventUtils2) => {
    function forward(from, to) {
      return from((e) => to.fire(e));
    }
    EventUtils2.forward = forward;
    function map(event, map2) {
      return (listener, thisArgs, disposables) => {
        return event((i) => listener.call(thisArgs, map2(i)), void 0, disposables);
      };
    }
    EventUtils2.map = map;
    function any(...events) {
      return (listener, thisArgs, disposables) => {
        const store = new DisposableStore();
        for (const event of events) {
          store.add(event((e) => listener.call(thisArgs, e)));
        }
        if (disposables) {
          if (Array.isArray(disposables)) {
            disposables.push(store);
          } else {
            disposables.add(store);
          }
        }
        return store;
      };
    }
    EventUtils2.any = any;
    function runAndSubscribe(event, handler, initial) {
      handler(initial);
      return event((e) => handler(e));
    }
    EventUtils2.runAndSubscribe = runAndSubscribe;
  })(EventUtils || (EventUtils = {}));

  // addons/addon-image/src/ImageRenderer.ts
  var import_Colors = __toESM(require_Colors());
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
  var ImageStorage = class {
    constructor(_terminal, _renderer, _opts) {
      this._terminal = _terminal;
      this._renderer = _renderer;
      this._opts = _opts;
      // storage
      this._images = /* @__PURE__ */ new Map();
      // last used id
      this._lastId = 0;
      // last evicted id
      this._lowestId = 0;
      // whether a full clear happened before
      this._fullyCleared = false;
      // whether render should do a full clear
      this._needsFullClear = false;
      // hard limit of stored pixels (fallback limit of 10 MB)
      this._pixelLimit = 25e5;
      try {
        this.setLimit(this._opts.storageLimit);
      } catch (e) {
        if (e instanceof Error) {
          console.error(e.message);
        }
        console.warn(`storageLimit is set to ${this.getLimit()} MB`);
      }
      this._viewportMetrics = {
        cols: this._terminal.cols,
        rows: this._terminal.rows
      };
    }
    dispose() {
      this.reset();
    }
    reset() {
      for (const spec of this._images.values()) {
        spec.marker?.dispose();
      }
      this._images.clear();
      this._renderer.clearAll();
    }
    getLimit() {
      return this._pixelLimit * 4 / 1e6;
    }
    setLimit(value) {
      if (value < 0.5 || value > 1e3) {
        throw RangeError("invalid storageLimit, should be at least 0.5 MB and not exceed 1G");
      }
      this._pixelLimit = value / 4 * 1e6 >>> 0;
      this._evictOldest(0);
    }
    getUsage() {
      return this._getStoredPixels() * 4 / 1e6;
    }
    _getStoredPixels() {
      let storedPixels = 0;
      for (const spec of this._images.values()) {
        if (spec.orig) {
          storedPixels += spec.orig.width * spec.orig.height;
          if (spec.actual && spec.actual !== spec.orig) {
            storedPixels += spec.actual.width * spec.actual.height;
          }
        }
      }
      return storedPixels;
    }
    _delImg(id) {
      const spec = this._images.get(id);
      if (!spec) return;
      this._images.delete(id);
      if (window.ImageBitmap && spec.orig instanceof ImageBitmap) {
        spec.orig.close();
      }
      this.onImageDeleted?.(id);
    }
    /**
     * Wipe canvas and images on alternate buffer.
     */
    wipeAlternate() {
      const zero = [];
      for (const [id, spec] of this._images.entries()) {
        if (spec.bufferType === "alternate") {
          spec.marker?.dispose();
          zero.push(id);
        }
      }
      for (const id of zero) {
        this._delImg(id);
      }
      this._needsFullClear = true;
      this._fullyCleared = false;
    }
    /**
     * Delete an image by its internal storage ID.
     * Used by protocols that support explicit deletion (e.g. Kitty a=d).
     */
    deleteImage(id) {
      const spec = this._images.get(id);
      if (spec) {
        spec.marker?.dispose();
        this._delImg(id);
      }
    }
    /**
     * Method to add an image to the storage.
     * @param img - The image to add (canvas or bitmap).
     * @param opts - Options for addImage:
     *   - scrolling:  When true, cursor advances with the image.
     *                 When false, image is placed at ORIGIN and cursor does not move.
     *   - layer:      Which canvas layer to render on ('top' or 'bottom').
     *   - zIndex:     Z-index for image layering within the same layer.
     *   - cursorPos:  'vt340' for bottom-left, 'iip' for bottom.right.
     * @returns The internal image ID assigned to the stored image.
     */
    addImage(img, opts) {
      this._evictOldest(img.width * img.height);
      let cellSize = this._renderer.cellSize;
      if (cellSize.width === -1 || cellSize.height === -1) {
        cellSize = CELL_SIZE_DEFAULT;
      }
      const cols = Math.ceil(img.width / cellSize.width);
      const rows = Math.ceil(img.height / cellSize.height);
      const imageId = ++this._lastId;
      const buffer = this._terminal._core.buffer;
      const termCols = this._terminal.cols;
      const termRows = this._terminal.rows;
      const originX = buffer.x;
      const originY = buffer.y;
      let offset = originX;
      let tileCount = 0;
      if (!opts.scrolling) {
        buffer.x = 0;
        buffer.y = 0;
        offset = 0;
      }
      this._terminal._core._inputHandler._dirtyRowTracker.markDirty(buffer.y);
      for (let row = 0; row < rows; ++row) {
        const line = buffer.lines.get(buffer.y + buffer.ybase);
        for (let col = 0; col < cols; ++col) {
          if (offset + col >= termCols) break;
          this._writeToCell(line, offset + col, imageId, row * cols + col);
          tileCount++;
        }
        if (opts.scrolling) {
          if (row < rows - 1) this._terminal._core._inputHandler.lineFeed();
        } else {
          if (++buffer.y >= termRows) break;
        }
        buffer.x = offset;
      }
      this._terminal._core._inputHandler._dirtyRowTracker.markDirty(buffer.y);
      if (opts.scrolling) {
        if (opts.cursorPos === "iip") {
          buffer.x = Math.min(offset + cols, termCols);
        } else {
          buffer.x = offset;
        }
      } else {
        buffer.x = originX;
        buffer.y = originY;
      }
      const zero = [];
      for (const [id, spec] of this._images.entries()) {
        if (spec.tileCount < 1) {
          spec.marker?.dispose();
          zero.push(id);
        }
      }
      for (const id of zero) {
        this._delImg(id);
      }
      const endMarker = this._terminal.registerMarker(0);
      endMarker?.onDispose(() => {
        const spec = this._images.get(imageId);
        if (spec) {
          this._delImg(imageId);
        }
      });
      if (this._terminal.buffer.active.type === "alternate") {
        this._evictOnAlternate();
      }
      const imgSpec = {
        orig: img,
        origCellSize: cellSize,
        actual: img,
        actualCellSize: { ...cellSize },
        // clone needed, since later modified
        marker: endMarker || void 0,
        tileCount,
        bufferType: this._terminal.buffer.active.type,
        layer: opts.layer,
        zIndex: opts.zIndex
      };
      this._images.set(imageId, imgSpec);
      this.onImageAdded?.();
      return imageId;
    }
    /**
     * Render method. Collects buffer information and triggers
     * canvas updates.
     */
    // TODO: Should we move this to the ImageRenderer?
    render(range) {
      let hasTopImages = false;
      let hasBottomImages = false;
      for (const spec of this._images.values()) {
        if (spec.layer === "bottom") {
          hasBottomImages = true;
        } else {
          hasTopImages = true;
        }
        if (hasTopImages && hasBottomImages) break;
      }
      if (hasTopImages && !this._renderer.hasLayer("top")) {
        this._renderer.insertLayerToDom("top");
        if (!this._renderer.hasLayer("top")) return;
      }
      if (hasBottomImages && !this._renderer.hasLayer("bottom")) {
        this._renderer.insertLayerToDom("bottom");
      }
      this._renderer.rescaleCanvas();
      if (!this._images.size) {
        if (!this._fullyCleared) {
          this._renderer.clearAll();
          this._fullyCleared = true;
          this._needsFullClear = false;
        }
        if (this._renderer.hasLayer("top")) {
          this._renderer.removeLayerFromDom("top");
        }
        if (this._renderer.hasLayer("bottom")) {
          this._renderer.removeLayerFromDom("bottom");
        }
        return;
      }
      if (!hasTopImages && this._renderer.hasLayer("top")) {
        this._renderer.clearAll("top");
        this._renderer.removeLayerFromDom("top");
      }
      if (!hasBottomImages && this._renderer.hasLayer("bottom")) {
        this._renderer.clearAll("bottom");
        this._renderer.removeLayerFromDom("bottom");
      }
      if (this._needsFullClear) {
        this._renderer.clearAll();
        this._fullyCleared = true;
        this._needsFullClear = false;
      }
      const { start, end } = range;
      const buffer = this._terminal._core.buffer;
      const cols = this._terminal._core.cols;
      this._renderer.clearLines(start, end);
      const drawCalls = [];
      const placeholderCalls = [];
      for (let row = start; row <= end; ++row) {
        const line = buffer.lines.get(row + buffer.ydisp);
        if (!line) return;
        for (let col = 0; col < cols; ++col) {
          let e;
          if (line.getBg(col) & 268435456 /* HAS_EXTENDED */) {
            e = line._extendedAttrs[col] ?? EMPTY_ATTRS;
          } else {
            const maybeImg = line._extendedAttrs[col];
            if (!maybeImg || maybeImg.imageId === void 0 || maybeImg.imageId === -1) {
              continue;
            }
            e = maybeImg;
          }
          const imageId = e.imageId;
          if (imageId === void 0 || imageId === -1) {
            continue;
          }
          const imgSpec = this._images.get(imageId);
          if (e.tileId !== -1) {
            const startTile = e.tileId;
            const startCol = col;
            let count = 1;
            while (++col < cols) {
              const nextE = line._extendedAttrs[col];
              if (!nextE || nextE.imageId !== imageId || nextE.tileId !== startTile + count) {
                break;
              }
              count++;
            }
            col--;
            if (imgSpec) {
              if (imgSpec.actual) {
                drawCalls.push({ imgSpec, tileId: startTile, col: startCol, row, count });
              }
            } else if (this._opts.showPlaceholder) {
              placeholderCalls.push({ col: startCol, row, count });
            }
            this._fullyCleared = false;
          }
        }
      }
      drawCalls.sort((a, b) => a.imgSpec.zIndex - b.imgSpec.zIndex);
      for (const call of placeholderCalls) {
        this._renderer.drawPlaceholder(call.col, call.row, call.count);
      }
      for (const call of drawCalls) {
        this._renderer.draw(call.imgSpec, call.tileId, call.col, call.row, call.count);
      }
    }
    viewportResize(metrics) {
      if (!this._images.size) {
        this._viewportMetrics = metrics;
        return;
      }
      if (this._viewportMetrics.cols >= metrics.cols) {
        this._viewportMetrics = metrics;
        return;
      }
      const buffer = this._terminal._core.buffer;
      const rows = buffer.lines.length;
      const oldCol = this._viewportMetrics.cols - 1;
      for (let row = 0; row < rows; ++row) {
        const line = buffer.lines.get(row);
        if (line.getBg(oldCol) & 268435456 /* HAS_EXTENDED */) {
          const e = line._extendedAttrs[oldCol] ?? EMPTY_ATTRS;
          const imageId = e.imageId;
          if (imageId === void 0 || imageId === -1) {
            continue;
          }
          const imgSpec = this._images.get(imageId);
          if (!imgSpec) {
            continue;
          }
          const tilesPerRow = Math.ceil((imgSpec.actual?.width || 0) / imgSpec.actualCellSize.width);
          if (e.tileId % tilesPerRow + 1 >= tilesPerRow) {
            continue;
          }
          let hasData = false;
          for (let rightCol = oldCol + 1; rightCol > metrics.cols; ++rightCol) {
            if (line._data[rightCol * 3 /* SIZE */ + 0 /* CONTENT */] & 4194303 /* HAS_CONTENT_MASK */) {
              hasData = true;
              break;
            }
          }
          if (hasData) {
            continue;
          }
          const end = Math.min(metrics.cols, tilesPerRow - e.tileId % tilesPerRow + oldCol);
          let lastTile = e.tileId;
          for (let expandCol = oldCol + 1; expandCol < end; ++expandCol) {
            this._writeToCell(line, expandCol, imageId, ++lastTile);
            imgSpec.tileCount++;
          }
        }
      }
      this._viewportMetrics = metrics;
    }
    /**
     * Retrieve original canvas at buffer position.
     */
    getImageAtBufferCell(x, y) {
      const buffer = this._terminal._core.buffer;
      const line = buffer.lines.get(y);
      if (line && line.getBg(x) & 268435456 /* HAS_EXTENDED */) {
        const e = line._extendedAttrs[x] ?? EMPTY_ATTRS;
        if (e.imageId && e.imageId !== -1) {
          const orig = this._images.get(e.imageId)?.orig;
          if (window.ImageBitmap && orig instanceof ImageBitmap) {
            const canvas = ImageRenderer.createCanvas(window.document, orig.width, orig.height);
            canvas.getContext("2d")?.drawImage(orig, 0, 0, orig.width, orig.height);
            return canvas;
          }
          return orig;
        }
      }
    }
    /**
     * Extract active single tile at buffer position.
     */
    extractTileAtBufferCell(x, y) {
      const buffer = this._terminal._core.buffer;
      const line = buffer.lines.get(y);
      if (line && line.getBg(x) & 268435456 /* HAS_EXTENDED */) {
        const e = line._extendedAttrs[x] ?? EMPTY_ATTRS;
        if (e.imageId && e.imageId !== -1 && e.tileId !== -1) {
          const spec = this._images.get(e.imageId);
          if (spec) {
            return this._renderer.extractTile(spec, e.tileId);
          }
        }
      }
    }
    // TODO: Do we need some blob offloading tricks here to avoid early eviction?
    // also see https://stackoverflow.com/questions/28307789/is-there-any-limitation-on-javascript-max-blob-size
    _evictOldest(room) {
      const used = this._getStoredPixels();
      let current = used;
      while (this._pixelLimit < current + room && this._images.size) {
        const spec = this._images.get(++this._lowestId);
        if (spec && spec.orig) {
          current -= spec.orig.width * spec.orig.height;
          if (spec.actual && spec.orig !== spec.actual) {
            current -= spec.actual.width * spec.actual.height;
          }
          spec.marker?.dispose();
          this._delImg(this._lowestId);
        }
      }
      return used - current;
    }
    _writeToCell(line, x, imageId, tileId) {
      if (line._data[x * 3 /* SIZE */ + 2 /* BG */] & 268435456 /* HAS_EXTENDED */) {
        const old = line._extendedAttrs[x];
        if (old) {
          if (old.imageId !== void 0) {
            const oldSpec = this._images.get(old.imageId);
            if (oldSpec) {
              oldSpec.tileCount--;
            }
            old.imageId = imageId;
            old.tileId = tileId;
            return;
          }
          line._extendedAttrs[x] = new ExtendedAttrsImage(old.ext, old.urlId, imageId, tileId);
          return;
        }
      }
      line._data[x * 3 /* SIZE */ + 2 /* BG */] |= 268435456 /* HAS_EXTENDED */;
      line._extendedAttrs[x] = new ExtendedAttrsImage(0, 0, imageId, tileId);
    }
    _evictOnAlternate() {
      for (const spec of this._images.values()) {
        if (spec.bufferType === "alternate") {
          spec.tileCount = 0;
        }
      }
      const buffer = this._terminal._core.buffer;
      for (let y = 0; y < this._terminal.rows; ++y) {
        const line = buffer.lines.get(y);
        if (!line) {
          continue;
        }
        for (let x = 0; x < this._terminal.cols; ++x) {
          if (line._data[x * 3 /* SIZE */ + 2 /* BG */] & 268435456 /* HAS_EXTENDED */) {
            const imgId = line._extendedAttrs[x]?.imageId;
            if (imgId) {
              const spec = this._images.get(imgId);
              if (spec) {
                spec.tileCount++;
              }
            }
          }
        }
      }
      const zero = [];
      for (const [id, spec] of this._images.entries()) {
        if (spec.bufferType === "alternate" && !spec.tileCount) {
          spec.marker?.dispose();
          zero.push(id);
        }
      }
      for (const id of zero) {
        this._delImg(id);
      }
    }
  };

  // addons/addon-image/src/IIPHandler.ts
  var import_Base64Decoder = __toESM(require_Base64Decoder_wasm());
  var import_QoiDecoder = __toESM(require_QoiDecoder_wasm());

  // addons/addon-image/src/IIPHeaderParser.ts
  function toStr(data) {
    let s = "";
    for (let i = 0; i < data.length; ++i) {
      s += String.fromCharCode(data[i]);
    }
    return s;
  }
  function toInt(data) {
    let v = 0;
    for (let i = 0; i < data.length; ++i) {
      if (data[i] < 48 || data[i] > 57) {
        throw new Error("illegal char");
      }
      v = v * 10 + data[i] - 48;
    }
    return v;
  }
  function toSize(data) {
    const v = toStr(data);
    if (!v.match(/^((auto)|(\d+?((px)|(%)){0,1}))$/)) {
      throw new Error("illegal size");
    }
    return v;
  }
  function toName(data) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(toStr(data), "base64").toString();
    }
    const bs = atob(toStr(data));
    const b = new Uint8Array(bs.length);
    for (let i = 0; i < b.length; ++i) {
      b[i] = bs.charCodeAt(i);
    }
    return new TextDecoder().decode(b);
  }
  var DECODERS = {
    inline: toInt,
    size: toInt,
    name: toName,
    width: toSize,
    height: toSize,
    preserveAspectRatio: toInt
  };
  var FILE_MARKER = [70, 105, 108, 101];
  var MULTIPARTFILE_MARKER = [77, 117, 108, 116, 105, 112, 97, 114, 116, 70, 105, 108, 101];
  var FILEPART_MARKER = [70, 105, 108, 101, 80, 97, 114, 116];
  var FILEEND_MARKER = [70, 105, 108, 101, 69, 110, 100];
  var REPORTCELLSIZE_MARKER = [82, 101, 112, 111, 114, 116, 67, 101, 108, 108, 83, 105, 122, 101];
  var MAX_FIELDCHARS = 1024;
  var HeaderParser = class {
    constructor() {
      this.state = 0 /* START */;
      this._buffer = new Uint32Array(MAX_FIELDCHARS);
      this._position = 0;
      this._key = "";
      this.fields = {};
    }
    reset() {
      this._buffer.fill(0);
      this.state = 0 /* START */;
      this._position = 0;
      this.fields = {};
      this._key = "";
    }
    end() {
      if (this.state === 0 /* START */) {
        if (this._position === FILEEND_MARKER.length) {
          for (let k = 0; k < FILEEND_MARKER.length; ++k) {
            if (this._buffer[k] !== FILEEND_MARKER[k]) return this._a();
          }
          this.fields["type"] = 4 /* FILEEND */;
          this.state = 4 /* END */;
          return 0;
        }
        if (this._position === REPORTCELLSIZE_MARKER.length) {
          for (let k = 0; k < REPORTCELLSIZE_MARKER.length; ++k) {
            if (this._buffer[k] !== REPORTCELLSIZE_MARKER[k]) return this._a();
          }
          this.fields["type"] = 5 /* REPORTCELLSIZE */;
          this.state = 4 /* END */;
          return 0;
        }
        return this._a();
      }
      if (this.state === 4 /* END */) return 0;
      if (this.state === 3 /* VALUE */ && this.fields.type === 2 /* MULTIPARTFILE */) {
        if (!this._storeValue(this._position)) return this._a();
        this.state = 4 /* END */;
        return 0;
      }
      return this._a();
    }
    parse(data, start, end) {
      let state = this.state;
      let pos = this._position;
      const buffer = this._buffer;
      if (state === 1 /* ABORT */ || state === 4 /* END */) return -1;
      if (state === 0 /* START */ && pos > 14) return -1;
      for (let i = start; i < end; ++i) {
        const c = data[i];
        switch (c) {
          case 59:
            if (!this._storeValue(pos)) return this._a();
            state = 2 /* KEY */;
            pos = 0;
            break;
          case 61:
            if (state === 0 /* START */) {
              if (buffer[0] === 70) {
                let k = 0;
                for (; k < FILE_MARKER.length; ++k) {
                  if (buffer[k] !== FILE_MARKER[k]) return this._a();
                }
                this.fields["type"] = 1 /* FILE */;
                if (pos === FILEPART_MARKER.length) {
                  for (; k < FILEPART_MARKER.length; ++k) {
                    if (buffer[k] !== FILEPART_MARKER[k]) return this._a();
                  }
                  this.fields["type"] = 3 /* FILEPART */;
                  this.state = 4 /* END */;
                  return i + 1;
                }
              } else if (buffer[0] === 77) {
                for (let k = 0; k < MULTIPARTFILE_MARKER.length; ++k) {
                  if (buffer[k] !== MULTIPARTFILE_MARKER[k]) return this._a();
                }
                this.fields["type"] = 2 /* MULTIPARTFILE */;
              } else {
                return this._a();
              }
              state = 2 /* KEY */;
              pos = 0;
            } else if (state === 2 /* KEY */) {
              if (!this._storeKey(pos)) return this._a();
              state = 3 /* VALUE */;
              pos = 0;
            } else if (state === 3 /* VALUE */) {
              if (pos >= MAX_FIELDCHARS) return this._a();
              buffer[pos++] = c;
            }
            break;
          case 58:
            if (state === 3 /* VALUE */) {
              if (!this._storeValue(pos)) return this._a();
            }
            this.state = 4 /* END */;
            return i + 1;
          default:
            if (pos >= MAX_FIELDCHARS) return this._a();
            buffer[pos++] = c;
        }
      }
      this.state = state;
      this._position = pos;
      return -2;
    }
    _a() {
      this.fields.type = 0 /* INVALID */;
      this.state = 1 /* ABORT */;
      return -1;
    }
    _storeKey(pos) {
      const k = toStr(this._buffer.subarray(0, pos));
      if (k) {
        this._key = k;
        this.fields[k] = null;
        return true;
      }
      return false;
    }
    _storeValue(pos) {
      if (this._key) {
        try {
          const v = this._buffer.slice(0, pos);
          this.fields[this._key] = DECODERS[this._key] ? DECODERS[this._key](v) : v;
        } catch {
          return false;
        }
        return true;
      }
      return false;
    }
  };

  // addons/addon-image/src/IIPMetrics.ts
  var UNSUPPORTED_TYPE = {
    mime: "unsupported",
    width: 0,
    height: 0
  };
  function imageType(d) {
    if (d.length < 24) {
      return UNSUPPORTED_TYPE;
    }
    const d32 = new Uint32Array(d.buffer, d.byteOffset, 6);
    if (d32[0] === 1196314761 && d32[1] === 169478669 && d32[3] === 1380206665) {
      return {
        mime: "image/png",
        width: d[16] << 24 | d[17] << 16 | d[18] << 8 | d[19],
        height: d[20] << 24 | d[21] << 16 | d[22] << 8 | d[23]
      };
    }
    if (d[0] === 255 && d[1] === 216 && d[2] === 255) {
      const [width, height] = jpgSize(d);
      return { mime: "image/jpeg", width, height };
    }
    if (d32[0] === 944130375 && (d[4] === 55 || d[4] === 57) && d[5] === 97) {
      return {
        mime: "image/gif",
        width: d[7] << 8 | d[6],
        height: d[9] << 8 | d[8]
      };
    }
    if (d32[0] === 1718185841) {
      return {
        mime: "image/qoi",
        width: d[4] << 24 | d[5] << 16 | d[6] << 8 | d[7],
        height: d[8] << 24 | d[9] << 16 | d[10] << 8 | d[11]
      };
    }
    return UNSUPPORTED_TYPE;
  }
  function jpgSize(d) {
    const len = d.length;
    let i = 4;
    let blockLength = d[i] << 8 | d[i + 1];
    while (true) {
      i += blockLength;
      if (i >= len) {
        return [0, 0];
      }
      if (d[i] !== 255) {
        return [0, 0];
      }
      if (d[i + 1] === 192 || d[i + 1] === 194) {
        if (i + 8 < len) {
          return [
            d[i + 7] << 8 | d[i + 8],
            d[i + 5] << 8 | d[i + 6]
          ];
        }
        return [0, 0];
      }
      i += 2;
      blockLength = d[i] << 8 | d[i + 1];
    }
  }

  // addons/addon-image/src/IIPHandler.ts
  var DEFAULT_HEADER = {
    type: 0 /* INVALID */,
    name: "Unnamed file",
    size: 0,
    width: "auto",
    height: "auto",
    preserveAspectRatio: 1,
    inline: 0
  };
  var IIPHandler = class {
    constructor(_opts, _renderer, _storage, _coreTerminal) {
      this._opts = _opts;
      this._renderer = _renderer;
      this._storage = _storage;
      this._coreTerminal = _coreTerminal;
      this._aborted = false;
      this._hp = new HeaderParser();
      this._header = DEFAULT_HEADER;
      this._metrics = UNSUPPORTED_TYPE;
      this._isMultipart = false;
      this._abortMulti = false;
      const maxEncodedBytes = Math.ceil(this._opts.iipSizeLimit * 4 / 3);
      const initialBytes = Math.min(1048576 /* INITIAL_DATA */, maxEncodedBytes);
      this._dec = new import_Base64Decoder.default(4194304 /* KEEP_DATA */, maxEncodedBytes, initialBytes);
      this._qoiDec = new import_QoiDecoder.default(4194304 /* KEEP_DATA */);
    }
    reset() {
      this._hp.reset();
      this._dec.release();
      this._qoiDec.release();
    }
    start() {
      this._aborted = false;
      this._metrics = UNSUPPORTED_TYPE;
      this._hp.reset();
    }
    put(data, start, end) {
      if (this._aborted) return;
      if (this._hp.state === 4 /* END */) {
        if (this._dec.put(data.subarray(start, end)) !== 0 /* OK */) {
          this._dec.release();
          this._aborted = true;
        }
      } else {
        const dataPos = this._hp.parse(data, start, end);
        if (dataPos === -1) {
          this._aborted = true;
          return;
        }
        if (dataPos > 0) {
          const seqType = this._hp.fields.type;
          if (seqType === 1 /* FILE */) {
            if (this._isMultipart) {
              this._isMultipart = false;
              this._abortMulti = false;
              this._dec.release();
            }
            this._header = Object.assign({}, DEFAULT_HEADER, this._hp.fields);
            if (!this._header.inline) {
              this._aborted = true;
              return;
            }
            this._dec.init();
          } else if (this._abortMulti) {
            this._aborted = true;
            return;
          }
          if (this._dec.put(data.subarray(dataPos, end)) !== 0 /* OK */) {
            this._dec.release();
            this._aborted = true;
            if (this._isMultipart) this._abortMulti = true;
          }
        }
      }
    }
    end(success) {
      if (this._aborted) return true;
      if (this._hp.state !== 4 /* END */) {
        if (this._hp.end()) return true;
      }
      const seqType = this._hp.fields.type;
      if (seqType === 3 /* FILEPART */) return true;
      if (seqType === 5 /* REPORTCELLSIZE */) {
        let width = CELL_SIZE_DEFAULT.width;
        let height = CELL_SIZE_DEFAULT.height;
        if (this._renderer.dimensions) {
          width = this._renderer.dimensions.css.canvas.width / this._coreTerminal.cols;
          height = this._renderer.dimensions.css.canvas.height / this._coreTerminal.rows;
        }
        const scale = this._coreTerminal._core._coreBrowserService?.dpr ?? 1;
        const report = `\x1B]1337;ReportCellSize=${height.toFixed(3)};${width.toFixed(3)};${scale.toFixed(3)}\x1B\\`;
        this._coreTerminal.input(report, false);
        return true;
      }
      if (seqType === 2 /* MULTIPARTFILE */) {
        this._header = Object.assign({}, DEFAULT_HEADER, this._hp.fields);
        this._isMultipart = true;
        this._abortMulti = false;
        this._dec.release();
        this._dec.init();
        return true;
      }
      if (seqType === 4 /* FILEEND */) {
        if (!this._isMultipart) return true;
        this._isMultipart = false;
        if (this._abortMulti || this._header.type !== 2 /* MULTIPARTFILE */) return true;
      }
      let w = 0;
      let h = 0;
      let cond;
      if (cond = success) {
        if (cond = !this._dec.end()) {
          this._metrics = imageType(this._dec.data8);
          if (cond = this._metrics.mime !== "unsupported") {
            w = this._metrics.width;
            h = this._metrics.height;
            if (cond = w && h && w * h < this._opts.pixelLimit) {
              [w, h] = this._resize(w, h).map(Math.floor);
              cond = w && h && w * h < this._opts.pixelLimit;
            }
          }
        }
      }
      if (!cond) {
        this._dec.release();
        return true;
      }
      let blob;
      if (this._metrics.mime === "image/qoi") {
        const data = this._qoiDec.decode(this._dec.data8);
        blob = new ImageData(
          new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
          this._qoiDec.width,
          this._qoiDec.height
        );
        this._qoiDec.release();
        if (w === this._qoiDec.width && h === this._qoiDec.height) {
          this._dec.release();
          const canvas = ImageRenderer.createCanvas(void 0, this._qoiDec.width, this._qoiDec.height);
          canvas.getContext("2d")?.putImageData(blob, 0, 0);
          this._storage.addImage(canvas);
          return true;
        }
      } else {
        blob = new Blob([this._dec.data8], { type: this._metrics.mime });
      }
      this._dec.release();
      return createImageBitmap(blob, { resizeWidth: w, resizeHeight: h }).then((bm) => {
        this._storage.addImage(bm);
        return true;
      });
    }
    _resize(w, h) {
      const cw = this._renderer.dimensions?.css.cell.width || CELL_SIZE_DEFAULT.width;
      const ch = this._renderer.dimensions?.css.cell.height || CELL_SIZE_DEFAULT.height;
      const width = this._renderer.dimensions?.css.canvas.width || cw * this._coreTerminal.cols;
      const height = this._renderer.dimensions?.css.canvas.height || ch * this._coreTerminal.rows;
      const rw = this._dim(this._header.width, width, cw);
      const rh = this._dim(this._header.height, height, ch);
      if (!rw && !rh) {
        const wf = width / w;
        const hf = (height - ch) / h;
        const f = Math.min(wf, hf);
        return f < 1 ? [w * f, h * f] : [w, h];
      }
      return !rw ? [w * rh / h, rh] : this._header.preserveAspectRatio || !rw || !rh ? [rw, h * rw / w] : [rw, rh];
    }
    _dim(s, total, cdim) {
      if (s === "auto") return 0;
      if (s.endsWith("%")) return parseInt(s.slice(0, -1), 10) * total / 100;
      if (s.endsWith("px")) return parseInt(s.slice(0, -2), 10);
      return parseInt(s, 10) * cdim;
    }
  };

  // addons/addon-image/src/kitty/KittyGraphicsHandler.ts
  var import_Base64Decoder2 = __toESM(require_Base64Decoder_wasm());

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
        this._activeDecoder = new import_Base64Decoder2.default(4194304 /* DECODER_KEEP_DATA */, this._maxEncodedBytes, this._initialEncodedBytes);
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

  // addons/addon-image/src/SixelHandler.ts
  var import_Colors2 = __toESM(require_Colors());
  var import_Decoder = __toESM(require_Decoder());
  var MEM_PERMA_LIMIT = 4194304;
  var DEFAULT_PALETTE = import_Colors2.PALETTE_ANSI_256;
  DEFAULT_PALETTE.set(import_Colors2.PALETTE_VT340_COLOR);
  var SixelHandler = class {
    constructor(_opts, _storage, _coreTerminal) {
      this._opts = _opts;
      this._storage = _storage;
      this._coreTerminal = _coreTerminal;
      this._size = 0;
      this._aborted = false;
      (0, import_Decoder.DecoderAsync)({
        memoryLimit: this._opts.pixelLimit * 4,
        palette: DEFAULT_PALETTE,
        paletteLimit: this._opts.sixelPaletteLimit
      }).then((d) => this._dec = d);
    }
    reset() {
      if (this._dec) {
        this._dec.release();
        this._dec._palette.fill(0);
        this._dec.init(0, DEFAULT_PALETTE, this._opts.sixelPaletteLimit);
      }
    }
    hook(params) {
      this._size = 0;
      this._aborted = false;
      if (this._dec) {
        const fillColor = params.params[1] === 1 ? 0 : extractActiveBg(
          this._coreTerminal._core._inputHandler._curAttrData,
          this._coreTerminal._core._themeService?.colors
        );
        this._dec.init(fillColor, null, this._opts.sixelPaletteLimit);
      }
    }
    put(data, start, end) {
      if (this._aborted || !this._dec) {
        return;
      }
      this._size += end - start;
      if (this._size > this._opts.sixelSizeLimit) {
        console.warn(`SIXEL: too much data, aborting`);
        this._aborted = true;
        this._dec.release();
        return;
      }
      try {
        this._dec.decode(data, start, end);
      } catch (e) {
        console.warn(`SIXEL: error while decoding image - ${e}`);
        this._aborted = true;
        this._dec.release();
      }
    }
    unhook(success) {
      if (this._aborted || !success || !this._dec) {
        return true;
      }
      const width = this._dec.width;
      const height = this._dec.height;
      if (!width || !height) {
        if (height) {
          this._storage.advanceCursor(height);
        }
        return true;
      }
      const canvas = ImageRenderer.createCanvas(void 0, width, height);
      canvas.getContext("2d")?.putImageData(new ImageData(this._dec.data8, width, height), 0, 0);
      if (this._dec.memoryUsage > MEM_PERMA_LIMIT) {
        this._dec.release();
      }
      this._storage.addImage(canvas);
      return true;
    }
  };
  function extractActiveBg(attr, colors) {
    let bg = 0;
    if (!colors) {
      return bg;
    }
    if (attr.isInverse()) {
      if (attr.isFgDefault()) {
        bg = convertLe(colors.foreground.rgba);
      } else if (attr.isFgRGB()) {
        const t = attr.constructor.toColorRGB(attr.getFgColor());
        bg = (0, import_Colors2.toRGBA8888)(...t);
      } else {
        bg = convertLe(colors.ansi[attr.getFgColor()].rgba);
      }
    } else {
      if (attr.isBgDefault()) {
        bg = convertLe(colors.background.rgba);
      } else if (attr.isBgRGB()) {
        const t = attr.constructor.toColorRGB(attr.getBgColor());
        bg = (0, import_Colors2.toRGBA8888)(...t);
      } else {
        bg = convertLe(colors.ansi[attr.getBgColor()].rgba);
      }
    }
    return bg;
  }
  function convertLe(color) {
    if (import_Colors2.BIG_ENDIAN) return color;
    return (color & 255) << 24 | (color >>> 8 & 255) << 16 | (color >>> 16 & 255) << 8 | color >>> 24 & 255;
  }

  // addons/addon-image/src/SixelImageStorage.ts
  var SixelImageStorage = class {
    constructor(_storage, _opts, _renderer, _terminal) {
      this._storage = _storage;
      this._opts = _opts;
      this._renderer = _renderer;
      this._terminal = _terminal;
      this._addImageOpts = { scrolling: true, layer: "top", zIndex: 0, cursorPos: "vt340" };
    }
    /**
     * Add a sixel image to storage.
     * Cursor behavior depends on the sixelScrolling option (DECSET 80).
     */
    addImage(img) {
      this._addImageOpts.scrolling = this._opts.sixelScrolling;
      this._storage.addImage(img, this._addImageOpts);
    }
    /**
     * Only advance text cursor.
     * This is an edge case from empty sixels carrying only a height but no pixels.
     * Partially fixes https://github.com/jerch/xterm-addon-image/issues/37.
     */
    advanceCursor(height) {
      if (this._opts.sixelScrolling) {
        let cellSize = this._renderer.cellSize;
        if (cellSize.width === -1 || cellSize.height === -1) {
          cellSize = CELL_SIZE_DEFAULT;
        }
        const rows = Math.ceil(height / cellSize.height);
        for (let i = 1; i < rows; ++i) {
          this._terminal._core._inputHandler.lineFeed();
        }
      }
    }
  };

  // addons/addon-image/src/IIPImageStorage.ts
  var IIPImageStorage = class {
    constructor(_storage) {
      this._storage = _storage;
      this._addImageOpts = { scrolling: true, layer: "top", zIndex: 0, cursorPos: "iip" };
    }
    /**
     * Add an IIP image to storage.
     * Always uses scrolling mode — cursor advances past the image.
     */
    addImage(img) {
      this._storage.addImage(img, this._addImageOpts);
    }
  };

  // addons/addon-image/src/ImageAddon.ts
  var DEFAULT_OPTIONS = {
    enableSizeReports: true,
    pixelLimit: 16777216,
    // limit to 4096 * 4096 pixels
    sixelSupport: true,
    sixelScrolling: true,
    sixelPaletteLimit: 4096,
    sixelSizeLimit: 33554432,
    storageLimit: 128,
    showPlaceholder: true,
    iipSupport: true,
    iipSizeLimit: 33554432,
    kittySupport: true,
    kittySizeLimit: 33554432
  };
  var MAX_SIXEL_PALETTE_SIZE = 4096;
  var ImageAddon = class {
    constructor(opts) {
      this._disposables = [];
      this._handlers = /* @__PURE__ */ new Map();
      this._onImageAdded = new Emitter();
      this.onImageAdded = this._onImageAdded.event;
      this._opts = Object.assign({}, DEFAULT_OPTIONS, opts);
      this._defaultOpts = Object.assign({}, DEFAULT_OPTIONS, opts);
    }
    dispose() {
      for (const obj of this._disposables) {
        obj.dispose();
      }
      this._disposables.length = 0;
      this._handlers.clear();
      this._onImageAdded.dispose();
    }
    _disposeLater(...args) {
      for (const obj of args) {
        this._disposables.push(obj);
      }
    }
    activate(terminal) {
      this._terminal = terminal;
      this._renderer = new ImageRenderer(terminal);
      this._storage = new ImageStorage(terminal, this._renderer, this._opts);
      this._storage.onImageAdded = () => this._onImageAdded.fire();
      if (this._opts.enableSizeReports) {
        const windowOps = terminal.options.windowOptions ?? {};
        windowOps.getWinSizePixels = true;
        windowOps.getCellSizePixels = true;
        windowOps.getWinSizeChars = true;
        terminal.options.windowOptions = windowOps;
      }
      this._disposeLater(
        this._renderer,
        this._storage,
        // DECSET/DECRST/DA1/XTSMGRAPHICS handlers
        terminal.parser.registerCsiHandler({ prefix: "?", final: "h" }, (params) => this._decset(params)),
        terminal.parser.registerCsiHandler({ prefix: "?", final: "l" }, (params) => this._decrst(params)),
        terminal.parser.registerCsiHandler({ final: "c" }, (params) => this._da1(params)),
        terminal.parser.registerCsiHandler({ prefix: "?", final: "S" }, (params) => this._xtermGraphicsAttributes(params)),
        // render hook
        terminal.onRender((range) => this._storage?.render(range)),
        /**
         * reset handlers covered:
         * - DECSTR
         * - RIS
         * - Terminal.reset()
         */
        terminal.parser.registerCsiHandler({ intermediates: "!", final: "p" }, () => this.reset()),
        terminal.parser.registerEscHandler({ final: "c" }, () => this.reset()),
        terminal._core._inputHandler.onRequestReset(() => this.reset()),
        // wipe canvas and delete alternate images on buffer switch
        terminal.buffer.onBufferChange(() => this._storage?.wipeAlternate()),
        // extend images to the right on resize
        terminal.onResize((metrics) => this._storage?.viewportResize(metrics))
      );
      if (this._opts.sixelSupport) {
        const sixelStorage = new SixelImageStorage(this._storage, this._opts, this._renderer, terminal);
        const sixelHandler = new SixelHandler(this._opts, sixelStorage, terminal);
        this._handlers.set("sixel", sixelHandler);
        this._disposeLater(
          terminal._core._inputHandler._parser.registerDcsHandler({ final: "q" }, sixelHandler)
        );
      }
      if (this._opts.iipSupport) {
        const iipStorage = new IIPImageStorage(this._storage);
        const iipHandler = new IIPHandler(this._opts, this._renderer, iipStorage, terminal);
        this._handlers.set("iip", iipHandler);
        this._disposeLater(
          terminal._core._inputHandler._parser.registerOscHandler(1337, iipHandler)
        );
      }
      if (this._opts.kittySupport) {
        const kittyStorage = new KittyImageStorage(this._storage);
        const kittyHandler = new KittyGraphicsHandler(this._opts, this._renderer, kittyStorage, terminal);
        this._handlers.set("kitty", kittyHandler);
        this._disposeLater(
          kittyStorage,
          kittyHandler,
          terminal._core._inputHandler._parser.registerApcHandler({ final: "G" }, kittyHandler)
        );
      }
    }
    // Note: storageLimit is skipped here to not intoduce a surprising side effect.
    reset() {
      this._opts.sixelScrolling = this._defaultOpts.sixelScrolling;
      this._opts.sixelPaletteLimit = this._defaultOpts.sixelPaletteLimit;
      this._storage?.reset();
      for (const handler of this._handlers.values()) {
        handler.reset();
      }
      return false;
    }
    get storageLimit() {
      return this._storage?.getLimit() || -1;
    }
    set storageLimit(limit) {
      this._storage?.setLimit(limit);
      this._opts.storageLimit = limit;
    }
    get storageUsage() {
      if (this._storage) {
        return this._storage.getUsage();
      }
      return -1;
    }
    get showPlaceholder() {
      return this._opts.showPlaceholder;
    }
    set showPlaceholder(value) {
      this._opts.showPlaceholder = value;
      this._renderer?.showPlaceholder(value);
    }
    getImageAtBufferCell(x, y) {
      return this._storage?.getImageAtBufferCell(x, y);
    }
    extractTileAtBufferCell(x, y) {
      return this._storage?.extractTileAtBufferCell(x, y);
    }
    _report(s) {
      this._terminal?._core.input(s, false);
    }
    _decset(params) {
      for (let i = 0; i < params.length; ++i) {
        switch (params[i]) {
          case 80:
            this._opts.sixelScrolling = false;
            break;
        }
      }
      return false;
    }
    _decrst(params) {
      for (let i = 0; i < params.length; ++i) {
        switch (params[i]) {
          case 80:
            this._opts.sixelScrolling = true;
            break;
        }
      }
      return false;
    }
    // overload DA to return something more appropriate
    _da1(params) {
      if (params[0]) {
        return true;
      }
      if (this._opts.sixelSupport) {
        this._report(`\x1B[?62;4;9;22c`);
        return true;
      }
      return false;
    }
    /**
     * Implementation of xterm's graphics attribute sequence.
     *
     * Supported features:
     * - read/change palette limits (max 4096 by sixel lib)
     * - read SIXEL canvas geometry (reports current window canvas or
     *   squared pixelLimit if canvas > pixel limit)
     *
     * Everything else is deactivated.
     */
    _xtermGraphicsAttributes(params) {
      if (params.length < 2) {
        return true;
      }
      if (params[0] === 1 /* COLORS */) {
        switch (params[1]) {
          case 1 /* READ */:
            this._report(`\x1B[?${params[0]};${0 /* SUCCESS */};${this._opts.sixelPaletteLimit}S`);
            return true;
          case 2 /* SET_DEFAULT */:
            this._opts.sixelPaletteLimit = this._defaultOpts.sixelPaletteLimit;
            this._report(`\x1B[?${params[0]};${0 /* SUCCESS */};${this._opts.sixelPaletteLimit}S`);
            for (const handler of this._handlers.values()) {
              handler.reset();
            }
            return true;
          case 3 /* SET */:
            if (params.length > 2 && !(params[2] instanceof Array) && params[2] <= MAX_SIXEL_PALETTE_SIZE) {
              this._opts.sixelPaletteLimit = params[2];
              this._report(`\x1B[?${params[0]};${0 /* SUCCESS */};${this._opts.sixelPaletteLimit}S`);
            } else {
              this._report(`\x1B[?${params[0]};${2 /* ACTION_ERROR */}S`);
            }
            return true;
          case 4 /* READ_MAX */:
            this._report(`\x1B[?${params[0]};${0 /* SUCCESS */};${MAX_SIXEL_PALETTE_SIZE}S`);
            return true;
          default:
            this._report(`\x1B[?${params[0]};${2 /* ACTION_ERROR */}S`);
            return true;
        }
      }
      if (params[0] === 2 /* SIXEL_GEO */) {
        switch (params[1]) {
          // we only implement read and read_max here
          case 1 /* READ */:
            let width = this._renderer?.dimensions?.css.canvas.width;
            let height = this._renderer?.dimensions?.css.canvas.height;
            if (!width || !height) {
              const cellSize = CELL_SIZE_DEFAULT;
              width = (this._terminal?.cols || 80) * cellSize.width;
              height = (this._terminal?.rows || 24) * cellSize.height;
            }
            if (width * height < this._opts.pixelLimit) {
              this._report(`\x1B[?${params[0]};${0 /* SUCCESS */};${width.toFixed(0)};${height.toFixed(0)}S`);
            } else {
              const x2 = Math.floor(Math.sqrt(this._opts.pixelLimit));
              this._report(`\x1B[?${params[0]};${0 /* SUCCESS */};${x2};${x2}S`);
            }
            return true;
          case 4 /* READ_MAX */:
            const x = Math.floor(Math.sqrt(this._opts.pixelLimit));
            this._report(`\x1B[?${params[0]};${0 /* SUCCESS */};${x};${x}S`);
            return true;
          default:
            this._report(`\x1B[?${params[0]};${2 /* ACTION_ERROR */}S`);
            return true;
        }
      }
      this._report(`\x1B[?${params[0]};${1 /* ITEM_ERROR */}S`);
      return true;
    }
  };
  return __toCommonJS(BrowserKitty_exports);
})();
/**
 * Copyright (c) 2024-2026 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * Minimal lifecycle utilities for xterm.js core.
 * Simplified from VS Code's lifecycle.ts - no tracking/leak detection.
 */
/**
 * Copyright (c) 2024-2026 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * Minimal event utilities for xterm.js core.
 * Simplified from VS Code's event.ts - no leak detection/profiling.
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
 * Copyright (c) 2023 The xterm.js authors. All rights reserved.
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
/**
 * Copyright (c) 2020, 2023 The xterm.js authors. All rights reserved.
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

xterm-wasm-parts/lib/qoi/QoiDecoder.wasm.js:
  (**
   * Copyright (c) 2023 The xterm.js authors. All rights reserved.
   * @license MIT
   *)

sixel/lib/Decoder.js:
  (**
   * Copyright (c) 2021 Joerg Breitbart.
   * @license MIT
   *)
*/
