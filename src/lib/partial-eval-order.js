import { Stack, List, Set } from 'immutable';

export default function partialEvalOrder(providesTo, inputs) {
  let order = new List(inputs);
  let next = new Stack(inputs);
  let inOrder = new Set(inputs);
  while ( !next.isEmpty() ) {
    const node = next.peek();
    next = next.shift();
    const toAdd = providesTo.get(node, new List())
                            .filterNot(inOrder.has.bind(inOrder));
    inOrder = inOrder.union(toAdd);
    next = next.unshiftAll(toAdd);
    order = order.concat(toAdd);
  }
  return order;
}
