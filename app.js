const SHEET_ID_PLACEHOLDER = "REPLACE_WITH_YOUR_SHEET_ID";

const defaults = {
  sheetId: "1NO35ioTgrfS4y-tLht4KGEqGAmeN5uZpWbg0QcHBok4",
  linksTab: "Sheet1",
  socialTab: "Sheet2",
  profileName: "Hanung Gerry Purwaka",
  avatarUrl: "./assets/avatar.webp",
};

const params = new URLSearchParams(window.location.search);

const config = {
  sheetId: params.get("sheetId") || defaults.sheetId,
  linksTab: params.get("linksTab") || defaults.linksTab,
  socialTab: params.get("socialTab") || defaults.socialTab,
  profileName: params.get("name") || defaults.profileName,
  avatarUrl: params.get("avatar") || defaults.avatarUrl,
};

const linksContainer = document.querySelector("#links");
const socialContainer = document.querySelector("#social-links");
const statusText = document.querySelector("#status");
const profileName = document.querySelector("#profile-name");
const avatar = document.querySelector("#avatar");

profileName.textContent = config.profileName;
avatar.src = config.avatarUrl;

if (config.sheetId === SHEET_ID_PLACEHOLDER) {
  setStatus("Please set your Google Sheet ID in app.js first.", true);
} else {
  loadData();
}

async function loadData() {
  try {
    const [linksRows, socialRows] = await Promise.all([
      fetchSheetRows(config.sheetId, config.linksTab),
      fetchSheetRows(config.sheetId, config.socialTab),
    ]);

    const links = normalizeLinks(linksRows);
    const socialLinks = normalizeSocialLinks(socialRows);

    renderMainLinks(links);
    renderSocialLinks(socialLinks);

    if (!links.length) {
      setStatus(`No links found in tab \"${config.linksTab}\".`, true);
      return;
    }

    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus(
      "Failed to load from Google Sheets. Ensure it is published to the web and tab names are correct.",
      true,
    );
  }
}

async function fetchSheetRows(sheetId, tabName) {
  const endpoint = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(tabName)}&tqx=out:json`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Failed to fetch tab: ${tabName}`);
  }

  const text = await response.text();
  const json = parseGvizResponse(text);

  if (!json.table?.rows) {
    return [];
  }

  return json.table.rows.map((row) => (row.c || []).map((cell) => cell?.v ?? ""));
}

function parseGvizResponse(text) {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(");");

  if (start === -1 || end === -1) {
    throw new Error("Unexpected gviz response format");
  }

  return JSON.parse(text.slice(start + 1, end));
}

function normalizeLinks(rows) {
  return rows
    .map(([title, url]) => ({
      title: String(title || "").trim(),
      url: String(url || "").trim(),
    }))
    .filter((item) => !isHeaderRow(item.title, item.url, "title", "url"))
    .filter((item) => item.title && item.url);
}

function normalizeSocialLinks(rows) {
  return rows
    .map(([logoUrl, url]) => ({
      logoUrl: String(logoUrl || "").trim(),
      url: String(url || "").trim(),
    }))
    .filter((item) => !isHeaderRow(item.logoUrl, item.url, "logo_url", "url"))
    .filter((item) => item.logoUrl && item.url);
}

function isHeaderRow(valueA, valueB, expectedA, expectedB) {
  return (
    valueA.toLowerCase() === expectedA.toLowerCase() &&
    valueB.toLowerCase() === expectedB.toLowerCase()
  );
}

function renderMainLinks(links) {
  linksContainer.innerHTML = "";

  for (const link of links) {
    const card = document.createElement("a");
    card.className = "link-card";
    card.href = link.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const title = document.createElement("span");
    title.className = "link-title";
    title.textContent = link.title;

    const kebab = document.createElement("span");
    kebab.className = "link-kebab";
    kebab.setAttribute("aria-hidden", "true");
    kebab.innerHTML = "<span></span><span></span><span></span>";

    card.append(title, kebab);
    linksContainer.append(card);
  }
}

function renderSocialLinks(links) {
  socialContainer.innerHTML = "";

  for (const link of links) {
    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    const image = document.createElement("img");
    image.src = link.logoUrl;
    image.alt = "Social icon";
    image.loading = "lazy";

    anchor.append(image);
    socialContainer.append(anchor);
  }
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}
