"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VLOOKUP = VLOOKUP;

var _hotFormulaParser = require("hot-formula-parser");

// For reference: https://github.com/FormulaPages/vlookup
function VLOOKUP(needle, table, index, exactmatch) {
  if (needle instanceof Error || needle === null) {
    return needle;
  }

  index = index || 0;
  exactmatch = exactmatch || false;
  for (var i = 0; i < table.length; i++) {
    var row = table[i];
    var v = row[0];
    var isExact = exactmatch && v === needle;
    var isApprox = v === needle || typeof v === "string" && v.toLowerCase().indexOf(needle.toLowerCase()) != -1;
    if (isExact || isApprox) {
      return index < row.length + 1 ? row[index - 1] : v;
    }
  }

  return new Error(_hotFormulaParser.ERROR_NOT_AVAILABLE);
}
//# sourceMappingURL=sheet-funcs.js.map