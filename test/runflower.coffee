should = require('chai').should()
runflower = require('../runflower')

model =
  pluck: 'one'

model_color_sort =
  api: 'api'
  make_id: 'make_id'
  sort: 'color'

describe 'runflower', () ->
  it 'requires api and make_id fields.', () ->
    rq = runflower null, model
    should.equal(rq, undefined)

  it 'Returns itself when it is a string.', () ->
    runflower('string').should.equal('string')
    runflower(null, 'string').should.equal('string')

  it 'Returns db, table, get when passed a three item array.', ->
    rq = runflower ['db', 'table', 'get']
      .toString()
    rq.should.equal('r.db("db").table("table").get("get")')

  it 'Allows user to order by sort text field.', () ->
    rq = runflower null, model_color_sort
      .toString()
    rq.should.equal('r.db("make_id").table("api").orderBy("color")')

  it 'Will sort order by index.', ->
    model =
      api: 'api'
      make_id: 'make_id'
      sort:
        index: 'nameColor'
    rq = runflower model
      .toString()
    rq.should.equal 'r.db("make_id").table("api").orderBy({index: "nameColor"})'
