import assert from 'assert';
import deps from '../../dist/lib/deps';
import { List, Range, is } from 'immutable';
import { Tab, Cell, CellRef } from 'sheety-model';

describe('Deps', () => {
  it('should work', () => {
    const tabs = Range(0, 4).map((t) => tabFactory(`${t}`, 4, 4)).toList();
    const theDeps = deps(tabs);
    const normalDeps = theDeps.get(new CellRef({ tabId: '1', rowIdx: 3, colIdx: 3}));
    assert.equal(theDeps.size, 4 * 4 * 4 - 2 * 4); // 4 4x4 tabs with 2 cells in each tab without deps
    assert.equal(normalDeps.size, 2);
    assert.ok(normalDeps.includes(new CellRef({ tabId: '1', rowIdx: 0, colIdx: 0 })));
    assert.ok(normalDeps.includes(new CellRef({ tabId: '1', rowIdx: 1, colIdx: 1 })));
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
                 : 'A1+B2'
        })
      )).toList()
    )).toList()
  });
}
