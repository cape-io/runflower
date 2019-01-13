import {
  isString, isObject, isArray, each, map, keys, reduce, mapValues, mergeWith, sum,
} from 'lodash/fp'


export function combineResults([ res1, ...rest ]) {
  return reduce(rest, (result, value) =>
    mergeWith(result, value, (val1, val2) => val1 + val2),
    res1
  )
}

export function updateChanges({ r, rq, data }) {
  return changes({ data, r, rq: rq.update(data, { returnChanges: true }) })
}

// Return changes of insert with update on conflict.
export function insertUpdateChanges({ r, rq, data }) {
  return r(data).do((_data) => changes({
    data: _data,
    r,
    rq: rq.insert(_data, { conflict: 'update', returnChanges: true }),
  }))
}

// Generate random keys.
export function randomIds({ r, prefix, maxLength = 11 }) {
  // const others = '_-~!*$(),'
  return r('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')
  .split('').do(row =>
    r.range(4, maxLength).map(length =>
      // Some bug requires the final empty string when no prefix.
      prefix && r.add(prefix, r.args(row.sample(length))) || r.add(r.args(row.sample(length)), '')
    )
    .coerceTo('array')
    // Add another one at the end.
    .append(prefix ? r.add(prefix, r.uuid()) : r.uuid())
  )
}

export function uniqueId(r, table, prefix) {
  return randomIds({ r, prefix })
  .do(ids =>
    ids.difference(table.getAll(r.args(ids))('id').coerceTo('array'))(0)
  )
}

// Allow strings with dots to represent obj traversal.
// 'parent.child' will return 'thing' {parent: { child: 'thing' }}
export function getDotField({ rq, str }) {
  let rQuery = rq
  const fieldArray = str.split('.')
  each(fieldArray, (fieldName) => {
    rQuery = rQuery.getField(fieldName)
  })
  return rQuery
}

export function maxval(minval) {
  return `${minval}\uffff`
}

export function mergeResults({ r, qArray }) {
  var rqArray
  rqArray = map(qArray, (field) => {
    return this.expand(field)
  })
  return r(rqArray).reduce((left, right) => {
    return r.branch(right, left.merge(right), left)
  }).coerceTo('array').map((row) => {
    return row.nth(1)
  })
}

export function filterOutThings({ r, rq, rejectInfo }) {
  return rq.filter((item) => {
    const notArgs = map(rejectInfo, (value, key) =>
      item(key).default(null).ne(value)
    )
    return r.and(r.args(notArgs))
  })
}

export function indexBy(rq, fieldId) {
  return rq.map((row) => [ row(fieldId), row ])
  .coerceTo('object')
}

export function group({r, rq, groupInfo, valueId}) {
  return rq.group(groupInfo).ungroup().map((item) => {
    if (valueId) {
      return r.object(item('group'), r.object(valueId, item('reduction')))
    }
    return r.object(item('group'), item('reduction'))
  }).reduce((left, right) => {
    return left.merge(right)
  })
}

export function groupObj({rq, groupOn, groupValue}) {
  // @TODO something with count?
  return this.group(rq, groupOn, groupValue)
}

export function rename({rq, renameInfo}) {
  var oldKeys
  oldKeys = keys(renameInfo)
  return rq.map((item) => {
    const mergeObj = {}
    each(renameInfo, (newKey, oldKey) => {
      mergeObj[newKey] = item(oldKey).default(null)
    })
    return item.merge(mergeObj).without(oldKeys)
  })
}

export function stripSlash({r, str}) {
  return str.match('^/(.*)').do((res) => {
    return r.branch(res, res('groups').nth(0)('str'), str)
  })
}

export function dirNameExt({r, str}) {
  return str.match('^(.*/)?(?:$|(.+?)(?:(\\.[^.]*$)|$))')('groups').map((part) => {
    return r.branch(part, part('str'), part)
  }).do((parts) => {
    return {
      dir: r.branch(parts.nth(0), parts.nth(0).match('(.*)/')('groups').nth(0)('str'), null),
      filename: parts.nth(1),
      ext: parts.nth(2),
    }
  })
}

