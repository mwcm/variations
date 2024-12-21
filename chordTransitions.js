class Chord {
  constructor(name, positions, fingerings) {
    this.name = name;
    this.positions = positions;
    this.fingerings = fingerings;
  }

  toString() {
    return this.name;
  }
}

class Transition {
  constructor(name, chord1, chord2, score) {
    this.name = name;
    this.score = score;
    this.chord1 = chord1;
    this.chord2 = chord2;
  }

  toString() {
    return this.name;
  }
}

function compareFingeringsAndHandPos(one, two, fingeringPenalty = -1, handPosPenalty = -1) {
  // Fingering comparison
  const uniqueFingersChordOne = new Set(one.fingerings.filter(x => x !== '-'));
  const uniqueFingersChordTwo = new Set(two.fingerings.filter(x => x !== '-'));
  const differences = new Set([...uniqueFingersChordOne, ...uniqueFingersChordTwo].filter(x => !uniqueFingersChordOne.has(x) || !uniqueFingersChordTwo.has(x)));

  let fingeringPenalties = differences.size * fingeringPenalty;

  const fingers = ['1', '2', '3', '4'];
  for (let i = 0; i < one.fingerings.length; i++) {
    const finger = one.fingerings[i];
    if (fingers.includes(finger) && !differences.has(finger) && finger !== two.fingerings[i]) {
      const newString = two.fingerings.indexOf(finger);
      const stringsTraversed = Math.abs(i - newString);
      fingeringPenalties += stringsTraversed * fingeringPenalty;
      fingers.splice(fingers.indexOf(finger), 1);
    }
  }

  // Hand position comparison
  const chordOnePos = one.positions.filter(a => a !== 'x').map(Number);
  const chordTwoPos = two.positions.filter(a => a !== 'x').map(Number);

  const minFretChordOne = Math.min(...chordOnePos);
  const maxFretChordOne = Math.max(...chordOnePos);
  const minFretChordTwo = Math.min(...chordTwoPos);
  const maxFretChordTwo = Math.max(...chordTwoPos);

  const midpointChordOne = (minFretChordOne + maxFretChordOne) / 2;
  const midpointChordTwo = (minFretChordTwo + maxFretChordTwo) / 2;

  const handPositionDiff = Math.abs(midpointChordOne - midpointChordTwo);
  const handPositionScore = handPositionDiff * handPosPenalty;

  return fingeringPenalties + handPositionScore;
}

function rankEfficientTransitions(chordDb, chords) {
  const allSortedTransitions = {};
  const chordPairs = combinations(chords, 2);

  for (const [chordOne, chordTwo] of chordPairs) {
    const rawChordDataOne = chordDb[chordOne];
    const rawChordDataTwo = chordDb[chordTwo];

    const chordOneVariations = rawChordDataOne.map((chord, i) => 
      new Chord(`${chordOne} v${i+1}`, chord.positions, chord.fingerings)
    );

    const chordTwoVariations = rawChordDataTwo.map((chord, i) => 
      new Chord(`${chordTwo} v${i+1}`, chord.positions, chord.fingerings)
    );

    const p = cartesianProduct(chordOneVariations, chordTwoVariations);

    const transitions = p.map(vpair => {
      const score = compareFingeringsAndHandPos(vpair[0], vpair[1]);
      return new Transition(`${vpair[0]} ${vpair[1]}`, vpair[0], vpair[1], score);
    });

    const sortedTransitions = transitions.sort((a, b) => b.score - a.score);
    allSortedTransitions[`${chordOne} ${chordTwo}`] = sortedTransitions;
  }

  return allSortedTransitions;
}

function pickChords(transitions) {
  const mostEfficientTransitions = [];
  const chordPool = {};

  for (const transitionName in transitions) {
    mostEfficientTransitions.push(transitions[transitionName][0]);
    const chord1BaseName = transitions[transitionName][0].chord1.name.split(' ')[0];
    const chord2BaseName = transitions[transitionName][0].chord2.name.split(' ')[0];

    if (!chordPool[chord1BaseName]) {
      chordPool[chord1BaseName] = [transitions[transitionName][0].chord1];
    } else {
      chordPool[chord1BaseName].push(transitions[transitionName][0].chord1);
    }

    if (!chordPool[chord2BaseName]) {
      chordPool[chord2BaseName] = [transitions[transitionName][0].chord2];
    } else {
      chordPool[chord2BaseName].push(transitions[transitionName][0].chord2);
    }
  }

  const bestVariations = [];

  for (const [chordName1, chordVariations1] of Object.entries(chordPool)) {
    let bestScore = -Infinity;
    let bestVariation = null;

    for (const [chordName2, chordVariations2] of Object.entries(chordPool)) {
      if (chordName1 === chordName2) continue;

      for (const chord1 of chordVariations1) {
        for (const chord2 of chordVariations2) {
          const score = compareFingeringsAndHandPos(chord1, chord2);
          if (score > bestScore) {
            bestScore = score;
            bestVariation = chord1;
          }
        }
      }
    }

    if (bestVariation) {
      bestVariations.push(bestVariation);
    }
  }

  return chordPool;
}

// Helper functions
function combinations(arr, r) {
  if (r > arr.length) return [];
  if (r === 1) return arr.map(el => [el]);
  return arr.reduce((acc, el, i) => {
    const subarr = arr.slice(i + 1);
    const subcombos = combinations(subarr, r - 1);
    const combos = subcombos.map(combo => [el, ...combo]);
    return [...acc, ...combos];
  }, []);
}

function cartesianProduct(...arrays) {
  return arrays.reduce((acc, array) => 
    acc.flatMap(x => array.map(y => [...x, y])),
    [[]]
  );
}

// Example usage
const chordDb = {
  'A': [
    { positions: ['x', '0', '2', '2', '2', '0'], fingerings: ['-', '-', '1', '2', '3', '-'] },
    { positions: ['5', '7', '7', '6', '5', '5'], fingerings: ['1', '3', '4', '2', '1', '1'] }
  ],
  'D': [
    { positions: ['x', 'x', '0', '2', '3', '2'], fingerings: ['-', '-', '-', '1', '3', '2'] },
    { positions: ['5', '5', '7', '7', '7', '5'], fingerings: ['1', '1', '2', '3', '4', '1'] }
  ],
  'G': [
    { positions: ['3', '2', '0', '0', '0', '3'], fingerings: ['2', '1', '-', '-', '-', '3'] },
    { positions: ['3', '2', '0', '0', '3', '3'], fingerings: ['2', '1', '-', '-', '3', '4'] }
  ]
};

const chords = ['A', 'D', 'G'];
const rankedTransitions = rankEfficientTransitions(chordDb, chords);
console.log('Ranked Transitions:', JSON.stringify(rankedTransitions, null, 2));

const pickedChords = pickChords(rankedTransitions);
console.log('Picked Chords:', JSON.stringify(pickedChords, null, 2));