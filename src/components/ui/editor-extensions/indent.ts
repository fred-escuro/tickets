import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

const MAX_INDENT = 8;
const STEP_PX = 24; // 1 indent = 24px

export const Indent = Extension.create({
  name: 'indent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => Number(element.getAttribute('data-indent')) || 0,
            renderHTML: attributes => {
              const indent = Number(attributes.indent) || 0;
              if (!indent) return {};
              return {
                'data-indent': String(indent),
                style: `margin-left: ${indent * STEP_PX}px;`,
              };
            }
          }
        }
      }
    ];
  },

  addCommands() {
    const getBlockInfo = (state: any): { type: 'paragraph' | 'heading' | null; indent: number } => {
      const { $from } = state.selection;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === 'paragraph' || node.type.name === 'heading') {
          return { type: node.type.name, indent: node.attrs.indent || 0 } as any;
        }
      }
      return { type: null, indent: 0 } as any;
    };

    return {
      increaseIndent: () => ({ chain, state }) => {
        // If we're inside a list item, use sinkListItem
        if (chain().sinkListItem('listItem').run()) return true;

        const info = getBlockInfo(state);
        if (!info.type) return false;
        const next = Math.min(MAX_INDENT, (info.indent || 0) + 1);
        return chain().updateAttributes(info.type, { indent: next }).run();
      },
      decreaseIndent: () => ({ chain, state }) => {
        // If we're inside a list item, use liftListItem
        if (chain().liftListItem('listItem').run()) return true;

        const info = getBlockInfo(state);
        if (!info.type) return false;
        const next = Math.max(0, (info.indent || 0) - 1);
        return chain().updateAttributes(info.type, { indent: next }).run();
      }
    };
  }
});


