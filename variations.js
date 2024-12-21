import { Op } from 'sequelize';
import { Chord, Transition } from './models/index.js';
import { combinations } from './util.js';

async function compareFingeringsAndHandPos(one, two, fingeringPenalty = -1, handPosPenalty = -1) {
  // Fingering comparison
  const uniqueFingersChordOne = new Set(one.fingerings.filter(x => x !== '-'));
  const uniqueFingersChordTwo = new Set(two.fingerings.filter(x => x !== '-'));
  const differences = new Set([...uniqueFingersChordOne, ...uniqueFingersChordTwo]
    .filter(x => !uniqueFingersChordOne.has(x) || !uniqueFingersChordTwo.has(x)));

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

  return {
    'fingerMovementScore': fingeringPenalties,
    'handMovementScore': handPositionScore,
    'totalScore': fingeringPenalties + handPositionScore
  }
}

export async function rankEfficientTransitions(chords) {
  const allSortedTransitions = {};
  const chordPairs = combinations(chords, 2);

  for (const [chordOneName, chordTwoName] of chordPairs) {
    console.log(`Processing chord pair: ${chordOneName} - ${chordTwoName}`);
    
    const chordOneVariations = await Chord.findAll({
      where: { name: { [Op.like]: `${chordOneName} v%` } },
      order: [['name', 'ASC']]
    });
    const chordTwoVariations = await Chord.findAll({
      where: { name: { [Op.like]: `${chordTwoName} v%` } },
      order: [['name', 'ASC']]
    });

    const transitions = [];

    for (const chordOne of chordOneVariations) {
      for (const chordTwo of chordTwoVariations) {
        const scores = await compareFingeringsAndHandPos(chordOne, chordTwo);
        transitions.push({
          name: `${chordOne.name} ${chordTwo.name}`,
          totalScore: scores['totalScore'],
          handMovementScore: scores['handMovementScore'],
          fingerMovementScore: scores['fingerMovementScore'],
          fromChord: chordOne,
          toChord: chordTwo
        });
      }
    }

    // Sort transitions deterministically
    transitions.sort((a, b) => {
      if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
      return a.name.localeCompare(b.name);
    });

    // Insert all transitions at once
    await Transition.bulkCreate(transitions);
    console.log(`Inserted ${transitions.length} transitions for ${chordOneName} - ${chordTwoName}`);

    allSortedTransitions[`${chordOneName} ${chordTwoName}`] = transitions;
  }
  
  return allSortedTransitions;
}

export async function pickChords(transitions) {
  const chordPool = {};

  for (const transitionName in transitions) {
    const bestTransition = transitions[transitionName][0];
    const chord1 = bestTransition.fromChord;
    const chord2 = bestTransition.toChord;

    const chord1BaseName = chord1.name.split(' ')[0];
    const chord2BaseName = chord2.name.split(' ')[0];

    if (!chordPool[chord1BaseName]) chordPool[chord1BaseName] = [];
    if (!chordPool[chord2BaseName]) chordPool[chord2BaseName] = [];

    chordPool[chord1BaseName].push(chord1);
    chordPool[chord2BaseName].push(chord2);
  }

  const bestVariations = [];

  for (const [chordName1, chordVariations1] of Object.entries(chordPool)) {
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestVariation = null;

    for (const [chordName2, chordVariations2] of Object.entries(chordPool)) {
      if (chordName1 === chordName2) continue;

      for (const chord1 of chordVariations1) {
        for (const chord2 of chordVariations2) {
          const score = await compareFingeringsAndHandPos(chord1, chord2);
          if (score.totalScore > bestScore || (score.totalScore === bestScore && chord1.name < bestVariation.name)) {
            bestScore = score.totalScore;
            bestVariation = chord1;
          }
        }
      }
    }

    if (bestVariation) {
      bestVariations.push(bestVariation);
    }
  }

  // Sort bestVariations deterministically
  bestVariations.sort((a, b) => a.name.localeCompare(b.name));

  return bestVariations;
}

