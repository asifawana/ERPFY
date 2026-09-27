type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export function isDocumentFullscreen(doc: Document): boolean {
  const browserDocument = doc as FullscreenDocument;
  return Boolean(
    browserDocument.fullscreenElement ||
    browserDocument.webkitFullscreenElement,
  );
}

export function subscribeFullscreen(doc: Document, onChange: () => void) {
  doc.addEventListener('fullscreenchange', onChange);
  doc.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    doc.removeEventListener('fullscreenchange', onChange);
    doc.removeEventListener('webkitfullscreenchange', onChange);
  };
}

/** Invoke directly from the user's click so transient browser activation is kept. */
export async function toggleDocumentFullscreen(doc: Document): Promise<void> {
  const browserDocument = doc as FullscreenDocument;
  const root = doc.documentElement as FullscreenRoot;

  if (isDocumentFullscreen(doc)) {
    if (typeof browserDocument.exitFullscreen === 'function') {
      await browserDocument.exitFullscreen();
    } else if (typeof browserDocument.webkitExitFullscreen === 'function') {
      await browserDocument.webkitExitFullscreen();
    } else {
      throw new Error('Use Esc to exit fullscreen.');
    }
    return;
  }

  if (typeof root.requestFullscreen === 'function') {
    if (browserDocument.fullscreenEnabled === false) {
      throw new Error(
        'Fullscreen is not allowed in this window. Open ERPFY in a regular browser tab and try again.',
      );
    }
    await root.requestFullscreen();
  } else if (typeof root.webkitRequestFullscreen === 'function') {
    if (browserDocument.webkitFullscreenEnabled === false) {
      throw new Error(
        'Fullscreen is not allowed in this window. Open ERPFY in a regular browser tab and try again.',
      );
    }
    await root.webkitRequestFullscreen();
  } else {
    throw new Error(
      'This browser does not support fullscreen. Open ERPFY in Chrome, Edge, Firefox or Safari on a desktop.',
    );
  }
}
