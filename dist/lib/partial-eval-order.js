'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = partialEvalOrder;

var _immutable = require('immutable');

function partialEvalOrder(providesTo, globalOrder, inputs) {
  var next = new _immutable.Stack(inputs);
  var toEval = new _immutable.Set(inputs);
  while (!next.isEmpty()) {
    var node = next.peek();
    next = next.shift();
    var toAdd = providesTo.get(node, new _immutable.List()).filterNot(toEval.has.bind(toEval));
    toEval = toEval.union(toAdd);
    next = next.unshiftAll(toAdd);
  }
  return globalOrder.filter(toEval.has.bind(toEval));
}
//# sourceMappingURL=partial-eval-order.js.map