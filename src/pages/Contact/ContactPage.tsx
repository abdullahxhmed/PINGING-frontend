import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { PingInLogo, PingInSvgLogo } from '../../components/brand/PingInLogo';
import {
  Send,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  Mail,
  HelpCircle,
  Sparkles,
  Bug,
  Tag,
  ShieldCheck,
  Building2,
  ChevronDown
} from 'lucide-react';

const HELP_EMAIL = 'contact@findat.in';
const PERSONAL_EMAIL = 'abdahm550@gmail.com';

const INQUIRY_CATEGORIES = [
  { id: 'bug', label: 'Problem / Bug Report', icon: Bug, placeholder: 'Describe what happened, what device or browser you are using, and steps to reproduce...' },
  { id: 'suggestion', label: 'Suggestion / Feature Request', icon: Sparkles, placeholder: 'Share your idea! What would make Findat more useful for your everyday life?' },
  { id: 'tag_inquiry', label: 'Physical Tag / Sticker Inquiry', icon: Tag, placeholder: 'Ask about sticker durability, custom plate engraving, batch printing, or replacement tags...' },
  { id: 'privacy', label: 'Privacy & Security Question', icon: ShieldCheck, placeholder: 'Ask any question regarding our zero-knowledge phone relay or data handling policies...' },
  { id: 'account', label: 'Account & Login Assistance', icon: HelpCircle, placeholder: 'Describe the issue you encountered with OTP, phone number login, or profile settings...' },
  { id: 'partnership', label: 'Business & Partnerships', icon: Building2, placeholder: 'Interested in fleet tags, residential communities, or bulk integrations? Let us know...' },
  { id: 'other', label: 'Other General Inquiry', icon: Mail, placeholder: 'Write your message here...' },
];

