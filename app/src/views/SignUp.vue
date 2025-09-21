<template>
  <div class="signup-container">
    <h2>Criar conta</h2>

    <form @submit.prevent="handleSignup">
      <div class="form-group">
        <label for="email">Email</label>
        <input 
          id="email"
          type="email"
          v-model="email"
          placeholder="Digite seu email"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Senha</label>
        <input 
          id="password"
          type="password"
          v-model="password"
          placeholder="Digite sua senha"
          required
        />
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'criando conta...' : 'Criar conta' }}
      </button>
    </form>

    <button class="login-btn" @click="goToLogin">Voltar para login</button>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const BASE = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '')

const email = ref("")
const password = ref("")
const errorMessage = ref("")
const loading = ref(false)
const router = useRouter()

async function handleSignup() {
  errorMessage.value = ""
  loading.value = true

  try {
    const response = await fetch(`${BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || "Falha ao criar conta")
    }

    if (data.idToken) {
      localStorage.setItem("idToken", data.idToken)
      localStorage.setItem("refreshToken", data.refreshToken || "")
      router.push("/")
    } else {
      throw new Error("Conta criada, mas o token não foi retornado")
    }
  } catch (err) {
    errorMessage.value = err.message || "Ocorreu um erro"
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push("/login")
}
</script>

<style scoped>
.signup-container {
  max-width: 400px;
  margin: 4rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  width: 100%;
  padding: 0.75rem;
  background: #EDCC70;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background: #d4b45f;
}

.login-btn {
  margin-top: 1rem;
  background: #888;
}

.error {
  margin-top: 1rem;
  color: red;
  text-align: center;
}
</style>