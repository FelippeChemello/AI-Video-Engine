import fs from 'fs'
import path from 'path'
import { Google } from './clients/google'

const g = new Google()

await g.searchImage('sincretismo orixás santos católicos Ogum São Jorge Iemanjá Nossa Senhora')