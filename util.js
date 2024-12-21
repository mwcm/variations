// Combinations function
export function combinations(arr, r) {
  if (r > arr.length) return [];
  if (r === 1) return arr.map(el => [el]);
  
  return arr.reduce((acc, item, i) => {
    const subarrCombos = combinations(arr.slice(i + 1), r - 1);
    const combos = subarrCombos.map(subCombo => [item, ...subCombo]);
    return [...acc, ...combos];
  }, []);
}

