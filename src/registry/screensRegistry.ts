// src/components/screens/registry.ts
import type { AsyncComponentLoader } from 'vue'

/** Generic typing for per-type form components (v-model w/ modelValue). */
type VModelComponent<T> = new () => {
  $props: { modelValue: T }
  $emit: (e: 'update:modelValue', value: T) => void
}

/** Vue async component loader for the form component. */
type FormLoader<T> = AsyncComponentLoader<VModelComponent<T>>

/** Helper to cast dynamic imports to an async component loader Vue understands. */
type ModuleWithDefault<C> = { default: C }

/** Turn an ESM dynamic import of a SFC into a typed AsyncComponentLoader */
const toAsyncLoader = <T>(
  loader: () => Promise<ModuleWithDefault<VModelComponent<T>>>,
): FormLoader<T> => {
  return () => loader().then((m) => m.default)
}

/** A single screen type definition */
export type ScreenDef<T> = {
  type: string
  label: string
  create: (duration?: number) => T
  format: (s: T) => string
  Form: FormLoader<T>
}

/* -----------------------------------------------------------
 * Create functions per screen (defined FIRST to avoid cycles)
 * ---------------------------------------------------------*/

// IMAGE
const createImage = (duration = 10) => ({
  screenType: 'IMAGE' as const,
  durationSeconds: duration,
  image: '', // filename
  imageUploadData: '', // base64 upload
})
type ImageScreen = ReturnType<typeof createImage>

// ANIMATION
const createAnimation = (duration = 10) => ({
  screenType: 'ANIMATION' as const,
  durationSeconds: duration,
  frameDelayMs: 100,
  frames: [] as string[], // data URLs / base64 frames (64x32 each)
})
type AnimationScreen = ReturnType<typeof createAnimation>

// CRYPTO_TICKER
const createCrypto = (duration = 10) => ({
  screenType: 'CRYPTO_TICKER' as const,
  durationSeconds: duration,
  config: { symbol: 'bitcoin', currency: 'EURO' },
})
type CryptoTickerScreen = ReturnType<typeof createCrypto>

// WEATHER_FORECAST
const createWeather = (duration = 10) => ({
  screenType: 'WEATHER_FORECAST' as const,
  durationSeconds: duration,
  latLon: { lat: 0, lon: 0 },
})
type WeatherForecastScreen = ReturnType<typeof createWeather>

// SOCCER_MATCH
const createSoccer = (duration = 10) => ({
  screenType: 'SOCCER_MATCH' as const,
  durationSeconds: duration,
  competitionId: '',
  teamId: '',
})
type SoccerMatchScreen = ReturnType<typeof createSoccer>

// CLOCK
const createClock = (duration = 10) => ({
  screenType: 'CLOCK' as const,
  durationSeconds: duration,
  timezone: 'UTC',
  format24hr: true,
  color: '#FFFFFF',
})
type ClockScreen = ReturnType<typeof createClock>

// DATE
const createDate = (duration = 10) => ({
  screenType: 'DATE' as const,
  durationSeconds: duration,
  timezone: 'UTC',
  color: '#FFFFFF',
})
type DateScreen = ReturnType<typeof createDate>

// -----------------------------------------------------------
// FORMULA1
// -----------------------------------------------------------
const createFormula1 = (duration = 10) => ({
  screenType: 'FORMULA1' as const,
  durationSeconds: duration,
  detailsType: 'CALENDAR' as const,
  timezone: 'UTC',
})
type Formula1Screen = ReturnType<typeof createFormula1>

/* -----------------------------------------
 * Per-entry defs (no self-references here)
 * ---------------------------------------*/

const IMAGE_DEF: ScreenDef<ImageScreen> = {
  type: 'IMAGE',
  label: 'Image',
  create: createImage,
  format: (s) => (s.image ? `image: ${s.image} (${s.imageUploadData.length} chars)` : 'image: —'),
  Form: toAsyncLoader<ImageScreen>(() => import('@/components/screens/ImageForm.vue')),
}

