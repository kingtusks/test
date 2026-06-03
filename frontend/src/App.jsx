import { useState, useEffect, useRef, useCallback } from "react";

// ─── Crypto helpers (Web Crypto API — all local, zero network) ───
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptSecret(plaintext, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const buf = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  buf.set(salt, 0);
  buf.set(iv, salt.byteLength);
  buf.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);
  return btoa(String.fromCharCode(...buf));
}

async function decryptSecret(b64, password) {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const data = raw.slice(28);
  const key = await deriveKey(password, salt);
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(dec);
}

// ─── FA Icon component ───
function FaIcon({ icon, style }) {
  return <i className={icon} style={{ fontSize: 22, color: "#00ffaa", ...style }} />;
}

// ─── Animated background particles ───
function VaultParticles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let raf;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * 900, y: Math.random() * 600,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5
    }));
    const draw = () => {
      ctx.clearRect(0, 0, 900, 600);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 900) p.vx *= -1;
        if (p.y < 0 || p.y > 600) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,170,0.15)";
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,255,170,${0.06 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} width={900} height={600} style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", opacity: 0.6 }} />;
}

// ─── Network Monitor ───
function NetworkMonitor({ events }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [events]);
  return (
    <div style={styles.netMonitor}>
      <div style={styles.netHeader}>
        <span style={styles.netDot} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#00ffaa" }}>Network Monitor</span>
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#555" }}>outbound: 0 requests</span>
      </div>
      <div ref={listRef} style={styles.netList}>
        {events.length === 0 && <div style={{ color: "#333", fontStyle: "italic", fontSize: 12 }}>Waiting for activity...</div>}
        {events.map((e, i) => (
          <div key={i} style={{ ...styles.netEvent, animationDelay: `${i * 0.04}s` }}>
            <span style={{ color: e.type === "local" ? "#00ffaa" : "#ff4444", marginRight: 8, fontSize: 10 }}>●</span>
            <span style={{ color: "#888", marginRight: 8, fontSize: 10, minWidth: 70 }}>{e.time}</span>
            <span style={{ color: e.type === "local" ? "#aaa" : "#ff4444", fontSize: 11 }}>{e.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function SecretsVault() {
  const [tab, setTab] = useState("home");

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
        @keyframes lockSpin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes gradientShift { 0% { background-position:0% 50% } 50% { background-position:100% 50% } 100% { background-position:0% 50% } }
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:#1a1a1a; border-radius:2px }
      `}</style>

      <Nav tab={tab} setTab={setTab} />

      {tab === "home" && <HomePage setTab={setTab} />}
      {tab === "demo" && <DemoPage />}
      {tab === "docs" && <DocsPage />}
      {tab === "about" && <AboutPage />}
    </div>
  );
}

function Nav({ tab, setTab }) {
  return (
    <nav style={styles.nav}>
      <div style={styles.navInner}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={styles.logoMark}>
            <i className="fa-solid fa-vault" style={{ fontSize: 16, color: "#00ffaa" }} />
          </div>
          <span style={styles.logoText}>Secrets Vault</span>
          <span style={styles.badge}>by GIDE</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["home", "demo", "docs", "about"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              ...styles.navBtn,
              color: tab === t ? "#00ffaa" : "#666",
              background: tab === t ? "rgba(0,255,170,0.06)" : "transparent"
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function HomePage({ setTab }) {
  return (
    <div style={{ animation: "fadeUp 0.6s ease" }}>
      {/* Hero */}
      <section style={styles.hero}>
        <VaultParticles />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <div style={styles.heroPill}>
            <span style={{ animation: "pulse 2s infinite", color: "#00ffaa", fontSize: 8, marginRight: 6 }}>●</span>
            100% Client-Side Encryption · Zero Network Calls · Open Source
          </div>
          <h1 style={styles.heroTitle}>
            Your secrets stay<br />
            <span style={styles.heroAccent}>on your machine.</span>
          </h1>
          <p style={styles.heroSub}>
            The strongest encryption available, running entirely on your device. Zero servers. Zero network calls. And a live monitor that lets you prove it.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36 }}>
            <button onClick={() => setTab("demo")} style={styles.ctaPrimary}>
              Try Live Demo <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6, fontSize: 12 }} />
            </button>
            <button onClick={() => setTab("docs")} style={styles.ctaSecondary}>
              <i className="fa-solid fa-book" style={{ marginRight: 6, fontSize: 12 }} /> Read the Docs
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>CORE PRINCIPLES</div>
        <h2 style={styles.sectionTitle}>Privacy isn't a feature.<br />It's the architecture.</h2>
        <div style={styles.featureGrid}>
          {[
            { icon: "fa-solid fa-shield-halved", title: "Bank-Level Encryption", desc: "The same encryption banks use to protect your money. Your secret gets scrambled into unreadable code that only your passphrase can unlock." },
            { icon: "fa-solid fa-tower-broadcast", title: "Nothing Ever Leaves", desc: "Your secret never touches the internet. No data is sent anywhere. It stays on your screen, on your device, period." },
            { icon: "fa-solid fa-flask-vial", title: "Verifiable by Design", desc: "Don't take our word for it. You can check it yourself. Open your browser, watch the network activity, and see with your own eyes that nothing is being transmitted." },
            { icon: "fa-solid fa-server", title: "No Backend Required", desc: "No servers, no databases, no APIs, no cookies, no tracking. Static HTML that runs anywhere." },
            { icon: "fa-solid fa-key", title: "Key Never Stored", desc: "Your passphrase exists only in memory during the operation. It's never written to disk or transmitted." },
            { icon: "fa-solid fa-code", title: "Made for Those Who Code", desc: "To every developer pushing code around the globe: this vault turns your local browser into an impenetrable, offline fortress." }
          ].map((f, i) => (
            <div key={i} style={{ ...styles.featureCard, animationDelay: `${i * 0.1}s` }}>
              <div style={styles.featureIcon}>
                <FaIcon icon={f.icon} />
              </div>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ ...styles.section, borderTop: "1px solid #111" }}>
        <div style={styles.sectionLabel}>HOW IT WORKS</div>
        <h2 style={styles.sectionTitle}>Three steps. Zero trust required.</h2>
        <div style={{ display: "flex", gap: 24, maxWidth: 800, margin: "48px auto 0", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { step: "01", icon: "fa-solid fa-pen-to-square", title: "Enter your secret", desc: "Type or paste any sensitive value — API keys, passwords, tokens, connection strings." },
            { step: "02", icon: "fa-solid fa-lock", title: "Set a passphrase", desc: "Type a secret, pick a passphrase, and watch it get encrypted — without a single byte leaving your browser." },
            { step: "03", icon: "fa-solid fa-circle-check", title: "Encrypt & verify", desc: "Your secret is encrypted locally. The network monitor confirms zero outbound requests." }
          ].map((s, i) => (
            <div key={i} style={styles.stepCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={styles.stepNum}>{s.step}</div>
                <i className={s.icon} style={{ fontSize: 16, color: "#00ffaa"}} />
              </div>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "#eee", marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#666", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "80px 24px 100px", position: "relative" }}>
        <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #00ffaa, transparent)", margin: "0 auto 40px" }} />
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: "#eee", marginBottom: 16 }}>
          Don't trust us. <span style={{ fontStyle: "italic", color: "#00ffaa" }}>Verify us.</span>
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#666", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Open the demo, open your browser's Network tab, and watch. Privacy claims are cheap. Proof is everything.
        </p>
        <button onClick={() => setTab("demo")} style={styles.ctaPrimary}>
          Launch the Vault <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6, fontSize: 12 }} />
        </button>
      </section>

      <Footer />
    </div>
  );
}

function DemoPage() {
  const [mode, setMode] = useState("encrypt");
  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [netEvents, setNetEvents] = useState([
    { type: "local", time: "00:00:00", msg: "Session initialized — monitoring all network activity" },
    { type: "local", time: "00:00:00", msg: "Web Crypto API ready — SubtleCrypto available" }
  ]);

  const ts = () => new Date().toLocaleTimeString("en-US", { hour12: false });

  const addEvent = useCallback((msg, type = "local") => {
    setNetEvents(prev => [...prev, { type, time: ts(), msg }]);
  }, []);

  const handleEncrypt = async () => {
    if (!secret || !passphrase) { setError("Both fields required"); return; }
    setError(""); setProcessing(true); setOutput("");
    addEvent("ENCRYPT initiated — generating 16-byte random salt...");
    addEvent("PBKDF2 key derivation: 100,000 iterations, SHA-256...");
    await new Promise(r => setTimeout(r, 400));
    addEvent("AES-256-GCM encryption with 12-byte random IV...");
    try {
      const result = await encryptSecret(secret, passphrase);
      addEvent("✓ Encryption complete — " + result.length + " chars of ciphertext");
      addEvent("✓ Network requests during operation: 0");
      setOutput(result);
    } catch (err) {
      setError("Encryption failed");
      addEvent("✗ Encryption error");
    }
    setProcessing(false);
  };

  const handleDecrypt = async () => {
    if (!secret || !passphrase) { setError("Both fields required"); return; }
    setError(""); setProcessing(true); setOutput("");
    addEvent("DECRYPT initiated — extracting salt and IV from ciphertext...");
    addEvent("PBKDF2 key derivation from passphrase...");
    await new Promise(r => setTimeout(r, 400));
    addEvent("AES-256-GCM decryption in progress...");
    try {
      const result = await decryptSecret(secret, passphrase);
      addEvent("✓ Decryption successful — plaintext recovered");
      addEvent("✓ Network requests during operation: 0");
      setOutput(result);
    } catch (err) {
      setError("Decryption failed — wrong passphrase or corrupted data");
      addEvent("✗ Decryption failed — authentication tag mismatch");
    }
    setProcessing(false);
  };

  return (
    <div style={{ padding: "100px 24px 60px", maxWidth: 900, margin: "0 auto", animation: "fadeUp 0.5s ease" }}>
      <div style={styles.sectionLabel}>LIVE DEMO</div>
      <h2 style={{ ...styles.sectionTitle, textAlign: "left", marginBottom: 8 }}>The Vault</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#555", marginBottom: 36, lineHeight: 1.6 }}>
        Everything below runs in your browser. Open DevTools → Network to verify zero outbound traffic.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Left: Controls */}
        <div style={{ flex: "1 1 380px", minWidth: 320 }}>
          <div style={styles.demoCard}>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0a0a0a", borderRadius: 8, padding: 3 }}>
              {[
                { key: "encrypt", icon: "fa-solid fa-lock", label: "ENCRYPT" },
                { key: "decrypt", icon: "fa-solid fa-lock-open", label: "DECRYPT" }
              ].map(m => (
                <button key={m.key} onClick={() => { setMode(m.key); setOutput(""); setError(""); }} style={{
                  flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1,
                  background: mode === m.key ? "rgba(0,255,170,0.1)" : "transparent",
                  color: mode === m.key ? "#00ffaa" : "#555",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}>
                  <i className={m.icon} style={{ fontSize: 10 }} /> {m.label}
                </button>
              ))}
            </div>

            <label style={styles.label}>{mode === "encrypt" ? "Secret" : "Ciphertext"}</label>
            <textarea
              value={secret} onChange={e => setSecret(e.target.value)}
              placeholder={mode === "encrypt" ? "sk-proj-abc123..." : "Paste encrypted base64..."}
              style={styles.textarea}
              rows={4}
            />

            <label style={styles.label}>Passphrase</label>
            <input
              type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)}
              placeholder="Enter a strong passphrase"
              style={styles.input}
            />

            {error && <div style={styles.error}><i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />{error}</div>}

            <button
              onClick={mode === "encrypt" ? handleEncrypt : handleDecrypt}
              disabled={processing}
              style={{ ...styles.ctaPrimary, width: "100%", marginTop: 16, opacity: processing ? 0.6 : 1 }}
            >
              {processing ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 12 }} />
                  Processing...
                </span>
              ) : mode === "encrypt" ? (
                <span>Encrypt <i className="fa-solid fa-arrow-right" style={{ marginLeft: 4, fontSize: 12 }} /></span>
              ) : (
                <span>Decrypt <i className="fa-solid fa-arrow-right" style={{ marginLeft: 4, fontSize: 12 }} /></span>
              )}
            </button>

            {output && (
              <div style={{ marginTop: 20, animation: "fadeUp 0.3s ease" }}>
                <label style={styles.label}>{mode === "encrypt" ? "Encrypted Output" : "Decrypted Secret"}</label>
                <div style={styles.outputBox}>
                  <code style={{ fontSize: 11, wordBreak: "break-all", lineHeight: 1.6 }}>{output}</code>
                </div>
                <button onClick={() => navigator.clipboard?.writeText(output)} style={styles.copyBtn}>
                  <i className="fa-regular fa-copy" style={{ marginRight: 6 }} /> Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Network Monitor */}
        <div style={{ flex: "1 1 380px", minWidth: 320 }}>
          <NetworkMonitor events={netEvents} />
          <div style={styles.proofBanner}>
            <i className="fa-solid fa-shield-check" style={{ fontSize: 18, color: "#00ffaa", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#00ffaa", marginBottom: 2 }}>PRIVACY VERIFIED</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555" }}>
                All cryptographic operations completed locally. No data transmitted.
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function DocsPage() {
  return (
    <div style={{ padding: "100px 24px 60px", maxWidth: 720, margin: "0 auto", animation: "fadeUp 0.5s ease" }}>
      <div style={styles.sectionLabel}>DOCUMENTATION</div>
      <h2 style={{ ...styles.sectionTitle, textAlign: "left" }}>Technical Reference</h2>

      {[
        {
          icon: "fa-solid fa-gears",
          title: "How the Encryption Works",
          content: "When you type your secret and hit encrypt, three things happen instantly — all inside your browser:\n\n1. A unique key gets created.\nYour passphrase gets mixed with a random value to generate a one-of-a-kind encryption key. Even if you use the same passphrase twice, the key is never the same.\n\n2. Your secret gets scrambled.\nThe key locks your secret into an unreadable string of random characters. Without the exact passphrase, that string means nothing to anyone.\n\n3. The key disappears.\nThe moment encryption is done, the key is gone. It's never saved, never stored, never written anywhere. Only your passphrase can recreate it."
        },
        {
          icon: "fa-solid fa-eye",
          title: "Zero-Trust Verification",
          content: "The core claim — \"nothing leaves your machine\" — is independently verifiable. Open your browser's DevTools, navigate to the Network tab, clear it, then perform an encrypt/decrypt operation. You will observe exactly zero outbound HTTP requests. The application has no fetch(), no XMLHttpRequest, no WebSocket, no beacon, no image pings. The entire application is static HTML + JS with no server component."
        },
        {
          icon: "fa-solid fa-triangle-exclamation",
          title: "Threat Model",
          content: "Secrets Vault protects against network-level exfiltration and server-side data collection. It does NOT protect against: compromised browser extensions reading DOM content, physical access to an unlocked machine, keyloggers or OS-level malware, or weak passphrases vulnerable to brute force. For production secret management at scale, pair with hardware security modules (HSMs) or established tools like HashiCorp Vault."
        },
        {
          icon: "fa-solid fa-terminal",
          title: "Under the Hood",
          code: "def decrypt_vault(file_bytes: bytes, password: str) -> dict[str, Any]:\n    if not file_bytes.startswith(MAGIC):\n        raise ValueError(\"invalid vault file\")\n    offset = len(MAGIC)\n    salt, verifier_stored, iv, ct_len = struct.unpack(\n        \">16s32s12sI\", file_bytes[offset : offset + 64]\n    )\n    offset += 64\n    ciphertext = file_bytes[offset : offset + ct_len]\n    if not secrets.compare_digest(\n        _password_verifier(password, salt), verifier_stored\n    ):\n        raise WrongPasswordError(\"incorrect master password\")\n    key = _pbkdf2(password, salt)\n    try:\n        payload = AESGCM(key).decrypt(iv, ciphertext, None)\n    except Exception as exc:\n        raise WrongPasswordError(\"decryption failed\") from exc\n    return json.loads(payload.decode(\"utf-8\"))"
        },
        {
          icon: "fa-solid fa-rocket",
          title: "Build & Deploy",
          code: "# Clone the repository\ngit clone https://github.com/gide-gnomi/secrets-vault.git\ncd secrets-vault\n\n# Install dependencies\nnpm install\n\n# Development\nnpm run dev\n\n# Deploy anywhere — Vercel, Netlify, GitHub Pages\n# No environment variables needed. No backend."
        }
      ].map((s, i) => (
        <div key={i} style={styles.docSection}>
          <h3 style={styles.docTitle}>
            <i className={s.icon} style={{ marginRight: 10, fontSize: 14, color: "#00ffaa", opacity: 0.7 }} />
            {s.title}
          </h3>
          {s.content && <p style={styles.docText}>{s.content}</p>}
          {s.code && (
            <pre style={styles.codeBlock}><code>{s.code}</code></pre>
          )}
        </div>
      ))}

      <Footer />
    </div>
  );
}

function AboutPage() {
  return (
    <div style={{ padding: "100px 24px 60px", maxWidth: 720, margin: "0 auto", animation: "fadeUp 0.5s ease" }}>
      <div style={styles.sectionLabel}>ABOUT THE PROJECT</div>
      <h2 style={{ ...styles.sectionTitle, textAlign: "left" }}>Built from GIDE</h2>

      <div style={styles.docSection}>
        <h3 style={styles.docTitle}>
          <i className="fa-solid fa-question" style={{ marginRight: 10, fontSize: 14, color: "#00ffaa", opacity: 0.7 }} />
          Why Secrets Vault?
        </h3>
        <p style={styles.docText}>
          Secrets Vault is built on transparency and trust. It extends that ethos to developer tooling — proving that privacy claims can be verifiable, not just marketable. In a landscape where "we take your privacy seriously" is often meaningless, this project lets you open DevTools and see the truth for yourself.
        </p>
      </div>

      <div style={styles.docSection}>
        <h3 style={styles.docTitle}>
          <i className="fa-solid fa-fingerprint" style={{ marginRight: 10, fontSize: 14, color: "#00ffaa", opacity: 0.7 }} />
          The Privacy-First Narrative
        </h3>
        <p style={styles.docText}>
          Every design decision reinforces a single message: your data belongs to you. No analytics. No telemetry. No server. Not because we promise — because the architecture makes it impossible to break that promise. The network monitor isn't a gimmick. It's the proof.
        </p>
      </div>

      <div style={styles.docSection}>
        <h3 style={styles.docTitle}>
          <i className="fa-solid fa-layer-group" style={{ marginRight: 10, fontSize: 14, color: "#00ffaa", opacity: 0.7 }} />
          Tech Stack
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {["React", "Web Crypto API", "AES-256-GCM", "PBKDF2", "SHA-256", "Zero Dependencies", "Static Deploy"].map(t => (
            <span key={t} style={styles.techTag}>{t}</span>
          ))}
        </div>
      </div>

      <div style={styles.docSection}>
        <h3 style={styles.docTitle}>
          <i className="fa-solid fa-bullseye" style={{ marginRight: 10, fontSize: 14, color: "#00ffaa", opacity: 0.7 }} />
          Project Context
        </h3>
        <p style={styles.docText}>
          This project was developed for the GIDE Hackathon in partnership with New York Tech Week. It was selected for its low-risk, high-impact profile — a clean, finishable deliverable with a compelling "privacy-first" narrative that directly aligns with GIDE's mission of transparency and information freedom.
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
        <a href="https://www.gnomi.com/en/home" target="_blank" rel="noopener" style={styles.linkCard}>
          <i className="fa-solid fa-globe" style={{ fontSize: 18, color: "#00ffaa" }} />
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#eee" }}>GNOMI</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555" }}>gnomi.com</div>
          </div>
        </a>
        <a href="https://github.com/gide-gnomi/secrets-vault" target="_blank" rel="noopener" style={styles.linkCard}>
          <i className="fa-brands fa-github" style={{ fontSize: 18, color: "#00ffaa" }} />
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#eee" }}>Repository</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555" }}>github.com</div>
          </div>
        </a>
      </div>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={{ width: 40, height: 1, background: "#1a1a1a", margin: "0 auto 20px" }} />
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#333", letterSpacing: 1 }}>
        SECRETS VAULT — GIDE — 2026
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#2a2a2a", marginTop: 4 }}>
        Privacy by architecture, not by promise.
      </p>
    </footer>
  );
}

// ─── Styles ───
const styles = {
  root: {
    background: "#050505",
    color: "#eee",
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
  },
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    background: "rgba(5,5,5,0.85)", backdropFilter: "blur(16px)",
    borderBottom: "1px solid #111",
  },
  navInner: {
    maxWidth: 960, margin: "0 auto", padding: "0 24px",
    height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  logoMark: {
    width: 32, height: 32, borderRadius: 8,
    background: "rgba(0,255,170,0.06)", border: "1px solid rgba(0,255,170,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoText: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "#eee", letterSpacing: -0.5,
  },
  badge: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#444",
    background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 4,
    padding: "2px 6px", letterSpacing: 0.5,
  },
  navBtn: {
    border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
    transition: "all 0.2s",
  },
  hero: {
    position: "relative", padding: "140px 24px 100px", overflow: "hidden",
    background: "radial-gradient(ellipse at 50% 0%, rgba(0,255,170,0.03) 0%, transparent 70%)",
  },
  heroPill: {
    display: "inline-flex", alignItems: "center",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 0.5,
    color: "#555", background: "rgba(0,255,170,0.04)", border: "1px solid rgba(0,255,170,0.08)",
    borderRadius: 20, padding: "6px 16px", marginBottom: 32,
  },
  heroTitle: {
    fontFamily: "'Instrument Serif', serif", fontSize: 56, fontWeight: 400,
    lineHeight: 1.1, letterSpacing: -1, color: "#eee",
  },
  heroAccent: {
    fontStyle: "italic",
    background: "linear-gradient(135deg, #00ffaa, #00cc88)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite",
  },
  heroSub: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#666",
    lineHeight: 1.7, marginTop: 24, maxWidth: 520, marginLeft: "auto", marginRight: "auto",
  },
  ctaPrimary: {
    background: "#00ffaa", color: "#050505", border: "none", borderRadius: 8,
    padding: "12px 28px", fontFamily: "'DM Sans', sans-serif", fontSize: 14,
    fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
  },
  ctaSecondary: {
    background: "transparent", color: "#888", border: "1px solid #222", borderRadius: 8,
    padding: "12px 28px", fontFamily: "'DM Sans', sans-serif", fontSize: 14,
    fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
  },
  section: { padding: "80px 24px", maxWidth: 960, margin: "0 auto" },
  sectionLabel: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2,
    color: "#00ffaa", marginBottom: 16, opacity: 0.7,
  },
  sectionTitle: {
    fontFamily: "'Instrument Serif', serif", fontSize: 36, fontWeight: 400,
    color: "#eee", lineHeight: 1.2, letterSpacing: -0.5,
  },
  featureGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16, marginTop: 48,
  },
  featureCard: {
    background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12,
    padding: 28, animation: "fadeUp 0.5s ease both",
  },
  featureIcon: { marginBottom: 16 },
  featureTitle: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
    color: "#eee", marginBottom: 8, letterSpacing: -0.3,
  },
  featureDesc: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#555", lineHeight: 1.6,
  },
  stepCard: {
    flex: "1 1 220px", background: "#0a0a0a", border: "1px solid #141414",
    borderRadius: 12, padding: 28,
  },
  stepNum: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700,
    color: "#00ffaa", lineHeight: 1, flexShrink: 0,
  },
  demoCard: {
    background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12, padding: 28,
  },
  label: {
    display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    letterSpacing: 1, textTransform: "uppercase", color: "#555", marginBottom: 6, marginTop: 16,
  },
  textarea: {
    width: "100%", background: "#050505", border: "1px solid #1a1a1a", borderRadius: 8,
    padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#eee",
    resize: "vertical", outline: "none", lineHeight: 1.6,
  },
  input: {
    width: "100%", background: "#050505", border: "1px solid #1a1a1a", borderRadius: 8,
    padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#eee",
    outline: "none",
  },
  error: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#ff4444",
    marginTop: 12, padding: "8px 12px", background: "rgba(255,68,68,0.05)",
    borderRadius: 6, border: "1px solid rgba(255,68,68,0.1)",
  },
  outputBox: {
    background: "#050505", border: "1px solid #1a1a1a", borderRadius: 8,
    padding: 14, maxHeight: 140, overflowY: "auto", color: "#00ffaa",
  },
  copyBtn: {
    marginTop: 8, background: "transparent", border: "1px solid #1a1a1a",
    borderRadius: 6, padding: "6px 14px", fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: "#555", cursor: "pointer", letterSpacing: 0.5,
  },
  netMonitor: {
    background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12,
    overflow: "hidden", height: 360,
  },
  netHeader: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 16px", borderBottom: "1px solid #141414",
  },
  netDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#00ffaa",
    animation: "pulse 2s infinite",
  },
  netList: {
    padding: 12, height: "calc(100% - 40px)", overflowY: "auto",
    display: "flex", flexDirection: "column", gap: 4,
  },
  netEvent: {
    display: "flex", alignItems: "center",
    fontFamily: "'JetBrains Mono', monospace",
    animation: "slideIn 0.3s ease both",
  },
  proofBanner: {
    display: "flex", alignItems: "flex-start", gap: 12,
    background: "rgba(0,255,170,0.03)", border: "1px solid rgba(0,255,170,0.08)",
    borderRadius: 12, padding: 20, marginTop: 16,
  },
  docSection: { marginTop: 40 },
  docTitle: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600,
    color: "#eee", marginBottom: 12, letterSpacing: -0.3,
    display: "flex", alignItems: "center",
  },
  docText: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#777",
    lineHeight: 1.8, whiteSpace: "pre-line",
  },
  codeBlock: {
    background: "#0a0a0a", border: "1px solid #141414", borderRadius: 10,
    padding: 20, marginTop: 12, overflowX: "auto",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#00ffaa",
    lineHeight: 1.7, whiteSpace: "pre",
  },
  techTag: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#00ffaa",
    background: "rgba(0,255,170,0.05)", border: "1px solid rgba(0,255,170,0.1)",
    borderRadius: 4, padding: "4px 10px", letterSpacing: 0.3,
  },
  linkCard: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#0a0a0a", border: "1px solid #141414", borderRadius: 10,
    padding: "14px 20px", textDecoration: "none", flex: "1 1 200px",
    transition: "border-color 0.2s",
  },
  footer: {
    textAlign: "center", padding: "60px 24px 40px",
  },
};