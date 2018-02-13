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

// Used as a sentinel to indicate in-progress async calcs
var LOADING = {};

var Calculator = function () {
  /**
   * extraFormulaFuncs is a mapping from function names to functions
   * that will be accessible from formulas.  The functions take a params
   * array and a cell reference.
   *
   * userUpdateFuncs is a mapping from function names to functions
   * that will be invoked whenever a value is set for a cell with a formula
   * utilizing the corresponding function.
   **/
  function Calculator(sheet) {
    var extraFormulaFuncs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var userUpdateFuncs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, Calculator);

    this.sheet = sheet;
    this.parser = this._makeParser(extraFormulaFuncs);
    this.userUpdateFuncs = userUpdateFuncs;

    var tabs = sheet.tabsById.valueSeq();
    // Map from dependent to dependency cells
    this.deps = (0, _deps2.default)(tabs);
    // Map from CellRef p to List of CellRefs r where p provides a value needed by each r.
    this.providesTo = (0, _depsToProvides2.default)(this.deps);
    // Map from tab id to a List of Lists (rows and cells in the row)
    this.vals = new _immutable.Map(tabs.map(function (t) {
      return [t.get('id'), new _immutable.List()];
    }));
    // Map from CellRef c to the pre-calculated value of a formula.  Primarily useful for async funcs.
    this.cellValueCache = new _immutable.Map();
    // Map from CellRef c to the user-supplied value if c contains a formula making use of a userUpdateFunc.
    this.userValueCache = new _immutable.Map();

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

    /**
     * Sets the values of provided cells.
     **/

  }, {
    key: 'setValues',
    value: function setValues(valuesByCellRef) {
      var _this = this;

      valuesByCellRef.forEach(function (value, cellRef) {
        var cell = _this.sheet.getCell(cellRef);
        if (!cell.get('isUserEditable')) {
          // TODO: should we throw here?  refuse to update?
        }

        _this._setCellValue(cellRef, value);

        // here, we handle user value functions in formulas
        if (_this._hasUserValueFunc(cell)) {
          _this.userValueCache = _this.userValueCache.set(cellRef, value);
          _this.evaluateFormula(cell.get('formula'), cellRef);
        }
      });

      return this._evalDependents(new _immutable.Set(valuesByCellRef.keySeq()));
    }
  }, {
    key: '_hasUserValueFunc',
    value: function _hasUserValueFunc(cell) {
      var formula = cell.get('formula');
      if (!formula) {
        return false;
      }

      var upperCaseFormula = formula.toUpperCase();

      return Object.keys(this.userUpdateFuncs).some(function (f) {
        return upperCaseFormula.startsWith(f.toUpperCase() + '(');
      });
    }

    /**
     * This is primarily useful for asynchronous sheet functions.
     * After calculating their value, async functions can set a cached
     * cell value.
     **/

  }, {
    key: 'setCachedCellValue',
    value: function setCachedCellValue(cellRef, value) {
      this.cellValueCache = this.cellValueCache.set(cellRef, value);
      this._setCellValue(cellRef, value);
      return this._evalDependents(_immutable.Set.of(cellRef));
    }
  }, {
    key: '_evalDependents',
    value: function _evalDependents(cellRefs) {
      var toEval = (0, _partialEvalOrder2.default)(this.providesTo, cellRefs).skipWhile(function (r) {
        return cellRefs.includes(r);
      }).toList();

      return this._processCalculations(toEval);
    }

    /**
     * Evaluate the formula provided, using cellRef to resolve ambiguous
     * references (those without a tab specified) and to resolve async functions.
     **/

  }, {
    key: 'evaluateFormula',
    value: function evaluateFormula(formula, cellRef) {
      var _this2 = this;

      var assocData = { cellRef: cellRef };
      return withAssociatedParserData(assocData, this.parser, function () {
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
      var format = cell && cell.get('format');

      return format ? format.format(val) : val;
    }

    /**
     * Evaluate each cell in order.
     **/

  }, {
    key: '_processCalculations',
    value: function _processCalculations(order) {
      var _this3 = this;

      order.forEach(function (cellRef) {
        _this3._setCellValue(cellRef, _this3._calculateCellValue(cellRef, true));
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
     * If skipCache is not set, we will prefer pre-calculated values for any
     * formulas that provided them.
     * If skipCache is set, we will always re-calculate formulas.
     **/

  }, {
    key: '_calculateCellValue',
    value: function _calculateCellValue(cellRef, skipCache) {
      var cell = this.sheet.getCell(cellRef);

      var formula = cell.get('formula');
      if (formula) {
        var cachedValue = this.cellValueCache.get(cellRef);
        if (!skipCache && !!cachedValue) {
          return cachedValue;
        }

        this.cellValueCache = this.cellValueCache.remove(cellRef);
        return this.evaluateFormula(formula, cellRef);
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
    value: function _makeParser(extraFormulaFuncs) {
      var _this4 = this;

      var parser = new _hotFormulaParser.Parser();

      parser.on('callCellValue', function (_ref, done) {
        var row = _ref.row,
            column = _ref.column,
            tab = _ref.tab;

        var defaultTabId = parser.cellRef && parser.cellRef.get('tabId');
        var tabId = tab || defaultTabId;
        var cellRef = _sheetyModel.CellRef.of(_this4.sheet.getTab(tabId), row.index, column.index);
        done(_this4._getCellValue(cellRef));
      });

      parser.on('callRangeValue', function (startCellCoord, endCellCoord, explicitTabId, done) {
        var defaultTabId = parser.cellRef && parser.cellRef.get('tabId');
        var tabId = explicitTabId || defaultTabId;
        var tab = _this4.sheet.getTab(tabId);
        var rangeRef = _sheetyModel.CellRefRange.of(tab, startCellCoord.row.index, startCellCoord.column.index, endCellCoord.row.index, endCellCoord.column.index);
        var range = _this4.getRange(rangeRef);
        done(range);
      });

      Object.keys(funcs).forEach(function (name) {
        parser.setFunction(name, funcs[name]);
      });

      Object.keys(extraFormulaFuncs).forEach(function (name) {
        var func = extraFormulaFuncs[name];
        var wrapped = function wrapped(params) {
          var cellRef = parser.cellRef;
          var userValueHandler = _this4.userUpdateFuncs[name];
          if (_this4.userValueCache.has(cellRef) && userValueHandler) {
            var userValue = _this4.userValueCache.get(cellRef);
            var consumed = userValueHandler(params, cellRef, userValue);
            if (consumed) {
              _this4.userValueCache = _this4.userValueCache.remove(cellRef);
            }

            return userValue;
          }

          return func(params, cellRef);
        };
        parser.setFunction(name.toUpperCase(), wrapped);
      });

      return parser;
    }
  }]);

  return Calculator;
}();

exports.default = Calculator;


Calculator.LOADING = LOADING;

function withAssociatedParserData(associatedData, parser, fn) {
  Object.keys(associatedData).forEach(function (k) {
    parser[k] = associatedData[k];
  });
  var result = fn();
  Object.keys(associatedData).forEach(function (k) {
    parser[k] = null;
  });
  return result;
}
//# sourceMappingURL=calculator.js.map