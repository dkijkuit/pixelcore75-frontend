<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchCryptoCoins,
  fetchCryptoCurrencies,
  type CryptoCoin,
  type CryptoCurrency,
} from '@/service/metadata'
import type { AnyScreen } from '@/registry/screensRegistry.ts'
type T = Extract<AnyScreen, { screenType: 'CRYPTO_TICKER' }>
const props = defineProps<{ modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()
function updateConfig(patch: Partial<T['config']>) {
  emit('update:modelValue', {
    ...props.modelValue,
    config: { ...props.modelValue.config, ...patch },
  })
}

const coins = ref<CryptoCoin[]>([])
const loadingCoins = ref(false)
const coinsError = ref<string | null>(null)

const currencies = ref<CryptoCurrency[]>([])
const loadingCurrencies = ref(false)
const currenciesError = ref<string | null>(null)

const coinItems = computed(() =>
  coins.value.map((coin) => ({
    title: `${coin.name} (${coin.symbol.toUpperCase()})`,
    value: coin.id,
  })),
)

const currencyItems = computed(() =>
  currencies.value.map((currency) => ({
    title: `${currency.name.replace(/_/g, ' ')} (${currency.symbol})`,
    value: currency.name,
  })),
)

onMounted(async () => {
  loadingCoins.value = true
  loadingCurrencies.value = true
  coinsError.value = null
  currenciesError.value = null

  try {
    const result = await fetchCryptoCoins()
    coins.value = result

    // Prefill an empty symbol with the top coin
    if (!props.modelValue.config?.symbol && result.length > 0) {
      updateConfig({ symbol: result[0].id })
    }
  } catch (e) {
    coinsError.value = e instanceof Error ? e.message : 'Failed to load coins'
  } finally {
    loadingCoins.value = false
  }

  try {
    const result = await fetchCryptoCurrencies()
    currencies.value = result

    // Prefill an empty currency with the first supported one
    if (!props.modelValue.config?.currency && result.length > 0) {
      updateConfig({ currency: result[0].name })
    }
  } catch (e) {
    currenciesError.value = e instanceof Error ? e.message : 'Failed to load currencies'
  } finally {
    loadingCurrencies.value = false
  }
})
</script>

<template>
  <div class="d-flex ga-2">
    <v-autocomplete
      label="Symbol"
      :items="coinItems"
      :model-value="modelValue.config?.symbol"
      class="flex-grow-1"
      clearable
      hide-details="auto"
      :loading="loadingCoins"
      :error="!!coinsError"
      :error-messages="coinsError ?? ''"
      @update:model-value="(v) => updateConfig({ symbol: (v || '').trim() })"
    />

    <v-autocomplete
      label="Currency"
      :items="currencyItems"
      :model-value="modelValue.config?.currency"
      class="flex-grow-1"
      clearable
      hide-details="auto"
      :loading="loadingCurrencies"
      :error="!!currenciesError"
      :error-messages="currenciesError ?? ''"
      @update:model-value="(v) => updateConfig({ currency: (v || '').trim() })"
    />
  </div>
</template>
