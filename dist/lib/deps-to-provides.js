'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = depsToProvides;

var _immutable = require('immutable');

function depsToProvides(deps) {
  return deps.reduce(function (providesTo, providers, requirer) {
    return providers.reduce(function (providesTo, provider) {
      var requirers = providesTo.get(provider) || new _immutable.List();
      return providesTo.set(provider, requirers.push(requirer));
    }, providesTo);
  }, new _immutable.Map());
}
//# sourceMappingURL=deps-to-provides.js.map