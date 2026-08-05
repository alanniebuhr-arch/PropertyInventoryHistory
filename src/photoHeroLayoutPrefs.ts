/** Session-only photo hero layout (1-up vs 4-up), shared across PhotoSections. */

export type PhotoHeroLayout = '1' | '4';

let layout: PhotoHeroLayout = '1';

export function getPhotoHeroLayout(): PhotoHeroLayout {
  return layout;
}

export function setPhotoHeroLayout(next: PhotoHeroLayout): PhotoHeroLayout {
  layout = next;
  return layout;
}

export function togglePhotoHeroLayout(): PhotoHeroLayout {
  layout = layout === '1' ? '4' : '1';
  return layout;
}
