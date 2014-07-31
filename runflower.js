(function() {
  var build_q, compare_lr, create_field, empty_fields, eqJoin, ext, filename, group_by, group_by_obj, index_by, left_right, map_add, must_not, options, outerJoin, pluck, rename, should, stringify, _;

  _ = require('lodash');

  options = {
    db: 'make_id',
    table: 'api'
  };

  build_q = function(r, field, rq) {
    if (!field && !_.isFunction(rq)) {
      field = rq;
    }
    if (_.isString(field)) {
      return field;
    }
    if (!_.isObject(field)) {
      return null;
    }
    if (field.value) {
      return field.value;
    }
    if (_.isArray(field) && _.size(field) > 2) {
      field = {
        make_id: field[0],
        api: field[1],
        get: field[2]
      };
    }
    if (_.isObject(field.difference) && field.make_id) {
      rq = compare_lr('difference', field.difference, field.make_id);
    } else if (_.isObject(field.intersection) && field.make_id) {
      rq = compare_lr('intersection', field.intersection, field.make_id);
    } else if (field.make_id) {
      rq = r.db(field.make_id);
    }
    if (!rq) {
      console.log('No rq in build_q()');
      console.log(field);
      return;
    }
    if (field.api) {
      rq = rq.table(field.api);
    }
    if (field.get) {
      rq = rq.get(field.get);
    } else if (_.isArray(field.getAll)) {
      rq = rq.getAll(field.getAll);
    }
    if (field.has) {
      rq = rq.hasFields(field.has);
    }
    if (field["with"]) {
      rq = rq.withFields(field["with"]);
    } else if (_.isObject(field.group_by)) {
      rq = group_by_obj(rq, field.group_by);
    }
    if (_.isObject(field.must)) {
      rq = rq.filter(field.must);
    }
    if (_.isObject(field.must_not)) {
      rq = must_not(rq, field.must_not);
    }
    if (_.isObject(field.should && _.size(field.should))) {
      console.log(field.should);
      rq = should(rq, field.should);
    }
    if (field.empty_fields) {
      rq = empty_fields(rq, field.empty_fields);
    }
    if (field.eqJoin && field.eqJoin.table && field.eqJoin.key) {
      rq = eqJoin(rq, field);
    } else if (field.outerJoin && field.outerJoin.left_key && field.outerJoin.right_key && field.outerJoin.table) {
      rq = outerJoin(rq, field.outerJoin, field.make_id);
    }
    if (field.field) {
      if (field.field.filename) {
        rq = filename(rq);
        delete field.field.filename;
      }
      if (field.field.ext) {
        rq = ext(rq);
        delete field.field.ext;
      }
      if (!_.isEmpty(field.field)) {
        rq = create_field(rq, field.field, field.make_id, field.get);
      }
    }
    if (_.isArray(field.stringify)) {
      rq = stringify(rq, field.stringify);
    }
    if (field.get && _.isString(field.pluck)) {
      rq = pluck(rq, field.pluck);
      delete field.pluck;
    }
    if (field.sort) {
      rq = rq.orderBy(field.sort);
    }
    if (_.isObject(field.rename)) {
      rq = rename(rq, field.rename);
    }
    if (_.isObject(field.merge_with)) {
      rq = rq.map(function(item) {
        return item.merge(field.merge_with);
      });
    }
    if (_.isString(field.index_by)) {
      rq = index_by(rq, field);
    } else if (_.isString(field.group_by)) {
      rq = group_by(rq, field);
    } else if (_.isString(field.flatten)) {
      rq = rq.withFields(field.flatten).concatMap(function(item) {
        return item(field.flatten);
      });
      if (field.without) {
        rq = rq.difference(field.without);
      }
    } else if (field.pluck) {
      rq = pluck(rq, field.pluck);
    }
    if (field.map && field.map.add) {
      rq = map_add(rq, field.map.add);
    }
    if (field.unique) {
      rq = rq.distinct();
    }
    if (field.return_all) {
      rq = rq.coerceTo('ARRAY');
    }
    if (field.count) {
      rq = rq.count();
    } else if (field.merge) {
      rq = rq.reduce(function(left, right) {
        return left.merge(right);
      });
    }
    if (field.debug) {
      console.log(rq.toString());
    }
    return rq;
  };

  left_right = function(field, make_id) {
    field.left.return_all = field.right.return_all = true;
    if (!field.left.make_id) {
      field.left.make_id = make_id;
    }
    if (!field.right.make_id) {
      field.right.make_id = make_id;
    }
    return r({
      l: build_q(null, field.left),
      r: build_q(null, field.right)
    });
  };

  compare_lr = function(compare_type, field, make_id) {
    var rq;
    rq = left_right(field, make_id);
    if (compare_type === 'difference') {
      rq = rq["do"](function(v) {
        return v('l').difference(v('r'));
      });
    } else if (compare_type === 'intersection') {
      rq = rq["do"](function(v) {
        return v('l').setIntersection(v('r'));
      });
    }
    if (_.isString(field.left.pluck) && _.isString(field.right.pluck) && field.getAll) {
      rq = r.db(field.left.make_id).table(field.left.api).getAll(r.args(rq));
    }
    return rq;
  };

  should = function(rq, should_info) {
    var or_statements;
    or_statements = [];
    rq = rq.filter(function(item) {
      _.each(should_info, function(required_value, key) {
        if (_.isArray(required_value)) {
          return _.each(required_value, function(req_val) {
            return or_statements.push(item(key).eq(req_val));
          });
        } else {
          return or_statements.push(item(key).eq(required_value));
        }
      });
      return r.or.apply(this, or_statements);
    });
    return rq;
  };

  must_not = function(rq, not_info) {
    return rq.filter(function(item) {
      var not_args;
      not_args = _.map(not_info, function(value, key) {
        return item(key).ne(value);
      });
      return r.and.apply(this, not_args);
    });
  };

  empty_fields = function(rq, fields) {
    return rq.filter(function(item) {
      var empty_args;
      if (_.isString(fields)) {
        return item.hasFields(fields).not();
      } else if (_.isArray(fields)) {
        empty_args = _.map(fields, function(field_id) {
          return item.hasFields(field_id).not();
        });
        return r.and.apply(this, empty_args);
      }
    });
  };

  map_add = function(rq, add) {
    return rq.map(function(item) {
      add = _.map(add, function(field) {
        return item(field);
      });
      return r.add.apply(this, add);
    });
  };

  pluck = function(rq, pluck_info) {
    var pluck_arr;
    if (_.isString(pluck_info)) {
      pluck_arr = pluck_info.split(".");
      _.each(pluck_arr, function(field_name) {
        return rq = rq(field_name);
      });
    } else if (_.isArray(pluck_info)) {
      rq = rq.pluck(pluck_info);
    }
    return rq;
  };

  index_by = function(rq, field) {
    if (field.pluck) {
      rq = rq.map(function(item) {
        return r.branch(item(field.index_by), r.object(item(field.index_by).coerceTo('STRING'), pluck(item, field.pluck)), {});
      });
    } else {
      rq = rq.map(function(item) {
        return r.branch(item(field.index_by), r.object(item(field.index_by).coerceTo('STRING'), item), {});
      });
    }
    return rq;
  };

  group_by_obj = function(rq, field) {
    rq = rq.group(field.field);
    if (field.count) {
      rq = rq.count();
    }
    return rq = rq.ungroup();
  };

  group_by = function(rq, field) {
    var pre_pluck;
    if (_.isString(field.pluck)) {
      pre_pluck = [field.pluck, field.group_by];
    } else if (_.isString(field.flatten)) {
      pre_pluck = [field.flatten, field.group_by];
    } else if (_.isArray(field.pluck)) {
      pre_pluck = _.clone(field.pluck);
      pre_pluck.push(field.group_by);
    }
    if (pre_pluck) {
      rq = rq.withFields(pre_pluck);
    }
    rq = rq.group(field.group_by);
    if (field.pluck) {
      rq = pluck(rq, field.pluck);
    } else if (_.isString(field.flatten)) {
      rq = rq.concatMap(function(item) {
        return item(field.flatten);
      });
    }
    if (field.map && field.map.add) {
      rq = map_add(rq, field.map.add);
      delete field.map.add;
    }
    if (field.unique) {
      rq = rq.distinct();
      field.unique = false;
    }
    return rq.ungroup().map(function(item) {
      return r.object(item('group'), item('reduction'));
    });
  };

  eqJoin = function(rq, field) {
    if (field.eqJoin.require_match === false) {
      rq = rq.merge(function(item) {
        var subq;
        subq = r.db(field.make_id).table(field.eqJoin.table);
        if (field.eqJoin.index) {
          subq = subq.getAll(item(field.eqJoin.key), {
            index: field.eqJoin.index
          }).limit(1).nth(0);
        } else {
          subq = subq.get(item(field.eqJoin.key))["default"]({});
        }
        if (field.eqJoin.pluck) {
          return subq.pluck(field.eqJoin.pluck);
        } else {
          return subq;
        }
      });
    } else {
      if (field.eqJoin.index) {
        rq = rq.eqJoin(field.eqJoin.key, r.db(field.make_id).table(field.eqJoin.table), {
          index: field.eqJoin.index
        });
      } else {
        rq = rq.eqJoin(field.eqJoin.key, r.db(field.make_id).table(field.eqJoin.table));
      }
      if (field.eqJoin.zip !== false) {
        rq = rq.zip();
      }
    }
    return rq;
  };

  outerJoin = function(rq, f, make_id) {
    return rq.map(function(l) {
      if (f.pluck) {
        return l.merge(r.db(make_id).table(f.table).filter(function(v) {
          return v(f.right_key).eq(l(f.left_key));
        }).nth(0).pluck(f.pluck));
      } else {
        return l.merge(r.db(make_id).table(f.table).filter(function(v) {
          return v(f.right_key).eq(l(f.left_key));
        }).nth(0));
      }
    });
  };

  create_field = function(rq, field_info, make_id, single) {
    var func;
    if (single) {
      func = 'do';
    } else {
      func = 'map';
    }
    return rq[func](function(item) {
      _.each(field_info, function(info, field_id) {
        var combine, entity_ids, new_item, subq;
        if (info.func === 'default' && info.arg_field) {
          if (!info["try"]) {
            info["try"] = field_id;
          }
          return item = item.merge(r.object(field_id, pluck(item, info["try"])["default"](pluck(item, info.arg_field))));
        } else if (info.func === 'add' && _.isArray(info.arg)) {
          combine = r('');
          _.each(info.arg, function(arg) {
            if (arg.field) {
              if (arg.default_field) {
                return combine = combine.add(item(arg.field)["default"](item(arg.default_field)));
              } else {
                return combine = combine.add(item(arg.field));
              }
            } else if (arg.value) {
              return combine = combine.add(arg.value);
            }
          });
          return item = item.merge(r.object(field_id, combine));
        } else if (info.func === 'getAll' && _.isObject(info.arg)) {
          if (info.arg.entities_field) {
            entity_ids = item(info.arg.entities_field);
          }
          if (info.arg.entities_field_pluck) {
            entity_ids = pluck(entity_ids, info.arg.entities_field_pluck);
          }
          subq = r.db(make_id).table(item(info.arg.api_field)).getAll(r.args(entity_ids));
          if (info.arg.pluck) {
            subq = pluck(subq, info.arg.pluck);
          }
          if (field_id === '_data') {
            new_item = subq;
          } else {
            new_item = item.merge(r.object(field_id, subq.coerceTo('ARRAY')));
          }
          return item = r.branch(item, new_item, item);
        }
      });
      return item;
    });
  };

  stringify = function(rq, field_arr) {
    return rq.map(function(row) {
      var merge_obj;
      merge_obj = {};
      _.each(field_arr, function(field_id) {
        return merge_obj[field_id] = r.branch(row(field_id)["default"](false), row(field_id).reduce(function(l, right) {
          return l.add(', ').add(right);
        }), null);
      });
      return row.merge(merge_obj);
    });
  };

  rename = function(rq, rename_info) {
    var without;
    without = _.keys(rename_info);
    return rq.map(function(item) {
      var merge_obj;
      merge_obj = {};
      _.each(rename_info, function(new_key, old_key) {
        return merge_obj[new_key] = item(old_key)["default"](null);
      });
      return item.merge(merge_obj).without(without);
    });
  };

  filename = function(rq, primary_key) {
    if (primary_key == null) {
      primary_key = 'path';
    }
    return rq.merge(function(item) {
      return item(primary_key).match('^(.*/)?(?:$|(.+?)(?:(\\.[^.]*$)|$))')["default"]({
        groups: [
          {
            str: false
          }, {
            str: false
          }, {
            str: false
          }
        ]
      })["do"](function(result) {
        return {
          filename: r.branch(result('groups').nth(1), result('groups').nth(1)('str'), false),
          ext: r.branch(result('groups').nth(2), result('groups').nth(2)('str'), false)
        };
      });
    });
  };

  ext = function(rq, primary_key) {
    if (primary_key == null) {
      primary_key = 'path';
    }
    return rq.merge({
      ext: r.row('path').match('\\.[^.]*$|$')('str')
    });
  };

  module.exports = build_q;

}).call(this);
