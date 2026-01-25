'use strict';

const API_URL = 'https://josef-undedicated-excusively.ngrok-free.dev/api/chicken/trace'; 
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

function getAssetId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('batchId');
}

function renderIPFSLink(cid, label, colorClass) {
    if (!cid || cid === "" || cid === "undefined") return '';
    return `
        <a href="${IPFS_GATEWAY}/${cid}" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-tight border transition-all hover:shadow-sm ${colorClass}">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            ${label}
        </a>`;
}

async function fetchTraceData(id) {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('trace-content');
    const error = document.getElementById('error-message');

    if (!id) {
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        document.getElementById('error-text').textContent = "Error: No Asset ID provided.";
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId: id })
        });
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            loading.classList.add('hidden');
            content.classList.remove('hidden');

            const traceData = result.data.map(item => {
                const record = item.Value || item.Record || item.record || item;
                return {
                    timestamp: item.Timestamp || item.timestamp,
                    record: record
                };
            }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            const latest = traceData[traceData.length - 1].record;

            document.getElementById('display-product-name').textContent = latest.productName || "Poultry Batch";
            document.getElementById('display-weight').textContent = latest.productWeight ? `${latest.productWeight} kg` : "N/A";
            document.getElementById('display-producer').textContent = latest.companyName || latest.ownerName || "Unknown Producer";
            document.getElementById('display-description').textContent = latest.productDescription || "Authenticated via blockchain.";
            document.getElementById('display-batch-id').textContent = id;

            const topCerts = document.getElementById('top-certificates');
            if (topCerts) {
                topCerts.innerHTML = 
                    renderIPFSLink(latest.vaccineCertCID, "Vaccine Cert", "bg-emerald-50 text-emerald-700 border-emerald-200") +
                    renderIPFSLink(latest.halalSlaughterCertCID, "Slaughter Halal", "bg-amber-50 text-amber-700 border-amber-200") +
                    renderIPFSLink(latest.halalProducerCertCID, "Process Halal", "bg-purple-50 text-purple-700 border-purple-200");
            }

            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID not found.");
        }
    } catch (err) {
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        document.getElementById('error-text').textContent = err.message;
    }
}

function renderTimeline(data) {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';
    let farmShown = false, slaughterShown = false, transformationShown = false;

    data.forEach((item, index) => {
        const rec = item.record;
        const eventEl = document.createElement('div');
        eventEl.className = 'relative pl-8 pb-10 border-l border-gray-300 last:border-0 ml-2';

        let stageTitle = "Transfer", metaHtml = "", certsHtml = "";

        if (!farmShown && rec.harvestDate) {
            stageTitle = "Farm Harvest";
            certsHtml = renderIPFSLink(rec.vaccineCertCID, "View Vaccine Record", "bg-emerald-50 text-emerald-700 border-emerald-200 mt-3");
            metaHtml = `<div class="mt-2 text-xs text-gray-600 font-medium">Origin: ${rec.origin || 'Selangor Farm'}</div>`;
            farmShown = true;
        } else if (!slaughterShown && rec.slaughterDetails) {
            stageTitle = "Processing & Halal Check";
            certsHtml = renderIPFSLink(rec.halalSlaughterCertCID, "View Halal Slaughter Cert", "bg-amber-50 text-amber-700 border-amber-200 mt-3");
            metaHtml = `<p class="text-sm font-semibold text-gray-800 italic mt-2">"${rec.slaughterDetails}"</p>`;
            slaughterShown = true;
        } else if (!transformationShown && rec.productName && rec.isFinalProduct) {
            stageTitle = "Final Product Transformation";
            certsHtml = renderIPFSLink(rec.halalProducerCertCID, "View Product Halal Cert", "bg-purple-50 text-purple-700 border-purple-200 mt-3");
            metaHtml = `<p class="text-xs text-gray-500 mt-1 font-medium">Retail packaging confirmed.</p>`;
            transformationShown = true;
        } else {
            const status = (rec.status || "").toUpperCase();
            if (status === 'IN_TRANSIT') {
                stageTitle = "Dispatch";
                metaHtml = `<p class="text-xs text-gray-600 mt-1 font-semibold">Shipped to ${rec.intendedOwnerName || 'Partner'}</p>`;
            } else {
                stageTitle = "Ownership Transfer";
                metaHtml = `<p class="text-xs text-gray-500 mt-1 font-medium uppercase">Received by ${rec.ownerName}</p>`;
            }
        }

        const dateStr = new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        eventEl.innerHTML = `
            <div class="absolute -left-[6px] top-1 w-3 h-3 rounded-full bg-gray-700 border-2 border-white shadow-sm"></div>
            <div class="flex justify-between items-start mb-1">
                <span class="text-xs font-bold uppercase tracking-wider text-gray-500">${stageTitle}</span>
                <span class="text-xs text-gray-400 font-mono">${dateStr}</span>
            </div>
            <h4 class="text-sm font-bold text-gray-900">${rec.ownerName || "Network Participant"}</h4>
            ${metaHtml}
            <div class="flex flex-wrap gap-2 mt-2">${certsHtml}</div>`;
        container.appendChild(eventEl);
    });
}

fetchTraceData(getAssetId());
