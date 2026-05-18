import "./styles.css";

const API_URL = "https://tfdsjl3ukj.execute-api.us-east-1.amazonaws.com/readings";
const DEVICE_ID = "esp-h2s-001";

const elements = {
  dashboardPage: document.getElementById("dashboard-page"),
  historyPage: document.getElementById("history-page"),
  dashboardLink: document.getElementById("dashboard-link"),
  historyLink: document.getElementById("history-link"),

  latestH2s: document.getElementById("latest-h2s"),
  averageH2s: document.getElementById("average-h2s"),
  differenceH2s: document.getElementById("difference-h2s"),
  latestAlert: document.getElementById("latest-alert"),
  lastUpdated: document.getElementById("last-updated"),
  historyUpdated: document.getElementById("history-updated"),
  readingsBody: document.getElementById("readings-body"),
  refreshButton: document.getElementById("refresh-button"),
  statusOrb: document.getElementById("status-orb"),
  orbStatus: document.getElementById("orb-status"),
};

let cachedReadings = [];

function formatNumber(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "--";
  }

  return Number(value).toFixed(6);
}

function formatTime(reading) {
  if (reading.dateTime) {
    return reading.dateTime;
  }

  if (reading.timeStamp) {
    return new Date(Number(reading.timeStamp)).toISOString();
  }

  return "--";
}

function getRecentAverage(readings) {
  if (!readings.length) {
    return null;
  }

  const latest = readings[readings.length - 1];
  const latestTime = Number(latest.timeStamp);

  const recent = readings.filter((reading) => {
    const readingTime = Number(reading.timeStamp);
    return latestTime - readingTime <= 60_000;
  });

  const values = recent.length ? recent : readings;
  const sum = values.reduce((total, reading) => total + Number(reading.h2s || 0), 0);

  return sum / values.length;
}

function setActiveRoute() {
  const isHistory = window.location.hash === "#/history";

  elements.dashboardPage.classList.toggle("hidden", isHistory);
  elements.historyPage.classList.toggle("hidden", !isHistory);

  elements.dashboardLink.classList.toggle("active", !isHistory);
  elements.historyLink.classList.toggle("active", isHistory);
}

function renderDashboard(readings) {
  if (!readings.length) {
    elements.latestH2s.textContent = "--";
    elements.averageH2s.textContent = "--";
    elements.differenceH2s.textContent = "--";
    elements.latestAlert.textContent = "No data";
    elements.orbStatus.textContent = "No data";
    elements.lastUpdated.textContent = "Waiting for data...";
    return;
  }

  const latest = readings[readings.length - 1];
  const average = getRecentAverage(readings);
  const difference = average === null ? null : Number(latest.h2s) - average;

  elements.latestH2s.textContent = formatNumber(latest.h2s);
  elements.averageH2s.textContent = formatNumber(average);
  elements.differenceH2s.textContent = formatNumber(difference);

  const isAlert = Boolean(latest.alert);

  elements.latestAlert.textContent = isAlert ? "Alert" : "Normal";
  elements.latestAlert.className = isAlert ? "alert-true" : "alert-false";

  elements.orbStatus.textContent = isAlert ? "Alert" : "Normal";
  elements.statusOrb.classList.toggle("orb-alert", isAlert);

  elements.lastUpdated.textContent = `Last updated: ${formatTime(latest)}`;
  elements.historyUpdated.textContent = `Last updated: ${formatTime(latest)}`;
}

function renderHistory(readings) {
  if (!readings.length) {
    elements.readingsBody.innerHTML = `
      <tr>
        <td colspan="6">No readings found.</td>
      </tr>
    `;
    return;
  }

  elements.readingsBody.innerHTML = readings
    .slice()
    .reverse()
    .map((reading) => {
      const alertText = reading.alert ? "YES" : "NO";
      const alertClass = reading.alert ? "alert-true" : "alert-false";

      return `
        <tr>
          <td>${formatTime(reading)}</td>
          <td>${formatNumber(reading.h2s)}</td>
          <td>${formatNumber(reading.baseline)}</td>
          <td>${formatNumber(reading.delta)}</td>
          <td>${formatNumber(reading.aboveBaseline)}</td>
          <td class="${alertClass}">${alertText}</td>
        </tr>
      `;
    })
    .join("");
}

function renderAll() {
  renderDashboard(cachedReadings);
  renderHistory(cachedReadings);
  setActiveRoute();
}

async function loadReadings() {
  elements.refreshButton.disabled = true;
  elements.refreshButton.textContent = "Loading...";

  try {
    const url = `${API_URL}?deviceID=${encodeURIComponent(DEVICE_ID)}&limit=100`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    cachedReadings = data.readings || [];

    renderAll();
  } catch (error) {
    console.error(error);

    elements.readingsBody.innerHTML = `
      <tr>
        <td colspan="6">Failed to load readings. Check API Gateway URL and CORS.</td>
      </tr>
    `;

    elements.lastUpdated.textContent = "Failed to load readings.";
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.textContent = "Refresh";
  }
}

elements.refreshButton.addEventListener("click", loadReadings);
window.addEventListener("hashchange", setActiveRoute);

setActiveRoute();
loadReadings();
setInterval(loadReadings, 5000);
