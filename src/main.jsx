import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const capabilities = [
  { number: "01", title: "Album provenance", description: "Trace an album copy to its unique digital ownership record." },
  { number: "02", title: "Collectible verification", description: "A registry connecting collectible records to original burned NFTs." },
  { number: "03", title: "Wallet ownership", description: "A future home for verifying exported assets and their current owners." },
];

const pages = ["Home", "Commerce", "Provenance", "Log In"];
const routes = { Home: "/", Commerce: "/commerce", Provenance: "/provenance", "Log In": "/login" };
function currentPage() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return pages.find(page => routes[page] === path) || "Home";
}
function App() {
  const [page, setPage] = useState(currentPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lookup, setLookup] = useState("");
  const [message, setMessage] = useState("");
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
    <main>{page === "Home" ? <><section className="hero"><div className="eyebrow"><span className="status-dot" /> DIGITAL OWNERSHIP · AUTHENTICITY · MUSIC</div><h1>Every copy<br/>has a <em>story.</em></h1><p className="lead">A new standard for music album ownership and collectible provenance. Built to connect every original copy, NFT, and authenticated collectible.</p><div className="hero-actions"><a className="button" href="#scanner-title">Verify a collectible <span aria-hidden="true">↗</span></a><span className="coming">Platform in development</span></div></section>{scanner}<section id="platform" className="platform"><div className="section-head"><span className="section-label">THE PLATFORM</span><h2>Ownership with a history.</h2></div><div className="cards">{capabilities.map(c => <article className="card" key={c.number}><span className="number">{c.number}</span><h3>{c.title}</h3><p>{c.description}</p></article>)}</div></section><section className="footer-panel"><span className="section-label">AJINE ECOSYSTEM</span><p>Music. Collectibles. Verifiable provenance.</p><span className="muted">Verification, wallet connections, and marketplace features are coming soon.</span></section></> : page === "Provenance" ? <><section className="inner-hero"><span className="section-label">AJINE NFT / PROVENANCE</span><h1>Proof behind<br/><em>every story.</em></h1><p className="lead">Explore the original album copy, NFT history, and collectible provenance.</p></section>{scanner}</> : <section className="inner-hero"><span className="section-label">AJINE NFT / {page.toUpperCase()}</span><h1>{page === "Commerce" ? <>Collect with<br/><em>confidence.</em></> : <>Your collection.<br/><em>Your story.</em></>}</h1><p className="lead">{page === "Commerce" ? "A curated marketplace for authenticated music collectibles." : "Your account and collectible inventory will live here."}</p><span className="coming">Platform in development</span></section>}</main>
    <footer><span>© {new Date().getFullYear()} AJINE NFT</span><span>Built for the next generation of ownership.</span></footer>
  </div>;
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
