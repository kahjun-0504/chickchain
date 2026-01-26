'use strict';

/**
 * ChickChain Standalone Public Trace Script
 * Optimized for high-resolution identity mapping and supply chain storytelling.
 */

// CONFIGURATION: Update this URL for your Vercel deployment if API is on a different domain.
const API_URL = '/api/chicken/trace'; 
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
 * Hardcoded priority: Enterprise Name (Professional Brand) > Company Name > Owner Name (Network ID)
 */
function resolveName(rec) {
    if (!rec) return "Authorized Partner";
    // Priority 1: Enterprise name (The specific fix for the Farmer's correct display)
    if (rec.enterpriseName) return rec.enterpriseName;
    // Priority 2: Company name (Common for producers)
    if (rec.companyName) return rec.companyName;
    // Priority 3: Technical Network ID (Fallback)
    return rec.ownerName || "Network Participant";
}

/**
 * Helper to render IPFS documents as sleek action buttons
 */
function renderIPFSLink(cid, label, colorClass) {
    if (!cid || cid === "" || cid === "undefined") return '';
    return `
        <a href="${IPFS_GATEWAY}/${cid}" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tight border transition-all hover:bg-white hover:shadow-xl ${colorClass}">
            <svg class="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
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
            document.getElementById('error-text').textContent = "Input Required: Please scan a valid ChickChain QR code.";
        }
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

            // 1. Populate Main Identity Section
            document.getElementById('display-product-name').textContent = latest.productName || "Verified Poultry";
            document.getElementById('display-weight').textContent = latest.productWeight ? `${latest.productWeight} kg` : "N/A";
            document.getElementById('display-producer').textContent = resolveName(latest);
            document.getElementById('display-description').textContent = latest.productDescription || "This product has been cryptographically verified and tracked across the supply chain nodes.";
            document.getElementById('display-batch-id').textContent = id;

            // 2. Populate Header Certificate Buttons
            const topCerts = document.getElementById('top-certificates');
            if (topCerts) {
                topCerts.innerHTML = 
                    renderIPFSLink(latest.vaccineCertCID, "Farm Health VC", "bg-emerald-50 text-emerald-700 border-emerald-100") +
                    renderIPFSLink(latest.halalSlaughterCertCID, "Slaughter VC", "bg-amber-50 text-amber-700 border-amber-100") +
                    renderIPFSLink(latest.halalProducerCertCID, "Process VC", "bg-purple-50 text-purple-700 border-purple-100");
            }

            // 3. Generate Timeline
            renderTimeline(traceData);
        } else {
            throw new Error("Asset ID could not be resolved in the current ledger state.");
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
    
    let farmShown = false, slaughterShown = false, finalShown = false;

    data.forEach((item, index) => {
        const rec = item.record;
        const eventEl = document.createElement('div');
        eventEl.className = 'relative pl-12 pb-14 last:pb-0 z-10 group';

        let stageTitle = "System Update", metaHtml = "", certsHtml = "";
        let iconColor = "bg-slate-200";

        // Category Resolution Logic
        if (!farmShown && rec.harvestDate) {
            stageTitle = "Certified Origin Harvest";
            iconColor = "bg-emerald-500 shadow-lg shadow-emerald-100";
            certsHtml = renderIPFSLink(rec.vaccineCertCID, "View Vaccine Certificate", "bg-emerald-50 text-emerald-700 border-emerald-100 mt-3");
            metaHtml = `<div class="mt-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">Region: ${rec.origin || 'Source Farm'}</div>`;
            farmShown = true;
        } else if (!slaughterShown && rec.slaughterDetails) {
            stageTitle = "Controlled Processing";
            iconColor = "bg-amber-500 shadow-lg shadow-amber-100";
            certsHtml = renderIPFSLink(rec.halalSlaughterCertCID, "View Slaughter Halal Cert", "bg-amber-50 text-amber-700 border-amber-100 mt-3");
            metaHtml = `<p class="text-xs font-semibold text-slate-600 italic mt-2">"${rec.slaughterDetails}"</p>`;
            slaughterShown = true;
        } else if (rec.transformedFromID && !finalShown) {
            stageTitle = "Retail SKU Generation";
            iconColor = "bg-purple-600 shadow-lg shadow-purple-100";
            certsHtml = renderIPFSLink(rec.halalProducerCertCID, "View Product Halal Cert", "bg-purple-50 text-purple-700 border-purple-100 mt-3");
            metaHtml = `<p class="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-tight">${rec.productName} ready for market</p>`;
            finalShown = true;
        } else {
            const status = (rec.status || "").toUpperCase();
            if (status === 'IN_TRANSIT') {
                stageTitle = "Asset Logistics";
                iconColor = "bg-blue-500 shadow-md shadow-blue-100";
                metaHtml = `<p class="text-[10px] text-slate-400 mt-1 font-black uppercase tracking-tighter">Secure transport to Partner Node</p>`;
            } else if (status === 'RECEIVED') {
                stageTitle = "Ownership Acceptance";
                iconColor = "bg-emerald-400 shadow-md shadow-emerald-50";
                metaHtml = `<p class="text-[10px] text-slate-400 mt-1 font-black uppercase tracking-tighter">Verified receipt and handover</p>`;
            }
        }

        const dateStr = new Date(item.timestamp).toLocaleString(undefined, { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        eventEl.innerHTML = `
            <div class="absolute left-0 top-1.5 w-4 h-4 rounded-full ${iconColor} border-4 border-white z-20 transition-transform group-hover:scale-125"></div>
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

/**
 * Script Kickoff
 */
const assetId = getAssetId();
fetchTraceData(assetId);
