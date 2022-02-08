## Overview

URL and query implementation for JS. Like built-in [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) but actually usable. Features:

* Somewhat aligned with `URL` API.
* Almost everything is optional. In particular:
  * `.protocol` is optional.
  * `.pathname` is optional.
* Various common-sense shortcuts.
  * Fluent builder-style API.
  * Support for correctly joining/appending URL paths.
  * Support for traditional "query dictionaries" like `{key: ['val']}`.
  * Support for patching/merging queries.
* Better compatibility with custom URL schemes.
* Less information loss.
  * No magic defaults, fallbacks, automatic appending, or automatic prepending.
  * `.pathname` is preserved from input _exactly_ as-is.
  * Empty `.origin` is `''`, not `'null'`.
* Stricter validation of input types and string formats.
  * Nil is considered `''`, _not_ `'null'` or `'undefined'`.
  * Accidental stringification of junk like `'[object Object]'` is forbidden and causes exceptions.
  * Query keys must be strings. Nil keys are considered missing.
  * Invalid inputs for various URL components cause exceptions instead of being silently converted to garbage, truncated, or ignored.
* Subclassable.
  * Can subclass `Search` and override it for your `Url` variant.
  * Can override any getter, setter, or method.
  * Compatible with proxies and `Object.create`.
  * No "illegal invocation" exceptions.
