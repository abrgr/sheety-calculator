import assert from 'assert';
import Calculator from '../../dist/lib/calculator';
import { Map, List, Range, is } from 'immutable';
import { Sheet, Tab, Cell, CellRef } from 'sheety-model';

describe('Calculator', () => {
  describe('calculateAll', () => {
    it('should work', () => {
      const tabs = Range(0, 3).map((t) => tabFactory(`tab${t}`, 4, 4)).toList();
      const calc = new Calculator(new Sheet({ tabs }));
      assert.equal(calc.vals.getIn(['tab0', 0, 0]), 10);
      assert.equal(calc.vals.getIn(['tab0', 1, 0]), 20);
    });
  });

  describe('setValues', () => {
    it('should work', () => {
      const tabs = Range(0, 3).map((t) => editableTabFactory(`tab${t}`, 4, 4)).toList();
      const calc = new Calculator(new Sheet({ tabs }));
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

  describe('vlookup', () => {
    it('should work', () => {
      const tabs = List.of(
        new Tab({
          id: 'my-tab',
          rows: List.of(
            List.of(new Cell({ staticValue: "a" }), new Cell({ staticValue: 2 })),
            List.of(new Cell({ staticValue: "b" }), new Cell({ staticValue: 3 })),
            List.of(new Cell({ staticValue: "c" }), new Cell({ staticValue: 4 })),
            List.of(new Cell({ staticValue: "d" }), new Cell({ staticValue: 5 })),
            List.of(new Cell({ staticValue: "e" }), new Cell({ staticValue: 6 }))
          )
        }), new Tab ({
          id: 'tab-2',
          rows: List.of(
            List.of(new Cell({ formula: "VLOOKUP('c', 'my-tab'!A1:B5, 2, FALSE)" }))
          )
        })
      );

      const calc = new Calculator(new Sheet({ tabs }));
      assert.equal(calc.vals.getIn(['tab-2', 0, 0]), 4);
    });
  });

  describe('async functions', () => {
    it('should work', (done) => {
      const tabs = List.of(
        new Tab({
          id: 'my-tab',
          rows: List.of(
            List.of(new Cell({ staticValue: "a" }), new Cell({ staticValue: 2 })),
            List.of(new Cell({ staticValue: "b" }), new Cell({ staticValue: 3 })),
            List.of(new Cell({ staticValue: "c" }), new Cell({ staticValue: 4 })),
            List.of(new Cell({ staticValue: "d" }), new Cell({ staticValue: 5 })),
            List.of(new Cell({ staticValue: "e" }), new Cell({ staticValue: 6 }))
          )
        }), new Tab ({
          id: 'tab-2',
          rows: List.of(
            List.of(new Cell({ formula: "ASYNC_SUM('my-tab'!B1:B5)" })),
            List.of(new Cell({ formula: "A1+4" }))
          )
        })
      );

      const ASYNC_SUM = (vals, cellRef) => {
        process.nextTick(() => {
          const sum = vals.reduce((sum, row) => (
            row.reduce((sum, v) => (
              sum + parseInt(v)
            ), sum)
          ), 0);
          calc.setCachedCellValue(cellRef, sum);

          finalCheck();
        });
        return Calculator.LOADING;
      };

      const calc = new Calculator(new Sheet({ tabs }), { ASYNC_SUM });

      assert.equal(calc.vals.getIn(['tab-2', 0, 0]), Calculator.LOADING);
      const finalCheck = () => {
        assert.equal(calc.vals.getIn(['tab-2', 0, 0]), 20);
        assert.equal(calc.vals.getIn(['tab-2', 1, 0]), 24);
        done();
      };
    });
  });
});

function tabFactory(t, rows, cols) {
  return new Tab({
    id: t,
    rows: Range(0, rows).map((r) => (
      Range(0, cols).map((c) => (
        new Cell({
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
          formula: (r === 0 && c === 0) || (r === 1 && c === 1)
                 ? null
                 : `${t}!A1+${t}!B2`,
          isUserEditable: (r === 0 && c === 0) || (r === 1 && c === 1)
        })
      )).toList()
    )).toList()
  });
}
