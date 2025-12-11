import { AudioAlignerDTO, AudioToVisemeResponse, Compositions } from "../../config/types";

export const compositionShouldAlignVisemes: Record<Compositions, boolean> = {
  DebateLandscape: false,
  DebatePortrait: false,
  Landscape: true,
  Portrait: true,
};  

export const Phone2Viseme: Record<string, string> = {
  'k': 'B',
  'a': 'A',
  'ɾ': 'E',
  'ɐ': 'A',
  't': 'B',
  'o': 'E',
  'd': 'B',
  'u': 'D',
  'm': 'X',
  'ũ': 'D',
  'f': 'F',
  'l': 'C',
  'ɐ̃': 'A',
  'c': 'B',
  'i': 'A',
  'ɛ': 'B',
  'j': 'B',
  's': 'B',
  'e': 'B',
  'w': 'E',
  'ĩ': 'A',
  'n': 'B',
  'w̃': 'E',
  'ẽ': 'B',
  'dʒ': 'B',
  'p': 'X',
  'õ': 'E',
  'ɟ': 'B',
  'ʎ': 'C',
  'x': 'B',
  'ɔ': 'E',
  'ʒ': 'B',
  'v': 'F',
  'b': 'X',
  'z': 'B',
  'j̃': 'B',
  'tʃ': 'B',
  'ɡ': 'B',
  'ʃ': 'B',
  'ɲ': 'B',
  'silence': 'X'
}


export interface VisemeAlignerClient {
    alignViseme(input: AudioAlignerDTO): Promise<AudioToVisemeResponse>;
}