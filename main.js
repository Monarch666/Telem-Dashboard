// uPlot is loaded globally via CDN in index.html

// State
const ws = new WebSocket('ws://localhost:8765');
const streams = new Set();
const messageCounts = {};
let lastMessageTime = performance.now();
let messageRate = 0;
let totalMessages = 0;

// Update Msg Rate
setInterval(() => {
    const now = performance.now();
    messageRate = Math.round(totalMessages / ((now - lastMessageTime) / 1000));
    const rateEl = document.getElementById('msg-rate');
    if (rateEl) rateEl.innerText = `${messageRate} Hz`;
    totalMessages = 0;
    lastMessageTime = now;
}, 1000);

ws.onopen = () => {
    const dot = document.getElementById('ws-dot');
    const status = document.getElementById('ws-status');
    if (dot) {
        dot.classList.remove('disconnected');
        dot.classList.add('connected');
    }
    if (status) status.innerText = 'Connected';
};

ws.onclose = () => {
    const dot = document.getElementById('ws-dot');
    const status = document.getElementById('ws-status');
    if (dot) {
        dot.classList.remove('connected');
        dot.classList.add('disconnected');
    }
    if (status) status.innerText = 'Disconnected';
};

ws.onmessage = (event) => {
    totalMessages++;
    const msg = JSON.parse(event.data);
    const type = msg.type;

    if (!streams.has(type)) {
        streams.add(type);
        addStreamToList(type);
    }

    messageCounts[type] = (messageCounts[type] || 0) + 1;
    const badge = document.getElementById(`badge-${type}`);
    if (badge) badge.innerText = typeof messageCounts[type] === 'number' && messageCounts[type] > 999 ? '999+' : messageCounts[type];

    // Distribute data to charts
    if (activeCharts[type]) {
        updateChart(type, msg.data);
    }
};

function addStreamToList(type) {
    const list = document.getElementById('stream-list');
    const div = document.createElement('div');
    div.className = 'stream-item';
    div.innerHTML = `
        <span>${type}</span>
        <span class="badge" id="badge-${type}">1</span>
    `;
    div.onclick = () => openChartSettings(type);
    div.style.cursor = 'pointer';
    list.appendChild(div);
}

// Chart Management
const activeCharts = {}; // type -> { config, plot, data, fields }
const HISTORY_LENGTH = 150; // Keep track of 150 points

function openChartSettings(type) {
    if (activeCharts[type]) return; // Already exists

    const tempHandler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === type) {
            ws.removeEventListener('message', tempHandlerWrapper);
            createChart(type, msg.data);
        }
    };

    const tempHandlerWrapper = (evt) => tempHandler(evt);
    ws.addEventListener('message', tempHandlerWrapper);
}

function createChart(type, sampleData) {
    const numericFields = Object.keys(sampleData).filter(k => typeof sampleData[k] === 'number');
    if (numericFields.length === 0) {
        alert(`No numeric parameters found in message type: ${type}`);
        return;
    }

    const grid = document.getElementById('chart-grid');
    const card = document.createElement('div');
    card.className = 'chart-card glass-panel';
    card.id = `chart-card-${type}`;

    card.draggable = true;

    // Drag-and-drop Events
    card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', type);
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });

    card.innerHTML = `
        <div class="chart-header">
            <div class="chart-title">${type}</div>
            <div class="chart-controls">
                <button class="chart-btn" onclick="window.toggleMaximize('${type}')" title="Maximize">🗖</button>
                <button class="chart-btn" onclick="window.removeChart('${type}')" title="Close">✕</button>
            </div>
        </div>
        <div class="chart-body" id="chart-body-${type}"></div>
    `;
    grid.appendChild(card);

    const now = Date.now() / 1000;
    const timeData = Array(HISTORY_LENGTH).fill(0).map((_, i) => now - (HISTORY_LENGTH - i) * 0.1);

    const data = [timeData];
    const series = [{}];
    const colors = ['#58a6ff', '#2ea043', '#f85149', '#d2a8ff', '#f1e05a'];

    numericFields.forEach((field, i) => {
        data.push(Array(HISTORY_LENGTH).fill(null));
        series.push({
            label: field,
            stroke: colors[i % colors.length],
            width: 2,
            spanGaps: true
        });
    });

    const opts = {
        width: card.clientWidth - 32,
        height: 220,
        series: series,
        axes: [
            { show: false }, // Hide time axis
            {
                stroke: 'rgba(255,255,255,0.4)',
                grid: { stroke: 'rgba(255,255,255,0.05)', width: 1 }
            }
        ],
        cursor: { show: false },
        legend: { show: true }
    };

    const container = document.getElementById(`chart-body-${type}`);
    const plot = new uPlot(opts, data, container);

    activeCharts[type] = { plot, data, fields: numericFields, card };

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            plot.setSize({ width: entry.contentRect.width, height: 220 });
        }
    });
    resizeObserver.observe(container);
}

function updateChart(type, msgData) {
    const chart = activeCharts[type];
    if (!chart) return;

    // Shift time
    const now = Date.now() / 1000;
    chart.data[0].push(now);
    chart.data[0].shift();

    // Shift data
    chart.fields.forEach((f, i) => {
        chart.data[i + 1].push(msgData[f] !== undefined ? msgData[f] : null);
        chart.data[i + 1].shift();
    });

    chart.plot.setData(chart.data);
}

window.removeChart = (type) => {
    if (activeCharts[type]) {
        activeCharts[type].card.remove();
        delete activeCharts[type];
        // If the removed chart was maximized, clean up the overlay
        if (document.querySelector('.dashboard').classList.contains('has-maximized')) {
            document.querySelector('.dashboard').classList.remove('has-maximized');
        }
    }
}

window.toggleMaximize = (type) => {
    const chart = activeCharts[type];
    if (!chart) return;

    const isMaximized = chart.card.classList.toggle('maximized');
    const dashboard = document.querySelector('.dashboard');

    if (isMaximized) {
        dashboard.classList.add('has-maximized');
        // Calculate new size based on viewport
        chart.plot.setSize({ width: window.innerWidth * 0.9 - 32, height: window.innerHeight * 0.8 - 60 });
    } else {
        dashboard.classList.remove('has-maximized');
        // Revert to original size constraint based on grid column
        chart.plot.setSize({ width: chart.card.clientWidth - 32, height: 220 });
    }
}

// Global Grid Drag and Drop handling
const grid = document.getElementById('chart-grid');
grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    if (!draggingElement) return;

    // Get the element we are hovering over
    const afterElement = getDragAfterElement(grid, e.clientY, e.clientX);
    if (afterElement == null) {
        grid.appendChild(draggingElement);
    } else {
        grid.insertBefore(draggingElement, afterElement);
    }
});

function getDragAfterElement(container, y, x) {
    const draggableElements = [...container.querySelectorAll('.chart-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        // Since it's a grid, we need to factor in both X and Y
        const offsetLeft = x - box.left - box.width / 2;
        const offsetTop = y - box.top - box.height / 2;

        // Simple distance metric
        const distance = Math.sqrt(offsetLeft * offsetLeft + offsetTop * offsetTop);

        // We want the element that we are closest to
        if (distance < closest.distance) {
            return { offset: distance, element: child, distance: distance };
        } else {
            return closest;
        }
    }, { distance: Number.POSITIVE_INFINITY }).element;
}
