import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import './index.css'
import App from './App.tsx'
import Login from './Login.tsx'
import { DialogContainer } from './Dialog.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogContainer />
    <BrowserRouter>
      <Routes>
        <Route index element={<Login/>} />
        <Route path="dashboard/*" element={<App/>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

