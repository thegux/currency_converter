<template>
  <div class="page">
    <div class="card">
      <h2>Conversor de Moedas</h2>

      <form @submit.prevent="convertNow" class="form">
        <label class="label" for="valor">Valor</label>
        <input
          id="valor"
          type="number"
          step="0.01"
          min="0"
          v-model.number="valor"
          placeholder="0,00"
          class="input"
          required
        />

        <label class="label" for="de">De</label>
        <select
          id="de"
          v-model="moedaDe"
          class="select"
          @change="updateRate"
          :disabled="currenciesLoading || currencies.length === 0"
          required
        >
          <option value="" disabled selected>Selecione a moeda de origem</option>
          <option v-for="c in currencies" :key="c.code" :value="c.code">
            {{ c.code }} - {{ c.name }}
          </option>
        </select>

        <label class="label" for="para">Para</label>
        <select
          id="para"
          v-model="moedaPara"
          class="select"
          @change="updateRate"
          :disabled="currenciesLoading || currencies.length === 0"
          required
        >
          <option value="" disabled selected>Selecione a moeda de destino</option>
          <option v-for="c in currencies" :key="c.code + '-to'" :value="c.code">
            {{ c.code }} - {{ c.name }}
          </option>
        </select>

        <div class="results" v-if="showResults">
          <div class="row">
            <span>{{ formatMoney(1, moedaDe) }}</span>
            <span class="dots"></span>
            <span>{{ taxaDisplay }}</span>
          </div>

          <div class="row" v-if="valor">
            <span>{{ formatMoney(valor, moedaDe) }}</span>
            <span class="dots"></span>
            <span class="highlight">{{ convertedDisplay }}</span>
          </div>
        </div>

        <button
          type="submit"
          class="btn"
          :disabled="loading || !canConvert"
        >
          {{ loading ? 'convertendo...' : 'converter' }}
        </button>

        <button type="button" class="logout text-btn" @click="logout">
          Sair
        </button>

        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const BASE = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '')

function getToken() {
  return localStorage.getItem('idToken') || ''
}

async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {})
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...options, headers })
}

function logout() {
  localStorage.removeItem('idToken')
  localStorage.removeItem('refreshToken')
  router.push('/login')
}

const currencies = ref([])
const currenciesLoading = ref(false)
const valor = ref(null)
const moedaDe = ref('')
const moedaPara = ref('')

const taxa = ref(null)
const convertido = ref(null)
const loading = ref(false)
const error = ref('')

const canConvert = computed(() => {
  return Boolean(valor?.value >= 0 && moedaDe.value && moedaPara.value)
})

const showResults = computed(() => taxa.value !== null || convertido.value !== null)

const taxaDisplay = computed(() => {
  if (!moedaPara.value || taxa.value == null) return '—'
  return formatMoney(taxa.value, moedaPara.value)
})

const convertedDisplay = computed(() => {
  if (!moedaPara.value || convertido.value == null) return '—'
  return formatMoney(convertido.value, moedaPara.value, true)
})

function normalizeCurrencies(payload) {
  if (Array.isArray(payload)) {
    if (payload.length && typeof payload[0] === 'string') {
      return payload.map(code => ({ code, name: code }))
    }
    if (payload.length && typeof payload[0] === 'object') {
      return payload.map(c => ({ code: c.code ?? c.symbol ?? c.id, name: c.name ?? c.label ?? c.code }))
        .filter(c => c.code)
    }
  } else if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([code, name]) => ({ code, name: name || code }))
  }
  return []
}

async function loadCurrencies() {
  currenciesLoading.value = true
  error.value = ''
  try {
    const res = await authFetch(`${BASE}/getCurrencyInfo`, { method: 'GET' })
    if (!res.ok) throw new Error('Falha ao carregar as moedas')
    const data = await res.json()
    currencies.value = normalizeCurrencies(data)
  } catch (e) {
    error.value = 'Erro inesperado ao carregar as moedas'
    currencies.value = []
  } finally {
    currenciesLoading.value = false
  }
}

function formatMoney(amount, code) {
  if (!code) return Number(amount ?? 0).toFixed(2)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${code} ${Number(amount ?? 0).toFixed(2)}`
  }
}

async function fetchRate() {
  error.value = ''
  taxa.value = null
  if (!moedaDe.value || !moedaPara.value) return

  const params = new URLSearchParams({ valor: '1', de: moedaDe.value, para: moedaPara.value })
  try {
    const res = await authFetch(`${BASE}/converterMoeda?${params.toString()}`, { method: 'GET' })
    if (!res.ok) throw new Error('Erro ao obter taxa')
    const data = await res.json()

    if (typeof data.taxa !== 'number') throw new Error('Resposta inválida')
    taxa.value = data.taxa
  } catch (e) {
    error.value = 'Erro ao obter taxa'
  }
}

async function convertNow() {
  error.value = ''
  convertido.value = null
  if (!canConvert.value) {
    error.value = 'Preencha o valor e selecione as moedas.'
    return
  }

  loading.value = true
  try {
    const params = new URLSearchParams({
      valor: String(valor.value ?? 0),
      de: moedaDe.value,
      para: moedaPara.value
    })
    const res = await authFetch(`${BASE}/converterMoeda?${params.toString()}`, { method: 'GET' })
    if (!res.ok) throw new Error('Falha na conversão')

    const data = await res.json()

    if (typeof data.valorConvertido !== 'number' || typeof data.taxa !== 'number') {
      throw new Error('Resposta inválida')
    }

    convertido.value = data.valorConvertido
    taxa.value = data.taxa
  } catch (e) {
    error.value = 'Erro inesperado na conversão'
  } finally {
    loading.value = false
  }
}

async function updateRate() {
  convertido.value = null
  await fetchRate()
}

watch([moedaDe, moedaPara], () => { updateRate() })

onMounted(() => {
  loadCurrencies()
})
</script>

<style scoped>
.page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: #f6f6f6;
  padding: 2rem 1rem;
}

.card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 2rem;
  box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.08);
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.form {
  display: grid;
  gap: 0.9rem;
}

.label {
  font-size: 0.95rem;
}

.input,
.select {
  padding: 0.65rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
}

.results {
  margin: 0.75rem 0 0.5rem;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.25rem 0;
}

.dots {
  flex: 1 1 auto;
  border-bottom: 2px dotted #bbb;
  height: 0.8rem;
}

.highlight {
  color: #2e7d32;
  font-weight: 600;
}

button {
  width: 100%;
  padding: 0.8rem;
  background: #e5bf60;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-transform: lowercase;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.text-btn {
  margin-top: 1rem;
  background: none;
  border: unset;
  text-decoration: underline;
}


.error {
  margin-top: 0.75rem;
  color: #c62828;
  text-align: center;
}
</style>