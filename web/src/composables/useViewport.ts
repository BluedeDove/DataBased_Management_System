import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const readWindowWidth = () => {
  if (typeof window === 'undefined') return 1440
  return window.innerWidth
}

export const useViewport = () => {
  const viewportWidth = ref(readWindowWidth())

  const syncViewport = () => {
    viewportWidth.value = readWindowWidth()
  }

  onMounted(() => {
    syncViewport()
    window.addEventListener('resize', syncViewport, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', syncViewport)
  })

  const isCompactViewport = computed(() => viewportWidth.value <= 1180)
  const isMobileViewport = computed(() => viewportWidth.value <= 768)

  return {
    viewportWidth,
    isCompactViewport,
    isMobileViewport
  }
}
