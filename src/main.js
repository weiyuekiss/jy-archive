import { createApp } from 'vue'
import App from './App.vue'
import './styles/global.css'
import './pwa'

import { diagnoseLastSession, startTracing, trace, navigationType } from './stores/debugTrace'

const report = diagnoseLastSession()
startTracing()
trace('load', { nav: navigationType() })
createApp(App).mount('#app')
if (report) setTimeout(() => window.alert(report), 1000)
