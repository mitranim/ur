import 'https://cdn.jsdelivr.net/npm/@mitranim/test@0.1.2/emptty.mjs'
import * as t from 'https://cdn.jsdelivr.net/npm/@mitranim/test@0.1.2/test.mjs'
import * as u from './ur.mjs'

/* Conf */

const cli = t.Args.os()
t.conf.benchFilterFrom(cli.get(`run`))
t.conf.verb = cli.bool(`v`)
t.conf.benchRep = t.ConsoleAvgReporter.with(t.tsNano)

/* Global */

const searchLong = `one=two&one=three&four=five&five=six&seven=eight&nine=ten&nine=eleven`
const urlLong = `https://user:pass@one.two.three/four/five/six?one=two&one=three&four=five&five=six&seven=eight&nine=ten&nine=eleven#hash`
const urlShort = `https://example.com`

const uriSafeLong = `one_two_one_three_four_five_five_six_seven_eight_nine_ten_nine_eleven`
const uriUnsafeLong = searchLong
const uriUnescapedLong = searchLong
const uriEscapedLong = encodeURIComponent(uriUnsafeLong)

const decParamsLong = new URLSearchParams(searchLong)
const decSearchLong = new u.Search(searchLong)
const decURLLong = new URL(urlLong)
const decUrlLong = new u.Url(urlLong)
const decUrlShort = new u.Url(urlShort)

const mutSearch = new u.Search()
const mutUrl = new u.Url()

/* Util */

function nop() {}

class Match {
  constructor(val) {
    this.scheme = val.scheme
    this.slash = val.slash
    this.username = val.username
    this.password = val.password
    this.hostname = val.hostname
    this.port = val.port
    this.pathname = val.pathname
    this.search = val.search
    this.hash = val.hash
  }

  get [Symbol.toStringTag]() {return this.constructor.name}
}

function searchUncache(val) {
  val.restruct()
  val.str = ``
  val.prio = u.STRUCT
  return val
}

/* Bench */

// Indicates benchmark accuracy. Should be single digit nanoseconds.
t.bench(function bench_baseline() {})

if (cli.bool(`more`)) {
  t.bench(function bench_encodeURIComponent_miss() {nop(encodeURIComponent(uriSafeLong))})
  t.bench(function bench_encodeURIComponent_hit() {nop(encodeURIComponent(uriUnsafeLong))})
  t.bench(function bench_decodeURIComponent_miss() {nop(decodeURIComponent(uriUnescapedLong))})
  t.bench(function bench_decodeURIComponent_hit() {nop(decodeURIComponent(uriEscapedLong))})
}

t.bench(function bench_new_Params() {nop(new URLSearchParams())})
t.bench(function bench_new_Search() {nop(new u.Search())})
t.bench(function bench_new_URL() {nop(new URL(`a:`))}) // Unfair but blame the dumb API.
t.bench(function bench_new_Url() {nop(new u.Url())})

t.bench(function bench_Search_mut_str() {nop(mutSearch.mut(searchLong))})
t.bench(function bench_Search_mut_Params() {nop(mutSearch.mut(decParamsLong))})
t.bench(function bench_Search_mut_Search() {nop(mutSearch.mut(decSearchLong))})

t.bench(function bench_search_decode_Params() {nop(new URLSearchParams(searchLong))})
t.bench(function bench_search_decode_Search() {nop(new u.Search(searchLong))})
t.bench(function bench_search_decode_Search_uncached() {nop(new u.Search().addStr(searchLong))})

t.bench(function bench_search_encode_Params() {nop(decParamsLong.toString())})
t.bench(function bench_search_encode_Search() {nop(decSearchLong.toString())})
t.bench(function bench_search_encode_Search_uncached() {nop(searchUncache(decSearchLong).toString())})
t.bench(function bench_search_encode_Search_toStringFull() {nop(decSearchLong.toStringFull())})

const mutParamsForUpdate = new URLSearchParams(searchLong)
const mutSearchForUpdate = new u.Search(searchLong)
t.bench(function bench_search_update_Params() {nop(mutParamsForUpdate.append(`one`, `two`))})
t.bench(function bench_search_update_Query() {nop(mutSearchForUpdate.append(`one`, `two`))})

