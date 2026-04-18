<template>
  <div class="app-shell">
    <transition name="intro-overlay">
      <div v-if="showIntro" class="intro-overlay">
        <div class="intro-grid" />
        <div class="intro-orb orb-left" />
        <div class="intro-orb orb-right" />
        <div class="intro-card">
          <div class="intro-badge">AI Library</div>
          <h1>AI 智能图书馆</h1>
          <p>正在连接馆藏、借阅终端与读书传承空间…</p>
        </div>
      </div>
    </transition>

    <router-view v-slot="{ Component, route }">
      <transition name="app-shell-fade" mode="out-in">
        <component :is="Component" :key="route.matched[0]?.path || route.fullPath" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const showIntro = ref(false)

onMounted(() => {
  const introKey = 'smart-library-intro-played'
  const played = sessionStorage.getItem(introKey) === '1'

  if (played) {
    return
  }

  showIntro.value = true
  sessionStorage.setItem(introKey, '1')
  window.setTimeout(() => {
    showIntro.value = false
  }, 1300)
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  position: relative;
}

.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.18), transparent 28%),
    radial-gradient(circle at 80% 25%, rgba(255, 255, 255, 0.14), transparent 24%),
    linear-gradient(135deg, rgba(200, 16, 46, 0.96) 0%, rgba(124, 58, 237, 0.95) 52%, rgba(15, 23, 42, 0.96) 100%);
  backdrop-filter: blur(12px);
}

.intro-grid {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(circle at center, black 38%, transparent 92%);
  animation: gridFloat 10s linear infinite;
}

.intro-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.85;
  animation: orbPulse 5s ease-in-out infinite;
}

.orb-left {
  width: 320px;
  height: 320px;
  left: -60px;
  bottom: -40px;
  background: rgba(255, 255, 255, 0.18);
}

.orb-right {
  width: 360px;
  height: 360px;
  right: -80px;
  top: -40px;
  background: rgba(251, 191, 36, 0.18);
  animation-delay: 1.4s;
}

.intro-card {
  position: relative;
  z-index: 1;
  min-width: min(520px, calc(100vw - 48px));
  padding: 40px 42px;
  border-radius: 28px;
  text-align: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(18px);
  animation: cardRise 0.85s cubic-bezier(0.22, 1, 0.36, 1);
}

.intro-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.18);
}

.intro-card h1 {
  margin: 18px 0 12px;
  font-size: clamp(30px, 4vw, 44px);
}

.intro-card p {
  margin: 0;
  font-size: 15px;
  opacity: 0.92;
}

.intro-overlay-enter-active,
.intro-overlay-leave-active {
  transition: opacity 0.55s ease, transform 0.55s ease;
}

.intro-overlay-enter-from,
.intro-overlay-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

.app-shell-fade-enter-active,
.app-shell-fade-leave-active {
  transition: opacity 0.3s ease;
}

.app-shell-fade-enter-from,
.app-shell-fade-leave-to {
  opacity: 0;
}

@keyframes gridFloat {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(36px, 18px, 0);
  }
}

@keyframes orbPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

@keyframes cardRise {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
