_ = require 'lodash'
r = require 'rethinkdb'

options =
  db: 'make_id'
  table: 'api'

build_q = (rq, field) ->
  if not field and not _.isFunction rq
    field = rq
  # field needs to be an array or object to query the db.
  if _.isString field
    return field

  unless _.isObject field
    return null

  # If the field has a value param we just return it.
  if field.value
    return field.value

  # The most basic database query.
  if _.isArray(field) and _.size(field) > 2
    field =
      make_id: field[0]
      api: field[1]
      get: field[2]

  # Begin building the query.
  if _.isObject(field.difference) and field.make_id
    rq = compare_lr 'difference', field.difference, field.make_id
  else if _.isObject(field.intersection) and field.make_id
    rq = compare_lr 'intersection', field.intersection, field.make_id
  else if field.make_id
    rq = r.db(field.make_id)

  unless rq
    console.log 'No rq in build_q()'
    console.log field
    return # ??

  if field.api
    rq = rq.table(field.api)
  if field.get
    rq = rq.get(field.get)
  else if _.isArray field.getAll
    rq = rq.getAll(field.getAll)


  if field.has
    rq = rq.hasFields field.has
  if field.with # This does a pluck.
    rq = rq.withFields field.with
  else if _.isObject field.group_by
    rq = group_by_obj rq, field.group_by

  # FILTER
  if _.isObject field.must
    rq = rq.filter(field.must)
  if _.isObject field.must_not
    rq = must_not rq, field.must_not
  if _.isObject field.should and _.size field.should
    console.log field.should
    rq = should rq, field.should

  if field.empty_fields
    rq = empty_fields rq, field.empty_fields


  # Do join before fields so we can edit/rename/sort/blah
  if field.eqJoin and field.eqJoin.table and field.eqJoin.key
    rq = eqJoin rq, field
  else if field.outerJoin and field.outerJoin.left_key and field.outerJoin.right_key and field.outerJoin.table
    rq = outerJoin rq, field.outerJoin, field.make_id

  # If you need to filter on a computed field add it to the database.
  if field.field
    if field.field.filename
      rq = filename rq
      delete field.field.filename
    if field.field.ext
      rq = ext rq
      delete field.field.ext
    unless _.isEmpty field.field
      rq = create_field rq, field.field, field.make_id, field.get
  if _.isArray field.stringify
    rq = stringify rq, field.stringify

  if field.get and _.isString(field.pluck)
    rq = pluck rq, field.pluck
    delete field.pluck

  # Sort order
  if field.sort
    if field.sort.index
      rq = rq.orderBy({index: field.sort.index})
    else
      rq = rq.orderBy(field.sort)

  if _.isObject field.rename
    rq = rename rq, field.rename

  if _.isObject field.merge_with
    rq = rq.map (item) -> item.merge(field.merge_with)

  if _.isString field.index_by
    rq = index_by rq, field
  else if _.isString field.group_by
    rq = group_by rq, field
  else if _.isString field.flatten
    rq = rq.withFields(field.flatten).concatMap (item) -> item(field.flatten)
    if field.without
      rq = rq.difference(field.without)
  else if field.pluck
    rq = pluck rq, field.pluck
  if field.map and field.map.add
    rq = map_add rq, field.map.add
  if field.unique
    rq = rq.distinct()
  if field.return_all
    rq = rq.coerceTo('ARRAY')

  if field.count
    rq = rq.count()
  else if field.merge
    rq = rq.reduce((left, right) -> left.merge(right))
  if field.debug
    console.log rq.toString()
  return rq

left_right = (field, make_id) ->
  field.left.return_all = field.right.return_all = true
  unless field.left.make_id
    field.left.make_id = make_id
  unless field.right.make_id
    field.right.make_id = make_id
  return r({
    l: build_q(null, field.left)
    r: build_q(null, field.right)
  })

compare_lr = (compare_type, field, make_id) ->
  rq = left_right(field, make_id)
  if compare_type == 'difference'
    rq = rq.do (v) -> v('l').difference(v('r'))
  else if compare_type == 'intersection'
    rq = rq.do (v) -> v('l').setIntersection(v('r'))
  if _.isString(field.left.pluck) and _.isString(field.right.pluck) and field.getAll
    rq = r.db(field.left.make_id).table(field.left.api).getAll(r.args(rq))
  rq

should = (rq, should_info) ->
  or_statements = []
  rq = rq.filter (item) ->
    _.each should_info, (required_value, key) ->
      if _.isArray required_value
        _.each required_value, (req_val) ->
          or_statements.push(item(key).eq(req_val))
      else
        or_statements.push(item(key).eq(required_value))
    r.or.apply(@, or_statements)
  rq

must_not = (rq, not_info) ->
  return rq.filter (item) ->
    not_args = _.map not_info, (value, key) ->
      return item(key).ne(value)
    return r.and.apply @, not_args

empty_fields = (rq, fields) ->
  return rq.filter (item) ->
    if _.isString fields
      return item.hasFields(fields).not()
    else if _.isArray fields
      empty_args = _.map fields, (field_id) ->
        return item.hasFields(field_id).not()
      return r.and.apply @, empty_args

map_add = (rq, add) ->
  rq.map (item) ->
    add = _.map add, (field) ->
      return item(field)
    r.add.apply(@, add)

pluck = (rq, pluck_info) ->
  if _.isString pluck_info
    pluck_arr = pluck_info.split(".")
    _.each pluck_arr, (field_name) ->
      rq = rq(field_name)
  else if _.isArray pluck_info
    rq = rq.pluck(pluck_info)
  rq

index_by = (rq, field) ->
  if field.pluck
    rq = rq.map (item) ->
      return r.branch item(field.index_by), r.object(item(field.index_by).coerceTo('STRING'), pluck(item, field.pluck)), {}
  else
    rq = rq.map (item) ->
      return r.branch item(field.index_by), r.object(item(field.index_by).coerceTo('STRING'), item), {}
  return rq

group_by_obj = (rq, field) ->
  rq = rq.group(field.field)
  if field.count
    rq = rq.count()
  rq = rq.ungroup()

group_by = (rq, field) ->
  if _.isString field.pluck
    pre_pluck = [field.pluck, field.group_by]
  else if _.isString field.flatten
    pre_pluck = [field.flatten, field.group_by]
  else if _.isArray field.pluck
    pre_pluck = _.clone field.pluck
    pre_pluck.push field.group_by
  if pre_pluck
    rq = rq.withFields pre_pluck
  rq = rq.group(field.group_by)
  if field.pluck
    rq = pluck(rq, field.pluck)
  else if _.isString field.flatten
    rq = rq.concatMap (item) -> item(field.flatten)
  if field.map and field.map.add
    rq = map_add rq, field.map.add
    delete field.map.add
  if field.unique
    rq = rq.distinct()
    field.unique = false
  return rq.ungroup().map (item) -> r.object(item('group'), item('reduction'))

eqJoin = (rq, field) ->
  if field.eqJoin.require_match == false
    rq = rq.merge (item) ->
      subq = r.db(field.make_id).table(field.eqJoin.table)
      if field.eqJoin.index # This isn't working yet because no default.
        subq = subq.getAll(item(field.eqJoin.key), {index: field.eqJoin.index}).limit(1).nth(0)
      else
        subq = subq.get(item(field.eqJoin.key)).default({})
      if field.eqJoin.pluck
        return subq.pluck(field.eqJoin.pluck)
      else
        return subq
  else
    if field.eqJoin.index
      rq = rq.eqJoin(field.eqJoin.key, r.db(field.make_id).table(field.eqJoin.table), {index: field.eqJoin.index})
    else
      rq = rq.eqJoin(field.eqJoin.key, r.db(field.make_id).table(field.eqJoin.table))
    unless field.eqJoin.zip == false
      rq = rq.zip()
  rq

# This doesn't work yet.
outerJoin = (rq, f, make_id) ->
  rq.map (l) ->
    if f.pluck
      l.merge(r.db(make_id).table(f.table).filter((v) -> v(f.right_key).eq(l(f.left_key))).nth(0).pluck(f.pluck))
    else
      l.merge(r.db(make_id).table(f.table).filter((v) -> v(f.right_key).eq(l(f.left_key))).nth(0))

# Fields
create_field = (rq, field_info, make_id, single) ->
  if single
    func = 'do'
  else
    func = 'map'
  return rq[func] (item) ->
    _.each field_info, (info, field_id) ->
      if info.func == 'default' and info.arg_field
        unless info.try
          info.try = field_id
        item = item.merge(r.object(field_id, pluck(item, info.try).default(pluck(item, info.arg_field))))
      else if info.func == 'add' and _.isArray(info.arg)
        combine = r('')
        _.each info.arg, (arg) ->
          if arg.field
            if arg.default_field
              combine = combine.add(item(arg.field).default(item(arg.default_field)))
            else
              combine = combine.add(item(arg.field))
          else if arg.value
            combine = combine.add(arg.value)
        item = item.merge(r.object(field_id, combine))
      else if info.func == 'getAll' and _.isObject(info.arg)
        if info.arg.entities_field
          entity_ids = item(info.arg.entities_field)
        if info.arg.entities_field_pluck
          entity_ids = pluck entity_ids, info.arg.entities_field_pluck
        subq = r.db(make_id).table(item(info.arg.api_field)).getAll(r.args(entity_ids))
        if info.arg.pluck
          subq = pluck subq, info.arg.pluck
        if field_id == '_data'
          new_item = subq
        else
          new_item = item.merge(r.object(field_id, subq.coerceTo('ARRAY')))
        item = r.branch item,
          new_item,
          item
    return item

stringify = (rq, field_arr) ->
  rq.map (row) ->
    merge_obj = {}
    _.each field_arr, (field_id) ->
      merge_obj[field_id] = r.branch row(field_id).default(false),
            row(field_id).reduce((l, right) ->
              return l.add(', ').add(right)),
            null
    row.merge(merge_obj)

rename = (rq, rename_info) ->
  without = _.keys rename_info
  return rq.map (item) ->
    merge_obj = {}
    _.each rename_info, (new_key, old_key) ->
      merge_obj[new_key] = item(old_key).default(null)
    item.merge(merge_obj).without(without)

filename = (rq, primary_key = 'path') ->
  rq.merge (item) ->
    item(primary_key).match('^(.*/)?(?:$|(.+?)(?:(\\.[^.]*$)|$))')
      .default({groups:[{str:false},{str:false},{str:false}]})
      .do((result) -> {
        filename: r.branch(result('groups').nth(1), result('groups').nth(1)('str'), false),
        ext: r.branch(result('groups').nth(2), result('groups').nth(2)('str'), false)
      })

ext = (rq, primary_key = 'path') ->
  rq.merge({ext: r.row('path').match('\\.[^.]*$|$')('str')})

module.exports = build_q
