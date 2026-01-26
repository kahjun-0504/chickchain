'use strict';

/**
 * ChickChain Standalone Public Trace Script
 * Corrected to prioritize 'enterpriseName' for professional consumer display.
 */

// If using proxy on Vercel, relative path is preferred. 
// If your API is on a fixed external URL, use it here.
const API_URL = '/api/chicken/trace'; 
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

function getAssetId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('batchId') || params.get('productId');
}

/**
 * PROFESSIONAL IDENTITY RESOLUTION
 * Hardcoded priority: Enterprise Name (Professional Brand) > Company Name > Owner Name (Technical ID)
 */
function resolveName(rec) {
    if (!rec) return "Authorized Partner";
    // 1. Enterprise Name: The professional display name provided by the participants
    if (rec.enterpriseName) return rec.enterpriseName;
    // 2. Company Name: Fallback for transformed products
    if (rec.companyName) return rec.companyName;
    // 3. Owner Name: The network username/technical ID
    return rec.ownerName || "Network Participant";
}

function renderIPFSLink(cid, label, colorClass) {
    if (!cid || cid === "" || cid === "undefined") return '';
    return `
        <a href="${IPFS_GATEWAY}/${cid}" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all hover:bg-white hover:shadow-lg ${colorClass}">
            <svg class="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            ${label}
        </a>`;
}

async function fetchTraceData(id) {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('trace-content');
    const error = document.getElementById('error-message');

    if (!id) {
        if (loading) loading.classList.add('hidden');
        if (error) {
            error.classList.remove('hidden');
            document.getElementById('error-text').textContent = "Input Required: No Asset ID detected.";
        }
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
            if (loading) loading.classList.add('hidden');
            if (content) content.classList.remove('hidden');

            const traceData = result.data.map(item => {
                const record = item.Value || item.Record || item.record || item;
                const parsedRecord = typeof record === 'string' ? JSON.parse(record) : record;
                return {
                    timestamp: item.Timestamp || item.timestamp,
                    record: parsedRecord
                };
            }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const latest = traceData[traceData.length - 1].record;

            document.getElementById('display-product-name').textContent = latest.productName || "Authenticated Poultry Batch";
            document.getElementById('display-weight').textContent = latest.productWeight ? `${latest.productWeight} kg` : "N/A";
            document.getElementById('display-producer').textContent = resolveName(latest);
            document.getElementById('display-description').textContent = latest.productDescription || "Authenticated and tracked via Hyperledger Fabric blockchain.";
            document.getElementById('display-batch-id').textContent = id;

            const topCerts = document.getElementById('top-certificates');
            if (topCerts) {
                topCerts.innerHTML = 
                    renderIPFSLink(latest.vaccineCertCID, "Health Cert", "bg-emerald-50 text-emerald-700 border-emerald-100") +
                    renderIPFSLink(latest.halalSlaughterCertCID, "Slaughter VC", "bg-amber-50 text-amber-700 border-amber-100") +
                    renderIPFSLink(latest.halalProducerCertCID, "SKU VC", "bg-purple-50 text-purple-700 border-purple-100");
            }

            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID not found in the immutable registry.");
        }
    } catch (err) {
        if (loading) loading.classList.add('hidden');
        if (error) {
            error.classList.remove('hidden');
            document.getElementById('error-text').textContent = err.message;
        }
    }
}

function renderTimeline(data) {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.innerHTML = '';
    let farmShown = false, slaughterShown = false, transformationShown = false;

    data.forEach((item, index) => {
        const rec = item.record;
        
        // Logic to improve timeline readability
        if (index < data.length - 1) {
            const nextRec = data[index + 1].record;
            // Skip redundant "received" events if a transformation immediately follows
            if (rec.currentOwnerOrg === 'Org5MSP' && nextRec.transformedFromID && !rec.transformedFromID) {
                return; 
            }
        }

        const eventEl = document.createElement('div');
        eventEl.className = 'relative pl-10 pb-12 border-l-2 border-gray-100 last:border-0 ml-2 z-10 group';

        let stageTitle = "State Update", metaHtml = "", certsHtml = "";
        let iconColor = "bg-gray-300";

        if (!farmShown && rec.harvestDate) {
            stageTitle = "Farm Harvest";
            iconColor = "bg-emerald-500 shadow-lg shadow-emerald-50";
            certsHtml = renderIPFSLink(rec.vaccineCertCID, "View Health Record", "bg-emerald-50 text-emerald-700 border-emerald-100 mt-4");
            metaHtml = `<div class="mt-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">Origin: ${rec.origin || 'Source Farm'}</div>`;
            farmShown = true;
        } else if (!slaughterShown && rec.slaughterDetails) {
            stageTitle = "Processing & Quality";
            iconColor = "bg-amber-500 shadow-lg shadow-amber-50";
            certsHtml = renderIPFSLink(rec.halalSlaughterCertCID, "View Halal Cert", "bg-amber-50 text-amber-700 border-amber-100 mt-4");
            metaHtml = `<p class="text-xs font-semibold text-gray-600 italic mt-3">"${rec.slaughterDetails}"</p>`;
            slaughterShown = true;
        } else if (!transformationShown && rec.transformedFromID) {
            stageTitle = "SKU Transformation";
            iconColor = "bg-purple-600 shadow-lg shadow-purple-50";
            certsHtml = renderIPFSLink(rec.halalProducerCertCID, "View Halal Cert", "bg-purple-50 text-purple-700 border-purple-100 mt-4");
            metaHtml = `<p class="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-tight">${rec.productName} ready for market</p>`;
            transformationShown = true;
        } else {
            const status = (rec.status || "").toUpperCase();
            if (status === 'IN_TRANSIT') {
                stageTitle = "Dispatch";
                iconColor = "bg-blue-500";
                metaHtml = `<p class="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-tighter">Shipped to ${resolveName({ enterpriseName: rec.intendedOwnerName, ownerName: rec.intendedOwnerName })}</p>`;
            } else {
                stageTitle = "Node Acceptance";
                iconColor = "bg-emerald-400";
                metaHtml = `<p class="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-tighter">Verified receipt at node</p>`;
            }
        }

        const dateStr = new Date(item.timestamp).toLocaleString(undefined, { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        eventEl.innerHTML = `
            <div class="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full ${iconColor} border-4 border-white z-20 transition-transform group-hover:scale-125"></div>
            <div class="flex justify-between items-start mb-1">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">${stageTitle}</span>
                <span class="text-[9px] text-gray-300 font-mono">${dateStr}</span>
            </div>
            <h4 class="text-sm font-black text-gray-900 uppercase tracking-tight">${resolveName(rec)}</h4>
            ${metaHtml}
            <div class="flex flex-wrap gap-2 mt-2">${certsHtml}</div>`;
        container.appendChild(eventEl);
    });
}

fetchTraceData(getAssetId());
