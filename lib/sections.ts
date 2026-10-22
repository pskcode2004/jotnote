import type { Block } from './blocks';

/** Where a new block goes: after a heading's section, above all headings, or at the very end. */
export type AddTarget = 'end' | string | null;

/**
 * Index at which to insert a new block. A section is a heading plus the blocks after it
 * up to the next heading. `null` means "not under any heading": the end of the unsectioned
 * area above the first heading (or the end of the note when there are no headings).
 */
export function insertIndex(blocks: Block[], target: AddTarget): number {
  if (target === 'end') return blocks.length;
  if (target === null) {
    const first = blocks.findIndex((b) => b.type === 'heading');
    return first === -1 ? blocks.length : first;
  }
  const start = blocks.findIndex((b) => b.id === target);
  if (start === -1) return blocks.length;
  let j = start + 1;
  while (j < blocks.length && blocks[j].type !== 'heading') j++;
  return j;
}

/** Accent color of each block: the color of the heading its section starts with. */
export function accents(blocks: Block[]): (string | null)[] {
  let current: string | null = null;
  return blocks.map((b) => {
    if (b.type === 'heading') current = b.color;
    return current;
  });
}
