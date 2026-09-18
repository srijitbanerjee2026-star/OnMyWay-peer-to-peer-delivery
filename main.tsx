alert("Script is running!");
import React from 'react';
import ReactDOM from 'react-dom/client';
import OrderManager from './requestor';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OrderManager />
  </React.StrictMode>
);