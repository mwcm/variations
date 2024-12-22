import fs from 'fs/promises'

import express from 'express';
import bodyParser from 'body-parser';
import { sequelize } from './models/index.js';

import { rankEfficientTransitions, pickChords } from './variations.js';
import { Chord } from './models/index.js';

const app = express()
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
app.use(bodyParser.raw())

// Seed the database with chord data
const jsonData = await fs.readFile('./chords.json', 'utf8')
const chordData =JSON.parse(jsonData)

async function insert_chords(chordData) {
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
  return
}

await sequelize.sync({
  force: true,
  dialect: 'postgres'
}).then(() => {
  console.log("db and tables up")
  insert_chords(chordData)
})
.then(() => {
  console.log('chord data inserted')
})
.catch((error) => {
  console.log('error syncing db:', error)
})

app.get("/", (req, res) => {
  res.send('hello')
})

app.post('/variations', async (req, res) => {
    try{
      const chords = req.body
      const rankedTransitions = await rankEfficientTransitions(chords);
      const pickedChords = await pickChords(rankedTransitions);
      res.send(pickedChords)
    } catch (error){
      console.log(error)
    }
})

app.listen(port, () => {
  console.log('listening on 3k')
})
