<template>
  <div class="login-container">
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
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

      <button type="submit">Login</button>
    </form>

    <button class="signup-btn" @click="goToSignup">Criar conta</button>

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
const router = useRouter()

async function handleLogin() {
  errorMessage.value = ""

  try {
    const response = await fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        password: password.value
      })
    })

    if (!response.ok) {
      throw new Error("Email ou senha inválidos")
    }

    const data = await response.json()

    if (data.idToken) {
      localStorage.setItem("idToken", data.idToken)
      localStorage.setItem("refreshToken", data.refreshToken || "")
      localStorage.setItem("expiresIn", data.expiresIn || "")

      router.push("/")
    } else {
      errorMessage.value = data.message || "Falha ao entrar"
    }
  } catch (err) {
    errorMessage.value = err.message || "Ocorreu um erro"
  }
}

function goToSignup() {
  router.push("/signup")
}
</script>

<style scoped>
.login-container {
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

.signup-btn {
  margin-top: 1rem;
  background: #888;
}

.error {
  margin-top: 1rem;
  color: red;
  text-align: center;
}
</style>