'use strict';

/**
 * ChickChain Standalone Public Trace Script
 * Optimized for high-resolution identity mapping and supply chain storytelling.
 */

// Use the absolute URL for the backend as provided in the ngrok environment.
const API_URL = 'https://josef-undedicated-excusively.ngrok-free.dev/api/chicken/trace'; 
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

/**
 * Extract Asset ID from URL parameters (?id=... or ?batchId=...)
 */
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
    // 1. Enterprise Name: The professional display name stamped on the ledger
    if (rec.enterpriseName) return rec.enterpriseName;
    // 2. Company Name: Fallback for transformed products or legacy records
    if (rec.companyName) return rec.companyName;
    // 3. Owner Name: The network username/technical ID
    return rec.ownerName || "Network Participant";
}

/**
 * Helper to render IPFS documents as sleek action buttons
 */
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

/**
 * Fetch Data and Hydrate the UI
 */
async function fetchTraceData(id) {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('trace-content');
    const error = document.getElementById('error-message');

    if (!id) {
        if (loading) loading.classList.add('hidden');
        if (error) {
            error.classList.remove('hidden');
            document.getElementById('error-text').textContent = "Input Required: No Asset ID detected in the URL.";
        }
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ batchId: id })
        });
        
        // Handle non-JSON or error responses gracefully to avoid "unexpected token" errors
        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || !contentType.includes("application/json")) {
            const errorBody = await response.text();
            console.error("Non-JSON response received:", errorBody);
            throw new Error(`Cloud connection error: ${response.status}. Please ensure the registry node is online.`);
        }

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

            // Populate UI with prioritized Enterprise Name
            document.getElementById('display-product-name').textContent = latest.productName || "Verified Poultry";
            document.getElementById('display-weight').textContent = latest.productWeight ? `${latest.productWeight} kg` : "N/A";
            document.getElementById('display-producer').textContent = resolveName(latest);
            document.getElementById('display-description').textContent = latest.productDescription || "This product has been cryptographically verified via ChickChain.";
            document.getElementById('display-batch-id').textContent = id;

            const topCerts = document.getElementById('top-certificates');
            if (topCerts) {
                topCerts.innerHTML = 
                    renderIPFSLink(latest.vaccineCertCID, "Health Cert", "bg-emerald-50 text-emerald-700 border-emerald-100") +
                    renderIPFSLink(latest.halalSlaughterCertCID, "Slaughter VC", "bg-amber-50 text-amber-700 border-amber-100") +
                    renderIPFSLink(latest.halalProducerCertCID, "Process VC", "bg-purple-50 text-purple-700 border-purple-100");
            }

            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID not found in the blockchain registry.");
        }
    } catch (err) {
        if (loading) loading.classList.add('hidden');
        if (error) {
            error.classList.remove('hidden');
            document.getElementById('error-text').textContent = err.message;
        }
    }
}

/**
 * Rendering Logic for the Provenance Timeline
 */
function renderTimeline(data) {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.innerHTML = '';
    
    let farmShown = false, slaughterShown = false, transformationShown = false;

    data.forEach((item, index) => {
        const rec = item.record;
        
        // Skip intermediate "received" events if a transformation immediately follows for cleaner UX
        if (index < data.length - 1) {
            const nextRec = data[index + 1].record;
            if (rec.currentOwnerOrg === 'Org5MSP' && nextRec.transformedFromID && !rec.transformedFromID) {
                return; 
            }
        }

        const eventEl = document.createElement('div');
        eventEl.className = 'relative pl-10 pb-12 border-l-2 border-gray-100 last:border-0 ml-2 z-10 group';

        let stageTitle = "Ledger Update", metaHtml = "", certsHtml = "";
        let iconColor = "bg-gray-200";

        if (!farmShown && rec.harvestDate) {
            stageTitle = "Certified Harvest";
            iconColor = "bg-emerald-500 shadow-lg shadow-emerald-50";
            certsHtml = renderIPFSLink(rec.vaccineCertCID, "Health Record", "bg-emerald-50 text-emerald-700 border-emerald-100 mt-4");
            metaHtml = `<div class="mt-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">Origin: ${rec.origin || 'Source Farm'}</div>`;
            farmShown = true;
        } else if (!slaughterShown && rec.slaughterDetails) {
            stageTitle = "Processing & Halal";
            iconColor = "bg-amber-500 shadow-lg shadow-amber-50";
            certsHtml = renderIPFSLink(rec.halalSlaughterCertCID, "Halal Slaughter Cert", "bg-amber-50 text-amber-700 border-amber-100 mt-4");
            metaHtml = `<p class="text-xs font-semibold text-gray-600 italic mt-3">"${rec.slaughterDetails}"</p>`;
            slaughterShown = true;
        } else if (!transformationShown && rec.transformedFromID) {
            stageTitle = "SKU Transformation";
            iconColor = "bg-purple-600 shadow-lg shadow-purple-50";
            certsHtml = renderIPFSLink(rec.halalProducerCertCID, "Halal Process Cert", "bg-purple-50 text-purple-700 border-purple-100 mt-4");
            metaHtml = `<p class="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-tight">${rec.productName} ready for retail</p>`;
            transformationShown = true;
        } else {
            const status = (rec.status || "").toUpperCase();
            if (status === 'IN_TRANSIT') {
                stageTitle = "Dispatched";
                iconColor = "bg-blue-500";
                metaHtml = `<p class="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-tighter">Shipped to ${rec.intendedOwnerName || 'Partner Node'}</p>`;
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

// Initial trigger
const assetId = getAssetId();
fetchTraceData(assetId);
