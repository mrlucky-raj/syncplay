/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Player from './pages/Player';
import Controller from './pages/Controller';
import { ThemeProvider } from './lib/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/player/:roomId" element={<Player />} />
          <Route path="/controller/:roomId" element={<Controller />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
