// Estado de conexión reactivo (navigator.onLine + eventos), solo en cliente.
export function useOnline() {
  const online = useState('online', () => true)

  onMounted(() => {
    online.value = navigator.onLine
    const activar = () => (online.value = true)
    const desactivar = () => (online.value = false)
    window.addEventListener('online', activar)
    window.addEventListener('offline', desactivar)
    onUnmounted(() => {
      window.removeEventListener('online', activar)
      window.removeEventListener('offline', desactivar)
    })
  })

  return online
}
