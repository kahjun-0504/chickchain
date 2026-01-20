'use strict';

const API_URL = 'http://127.0.0.1:5000/api/chicken/trace'; 

function getAssetId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('batchId');
}

async function fetchTraceData(id) {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('trace-content');
    const error = document.getElementById('error-message');

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

            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID not found in ledger.");
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

    let farmShown = false;
    let slaughterShown = false;
    let transformationShown = false;

    data.forEach((item, index) => {
        const rec = item.record;
        // Identify the previous record to compare owners
        const prevRec = index > 0 ? data[index - 1].record : null;
        
        const eventEl = document.createElement('div');
        eventEl.className = 'relative pl-8 pb-10 border-l border-gray-200 last:border-0 ml-2';

        let stageTitle = "Transfer";
        let metaHtml = ""; 

        // 1. FARM HARVEST
        if (!farmShown && rec.harvestDate) {
            stageTitle = "Farm Harvest";
            metaHtml = `
                <div class="mt-2 text-[11px] text-gray-600 font-medium">
                    Origin: ${rec.origin} | Raised: ${rec.growingDays} Days
                </div>`;
            farmShown = true;
        } 
        // 2. SLAUGHTERHOUSE
        else if (!slaughterShown && rec.slaughterDetails && rec.slaughterDate) {
            stageTitle = "Processing & Quality Check";
            metaHtml = `
                <div class="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p class="text-[9px] font-bold text-gray-400 uppercase mb-2">Slaughterhouse Processing Metadata</p>
                    <p class="text-sm font-semibold text-gray-800 italic">"${rec.slaughterDetails}"</p>
                    <p class="text-[10px] text-gray-500 mt-2">Committed on: ${rec.slaughterDate}</p>
                </div>`;
            slaughterShown = true;
        }
        // 3. FINAL PRODUCT
        else if (!transformationShown && rec.productID === getAssetId() && rec.productName) {
            stageTitle = "Final Product Transformation";
            metaHtml = `<p class="text-[11px] text-gray-500 mt-1 font-medium">Product successfully transformed and packaged for retail.</p>`;
            transformationShown = true;
        }
        // 4. LOGISTICS vs LEDGER UPDATE (The part you wanted changed)
        else {
            if (prevRec && prevRec.ownerName === rec.ownerName) {
                // Same owner as before? Label it as an update.
                stageTitle = "Ledger Updated";
                metaHtml = `<p class="text-[11px] text-emerald-600 mt-1 font-bold tracking-tight">Status Update Recorded</p>`;
            } else {
                // Different owner? Label it as a logistics move.
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
        `;
        container.appendChild(eventEl);
    });
}

fetchTraceData(getAssetId());