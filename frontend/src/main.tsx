// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext'; // インポート追加
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* AuthProviderで囲むことで、どこでも user 情報が使えるようになる */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);