t.bench(function bench_search_walk_Params() {
  for (const [key, val] of decParamsLong) nop(key, val)
})

t.bench(function bench_search_walk_Search() {
  for (const [key, val] of decSearchLong) nop(key, val)
})

t.bench(function bench_Url_mut_str() {nop(mutUrl.mut(urlLong))})
t.bench(function bench_Url_mut_URL() {nop(mutUrl.mut(decURLLong))})
t.bench(function bench_Url_mut_Url() {nop(mutUrl.mut(decUrlLong))})

t.bench(function bench_url_decode_long_URL() {nop(new URL(urlLong))})
t.bench(function bench_url_decode_long_url() {nop(u.url(urlLong))})
t.bench(function bench_url_decode_long_re_match() {nop(urlLong.match(u.RE_URL))})

t.bench(function bench_url_decode_short_URL() {nop(new URL(urlShort))})
t.bench(function bench_url_decode_short_url() {nop(u.url(urlShort))})
t.bench(function bench_url_decode_short_re_match() {nop(urlShort.match(u.RE_URL))})

t.bench(function bench_url_encode_URL() {nop(decURLLong.toString())})
t.bench(function bench_url_encode_Url() {nop(decUrlLong.toString())})

t.bench(function bench_url_encode_Url_uncached() {
  searchUncache(decUrlLong.searchParams)
  nop(decUrlLong.toString())
})

t.bench(function bench_url_setPath() {nop(mutUrl.setPath(`one`, `two`, `three`))})

t.bench(function bench_url_set_pathname_encode() {nop(u.url().setPathname(`/one`).toString())})
t.bench(function bench_url_set_search_encode() {nop(u.url().setSearch(`one=two`).toString())})
t.bench(function bench_url_set_hash_encode() {nop(u.url().setHash(`#one`).toString())})

t.bench(function bench_url_decode_set_pathname_encode_with_URL() {
  const val = new URL(urlLong)
  val.pathname = `/one`
  nop(val.toString())
})

t.bench(function bench_url_decode_set_search_encode_with_URL() {
  const val = new URL(urlLong)
  val.search = `one=two`
  nop(val.toString())
})

t.bench(function bench_url_decode_set_hash_encode_with_URL() {
  const val = new URL(urlLong)
  val.hash = `one`
  nop(val.toString())
})

t.bench(function bench_url_decode_set_pathname_encode_with_Url() {
  nop(u.url(urlLong).setPathname(`/one`).toString())
})

t.bench(function bench_url_decode_set_search_encode_with_Url() {
  nop(u.url(urlLong).setSearch(`one=two`).toString())
})

t.bench(function bench_url_decode_set_hash_encode_with_Url() {
  nop(u.url(urlLong).setHash(`#one`).toString())
})

t.bench(function bench_pathname_with_URL() {nop(new URL(urlLong).pathname)})
t.bench(function bench_pathname_with_Url() {nop(u.url(urlLong).pathname)})
t.bench(function bench_pathname_with_re() {nop(urlLong.match(u.RE_URL).groups.pathname)})

const groups = urlLong.match(u.RE_URL).groups
const match = new Match(groups)
const dict = urlLong.match(u.RE_URL).groups
const map = new Map(Object.entries(dict))
t.bench(function bench_clone_query_Params() {nop(new URLSearchParams(decParamsLong))})
t.bench(function bench_clone_query_Search() {nop(decSearchLong.clone())})
t.bench(function bench_clone_url_URL() {nop(new URL(decURLLong))})
t.bench(function bench_clone_url_Url() {nop(decUrlLong.clone())})
t.bench(function bench_clone_match() {nop(new Match(match))})
t.bench(function bench_clone_map() {nop(new Map(map))})

