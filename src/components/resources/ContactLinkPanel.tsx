import React, { useState, useEffect } from 'react';
import type { Resource } from '../../types/api';
import {
  resourcesApi,
  getResourceContactUrl,
  getResourceQrUrl,
  extractResourceTag,
  cacheResourceTag,
  uncacheResourceTag,
  extractResourceToken,
  qrApi,
} from '../../lib/api';
import { Surface, Button, Divider, Label, ConnectionMotif } from '../ui';
import { PingInQrCode } from '../qr/PingInQrCode';
import { buildTagQrUrl } from '../../lib/qr';
import {
  Link as LinkIcon,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Share2,
  Unlink,
  Plus,
  Tag,
} from 'lucide-react';
import { PingInSvgLogo } from '../brand/PingInLogo';
import { PairQrModal } from './PairQrModal';
import { UnpairQrModal } from './UnpairQrModal';
import { GenerateDigitalQrModal } from './GenerateDigitalQrModal';

export interface ContactLinkPanelProps {
  resource: Resource;
  onRefresh: () => void;
  onOpenQrModal: (customUrl?: string, customTag?: string) => void;
}

export const ContactLinkPanel: React.FC<ContactLinkPanelProps> = ({
  resource,
  onRefresh,
  onOpenQrModal,
}) => {
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrTheme, setQrTheme] = useState<'black' | 'white'>('black');

  // Modal states for QR pairing suite
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isUnpairModalOpen, setIsUnpairModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Active Tag state (with multi-source resolution: resource payload, cache, or lookup)
  const [activeTag, setActiveTag] = useState<string>(() => extractResourceTag(resource));

  const publicUrl = getResourceContactUrl(resource);
  const qrTargetUrl = getResourceQrUrl(resource, activeTag);
  const resId = resource.id || (resource as any)._id;

  // Sync and auto-discover tag if not in immediate resource object
  useEffect(() => {
    const directTag = extractResourceTag(resource);
    if (directTag) {
      setActiveTag(directTag);
      if (resId) cacheResourceTag(resId, directTag);
    } else {
      // Background attempt: check if resource has a public token that resolves to an assigned QR tag
      const token = extractResourceToken(resource);
      if (token && token.length >= 6) {
        qrApi
          .lookup(token)
          .then((res) => {
            if (res?.tagNumber && res.isAssigned) {
              setActiveTag(res.tagNumber);
              if (resId) cacheResourceTag(resId, res.tagNumber);
            }
          })
          .catch(() => {
            // Ignore if token is not a QR token
          });
      }
    }
  }, [resource, resId]);

  const handleCreateContactLink = async () => {
    setIsCreatingLink(true);
    try {
      await resourcesApi.createContactLink(resource.id);
      onRefresh();
    } catch (err) {
      console.error('Failed to create contact link', err);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration & Gateway Pane - Unified */}
        <div className="lg:col-span-2">
          <Surface>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-ink" />
                <h2 className="heading-md text-ink text-lg">
                  Public Contact Gateway
                </h2>
              </div>
              {activeTag && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-accent/10 border border-accent/20 text-ink text-[11px] font-semibold uppercase tracking-wider font-sans">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  STICKER LINKED • #{activeTag}
                </span>
              )}
            </div>

            {publicUrl ? (
              <div className="mt-5 space-y-6 font-sans">
                {/* Graphic Motif: Connection between Resource and Contact */}
                <div className="py-2.5 px-4 bg-bg/50 border border-border rounded-sm max-w-sm">
                  <ConnectionMotif
                    leftLabel="RESOURCE"
                    rightLabel="CONTACT"
                    variant="arrow"
                    active
                  />
                </div>

                <p className="body text-muted text-xs leading-relaxed">
                  Anyone who scans your QR code or navigates to this link can reach out to you privately without seeing your phone number.
                </p>

                {/* URL Preview */}
                <div>
                  <Label>Public Link URL</Label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      className="input !h-11 font-sans text-xs select-all flex-1"
                    />
                    <Button
                      variant={copied ? 'secondary' : 'primary'}
                      onClick={handleCopyLink}
                      leftIcon={copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button
                        variant="secondary"
                        rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                      >
                        Visit
                      </Button>
                    </a>
                  </div>
                </div>

                <Divider className="my-5" />

                {/* Physical Tag & Sticker Pairing Section (Merged) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-ink" />
                      <h3 className="font-semibold text-ink text-sm">
                        Physical Tag &amp; Sticker Pairing
                      </h3>
                    </div>
                  </div>

                  {activeTag ? (
                    <div className="p-4 border border-border bg-surface/50 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-sm bg-ink text-surface flex items-center justify-center font-mono font-bold text-base shrink-0">
                          <QrCode className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-ink tracking-wider">
                              #{activeTag}
                            </span>
                            <span className="px-2 py-0.5 rounded-xs bg-bg border border-border text-[10px] font-semibold uppercase tracking-wider text-muted">
                              ASSIGNED
                            </span>
                          </div>
                          <span className="text-muted block mt-0.5">
                            Physical sticker linked to this resource. Scans will connect to you directly.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          onClick={() => onOpenQrModal(qrTargetUrl, activeTag)}
                          className="!h-9 text-xs"
                          leftIcon={<Share2 className="h-3.5 w-3.5" />}
                        >
                          Share QR
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setIsPairModalOpen(true)}
                          className="!h-9 text-xs"
                        >
                          Replace Tag
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setIsUnpairModalOpen(true)}
                          className="!h-9 text-xs"
                          leftIcon={<Unlink className="h-3.5 w-3.5" />}
                        >
                          Unpair
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-border bg-surface/30 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div>
                        <h4 className="font-semibold text-ink text-sm flex items-center gap-1.5">
                          <QrCode className="h-4 w-4 text-muted" />
                          <span>No Physical Sticker Linked</span>
                        </h4>
                        <p className="text-muted mt-1 leading-relaxed text-xs">
                          Link a preprinted Kauntact windshield sticker or generate a new digital QR tag code for this resource.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          onClick={() => setIsGenerateModalOpen(true)}
                          className="!h-9 text-xs font-medium"
                          leftIcon={<Plus className="h-3.5 w-3.5" />}
                        >
                          Generate Digital
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => setIsPairModalOpen(true)}
                          className="!h-9 text-xs font-semibold"
                          leftIcon={<QrCode className="h-3.5 w-3.5" />}
                        >
                          Pair Physical Sticker
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Divider className="my-5" />

                {/* Privacy Architecture Notice */}
                <div className="flex items-start gap-3 pt-1">
                  <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-ink text-sm">
                      Privacy by Design
                    </h4>
                    <p className="body-sm text-muted mt-1 leading-relaxed text-xs">
                      <PingInSvgLogo inline className="mr-1 text-ink" /> never transmits your personal phone number to visitors. When someone scans your QR code and submits a contact request, our secure backend proxies the communication without disclosing private credentials.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-8 font-sans">
                <h3 className="heading-md text-ink">
                  Generating Gateway Link...
                </h3>
                <p className="body-sm text-muted max-w-sm mx-auto mt-1 mb-5 text-xs">
                  Contact links are bundled automatically with your registered vehicle or space.
                </p>
                <Button
                  variant="primary"
                  onClick={handleCreateContactLink}
                  isLoading={isCreatingLink}
                  leftIcon={<LinkIcon className="h-4 w-4" />}
                >
                  Sync Contact Link
                </Button>
              </div>
            )}
          </Surface>
        </div>

        {/* QR Sticker Physical Plate Preview (Controlled Black Surface) */}
        <div>
          <div className="bg-[#151513] text-[#f5f4ee] p-6 rounded-sm border border-[#151513] flex flex-col items-center text-center select-none sticky top-24 font-sans">
            <div className="flex items-center justify-between w-full pb-3 mb-4 border-b border-[#2a2a26]">
              <PingInSvgLogo height={12} className="text-white" />
              <div className="flex items-center gap-1 bg-[#1e1e1b] border border-[#2a2a26] p-0.5 rounded-xs text-[10px]">
                <button
                  type="button"
                  onClick={() => setQrTheme('black')}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    qrTheme === 'black'
                      ? 'bg-[#2a2a26] text-white font-medium shadow-xs'
                      : 'text-[#929087] hover:text-white'
                  }`}
                >
                  Black
                </button>
                <button
                  type="button"
                  onClick={() => setQrTheme('white')}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    qrTheme === 'white'
                      ? 'bg-[#2a2a26] text-white font-medium shadow-xs'
                      : 'text-[#929087] hover:text-white'
                  }`}
                >
                  White
                </button>
              </div>
            </div>

            {activeTag ? (
              <>
                {/* QR Plate in Selected Theme (Black / White) */}
                <div
                  className={`p-3 rounded-sm my-1 transition-colors ${
                    qrTheme === 'black'
                      ? 'bg-[#11110f] border border-[#2a2a26]'
                      : 'bg-white'
                  }`}
                >
                  <PingInQrCode
                    value={activeTag}
                    size={150}
                    fgColor={qrTheme === 'black' ? '#F5F4EE' : '#11110F'}
                    bgColor={qrTheme === 'black' ? '#11110F' : '#FFFFFF'}
                    includeMargin={true}
                    id="resource-qr-code-svg"
                  />
                </div>

                <span className="font-display font-medium text-xs tracking-[0.18em] uppercase text-white mt-3 block">
                  KAUNTACT
                </span>
                <span className="font-sans text-[10px] text-[#929087] uppercase tracking-wider block mb-1">
                  {resource.name}
                </span>

                <div className="w-full text-center mb-3">
                  <span className="font-mono text-xs text-white font-semibold inline-block px-2.5 py-0.5 bg-[#22221f] rounded-xs border border-[#33332d]">
                    TAG #{activeTag}
                  </span>
                  <span className="font-mono text-[10px] text-[#929087] block mt-1 break-all select-all">
                    {buildTagQrUrl(activeTag)}
                  </span>
                </div>

                <div className="w-full space-y-2 mt-2">
                  <Button
                    variant="secondary"
                    onClick={() => onOpenQrModal(buildTagQrUrl(activeTag), activeTag)}
                    className="w-full !border-[#33332d] !text-white hover:!bg-[#22221f] text-xs uppercase tracking-wider font-semibold cursor-pointer"
                    leftIcon={<QrCode className="h-3.5 w-3.5 text-accent" />}
                  >
                    SHARE / PRINT QR
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-[140px] h-[140px] border border-dashed border-[#2a2a26] rounded-sm flex flex-col items-center justify-center p-3 text-center my-2 bg-[#1a1a18]">
                  <QrCode className="w-8 h-8 text-[#929087]/40 mb-2" />
                  <span className="text-[11px] font-mono uppercase text-[#929087] font-semibold">
                    NO QR TAG LINKED
                  </span>
                  <span className="text-[10px] text-[#929087]/70 mt-1 leading-tight">
                    Windshield sticker or digital tag required
                  </span>
                </div>
                <p className="text-xs text-[#929087] max-w-[210px] mt-2 mb-4 leading-normal">
                  This resource has no QR code assigned. Pair a sticker or generate a digital tag below to display the QR code.
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    variant="primary"
                    onClick={() => setIsPairModalOpen(true)}
                    className="w-full !h-9 text-xs font-semibold"
                    leftIcon={<QrCode className="h-3.5 w-3.5" />}
                  >
                    Pair Physical Sticker
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="w-full !h-9 text-xs !border-[#33332d] !text-white hover:!bg-[#22221f]"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Generate Digital
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PairQrModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        initialResourceId={resId}
        onSuccess={(res) => {
          setIsPairModalOpen(false);
          const code = res.tag?.tagNumber;
          if (code) {
            setActiveTag(code);
            if (resId) cacheResourceTag(resId, code);
          }
          onRefresh();
        }}
      />

      <UnpairQrModal
        isOpen={isUnpairModalOpen}
        onClose={() => setIsUnpairModalOpen(false)}
        resourceId={resId}
        resourceName={resource.name}
        tagNumber={activeTag}
        onUnpaired={() => {
          setIsUnpairModalOpen(false);
          if (resId) uncacheResourceTag(resId);
          setActiveTag('');
          onRefresh();
        }}
      />

      <GenerateDigitalQrModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        resourceId={resId}
        resourceName={resource.name}
        onGenerated={(genRes) => {
          const code = genRes.tag?.tagNumber;
          if (code) {
            setActiveTag(code);
            if (resId) cacheResourceTag(resId, code);
          }
          onRefresh();
        }}
      />
    </>
  );
};

export default ContactLinkPanel;
