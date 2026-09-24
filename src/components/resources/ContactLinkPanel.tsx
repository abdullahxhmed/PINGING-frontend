import React, { useState } from 'react';
import type { Resource } from '../../types/api';
import { resourcesApi, getResourceContactUrl } from '../../lib/api';
import { Surface, Button, Divider, Label, ConnectionMotif } from '../ui';
import { QRCodeSVG } from 'qrcode.react';
import {
  Link as LinkIcon,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Share2,
} from 'lucide-react';

export interface ContactLinkPanelProps {
  resource: Resource;
  onRefresh: () => void;
  onOpenQrModal: () => void;
}

export const ContactLinkPanel: React.FC<ContactLinkPanelProps> = ({
  resource,
  onRefresh,
  onOpenQrModal,
}) => {
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = getResourceContactUrl(resource);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Configuration & Gateway Pane */}
      <div className="lg:col-span-2">
        <Surface>
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-ink" />
              <h2 className="heading-md text-ink text-lg">
                Public Contact Gateway
              </h2>
            </div>
          </div>

          {publicUrl ? (
            <div className="mt-5 space-y-5">
              {/* Graphic Motif: Connection between Resource and Contact */}
              <div className="py-2.5 px-4 bg-bg/50 border border-border rounded-sm max-w-sm">
                <ConnectionMotif
                  leftLabel="RESOURCE"
                  rightLabel="CONTACT"
                  variant="arrow"
                  active
                />
              </div>

              <p className="body text-muted">
                Anyone who scans this QR code or navigates to this link can reach out to you privately without seeing your phone number.
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

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={onOpenQrModal}
                  leftIcon={<Share2 className="h-4 w-4" />}
                >
                  Share & Print QR Code
                </Button>
              </div>

              <Divider className="my-6" />

              {/* Privacy Architecture Notice */}
              <div className="flex items-start gap-3 pt-1">
                <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink text-sm">
                    Privacy by Design
                  </h4>
                  <p className="body-sm text-muted mt-1 leading-relaxed">
                    PingIn never transmits your personal phone number to visitors. When someone scans your QR code and submits a contact request, our secure backend proxies the communication without disclosing private credentials.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-center py-8">
              <h3 className="heading-md text-ink">
                Generating Gateway Link...
              </h3>
              <p className="body-sm text-muted max-w-sm mx-auto mt-1 mb-5">
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
        <div className="bg-[#151513] text-[#f5f4ee] p-6 rounded-sm border border-[#151513] flex flex-col items-center text-center select-none">
          <div className="flex items-center justify-between w-full pb-3 mb-4 border-b border-[#2a2a26]">
            <span className="font-display font-medium text-[11px] tracking-[0.14em] uppercase text-white">
              PINGIN
            </span>
          </div>

          {publicUrl ? (
            <>
              {/* Centered White QR in Black Card */}
              <div className="p-3 bg-white rounded-sm my-1">
                <QRCodeSVG
                  value={publicUrl}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <span className="font-display font-medium text-xs tracking-[0.18em] uppercase text-white mt-3 block">
                PINGIN
              </span>
              <span className="font-sans text-[10px] text-[#929087] uppercase tracking-wider block mb-4">
                {resource.name}
              </span>

              <Button
                variant="secondary"
                onClick={onOpenQrModal}
                className="w-full !border-[#33332d] !text-white hover:!bg-[#22221f] text-xs uppercase tracking-wider font-semibold"
                leftIcon={<QrCode className="h-3.5 w-3.5 text-accent" />}
              >
                SHARE / PRINT QR
              </Button>
            </>
          ) : (
            <div className="py-12 text-center body-sm text-[#929087]">
              Contact link is being generated.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactLinkPanel;