t.bench(function bench_url_setScheme() {nop(mutUrl.setScheme(``))})
t.bench(function bench_url_setSlash() {nop(mutUrl.setSlash(``))})
t.bench(function bench_url_setUsername() {nop(mutUrl.setUsername(``))})
t.bench(function bench_url_setPassword() {nop(mutUrl.setPassword(``))})
t.bench(function bench_url_setHostname() {nop(mutUrl.setHostname(``))})
t.bench(function bench_url_setPort() {nop(mutUrl.setPort(``))})
t.bench(function bench_url_setPathname() {nop(mutUrl.setPathname(``))})
t.bench(function bench_url_setSearch() {nop(mutUrl.setSearch(``))})
t.bench(function bench_url_setSearchParams() {nop(mutUrl.setSearchParams(``))})
t.bench(function bench_url_setQuery() {nop(mutUrl.setQuery(``))})
t.bench(function bench_url_setHash() {nop(mutUrl.setHash(``))})
t.bench(function bench_url_setHashExact() {nop(mutUrl.setHashExact(``))})
t.bench(function bench_url_setProtocol() {nop(mutUrl.setProtocol(``))})
t.bench(function bench_url_setHost() {nop(mutUrl.setHost(``))})
t.bench(function bench_url_setOrigin() {nop(mutUrl.setOrigin(``))})
t.bench(function bench_url_setHref() {nop(mutUrl.setHref(``))})

t.bench(function bench_url_short_withScheme() {nop(decUrlShort.withScheme(``))})
t.bench(function bench_url_short_withSlash() {nop(decUrlShort.withSlash(``))})
t.bench(function bench_url_short_withUsername() {nop(decUrlShort.withUsername(``))})
t.bench(function bench_url_short_withPassword() {nop(decUrlShort.withPassword(``))})
t.bench(function bench_url_short_withHostname() {nop(decUrlShort.withHostname(``))})
t.bench(function bench_url_short_withPort() {nop(decUrlShort.withPort(``))})
t.bench(function bench_url_short_withPathname() {nop(decUrlShort.withPathname(``))})
t.bench(function bench_url_short_withSearch() {nop(decUrlShort.withSearch(``))})
t.bench(function bench_url_short_withSearchParams() {nop(decUrlShort.withSearchParams(``))})
t.bench(function bench_url_short_withQuery() {nop(decUrlShort.withQuery(``))})
t.bench(function bench_url_short_withHash() {nop(decUrlShort.withHash(``))})
t.bench(function bench_url_short_withHashExact() {nop(decUrlShort.withHashExact(``))})
t.bench(function bench_url_short_withProtocol() {nop(decUrlShort.withProtocol(``))})
t.bench(function bench_url_short_withHost() {nop(decUrlShort.withHost(``))})
t.bench(function bench_url_short_withOrigin() {nop(decUrlShort.withOrigin(``))})
t.bench(function bench_url_short_withHref() {nop(decUrlShort.withHref(``))})

t.bench(function bench_url_long_withScheme() {nop(decUrlLong.withScheme(``))})
t.bench(function bench_url_long_withSlash() {nop(decUrlLong.withSlash(``))})
t.bench(function bench_url_long_withUsername() {nop(decUrlLong.withUsername(``))})
t.bench(function bench_url_long_withPassword() {nop(decUrlLong.withPassword(``))})
t.bench(function bench_url_long_withHostname() {nop(decUrlLong.withHostname(``))})
t.bench(function bench_url_long_withPort() {nop(decUrlLong.withPort(``))})
t.bench(function bench_url_long_withPathname() {nop(decUrlLong.withPathname(``))})
t.bench(function bench_url_long_withSearch() {nop(decUrlLong.withSearch(``))})
t.bench(function bench_url_long_withSearchParams() {nop(decUrlLong.withSearchParams(``))})
t.bench(function bench_url_long_withQuery() {nop(decUrlLong.withQuery(``))})
t.bench(function bench_url_long_withHash() {nop(decUrlLong.withHash(``))})
t.bench(function bench_url_long_withHashExact() {nop(decUrlLong.withHashExact(``))})
t.bench(function bench_url_long_withProtocol() {nop(decUrlLong.withProtocol(``))})
t.bench(function bench_url_long_withHost() {nop(decUrlLong.withHost(``))})
t.bench(function bench_url_long_withOrigin() {nop(decUrlLong.withOrigin(``))})
t.bench(function bench_url_long_withHref() {nop(decUrlLong.withHref(``))})

t.deopt()
t.benches()
