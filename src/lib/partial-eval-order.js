import { Stack, List } from 'immutable';

export default function partialEvalOrder(providesTo, inputs) {
  let order = inputs;
  let next = new Stack(inputs);
  while ( !next.isEmpty() ) {
    const node = next.peek();
    next = next.shift();
    next = next.unshiftAll(providesTo.get(node) || new List());
    order = order.concat(next);
  }
  return order;
}
