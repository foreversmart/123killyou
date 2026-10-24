import type { GameState } from '@/shared/types/game';
import { Encounter } from './encounter';
import { MapPanel } from './map_panel';
import { ItemDetails } from './item_details';
import { JournalPanel } from './journal_panel';
import { BagPanel } from './bag_panel';
import { HelpPanel } from './help_panel';
import { SettingsPanel } from './settings_panel';
import { LedgerPanel } from './ledger_panel';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function Overlays({ state, soundOn }: { state: GameState; soundOn: boolean }) {
  if (state.caught || state.paused) return <Encounter caught={state.caught} />;
  if (!state.overlay) return null;
  const item = state.inventory.find((item) => item.id === state.focusItem);
  const panels = {
    map: <MapPanel room={state.room} />,
    ledger: <LedgerPanel />,
    item: item ? <ItemDetails item={item} /> : null,
    journal: <JournalPanel state={state} />,
    inventory: <BagPanel state={state} />,
    help: <HelpPanel />,
    settings: <SettingsPanel soundOn={soundOn} />,
  };
  return (
    <div className={cx(styles['scene-overlay'], styles['information-overlay'])} key={state.overlay}>
      {panels[state.overlay]}
    </div>
  );
}
