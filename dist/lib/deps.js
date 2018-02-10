'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = deps;

var _immutable = require('immutable');

var _hotFormulaParser = require('hot-formula-parser');

var _sheetyModel = require('sheety-model');

/**
 * deps takes a collection of SheetyModel Tab objects and returns
 * a Map from CellRef c to a collection of CellRefs d, where each
 * CellRef c depends on the result of the CellRefs d.
 **/
function deps(tabs) {
  var parser = getDependencyParser();

  return tabs.reduce(function (deps, tab) {
    return tab.get('rows').reduce(function (deps, row, rowIdx) {
      return row.reduce(function (deps, cell, colIdx) {
        return cell.get('formula') ? deps.set(_sheetyModel.CellRef.of(tab, rowIdx, colIdx), parser.parse(tab.get('id'), cell.get('formula'))) : deps;
      }, deps);
    }, deps);
  }, new _immutable.Map());
}

function getDependencyParser() {
  var parser = new _hotFormulaParser.Parser();
  var dependentCells = new _immutable.List();
  var tab = null;
  parser.on('callCellValue', function (cellCoord, done) {
    dependentCells = dependentCells.push(new _sheetyModel.CellRef({
      tabId: cellCoord.tab || tab,
      rowIdx: cellCoord.row.index,
      colIdx: cellCoord.column.index
    }));
    done(0); // we don't care about the value
  });
  parser.on('callRangeValue', function (startCellCoord, endCellCoord, done) {
    var range = new _sheetyModel.CellRefRange({
      start: {
        tabId: startCellCoord.tab || tab,
        rowIdx: startCellCoord.row.index,
        colIdx: startCellCoord.column.index
      },
      end: {
        tabId: startCellCoord.tab || tab,
        rowIdx: endCellCoord.row.index,
        colIdx: endCellCoord.column.index
      }
    });
    var dependentRows = range.map(function (cellRef) {
      return cellRef.set('tabId', cellRef.get('tabId') || tab);
    });

    dependentCells = dependentRows.reduce(function (_, row) {
      return dependentCells.concat(new _immutable.List(row));
    }, dependentCells);

    return [[]];
  });

  var origParse = parser.parse;
  parser.parse = function (_tab, expr) {
    tab = _tab;
    dependentCells = new _immutable.List();

    origParse.call(this, expr);

    var depCells = dependentCells;
    dependentCells = new _immutable.List();
    return depCells;
  };

  return parser;
}
//# sourceMappingURL=deps.js.map