* No special cases for "known" URL schemes.
* `Search` is a subclass of `Map` as it should be.
* Automatically stringable as it should be.
* Decent [test coverage](ur_test.mjs).
* Decent [benchmark coverage](ur_bench.mjs).
* Tuned for [#performance](#perf).
* Browser compatibility: evergreen, Safari 11+.
* Tiny, dependency-free, single file, native module.

## TOC

* [#Overview](#overview)
* [#Why](#why)
* [#Perf](#perf)
* [#Usage](#usage)
* [#API](#api)
  * [#`function url`](#function-url)
  * [#`function search`](#function-search)
  * [#`class Url`](#class-url)
  * [#`class Search`](#class-search)
  * [#Undocumented](#undocumented)
* [#License](#license)
* [#Misc](#misc)

## Why

The JS built-in [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) implementation is insane. I have no other words for it.

Various issues:

* Requires `.protocol`. WTF. In real app code, both on client and server, many URLs are relative to website origin, without a protocol.
  * This alone can force app authors to either avoid `URL`, or use hacks involving a fake protocol like `file:`.
* Empty `.origin` is `'null'` rather than `''`. WTF.
  * Even worse: `.origin` is `'null'` for any custom scheme. It works only for a small special-cased whitelist.
* Unwanted garbage by default:
  * Forces empty `.pathname` for some schemes to be `'/'` rather than `''`.
    * But only for _some_ schemes!
  * Non-empty `.hash` starts with `#`, which is often undesirable.
  * Non-empty `.search` starts with `?`, which is often undesirable.
  * I always end up with utility functions for stripping this away.
  * But non-empty `.port` doesn't start with `:` because lolgic!
* `URL` property setters and `URLSearchParams` methods stringify nil values as some junk rather than `''`. `null` becomes `'null'`, `undefined` becomes `'undefined'`. In JS, where nil is an _automatic fallback_ for a missing value, this is asinine. Nil should be considered `''`.
* No support for appending path segments, which is an _extremely_ common use case. WTF.
  * `new URL(<path>, <base>)` ***is not good enough***. It requires `<base>` to have an origin (real website links often don't), and works _only_ if path and base begin/end with the right amount of slashes, forcing app authors to write utility functions for stripping/appending/prepending slashes.
* Made-up component `.protocol` is unusable.
  * The URI standard defines "scheme" which _does not_ include `:` or `//`. The JS `URL` `.protocol` includes `:` but not `//`. This is the worst possible choice.
  * The lack of `//` makes it impossible to programmatically differentiate protocols like `http://` from protocols like `mailto:` without a special-case whitelist, which is of course _not exposed_ by this implementation. URLs are a general-purpose structured data format which is _extensible_, and custom protocols are frequently used. Special-case whitelists _should not be required_ for using your API, or at the very least they _must be exposed_.
  * The no-less-atrocious Go `net/url.URL` correctly uses a "scheme" field without `:`, but makes the same mistake of hiding the knowledge of whether the original string had `//` in its protocol.
* `URLSearchParams` is nearly unusable:
  * Garbage inputs → garbage outputs. Nil is converted to `'null'` or `'undefined'`. Various non-stringable objects are converted to `'[object Object]'`. This insanity has to stop.
  * Lacks support for traditional "query dictionaries" which are extremely popular in actual apps.
  * Lacks support for patching and merging. Can be emulated by spreading `.entries()` into constructors which is bulky and inefficient.
  * Lacks various common-sense methods: `.setAll`, `.appendAll`, `.clear`.
  * Can't override `url.searchParams` with a custom subclass.
* Many operations are much slower than possible.

## Perf

* Carefully tuned using [benchmarks](ur_bench.mjs).
* Uses various optimizations such as lazy query parsing, string caching, structural copying instead of reparsing.
* Seems to perform significantly better than corresponding built-ins in Deno 1.17 / V8 9.7+.

## Usage

In browsers and Deno, import by URL:

```js
import * as u from 'https://cdn.jsdelivr.net/npm/@mitranim/ur@0.1.2/ur.mjs'
```

When using Node or NPM-oriented bundlers like Esbuild:

```sh
npm i -E @mitranim/ur
```

Example parsing:

```js
const url = u.url(`https://example.com/path?key=val#hash`)

url.pathname         // '/path'
url.search           // 'key=val'
url.hash             // 'hash'
url.query.get(`key`) // 'val'
url.query.dict()     // {key: 'val'}
url.query.dictAll()  // {key: ['val']}
```

Example segmented path:

```js
u.url(`https://example.com`).setPath(`/api/msgs`, 123, `get`) + ``
// 'https://example.com/api/msgs/123/get'
```

Example without scheme/protocol:

```js
u.url(`/api`).addPath(`msgs`, 123, `get`) + ``
// '/api/msgs/123/get'
```

Example query dict support:

```js
u.url(`/profile`).addQuery({action: `edit`}) + ``
// `'/profile?action=edit'
```

## API

### `function url`

Same as [#`new Url`](#class-url) but syntactically shorter.

### `function search`

Same as [#`new Search`](#class-search) but syntactically shorter.

### `class Url`

Like [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) but much better. See [#Overview](#overview) for some differences.

```ts
type UrlLike       = string | Url | URL | Location
type StrLike       = boolean | number | string
type SearchDictLax = Record<string, string | string[]>
type SearchLike    = string | Search | URLSearchParams | SearchDictLax

class Url {
  constructor(src?: UrlLike)

  // All of the following are getter/setters.
  // Many are covariant with each other.
  scheme:       string // Without ':' or '//'.
  slash:        string // Either '' or '//'.
  username:     string // Without '@'.
  password:     string // Without ':' or '@'.
  hostname:     string
  port:         string
  pathname:     string
  search:       string // Without leading '?'.
  searchParams: Search
  query:        Search
  hash:         string // Without leading '#'.
  protocol:     string
  host:         string
  origin:       string
  href:         string

  // All of the following set the corresponding property,
  // mutating and returning the same `Url` reference.
  // Passing nil clears the corresponding property.
  setScheme       (val?: string): Url
  setSlash        (val?: string): Url
  setUsername     (val?: string): Url
  setPassword     (val?: string): Url
  setHostname     (val?: string): Url
  setPort         (val?: number | string): Url
  setPathname     (val?: string): Url
  setSearch       (val?: string): Url
  setSearchParams (val?: SearchLike): Url
  setQuery        (val?: SearchLike): Url
  setHash         (val?: string): Url
  setHashExact    (val?: string): Url
  setProtocol     (val?: string): Url
  setHost         (val?: string): Url
  setOrigin       (val?: string): Url
  setHref         (val?: string): Url

  // Replace `.pathname` with slash-separated segments.
  // Empty or non-stringable segments cause an exception.
  setPath(...vals: StrLike[]): Url

  // Like `.setPath` but appends to an existing path.
  addPath(...vals: StrLike[]): Url

  // Reinitializes the `Url` object from the input.
  // Mutates and returns the same reference.
  // Passing nil is equivalent to `.clear`.
  mut(src?: UrlLike): Url

  // Clears all properties. Mutates and returns the same reference.
  clear(): Url

  // Returns a cloned version.
  // Future mutations are not shared.
  // Cheaper than reparsing.
  clone(): Url

  // Converts to built-in `URL`, for compatibility with APIs that require it.
  toURL(): URL

  // Same as `.href`. Enables automatic JS stringification.
  toString(): string

  // Enables automatic JSON string encoding.
  // As a special case, empty url is considered null.
  toJSON(): string | null

  // All of these are equivalent to `.toString()`. This object may be considered
  // a primitive/scalar, equivalent to a string in some contexts.
  valueOf(): string
  [Symbol.toPrimitive](hint?: string): string

  // Class used internally for instantiating `.searchParams`.
  // Can override in subclass.
  get Search(): {new(): Search}

  // Shortcut for `new this(val).setPath(...vals)`.
  static join(val: UrlLike, ...vals: StrLike[]): Url
}
```

Warning: this library does not support parsing bare-domain URLs like `example.com` without a scheme. They cannot be syntactically distinguished from a bare pathname, which is a more important use case. However, `Url` does provide a shortcut for generating a string like this:

```js
u.url(`https://example.com/path`).hostPath() === `example.com/path`
u.url(`scheme://host:123/path?key=val#hash`).hostPath() === `host:123/path`
```

### `class Search`

Like [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) but much better. See [#Overview](#overview) for some differences.

```ts
type StrLike          = boolean | number | string
type SearchDictLax    = Record<string, string | string[]>
type SearchDictSingle = Record<string, string>
type SearchDictMulti  = Record<string, string[]>
type SearchLike       = string | Search | URLSearchParams | SearchDictLax

class Search extends Map<string, string[]> {
  constructor(src?: SearchLike)

  // Similar to the corresponding methods of `URLSearchParams`,
  // but with stricter input validation. In addition, instead of
  // returning void, they return the same reference for chaining.
  // A nil key is considered missing, and the operation is a nop.
  // A nil val is considered to be ''.
  has(key?: string): boolean
  get(key?: string): string | undefined
  getAll(key?: string): string[]
  set(key?: string, val?: StrLike): Search
  append(key?: string, val?: StrLike): Search
  delete(key?: string): boolean

  // Common-sense methods missing from `URLSearchParams`.
  // Names and signatures are self-explanatory.
  setAll(key?: string, vals?: StrLike[]): Search
  setAny(key?: string, val?: StrLike | StrLike[]): Search
  appendAll(key?: string, vals?: StrLike[]): Search
  appendAny(key?: string, val?: StrLike | StrLike[]): Search

  // Reinitializes the `Search` object from the input.
  // Mutates and returns the same reference.
  // Passing nil is equivalent to `.clear`.
  mut(src?: SearchLike): Search

  // Appends the input's content to the current `Search` object.
  // Mutates and returns the same reference.
  add(src?: SearchLike): Search

  // Combination of `.get` and type conversion.
  // Nil if property is missing or can't be converted.
  bool(key?: string): boolean | undefined
  int(key?: string): number | undefined
  fin(key?: string): number | undefined

  // Conversion to a traditional "query dictionary".
  dict(): SearchDictSingle
  dictAll(): SearchDictMulti

  // Returns a cloned version.
  // Future mutations are not shared.
  // Cheaper than reparsing.
  clone(): Search

  // Same as `.toString` but prepends '?' when non-empty.
  toStringFull(): string

  // Encodes to a string like 'key=val'.
  // Enables automatic JS stringification.
  // Uses caching: if not mutated between calls, this is nearly free.
  toString(): string

  // Enables automatic JSON string encoding.
  // As a special case, empty url is considered null.
  toJSON(): string | null
}
```

### Undocumented

Some APIs are exported but undocumented to avoid bloating the docs. Check the source files and look for `export`.

## License

https://unlicense.org

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts
