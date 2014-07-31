should = require('chai').should()
r = require 'rethinkdb'
runflower = require '../runflower'

model =
  pluck: 'one'

model_color_sort =
  api: 'api'
  make_id: 'make_id'
  sort: 'color'

describe 'runflower', () ->
  it 'requires api and make_id fields.', () ->
    rq = runflower r, model
    should.equal(rq, undefined)

  it 'Returns itself when it is a string.', () ->
    runflower(r, 'string').should.equal('string')
    runflower(r, 'string').should.equal('string')

  it 'Returns db, table, get when passed a three item array.', ->
    rq = runflower r, ['db', 'table', 'get']
      .toString()
    rq.should.equal('r.db("db").table("table").get("get")')

  it 'Allows user to order by sort text field.', () ->
    rq = runflower r, model_color_sort
      .toString()
    rq.should.equal('r.db("make_id").table("api").orderBy("color")')

  it 'Will sort order by index.', ->
    model =
      api: 'api'
      make_id: 'make_id'
      sort:
        index: 'nameColor'
    rq = runflower r, model
      .toString()
    rq.should.equal 'r.db("make_id").table("api").orderBy({index: "nameColor"})'
