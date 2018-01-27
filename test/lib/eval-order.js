import assert from 'assert';
import evalOrder from '../../dist/lib/eval-order';
import deps from '../../dist/lib/deps';
import { List, Range, is } from 'immutable';
import { Tab, Cell, CellRef } from 'sheety-model';

const dependencyCells = List.of(
  new CellRef({ tabId: '1', rowIdx: 0, colIdx: 0}),
  new CellRef({ tabId: '1', rowIdx: 1, colIdx: 1})
);

describe('EvalOrder', () => {
  it('should work', () => {
    const tabs = Range(0, 4).map((t) => tabFactory(`${t}`, 4, 4)).toList();
    const theDeps = deps(tabs);
    const nonDeps = List.of(
      new CellRef({ tabId: '1', rowIdx: 3, colIdx: 3}),
      new CellRef({ tabId: '2', rowIdx: 1, colIdx: 1})
    );
    const inputs = tabs.flatMap(t =>
      t.get('rows').flatMap((r, rowIdx) => 
        r.map((_, colIdx) => CellRef.of(t, rowIdx, colIdx))
      )
    );

    const order = evalOrder(theDeps, inputs.toSet());

    assert.equal(order.size, inputs.size)
    assert(
      dependencyCells.every((d) => (
        nonDeps.every((n) => (
          d.tabId !== n.tabId || order.indexOf(d) < order.indexOf(n)
        ))
      ))
    );
  });
});

function tabFactory(t, rows, cols) {
  return new Tab({
    id: t,
    rows: Range(0, rows).map((r) => (
      Range(0, cols).map((c) => (
        new Cell({
          ref: new CellRef({ tabId: t, rowIdx: r, colIdx: c }),
          formula: dependencyCells.some((d) => d.get('rowIdx') === r && d.get('colIdx') === c)
                 ? null
                 : 'A1+B2'
        })
      )).toList()
    )).toList()
  });
}
