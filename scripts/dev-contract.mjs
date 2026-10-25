export function hasOpeningContract(health) {
  return health?.story === 'mini_script' && health?.openingContract === 'mini_arrival_v1';
}

export function isOpeningState(state) {
  return (
    !state?.id &&
    state?.storyMode === true &&
    state?.sceneKey === 'mini_arrival' &&
    state?.room === 'gate' &&
    state?.dialogue?.speaker === '旁白'
  );
}
