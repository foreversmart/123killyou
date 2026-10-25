export type CupFace = 'flat' | 'curved';

export function oracleFaces(flags: Record<string, boolean>): [CupFace, CupFace] | null {
  if (flags.cup_roll_sacred || flags.cup_jiao_rescue) return ['flat', 'curved'];
  if (flags.cup_roll_laugh) return ['flat', 'flat'];
  if (flags.cup_roll_dark) return ['curved', 'curved'];
  return null;
}
