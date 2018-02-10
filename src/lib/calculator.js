import { Map, List } from 'immutable';
import { Parser } from 'hot-formula-parser';
import { CellRef, CellRefRange } from 'sheety-model';
import evalOrder from './eval-order';
import partialEvalOrder from './partial-eval-order';
import deps from './deps';
import depsToProvides from './deps-to-provides';
import * as funcs from './sheet-funcs';

export default class Calculator {
  constructor(sheet) {
    this.sheet = sheet;
    this.parser = this._makeParser();

    const tabs = sheet.tabsById.valueSeq();
    // Map from dependent to dependency cells
    this.deps = deps(tabs);
    // Map from CellRef p to List of CellRefs r where p provides a value needed by each r.
    this.providesTo = depsToProvides(this.deps);
    // Map from tab id to a List of Lists (rows and cells in the row)
    this.vals = new Map(tabs.map(t => [t.get('id'), new List()]));

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

  setValues(valuesByCellRef) {
    valuesByCellRef.forEach((value, cellRef) => {
      const cell = this.sheet.getCell(cellRef);
      if ( !cell.get('isUserEditable') ) {
        // TODO
      }

      this._setCellValue(cellRef, value);
    });

    const toEval = partialEvalOrder(
      this.providesTo,
      valuesByCellRef.keySeq()
    ).skipWhile(r => valuesByCellRef.has(r)).toList()

    return this._processCalculations(toEval);
  }

  /**
   * Evaluate the formula provided, using defaultTabId as the tab for any
   * cell references without a tab.
   **/
  evaluateFormula(formula, defaultTabId) {
    return withDefaultTabId(defaultTabId, this.parser, () => {
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
    const format = cell.get('format');

    return format.format(val);
  }

  /**
   * Evaluate each cell in order.
   **/
  _processCalculations(order) {
    order.forEach((cellRef) => {
      this._setCellValue(cellRef, this._calculateCellValue(cellRef));
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
   **/
  _calculateCellValue(cellRef) {
    const cell = this.sheet.getCell(cellRef);

    const formula = cell.get('formula');
    if ( formula ) {
      return this.evaluateFormula(formula, cellRef.get('tabId'));
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

  _makeParser() {
    const parser = new Parser();

    parser.on('callCellValue', ({row, column, tab}, done) => {
      const tabId = tab || parser.defaultTabId;
      const cellRef = CellRef.of(this.sheet.getTab(tabId), row.index, column.index);
      done(this._getCellValue(cellRef));
    });

    parser.on('callRangeValue', (startCellCoord, endCellCoord, explicitTabId, done) => {
      const tabId = explicitTabId || parser.defaultTabId;
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

    return parser;
  }
}

function withDefaultTabId(defaultTabId, parser, fn) {
  parser.defaultTabId = defaultTabId;
  const result = fn();
  parser.defaultTabId = null;
  return result;
}
