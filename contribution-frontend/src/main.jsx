import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { TenantProvider } from './context/TenantContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <TenantProvider>
            <App />
        </TenantProvider>
    </React.StrictMode>,
)
