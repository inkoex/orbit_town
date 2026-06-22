import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from './App.tsx';
import './index.css';
import 'uplot/dist/uPlot.min.css';
import 'react-toastify/dist/ReactToastify.css';
import ConvexClientProvider from './components/ConvexClientProvider.tsx';
import { IsoDebugPage } from './components/IsoDebugPage.tsx';

const isIsoDebug = window.location.hash === '#iso-debug';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isIsoDebug ? (
      <IsoDebugPage />
    ) : (
      <ConvexClientProvider>
        <Home />
      </ConvexClientProvider>
    )}
  </React.StrictMode>,
);
