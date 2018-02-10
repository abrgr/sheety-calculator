'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _immutable = require('immutable');

var _hotFormulaParser = require('hot-formula-parser');

var _sheetyModel = require('sheety-model');

var _evalOrder = require('./eval-order');

var _evalOrder2 = _interopRequireDefault(_evalOrder);

var _partialEvalOrder = require('./partial-eval-order');

var _partialEvalOrder2 = _interopRequireDefault(_partialEvalOrder);

var _deps = require('./deps');

var _deps2 = _interopRequireDefault(_deps);

var _depsToProvides = require('./deps-to-provides');

var _depsToProvides2 = _interopRequireDefault(_depsToProvides);

var _sheetFuncs = require('./sheet-funcs');

var funcs = _interopRequireWildcard(_sheetFuncs);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Calculator = function () {
  function Calculator(sheet) {
    _classCallCheck(this, Calculator);

    this.sheet = sheet;
    this.parser = this._makeParser();

    var tabs = sheet.tabsById.valueSeq();
    // Map from dependent to dependency cells
    this.deps = (0, _deps2.default)(tabs);
    // Map from CellRef p to List of CellRefs r where p provides a value needed by each r.
    this.providesTo = (0, _depsToProvides2.default)(this.deps);
    // Map from tab id to a List of Lists (rows and cells in the row)
    this.vals = new _immutable.Map(tabs.map(function (t) {
      return [t.get('id'), new _immutable.List()];
    }));

    this.calculateAll();
  }

  /**
   * Calculate the full sheet without any user input.
   *
   * Returns a map from tab ids to a List of Lists of values.
   **/


  _createClass(Calculator, [{
    key: 'calculateAll',
    value: function calculateAll() {
      return this._processCalculations((0, _evalOrder2.default)(this.deps, this._allCellRefs()));
    }
  }, {
    key: 'setValues',
    value: function setValues(valuesByCellRef) {
      var _this = this;

      valuesByCellRef.forEach(function (value, cellRef) {
        var cell = _this.sheet.getCell(cellRef);
        if (!cell.get('isUserEditable')) {
          // TODO
        }

        _this._setCellValue(cellRef, value);
      });

      var toEval = (0, _partialEvalOrder2.default)(this.providesTo, valuesByCellRef.keySeq()).skipWhile(function (r) {
        return valuesByCellRef.has(r);
      }).toList();

      return this._processCalculations(toEval);
    }

    /**
     * Evaluate the formula provided, using defaultTabId as the tab for any
     * cell references without a tab.
     **/

  }, {
    key: 'evaluateFormula',
    value: function evaluateFormula(formula, defaultTabId) {
      var _this2 = this;

      return withDefaultTabId(defaultTabId, this.parser, function () {
        var formulaValue = _this2.parser.parse(formula);
        if (formulaValue.error) {
          // TODO
          return formulaValue.error;
        }

        return formulaValue.result;
      });
    }

    /** Given an A1 range, rangeRef, return the values of the corresponding cells
     *  in an NxM matrix (2-d array).
     **/

  }, {
    key: 'getRange',
    value: function getRange(rangeRef) {
      return this.sheet.mapRange(rangeRef, this._getCellValue.bind(this));
    }

    /**
     * Given an A1 range, rangeRef, return the formatted values of the corresponding cells
     * in an NxM matrix (2-d array).
     **/

  }, {
    key: 'getFormattedRange',
    value: function getFormattedRange(rangeRef) {
      return this.sheet.mapRange(rangeRef, this.getFormattedCell.bind(this));
    }

    /**
     * Given an A1 reference, return the formatted value of the corresponding cell.
     **/

  }, {
    key: 'getFormattedCell',
    value: function getFormattedCell(cellRef) {
      var val = this._getCellValue(cellRef);
      var cell = this.sheet.getCell(cellRef);
      var format = cell.get('format');

      return format.format(val);
    }

    /**
     * Evaluate each cell in order.
     **/

  }, {
    key: '_processCalculations',
    value: function _processCalculations(order) {
      var _this3 = this;

      order.forEach(function (cellRef) {
        _this3._setCellValue(cellRef, _this3._calculateCellValue(cellRef));
      });

      return this.vals;
    }

    /**
     * Return all cell references for all tabs.
     **/

  }, {
    key: '_allCellRefs',
    value: function _allCellRefs() {
      return this.sheet.allCellRefs().toSet();
    }

    /**
     * Calculates the value of the cell at the given ref.
     **/

  }, {
    key: '_calculateCellValue',
    value: function _calculateCellValue(cellRef) {
      var cell = this.sheet.getCell(cellRef);

      var formula = cell.get('formula');
      if (formula) {
        return this.evaluateFormula(formula, cellRef.get('tabId'));
      }

      var staticValue = cell.get('staticValue');
      if (staticValue !== null) {
        return staticValue;
      }

      var remoteValue = cell.get('remoteValue');
      if (remoteValue) {
        // TODO: handle remote values
      }

      return this._getCellValue(cellRef);
    }

    /**
     * Sets the value of the cell at the given ref, regardless of user-editability.
     **/

  }, {
    key: '_setCellValue',
    value: function _setCellValue(cellRef, value) {
      var tabId = cellRef.get('tabId');
      var rowIdx = cellRef.get('rowIdx');
      var colIdx = cellRef.get('colIdx');

      if (!this.vals.has(tabId)) {
        this.vals = this.vals.set(tabId, new _immutable.List());
      }
      if (!this.vals.getIn([tabId, rowIdx])) {
        this.vals = this.vals.setIn([tabId, rowIdx], new _immutable.List());
      }
      this.vals = this.vals.setIn([cellRef.get('tabId'), cellRef.get('rowIdx'), cellRef.get('colIdx')], value);
    }

    /**
     * Returns the previously-set value of the cell at the given ref.
     **/

  }, {
    key: '_getCellValue',
    value: function _getCellValue(cellRef) {
      var tab = this.vals.get(cellRef.get('tabId'));
      if (!tab) {
        return null;
      }

      return tab.getIn([cellRef.get('rowIdx'), cellRef.get('colIdx')]);
    }
  }, {
    key: '_makeParser',
    value: function _makeParser() {
      var _this4 = this;

      var parser = new _hotFormulaParser.Parser();

      parser.on('callCellValue', function (_ref, done) {
        var row = _ref.row,
            column = _ref.column,
            tab = _ref.tab;

        var tabId = tab || parser.defaultTabId;
        var cellRef = _sheetyModel.CellRef.of(_this4.sheet.getTab(tabId), row.index, column.index);
        done(_this4._getCellValue(cellRef));
      });

      parser.on('callRangeValue', function (startCellCoord, endCellCoord, explicitTabId, done) {
        var tabId = explicitTabId || parser.defaultTabId;
        var tab = _this4.sheet.getTab(tabId);
        var rangeRef = _sheetyModel.CellRefRange.of(tab, startCellCoord.row.index, startCellCoord.column.index, endCellCoord.row.index, endCellCoord.column.index);
        var range = _this4.getRange(rangeRef);
        done(range);
      });

      Object.keys(funcs).forEach(function (name) {
        parser.setFunction(name, funcs[name]);
      });

      return parser;
    }
  }]);

  return Calculator;
}();

exports.default = Calculator;


function withDefaultTabId(defaultTabId, parser, fn) {
  parser.defaultTabId = defaultTabId;
  var result = fn();
  parser.defaultTabId = null;
  return result;
}
//# sourceMappingURL=calculator.js.map