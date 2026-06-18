// Import styles via Vite module system
import '../style.css';
import 'uplot/dist/uPlot.min.css';

// uPlot is loaded as ESM import
import uPlot from 'uplot';
window.uPlot = uPlot; // expose globally for dashboard.js

// Import the dashboard logic
import './dashboard.js';
