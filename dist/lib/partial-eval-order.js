'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = partialEvalOrder;

var _immutable = require('immutable');

function partialEvalOrder(providesTo, inputs) {
  var order = new _immutable.List(inputs);
  var next = new _immutable.Stack(inputs);
  var inOrder = new _immutable.Set(inputs);
  while (!next.isEmpty()) {
    var node = next.peek();
    next = next.shift();
    var toAdd = providesTo.get(node, new _immutable.List()).filterNot(inOrder.has.bind(inOrder));
    inOrder = inOrder.union(toAdd);
    next = next.unshiftAll(toAdd);
    order = order.concat(toAdd);
  }
  return order;
}
//# sourceMappingURL=partial-eval-order.js.map