export function dayToForm(day) {
  return {
    text: day.text || '',
    has_gift: Boolean(day.has_gift),
    gift_number: day.gift_number != null ? String(day.gift_number) : '',
    gift_message: day.gift_message || '',
    image_path: day.image_path || '',
    audio_path: day.audio_path || '',
    background_path: day.background_path || '',
    photo_paths: day.photo_paths || [],
  };
}

export function formToPayload(form) {
  return {
    text: form.text,
    has_gift: form.has_gift,
    gift_number: form.gift_number ? Number(form.gift_number) : null,
    gift_message: form.gift_message?.trim() || null,
    image_path: form.image_path || null,
    audio_path: form.audio_path || null,
    background_path: form.background_path || null,
    photo_paths: form.photo_paths || [],
  };
}

export function formsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function getFileName(path) {
  if (!path) return '';
  return path.split('/').pop();
}

export function emptyDayForm() {
  return {
    text: '',
    has_gift: false,
    gift_number: '',
    gift_message: '',
    image_path: '',
    audio_path: '',
    background_path: '',
    photo_paths: [],
  };
}
