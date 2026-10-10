var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// node_modules/promise-limit/index.js
var require_promise_limit = __commonJS({
  "node_modules/promise-limit/index.js"(exports, module) {
    function limiter(count) {
      var outstanding = 0;
      var jobs = [];
      function remove() {
        outstanding--;
        if (outstanding < count) {
          dequeue();
        }
      }
      __name(remove, "remove");
      function dequeue() {
        var job = jobs.shift();
        semaphore.queue = jobs.length;
        if (job) {
          run(job.fn).then(job.resolve).catch(job.reject);
        }
      }
      __name(dequeue, "dequeue");
      function queue(fn) {
        return new Promise(function(resolve, reject) {
          jobs.push({ fn, resolve, reject });
          semaphore.queue = jobs.length;
        });
      }
      __name(queue, "queue");
      function run(fn) {
        outstanding++;
        try {
          return Promise.resolve(fn()).then(function(result) {
            remove();
            return result;
          }, function(error) {
            remove();
            throw error;
          });
        } catch (err) {
          remove();
          return Promise.reject(err);
        }
      }
      __name(run, "run");
      var semaphore = /* @__PURE__ */ __name(function(fn) {
        if (outstanding >= count) {
          return queue(fn);
        } else {
          return run(fn);
        }
      }, "semaphore");
      return semaphore;
    }
    __name(limiter, "limiter");
    function map(items, mapper) {
      var failed = false;
      var limit = this;
      return Promise.all(items.map(function() {
        var args = arguments;
        return limit(function() {
          if (!failed) {
            return mapper.apply(void 0, args).catch(function(e) {
              failed = true;
              throw e;
            });
          }
        });
      }));
    }
    __name(map, "map");
    function addExtras(fn) {
      fn.queue = 0;
      fn.map = map;
      return fn;
    }
    __name(addExtras, "addExtras");
    module.exports = function(count) {
      if (count) {
        return addExtras(limiter(count));
      } else {
        return addExtras(function(fn) {
          return fn();
        });
      }
    };
  }
});

// node_modules/@libsql/core/lib-esm/api.js
var LibsqlError = class extends Error {
  static {
    __name(this, "LibsqlError");
  }
  /** Machine-readable error code. */
  code;
  /** Raw numeric error code */
  rawCode;
  constructor(message, code, rawCode, cause) {
    if (code !== void 0) {
      message = `${code}: ${message}`;
    }
    super(message, { cause });
    this.code = code;
    this.rawCode = rawCode;
    this.name = "LibsqlError";
  }
};

// node_modules/@libsql/core/lib-esm/uri.js
function parseUri(text) {
  const match = URI_RE.exec(text);
  if (match === null) {
    throw new LibsqlError(`The URL '${text}' is not in a valid format`, "URL_INVALID");
  }
  const groups = match.groups;
  const scheme = groups["scheme"];
  const authority = groups["authority"] !== void 0 ? parseAuthority(groups["authority"]) : void 0;
  const path = percentDecode(groups["path"]);
  const query = groups["query"] !== void 0 ? parseQuery(groups["query"]) : void 0;
  const fragment = groups["fragment"] !== void 0 ? percentDecode(groups["fragment"]) : void 0;
  return { scheme, authority, path, query, fragment };
}
__name(parseUri, "parseUri");
var URI_RE = (() => {
  const SCHEME = "(?<scheme>[A-Za-z][A-Za-z.+-]*)";
  const AUTHORITY = "(?<authority>[^/?#]*)";
  const PATH = "(?<path>[^?#]*)";
  const QUERY = "(?<query>[^#]*)";
  const FRAGMENT = "(?<fragment>.*)";
  return new RegExp(`^${SCHEME}:(//${AUTHORITY})?${PATH}(\\?${QUERY})?(#${FRAGMENT})?$`, "su");
})();
function parseAuthority(text) {
  const match = AUTHORITY_RE.exec(text);
  if (match === null) {
    throw new LibsqlError("The authority part of the URL is not in a valid format", "URL_INVALID");
  }
  const groups = match.groups;
  const host = percentDecode(groups["host_br"] ?? groups["host"]);
  const port = groups["port"] ? parseInt(groups["port"], 10) : void 0;
  const userinfo = groups["username"] !== void 0 ? {
    username: percentDecode(groups["username"]),
    password: groups["password"] !== void 0 ? percentDecode(groups["password"]) : void 0
  } : void 0;
  return { host, port, userinfo };
}
__name(parseAuthority, "parseAuthority");
var AUTHORITY_RE = (() => {
  return new RegExp(`^((?<username>[^:]*)(:(?<password>.*))?@)?((?<host>[^:\\[\\]]*)|(\\[(?<host_br>[^\\[\\]]*)\\]))(:(?<port>[0-9]*))?$`, "su");
})();
function parseQuery(text) {
  const sequences = text.split("&");
  const pairs = [];
  for (const sequence of sequences) {
    if (sequence === "") {
      continue;
    }
    let key;
    let value;
    const splitIdx = sequence.indexOf("=");
    if (splitIdx < 0) {
      key = sequence;
      value = "";
    } else {
      key = sequence.substring(0, splitIdx);
      value = sequence.substring(splitIdx + 1);
    }
    pairs.push({
      key: percentDecode(key.replaceAll("+", " ")),
      value: percentDecode(value.replaceAll("+", " "))
    });
  }
  return { pairs };
}
__name(parseQuery, "parseQuery");
function percentDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    if (e instanceof URIError) {
      throw new LibsqlError(`URL component has invalid percent encoding: ${e}`, "URL_INVALID", void 0, e);
    }
    throw e;
  }
}
__name(percentDecode, "percentDecode");
function encodeBaseUrl(scheme, authority, path) {
  if (authority === void 0) {
    throw new LibsqlError(`URL with scheme ${JSON.stringify(scheme + ":")} requires authority (the "//" part)`, "URL_INVALID");
  }
  const schemeText = `${scheme}:`;
  const hostText = encodeHost(authority.host);
  const portText = encodePort(authority.port);
  const userinfoText = encodeUserinfo(authority.userinfo);
  const authorityText = `//${userinfoText}${hostText}${portText}`;
  let pathText = path.split("/").map(encodeURIComponent).join("/");
  if (pathText !== "" && !pathText.startsWith("/")) {
    pathText = "/" + pathText;
  }
  return new URL(`${schemeText}${authorityText}${pathText}`);
}
__name(encodeBaseUrl, "encodeBaseUrl");
function encodeHost(host) {
  return host.includes(":") ? `[${encodeURI(host)}]` : encodeURI(host);
}
__name(encodeHost, "encodeHost");
function encodePort(port) {
  return port !== void 0 ? `:${port}` : "";
}
__name(encodePort, "encodePort");
function encodeUserinfo(userinfo) {
  if (userinfo === void 0) {
    return "";
  }
  const usernameText = encodeURIComponent(userinfo.username);
  const passwordText = userinfo.password !== void 0 ? `:${encodeURIComponent(userinfo.password)}` : "";
  return `${usernameText}${passwordText}@`;
}
__name(encodeUserinfo, "encodeUserinfo");

// node_modules/js-base64/base64.mjs
var version = "3.9.3";
var VERSION = version;
var _TD = typeof TextDecoder === "function" ? new TextDecoder("utf-8", { ignoreBOM: true }) : void 0;
var _TE = typeof TextEncoder === "function" ? new TextEncoder() : void 0;
var b64ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var b64chs = Array.prototype.slice.call(b64ch);
var b64tab = ((a) => {
  let tab = {};
  a.forEach((c, i) => tab[c] = i);
  return tab;
})(b64chs);
var b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
var _fromCC = String.fromCharCode.bind(String);
var _U8Afrom = typeof Uint8Array.from === "function" ? Uint8Array.from.bind(Uint8Array) : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
var _mkUriSafe = /* @__PURE__ */ __name((src) => src.replace(/=/g, "").replace(/[+\/]/g, (m0) => m0 == "+" ? "-" : "_"), "_mkUriSafe");
var _tidyB64 = /* @__PURE__ */ __name((s) => s.replace(/[^A-Za-z0-9\+\/]/g, ""), "_tidyB64");
var btoaPolyfill = /* @__PURE__ */ __name((bin) => {
  let u32, c0, c1, c2, asc = "";
  const pad = bin.length % 3;
  for (let i = 0; i < bin.length; ) {
    if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255)
      throw new TypeError("invalid character found");
    u32 = c0 << 16 | c1 << 8 | c2;
    asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
  }
  return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
}, "btoaPolyfill");
var _btoa = typeof btoa === "function" ? (bin) => btoa(bin) : btoaPolyfill;
var _fromUint8Array = typeof Uint8Array.prototype.toBase64 === "function" ? (u8a) => u8a.toBase64() : (u8a) => {
  const maxargs = 4096;
  let strs = [];
  for (let i = 0, l = u8a.length; i < l; i += maxargs) {
    strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
  }
  return _btoa(strs.join(""));
};
var fromUint8Array = /* @__PURE__ */ __name((u8a, urlsafe = false) => urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a), "fromUint8Array");
var cb_utob = /* @__PURE__ */ __name((c) => {
  if (c.length < 2) {
    var cc = c.charCodeAt(0);
    return cc < 128 ? c : cc < 2048 ? _fromCC(192 | cc >>> 6) + _fromCC(128 | cc & 63) : _fromCC(224 | cc >>> 12 & 15) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
  } else {
    var cc = 65536 + (c.charCodeAt(0) - 55296) * 1024 + (c.charCodeAt(1) - 56320);
    return _fromCC(240 | cc >>> 18 & 7) + _fromCC(128 | cc >>> 12 & 63) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
  }
}, "cb_utob");
var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\x00-\x7F]/g;
var utob = /* @__PURE__ */ __name((u) => u.replace(re_utob, cb_utob), "utob");
var _encode = _TE ? (s) => _fromUint8Array(_TE.encode(s)) : (s) => _btoa(utob(s));
var encode = /* @__PURE__ */ __name((src, urlsafe = false) => urlsafe ? _mkUriSafe(_encode(src)) : _encode(src), "encode");
var encodeURI2 = /* @__PURE__ */ __name((src) => encode(src, true), "encodeURI");
var re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
var cb_btou = /* @__PURE__ */ __name((cccc) => {
  switch (cccc.length) {
    case 4:
      var cp = (7 & cccc.charCodeAt(0)) << 18 | (63 & cccc.charCodeAt(1)) << 12 | (63 & cccc.charCodeAt(2)) << 6 | 63 & cccc.charCodeAt(3), offset = cp - 65536;
      return _fromCC((offset >>> 10) + 55296) + _fromCC((offset & 1023) + 56320);
    case 3:
      return _fromCC((15 & cccc.charCodeAt(0)) << 12 | (63 & cccc.charCodeAt(1)) << 6 | 63 & cccc.charCodeAt(2));
    default:
      return _fromCC((31 & cccc.charCodeAt(0)) << 6 | 63 & cccc.charCodeAt(1));
  }
}, "cb_btou");
var btou = /* @__PURE__ */ __name((b) => b.replace(re_btou, cb_btou), "btou");
var atobPolyfill = /* @__PURE__ */ __name((asc) => {
  asc = asc.replace(/\s+/g, "");
  if (!b64re.test(asc))
    throw new TypeError("malformed base64.");
  asc += "==".slice(2 - (asc.length & 3));
  let u24, r1, r2;
  let binArray = [];
  for (let i = 0; i < asc.length; ) {
    u24 = b64tab[asc.charAt(i++)] << 18 | b64tab[asc.charAt(i++)] << 12 | (r1 = b64tab[asc.charAt(i++)]) << 6 | (r2 = b64tab[asc.charAt(i++)]);
    if (r1 === 64) {
      binArray.push(_fromCC(u24 >> 16 & 255));
    } else if (r2 === 64) {
      binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255));
    } else {
      binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255));
    }
  }
  return binArray.join("");
}, "atobPolyfill");
var _atob = typeof atob === "function" ? (asc) => atob(_tidyB64(asc)) : atobPolyfill;
var _toUint8Array = typeof Uint8Array.fromBase64 === "function" ? (a) => Uint8Array.fromBase64(a) : (a) => _U8Afrom(_atob(a).split("").map((c) => c.charCodeAt(0)));
var toUint8Array = /* @__PURE__ */ __name((a) => _toUint8Array(_unURI(a)), "toUint8Array");
var _decode = _TD ? (a) => _TD.decode(_toUint8Array(a)) : (a) => btou(_atob(a));
var _unURI = /* @__PURE__ */ __name((a) => _tidyB64(a.replace(/[-_]/g, (m0) => m0 == "-" ? "+" : "/")), "_unURI");
var decode = /* @__PURE__ */ __name((src) => _decode(_unURI(src)), "decode");
var isValid = /* @__PURE__ */ __name((src) => {
  if (typeof src !== "string")
    return false;
  const s = src.replace(/\s+/g, "").replace(/={0,2}$/, "");
  return !/[^\s0-9a-zA-Z\+/]/.test(s) || !/[^\s0-9a-zA-Z\-_]/.test(s);
}, "isValid");
var _noEnum = /* @__PURE__ */ __name((v) => {
  return {
    value: v,
    enumerable: false,
    writable: true,
    configurable: true
  };
}, "_noEnum");
var extendString = /* @__PURE__ */ __name(function() {
  const _add = /* @__PURE__ */ __name((name, body) => Object.defineProperty(String.prototype, name, _noEnum(body)), "_add");
  _add("fromBase64", function() {
    return decode(this);
  });
  _add("toBase64", function(urlsafe) {
    return encode(this, urlsafe);
  });
  _add("toBase64URI", function() {
    return encode(this, true);
  });
  _add("toBase64URL", function() {
    return encode(this, true);
  });
  _add("toUint8Array", function() {
    return toUint8Array(this);
  });
}, "extendString");
var extendUint8Array = /* @__PURE__ */ __name(function() {
  const _add = /* @__PURE__ */ __name((name, body) => Object.defineProperty(Uint8Array.prototype, name, _noEnum(body)), "_add");
  _add("toBase64", function(urlsafe) {
    return fromUint8Array(this, urlsafe);
  });
  _add("toBase64URI", function() {
    return fromUint8Array(this, true);
  });
  _add("toBase64URL", function() {
    return fromUint8Array(this, true);
  });
}, "extendUint8Array");
var extendBuiltins = /* @__PURE__ */ __name(() => {
  extendString();
  extendUint8Array();
}, "extendBuiltins");
var gBase64 = {
  version,
  VERSION,
  atob: _atob,
  atobPolyfill,
  btoa: _btoa,
  btoaPolyfill,
  fromBase64: decode,
  toBase64: encode,
  encode,
  encodeURI: encodeURI2,
  encodeURL: encodeURI2,
  utob,
  btou,
  decode,
  isValid,
  fromUint8Array,
  toUint8Array,
  extendString,
  extendUint8Array,
  extendBuiltins
};

// node_modules/@libsql/core/lib-esm/util.js
var supportedUrlLink = "https://github.com/libsql/libsql-client-ts#supported-urls";
function transactionModeToBegin(mode) {
  if (mode === "write") {
    return "BEGIN IMMEDIATE";
  } else if (mode === "read") {
    return "BEGIN TRANSACTION READONLY";
  } else if (mode === "deferred") {
    return "BEGIN DEFERRED";
  } else {
    throw RangeError('Unknown transaction mode, supported values are "write", "read" and "deferred"');
  }
}
__name(transactionModeToBegin, "transactionModeToBegin");
var ResultSetImpl = class {
  static {
    __name(this, "ResultSetImpl");
  }
  columns;
  columnTypes;
  rows;
  rowsAffected;
  lastInsertRowid;
  constructor(columns, columnTypes, rows, rowsAffected, lastInsertRowid) {
    this.columns = columns;
    this.columnTypes = columnTypes;
    this.rows = rows;
    this.rowsAffected = rowsAffected;
    this.lastInsertRowid = lastInsertRowid;
  }
  toJSON() {
    return {
      columns: this.columns,
      columnTypes: this.columnTypes,
      rows: this.rows.map(rowToJson),
      rowsAffected: this.rowsAffected,
      lastInsertRowid: this.lastInsertRowid !== void 0 ? "" + this.lastInsertRowid : null
    };
  }
};
function rowToJson(row) {
  return Array.prototype.map.call(row, valueToJson);
}
__name(rowToJson, "rowToJson");
function valueToJson(value) {
  if (typeof value === "bigint") {
    return "" + value;
  } else if (value instanceof ArrayBuffer) {
    return gBase64.fromUint8Array(new Uint8Array(value));
  } else {
    return value;
  }
}
__name(valueToJson, "valueToJson");

// node_modules/@libsql/core/lib-esm/config.js
var inMemoryMode = ":memory:";
function expandConfig(config, preferHttp) {
  if (typeof config !== "object") {
    throw new TypeError(`Expected client configuration as object, got ${typeof config}`);
  }
  let { url, authToken, tls, intMode, concurrency } = config;
  concurrency = Math.max(0, concurrency || 20);
  intMode ??= "number";
  let connectionQueryParams = [];
  if (url === inMemoryMode) {
    url = "file::memory:";
  }
  const uri = parseUri(url);
  const originalUriScheme = uri.scheme.toLowerCase();
  const isInMemoryMode = originalUriScheme === "file" && uri.path === inMemoryMode && uri.authority === void 0;
  let queryParamsDef;
  if (isInMemoryMode) {
    queryParamsDef = {
      cache: {
        values: ["shared", "private"],
        update: /* @__PURE__ */ __name((key, value) => connectionQueryParams.push(`${key}=${value}`), "update")
      }
    };
  } else {
    queryParamsDef = {
      tls: {
        values: ["0", "1"],
        update: /* @__PURE__ */ __name((_, value) => tls = value === "1", "update")
      },
      authToken: {
        update: /* @__PURE__ */ __name((_, value) => authToken = value, "update")
      }
    };
  }
  for (const { key, value } of uri.query?.pairs ?? []) {
    if (!Object.hasOwn(queryParamsDef, key)) {
      throw new LibsqlError(`Unsupported URL query parameter ${JSON.stringify(key)}`, "URL_PARAM_NOT_SUPPORTED");
    }
    const queryParamDef = queryParamsDef[key];
    if (queryParamDef.values !== void 0 && !queryParamDef.values.includes(value)) {
      throw new LibsqlError(`Unknown value for the "${key}" query argument: ${JSON.stringify(value)}. Supported values are: [${queryParamDef.values.map((x) => '"' + x + '"').join(", ")}]`, "URL_INVALID");
    }
    if (queryParamDef.update !== void 0) {
      queryParamDef?.update(key, value);
    }
  }
  const connectionQueryParamsString = connectionQueryParams.length === 0 ? "" : `?${connectionQueryParams.join("&")}`;
  const path = uri.path + connectionQueryParamsString;
  let scheme;
  if (originalUriScheme === "libsql") {
    if (tls === false) {
      if (uri.authority?.port === void 0) {
        throw new LibsqlError('A "libsql:" URL with ?tls=0 must specify an explicit port', "URL_INVALID");
      }
      scheme = preferHttp ? "http" : "ws";
    } else {
      scheme = preferHttp ? "https" : "wss";
    }
  } else {
    scheme = originalUriScheme;
  }
  if (scheme === "http" || scheme === "ws") {
    tls ??= false;
  } else {
    tls ??= true;
  }
  if (scheme !== "http" && scheme !== "ws" && scheme !== "https" && scheme !== "wss" && scheme !== "file") {
    throw new LibsqlError(`The client supports only "libsql:", "wss:", "ws:", "https:", "http:" and "file:" URLs, got ${JSON.stringify(uri.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (intMode !== "number" && intMode !== "bigint" && intMode !== "string") {
    throw new TypeError(`Invalid value for intMode, expected "number", "bigint" or "string", got ${JSON.stringify(intMode)}`);
  }
  if (uri.fragment !== void 0) {
    throw new LibsqlError(`URL fragments are not supported: ${JSON.stringify("#" + uri.fragment)}`, "URL_INVALID");
  }
  if (isInMemoryMode) {
    return {
      scheme: "file",
      tls: false,
      path,
      intMode,
      concurrency,
      syncUrl: config.syncUrl,
      syncInterval: config.syncInterval,
      readYourWrites: config.readYourWrites,
      offline: config.offline,
      fetch: config.fetch,
      authToken: void 0,
      encryptionKey: void 0,
      authority: void 0
    };
  }
  return {
    scheme,
    tls,
    authority: uri.authority,
    path,
    authToken,
    intMode,
    concurrency,
    encryptionKey: config.encryptionKey,
    syncUrl: config.syncUrl,
    syncInterval: config.syncInterval,
    readYourWrites: config.readYourWrites,
    offline: config.offline,
    fetch: config.fetch
  };
}
__name(expandConfig, "expandConfig");

// node_modules/@libsql/isomorphic-ws/web.mjs
var _WebSocket;
if (typeof WebSocket !== "undefined") {
  _WebSocket = WebSocket;
} else if (typeof global !== "undefined") {
  _WebSocket = global.WebSocket;
} else if (typeof window !== "undefined") {
  _WebSocket = window.WebSocket;
} else if (typeof self !== "undefined") {
  _WebSocket = self.WebSocket;
}

// node_modules/@libsql/hrana-client/lib-esm/client.js
var Client = class {
  static {
    __name(this, "Client");
  }
  /** @private */
  constructor() {
    this.intMode = "number";
  }
  /** Representation of integers returned from the database. See {@link IntMode}.
   *
   * This value is inherited by {@link Stream} objects created with {@link openStream}, but you can
   * override the integer mode for every stream by setting {@link Stream.intMode} on the stream.
   */
  intMode;
};

// node_modules/@libsql/hrana-client/lib-esm/errors.js
var ClientError = class extends Error {
  static {
    __name(this, "ClientError");
  }
  /** @private */
  constructor(message) {
    super(message);
    this.name = "ClientError";
  }
};
var ProtoError = class extends ClientError {
  static {
    __name(this, "ProtoError");
  }
  /** @private */
  constructor(message) {
    super(message);
    this.name = "ProtoError";
  }
};
var ResponseError = class extends ClientError {
  static {
    __name(this, "ResponseError");
  }
  code;
  /** @internal */
  proto;
  /** @private */
  constructor(message, protoError) {
    super(message);
    this.name = "ResponseError";
    this.code = protoError.code;
    this.proto = protoError;
    this.stack = void 0;
  }
};
var ClosedError = class extends ClientError {
  static {
    __name(this, "ClosedError");
  }
  /** @private */
  constructor(message, cause) {
    if (cause !== void 0) {
      super(`${message}: ${cause}`);
      this.cause = cause;
    } else {
      super(message);
    }
    this.name = "ClosedError";
  }
};
var WebSocketUnsupportedError = class extends ClientError {
  static {
    __name(this, "WebSocketUnsupportedError");
  }
  /** @private */
  constructor(message) {
    super(message);
    this.name = "WebSocketUnsupportedError";
  }
};
var WebSocketError = class extends ClientError {
  static {
    __name(this, "WebSocketError");
  }
  /** @private */
  constructor(message) {
    super(message);
    this.name = "WebSocketError";
  }
};
var HttpServerError = class extends ClientError {
  static {
    __name(this, "HttpServerError");
  }
  status;
  /** @private */
  constructor(message, status2) {
    super(message);
    this.status = status2;
    this.name = "HttpServerError";
  }
};
var ProtocolVersionError = class extends ClientError {
  static {
    __name(this, "ProtocolVersionError");
  }
  /** @private */
  constructor(message) {
    super(message);
    this.name = "ProtocolVersionError";
  }
};
var InternalError = class extends ClientError {
  static {
    __name(this, "InternalError");
  }
  /** @private */
  constructor(message) {
    super(message);
    this.name = "InternalError";
  }
};
var MisuseError = class extends ClientError {
  static {
    __name(this, "MisuseError");
  }
  /** @private */
  constructor(message) {
    super(message);
    this.name = "MisuseError";
  }
};

// node_modules/@libsql/hrana-client/lib-esm/encoding/json/decode.js
function string(value) {
  if (typeof value === "string") {
    return value;
  }
  throw typeError(value, "string");
}
__name(string, "string");
function stringOpt(value) {
  if (value === null || value === void 0) {
    return void 0;
  } else if (typeof value === "string") {
    return value;
  }
  throw typeError(value, "string or null");
}
__name(stringOpt, "stringOpt");
function number(value) {
  if (typeof value === "number") {
    return value;
  }
  throw typeError(value, "number");
}
__name(number, "number");
function boolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  throw typeError(value, "boolean");
}
__name(boolean, "boolean");
function array(value) {
  if (Array.isArray(value)) {
    return value;
  }
  throw typeError(value, "array");
}
__name(array, "array");
function object(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw typeError(value, "object");
}
__name(object, "object");
function arrayObjectsMap(value, fun) {
  return array(value).map((elemValue) => fun(object(elemValue)));
}
__name(arrayObjectsMap, "arrayObjectsMap");
function typeError(value, expected) {
  if (value === void 0) {
    return new ProtoError(`Expected ${expected}, but the property was missing`);
  }
  let received = typeof value;
  if (value === null) {
    received = "null";
  } else if (Array.isArray(value)) {
    received = "array";
  }
  return new ProtoError(`Expected ${expected}, received ${received}`);
}
__name(typeError, "typeError");
function readJsonObject(value, fun) {
  return fun(object(value));
}
__name(readJsonObject, "readJsonObject");

// node_modules/@libsql/hrana-client/lib-esm/encoding/json/encode.js
var ObjectWriter = class {
  static {
    __name(this, "ObjectWriter");
  }
  #output;
  #isFirst;
  constructor(output) {
    this.#output = output;
    this.#isFirst = false;
  }
  begin() {
    this.#output.push("{");
    this.#isFirst = true;
  }
  end() {
    this.#output.push("}");
    this.#isFirst = false;
  }
  #key(name) {
    if (this.#isFirst) {
      this.#output.push('"');
      this.#isFirst = false;
    } else {
      this.#output.push(',"');
    }
    this.#output.push(name);
    this.#output.push('":');
  }
  string(name, value) {
    this.#key(name);
    this.#output.push(JSON.stringify(value));
  }
  stringRaw(name, value) {
    this.#key(name);
    this.#output.push('"');
    this.#output.push(value);
    this.#output.push('"');
  }
  number(name, value) {
    this.#key(name);
    this.#output.push("" + value);
  }
  boolean(name, value) {
    this.#key(name);
    this.#output.push(value ? "true" : "false");
  }
  object(name, value, valueFun) {
    this.#key(name);
    this.begin();
    valueFun(this, value);
    this.end();
  }
  arrayObjects(name, values, valueFun) {
    this.#key(name);
    this.#output.push("[");
    for (let i = 0; i < values.length; ++i) {
      if (i !== 0) {
        this.#output.push(",");
      }
      this.begin();
      valueFun(this, values[i]);
      this.end();
    }
    this.#output.push("]");
  }
};
function writeJsonObject(value, fun) {
  const output = [];
  const writer = new ObjectWriter(output);
  writer.begin();
  fun(writer, value);
  writer.end();
  return output.join("");
}
__name(writeJsonObject, "writeJsonObject");

// node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/util.js
var VARINT = 0;
var FIXED_64 = 1;
var LENGTH_DELIMITED = 2;
var FIXED_32 = 5;

// node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/decode.js
var MessageReader = class {
  static {
    __name(this, "MessageReader");
  }
  #array;
  #view;
  #pos;
  constructor(array2) {
    this.#array = array2;
    this.#view = new DataView(array2.buffer, array2.byteOffset, array2.byteLength);
    this.#pos = 0;
  }
  varint() {
    let value = 0;
    for (let shift = 0; ; shift += 7) {
      const byte = this.#array[this.#pos++];
      value |= (byte & 127) << shift;
      if (!(byte & 128)) {
        break;
      }
    }
    return value;
  }
  varintBig() {
    let value = 0n;
    for (let shift = 0n; ; shift += 7n) {
      const byte = this.#array[this.#pos++];
      value |= BigInt(byte & 127) << shift;
      if (!(byte & 128)) {
        break;
      }
    }
    return value;
  }
  bytes(length) {
    const array2 = new Uint8Array(this.#array.buffer, this.#array.byteOffset + this.#pos, length);
    this.#pos += length;
    return array2;
  }
  double() {
    const value = this.#view.getFloat64(this.#pos, true);
    this.#pos += 8;
    return value;
  }
  skipVarint() {
    for (; ; ) {
      const byte = this.#array[this.#pos++];
      if (!(byte & 128)) {
        break;
      }
    }
  }
  skip(count) {
    this.#pos += count;
  }
  eof() {
    return this.#pos >= this.#array.byteLength;
  }
};
var FieldReader = class {
  static {
    __name(this, "FieldReader");
  }
  #reader;
  #wireType;
  constructor(reader) {
    this.#reader = reader;
    this.#wireType = -1;
  }
  setup(wireType) {
    this.#wireType = wireType;
  }
  #expect(expectedWireType) {
    if (this.#wireType !== expectedWireType) {
      throw new ProtoError(`Expected wire type ${expectedWireType}, got ${this.#wireType}`);
    }
    this.#wireType = -1;
  }
  bytes() {
    this.#expect(LENGTH_DELIMITED);
    const length = this.#reader.varint();
    return this.#reader.bytes(length);
  }
  string() {
    return new TextDecoder().decode(this.bytes());
  }
  message(def) {
    return readProtobufMessage(this.bytes(), def);
  }
  int32() {
    this.#expect(VARINT);
    return this.#reader.varint();
  }
  uint32() {
    return this.int32();
  }
  bool() {
    return this.int32() !== 0;
  }
  uint64() {
    this.#expect(VARINT);
    return this.#reader.varintBig();
  }
  sint64() {
    const value = this.uint64();
    return value >> 1n ^ -(value & 1n);
  }
  double() {
    this.#expect(FIXED_64);
    return this.#reader.double();
  }
  maybeSkip() {
    if (this.#wireType < 0) {
      return;
    } else if (this.#wireType === VARINT) {
      this.#reader.skipVarint();
    } else if (this.#wireType === FIXED_64) {
      this.#reader.skip(8);
    } else if (this.#wireType === LENGTH_DELIMITED) {
      const length = this.#reader.varint();
      this.#reader.skip(length);
    } else if (this.#wireType === FIXED_32) {
      this.#reader.skip(4);
    } else {
      throw new ProtoError(`Unexpected wire type ${this.#wireType}`);
    }
    this.#wireType = -1;
  }
};
function readProtobufMessage(data, def) {
  const msgReader = new MessageReader(data);
  const fieldReader = new FieldReader(msgReader);
  let value = def.default();
  while (!msgReader.eof()) {
    const key = msgReader.varint();
    const tag = key >> 3;
    const wireType = key & 7;
    fieldReader.setup(wireType);
    const tagFun = def[tag];
    if (tagFun !== void 0) {
      const returnedValue = tagFun(fieldReader, value);
      if (returnedValue !== void 0) {
        value = returnedValue;
      }
    }
    fieldReader.maybeSkip();
  }
  return value;
}
__name(readProtobufMessage, "readProtobufMessage");

// node_modules/@libsql/hrana-client/lib-esm/encoding/protobuf/encode.js
var MessageWriter = class _MessageWriter {
  static {
    __name(this, "MessageWriter");
  }
  #buf;
  #array;
  #view;
  #pos;
  constructor() {
    this.#buf = new ArrayBuffer(256);
    this.#array = new Uint8Array(this.#buf);
    this.#view = new DataView(this.#buf);
    this.#pos = 0;
  }
  #ensure(extra) {
    if (this.#pos + extra <= this.#buf.byteLength) {
      return;
    }
    let newCap = this.#buf.byteLength;
    while (newCap < this.#pos + extra) {
      newCap *= 2;
    }
    const newBuf = new ArrayBuffer(newCap);
    const newArray = new Uint8Array(newBuf);
    const newView = new DataView(newBuf);
    newArray.set(new Uint8Array(this.#buf, 0, this.#pos));
    this.#buf = newBuf;
    this.#array = newArray;
    this.#view = newView;
  }
  #varint(value) {
    this.#ensure(5);
    value = 0 | value;
    do {
      let byte = value & 127;
      value >>>= 7;
      byte |= value ? 128 : 0;
      this.#array[this.#pos++] = byte;
    } while (value);
  }
  #varintBig(value) {
    this.#ensure(10);
    value = value & 0xffffffffffffffffn;
    do {
      let byte = Number(value & 0x7fn);
      value >>= 7n;
      byte |= value ? 128 : 0;
      this.#array[this.#pos++] = byte;
    } while (value);
  }
  #tag(tag, wireType) {
    this.#varint(tag << 3 | wireType);
  }
  bytes(tag, value) {
    this.#tag(tag, LENGTH_DELIMITED);
    this.#varint(value.byteLength);
    this.#ensure(value.byteLength);
    this.#array.set(value, this.#pos);
    this.#pos += value.byteLength;
  }
  string(tag, value) {
    this.bytes(tag, new TextEncoder().encode(value));
  }
  message(tag, value, fun) {
    const writer = new _MessageWriter();
    fun(writer, value);
    this.bytes(tag, writer.data());
  }
  int32(tag, value) {
    this.#tag(tag, VARINT);
    this.#varint(value);
  }
  uint32(tag, value) {
    this.int32(tag, value);
  }
  bool(tag, value) {
    this.int32(tag, value ? 1 : 0);
  }
  sint64(tag, value) {
    this.#tag(tag, VARINT);
    this.#varintBig(value << 1n ^ value >> 63n);
  }
  double(tag, value) {
    this.#tag(tag, FIXED_64);
    this.#ensure(8);
    this.#view.setFloat64(this.#pos, value, true);
    this.#pos += 8;
  }
  data() {
    return new Uint8Array(this.#buf, 0, this.#pos);
  }
};
function writeProtobufMessage(value, fun) {
  const w = new MessageWriter();
  fun(w, value);
  return w.data();
}
__name(writeProtobufMessage, "writeProtobufMessage");

// node_modules/@libsql/hrana-client/lib-esm/id_alloc.js
var IdAlloc = class {
  static {
    __name(this, "IdAlloc");
  }
  // Set of all allocated ids
  #usedIds;
  // Set of all free ids lower than `#usedIds.size`
  #freeIds;
  constructor() {
    this.#usedIds = /* @__PURE__ */ new Set();
    this.#freeIds = /* @__PURE__ */ new Set();
  }
  // Returns an id that was free, and marks it as used.
  alloc() {
    for (const freeId2 of this.#freeIds) {
      this.#freeIds.delete(freeId2);
      this.#usedIds.add(freeId2);
      if (!this.#usedIds.has(this.#usedIds.size - 1)) {
        this.#freeIds.add(this.#usedIds.size - 1);
      }
      return freeId2;
    }
    const freeId = this.#usedIds.size;
    this.#usedIds.add(freeId);
    return freeId;
  }
  free(id) {
    if (!this.#usedIds.delete(id)) {
      throw new InternalError("Freeing an id that is not allocated");
    }
    this.#freeIds.delete(this.#usedIds.size);
    if (id < this.#usedIds.size) {
      this.#freeIds.add(id);
    }
  }
};

// node_modules/@libsql/hrana-client/lib-esm/util.js
function impossible(value, message) {
  throw new InternalError(message);
}
__name(impossible, "impossible");

// node_modules/@libsql/hrana-client/lib-esm/value.js
function valueToProto(value) {
  if (value === null) {
    return null;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError("Only finite numbers (not Infinity or NaN) can be passed as arguments");
    }
    return value;
  } else if (typeof value === "bigint") {
    if (value < minInteger || value > maxInteger) {
      throw new RangeError("This bigint value is too large to be represented as a 64-bit integer and passed as argument");
    }
    return value;
  } else if (typeof value === "boolean") {
    return value ? 1n : 0n;
  } else if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  } else if (value instanceof Uint8Array) {
    return value;
  } else if (value instanceof Date) {
    return +value.valueOf();
  } else if (typeof value === "object") {
    return "" + value.toString();
  } else {
    throw new TypeError("Unsupported type of value");
  }
}
__name(valueToProto, "valueToProto");
var minInteger = -9223372036854775808n;
var maxInteger = 9223372036854775807n;
function valueFromProto(value, intMode) {
  if (value === null) {
    return null;
  } else if (typeof value === "number") {
    return value;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "bigint") {
    if (intMode === "number") {
      const num = Number(value);
      if (!Number.isSafeInteger(num)) {
        throw new RangeError("Received integer which is too large to be safely represented as a JavaScript number");
      }
      return num;
    } else if (intMode === "bigint") {
      return value;
    } else if (intMode === "string") {
      return "" + value;
    } else {
      throw new MisuseError("Invalid value for IntMode");
    }
  } else if (value instanceof Uint8Array) {
    return value.slice().buffer;
  } else if (value === void 0) {
    throw new ProtoError("Received unrecognized type of Value");
  } else {
    throw impossible(value, "Impossible type of Value");
  }
}
__name(valueFromProto, "valueFromProto");

// node_modules/@libsql/hrana-client/lib-esm/result.js
function stmtResultFromProto(result) {
  return {
    affectedRowCount: result.affectedRowCount,
    lastInsertRowid: result.lastInsertRowid,
    columnNames: result.cols.map((col) => col.name),
    columnDecltypes: result.cols.map((col) => col.decltype)
  };
}
__name(stmtResultFromProto, "stmtResultFromProto");
function rowsResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  const rows = result.rows.map((row) => rowFromProto(stmtResult.columnNames, row, intMode));
  return { ...stmtResult, rows };
}
__name(rowsResultFromProto, "rowsResultFromProto");
function rowResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  let row;
  if (result.rows.length > 0) {
    row = rowFromProto(stmtResult.columnNames, result.rows[0], intMode);
  }
  return { ...stmtResult, row };
}
__name(rowResultFromProto, "rowResultFromProto");
function valueResultFromProto(result, intMode) {
  const stmtResult = stmtResultFromProto(result);
  let value;
  if (result.rows.length > 0 && stmtResult.columnNames.length > 0) {
    value = valueFromProto(result.rows[0][0], intMode);
  }
  return { ...stmtResult, value };
}
__name(valueResultFromProto, "valueResultFromProto");
function rowFromProto(colNames, values, intMode) {
  const row = {};
  Object.defineProperty(row, "length", { value: values.length });
  for (let i = 0; i < values.length; ++i) {
    const value = valueFromProto(values[i], intMode);
    Object.defineProperty(row, i, { value });
    const colName = colNames[i];
    if (colName !== void 0 && !Object.hasOwn(row, colName)) {
      Object.defineProperty(row, colName, { value, enumerable: true, configurable: true, writable: true });
    }
  }
  return row;
}
__name(rowFromProto, "rowFromProto");
function errorFromProto(error) {
  return new ResponseError(error.message, error);
}
__name(errorFromProto, "errorFromProto");

// node_modules/@libsql/hrana-client/lib-esm/sql.js
var Sql = class {
  static {
    __name(this, "Sql");
  }
  #owner;
  #sqlId;
  #closed;
  /** @private */
  constructor(owner, sqlId) {
    this.#owner = owner;
    this.#sqlId = sqlId;
    this.#closed = void 0;
  }
  /** @private */
  _getSqlId(owner) {
    if (this.#owner !== owner) {
      throw new MisuseError("Attempted to use SQL text opened with other object");
    } else if (this.#closed !== void 0) {
      throw new ClosedError("SQL text is closed", this.#closed);
    }
    return this.#sqlId;
  }
  /** Remove the SQL text from the server, releasing resouces. */
  close() {
    this._setClosed(new ClientError("SQL text was manually closed"));
  }
  /** @private */
  _setClosed(error) {
    if (this.#closed === void 0) {
      this.#closed = error;
      this.#owner._closeSql(this.#sqlId);
    }
  }
  /** True if the SQL text is closed (removed from the server). */
  get closed() {
    return this.#closed !== void 0;
  }
};
function sqlToProto(owner, sql) {
  if (sql instanceof Sql) {
    return { sqlId: sql._getSqlId(owner) };
  } else {
    return { sql: "" + sql };
  }
}
__name(sqlToProto, "sqlToProto");

// node_modules/@libsql/hrana-client/lib-esm/queue.js
var Queue = class {
  static {
    __name(this, "Queue");
  }
  #pushStack;
  #shiftStack;
  constructor() {
    this.#pushStack = [];
    this.#shiftStack = [];
  }
  get length() {
    return this.#pushStack.length + this.#shiftStack.length;
  }
  push(elem) {
    this.#pushStack.push(elem);
  }
  shift() {
    if (this.#shiftStack.length === 0 && this.#pushStack.length > 0) {
      this.#shiftStack = this.#pushStack.reverse();
      this.#pushStack = [];
    }
    return this.#shiftStack.pop();
  }
  first() {
    return this.#shiftStack.length !== 0 ? this.#shiftStack[this.#shiftStack.length - 1] : this.#pushStack[0];
  }
};

// node_modules/@libsql/hrana-client/lib-esm/stmt.js
var Stmt = class {
  static {
    __name(this, "Stmt");
  }
  /** The SQL statement text. */
  sql;
  /** @private */
  _args;
  /** @private */
  _namedArgs;
  /** Initialize the statement with given SQL text. */
  constructor(sql) {
    this.sql = sql;
    this._args = [];
    this._namedArgs = /* @__PURE__ */ new Map();
  }
  /** Binds positional parameters from the given `values`. All previous positional bindings are cleared. */
  bindIndexes(values) {
    this._args.length = 0;
    for (const value of values) {
      this._args.push(valueToProto(value));
    }
    return this;
  }
  /** Binds a parameter by a 1-based index. */
  bindIndex(index, value) {
    if (index !== (index | 0) || index <= 0) {
      throw new RangeError("Index of a positional argument must be positive integer");
    }
    while (this._args.length < index) {
      this._args.push(null);
    }
    this._args[index - 1] = valueToProto(value);
    return this;
  }
  /** Binds a parameter by name. */
  bindName(name, value) {
    this._namedArgs.set(name, valueToProto(value));
    return this;
  }
  /** Clears all bindings. */
  unbindAll() {
    this._args.length = 0;
    this._namedArgs.clear();
    return this;
  }
};
function stmtToProto(sqlOwner, stmt, wantRows) {
  let inSql;
  let args = [];
  let namedArgs = [];
  if (stmt instanceof Stmt) {
    inSql = stmt.sql;
    args = stmt._args;
    for (const [name, value] of stmt._namedArgs.entries()) {
      namedArgs.push({ name, value });
    }
  } else if (Array.isArray(stmt)) {
    inSql = stmt[0];
    if (Array.isArray(stmt[1])) {
      args = stmt[1].map((arg) => valueToProto(arg));
    } else {
      namedArgs = Object.entries(stmt[1]).map(([name, value]) => {
        return { name, value: valueToProto(value) };
      });
    }
  } else {
    inSql = stmt;
  }
  const { sql, sqlId } = sqlToProto(sqlOwner, inSql);
  return { sql, sqlId, args, namedArgs, wantRows };
}
__name(stmtToProto, "stmtToProto");

// node_modules/@libsql/hrana-client/lib-esm/batch.js
var Batch = class {
  static {
    __name(this, "Batch");
  }
  /** @private */
  _stream;
  #useCursor;
  /** @private */
  _steps;
  #executed;
  /** @private */
  constructor(stream, useCursor) {
    this._stream = stream;
    this.#useCursor = useCursor;
    this._steps = [];
    this.#executed = false;
  }
  /** Return a builder for adding a step to the batch. */
  step() {
    return new BatchStep(this);
  }
  /** Execute the batch. */
  execute() {
    if (this.#executed) {
      throw new MisuseError("This batch has already been executed");
    }
    this.#executed = true;
    const batch = {
      steps: this._steps.map((step) => step.proto)
    };
    if (this.#useCursor) {
      return executeCursor(this._stream, this._steps, batch);
    } else {
      return executeRegular(this._stream, this._steps, batch);
    }
  }
};
function executeRegular(stream, steps, batch) {
  return stream._batch(batch).then((result) => {
    for (let step = 0; step < steps.length; ++step) {
      const stepResult = result.stepResults.get(step);
      const stepError = result.stepErrors.get(step);
      steps[step].callback(stepResult, stepError);
    }
  });
}
__name(executeRegular, "executeRegular");
async function executeCursor(stream, steps, batch) {
  const cursor = await stream._openCursor(batch);
  try {
    let nextStep = 0;
    let beginEntry = void 0;
    let rows = [];
    for (; ; ) {
      const entry = await cursor.next();
      if (entry === void 0) {
        break;
      }
      if (entry.type === "step_begin") {
        if (entry.step < nextStep || entry.step >= steps.length) {
          throw new ProtoError("Server produced StepBeginEntry for unexpected step");
        } else if (beginEntry !== void 0) {
          throw new ProtoError("Server produced StepBeginEntry before terminating previous step");
        }
        for (let step = nextStep; step < entry.step; ++step) {
          steps[step].callback(void 0, void 0);
        }
        nextStep = entry.step + 1;
        beginEntry = entry;
        rows = [];
      } else if (entry.type === "step_end") {
        if (beginEntry === void 0) {
          throw new ProtoError("Server produced StepEndEntry but no step is active");
        }
        const stmtResult = {
          cols: beginEntry.cols,
          rows,
          affectedRowCount: entry.affectedRowCount,
          lastInsertRowid: entry.lastInsertRowid
        };
        steps[beginEntry.step].callback(stmtResult, void 0);
        beginEntry = void 0;
        rows = [];
      } else if (entry.type === "step_error") {
        if (beginEntry === void 0) {
          if (entry.step >= steps.length) {
            throw new ProtoError("Server produced StepErrorEntry for unexpected step");
          }
          for (let step = nextStep; step < entry.step; ++step) {
            steps[step].callback(void 0, void 0);
          }
        } else {
          if (entry.step !== beginEntry.step) {
            throw new ProtoError("Server produced StepErrorEntry for unexpected step");
          }
          beginEntry = void 0;
          rows = [];
        }
        steps[entry.step].callback(void 0, entry.error);
        nextStep = entry.step + 1;
      } else if (entry.type === "row") {
        if (beginEntry === void 0) {
          throw new ProtoError("Server produced RowEntry but no step is active");
        }
        rows.push(entry.row);
      } else if (entry.type === "error") {
        throw errorFromProto(entry.error);
      } else if (entry.type === "none") {
        throw new ProtoError("Server produced unrecognized CursorEntry");
      } else {
        throw impossible(entry, "Impossible CursorEntry");
      }
    }
    if (beginEntry !== void 0) {
      throw new ProtoError("Server closed Cursor before terminating active step");
    }
    for (let step = nextStep; step < steps.length; ++step) {
      steps[step].callback(void 0, void 0);
    }
  } finally {
    cursor.close();
  }
}
__name(executeCursor, "executeCursor");
var BatchStep = class {
  static {
    __name(this, "BatchStep");
  }
  /** @private */
  _batch;
  #conds;
  /** @private */
  _index;
  /** @private */
  constructor(batch) {
    this._batch = batch;
    this.#conds = [];
    this._index = void 0;
  }
  /** Add the condition that needs to be satisfied to execute the statement. If you use this method multiple
   * times, we join the conditions with a logical AND. */
  condition(cond) {
    this.#conds.push(cond._proto);
    return this;
  }
  /** Add a statement that returns rows. */
  query(stmt) {
    return this.#add(stmt, true, rowsResultFromProto);
  }
  /** Add a statement that returns at most a single row. */
  queryRow(stmt) {
    return this.#add(stmt, true, rowResultFromProto);
  }
  /** Add a statement that returns at most a single value. */
  queryValue(stmt) {
    return this.#add(stmt, true, valueResultFromProto);
  }
  /** Add a statement without returning rows. */
  run(stmt) {
    return this.#add(stmt, false, stmtResultFromProto);
  }
  #add(inStmt, wantRows, fromProto) {
    if (this._index !== void 0) {
      throw new MisuseError("This BatchStep has already been added to the batch");
    }
    const stmt = stmtToProto(this._batch._stream._sqlOwner(), inStmt, wantRows);
    let condition;
    if (this.#conds.length === 0) {
      condition = void 0;
    } else if (this.#conds.length === 1) {
      condition = this.#conds[0];
    } else {
      condition = { type: "and", conds: this.#conds.slice() };
    }
    const proto = { stmt, condition };
    return new Promise((outputCallback, errorCallback) => {
      const callback = /* @__PURE__ */ __name((stepResult, stepError) => {
        if (stepResult !== void 0 && stepError !== void 0) {
          errorCallback(new ProtoError("Server returned both result and error"));
        } else if (stepError !== void 0) {
          errorCallback(errorFromProto(stepError));
        } else if (stepResult !== void 0) {
          outputCallback(fromProto(stepResult, this._batch._stream.intMode));
        } else {
          outputCallback(void 0);
        }
      }, "callback");
      this._index = this._batch._steps.length;
      this._batch._steps.push({ proto, callback });
    });
  }
};
var BatchCond = class _BatchCond {
  static {
    __name(this, "BatchCond");
  }
  /** @private */
  _batch;
  /** @private */
  _proto;
  /** @private */
  constructor(batch, proto) {
    this._batch = batch;
    this._proto = proto;
  }
  /** Create a condition that evaluates to true when the given step executes successfully.
   *
   * If the given step fails error or is skipped because its condition evaluated to false, this
   * condition evaluates to false.
   */
  static ok(step) {
    return new _BatchCond(step._batch, { type: "ok", step: stepIndex(step) });
  }
  /** Create a condition that evaluates to true when the given step fails.
   *
   * If the given step succeeds or is skipped because its condition evaluated to false, this condition
   * evaluates to false.
   */
  static error(step) {
    return new _BatchCond(step._batch, { type: "error", step: stepIndex(step) });
  }
  /** Create a condition that is a logical negation of another condition.
   */
  static not(cond) {
    return new _BatchCond(cond._batch, { type: "not", cond: cond._proto });
  }
  /** Create a condition that is a logical AND of other conditions.
   */
  static and(batch, conds) {
    for (const cond of conds) {
      checkCondBatch(batch, cond);
    }
    return new _BatchCond(batch, { type: "and", conds: conds.map((e) => e._proto) });
  }
  /** Create a condition that is a logical OR of other conditions.
   */
  static or(batch, conds) {
    for (const cond of conds) {
      checkCondBatch(batch, cond);
    }
    return new _BatchCond(batch, { type: "or", conds: conds.map((e) => e._proto) });
  }
  /** Create a condition that evaluates to true when the SQL connection is in autocommit mode (not inside an
   * explicit transaction). This requires protocol version 3 or higher.
   */
  static isAutocommit(batch) {
    batch._stream.client()._ensureVersion(3, "BatchCond.isAutocommit()");
    return new _BatchCond(batch, { type: "is_autocommit" });
  }
};
function stepIndex(step) {
  if (step._index === void 0) {
    throw new MisuseError("Cannot add a condition referencing a step that has not been added to the batch");
  }
  return step._index;
}
__name(stepIndex, "stepIndex");
function checkCondBatch(expectedBatch, cond) {
  if (cond._batch !== expectedBatch) {
    throw new MisuseError("Cannot mix BatchCond objects for different Batch objects");
  }
}
__name(checkCondBatch, "checkCondBatch");

// node_modules/@libsql/hrana-client/lib-esm/describe.js
function describeResultFromProto(result) {
  return {
    paramNames: result.params.map((p) => p.name),
    columns: result.cols,
    isExplain: result.isExplain,
    isReadonly: result.isReadonly
  };
}
__name(describeResultFromProto, "describeResultFromProto");

// node_modules/@libsql/hrana-client/lib-esm/stream.js
var Stream = class {
  static {
    __name(this, "Stream");
  }
  /** @private */
  constructor(intMode) {
    this.intMode = intMode;
  }
  /** Execute a statement and return rows. */
  query(stmt) {
    return this.#execute(stmt, true, rowsResultFromProto);
  }
  /** Execute a statement and return at most a single row. */
  queryRow(stmt) {
    return this.#execute(stmt, true, rowResultFromProto);
  }
  /** Execute a statement and return at most a single value. */
  queryValue(stmt) {
    return this.#execute(stmt, true, valueResultFromProto);
  }
  /** Execute a statement without returning rows. */
  run(stmt) {
    return this.#execute(stmt, false, stmtResultFromProto);
  }
  #execute(inStmt, wantRows, fromProto) {
    const stmt = stmtToProto(this._sqlOwner(), inStmt, wantRows);
    return this._execute(stmt).then((r) => fromProto(r, this.intMode));
  }
  /** Return a builder for creating and executing a batch.
   *
   * If `useCursor` is true, the batch will be executed using a Hrana cursor, which will stream results from
   * the server to the client, which consumes less memory on the server. This requires protocol version 3 or
   * higher.
   */
  batch(useCursor = false) {
    return new Batch(this, useCursor);
  }
  /** Parse and analyze a statement. This requires protocol version 2 or higher. */
  describe(inSql) {
    const protoSql = sqlToProto(this._sqlOwner(), inSql);
    return this._describe(protoSql).then(describeResultFromProto);
  }
  /** Execute a sequence of statements separated by semicolons. This requires protocol version 2 or higher.
   * */
  sequence(inSql) {
    const protoSql = sqlToProto(this._sqlOwner(), inSql);
    return this._sequence(protoSql);
  }
  /** Representation of integers returned from the database. See {@link IntMode}.
   *
   * This value affects the results of all operations on this stream.
   */
  intMode;
};

// node_modules/@libsql/hrana-client/lib-esm/cursor.js
var Cursor = class {
  static {
    __name(this, "Cursor");
  }
};

// node_modules/@libsql/hrana-client/lib-esm/ws/cursor.js
var fetchChunkSize = 1e3;
var fetchQueueSize = 10;
var WsCursor = class extends Cursor {
  static {
    __name(this, "WsCursor");
  }
  #client;
  #stream;
  #cursorId;
  #entryQueue;
  #fetchQueue;
  #closed;
  #done;
  /** @private */
  constructor(client, stream, cursorId) {
    super();
    this.#client = client;
    this.#stream = stream;
    this.#cursorId = cursorId;
    this.#entryQueue = new Queue();
    this.#fetchQueue = new Queue();
    this.#closed = void 0;
    this.#done = false;
  }
  /** Fetch the next entry from the cursor. */
  async next() {
    for (; ; ) {
      if (this.#closed !== void 0) {
        throw new ClosedError("Cursor is closed", this.#closed);
      }
      while (!this.#done && this.#fetchQueue.length < fetchQueueSize) {
        this.#fetchQueue.push(this.#fetch());
      }
      const entry = this.#entryQueue.shift();
      if (this.#done || entry !== void 0) {
        return entry;
      }
      await this.#fetchQueue.shift().then((response) => {
        if (response === void 0) {
          return;
        }
        for (const entry2 of response.entries) {
          this.#entryQueue.push(entry2);
        }
        this.#done ||= response.done;
      });
    }
  }
  #fetch() {
    return this.#stream._sendCursorRequest(this, {
      type: "fetch_cursor",
      cursorId: this.#cursorId,
      maxCount: fetchChunkSize
    }).then((resp) => resp, (error) => {
      this._setClosed(error);
      return void 0;
    });
  }
  /** @private */
  _setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    this.#stream._sendCursorRequest(this, {
      type: "close_cursor",
      cursorId: this.#cursorId
    }).catch(() => void 0);
    this.#stream._cursorClosed(this);
  }
  /** Close the cursor. */
  close() {
    this._setClosed(new ClientError("Cursor was manually closed"));
  }
  /** True if the cursor is closed. */
  get closed() {
    return this.#closed !== void 0;
  }
};

// node_modules/@libsql/hrana-client/lib-esm/ws/stream.js
var WsStream = class _WsStream extends Stream {
  static {
    __name(this, "WsStream");
  }
  #client;
  #streamId;
  #queue;
  #cursor;
  #closing;
  #closed;
  /** @private */
  static open(client) {
    const streamId = client._streamIdAlloc.alloc();
    const stream = new _WsStream(client, streamId);
    const responseCallback = /* @__PURE__ */ __name(() => void 0, "responseCallback");
    const errorCallback = /* @__PURE__ */ __name((e) => stream.#setClosed(e), "errorCallback");
    const request = { type: "open_stream", streamId };
    client._sendRequest(request, { responseCallback, errorCallback });
    return stream;
  }
  /** @private */
  constructor(client, streamId) {
    super(client.intMode);
    this.#client = client;
    this.#streamId = streamId;
    this.#queue = new Queue();
    this.#cursor = void 0;
    this.#closing = false;
    this.#closed = void 0;
  }
  /** Get the {@link WsClient} object that this stream belongs to. */
  client() {
    return this.#client;
  }
  /** @private */
  _sqlOwner() {
    return this.#client;
  }
  /** @private */
  _execute(stmt) {
    return this.#sendStreamRequest({
      type: "execute",
      streamId: this.#streamId,
      stmt
    }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _batch(batch) {
    return this.#sendStreamRequest({
      type: "batch",
      streamId: this.#streamId,
      batch
    }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _describe(protoSql) {
    this.#client._ensureVersion(2, "describe()");
    return this.#sendStreamRequest({
      type: "describe",
      streamId: this.#streamId,
      sql: protoSql.sql,
      sqlId: protoSql.sqlId
    }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _sequence(protoSql) {
    this.#client._ensureVersion(2, "sequence()");
    return this.#sendStreamRequest({
      type: "sequence",
      streamId: this.#streamId,
      sql: protoSql.sql,
      sqlId: protoSql.sqlId
    }).then((_response) => {
      return void 0;
    });
  }
  /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
   * explicit transaction). This requires protocol version 3 or higher.
   */
  getAutocommit() {
    this.#client._ensureVersion(3, "getAutocommit()");
    return this.#sendStreamRequest({
      type: "get_autocommit",
      streamId: this.#streamId
    }).then((response) => {
      return response.isAutocommit;
    });
  }
  #sendStreamRequest(request) {
    return new Promise((responseCallback, errorCallback) => {
      this.#pushToQueue({ type: "request", request, responseCallback, errorCallback });
    });
  }
  /** @private */
  _openCursor(batch) {
    this.#client._ensureVersion(3, "cursor");
    return new Promise((cursorCallback, errorCallback) => {
      this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
    });
  }
  /** @private */
  _sendCursorRequest(cursor, request) {
    if (cursor !== this.#cursor) {
      throw new InternalError("Cursor not associated with the stream attempted to execute a request");
    }
    return new Promise((responseCallback, errorCallback) => {
      if (this.#closed !== void 0) {
        errorCallback(new ClosedError("Stream is closed", this.#closed));
      } else {
        this.#client._sendRequest(request, { responseCallback, errorCallback });
      }
    });
  }
  /** @private */
  _cursorClosed(cursor) {
    if (cursor !== this.#cursor) {
      throw new InternalError("Cursor was closed, but it was not associated with the stream");
    }
    this.#cursor = void 0;
    this.#flushQueue();
  }
  #pushToQueue(entry) {
    if (this.#closed !== void 0) {
      entry.errorCallback(new ClosedError("Stream is closed", this.#closed));
    } else if (this.#closing) {
      entry.errorCallback(new ClosedError("Stream is closing", void 0));
    } else {
      this.#queue.push(entry);
      this.#flushQueue();
    }
  }
  #flushQueue() {
    for (; ; ) {
      const entry = this.#queue.first();
      if (entry === void 0 && this.#cursor === void 0 && this.#closing) {
        this.#setClosed(new ClientError("Stream was gracefully closed"));
        break;
      } else if (entry?.type === "request" && this.#cursor === void 0) {
        const { request, responseCallback, errorCallback } = entry;
        this.#queue.shift();
        this.#client._sendRequest(request, { responseCallback, errorCallback });
      } else if (entry?.type === "cursor" && this.#cursor === void 0) {
        const { batch, cursorCallback } = entry;
        this.#queue.shift();
        const cursorId = this.#client._cursorIdAlloc.alloc();
        const cursor = new WsCursor(this.#client, this, cursorId);
        const request = {
          type: "open_cursor",
          streamId: this.#streamId,
          cursorId,
          batch
        };
        const responseCallback = /* @__PURE__ */ __name(() => void 0, "responseCallback");
        const errorCallback = /* @__PURE__ */ __name((e) => cursor._setClosed(e), "errorCallback");
        this.#client._sendRequest(request, { responseCallback, errorCallback });
        this.#cursor = cursor;
        cursorCallback(cursor);
      } else {
        break;
      }
    }
  }
  #setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    if (this.#cursor !== void 0) {
      this.#cursor._setClosed(error);
    }
    for (; ; ) {
      const entry = this.#queue.shift();
      if (entry !== void 0) {
        entry.errorCallback(error);
      } else {
        break;
      }
    }
    const request = { type: "close_stream", streamId: this.#streamId };
    const responseCallback = /* @__PURE__ */ __name(() => this.#client._streamIdAlloc.free(this.#streamId), "responseCallback");
    const errorCallback = /* @__PURE__ */ __name(() => void 0, "errorCallback");
    this.#client._sendRequest(request, { responseCallback, errorCallback });
  }
  /** Immediately close the stream. */
  close() {
    this.#setClosed(new ClientError("Stream was manually closed"));
  }
  /** Gracefully close the stream. */
  closeGracefully() {
    this.#closing = true;
    this.#flushQueue();
  }
  /** True if the stream is closed or closing. */
  get closed() {
    return this.#closed !== void 0 || this.#closing;
  }
};

// node_modules/@libsql/hrana-client/lib-esm/shared/json_encode.js
function Stmt2(w, msg) {
  if (msg.sql !== void 0) {
    w.string("sql", msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.number("sql_id", msg.sqlId);
  }
  w.arrayObjects("args", msg.args, Value);
  w.arrayObjects("named_args", msg.namedArgs, NamedArg);
  w.boolean("want_rows", msg.wantRows);
}
__name(Stmt2, "Stmt");
function NamedArg(w, msg) {
  w.string("name", msg.name);
  w.object("value", msg.value, Value);
}
__name(NamedArg, "NamedArg");
function Batch2(w, msg) {
  w.arrayObjects("steps", msg.steps, BatchStep2);
}
__name(Batch2, "Batch");
function BatchStep2(w, msg) {
  if (msg.condition !== void 0) {
    w.object("condition", msg.condition, BatchCond2);
  }
  w.object("stmt", msg.stmt, Stmt2);
}
__name(BatchStep2, "BatchStep");
function BatchCond2(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "ok" || msg.type === "error") {
    w.number("step", msg.step);
  } else if (msg.type === "not") {
    w.object("cond", msg.cond, BatchCond2);
  } else if (msg.type === "and" || msg.type === "or") {
    w.arrayObjects("conds", msg.conds, BatchCond2);
  } else if (msg.type === "is_autocommit") {
  } else {
    throw impossible(msg, "Impossible type of BatchCond");
  }
}
__name(BatchCond2, "BatchCond");
function Value(w, msg) {
  if (msg === null) {
    w.stringRaw("type", "null");
  } else if (typeof msg === "bigint") {
    w.stringRaw("type", "integer");
    w.stringRaw("value", "" + msg);
  } else if (typeof msg === "number") {
    w.stringRaw("type", "float");
    w.number("value", msg);
  } else if (typeof msg === "string") {
    w.stringRaw("type", "text");
    w.string("value", msg);
  } else if (msg instanceof Uint8Array) {
    w.stringRaw("type", "blob");
    w.stringRaw("base64", gBase64.fromUint8Array(msg));
  } else if (msg === void 0) {
  } else {
    throw impossible(msg, "Impossible type of Value");
  }
}
__name(Value, "Value");

// node_modules/@libsql/hrana-client/lib-esm/ws/json_encode.js
function ClientMsg(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "hello") {
    if (msg.jwt !== void 0) {
      w.string("jwt", msg.jwt);
    }
  } else if (msg.type === "request") {
    w.number("request_id", msg.requestId);
    w.object("request", msg.request, Request2);
  } else {
    throw impossible(msg, "Impossible type of ClientMsg");
  }
}
__name(ClientMsg, "ClientMsg");
function Request2(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "open_stream") {
    w.number("stream_id", msg.streamId);
  } else if (msg.type === "close_stream") {
    w.number("stream_id", msg.streamId);
  } else if (msg.type === "execute") {
    w.number("stream_id", msg.streamId);
    w.object("stmt", msg.stmt, Stmt2);
  } else if (msg.type === "batch") {
    w.number("stream_id", msg.streamId);
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "open_cursor") {
    w.number("stream_id", msg.streamId);
    w.number("cursor_id", msg.cursorId);
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "close_cursor") {
    w.number("cursor_id", msg.cursorId);
  } else if (msg.type === "fetch_cursor") {
    w.number("cursor_id", msg.cursorId);
    w.number("max_count", msg.maxCount);
  } else if (msg.type === "sequence") {
    w.number("stream_id", msg.streamId);
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "describe") {
    w.number("stream_id", msg.streamId);
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "store_sql") {
    w.number("sql_id", msg.sqlId);
    w.string("sql", msg.sql);
  } else if (msg.type === "close_sql") {
    w.number("sql_id", msg.sqlId);
  } else if (msg.type === "get_autocommit") {
    w.number("stream_id", msg.streamId);
  } else {
    throw impossible(msg, "Impossible type of Request");
  }
}
__name(Request2, "Request");

// node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_encode.js
function Stmt3(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
  for (const arg of msg.args) {
    w.message(3, arg, Value2);
  }
  for (const arg of msg.namedArgs) {
    w.message(4, arg, NamedArg2);
  }
  w.bool(5, msg.wantRows);
}
__name(Stmt3, "Stmt");
function NamedArg2(w, msg) {
  w.string(1, msg.name);
  w.message(2, msg.value, Value2);
}
__name(NamedArg2, "NamedArg");
function Batch3(w, msg) {
  for (const step of msg.steps) {
    w.message(1, step, BatchStep3);
  }
}
__name(Batch3, "Batch");
function BatchStep3(w, msg) {
  if (msg.condition !== void 0) {
    w.message(1, msg.condition, BatchCond3);
  }
  w.message(2, msg.stmt, Stmt3);
}
__name(BatchStep3, "BatchStep");
function BatchCond3(w, msg) {
  if (msg.type === "ok") {
    w.uint32(1, msg.step);
  } else if (msg.type === "error") {
    w.uint32(2, msg.step);
  } else if (msg.type === "not") {
    w.message(3, msg.cond, BatchCond3);
  } else if (msg.type === "and") {
    w.message(4, msg.conds, BatchCondList);
  } else if (msg.type === "or") {
    w.message(5, msg.conds, BatchCondList);
  } else if (msg.type === "is_autocommit") {
    w.message(6, void 0, Empty);
  } else {
    throw impossible(msg, "Impossible type of BatchCond");
  }
}
__name(BatchCond3, "BatchCond");
function BatchCondList(w, msg) {
  for (const cond of msg) {
    w.message(1, cond, BatchCond3);
  }
}
__name(BatchCondList, "BatchCondList");
function Value2(w, msg) {
  if (msg === null) {
    w.message(1, void 0, Empty);
  } else if (typeof msg === "bigint") {
    w.sint64(2, msg);
  } else if (typeof msg === "number") {
    w.double(3, msg);
  } else if (typeof msg === "string") {
    w.string(4, msg);
  } else if (msg instanceof Uint8Array) {
    w.bytes(5, msg);
  } else if (msg === void 0) {
  } else {
    throw impossible(msg, "Impossible type of Value");
  }
}
__name(Value2, "Value");
function Empty(_w, _msg) {
}
__name(Empty, "Empty");

// node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_encode.js
function ClientMsg2(w, msg) {
  if (msg.type === "hello") {
    w.message(1, msg, HelloMsg);
  } else if (msg.type === "request") {
    w.message(2, msg, RequestMsg);
  } else {
    throw impossible(msg, "Impossible type of ClientMsg");
  }
}
__name(ClientMsg2, "ClientMsg");
function HelloMsg(w, msg) {
  if (msg.jwt !== void 0) {
    w.string(1, msg.jwt);
  }
}
__name(HelloMsg, "HelloMsg");
function RequestMsg(w, msg) {
  w.int32(1, msg.requestId);
  const request = msg.request;
  if (request.type === "open_stream") {
    w.message(2, request, OpenStreamReq);
  } else if (request.type === "close_stream") {
    w.message(3, request, CloseStreamReq);
  } else if (request.type === "execute") {
    w.message(4, request, ExecuteReq);
  } else if (request.type === "batch") {
    w.message(5, request, BatchReq);
  } else if (request.type === "open_cursor") {
    w.message(6, request, OpenCursorReq);
  } else if (request.type === "close_cursor") {
    w.message(7, request, CloseCursorReq);
  } else if (request.type === "fetch_cursor") {
    w.message(8, request, FetchCursorReq);
  } else if (request.type === "sequence") {
    w.message(9, request, SequenceReq);
  } else if (request.type === "describe") {
    w.message(10, request, DescribeReq);
  } else if (request.type === "store_sql") {
    w.message(11, request, StoreSqlReq);
  } else if (request.type === "close_sql") {
    w.message(12, request, CloseSqlReq);
  } else if (request.type === "get_autocommit") {
    w.message(13, request, GetAutocommitReq);
  } else {
    throw impossible(request, "Impossible type of Request");
  }
}
__name(RequestMsg, "RequestMsg");
function OpenStreamReq(w, msg) {
  w.int32(1, msg.streamId);
}
__name(OpenStreamReq, "OpenStreamReq");
function CloseStreamReq(w, msg) {
  w.int32(1, msg.streamId);
}
__name(CloseStreamReq, "CloseStreamReq");
function ExecuteReq(w, msg) {
  w.int32(1, msg.streamId);
  w.message(2, msg.stmt, Stmt3);
}
__name(ExecuteReq, "ExecuteReq");
function BatchReq(w, msg) {
  w.int32(1, msg.streamId);
  w.message(2, msg.batch, Batch3);
}
__name(BatchReq, "BatchReq");
function OpenCursorReq(w, msg) {
  w.int32(1, msg.streamId);
  w.int32(2, msg.cursorId);
  w.message(3, msg.batch, Batch3);
}
__name(OpenCursorReq, "OpenCursorReq");
function CloseCursorReq(w, msg) {
  w.int32(1, msg.cursorId);
}
__name(CloseCursorReq, "CloseCursorReq");
function FetchCursorReq(w, msg) {
  w.int32(1, msg.cursorId);
  w.uint32(2, msg.maxCount);
}
__name(FetchCursorReq, "FetchCursorReq");
function SequenceReq(w, msg) {
  w.int32(1, msg.streamId);
  if (msg.sql !== void 0) {
    w.string(2, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(3, msg.sqlId);
  }
}
__name(SequenceReq, "SequenceReq");
function DescribeReq(w, msg) {
  w.int32(1, msg.streamId);
  if (msg.sql !== void 0) {
    w.string(2, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(3, msg.sqlId);
  }
}
__name(DescribeReq, "DescribeReq");
function StoreSqlReq(w, msg) {
  w.int32(1, msg.sqlId);
  w.string(2, msg.sql);
}
__name(StoreSqlReq, "StoreSqlReq");
function CloseSqlReq(w, msg) {
  w.int32(1, msg.sqlId);
}
__name(CloseSqlReq, "CloseSqlReq");
function GetAutocommitReq(w, msg) {
  w.int32(1, msg.streamId);
}
__name(GetAutocommitReq, "GetAutocommitReq");

// node_modules/@libsql/hrana-client/lib-esm/shared/json_decode.js
function Error2(obj) {
  const message = string(obj["message"]);
  const code = stringOpt(obj["code"]);
  return { message, code };
}
__name(Error2, "Error");
function StmtResult(obj) {
  const cols = arrayObjectsMap(obj["cols"], Col);
  const rows = array(obj["rows"]).map((rowObj) => arrayObjectsMap(rowObj, Value3));
  const affectedRowCount = number(obj["affected_row_count"]);
  const lastInsertRowidStr = stringOpt(obj["last_insert_rowid"]);
  const lastInsertRowid = lastInsertRowidStr !== void 0 ? BigInt(lastInsertRowidStr) : void 0;
  return { cols, rows, affectedRowCount, lastInsertRowid };
}
__name(StmtResult, "StmtResult");
function Col(obj) {
  const name = stringOpt(obj["name"]);
  const decltype = stringOpt(obj["decltype"]);
  return { name, decltype };
}
__name(Col, "Col");
function BatchResult(obj) {
  const stepResults = /* @__PURE__ */ new Map();
  array(obj["step_results"]).forEach((value, i) => {
    if (value !== null) {
      stepResults.set(i, StmtResult(object(value)));
    }
  });
  const stepErrors = /* @__PURE__ */ new Map();
  array(obj["step_errors"]).forEach((value, i) => {
    if (value !== null) {
      stepErrors.set(i, Error2(object(value)));
    }
  });
  return { stepResults, stepErrors };
}
__name(BatchResult, "BatchResult");
function CursorEntry(obj) {
  const type = string(obj["type"]);
  if (type === "step_begin") {
    const step = number(obj["step"]);
    const cols = arrayObjectsMap(obj["cols"], Col);
    return { type: "step_begin", step, cols };
  } else if (type === "step_end") {
    const affectedRowCount = number(obj["affected_row_count"]);
    const lastInsertRowidStr = stringOpt(obj["last_insert_rowid"]);
    const lastInsertRowid = lastInsertRowidStr !== void 0 ? BigInt(lastInsertRowidStr) : void 0;
    return { type: "step_end", affectedRowCount, lastInsertRowid };
  } else if (type === "step_error") {
    const step = number(obj["step"]);
    const error = Error2(object(obj["error"]));
    return { type: "step_error", step, error };
  } else if (type === "row") {
    const row = arrayObjectsMap(obj["row"], Value3);
    return { type: "row", row };
  } else if (type === "error") {
    const error = Error2(object(obj["error"]));
    return { type: "error", error };
  } else {
    throw new ProtoError("Unexpected type of CursorEntry");
  }
}
__name(CursorEntry, "CursorEntry");
function DescribeResult(obj) {
  const params = arrayObjectsMap(obj["params"], DescribeParam);
  const cols = arrayObjectsMap(obj["cols"], DescribeCol);
  const isExplain = boolean(obj["is_explain"]);
  const isReadonly = boolean(obj["is_readonly"]);
  return { params, cols, isExplain, isReadonly };
}
__name(DescribeResult, "DescribeResult");
function DescribeParam(obj) {
  const name = stringOpt(obj["name"]);
  return { name };
}
__name(DescribeParam, "DescribeParam");
function DescribeCol(obj) {
  const name = string(obj["name"]);
  const decltype = stringOpt(obj["decltype"]);
  return { name, decltype };
}
__name(DescribeCol, "DescribeCol");
function Value3(obj) {
  const type = string(obj["type"]);
  if (type === "null") {
    return null;
  } else if (type === "integer") {
    const value = string(obj["value"]);
    return BigInt(value);
  } else if (type === "float") {
    return number(obj["value"]);
  } else if (type === "text") {
    return string(obj["value"]);
  } else if (type === "blob") {
    return gBase64.toUint8Array(string(obj["base64"]));
  } else {
    throw new ProtoError("Unexpected type of Value");
  }
}
__name(Value3, "Value");

// node_modules/@libsql/hrana-client/lib-esm/ws/json_decode.js
function ServerMsg(obj) {
  const type = string(obj["type"]);
  if (type === "hello_ok") {
    return { type: "hello_ok" };
  } else if (type === "hello_error") {
    const error = Error2(object(obj["error"]));
    return { type: "hello_error", error };
  } else if (type === "response_ok") {
    const requestId = number(obj["request_id"]);
    const response = Response2(object(obj["response"]));
    return { type: "response_ok", requestId, response };
  } else if (type === "response_error") {
    const requestId = number(obj["request_id"]);
    const error = Error2(object(obj["error"]));
    return { type: "response_error", requestId, error };
  } else {
    throw new ProtoError("Unexpected type of ServerMsg");
  }
}
__name(ServerMsg, "ServerMsg");
function Response2(obj) {
  const type = string(obj["type"]);
  if (type === "open_stream") {
    return { type: "open_stream" };
  } else if (type === "close_stream") {
    return { type: "close_stream" };
  } else if (type === "execute") {
    const result = StmtResult(object(obj["result"]));
    return { type: "execute", result };
  } else if (type === "batch") {
    const result = BatchResult(object(obj["result"]));
    return { type: "batch", result };
  } else if (type === "open_cursor") {
    return { type: "open_cursor" };
  } else if (type === "close_cursor") {
    return { type: "close_cursor" };
  } else if (type === "fetch_cursor") {
    const entries = arrayObjectsMap(obj["entries"], CursorEntry);
    const done = boolean(obj["done"]);
    return { type: "fetch_cursor", entries, done };
  } else if (type === "sequence") {
    return { type: "sequence" };
  } else if (type === "describe") {
    const result = DescribeResult(object(obj["result"]));
    return { type: "describe", result };
  } else if (type === "store_sql") {
    return { type: "store_sql" };
  } else if (type === "close_sql") {
    return { type: "close_sql" };
  } else if (type === "get_autocommit") {
    const isAutocommit = boolean(obj["is_autocommit"]);
    return { type: "get_autocommit", isAutocommit };
  } else {
    throw new ProtoError("Unexpected type of Response");
  }
}
__name(Response2, "Response");

// node_modules/@libsql/hrana-client/lib-esm/shared/protobuf_decode.js
var Error3 = {
  default() {
    return { message: "", code: void 0 };
  },
  1(r, msg) {
    msg.message = r.string();
  },
  2(r, msg) {
    msg.code = r.string();
  }
};
var StmtResult2 = {
  default() {
    return {
      cols: [],
      rows: [],
      affectedRowCount: 0,
      lastInsertRowid: void 0
    };
  },
  1(r, msg) {
    msg.cols.push(r.message(Col2));
  },
  2(r, msg) {
    msg.rows.push(r.message(Row));
  },
  3(r, msg) {
    msg.affectedRowCount = Number(r.uint64());
  },
  4(r, msg) {
    msg.lastInsertRowid = r.sint64();
  }
};
var Col2 = {
  default() {
    return { name: void 0, decltype: void 0 };
  },
  1(r, msg) {
    msg.name = r.string();
  },
  2(r, msg) {
    msg.decltype = r.string();
  }
};
var Row = {
  default() {
    return [];
  },
  1(r, msg) {
    msg.push(r.message(Value4));
  }
};
var BatchResult2 = {
  default() {
    return { stepResults: /* @__PURE__ */ new Map(), stepErrors: /* @__PURE__ */ new Map() };
  },
  1(r, msg) {
    const [key, value] = r.message(BatchResultStepResult);
    msg.stepResults.set(key, value);
  },
  2(r, msg) {
    const [key, value] = r.message(BatchResultStepError);
    msg.stepErrors.set(key, value);
  }
};
var BatchResultStepResult = {
  default() {
    return [0, StmtResult2.default()];
  },
  1(r, msg) {
    msg[0] = r.uint32();
  },
  2(r, msg) {
    msg[1] = r.message(StmtResult2);
  }
};
var BatchResultStepError = {
  default() {
    return [0, Error3.default()];
  },
  1(r, msg) {
    msg[0] = r.uint32();
  },
  2(r, msg) {
    msg[1] = r.message(Error3);
  }
};
var CursorEntry2 = {
  default() {
    return { type: "none" };
  },
  1(r) {
    return r.message(StepBeginEntry);
  },
  2(r) {
    return r.message(StepEndEntry);
  },
  3(r) {
    return r.message(StepErrorEntry);
  },
  4(r) {
    return { type: "row", row: r.message(Row) };
  },
  5(r) {
    return { type: "error", error: r.message(Error3) };
  }
};
var StepBeginEntry = {
  default() {
    return { type: "step_begin", step: 0, cols: [] };
  },
  1(r, msg) {
    msg.step = r.uint32();
  },
  2(r, msg) {
    msg.cols.push(r.message(Col2));
  }
};
var StepEndEntry = {
  default() {
    return {
      type: "step_end",
      affectedRowCount: 0,
      lastInsertRowid: void 0
    };
  },
  1(r, msg) {
    msg.affectedRowCount = r.uint32();
  },
  2(r, msg) {
    msg.lastInsertRowid = r.uint64();
  }
};
var StepErrorEntry = {
  default() {
    return {
      type: "step_error",
      step: 0,
      error: Error3.default()
    };
  },
  1(r, msg) {
    msg.step = r.uint32();
  },
  2(r, msg) {
    msg.error = r.message(Error3);
  }
};
var DescribeResult2 = {
  default() {
    return {
      params: [],
      cols: [],
      isExplain: false,
      isReadonly: false
    };
  },
  1(r, msg) {
    msg.params.push(r.message(DescribeParam2));
  },
  2(r, msg) {
    msg.cols.push(r.message(DescribeCol2));
  },
  3(r, msg) {
    msg.isExplain = r.bool();
  },
  4(r, msg) {
    msg.isReadonly = r.bool();
  }
};
var DescribeParam2 = {
  default() {
    return { name: void 0 };
  },
  1(r, msg) {
    msg.name = r.string();
  }
};
var DescribeCol2 = {
  default() {
    return { name: "", decltype: void 0 };
  },
  1(r, msg) {
    msg.name = r.string();
  },
  2(r, msg) {
    msg.decltype = r.string();
  }
};
var Value4 = {
  default() {
    return void 0;
  },
  1(r) {
    return null;
  },
  2(r) {
    return r.sint64();
  },
  3(r) {
    return r.double();
  },
  4(r) {
    return r.string();
  },
  5(r) {
    return r.bytes();
  }
};

// node_modules/@libsql/hrana-client/lib-esm/ws/protobuf_decode.js
var ServerMsg2 = {
  default() {
    return { type: "none" };
  },
  1(r) {
    return { type: "hello_ok" };
  },
  2(r) {
    return r.message(HelloErrorMsg);
  },
  3(r) {
    return r.message(ResponseOkMsg);
  },
  4(r) {
    return r.message(ResponseErrorMsg);
  }
};
var HelloErrorMsg = {
  default() {
    return { type: "hello_error", error: Error3.default() };
  },
  1(r, msg) {
    msg.error = r.message(Error3);
  }
};
var ResponseErrorMsg = {
  default() {
    return { type: "response_error", requestId: 0, error: Error3.default() };
  },
  1(r, msg) {
    msg.requestId = r.int32();
  },
  2(r, msg) {
    msg.error = r.message(Error3);
  }
};
var ResponseOkMsg = {
  default() {
    return {
      type: "response_ok",
      requestId: 0,
      response: { type: "none" }
    };
  },
  1(r, msg) {
    msg.requestId = r.int32();
  },
  2(r, msg) {
    msg.response = { type: "open_stream" };
  },
  3(r, msg) {
    msg.response = { type: "close_stream" };
  },
  4(r, msg) {
    msg.response = r.message(ExecuteResp);
  },
  5(r, msg) {
    msg.response = r.message(BatchResp);
  },
  6(r, msg) {
    msg.response = { type: "open_cursor" };
  },
  7(r, msg) {
    msg.response = { type: "close_cursor" };
  },
  8(r, msg) {
    msg.response = r.message(FetchCursorResp);
  },
  9(r, msg) {
    msg.response = { type: "sequence" };
  },
  10(r, msg) {
    msg.response = r.message(DescribeResp);
  },
  11(r, msg) {
    msg.response = { type: "store_sql" };
  },
  12(r, msg) {
    msg.response = { type: "close_sql" };
  },
  13(r, msg) {
    msg.response = r.message(GetAutocommitResp);
  }
};
var ExecuteResp = {
  default() {
    return { type: "execute", result: StmtResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(StmtResult2);
  }
};
var BatchResp = {
  default() {
    return { type: "batch", result: BatchResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(BatchResult2);
  }
};
var FetchCursorResp = {
  default() {
    return { type: "fetch_cursor", entries: [], done: false };
  },
  1(r, msg) {
    msg.entries.push(r.message(CursorEntry2));
  },
  2(r, msg) {
    msg.done = r.bool();
  }
};
var DescribeResp = {
  default() {
    return { type: "describe", result: DescribeResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(DescribeResult2);
  }
};
var GetAutocommitResp = {
  default() {
    return { type: "get_autocommit", isAutocommit: false };
  },
  1(r, msg) {
    msg.isAutocommit = r.bool();
  }
};

// node_modules/@libsql/hrana-client/lib-esm/ws/client.js
var subprotocolsV2 = /* @__PURE__ */ new Map([
  ["hrana2", { version: 2, encoding: "json" }],
  ["hrana1", { version: 1, encoding: "json" }]
]);
var subprotocolsV3 = /* @__PURE__ */ new Map([
  ["hrana3-protobuf", { version: 3, encoding: "protobuf" }],
  ["hrana3", { version: 3, encoding: "json" }],
  ["hrana2", { version: 2, encoding: "json" }],
  ["hrana1", { version: 1, encoding: "json" }]
]);
var WsClient = class extends Client {
  static {
    __name(this, "WsClient");
  }
  #socket;
  // List of callbacks that we queue until the socket transitions from the CONNECTING to the OPEN state.
  #openCallbacks;
  // Have we already transitioned from CONNECTING to OPEN and fired the callbacks in #openCallbacks?
  #opened;
  // Stores the error that caused us to close the client (and the socket). If we are not closed, this is
  // `undefined`.
  #closed;
  // Have we received a response to our "hello" from the server?
  #recvdHello;
  // Subprotocol negotiated with the server. It is only available after the socket transitions to the OPEN
  // state.
  #subprotocol;
  // Has the `getVersion()` function been called? This is only used to validate that the API is used
  // correctly.
  #getVersionCalled;
  // A map from request id to the responses that we expect to receive from the server.
  #responseMap;
  // An allocator of request ids.
  #requestIdAlloc;
  // An allocator of stream ids.
  /** @private */
  _streamIdAlloc;
  // An allocator of cursor ids.
  /** @private */
  _cursorIdAlloc;
  // An allocator of SQL text ids.
  #sqlIdAlloc;
  /** @private */
  constructor(socket, jwt) {
    super();
    this.#socket = socket;
    this.#openCallbacks = [];
    this.#opened = false;
    this.#closed = void 0;
    this.#recvdHello = false;
    this.#subprotocol = void 0;
    this.#getVersionCalled = false;
    this.#responseMap = /* @__PURE__ */ new Map();
    this.#requestIdAlloc = new IdAlloc();
    this._streamIdAlloc = new IdAlloc();
    this._cursorIdAlloc = new IdAlloc();
    this.#sqlIdAlloc = new IdAlloc();
    this.#socket.binaryType = "arraybuffer";
    this.#socket.addEventListener("open", () => this.#onSocketOpen());
    this.#socket.addEventListener("close", (event) => this.#onSocketClose(event));
    this.#socket.addEventListener("error", (event) => this.#onSocketError(event));
    this.#socket.addEventListener("message", (event) => this.#onSocketMessage(event));
    this.#send({ type: "hello", jwt });
  }
  // Send (or enqueue to send) a message to the server.
  #send(msg) {
    if (this.#closed !== void 0) {
      throw new InternalError("Trying to send a message on a closed client");
    }
    if (this.#opened) {
      this.#sendToSocket(msg);
    } else {
      const openCallback = /* @__PURE__ */ __name(() => this.#sendToSocket(msg), "openCallback");
      const errorCallback = /* @__PURE__ */ __name(() => void 0, "errorCallback");
      this.#openCallbacks.push({ openCallback, errorCallback });
    }
  }
  // The socket transitioned from CONNECTING to OPEN
  #onSocketOpen() {
    const protocol = this.#socket.protocol;
    if (protocol === void 0) {
      this.#setClosed(new ClientError("The `WebSocket.protocol` property is undefined. This most likely means that the WebSocket implementation provided by the environment is broken. If you are using Miniflare 2, please update to Miniflare 3, which fixes this problem."));
      return;
    } else if (protocol === "") {
      this.#subprotocol = { version: 1, encoding: "json" };
    } else {
      this.#subprotocol = subprotocolsV3.get(protocol);
      if (this.#subprotocol === void 0) {
        this.#setClosed(new ProtoError(`Unrecognized WebSocket subprotocol: ${JSON.stringify(protocol)}`));
        return;
      }
    }
    for (const callbacks of this.#openCallbacks) {
      callbacks.openCallback();
    }
    this.#openCallbacks.length = 0;
    this.#opened = true;
  }
  #sendToSocket(msg) {
    const encoding = this.#subprotocol.encoding;
    if (encoding === "json") {
      const jsonMsg = writeJsonObject(msg, ClientMsg);
      this.#socket.send(jsonMsg);
    } else if (encoding === "protobuf") {
      const protobufMsg = writeProtobufMessage(msg, ClientMsg2);
      this.#socket.send(protobufMsg);
    } else {
      throw impossible(encoding, "Impossible encoding");
    }
  }
  /** Get the protocol version negotiated with the server, possibly waiting until the socket is open. */
  getVersion() {
    return new Promise((versionCallback, errorCallback) => {
      this.#getVersionCalled = true;
      if (this.#closed !== void 0) {
        errorCallback(this.#closed);
      } else if (!this.#opened) {
        const openCallback = /* @__PURE__ */ __name(() => versionCallback(this.#subprotocol.version), "openCallback");
        this.#openCallbacks.push({ openCallback, errorCallback });
      } else {
        versionCallback(this.#subprotocol.version);
      }
    });
  }
  // Make sure that the negotiated version is at least `minVersion`.
  /** @private */
  _ensureVersion(minVersion, feature) {
    if (this.#subprotocol === void 0 || !this.#getVersionCalled) {
      throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the version supported by the WebSocket server is not yet known. Use Client.getVersion() to wait until the version is available.`);
    } else if (this.#subprotocol.version < minVersion) {
      throw new ProtocolVersionError(`${feature} is supported on protocol version ${minVersion} and higher, but the WebSocket server only supports version ${this.#subprotocol.version}`);
    }
  }
  // Send a request to the server and invoke a callback when we get the response.
  /** @private */
  _sendRequest(request, callbacks) {
    if (this.#closed !== void 0) {
      callbacks.errorCallback(new ClosedError("Client is closed", this.#closed));
      return;
    }
    const requestId = this.#requestIdAlloc.alloc();
    this.#responseMap.set(requestId, { ...callbacks, type: request.type });
    this.#send({ type: "request", requestId, request });
  }
  // The socket encountered an error.
  #onSocketError(event) {
    const eventMessage = event.message;
    const message = eventMessage ?? "WebSocket was closed due to an error";
    this.#setClosed(new WebSocketError(message));
  }
  // The socket was closed.
  #onSocketClose(event) {
    let message = `WebSocket was closed with code ${event.code}`;
    if (event.reason) {
      message += `: ${event.reason}`;
    }
    this.#setClosed(new WebSocketError(message));
  }
  // Close the client with the given error.
  #setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    for (const callbacks of this.#openCallbacks) {
      callbacks.errorCallback(error);
    }
    this.#openCallbacks.length = 0;
    for (const [requestId, responseState] of this.#responseMap.entries()) {
      responseState.errorCallback(error);
      this.#requestIdAlloc.free(requestId);
    }
    this.#responseMap.clear();
    this.#socket.close();
  }
  // We received a message from the socket.
  #onSocketMessage(event) {
    if (this.#closed !== void 0) {
      return;
    }
    try {
      let msg;
      const encoding = this.#subprotocol.encoding;
      if (encoding === "json") {
        if (typeof event.data !== "string") {
          this.#socket.close(3003, "Only text messages are accepted with JSON encoding");
          this.#setClosed(new ProtoError("Received non-text message from server with JSON encoding"));
          return;
        }
        msg = readJsonObject(JSON.parse(event.data), ServerMsg);
      } else if (encoding === "protobuf") {
        if (!(event.data instanceof ArrayBuffer)) {
          this.#socket.close(3003, "Only binary messages are accepted with Protobuf encoding");
          this.#setClosed(new ProtoError("Received non-binary message from server with Protobuf encoding"));
          return;
        }
        msg = readProtobufMessage(new Uint8Array(event.data), ServerMsg2);
      } else {
        throw impossible(encoding, "Impossible encoding");
      }
      this.#handleMsg(msg);
    } catch (e) {
      this.#socket.close(3007, "Could not handle message");
      this.#setClosed(e);
    }
  }
  // Handle a message from the server.
  #handleMsg(msg) {
    if (msg.type === "none") {
      throw new ProtoError("Received an unrecognized ServerMsg");
    } else if (msg.type === "hello_ok" || msg.type === "hello_error") {
      if (this.#recvdHello) {
        throw new ProtoError("Received a duplicated hello response");
      }
      this.#recvdHello = true;
      if (msg.type === "hello_error") {
        throw errorFromProto(msg.error);
      }
      return;
    } else if (!this.#recvdHello) {
      throw new ProtoError("Received a non-hello message before a hello response");
    }
    if (msg.type === "response_ok") {
      const requestId = msg.requestId;
      const responseState = this.#responseMap.get(requestId);
      this.#responseMap.delete(requestId);
      if (responseState === void 0) {
        throw new ProtoError("Received unexpected OK response");
      }
      this.#requestIdAlloc.free(requestId);
      try {
        if (responseState.type !== msg.response.type) {
          console.dir({ responseState, msg });
          throw new ProtoError("Received unexpected type of response");
        }
        responseState.responseCallback(msg.response);
      } catch (e) {
        responseState.errorCallback(e);
        throw e;
      }
    } else if (msg.type === "response_error") {
      const requestId = msg.requestId;
      const responseState = this.#responseMap.get(requestId);
      this.#responseMap.delete(requestId);
      if (responseState === void 0) {
        throw new ProtoError("Received unexpected error response");
      }
      this.#requestIdAlloc.free(requestId);
      responseState.errorCallback(errorFromProto(msg.error));
    } else {
      throw impossible(msg, "Impossible ServerMsg type");
    }
  }
  /** Open a {@link WsStream}, a stream for executing SQL statements. */
  openStream() {
    return WsStream.open(this);
  }
  /** Cache a SQL text on the server. This requires protocol version 2 or higher. */
  storeSql(sql) {
    this._ensureVersion(2, "storeSql()");
    const sqlId = this.#sqlIdAlloc.alloc();
    const sqlObj = new Sql(this, sqlId);
    const responseCallback = /* @__PURE__ */ __name(() => void 0, "responseCallback");
    const errorCallback = /* @__PURE__ */ __name((e) => sqlObj._setClosed(e), "errorCallback");
    const request = { type: "store_sql", sqlId, sql };
    this._sendRequest(request, { responseCallback, errorCallback });
    return sqlObj;
  }
  /** @private */
  _closeSql(sqlId) {
    if (this.#closed !== void 0) {
      return;
    }
    const responseCallback = /* @__PURE__ */ __name(() => this.#sqlIdAlloc.free(sqlId), "responseCallback");
    const errorCallback = /* @__PURE__ */ __name((e) => this.#setClosed(e), "errorCallback");
    const request = { type: "close_sql", sqlId };
    this._sendRequest(request, { responseCallback, errorCallback });
  }
  /** Close the client and the WebSocket. */
  close() {
    this.#setClosed(new ClientError("Client was manually closed"));
  }
  /** True if the client is closed. */
  get closed() {
    return this.#closed !== void 0;
  }
};

// node_modules/@libsql/isomorphic-fetch/web.js
var _fetch = fetch;
var _Request = Request;
var _Headers = Headers;

// node_modules/@libsql/hrana-client/lib-esm/queue_microtask.js
var _queueMicrotask;
if (typeof queueMicrotask !== "undefined") {
  _queueMicrotask = queueMicrotask;
} else {
  const resolved = Promise.resolve();
  _queueMicrotask = /* @__PURE__ */ __name((callback) => {
    resolved.then(callback);
  }, "_queueMicrotask");
}

// node_modules/@libsql/hrana-client/lib-esm/byte_queue.js
var ByteQueue = class {
  static {
    __name(this, "ByteQueue");
  }
  #array;
  #shiftPos;
  #pushPos;
  constructor(initialCap) {
    this.#array = new Uint8Array(new ArrayBuffer(initialCap));
    this.#shiftPos = 0;
    this.#pushPos = 0;
  }
  get length() {
    return this.#pushPos - this.#shiftPos;
  }
  data() {
    return this.#array.slice(this.#shiftPos, this.#pushPos);
  }
  push(chunk) {
    this.#ensurePush(chunk.byteLength);
    this.#array.set(chunk, this.#pushPos);
    this.#pushPos += chunk.byteLength;
  }
  #ensurePush(pushLength) {
    if (this.#pushPos + pushLength <= this.#array.byteLength) {
      return;
    }
    const filledLength = this.#pushPos - this.#shiftPos;
    if (filledLength + pushLength <= this.#array.byteLength && 2 * this.#pushPos >= this.#array.byteLength) {
      this.#array.copyWithin(0, this.#shiftPos, this.#pushPos);
    } else {
      let newCap = this.#array.byteLength;
      do {
        newCap *= 2;
      } while (filledLength + pushLength > newCap);
      const newArray = new Uint8Array(new ArrayBuffer(newCap));
      newArray.set(this.#array.slice(this.#shiftPos, this.#pushPos), 0);
      this.#array = newArray;
    }
    this.#pushPos = filledLength;
    this.#shiftPos = 0;
  }
  shift(length) {
    this.#shiftPos += length;
  }
};

// node_modules/@libsql/hrana-client/lib-esm/http/json_decode.js
function PipelineRespBody(obj) {
  const baton = stringOpt(obj["baton"]);
  const baseUrl = stringOpt(obj["base_url"]);
  const results = arrayObjectsMap(obj["results"], StreamResult);
  return { baton, baseUrl, results };
}
__name(PipelineRespBody, "PipelineRespBody");
function StreamResult(obj) {
  const type = string(obj["type"]);
  if (type === "ok") {
    const response = StreamResponse(object(obj["response"]));
    return { type: "ok", response };
  } else if (type === "error") {
    const error = Error2(object(obj["error"]));
    return { type: "error", error };
  } else {
    throw new ProtoError("Unexpected type of StreamResult");
  }
}
__name(StreamResult, "StreamResult");
function StreamResponse(obj) {
  const type = string(obj["type"]);
  if (type === "close") {
    return { type: "close" };
  } else if (type === "execute") {
    const result = StmtResult(object(obj["result"]));
    return { type: "execute", result };
  } else if (type === "batch") {
    const result = BatchResult(object(obj["result"]));
    return { type: "batch", result };
  } else if (type === "sequence") {
    return { type: "sequence" };
  } else if (type === "describe") {
    const result = DescribeResult(object(obj["result"]));
    return { type: "describe", result };
  } else if (type === "store_sql") {
    return { type: "store_sql" };
  } else if (type === "close_sql") {
    return { type: "close_sql" };
  } else if (type === "get_autocommit") {
    const isAutocommit = boolean(obj["is_autocommit"]);
    return { type: "get_autocommit", isAutocommit };
  } else {
    throw new ProtoError("Unexpected type of StreamResponse");
  }
}
__name(StreamResponse, "StreamResponse");
function CursorRespBody(obj) {
  const baton = stringOpt(obj["baton"]);
  const baseUrl = stringOpt(obj["base_url"]);
  return { baton, baseUrl };
}
__name(CursorRespBody, "CursorRespBody");

// node_modules/@libsql/hrana-client/lib-esm/http/protobuf_decode.js
var PipelineRespBody2 = {
  default() {
    return { baton: void 0, baseUrl: void 0, results: [] };
  },
  1(r, msg) {
    msg.baton = r.string();
  },
  2(r, msg) {
    msg.baseUrl = r.string();
  },
  3(r, msg) {
    msg.results.push(r.message(StreamResult2));
  }
};
var StreamResult2 = {
  default() {
    return { type: "none" };
  },
  1(r) {
    return { type: "ok", response: r.message(StreamResponse2) };
  },
  2(r) {
    return { type: "error", error: r.message(Error3) };
  }
};
var StreamResponse2 = {
  default() {
    return { type: "none" };
  },
  1(r) {
    return { type: "close" };
  },
  2(r) {
    return r.message(ExecuteStreamResp);
  },
  3(r) {
    return r.message(BatchStreamResp);
  },
  4(r) {
    return { type: "sequence" };
  },
  5(r) {
    return r.message(DescribeStreamResp);
  },
  6(r) {
    return { type: "store_sql" };
  },
  7(r) {
    return { type: "close_sql" };
  },
  8(r) {
    return r.message(GetAutocommitStreamResp);
  }
};
var ExecuteStreamResp = {
  default() {
    return { type: "execute", result: StmtResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(StmtResult2);
  }
};
var BatchStreamResp = {
  default() {
    return { type: "batch", result: BatchResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(BatchResult2);
  }
};
var DescribeStreamResp = {
  default() {
    return { type: "describe", result: DescribeResult2.default() };
  },
  1(r, msg) {
    msg.result = r.message(DescribeResult2);
  }
};
var GetAutocommitStreamResp = {
  default() {
    return { type: "get_autocommit", isAutocommit: false };
  },
  1(r, msg) {
    msg.isAutocommit = r.bool();
  }
};
var CursorRespBody2 = {
  default() {
    return { baton: void 0, baseUrl: void 0 };
  },
  1(r, msg) {
    msg.baton = r.string();
  },
  2(r, msg) {
    msg.baseUrl = r.string();
  }
};

// node_modules/@libsql/hrana-client/lib-esm/http/cursor.js
var HttpCursor = class extends Cursor {
  static {
    __name(this, "HttpCursor");
  }
  #stream;
  #encoding;
  #reader;
  #queue;
  #closed;
  #done;
  /** @private */
  constructor(stream, encoding) {
    super();
    this.#stream = stream;
    this.#encoding = encoding;
    this.#reader = void 0;
    this.#queue = new ByteQueue(16 * 1024);
    this.#closed = void 0;
    this.#done = false;
  }
  async open(response) {
    if (response.body === null) {
      throw new ProtoError("No response body for cursor request");
    }
    this.#reader = response.body.getReader();
    const respBody = await this.#nextItem(CursorRespBody, CursorRespBody2);
    if (respBody === void 0) {
      throw new ProtoError("Empty response to cursor request");
    }
    return respBody;
  }
  /** Fetch the next entry from the cursor. */
  next() {
    return this.#nextItem(CursorEntry, CursorEntry2);
  }
  /** Close the cursor. */
  close() {
    this._setClosed(new ClientError("Cursor was manually closed"));
  }
  /** @private */
  _setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    this.#stream._cursorClosed(this);
    if (this.#reader !== void 0) {
      this.#reader.cancel();
    }
  }
  /** True if the cursor is closed. */
  get closed() {
    return this.#closed !== void 0;
  }
  async #nextItem(jsonFun, protobufDef) {
    for (; ; ) {
      if (this.#done) {
        return void 0;
      } else if (this.#closed !== void 0) {
        throw new ClosedError("Cursor is closed", this.#closed);
      }
      if (this.#encoding === "json") {
        const jsonData = this.#parseItemJson();
        if (jsonData !== void 0) {
          const jsonText = new TextDecoder().decode(jsonData);
          const jsonValue = JSON.parse(jsonText);
          return readJsonObject(jsonValue, jsonFun);
        }
      } else if (this.#encoding === "protobuf") {
        const protobufData = this.#parseItemProtobuf();
        if (protobufData !== void 0) {
          return readProtobufMessage(protobufData, protobufDef);
        }
      } else {
        throw impossible(this.#encoding, "Impossible encoding");
      }
      if (this.#reader === void 0) {
        throw new InternalError("Attempted to read from HTTP cursor before it was opened");
      }
      const { value, done } = await this.#reader.read();
      if (done && this.#queue.length === 0) {
        this.#done = true;
      } else if (done) {
        throw new ProtoError("Unexpected end of cursor stream");
      } else {
        this.#queue.push(value);
      }
    }
  }
  #parseItemJson() {
    const data = this.#queue.data();
    const newlineByte = 10;
    const newlinePos = data.indexOf(newlineByte);
    if (newlinePos < 0) {
      return void 0;
    }
    const jsonData = data.slice(0, newlinePos);
    this.#queue.shift(newlinePos + 1);
    return jsonData;
  }
  #parseItemProtobuf() {
    const data = this.#queue.data();
    let varintValue = 0;
    let varintLength = 0;
    for (; ; ) {
      if (varintLength >= data.byteLength) {
        return void 0;
      }
      const byte = data[varintLength];
      varintValue |= (byte & 127) << 7 * varintLength;
      varintLength += 1;
      if (!(byte & 128)) {
        break;
      }
    }
    if (data.byteLength < varintLength + varintValue) {
      return void 0;
    }
    const protobufData = data.slice(varintLength, varintLength + varintValue);
    this.#queue.shift(varintLength + varintValue);
    return protobufData;
  }
};

// node_modules/@libsql/hrana-client/lib-esm/http/json_encode.js
function PipelineReqBody(w, msg) {
  if (msg.baton !== void 0) {
    w.string("baton", msg.baton);
  }
  w.arrayObjects("requests", msg.requests, StreamRequest);
}
__name(PipelineReqBody, "PipelineReqBody");
function StreamRequest(w, msg) {
  w.stringRaw("type", msg.type);
  if (msg.type === "close") {
  } else if (msg.type === "execute") {
    w.object("stmt", msg.stmt, Stmt2);
  } else if (msg.type === "batch") {
    w.object("batch", msg.batch, Batch2);
  } else if (msg.type === "sequence") {
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "describe") {
    if (msg.sql !== void 0) {
      w.string("sql", msg.sql);
    }
    if (msg.sqlId !== void 0) {
      w.number("sql_id", msg.sqlId);
    }
  } else if (msg.type === "store_sql") {
    w.number("sql_id", msg.sqlId);
    w.string("sql", msg.sql);
  } else if (msg.type === "close_sql") {
    w.number("sql_id", msg.sqlId);
  } else if (msg.type === "get_autocommit") {
  } else {
    throw impossible(msg, "Impossible type of StreamRequest");
  }
}
__name(StreamRequest, "StreamRequest");
function CursorReqBody(w, msg) {
  if (msg.baton !== void 0) {
    w.string("baton", msg.baton);
  }
  w.object("batch", msg.batch, Batch2);
}
__name(CursorReqBody, "CursorReqBody");

// node_modules/@libsql/hrana-client/lib-esm/http/protobuf_encode.js
function PipelineReqBody2(w, msg) {
  if (msg.baton !== void 0) {
    w.string(1, msg.baton);
  }
  for (const req of msg.requests) {
    w.message(2, req, StreamRequest2);
  }
}
__name(PipelineReqBody2, "PipelineReqBody");
function StreamRequest2(w, msg) {
  if (msg.type === "close") {
    w.message(1, msg, CloseStreamReq2);
  } else if (msg.type === "execute") {
    w.message(2, msg, ExecuteStreamReq);
  } else if (msg.type === "batch") {
    w.message(3, msg, BatchStreamReq);
  } else if (msg.type === "sequence") {
    w.message(4, msg, SequenceStreamReq);
  } else if (msg.type === "describe") {
    w.message(5, msg, DescribeStreamReq);
  } else if (msg.type === "store_sql") {
    w.message(6, msg, StoreSqlStreamReq);
  } else if (msg.type === "close_sql") {
    w.message(7, msg, CloseSqlStreamReq);
  } else if (msg.type === "get_autocommit") {
    w.message(8, msg, GetAutocommitStreamReq);
  } else {
    throw impossible(msg, "Impossible type of StreamRequest");
  }
}
__name(StreamRequest2, "StreamRequest");
function CloseStreamReq2(_w, _msg) {
}
__name(CloseStreamReq2, "CloseStreamReq");
function ExecuteStreamReq(w, msg) {
  w.message(1, msg.stmt, Stmt3);
}
__name(ExecuteStreamReq, "ExecuteStreamReq");
function BatchStreamReq(w, msg) {
  w.message(1, msg.batch, Batch3);
}
__name(BatchStreamReq, "BatchStreamReq");
function SequenceStreamReq(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
}
__name(SequenceStreamReq, "SequenceStreamReq");
function DescribeStreamReq(w, msg) {
  if (msg.sql !== void 0) {
    w.string(1, msg.sql);
  }
  if (msg.sqlId !== void 0) {
    w.int32(2, msg.sqlId);
  }
}
__name(DescribeStreamReq, "DescribeStreamReq");
function StoreSqlStreamReq(w, msg) {
  w.int32(1, msg.sqlId);
  w.string(2, msg.sql);
}
__name(StoreSqlStreamReq, "StoreSqlStreamReq");
function CloseSqlStreamReq(w, msg) {
  w.int32(1, msg.sqlId);
}
__name(CloseSqlStreamReq, "CloseSqlStreamReq");
function GetAutocommitStreamReq(_w, _msg) {
}
__name(GetAutocommitStreamReq, "GetAutocommitStreamReq");
function CursorReqBody2(w, msg) {
  if (msg.baton !== void 0) {
    w.string(1, msg.baton);
  }
  w.message(2, msg.batch, Batch3);
}
__name(CursorReqBody2, "CursorReqBody");

// node_modules/@libsql/hrana-client/lib-esm/http/stream.js
var HttpStream = class extends Stream {
  static {
    __name(this, "HttpStream");
  }
  #client;
  #baseUrl;
  #jwt;
  #fetch;
  #baton;
  #queue;
  #flushing;
  #cursor;
  #closing;
  #closeQueued;
  #closed;
  #sqlIdAlloc;
  /** @private */
  constructor(client, baseUrl, jwt, customFetch) {
    super(client.intMode);
    this.#client = client;
    this.#baseUrl = baseUrl.toString();
    this.#jwt = jwt;
    this.#fetch = customFetch;
    this.#baton = void 0;
    this.#queue = new Queue();
    this.#flushing = false;
    this.#closing = false;
    this.#closeQueued = false;
    this.#closed = void 0;
    this.#sqlIdAlloc = new IdAlloc();
  }
  /** Get the {@link HttpClient} object that this stream belongs to. */
  client() {
    return this.#client;
  }
  /** @private */
  _sqlOwner() {
    return this;
  }
  /** Cache a SQL text on the server. */
  storeSql(sql) {
    const sqlId = this.#sqlIdAlloc.alloc();
    this.#sendStreamRequest({ type: "store_sql", sqlId, sql }).then(() => void 0, (error) => this._setClosed(error));
    return new Sql(this, sqlId);
  }
  /** @private */
  _closeSql(sqlId) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#sendStreamRequest({ type: "close_sql", sqlId }).then(() => this.#sqlIdAlloc.free(sqlId), (error) => this._setClosed(error));
  }
  /** @private */
  _execute(stmt) {
    return this.#sendStreamRequest({ type: "execute", stmt }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _batch(batch) {
    return this.#sendStreamRequest({ type: "batch", batch }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _describe(protoSql) {
    return this.#sendStreamRequest({
      type: "describe",
      sql: protoSql.sql,
      sqlId: protoSql.sqlId
    }).then((response) => {
      return response.result;
    });
  }
  /** @private */
  _sequence(protoSql) {
    return this.#sendStreamRequest({
      type: "sequence",
      sql: protoSql.sql,
      sqlId: protoSql.sqlId
    }).then((_response) => {
      return void 0;
    });
  }
  /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
   * explicit transaction). This requires protocol version 3 or higher.
   */
  getAutocommit() {
    this.#client._ensureVersion(3, "getAutocommit()");
    return this.#sendStreamRequest({
      type: "get_autocommit"
    }).then((response) => {
      return response.isAutocommit;
    });
  }
  #sendStreamRequest(request) {
    return new Promise((responseCallback, errorCallback) => {
      this.#pushToQueue({ type: "pipeline", request, responseCallback, errorCallback });
    });
  }
  /** @private */
  _openCursor(batch) {
    return new Promise((cursorCallback, errorCallback) => {
      this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
    });
  }
  /** @private */
  _cursorClosed(cursor) {
    if (cursor !== this.#cursor) {
      throw new InternalError("Cursor was closed, but it was not associated with the stream");
    }
    this.#cursor = void 0;
    _queueMicrotask(() => this.#flushQueue());
  }
  /** Immediately close the stream. */
  close() {
    this._setClosed(new ClientError("Stream was manually closed"));
  }
  /** Gracefully close the stream. */
  closeGracefully() {
    this.#closing = true;
    _queueMicrotask(() => this.#flushQueue());
  }
  /** True if the stream is closed. */
  get closed() {
    return this.#closed !== void 0 || this.#closing;
  }
  /** @private */
  _setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    if (this.#cursor !== void 0) {
      this.#cursor._setClosed(error);
    }
    this.#client._streamClosed(this);
    for (; ; ) {
      const entry = this.#queue.shift();
      if (entry !== void 0) {
        entry.errorCallback(error);
      } else {
        break;
      }
    }
    if ((this.#baton !== void 0 || this.#flushing) && !this.#closeQueued) {
      this.#queue.push({
        type: "pipeline",
        request: { type: "close" },
        responseCallback: /* @__PURE__ */ __name(() => void 0, "responseCallback"),
        errorCallback: /* @__PURE__ */ __name(() => void 0, "errorCallback")
      });
      this.#closeQueued = true;
      _queueMicrotask(() => this.#flushQueue());
    }
  }
  #pushToQueue(entry) {
    if (this.#closed !== void 0) {
      throw new ClosedError("Stream is closed", this.#closed);
    } else if (this.#closing) {
      throw new ClosedError("Stream is closing", void 0);
    } else {
      this.#queue.push(entry);
      _queueMicrotask(() => this.#flushQueue());
    }
  }
  #flushQueue() {
    if (this.#flushing || this.#cursor !== void 0) {
      return;
    }
    if (this.#closing && this.#queue.length === 0) {
      this._setClosed(new ClientError("Stream was gracefully closed"));
      return;
    }
    const endpoint = this.#client._endpoint;
    if (endpoint === void 0) {
      this.#client._endpointPromise.then(() => this.#flushQueue(), (error) => this._setClosed(error));
      return;
    }
    const firstEntry = this.#queue.shift();
    if (firstEntry === void 0) {
      return;
    } else if (firstEntry.type === "pipeline") {
      const pipeline = [firstEntry];
      for (; ; ) {
        const entry = this.#queue.first();
        if (entry !== void 0 && entry.type === "pipeline") {
          pipeline.push(entry);
          this.#queue.shift();
        } else if (entry === void 0 && this.#closing && !this.#closeQueued) {
          pipeline.push({
            type: "pipeline",
            request: { type: "close" },
            responseCallback: /* @__PURE__ */ __name(() => void 0, "responseCallback"),
            errorCallback: /* @__PURE__ */ __name(() => void 0, "errorCallback")
          });
          this.#closeQueued = true;
          break;
        } else {
          break;
        }
      }
      this.#flushPipeline(endpoint, pipeline);
    } else if (firstEntry.type === "cursor") {
      this.#flushCursor(endpoint, firstEntry);
    } else {
      throw impossible(firstEntry, "Impossible type of QueueEntry");
    }
  }
  #flushPipeline(endpoint, pipeline) {
    this.#flush(() => this.#createPipelineRequest(pipeline, endpoint), (resp) => decodePipelineResponse(resp, endpoint.encoding), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (respBody) => handlePipelineResponse(pipeline, respBody), (error) => pipeline.forEach((entry) => entry.errorCallback(error)));
  }
  #flushCursor(endpoint, entry) {
    const cursor = new HttpCursor(this, endpoint.encoding);
    this.#cursor = cursor;
    this.#flush(() => this.#createCursorRequest(entry, endpoint), (resp) => cursor.open(resp), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (_respBody) => entry.cursorCallback(cursor), (error) => entry.errorCallback(error));
  }
  #flush(createRequest, decodeResponse, getBaton, getBaseUrl, handleResponse, handleError) {
    let promise;
    try {
      const request = createRequest();
      const fetch2 = this.#fetch;
      promise = fetch2(request);
    } catch (error) {
      promise = Promise.reject(error);
    }
    this.#flushing = true;
    promise.then((resp) => {
      if (!resp.ok) {
        return errorFromResponse(resp).then((error) => {
          throw error;
        });
      }
      return decodeResponse(resp);
    }).then((r) => {
      this.#baton = getBaton(r);
      this.#baseUrl = getBaseUrl(r) ?? this.#baseUrl;
      handleResponse(r);
    }).catch((error) => {
      this._setClosed(error);
      handleError(error);
    }).finally(() => {
      this.#flushing = false;
      this.#flushQueue();
    });
  }
  #createPipelineRequest(pipeline, endpoint) {
    return this.#createRequest(new URL(endpoint.pipelinePath, this.#baseUrl), {
      baton: this.#baton,
      requests: pipeline.map((entry) => entry.request)
    }, endpoint.encoding, PipelineReqBody, PipelineReqBody2);
  }
  #createCursorRequest(entry, endpoint) {
    if (endpoint.cursorPath === void 0) {
      throw new ProtocolVersionError(`Cursors are supported only on protocol version 3 and higher, but the HTTP server only supports version ${endpoint.version}.`);
    }
    return this.#createRequest(new URL(endpoint.cursorPath, this.#baseUrl), {
      baton: this.#baton,
      batch: entry.batch
    }, endpoint.encoding, CursorReqBody, CursorReqBody2);
  }
  #createRequest(url, reqBody, encoding, jsonFun, protobufFun) {
    let bodyData;
    let contentType;
    if (encoding === "json") {
      bodyData = writeJsonObject(reqBody, jsonFun);
      contentType = "application/json";
    } else if (encoding === "protobuf") {
      bodyData = writeProtobufMessage(reqBody, protobufFun);
      contentType = "application/x-protobuf";
    } else {
      throw impossible(encoding, "Impossible encoding");
    }
    const headers = new _Headers();
    headers.set("content-type", contentType);
    if (this.#jwt !== void 0) {
      headers.set("authorization", `Bearer ${this.#jwt}`);
    }
    return new _Request(url.toString(), { method: "POST", headers, body: bodyData });
  }
};
function handlePipelineResponse(pipeline, respBody) {
  if (respBody.results.length !== pipeline.length) {
    throw new ProtoError("Server returned unexpected number of pipeline results");
  }
  for (let i = 0; i < pipeline.length; ++i) {
    const result = respBody.results[i];
    const entry = pipeline[i];
    if (result.type === "ok") {
      if (result.response.type !== entry.request.type) {
        throw new ProtoError("Received unexpected type of response");
      }
      entry.responseCallback(result.response);
    } else if (result.type === "error") {
      entry.errorCallback(errorFromProto(result.error));
    } else if (result.type === "none") {
      throw new ProtoError("Received unrecognized type of StreamResult");
    } else {
      throw impossible(result, "Received impossible type of StreamResult");
    }
  }
}
__name(handlePipelineResponse, "handlePipelineResponse");
async function decodePipelineResponse(resp, encoding) {
  if (encoding === "json") {
    const respJson = await resp.json();
    return readJsonObject(respJson, PipelineRespBody);
  }
  if (encoding === "protobuf") {
    const respData = await resp.arrayBuffer();
    return readProtobufMessage(new Uint8Array(respData), PipelineRespBody2);
  }
  await resp.body?.cancel();
  throw impossible(encoding, "Impossible encoding");
}
__name(decodePipelineResponse, "decodePipelineResponse");
async function errorFromResponse(resp) {
  const respType = resp.headers.get("content-type") ?? "text/plain";
  let message = `Server returned HTTP status ${resp.status}`;
  if (respType === "application/json") {
    const respBody = await resp.json();
    if ("message" in respBody) {
      return errorFromProto(respBody);
    }
    return new HttpServerError(message, resp.status);
  }
  if (respType === "text/plain") {
    const respBody = (await resp.text()).trim();
    if (respBody !== "") {
      message += `: ${respBody}`;
    }
    return new HttpServerError(message, resp.status);
  }
  await resp.body?.cancel();
  return new HttpServerError(message, resp.status);
}
__name(errorFromResponse, "errorFromResponse");

// node_modules/@libsql/hrana-client/lib-esm/http/client.js
var checkEndpoints = [
  {
    versionPath: "v3-protobuf",
    pipelinePath: "v3-protobuf/pipeline",
    cursorPath: "v3-protobuf/cursor",
    version: 3,
    encoding: "protobuf"
  }
  /*
  {
      versionPath: "v3",
      pipelinePath: "v3/pipeline",
      cursorPath: "v3/cursor",
      version: 3,
      encoding: "json",
  },
  */
];
var fallbackEndpoint = {
  versionPath: "v2",
  pipelinePath: "v2/pipeline",
  cursorPath: void 0,
  version: 2,
  encoding: "json"
};
var HttpClient = class extends Client {
  static {
    __name(this, "HttpClient");
  }
  #url;
  #jwt;
  #fetch;
  #closed;
  #streams;
  /** @private */
  _endpointPromise;
  /** @private */
  _endpoint;
  /** @private */
  constructor(url, jwt, customFetch, protocolVersion = 2) {
    super();
    this.#url = url;
    this.#jwt = jwt;
    this.#fetch = customFetch ?? _fetch;
    this.#closed = void 0;
    this.#streams = /* @__PURE__ */ new Set();
    if (protocolVersion == 3) {
      this._endpointPromise = findEndpoint(this.#fetch, this.#url);
      this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error) => this.#setClosed(error));
    } else {
      this._endpointPromise = Promise.resolve(fallbackEndpoint);
      this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error) => this.#setClosed(error));
    }
  }
  /** Get the protocol version supported by the server. */
  async getVersion() {
    if (this._endpoint !== void 0) {
      return this._endpoint.version;
    }
    return (await this._endpointPromise).version;
  }
  // Make sure that the negotiated version is at least `minVersion`.
  /** @private */
  _ensureVersion(minVersion, feature) {
    if (minVersion <= fallbackEndpoint.version) {
      return;
    } else if (this._endpoint === void 0) {
      throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the version supported by the HTTP server is not yet known. Use Client.getVersion() to wait until the version is available.`);
    } else if (this._endpoint.version < minVersion) {
      throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, but the HTTP server only supports version ${this._endpoint.version}.`);
    }
  }
  /** Open a {@link HttpStream}, a stream for executing SQL statements. */
  openStream() {
    if (this.#closed !== void 0) {
      throw new ClosedError("Client is closed", this.#closed);
    }
    const stream = new HttpStream(this, this.#url, this.#jwt, this.#fetch);
    this.#streams.add(stream);
    return stream;
  }
  /** @private */
  _streamClosed(stream) {
    this.#streams.delete(stream);
  }
  /** Close the client and all its streams. */
  close() {
    this.#setClosed(new ClientError("Client was manually closed"));
  }
  /** True if the client is closed. */
  get closed() {
    return this.#closed !== void 0;
  }
  #setClosed(error) {
    if (this.#closed !== void 0) {
      return;
    }
    this.#closed = error;
    for (const stream of Array.from(this.#streams)) {
      stream._setClosed(new ClosedError("Client was closed", error));
    }
  }
};
async function findEndpoint(customFetch, clientUrl) {
  const fetch2 = customFetch;
  for (const endpoint of checkEndpoints) {
    const url = new URL(endpoint.versionPath, clientUrl);
    const request = new _Request(url.toString(), { method: "GET" });
    const response = await fetch2(request);
    await response.arrayBuffer();
    if (response.ok) {
      return endpoint;
    }
  }
  return fallbackEndpoint;
}
__name(findEndpoint, "findEndpoint");

// node_modules/@libsql/hrana-client/lib-esm/index.js
function openWs(url, jwt, protocolVersion = 2) {
  if (typeof _WebSocket === "undefined") {
    throw new WebSocketUnsupportedError("WebSockets are not supported in this environment");
  }
  var subprotocols = void 0;
  if (protocolVersion == 3) {
    subprotocols = Array.from(subprotocolsV3.keys());
  } else {
    subprotocols = Array.from(subprotocolsV2.keys());
  }
  const socket = new _WebSocket(url, subprotocols);
  return new WsClient(socket, jwt);
}
__name(openWs, "openWs");
function openHttp(url, jwt, customFetch, protocolVersion = 2) {
  return new HttpClient(url instanceof URL ? url : new URL(url), jwt, customFetch, protocolVersion);
}
__name(openHttp, "openHttp");

// node_modules/@libsql/client/lib-esm/hrana.js
var HranaTransaction = class {
  static {
    __name(this, "HranaTransaction");
  }
  #mode;
  #version;
  // Promise that is resolved when the BEGIN statement completes, or `undefined` if we haven't executed the
  // BEGIN statement yet.
  #started;
  /** @private */
  constructor(mode, version2) {
    this.#mode = mode;
    this.#version = version2;
    this.#started = void 0;
  }
  execute(stmt) {
    return this.batch([stmt]).then((results) => results[0]);
  }
  async batch(stmts) {
    const stream = this._getStream();
    if (stream.closed) {
      throw new LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
    }
    try {
      const hranaStmts = stmts.map(stmtToHrana);
      let rowsPromises;
      if (this.#started === void 0) {
        this._getSqlCache().apply(hranaStmts);
        const batch = stream.batch(this.#version >= 3);
        const beginStep = batch.step();
        const beginPromise = beginStep.run(transactionModeToBegin(this.#mode));
        let lastStep = beginStep;
        rowsPromises = hranaStmts.map((hranaStmt) => {
          const stmtStep = batch.step().condition(BatchCond.ok(lastStep));
          if (this.#version >= 3) {
            stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
          }
          const rowsPromise = stmtStep.query(hranaStmt);
          rowsPromise.catch(() => void 0);
          lastStep = stmtStep;
          return rowsPromise;
        });
        this.#started = batch.execute().then(() => beginPromise).then(() => void 0);
        try {
          await this.#started;
        } catch (e) {
          this.close();
          throw e;
        }
      } else {
        if (this.#version < 3) {
          await this.#started;
        } else {
        }
        this._getSqlCache().apply(hranaStmts);
        const batch = stream.batch(this.#version >= 3);
        let lastStep = void 0;
        rowsPromises = hranaStmts.map((hranaStmt) => {
          const stmtStep = batch.step();
          if (lastStep !== void 0) {
            stmtStep.condition(BatchCond.ok(lastStep));
          }
          if (this.#version >= 3) {
            stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
          }
          const rowsPromise = stmtStep.query(hranaStmt);
          rowsPromise.catch(() => void 0);
          lastStep = stmtStep;
          return rowsPromise;
        });
        await batch.execute();
      }
      const resultSets = [];
      for (const rowsPromise of rowsPromises) {
        const rows = await rowsPromise;
        if (rows === void 0) {
          throw new LibsqlError("Statement in a transaction was not executed, probably because the transaction has been rolled back", "TRANSACTION_CLOSED");
        }
        resultSets.push(resultSetFromHrana(rows));
      }
      return resultSets;
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async executeMultiple(sql) {
    const stream = this._getStream();
    if (stream.closed) {
      throw new LibsqlError("Cannot execute statements because the transaction is closed", "TRANSACTION_CLOSED");
    }
    try {
      if (this.#started === void 0) {
        this.#started = stream.run(transactionModeToBegin(this.#mode)).then(() => void 0);
        try {
          await this.#started;
        } catch (e) {
          this.close();
          throw e;
        }
      } else {
        await this.#started;
      }
      await stream.sequence(sql);
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async rollback() {
    try {
      const stream = this._getStream();
      if (stream.closed) {
        return;
      }
      if (this.#started !== void 0) {
      } else {
        return;
      }
      const promise = stream.run("ROLLBACK").catch((e) => {
        throw mapHranaError(e);
      });
      stream.closeGracefully();
      await promise;
    } catch (e) {
      throw mapHranaError(e);
    } finally {
      this.close();
    }
  }
  async commit() {
    try {
      const stream = this._getStream();
      if (stream.closed) {
        throw new LibsqlError("Cannot commit the transaction because it is already closed", "TRANSACTION_CLOSED");
      }
      if (this.#started !== void 0) {
        await this.#started;
      } else {
        return;
      }
      const promise = stream.run("COMMIT").catch((e) => {
        throw mapHranaError(e);
      });
      stream.closeGracefully();
      await promise;
    } catch (e) {
      throw mapHranaError(e);
    } finally {
      this.close();
    }
  }
};
async function executeHranaBatch(mode, version2, batch, hranaStmts, disableForeignKeys = false) {
  if (disableForeignKeys) {
    batch.step().run("PRAGMA foreign_keys=off");
  }
  const beginStep = batch.step();
  const beginPromise = beginStep.run(transactionModeToBegin(mode));
  let lastStep = beginStep;
  const stmtPromises = hranaStmts.map((hranaStmt) => {
    const stmtStep = batch.step().condition(BatchCond.ok(lastStep));
    if (version2 >= 3) {
      stmtStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
    }
    const stmtPromise = stmtStep.query(hranaStmt);
    lastStep = stmtStep;
    return stmtPromise;
  });
  const commitStep = batch.step().condition(BatchCond.ok(lastStep));
  if (version2 >= 3) {
    commitStep.condition(BatchCond.not(BatchCond.isAutocommit(batch)));
  }
  const commitPromise = commitStep.run("COMMIT");
  const rollbackStep = batch.step().condition(BatchCond.not(BatchCond.ok(commitStep)));
  rollbackStep.run("ROLLBACK").catch((_) => void 0);
  if (disableForeignKeys) {
    batch.step().run("PRAGMA foreign_keys=on");
  }
  await batch.execute();
  const resultSets = [];
  await beginPromise;
  for (const stmtPromise of stmtPromises) {
    const hranaRows = await stmtPromise;
    if (hranaRows === void 0) {
      throw new LibsqlError("Statement in a batch was not executed, probably because the transaction has been rolled back", "TRANSACTION_CLOSED");
    }
    resultSets.push(resultSetFromHrana(hranaRows));
  }
  await commitPromise;
  return resultSets;
}
__name(executeHranaBatch, "executeHranaBatch");
function stmtToHrana(stmt) {
  let sql;
  let args;
  if (Array.isArray(stmt)) {
    [sql, args] = stmt;
  } else if (typeof stmt === "string") {
    sql = stmt;
  } else {
    sql = stmt.sql;
    args = stmt.args;
  }
  const hranaStmt = new Stmt(sql);
  if (args) {
    if (Array.isArray(args)) {
      hranaStmt.bindIndexes(args);
    } else {
      for (const [key, value] of Object.entries(args)) {
        hranaStmt.bindName(key, value);
      }
    }
  }
  return hranaStmt;
}
__name(stmtToHrana, "stmtToHrana");
function resultSetFromHrana(hranaRows) {
  const columns = hranaRows.columnNames.map((c) => c ?? "");
  const columnTypes = hranaRows.columnDecltypes.map((c) => c ?? "");
  const rows = hranaRows.rows;
  const rowsAffected = hranaRows.affectedRowCount;
  const lastInsertRowid = hranaRows.lastInsertRowid !== void 0 ? hranaRows.lastInsertRowid : void 0;
  return new ResultSetImpl(columns, columnTypes, rows, rowsAffected, lastInsertRowid);
}
__name(resultSetFromHrana, "resultSetFromHrana");
function mapHranaError(e) {
  if (e instanceof ClientError) {
    const code = mapHranaErrorCode(e);
    return new LibsqlError(e.message, code, void 0, e);
  }
  return e;
}
__name(mapHranaError, "mapHranaError");
function mapHranaErrorCode(e) {
  if (e instanceof ResponseError && e.code !== void 0) {
    return e.code;
  } else if (e instanceof ProtoError) {
    return "HRANA_PROTO_ERROR";
  } else if (e instanceof ClosedError) {
    return e.cause instanceof ClientError ? mapHranaErrorCode(e.cause) : "HRANA_CLOSED_ERROR";
  } else if (e instanceof WebSocketError) {
    return "HRANA_WEBSOCKET_ERROR";
  } else if (e instanceof HttpServerError) {
    return "SERVER_ERROR";
  } else if (e instanceof ProtocolVersionError) {
    return "PROTOCOL_VERSION_ERROR";
  } else if (e instanceof InternalError) {
    return "INTERNAL_ERROR";
  } else {
    return "UNKNOWN";
  }
}
__name(mapHranaErrorCode, "mapHranaErrorCode");

// node_modules/@libsql/client/lib-esm/sql_cache.js
var SqlCache = class {
  static {
    __name(this, "SqlCache");
  }
  #owner;
  #sqls;
  capacity;
  constructor(owner, capacity) {
    this.#owner = owner;
    this.#sqls = new Lru();
    this.capacity = capacity;
  }
  // Replaces SQL strings with cached `hrana.Sql` objects in the statements in `hranaStmts`. After this
  // function returns, we guarantee that all `hranaStmts` refer to valid (not closed) `hrana.Sql` objects,
  // but _we may invalidate any other `hrana.Sql` objects_ (by closing them, thus removing them from the
  // server).
  //
  // In practice, this means that after calling this function, you can use the statements only up to the
  // first `await`, because concurrent code may also use the cache and invalidate those statements.
  apply(hranaStmts) {
    if (this.capacity <= 0) {
      return;
    }
    const usedSqlObjs = /* @__PURE__ */ new Set();
    for (const hranaStmt of hranaStmts) {
      if (typeof hranaStmt.sql !== "string") {
        continue;
      }
      const sqlText = hranaStmt.sql;
      if (sqlText.length >= 5e3) {
        continue;
      }
      let sqlObj = this.#sqls.get(sqlText);
      if (sqlObj === void 0) {
        while (this.#sqls.size + 1 > this.capacity) {
          const [evictSqlText, evictSqlObj] = this.#sqls.peekLru();
          if (usedSqlObjs.has(evictSqlObj)) {
            break;
          }
          evictSqlObj.close();
          this.#sqls.delete(evictSqlText);
        }
        if (this.#sqls.size + 1 <= this.capacity) {
          sqlObj = this.#owner.storeSql(sqlText);
          this.#sqls.set(sqlText, sqlObj);
        }
      }
      if (sqlObj !== void 0) {
        hranaStmt.sql = sqlObj;
        usedSqlObjs.add(sqlObj);
      }
    }
  }
};
var Lru = class {
  static {
    __name(this, "Lru");
  }
  // This maps keys to the cache values. The entries are ordered by their last use (entires that were used
  // most recently are at the end).
  #cache;
  constructor() {
    this.#cache = /* @__PURE__ */ new Map();
  }
  get(key) {
    const value = this.#cache.get(key);
    if (value !== void 0) {
      this.#cache.delete(key);
      this.#cache.set(key, value);
    }
    return value;
  }
  set(key, value) {
    this.#cache.set(key, value);
  }
  peekLru() {
    for (const entry of this.#cache.entries()) {
      return entry;
    }
    return void 0;
  }
  delete(key) {
    this.#cache.delete(key);
  }
  get size() {
    return this.#cache.size;
  }
};

// node_modules/@libsql/client/lib-esm/ws.js
var import_promise_limit = __toESM(require_promise_limit(), 1);
function _createClient(config) {
  if (config.scheme !== "wss" && config.scheme !== "ws") {
    throw new LibsqlError(`The WebSocket client supports only "libsql:", "wss:" and "ws:" URLs, got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (config.encryptionKey !== void 0) {
    throw new LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
  }
  if (config.scheme === "ws" && config.tls) {
    throw new LibsqlError(`A "ws:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
  } else if (config.scheme === "wss" && !config.tls) {
    throw new LibsqlError(`A "wss:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
  }
  const url = encodeBaseUrl(config.scheme, config.authority, config.path);
  let client;
  try {
    client = openWs(url, config.authToken);
  } catch (e) {
    if (e instanceof WebSocketUnsupportedError) {
      const suggestedScheme = config.scheme === "wss" ? "https" : "http";
      const suggestedUrl = encodeBaseUrl(suggestedScheme, config.authority, config.path);
      throw new LibsqlError(`This environment does not support WebSockets, please switch to the HTTP client by using a "${suggestedScheme}:" URL (${JSON.stringify(suggestedUrl)}). For more information, please read ${supportedUrlLink}`, "WEBSOCKETS_NOT_SUPPORTED");
    }
    throw mapHranaError(e);
  }
  return new WsClient2(client, url, config.authToken, config.intMode, config.concurrency);
}
__name(_createClient, "_createClient");
var maxConnAgeMillis = 60 * 1e3;
var sqlCacheCapacity = 100;
var WsClient2 = class {
  static {
    __name(this, "WsClient");
  }
  #url;
  #authToken;
  #intMode;
  // State of the current connection. The `hrana.WsClient` inside may be closed at any moment due to an
  // asynchronous error.
  #connState;
  // If defined, this is a connection that will be used in the future, once it is ready.
  #futureConnState;
  closed;
  protocol;
  #isSchemaDatabase;
  #promiseLimitFunction;
  /** @private */
  constructor(client, url, authToken, intMode, concurrency) {
    this.#url = url;
    this.#authToken = authToken;
    this.#intMode = intMode;
    this.#connState = this.#openConn(client);
    this.#futureConnState = void 0;
    this.closed = false;
    this.protocol = "ws";
    this.#promiseLimitFunction = (0, import_promise_limit.default)(concurrency);
  }
  async limit(fn) {
    return this.#promiseLimitFunction(fn);
  }
  async execute(stmtOrSql, args) {
    let stmt;
    if (typeof stmtOrSql === "string") {
      stmt = {
        sql: stmtOrSql,
        args: args || []
      };
    } else {
      stmt = stmtOrSql;
    }
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const hranaStmt = stmtToHrana(stmt);
        streamState.conn.sqlCache.apply([hranaStmt]);
        const hranaRowsPromise = streamState.stream.query(hranaStmt);
        streamState.stream.closeGracefully();
        const hranaRowsResult = await hranaRowsPromise;
        return resultSetFromHrana(hranaRowsResult);
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async batch(stmts, mode = "deferred") {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const normalizedStmts = stmts.map((stmt) => {
          if (Array.isArray(stmt)) {
            return {
              sql: stmt[0],
              args: stmt[1] || []
            };
          }
          return stmt;
        });
        const hranaStmts = normalizedStmts.map(stmtToHrana);
        const version2 = await streamState.conn.client.getVersion();
        streamState.conn.sqlCache.apply(hranaStmts);
        const batch = streamState.stream.batch(version2 >= 3);
        const resultsPromise = executeHranaBatch(mode, version2, batch, hranaStmts);
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async migrate(stmts) {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const hranaStmts = stmts.map(stmtToHrana);
        const version2 = await streamState.conn.client.getVersion();
        const batch = streamState.stream.batch(version2 >= 3);
        const resultsPromise = executeHranaBatch("deferred", version2, batch, hranaStmts, true);
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  async transaction(mode = "write") {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const version2 = await streamState.conn.client.getVersion();
        return new WsTransaction(this, streamState, mode, version2);
      } catch (e) {
        this._closeStream(streamState);
        throw mapHranaError(e);
      }
    });
  }
  async executeMultiple(sql) {
    return this.limit(async () => {
      const streamState = await this.#openStream();
      try {
        const promise = streamState.stream.sequence(sql);
        streamState.stream.closeGracefully();
        await promise;
      } catch (e) {
        throw mapHranaError(e);
      } finally {
        this._closeStream(streamState);
      }
    });
  }
  sync() {
    throw new LibsqlError("sync not supported in ws mode", "SYNC_NOT_SUPPORTED");
  }
  async #openStream() {
    if (this.closed) {
      throw new LibsqlError("The client is closed", "CLIENT_CLOSED");
    }
    const now = /* @__PURE__ */ new Date();
    const ageMillis = now.valueOf() - this.#connState.openTime.valueOf();
    if (ageMillis > maxConnAgeMillis && this.#futureConnState === void 0) {
      const futureConnState = this.#openConn();
      this.#futureConnState = futureConnState;
      futureConnState.client.getVersion().then((_version) => {
        if (this.#connState !== futureConnState) {
          if (this.#connState.streamStates.size === 0) {
            this.#connState.client.close();
          } else {
          }
        }
        this.#connState = futureConnState;
        this.#futureConnState = void 0;
      }, (_e) => {
        this.#futureConnState = void 0;
      });
    }
    if (this.#connState.client.closed) {
      try {
        if (this.#futureConnState !== void 0) {
          this.#connState = this.#futureConnState;
        } else {
          this.#connState = this.#openConn();
        }
      } catch (e) {
        throw mapHranaError(e);
      }
    }
    const connState = this.#connState;
    try {
      if (connState.useSqlCache === void 0) {
        connState.useSqlCache = await connState.client.getVersion() >= 2;
        if (connState.useSqlCache) {
          connState.sqlCache.capacity = sqlCacheCapacity;
        }
      }
      const stream = connState.client.openStream();
      stream.intMode = this.#intMode;
      const streamState = { conn: connState, stream };
      connState.streamStates.add(streamState);
      return streamState;
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  #openConn(client) {
    try {
      client ??= openWs(this.#url, this.#authToken);
      return {
        client,
        useSqlCache: void 0,
        sqlCache: new SqlCache(client, 0),
        openTime: /* @__PURE__ */ new Date(),
        streamStates: /* @__PURE__ */ new Set()
      };
    } catch (e) {
      throw mapHranaError(e);
    }
  }
  async reconnect() {
    try {
      for (const st of Array.from(this.#connState.streamStates)) {
        try {
          st.stream.close();
        } catch {
        }
      }
      this.#connState.client.close();
    } catch {
    }
    if (this.#futureConnState) {
      try {
        this.#futureConnState.client.close();
      } catch {
      }
      this.#futureConnState = void 0;
    }
    const next = this.#openConn();
    const version2 = await next.client.getVersion();
    next.useSqlCache = version2 >= 2;
    if (next.useSqlCache) {
      next.sqlCache.capacity = sqlCacheCapacity;
    }
    this.#connState = next;
    this.closed = false;
  }
  _closeStream(streamState) {
    streamState.stream.close();
    const connState = streamState.conn;
    connState.streamStates.delete(streamState);
    if (connState.streamStates.size === 0 && connState !== this.#connState) {
      connState.client.close();
    }
  }
  close() {
    this.#connState.client.close();
    this.closed = true;
    if (this.#futureConnState) {
      try {
        this.#futureConnState.client.close();
      } catch {
      }
      this.#futureConnState = void 0;
    }
    this.closed = true;
  }
};
var WsTransaction = class extends HranaTransaction {
  static {
    __name(this, "WsTransaction");
  }
  #client;
  #streamState;
  /** @private */
  constructor(client, state, mode, version2) {
    super(mode, version2);
    this.#client = client;
    this.#streamState = state;
  }
  /** @private */
  _getStream() {
    return this.#streamState.stream;
  }
  /** @private */
  _getSqlCache() {
    return this.#streamState.conn.sqlCache;
  }
  close() {
    this.#client._closeStream(this.#streamState);
  }
  get closed() {
    return this.#streamState.stream.closed;
  }
};

// node_modules/@libsql/client/lib-esm/http.js
var import_promise_limit2 = __toESM(require_promise_limit(), 1);
function _createClient2(config) {
  if (config.scheme !== "https" && config.scheme !== "http") {
    throw new LibsqlError(`The HTTP client supports only "libsql:", "https:" and "http:" URLs, got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
  if (config.encryptionKey !== void 0) {
    throw new LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
  }
  if (config.scheme === "http" && config.tls) {
    throw new LibsqlError(`A "http:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
  } else if (config.scheme === "https" && !config.tls) {
    throw new LibsqlError(`A "https:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
  }
  const url = encodeBaseUrl(config.scheme, config.authority, config.path);
  return new HttpClient2(url, config.authToken, config.intMode, config.fetch, config.concurrency);
}
__name(_createClient2, "_createClient");
var sqlCacheCapacity2 = 30;
var HttpClient2 = class {
  static {
    __name(this, "HttpClient");
  }
  #client;
  protocol;
  #url;
  #intMode;
  #customFetch;
  #concurrency;
  #authToken;
  #promiseLimitFunction;
  /** @private */
  constructor(url, authToken, intMode, customFetch, concurrency) {
    this.#url = url;
    this.#authToken = authToken;
    this.#intMode = intMode;
    this.#customFetch = customFetch;
    this.#concurrency = concurrency;
    this.#client = openHttp(this.#url, this.#authToken, this.#customFetch);
    this.#client.intMode = this.#intMode;
    this.protocol = "http";
    this.#promiseLimitFunction = (0, import_promise_limit2.default)(this.#concurrency);
  }
  async limit(fn) {
    return this.#promiseLimitFunction(fn);
  }
  async execute(stmtOrSql, args) {
    let stmt;
    if (typeof stmtOrSql === "string") {
      stmt = {
        sql: stmtOrSql,
        args: args || []
      };
    } else {
      stmt = stmtOrSql;
    }
    return this.limit(async () => {
      try {
        const hranaStmt = stmtToHrana(stmt);
        let rowsPromise;
        const stream = this.#client.openStream();
        try {
          rowsPromise = stream.query(hranaStmt);
        } finally {
          stream.closeGracefully();
        }
        const rowsResult = await rowsPromise;
        return resultSetFromHrana(rowsResult);
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async batch(stmts, mode = "deferred") {
    return this.limit(async () => {
      try {
        const normalizedStmts = stmts.map((stmt) => {
          if (Array.isArray(stmt)) {
            return {
              sql: stmt[0],
              args: stmt[1] || []
            };
          }
          return stmt;
        });
        const hranaStmts = normalizedStmts.map(stmtToHrana);
        const version2 = await this.#client.getVersion();
        let resultsPromise;
        const stream = this.#client.openStream();
        try {
          const sqlCache = new SqlCache(stream, sqlCacheCapacity2);
          sqlCache.apply(hranaStmts);
          const batch = stream.batch(false);
          resultsPromise = executeHranaBatch(mode, version2, batch, hranaStmts);
        } finally {
          stream.closeGracefully();
        }
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async migrate(stmts) {
    return this.limit(async () => {
      try {
        const hranaStmts = stmts.map(stmtToHrana);
        const version2 = await this.#client.getVersion();
        let resultsPromise;
        const stream = this.#client.openStream();
        try {
          const batch = stream.batch(false);
          resultsPromise = executeHranaBatch("deferred", version2, batch, hranaStmts, true);
        } finally {
          stream.closeGracefully();
        }
        const results = await resultsPromise;
        return results;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async transaction(mode = "write") {
    return this.limit(async () => {
      try {
        const version2 = await this.#client.getVersion();
        return new HttpTransaction(this.#client.openStream(), mode, version2);
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  async executeMultiple(sql) {
    return this.limit(async () => {
      try {
        let promise;
        const stream = this.#client.openStream();
        try {
          promise = stream.sequence(sql);
        } finally {
          stream.closeGracefully();
        }
        await promise;
      } catch (e) {
        throw mapHranaError(e);
      }
    });
  }
  sync() {
    throw new LibsqlError("sync not supported in http mode", "SYNC_NOT_SUPPORTED");
  }
  close() {
    this.#client.close();
  }
  async reconnect() {
    try {
      if (!this.closed) {
        this.#client.close();
      }
    } finally {
      this.#client = openHttp(this.#url, this.#authToken, this.#customFetch);
      this.#client.intMode = this.#intMode;
    }
  }
  get closed() {
    return this.#client.closed;
  }
};
var HttpTransaction = class extends HranaTransaction {
  static {
    __name(this, "HttpTransaction");
  }
  #stream;
  #sqlCache;
  /** @private */
  constructor(stream, mode, version2) {
    super(mode, version2);
    this.#stream = stream;
    this.#sqlCache = new SqlCache(stream, sqlCacheCapacity2);
  }
  /** @private */
  _getStream() {
    return this.#stream;
  }
  /** @private */
  _getSqlCache() {
    return this.#sqlCache;
  }
  close() {
    this.#stream.close();
  }
  get closed() {
    return this.#stream.closed;
  }
};

// node_modules/@libsql/client/lib-esm/web.js
function createClient(config) {
  return _createClient3(expandConfig(config, true));
}
__name(createClient, "createClient");
function _createClient3(config) {
  if (config.scheme === "ws" || config.scheme === "wss") {
    return _createClient(config);
  } else if (config.scheme === "http" || config.scheme === "https") {
    return _createClient2(config);
  } else {
    throw new LibsqlError(`The client that uses Web standard APIs supports only "libsql:", "wss:", "ws:", "https:" and "http:" URLs, got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
  }
}
__name(_createClient3, "_createClient");

// src/profile.ts
function profilePage(authenticated, nonce, error = "") {
  const escape = /* @__PURE__ */ __name((value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]), "escape");
  const username = '<label>Username<input name="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9][a-zA-Z0-9._\\-]{1,30}[a-zA-Z0-9]" autocapitalize="none" spellcheck="false" aria-describedby="username-help"></label><small id="username-help">3\u201332 characters. Letters, numbers, dots, dashes, or underscores; start and end with a letter or number.</small>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="robots" content="noindex,nofollow"><title>Yutaka \xB7 Administration</title>
<style nonce="${nonce}">
:root{color-scheme:light;--bg:#F6F9F6;--surface:rgba(255,255,255,.96);--surface-solid:#FFFFFF;--raised:#F3F8F4;--raised-strong:#ECF4EF;--line:#D9E7DE;--text:#0F1216;--muted:#66736C;--accent:#00BD91;--accent-strong:#0F9F70;--accent-ink:#087A5F;--accent-soft:rgba(0,189,145,.12);--danger:#D83A4E;--danger-bg:#FFF1F3;--shadow:0 14px 44px rgba(15,18,22,.07);--shadow-hover:0 20px 58px rgba(15,18,22,.11);--header:rgba(246,249,246,.88)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){color-scheme:dark;--bg:#0F1216;--surface:rgba(19,24,29,.96);--surface-solid:#13181D;--raised:#14191E;--raised-strong:#192126;--line:#272F35;--text:#F0F2F3;--muted:#ADB5BB;--accent:#00BD91;--accent-strong:#27C6A0;--accent-ink:#27C6A0;--accent-soft:rgba(0,189,145,.14);--danger:#FF5353;--danger-bg:rgba(255,83,83,.10);--shadow:0 16px 48px rgba(0,0,0,.26);--shadow-hover:0 22px 66px rgba(0,0,0,.36);--header:rgba(15,18,22,.90)}}
:root[data-theme=dark]{color-scheme:dark;--bg:#0F1216;--surface:rgba(19,24,29,.96);--surface-solid:#13181D;--raised:#14191E;--raised-strong:#192126;--line:#272F35;--text:#F0F2F3;--muted:#ADB5BB;--accent:#00BD91;--accent-strong:#27C6A0;--accent-ink:#27C6A0;--accent-soft:rgba(0,189,145,.14);--danger:#FF5353;--danger-bg:rgba(255,83,83,.10);--shadow:0 16px 48px rgba(0,0,0,.26);--shadow-hover:0 22px 66px rgba(0,0,0,.36);--header:rgba(15,18,22,.90)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;position:relative;overflow-x:hidden;background:var(--bg);color:var(--text);font:15px/1.5 Inter,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,system-ui,sans-serif;min-height:100vh;transition:background-color .3s ease,color .3s ease}body::before,body::after{display:none}
button,input,select{font:inherit}button,select{cursor:pointer}button,a,input,select{touch-action:manipulation}button{position:relative;overflow:hidden;min-height:44px;border:1px solid var(--line);border-radius:14px;padding:10px 16px;background:var(--surface-solid);color:var(--text);font-weight:700;letter-spacing:-.1px;transition:transform .18s cubic-bezier(.2,.8,.2,1),background-color .22s ease,border-color .22s ease,box-shadow .22s ease,color .22s ease}button::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.18) 45%,transparent 68%);transform:translateX(-140%);transition:transform .55s ease}button:hover{background:var(--raised);border-color:color-mix(in srgb,var(--line),var(--accent) 18%);box-shadow:0 7px 20px rgba(18,62,32,.09);transform:translateY(-1px)}button:hover::after{transform:translateX(140%)}button:active{transform:translateY(0) scale(.975)}button:disabled{cursor:wait;opacity:.52;transform:none;box-shadow:none}button.primary{background:linear-gradient(135deg,var(--accent),var(--accent-strong));border-color:transparent;color:#fff;box-shadow:0 9px 24px rgba(16,185,129,.16)}button.primary:hover{background:linear-gradient(135deg,var(--accent-strong),var(--accent));box-shadow:0 12px 28px rgba(16,185,129,.24)}button.danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger),var(--line) 40%);background:transparent}button.danger:hover{background:var(--danger-bg);box-shadow:none}:focus-visible{outline:3px solid color-mix(in srgb,var(--accent-ink),transparent 12%);outline-offset:3px}
header{position:sticky;top:0;z-index:30;border-bottom:1px solid color-mix(in srgb,var(--line),transparent 12%);background:var(--header);backdrop-filter:blur(18px) saturate(1.25);-webkit-backdrop-filter:blur(18px) saturate(1.25);animation:headerEnter .45s ease-out both}.topbar{max-width:1180px;margin:auto;padding:18px 30px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{display:flex;align-items:center;gap:12px;min-width:0}.mark{position:relative;display:grid;place-items:center;background:linear-gradient(145deg,var(--accent-strong),var(--accent));color:#053a28;font-size:26px;font-weight:950;width:46px;height:46px;border-radius:16px;box-shadow:0 10px 28px rgba(16,185,129,.2);animation:markFloat 4.2s ease-in-out infinite;flex:none}.mark::after{content:"";position:absolute;inset:2px;border:1px solid rgba(255,255,255,.22);border-radius:14px;pointer-events:none}.brand strong{display:block;font-size:23px;line-height:1.05;letter-spacing:-.8px;white-space:nowrap}.eyebrow{display:block;color:var(--muted);font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase}.brand .eyebrow{margin-top:5px}.tools,.actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.theme-label{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--muted);font-weight:650}select{min-height:44px;border:1px solid var(--line);border-radius:14px;background:var(--surface-solid);color:var(--text);padding:8px 34px 8px 12px;transition:border-color .2s ease,box-shadow .2s ease,background-color .2s ease}select:hover{border-color:color-mix(in srgb,var(--line),var(--accent) 25%);background:var(--raised)}
main{position:relative;max-width:1180px;margin:0 auto;padding:40px 30px 64px;animation:pageEnter .55s cubic-bezier(.2,.8,.2,1) both}.heading{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:26px}.heading>div{min-width:0}.heading .eyebrow{margin-bottom:5px;color:color-mix(in srgb,var(--muted),var(--accent-ink) 25%)}h1{font-size:clamp(30px,3.1vw,36px);letter-spacing:-1.35px;line-height:1.12;margin:0 0 8px;font-weight:900}h2{font-size:19px;letter-spacing:-.45px;margin:0 0 6px}p{margin:0;color:var(--muted)}a{color:var(--accent-ink);font-weight:800}.pill{display:inline-flex;align-items:center;gap:7px;background:var(--raised);color:var(--accent-ink);border:1px solid var(--line);padding:6px 11px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;transition:transform .2s ease,background-color .2s ease,border-color .2s ease}.heading>.pill{box-shadow:0 7px 22px rgba(16,185,129,.07);animation:pillBreathe 3.6s ease-in-out infinite}.dot{width:7px;height:7px;background:currentColor;border-radius:50%;box-shadow:0 0 0 0 color-mix(in srgb,currentColor,transparent 35%);animation:dotPulse 2.2s ease-out infinite}.card{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow);overflow:hidden;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:cardEnter .58s cubic-bezier(.2,.8,.2,1) both;transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease,border-color .28s ease}.card::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(135deg,rgba(255,255,255,.045),transparent 36%,rgba(16,185,129,.025));opacity:.9}.stats{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:20px;margin-bottom:24px}.stats .card:nth-child(2){animation-delay:.07s}.stat{padding:25px 28px;min-height:150px}.stat-label{color:var(--muted);font-size:13px;font-weight:650}.number{font-size:48px;line-height:1.22;letter-spacing:-2.4px;font-weight:900;font-variant-numeric:tabular-nums;background:linear-gradient(130deg,var(--text) 18%,var(--accent-ink) 72%);-webkit-background-clip:text;background-clip:text;color:transparent;transform-origin:left center}.number.bump{animation:numberBump .46s cubic-bezier(.2,.8,.2,1)}.stat-note{font-size:13px}.info-card{display:flex;align-items:center;gap:20px}.icon{position:relative;color:var(--accent-ink);background:var(--raised);padding:14px;border:1px solid color-mix(in srgb,var(--line),var(--accent) 10%);border-radius:20px;display:grid;place-items:center;box-shadow:inset 0 1px rgba(255,255,255,.05);transition:transform .28s cubic-bezier(.2,.8,.2,1),background-color .28s ease}.icon svg{width:28px;height:28px}.info-card:hover .icon{transform:translateY(-2px) rotate(-4deg) scale(1.04);background:var(--raised-strong)}.card-top{position:relative;z-index:1;padding:24px;display:flex;justify-content:space-between;align-items:center;gap:20px}.card-top p{font-size:13px}.table-wrap{position:relative;z-index:1;overflow:auto;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:var(--line) transparent}table{width:100%;border-collapse:collapse;text-align:left}th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:1px;background:color-mix(in srgb,var(--raised),transparent 2%);padding:13px 24px;font-weight:800}td{padding:18px 24px;border-top:1px solid var(--line);transition:background-color .2s ease}tbody tr{animation:rowReveal .44s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--row-index,0) * 45ms)}tbody tr:hover td{background:color-mix(in srgb,var(--raised),transparent 30%)}td:last-child,th:last-child{text-align:right}.account{display:flex;align-items:center;gap:12px;min-width:0}.avatar{position:relative;width:40px;height:40px;background:linear-gradient(145deg,var(--raised-strong),var(--raised));color:var(--accent-ink);border:1px solid var(--line);border-radius:14px;display:grid;place-items:center;font-weight:800;flex:none;transition:transform .2s ease,border-color .2s ease}.avatar::after{content:"";position:absolute;inset:3px;border-radius:10px;border:1px solid color-mix(in srgb,var(--accent),transparent 78%)}tbody tr:hover .avatar{transform:scale(1.045);border-color:color-mix(in srgb,var(--line),var(--accent) 30%)}.account>div{display:grid;gap:2px;min-width:0}.account strong{overflow-wrap:anywhere;min-width:0}.account-role{color:var(--accent-ink);font-size:12px;font-weight:850;letter-spacing:.1px}.row-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:nowrap}.row-actions button{font-size:13px;padding:8px 12px;white-space:nowrap}.status-invited{color:var(--muted)}time{color:var(--muted);font-size:13px;white-space:nowrap}.pagination{position:relative;z-index:1;padding:16px 24px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:12px;color:var(--muted);font-size:13px}.empty{position:relative;z-index:1;padding:45px 24px;text-align:center}.empty .icon{width:64px;margin:0 auto 16px}.empty p{margin:8px 0 20px}.footnote{font-size:12px;margin-top:18px;padding-left:1px;animation:fadeIn .55s .22s both}.login{max-width:440px;margin:46px auto 0;padding:32px}.login .icon{width:60px;margin-bottom:22px}.login h1{font-size:27px}.login p{margin-bottom:24px}form{display:grid;gap:16px}label{display:grid;gap:7px;font-size:13px;font-weight:700}input{background:var(--raised);border:1px solid var(--line);border-radius:14px;color:var(--text);width:100%;min-height:48px;padding:12px 14px;font-size:16px;transition:border-color .2s ease,box-shadow .2s ease,background-color .2s ease}input:hover{border-color:color-mix(in srgb,var(--line),var(--accent) 24%)}input:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft);background:var(--surface-solid);outline:none}.credential-field{display:grid;gap:7px}.credential-field>label{display:block}.password-field{position:relative}.password-field input{padding-right:56px}.password-toggle{position:absolute;top:50%;right:5px;width:40px;min-height:40px;height:40px;padding:0;border-color:transparent;border-radius:12px;background:transparent;color:var(--muted);display:grid;place-items:center;box-shadow:none;transform:translateY(-50%)}.password-toggle::after{display:none}.password-toggle:hover{background:var(--raised-strong);border-color:transparent;color:var(--accent-ink);box-shadow:none;transform:translateY(-50%)}.password-toggle:active{background:var(--accent-soft);box-shadow:none;transform:translateY(-50%) scale(.96)}.password-toggle svg{width:20px;height:20px;pointer-events:none}.password-toggle:focus-visible{outline-offset:1px}small{font-size:12px;color:var(--muted);margin-top:-10px}.login .primary{margin-top:6px}.login-footer{text-align:center;font-size:12px;margin-top:22px;color:var(--muted)}.notice{position:relative;z-index:40;padding:13px 16px;border:1px solid var(--line);border-radius:16px;background:var(--raised);color:var(--accent-ink);margin-bottom:22px;overflow-wrap:anywhere;box-shadow:var(--shadow);animation:noticeDrop .34s cubic-bezier(.2,.8,.2,1)}.notice.error{background:var(--danger-bg);color:var(--danger);border-color:var(--danger)}[hidden]{display:none!important}dialog{max-width:460px;width:calc(100% - 32px);max-height:calc(100dvh - 40px);overflow:auto;background:var(--surface-solid);color:var(--text);border:1px solid var(--line);border-radius:28px;padding:28px;box-shadow:0 28px 95px rgba(0,0,0,.34);overscroll-behavior:contain}dialog[open]{animation:modalPop .28s cubic-bezier(.18,.89,.32,1.22)}dialog::backdrop{background:rgba(15,18,22,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:fadeIn .2s ease-out}dialog p{margin:8px 0 24px;overflow-wrap:anywhere}dialog .actions{justify-content:flex-end;margin-top:8px}.dialog-name{color:var(--text);font-weight:750}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(hover:hover) and (pointer:fine){.card:hover{transform:translateY(-3px);box-shadow:var(--shadow-hover);border-color:color-mix(in srgb,var(--line),var(--accent) 17%)}.card:hover::before{background:linear-gradient(135deg,rgba(255,255,255,.06),transparent 35%,rgba(16,185,129,.05))}}
@media(max-width:980px){.topbar,main{max-width:900px}.stats{grid-template-columns:minmax(0,.92fr) minmax(0,1.25fr)}.row-actions{flex-wrap:wrap}.row-actions button{flex:1 1 auto}.card-top{align-items:flex-start}}
@media(max-width:760px){body::before{left:-42vw;top:6vh;width:90vw;height:90vw}body::after{right:-40vw;top:58vh;width:84vw;height:84vw}.topbar{padding:15px 18px}.topbar .eyebrow{font-size:8px;letter-spacing:1.45px}.theme-label>span{display:none}.tools{gap:7px;flex-wrap:nowrap}.tools button{padding:8px 11px}.brand{gap:9px}.mark{width:40px;height:40px;border-radius:14px;font-size:23px}.mark::after{border-radius:12px}.brand strong{font-size:21px}main{padding:28px 16px 44px}.heading{align-items:flex-start;flex-direction:column;gap:15px;margin-bottom:21px}.heading>.pill{align-self:flex-start}h1{font-size:30px}.stats{grid-template-columns:1fr;gap:14px;margin-bottom:16px}.stat{padding:22px;min-height:0}.number{font-size:44px}.info-card{gap:15px}.card{border-radius:21px}.card-top{padding:20px;flex-wrap:wrap;gap:16px}.card-top .actions{width:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr)}.card-top .actions button{width:100%}.login{margin-top:14px;padding:26px}.pagination{padding:16px;flex-wrap:wrap}.pagination>.actions{margin-left:auto}thead{display:none}.table-wrap{overflow:visible}table,tbody,tr,td{display:block;width:100%}tbody{display:grid;gap:0}tr{padding:18px 20px;border-top:1px solid var(--line);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:13px 18px}td{padding:0;border:0;background:transparent!important}td:first-child{grid-column:1/-1}td:last-child{grid-column:1/-1}.row-actions{justify-content:stretch;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.row-actions button{width:100%}td[data-label]::before{content:attr(data-label);display:block;font-size:10px;text-transform:uppercase;letter-spacing:.65px;color:var(--muted);margin-bottom:5px;font-weight:750}dialog{padding:24px;border-radius:24px}.footnote{line-height:1.65}}
@media(max-width:520px){.topbar{align-items:flex-start}.tools{margin-left:auto}.theme-label{max-width:112px}.theme-label select{width:100%;padding-right:27px}.tools #logout{white-space:nowrap}.heading p{max-width:34ch}.card-top .actions{grid-template-columns:1fr}.pagination{align-items:stretch}.pagination>.actions{width:100%;margin-left:0;display:grid;grid-template-columns:1fr 1fr}.pagination>.actions button{width:100%}.row-actions{grid-template-columns:1fr}.info-card{align-items:flex-start}.info-card .icon{padding:12px;border-radius:17px}.info-card h2{font-size:18px}.login{padding:24px 20px}.notice{border-radius:14px}.footnote{padding-right:4px}}
@media(max-width:390px){.topbar{gap:10px;padding:13px 12px}.brand{gap:7px}.mark{width:37px;height:37px;font-size:21px}.brand strong{font-size:19px}.brand .eyebrow{display:none}.tools{gap:5px}.theme-label{max-width:92px}.theme-label select{min-height:40px;padding:7px 24px 7px 9px;font-size:13px}.tools button{min-height:40px;padding:7px 9px;font-size:13px}main{padding-left:12px;padding-right:12px}.heading{gap:12px}.heading>.pill{white-space:normal}.card{border-radius:19px}.stat,.card-top{padding-left:17px;padding-right:17px}tr{padding-left:17px;padding-right:17px}dialog{width:calc(100% - 20px);padding:21px 18px}}
@keyframes pageEnter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes headerEnter{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}@keyframes cardEnter{from{opacity:0;transform:translateY(14px) scale(.992)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes rowReveal{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}@keyframes numberBump{0%{transform:scale(.96);opacity:.55}55%{transform:scale(1.055)}100%{transform:scale(1);opacity:1}}@keyframes modalPop{from{opacity:0;transform:translateY(16px) scale(.965)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes noticeDrop{from{opacity:0;transform:translateY(-7px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes dotPulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,currentColor,transparent 38%)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}@keyframes pillBreathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}@keyframes markFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-2px) rotate(-1deg)}}@keyframes bgDriftA{from{transform:translate3d(-2%,0,0) scale(.96)}to{transform:translate3d(8%,7%,0) scale(1.08)}}@keyframes bgDriftB{from{transform:translate3d(0,0,0) scale(.94)}to{transform:translate3d(-9%,-6%,0) scale(1.05)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation:none!important;transition:none!important}body::before,body::after{display:none}}
</style></head><body>
<header><div class="topbar"><div class="brand"><span class="mark" aria-hidden="true">K</span><div><strong>Yutaka</strong><span class="eyebrow">Administration</span></div></div><div class="tools"><label class="theme-label"><span>Appearance</span><select id="theme" aria-label="Appearance"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>${authenticated ? '<button id="logout">Sign out</button>' : ""}</div></div></header>
<main><div id="notice" class="notice${error ? " error" : ""}" role="status" aria-live="polite" ${error ? "" : "hidden"}>${escape(error)}</div><noscript><p class="notice error">Enable JavaScript to use this administration portal.</p></noscript>
${authenticated ? `
<div id="dashboard"><div class="heading"><div><span class="eyebrow">Your self-hosted Worker</span><h1>Account overview</h1><p>Manage the accounts connected to this Worker.</p></div><span class="pill"><span class="dot"></span>Current administrator</span></div>
<div class="stats"><section class="card stat"><div class="stat-label">Registered accounts</div><div class="number" id="total" aria-live="polite">\u2014</div><p class="stat-note">Accounts on this Worker</p></section><section class="card stat info-card"><span class="icon" aria-hidden="true">${shield}</span><div><h2>Your Worker, your people</h2><p>The earliest remaining account is the administrator.<br>Every account keeps its own synchronized data.</p></div></section></div>
<section class="card" aria-labelledby="accounts-title"><div class="card-top"><div><h2 id="accounts-title">Accounts</h2><p>Manage the people connected to your Worker.</p></div><div class="actions"><button id="refresh">Refresh</button><button id="create" class="primary">+ Create account</button></div></div><div id="loading" class="empty" role="status">Loading accounts\u2026</div><div class="table-wrap" id="table-wrap" hidden><table><thead><tr><th>Username</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody id="accounts"></tbody></table></div><div id="empty" class="empty" hidden><div class="icon" aria-hidden="true">${shield}</div><h2>No accounts yet</h2><p>Create the first account to get started.</p></div><div class="pagination"><span id="page-label">Loading\u2026</span><div class="actions"><button id="previous" disabled>Previous</button><button id="next" disabled>Next</button></div></div></section><p class="footnote">Invited = no active device session. Active = at least one device session is active; this does not indicate who is online. <a href="/delete-account">Delete your own account</a>.</p></div>
<dialog id="editor" aria-labelledby="editor-title"><h2 id="editor-title">Create account</h2><p id="editor-description">Create a login for this Worker.</p><div id="editor-error" class="notice error" role="alert" hidden></div><form id="account-form"><div id="username-field">${username}</div><div class="credential-field"><label for="account-password">New password</label><div class="password-field"><input id="account-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="256" aria-describedby="password-help"><button type="button" class="password-toggle" data-password-toggle aria-controls="account-password" aria-label="Show password" aria-pressed="false" title="Show password"><span data-eye="show">${eye}</span><span data-eye="hide" hidden>${eyeOff}</span></button></div></div><small id="password-help">Use 8\u2013256 characters. Passwords are never shown in the account list.</small><div class="credential-field"><label for="account-confirm">Confirm password</label><div class="password-field"><input id="account-confirm" name="confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="256"><button type="button" class="password-toggle" data-password-toggle aria-controls="account-confirm" aria-label="Show password" aria-pressed="false" title="Show password"><span data-eye="show">${eye}</span><span data-eye="hide" hidden>${eyeOff}</span></button></div></div><div class="actions"><button type="button" data-close="editor">Cancel</button><button id="save" class="primary">Create account</button></div></form></dialog>
<dialog id="username-dialog" aria-labelledby="username-dialog-title"><h2 id="username-dialog-title">Change username</h2><p id="username-description">Choose a new username for this account.</p><div id="username-error" class="notice error" role="alert" hidden></div><form id="username-form"><label for="new-username">Username<input id="new-username" name="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{1,30}[a-zA-Z0-9]" autocapitalize="none" spellcheck="false" aria-describedby="change-username-help"></label><small id="change-username-help">3\u201332 characters. Letters, numbers, dots, dashes, or underscores; start and end with a letter or number.</small><div class="actions"><button type="button" data-close="username-dialog">Cancel</button><button id="save-username" class="primary">Change username</button></div></form></dialog>
<dialog id="delete-dialog" aria-labelledby="delete-title"><h2 id="delete-title">Delete account?</h2><p>This permanently deletes <span class="dialog-name" id="delete-name"></span> and their synchronized cloud data, devices, Telegram backup settings, and Analytics upload credentials. Copies already stored on devices or sent to Telegram/Google Drive remain. This cannot be undone.</p><div id="delete-error" class="notice error" role="alert" hidden></div><div class="actions"><button data-close="delete-dialog" autofocus>Cancel</button><button id="confirm-delete" class="danger">Delete account</button></div></dialog>
<template id="account-row"><tr><td><div class="account"><span class="avatar" aria-hidden="true"></span><div><strong></strong><span class="account-role" hidden>Administrator</span></div></div></td><td data-label="Created"><time></time></td><td data-label="Status"><span class="pill"></span></td><td><div class="row-actions"><button data-action="username">Change username</button><button data-action="password">Change password</button><button data-action="delete" class="danger">Delete</button></div></td></tr></template>
` : `
<section class="card login"><div class="icon" aria-hidden="true">${shield}</div><span class="eyebrow">Worker administration</span><h1>Welcome back</h1><p>Sign in with the current administrator account for this Worker.</p><form id="login-form">${username}<div class="credential-field"><label for="admin-password">Password</label><div class="password-field"><input id="admin-password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button type="button" class="password-toggle" data-password-toggle aria-controls="admin-password" aria-label="Show password" aria-pressed="false" title="Show password"><span data-eye="show">${eye}</span><span data-eye="hide" hidden>${eyeOff}</span></button></div></div><button class="primary" ${error ? "disabled" : ""}>Sign in</button></form><div class="login-footer">A private space for your self-hosted Yutaka. \xB7 <a href="/delete-account">Delete your own account</a></div></section>`}
</main><script nonce="${nonce}">
const $ = id => document.getElementById(id);
const theme = $('theme');
try { theme.value = localStorage.getItem('yutaka-profile-theme') || 'system'; } catch {}
function applyTheme() { document.documentElement.dataset.theme = theme.value; }
applyTheme();
theme.addEventListener('change', () => { applyTheme(); try { localStorage.setItem('yutaka-profile-theme', theme.value); } catch {} });
function message(text, error = false, target = 'notice') { const box = $(target); box.textContent = text; box.classList.toggle('error', error); box.hidden = false; }
function setPasswordVisibility(button, visible) {
  const input = $(button.getAttribute('aria-controls'));
  if (!input) return;
  input.type = visible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(visible));
  button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  button.title = visible ? 'Hide password' : 'Show password';
  button.querySelector('[data-eye=show]').hidden = visible;
  button.querySelector('[data-eye=hide]').hidden = !visible;
}
function resetPasswordVisibility(scope = document) { scope.querySelectorAll('[data-password-toggle]').forEach(button => setPasswordVisibility(button, false)); }
document.querySelectorAll('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
  const input = $(button.getAttribute('aria-controls'));
  if (!input) return;
  const visible = input.type === 'password';
  setPasswordVisibility(button, visible);
  input.focus({ preventScroll: true });
}));
async function api(path, method = 'GET', body) {
  let response;
  try { response = await fetch('/profile/api/' + path, { method, credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json', 'x-profile-request': '1' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new Error('Could not reach the server. Check your connection and refresh to confirm the latest account state before retrying.'); }
  if (response.status === 401 && path !== 'login') { $('dashboard')?.remove(); document.querySelectorAll('dialog').forEach(dialog => dialog.close()); location.replace('/profile?expired=1'); throw new Error('Session expired. Sign in again.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('Server returned an unexpected response. Please try again.'); }
  if (!response.ok) throw new Error(data.error || 'Server/database error. Please try again.');
  return data;
}
async function busy(button, work) { if (button.disabled) return; button.disabled = true; button.setAttribute('aria-busy', 'true'); try { await work(); } finally { button.disabled = false; button.removeAttribute('aria-busy'); } }
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
const loginForm = $('login-form');
if (loginForm) {
  if (new URL(location.href).searchParams.has('expired')) message('Your session expired. Sign in again.', true);
  loginForm.addEventListener('submit', event => { event.preventDefault(); busy(loginForm.querySelector('button.primary'), async () => { const data = new FormData(loginForm); const password = data.get('password'); loginForm.elements.password.value = ''; resetPasswordVisibility(loginForm); try { await api('login', 'POST', { username: data.get('username'), password }); location.replace('/profile'); } catch (error) { message(error.message, true); } }); });
} else {
  let page = 1, selected = null, total = 0, loading = false, totalAnimation = 0;
  const editor = $('editor'), form = $('account-form'), usernameEditor = $('username-dialog'), usernameForm = $('username-form'), deletion = $('delete-dialog');
  function setTotal(value) {
    const node = $('total');
    const previous = Number(node.dataset.value || 0);
    node.dataset.value = String(value);
    cancelAnimationFrame(totalAnimation);
    node.classList.remove('bump');
    void node.offsetWidth;
    node.classList.add('bump');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(value - previous) > 500) { node.textContent = String(value); return; }
    const started = performance.now(), duration = 430;
    const frame = now => { const progress = Math.min(1, (now - started) / duration); const eased = 1 - Math.pow(1 - progress, 3); node.textContent = String(Math.round(previous + (value - previous) * eased)); if (progress < 1) totalAnimation = requestAnimationFrame(frame); };
    totalAnimation = requestAnimationFrame(frame);
  }
  async function load() {
    if (loading) return;
    loading = true; $('refresh').disabled = true; $('previous').disabled = true; $('next').disabled = true;
    try {
      let data = await api('accounts?page=' + page);
      const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
      if (page > lastPage) { page = lastPage; data = await api('accounts?page=' + page); }
      total = data.total; setTotal(total); $('accounts').replaceChildren();
      for (const [index, account] of data.accounts.entries()) {
        const row = $('account-row').content.cloneNode(true);
        row.querySelector('tr').style.setProperty('--row-index', String(index));
        row.querySelector('strong').textContent = account.username;
        row.querySelector('.avatar').textContent = account.username[0].toUpperCase();
        const isAdministrator = account.isAdministrator === true || account.id === data.administratorUserId || (data.total === 1 && data.accounts.length === 1);
        account.isAdministrator = isAdministrator;
        const adminTitle = row.querySelector('.account-role'); adminTitle.hidden = !isAdministrator;
        const time = row.querySelector('time'); time.dateTime = new Date(account.createdAt).toISOString(); time.textContent = new Date(account.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); time.title = new Date(account.createdAt).toLocaleString();
        const status = row.querySelector('td[data-label=Status] .pill'); status.textContent = account.status === 'active' ? 'Active' : 'Invited'; status.classList.toggle('status-invited', account.status !== 'active');
        for (const button of row.querySelectorAll('button')) {
          button.setAttribute('aria-label', button.textContent + ' for ' + account.username);
          if (button.dataset.action === 'delete' && account.isAdministrator) { button.disabled = true; button.title = 'Use Yutaka or /delete-account for administrator self-deletion.'; continue; }
          button.addEventListener('click', () => button.dataset.action === 'delete' ? openDelete(account) : button.dataset.action === 'username' ? openUsername(account) : openEditor(account));
        }
        $('accounts').append(row);
      }
      $('table-wrap').hidden = data.accounts.length === 0; $('empty').hidden = total !== 0; $('loading').hidden = true;
      $('page-label').textContent = total ? ((page - 1) * data.pageSize + 1) + '\u2013' + Math.min(page * data.pageSize, total) + ' of ' + total + ' accounts' : '0 accounts';
    } catch (error) { message(error.message, true); $('loading').textContent = 'Unable to load accounts. Use Refresh to try again.'; }
    finally { loading = false; $('refresh').disabled = false; $('previous').disabled = page <= 1; $('next').disabled = page * 50 >= total; }
  }
  function openEditor(account = null) {
    selected = account; form.reset(); resetPasswordVisibility(editor); $('editor-error').hidden = true; $('username-field').hidden = Boolean(account); form.elements.username.disabled = Boolean(account);
    $('editor-title').textContent = account ? 'Change password' : 'Create account'; $('save').textContent = account ? 'Change password' : 'Create account';
    $('editor-description').textContent = account ? 'Set a new password for ' + account.username + '. This signs out their devices and invalidates their recovery key.' : 'Create a login for this Worker. Share the password privately with the account holder.';
    editor.showModal(); (account ? form.elements.password : form.elements.username).focus();
  }
  function openUsername(account) {
    selected = account; usernameForm.reset(); $('username-error').hidden = true; usernameForm.elements.username.value = account.username;
    $('username-description').textContent = 'Choose a new username for ' + account.username + '. Their synchronized data stays attached to the same account.';
    usernameEditor.showModal(); usernameForm.elements.username.focus(); usernameForm.elements.username.select();
  }
  function openDelete(account) { selected = account; $('delete-name').textContent = account.username; $('delete-error').hidden = true; deletion.showModal(); }
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  [editor, usernameEditor, deletion].forEach(dialog => dialog.addEventListener('cancel', event => { if (dialog.querySelector('[aria-busy=true]')) event.preventDefault(); }));
  editor.addEventListener('close', () => { form.reset(); resetPasswordVisibility(editor); });
  usernameEditor.addEventListener('close', () => usernameForm.reset());
  $('create').addEventListener('click', () => openEditor()); $('refresh').addEventListener('click', load);
  $('previous').addEventListener('click', () => { page--; load(); }); $('next').addEventListener('click', () => { page++; load(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.elements.password.value !== form.elements.confirm.value) { message('Passwords do not match.', true, 'editor-error'); return; }
    busy($('save'), async () => {
      const data = new FormData(form); const account = selected; const cancel = editor.querySelector('[data-close]'); cancel.disabled = true;
      const password = data.get('password'); form.elements.password.value = ''; form.elements.confirm.value = ''; resetPasswordVisibility(form);
      try { const result = await api(account ? 'accounts/' + encodeURIComponent(account.id) + '/password' : 'accounts', 'POST', { username: data.get('username'), password }); editor.close(); message(result.message); if (!account) page = 1; await load(); }
      catch (error) { message(error.message, true, 'editor-error'); } finally { cancel.disabled = false; }
    });
  });
  usernameForm.addEventListener('submit', event => {
    event.preventDefault();
    busy($('save-username'), async () => {
      const data = new FormData(usernameForm); const account = selected; const cancel = usernameEditor.querySelector('[data-close]'); cancel.disabled = true;
      try { const result = await api('accounts/' + encodeURIComponent(account.id) + '/username', 'POST', { username: data.get('username') }); usernameEditor.close(); message(result.message); await load(); }
      catch (error) { message(error.message, true, 'username-error'); } finally { cancel.disabled = false; }
    });
  });
  $('confirm-delete').addEventListener('click', () => busy($('confirm-delete'), async () => {
    const cancel = deletion.querySelector('[data-close]'); cancel.disabled = true;
    try { const result = await api('accounts/' + encodeURIComponent(selected.id), 'DELETE'); deletion.close(); message(result.message); await load(); } catch (error) { message(error.message, true, 'delete-error'); } finally { cancel.disabled = false; }
  }));
  $('logout').addEventListener('click', () => busy($('logout'), async () => { try { await api('logout', 'POST', {}); $('dashboard').remove(); location.replace('/profile'); } catch (error) { message(error.message, true); } }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  load();
}
<\/script></body></html>`;
}
__name(profilePage, "profilePage");
var shield = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></svg>';
var eye = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>';
var eyeOff = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 6.1A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a18.7 18.7 0 0 1-3 3.7"/><path d="M6.2 6.2C3.9 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

// src/delete_account.ts
function deleteAccountPage(options) {
  const escape = /* @__PURE__ */ __name((value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]), "escape");
  const eye2 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>';
  const eyeOff2 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 6.1A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a18.7 18.7 0 0 1-3 3.7"/><path d="M6.2 6.2C3.9 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const error = options.error?.trim() ?? "";
  const username = options.username?.trim() ?? "";
  const success = options.success === true;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="robots" content="noindex,nofollow"><title>Yutaka \xB7 Delete account</title>
<style nonce="${options.nonce}">
:root{color-scheme:light;--bg:#F6F9F6;--surface:#FFFFFF;--raised:#F3F8F4;--line:#D9E7DE;--text:#0F1216;--muted:#66736C;--accent:#00BD91;--danger:#D83A4E;--danger-bg:#FFF1F3;--shadow:0 16px 48px rgba(15,18,22,.08)}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#0F1216;--surface:#13181D;--raised:#192126;--line:#272F35;--text:#F0F2F3;--muted:#ADB5BB;--accent:#27C6A0;--danger:#FF5353;--danger-bg:rgba(255,83,83,.10);--shadow:0 18px 54px rgba(0,0,0,.30)}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);font:15px/1.5 Inter,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,system-ui,sans-serif;display:grid;place-items:center;padding:24px}.shell{width:min(100%,620px)}.brand{display:flex;align-items:center;gap:12px;margin-bottom:18px}.mark{display:grid;place-items:center;width:46px;height:46px;border-radius:16px;background:linear-gradient(145deg,#0F9F70,#00BD91);font-size:26px;font-weight:950;color:#053A28}.brand strong{display:block;font-size:22px;line-height:1.05;letter-spacing:-.7px}.brand span{color:var(--muted);font-size:12px;font-weight:700}.card{background:var(--surface);border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow);padding:26px}.danger-icon{width:52px;height:52px;border-radius:18px;background:var(--danger-bg);color:var(--danger);display:grid;place-items:center;font-size:26px;margin-bottom:18px}h1{font-size:30px;line-height:1.15;letter-spacing:-1px;margin:0 0 8px}p{margin:0;color:var(--muted)}.notice{margin:18px 0;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--raised);color:var(--text)}.notice strong{display:block;margin-bottom:4px}.error{margin:16px 0;padding:12px 14px;border-radius:14px;background:var(--danger-bg);color:var(--danger);font-weight:750}.success{margin:18px 0;padding:14px 16px;border-radius:16px;border:1px solid color-mix(in srgb,var(--accent),var(--line) 60%);background:color-mix(in srgb,var(--accent),transparent 90%);color:var(--text)}form{display:grid;gap:14px;margin-top:20px}label{display:grid;gap:7px;font-weight:800}input{width:100%;min-height:50px;border:1px solid var(--line);border-radius:14px;background:var(--raised);color:var(--text);padding:12px 14px;font:inherit;outline:none}input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent),transparent 78%)}.password-field{position:relative}.password-field input{padding-right:58px}.password-toggle{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:40px;height:40px;min-height:40px;border:0;border-radius:11px;padding:0;margin:0;background:transparent;color:var(--muted);display:grid;place-items:center}.password-toggle:hover{background:var(--surface);color:var(--accent);filter:none}.password-toggle svg{width:20px;height:20px;pointer-events:none}.password-toggle [hidden]{display:none}small{color:var(--muted);font-weight:600}button{min-height:50px;border:0;border-radius:14px;padding:12px 16px;font:inherit;font-weight:850;cursor:pointer;background:var(--danger);color:#fff;margin-top:4px}button:hover{filter:brightness(1.04)}a{color:var(--accent);font-weight:800}.footer{margin-top:16px;text-align:center;color:var(--muted);font-size:12px}
</style></head><body><main class="shell"><div class="brand"><div class="mark">K</div><div><strong>Yutaka</strong><span>Self-hosted account deletion</span></div></div><section class="card"><div class="danger-icon">\xD7</div><h1>${success ? "Account deleted" : "Delete your Yutaka account"}</h1>
${success ? `<div class="success"><strong>${username ? escape(username) : "Your account"}</strong> and its Worker-side data were permanently deleted.</div><p>Local copies already stored on your devices and files you previously exported to services such as Telegram or Google Drive are not erased by this web action.</p>` : `<p>Use this page when you no longer have Yutaka installed or prefer to delete your self-hosted sync account from a browser.</p><div class="notice"><strong>This permanently removes Worker-side account data.</strong>Synchronized finance data, profile media, device/session records, backup schedules, and stored Telegram/Google Drive credentials for this account are deleted. Local copies on devices and files already exported to external services are not automatically removed.</div>${error ? `<div class="error" role="alert">${escape(error)}</div>` : ""}<form method="post" action="/delete-account" autocomplete="off"><label>Username<input name="username" value="${escape(username)}" autocomplete="username" required minlength="3" maxlength="32" autocapitalize="none" spellcheck="false"></label><label for="delete-password">Password</label><div class="password-field"><input id="delete-password" type="password" name="password" autocomplete="current-password" required minlength="8" maxlength="256"><button type="button" class="password-toggle" id="password-toggle" aria-controls="delete-password" aria-label="Show password" aria-pressed="false" title="Show password"><span data-eye="show">${eye2}</span><span data-eye="hide" hidden>${eyeOff2}</span></button></div><label>Type DELETE to confirm<input name="confirmation" autocomplete="off" required pattern="DELETE" maxlength="6" autocapitalize="characters" spellcheck="false"></label><small>This action cannot be undone. If this is the final account on the Worker, first-user registration becomes available again.</small><button type="submit">Permanently delete account</button></form>`}
</section><div class="footer">Yutaka \xB7 self-hosted sync</div></main><script nonce="${options.nonce}">const toggle=document.getElementById('password-toggle');const input=document.getElementById('delete-password');if(toggle&&input){toggle.addEventListener('click',()=>{const visible=input.type==='password';input.type=visible?'text':'password';toggle.setAttribute('aria-label',visible?'Hide password':'Show password');toggle.setAttribute('title',visible?'Hide password':'Show password');toggle.setAttribute('aria-pressed',String(visible));toggle.querySelector('[data-eye=show]').hidden=visible;toggle.querySelector('[data-eye=hide]').hidden=!visible;input.focus({preventScroll:true});});}<\/script></body></html>`;
}
__name(deleteAccountPage, "deleteAccountPage");

// src/index.ts
var enc = new TextEncoder();
var syncEntityTypes = [
  "accounts",
  "categories",
  "notes",
  "planned_purchases",
  "subscriptions",
  "transactions",
  "budgets",
  "budget_accounts",
  "budget_categories",
  "loan_contacts",
  "loans",
  "loan_payments",
  "preferences"
];
var syncEntityTypeSet = new Set(syncEntityTypes);
var legacyResetRecoveryCheckedUsers = /* @__PURE__ */ new Set();
var requiredTables = [
  "users",
  "refresh_tokens",
  "devices",
  "sync_entities",
  "sync_changes",
  "processed_operations",
  "rate_limits",
  "telegram_backup_settings",
  "google_drive_backup_settings",
  "analytics_upload_settings",
  "analytics_pdf_schedules",
  "profile_media",
  "profile_media_chunks",
  "admin_sessions",
  "worker_state"
];
var SyncHub = class {
  constructor(state) {
    this.state = state;
  }
  state;
  static {
    __name(this, "SyncHub");
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/live") {
      if ((request.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket upgrade.", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      server.serializeAttachment({ deviceId: request.headers.get("x-yutaka-device-id") ?? "" });
      return new Response(null, { status: 101, webSocket: client });
    }
    if (request.method === "POST" && url.pathname === "/notify") {
      const payload = await request.json().catch(() => ({}));
      const sourceDeviceId = String(payload.deviceId ?? "");
      const message = JSON.stringify({
        type: "sync-change",
        deviceId: sourceDeviceId,
        changedAt: Number(payload.changedAt ?? Date.now())
      });
      for (const socket of this.state.getWebSockets()) {
        const attachment = socket.deserializeAttachment();
        if (sourceDeviceId && attachment?.deviceId === sourceDeviceId) continue;
        try {
          socket.send(message);
        } catch {
        }
      }
      return new Response(null, { status: 204 });
    }
    return new Response("Not found.", { status: 404 });
  }
  webSocketMessage(socket, message) {
    if (message === "ping") {
      try {
        socket.send("pong");
      } catch {
      }
    }
  }
  webSocketClose(socket, code, reason) {
    try {
      socket.close(code, reason);
    } catch {
    }
  }
  webSocketError(socket) {
    try {
      socket.close(1011, "Realtime sync connection error.");
    } catch {
    }
  }
};
async function handleRequest(request, env, context, connect = () => createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })) {
  const url = new URL(request.url);
  let db;
  try {
    if (url.pathname === "/profile" || url.pathname.startsWith("/profile/")) {
      return await profile(request, env, connect);
    }
    if (url.pathname === "/delete-account" || url.pathname === "/delete-account/") {
      return await deleteAccountPortal(request, env, connect);
    }
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (request.method === "GET" && url.pathname === "/") return rootResponse(env);
    if (request.method === "GET" && url.pathname === "/health") return healthResponse(env);
    validateWorkerConfig(env);
    db = connect();
    if (request.method === "POST" && url.pathname === "/v1/auth/register") return await register(request, env, db);
    if (request.method === "POST" && url.pathname === "/v1/auth/login") return await login(request, env, db);
    if (request.method === "POST" && url.pathname === "/v1/auth/recover") return await recoverAccount(request, env, db);
    if (request.method === "POST" && url.pathname === "/v1/auth/refresh") return await refresh(request, env, db);
    if (request.method === "GET" && url.pathname === "/v1/analytics-upload/google-drive/callback") {
      return await googleDriveAnalyticsCallback(request, env, db);
    }
    const auth = await requireAuth(request, env, db);
    if (request.method === "POST" && url.pathname === "/v1/auth/logout") return await logout(request, db, auth);
    if (request.method === "DELETE" && url.pathname === "/v1/auth/account") return await deleteOwnAccount(request, env, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/auth/recovery-key") return await rotateRecoveryKey(env, db, auth);
    if (request.method === "GET" && url.pathname === "/v1/deployment-recovery/profile") return await deploymentRecoveryProfile(db, env, auth);
    if (request.method === "POST" && url.pathname === "/v1/deployment-recovery/profile") return await saveDeploymentRecoveryProfile(request, db, env, auth);
    if (request.method === "DELETE" && url.pathname === "/v1/deployment-recovery/profile") return await deleteDeploymentRecoveryProfile(db, auth);
    if (request.method === "GET" && url.pathname === "/v1/sync/live") return await openLiveSync(request, env, auth);
    if (request.method === "POST" && url.pathname === "/v1/sync/initial") {
      const response = await initialSync(request, db, auth);
      context.waitUntil(notifySyncHub(env, auth));
      return response;
    }
    if (request.method === "POST" && url.pathname === "/v1/sync/push") {
      const response = await push(request, env, db, auth);
      context.waitUntil(notifySyncHub(env, auth));
      return response;
    }
    if (request.method === "POST" && url.pathname === "/v1/sync/replace") {
      throw new HttpError(410, "Legacy destructive replace sync is disabled. Update Yutaka and use merge sync.");
    }
    if (request.method === "GET" && url.pathname === "/v1/sync/pull") return await pull(url, env, db, auth);
    if (request.method === "GET" && url.pathname === "/v1/sync/status") return await status(db, auth);
    if (request.method === "POST" && url.pathname === "/v1/profile-media/begin") return await beginProfileMediaUpload(request, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/profile-media/chunk") return await uploadProfileMediaChunk(request, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/profile-media/complete") {
      const response = await completeProfileMediaUpload(request, db, auth);
      context.waitUntil(notifySyncHub(env, auth));
      return response;
    }
    if (request.method === "GET" && url.pathname === "/v1/profile-media/meta") return await profileMediaMetadata(db, auth);
    if (request.method === "GET" && url.pathname === "/v1/profile-media/chunk") return await downloadProfileMediaChunk(url, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/profile-media/framing") {
      const response = await updateProfileMediaFraming(request, db, auth);
      context.waitUntil(notifySyncHub(env, auth));
      return response;
    }
    if (request.method === "DELETE" && url.pathname === "/v1/profile-media") {
      const response = await deleteProfileMedia(db, auth);
      context.waitUntil(notifySyncHub(env, auth));
      return response;
    }
    if (request.method === "GET" && url.pathname === "/v1/telegram-backup/settings") return await telegramBackupSettings(env, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/telegram-backup/settings") return await saveTelegramBackupSettings(request, env, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/telegram-backup/test") return await testTelegramBackup(request, env, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/telegram-backup/send-now") return await sendTelegramBackupNow(env, db, auth);
    if (request.method === "GET" && url.pathname === "/v1/google-drive-backup/settings") return await googleDriveBackupSettings(db, auth);
    if (request.method === "POST" && url.pathname === "/v1/google-drive-backup/settings") return await saveGoogleDriveBackupSettings(request, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/google-drive-backup/send-now") return await sendGoogleDriveBackupNow(env, db, auth);
    if (request.method === "GET" && url.pathname === "/v1/analytics-upload/google-drive/settings") return await googleDriveAnalyticsSettings(db, auth);
    if (request.method === "POST" && url.pathname === "/v1/analytics-upload/google-drive/settings") return await saveGoogleDriveAnalyticsSettings(request, env, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/analytics-upload/google-drive/connect-url") return await googleDriveAnalyticsConnectUrl(request, env, db, auth);
    if (request.method === "DELETE" && url.pathname === "/v1/analytics-upload/google-drive/connection") return await disconnectGoogleDriveAnalytics(env, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/analytics-upload/telegram") return await uploadAnalyticsPdfToTelegram(request, env, db, auth);
    if (request.method === "POST" && url.pathname === "/v1/analytics-upload/google-drive") return await uploadAnalyticsPdfToGoogleDrive(request, env, db, auth);
    if (request.method === "GET" && url.pathname === "/v1/analytics-upload/schedules") return await analyticsPdfSchedules(db, auth);
    if (request.method === "POST" && url.pathname.startsWith("/v1/analytics-upload/schedules/")) return await saveAnalyticsPdfSchedule(request, env, db, auth, url.pathname);
    return json({ error: "Not found." }, 404);
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : "Internal server error.";
    const code = error instanceof HttpError ? error.code : void 0;
    if (!(error instanceof HttpError)) {
      console.error("Unhandled sync worker error", {
        path: url.pathname,
        method: request.method,
        error: databaseErrorMessage(error)
      });
    }
    return json({ error: message, ...code ? { code } : {} }, statusCode);
  } finally {
    db?.close();
  }
}
__name(handleRequest, "handleRequest");
var index_default = {
  async fetch(request, env, context) {
    return handleRequest(request, env, context);
  },
  async scheduled(_controller, env, _context) {
    validateWorkerConfig(env);
    const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
    try {
      await runDueTelegramBackups(env, db);
      await runDueGoogleDriveBackups(env, db);
      await runDueAnalyticsPdfUploads(env, db);
    } catch (error) {
      console.error("Scheduled upload run failed", databaseErrorMessage(error));
    } finally {
      db.close();
    }
  }
};
var adminCookie = "__Host-yutaka-admin";
var adminSessionSeconds = 3600;
async function profile(request, env, connect = () => createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })) {
  const url = new URL(request.url);
  const page = request.method === "GET" && (url.pathname === "/profile" || url.pathname === "/profile/");
  const nonce = b64urlBytes(crypto.getRandomValues(new Uint8Array(18)));
  let db;
  let response;
  try {
    validateWorkerConfig(env);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new HttpError(400, "Administrator access requires HTTPS.");
    }
    if (!["GET", "POST", "DELETE"].includes(request.method)) throw new HttpError(405, "Method not allowed.");
    if (request.method !== "GET" && (request.headers.get("origin") !== url.origin || request.headers.get("x-profile-request") !== "1")) {
      throw new HttpError(403, "This action must be submitted from the administration portal.");
    }
    db = connect();
    const administrator = await administratorAccount(db);
    const token = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith(adminCookie + "="))?.slice(adminCookie.length + 1) ?? "";
    const sessionHash = await signDetached(env.JWT_SECRET, JSON.stringify(["profile", administrator.id, administrator.passwordHash, administrator.sessionVersion, token]));
    if (request.method === "POST" && url.pathname === "/profile/api/login") {
      await enforceRateLimit(db, `admin-login:ip:${request.headers.get("cf-connecting-ip") ?? "local"}`, 8, 9e5);
      await enforceRateLimit(db, "admin-login:global", 50, 9e5);
      const body = await readProfileJson(request);
      const username = normalizeUsername(body.username);
      const password = typeof body.password === "string" ? body.password : "";
      const validPassword = await verifyPassword(password, administrator.passwordHash, env.JWT_SECRET);
      if (!constantTimeEqual(username, administrator.username) || !validPassword) throw new HttpError(401, "Invalid administrator username or password.");
      const newToken = b64urlBytes(crypto.getRandomValues(new Uint8Array(32)));
      const newHash = await signDetached(env.JWT_SECRET, JSON.stringify(["profile", administrator.id, administrator.passwordHash, administrator.sessionVersion, newToken]));
      await db.batch([
        { sql: "DELETE FROM admin_sessions WHERE expires_at <= ? OR token_hash = ?", args: [Date.now(), sessionHash] },
        { sql: "INSERT INTO admin_sessions(token_hash, expires_at) VALUES (?, ?)", args: [newHash, Date.now() + adminSessionSeconds * 1e3] }
      ], "write");
      response = privateJson({ ok: true });
      response.headers.set("set-cookie", profileCookie(newToken, adminSessionSeconds));
    } else {
      const session = token && (await db.execute({ sql: "SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?", args: [sessionHash, Date.now()] })).rows[0];
      if (page) {
        response = new Response(profilePage(Boolean(session), nonce), { headers: { "content-type": "text/html; charset=utf-8" } });
      } else if (request.method === "POST" && url.pathname === "/profile/api/logout") {
        await db.execute({ sql: "DELETE FROM admin_sessions WHERE token_hash = ?", args: [sessionHash] });
        response = privateJson({ ok: true });
        response.headers.set("set-cookie", profileCookie("", 0));
      } else {
        if (!session) throw new HttpError(401, "Your administrator session expired. Sign in again.");
        response = await manageAccounts(request, url, env, db);
      }
    }
  } catch (error) {
    const status2 = error instanceof HttpError ? error.status : 503;
    const message = error instanceof HttpError ? error.message : "Server/database error. Try again; if it persists, check the Worker configuration and apply the latest schema.";
    response = page ? new Response(profilePage(false, nonce, message), { status: status2, headers: { "content-type": "text/html; charset=utf-8" } }) : privateJson({ error: message }, status2);
  } finally {
    db?.close();
  }
  response.headers.delete("access-control-allow-origin");
  response.headers.delete("access-control-allow-methods");
  response.headers.delete("access-control-allow-headers");
  response.headers.set("cache-control", "no-store, private");
  response.headers.set("vary", "Cookie");
  response.headers.set("content-security-policy", `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}
__name(profile, "profile");
async function administratorAccount(db) {
  let userId;
  try {
    userId = await deploymentRecoveryOwnerUserId(db);
  } catch (error) {
    if (error instanceof HttpError && error.code === "DEPLOYMENT_RECOVERY_NO_OWNER") {
      throw new HttpError(503, "Create the first Yutaka account in the app. That first account automatically becomes the Worker administrator.");
    }
    throw error;
  }
  const row = (await db.execute({
    sql: "SELECT id, username, password_hash, session_version FROM users WHERE id = ?",
    args: [userId]
  })).rows[0];
  if (!row) throw new HttpError(503, "The Worker administrator account is unavailable. Apply the latest database schema and try again.");
  return {
    id: String(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    sessionVersion: Number(row.session_version ?? 0)
  };
}
__name(administratorAccount, "administratorAccount");
function profileCookie(token, maxAge) {
  return `${adminCookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
__name(profileCookie, "profileCookie");
async function readProfileJson(request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "Expected a JSON request.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Invalid JSON body.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}
__name(readProfileJson, "readProfileJson");
async function manageAccounts(request, url, env, db) {
  if (request.method === "GET" && url.pathname === "/profile/api/accounts") {
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    if (!Number.isSafeInteger(page) || page > 1e6) throw new HttpError(400, "Invalid page.");
    const administratorUserId = await deploymentRecoveryOwnerUserId(db);
    const [count, accounts] = await db.batch([
      "SELECT COUNT(*) AS total FROM users",
      { sql: `SELECT id, username, created_at, updated_at,
                CASE WHEN EXISTS (SELECT 1 FROM devices WHERE user_id = users.id AND revoked_at IS NULL) THEN 'active' ELSE 'invited' END AS status
              FROM users
              ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, created_at DESC, id
              LIMIT 50 OFFSET ?`, args: [administratorUserId, (page - 1) * 50] }
    ], "read");
    return privateJson({
      total: Number(count.rows[0].total),
      page,
      pageSize: 50,
      administratorUserId,
      accounts: accounts.rows.map((row) => ({
        id: String(row.id),
        username: String(row.username),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        status: String(row.status),
        isAdministrator: String(row.id) === administratorUserId
      }))
    });
  }
  if (request.method === "POST" && url.pathname === "/profile/api/accounts") {
    const body = await readProfileJson(request);
    const username = normalizeUsername(body.username);
    const password = profilePassword(body.password);
    const now = Date.now();
    const newUserId = crypto.randomUUID();
    const [result] = await db.batch([
      {
        sql: `INSERT INTO users(id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(username) DO NOTHING`,
        args: [newUserId, username, await hashPassword(password, env.JWT_SECRET), now, now]
      },
      { sql: `INSERT OR REPLACE INTO worker_state(key, value) VALUES ('registration_closed', '1')`, args: [] }
    ], "write");
    if (!result.rowsAffected) throw new HttpError(409, "Duplicate username. That username is already in use.");
    await db.execute({
      sql: `INSERT OR IGNORE INTO worker_state(key, value) VALUES ('deployment_owner_user_id', ?)`,
      args: [newUserId]
    });
    return privateJson({ ok: true, message: "Account created." }, 201);
  }
  const match = /^\/profile\/api\/accounts\/([A-Za-z0-9._:-]{3,120})(\/(?:password|username))?$/.exec(url.pathname);
  if (!match) throw new HttpError(404, "Not found.");
  const userId = match[1];
  if (request.method === "POST" && match[2] === "/username") {
    const body = await readProfileJson(request);
    const username = normalizeUsername(body.username);
    let changed;
    try {
      changed = await db.execute({
        sql: "UPDATE users SET username = ?, updated_at = ? WHERE id = ?",
        args: [username, Date.now(), userId]
      });
    } catch (error) {
      const message = databaseErrorMessage(error).toLowerCase();
      if (message.includes("unique") || message.includes("constraint")) {
        throw new HttpError(409, "Duplicate username. That username is already in use.");
      }
      throw error;
    }
    if (!changed.rowsAffected) throw new HttpError(404, "Account no longer exists.");
    return privateJson({ ok: true, message: `Username changed to ${username}.` });
  }
  if (request.method === "POST" && match[2] === "/password") {
    const body = await readProfileJson(request);
    const hash = await hashPassword(profilePassword(body.password), env.JWT_SECRET);
    const now = Date.now();
    const [changed] = await db.batch([
      { sql: "UPDATE users SET password_hash = ?, recovery_key_hash = NULL, session_version = session_version + 1, updated_at = ? WHERE id = ?", args: [hash, now, userId] },
      { sql: "UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", args: [now, userId] },
      { sql: "UPDATE devices SET revoked_at = ? WHERE user_id = ?", args: [now, userId] }
    ], "write");
    if (!changed.rowsAffected) throw new HttpError(404, "Account no longer exists.");
    return privateJson({ ok: true, message: "Password changed. Existing sessions and recovery key revoked." });
  }
  if (request.method === "DELETE" && !match[2]) {
    if (userId === await deploymentRecoveryOwnerUserId(db)) {
      throw new HttpError(409, "The administrator account can only delete itself from Yutaka or /delete-account after confirming its password.");
    }
    await deleteUserAccount(db, userId);
    return privateJson({ ok: true, message: "Account deleted." });
  }
  throw new HttpError(405, "Method not allowed.");
}
__name(manageAccounts, "manageAccounts");
function profilePassword(value) {
  if (typeof value !== "string" || value.length > 256) throw new HttpError(400, "Password must be 8-256 characters.");
  validatePassword(value);
  return value;
}
__name(profilePassword, "profilePassword");
var accountOwnedTables = [
  "profile_media_chunks",
  "profile_media",
  "analytics_pdf_schedules",
  "analytics_upload_settings",
  "google_drive_backup_settings",
  "telegram_backup_settings",
  "processed_operations",
  "sync_changes",
  "sync_entities",
  "refresh_tokens",
  "devices"
];
async function deleteUserAccount(db, userId) {
  const account = (await db.execute({
    sql: "SELECT id, username FROM users WHERE id = ?",
    args: [userId]
  })).rows[0];
  if (!account) throw new HttpError(404, "Account no longer exists.");
  const username = String(account.username);
  const administratorUserId = await deploymentRecoveryOwnerUserId(db);
  const wasAdministrator = administratorUserId === userId;
  const transaction = await db.transaction("write");
  try {
    for (const table of accountOwnedTables) {
      await transaction.execute({ sql: `DELETE FROM ${table} WHERE user_id = ?`, args: [userId] });
    }
    await transaction.execute({
      sql: "DELETE FROM rate_limits WHERE key IN (?, ?, ?)",
      args: [`recover:${username}`, `delete-account:${userId}`, `delete-web:${username}`]
    });
    const deleted = await transaction.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
    if (!deleted.rowsAffected) throw new HttpError(404, "Account no longer exists.");
    if (wasAdministrator) {
      await transaction.execute("DELETE FROM admin_sessions");
      await transaction.execute(`DELETE FROM worker_state WHERE key IN ('deployment_recovery_ciphertext', 'deployment_recovery_iv', 'deployment_recovery_updated_at')`);
      const nextOwner = (await transaction.execute("SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1")).rows[0];
      if (nextOwner) {
        await transaction.execute({
          sql: `INSERT OR REPLACE INTO worker_state(key, value) VALUES ('deployment_owner_user_id', ?)`,
          args: [String(nextOwner.id)]
        });
        await transaction.execute(`INSERT OR REPLACE INTO worker_state(key, value) VALUES ('registration_closed', '1')`);
      } else {
        await transaction.execute(`DELETE FROM worker_state WHERE key IN ('deployment_owner_user_id', 'registration_closed')`);
      }
    }
    const remaining = Number((await transaction.execute("SELECT COUNT(*) AS count FROM users")).rows[0]?.count ?? 0);
    await transaction.commit();
    return { username, wasAdministrator, remainingAccounts: remaining };
  } finally {
    transaction.close();
  }
}
__name(deleteUserAccount, "deleteUserAccount");
function deletionConfirmation(value) {
  const confirmation = String(value ?? "").trim();
  if (confirmation !== "DELETE") throw new HttpError(400, "Type DELETE exactly to confirm account deletion.");
  return confirmation;
}
__name(deletionConfirmation, "deletionConfirmation");
async function deleteOwnAccount(request, env, db, auth) {
  const body = await readJson(request);
  deletionConfirmation(body.confirmation);
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 256) throw new HttpError(400, "Enter your current account password.");
  await enforceRateLimit(db, `delete-account:${auth.userId}`, 6, 15 * 60 * 1e3);
  const row = (await db.execute({
    sql: "SELECT password_hash FROM users WHERE id = ?",
    args: [auth.userId]
  })).rows[0];
  if (!row || !await verifyPassword(password, String(row.password_hash), env.JWT_SECRET)) {
    throw new HttpError(401, "Current password is incorrect.");
  }
  const deleted = await deleteUserAccount(db, auth.userId);
  return privateJson({
    ok: true,
    deleted: true,
    wasAdministrator: deleted.wasAdministrator,
    remainingAccounts: deleted.remainingAccounts,
    registrationReset: deleted.remainingAccounts === 0
  });
}
__name(deleteOwnAccount, "deleteOwnAccount");
async function deleteAccountPortal(request, env, connect = () => createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })) {
  const url = new URL(request.url);
  const nonce = b64urlBytes(crypto.getRandomValues(new Uint8Array(18)));
  let db;
  let response;
  let username = "";
  try {
    validateWorkerConfig(env);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new HttpError(400, "Account deletion requires HTTPS.");
    }
    if (!["GET", "POST"].includes(request.method)) throw new HttpError(405, "Method not allowed.");
    db = connect();
    if (request.method === "GET") {
      response = new Response(deleteAccountPage({ nonce }), { headers: { "content-type": "text/html; charset=utf-8" } });
    } else {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) throw new HttpError(403, "This deletion request must be submitted from this Worker.");
      const contentType = request.headers.get("content-type")?.split(";")[0].trim() ?? "";
      if (contentType !== "application/x-www-form-urlencoded") throw new HttpError(415, "Expected the account deletion form.");
      const raw = await request.text();
      if (raw.length > 4096) throw new HttpError(413, "Request is too large.");
      const form = new URLSearchParams(raw);
      username = normalizeUsername(form.get("username"));
      const password = String(form.get("password") ?? "");
      deletionConfirmation(form.get("confirmation"));
      if (password.length < 8 || password.length > 256) throw new HttpError(400, "Enter your current account password.");
      await enforceRateLimit(db, `delete-web:${username}`, 6, 15 * 60 * 1e3);
      await enforceRateLimit(db, `delete-web:ip:${request.headers.get("cf-connecting-ip") ?? "local"}`, 12, 15 * 60 * 1e3);
      const row = (await db.execute({
        sql: "SELECT id, password_hash FROM users WHERE username = ?",
        args: [username]
      })).rows[0];
      if (!row || !await verifyPassword(password, String(row.password_hash), env.JWT_SECRET)) {
        throw new HttpError(401, "Username or password is incorrect.");
      }
      await deleteUserAccount(db, String(row.id));
      response = new Response(deleteAccountPage({ nonce, success: true, username }), { headers: { "content-type": "text/html; charset=utf-8" } });
    }
  } catch (error) {
    const status2 = error instanceof HttpError ? error.status : 503;
    const message = error instanceof HttpError ? error.message : "Server/database error. Try again; if it persists, check the Worker configuration.";
    response = new Response(deleteAccountPage({ nonce, error: message, username }), {
      status: status2,
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  } finally {
    db?.close();
  }
  response.headers.set("cache-control", "no-store, private");
  response.headers.set("content-security-policy", `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "same-origin");
  return response;
}
__name(deleteAccountPortal, "deleteAccountPortal");
var telegramBackupEntityTables = [
  "accounts",
  "categories",
  "notes",
  "planned_purchases",
  "subscriptions",
  "transactions",
  "budgets",
  "budget_accounts",
  "budget_categories",
  "loan_contacts",
  "loans",
  "loan_payments"
];
var yutakaBackupCompatibilityKey = "YOUR_SECRET_PASSWORD";
async function telegramBackupSettings(env, db, auth) {
  const settings = await readTelegramBackupSettings(db, auth.userId);
  return privateJson({ ok: true, settings: publicTelegramBackupSettings(settings) });
}
__name(telegramBackupSettings, "telegramBackupSettings");
async function saveTelegramBackupSettings(request, env, db, auth) {
  const body = await readJson(request);
  const existing = await readTelegramBackupSettings(db, auth.userId);
  const enabled = body.enabled === true;
  const botToken = String(body.botToken ?? "").trim();
  const chatId = normalizeTelegramChatId(body.chatId ?? existing.chatId);
  const frequency = normalizeTelegramBackupFrequency(body.frequency ?? existing.frequency);
  const hour = integerInRange(body.hour, existing.hour, 0, 23, "hour");
  const minute = integerInRange(body.minute, existing.minute, 0, 59, "minute");
  const weekday = integerInRange(body.weekday, existing.weekday, 1, 7, "weekday");
  const monthDay = integerInRange(body.monthDay, existing.monthDay, 1, 31, "monthDay");
  const timezoneOffsetMinutes = integerInRange(
    body.timezoneOffsetMinutes,
    existing.timezoneOffsetMinutes,
    -840,
    840,
    "timezoneOffsetMinutes"
  );
  let encryptedToken = existing.encryptedToken;
  let tokenIv = existing.tokenIv;
  if (botToken) {
    validateTelegramBotToken(botToken);
    const encrypted = await encryptTelegramBotToken(env.JWT_SECRET, botToken);
    encryptedToken = encrypted.ciphertext;
    tokenIv = encrypted.iv;
  }
  if (enabled && !encryptedToken) throw new HttpError(400, "Enter a Telegram bot token before enabling backups.");
  if (enabled && !chatId) throw new HttpError(400, "Enter a Telegram group or channel Chat ID before enabling backups.");
  const telegramPdfSchedule = await readAnalyticsPdfSchedule(db, auth.userId, "telegram");
  if (telegramPdfSchedule.enabled && (!encryptedToken || !chatId)) {
    throw new HttpError(409, "Keep the Telegram bot token and destination configured while automatic Telegram report uploads are enabled.");
  }
  await assertScheduledUploadSeparation(db, auth.userId, void 0, { enabled, hour, minute });
  const nextDueAt = enabled ? nextTelegramBackupDueAt({ frequency, hour, minute, weekday, monthDay, timezoneOffsetMinutes }, Date.now()) : null;
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO telegram_backup_settings(
            user_id, enabled, bot_token_encrypted, bot_token_iv, chat_id, frequency,
            hour, minute, weekday, month_day, timezone_offset_minutes, next_due_at,
            last_sent_at, last_attempt_at, last_error, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            enabled = excluded.enabled,
            bot_token_encrypted = excluded.bot_token_encrypted,
            bot_token_iv = excluded.bot_token_iv,
            chat_id = excluded.chat_id,
            frequency = excluded.frequency,
            hour = excluded.hour,
            minute = excluded.minute,
            weekday = excluded.weekday,
            month_day = excluded.month_day,
            timezone_offset_minutes = excluded.timezone_offset_minutes,
            next_due_at = excluded.next_due_at,
            last_error = NULL,
            updated_at = excluded.updated_at`,
    args: [
      auth.userId,
      enabled ? 1 : 0,
      encryptedToken || null,
      tokenIv || null,
      chatId,
      frequency,
      hour,
      minute,
      weekday,
      monthDay,
      timezoneOffsetMinutes,
      nextDueAt,
      existing.lastSentAt,
      existing.lastAttemptAt,
      null,
      now
    ]
  });
  const saved = await readTelegramBackupSettings(db, auth.userId);
  return privateJson({ ok: true, settings: publicTelegramBackupSettings(saved) });
}
__name(saveTelegramBackupSettings, "saveTelegramBackupSettings");
async function testTelegramBackup(request, env, db, auth) {
  const body = await readJson(request);
  const settings = await readTelegramBackupSettings(db, auth.userId);
  const suppliedToken = String(body.botToken ?? "").trim();
  const token = suppliedToken || (settings.encryptedToken ? await decryptTelegramBotToken(env.JWT_SECRET, settings.encryptedToken, settings.tokenIv) : "");
  const suppliedChatId = String(body.chatId ?? "").trim();
  const chatId = normalizeTelegramChatId(suppliedChatId || settings.chatId);
  if (!token) throw new HttpError(400, "Enter or save a Telegram bot token first.");
  validateTelegramBotToken(token);
  if (!chatId) throw new HttpError(400, "Enter a Telegram group or channel Chat ID first.");
  await telegramApiJson(token, "getMe", {});
  await telegramApiJson(token, "sendMessage", {
    chat_id: chatId,
    text: "Yutaka self-hosted Telegram backup is connected.",
    disable_web_page_preview: true
  });
  return privateJson({ ok: true });
}
__name(testTelegramBackup, "testTelegramBackup");
async function sendTelegramBackupNow(env, db, auth) {
  const settings = await readTelegramBackupSettings(db, auth.userId);
  if (!settings.encryptedToken || !settings.chatId) {
    throw new HttpError(400, "Save the Telegram bot token and destination first.");
  }
  const result = await deliverTelegramBackupForUser(env, db, auth.userId, settings, false);
  return privateJson({ ok: true, ...result, settings: publicTelegramBackupSettings(await readTelegramBackupSettings(db, auth.userId)) });
}
__name(sendTelegramBackupNow, "sendTelegramBackupNow");
async function runDueTelegramBackups(env, db) {
  const now = Date.now();
  const rows = (await db.execute({
    sql: `SELECT user_id, enabled, bot_token_encrypted, bot_token_iv, chat_id, frequency,
                 hour, minute, weekday, month_day, timezone_offset_minutes, next_due_at,
                 last_sent_at, last_attempt_at, last_error
          FROM telegram_backup_settings
          WHERE enabled = 1 AND next_due_at IS NOT NULL AND next_due_at <= ?
          ORDER BY next_due_at
          LIMIT 20`,
    args: [now]
  })).rows;
  for (const row of rows) {
    const settings = telegramBackupSettingsFromRow(row);
    if (!settings.encryptedToken || !settings.chatId || settings.nextDueAt == null) continue;
    const claimedDueAt = settings.nextDueAt;
    const nextDueAt = nextTelegramBackupDueAt(settings, now + 6e4);
    const claimed = await db.execute({
      sql: `UPDATE telegram_backup_settings
            SET next_due_at = ?, last_attempt_at = ?, updated_at = ?
            WHERE user_id = ? AND enabled = 1 AND next_due_at = ?`,
      args: [nextDueAt, now, now, settings.userId, claimedDueAt]
    });
    if (claimed.rowsAffected !== 1) continue;
    settings.nextDueAt = nextDueAt;
    settings.lastAttemptAt = now;
    try {
      await deliverTelegramBackupForUser(env, db, settings.userId, settings, true);
    } catch (error) {
      console.error("Telegram backup delivery failed", {
        userId: settings.userId,
        error: safeTelegramError(error)
      });
    }
  }
}
__name(runDueTelegramBackups, "runDueTelegramBackups");
async function deliverTelegramBackupForUser(env, db, userId, settings, scheduled) {
  const attemptedAt = Date.now();
  if (!scheduled) {
    await db.execute({
      sql: "UPDATE telegram_backup_settings SET last_attempt_at = ?, last_error = NULL, updated_at = ? WHERE user_id = ?",
      args: [attemptedAt, attemptedAt, userId]
    });
  }
  try {
    const token = await decryptTelegramBotToken(env.JWT_SECRET, settings.encryptedToken, settings.tokenIv);
    const { fileName, contents } = await buildTelegramBackupFile(db, userId);
    await sendTelegramBackupDocument(token, settings.chatId, fileName, contents);
    const sentAt = Date.now();
    await db.execute({
      sql: `UPDATE telegram_backup_settings
            SET last_sent_at = ?, last_attempt_at = ?, last_error = NULL, updated_at = ?
            WHERE user_id = ?`,
      args: [sentAt, attemptedAt, sentAt, userId]
    });
    return { fileName, sentAt };
  } catch (error) {
    const message = safeTelegramError(error);
    await db.execute({
      sql: `UPDATE telegram_backup_settings
            SET last_attempt_at = ?, last_error = ?, updated_at = ?
            WHERE user_id = ?`,
      args: [attemptedAt, message, Date.now(), userId]
    });
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, message);
  }
}
__name(deliverTelegramBackupForUser, "deliverTelegramBackupForUser");
async function readCloudFinanceSnapshot(db, userId) {
  await recoverLegacyResetData(db, userId);
  const database = {};
  for (const table of telegramBackupEntityTables) database[table] = [];
  let preferences = {};
  const entityRows = (await db.execute({
    sql: `SELECT entity_type, entity_id, payload_json
          FROM sync_entities
          WHERE user_id = ? AND deleted_at IS NULL
          ORDER BY entity_type, entity_id`,
    args: [userId]
  })).rows;
  applyTelegramBackupRows(entityRows, database, (value) => {
    preferences = value;
  });
  if (telegramBackupFinanceRecordCount(database) === 0) {
    const historyRows = (await db.execute({
      sql: `WITH last_reset AS (
              SELECT COALESCE(MAX(sequence), 0) AS reset_sequence
              FROM sync_changes
              WHERE user_id = ? AND entity_type = '__reset__'
            ),
            ranked AS (
              SELECT entity_type, entity_id, operation, payload_json, sequence,
                     ROW_NUMBER() OVER (
                       PARTITION BY entity_type, entity_id
                       ORDER BY sequence DESC
                     ) AS rn
              FROM sync_changes, last_reset
              WHERE user_id = ?
                AND sequence > last_reset.reset_sequence
                AND entity_type <> '__reset__'
            )
            SELECT entity_type, entity_id, payload_json
            FROM ranked
            WHERE rn = 1 AND operation = 'upsert'
            ORDER BY entity_type, entity_id`,
      args: [userId, userId]
    })).rows;
    applyTelegramBackupRows(historyRows, database, (value) => {
      preferences = value;
    });
  }
  return {
    database,
    preferences,
    financeRecordCount: telegramBackupFinanceRecordCount(database)
  };
}
__name(readCloudFinanceSnapshot, "readCloudFinanceSnapshot");
async function buildTelegramBackupFile(db, userId) {
  const snapshot = await readCloudFinanceSnapshot(db, userId);
  const { database, preferences, financeRecordCount } = snapshot;
  if (financeRecordCount === 0) {
    throw new HttpError(
      409,
      "The cloud copy contains no finance records, so an empty Telegram backup was not sent. Open Yutaka on a device with your data, use Upload local changes once, then create the backup again."
    );
  }
  const createdAt = /* @__PURE__ */ new Date();
  const recordCounts = Object.fromEntries(
    telegramBackupEntityTables.map((table) => [table, database[table].length])
  );
  const payload = {
    version: 7,
    backup_type: "telegram-cloud",
    created_at: createdAt.toISOString(),
    database,
    preferences,
    record_counts: recordCounts,
    finance_record_count: financeRecordCount
  };
  const fileName = `yutaka_telegram_${compactUtcTimestamp(createdAt)}.yutakabackup`;
  return { fileName, contents: encodeYutakaBackup(payload) };
}
__name(buildTelegramBackupFile, "buildTelegramBackupFile");
async function buildGoogleDriveBackupFile(db, userId) {
  const snapshot = await readCloudFinanceSnapshot(db, userId);
  const { database, preferences, financeRecordCount } = snapshot;
  if (financeRecordCount === 0) {
    throw new HttpError(
      409,
      "The cloud copy contains no finance records, so an empty Google Drive backup was not uploaded. Open Yutaka on a device with your data, use Upload local changes once, then create the backup again."
    );
  }
  const createdAt = /* @__PURE__ */ new Date();
  const recordCounts = Object.fromEntries(telegramBackupEntityTables.map((table) => [table, database[table].length]));
  const payload = {
    version: 7,
    backup_type: "google-drive-cloud",
    created_at: createdAt.toISOString(),
    database,
    preferences,
    record_counts: recordCounts,
    finance_record_count: financeRecordCount
  };
  const fileName = `yutaka_drive_${compactUtcTimestamp(createdAt)}.yutakabackup`;
  return { fileName, contents: encodeYutakaBackup(payload) };
}
__name(buildGoogleDriveBackupFile, "buildGoogleDriveBackupFile");
function applyTelegramBackupRows(rows, database, setPreferences) {
  const rowIndexes = /* @__PURE__ */ new Map();
  for (const table of telegramBackupEntityTables) rowIndexes.set(table, /* @__PURE__ */ new Map());
  for (const row of rows) {
    const entityType = String(row.entity_type ?? "");
    const entityId = String(row.entity_id ?? "");
    if (!row.payload_json) continue;
    let payload;
    try {
      payload = JSON.parse(String(row.payload_json));
    } catch {
      continue;
    }
    if (entityType === "preferences") {
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        setPreferences(payload);
      }
      continue;
    }
    if (!telegramBackupEntityTables.includes(entityType)) continue;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) continue;
    const target = database[entityType];
    const indexes = rowIndexes.get(entityType);
    const stableId = entityId || telegramBackupRowIdentity(entityType, payload);
    if (!stableId) {
      target.push(payload);
      continue;
    }
    const existingIndex = indexes.get(stableId);
    if (existingIndex == null) {
      indexes.set(stableId, target.length);
      target.push(payload);
    } else {
      target[existingIndex] = payload;
    }
  }
}
__name(applyTelegramBackupRows, "applyTelegramBackupRows");
function telegramBackupRowIdentity(entityType, payload) {
  if (entityType === "budget_accounts") {
    return `${String(payload.budget_id ?? "")}\0${String(payload.account_id ?? "")}`;
  }
  if (entityType === "budget_categories") {
    return `${String(payload.budget_id ?? "")}\0${String(payload.category_id ?? "")}`;
  }
  return String(payload.id ?? "");
}
__name(telegramBackupRowIdentity, "telegramBackupRowIdentity");
function telegramBackupFinanceRecordCount(database) {
  return telegramBackupEntityTables.reduce((total, table) => total + (database[table]?.length ?? 0), 0);
}
__name(telegramBackupFinanceRecordCount, "telegramBackupFinanceRecordCount");
async function sendTelegramBackupDocument(token, chatId, fileName, contents) {
  if (contents.length > 45 * 1024 * 1024) {
    throw new HttpError(413, "The generated Telegram backup is too large to upload safely. Download a local backup instead.");
  }
  await sendTelegramDocument(
    token,
    chatId,
    fileName,
    new Blob([contents], { type: "application/octet-stream" }),
    `Yutaka cloud backup
${(/* @__PURE__ */ new Date()).toISOString().replace("T", " ").replace(".000Z", " UTC")}`
  );
}
__name(sendTelegramBackupDocument, "sendTelegramBackupDocument");
async function sendTelegramAnalyticsDocument(token, chatId, fileName, bytes, caption, mimeType = analyticsReportMimeType(fileName)) {
  if (bytes.byteLength > analyticsReportMaxBytes) throw new HttpError(413, "Analytics report must be 10 MB or smaller.");
  await sendTelegramDocument(token, chatId, fileName, new Blob([bytes], { type: mimeType }), caption);
}
__name(sendTelegramAnalyticsDocument, "sendTelegramAnalyticsDocument");
async function sendTelegramDocument(token, chatId, fileName, document, caption) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("caption", caption.slice(0, 1024));
      form.set("document", document, fileName);
      const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: "POST",
        body: form
      });
      if (response.ok) return;
      const text = await response.text();
      throw new Error(telegramApiFailure(response.status, text));
    } catch (error) {
      if (attempt >= 3) throw error;
      await delay(attempt * 1200);
    }
  }
}
__name(sendTelegramDocument, "sendTelegramDocument");
async function telegramApiJson(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) throw new HttpError(502, telegramApiFailure(response.status, text));
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
}
__name(telegramApiJson, "telegramApiJson");
function telegramApiFailure(status2, body) {
  try {
    const parsed = JSON.parse(body);
    const description = cleanText(parsed.description, 180);
    if (description) return `Telegram rejected the request: ${description}`;
  } catch {
  }
  return `Telegram API returned HTTP ${status2}.`;
}
__name(telegramApiFailure, "telegramApiFailure");
async function readTelegramBackupSettings(db, userId) {
  const row = (await db.execute({
    sql: `SELECT user_id, enabled, bot_token_encrypted, bot_token_iv, chat_id, frequency,
                 hour, minute, weekday, month_day, timezone_offset_minutes, next_due_at,
                 last_sent_at, last_attempt_at, last_error
          FROM telegram_backup_settings WHERE user_id = ?`,
    args: [userId]
  })).rows[0];
  if (!row) {
    return {
      userId,
      enabled: false,
      tokenConfigured: false,
      encryptedToken: "",
      tokenIv: "",
      chatId: "",
      frequency: "daily",
      hour: 2,
      minute: 0,
      weekday: 7,
      monthDay: 1,
      timezoneOffsetMinutes: 0,
      nextDueAt: null,
      lastSentAt: null,
      lastAttemptAt: null,
      lastError: null
    };
  }
  return telegramBackupSettingsFromRow(row);
}
__name(readTelegramBackupSettings, "readTelegramBackupSettings");
function telegramBackupSettingsFromRow(row) {
  return {
    userId: String(row.user_id ?? ""),
    enabled: Number(row.enabled ?? 0) === 1,
    tokenConfigured: Boolean(row.bot_token_encrypted),
    encryptedToken: String(row.bot_token_encrypted ?? ""),
    tokenIv: String(row.bot_token_iv ?? ""),
    chatId: String(row.chat_id ?? ""),
    frequency: normalizeTelegramBackupFrequency(row.frequency),
    hour: integerInRange(row.hour, 2, 0, 23, "hour"),
    minute: integerInRange(row.minute, 0, 0, 59, "minute"),
    weekday: integerInRange(row.weekday, 7, 1, 7, "weekday"),
    monthDay: integerInRange(row.month_day, 1, 1, 31, "monthDay"),
    timezoneOffsetMinutes: integerInRange(row.timezone_offset_minutes, 0, -840, 840, "timezoneOffsetMinutes"),
    nextDueAt: nullableInteger(row.next_due_at),
    lastSentAt: nullableInteger(row.last_sent_at),
    lastAttemptAt: nullableInteger(row.last_attempt_at),
    lastError: row.last_error == null ? null : String(row.last_error)
  };
}
__name(telegramBackupSettingsFromRow, "telegramBackupSettingsFromRow");
function publicTelegramBackupSettings(settings) {
  return {
    enabled: settings.enabled,
    tokenConfigured: settings.tokenConfigured,
    chatId: settings.chatId,
    frequency: settings.frequency,
    hour: settings.hour,
    minute: settings.minute,
    weekday: settings.weekday,
    monthDay: settings.monthDay,
    timezoneOffsetMinutes: settings.timezoneOffsetMinutes,
    nextDueAt: settings.nextDueAt,
    lastSentAt: settings.lastSentAt,
    lastError: settings.lastError
  };
}
__name(publicTelegramBackupSettings, "publicTelegramBackupSettings");
async function googleDriveBackupSettings(db, auth) {
  return privateJson({ ok: true, settings: publicGoogleDriveBackupSettings(await readGoogleDriveBackupSettings(db, auth.userId)) });
}
__name(googleDriveBackupSettings, "googleDriveBackupSettings");
async function saveGoogleDriveBackupSettings(request, db, auth) {
  const body = await readJson(request);
  const existing = await readGoogleDriveBackupSettings(db, auth.userId);
  const enabled = body.enabled === true;
  const frequency = normalizeTelegramBackupFrequency(body.frequency ?? existing.frequency);
  const hour = integerInRange(body.hour, existing.hour, 0, 23, "hour");
  const minute = integerInRange(body.minute, existing.minute, 0, 59, "minute");
  const weekday = integerInRange(body.weekday, existing.weekday, 1, 7, "weekday");
  const monthDay = integerInRange(body.monthDay, existing.monthDay, 1, 31, "monthDay");
  const timezoneOffsetMinutes = integerInRange(body.timezoneOffsetMinutes, existing.timezoneOffsetMinutes, -840, 840, "timezoneOffsetMinutes");
  if (enabled) {
    const drive = await readGoogleDriveAnalyticsSettings(db, auth.userId);
    if (!drive.connected) throw new HttpError(400, "Connect Google Drive in Settings > Credential before enabling cloud backups.");
  }
  const candidate = {
    userId: auth.userId,
    enabled,
    frequency,
    hour,
    minute,
    weekday,
    monthDay,
    timezoneOffsetMinutes,
    nextDueAt: enabled ? nextTelegramBackupDueAt({ frequency, hour, minute, weekday, monthDay, timezoneOffsetMinutes }, Date.now()) : null,
    lastSentAt: existing.lastSentAt,
    lastAttemptAt: existing.lastAttemptAt,
    lastError: null
  };
  await assertScheduledUploadSeparation(db, auth.userId, void 0, void 0, candidate);
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO google_drive_backup_settings(
            user_id, enabled, frequency, hour, minute, weekday, month_day, timezone_offset_minutes,
            next_due_at, last_sent_at, last_attempt_at, last_error, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            enabled = excluded.enabled,
            frequency = excluded.frequency,
            hour = excluded.hour,
            minute = excluded.minute,
            weekday = excluded.weekday,
            month_day = excluded.month_day,
            timezone_offset_minutes = excluded.timezone_offset_minutes,
            next_due_at = excluded.next_due_at,
            last_error = NULL,
            updated_at = excluded.updated_at`,
    args: [
      auth.userId,
      enabled ? 1 : 0,
      frequency,
      hour,
      minute,
      weekday,
      monthDay,
      timezoneOffsetMinutes,
      candidate.nextDueAt,
      existing.lastSentAt,
      existing.lastAttemptAt,
      null,
      now
    ]
  });
  return privateJson({ ok: true, settings: publicGoogleDriveBackupSettings(await readGoogleDriveBackupSettings(db, auth.userId)), minimumSpacingMinutes: 5 });
}
__name(saveGoogleDriveBackupSettings, "saveGoogleDriveBackupSettings");
async function sendGoogleDriveBackupNow(env, db, auth) {
  const drive = await readGoogleDriveAnalyticsSettings(db, auth.userId);
  if (!drive.connected) throw new HttpError(400, "Connect Google Drive in Settings > Credential first.");
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO google_drive_backup_settings(user_id, updated_at)
          VALUES (?, ?)
          ON CONFLICT(user_id) DO NOTHING`,
    args: [auth.userId, now]
  });
  const settings = await readGoogleDriveBackupSettings(db, auth.userId);
  const result = await deliverGoogleDriveBackupForUser(env, db, auth.userId, settings, false);
  return privateJson({ ok: true, ...result, settings: publicGoogleDriveBackupSettings(await readGoogleDriveBackupSettings(db, auth.userId)) });
}
__name(sendGoogleDriveBackupNow, "sendGoogleDriveBackupNow");
async function runDueGoogleDriveBackups(env, db) {
  const now = Date.now();
  const rows = (await db.execute({
    sql: `SELECT user_id, enabled, frequency, hour, minute, weekday, month_day, timezone_offset_minutes,
                 next_due_at, last_sent_at, last_attempt_at, last_error
          FROM google_drive_backup_settings
          WHERE enabled = 1 AND next_due_at IS NOT NULL AND next_due_at <= ?
          ORDER BY next_due_at
          LIMIT 20`,
    args: [now]
  })).rows;
  for (const row of rows) {
    const settings = googleDriveBackupSettingsFromRow(row);
    if (settings.nextDueAt == null) continue;
    const claimedDueAt = settings.nextDueAt;
    const nextDueAt = nextTelegramBackupDueAt(settings, now + 6e4);
    const claimed = await db.execute({
      sql: `UPDATE google_drive_backup_settings
            SET next_due_at = ?, last_attempt_at = ?, updated_at = ?
            WHERE user_id = ? AND enabled = 1 AND next_due_at = ?`,
      args: [nextDueAt, now, now, settings.userId, claimedDueAt]
    });
    if (claimed.rowsAffected !== 1) continue;
    settings.nextDueAt = nextDueAt;
    settings.lastAttemptAt = now;
    try {
      await deliverGoogleDriveBackupForUser(env, db, settings.userId, settings, true);
    } catch (error) {
      console.error("Google Drive backup delivery failed", { userId: settings.userId, error: safeExternalUploadError(error) });
    }
  }
}
__name(runDueGoogleDriveBackups, "runDueGoogleDriveBackups");
async function deliverGoogleDriveBackupForUser(env, db, userId, settings, scheduled) {
  const attemptedAt = Date.now();
  if (!scheduled) {
    await db.execute({
      sql: "UPDATE google_drive_backup_settings SET last_attempt_at = ?, last_error = NULL, updated_at = ? WHERE user_id = ?",
      args: [attemptedAt, attemptedAt, userId]
    });
  }
  try {
    const drive = await readGoogleDriveAnalyticsSettings(db, userId);
    if (!drive.connected) throw new HttpError(400, "Google Drive is no longer connected.");
    const accessToken = await googleDriveAccessToken(env, drive);
    const folder = await resolveGoogleBackupFolder(accessToken, drive.folderId);
    const { fileName, contents } = await buildGoogleDriveBackupFile(db, userId);
    const bytes = new Uint8Array(enc.encode(contents));
    await googleDriveUploadDocument(accessToken, folder.id, fileName, bytes, "application/octet-stream");
    const uploadedAt = Date.now();
    await db.execute({
      sql: `UPDATE google_drive_backup_settings
            SET last_sent_at = ?, last_attempt_at = ?, last_error = NULL, updated_at = ? WHERE user_id = ?`,
      args: [uploadedAt, attemptedAt, uploadedAt, userId]
    });
    return { fileName, uploadedAt };
  } catch (error) {
    const message = safeExternalUploadError(error);
    const failedAt = Date.now();
    if (error instanceof HttpError && error.status === 401) {
      await db.batch([
        {
          sql: `UPDATE analytics_upload_settings
                SET google_refresh_token_encrypted = NULL, google_refresh_token_iv = NULL,
                    google_account_email = '', google_connected_at = NULL, google_last_error = ?, updated_at = ?
                WHERE user_id = ?`,
          args: [message, failedAt, userId]
        },
        {
          sql: `UPDATE google_drive_backup_settings
                SET enabled = 0, next_due_at = NULL, last_attempt_at = ?, last_error = ?, updated_at = ?
                WHERE user_id = ?`,
          args: [attemptedAt, message, failedAt, userId]
        }
      ], "write");
    } else {
      await db.execute({
        sql: `UPDATE google_drive_backup_settings
              SET last_attempt_at = ?, last_error = ?, updated_at = ? WHERE user_id = ?`,
        args: [attemptedAt, message, failedAt, userId]
      });
    }
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, message);
  }
}
__name(deliverGoogleDriveBackupForUser, "deliverGoogleDriveBackupForUser");
async function readGoogleDriveBackupSettings(db, userId) {
  const row = (await db.execute({
    sql: `SELECT user_id, enabled, frequency, hour, minute, weekday, month_day, timezone_offset_minutes,
                 next_due_at, last_sent_at, last_attempt_at, last_error
          FROM google_drive_backup_settings WHERE user_id = ?`,
    args: [userId]
  })).rows[0];
  if (!row) {
    return {
      userId,
      enabled: false,
      frequency: "daily",
      hour: 2,
      minute: 5,
      weekday: 7,
      monthDay: 1,
      timezoneOffsetMinutes: 0,
      nextDueAt: null,
      lastSentAt: null,
      lastAttemptAt: null,
      lastError: null
    };
  }
  return googleDriveBackupSettingsFromRow(row);
}
__name(readGoogleDriveBackupSettings, "readGoogleDriveBackupSettings");
function googleDriveBackupSettingsFromRow(row) {
  return {
    userId: String(row.user_id ?? ""),
    enabled: Number(row.enabled ?? 0) === 1,
    frequency: normalizeTelegramBackupFrequency(row.frequency),
    hour: integerInRange(row.hour, 2, 0, 23, "hour"),
    minute: integerInRange(row.minute, 5, 0, 59, "minute"),
    weekday: integerInRange(row.weekday, 7, 1, 7, "weekday"),
    monthDay: integerInRange(row.month_day, 1, 1, 31, "monthDay"),
    timezoneOffsetMinutes: integerInRange(row.timezone_offset_minutes, 0, -840, 840, "timezoneOffsetMinutes"),
    nextDueAt: nullableInteger(row.next_due_at),
    lastSentAt: nullableInteger(row.last_sent_at),
    lastAttemptAt: nullableInteger(row.last_attempt_at),
    lastError: row.last_error == null ? null : String(row.last_error)
  };
}
__name(googleDriveBackupSettingsFromRow, "googleDriveBackupSettingsFromRow");
function publicGoogleDriveBackupSettings(settings) {
  return {
    enabled: settings.enabled,
    frequency: settings.frequency,
    hour: settings.hour,
    minute: settings.minute,
    weekday: settings.weekday,
    monthDay: settings.monthDay,
    timezoneOffsetMinutes: settings.timezoneOffsetMinutes,
    nextDueAt: settings.nextDueAt,
    lastSentAt: settings.lastSentAt,
    lastError: settings.lastError
  };
}
__name(publicGoogleDriveBackupSettings, "publicGoogleDriveBackupSettings");
var analyticsGoogleDriveFolderName = "Yutaka Analytics";
var backupGoogleDriveFolderName = "Yutaka Backup";
var analyticsReportMaxBytes = 10 * 1024 * 1024;
async function googleDriveAnalyticsSettings(db, auth) {
  return privateJson({
    ok: true,
    settings: publicGoogleDriveAnalyticsSettings(await readGoogleDriveAnalyticsSettings(db, auth.userId))
  });
}
__name(googleDriveAnalyticsSettings, "googleDriveAnalyticsSettings");
async function saveGoogleDriveAnalyticsSettings(request, env, db, auth) {
  const body = await readJson(request);
  const existing = await readGoogleDriveAnalyticsSettings(db, auth.userId);
  const clientId = String(body.clientId ?? existing.clientId).trim();
  if (!/^[A-Za-z0-9._-]{10,220}\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new HttpError(400, "Enter a valid Google OAuth Web application Client ID.");
  }
  const suppliedSecret = String(body.clientSecret ?? "").trim();
  if (suppliedSecret.length > 512) throw new HttpError(400, "Google OAuth Client Secret is too long.");
  const folderId = normalizeGoogleDriveFolderId(body.folderId ?? existing.folderId);
  let encryptedClientSecret = existing.encryptedClientSecret;
  let clientSecretIv = existing.clientSecretIv;
  if (suppliedSecret) {
    const encrypted = await encryptWorkerSecret(env.JWT_SECRET, "google-drive-client-secret", suppliedSecret);
    encryptedClientSecret = encrypted.ciphertext;
    clientSecretIv = encrypted.iv;
  }
  if (!encryptedClientSecret) {
    throw new HttpError(400, "Enter the Google OAuth Web application Client Secret.");
  }
  const clientChanged = existing.clientId.length > 0 && existing.clientId !== clientId;
  const folderChanged = existing.folderId !== folderId;
  const authorizationChanged = clientChanged || folderChanged;
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO analytics_upload_settings(
            user_id, google_client_id, google_client_secret_encrypted, google_client_secret_iv,
            google_refresh_token_encrypted, google_refresh_token_iv, google_account_email, google_folder_id,
            google_connected_at, google_last_upload_at, google_last_error, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            google_client_id = excluded.google_client_id,
            google_client_secret_encrypted = excluded.google_client_secret_encrypted,
            google_client_secret_iv = excluded.google_client_secret_iv,
            google_refresh_token_encrypted = excluded.google_refresh_token_encrypted,
            google_refresh_token_iv = excluded.google_refresh_token_iv,
            google_account_email = excluded.google_account_email,
            google_folder_id = excluded.google_folder_id,
            google_connected_at = excluded.google_connected_at,
            google_last_upload_at = excluded.google_last_upload_at,
            google_last_error = NULL,
            updated_at = excluded.updated_at`,
    args: [
      auth.userId,
      clientId,
      encryptedClientSecret,
      clientSecretIv,
      authorizationChanged ? null : existing.encryptedRefreshToken || null,
      authorizationChanged ? null : existing.refreshTokenIv || null,
      authorizationChanged ? "" : existing.accountEmail,
      folderId,
      authorizationChanged ? null : existing.connectedAt,
      authorizationChanged ? null : existing.lastUploadAt,
      null,
      now
    ]
  });
  return privateJson({
    ok: true,
    settings: publicGoogleDriveAnalyticsSettings(await readGoogleDriveAnalyticsSettings(db, auth.userId))
  });
}
__name(saveGoogleDriveAnalyticsSettings, "saveGoogleDriveAnalyticsSettings");
async function googleDriveAnalyticsConnectUrl(request, env, db, auth) {
  const settings = await readGoogleDriveAnalyticsSettings(db, auth.userId);
  if (!settings.clientId || !settings.encryptedClientSecret) {
    throw new HttpError(400, "Save your Google OAuth Client ID and Client Secret first.");
  }
  const redirectUri = `${new URL(request.url).origin}/v1/analytics-upload/google-drive/callback`;
  const state = await signToken(env.JWT_SECRET, {
    scope: "google-drive-analytics-connect",
    sub: auth.userId,
    exp: Math.floor(Date.now() / 1e3) + 10 * 60,
    nonce: b64urlBytes(crypto.getRandomValues(new Uint8Array(18)))
  });
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", settings.clientId);
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("prompt", "consent");
  authorization.searchParams.set("include_granted_scopes", "true");
  authorization.searchParams.set("scope", settings.folderId ? "openid email https://www.googleapis.com/auth/drive" : "openid email https://www.googleapis.com/auth/drive.file");
  authorization.searchParams.set("state", state);
  return privateJson({ ok: true, authorizationUrl: authorization.toString(), redirectUri });
}
__name(googleDriveAnalyticsConnectUrl, "googleDriveAnalyticsConnectUrl");
async function googleDriveAnalyticsCallback(request, env, db) {
  const url = new URL(request.url);
  try {
    const oauthError = cleanText(url.searchParams.get("error_description") || url.searchParams.get("error"), 240);
    if (oauthError) throw new HttpError(400, `Google authorization was not completed: ${oauthError}`);
    const code = String(url.searchParams.get("code") ?? "").trim();
    const stateToken = String(url.searchParams.get("state") ?? "").trim();
    if (!code || !stateToken) throw new HttpError(400, "Google did not return the required authorization code.");
    const state = await verifyToken(env.JWT_SECRET, stateToken);
    if (state.scope !== "google-drive-analytics-connect") throw new HttpError(401, "Invalid Google Drive connection state.");
    const userId = String(state.sub ?? "");
    if (!userId) throw new HttpError(401, "Invalid Google Drive connection state.");
    const settings = await readGoogleDriveAnalyticsSettings(db, userId);
    if (!settings.clientId || !settings.encryptedClientSecret) {
      throw new HttpError(409, "Google Drive credentials are no longer configured in Yutaka.");
    }
    const clientSecret = await decryptWorkerSecret(
      env.JWT_SECRET,
      "google-drive-client-secret",
      settings.encryptedClientSecret,
      settings.clientSecretIv,
      "The saved Google OAuth Client Secret cannot be decrypted. Re-enter it in Yutaka."
    );
    const redirectUri = `${url.origin}/v1/analytics-upload/google-drive/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: settings.clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      }).toString()
    });
    const tokenText = await tokenResponse.text();
    const tokenData = parseJsonRecord(tokenText);
    if (!tokenResponse.ok) {
      throw new HttpError(502, googleOAuthFailure(tokenResponse.status, tokenData));
    }
    const refreshToken = String(tokenData.refresh_token ?? "").trim();
    const accessToken = String(tokenData.access_token ?? "").trim();
    if (!refreshToken) {
      throw new HttpError(409, "Google did not issue an offline refresh token. Remove Yutaka from your Google account permissions, then connect again.");
    }
    if (!accessToken) throw new HttpError(502, "Google did not return an access token.");
    let accountEmail = "";
    try {
      const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" }
      });
      if (userResponse.ok) {
        const userInfo = parseJsonRecord(await userResponse.text());
        accountEmail = cleanText(userInfo.email, 240);
      }
    } catch {
    }
    if (settings.folderId) {
      await googleDriveFolderById(accessToken, settings.folderId);
    }
    const encryptedRefreshToken = await encryptWorkerSecret(env.JWT_SECRET, "google-drive-refresh-token", refreshToken);
    const now = Date.now();
    await db.execute({
      sql: `UPDATE analytics_upload_settings
            SET google_refresh_token_encrypted = ?, google_refresh_token_iv = ?, google_account_email = ?,
                google_connected_at = ?, google_last_error = NULL, updated_at = ?
            WHERE user_id = ?`,
      args: [encryptedRefreshToken.ciphertext, encryptedRefreshToken.iv, accountEmail, now, now, userId]
    });
    return googleDriveCallbackPage(
      "Google Drive connected",
      accountEmail ? `Yutaka can now upload Analytics reports to ${accountEmail}. You can return to the app.` : "Yutaka can now upload Analytics reports to Google Drive. You can return to the app.",
      true,
      200
    );
  } catch (error) {
    const status2 = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : "Google Drive connection failed. Return to Yutaka and try again.";
    return googleDriveCallbackPage("Google Drive connection failed", message, false, status2);
  }
}
__name(googleDriveAnalyticsCallback, "googleDriveAnalyticsCallback");
async function disconnectGoogleDriveAnalytics(env, db, auth) {
  const settings = await readGoogleDriveAnalyticsSettings(db, auth.userId);
  if (settings.encryptedRefreshToken) {
    try {
      const refreshToken = await decryptWorkerSecret(
        env.JWT_SECRET,
        "google-drive-refresh-token",
        settings.encryptedRefreshToken,
        settings.refreshTokenIv,
        "The saved Google Drive authorization cannot be decrypted."
      );
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken }).toString()
      });
    } catch {
    }
  }
  const now = Date.now();
  await db.batch([
    {
      sql: `UPDATE analytics_upload_settings
            SET google_refresh_token_encrypted = NULL, google_refresh_token_iv = NULL,
                google_account_email = '', google_connected_at = NULL, google_last_error = NULL, updated_at = ?
            WHERE user_id = ?`,
      args: [now, auth.userId]
    },
    {
      sql: `UPDATE analytics_pdf_schedules
            SET enabled = 0, next_due_at = NULL, last_error = NULL, updated_at = ?
            WHERE user_id = ? AND destination = 'googleDrive'`,
      args: [now, auth.userId]
    },
    {
      sql: `UPDATE google_drive_backup_settings
            SET enabled = 0, next_due_at = NULL, last_error = NULL, updated_at = ?
            WHERE user_id = ?`,
      args: [now, auth.userId]
    }
  ], "write");
  return privateJson({
    ok: true,
    settings: publicGoogleDriveAnalyticsSettings(await readGoogleDriveAnalyticsSettings(db, auth.userId))
  });
}
__name(disconnectGoogleDriveAnalytics, "disconnectGoogleDriveAnalytics");
async function uploadAnalyticsPdfToTelegram(request, env, db, auth) {
  const report = await analyticsReportRequest(request);
  const telegram = await readTelegramBackupSettings(db, auth.userId);
  if (!telegram.encryptedToken || !telegram.chatId) {
    throw new HttpError(400, "Configure Telegram credentials in Settings > Credential first.");
  }
  const token = await decryptTelegramBotToken(env.JWT_SECRET, telegram.encryptedToken, telegram.tokenIv);
  const caption = report.caption || `Yutaka Analytics
${(/* @__PURE__ */ new Date()).toISOString().replace("T", " ").replace(".000Z", " UTC")}`;
  await sendTelegramAnalyticsDocument(token, telegram.chatId, report.fileName, report.bytes, caption, report.mimeType);
  return privateJson({ ok: true, destination: "telegram", fileName: report.fileName, format: report.format, sentAt: Date.now() });
}
__name(uploadAnalyticsPdfToTelegram, "uploadAnalyticsPdfToTelegram");
async function uploadAnalyticsPdfToGoogleDrive(request, env, db, auth) {
  const report = await analyticsReportRequest(request);
  const settings = await readGoogleDriveAnalyticsSettings(db, auth.userId);
  if (!settings.connected) throw new HttpError(400, "Connect Google Drive in Settings > Credential first.");
  const attemptedAt = Date.now();
  try {
    const accessToken = await googleDriveAccessToken(env, settings);
    const folder = await resolveGoogleAnalyticsFolder(accessToken, settings.folderId);
    const uploaded = await googleDriveUploadDocument(accessToken, folder.id, report.fileName, report.bytes, report.mimeType);
    const completedAt = Date.now();
    await db.execute({
      sql: `UPDATE analytics_upload_settings
            SET google_last_upload_at = ?, google_last_error = NULL, updated_at = ? WHERE user_id = ?`,
      args: [completedAt, completedAt, auth.userId]
    });
    return privateJson({
      ok: true,
      destination: "google-drive",
      fileName: report.fileName,
      folderName: folder.name,
      folderId: folder.id,
      fileId: uploaded.id,
      webViewLink: uploaded.webViewLink,
      uploadedAt: completedAt
    });
  } catch (error) {
    const message = safeExternalUploadError(error);
    if (error instanceof HttpError && error.status === 401) {
      await db.execute({
        sql: `UPDATE analytics_upload_settings
              SET google_refresh_token_encrypted = NULL, google_refresh_token_iv = NULL,
                  google_account_email = '', google_connected_at = NULL, google_last_error = ?, updated_at = ?
              WHERE user_id = ?`,
        args: [message, attemptedAt, auth.userId]
      });
    } else {
      await db.execute({
        sql: `UPDATE analytics_upload_settings SET google_last_error = ?, updated_at = ? WHERE user_id = ?`,
        args: [message, attemptedAt, auth.userId]
      });
    }
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, message);
  }
}
__name(uploadAnalyticsPdfToGoogleDrive, "uploadAnalyticsPdfToGoogleDrive");
function analyticsReportFormatFromFileName(fileName) {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName);
  return normalizeAnalyticsReportFormat(match?.[1] ?? "");
}
__name(analyticsReportFormatFromFileName, "analyticsReportFormatFromFileName");
function analyticsReportMimeType(value) {
  const format = value === "pdf" || value === "xlsx" || value === "txt" ? value : analyticsReportFormatFromFileName(value);
  if (format === "pdf") return "application/pdf";
  if (format === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "text/plain";
}
__name(analyticsReportMimeType, "analyticsReportMimeType");
function indexOfAscii(bytes, needle) {
  const target = new TextEncoder().encode(needle);
  if (target.byteLength === 0 || target.byteLength > bytes.byteLength) return -1;
  outer: for (let offset = 0; offset <= bytes.byteLength - target.byteLength; offset += 1) {
    for (let index = 0; index < target.byteLength; index += 1) {
      if (bytes[offset + index] !== target[index]) continue outer;
    }
    return offset;
  }
  return -1;
}
__name(indexOfAscii, "indexOfAscii");
async function analyticsReportRequest(request) {
  const body = await readJson(request);
  const fileName = cleanText(body.fileName, 140);
  if (!/^[A-Za-z0-9][A-Za-z0-9._ ()-]{0,130}\.(pdf|xlsx|txt)$/i.test(fileName)) {
    throw new HttpError(400, "Analytics report filename must end in .pdf, .xlsx, or .txt.");
  }
  const format = analyticsReportFormatFromFileName(fileName);
  const contentBase64 = typeof body.contentBase64 === "string" ? body.contentBase64 : "";
  if (!contentBase64 || contentBase64.length > Math.ceil(analyticsReportMaxBytes * 4 / 3) + 16) {
    throw new HttpError(413, "Analytics report must be 10 MB or smaller.");
  }
  let bytes;
  try {
    bytes = bytesFromBase64(contentBase64);
  } catch {
    throw new HttpError(400, "Analytics report payload is invalid.");
  }
  if (bytes.byteLength === 0 || bytes.byteLength > analyticsReportMaxBytes) {
    throw new HttpError(413, "Analytics report must be 10 MB or smaller.");
  }
  if (format === "pdf") {
    if (bytes.byteLength < 5 || String.fromCharCode(...Array.from(bytes.subarray(0, 5))) !== "%PDF-") {
      throw new HttpError(400, "The uploaded Analytics document is not a valid PDF.");
    }
  } else if (format === "xlsx") {
    const hasZipHeader = bytes.byteLength >= 4 && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
    const workbookIndex = indexOfAscii(bytes, "xl/workbook.xml");
    const contentTypesIndex = indexOfAscii(bytes, "[Content_Types].xml");
    if (!hasZipHeader || workbookIndex < 0 || contentTypesIndex < 0) {
      throw new HttpError(400, "The uploaded Analytics document is not a valid XLSX workbook.");
    }
  } else {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (decoded.includes("\0")) throw new Error("binary");
    } catch {
      throw new HttpError(400, "The uploaded Analytics document is not valid UTF-8 text.");
    }
  }
  return { fileName, bytes, caption: cleanText(body.caption, 512), format, mimeType: analyticsReportMimeType(format) };
}
__name(analyticsReportRequest, "analyticsReportRequest");
async function readGoogleDriveAnalyticsSettings(db, userId) {
  const row = (await db.execute({
    sql: `SELECT user_id, google_client_id, google_client_secret_encrypted, google_client_secret_iv,
                 google_refresh_token_encrypted, google_refresh_token_iv, google_account_email, google_folder_id,
                 google_connected_at, google_last_upload_at, google_last_error
          FROM analytics_upload_settings WHERE user_id = ?`,
    args: [userId]
  })).rows[0];
  if (!row) {
    return {
      userId,
      clientId: "",
      clientSecretConfigured: false,
      encryptedClientSecret: "",
      clientSecretIv: "",
      connected: false,
      encryptedRefreshToken: "",
      refreshTokenIv: "",
      accountEmail: "",
      folderId: "",
      connectedAt: null,
      lastUploadAt: null,
      lastError: null
    };
  }
  return googleDriveAnalyticsSettingsFromRow(row);
}
__name(readGoogleDriveAnalyticsSettings, "readGoogleDriveAnalyticsSettings");
function googleDriveAnalyticsSettingsFromRow(row) {
  const encryptedRefreshToken = String(row.google_refresh_token_encrypted ?? "");
  return {
    userId: String(row.user_id ?? ""),
    clientId: String(row.google_client_id ?? ""),
    clientSecretConfigured: Boolean(row.google_client_secret_encrypted),
    encryptedClientSecret: String(row.google_client_secret_encrypted ?? ""),
    clientSecretIv: String(row.google_client_secret_iv ?? ""),
    connected: Boolean(encryptedRefreshToken),
    encryptedRefreshToken,
    refreshTokenIv: String(row.google_refresh_token_iv ?? ""),
    accountEmail: String(row.google_account_email ?? ""),
    folderId: String(row.google_folder_id ?? ""),
    connectedAt: nullableInteger(row.google_connected_at),
    lastUploadAt: nullableInteger(row.google_last_upload_at),
    lastError: row.google_last_error == null ? null : String(row.google_last_error)
  };
}
__name(googleDriveAnalyticsSettingsFromRow, "googleDriveAnalyticsSettingsFromRow");
function publicGoogleDriveAnalyticsSettings(settings) {
  return {
    clientId: settings.clientId,
    clientSecretConfigured: settings.clientSecretConfigured,
    connected: settings.connected,
    accountEmail: settings.accountEmail,
    folderId: settings.folderId,
    folderName: settings.folderId ? "Selected Google Drive folder" : analyticsGoogleDriveFolderName,
    connectedAt: settings.connectedAt,
    lastUploadAt: settings.lastUploadAt,
    lastError: settings.lastError
  };
}
__name(publicGoogleDriveAnalyticsSettings, "publicGoogleDriveAnalyticsSettings");
function normalizeGoogleDriveFolderId(value) {
  const folderId = String(value ?? "").trim();
  if (!folderId) return "";
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(folderId)) {
    throw new HttpError(400, "Enter a valid Google Drive folder ID.");
  }
  return folderId;
}
__name(normalizeGoogleDriveFolderId, "normalizeGoogleDriveFolderId");
function normalizeAnalyticsPdfDestination(value) {
  const normalized = String(value ?? "").trim();
  if (normalized === "telegram" || normalized === "googleDrive") return normalized;
  throw new HttpError(400, "Analytics report destination must be Telegram or Google Drive.");
}
__name(normalizeAnalyticsPdfDestination, "normalizeAnalyticsPdfDestination");
function normalizeAnalyticsPdfReportVariant(value) {
  const normalized = String(value ?? "").trim();
  if (normalized === "summary" || normalized === "transactionHistory") return normalized;
  throw new HttpError(400, "Analytics report type must be Summary or Transaction history.");
}
__name(normalizeAnalyticsPdfReportVariant, "normalizeAnalyticsPdfReportVariant");
function normalizeAnalyticsReportFormat(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pdf" || normalized === "xlsx" || normalized === "txt") return normalized;
  throw new HttpError(400, "Analytics report format must be PDF, XLSX, or TXT.");
}
__name(normalizeAnalyticsReportFormat, "normalizeAnalyticsReportFormat");
function normalizeAnalyticsPdfDateFilter(value) {
  const normalized = String(value ?? "").trim();
  if (normalized === "today" || normalized === "thisWeek" || normalized === "thisMonth" || normalized === "thisYear" || normalized === "allTime" || normalized === "custom") {
    return normalized;
  }
  throw new HttpError(400, "Automatic report date filter must be Today, This Week, This Month, This Year, All Time, or Custom Range.");
}
__name(normalizeAnalyticsPdfDateFilter, "normalizeAnalyticsPdfDateFilter");
function normalizeAnalyticsCustomDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new HttpError(400, "Custom range dates must use YYYY-MM-DD.");
  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new HttpError(400, "Custom range contains an invalid calendar date.");
  }
  return raw;
}
__name(normalizeAnalyticsCustomDate, "normalizeAnalyticsCustomDate");
function compareDateOnly(first, second) {
  return first === second ? 0 : first < second ? -1 : 1;
}
__name(compareDateOnly, "compareDateOnly");
function defaultAnalyticsPdfSchedule(userId, destination) {
  return {
    userId,
    destination,
    enabled: false,
    reportVariant: "summary",
    fileFormat: "pdf",
    dateFilter: "thisMonth",
    customStart: null,
    customEnd: null,
    frequency: "daily",
    hour: destination === "telegram" ? 3 : 4,
    minute: 0,
    weekday: 7,
    monthDay: 1,
    timezoneOffsetMinutes: 0,
    nextDueAt: null,
    lastSentAt: null,
    lastAttemptAt: null,
    lastError: null
  };
}
__name(defaultAnalyticsPdfSchedule, "defaultAnalyticsPdfSchedule");
function analyticsPdfScheduleFromRow(row) {
  const destination = normalizeAnalyticsPdfDestination(row.destination);
  return {
    userId: String(row.user_id ?? ""),
    destination,
    enabled: Number(row.enabled ?? 0) === 1,
    reportVariant: normalizeAnalyticsPdfReportVariant(row.report_variant),
    fileFormat: normalizeAnalyticsReportFormat(row.file_format ?? "pdf"),
    dateFilter: normalizeAnalyticsPdfDateFilter(row.date_filter),
    customStart: normalizeAnalyticsCustomDate(row.custom_start),
    customEnd: normalizeAnalyticsCustomDate(row.custom_end),
    frequency: normalizeTelegramBackupFrequency(row.frequency),
    hour: integerInRange(row.hour, destination === "telegram" ? 3 : 4, 0, 23, "hour"),
    minute: integerInRange(row.minute, 0, 0, 59, "minute"),
    weekday: integerInRange(row.weekday, 7, 1, 7, "weekday"),
    monthDay: integerInRange(row.month_day, 1, 1, 31, "monthDay"),
    timezoneOffsetMinutes: integerInRange(row.timezone_offset_minutes, 0, -840, 840, "timezoneOffsetMinutes"),
    nextDueAt: nullableInteger(row.next_due_at),
    lastSentAt: nullableInteger(row.last_sent_at),
    lastAttemptAt: nullableInteger(row.last_attempt_at),
    lastError: row.last_error == null ? null : String(row.last_error)
  };
}
__name(analyticsPdfScheduleFromRow, "analyticsPdfScheduleFromRow");
async function readAnalyticsPdfSchedule(db, userId, destination) {
  const row = (await db.execute({
    sql: `SELECT user_id, destination, enabled, report_variant, file_format, date_filter, custom_start, custom_end, frequency,
                 hour, minute, weekday, month_day, timezone_offset_minutes, next_due_at,
                 last_sent_at, last_attempt_at, last_error
          FROM analytics_pdf_schedules
          WHERE user_id = ? AND destination = ?`,
    args: [userId, destination]
  })).rows[0];
  return row ? analyticsPdfScheduleFromRow(row) : defaultAnalyticsPdfSchedule(userId, destination);
}
__name(readAnalyticsPdfSchedule, "readAnalyticsPdfSchedule");
function publicAnalyticsPdfSchedule(settings) {
  return {
    destination: settings.destination,
    enabled: settings.enabled,
    reportVariant: settings.reportVariant,
    fileFormat: settings.fileFormat,
    dateFilter: settings.dateFilter,
    customStart: settings.customStart,
    customEnd: settings.customEnd,
    frequency: settings.frequency,
    hour: settings.hour,
    minute: settings.minute,
    weekday: settings.weekday,
    monthDay: settings.monthDay,
    timezoneOffsetMinutes: settings.timezoneOffsetMinutes,
    nextDueAt: settings.nextDueAt,
    lastSentAt: settings.lastSentAt,
    lastError: settings.lastError
  };
}
__name(publicAnalyticsPdfSchedule, "publicAnalyticsPdfSchedule");
async function analyticsPdfSchedules(db, auth) {
  const [telegram, googleDrive] = await Promise.all([
    readAnalyticsPdfSchedule(db, auth.userId, "telegram"),
    readAnalyticsPdfSchedule(db, auth.userId, "googleDrive")
  ]);
  return privateJson({
    ok: true,
    schedules: {
      telegram: publicAnalyticsPdfSchedule(telegram),
      googleDrive: publicAnalyticsPdfSchedule(googleDrive)
    },
    minimumSpacingMinutes: 5
  });
}
__name(analyticsPdfSchedules, "analyticsPdfSchedules");
function scheduledClockDistanceMinutes(first, second) {
  const a = first.hour * 60 + first.minute;
  const b = second.hour * 60 + second.minute;
  const direct = Math.abs(a - b);
  return Math.min(direct, 24 * 60 - direct);
}
__name(scheduledClockDistanceMinutes, "scheduledClockDistanceMinutes");
function formatScheduledClock(clock) {
  return `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
}
__name(formatScheduledClock, "formatScheduledClock");
async function assertScheduledUploadSeparation(db, userId, candidate, telegramBackupCandidate, googleDriveBackupCandidate) {
  const [telegramSchedule, driveSchedule, storedTelegramBackup, storedDriveBackup] = await Promise.all([
    readAnalyticsPdfSchedule(db, userId, "telegram"),
    readAnalyticsPdfSchedule(db, userId, "googleDrive"),
    readTelegramBackupSettings(db, userId),
    readGoogleDriveBackupSettings(db, userId)
  ]);
  const telegram = candidate?.destination === "telegram" ? candidate : telegramSchedule;
  const drive = candidate?.destination === "googleDrive" ? candidate : driveSchedule;
  const telegramBackup = telegramBackupCandidate ?? storedTelegramBackup;
  const driveBackup = googleDriveBackupCandidate ?? storedDriveBackup;
  const clocks = [
    { label: "Telegram report", hour: telegram.hour, minute: telegram.minute, enabled: telegram.enabled },
    { label: "Google Drive report", hour: drive.hour, minute: drive.minute, enabled: drive.enabled },
    { label: "Telegram backup", hour: telegramBackup.hour, minute: telegramBackup.minute, enabled: telegramBackup.enabled },
    { label: "Google Drive backup", hour: driveBackup.hour, minute: driveBackup.minute, enabled: driveBackup.enabled }
  ].filter((item) => item.enabled);
  for (let i = 0; i < clocks.length; i += 1) {
    for (let j = i + 1; j < clocks.length; j += 1) {
      if (scheduledClockDistanceMinutes(clocks[i], clocks[j]) < 5) {
        throw new HttpError(
          409,
          `Automatic uploads must be at least 5 minutes apart. ${clocks[i].label} at ${formatScheduledClock(clocks[i])} conflicts with ${clocks[j].label} at ${formatScheduledClock(clocks[j])}.`
        );
      }
    }
  }
}
__name(assertScheduledUploadSeparation, "assertScheduledUploadSeparation");
async function saveAnalyticsPdfSchedule(request, _env, db, auth, pathname) {
  const destination = normalizeAnalyticsPdfDestination(pathname.split("/").pop());
  const body = await readJson(request);
  const existing = await readAnalyticsPdfSchedule(db, auth.userId, destination);
  const enabled = body.enabled === true;
  const reportVariant = normalizeAnalyticsPdfReportVariant(body.reportVariant ?? existing.reportVariant);
  const fileFormat = normalizeAnalyticsReportFormat(body.fileFormat ?? existing.fileFormat);
  const dateFilter = normalizeAnalyticsPdfDateFilter(body.dateFilter ?? existing.dateFilter);
  const customStart = normalizeAnalyticsCustomDate(body.customStart ?? existing.customStart);
  const customEnd = normalizeAnalyticsCustomDate(body.customEnd ?? existing.customEnd);
  if (dateFilter === "custom") {
    if (!customStart || !customEnd) throw new HttpError(400, "Choose both a custom start date and end date.");
    if (compareDateOnly(customEnd, customStart) < 0) throw new HttpError(400, "Custom range end date cannot be before the start date.");
  }
  const frequency = normalizeTelegramBackupFrequency(body.frequency ?? existing.frequency);
  const hour = integerInRange(body.hour, existing.hour, 0, 23, "hour");
  const minute = integerInRange(body.minute, existing.minute, 0, 59, "minute");
  const weekday = integerInRange(body.weekday, existing.weekday, 1, 7, "weekday");
  const monthDay = integerInRange(body.monthDay, existing.monthDay, 1, 31, "monthDay");
  const timezoneOffsetMinutes = integerInRange(body.timezoneOffsetMinutes, existing.timezoneOffsetMinutes, -840, 840, "timezoneOffsetMinutes");
  if (enabled && destination === "telegram") {
    const telegram = await readTelegramBackupSettings(db, auth.userId);
    if (!telegram.encryptedToken || !telegram.chatId) {
      throw new HttpError(400, "Configure Telegram credentials in Settings > Credential before enabling automatic report uploads.");
    }
  }
  if (enabled && destination === "googleDrive") {
    const drive = await readGoogleDriveAnalyticsSettings(db, auth.userId);
    if (!drive.connected) throw new HttpError(400, "Connect Google Drive in Settings > Credential before enabling automatic report uploads.");
  }
  const candidate = {
    userId: auth.userId,
    destination,
    enabled,
    reportVariant,
    fileFormat,
    dateFilter,
    customStart,
    customEnd,
    frequency,
    hour,
    minute,
    weekday,
    monthDay,
    timezoneOffsetMinutes,
    nextDueAt: enabled ? nextScheduledUploadDueAt({ frequency, hour, minute, weekday, monthDay, timezoneOffsetMinutes }, Date.now()) : null,
    lastSentAt: existing.lastSentAt,
    lastAttemptAt: existing.lastAttemptAt,
    lastError: null
  };
  await assertScheduledUploadSeparation(db, auth.userId, candidate);
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO analytics_pdf_schedules(
            user_id, destination, enabled, report_variant, file_format, date_filter, custom_start, custom_end, frequency,
            hour, minute, weekday, month_day, timezone_offset_minutes, next_due_at,
            last_sent_at, last_attempt_at, last_error, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, destination) DO UPDATE SET
            enabled = excluded.enabled,
            report_variant = excluded.report_variant,
            file_format = excluded.file_format,
            date_filter = excluded.date_filter,
            custom_start = excluded.custom_start,
            custom_end = excluded.custom_end,
            frequency = excluded.frequency,
            hour = excluded.hour,
            minute = excluded.minute,
            weekday = excluded.weekday,
            month_day = excluded.month_day,
            timezone_offset_minutes = excluded.timezone_offset_minutes,
            next_due_at = excluded.next_due_at,
            last_error = NULL,
            updated_at = excluded.updated_at`,
    args: [
      auth.userId,
      destination,
      enabled ? 1 : 0,
      reportVariant,
      fileFormat,
      dateFilter,
      customStart,
      customEnd,
      frequency,
      hour,
      minute,
      weekday,
      monthDay,
      timezoneOffsetMinutes,
      candidate.nextDueAt,
      existing.lastSentAt,
      existing.lastAttemptAt,
      null,
      now
    ]
  });
  return privateJson({ ok: true, schedule: publicAnalyticsPdfSchedule(await readAnalyticsPdfSchedule(db, auth.userId, destination)), minimumSpacingMinutes: 5 });
}
__name(saveAnalyticsPdfSchedule, "saveAnalyticsPdfSchedule");
async function runDueAnalyticsPdfUploads(env, db) {
  const now = Date.now();
  const rows = (await db.execute({
    sql: `SELECT user_id, destination, enabled, report_variant, file_format, date_filter, custom_start, custom_end, frequency,
                 hour, minute, weekday, month_day, timezone_offset_minutes, next_due_at,
                 last_sent_at, last_attempt_at, last_error
          FROM analytics_pdf_schedules
          WHERE enabled = 1 AND next_due_at IS NOT NULL AND next_due_at <= ?
          ORDER BY next_due_at
          LIMIT 20`,
    args: [now]
  })).rows;
  for (const row of rows) {
    const settings = analyticsPdfScheduleFromRow(row);
    if (settings.nextDueAt == null) continue;
    const claimedDueAt = settings.nextDueAt;
    const nextDueAt = nextScheduledUploadDueAt(settings, now + 6e4);
    const claimed = await db.execute({
      sql: `UPDATE analytics_pdf_schedules
            SET next_due_at = ?, last_attempt_at = ?, updated_at = ?
            WHERE user_id = ? AND destination = ? AND enabled = 1 AND next_due_at = ?`,
      args: [nextDueAt, now, now, settings.userId, settings.destination, claimedDueAt]
    });
    if (claimed.rowsAffected !== 1) continue;
    settings.nextDueAt = nextDueAt;
    settings.lastAttemptAt = now;
    try {
      await deliverScheduledAnalyticsPdf(env, db, settings);
    } catch (error) {
      console.error("Scheduled Analytics report delivery failed", {
        userId: settings.userId,
        destination: settings.destination,
        error: safeExternalUploadError(error)
      });
    }
  }
}
__name(runDueAnalyticsPdfUploads, "runDueAnalyticsPdfUploads");
async function deliverScheduledAnalyticsPdf(env, db, settings) {
  const attemptedAt = Date.now();
  try {
    const generated = await buildScheduledAnalyticsPdf(db, settings.userId, settings, attemptedAt);
    if (settings.destination === "telegram") {
      const telegram = await readTelegramBackupSettings(db, settings.userId);
      if (!telegram.encryptedToken || !telegram.chatId) throw new HttpError(400, "Telegram credentials are incomplete. Configure them in Settings > Credential.");
      const token = await decryptTelegramBotToken(env.JWT_SECRET, telegram.encryptedToken, telegram.tokenIv);
      await sendTelegramAnalyticsDocument(token, telegram.chatId, generated.fileName, generated.bytes, generated.caption, generated.mimeType);
    } else {
      const drive = await readGoogleDriveAnalyticsSettings(db, settings.userId);
      if (!drive.connected) throw new HttpError(400, "Google Drive is no longer connected.");
      const accessToken = await googleDriveAccessToken(env, drive);
      const folder = await resolveGoogleAnalyticsFolder(accessToken, drive.folderId);
      await googleDriveUploadDocument(accessToken, folder.id, generated.fileName, generated.bytes, generated.mimeType);
      await db.execute({
        sql: "UPDATE analytics_upload_settings SET google_last_upload_at = ?, google_last_error = NULL, updated_at = ? WHERE user_id = ?",
        args: [Date.now(), Date.now(), settings.userId]
      });
    }
    const sentAt = Date.now();
    await db.execute({
      sql: `UPDATE analytics_pdf_schedules
            SET last_sent_at = ?, last_attempt_at = ?, last_error = NULL, updated_at = ?
            WHERE user_id = ? AND destination = ?`,
      args: [sentAt, attemptedAt, sentAt, settings.userId, settings.destination]
    });
  } catch (error) {
    const message = safeExternalUploadError(error);
    const failedAt = Date.now();
    if (settings.destination === "googleDrive" && error instanceof HttpError && error.status === 401) {
      await db.batch([
        {
          sql: `UPDATE analytics_upload_settings
                SET google_refresh_token_encrypted = NULL, google_refresh_token_iv = NULL,
                    google_account_email = '', google_connected_at = NULL, google_last_error = ?, updated_at = ?
                WHERE user_id = ?`,
          args: [message, failedAt, settings.userId]
        },
        {
          sql: `UPDATE analytics_pdf_schedules
                SET enabled = 0, next_due_at = NULL, last_attempt_at = ?, last_error = ?, updated_at = ?
                WHERE user_id = ? AND destination = 'googleDrive'`,
          args: [attemptedAt, message, failedAt, settings.userId]
        },
        {
          sql: `UPDATE google_drive_backup_settings
                SET enabled = 0, next_due_at = NULL, last_error = ?, updated_at = ?
                WHERE user_id = ?`,
          args: [message, failedAt, settings.userId]
        }
      ], "write");
    } else {
      await db.execute({
        sql: `UPDATE analytics_pdf_schedules
              SET last_attempt_at = ?, last_error = ?, updated_at = ?
              WHERE user_id = ? AND destination = ?`,
        args: [attemptedAt, message, failedAt, settings.userId, settings.destination]
      });
    }
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, message);
  }
}
__name(deliverScheduledAnalyticsPdf, "deliverScheduledAnalyticsPdf");
function scheduledAnalyticsRange(filter, nowMs, offsetMinutes, customStart = null, customEnd = null) {
  const offsetMs = offsetMinutes * 6e4;
  const localNow = new Date(nowMs + offsetMs);
  const y = localNow.getUTCFullYear();
  const m = localNow.getUTCMonth();
  const d = localNow.getUTCDate();
  const localMidnightUtc = /* @__PURE__ */ __name((year, month, day) => Date.UTC(year, month, day) - offsetMs, "localMidnightUtc");
  const fmt = /* @__PURE__ */ __name((valueMs) => {
    const value = new Date(valueMs + offsetMs);
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }, "fmt");
  if (filter === "allTime") return { startMs: null, endMs: null, label: "All time", stamp: "all-time", dayCount: 1 };
  if (filter === "custom") {
    if (!customStart || !customEnd) throw new HttpError(400, "Automatic report custom range is incomplete.");
    const [sy, sm, sd] = customStart.split("-").map(Number);
    const [ey, em, ed] = customEnd.split("-").map(Number);
    const start2 = localMidnightUtc(sy, sm - 1, sd);
    const end2 = localMidnightUtc(ey, em - 1, ed + 1);
    if (end2 <= start2) throw new HttpError(400, "Automatic report custom range is invalid.");
    return {
      startMs: start2,
      endMs: end2,
      label: customStart === customEnd ? customStart : `${customStart} - ${customEnd}`,
      stamp: customStart === customEnd ? customStart : `${customStart}_to_${customEnd}`,
      dayCount: Math.max(1, Math.round((end2 - start2) / 864e5))
    };
  }
  if (filter === "today") {
    const start2 = localMidnightUtc(y, m, d);
    const end2 = localMidnightUtc(y, m, d + 1);
    return { startMs: start2, endMs: end2, label: fmt(start2), stamp: fmt(start2), dayCount: 1 };
  }
  if (filter === "thisWeek") {
    const jsDay = localNow.getUTCDay();
    const weekday = jsDay === 0 ? 7 : jsDay;
    const start2 = localMidnightUtc(y, m, d - (weekday - 1));
    const end2 = start2 + 7 * 864e5;
    return { startMs: start2, endMs: end2, label: `${fmt(start2)} - ${fmt(end2 - 1)}`, stamp: `${fmt(start2)}_week`, dayCount: 7 };
  }
  if (filter === "thisMonth") {
    const start2 = localMidnightUtc(y, m, 1);
    const end2 = localMidnightUtc(y, m + 1, 1);
    return { startMs: start2, endMs: end2, label: `${y}-${String(m + 1).padStart(2, "0")}`, stamp: `${y}-${String(m + 1).padStart(2, "0")}`, dayCount: Math.max(1, Math.round((end2 - start2) / 864e5)) };
  }
  const start = localMidnightUtc(y, 0, 1);
  const end = localMidnightUtc(y + 1, 0, 1);
  return { startMs: start, endMs: end, label: String(y), stamp: String(y), dayCount: Math.max(1, Math.round((end - start) / 864e5)) };
}
__name(scheduledAnalyticsRange, "scheduledAnalyticsRange");
function rowNumber(row, key) {
  const value = Number(row[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}
__name(rowNumber, "rowNumber");
function rowTimestamp(row, key) {
  const raw = row[key];
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  const parsedNumber = Number(raw);
  if (Number.isFinite(parsedNumber) && String(raw).trim() !== "") return Math.trunc(parsedNumber);
  const parsedDate = Date.parse(String(raw));
  return Number.isFinite(parsedDate) ? parsedDate : null;
}
__name(rowTimestamp, "rowTimestamp");
function transactionEffectiveTimestamp(row) {
  const created = rowTimestamp(row, "created_on") ?? 0;
  const end = rowTimestamp(row, "end_on");
  return end != null && end >= created ? end : created;
}
__name(transactionEffectiveTimestamp, "transactionEffectiveTimestamp");
function scheduledRangeContains(range, valueMs) {
  if (range.startMs == null || range.endMs == null) return true;
  return valueMs >= range.startMs && valueMs < range.endMs;
}
__name(scheduledRangeContains, "scheduledRangeContains");
function scheduledAnalyticsMoney(currencyCode, value) {
  const amount = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${value < 0 ? "-" : ""}${currencyCode} ${amount}`;
}
__name(scheduledAnalyticsMoney, "scheduledAnalyticsMoney");
function scheduledDateTimeLabel(valueMs, offsetMinutes) {
  const date = new Date(valueMs + offsetMinutes * 6e4);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}
__name(scheduledDateTimeLabel, "scheduledDateTimeLabel");
function scheduledAnalyticsComparison(current, previous) {
  if (Math.abs(previous) < 1e-4) return Math.abs(current) < 1e-4 ? "No change" : "New activity";
  const percent = (current - previous) / Math.abs(previous) * 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`;
}
__name(scheduledAnalyticsComparison, "scheduledAnalyticsComparison");
function previousScheduledRange(range) {
  if (range.startMs == null || range.endMs == null) return null;
  const duration = range.endMs - range.startMs;
  return { startMs: range.startMs - duration, endMs: range.startMs, label: "Previous period", stamp: "previous", dayCount: range.dayCount };
}
__name(previousScheduledRange, "previousScheduledRange");
function scheduledAnalyticsFileName(settings, range) {
  const extension = settings.fileFormat;
  return settings.reportVariant === "transactionHistory" ? `Yutaka-Transaction-History-${range.stamp}.${extension}` : `Yutaka-Analytics-${settings.dateFilter}-${range.stamp}.${extension}`;
}
__name(scheduledAnalyticsFileName, "scheduledAnalyticsFileName");
async function buildScheduledAnalyticsPdf(db, userId, settings, nowMs) {
  const snapshot = await readCloudFinanceSnapshot(db, userId);
  if (snapshot.financeRecordCount === 0) {
    throw new HttpError(409, "The cloud copy contains no finance data. Upload local changes before automatic Analytics reports can be generated.");
  }
  const range = scheduledAnalyticsRange(settings.dateFilter, nowMs, settings.timezoneOffsetMinutes, settings.customStart, settings.customEnd);
  const transactions = snapshot.database.transactions.filter((row) => scheduledRangeContains(range, transactionEffectiveTimestamp(row))).sort((a, b) => transactionEffectiveTimestamp(b) - transactionEffectiveTimestamp(a));
  const currencyCode = cleanText(snapshot.preferences.currencyCode, 12) || "BDT";
  const categories = new Map(snapshot.database.categories.map((row) => [String(row.id ?? ""), String(row.name ?? "Uncategorized")]));
  const accounts = new Map(snapshot.database.accounts.map((row) => [String(row.id ?? ""), row]));
  const accountName = /* @__PURE__ */ __name((id) => String(accounts.get(String(id ?? ""))?.name ?? "Unknown account"), "accountName");
  const categoryName = /* @__PURE__ */ __name((id) => categories.get(String(id ?? "")) ?? "Uncategorized", "categoryName");
  const lines = [];
  if (settings.reportVariant === "transactionHistory") {
    let income = 0;
    let expense = 0;
    let transferVolume = 0;
    let transferCount = 0;
    for (const tx of transactions) {
      const amount = rowNumber(tx, "amount");
      const excluded = Number(tx.exclude_from_reports ?? 0) === 1;
      if (!excluded && tx.type === "income") income += amount;
      if (!excluded && tx.type === "expense") expense += amount;
      if (tx.type === "transfer") {
        transferVolume += rowNumber(tx, "base_amount") || amount;
        transferCount += 1;
      }
    }
    lines.push("Yutaka Transaction History");
    lines.push(`${scheduledDateFilterLabel(settings.dateFilter)} | ${range.label}`);
    lines.push(`Generated ${scheduledDateTimeLabel(nowMs, settings.timezoneOffsetMinutes)}`);
    lines.push("");
    lines.push(`Transactions: ${transactions.length}`);
    lines.push(`Income: ${scheduledAnalyticsMoney(currencyCode, income)}`);
    lines.push(`Expense: ${scheduledAnalyticsMoney(currencyCode, expense)}`);
    lines.push(`Net cash flow: ${scheduledAnalyticsMoney(currencyCode, income - expense)}`);
    lines.push(`Transfers: ${transferCount} (${scheduledAnalyticsMoney(currencyCode, transferVolume)})`);
    lines.push("");
    if (transactions.length === 0) {
      lines.push("No transactions in this date filter.");
    } else {
      for (const tx of transactions) {
        const date = scheduledDateTimeLabel(transactionEffectiveTimestamp(tx), settings.timezoneOffsetMinutes);
        const type = String(tx.linked_entity_type ?? "").startsWith("loan") ? "Loan" : String(tx.type ?? "expense");
        const amount = rowNumber(tx, "amount");
        const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
        const title = cleanText(tx.title, 120) || categoryName(tx.category_id);
        const route = tx.type === "transfer" ? `${accountName(tx.from_account_id)} -> ${accountName(tx.to_account_id)}` : accountName(tx.from_account_id);
        lines.push(`${date} | ${type} | ${sign}${scheduledAnalyticsMoney(currencyCode, amount)} | ${title}`);
        lines.push(`Category: ${categoryName(tx.category_id)} | Account: ${route}${Number(tx.exclude_from_reports ?? 0) === 1 ? " | Excluded from reports" : ""}`);
        if (Number(tx.service_charge_enabled ?? 0) === 1) {
          const baseAmount = rowNumber(tx, "base_amount") || amount;
          const chargeAmount = rowNumber(tx, "service_charge_amount");
          const chargeValue = rowNumber(tx, "service_charge_value");
          const chargeMode = String(tx.service_charge_mode ?? "number");
          const chargeSetting = chargeMode === "percentage" ? `${chargeValue}%` : scheduledAnalyticsMoney(currencyCode, chargeValue);
          lines.push(`Base amount: ${scheduledAnalyticsMoney(currencyCode, baseAmount)} | Service charge: ${scheduledAnalyticsMoney(currencyCode, chargeAmount)} (${chargeSetting})`);
        }
        const notes = cleanText(tx.notes, 500);
        if (notes) lines.push(`Notes: ${notes}`);
        lines.push("");
      }
    }
  } else {
    const coreFor = /* @__PURE__ */ __name((targetRange) => {
      const txs = snapshot.database.transactions.filter((row) => scheduledRangeContains(targetRange, transactionEffectiveTimestamp(row)));
      let income = 0;
      let expense = 0;
      let transferVolume = 0;
      let transferCount = 0;
      let savingsIn = 0;
      let savingsOut = 0;
      const expenseCategories = /* @__PURE__ */ new Map();
      const incomeCategories = /* @__PURE__ */ new Map();
      for (const tx of txs) {
        const amount = rowNumber(tx, "amount");
        const excluded = Number(tx.exclude_from_reports ?? 0) === 1;
        const categoryId = String(tx.category_id ?? "");
        if (!excluded && tx.type === "income") {
          income += amount;
          incomeCategories.set(categoryId, (incomeCategories.get(categoryId) ?? 0) + amount);
        }
        if (!excluded && tx.type === "expense") {
          expense += amount;
          expenseCategories.set(categoryId, (expenseCategories.get(categoryId) ?? 0) + amount);
        }
        if (tx.type === "transfer") {
          const transferAmount = rowNumber(tx, "base_amount") || amount;
          transferVolume += transferAmount;
          transferCount += 1;
          const fromSavings = accounts.get(String(tx.from_account_id ?? ""))?.type === "savings";
          const toSavings = accounts.get(String(tx.to_account_id ?? ""))?.type === "savings";
          if (!fromSavings && toSavings) savingsIn += transferAmount;
          if (fromSavings && !toSavings) savingsOut += transferAmount;
        }
      }
      return { txs, income, expense, transferVolume, transferCount, savingsIn, savingsOut, expenseCategories, incomeCategories };
    }, "coreFor");
    const current = coreFor(range);
    const reportDayCount = settings.dateFilter === "allTime" && current.txs.length > 0 ? Math.max(1, Math.floor((nowMs - Math.min(...current.txs.map(transactionEffectiveTimestamp))) / 864e5) + 1) : range.dayCount;
    const previousRange = previousScheduledRange(range);
    const previous = previousRange ? coreFor(previousRange) : null;
    const loanStarts = snapshot.database.loans.filter((row) => {
      const value = rowTimestamp(row, "start_date");
      return value != null && scheduledRangeContains(range, value);
    }).length;
    const repayments = snapshot.database.loan_payments.filter((row) => {
      const value = rowTimestamp(row, "paid_on");
      return Number(row.is_addition ?? 0) !== 1 && value != null && scheduledRangeContains(range, value);
    });
    const repaymentTotal = repayments.reduce((sum, row) => sum + rowNumber(row, "amount"), 0);
    let budgetLimit = 0;
    let budgetSpent = 0;
    let budgetCount = 0;
    for (const budget of snapshot.database.budgets) {
      const selected = String(budget.selected_month ?? "");
      const match = /^(\d{4})-(\d{2})$/.exec(selected);
      if (!match) continue;
      const monthStart = Date.UTC(Number(match[1]), Number(match[2]) - 1, 1) - settings.timezoneOffsetMinutes * 6e4;
      const monthEndDate = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
      const monthEnd = monthEndDate.getTime() - settings.timezoneOffsetMinutes * 6e4;
      const overlaps = range.startMs == null || range.endMs == null || range.startMs < monthEnd && range.endMs > monthStart;
      if (!overlaps) continue;
      budgetCount += 1;
      budgetLimit += rowNumber(budget, "amount");
      const budgetId = String(budget.id ?? "");
      const allowedAccounts = new Set(snapshot.database.budget_accounts.filter((row) => String(row.budget_id ?? "") === budgetId).map((row) => String(row.account_id ?? "")));
      const allowedCategories = new Set(snapshot.database.budget_categories.filter((row) => String(row.budget_id ?? "") === budgetId).map((row) => String(row.category_id ?? "")));
      const allAccounts = Number(budget.all_accounts_selected ?? 1) === 1;
      const allCategories = Number(budget.all_categories_selected ?? 1) === 1;
      for (const tx of current.txs) {
        const when = transactionEffectiveTimestamp(tx);
        if (when < monthStart || when >= monthEnd || tx.type !== "expense" || Number(tx.exclude_from_reports ?? 0) === 1) continue;
        if (!allAccounts && !allowedAccounts.has(String(tx.from_account_id ?? ""))) continue;
        if (!allCategories && !allowedCategories.has(String(tx.category_id ?? ""))) continue;
        budgetSpent += rowNumber(tx, "amount");
      }
    }
    lines.push("Yutaka Analytics");
    lines.push(`${scheduledDateFilterLabel(settings.dateFilter)} summary | ${range.label}`);
    lines.push(`Generated ${scheduledDateTimeLabel(nowMs, settings.timezoneOffsetMinutes)}`);
    lines.push("");
    lines.push(`Income: ${scheduledAnalyticsMoney(currencyCode, current.income)}`);
    lines.push(`Expense: ${scheduledAnalyticsMoney(currencyCode, current.expense)}`);
    lines.push(`Net cash flow: ${scheduledAnalyticsMoney(currencyCode, current.income - current.expense)}`);
    lines.push(`Transactions: ${current.txs.length}`);
    lines.push(`Average income / day: ${scheduledAnalyticsMoney(currencyCode, current.income / Math.max(1, reportDayCount))}`);
    lines.push(`Average expense / day: ${scheduledAnalyticsMoney(currencyCode, current.expense / Math.max(1, reportDayCount))}`);
    if (previous) {
      lines.push("");
      lines.push("Compared with previous period");
      lines.push(`Income: ${scheduledAnalyticsComparison(current.income, previous.income)}`);
      lines.push(`Expense: ${scheduledAnalyticsComparison(current.expense, previous.expense)}`);
      lines.push(`Net cash flow: ${scheduledAnalyticsComparison(current.income - current.expense, previous.income - previous.expense)}`);
    }
    lines.push("");
    lines.push("Activity");
    lines.push(`Income transactions: ${current.txs.filter((tx) => tx.type === "income" && Number(tx.exclude_from_reports ?? 0) !== 1).length}`);
    lines.push(`Expense transactions: ${current.txs.filter((tx) => tx.type === "expense" && Number(tx.exclude_from_reports ?? 0) !== 1).length}`);
    lines.push(`Transfers: ${current.transferCount} (${scheduledAnalyticsMoney(currencyCode, current.transferVolume)})`);
    lines.push(`Savings in: ${scheduledAnalyticsMoney(currencyCode, current.savingsIn)}`);
    lines.push(`Savings out: ${scheduledAnalyticsMoney(currencyCode, current.savingsOut)}`);
    lines.push(`Loan records started: ${loanStarts}`);
    lines.push(`Repayments: ${repayments.length} (${scheduledAnalyticsMoney(currencyCode, repaymentTotal)})`);
    if (budgetCount > 0) {
      lines.push(`Relevant budgets: ${budgetCount}`);
      lines.push(`Budget spend: ${scheduledAnalyticsMoney(currencyCode, budgetSpent)} of ${scheduledAnalyticsMoney(currencyCode, budgetLimit)}`);
    }
    const appendTop = /* @__PURE__ */ __name((title, totals, overall) => {
      lines.push("");
      lines.push(title);
      const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (entries.length === 0) {
        lines.push("No activity in this period.");
        return;
      }
      for (const [categoryId, amount] of entries) {
        const share = overall <= 0 ? 0 : amount / overall * 100;
        lines.push(`${categoryName(categoryId)} | ${share.toFixed(1)}% | ${scheduledAnalyticsMoney(currencyCode, amount)}`);
      }
    }, "appendTop");
    appendTop("Top expense categories", current.expenseCategories, current.expense);
    appendTop("Top income categories", current.incomeCategories, current.income);
    lines.push("");
    lines.push("Current account balances");
    lines.push("Account balances are a current snapshot, not historical balances for the selected period.");
    for (const account of snapshot.database.accounts) {
      lines.push(`${String(account.name ?? "Account")}: ${scheduledAnalyticsMoney(currencyCode, rowNumber(account, "amount"))}`);
    }
    lines.push("");
    lines.push("Transfers are not counted as income or expense. This automatic report is generated from the latest finance data synchronized to the Self-Hosted Worker.");
  }
  const bytes = settings.fileFormat === "pdf" ? buildSimpleTextPdf(lines) : settings.fileFormat === "xlsx" ? buildSimpleXlsxFromLines(lines, settings.reportVariant === "transactionHistory" ? "Transactions" : "Summary") : ownedUtf8(`${lines.join("\n")}
`);
  if (bytes.byteLength > analyticsReportMaxBytes) throw new HttpError(413, "The generated Analytics report is too large to upload safely.");
  return {
    fileName: scheduledAnalyticsFileName(settings, range),
    bytes,
    mimeType: analyticsReportMimeType(settings.fileFormat),
    caption: settings.reportVariant === "transactionHistory" ? `Yutaka Transaction History \u2022 ${settings.fileFormat.toUpperCase()}
${range.label}` : `Yutaka ${scheduledDateFilterLabel(settings.dateFilter)} Analytics \u2022 ${settings.fileFormat.toUpperCase()}
${range.label}`
  };
}
__name(buildScheduledAnalyticsPdf, "buildScheduledAnalyticsPdf");
function scheduledDateFilterLabel(filter) {
  return { today: "Today", thisWeek: "This Week", thisMonth: "This Month", thisYear: "This Year", allTime: "All Time", custom: "Custom Range" }[filter];
}
__name(scheduledDateFilterLabel, "scheduledDateFilterLabel");
function ownedUtf8(value) {
  const encoded = new TextEncoder().encode(value);
  const owned = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  owned.set(encoded);
  return owned;
}
__name(ownedUtf8, "ownedUtf8");
function xmlEscape(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
__name(xmlEscape, "xmlEscape");
function xlsxColumnName(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  return result;
}
__name(xlsxColumnName, "xlsxColumnName");
function crc32(data) {
  let crc = 4294967295;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? crc >>> 1 ^ 3988292384 : crc >>> 1;
    }
  }
  return (crc ^ 4294967295) >>> 0;
}
__name(crc32, "crc32");
function zipU16(value) {
  const bytes = new Uint8Array(new ArrayBuffer(2));
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}
__name(zipU16, "zipU16");
function zipU32(value) {
  const bytes = new Uint8Array(new ArrayBuffer(4));
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}
__name(zipU32, "zipU32");
function concatOwned(parts) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}
__name(concatOwned, "concatOwned");
function buildStoredZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = ownedUtf8(entry.name);
    const checksum = crc32(entry.data);
    const local = concatOwned([
      zipU32(67324752),
      zipU16(20),
      zipU16(2048),
      zipU16(0),
      zipU16(0),
      zipU16(0),
      zipU32(checksum),
      zipU32(entry.data.byteLength),
      zipU32(entry.data.byteLength),
      zipU16(name.byteLength),
      zipU16(0),
      name,
      entry.data
    ]);
    locals.push(local);
    const central = concatOwned([
      zipU32(33639248),
      zipU16(20),
      zipU16(20),
      zipU16(2048),
      zipU16(0),
      zipU16(0),
      zipU16(0),
      zipU32(checksum),
      zipU32(entry.data.byteLength),
      zipU32(entry.data.byteLength),
      zipU16(name.byteLength),
      zipU16(0),
      zipU16(0),
      zipU16(0),
      zipU16(0),
      zipU32(0),
      zipU32(offset),
      name
    ]);
    centrals.push(central);
    offset += local.byteLength;
  }
  const centralDirectory = concatOwned(centrals);
  const end = concatOwned([
    zipU32(101010256),
    zipU16(0),
    zipU16(0),
    zipU16(entries.length),
    zipU16(entries.length),
    zipU32(centralDirectory.byteLength),
    zipU32(offset),
    zipU16(0)
  ]);
  return concatOwned([...locals, centralDirectory, end]);
}
__name(buildStoredZip, "buildStoredZip");
function buildSimpleXlsxFromLines(sourceLines, sheetName) {
  const safeSheetName = (sheetName.replace(/[\\/:*?\[\]]/g, " ").trim() || "Report").slice(0, 31);
  const rows = sourceLines.map((line) => {
    if (!line) return [];
    if (line.includes(" | ")) return line.split(" | ");
    const split = line.indexOf(": ");
    if (split > 0) return [line.slice(0, split), line.slice(split + 2)];
    return [line];
  });
  const sheetXml = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'];
  rows.forEach((row, rowIndex) => {
    const rowNumber2 = rowIndex + 1;
    sheetXml.push(`<row r="${rowNumber2}">`);
    row.forEach((cell, columnIndex) => {
      const ref = `${xlsxColumnName(columnIndex)}${rowNumber2}`;
      const style = rowIndex === 0 ? ' s="1"' : "";
      sheetXml.push(`<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell)}</t></is></c>`);
    });
    sheetXml.push("</row>");
  });
  sheetXml.push("</sheetData></worksheet>");
  return buildStoredZip([
    {
      name: "[Content_Types].xml",
      data: ownedUtf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>')
    },
    {
      name: "_rels/.rels",
      data: ownedUtf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    },
    {
      name: "xl/workbook.xml",
      data: ownedUtf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(safeSheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`)
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: ownedUtf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    },
    {
      name: "xl/styles.xml",
      data: ownedUtf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
    },
    { name: "xl/worksheets/sheet1.xml", data: ownedUtf8(sheetXml.join("")) }
  ]);
}
__name(buildSimpleXlsxFromLines, "buildSimpleXlsxFromLines");
function buildSimpleTextPdf(sourceLines) {
  const sanitize = /* @__PURE__ */ __name((value) => value.replace(/[^\x20-\x7E]/g, "?"), "sanitize");
  const escape = /* @__PURE__ */ __name((value) => sanitize(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"), "escape");
  const wrap = /* @__PURE__ */ __name((value, width = 92) => {
    const clean = sanitize(value).trimEnd();
    if (!clean) return [""];
    const result = [];
    let remaining = clean;
    while (remaining.length > width) {
      let cut = remaining.lastIndexOf(" ", width);
      if (cut < Math.floor(width * 0.55)) cut = width;
      result.push(remaining.slice(0, cut).trimEnd());
      remaining = remaining.slice(cut).trimStart();
    }
    result.push(remaining);
    return result;
  }, "wrap");
  const lines = sourceLines.flatMap((line) => wrap(String(line)));
  const pages = [];
  for (let index = 0; index < lines.length; index += 47) pages.push(lines.slice(index, index + 47));
  if (pages.length === 0) pages.push(["Yutaka"]);
  const objects = /* @__PURE__ */ new Map();
  const pageIds = [];
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let nextId = 4;
  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageIds.push(pageId);
    const commands = ["BT", "/F1 10 Tf", "48 796 Td", "15 TL"];
    for (const line of pageLines) {
      commands.push(`(${escape(line)}) Tj`, "T*");
    }
    commands.push("ET");
    const stream = `${commands.join("\n")}
`;
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${new TextEncoder().encode(stream).byteLength} >>
stream
${stream}endstream`);
  }
  objects.set(2, `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);
  const encoder = new TextEncoder();
  let pdf = "%PDF-1.4\n%Yutaka\n";
  const offsets = [0];
  for (let id = 1; id < nextId; id += 1) {
    offsets[id] = encoder.encode(pdf).byteLength;
    pdf += `${id} 0 obj
${objects.get(id) ?? "<< >>"}
endobj
`;
  }
  const xrefOffset = encoder.encode(pdf).byteLength;
  pdf += `xref
0 ${nextId}
0000000000 65535 f 
`;
  for (let id = 1; id < nextId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n 
`;
  }
  pdf += `trailer
<< /Size ${nextId} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF
`;
  return new Uint8Array(encoder.encode(pdf).buffer);
}
__name(buildSimpleTextPdf, "buildSimpleTextPdf");
async function googleDriveAccessToken(env, settings) {
  if (!settings.clientId || !settings.encryptedClientSecret || !settings.encryptedRefreshToken) {
    throw new HttpError(400, "Connect Google Drive in Settings > Credential first.");
  }
  const clientSecret = await decryptWorkerSecret(
    env.JWT_SECRET,
    "google-drive-client-secret",
    settings.encryptedClientSecret,
    settings.clientSecretIv,
    "The saved Google OAuth Client Secret cannot be decrypted. Re-enter it in Yutaka."
  );
  const refreshToken = await decryptWorkerSecret(
    env.JWT_SECRET,
    "google-drive-refresh-token",
    settings.encryptedRefreshToken,
    settings.refreshTokenIv,
    "The saved Google Drive authorization cannot be decrypted. Reconnect Google Drive."
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: settings.clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }).toString()
  });
  const data = parseJsonRecord(await response.text());
  if (!response.ok) {
    if (String(data.error ?? "") === "invalid_grant") {
      throw new HttpError(401, "Google Drive authorization is no longer valid. Reconnect Google Drive in Settings > Credential.");
    }
    throw new HttpError(502, googleOAuthFailure(response.status, data));
  }
  const accessToken = String(data.access_token ?? "").trim();
  if (!accessToken) throw new HttpError(502, "Google did not return a Drive access token.");
  return accessToken;
}
__name(googleDriveAccessToken, "googleDriveAccessToken");
async function resolveGoogleAnalyticsFolder(accessToken, configuredFolderId) {
  const folderId = normalizeGoogleDriveFolderId(configuredFolderId);
  if (folderId) return googleDriveFolderById(accessToken, folderId);
  return ensureGoogleAnalyticsFolder(accessToken);
}
__name(resolveGoogleAnalyticsFolder, "resolveGoogleAnalyticsFolder");
async function resolveGoogleBackupFolder(accessToken, configuredFolderId) {
  const folderId = normalizeGoogleDriveFolderId(configuredFolderId);
  if (folderId) return googleDriveFolderById(accessToken, folderId);
  return ensureGoogleBackupFolder(accessToken);
}
__name(resolveGoogleBackupFolder, "resolveGoogleBackupFolder");
async function googleDriveFolderById(accessToken, folderId) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}`);
  url.searchParams.set("fields", "id,name,mimeType,trashed,capabilities(canAddChildren)");
  url.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" }
  });
  const data = parseJsonRecord(await response.text());
  if (!response.ok) {
    if (response.status === 404 || response.status === 403) {
      throw new HttpError(400, "The Google Drive folder ID is not accessible. Check the ID, folder permission, then reconnect Google Drive.");
    }
    throw new HttpError(502, googleDriveApiFailure(response.status, data));
  }
  if (String(data.mimeType ?? "") !== "application/vnd.google-apps.folder" || data.trashed === true) {
    throw new HttpError(400, "The configured Google Drive Folder ID does not point to an active folder.");
  }
  const capabilities = data.capabilities;
  if (capabilities && typeof capabilities === "object" && capabilities.canAddChildren === false) {
    throw new HttpError(400, "Yutaka does not have permission to upload files into the configured Google Drive folder.");
  }
  return { id: String(data.id ?? folderId), name: cleanText(data.name, 240) || "Google Drive folder" };
}
__name(googleDriveFolderById, "googleDriveFolderById");
async function ensureGoogleAnalyticsFolder(accessToken) {
  const query = `name = '${analyticsGoogleDriveFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("spaces", "drive");
  listUrl.searchParams.set("fields", "files(id,name)");
  listUrl.searchParams.set("pageSize", "10");
  const listResponse = await fetch(listUrl, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" }
  });
  const listData = parseJsonRecord(await listResponse.text());
  if (!listResponse.ok) throw new HttpError(502, googleDriveApiFailure(listResponse.status, listData));
  const files = Array.isArray(listData.files) ? listData.files : [];
  const first = files.find((item) => item && typeof item === "object" && String(item.id ?? ""));
  if (first) return { id: String(first.id), name: cleanText(first.name, 240) || analyticsGoogleDriveFolderName };
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      accept: "application/json"
    },
    body: JSON.stringify({ name: analyticsGoogleDriveFolderName, mimeType: "application/vnd.google-apps.folder" })
  });
  const createData = parseJsonRecord(await createResponse.text());
  if (!createResponse.ok) throw new HttpError(502, googleDriveApiFailure(createResponse.status, createData));
  const createdId = String(createData.id ?? "");
  if (!createdId) throw new HttpError(502, "Google Drive did not return the Analytics folder ID.");
  return { id: createdId, name: cleanText(createData.name, 240) || analyticsGoogleDriveFolderName };
}
__name(ensureGoogleAnalyticsFolder, "ensureGoogleAnalyticsFolder");
async function ensureGoogleBackupFolder(accessToken) {
  const query = `name = '${backupGoogleDriveFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("spaces", "drive");
  listUrl.searchParams.set("fields", "files(id,name)");
  listUrl.searchParams.set("pageSize", "10");
  const listResponse = await fetch(listUrl, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" }
  });
  const listData = parseJsonRecord(await listResponse.text());
  if (!listResponse.ok) throw new HttpError(502, googleDriveApiFailure(listResponse.status, listData));
  const files = Array.isArray(listData.files) ? listData.files : [];
  const first = files.find((item) => item && typeof item === "object" && String(item.id ?? ""));
  if (first) return { id: String(first.id), name: cleanText(first.name, 240) || backupGoogleDriveFolderName };
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      accept: "application/json"
    },
    body: JSON.stringify({ name: backupGoogleDriveFolderName, mimeType: "application/vnd.google-apps.folder" })
  });
  const createData = parseJsonRecord(await createResponse.text());
  if (!createResponse.ok) throw new HttpError(502, googleDriveApiFailure(createResponse.status, createData));
  const createdId = String(createData.id ?? "");
  if (!createdId) throw new HttpError(502, "Google Drive did not return the Backup folder ID.");
  return { id: createdId, name: cleanText(createData.name, 240) || backupGoogleDriveFolderName };
}
__name(ensureGoogleBackupFolder, "ensureGoogleBackupFolder");
async function googleDriveUploadDocument(accessToken, folderId, fileName, bytes, mimeType = analyticsReportMimeType(fileName)) {
  const boundary = `yutaka_${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId], mimeType });
  const body = new Blob([
    `--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
\r
${metadata}\r
`,
    `--${boundary}\r
Content-Type: ${mimeType}\r
\r
`,
    bytes,
    `\r
--${boundary}--`
  ]);
  const uploadUrl = new URL("https://www.googleapis.com/upload/drive/v3/files");
  uploadUrl.searchParams.set("uploadType", "multipart");
  uploadUrl.searchParams.set("fields", "id,name,webViewLink");
  uploadUrl.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/related; boundary=${boundary}`,
      accept: "application/json"
    },
    body
  });
  const data = parseJsonRecord(await response.text());
  if (!response.ok) throw new HttpError(502, googleDriveApiFailure(response.status, data));
  const id = String(data.id ?? "");
  if (!id) throw new HttpError(502, "Google Drive did not return an uploaded file ID.");
  return { id, webViewLink: String(data.webViewLink ?? "") };
}
__name(googleDriveUploadDocument, "googleDriveUploadDocument");
function googleOAuthFailure(status2, data) {
  const description = cleanText(data.error_description, 200);
  const code = cleanText(data.error, 80);
  if (description) return `Google OAuth rejected the request: ${description}`;
  if (code) return `Google OAuth rejected the request: ${code}`;
  return `Google OAuth returned HTTP ${status2}.`;
}
__name(googleOAuthFailure, "googleOAuthFailure");
function googleDriveApiFailure(status2, data) {
  const error = data.error;
  if (error && typeof error === "object") {
    const message = cleanText(error.message, 200);
    if (message) return `Google Drive rejected the upload: ${message}`;
  }
  return `Google Drive API returned HTTP ${status2}.`;
}
__name(googleDriveApiFailure, "googleDriveApiFailure");
function parseJsonRecord(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
__name(parseJsonRecord, "parseJsonRecord");
function googleDriveCallbackPage(title, message, ok, status2) {
  const accent = ok ? "#16c79a" : "#ef5350";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#0f1217;color:#f4f7f5;font:16px system-ui,-apple-system,Segoe UI,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px;box-sizing:border-box}.card{max-width:560px;background:#0b2119;border:1px solid #244438;border-radius:28px;padding:28px;box-shadow:0 24px 80px #0008}h1{margin:0 0 12px;font-size:28px}p{margin:0;color:#a9bbb3;line-height:1.55}.dot{width:54px;height:54px;border-radius:18px;background:${accent}22;color:${accent};display:grid;place-items:center;font-size:28px;margin-bottom:18px}</style></head><body><main class="card"><div class="dot">${ok ? "\u2713" : "!"}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></main></body></html>`;
  return new Response(html, {
    status: status2,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
    }
  });
}
__name(googleDriveCallbackPage, "googleDriveCallbackPage");
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
__name(escapeHtml, "escapeHtml");
function safeExternalUploadError(error) {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, " ").slice(0, 220);
}
__name(safeExternalUploadError, "safeExternalUploadError");
function normalizeTelegramBackupFrequency(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "daily" || normalized === "weekly" || normalized === "monthly") return normalized;
  throw new HttpError(400, "Backup frequency must be daily, weekly, or monthly.");
}
__name(normalizeTelegramBackupFrequency, "normalizeTelegramBackupFrequency");
function normalizeTelegramChatId(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (/^-?\d{5,24}$/.test(normalized)) return normalized;
  if (/^@[A-Za-z0-9_]{5,32}$/.test(normalized)) return normalized;
  throw new HttpError(400, "Telegram Chat ID must be a numeric group/channel ID or an @channel username.");
}
__name(normalizeTelegramChatId, "normalizeTelegramChatId");
function validateTelegramBotToken(token) {
  if (!/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(token)) {
    throw new HttpError(400, "Telegram bot token format is invalid.");
  }
}
__name(validateTelegramBotToken, "validateTelegramBotToken");
function integerInRange(value, fallback, min, max, label) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new HttpError(400, `${label} must be between ${min} and ${max}.`);
  }
  return parsed;
}
__name(integerInRange, "integerInRange");
function nullableInteger(value) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}
__name(nullableInteger, "nullableInteger");
function nextScheduledUploadDueAt(settings, afterMs) {
  const offsetMs = settings.timezoneOffsetMinutes * 6e4;
  const localNow = new Date(afterMs + offsetMs);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const day = localNow.getUTCDate();
  const toUtc = /* @__PURE__ */ __name((y, m, d) => Date.UTC(y, m, d, settings.hour, settings.minute) - offsetMs, "toUtc");
  if (settings.frequency === "daily") {
    let candidate2 = toUtc(year, month, day);
    if (candidate2 <= afterMs) candidate2 = toUtc(year, month, day + 1);
    return candidate2;
  }
  if (settings.frequency === "weekly") {
    const jsDay = localNow.getUTCDay();
    const currentWeekday = jsDay === 0 ? 7 : jsDay;
    let daysAhead = (settings.weekday - currentWeekday + 7) % 7;
    let candidate2 = toUtc(year, month, day + daysAhead);
    if (candidate2 <= afterMs) {
      daysAhead += 7;
      candidate2 = toUtc(year, month, day + daysAhead);
    }
    return candidate2;
  }
  const monthlyCandidate = /* @__PURE__ */ __name((candidateYear, candidateMonth) => {
    const lastDay = new Date(Date.UTC(candidateYear, candidateMonth + 1, 0)).getUTCDate();
    return toUtc(candidateYear, candidateMonth, Math.min(settings.monthDay, lastDay));
  }, "monthlyCandidate");
  let candidate = monthlyCandidate(year, month);
  if (candidate <= afterMs) {
    const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));
    candidate = monthlyCandidate(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth());
  }
  return candidate;
}
__name(nextScheduledUploadDueAt, "nextScheduledUploadDueAt");
function nextTelegramBackupDueAt(settings, afterMs) {
  return nextScheduledUploadDueAt(settings, afterMs);
}
__name(nextTelegramBackupDueAt, "nextTelegramBackupDueAt");
async function encryptTelegramBotToken(secret, plaintext) {
  const key = await telegramBackupEncryptionKey(secret, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return { ciphertext: b64urlBytes(encrypted), iv: b64urlBytes(iv) };
}
__name(encryptTelegramBotToken, "encryptTelegramBotToken");
async function decryptTelegramBotToken(secret, ciphertext, encodedIv) {
  try {
    const key = await telegramBackupEncryptionKey(secret, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytesFromB64Url(encodedIv) },
      key,
      bytesFromB64Url(ciphertext)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new HttpError(503, "The saved Telegram bot token cannot be decrypted. Re-enter the token and save again.");
  }
}
__name(decryptTelegramBotToken, "decryptTelegramBotToken");
async function telegramBackupEncryptionKey(secret, usages) {
  const material = await crypto.subtle.digest("SHA-256", enc.encode(`yutaka-telegram-backup-token:${secret}`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, usages);
}
__name(telegramBackupEncryptionKey, "telegramBackupEncryptionKey");
async function encryptWorkerSecret(secret, purpose, plaintext) {
  const key = await workerSecretEncryptionKey(secret, purpose, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return { ciphertext: b64urlBytes(encrypted), iv: b64urlBytes(iv) };
}
__name(encryptWorkerSecret, "encryptWorkerSecret");
async function decryptWorkerSecret(secret, purpose, ciphertext, encodedIv, failureMessage) {
  try {
    const key = await workerSecretEncryptionKey(secret, purpose, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytesFromB64Url(encodedIv) },
      key,
      bytesFromB64Url(ciphertext)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new HttpError(503, failureMessage);
  }
}
__name(decryptWorkerSecret, "decryptWorkerSecret");
async function workerSecretEncryptionKey(secret, purpose, usages) {
  const material = await crypto.subtle.digest("SHA-256", enc.encode(`yutaka-worker-secret:${purpose}:${secret}`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, usages);
}
__name(workerSecretEncryptionKey, "workerSecretEncryptionKey");
function encodeYutakaBackup(payload) {
  const source = enc.encode(JSON.stringify(payload));
  const key = enc.encode(yutakaBackupCompatibilityKey);
  const encrypted = new Uint8Array(source.length);
  for (let index = 0; index < source.length; index += 1) {
    encrypted[index] = source[index] ^ key[index % key.length];
  }
  return bytesToBase64(encrypted);
}
__name(encodeYutakaBackup, "encodeYutakaBackup");
function bytesToBase64(bytes) {
  const chunks = [];
  const chunkSize = 32768;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    const chunk = bytes.subarray(start, Math.min(start + chunkSize, bytes.length));
    chunks.push(String.fromCharCode(...Array.from(chunk)));
  }
  return btoa(chunks.join(""));
}
__name(bytesToBase64, "bytesToBase64");
function bytesFromBase64(value) {
  const raw = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}
__name(bytesFromBase64, "bytesFromBase64");
function compactUtcTimestamp(value) {
  const pad = /* @__PURE__ */ __name((input) => input.toString().padStart(2, "0"), "pad");
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}_${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(value.getUTCSeconds())}`;
}
__name(compactUtcTimestamp, "compactUtcTimestamp");
function safeTelegramError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot[redacted]").replace(/\d{5,15}:[A-Za-z0-9_-]{20,}/g, "[redacted bot token]").replace(/\s+/g, " ").slice(0, 220);
}
__name(safeTelegramError, "safeTelegramError");
function rootResponse(env) {
  return json({
    ok: true,
    service: "yutaka-sync",
    configured: isWorkerConfigured(env),
    workerVersion: env.YUTAKA_WORKER_VERSION ?? "legacy",
    registrationMode: "first-user",
    endpoints: {
      profile: "/profile",
      accountDeletionPage: "/delete-account",
      health: "/health",
      register: "POST /v1/auth/register",
      login: "POST /v1/auth/login",
      recover: "POST /v1/auth/recover",
      recoveryKey: "POST /v1/auth/recovery-key",
      refresh: "POST /v1/auth/refresh",
      logout: "POST /v1/auth/logout",
      deleteAccount: "DELETE /v1/auth/account",
      initialSync: "POST /v1/sync/initial",
      push: "POST /v1/sync/push",
      pull: "GET /v1/sync/pull?cursor=0&limit=100",
      status: "GET /v1/sync/status",
      profileMedia: "/v1/profile-media/*",
      deploymentRecovery: "/v1/deployment-recovery/profile",
      telegramBackup: "/v1/telegram-backup/*",
      analyticsUpload: "/v1/analytics-upload/*"
    }
  });
}
__name(rootResponse, "rootResponse");
async function healthResponse(env) {
  const configured = isWorkerConfigured(env);
  if (!configured) {
    return json({
      ok: false,
      service: "yutaka-sync",
      workerVersion: env.YUTAKA_WORKER_VERSION ?? "legacy",
      configured: false,
      registrationMode: "first-user",
      telegramBackupAvailable: true,
      googleDriveBackupAvailable: true,
      analyticsUploadAvailable: true,
      realtimeSyncAvailable: Boolean(env.SYNC_HUB),
      profileMediaSyncAvailable: true,
      accountDeletionAvailable: true,
      deploymentRecoveryAvailable: false,
      databaseReachable: false,
      schemaReady: false,
      missingTables: requiredTables
    }, 503);
  }
  let db;
  try {
    db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
    const missingTables = await missingSchemaTables(db);
    const schemaReady = missingTables.length === 0;
    let deploymentRecoveryAvailable = false;
    if (!missingTables.includes("worker_state")) {
      const recoveryState = await db.execute({
        sql: `SELECT value FROM worker_state WHERE key = 'deployment_recovery_ciphertext' LIMIT 1`,
        args: []
      });
      deploymentRecoveryAvailable = Boolean(String(recoveryState.rows[0]?.value ?? "").trim());
    }
    return json({
      ok: schemaReady,
      service: "yutaka-sync",
      workerVersion: env.YUTAKA_WORKER_VERSION ?? "legacy",
      configured: true,
      registrationMode: "first-user",
      telegramBackupAvailable: true,
      googleDriveBackupAvailable: true,
      analyticsUploadAvailable: true,
      realtimeSyncAvailable: Boolean(env.SYNC_HUB),
      profileMediaSyncAvailable: true,
      accountDeletionAvailable: true,
      deploymentRecoveryAvailable,
      databaseReachable: true,
      schemaReady,
      missingTables
    }, schemaReady ? 200 : 503);
  } catch (error) {
    return json({
      ok: false,
      service: "yutaka-sync",
      workerVersion: env.YUTAKA_WORKER_VERSION ?? "legacy",
      configured: true,
      registrationMode: "first-user",
      telegramBackupAvailable: true,
      googleDriveBackupAvailable: true,
      analyticsUploadAvailable: true,
      realtimeSyncAvailable: Boolean(env.SYNC_HUB),
      profileMediaSyncAvailable: true,
      accountDeletionAvailable: true,
      deploymentRecoveryAvailable: false,
      databaseReachable: false,
      schemaReady: false,
      missingTables: requiredTables,
      error: databaseErrorMessage(error)
    }, 503);
  } finally {
    db?.close();
  }
}
__name(healthResponse, "healthResponse");
function isWorkerConfigured(env) {
  return Boolean(
    env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN && env.JWT_SECRET?.length >= 32
  );
}
__name(isWorkerConfigured, "isWorkerConfigured");
function validateWorkerConfig(env) {
  const missing = [
    ["TURSO_DATABASE_URL", env.TURSO_DATABASE_URL],
    ["TURSO_AUTH_TOKEN", env.TURSO_AUTH_TOKEN],
    ["JWT_SECRET", env.JWT_SECRET]
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new HttpError(503, `Worker is missing required secret(s): ${missing.join(", ")}.`);
  }
  if (env.JWT_SECRET.length < 32) {
    throw new HttpError(503, "JWT_SECRET must contain at least 32 characters.");
  }
}
__name(validateWorkerConfig, "validateWorkerConfig");
async function missingSchemaTables(db) {
  const rows = (await db.execute({
    sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${requiredTables.map(() => "?").join(",")})`,
    args: requiredTables
  })).rows;
  const existing = new Set(rows.map((row) => String(row.name)));
  const missing = requiredTables.filter((table) => !existing.has(table));
  if (!existing.has("users")) return missing;
  const userColumns = new Set((await db.execute("PRAGMA table_info('users')")).rows.map((row) => String(row.name)));
  if (!userColumns.has("username")) missing.push("users.username");
  if (!userColumns.has("recovery_key_hash")) missing.push("users.recovery_key_hash");
  if (!userColumns.has("session_version")) missing.push("users.session_version");
  if (existing.has("analytics_upload_settings")) {
    const analyticsUploadColumns = new Set((await db.execute("PRAGMA table_info('analytics_upload_settings')")).rows.map((row) => String(row.name)));
    if (!analyticsUploadColumns.has("google_folder_id")) missing.push("analytics_upload_settings.google_folder_id");
  }
  return missing;
}
__name(missingSchemaTables, "missingSchemaTables");
function databaseErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.trim().length === 0) return "Unknown database error.";
  return message.replace(/\s+/g, " ").slice(0, 240);
}
__name(databaseErrorMessage, "databaseErrorMessage");
async function register(request, env, db) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");
  const deviceId = normalizeId(body.deviceId, "deviceId");
  const deviceName = cleanText(body.deviceName, 80) || "Yutaka device";
  const platform = cleanText(body.platform, 40) || "unknown";
  validatePassword(password);
  const now = Date.now();
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password, env.JWT_SECRET);
  const recoveryKey = generateRecoveryKey();
  const recoveryKeyHash = await hashRecoveryKey(recoveryKey, env.JWT_SECRET);
  const transaction = await db.transaction("write");
  try {
    const userCount = Number((await transaction.execute("SELECT COUNT(*) AS count FROM users")).rows[0]?.count ?? 0);
    if (userCount > 0) {
      throw new HttpError(403, "Registration is managed by the Worker administrator at /profile.", "REGISTRATION_MANAGED");
    }
    await transaction.execute({
      sql: "INSERT INTO users(id, username, password_hash, recovery_key_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [userId, username, passwordHash, recoveryKeyHash, now, now]
    });
    await transaction.execute({
      sql: `INSERT OR IGNORE INTO worker_state(key, value) VALUES ('deployment_owner_user_id', ?)`,
      args: [userId]
    });
    await transaction.execute({
      sql: "INSERT INTO devices(id, user_id, name, platform, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [deviceId, userId, deviceName, platform, now, now]
    });
    await transaction.execute(`INSERT OR REPLACE INTO worker_state(key, value) VALUES ('registration_closed', '1')`);
    await transaction.commit();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const message = databaseErrorMessage(error);
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("constraint")) {
      throw new HttpError(409, "That username is already in use.");
    }
    throw new HttpError(503, `Could not create sync account: ${message}`);
  } finally {
    transaction.close();
  }
  return issueTokens(env, db, { userId, username, deviceId }, recoveryKey);
}
__name(register, "register");
async function deploymentRecoveryOwnerUserId(db) {
  const firstUser = await db.execute({
    sql: `SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1`,
    args: []
  });
  const userId = String(firstUser.rows[0]?.id ?? "").trim();
  if (!userId) throw new HttpError(404, "No sync account exists yet.", "DEPLOYMENT_RECOVERY_NO_OWNER");
  const owner = await db.execute({
    sql: `SELECT value FROM worker_state WHERE key = 'deployment_owner_user_id'`,
    args: []
  });
  const configured = String(owner.rows[0]?.value ?? "").trim();
  if (configured !== userId) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO worker_state(key, value) VALUES ('deployment_owner_user_id', ?)`,
      args: [userId]
    });
  }
  return userId;
}
__name(deploymentRecoveryOwnerUserId, "deploymentRecoveryOwnerUserId");
async function requireDeploymentRecoveryOwner(db, auth) {
  const ownerUserId = await deploymentRecoveryOwnerUserId(db);
  if (ownerUserId !== auth.userId) {
    throw new HttpError(
      403,
      "Deployment values can only be recovered by the current Worker administrator account.",
      "DEPLOYMENT_RECOVERY_OWNER_REQUIRED"
    );
  }
}
__name(requireDeploymentRecoveryOwner, "requireDeploymentRecoveryOwner");
function deploymentRecoveryProfilePayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpError(400, "Deployment recovery profile is missing.");
  }
  const source = raw;
  const value = /* @__PURE__ */ __name((key, max = 4096) => {
    const result = String(source[key] ?? "").trim();
    if (!result || result.length > max) throw new HttpError(400, `Invalid deployment recovery field: ${key}.`);
    return result;
  }, "value");
  const workerName = value("workerName", 63).toLowerCase();
  const cloudflareAccountId = value("cloudflareAccountId", 64);
  const cloudflareApiToken = value("cloudflareApiToken", 4096);
  const tursoDatabaseUrl = value("tursoDatabaseUrl", 2048);
  const tursoAuthToken = value("tursoAuthToken", 4096);
  const jwtSecret = value("jwtSecret", 1024);
  const workerUrl = value("workerUrl", 2048);
  const workerVersion = value("workerVersion", 64);
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(workerName)) {
    throw new HttpError(400, "Invalid Worker name in the deployment recovery profile.");
  }
  if (!/^[A-Fa-f0-9]{32}$/.test(cloudflareAccountId)) {
    throw new HttpError(400, "Invalid Cloudflare Account ID in the deployment recovery profile.");
  }
  if (!/^libsql:\/\/[A-Za-z0-9.-]+\.turso\.io\/?$/.test(tursoDatabaseUrl)) {
    throw new HttpError(400, "Invalid Turso database URL in the deployment recovery profile.");
  }
  if (jwtSecret.length < 32) throw new HttpError(400, "Invalid JWT secret in the deployment recovery profile.");
  let parsedWorkerUrl;
  try {
    parsedWorkerUrl = new URL(workerUrl);
  } catch {
    throw new HttpError(400, "Invalid Worker URL in the deployment recovery profile.");
  }
  if (parsedWorkerUrl.protocol !== "https:" || parsedWorkerUrl.username || parsedWorkerUrl.password || parsedWorkerUrl.pathname !== "/" || parsedWorkerUrl.search || parsedWorkerUrl.hash) {
    throw new HttpError(400, "Invalid Worker URL in the deployment recovery profile.");
  }
  return {
    version: 2,
    workerName,
    cloudflareAccountId,
    cloudflareApiToken,
    tursoDatabaseUrl,
    tursoAuthToken,
    jwtSecret,
    workerUrl: workerUrl.replace(/\/+$/, ""),
    workerVersion
  };
}
__name(deploymentRecoveryProfilePayload, "deploymentRecoveryProfilePayload");
async function saveDeploymentRecoveryProfile(request, db, env, auth) {
  await requireDeploymentRecoveryOwner(db, auth);
  const body = await readJson(request);
  const profile2 = deploymentRecoveryProfilePayload(body.profile);
  const encrypted = await encryptWorkerSecret(
    env.JWT_SECRET,
    "deployment-recovery-v1",
    JSON.stringify(profile2)
  );
  await db.batch(
    [
      {
        sql: `INSERT OR REPLACE INTO worker_state(key, value) VALUES ('deployment_recovery_ciphertext', ?)`,
        args: [encrypted.ciphertext]
      },
      {
        sql: `INSERT OR REPLACE INTO worker_state(key, value) VALUES ('deployment_recovery_iv', ?)`,
        args: [encrypted.iv]
      },
      {
        sql: `INSERT OR REPLACE INTO worker_state(key, value) VALUES ('deployment_recovery_updated_at', ?)`,
        args: [String(Date.now())]
      }
    ],
    "write"
  );
  return privateJson({ ok: true, saved: true });
}
__name(saveDeploymentRecoveryProfile, "saveDeploymentRecoveryProfile");
async function deploymentRecoveryProfile(db, env, auth) {
  await requireDeploymentRecoveryOwner(db, auth);
  const rows = await db.execute({
    sql: `SELECT key, value FROM worker_state
          WHERE key IN ('deployment_recovery_ciphertext', 'deployment_recovery_iv', 'deployment_recovery_updated_at')`,
    args: []
  });
  const values = /* @__PURE__ */ new Map();
  for (const row of rows.rows) values.set(String(row.key), String(row.value));
  const ciphertext = values.get("deployment_recovery_ciphertext") ?? "";
  const iv = values.get("deployment_recovery_iv") ?? "";
  if (!ciphertext || !iv) {
    throw new HttpError(404, "No deployment recovery profile has been saved yet.", "DEPLOYMENT_RECOVERY_NOT_FOUND");
  }
  const plaintext = await decryptWorkerSecret(
    env.JWT_SECRET,
    "deployment-recovery-v1",
    ciphertext,
    iv,
    "The saved deployment recovery profile can no longer be decrypted. Redeploy once from a device that still has the deployment values."
  );
  let decoded;
  try {
    decoded = JSON.parse(plaintext);
  } catch {
    throw new HttpError(503, "The saved deployment recovery profile is damaged.");
  }
  return privateJson({
    profile: deploymentRecoveryProfilePayload(decoded),
    updatedAt: Number(values.get("deployment_recovery_updated_at") ?? 0)
  });
}
__name(deploymentRecoveryProfile, "deploymentRecoveryProfile");
async function deleteDeploymentRecoveryProfile(db, auth) {
  await requireDeploymentRecoveryOwner(db, auth);
  await db.batch(
    [
      { sql: `DELETE FROM worker_state WHERE key = 'deployment_recovery_ciphertext'`, args: [] },
      { sql: `DELETE FROM worker_state WHERE key = 'deployment_recovery_iv'`, args: [] },
      { sql: `DELETE FROM worker_state WHERE key = 'deployment_recovery_updated_at'`, args: [] }
    ],
    "write"
  );
  return privateJson({ ok: true, deleted: true });
}
__name(deleteDeploymentRecoveryProfile, "deleteDeploymentRecoveryProfile");
function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
__name(delay, "delay");
function privateJson(value, status2 = 200) {
  const response = json(value, status2);
  response.headers.set("cache-control", "no-store, private");
  return response;
}
__name(privateJson, "privateJson");
async function login(request, env, db) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");
  const deviceId = normalizeId(body.deviceId, "deviceId");
  const deviceName = cleanText(body.deviceName, 80) || "Yutaka device";
  const platform = cleanText(body.platform, 40) || "unknown";
  const row = (await db.execute({ sql: "SELECT id, username, password_hash, session_version FROM users WHERE username = ?", args: [username] })).rows[0];
  if (!row || !await verifyPassword(password, String(row.password_hash), env.JWT_SECRET)) {
    throw new HttpError(401, "Invalid username or password.");
  }
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO devices(id, user_id, name, platform, created_at, last_seen_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, id) DO UPDATE SET name = excluded.name, platform = excluded.platform, last_seen_at = excluded.last_seen_at, revoked_at = NULL`,
    args: [deviceId, String(row.id), deviceName, platform, now, now]
  });
  return issueTokens(env, db, { userId: String(row.id), username: String(row.username), deviceId, sessionVersion: Number(row.session_version) });
}
__name(login, "login");
async function recoverAccount(request, env, db) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const recoveryKey = normalizeRecoveryKey(body.recoveryKey);
  const newPassword = String(body.newPassword ?? "");
  const deviceId = normalizeId(body.deviceId, "deviceId");
  const deviceName = cleanText(body.deviceName, 80) || "Yutaka device";
  const platform = cleanText(body.platform, 40) || "unknown";
  validatePassword(newPassword);
  await enforceRateLimit(db, `recover:${username}`, 8, 15 * 60 * 1e3);
  const row = (await db.execute({
    sql: "SELECT id, username, recovery_key_hash FROM users WHERE username = ?",
    args: [username]
  })).rows[0];
  const storedRecoveryHash = String(row?.recovery_key_hash ?? "");
  if (!row || !storedRecoveryHash || !constantTimeEqual(await hashRecoveryKey(recoveryKey, env.JWT_SECRET), storedRecoveryHash)) {
    throw new HttpError(401, "Username or recovery key is incorrect.");
  }
  const now = Date.now();
  const passwordHash = await hashPassword(newPassword, env.JWT_SECRET);
  const transaction = await db.transaction("write");
  let sessionVersion = 0;
  try {
    const changed = await transaction.execute({
      sql: "UPDATE users SET password_hash = ?, updated_at = ?, session_version = session_version + 1 WHERE id = ? AND recovery_key_hash = ? RETURNING session_version",
      args: [passwordHash, now, String(row.id), storedRecoveryHash]
    });
    if (!changed.rows[0]) throw new HttpError(401, "Account or recovery key is no longer valid.");
    sessionVersion = Number(changed.rows[0].session_version);
    await transaction.execute({
      sql: "UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
      args: [now, String(row.id)]
    });
    await transaction.execute({
      sql: `INSERT INTO devices(id, user_id, name, platform, created_at, last_seen_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, id) DO UPDATE SET name = excluded.name, platform = excluded.platform, last_seen_at = excluded.last_seen_at, revoked_at = NULL`,
      args: [deviceId, String(row.id), deviceName, platform, now, now]
    });
    await transaction.commit();
  } finally {
    transaction.close();
  }
  return issueTokens(env, db, { userId: String(row.id), username: String(row.username), deviceId, sessionVersion });
}
__name(recoverAccount, "recoverAccount");
async function rotateRecoveryKey(env, db, auth) {
  const recoveryKey = generateRecoveryKey();
  const recoveryKeyHash = await hashRecoveryKey(recoveryKey, env.JWT_SECRET);
  const changed = await db.execute({
    sql: "UPDATE users SET recovery_key_hash = ?, updated_at = ? WHERE id = ? AND session_version = ?",
    args: [recoveryKeyHash, Date.now(), auth.userId, auth.sessionVersion ?? 0]
  });
  if (!changed.rowsAffected) throw new HttpError(401, "Account session was revoked. Sign in again.");
  return privateJson({ ok: true, recoveryKey });
}
__name(rotateRecoveryKey, "rotateRecoveryKey");
async function refresh(request, env, db) {
  const body = await readJson(request);
  const refreshToken = String(body.refreshToken ?? "");
  const deviceId = normalizeId(body.deviceId, "deviceId");
  if (!refreshToken) throw new HttpError(401, "Missing refresh token.");
  const tokenHash = await sha256(refreshToken);
  const transaction = await syncWriteTransaction(db);
  try {
    const now = Date.now();
    const row = (await transaction.execute({
      sql: `SELECT rt.id, rt.user_id, rt.revoked_at, rt.rotated_at, u.username, u.session_version
            FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = ? AND rt.device_id = ? AND rt.expires_at > ?`,
      args: [tokenHash, deviceId, now]
    })).rows[0];
    if (!row) throw new HttpError(401, "Refresh token is invalid or expired.");
    const replacement = await signDetached(
      env.JWT_SECRET,
      `yutaka-refresh-rotation:${String(row.id)}:${Number(row.session_version)}:${deviceId}`
    );
    const replacementHash = await sha256(replacement);
    let refreshExpiresAt;
    if (row.revoked_at == null) {
      refreshExpiresAt = now + numberEnv(env.REFRESH_TOKEN_TTL_SECONDS, 2592e3) * 1e3;
      await transaction.execute({
        sql: `INSERT INTO refresh_tokens(id, user_id, token_hash, device_id, expires_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), String(row.user_id), replacementHash, deviceId, refreshExpiresAt, now]
      });
      await transaction.execute({
        sql: "UPDATE refresh_tokens SET revoked_at = ?, rotated_at = ? WHERE id = ?",
        args: [now, now, String(row.id)]
      });
    } else {
      const rotatedAt = Number(row.rotated_at ?? 0);
      if (!rotatedAt || Number(row.revoked_at) !== rotatedAt || now - rotatedAt > 12e4) {
        throw new HttpError(401, "Refresh token is invalid or expired.");
      }
      const existing = (await transaction.execute({
        sql: `SELECT expires_at FROM refresh_tokens
              WHERE user_id = ? AND device_id = ? AND token_hash = ? AND revoked_at IS NULL AND expires_at > ?`,
        args: [String(row.user_id), deviceId, replacementHash, now]
      })).rows[0];
      if (!existing) throw new HttpError(401, "Refresh token is invalid or expired.");
      refreshExpiresAt = Number(existing.expires_at);
    }
    await transaction.commit();
    return authSessionResponse(env, {
      userId: String(row.user_id),
      username: String(row.username),
      deviceId,
      sessionVersion: Number(row.session_version)
    }, replacement, refreshExpiresAt);
  } finally {
    transaction.close();
  }
}
__name(refresh, "refresh");
async function logout(request, db, auth) {
  const body = await readJson(request);
  const refreshToken = String(body.refreshToken ?? "");
  if (refreshToken) {
    await db.execute({
      sql: "UPDATE refresh_tokens SET revoked_at = ?, rotated_at = NULL WHERE user_id = ? AND token_hash = ?",
      args: [Date.now(), auth.userId, await sha256(refreshToken)]
    });
  }
  return json({ ok: true });
}
__name(logout, "logout");
async function openLiveSync(request, env, auth) {
  if (!env.SYNC_HUB) throw new HttpError(503, "Realtime sync is not configured on this Worker. Redeploy the latest Worker configuration.");
  if ((request.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") {
    throw new HttpError(426, "Expected a WebSocket upgrade.");
  }
  const id = env.SYNC_HUB.idFromName(auth.userId);
  const headers = new Headers(request.headers);
  headers.set("x-yutaka-device-id", auth.deviceId);
  return env.SYNC_HUB.get(id).fetch(new Request("https://sync-hub/live", {
    method: "GET",
    headers
  }));
}
__name(openLiveSync, "openLiveSync");
async function notifySyncHub(env, auth) {
  if (!env.SYNC_HUB) return;
  try {
    const id = env.SYNC_HUB.idFromName(auth.userId);
    await env.SYNC_HUB.get(id).fetch(new Request("https://sync-hub/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: auth.deviceId, changedAt: Date.now() })
    }));
  } catch (error) {
    console.warn("Realtime sync notification failed", databaseErrorMessage(error));
  }
}
__name(notifySyncHub, "notifySyncHub");
var profileMediaMaxBytes = 50 * 1024 * 1024;
var profileMediaMaxChunks = 128;
var profileMediaChunkBytes = 10 * 1024 * 1024;
var profileMediaMaxEncodedChunkLength = Math.ceil(profileMediaChunkBytes / 3) * 4;
function profileMediaVersion(value) {
  return normalizeId(value, "profile media version");
}
__name(profileMediaVersion, "profileMediaVersion");
function profileMediaKind(value) {
  const kind = String(value ?? "").trim();
  if (kind !== "photo" && kind !== "gif" && kind !== "video") {
    throw new HttpError(400, "Invalid profile media type.");
  }
  return kind;
}
__name(profileMediaKind, "profileMediaKind");
function profileMediaSize(value) {
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size <= 0 || size > profileMediaMaxBytes) {
    throw new HttpError(400, "Profile media must be 50 MB or smaller.");
  }
  return size;
}
__name(profileMediaSize, "profileMediaSize");
function profileMediaChunkCount(value) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count <= 0 || count > profileMediaMaxChunks) {
    throw new HttpError(400, "Invalid profile media chunk count.");
  }
  return count;
}
__name(profileMediaChunkCount, "profileMediaChunkCount");
function profileMediaScale(value, fallback = 1) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(3, Math.max(1, parsed));
}
__name(profileMediaScale, "profileMediaScale");
function profileMediaAlignment(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(1, Math.max(-1, parsed));
}
__name(profileMediaAlignment, "profileMediaAlignment");
async function beginProfileMediaUpload(request, db, auth) {
  const body = await readJson(request);
  const version2 = profileMediaVersion(body.version);
  profileMediaSize(body.sizeBytes);
  profileMediaChunkCount(body.chunkCount);
  const current = (await db.execute({
    sql: "SELECT version FROM profile_media WHERE user_id = ?",
    args: [auth.userId]
  })).rows[0];
  const currentVersion = current ? String(current.version) : "";
  if (currentVersion) {
    await db.execute({
      sql: "DELETE FROM profile_media_chunks WHERE user_id = ? AND version <> ?",
      args: [auth.userId, currentVersion]
    });
  } else {
    await db.execute({ sql: "DELETE FROM profile_media_chunks WHERE user_id = ?", args: [auth.userId] });
  }
  if (version2 !== currentVersion) {
    await db.execute({
      sql: "DELETE FROM profile_media_chunks WHERE user_id = ? AND version = ?",
      args: [auth.userId, version2]
    });
  }
  return json({ ok: true, version: version2 });
}
__name(beginProfileMediaUpload, "beginProfileMediaUpload");
async function uploadProfileMediaChunk(request, db, auth) {
  const body = await readJson(request);
  const version2 = profileMediaVersion(body.version);
  const index = Number(body.index);
  if (!Number.isSafeInteger(index) || index < 0 || index >= profileMediaMaxChunks) {
    throw new HttpError(400, "Invalid profile media chunk index.");
  }
  const data = typeof body.data === "string" ? body.data : "";
  if (!data || data.length > profileMediaMaxEncodedChunkLength || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new HttpError(400, "Invalid profile media chunk.");
  }
  await db.execute({
    sql: `INSERT INTO profile_media_chunks(user_id, version, chunk_index, data_base64)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, version, chunk_index) DO UPDATE SET data_base64 = excluded.data_base64`,
    args: [auth.userId, version2, index, data]
  });
  return json({ ok: true, index });
}
__name(uploadProfileMediaChunk, "uploadProfileMediaChunk");
async function completeProfileMediaUpload(request, db, auth) {
  const body = await readJson(request);
  const version2 = profileMediaVersion(body.version);
  const originalName = cleanText(body.originalName, 240);
  if (!originalName) throw new HttpError(400, "Profile media file name is required.");
  const kind = profileMediaKind(body.kind);
  const sizeBytes = profileMediaSize(body.sizeBytes);
  const chunkCount = profileMediaChunkCount(body.chunkCount);
  const scale = profileMediaScale(body.scale);
  const alignmentX = profileMediaAlignment(body.alignmentX);
  const alignmentY = profileMediaAlignment(body.alignmentY);
  const uploaded = (await db.execute({
    sql: "SELECT COUNT(*) AS count FROM profile_media_chunks WHERE user_id = ? AND version = ?",
    args: [auth.userId, version2]
  })).rows[0];
  if (Number(uploaded?.count ?? 0) !== chunkCount) {
    throw new HttpError(409, "Profile media upload is incomplete. Retry the upload.");
  }
  const now = Date.now();
  await db.batch([
    {
      sql: `INSERT INTO profile_media(user_id, version, original_name, media_kind, size_bytes, chunk_count, scale, alignment_x, alignment_y, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              version = excluded.version,
              original_name = excluded.original_name,
              media_kind = excluded.media_kind,
              size_bytes = excluded.size_bytes,
              chunk_count = excluded.chunk_count,
              scale = excluded.scale,
              alignment_x = excluded.alignment_x,
              alignment_y = excluded.alignment_y,
              updated_at = excluded.updated_at`,
      args: [auth.userId, version2, originalName, kind, sizeBytes, chunkCount, scale, alignmentX, alignmentY, now]
    },
    {
      sql: "DELETE FROM profile_media_chunks WHERE user_id = ? AND version <> ?",
      args: [auth.userId, version2]
    }
  ], "write");
  return json({ ok: true, version: version2, updatedAt: now });
}
__name(completeProfileMediaUpload, "completeProfileMediaUpload");
async function profileMediaMetadata(db, auth) {
  const row = (await db.execute({
    sql: `SELECT version, original_name, media_kind, size_bytes, chunk_count, scale, alignment_x, alignment_y, updated_at
          FROM profile_media WHERE user_id = ?`,
    args: [auth.userId]
  })).rows[0];
  if (!row) return privateJson({ media: null });
  return privateJson({
    media: {
      version: String(row.version),
      originalName: String(row.original_name),
      kind: String(row.media_kind),
      sizeBytes: Number(row.size_bytes),
      chunkCount: Number(row.chunk_count),
      scale: Number(row.scale),
      alignmentX: Number(row.alignment_x),
      alignmentY: Number(row.alignment_y),
      updatedAt: Number(row.updated_at)
    }
  });
}
__name(profileMediaMetadata, "profileMediaMetadata");
async function downloadProfileMediaChunk(url, db, auth) {
  const version2 = profileMediaVersion(url.searchParams.get("version"));
  const index = Number(url.searchParams.get("index") ?? "-1");
  if (!Number.isSafeInteger(index) || index < 0 || index >= profileMediaMaxChunks) {
    throw new HttpError(400, "Invalid profile media chunk index.");
  }
  const row = (await db.execute({
    sql: `SELECT c.data_base64
          FROM profile_media_chunks c
          JOIN profile_media m ON m.user_id = c.user_id AND m.version = c.version
          WHERE c.user_id = ? AND c.version = ? AND c.chunk_index = ?`,
    args: [auth.userId, version2, index]
  })).rows[0];
  if (!row) throw new HttpError(404, "Profile media chunk was not found.");
  return privateJson({ data: String(row.data_base64), index });
}
__name(downloadProfileMediaChunk, "downloadProfileMediaChunk");
async function updateProfileMediaFraming(request, db, auth) {
  const body = await readJson(request);
  const version2 = profileMediaVersion(body.version);
  const scale = profileMediaScale(body.scale);
  const alignmentX = profileMediaAlignment(body.alignmentX);
  const alignmentY = profileMediaAlignment(body.alignmentY);
  const now = Date.now();
  const result = await db.execute({
    sql: `UPDATE profile_media
          SET scale = ?, alignment_x = ?, alignment_y = ?, updated_at = ?
          WHERE user_id = ? AND version = ?`,
    args: [scale, alignmentX, alignmentY, now, auth.userId, version2]
  });
  if (!result.rowsAffected) throw new HttpError(409, "Profile media changed on another device. Sync and try again.");
  return json({ ok: true, version: version2, updatedAt: now });
}
__name(updateProfileMediaFraming, "updateProfileMediaFraming");
async function deleteProfileMedia(db, auth) {
  await db.batch([
    { sql: "DELETE FROM profile_media_chunks WHERE user_id = ?", args: [auth.userId] },
    { sql: "DELETE FROM profile_media WHERE user_id = ?", args: [auth.userId] }
  ], "write");
  return json({ ok: true });
}
__name(deleteProfileMedia, "deleteProfileMedia");
async function initialSync(request, db, auth) {
  const body = await readJson(request);
  const adoptLocal = Boolean(body.adoptLocal);
  if (adoptLocal && Array.isArray(body.operations)) {
    return pushWithOperations(db, auth, body.operations, 1e3);
  }
  return pull(new URL("https://yutaka.local/v1/sync/pull?cursor=0&limit=250"), { MAX_SYNC_BATCH_SIZE: "250" }, db, auth);
}
__name(initialSync, "initialSync");
async function push(request, env, db, auth) {
  const body = await readJson(request);
  return pushWithOperations(db, auth, body.operations, numberEnv(env.MAX_SYNC_BATCH_SIZE, 100));
}
__name(push, "push");
async function recoverLegacyResetData(db, userId) {
  if (legacyResetRecoveryCheckedUsers.has(userId)) return 0;
  const previewResetRow = (await db.execute({
    sql: `SELECT COALESCE(MAX(sequence), 0) AS sequence
          FROM sync_changes
          WHERE user_id = ? AND entity_type = '__reset__'`,
    args: [userId]
  })).rows[0];
  const previewResetSequence = Number(previewResetRow?.sequence ?? 0);
  if (!Number.isFinite(previewResetSequence) || previewResetSequence <= 0) {
    legacyResetRecoveryCheckedUsers.add(userId);
    return 0;
  }
  const transaction = await db.transaction("write");
  try {
    const resetRow = (await transaction.execute({
      sql: `SELECT COALESCE(MAX(sequence), 0) AS sequence
            FROM sync_changes
            WHERE user_id = ? AND entity_type = '__reset__'`,
      args: [userId]
    })).rows[0];
    const resetSequence = Number(resetRow?.sequence ?? 0);
    if (!Number.isFinite(resetSequence) || resetSequence <= 0) {
      await transaction.commit();
      legacyResetRecoveryCheckedUsers.add(userId);
      return 0;
    }
    const markerKey = `legacy_reset_merge_v1:${userId}:${resetSequence}`;
    const marker = (await transaction.execute({
      sql: "SELECT value FROM worker_state WHERE key = ? LIMIT 1",
      args: [markerKey]
    })).rows[0];
    if (marker) {
      await transaction.commit();
      legacyResetRecoveryCheckedUsers.add(userId);
      return 0;
    }
    const candidates = (await transaction.execute({
      sql: `WITH before_ranked AS (
              SELECT entity_type, entity_id, operation, version, payload_json, sequence,
                     ROW_NUMBER() OVER (
                       PARTITION BY entity_type, entity_id
                       ORDER BY sequence DESC
                     ) AS rn
              FROM sync_changes
              WHERE user_id = ?
                AND sequence < ?
                AND entity_type <> '__reset__'
            ),
            after_ranked AS (
              SELECT entity_type, entity_id, operation, sequence,
                     ROW_NUMBER() OVER (
                       PARTITION BY entity_type, entity_id
                       ORDER BY sequence DESC
                     ) AS rn
              FROM sync_changes
              WHERE user_id = ?
                AND sequence > ?
                AND entity_type <> '__reset__'
            )
            SELECT before_ranked.entity_type,
                   before_ranked.entity_id,
                   before_ranked.version,
                   before_ranked.payload_json,
                   before_ranked.sequence
            FROM before_ranked
            LEFT JOIN after_ranked
              ON after_ranked.entity_type = before_ranked.entity_type
             AND after_ranked.entity_id = before_ranked.entity_id
             AND after_ranked.rn = 1
            WHERE before_ranked.rn = 1
              AND before_ranked.operation = 'upsert'
              AND after_ranked.entity_type IS NULL
            ORDER BY before_ranked.sequence`,
      args: [userId, resetSequence, userId, resetSequence]
    })).rows;
    const currentRows = (await transaction.execute({
      sql: "SELECT entity_type, entity_id FROM sync_entities WHERE user_id = ?",
      args: [userId]
    })).rows;
    const currentKeys = new Set(currentRows.map((row) => `${String(row.entity_type)}\0${String(row.entity_id)}`));
    const recoverable = candidates.filter((row) => syncEntityTypeSet.has(String(row.entity_type))).filter((row) => row.payload_json !== null && row.payload_json !== void 0).filter((row) => !currentKeys.has(`${String(row.entity_type)}\0${String(row.entity_id)}`)).sort((a, b) => {
      const ai = syncEntityTypes.indexOf(String(a.entity_type));
      const bi = syncEntityTypes.indexOf(String(b.entity_type));
      return ai - bi || String(a.entity_id).localeCompare(String(b.entity_id));
    });
    const now = Date.now();
    const chunkSize = 40;
    for (let start = 0; start < recoverable.length; start += chunkSize) {
      const chunk = recoverable.slice(start, start + chunkSize);
      const statements = [];
      for (let index = 0; index < chunk.length; index += 1) {
        const row = chunk[index];
        const operationId = crypto.randomUUID();
        const version2 = Math.max(0, Number(row.version ?? 0)) + 1;
        const changedAt = now + start + index;
        statements.push(
          {
            sql: `INSERT INTO sync_entities(user_id, entity_type, entity_id, version, payload_json, deleted_at, updated_at, last_operation_id)
                  VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
                  ON CONFLICT(user_id, entity_type, entity_id) DO NOTHING`,
            args: [userId, String(row.entity_type), String(row.entity_id), version2, String(row.payload_json), changedAt, operationId]
          },
          {
            sql: `INSERT INTO sync_changes(user_id, entity_type, entity_id, operation, version, payload_json, device_id, operation_id, changed_at)
                  VALUES (?, ?, ?, 'upsert', ?, ?, 'worker-recovery', ?, ?)`,
            args: [userId, String(row.entity_type), String(row.entity_id), version2, String(row.payload_json), operationId, changedAt]
          }
        );
      }
      if (statements.length > 0) await transaction.batch(statements);
    }
    await transaction.execute({
      sql: "INSERT OR REPLACE INTO worker_state(key, value) VALUES (?, ?)",
      args: [markerKey, JSON.stringify({ recovered: recoverable.length, recoveredAt: now })]
    });
    await transaction.commit();
    legacyResetRecoveryCheckedUsers.add(userId);
    return recoverable.length;
  } finally {
    transaction.close();
  }
}
__name(recoverLegacyResetData, "recoverLegacyResetData");
async function syncWriteTransaction(db) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await db.transaction("write");
    } catch (error) {
      if (!/SQLITE_(BUSY|LOCKED)\b/.test(databaseErrorMessage(error))) throw error;
      if (attempt >= 4) throw new HttpError(503, "Sync database is busy. Retry shortly.", "SYNC_DATABASE_BUSY");
      await db.reconnect();
      await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
    }
  }
}
__name(syncWriteTransaction, "syncWriteTransaction");
async function pushWithOperations(db, auth, rawOperations, maxBatch) {
  if (!Array.isArray(rawOperations)) throw new HttpError(400, "operations must be an array.");
  if (rawOperations.length > maxBatch) throw new HttpError(413, `Batch limit is ${maxBatch} operations.`);
  const deduplicated = /* @__PURE__ */ new Map();
  for (const raw of rawOperations) {
    const op = validateOperation(raw);
    const previous = deduplicated.get(op.operationId);
    if (previous && (previous.entityType !== op.entityType || previous.entityId !== op.entityId || previous.operation !== op.operation || previous.baseVersion !== op.baseVersion || JSON.stringify(previous.payload) !== JSON.stringify(op.payload))) {
      throw new HttpError(400, "An operationId cannot identify different mutations.");
    }
    if (!previous) deduplicated.set(op.operationId, op);
  }
  const operations = [...deduplicated.values()];
  if (operations.length === 0) return json({ ok: true, accepted: [], conflicts: [] });
  const accepted = [];
  const conflicts = [];
  const transaction = await syncWriteTransaction(db);
  try {
    const processedPlaceholders = operations.map(() => "?").join(",");
    const processedRows = (await transaction.execute({
      sql: `SELECT p.operation_id, p.sequence,
                   COALESCE((
                     SELECT c.version FROM sync_changes c
                     WHERE c.user_id = p.user_id AND c.operation_id = p.operation_id
                     ORDER BY c.sequence DESC LIMIT 1
                   ), 0) AS version
            FROM processed_operations p
            WHERE p.user_id = ? AND p.operation_id IN (${processedPlaceholders})`,
      args: [auth.userId, ...operations.map((op) => op.operationId)]
    })).rows;
    const processedById = new Map(
      processedRows.map((row) => [
        String(row.operation_id),
        { sequence: Number(row.sequence), version: Number(row.version) }
      ])
    );
    const pending = [];
    const failed = [];
    for (const op of operations) {
      const processed = processedById.get(op.operationId);
      if (processed && processed.version > 0) {
        accepted.push({ operationId: op.operationId, sequence: processed.sequence, version: processed.version });
      } else if (processed) {
        failed.push(op);
      } else {
        pending.push(op);
      }
    }
    if (pending.length > 0) {
      const prepared = pending.map((op) => {
        const baseVersion = op.baseVersion ?? 0;
        const version2 = baseVersion + 1;
        const now = Date.now();
        const payloadJson = op.operation === "delete" ? null : JSON.stringify(op.payload ?? {});
        return { op, baseVersion, version: version2, now, payloadJson };
      });
      const casResults = await transaction.batch(prepared.map((item) => ({
        sql: `INSERT INTO sync_entities(user_id, entity_type, entity_id, version, payload_json, deleted_at, updated_at, last_operation_id)
              SELECT ?, ?, ?, ?, ?, ?, ?, ?
              WHERE ? = 0 OR EXISTS (
                SELECT 1 FROM sync_entities
                WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND version = ?
              )
              ON CONFLICT(user_id, entity_type, entity_id) DO UPDATE SET
                version = excluded.version,
                payload_json = excluded.payload_json,
                deleted_at = excluded.deleted_at,
                updated_at = excluded.updated_at,
                last_operation_id = excluded.last_operation_id
              WHERE sync_entities.version = ?`,
        args: [
          auth.userId,
          item.op.entityType,
          item.op.entityId,
          item.version,
          item.payloadJson ?? "{}",
          item.op.operation === "delete" ? item.now : null,
          item.now,
          item.op.operationId,
          item.baseVersion,
          auth.userId,
          item.op.entityType,
          item.op.entityId,
          item.baseVersion,
          item.baseVersion
        ]
      })));
      const succeeded = prepared.filter((_, index) => casResults[index].rowsAffected === 1);
      failed.push(...prepared.filter((_, index) => casResults[index].rowsAffected !== 1).map((item) => item.op));
      if (succeeded.length > 0) {
        const changeResults = await transaction.batch(succeeded.map((item) => ({
          sql: `INSERT INTO sync_changes(user_id, entity_type, entity_id, operation, version, payload_json, device_id, operation_id, changed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING sequence`,
          args: [
            auth.userId,
            item.op.entityType,
            item.op.entityId,
            item.op.operation,
            item.version,
            item.payloadJson,
            auth.deviceId,
            item.op.operationId,
            item.now
          ]
        })));
        const receipts = succeeded.map((item, index) => {
          const result = changeResults[index];
          const sequence = Number(result.rows[0]?.sequence ?? result.lastInsertRowid ?? 0);
          if (!Number.isFinite(sequence) || sequence <= 0) {
            throw new HttpError(503, "Could not determine the sync change sequence.");
          }
          return { item, sequence };
        });
        await transaction.batch(receipts.map((receipt) => ({
          sql: "INSERT INTO processed_operations(user_id, operation_id, sequence, created_at) VALUES (?, ?, ?, ?)",
          args: [auth.userId, receipt.item.op.operationId, receipt.sequence, receipt.item.now]
        })));
        for (const receipt of receipts) {
          accepted.push({
            operationId: receipt.item.op.operationId,
            sequence: receipt.sequence,
            version: receipt.item.version
          });
        }
      }
    }
    if (failed.length > 0) {
      const conditions = failed.map(() => "(entity_type = ? AND entity_id = ?)").join(" OR ");
      const versionRows = (await transaction.execute({
        sql: `SELECT entity_type, entity_id, version FROM sync_entities
              WHERE user_id = ? AND (${conditions})`,
        args: [auth.userId, ...failed.flatMap((op) => [op.entityType, op.entityId])]
      })).rows;
      const versions = new Map(
        versionRows.map((row) => [
          `${String(row.entity_type)}\0${String(row.entity_id)}`,
          Number(row.version)
        ])
      );
      for (const op of failed) {
        conflicts.push({
          operationId: op.operationId,
          entityType: op.entityType,
          entityId: op.entityId,
          serverVersion: versions.get(`${op.entityType}\0${op.entityId}`) ?? 0
        });
      }
    }
    await transaction.commit();
    return json({ ok: true, accepted, conflicts });
  } finally {
    transaction.close();
  }
}
__name(pushWithOperations, "pushWithOperations");
async function pull(url, env, db, auth) {
  const cursor = Number(url.searchParams.get("cursor") ?? "0");
  const requestedLimit = Number(url.searchParams.get("limit") ?? "100");
  if (!Number.isSafeInteger(cursor) || cursor < 0 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    throw new HttpError(400, "cursor and limit must be valid non-negative/positive integers.");
  }
  const limit = Math.min(requestedLimit, Math.max(1, Math.floor(numberEnv(env.MAX_SYNC_BATCH_SIZE, 100))));
  await recoverLegacyResetData(db, auth.userId);
  const rows = (await db.execute({
    sql: `SELECT sequence, entity_type, entity_id, operation, version, payload_json, device_id, operation_id, changed_at
          FROM sync_changes
          WHERE user_id = ? AND sequence > ?
          ORDER BY sequence
          LIMIT ?`,
    args: [auth.userId, cursor, limit + 1]
  })).rows;
  const page = rows.slice(0, limit);
  const nextCursor = page.length ? Number(page[page.length - 1].sequence) : cursor;
  return json({
    cursor: nextCursor,
    hasMore: rows.length > limit,
    changes: page.map((row) => ({
      sequence: Number(row.sequence),
      entityType: String(row.entity_type),
      entityId: String(row.entity_id),
      operation: String(row.operation),
      version: Number(row.version),
      payload: row.payload_json ? JSON.parse(String(row.payload_json)) : null,
      deviceId: String(row.device_id),
      operationId: String(row.operation_id),
      changedAt: Number(row.changed_at)
    }))
  });
}
__name(pull, "pull");
async function status(db, auth) {
  await db.execute({ sql: "UPDATE devices SET last_seen_at = ? WHERE user_id = ? AND id = ?", args: [Date.now(), auth.userId, auth.deviceId] });
  return json({ ok: true, serverCursor: await maxSequence(db, auth), userId: auth.userId, deviceId: auth.deviceId });
}
__name(status, "status");
async function maxSequence(db, auth) {
  const row = (await db.execute({ sql: "SELECT COALESCE(MAX(sequence), 0) AS sequence FROM sync_changes WHERE user_id = ?", args: [auth.userId] })).rows[0];
  return Number(row?.sequence ?? 0);
}
__name(maxSequence, "maxSequence");
async function issueTokens(env, db, auth, recoveryKey) {
  const now = Date.now();
  const refreshExpiresAt = now + numberEnv(env.REFRESH_TOKEN_TTL_SECONDS, 2592e3) * 1e3;
  const refreshToken = crypto.randomUUID() + "." + crypto.randomUUID();
  const inserted = await db.execute({
    sql: `INSERT INTO refresh_tokens(id, user_id, token_hash, device_id, expires_at, created_at)
          SELECT ?, ?, ?, ?, ?, ? FROM users WHERE id = ? AND session_version = ?`,
    args: [crypto.randomUUID(), auth.userId, await sha256(refreshToken), auth.deviceId, refreshExpiresAt, now, auth.userId, auth.sessionVersion ?? 0]
  });
  if (!inserted.rowsAffected) throw new HttpError(401, "Account session was revoked. Sign in again.");
  return authSessionResponse(env, auth, refreshToken, refreshExpiresAt, recoveryKey);
}
__name(issueTokens, "issueTokens");
async function authSessionResponse(env, auth, refreshToken, refreshExpiresAt, recoveryKey) {
  const accessExpiresAt = Date.now() + numberEnv(env.ACCESS_TOKEN_TTL_SECONDS, 900) * 1e3;
  const accessToken = await signToken(env.JWT_SECRET, { sub: auth.userId, username: auth.username, deviceId: auth.deviceId, ver: auth.sessionVersion ?? 0, exp: Math.floor(accessExpiresAt / 1e3) });
  return privateJson({
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
    user: { id: auth.userId, username: auth.username },
    deviceId: auth.deviceId,
    ...recoveryKey ? { recoveryKey } : {}
  });
}
__name(authSessionResponse, "authSessionResponse");
async function requireAuth(request, env, db) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Missing access token.");
  const payload = await verifyToken(env.JWT_SECRET, token);
  const row = (await db.execute({ sql: "SELECT session_version FROM users WHERE id = ?", args: [String(payload.sub)] })).rows[0];
  if (!row || Number(payload.ver ?? 0) !== Number(row.session_version)) {
    throw new HttpError(401, "Account session was revoked. Sign in again.");
  }
  const username = String(payload.username ?? payload.email ?? "");
  return { userId: String(payload.sub), username, deviceId: String(payload.deviceId), sessionVersion: Number(row.session_version) };
}
__name(requireAuth, "requireAuth");
async function signToken(secret, payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64urlBytes(sig)}`;
}
__name(signToken, "signToken");
async function verifyToken(secret, token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "Invalid access token.");
  const expected = await signDetached(secret, `${parts[0]}.${parts[1]}`);
  if (!constantTimeEqual(expected, parts[2])) throw new HttpError(401, "Invalid access token signature.");
  let payload;
  try {
    payload = JSON.parse(atobUrl(parts[1]));
  } catch {
    throw new HttpError(401, "Invalid access token.");
  }
  if (!payload || typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1e3)) throw new HttpError(401, "Access token expired.");
  return payload;
}
__name(verifyToken, "verifyToken");
async function signDetached(secret, value) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64urlBytes(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}
__name(signDetached, "signDetached");
async function hashPassword(password, _pepper = "") {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 1e5 }, key, 256);
  return `pbkdf2$100000$${b64urlBytes(salt)}$${b64urlBytes(bits)}`;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, stored, pepper = "") {
  const [scheme, first, second, third] = stored.split("$");
  if (scheme === "s256") {
    return constantTimeEqual(await sha256(`${first}.${pepper}.${password}`), second ?? "");
  }
  if (scheme !== "pbkdf2") return false;
  const iterationsRaw = first;
  const saltRaw = second;
  const hashRaw = third;
  if (!iterationsRaw || !saltRaw || !hashRaw) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = bytesFromB64Url(saltRaw);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: Number(iterationsRaw) }, key, 256);
  return constantTimeEqual(b64urlBytes(bits), hashRaw);
}
__name(verifyPassword, "verifyPassword");
function generateRecoveryKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  return `KLY-${body.slice(0, 5)}-${body.slice(5, 10)}-${body.slice(10, 15)}-${body.slice(15, 20)}`;
}
__name(generateRecoveryKey, "generateRecoveryKey");
async function hashRecoveryKey(recoveryKey, secret) {
  return sha256(`recovery.${secret}.${recoveryKey}`);
}
__name(hashRecoveryKey, "hashRecoveryKey");
function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
async function enforceRateLimit(db, key, maxAttempts, windowMs) {
  const now = Date.now();
  const row = (await db.execute({
    sql: `INSERT INTO rate_limits(key, window_start, count) VALUES (?, ?, 1)
          ON CONFLICT(key) DO UPDATE SET
            count = CASE WHEN window_start <= ? THEN 1 ELSE count + 1 END,
            window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END
          RETURNING count`,
    args: [key, now, now - windowMs, now - windowMs]
  })).rows[0];
  if (Number(row.count) > maxAttempts) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
}
__name(enforceRateLimit, "enforceRateLimit");
async function sha256(value) {
  return b64urlBytes(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}
__name(sha256, "sha256");
function validateOperation(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new HttpError(400, "Invalid sync operation.");
  const value = raw;
  const operation = String(value.operation ?? "");
  if (operation !== "upsert" && operation !== "delete") throw new HttpError(400, "Invalid operation.");
  const baseVersion = Number(value.baseVersion ?? 0);
  const clientUpdatedAt = Number(value.clientUpdatedAt ?? Date.now());
  if (!Number.isSafeInteger(baseVersion) || baseVersion < 0 || baseVersion >= Number.MAX_SAFE_INTEGER) {
    throw new HttpError(400, "Invalid baseVersion.");
  }
  if (!Number.isSafeInteger(clientUpdatedAt) || clientUpdatedAt < 0) throw new HttpError(400, "Invalid clientUpdatedAt.");
  if (operation === "upsert" && (!value.payload || typeof value.payload !== "object" || Array.isArray(value.payload))) {
    throw new HttpError(400, "Upsert payload must be an object.");
  }
  return {
    operationId: normalizeId(value.operationId, "operationId"),
    entityType: normalizeEntityType(value.entityType),
    entityId: normalizeId(value.entityId, "entityId"),
    operation,
    payload: value.payload,
    baseVersion,
    clientUpdatedAt
  };
}
__name(validateOperation, "validateOperation");
function normalizeUsername(value) {
  const username = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(username)) {
    throw new HttpError(400, "Username must be 3-32 characters using letters, numbers, dots, dashes, or underscores.");
  }
  return username;
}
__name(normalizeUsername, "normalizeUsername");
function normalizeRecoveryKey(value) {
  const recoveryKey = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^KLY-[A-Z0-9-]{23,80}$/.test(recoveryKey)) throw new HttpError(400, "Enter a valid recovery key.");
  return recoveryKey;
}
__name(normalizeRecoveryKey, "normalizeRecoveryKey");
function validatePassword(password) {
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
}
__name(validatePassword, "validatePassword");
function normalizeEntityType(value) {
  const entityType = String(value ?? "").trim();
  if (!syncEntityTypeSet.has(entityType)) throw new HttpError(400, "Unsupported sync entity type.");
  return entityType;
}
__name(normalizeEntityType, "normalizeEntityType");
function normalizeId(value, label) {
  const id = String(value ?? "").trim();
  if (!/^[A-Za-z0-9._:-]{3,120}$/.test(id)) throw new HttpError(400, `Invalid ${label}.`);
  return id;
}
__name(normalizeId, "normalizeId");
function cleanText(value, max) {
  return String(value ?? "").trim().slice(0, max);
}
__name(cleanText, "cleanText");
async function readJson(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a JSON object.");
    return value;
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}
__name(readJson, "readJson");
function numberEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
__name(numberEnv, "numberEnv");
function b64url(value) {
  return b64urlBytes(enc.encode(value));
}
__name(b64url, "b64url");
function b64urlBytes(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(b64urlBytes, "b64urlBytes");
function bytesFromB64Url(value) {
  const raw = atobUrl(value);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}
__name(bytesFromB64Url, "bytesFromB64Url");
function atobUrl(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}
__name(atobUrl, "atobUrl");
function json(value, status2 = 200) {
  return cors(new Response(JSON.stringify(value), {
    status: status2,
    headers: { "content-type": "application/json; charset=utf-8" }
  }));
}
__name(json, "json");
function cors(response) {
  response.headers.set("access-control-allow-origin", "*");
  response.headers.set("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  response.headers.set("access-control-allow-headers", "authorization,content-type");
  return response;
}
__name(cors, "cors");
var HttpError = class extends Error {
  constructor(status2, message, code) {
    super(message);
    this.status = status2;
    this.code = code;
  }
  status;
  code;
  static {
    __name(this, "HttpError");
  }
};
export {
  SyncHub,
  buildSimpleXlsxFromLines,
  index_default as default,
  deleteAccountPortal,
  deleteOwnAccount,
  handleRequest,
  hashPassword,
  login,
  nextScheduledUploadDueAt,
  nextTelegramBackupDueAt,
  profile,
  recoverAccount,
  refresh,
  register,
  requireAuth,
  rotateRecoveryKey,
  scheduledClockDistanceMinutes,
  verifyPassword
};
//# sourceMappingURL=index.js.map
