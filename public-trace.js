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
           class="cert-link inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-all ${colorClass}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
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
        document.getElementById('error-text').textContent = "No Asset ID provided in URL";
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
                    renderIPFSLink(latest.vaccineCertCID, "Vaccine", "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100") +
                    renderIPFSLink(latest.halalSlaughterCertCID, "Slaughter", "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100") +
                    renderIPFSLink(latest.halalProducerCertCID, "Process", "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100");
            }

            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID not found in blockchain.");
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
        eventEl.className = 'relative pl-10 pb-8';

        let stageTitle = "Transfer", metaHtml = "", certsHtml = "", dotColor = "bg-gray-400";

        if (!farmShown && rec.harvestDate) {
            stageTitle = "Harvest";
            dotColor = "bg-emerald-500";
            certsHtml = renderIPFSLink(rec.vaccineCertCID, "Vaccine Record", "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100");
            metaHtml = `<p class="text-sm text-gray-600 font-medium mt-2">Origin: ${rec.origin || 'Selangor Farm'}</p>`;
            farmShown = true;
        } else if (!slaughterShown && rec.slaughterDetails) {
            stageTitle = "Processing";
            dotColor = "bg-blue-500";
            certsHtml = renderIPFSLink(rec.halalSlaughterCertCID, "Halal Certificate", "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100");
            metaHtml = `<p class="text-sm text-gray-700 font-medium italic mt-2">"${rec.slaughterDetails}"</p>`;
            slaughterShown = true;
        } else if (!transformationShown && rec.productName && rec.isFinalProduct) {
            stageTitle = "Packaging";
            dotColor = "bg-purple-500";
            certsHtml = renderIPFSLink(rec.halalProducerCertCID, "Product Certificate", "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100");
            metaHtml = `<p class="text-sm text-gray-600 font-medium mt-2">Retail packaging finalized</p>`;
            transformationShown = true;
        } else {
            const status = (rec.status || "").toUpperCase();
            if (status === 'IN_TRANSIT') {
                stageTitle = "In Transit";
                dotColor = "bg-orange-500";
                metaHtml = `<p class="text-sm text-gray-600 font-medium mt-2">Shipped to ${rec.intendedOwnerName || 'Partner'}</p>`;
            } else {
                stageTitle = "Received";
                dotColor = "bg-teal-500";
                metaHtml = `<p class="text-sm text-gray-600 font-medium mt-2">Received by ${rec.ownerName}</p>`;
            }
        }

        const dateStr = new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        eventEl.innerHTML = `
            <div class="absolute -left-[18px] top-1 w-9 h-9 rounded-full ${dotColor} border-4 border-slate-50 shadow-sm flex-shrink-0"></div>
            ${index < data.length - 1 ? `<div class="absolute left-[-14px] top-9 w-1 h-20 bg-gradient-to-b from-gray-300 to-transparent"></div>` : ''}
            <div class="glass-effect border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-gray-900">${stageTitle}</h4>
                    <span class="text-xs text-gray-500 font-mono">${dateStr}</span>
                </div>
                <p class="text-sm text-gray-700 font-medium mb-1">${rec.ownerName || "Network Participant"}</p>
                ${metaHtml}
                <div class="flex flex-wrap gap-2 mt-3">${certsHtml}</div>
            </div>`;
        container.appendChild(eventEl);
    });
}

fetchTraceData(getAssetId());
