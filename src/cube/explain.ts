import type { Face, Move } from './model';

const LAYER: Record<Face, string> = {
  U: 'översta lagret',
  D: 'nedersta lagret',
  R: 'högra sidan',
  L: 'vänstra sidan',
  F: 'framsidan',
  B: 'baksidan',
};

/** Vad som händer med bitarna, sett framifrån, vid ett medurs drag. */
const HINT_CW: Record<Face, string> = {
  U: 'framsidans översta rad flyttas åt vänster',
  D: 'framsidans nedersta rad flyttas åt höger',
  R: 'framsidans högra kolumn flyttas uppåt',
  L: 'framsidans vänstra kolumn flyttas nedåt',
  F: 'ovansidans främre rad flyttas åt höger',
  B: 'ovansidans bakre rad flyttas åt vänster',
};
const HINT_CCW: Record<Face, string> = {
  U: 'framsidans översta rad flyttas åt höger',
  D: 'framsidans nedersta rad flyttas åt vänster',
  R: 'framsidans högra kolumn flyttas nedåt',
  L: 'framsidans vänstra kolumn flyttas uppåt',
  F: 'ovansidans främre rad flyttas åt vänster',
  B: 'ovansidans bakre rad flyttas åt höger',
};

export function explainMove(m: Move): { title: string; hint: string } {
  const layer = LAYER[m.face];
  if (m.turns === 2) {
    return {
      title: `Vrid ${layer} ett halvt varv`,
      hint: 'Det spelar ingen roll åt vilket håll.',
    };
  }
  const dir = m.turns === 1 ? 'medurs' : 'moturs';
  return {
    title: `Vrid ${layer} ett kvarts varv ${dir}`,
    hint: `Medurs/moturs räknas som om du tittade rakt på ${layer === 'översta lagret' ? 'ovansidan' : layer === 'nedersta lagret' ? 'undersidan' : layer}. Det betyder att ${m.turns === 1 ? HINT_CW[m.face] : HINT_CCW[m.face]}.`,
  };
}
