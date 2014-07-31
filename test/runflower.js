(function() {
  var model, model_color_sort, runflower, should;

  should = require('chai').should();

  runflower = require('../runflower');

  model = {
    pluck: 'one'
  };

  model_color_sort = {
    api: 'api',
    make_id: 'make_id',
    sort: 'color'
  };

  describe('runflower', function() {
    it('requires api and make_id fields.', function() {
      var rq;
      rq = runflower(null, model);
      return should.equal(rq, void 0);
    });
    it('Returns itself when it is a string.', function() {
      runflower('string').should.equal('string');
      return runflower(null, 'string').should.equal('string');
    });
    it('Returns db, table, get when passed a three item array.', function() {
      var rq;
      rq = runflower(['db', 'table', 'get']).toString();
      return rq.should.equal('r.db("db").table("table").get("get")');
    });
    it('Allows user to order by sort text field.', function() {
      var rq;
      rq = runflower(null, model_color_sort).toString();
      return rq.should.equal('r.db("make_id").table("api").orderBy("color")');
    });
    return it('Will sort order by index.', function() {
      var rq;
      model = {
        api: 'api',
        make_id: 'make_id',
        sort: {
          index: 'nameColor'
        }
      };
      rq = runflower(model).toString();
      return rq.should.equal('r.db("make_id").table("api").orderBy({index: "nameColor"})');
    });
  });

}).call(this);
