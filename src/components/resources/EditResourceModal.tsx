import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { resourcesApi } from '../../lib/api';
import type { Resource, ResourceType, UpdateResourcePayload } from '../../types/api';
import { Trash2 } from 'lucide-react';

interface EditResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  onUpdated: (resource: Resource) => void;
  onDelete?: (id: string) => void;
}

const RESOURCE_TYPES: { type: ResourceType; label: string }[] = [
  { type: 'VEHICLE', label: 'Vehicle' },
  { type: 'PROPERTY', label: 'Property' },
  { type: 'EQUIPMENT', label: 'Equipment' },
  { type: 'OTHER', label: 'Other' },
];

export const EditResourceModal: React.FC<EditResourceModalProps> = ({
  isOpen,
  onClose,
  resource,
  onUpdated,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('VEHICLE');
  const [registrationLast4, setRegistrationLast4] = useState('');
  const [color, setColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (resource) {
      setName(resource.name || '');
      setType(resource.type || 'VEHICLE');
      setRegistrationLast4(
        resource.vehicleDetails?.registrationNum ||
        resource.vehicleDetails?.registrationLast4 ||
        ''
      );
      setColor(
        resource.vehicleDetails?.vehicleColour ||
        resource.vehicleDetails?.color ||
        ''
      );
      setError(null);
      setIsConfirmingDelete(false);
    }
  }, [resource, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;
    if (!name.trim()) {
      setError('Resource name cannot be empty');
      return;
    }

    const resourceId = resource.id || (resource as any)._id;
    setIsLoading(true);
    setError(null);

    const payload: UpdateResourcePayload = {
      name: name.trim(),
      type,
    };

    if (type === 'VEHICLE') {
      const trimmedReg = registrationLast4.trim();
      const trimmedColor = color.trim();
      if (trimmedReg || trimmedColor) {
        payload.vehicleDetails = {
          ...(trimmedReg ? { registrationNum: trimmedReg } : {}),
          ...(trimmedColor ? { vehicleColour: trimmedColor } : {}),
        };
      }
    }

    try {
      const response: any = await resourcesApi.update(resourceId, payload);
      const updated: Resource = response?.resource ? response.resource : response;
      toast.success('Changes saved');
      onUpdated({ ...resource, ...updated, ...payload });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update resource');
      toast.error(err.message || 'Failed to update resource');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!resource) return;
    const resourceId = resource.id || (resource as any)._id;

    setIsDeleting(true);
    try {
      await resourcesApi.delete(resourceId);
      toast.success(`"${resource.name}" deleted`);
      setIsConfirmingDelete(false);
      onClose();
      onDelete?.(resourceId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete resource');
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsConfirmingDelete(false);
        onClose();
      }}
      title={isConfirmingDelete ? 'Delete resource' : 'Edit resource'}
      description={
        isConfirmingDelete
          ? `Are you sure you want to delete "${resource?.name}"? Anyone scanning its QR code won't be able to reach you.`
          : 'Update the name, category, or identification details.'
      }
      maxWidth="md"
    >
      {isConfirmingDelete ? (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete resource
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Category Segmented Control */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Category
            </label>
            <div className="w-full p-1 bg-surface border border-border rounded-sm grid grid-cols-4 gap-1">
              {RESOURCE_TYPES.map((option) => {
                const isSelected = type === option.type;
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => {
                      setType(option.type);
                      if (error) setError(null);
                    }}
                    className={`py-1.5 px-1 text-xs sm:text-sm font-medium rounded-xs text-center transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-ink text-surface shadow-xs font-semibold'
                        : 'text-muted hover:text-ink hover:bg-bg/60'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            error={error || undefined}
            autoFocus
          />

          {/* Vehicle Details with smooth sliding expansion */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              type === 'VEHICLE'
                ? 'max-h-64 opacity-100 translate-y-0 pt-2 pointer-events-auto'
                : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
            }`}
            style={{
              transitionProperty: 'max-height, opacity, transform, padding',
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted font-medium">
                  VEHICLE DETAILS
                </span>
                <span className="text-xs text-muted">Optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <Input
                  label="Registration — last 4 digits"
                  labelClassName="h-5 flex items-end"
                  placeholder="4412"
                  maxLength={4}
                  value={registrationLast4}
                  onChange={(e) =>
                    setRegistrationLast4(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  helperText="Only the last 4 digits are needed."
                />

                <Input
                  label="Colour"
                  labelClassName="h-5 flex items-end"
                  placeholder="e.g. White, Matte black"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  helperText="Helps identify your vehicle"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-danger hover:text-danger hover:bg-danger/10"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isLoading || isDeleting}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading || isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={isDeleting}
              >
                Save changes
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditResourceModal;
