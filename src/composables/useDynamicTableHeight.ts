import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

export function useDynamicTableHeight(min = 240, bottomGap = 16) {
  const tableSlot = ref<HTMLElement | null>(null)
  const tableHeight = ref(400)

  function recalc() {
    const el = tableSlot.value
    if (!el) return
    const vh = window.visualViewport?.height ?? window.innerHeight
    const top = el.getBoundingClientRect().top
    tableHeight.value = Math.max(min, Math.floor(vh - top - bottomGap))
  }

  function add() {
    window.addEventListener('resize', recalc)
    window.visualViewport?.addEventListener?.('resize', recalc)
  }
  function remove() {
    window.removeEventListener('resize', recalc)
    window.visualViewport?.removeEventListener?.('resize', recalc)
  }

  onMounted(async () => {
    await nextTick()
    add()
    recalc()
  })
  onBeforeUnmount(remove)

  return { tableSlot, tableHeight, recalc }
}
