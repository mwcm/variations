import { sequelize } from './models/index.js';
import { rankEfficientTransitions, pickChords } from './variations.js';
import { Chord } from './models/index.js';

async function main() {
  try {
    await sequelize.sync({ force: true }); // This will drop and recreate the tables

    // Seed the database with chord data
    const chordData = {
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

    for (const [chordName, variations] of Object.entries(chordData)) {
      for (let i = 0; i < variations.length; i++) {
        await Chord.create({
          name: `${chordName} v${i+1}`,
          positions: variations[i].positions,
          fingerings: variations[i].fingerings
        });
      }
    }

    const chords = ['A', 'D', 'G'];
    const rankedTransitions = await rankEfficientTransitions(chords);
    console.log('Ranked Transitions:', JSON.stringify(rankedTransitions, null, 2));

    const pickedChords = await pickChords(rankedTransitions);
    console.log('Picked Chords:', JSON.stringify(pickedChords, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

main();

