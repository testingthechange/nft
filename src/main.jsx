import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const capabilities = [
  { number: "01", title: "Album provenance", description: "Trace an album copy to its unique digital ownership record." },
  { number: "02", title: "Collectible verification", description: "A secure registry connecting collectible keys to original burned NFTs." },
  { number: "03", title: "Wallet ownership", description: "A future home for verifying exported assets and their current owners." },
];

function App() {
  return <div className="site">
    <header className="header"><a className="brand" href="/" aria-label="Ajine NFT home"><span className="brand-symbol">A</span><span>AJINE <strong>NFT</strong></span></a><span className="header-note">PROVENANCE PLATFORM</span></header>
    <main><section className="hero"><div className="eyebrow"><span className="status-dot" /> DIGITAL OWNERSHIP · AUTHENTICITY · MUSIC</div><h1>Every copy<br/>has a <em>story.</em></h1><p className="lead">A new standard for music album ownership and collectible provenance. Built to connect every original copy, NFT, and authenticated collectible.</p><div className="hero-actions"><a className="button" href="#platform">Explore the platform <span aria-hidden="true">↗</span></a><span className="coming">Platform in development</span></div></section><section id="platform" className="platform"><div className="section-head"><span className="section-label">THE PLATFORM</span><h2>Ownership with a history.</h2></div><div className="cards">{capabilities.map(c => <article className="card" key={c.number}><span className="number">{c.number}</span><h3>{c.title}</h3><p>{c.description}</p></article>)}</div></section><section className="footer-panel"><span className="section-label">AJINE ECOSYSTEM</span><p>Music. Collectibles. Verifiable provenance.</p><span className="muted">Verification, wallet connections, and marketplace features are coming soon.</span></section></main><footer><span>© {new Date().getFullYear()} AJINE NFT</span><span>Built for the next generation of ownership.</span></footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