const ANIMATION_DEF: ScreenDef<AnimationScreen> = {
  type: 'ANIMATION',
  label: 'Animation',
  create: createAnimation,
  format: (s) =>
    s.frames?.length
      ? `animation: ${s.frames.length} frames • ${s.frameDelayMs}ms`
      : 'animation: —',
  Form: toAsyncLoader<AnimationScreen>(() => import('@/components/screens/AnimationForm.vue')),
}

const CRYPTO_DEF: ScreenDef<CryptoTickerScreen> = {
  type: 'CRYPTO_TICKER',
  label: 'Crypto Ticker',
  create: createCrypto,
  format: (s) => `crypto: ${s.config?.symbol ?? '?'} / ${s.config?.currency ?? '?'}`,
  Form: toAsyncLoader<CryptoTickerScreen>(
    () => import('@/components/screens/CryptoTickerForm.vue'),
  ),
}

const WEATHER_DEF: ScreenDef<WeatherForecastScreen> = {
  type: 'WEATHER_FORECAST',
  label: 'Weather Forecast',
  create: createWeather,
  format: (s) => (s.latLon ? `forecast @ ${s.latLon.lat}, ${s.latLon.lon}` : 'forecast @ —'),
  Form: toAsyncLoader<WeatherForecastScreen>(
    () => import('@/components/screens/WeatherForecastForm.vue'),
  ),
}

const SOCCER_DEF: ScreenDef<SoccerMatchScreen> = {
  type: 'SOCCER_MATCH',
  label: 'Soccer Match',
  create: createSoccer,
  format: (s) => `soccerMatch: ${s.competitionId} / ${s.teamId}`,
  Form: toAsyncLoader<SoccerMatchScreen>(() => import('@/components/screens/SoccerMatchForm.vue')),
}

const CLOCK_DEF: ScreenDef<ClockScreen> = {
  type: 'CLOCK',
  label: 'Clock',
  create: createClock,
  format: (s) => `clock: ${s.timezone} • ${s.format24hr ? '24h' : '12h'} • ${s.color}`,
  Form: toAsyncLoader<ClockScreen>(() => import('@/components/screens/ClockForm.vue')),
}

const DATE_DEF: ScreenDef<DateScreen> = {
  type: 'DATE',
  label: 'Date',
  create: createDate,
  format: (s) => `date: ${s.timezone} • ${s.color}`,
  Form: toAsyncLoader<DateScreen>(() => import('@/components/screens/DateForm.vue')),
}

const FORMULA1_DEF: ScreenDef<Formula1Screen> = {
  type: 'FORMULA1',
  label: 'Formula 1',
  create: createFormula1,
  format: (s) => `F1: date: ${s.timezone} • ${s.detailsType}`,
  Form: toAsyncLoader<Formula1Screen>(() => import('@/components/screens/Formula1Form.vue')),
}

/* -----------------------------------------
 * The registry (no self-reference in entries)
 * ---------------------------------------*/

export const screenRegistry = {
  IMAGE: IMAGE_DEF,
  ANIMATION: ANIMATION_DEF,
  CRYPTO_TICKER: CRYPTO_DEF,
  WEATHER_FORECAST: WEATHER_DEF,
  SOCCER_MATCH: SOCCER_DEF,
  CLOCK: CLOCK_DEF,
  DATE: DATE_DEF,
  FORMULA1: FORMULA1_DEF,
} as const

/* -------------------------
 * Derived, auto-updating types
 * -----------------------*/

type Registry = typeof screenRegistry

/** 'IMAGE' | 'CRYPTO_TICKER' | ... */
export type ScreenType = keyof Registry

/** Union of all screen payloads */
export type AnyScreen = ReturnType<Registry[keyof Registry]['create']>

/** Alias if you use KnownScreen elsewhere */
export type KnownScreen = AnyScreen

/* -------------------------
 * Helpers
 * -----------------------*/

export function getDef<T extends ScreenType>(t: T): Registry[T] {
  return screenRegistry[t]
}

export const screenTypes = Object.keys(screenRegistry) as ScreenType[]

export function formatFromRegistry(s: AnyScreen): string {
  const def = screenRegistry[s.screenType]
  return (def.format as (x: AnyScreen) => string)(s)
}
