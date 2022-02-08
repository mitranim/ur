/*
Reference: https://en.wikipedia.org/wiki/Uniform_Resource_Identifier

JS doesn't support multiline regexes. To read and edit this, manually reformat
into multiline, then combine back into one line.
*/
export const RE_URL = /^(?:(?<scheme>[A-Za-z][\w+.-]*):(?:(?<slash>[/][/])(?:(?<username>[^\s/?#@:]*)(?::(?<password>[^\s/?#@]*))?@)?(?<hostname>[^\s/?#:]*)(?::(?<port>\d*))?)?)?(?<pathname>[^\s?#]*)(?:[?](?<search>[^\s#]*))?(?:[#](?<hash>[^\s]*))?$/
export const RE_SCHEME = /^[A-Za-z][\w+.-]*$/
export const RE_SLASH = /^[/]*$/
export const RE_PROTOCOL = /^(?:(?<scheme>[A-Za-z][\w+.-]*):(?<slash>[/][/])?)?$/
export const RE_USERNAME = /^[^\s/?#@:]*$/
export const RE_PASSWORD = /^[^\s/?#@]*$/
export const RE_HOSTNAME = /^[^\s/?#:]*$/
export const RE_PORT = /^\d*$/
export const RE_HOST = /^(?<hostname>[^\s/?#:]*)(?::(?<port>\d*))?$/
export const RE_ORIGIN = /^(?:(?<scheme>[A-Za-z][\w+.-]*):(?:(?<slash>[/][/])(?:(?<username>[^\s/?#@:]*)(?::(?<password>[^\s/?#@]*))?@)?(?<hostname>[^\s/?#:]*)(?::(?<port>\d*))?)?)?$/
export const RE_PATHNAME = /^[^\s?#]*$/
export const RE_HASH = /^\S*$/

export function search(val) {return new Search(val)}
export function url(val) {return new Url(val)}

export class Search extends Map {
  constructor(val) {
    super()
    this.str = ``
    this.prio = SYNCED
    if (!isEmpty(val)) this.mut(val)
  }

  has(key) {return isStrOpt(key) && (this.restruct(), super.has(key))}
  get(key) {return strOpt(key) && (this.restruct(), head(super.get(key)))}
  getAll(key) {return strOpt(key) && (this.restruct(), super.get(key))}
  set(key, val) {return this.delete(key), this.append(key, val)}
  setAll(key, vals) {return this.delete(key), this.appendAll(key, vals)}
  setAny(key, val) {return isArr(val) ? this.setAll(key, val) : this.set(key, val)}

  append(key, val) {
    if (!isStrOpt(key)) return this
    val = render(val)
    this.restruct()

    if (super.has(key)) super.get(key).push(val)
    else super.set(key, [val])

    this.prio = STRUCT
    return this
  }

  appendAll(key, vals) {
    if (isSome(vals)) {
      for (const val of req(vals, isIter)) this.append(key, val)
    }
    return this
  }

  appendAny(key, val) {
    return isArr(val) ? this.appendAll(key, val) : this.append(key, val)
  }

  delete(key) {
    return (
      isStrOpt(key) &&
      (this.restruct(), super.delete(key)) &&
      (this.prio = STRUCT, true)
    )
  }

  clear() {
    super.clear()
    this.str = ``
    this.prio = SYNCED
    return this
  }

  mut(val) {
    if (isStr(val)) return this.setStr(val)
    if (isInst(val, Search)) return this.setSearch(val)
    return this.clear().add(val)
  }

  add(val) {
    if (isNil(val)) return this
    if (isStr(val)) return this.addStr(val)
    if (isIter(val)) return this.addIter(val)
    if (isStruct(val)) return this.addIter(Object.entries(val))
    throw errConvert(val, `search`)
  }

  setStr(src) {
    this.str = toSearch(src)
    this.prio = STRING
    return this
  }

  addStr(src) {
    src = toSearch(src)
    this.decode(src)

    if (this.str) {
      this.str = ``
      this.prio = STRUCT
    }
    else {
      this.str = src
      this.prio = SYNCED
    }
    return this
  }

  setSearch(src) {
    reqInst(src, Search)

    this.clear()
    this.str = src.str
    this.prio = src.prio

    if (src.prio !== STRING) this.addIter(src)
    return this
  }

  addIter(src) {
    req(src, isIter)
    for (const [key, val] of src) this.appendAny(key, val)
    return this
  }

  bool(key) {return decodeBool(this.get(key))}
  int(key) {return decodeInt(this.get(key))}
  fin(key) {return decodeFin(this.get(key))}

  decode(val) {
    for (val of split(val, `&`)) {
      const ind = val.indexOf(`=`)
      this.append(
        decodeURIComponent(val.slice(0, ind)),
        decodeURIComponent(val.slice(ind + 1)),
      )
    }
  }

  encode() {
    let out = ``
    for (let [key, val] of super.entries()) {
      key = encodeURIComponent(key)
      for (val of val) out += `${out && `&`}${key}=${encodeURIComponent(val)}`
    }
    return out
  }

  restring() {
    if (this.prio === STRUCT) {
      this.str = this.encode()
      this.prio = SYNCED
    }
    return this
  }

  restruct() {
    if (this.prio === STRING) {
      super.clear()
      this.prio = SYNCED
      this.decode(this.str)
      this.prio = SYNCED
    }
    return this
  }

  dict() {
    const out = Object.create(null)
    for (const [key, val] of this.entries()) if (val.length) out[key] = val[0]
    return out
  }

  dictAll() {
    const out = Object.create(null)
    for (const [key, val] of this.entries()) out[key] = val
    return out
  }

  clone() {return new this.constructor(this)}
  toStringFull() {return optPre(this.toString(), `?`)}
  toString() {return this.restring().str}
  toJSON() {return this.toString() || null}

  get size() {return this.restruct(), super.size}
  keys() {return this.restruct(), super.keys()}
  values() {return this.restruct(), super.values()}
  entries() {return this.restruct(), super.entries()}
  [Symbol.iterator]() {return this.restruct(), super[Symbol.iterator]()}

  get [Symbol.toStringTag]() {return this.constructor.name}
}

export class Url {
  constructor(val) {
    this[schemeKey] = ``
    this[slashKey] = ``
    this[usernameKey] = ``
    this[passwordKey] = ``
    this[hostnameKey] = ``
    this[portKey] = ``
    this[pathnameKey] = ``
    this[searchParamsKey] = new this.Search()
    this[hashKey] = ``
    if (!isEmpty(val)) this.mut(val)
  }

  get scheme() {return this[schemeKey]}

  set scheme(val) {
    if (!(this[schemeKey] = toScheme(val))) {
      this[slashKey] = ``
      this[hostnameKey] = ``
      this[portKey] = ``
    }
  }

  get slash() {return this[slashKey]}

  set slash(val) {
    if (!(this[slashKey] = toSlash(val))) {
      this[usernameKey] = ``
      this[passwordKey] = ``
      this[hostnameKey] = ``
      this[portKey] = ``
    }
  }

  get username() {return this[usernameKey]}
  set username(val) {this[usernameKey] = toUsername(val, this[slashKey])}

  get password() {return this[passwordKey]}
  set password(val) {this[passwordKey] = toPassword(val, this[slashKey])}

  get hostname() {return this[hostnameKey]}
  set hostname(val) {this[hostnameKey] = toHostname(val, this[slashKey])}

  get port() {return this[portKey]}
  set port(val) {this[portKey] = toPort(val, this[slashKey])}

  get pathname() {return this[pathnameKey]}
  set pathname(val) {this[pathnameKey] = toPathname(val)}

  get search() {return this[searchParamsKey] + ``}
  set search(val) {this[searchParamsKey].setStr(str(val))}

  get searchParams() {return this[searchParamsKey]}
  set searchParams(val) {this[searchParamsKey].mut(val)}

  get query() {return this.searchParams}
  set query(val) {this.searchParams = val}

  get hash() {return this[hashKey]}
  set hash(val) {this[hashKey] = stripPre(toHash(val), `#`)}

  get protocol() {return this.schemeFull() + this.slash}

  set protocol(val) {
    const gr = reqGroups(val, RE_PROTOCOL, `protocol`)
    this.slash = gr.slash
    this.scheme = gr.scheme
  }

  get host() {return optSuf(this.hostname, this.portFull())}

  set host(val) {
    if (val && !this[slashKey]) throw errSlash(`host`)
    const gr = reqGroups(val, RE_HOST, `host`)
    this[hostnameKey] = str(gr.hostname)
    this[portKey] = str(gr.port)
  }

  get origin() {return optPre(this.host, this.protocol)}

  set origin(val) {
    const gr = reqGroups(val, RE_ORIGIN, `origin`)
    this[hostnameKey] = str(gr.hostname)
    this[portKey] = str(gr.port)
    this.slash = str(gr.slash)
    this.scheme = str(gr.scheme)
  }

  get href() {return `${this.protocol}${this.authFull()}${this.hostPath()}${this.searchFull()}${this.hashFull()}`}
  set href(val) {this.mut(val)}

  setScheme(val) {return this.scheme = val, this}
  setSlash(val) {return this.slash = val, this}
  setUsername(val) {return this.username = val, this}
  setPassword(val) {return this.password = val, this}
  setHostname(val) {return this.hostname = val, this}
  setPort(val) {return this.port = val, this}
  setPathname(val) {return this.pathname = val, this}
  setSearch(val) {return this.search = val, this}
  setSearchParams(val) {return this.searchParams = val, this}
  setQuery(val) {return this.searchParams = val, this}
  addQuery(val) {return this[searchParamsKey].add(val), this}
  setHash(val) {return this.hash = val, this}
  setHashExact(val) {return this[hashKey] = toHash(val), this}
  setProtocol(val) {return this.protocol = val, this}
  setHost(val) {return this.host = val, this}
  setOrigin(val) {return this.origin = val, this}
  setHref(val) {return this.href = val, this}

  schemeFull() {return optSuf(this[schemeKey], `:`)}
  portFull() {return optPre(this[portKey], `:`)}
  pathnameFull() {return maybePre(this[pathnameKey], `/`) || `/`}
  searchFull() {return this[searchParamsKey].toStringFull()}
  hashFull() {return optPre(this[hashKey], `#`)}
  base() {return `${this.protocol}${this.authFull()}${this.host}`}
  hostPath() {return inter(this.host, `/`, this.pathname)}
  auth() {return this.username + optPre(this.password, `:`)}
  authFull() {return optSuf(this.auth(), `@`)}
  rel() {return this.pathname + this.searchFull() + this.hashFull()}

  setPath(...vals) {return this.setPathname().addPath(...vals)}
  addPath(...vals) {return vals.forEach(this.addSeg, this), this}

  addSeg(seg) {
    const val = render(seg)
    if (!val) throw SyntaxError(`invalid empty URL segment ${show(seg)}`)
    this[pathnameKey] = inter(this[pathnameKey], `/`, val)
    return this
  }

  mut(val) {
    if (isNil(val)) return this.clear()
    if (isStr(val)) return this.setStr(val)
    if (isURL(val)) return this.setURL(val)
    if (isUrl(val)) return this.setUrl(val)
    if (isLoc(val)) return this.setStr(val.href)
    throw errConvert(val, this.constructor.name)
  }

  setStr(val) {
    const gr = reqGroups(val, RE_URL, `URL`)
    this[schemeKey] = str(gr.scheme)
    this[slashKey] = str(gr.slash)
    this[usernameKey] = str(gr.username)
    this[passwordKey] = str(gr.password)
    this[hostnameKey] = str(gr.hostname)
    this[portKey] = str(gr.port)
    this[pathnameKey] = str(gr.pathname)
    this[searchParamsKey].mut(gr.search)
    this[hashKey] = str(gr.hash)
    return this
  }

  setURL(val) {
    req(val, isURL)
    this[schemeKey] = stripSuf(val.protocol, `:`)
    this[slashKey] = val.href.startsWith(val.protocol + `//`) ? `//` : ``
    this[usernameKey] = val.username
    this[passwordKey] = val.password
    this[hostnameKey] = val.hostname
    this[portKey] = val.port
    this[pathnameKey] = val.pathname
    this[searchParamsKey].mut(val.searchParams)
    this[hashKey] = val.hash
    return this
  }

  setUrl(val) {
    req(val, isUrl)
    this[schemeKey] = val.scheme
    this[slashKey] = val.slash
    this[usernameKey] = val.username
    this[passwordKey] = val.password
    this[hostnameKey] = val.hostname
    this[portKey] = val.port
    this[pathnameKey] = val.pathname
    this[searchParamsKey].mut(val.searchParams)
    this[hashKey] = val.hash
    return this
  }

  clear() {
    this[schemeKey] = ``
    this[slashKey] = ``
    this[usernameKey] = ``
    this[passwordKey] = ``
    this[hostnameKey] = ``
    this[portKey] = ``
    this[pathnameKey] = ``
    this[searchParamsKey].clear()
    this[hashKey] = ``
  }

  clone() {return new this.constructor(this)}
  toURL() {return new this.URL(this.href)}
  toString() {return this.href}
  toJSON() {return this.toString() || null}
  valueOf() {return this.href}

  get Search() {return Search}
  get [Symbol.toStringTag]() {return this.constructor.name}
  [Symbol.toPrimitive]() {return this.toString()}

  static join(val, ...vals) {return new this(val).setPath(...vals)}
}

export const SYNCED = 0
export const STRING = 1
export const STRUCT = 2

export const schemeKey = Symbol.for(`scheme`)
export const slashKey = Symbol.for(`slash`)
export const usernameKey = Symbol.for(`username`)
export const passwordKey = Symbol.for(`password`)
export const hostnameKey = Symbol.for(`hostname`)
export const portKey = Symbol.for(`port`)
export const pathnameKey = Symbol.for(`pathname`)
export const searchParamsKey = Symbol.for(`search`)
export const hashKey = Symbol.for(`hash`)

function maybePre(val, pre) {return val.startsWith(pre) ? val : optPre(val, pre)}
function optPre(val, pre) {return val && pre + val}
function optSuf(val, suf) {return val && val + suf}

export function stripPre(val, pre) {
  req(val, isStr)
  req(pre, isStr)
  while (pre && val.startsWith(pre)) val = val.slice(pre.length)
  return val
}

export function stripSuf(val, suf) {
  req(val, isStr)
  req(suf, isStr)
  while (suf && val.endsWith(suf)) val = val.slice(0, -suf.length)
  return val
}

export function inter(pre, sep, suf) {
  req(pre, isStr)
  req(sep, isStr)
  req(suf, isStr)
  if (!pre || !suf) return pre + suf
  return stripSuf(pre, sep) + sep + stripPre(suf, sep)
}

function reqGroups(val, reg, msg) {
  const mat = str(val).match(reg)
  const out = mat && mat.groups
  if (!out) throw SyntaxError(`unable to decode ${show(val)} as ${msg}`)
  return out
}

function errConvert(val, msg) {return TypeError(`unable to convert ${show(val)} to ${msg}: invalid type`)}
function errSyntax(val, msg) {return SyntaxError(`unable to convert ${show(val)} to ${msg}: invalid syntax`)}
function errSlash(msg) {return SyntaxError(`${msg} is forbidden in URL without protocol double slash`)}

function strOpt(val) {
  if (isNil(val)) return undefined
  req(val, isStr)
  return true
}

function split(src, val) {
  req(src, isStr)
  return src ? src.split(val) : []
}

function decodeBool(val) {return val === `true` ? true : val === `false` ? false : undefined}
function decodeInt(val) {return only(Number.parseInt(str(val)), isInt)}
function decodeFin(val) {return only(Number.parseFloat(str(val)), isFin)}

function toScheme(val) {return toStrWith(val, RE_SCHEME, `scheme`)}
function toSlash(val) {return toStrWith(val, RE_SLASH, `slash`)}
function toUsername(val, slash) {return toStrWithSlash(val, RE_USERNAME, `username`, slash)}
function toPassword(val, slash) {return toStrWithSlash(val, RE_PASSWORD, `password`, slash)}
function toHostname(val, slash) {return toStrWithSlash(val, RE_HOSTNAME, `hostname`, slash)}
function toPort(val, slash) {return reqSlash(encodePort(val), slash, `port`)}
function toPathname(val) {return toStrWith(val, RE_PATHNAME, `pathname`)}
function toHash(val) {return toStrWith(val, RE_HASH, `hash`)}

function encodePort(val) {
  if (isNat(val)) return val + ``
  return toStrWith(val, RE_PORT, `port`)
}

function toSearch(val) {
  const msg = `search`
  if (isStr(val)) {
    if (val.includes(`#`)) throw errSyntax(val, msg)
    return stripPre(val, `?`)
  }
  throw errConvert(val, msg)
}

function toStrWith(val, reg, msg) {
  if (isNil(val)) return ``
  if (isStr(val)) {
    if (val && !reg.test(val)) throw errSyntax(val, msg)
    return val
  }
  throw errConvert(val, msg)
}

function toStrWithSlash(val, reg, msg, slash) {
  return reqSlash(toStrWith(val, reg, msg), slash, msg)
}

function reqSlash(val, slash, msg) {
  if (val && !slash) throw errSlash(msg)
  return val
}

function head(val) {return val && val[0]}

function isNil(val) {return val == null}
function isSome(val) {return !isNil(val)}
function isNum(val) {return typeof val === `number`}
function isFin(val) {return isNum(val) && !isNaN(val) && !isInf(val)}
function isInt(val) {return isNum(val) && ((val % 1) === 0)}
function isNat(val) {return isInt(val) && val >= 0}
function isNaN(val) {return val !== val}
function isInf(val) {return val === Infinity || val === -Infinity}
function isStr(val) {return typeof val === `string`}
function isComp(val) {return isObj(val) || isFun(val)}
function isFun(val) {return typeof val === `function`}
function isObj(val) {return !isNull(val) && typeof val === `object`}
function isStruct(val) {return isObj(val) && !isIter(val)}
function isArr(val) {return Array.isArray(val)}
function isIter(val) {return hasMeth(val, Symbol.iterator)}
function isCls(val) {return isFun(val) && isObj(val.prototype)}
function isNull(val) {return val === null} // eslint-disable-line eqeqeq
function isEmpty(val) {return isNil(val) || val === ``}
function isURL(val) {return isInst(val, URL)}
function isUrl(val) {return isInst(val, Url)}
function isLoc(val) {return typeof Location === `function` && isInst(val, Location)}
function isStrOpt(val) {return !!strOpt(val)}

function isScalar(val) {
  if (isObj(val)) {
    const fun = get(val, `toString`)
    return isFun(fun) && fun !== Object.prototype.toString && fun !== Array.prototype.toString
  }
  return !isFun(val)
}

function isInst(val, cls) {
  req(cls, isCls)
  return isObj(val) && val instanceof cls
}

export function isUrlLike(val) {
  return isStr(val) || isURL(val) || isUrl(val) || isLoc(val)
}

function hasMeth(val, key) {return isFun(get(val, key))}

function req(val, fun) {
  reqValidator(fun)
  if (!fun(val)) {
    throw TypeError(`expected ${show(val)} to satisfy test ${showFunName(fun)}`)
  }
  return val
}

function reqValidator(fun) {
  if (!isFun(fun)) {
    throw TypeError(`expected validator function, got ${show(fun)}`)
  }
}

function reqInst(val, cls) {
  if (!isInst(val, cls)) {
    throw TypeError(`expected ${show(val)}${instDesc(getCon(val))} to be an instance of ${showFunName(cls)}`)
  }
  return val
}

function instDesc(val) {return isFun(val) ? ` (instance of ${showFunName(val)})` : ``}
function only(val, fun) {return req(fun, isFun)(val) ? val : undefined}
function str(val) {return isNil(val) ? `` : req(val, isStr)}

function render(val) {
  if (isNil(val)) return ``
  if (isInst(val, Date)) return val.toISOString()
  if (isScalar(val)) return val + ``
  throw errConvert(val, `string`)
}

function show(val) {
  if (isStr(val)) return JSON.stringify(val)
  if (isFun(val)) return showFun(val)
  if (isObj(val)) return showObj(val)
  return val + ``
}

function showFun(val) {return `[function ${val.name || val}]`}
function showFunName(fun) {return fun.name || showFun(fun)}

function showObj(val) {
  const con = getCon(val)
  if (!con || con === Object || con === Array) return JSON.stringify(val)
  const name = getName(con)
  return name ? `[object ${name}]` : val + ``
}

function get(val, key) {return isComp(val) && key in val ? val[key] : undefined}
function getCon(val) {return get(val, `constructor`)}
function getName(val) {return get(val, `name`)}
