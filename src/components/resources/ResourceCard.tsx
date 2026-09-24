import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../../types/api';
import { Surface, Button, IconButton } from '../ui';
import { QrCodeModal } from './QrCodeModal';
import { resourcesApi, extractResourceToken } from '../../lib/api';
import {
  QrCode,
  ChevronRight,
  Trash2,
  Edit2,
  Calendar,
  Car,
  Building2,
  Wrench,
  Layers,
} from 'lucide-react';

interface ResourceCardProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const [showQr, setShowQr] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const contactToken = extractResourceToken(resource);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${resource.name}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await resourcesApi.delete(resource.id);
      onDelete(resource.id);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete resource', err);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Surface className="hover:border-border-strong transition-all duration-150 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="heading-md text-ink line-clamp-1">
                {resource.name}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-muted body-sm">
                {resource.type && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-bg border border-border text-ink text-[11px] font-semibold uppercase tracking-wider">
                    {resource.type === 'VEHICLE' && <Car className="h-3 w-3" />}
                    {resource.type === 'PROPERTY' && <Building2 className="h-3 w-3" />}
                    {resource.type === 'EQUIPMENT' && <Wrench className="h-3 w-3" />}
                    {resource.type === 'OTHER' && <Layers className="h-3 w-3" />}
                    <span>{resource.type}</span>
                  </span>
                )}
                {resource.vehicleDetails?.registrationLast4 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-bg border border-border text-ink text-[11px]">
                    <span className="font-mono">•••• {resource.vehicleDetails.registrationLast4}</span>
                  </span>
                )}
                {resource.vehicleDetails?.color && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-bg border border-border text-muted text-[11px]">
                    <span>{resource.vehicleDetails.color}</span>
                  </span>
                )}
                <div className="flex items-center gap-1 text-muted text-[11px]">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(resource.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 mt-4 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            {contactToken && (
              <Button
                variant="secondary"
                onClick={() => setShowQr(true)}
                leftIcon={<QrCode className="h-3.5 w-3.5 text-ink" />}
              >
                Share QR
              </Button>
            )}

            <IconButton
              icon={<Edit2 className="h-4 w-4" />}
              label="Edit resource"
              onClick={() => onEdit(resource)}
            />

            <IconButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete resource"
              variant="danger"
              disabled={isDeleting}
              onClick={handleDelete}
            />
          </div>

          <Link to={`/resources/${resource.id}`}>
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
            >
              Details
            </Button>
          </Link>
        </div>
      </Surface>

      {contactToken && (
        <QrCodeModal
          isOpen={showQr}
          onClose={() => setShowQr(false)}
          token={contactToken}
          resourceName={resource.name}
        />
      )}
    </>
  );
};
