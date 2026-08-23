// Detects Urdu/Arabic-script text so we can render it right-to-left with the
// correct font, automatically - no manual toggling needed per text block.
const RTL_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F]/

export function isRtlText(text) {
  if (!text) return false
  return RTL_SCRIPT_RE.test(text)
}

// Spread onto any element wrapping user- or AI-generated text so it renders
// correctly regardless of language: `<p {...textProps(str)}>{str}</p>`
export function textProps(text) {
  const rtl = isRtlText(text)
  return {
    dir: rtl ? 'rtl' : 'ltr',
    className: rtl ? 'font-urdu leading-[2.1] text-right' : '',
  }
}
