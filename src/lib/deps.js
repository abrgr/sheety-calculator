import { List, Map } from 'immutable';
import { Parser } from 'hot-formula-parser';
import { CellRef, CellRefRange } from 'sheety-model';

/**
 * deps takes a collection of SheetyModel Tab objects and returns
 * a Map from CellRef c to a collection of CellRefs d, where each
 * CellRef c depends on the result of the CellRefs d.
 **/
export default function deps(tabs) {
  const parser = getDependencyParser();

  return tabs.reduce((deps, tab) => (
    tab.get('rows').reduce((deps, row, rowIdx) => (
      row.reduce((deps, cell, colIdx) => (
        cell.get('formula')
          ? deps.set(CellRef.of(tab, rowIdx, colIdx), parser.parse(tab.get('id'), cell.get('formula')))
          : deps
      ), deps)
    ), deps)
  ), new Map());
}

function getDependencyParser() {
  const parser = new Parser();
  let dependentCells = new List();
  let tab = null;
  parser.on('callCellValue', (cellCoord, done) => {
    dependentCells = dependentCells.push(
      new CellRef({
        tabId: cellCoord.tab || tab,
        rowIdx: cellCoord.row.index,
        colIdx: cellCoord.column.index
      })
    );
    done(0); // we don't care about the value
  });
  parser.on('callRangeValue', (startCellCoord, endCellCoord, rangeTab, done) => {
    const range = new CellRefRange({
      start: {
        tabId: rangeTab || tab,
        rowIdx: startCellCoord.row.index,
        colIdx: startCellCoord.column.index
      },
      end: {
        tabId: rangeTab || tab,
        rowIdx: endCellCoord.row.index,
        colIdx: endCellCoord.column.index
      }
    });
    const dependentRows = range.mapCellRefs(cellRef => (
      cellRef.set('tabId', cellRef.get('tabId') || tab)
    ));

    dependentCells = dependentRows.reduce((cells, row) => {
      return cells.concat(new List(row))
    }, dependentCells);

    return [[]];
  });

  const origParse = parser.parse;
  parser.parse = function(_tab, expr) {
    tab = _tab;
    dependentCells = new List();

    origParse.call(this, expr);

    const depCells = dependentCells;
    dependentCells = new List();
    return depCells;
  };

  return parser;
}