export const ContactPage: React.FC = () => {
  const { user } = useAuth();

  const [category, setCategory] = useState(INQUIRY_CATEGORIES[0].id);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.mobileNumber ? `+91 ${user.mobileNumber}` : '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = INQUIRY_CATEGORIES.find((c) => c.id === category) || INQUIRY_CATEGORIES[0];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(HELP_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyMessage = () => {
    const formatted = buildEmailContent();
    navigator.clipboard.writeText(formatted.body);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const buildEmailContent = () => {
    const resolvedSubject = subject.trim()
      ? `[${selectedCategory.label}] ${subject.trim()}`
      : `[Findat Feedback] ${selectedCategory.label}`;

    const bodyLines = [
      `Category: ${selectedCategory.label}`,
      name.trim() ? `From: ${name.trim()}` : null,
      email.trim() ? `Contact: ${email.trim()}` : null,
      `Date: ${new Date().toLocaleString()}`,
      '',
      '--- MESSAGE ---',
      message.trim(),
      '',
      '----------------',
      'Sent via Findat Contact & Support Portal',
    ].filter(Boolean);

    return {
      subject: resolvedSubject,
      body: bodyLines.join('\n'),
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError('Please provide a message or description of your problem / suggestion.');
      return;
    }

    const { subject: mailSubject, body: mailBody } = buildEmailContent();

    // Construct primary mailto link directed to configured help email with CC to personal email
    const mailtoUri = `mailto:${HELP_EMAIL}?cc=${PERSONAL_EMAIL}&subject=${encodeURIComponent(
      mailSubject
    )}&body=${encodeURIComponent(mailBody)}`;

    // Trigger user mail client
    window.location.href = mailtoUri;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between selection:bg-accent selection:text-ink font-sans">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity" aria-label="Findat Home">
            <PingInLogo height={18} className="w-auto h-[18px] sm:h-[19px]" />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to={user ? '/dashboard' : '/'}
              className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold tracking-wider uppercase text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{user ? 'Dashboard' : 'Back'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Editorial Title Block */}
          <div className="space-y-3 border-b border-border pb-8">
            <div className="flex items-center gap-3">
              <span className="font-display font-medium text-2xl sm:text-3xl text-border leading-none select-none">
                01
              </span>
              <span className="text-border">/</span>
              <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted">
                FEEDBACK & HELP
              </span>
            </div>

            <h1 className="font-display font-medium text-4xl sm:text-5xl text-ink tracking-tight uppercase leading-[0.95]">
              GET IN TOUCH.
            </h1>

            <p className="font-sans text-sm sm:text-base text-muted leading-relaxed">
              Found a bug, have a suggestion for a feature, or have a question about your physical tags? Every message goes straight to our inbox.
            </p>
          </div>

          {/* ── CONTACT & FEEDBACK FORM ────────────────────────── */}
          <div className="bg-surface border border-border rounded-sm p-6 sm:p-8 space-y-6 shadow-xs">
            {submitted ? (
              <div className="py-6 space-y-6 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 text-ink flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-medium text-2xl text-ink uppercase tracking-tight">
                    Message Prepared
                  </h3>
                  <p className="text-sm font-sans text-muted max-w-md mx-auto leading-relaxed">
                    We've opened your device's email client to deliver this message directly to <strong className="text-ink">{HELP_EMAIL}</strong>.
                  </p>
                </div>

                {/* Fallback copy box in case mail client didn't launch automatically */}
                <div className="p-4 bg-bg border border-border rounded-sm text-left space-y-3">
                  <div className="flex items-center justify-between text-xs font-sans text-muted">
                    <span>Didn't launch automatically?</span>
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="inline-flex items-center gap-1 font-semibold text-ink hover:text-muted uppercase tracking-wider text-[11px] cursor-pointer"
                    >
                      {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMessage ? 'Copied' : 'Copy Message Body'}</span>
                    </button>
                  </div>

                  <div className="text-xs font-mono bg-surface p-3 rounded-xs border border-border/80 text-muted overflow-x-auto whitespace-pre-wrap max-h-36">
                    {buildEmailContent().body}
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="px-5 py-2.5 bg-surface border border-border text-ink rounded-sm text-xs font-sans font-semibold tracking-wider uppercase hover:border-ink transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>

                  <Link
                    to="/"
                    className="px-5 py-2.5 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-wider uppercase transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs font-sans rounded-sm">
                    {error}
                  </div>
                )}

                {/* 1. Category Dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="inquiry-category" className="block text-xs font-sans font-semibold tracking-wider uppercase text-ink">
                    Type of Problem or Suggestion
                  </label>

                  <div className="relative">
                    <select
                      id="inquiry-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-12 px-3.5 pr-10 bg-bg border border-border rounded-sm text-ink text-sm font-sans focus:outline-none focus:border-ink cursor-pointer transition-colors appearance-none"
                    >
                      {INQUIRY_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-surface text-ink">
                          {cat.label}
                        </option>
                      ))}
                    </select>

                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* 2. Sender Name & Contact (Both Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="sender-name" className="block text-xs font-sans font-semibold tracking-wider uppercase text-ink">
                      Your Name <span className="text-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      id="sender-name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-3.5 bg-bg border border-border rounded-sm text-ink text-sm font-sans focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="sender-email" className="block text-xs font-sans font-semibold tracking-wider uppercase text-ink">
                      Your Email or Phone <span className="text-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      id="sender-email"
                      type="text"
                      placeholder="you@example.com or phone"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-3.5 bg-bg border border-border rounded-sm text-ink text-sm font-sans focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>
                </div>

                {/* 3. Subject (Optional) */}
                <div className="space-y-1.5">
                  <label htmlFor="inquiry-subject" className="block text-xs font-sans font-semibold tracking-wider uppercase text-ink">
                    Subject Line <span className="text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    id="inquiry-subject"
                    type="text"
                    placeholder={`e.g. ${selectedCategory.label}`}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-11 px-3.5 bg-bg border border-border rounded-sm text-ink text-sm font-sans focus:outline-none focus:border-ink transition-colors"
                  />
                </div>

                {/* 4. Message Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="inquiry-message" className="block text-xs font-sans font-semibold tracking-wider uppercase text-ink">
                      Detailed Message
                    </label>
                    <span className="text-[11px] font-sans text-muted">
                      {message.length} characters
                    </span>
                  </div>

                  <textarea
                    id="inquiry-message"
                    rows={6}
                    placeholder={selectedCategory.placeholder}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full p-3.5 bg-bg border border-border rounded-sm text-ink text-sm font-sans focus:outline-none focus:border-ink transition-colors leading-relaxed resize-y min-h-[140px]"
                  />
                </div>

                {/* Submit / Deliver Button & Quick Email Copy */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-xs font-sans text-muted">
                    <span>Delivers to:</span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      title="Copy email"
                      className="font-mono text-ink font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{HELP_EMAIL}</span>
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-all shadow-xs cursor-pointer active:scale-[0.99] shrink-0"
                  >
                    <span>DELIVER MESSAGE</span>
                    <Send className="w-3.5 h-3.5 text-accent" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2.5">
            ©<PingInSvgLogo height={13} className="text-muted/70 hover:text-ink transition-colors" />
            <span className="text-border-strong">•</span>
            <span>Private contact made safe and seamless.</span>
          </div>
          <div className="flex items-center gap-4 text-muted">
            <Link to="/" className="hover:text-ink transition-colors">Home</Link>
            <span>•</span>
            <Link to="/contact" className="text-ink font-medium">Feedback</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
