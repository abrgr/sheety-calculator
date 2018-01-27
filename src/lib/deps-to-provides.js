import { Map, List } from 'immutable';

export default function depsToProvides(deps) {
  return deps.reduce((providesTo, providers, requirer) => (
    providers.reduce((providesTo, provider) => {
      const requirers = providesTo.get(provider) || new List();
      return providesTo.set(provider, requirers.push(requirer));
    }, providesTo)
  ), new Map());
}
