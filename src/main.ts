import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { router } from './router'
import './styles.css'

createApp(App).use(router).mount('#app')

// Inside the Android app the files are bundled already; the offline cache is only for the web version.
const native = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ?? false
if (!native) registerSW({ immediate: true })
