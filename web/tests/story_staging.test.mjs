import assert from 'node:assert/strict';
import { test } from 'node:test';
import { travelParty } from '../src/scene/story_transition/party.ts';
import { canShowScenePerson } from '../src/scene/scene_person/visibility.ts';
import { actorComposition, propComposition } from '../src/scene/story_stage/compositions.ts';
import { dayLayouts } from '../src/scene/story_stage/day_layouts.ts';
import { storyAssets } from '../src/shared/lib/story_assets.ts';

test('同行转场保持第一人称，返程让陆沉留在寺里，回房时停下等候', () => {
  for (const sceneKey of [
    'mini_register',
    'mini_refectory',
    'mini_corridor_candle',
    'mini_room',
    'mini_ending',
  ]) {
    const party = travelParty(sceneKey);
    assert.ok(
      party.every((person) => ['luchen', 'linlan', 'zhouyan', 'xuzhi'].includes(person.id)),
    );
    assert.equal(party.filter((person) => person.id !== 'luchen').length, 3);
    assert.ok(new Set(party.map((person) => person.y)).size > 1);
    assert.ok(new Set(party.map((person) => person.height)).size > 1);
  }
  assert.ok(!travelParty('mini_ending').some((person) => person.id === 'luchen'));
  assert.equal(travelParty('mini_room').find((person) => person.id === 'luchen').waiting, true);
  assert.deepEqual(travelParty('mini_wake_three_gongs'), []);
});

test('主角和未确认声源不能回退成可见的未知立绘，已确认同行者可以显示', () => {
  const actor = { id: 'linlan', portrait: 'linlan', visible: true };
  assert.equal(canShowScenePerson(actor), true);
  for (const id of ['player', 'unknown', 'companion_voice']) {
    assert.equal(canShowScenePerson({ ...actor, id }), false);
  }
  assert.equal(canShowScenePerson({ ...actor, portrait: 'player' }), false);
  assert.equal(canShowScenePerson({ ...actor, visible: false }), false);
});

test('登记和回廊的同伴按远近散开，晚斋的粥和整套素食真实摆在桌上', () => {
  for (const sceneKey of ['mini_register', 'mini_corridor_candle']) {
    const actors = actorComposition({ sceneKey }, {});
    const companions = ['linlan', 'zhouyan', 'xuzhi'].map((id) => actors[id]);
    assert.equal(new Set(companions.map((actor) => actor.y)).size, 3);
    assert.ok(companions.some((actor) => actor.facing === 'left'));
  }
  const props = propComposition({ sceneKey: 'mini_refectory' }, dayLayouts.mini_refectory.props);
  for (const id of [
    'player_bowl',
    'linlan_bowl',
    'zhouyan_bowl',
    'xuzhi_bowl',
    'bread',
    'pickles',
    'bamboo',
    'local_vegetables',
  ]) {
    const prop = props.find((item) => item.id === id);
    assert.ok(prop, id);
    assert.equal(prop.draw, true, id);
    assert.ok(prop.y >= 64 && prop.y <= 76, `${id} should sit on the table`);
    assert.ok(prop.command, id);
  }
  assert.match(props.find((prop) => prop.id === 'bread').name, /馒头/);
});

test('斋堂把陆沉放在饭桌边缘，并保留午后大殿过渡素材', () => {
  assert.equal(dayLayouts.mini_refectory.actors.luchen.x, 89);
  assert.equal(dayLayouts.mini_refectory.actors.luchen.height, 36);
  assert.match(storyAssets.scenes.mainHallAfternoon, /main_hall\/hall_afternoon\.webp$/);
});
