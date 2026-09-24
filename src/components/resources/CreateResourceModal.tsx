import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { resourcesApi } from '../../lib/api';
import type { Resource, ResourceType, CreateResourcePayload } from '../../types/api';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (resource: Resource) => void;
}

const RESOURCE_TYPES: { type: ResourceType; label: string }[] = [
  { type: 'VEHICLE', label: 'Vehicle' },
  { type: 'PROPERTY', label: 'Property' },
  { type: 'EQUIPMENT', label: 'Equipment' },
  { type: 'OTHER', label: 'Other' },
];

const PLACEHOLDERS: Record<ResourceType, string> = {
  VEHICLE: 'e.g. Blue Sedan, Yamaha R15',
  PROPERTY: 'e.g. Apartment 204, Parking Bay 14',
  EQUIPMENT: 'e.g. Diesel Generator, Forklift #2',
  OTHER: 'e.g. Black Backpack, Camera Case',
};

export const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('VEHICLE');
  const [registrationLast4, setRegistrationLast4] = useState('');
  const [color, setColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    setName('');
    setType('VEHICLE');
    setRegistrationLast4('');
    setColor('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please give this resource a name.');
      toast.error('Name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload: CreateResourcePayload = {
      name: trimmedName,
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
      const response: any = await resourcesApi.create(payload);

      const resource: Resource = response?.resource
        ? { ...response.resource, contactUrl: response.contactUrl }
        : response;

      toast.success(`"${trimmedName}" added`);
      setName('');
      setType('VEHICLE');
      setRegistrationLast4('');
      setColor('');
      setError(null);
      onCreated(resource);
      onClose();
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.data?.message ||
        err?.error ||
        'Failed to add resource. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add a resource"
      description="Choose what you're adding and give it a name."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Category Segmented Control with ample breathing room */}
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

        {/* Name Field */}
        <Input
          label="Name"
          placeholder={PLACEHOLDERS[type]}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          error={error || undefined}
          autoFocus
        />

        {/* Vehicle-Specific Details with smooth expansion matching Auth page */}
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

        <div className="flex justify-end items-center gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            Add resource
          </Button>
        </div>
      </form>
    </Modal>
  );
};
