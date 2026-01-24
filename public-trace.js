'use strict';

const API_URL = 'https://josef-undedicated-excusively.ngrok-free.dev/api/chicken/trace'; 
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

function getAssetId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('batchId');
}

// Helper to generate the HTML for a certificate button
function renderIPFSLink(cid, label, colorClass) {
    if (!cid || cid === "" || cid === "undefined") return '';
    return `
        <a href="${IPFS_GATEWAY}/${cid}" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all hover:shadow-sm ${colorClass}">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            ${label}
        </a>`;
}

async function fetchTraceData(id) {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('trace-content');
    const error = document.getElementById('error-message');

    if (!id) {
        loading.textContent = "Error: No Asset ID provided.";
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

            const traceData = result.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const latest = traceData[traceData.length - 1].record;

            // --- HEADER: PRODUCT SPECIFICATION ---
            document.getElementById('display-product-name').textContent = latest.productName || "Poultry Batch";
            document.getElementById('display-category').textContent = latest.productType || "Raw Material";
            document.getElementById('display-weight').textContent = latest.productWeight ? `${latest.productWeight} kg` : "N/A";
            document.getElementById('display-producer').textContent = latest.companyName || latest.ownerName;
            document.getElementById('display-description').textContent = latest.productDescription || "Authenticated via distributed ledger technology.";
            document.getElementById('display-batch-id').textContent = id;

            // Inject Top Certificates
            const topCerts = document.getElementById('top-certificates');
            if (topCerts) {
                topCerts.innerHTML = 
                    renderIPFSLink(latest.vaccineCertCID, "Vaccine Cert", "bg-emerald-50 text-emerald-700 border-emerald-100") +
                    renderIPFSLink(latest.halalSlaughterCertCID, "Slaughter Halal", "bg-amber-50 text-amber-700 border-amber-100") +
                    renderIPFSLink(latest.halalProducerCertCID, "Process Halal", "bg-purple-50 text-purple-700 border-purple-100");
            }

            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID not found in ledger.");
        }
    } catch (err) {
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        error.textContent = err.message;
    }
}

function renderTimeline(data) {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';

    let farmShown = false;
    let slaughterShown = false;
    let transformationShown = false;

    data.forEach((item, index) => {
        const rec = item.record;
        const prevRec = index > 0 ? data[index - 1].record : null;
        
        const eventEl = document.createElement('div');
        eventEl.className = 'relative pl-8 pb-10 border-l border-gray-200 last:border-0 ml-2';

        let stageTitle = "Transfer";
        let metaHtml = ""; 
        let certsHtml = "";

        // 1. FARM HARVEST (Check for Vaccine CID)
        if (!farmShown && rec.harvestDate) {
            stageTitle = "Farm Harvest";
            certsHtml = renderIPFSLink(rec.vaccineCertCID, "View Vaccine Record", "bg-emerald-50 text-emerald-700 border-emerald-100 mt-3");
            metaHtml = `
                <div class="mt-2 text-[11px] text-gray-600 font-medium">
                    Origin: ${rec.origin} | Raised: ${rec.growingDays} Days
                </div>`;
            farmShown = true;
        } 
        // 2. SLAUGHTERHOUSE (Check for Slaughter Halal CID)
        else if (!slaughterShown && rec.slaughterDetails && rec.slaughterDate) {
            stageTitle = "Processing & Quality Check";
            certsHtml = renderIPFSLink(rec.halalSlaughterCertCID, "View Halal Slaughter Cert", "bg-amber-50 text-amber-700 border-amber-100 mt-3");
            metaHtml = `
                <div class="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p class="text-[9px] font-bold text-gray-400 uppercase mb-2">Processing Metadata</p>
                    <p class="text-sm font-semibold text-gray-800 italic">"${rec.slaughterDetails}"</p>
                    <p class="text-[10px] text-gray-500 mt-2">Committed on: ${rec.slaughterDate}</p>
                </div>`;
            slaughterShown = true;
        }
        // 3. FINAL PRODUCT (Check for Producer Halal CID)
        else if (!transformationShown && rec.productName) {
            stageTitle = "Final Product Transformation";
            certsHtml = renderIPFSLink(rec.halalProducerCertCID, "View Product Halal Cert", "bg-purple-50 text-purple-700 border-purple-100 mt-3");
            metaHtml = `<p class="text-[11px] text-gray-500 mt-1 font-medium">Product successfully transformed and packaged for retail.</p>`;
            transformationShown = true;
        }
        // 4. LOGISTICS vs LEDGER UPDATE
        else {
            if (prevRec && prevRec.ownerName === rec.ownerName) {
                stageTitle = "Ledger Updated";
                metaHtml = `<p class="text-[11px] text-emerald-600 mt-1 font-bold tracking-tight">Status Update Recorded</p>`;
            } else {
                stageTitle = "Logistics Update";
                metaHtml = `<p class="text-[11px] text-gray-400 mt-1 font-medium uppercase tracking-tighter">Received by ${rec.ownerName}</p>`;
            }
        }

        const dateStr = new Date(item.timestamp).toLocaleString(undefined, { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        eventEl.innerHTML = `
            <div class="absolute -left-[6px] top-1 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white shadow-sm"></div>
            <div class="flex justify-between items-start mb-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">${stageTitle}</span>
                <span class="text-[10px] text-gray-300 font-mono">${dateStr}</span>
            </div>
            <h4 class="text-sm font-bold text-gray-900">${rec.ownerName}</h4>
            ${metaHtml}
            <div class="flex flex-wrap gap-2">${certsHtml}</div>
        `;
        container.appendChild(eventEl);
    });
}

fetchTraceData(getAssetId());
