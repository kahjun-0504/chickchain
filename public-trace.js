'use strict';

/**
 * ChickChain Public Trace Script
 * Robust identity resolution and timeline rendering for consumers.
 */

// If running in development with relative paths, use /api. 
// For production absolute URLs, set them here.
const API_URL = '/api/chicken/trace'; 
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

function getAssetId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('batchId') || params.get('productId');
}

/**
 * Professional Identity Resolution for Public Consumers
 * Prioritizes the stamped 'enterpriseName' from the ledger record.
 */
function resolveName(rec) {
    if (!rec) return "Network Participant";
    // The React dashboard now stamps 'enterpriseName' on every ledger transaction.
    // We prioritize this for the consumer-facing UI.
    return rec.enterpriseName || rec.companyName || rec.ownerName || "Authorized Partner";
}

function renderIPFSLink(cid, label, colorClass) {
    if (!cid || cid === "" || cid === "undefined") return '';
    return `
        <a href="${IPFS_GATEWAY}/${cid}" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all hover:bg-white hover:shadow-md ${colorClass}">
            <svg class="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
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
        document.getElementById('error-text').textContent = "Input Required: Please provide a valid Serial ID or scan a QR code.";
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId: id })
        });
        
        if (!response.ok) throw new Error("ID not found on the blockchain registry.");
        
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            loading.classList.add('hidden');
            content.classList.remove('hidden');

            const traceData = result.data.map(item => {
                const record = item.Value || item.Record || item.record || item;
                // Ensure record is an object
                const parsedRecord = typeof record === 'string' ? JSON.parse(record) : record;
                return {
                    timestamp: item.Timestamp || item.timestamp,
                    record: parsedRecord
                };
            }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const latest = traceData[traceData.length - 1].record;

            // UI Population
            document.getElementById('display-product-name').textContent = latest.productName || "Authenticated Poultry";
            document.getElementById('display-weight').textContent = latest.productWeight ? `${latest.productWeight} kg` : "Variable";
            document.getElementById('display-producer').textContent = latest.enterpriseName || latest.companyName || "Verified Farm";
            document.getElementById('display-description').textContent = latest.productDescription || "This product has been authenticated and tracked via a decentralized Hyperledger Fabric network.";
            document.getElementById('display-batch-id').textContent = id;

            // Header Certificates
            const topCerts = document.getElementById('top-certificates');
            if (topCerts) {
                topCerts.innerHTML = 
                    renderIPFSLink(latest.vaccineCertCID, "Health Cert", "bg-emerald-50 text-emerald-700 border-emerald-100") +
                    renderIPFSLink(latest.halalSlaughterCertCID, "Halal Slaughter", "bg-amber-50 text-amber-700 border-amber-100") +
                    renderIPFSLink(latest.halalProducerCertCID, "Halal Process", "bg-purple-50 text-purple-700 border-purple-100");
            }

            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID could not be resolved in the current ledger state.");
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
    
    // Tracking flags to make the timeline cleaner for consumers
    let farmShown = false;
    let slaughterShown = false;
    let finalShown = false;

    data.forEach((item, index) => {
        const rec = item.record;
        const eventEl = document.createElement('div');
        eventEl.className = 'relative pl-10 pb-12 last:pb-0 z-10';

        let stageTitle = "Transfer", metaHtml = "", certsHtml = "";
        let iconColor = "bg-slate-300";

        // Logic to interpret the journey for the consumer
        if (!farmShown && rec.harvestDate) {
            stageTitle = "Certified Harvest";
            iconColor = "bg-emerald-500";
            certsHtml = renderIPFSLink(rec.vaccineCertCID, "Farm Health Audit", "bg-emerald-50 text-emerald-700 border-emerald-100 mt-3");
            metaHtml = `<div class="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-tight">Origin: ${rec.origin || 'Selangor Region'}</div>`;
            farmShown = true;
        } else if (!slaughterShown && rec.slaughterDetails) {
            stageTitle = "Processing & Quality Check";
            iconColor = "bg-amber-500";
            certsHtml = renderIPFSLink(rec.halalSlaughterCertCID, "Halal Verification", "bg-amber-50 text-amber-700 border-amber-100 mt-3");
            metaHtml = `<p class="text-xs font-semibold text-slate-600 italic mt-2">"${rec.slaughterDetails}"</p>`;
            slaughterShown = true;
        } else if (rec.transformedFromID && !finalShown) {
            stageTitle = "Final Packaging & SKU Generation";
            iconColor = "bg-purple-600";
            certsHtml = renderIPFSLink(rec.halalProducerCertCID, "Certified Process Log", "bg-purple-50 text-purple-700 border-purple-100 mt-3");
            metaHtml = `<p class="text-[10px] text-slate-500 mt-1 font-bold uppercase">${rec.productName} ready for retail</p>`;
            finalShown = true;
        } else {
            const status = (rec.status || "").toUpperCase();
            if (status === 'IN_TRANSIT') {
                stageTitle = "Digital Dispatch";
                iconColor = "bg-blue-500";
                metaHtml = `<p class="text-[10px] text-slate-400 mt-1 font-bold uppercase">Moving to ${rec.intendedOwnerName || 'Processing Center'}</p>`;
            } else if (status === 'RECEIVED') {
                stageTitle = "Node Acceptance";
                iconColor = "bg-emerald-400";
                metaHtml = `<p class="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-tighter">Verified receipt by ${resolveName(rec)}</p>`;
            } else {
                stageTitle = "Network Update";
                metaHtml = `<p class="text-[10px] text-slate-300 mt-1 font-medium uppercase tracking-widest">State recorded on ledger</p>`;
            }
        }

        const dateStr = new Date(item.timestamp).toLocaleString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });

        eventEl.innerHTML = `
            <div class="absolute left-0 top-1 w-4 h-4 rounded-full ${iconColor} border-4 border-white shadow-sm transition-all duration-500"></div>
            <div class="flex justify-between items-start mb-1">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">${stageTitle}</span>
                <span class="text-[9px] text-slate-300 font-mono">${dateStr}</span>
            </div>
            <h4 class="text-sm font-black text-slate-900 uppercase tracking-tight">${resolveName(rec)}</h4>
            ${metaHtml}
            <div class="flex flex-wrap gap-2 mt-3">${certsHtml}</div>`;
            
        container.appendChild(eventEl);
    });
}

fetchTraceData(getAssetId());
