import { ERROR_NOT_AVAILABLE } from 'hot-formula-parser';

// For reference: https://github.com/FormulaPages/vlookup
export function VLOOKUP(needle, table, index, exactmatch) {             
  if ( needle instanceof Error || needle === null ) {
    return needle;
  }

  index = index || 0;
  exactmatch = exactmatch || false;
  for ( let i = 0; i < table.length; i++ ) {
      const row = table[i];
      const v = row[0];
      const isExact = exactmatch && v === needle;
      const isApprox = v === needle
                     || (typeof v === "string"
                        && v.toLowerCase().indexOf(needle.toLowerCase()) != -1);
      if ( isExact || isApprox ) {
          return index < (row.length + 1)
               ? row[index-1]
               : v;
      }
  }

  return new Error(ERROR_NOT_AVAILABLE);
}
