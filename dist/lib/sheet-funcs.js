"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.VLOOKUP = VLOOKUP;
exports.HYPERLINK = HYPERLINK;

var _hotFormulaParser = require("hot-formula-parser");

// For reference: https://github.com/FormulaPages/vlookup
function VLOOKUP(_ref) {
  var _ref2 = _slicedToArray(_ref, 4),
      needle = _ref2[0],
      table = _ref2[1],
      index = _ref2[2],
      exactmatch = _ref2[3];

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

function HYPERLINK(_ref3) {
  var _ref4 = _slicedToArray(_ref3, 2),
      link = _ref4[0],
      value = _ref4[1];

  // we ignore links
  return value;
}
//# sourceMappingURL=sheet-funcs.js.map