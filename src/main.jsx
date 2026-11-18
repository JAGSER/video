import React from 'react';import {createRoot} from 'react-dom/client';import App from './App.jsx';import './app.css';
createRoot(document.getElementById('root')).render(<App/>);
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
