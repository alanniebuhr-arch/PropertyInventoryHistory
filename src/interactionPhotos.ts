/** Stable caption marking the reserved blight complaint-form photo slot. */
export const COMPLAINT_FORM_CAPTION = 'complaint_form';

export function isComplaintFormPhoto(photo: { caption?: string }): boolean {
  return photo.caption?.trim() === COMPLAINT_FORM_CAPTION;
}

export function interactionPhotoDisplayLabel(photo: { caption?: string }): string {
  if (isComplaintFormPhoto(photo)) return 'Complaint form';
  return photo.caption?.trim() || 'Photo';
}
