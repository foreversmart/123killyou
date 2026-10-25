import type { CSSProperties } from 'react';
import type { SceneActor } from '@/shared/types/game';
import type { ActorPlacement } from '@/scene/story_stage/types';
import { CharacterAvatar } from '@/shared/ui/character_avatar';
import { storyAssets } from '@/shared/lib/story_assets';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';
import { BackFigure } from './back_figure';
import { canShowScenePerson } from './visibility';

export function ScenePerson({
  actor,
  placement,
  speaking,
  pose,
  sceneKey,
  flags = {},
}: {
  actor: SceneActor;
  placement: ActorPlacement;
  speaking: boolean;
  pose?: string;
  sceneKey?: string;
  flags?: Record<string, boolean>;
}) {
  if (!canShowScenePerson(actor)) return null;
  const id = actor.portrait || actor.id;
  const disguised = actor.id.includes('double');
  const calm = disguised && pose === 'double_calm';
  const assetCharacter =
    actor.id === 'evil'
      ? storyAssets.props.intrusionShadow
      : getCharacterAsset(actor, sceneKey, pose, flags);
  const useAssetCharacter = Boolean(assetCharacter);
  const motion = characterMotion(actor, sceneKey, pose);
  return (
    <div
      className={cx(styles.person, speaking && styles.speaking)}
      data-actor={actor.id}
      data-motion={motion}
      data-concealed={actor.position.includes('帘后')}
      data-stone={actor.id === 'shangong' && pose === 'oracle_stone'}
      data-calm={calm}
      aria-label={`${actor.name}，${actor.position}，${actor.status}${speaking ? '，正在说话' : ''}`}
      style={
        {
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          '--height': `${placement.height || 32}%`,
          '--facing': placement.facing === 'left' ? -1 : 1,
        } as CSSProperties
      }
    >
      <div className={styles.body}>
        {useAssetCharacter ? (
          <img className={styles.assetCharacter} src={assetCharacter} alt="" aria-hidden="true" />
        ) : actor.id === 'evil' ? (
          <CharacterAvatar id="unknown" name={actor.name} eerie />
        ) : actor.id === 'huipu' && pose?.startsWith('listen_') ? (
          <BackFigure />
        ) : (
          <CharacterAvatar
            id={id === 'luchen' ? 'keeper' : id}
            name={actor.name}
            eerie={disguised || (actor.id === 'huipu' && actor.status.includes('剥'))}
          />
        )}
      </div>
      <div className={styles.label}>
        <b>
          {actor.name}
          {speaking && <i aria-label="声源"> ···</i>}
        </b>
        <span>{actor.position}</span>
      </div>
    </div>
  );
}

type CharacterMotion = 'idle' | 'walk' | 'run' | 'write' | 'eat' | 'turn';

/** Keep the full-body staging alive while preserving the authored pose. */
function characterMotion(actor: SceneActor, sceneKey?: string, shotKey?: string): CharacterMotion {
  if (sceneKey === 'mini_refectory' && actor.id !== 'huipu') return 'eat';
  if (sceneKey === 'mini_register' && shotKey === 'register_desk' && actor.id === 'luchen')
    return 'write';
  if (sceneKey === 'mini_corridor_candle' && actor.id === 'luchen') return 'walk';
  if (sceneKey === 'mini_dawn' && ['dawn_axis', 'dawn_courtyard'].includes(shotKey || ''))
    return 'walk';
  if (sceneKey === 'mini_death' && ['evil', 'skin_double'].includes(actor.id)) return 'run';
  if (sceneKey === 'mini_listen' && actor.id === 'huipu' && shotKey === 'listen_vase')
    return 'turn';
  return 'idle';
}

function getCharacterAsset(
  actor: SceneActor,
  sceneKey?: string,
  shotKey?: string,
  flags: Record<string, boolean> = {},
): string | undefined {
  const id = actor.portrait in storyAssets.characterPoses ? actor.portrait : actor.id;
  const poses = storyAssets.characterPoses[id as keyof typeof storyAssets.characterPoses];
  if (!poses) return undefined;
  const poseMap = poses as Record<string, string>;
  if (actor.id === 'skin_double')
    return shotKey === 'double_frenzy' || shotKey === 'double_exit'
      ? poseMap.doubleScratching
      : poseMap.standing;
  if (id === 'huipu') {
    if (sceneKey === 'mini_listen')
      return flags.vase_broken || shotKey === 'listen_vase'
        ? poseMap.turningHollow
        : poseMap.rearHollow;
    if (sceneKey === 'mini_refectory') return poseMap.curtain;
    return poseMap.standing;
  }
  if (id === 'shangong') {
    if (flags.cup_failed || shotKey === 'oracle_stone') return poseMap.stone;
    if (flags.cup_jiao_rescue || shotKey === 'oracle_rescue') return poseMap.standing;
    if (shotKey === 'oracle_cast' || shotKey === 'oracle_rules') return poseMap.jiaobei;
    return poseMap.seated;
  }
  if (id === 'luchen') {
    if (sceneKey === 'mini_register') return poseMap.reception;
    if (sceneKey === 'mini_corridor_candle')
      return shotKey === 'corridor_warning' || shotKey === 'corridor_two_gongs'
        ? poseMap.hush
        : poseMap.lantern;
    return poseMap.reception;
  }
  if (sceneKey === 'mini_refectory') return poseMap.seatedDining;
  if (sceneKey === 'mini_dawn' && shotKey === 'dawn_gate' && poseMap.capRemoved)
    return poseMap.capRemoved;
  // Expression portraits belong in the dialogue panel, not in full-body staging.
  return poseMap.standing;
}
