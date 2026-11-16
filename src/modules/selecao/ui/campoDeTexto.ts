// True while the player is typing (text field, select or contenteditable): the C and D keys must not fire then.
export const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
