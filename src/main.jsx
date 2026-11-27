import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const capabilities = [
  { number: "01", title: "Album provenance", description: "Trace an album copy to its unique digital ownership record." },
  { number: "02", title: "Collectible verification", description: "A registry connecting collectible records to original burned NFTs." },
  { number: "03", title: "Wallet ownership", description: "A future home for verifying exported assets and their current owners." },
];

const pages = ["Home", "Commerce", "Provenance", "Burn Board", "Log In"];
const routes = { Home: "/", Commerce: "/commerce", Provenance: "/provenance", "Burn Board": "/burn-board", "Log In": "/login" };
function currentPage() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return pages.find(page => routes[page] === path) || "Home";
}
function BurnPolygonStatus() {
  const [status, setStatus] = useState("Not checked");
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      const response = await fetch("https://ajine-nft-api.onrender.com/api/nft/burn-board/polygon-status", {signal: AbortSignal.timeout(12000), credentials:"omit"});
      const data = await response.json();
      setStatus(response.ok && data.connected === true && data.chain_id === 80002 ? "Connected · Polygon Amoy · Block " + data.block_number : "Polygon Amoy not verified");
    } catch { setStatus("Polygon Amoy unavailable"); }
    finally { setBusy(false); }
  }
  return <div><p role="status">{status}</p><button className="button" type="button" disabled={busy} onClick={check}>{busy ? "Checking…" : "Check Polygon connection"}</button><p>Read-only connection. Burn execution disabled.</p></div>;
}
function App() {
  const [page, setPage] = useState(currentPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lookup, setLookup] = useState("");
  const [message, setMessage] = useState("");
  const [commerceTab, setCommerceTab] = useState("Buy");
  React.useEffect(() => {
    const onPop = () => { setPage(currentPage()); setMenuOpen(false); setMessage(""); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (target) => {
    window.history.pushState({}, "", routes[target]);
    setPage(target); setMenuOpen(false); setMessage("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const navLink = (target) => <a key={target} href={routes[target]} className={page === target ? "nav-link active" : "nav-link"} aria-current={page === target ? "page" : undefined} onClick={e => { e.preventDefault(); navigate(target); }}>{target}</a>;
  const scanner = <section className="scanner" aria-labelledby="scanner-title">
    <div className="scanner-copy"><span className="section-label">INSTANT PROVENANCE ACCESS</span><h2 id="scanner-title">Every collectible has a history. Find it.</h2><p>Scan a collectible QR code or enter its identification number to explore its provenance.</p><span className="scanner-note">Visual preview · Verification service not connected yet</span></div>
    <div className="scanner-panel"><div className="scan-frame" aria-hidden="true"><span className="scan-corners">⌗</span><span>QR VERIFICATION</span></div><button type="button" className="button scan-button" onClick={() => setMessage("Camera scanning is a visual preview. QR verification will be connected later.")}>◎ &nbsp; Scan QR code <span aria-hidden="true">↗</span></button><div className="or-label">OR LOOK UP AN ID</div><form className="lookup" onSubmit={e => { e.preventDefault(); setMessage(lookup.trim() ? "Lookup is not connected yet. No collectible data has been queried." : "Enter a collectible ID to continue."); }}><label className="sr-only" htmlFor="collectible-id">Collectible identification number</label><input id="collectible-id" placeholder="Enter collectible ID or Burn Number" value={lookup} onChange={e => setLookup(e.target.value)} /><button type="submit" aria-label="Look up collectible">→</button></form>{message && <p className="preview-message" role="status">{message}</p>}</div>
  </section>;
  return <div className="site">
    <header className="header"><a className="brand" href="/" aria-label="AJINE NFT home" onClick={e => { e.preventDefault(); navigate("Home"); }}><span className="brand-symbol">A</span><span>AJINE <strong>NFT</strong></span></a><nav className={menuOpen ? "nav open" : "nav"} aria-label="Main navigation">{pages.map(navLink)}</nav><button className="menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "✕" : "☰"}</button></header>
    <main>{page === "Home" ? <><section className="hero"><div className="eyebrow"><span className="status-dot" /> DIGITAL OWNERSHIP · AUTHENTICITY · MUSIC</div><h1>Every copy<br/>has a <em>story.</em></h1><p className="lead">A new standard for music album ownership and collectible provenance. Built to connect every original copy, NFT, and authenticated collectible.</p><div className="hero-actions"><a className="button" href="#scanner-title">Verify a collectible <span aria-hidden="true">↗</span></a><span className="coming">Platform in development</span></div></section>{scanner}<section id="platform" className="platform"><div className="section-head"><span className="section-label">THE PLATFORM</span><h2>Ownership with a history.</h2></div><div className="cards">{capabilities.map(c => <article className="card" key={c.number}><span className="number">{c.number}</span><h3>{c.title}</h3><p>{c.description}</p></article>)}</div></section><section className="footer-panel"><span className="section-label">AJINE ECOSYSTEM</span><p>Music. Collectibles. Verifiable provenance.</p><span className="muted">Verification, wallet connections, and marketplace features are coming soon.</span></section></> : page === "Burn Board" ? <><section className="inner-hero"><span className="section-label">AJINE NFT / PIPELINE 2</span><h1>Burn Board</h1><p className="lead">NFT burn requests and confirmation records.</p><BurnPolygonStatus /></section><section className="platform"><div className="section-head"><span className="section-label">BURN REGISTRY</span><h2>Burn records</h2></div><div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr>{["NFT / Copy","Burn type","Polygon transaction","Status","AJINE burn number","Confirmed date"].map(label => <th key={label} scope="col" style={{padding:"12px"}}>{label}</th>)}</tr></thead><tbody><tr><td colSpan={6} style={{padding:"24px"}}>No burn records connected.</td></tr></tbody></table></div></section></> : page === "Provenance" ? <><section className="inner-hero"><span className="section-label">AJINE NFT / PROVENANCE</span><h1>Proof behind<br/><em>every story.</em></h1><p className="lead">Explore the original album copy, NFT history, and collectible provenance.</p></section>{scanner}</> : page === "Commerce" ? <><section className="inner-hero commerce-hero"><span className="section-label">AJINE NFT / COMMERCE</span><h1>Collect with<br/><em>confidence.</em></h1><p className="lead">A curated marketplace for authenticated music NFTs and Jingle collectibles.</p></section><section className="commerce-section" aria-labelledby="commerce-heading"><div className="commerce-heading"><div><span className="section-label">THE COLLECTOR MARKETPLACE</span><h2 id="commerce-heading">Buy. Sell. Post.</h2></div><span className="coming">Marketplace visual preview</span></div><div className="commerce-tabs" role="tablist" aria-label="Commerce options">{["Buy","Sell","Post"].map(tab => <button key={tab} type="button" role="tab" aria-selected={commerceTab === tab} className={commerceTab === tab ? "commerce-tab selected" : "commerce-tab"} onClick={() => setCommerceTab(tab)}>{tab}</button>)}</div><div className="commerce-detail" role="tabpanel">{commerceTab === "Buy" ? <><div className="commerce-art"><span className="commerce-art-mark">A</span><span>AUTHENTICATED COLLECTIBLES</span></div><div className="commerce-description"><span className="section-label">01 / DISCOVER</span><h3>Find your next rare piece.</h3><p>Explore verified NFTs and Jingle collectibles, review provenance, and connect with the AJINE sales team before purchasing.</p><span className="commerce-status">Listings and checkout coming soon</span></div></> : commerceTab === "Sell" ? <><div className="commerce-art"><span className="commerce-art-mark">◇</span><span>OWNER-VERIFIED RESALE</span></div><div className="commerce-description"><span className="section-label">02 / SELL</span><h3>Sell with provenance.</h3><p>Verify ownership, set an asking price, and let AJINE coordinate the buyer and seller experience. Your collectible stays with you until the sale is arranged.</p><span className="commerce-status">Seller verification coming soon</span></div></> : <><div className="commerce-art"><span className="commerce-art-mark">＋</span><span>CREATE A LISTING</span></div><div className="commerce-description"><span className="section-label">03 / POST</span><h3>Present your collectible.</h3><p>Post an authenticated NFT or Jingle with its images, collectible details, provenance, and asking price. AJINE will review listings before they go live.</p><span className="commerce-status">Posting and listing review coming soon</span></div></>}</div></section></> : <section className="inner-hero"><span className="section-label">AJINE NFT / {page.toUpperCase()}</span><h1>{page === "Commerce" ? <>Collect with<br/><em>confidence.</em></> : <>Your collection.<br/><em>Your story.</em></>}</h1><p className="lead">{page === "Commerce" ? "A curated marketplace for authenticated music collectibles." : "Your account and collectible inventory will live here."}</p><span className="coming">Platform in development</span></section>}</main>
    <footer><span>© {new Date().getFullYear()} AJINE NFT</span><span>Built for the next generation of ownership.</span></footer>
  </div>;
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
