// Types of `mesa`: the table's theme and the state the module keeps.
import type { TableTheme } from './domain/tableTheme.ts';

export type { Background, PresetName, TableTheme } from './domain/tableTheme.ts';

/** The active table and the saved ones (what `mesa()` and `useMesa()` give), with the actions that change them. */
export interface TableState {
  theme: TableTheme;
  tables: TableTheme[];
  sessionOnly: boolean;
  colors: { felt: string; wood: string }; // what the table really shows (an imported model's own colours); the kraken's shards use these
  load(): Promise<void>;
  apply(theme: TableTheme): void;        // make this theme active (adding it to the saved ones)
  edit(patch: Partial<Pick<TableTheme, 'background' | 'felt' | 'wood' | 'name'>>): void;
  copy(): void;                          // save the active one as a new table
  remove(id: string): void;
  reset(): void;
  setColors(c: { felt: string; wood: string }): void;
}
