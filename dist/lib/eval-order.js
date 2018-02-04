'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = evalOrder;

var _sheetyModel = require('sheety-model');

var _immutable = require('immutable');

var _toposort = require('toposort');

var _toposort2 = _interopRequireDefault(_toposort);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * evalOrder takes a Map from CellRef to a collection of CellRefs (like
 * that returned by deps) and a Set of all CellRefs and returns
 * an ordered List of the cells to evaluate, first to last.
 **/
function evalOrder(cellDeps, all) {
  var happensBefores = cellDeps.entrySeq().flatMap(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        after = _ref2[0],
        befores = _ref2[1];

    return befores.map(function (before) {
      return [before.toA1Ref(), after.toA1Ref()];
    });
  }).toJS();

  return new _immutable.List(_toposort2.default.array(all.map(function (i) {
    return i.toA1Ref();
  }).toJS(), happensBefores)).map(_sheetyModel.CellRef.fromA1Ref);
}
//# sourceMappingURL=eval-order.js.map