import assert from 'assert';
import Calculator from '../../dist/lib/calculator';
import { Map, List, Range, is } from 'immutable';
import { Tab, Cell, CellRef } from 'sheety-model';

describe('Calculator', () => {
  describe('calculateAll', () => {
    it('should work', () => {
      const tabs = Range(0, 3).map((t) => tabFactory(`tab${t}`, 4, 4)).toList();
      const calc = new Calculator(tabs);
      assert.equal(calc.vals.getIn(['tab0', 0, 0]), 10);
      assert.equal(calc.vals.getIn(['tab0', 1, 0]), 20);
    });
  });

  describe('setValues', () => {
    it('should work', () => {
      const tabs = Range(0, 3).map((t) => editableTabFactory(`tab${t}`, 4, 4)).toList();
      const calc = new Calculator(tabs);
      const vals = calc.setValues(new Map([
        [CellRef.of(tabs.get(0), 0, 0), 15],
        [CellRef.of(tabs.get(0), 1, 1), 10]]
      ));
      assert.equal(vals.getIn(['tab0', 0, 0]), 15);
      assert.equal(vals.getIn(['tab0', 1, 1]), 10);
      assert.equal(vals.getIn(['tab0', 1, 0]), 25);
      assert.equal(vals.getIn(['tab0', 3, 3]), 25);
    });
  });
});

function tabFactory(t, rows, cols) {
  return new Tab({
    id: t,
    rows: Range(0, rows).map((r) => (
      Range(0, cols).map((c) => (
        new Cell({
          ref: new CellRef({ tabId: t, rowIdx: r, colIdx: c }),
          formula: (r === 0 && c === 0) || (r === 1 && c === 1)
                 ? null
                 : `${t}!A1+${t}!B2`,
          staticValue: (r === 0 && c === 0) || (r === 1 && c === 1)
                     ? 10
                     : null
        })
      )).toList()
    )).toList()
  });
}

function editableTabFactory(t, rows, cols) {
  return new Tab({
    id: t,
    rows: Range(0, rows).map((r) => (
      Range(0, cols).map((c) => (
        new Cell({
          ref: new CellRef({ tabId: t, rowIdx: r, colIdx: c }),
          formula: (r === 0 && c === 0) || (r === 1 && c === 1)
                 ? null
                 : `${t}!A1+${t}!B2`,
          isUserEditable: (r === 0 && c === 0) || (r === 1 && c === 1)
        })
      )).toList()
    )).toList()
  });
}
