# ⛩️ Torii — Aprende japonés

App web (PWA) gratuita para aprender japonés de cero a N3+, instalable en el iPhone. Sin servidores, sin suscripciones: todo el curso está pre-generado con IA y el repaso lo gestiona el algoritmo FSRS (el de Anki moderno).

**App:** https://novoxito.github.io/torii/

## Qué incluye

- **Kana**: 208 hiragana/katakana con mnemotecnias visuales en español
- **Kanji**: ~640 kanji (N5+N4+N3) con lecturas, mnemotecnias, palabras de ejemplo, animación de trazos (KanjiVG) y práctica de escritura con el dedo
- **Vocabulario**: ~2.000 palabras (N5+N4+N3) con frase de ejemplo natural
- **Gramática**: ~150 lecciones en español con ejemplos y mini test
- **Lecturas graduadas**: 15 historias originales por nivel con furigana y traducción frase a frase
- **Repaso espaciado FSRS**: cada sesión te pregunta justo lo que estás a punto de olvidar
- **Audio**: voz japonesa del propio dispositivo (gratis, offline)
- **Tutor IA** (opcional): pega tu API key de Google Gemini (gratuita) o Anthropic Claude en Ajustes y tendrás conversación, correcciones y explicaciones a demanda

## Instalar en iPhone

1. Abre la URL en Safari
2. Compartir → **Añadir a pantalla de inicio**
3. Ya funciona como app, incluso offline

## Desarrollo

```bash
npm install
npm run dev        # servidor local
node scripts/merge-content.mjs   # fusiona/valida los JSON de contenido (part files)
npm run build
```

El deploy a GitHub Pages es automático al hacer push a `main` (GitHub Actions).

## Privacidad

Todo el progreso vive en `localStorage` de tu dispositivo (exportable/importable desde Ajustes). Las API keys solo se guardan en tu dispositivo y solo se envían al proveedor elegido.

---

Curso generado con Claude Fable 5 · Datos de trazos: [KanjiVG](https://kanjivg.tagaini.net/) (CC BY-SA 3.0)
