//
//const express = require('express')
//
//const app = express()
//const port = process.env.PORT || 3000;
//
//
//app.get("/", (req, res) => {
//	res.send('hello')
//})
//
//
//app.listen(port, () => {
//	console.log('listening on 3k')
//})

import fs from 'fs/promises'
import { sequelize } from './models/index.js';
import { rankEfficientTransitions, pickChords } from './variations.js';
import { Chord } from './models/index.js';

async function main() {
  try {

    // Seed the database with chord data
    const jsonData = await fs.readFile('./chords.json', 'utf8')
    const chordData =JSON.parse(jsonData)

    await sequelize.sync({
			force: true,
			dialect: 'postgres'
		}); // This will drop and recreate the tables

    const batchSize = 100
    for (const [chordName, variations] of Object.entries(chordData)) {
      const chordBatch = [];
      for (let i = 0; i < variations.length; i++) {
        chordBatch.push({
          name: `${chordName} v${i+1}`,
          positions: variations[i].positions,
          fingerings: variations[i].fingerings
        });

        if (chordBatch.length === batchSize || (i === variations.length -  1 && chordBatch.length > 0)){
          await Chord.bulkCreate(chordBatch);
          console.log(`inserted batch for ${chordName}`)
          chordBatch.length = 0
        }
      }
    }

    const chords = ['A', 'D', 'G'];
    const rankedTransitions = await rankEfficientTransitions(chords);

    const pickedChords = await pickChords(rankedTransitions);
    console.log(pickedChords)
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

main();

