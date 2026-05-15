import "./styles.css";

const API_URL = "https://tfdsjl3ukj.execute-api.us-east-1.amazonaws.com/readings";
const DEVICE_ID = "esp-h2s-001";

const elements = {
  latestH2s: document.getElementById("latest-h2s"),
  latestBaseline: document.getElementById("latest-baseline"),
  latestAbove: document.getElementById("latest-above"),
  latestAlert: document.getElementById("latest-alert"),
  lastUpdated: document.getElementById("last-updated"),
  readingsBody: document.getElementById("readings-body"),
  refreshButton: document.getElementById("refresh-button"),
};

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

function renderDashboard(readings) {
  if (!readings.length) {
    elements.readingsBody.innerHTML = `
      <tr>
        <td colspan="6">No readings found.</td>
      </tr>
    `;
    return;
  }

  const latest = readings[readings.length - 1];

  elements.latestH2s.textContent = formatNumber(latest.h2s);
  elements.latestBaseline.textContent = formatNumber(latest.baseline);
  elements.latestAbove.textContent = formatNumber(latest.aboveBaseline);
  elements.latestAlert.textContent = latest.alert ? "ALERT" : "Normal";
  elements.latestAlert.className = latest.alert ? "alert-true" : "alert-false";
  elements.lastUpdated.textContent = `Last updated: ${formatTime(latest)}`;

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

async function loadReadings() {
  elements.refreshButton.disabled = true;
  elements.refreshButton.textContent = "Loading...";

  try {
    const url = `${API_URL}?deviceID=${encodeURIComponent(DEVICE_ID)}&limit=50`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    renderDashboard(data.readings || []);
  } catch (error) {
    console.error(error);

    elements.readingsBody.innerHTML = `
      <tr>
        <td colspan="6">Failed to load readings. Check API Gateway URL and CORS.</td>
      </tr>
    `;
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.textContent = "Refresh";
  }
}

elements.refreshButton.addEventListener("click", loadReadings);

loadReadings();

setInterval(loadReadings, 5000);
