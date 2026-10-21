import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { qrApi, extractConflictTagNumber, cacheResourceTag } from '../../lib/api';
import { buildTagQrUrl } from '../../lib/qr';
import { PingInQrCode } from '../qr/PingInQrCode';
import type { GenerateQrPayload, GenerateQrResponse } from '../../types/api';
import {
  Plus,
  Check,
  Copy,
  Download,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { PingInSvgLogo } from '../brand/PingInLogo';

interface GenerateDigitalQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId?: string;
  resourceName?: string;
  onGenerated?: (result: GenerateQrResponse) => void;
}

export const GenerateDigitalQrModal: React.FC<GenerateDigitalQrModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceName,
  onGenerated,
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<GenerateQrResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);
  const [qrTheme, setQrTheme] = useState<'black' | 'white'>('black');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    const payload: GenerateQrPayload = {
      origin: 'GENERATED_FOR_RESOURCE',
      ...(resourceId ? { resourceId } : {}),
    };

    try {
      const res = await qrApi.generate(payload);
      setGeneratedData(res);
      toast.success(res.message || 'Digital QR tag generated!');
      if (onGenerated) {
        onGenerated(res);
      }
    } catch (err: any) {
      const msg = err?.data?.message || err.message || 'Failed to generate QR tag';
      const conflictTag = extractConflictTagNumber(msg);
      if (conflictTag) {
        if (resourceId) cacheResourceTag(resourceId, conflictTag);
        toast.info(`Active QR tag #${conflictTag} detected on this resource.`);
        if (onGenerated) {
          onGenerated({
            message: `Tag #${conflictTag} is active`,
            tag: {
              id: '',
              tagNumber: conflictTag,
              origin: 'GENERATED_FOR_RESOURCE',
              status: 'ASSIGNED',
              resourceId: resourceId || null,
              qrUrl: buildTagQrUrl(conflictTag),
            },
            resource: null,
          });
        }
        onClose();
        return;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, type: 'url' | 'tag') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2000);
    }
  };

  const handleDownloadPng = () => {
    const svgElement = document.getElementById('generated-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = qrTheme === 'black' ? '#11110F' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 40, 40, 520, 520);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `kauntact-tag-${generatedData?.tag?.tagNumber || 'qr'}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const finalQrUrl = generatedData
    ? buildTagQrUrl(generatedData.tag.tagNumber)
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-sm bg-ink text-surface flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display font-medium text-lg text-ink uppercase tracking-tight block">
              GENERATE DIGITAL QR TAG
            </span>
            <span className="font-sans text-[11px] text-muted uppercase tracking-wider block">
              Instant on-demand tag generation
            </span>
          </div>
        </div>
      }
      maxWidth="md"
    >
      {generatedData ? (
        <div className="py-2 space-y-5 font-sans animate-fade-in text-xs">
          <div className="p-4 bg-success/5 border border-success/30 rounded-sm text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 text-success font-semibold uppercase tracking-wider text-[11px]">
              <Check className="h-3.5 w-3.5" /> Single QR Tag Created
            </span>
            <div className="font-display font-medium text-xl text-ink uppercase tracking-tight">
              #{generatedData.tag.tagNumber}
            </div>
            <p className="text-muted text-[11px]">
              Assigned to {generatedData.resource?.name || resourceName || 'your resource'}.
            </p>
          </div>

          {/* QR Artwork Display */}
          <div className="bg-[#151513] text-[#f5f4ee] p-5 rounded-sm border border-[#151513] flex flex-col items-center text-center">
            <div className="flex items-center justify-between w-full pb-2 mb-3 border-b border-[#2a2a26]">
              <PingInSvgLogo height={12} className="text-white" />
              <div className="flex items-center gap-1 bg-[#1e1e1b] border border-[#2a2a26] p-0.5 rounded-xs text-[10px]">
                <button
                  type="button"
                  onClick={() => setQrTheme('black')}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    qrTheme === 'black'
                      ? 'bg-[#2a2a26] text-white font-medium'
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
                      ? 'bg-[#2a2a26] text-white font-medium'
                      : 'text-[#929087] hover:text-white'
                  }`}
                >
                  White
                </button>
              </div>
            </div>

            <div
              className={`p-3 rounded-sm my-1 ${
                qrTheme === 'black' ? 'bg-[#11110f] border border-[#2a2a26]' : 'bg-white'
              }`}
            >
              <PingInQrCode
                id="generated-qr-svg"
                value={finalQrUrl}
                size={160}
                level="H"
                fgColor={qrTheme === 'black' ? '#F5F4EE' : '#11110F'}
                bgColor={qrTheme === 'black' ? '#11110F' : '#FFFFFF'}
                includeMargin={true}
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="font-mono font-semibold text-xs text-white">
                {generatedData.tag.tagNumber}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(generatedData.tag.tagNumber, 'tag')}
                className="text-[10px] text-[#929087] hover:text-white transition-colors uppercase tracking-wider"
              >
                {copiedTag ? 'COPIED' : 'COPY'}
              </button>
            </div>
          </div>

          {/* URL & Action buttons */}
          {finalQrUrl && (
            <div className="space-y-1">
              <span className="text-[11px] text-muted uppercase tracking-wider font-medium">
                QR Public Destination URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={finalQrUrl}
                  className="input !h-9 text-xs font-mono select-all flex-1"
                />
                <Button
                  variant={copiedUrl ? 'secondary' : 'primary'}
                  onClick={() => handleCopy(finalQrUrl, 'url')}
                  leftIcon={copiedUrl ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  className="!h-9 text-xs"
                >
                  {copiedUrl ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleDownloadPng}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              className="!h-9 text-xs"
            >
              Download PNG
            </Button>
            <Button variant="primary" onClick={onClose} className="!h-9 text-xs">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-2 space-y-4 font-sans text-xs">
          <p className="text-muted leading-relaxed">
            Generate a new digital QR tag on-demand. This creates a secure, unique 7-character tag number and token that can be printed or displayed on any screen.
          </p>

          {resourceName && (
            <div className="p-3.5 border border-border bg-surface/50 rounded-sm flex items-center justify-between">
              <div>
                <span className="text-muted text-[11px] uppercase tracking-wider block">Target Resource</span>
                <span className="font-semibold text-ink text-sm block mt-0.5">{resourceName}</span>
              </div>
              <span className="px-2 py-0.5 bg-surface border border-border text-ink font-semibold uppercase text-[10px] rounded-xs">
                WILL BE PAIRED
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-danger text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleGenerate}
              isLoading={isGenerating}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Generate Digital Tag
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GenerateDigitalQrModal;
