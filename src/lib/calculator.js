import { Set, Map, List } from 'immutable';
import { Parser } from 'hot-formula-parser';
import { CellRef, CellRefRange } from 'sheety-model';
import evalOrder from './eval-order';
import partialEvalOrder from './partial-eval-order';
import deps from './deps';
import depsToProvides from './deps-to-provides';
import * as funcs from './sheet-funcs';

// Used as a sentinel to indicate in-progress async calcs
const LOADING = {};

export default class Calculator {
  /**
   * extraFormulaFuncs is a mapping from function names to functions
   * that will be accessible from formulas.  The functions take a params
   * array and a cell reference.
   *
   * userUpdateFuncs is a mapping from function names to functions
   * that will be invoked whenever a value is set for a cell with a formula
   * utilizing the corresponding function.
   **/
  constructor(sheet, extraFormulaFuncs = {}, userUpdateFuncs = {}) {
    this.sheet = sheet;
    this.parser = this._makeParser(extraFormulaFuncs);
    this.userUpdateFuncs = userUpdateFuncs;

    const tabs = sheet.tabsById.valueSeq();
    // Map from dependent to dependency cells
    this.deps = deps(tabs);
    // Map from CellRef p to List of CellRefs r where p provides a value needed by each r.
    this.providesTo = depsToProvides(this.deps);
    // Map from tab id to a List of Lists (rows and cells in the row)
    this.vals = new Map(tabs.map(t => [t.get('id'), new List()]));
    // Map from CellRef c to the pre-calculated value of a formula.  Primarily useful for async funcs.
    this.cellValueCache = new Map();
    // Map from CellRef c to the user-supplied value if c contains a formula making use of a userUpdateFunc.
    this.userValueCache = new Map();

    this.calculateAll();
  }

  /**
   * Calculate the full sheet without any user input.
   *
   * Returns a map from tab ids to a List of Lists of values.
   **/
  calculateAll() {
    return this._processCalculations(evalOrder(this.deps, this._allCellRefs()));
  }

  /**
   * Sets the values of provided cells.
   **/
  setValues(valuesByCellRef) {
    valuesByCellRef.forEach((value, cellRef) => {
      const cell = this.sheet.getCell(cellRef);
      if ( !cell.get('isUserEditable') ) {
        // TODO: should we throw here?  refuse to update?
      }

      this._setCellValue(cellRef, value);

      // here, we handle user value functions in formulas
      if ( this._hasUserValueFunc(cell) ) {
        this.userValueCache = this.userValueCache.set(cellRef, value);
        this.evaluateFormula(cell.get('formula'), cellRef);
      }
    });

    return this._evalDependents(new Set(valuesByCellRef.keySeq()));
  }

  _hasUserValueFunc(cell) {
    const formula = cell.get('formula');
    if ( !formula ) {
      return false;
    }

    const upperCaseFormula = formula.toUpperCase();

    return Object.keys(this.userUpdateFuncs)
                 .some(f => upperCaseFormula.startsWith(f.toUpperCase() + '('));
  }

  /**
   * This is primarily useful for asynchronous sheet functions.
   * After calculating their value, async functions can set a cached
   * cell value.
   **/
  setCachedCellValue(cellRef, value) {
    this.cellValueCache = this.cellValueCache.set(cellRef, value);
    this._setCellValue(cellRef, value);
    return this._evalDependents(Set.of(cellRef));
  }

  _evalDependents(cellRefs) {
    const toEval = partialEvalOrder(
      this.providesTo,
      cellRefs
    ).skipWhile(r => cellRefs.includes(r)).toList()

    return this._processCalculations(toEval);
  }

  /**
   * Evaluate the formula provided, using cellRef to resolve ambiguous
   * references (those without a tab specified) and to resolve async functions.
   **/
  evaluateFormula(formula, cellRef) {
    const assocData = { cellRef };
    return withAssociatedParserData(assocData, this.parser, () => {
      const formulaValue = this.parser.parse(formula);
      if ( formulaValue.error ) {
        // TODO
        return formulaValue.error;
      }

      return formulaValue.result;
    });
  }

  /** Given an A1 range, rangeRef, return the values of the corresponding cells
   *  in an NxM matrix (2-d array).
   **/
  getRange(rangeRef) {
    return this.sheet.mapRange(
      rangeRef,
      this._getCellValue.bind(this)
    );
  }

  /**
   * Given an A1 range, rangeRef, return the formatted values of the corresponding cells
   * in an NxM matrix (2-d array).
   **/
  getFormattedRange(rangeRef) {
    return this.sheet.mapRange(
      rangeRef,
      this.getFormattedCell.bind(this)
    );
  }

