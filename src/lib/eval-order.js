import { CellRef } from 'sheety-model';
import { List } from 'immutable';
import toposort from 'toposort';

/**
 * evalOrder takes a Map from CellRef to a collection of CellRefs (like
 * that returned by deps) and a Set of all CellRefs and returns
 * an ordered List of the cells to evaluate, first to last.
 **/
export default function evalOrder(cellDeps, all) {
  const happensBefores = cellDeps.entrySeq().flatMap(([after, befores]) => (
    befores.map((before) => [before.toA1Ref(), after.toA1Ref()])
  )).toJS();

  return new List(
    toposort.array(
      all.map((i) => i.toA1Ref()).toJS(),
      happensBefores
    )
  ).map(CellRef.fromA1Ref);
}
