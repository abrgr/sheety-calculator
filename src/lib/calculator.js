import { Map, List } from 'immutable';
import { Parser } from 'hot-formula-parser';
import { CellRef } from 'sheety-model';
import evalOrder from './eval-order';
import partialEvalOrder from './partial-eval-order';
import deps from './deps';
import depsToProvides from './deps-to-provides';
import * as funcs from './sheet-funcs';

export default class Calculator {
  constructor(tabs) {
    this.parser = this._makeParser();
    // Map from tab id to sheety-model Tab
    this.tabsById = new Map(tabs.map(t => [t.get('id'), t]));
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
      const cell = this._getCell(cellRef);
      if ( !cell.get('isUserEditable') ) {
        // TODO
      }

      this._setCellValue(cellRef, value);
    });

    return this._processCalculations(partialEvalOrder(this.providesTo, valuesByCellRef.keySeq()));
  }

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
    return this.tabsById.valueSeq().flatMap(tab => (
      tab.rows.flatMap((row, rowIdx) => (
        row.map((cell, colIdx) => CellRef.of(tab, rowIdx, colIdx))
      ))
    )).toSet();
  }

  /**
   * Returns the sheety-model Cell for the given cell ref.
   **/
  _getCell(cellRef) {
    const tab = this.tabsById.get(cellRef.get('tabId'));
    return tab && tab.getCellByRef(cellRef);
  }

  /**
   * Calculates the value of the cell at the given ref.
   **/
  _calculateCellValue(cellRef) {
    const cell = this._getCell(cellRef);

    const formula = cell.get('formula');
    if ( formula ) {
      const formulaValue = this.parser.parse(formula);
      if ( formulaValue.error ) {
        // TODO
        return formulaValue.error;
      }

      return formulaValue.result;
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
    if ( !this.vals.hasIn([tabId, rowIdx]) ) {
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
      const cellRef = CellRef.of(this.tabsById.get(tab), row.index, column.index);
      done(this._calculateCellValue(cellRef));
    });

    parser.on('callRangeValue', (startCellCoord, endCellCoord, tabId, done) => {
      const tab = this.tabsById.get(tabId);
      const startCellRef = CellRef.of(
        tab,
        startCellCoord.row.index,
        startCellCoord.column.index
      );
      const endCellRef = CellRef.of(
        tab,
        endCellCoord.row.index,
        endCellCoord.column.index
      );

      const range = eachCell(startCellRef, endCellRef, this._calculateCellValue.bind(this));
      done(range);
    });

    parser.on('callFunction', (name, params, done) => {
      const func = funcs[name.toUpperCase()];
      if ( !func ) {

      }

      done(func.apply(null, params));
    });

    return parser;
  }
}

function eachCell(start, end, fn) {
  const tab = start.get('tabId');
  const rows = end.get('rowIdx') - start.get('rowIdx');
  const cols = end.get('colIdx') - start.get('colIdx');

  const vals = [];
  for ( let r = 0; r <= rows; ++r ) {
    vals.push([]);
    for ( let c = 0; c <= cols; ++c ) {
      vals[r][c] = fn(start.merge({rowIdx: r, colIdx: c}));
    }
  }

  return vals;
}