  /**
   * Given an A1 reference, return the formatted value of the corresponding cell.
   **/
  getFormattedCell(cellRef) {
    const val = this._getCellValue(cellRef);
    const cell = this.sheet.getCell(cellRef);
    const format = cell && cell.get('format');

    return format ? format.format(val) : val;
  }

  /**
   * Evaluate each cell in order.
   **/
  _processCalculations(order) {
    order.forEach((cellRef) => {
      this._setCellValue(cellRef, this._calculateCellValue(cellRef, true));
    });

    return this.vals;
  }

  /**
   * Return all cell references for all tabs.
   **/
  _allCellRefs() {
    return this.sheet.allCellRefs().toSet();
  }

  /**
   * Calculates the value of the cell at the given ref.
   * If skipCache is not set, we will prefer pre-calculated values for any
   * formulas that provided them.
   * If skipCache is set, we will always re-calculate formulas.
   **/
  _calculateCellValue(cellRef, skipCache) {
    const cell = this.sheet.getCell(cellRef);

    const formula = cell.get('formula');
    if ( formula ) {
      const cachedValue = this.cellValueCache.get(cellRef);
      if ( !skipCache && !!cachedValue ) {
        return cachedValue;
      }

      this.cellValueCache = this.cellValueCache.remove(cellRef);
      return this.evaluateFormula(formula, cellRef);
    }

    const staticValue = cell.get('staticValue');
    if ( staticValue !== null ) {
      return staticValue;
    }

    const remoteValue = cell.get('remoteValue');
    if ( remoteValue ) {
      // TODO: handle remote values
    }

    return this._getCellValue(cellRef);
  }

  /**
   * Sets the value of the cell at the given ref, regardless of user-editability.
   **/
  _setCellValue(cellRef, value) {
    const tabId = cellRef.get('tabId');
    const rowIdx = cellRef.get('rowIdx');
    const colIdx = cellRef.get('colIdx');

    if ( !this.vals.has(tabId) ) {
      this.vals = this.vals.set(tabId, new List());
    }
    if ( !this.vals.getIn([tabId, rowIdx]) ) {
      this.vals = this.vals.setIn([tabId, rowIdx], new List());
    }
    this.vals = this.vals.setIn([cellRef.get('tabId'), cellRef.get('rowIdx'), cellRef.get('colIdx')], value);
  }

  /**
   * Returns the previously-set value of the cell at the given ref.
   **/
  _getCellValue(cellRef) {
    const tab = this.vals.get(cellRef.get('tabId'))
    if ( !tab ) {
      return null;
    }

    return tab.getIn([cellRef.get('rowIdx'), cellRef.get('colIdx')]);
  }

  _makeParser(extraFormulaFuncs) {
    const parser = new Parser();

    parser.on('callCellValue', ({row, column, tab}, done) => {
      const defaultTabId = parser.cellRef && parser.cellRef.get('tabId');
      const tabId = tab || defaultTabId;
      const cellRef = CellRef.of(this.sheet.getTab(tabId), row.index, column.index);
      done(this._getCellValue(cellRef));
    });

    parser.on('callRangeValue', (startCellCoord, endCellCoord, explicitTabId, done) => {
      const defaultTabId = parser.cellRef && parser.cellRef.get('tabId');
      const tabId = explicitTabId || defaultTabId;
      const tab = this.sheet.getTab(tabId);
      const rangeRef = CellRefRange.of(
        tab,
        startCellCoord.row.index,
        startCellCoord.column.index,
        endCellCoord.row.index,
        endCellCoord.column.index
      );
      const range = this.getRange(rangeRef);
      done(range);
    });

    Object.keys(funcs).forEach(name => {
      parser.setFunction(name, funcs[name]);
    });

    Object.keys(extraFormulaFuncs).forEach(name => {
      const func = extraFormulaFuncs[name];
      const wrapped = (params) => {
        const cellRef = parser.cellRef;
        const userValueHandler = this.userUpdateFuncs[name];
        if ( this.userValueCache.has(cellRef) && userValueHandler ) {
          const userValue = this.userValueCache.get(cellRef);
          const consumed = userValueHandler(params, cellRef, userValue);
          if ( consumed ) {
            this.userValueCache = this.userValueCache.remove(cellRef);
          }

          return userValue;
        }

        return func(params, cellRef)
      };
      parser.setFunction(name.toUpperCase(), wrapped);
    });

    return parser;
  }
}

Calculator.LOADING = LOADING;

function withAssociatedParserData(associatedData, parser, fn) {
  Object.keys(associatedData).forEach(k => {
    parser[k] = associatedData[k];
  });
  const result = fn();
  Object.keys(associatedData).forEach(k => {
    parser[k] = null;
  });
  return result;
}
