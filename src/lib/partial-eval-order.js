import { Stack, List, Set } from 'immutable';

export default function partialEvalOrder(providesTo, globalOrder, inputs) {
  let next = new Stack(inputs);
  let toEval = new Set(inputs);
  while ( !next.isEmpty() ) {
    const node = next.peek();
    next = next.shift();
    const toAdd = providesTo.get(node, new List())
                            .filterNot(toEval.has.bind(toEval));
    toEval = toEval.union(toAdd);
    next = next.unshiftAll(toAdd);
  }
  return globalOrder.filter(toEval.has.bind(toEval));
}
