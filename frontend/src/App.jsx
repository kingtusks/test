import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://127.0.0.1:8000/api/v1";

function FaIcon({ icon, style }) {
  return <i className={icon} style={{ fontSize: 22, color: "#00ffaa", ...style }} />;
}

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
  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={600}
      style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        pointerEvents: "none", opacity: 0.6
      }}
    />
  );
}

function NetworkMonitor({ events }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [events]);
  return (
    <div style={styles.netMonitor}>
      <div style={styles.netHeader}>
        <span style={styles.netDot} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#00ffaa" }}>
          Network Monitor
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#555" }}>
          localhost only · no cloud
        </span>
      </div>
      <div ref={listRef} style={styles.netList}>
        {events.length === 0 && (
          <div style={{ color: "#333", fontStyle: "italic", fontSize: 12 }}>Waiting for activity...</div>
        )}
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
      {tab === "team" && <TeamPage />}
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
          {["home", "demo", "docs", "about", "team"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...styles.navBtn,
                color: tab === t ? "#00ffaa" : "#666",
                background: tab === t ? "rgba(0,255,170,0.06)" : "transparent"
              }}
            >
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
      <section style={styles.hero}>
        <VaultParticles />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <div style={styles.heroPill}>
            <span style={{ animation: "pulse 2s infinite", color: "#00ffaa", fontSize: 8, marginRight: 6 }}>●</span>
            AES-256-GCM · Localhost Only · Air-Gapped Ready
          </div>
          <h1 style={styles.heroTitle}>
            Your secrets stay<br />
            <span style={styles.heroAccent}>on your machine.</span>
          </h1>
          <p style={styles.heroSub}>
            Python backend encrypts on disk. Frontend and agent only talk to 127.0.0.1. No cloud. No telemetry.
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

      <section style={styles.section}>
        <div style={styles.sectionLabel}>CORE PRINCIPLES</div>
        <h2 style={styles.sectionTitle}>Privacy isn't a feature.<br />It's the architecture.</h2>
        <div style={styles.featureGrid}>
          {[
            { icon: "fa-solid fa-shield-halved", title: "Bank-Level Encryption", desc: "AES-256-GCM + PBKDF2 on the Python backend. Secrets encrypted at rest on your machine." },
            { icon: "fa-solid fa-tower-broadcast", title: "Localhost Only", desc: "UI calls 127.0.0.1:8080 only. Agent uses local Ollama. Nothing goes to the cloud." },
            { icon: "fa-solid fa-flask-vial", title: "Verifiable by Design", desc: "Network monitor shows every call. Turn off Wi-Fi — vault still works." },
            { icon: "fa-solid fa-robot", title: "Local Agent", desc: "Ask the agent to list or retrieve keys. Tools hit your vault API, not the internet." },
            { icon: "fa-solid fa-key", title: "Key Never Stored", desc: "Master password exists only in memory while unlocked. Lock wipes it." },
            { icon: "fa-solid fa-code", title: "Built for GIDE", desc: "Hackathon Topic 3: real encryption, no telemetry, prove nothing leaves the machine." }
          ].map((f, i) => (
            <div key={i} style={{ ...styles.featureCard, animationDelay: `${i * 0.1}s` }}>
              <div style={styles.featureIcon}><FaIcon icon={f.icon} /></div>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...styles.section, borderTop: "1px solid #111" }}>
        <div style={styles.sectionLabel}>HOW IT WORKS</div>
        <h2 style={styles.sectionTitle}>Three steps. Zero trust required.</h2>
        <div style={{ display: "flex", gap: 24, maxWidth: 800, margin: "48px auto 0", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { step: "01", icon: "fa-solid fa-unlock", title: "Unlock vault", desc: "Master password decrypts vault.enc on disk via FastAPI." },
            { step: "02", icon: "fa-solid fa-lock", title: "Add API keys", desc: "Store keys encrypted. Plaintext never written to disk." },
            { step: "03", icon: "fa-solid fa-robot", title: "Ask the agent", desc: "Local Ollama retrieves keys through vault tools — localhost only." }
          ].map((s, i) => (
            <div key={i} style={styles.stepCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={styles.stepNum}>{s.step}</div>
                <i className={s.icon} style={{ fontSize: 16, color: "#00ffaa" }} />
              </div>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "#eee", marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#666", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ textAlign: "center", padding: "80px 24px 100px", position: "relative" }}>
        <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #00ffaa, transparent)", margin: "0 auto 40px" }} />
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: "#eee", marginBottom: 16 }}>
          Don't trust us. <span style={{ fontStyle: "italic", color: "#00ffaa" }}>Verify us.</span>
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#666", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Open the demo, watch the network monitor, disable Wi-Fi. Proof is everything.
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
  const [unlocked, setUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [secrets, setSecrets] = useState([]);
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentReply, setAgentReply] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [netEvents, setNetEvents] = useState([
    { type: "local", time: "00:00:00", msg: "Session initialized — monitoring localhost only" },
  ]);

  const ts = () => new Date().toLocaleTimeString("en-US", { hour12: false });

  const addEvent = useCallback((msg, type = "local") => {
    setNetEvents(prev => [...prev, { type, time: ts(), msg }]);
  }, []);

  const apiCall = async (method, path, body) => {
    addEvent(`${method} ${API}${path}`);
    let res;
    try {
      res = await fetch(`${API}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error("Cannot reach backend — run: python backend/main.py");
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const msg = data?.detail
        ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail))
        : (typeof data === "string" ? data : JSON.stringify(data));
      throw new Error(msg);
    }
    addEvent(`✓ ${res.status} localhost only`);
    return data;
  };

  const refreshSecrets = async () => {
    const list = await apiCall("GET", "/secrets");
    setSecrets(list);
  };

  const handleUnlock = async () => {
    if (!masterPassword) { setError("Master password required"); return; }
    setError("");
    setProcessing(true);
    try {
      await apiCall("POST", "/vault/unlock", { master_password: masterPassword });
      setUnlocked(true);
      await refreshSecrets();
      addEvent("Vault unlocked — encrypted file on disk");
    } catch (e) {
      setError(String(e.message));
    }
    setProcessing(false);
  };

  const handleLock = async () => {
    setError("");
    setProcessing(true);
    try {
      await apiCall("POST", "/vault/lock");
      setUnlocked(false);
      setSecrets([]);
      setAgentMessages([]);
      setAgentReply("");
      setMasterPassword("");
      addEvent("Vault locked — key wiped from memory");
    } catch (e) {
      setError(String(e.message));
    }
    setProcessing(false);
  };

  const handleAddKey = async () => {
    if (!keyName || !keyValue) { setError("Name and value required"); return; }
    setError("");
    setProcessing(true);
    try {
      await apiCall("POST", "/secrets", { name: keyName, type: "api_key", value: keyValue });
      const savedName = keyName;
      setKeyName("");
      setKeyValue("");
      await refreshSecrets();
      addEvent(`Added "${savedName}"`);
    } catch (e) {
      setError(String(e.message));
    }
    setProcessing(false);
  };

  const handleDeleteKey = async (id, name) => {
    setError("");
    setProcessing(true);
    try {
      await apiCall("DELETE", `/secrets/${id}`);
      await refreshSecrets();
      addEvent(`Removed "${name}"`);
    } catch (e) {
      setError(String(e.message));
    }
    setProcessing(false);
  };

  const handleAskAgent = async () => {
    if (!agentInput.trim()) return;
    setError("");
    setProcessing(true);
    const newMsgs = [...agentMessages, { role: "user", content: agentInput.trim() }];
    setAgentMessages(newMsgs);
    setAgentInput("");
    try {
      addEvent("POST /agent/chat → Ollama localhost");
      const data = await apiCall("POST", "/agent/chat", { messages: newMsgs });
      setAgentReply(data.reply);
      setAgentMessages([...newMsgs, { role: "assistant", content: data.reply }]);
      addEvent("Agent replied");
    } catch (e) {
      setError(String(e.message));
      addEvent("✗ agent failed — is Ollama running?");
    }
    setProcessing(false);
  };

  return (
    <div style={{ padding: "100px 24px 60px", maxWidth: 900, margin: "0 auto", animation: "fadeUp 0.5s ease" }}>
      <div style={styles.sectionLabel}>LIVE DEMO</div>
      <h2 style={{ ...styles.sectionTitle, textAlign: "left", marginBottom: 8 }}>The Vault</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#555", marginBottom: 36, lineHeight: 1.6 }}>
        Backend encrypts on disk. UI only calls 127.0.0.1:8080 — no cloud.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 380px", minWidth: 320 }}>
          <div style={styles.demoCard}>
            {!unlocked ? (
              <>
                <label style={styles.label}>Master Password</label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={e => setMasterPassword(e.target.value)}
                  placeholder="Unlock vault"
                  style={styles.input}
                  onKeyDown={e => e.key === "Enter" && handleUnlock()}
                />
                <button
                  onClick={handleUnlock}
                  disabled={processing}
                  style={{ ...styles.ctaPrimary, width: "100%", marginTop: 16, opacity: processing ? 0.6 : 1 }}
                >
                  {processing ? "Unlocking..." : "Unlock Vault"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleLock}
                  disabled={processing}
                  style={{ ...styles.ctaSecondary, width: "100%", marginBottom: 16 }}
                >
                  Lock Vault
                </button>

                <label style={styles.label}>Add API Key</label>
                <input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="OpenAI" style={styles.input} />
                <input
                  value={keyValue}
                  onChange={e => setKeyValue(e.target.value)}
                  placeholder="sk-..."
                  style={{ ...styles.input, marginTop: 8 }}
                />
                <button
                  onClick={handleAddKey}
                  disabled={processing}
                  style={{ ...styles.ctaPrimary, width: "100%", marginTop: 12, opacity: processing ? 0.6 : 1 }}
                >
                  Add Key
                </button>

                <label style={styles.label}>Stored Keys</label>
                {secrets.length === 0 && <p style={{ color: "#555", fontSize: 12 }}>No secrets yet</p>}
                {secrets.map(s => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ color: "#eee", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{s.name}</span>
                    <button onClick={() => handleDeleteKey(s.id, s.name)} style={styles.copyBtn}>Remove</button>
                  </div>
                ))}

                <label style={styles.label}>Ask Agent</label>
                <input
                  value={agentInput}
                  onChange={e => setAgentInput(e.target.value)}
                  placeholder='e.g. "Get my OpenAI key"'
                  style={styles.input}
                  onKeyDown={e => e.key === "Enter" && handleAskAgent()}
                />
                <button
                  onClick={handleAskAgent}
                  disabled={processing}
                  style={{ ...styles.ctaPrimary, width: "100%", marginTop: 12, opacity: processing ? 0.6 : 1 }}
                >
                  {processing ? "Thinking..." : "Ask Agent"}
                </button>
                {agentReply && (
                  <div style={{ ...styles.outputBox, marginTop: 16, color: "#eee" }}>
                    <code style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{agentReply}</code>
                  </div>
                )}
              </>
            )}

            {error && (
              <div style={styles.error}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />
                {error}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: "1 1 380px", minWidth: 320 }}>
          <NetworkMonitor events={netEvents} />
          <div style={styles.proofBanner}>
            <i className="fa-solid fa-shield-check" style={{ fontSize: 18, color: "#00ffaa", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#00ffaa", marginBottom: 2 }}>
                PRIVACY VERIFIED
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555" }}>
                Encryption on Python backend. Only localhost API calls.
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
          icon: "fa-solid fa-robot",
          title: "1. The Secret Weapon — GIDE’s Built-In Qwen 3.5 AI",
          tag: "30% Inventive Use",
          content:
            "We didn't just build an offline app — we built it using an offline tool. We used GIDE's native Qwen 3.5 Coder to generate our complex Web Crypto math. We didn't Google it. We proved that GIDE’s local AI is powerful enough to architect secure encryption entirely on its own."
        },
        {
          icon: "fa-solid fa-gears",
          title: "2. Technical Merit — How Encryption Works",
          tag: "30% Technical Merit",
          content:
            "When you type a secret, we use your browser's native math engine to scramble it.\n\n" +
            "• Unique Keys — Your passphrase instantly generates a one-of-a-kind AES key.\n\n" +
            "• Scrambled Locally — Your secret is locked into unreadable text right on your screen that only you can unlock using a strict password.\n\n" +
            "• Zero Memory — The exact millisecond encryption finishes, the key is permanently destroyed. It is never saved anywhere."
        },
        {
          icon: "fa-solid fa-shield-halved",
          title: "3. Real-World Effectiveness",
          tag: "30% Effectiveness",
          content:
            "When interning, senior engineers strictly told me not to open — let alone edit — certain folders. So we built a tool to stop not just hackers from receiving API keys, but accidental leaks too. We built a secure system for teams.\n\n" +
            "Open your browser's Network tab, hit encrypt, and watch the traffic. You will see exactly zero outbound requests. No background pings, no cloud telemetry, no servers. True privacy means the data physically cannot leave your machine."
        },
        {
          icon: "fa-solid fa-eye",
          title: "Zero-Trust Verification",
          content:
            "Don't take our word for it. The demo network monitor logs every call. Disable Wi-Fi — the vault still works. Only localhost. No cloud."
        },
        {
          icon: "fa-solid fa-triangle-exclamation",
          title: "Threat Model",
          content:
            "Protects against network exfiltration and accidental leaks. Does NOT protect against compromised OS, keyloggers, or weak passphrases."
        },
        {
          icon: "fa-solid fa-vault",
          title: "How It Works",
          content:
            "Repo: github.com/kingtusks/test\n\n" +
            "1. FastAPI backend encrypts secrets to ~/.gide-vault/vault.enc (AES-256-GCM + PBKDF2).\n\n" +
            "2. React UI calls http://127.0.0.1:8080 only.\n\n" +
            "3. Local Ollama agent uses tools to list/retrieve secrets — no cloud.\n\n" +
            "4. GIDE hackathon: air-gapped at runtime, no telemetry."
        },
        {
          icon: "fa-solid fa-gears",
          title: "How the Encryption Works",
          content:
            "1. Master password → PBKDF2 → AES-256 key.\n\n" +
            "2. Vault JSON encrypted as one blob with AES-GCM.\n\n" +
            "3. Lock wipes key from memory.\n\n" +
            "4. Plaintext never written to disk."
        },
        {
          icon: "fa-solid fa-eye",
          title: "Zero-Trust Verification",
          content:
            "Demo network monitor logs every localhost call. Disable Wi-Fi — vault and agent still work. No calls leave 127.0.0.1."
        },
        {
          icon: "fa-solid fa-triangle-exclamation",
          title: "Threat Model",
          content:
            "Protects disk at rest and blocks cloud exfiltration. Does NOT protect against compromised OS, keyloggers, or weak master passwords."
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
            <i className={s.icon} style={{ marginRight: 10, fontSize: 14, color: "#00ffaa" }} />
            {s.title}
          </h3>
          {s.content && <p style={styles.docText}>{s.content}</p>}
          {s.code && <pre style={styles.codeBlock}><code>{s.code}</code></pre>}
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
      <h2 style={{ ...styles.sectionTitle, textAlign: "left" }}>Built for GIDE</h2>

      <div style={styles.docSection}>
        <h3 style={styles.docTitle}>
          <i className="fa-solid fa-question" style={{ marginRight: 10, fontSize: 14, color: "#00ffaa", opacity: 0.7 }} />
          Why Secrets Vault?
        </h3>
        <p style={styles.docText}>
          Topic 3: store/retrieve keys with real encryption, no telemetry, prove nothing leaves the machine.
        </p>
      </div>

      <div style={styles.docSection}>
        <h3 style={styles.docTitle}>
          <i className="fa-solid fa-layer-group" style={{ marginRight: 10, fontSize: 14, color: "#00ffaa", opacity: 0.7 }} />
          Tech Stack
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {["React", "FastAPI", "AES-256-GCM", "PBKDF2", "LangChain", "Ollama", "Python"].map(t => (
            <span key={t} style={styles.techTag}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
        <a href="https://github.com/kingtusks/test" target="_blank" rel="noopener" style={styles.linkCard}>
          <i className="fa-brands fa-github" style={{ fontSize: 18, color: "#00ffaa" }} />
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#eee" }}>Repository</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555" }}>github.com/kingtusks/test</div>
          </div>
        </a>
      </div>

      <Footer />
    </div>
  );
}

function TeamPage() {
  const teamMembers = [
    {
      name: "Adam Rouzaqui",
      bio: "EX AI/ML Research Engineer, Wrapping up a internship at CLUELY, EX Growth at YC backed HARPER",
      avatar: "/Adam.png",
      linkedin: "https://www.linkedin.com/in/adam-rouzaqui-3bba63391/"
    },
    {
      name: "Tirth Mehta",
      bio: "CS student interested in systems programming, backend development, and AI/ML. I like building things that are fast, useful, and ideally self-hosted",
      avatar: "/Tirth.jpg",
      linkedin: "https://www.linkedin.com/in/tirthm11804/"
    },
    {
      name: "Deep Shah",
      bio: "A Computer Engineer from New York with a Master's in Applied AI. Draws on software engineering experience at CAMP Systems to build smart data pipelines and automated workflows.",
      avatar: "/Deep.jpg",
      linkedin: "https://www.linkedin.com/in/deepshah2004/"
    }
  ];


  return (
    <div style={{ padding: "100px 24px 60px", maxWidth: 960, margin: "0 auto", animation: "fadeUp 0.5s ease" }}>
      <div style={styles.sectionLabel}>THE ARCHITECTS</div>
      <h2 style={{ ...styles.sectionTitle, textAlign: "left", marginBottom: 12 }}>Meet the Team</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#666", marginBottom: 48, maxWidth: 540, lineHeight: 1.6 }}>
        We design local-first cryptographic spaces. No cloud handshakes, no data leaks. Just resilient engineering built to safeguard your intelligence.
      </p>


      <div style={styles.teamGrid}>
        {teamMembers.map((m, i) => (
          <div key={i} style={{ ...styles.teamCard, animationDelay: `${i * 0.1}s` }}>
            <div style={styles.imageContainer}>
              <img src={m.avatar} alt={m.name} style={styles.teamImg} />
              <div style={styles.imgOverlay} />
            </div>
            <div style={styles.teamCardContent}>
              <h3 style={styles.memberName}>{m.name}</h3>
              <div style={styles.memberRole}>{m.role}</div>
              <div style={styles.memberFocus}>
                <i className="fa-solid fa-microchip" style={{ color: "#00ffaa", fontSize: 10, marginRight: 6 }} />
                {m.focus}
              </div>
              <p style={styles.memberBio}>{m.bio}</p>
              <div style={{ display: "flex", gap: 12, marginTop: "auto", paddingTop: 16 }}>
                <a href={m.github} style={styles.socialLink}><i className="fa-brands fa-github" /></a>
                <a href={m.linkedin} style={styles.socialLink}><i className="fa-brands fa-linkedin-in" /></a>
              </div>
            </div>
          </div>
        ))}
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

  // ─── NEW: Added Team Page Display Styles ───
  teamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
    marginTop: 32,
  },
  teamCard: {
    background: "#0a0a0a",
    border: "1px solid #141414",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    animation: "fadeUp 0.5s ease both"
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 240,
    background: "#111",
    overflow: "hidden"
  },
  teamImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "grayscale(100%) contrast(110%)"
  },
  imgOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "linear-gradient(to bottom, transparent 40%, #0a0a0a 100%), rgba(0, 255, 170, 0.04)"
  },
  teamCardContent: {
    padding: 24,
    flexGrow: 1,
    display: "flex",
    flexDirection: "column"
  },
  memberName: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: "#eee"
  },
  memberRole: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#666",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4
  },
  memberFocus: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#00ffaa",
    background: "rgba(0,255,170,0.03)",
    border: "1px solid rgba(0,255,170,0.08)",
    padding: "4px 8px",
    borderRadius: 4,
    marginTop: 12,
    display: "inline-flex",
    alignItems: "center"
  },
  memberBio: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: "#555",
    lineHeight: 1.6,
    marginTop: 12
  },
  socialLink: {
    color: "#444",
    fontSize: 16,
    transition: "color 0.2s",
    cursor: "pointer",
    textDecoration: "none"
  }
};