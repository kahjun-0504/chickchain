'use strict';

const API_URL = 'https://josef-undedicated-excusively.ngrok-free.dev/api/chicken/trace'; 
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

/**
 * Extracts ID from URL query parameters
 */
function getAssetId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('batchId');
}

/**
 * Helper to generate the HTML for a certificate button
 */
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

/**
 * Main function to fetch and render Traceability data
 */
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

            // Normalize Fabric response structure
            const traceData = result.data.map(item => {
                const record = item.Value || item.Record || item.record || item;
                return {
                    timestamp: item.Timestamp || item.timestamp,
                    record: record
                };
            }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            const latest = traceData[traceData.length - 1].record;

            // --- UPDATE HEADER UI ---
            document.getElementById('display-product-name').textContent = latest.productName || "Poultry Batch";
            
            // Note: 'display-category' element is no longer updated as it is being removed
            const categoryEl = document.getElementById('display-category');
            if (categoryEl) categoryEl.classList.add('hidden'); 
            
            document.getElementById('display-weight').textContent = 
                latest.productWeight ? `${latest.productWeight} kg` : "N/A";
            
            document.getElementById('display-producer').textContent = 
                latest.companyName || latest.ownerName || "Certified Producer";
            
            document.getElementById('display-description').textContent = 
                latest.productDescription || "Authenticated via distributed ledger technology.";
            
            document.getElementById('display-batch-id').textContent = id;

            // --- RENDER CERTIFICATES ---
            const topCerts = document.getElementById('top-certificates');
            if (topCerts) {
                topCerts.innerHTML = 
                    renderIPFSLink(latest.vaccineCertCID, "Vaccine Cert", "bg-emerald-50 text-emerald-700 border-emerald-100") +
                    renderIPFSLink(latest.halalSlaughterCertCID, "Slaughter Halal", "bg-amber-50 text-amber-700 border-amber-100") +
                    renderIPFSLink(latest.halalProducerCertCID, "Process Halal", "bg-purple-50 text-purple-700 border-purple-100");
            }

            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID not found in the blockchain ledger.");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        const errorText = document.getElementById('error-text');
        if (errorText) errorText.textContent = err.message;
        else error.textContent = err.message;
    }
}

/**
 * Builds the visual timeline list
 */
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

        // 1. FARM HARVEST
        if (!farmShown && rec.harvestDate) {
            stageTitle = "Farm Harvest";
            certsHtml = renderIPFSLink(rec.vaccineCertCID, "View Vaccine Record", "bg-emerald-50 text-emerald-700 border-emerald-100 mt-3");
            metaHtml = `<div class="mt-2 text-[11px] text-gray-600 font-medium">Origin: ${rec.origin || 'Selangor Farm'}</div>`;
            farmShown = true;
        } 
        // 2. SLAUGHTERHOUSE
        else if (!slaughterShown && rec.slaughterDetails) {
            stageTitle = "Processing & Quality Check";
            certsHtml = renderIPFSLink(rec.halalSlaughterCertCID, "View Halal Slaughter Cert", "bg-amber-50 text-amber-700 border-amber-100 mt-3");
            metaHtml = `<p class="text-[10px] text-gray-500 mt-2 font-medium italic">"${rec.slaughterDetails}"</p>`;
            slaughterShown = true;
        }
        // 3. FINAL PRODUCT
        else if (!transformationShown && rec.productName) {
            stageTitle = "SKU Transformation";
            certsHtml = renderIPFSLink(rec.halalProducerCertCID, "View Halal Process Cert", "bg-purple-50 text-purple-700 border-purple-100 mt-3");
            metaHtml = `<p class="text-[11px] text-gray-500 mt-1 font-medium">Final product transformation confirmed.</p>`;
            transformationShown = true;
        }
        // 4. LOGISTICS HANDOVER
        else {
            const status = (rec.status || "").toUpperCase();
            if (status === 'IN_TRANSIT') {
                stageTitle = "In Transit";
                metaHtml = `<p class="text-[11px] text-orange-600 mt-1 font-bold">Shipped to ${rec.intendedOwnerName || 'Partner'}</p>`;
            } else if (prevRec && prevRec.ownerName === rec.ownerName) {
                stageTitle = "Ledger Updated";
                metaHtml = `<p class="text-[11px] text-emerald-600 mt-1 font-bold">Metadata Sync Verified</p>`;
            } else {
                stageTitle = "Ownership Transfer";
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
            <h4 class="text-sm font-bold text-gray-900">${rec.ownerName || "Network Node"}</h4>
            ${metaHtml}
            <div class="flex flex-wrap gap-2">${certsHtml}</div>
        `;
        container.appendChild(eventEl);
    });
}

// Start
fetchTraceData(getAssetId());