export function dirs({r, dir}) {
  return r.branch(dir, dir.split('/')["do"](function(row) {
    return row.map(function(d) {
      return r.object(r('dir').add(row.indexesOf(d).nth(0).coerceTo('string')), d)
    })
  }).reduce(function(lt, rt) {
    return lt.merge(rt)
  }), {})
}

export function matchReplace(sourceStr, regexStr, replaceStr) {
  return sourceStr["do"](function(str) {
    return str.match(regexStr)["default"]({
      end: 0
    })["do"](function(res) {
      return r.branch(res('end').gt(0), str.split('', res('end'))["do"](function(parts) {
        return parts.slice(0, res('start')).append(replaceStr).union(parts.slice(res('end'))).reduce(function(l, r) {
          return l.add(r)
        })
      }), str)
    })
  })
}

export function replaceAll(sourceStr, find, replace) {
  return sourceStr.split(find).reduce(function(left, right) {
    return left.add(replace).add(right)
  })
}
export const transforms = {}

export const actions = {
  http: ['url'],
  replaceField: ['path', 'transform'],
  get: ['path'],
  mergeResults: ['flowers'], // Array of flower objects.
  keyBy: ['path'],
  rename: [],
  pick: ['fields'],
  orderBy: [],
  groupBy: [],
  omit: [],
  filter: [],
}

export const stringArg = condId(
  [startsWith('http'), createObj('http')])
export const isActionArray = overEvery([
  flow(get('length'), isGt(1)),
  flow(head, hasOf(actions)),
])
export const arrayArg = condId(
  [isActionArray, actionArrArg],
)
export const argsToField = cond([
  [isString, stringArg],
  [isArray, arrayArg],
])
export function argsToField(args) {
  let field = false
  // A simple string.
  // The most basic database query is an array.
  } else if (isArray(args) && args.length > 1) {
    // Order of elements in array must match these vars.
    const [db, table, get, pluck] = args
    field = {db, table, get}
    if (isString(pluck)) {
      field.getField = pluck
    } else if (isArray(pluck)) {
      field.pluck = pluck
    }
  }
  return field
}

function expandField(args) {
  const field = argsToField(args)
  const {
    db, table, get, http, pluck, hasFields, orderBy, without, limit,
    getField, filter, filterOut, group, group, mergeResults, rename,
    } = field

  let rq

  if (db) {
    if (!table) {
      bConsole.error('no table for db', db)
      return false
    }
    rq = r.db(db).table(table)
    if (get) {
      rq = rq.get(get)
    }
  } else if (http) {
    rq = r.http(http)
  } else if (mergeResults) {
    rq = this.mergeResults(mergeResults)
  } else {
    bConsole.error('must send db or http', field)
    return false
  }

  if (orderBy) {
    rq = rq.orderBy(orderBy)
  }

  if (hasFields) {
    rq = rq.hasFields(hasFields)
  }

  if (isObject(filter)) {
    rq = rq.filter(filter)
  }

  if (isObject(filterOut)) {
    rq = this.filterOut(rq, filterOut)
  }

  if (limit) {
    rq = rq.limit(limit)
  }

  if (isString(getField)) {
    rq = getDotField(rq, getField)
  }

  if (rename) {
    rq = rename({rq, rename})
  }

  if (pluck) {
    rq = rq.pluck(pluck)
  }

  if (without) {
    rq = rq.without(without)
  }

  if (isString(indexBy)) {
    rq = this.indexBy(rq, indexBy)
  } else if (group) {
    rq = isString(group) ? this.group(rq, group) : this.groupObj(rq, group)
  }

  return rq
}

// Must send an object.
export const expand = mapValues(expandField)

export default expand
