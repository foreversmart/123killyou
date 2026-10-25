import type { GameState } from '@/shared/types/game';
import { Encounter } from './encounter';
import { MapPanel } from './map_panel';
import { ItemDetails } from './item_details';
import { JournalPanel } from './journal_panel';
import { BagPanel } from './bag_panel';
import { HelpPanel } from './help_panel';
import { SettingsPanel } from './settings_panel';
import { LedgerPanel } from './ledger_panel';
import { StoryMap } from './story_map';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function Overlays({ state }: { state: GameState }) {
  if (state.caught || state.paused) return <Encounter caught={state.caught} />;
  if (!state.overlay) return null;
  const item = state.inventory.find((item) => item.id === state.focusItem);
  const panels = {
    map: state.sceneKey ? <StoryMap state={state} /> : <MapPanel room={state.room} />,
    ledger: <LedgerPanel />,
    item: item ? <ItemDetails item={item} /> : null,
    journal: <JournalPanel state={state} />,
    inventory: <BagPanel state={state} />,
    help: <HelpPanel />,
    settings: <SettingsPanel />,
  };
  return (
    <div className={cx(styles['scene-overlay'], styles['information-overlay'])} key={state.overlay}>
      {panels[state.overlay]}
    </div>
  );
}
