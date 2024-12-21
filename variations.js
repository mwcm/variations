import { sequelize, Chord, Transition } from './models/index.js';
import { combinations } from './util.js'
import { Op } from 'sequelize';

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
    
    const chordOneVariations = await Chord.findAll({ where: { name: { [Op.like]: `${chordOneName} v%` } } });
    const chordTwoVariations = await Chord.findAll({ where: { name: { [Op.like]: `${chordTwoName} v%` } } });

    console.log(chordOneVariations)
    console.log(chordTwoVariations)
     new Error('ass')

    const transitions = [];
    const batchSize = 100;
    let batchCount = 0;

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

        if (transitions.length >= batchSize) {
          await Transition.bulkCreate(transitions);
          batchCount++;
          console.log(`Inserted batch ${batchCount} for ${chordOneName} - ${chordTwoName}`);
          transitions.length = 0;
        }
      }
    }

    // Insert any remaining transitions
    if (transitions.length > 0) {
      await Transition.bulkCreate(transitions);
      batchCount++;
      console.log(`Inserted final batch ${batchCount} for ${chordOneName} - ${chordTwoName}`);
    }

    // Fetch and sort transitions
    const sortedTransitions = await Transition.findAll({
      where: {
        // this search is probably too open, wouldn't G% match all g transitions 
        name: { [Op.like]: `${chordOneName}% ${chordTwoName}%`},
      },
      order: [['totalScore', 'DESC']]
    });

    allSortedTransitions[`${chordOneName} ${chordTwoName}`] = sortedTransitions;
  }

  return allSortedTransitions;
}

export async function pickChords(transitions) {
  const chordPool = {};

  console.log(transitions)
  for (const transitionName in transitions) {
    console.log(transitionName)
    const bestTransition = transitions[transitionName][0];

    console.log(bestTransition)
    const chord1 = bestTransition.dataValues.fromChord
    const chord2 = bestTransition.dataValues.toChord

    const chord1BaseName = bestTransition.dataValues.fromChord.name.split(' ')[0];
    const chord2BaseName = bestTransition.dataValues.toChord.name.split(' ')[0];

    if (!chordPool[chord1BaseName]) {
      chordPool[chord1BaseName] = [chord1];
    } else {
      chordPool[chord1BaseName].push(chord1);
    }

    if (!chordPool[chord2BaseName]) {
      chordPool[chord2BaseName] = [chord2];
    } else {
      chordPool[chord2BaseName].push(chord2);
    }
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
          console.log(score)
          if (score.totalScore > bestScore) {
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

  return bestVariations;
}
