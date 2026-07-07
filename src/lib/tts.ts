let jaVoice: SpeechSynthesisVoice | null = null

function pickVoice(): SpeechSynthesisVoice | null {
  if (jaVoice) return jaVoice
  const voices = window.speechSynthesis?.getVoices() ?? []
  const ja = voices.filter((v) => v.lang.startsWith('ja'))
  // prefer enhanced/premium voices (iOS Kyoko enhanced etc.)
  jaVoice =
    ja.find((v) => /enhanced|premium|siri/i.test(v.name)) ??
    ja.find((v) => /kyoko/i.test(v.name)) ??
    ja[0] ??
    null
  return jaVoice
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    jaVoice = null
    pickVoice()
  }
}

export function speak(text: string, rate = 0.9) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  const v = pickVoice()
  if (v) u.voice = v
  u.rate = rate
  window.speechSynthesis.speak(u)
}

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}
