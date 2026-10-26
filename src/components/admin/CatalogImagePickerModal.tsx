import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminApi';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Folder,
  AlertTriangle,
} from 'lucide-react';

export interface CatalogImageItem {
  objectPath: string;
  name: string;
  folder: string;
  size: number;
  contentType: string;
  updatedAt: string;
  url: string;
}

interface CatalogImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (objectPath: string, previewUrl?: string) => void;
  title?: string;
  initialFolder?: string;
}

const CATEGORY_FOLDERS = [
  { id: 'all', label: 'All Assets' },
  { id: 'bundles', label: 'Bundles & Packs (/bundles)' },
  { id: 'vehicle_stickers', label: 'Vehicle Stickers (/vehicle_stickers)' },
  { id: 'keychain', label: 'Keychains (/keychain)' },
  { id: 'mini_stickers', label: 'Mini Stickers (/mini_stickers)' },
  { id: 'general', label: 'General (/general)' },
];

export const CatalogImagePickerModal: React.FC<CatalogImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  title = 'Select Artwork Asset',
  initialFolder = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [images, setImages] = useState<CatalogImageItem[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('all');

  // Selected item state for library tab
  const [selectedObjectPath, setSelectedObjectPath] = useState<string | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);

  // Upload tab state
  const [uploadCategory, setUploadCategory] = useState(initialFolder || 'general');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch library images
  const fetchLibraryImages = async () => {
    setIsLoadingImages(true);
    setLoadError(null);
    try {
      const res = await adminApi.getCatalogImages();
      setImages(res.data || []);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load catalog asset library');
    } finally {
      setIsLoadingImages(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLibraryImages();
      if (initialFolder && initialFolder !== 'all') {
        setUploadCategory(initialFolder);
      }
    } else {
      // Reset state on close
      setSelectedObjectPath(null);
      setSelectedPreviewUrl(null);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadError(null);
    }
  }, [isOpen, initialFolder]);

  if (!isOpen) return null;

  // Handle local file selection for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setUploadFile(file);
    setUploadError(null);

    // Generate local preview
    const objectUrl = URL.createObjectURL(file);
    setUploadPreview(objectUrl);
  };

  // Perform direct GCS upload
  const handleDirectUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const { objectPath, previewUrl } = await adminApi.uploadCatalogImageDirect(
        uploadFile,
        uploadCategory
      );

      // Select and apply uploaded image
      onSelectImage(objectPath, previewUrl);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Direct upload to GCS failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle library confirmation
  const handleConfirmLibrarySelection = () => {
    if (!selectedObjectPath) return;
    onSelectImage(selectedObjectPath, selectedPreviewUrl || undefined);
    onClose();
  };

  // Filtered images list
  const filteredImages = selectedFolderFilter === 'all'
    ? images
    : images.filter((img) => img.folder === selectedFolderFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-surface shadow-2xl p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-ink" />
            <div>
              <h3 className="font-semibold text-base text-ink">{title}</h3>
              <p className="text-xs text-muted font-mono">Google Cloud Storage Asset Catalog</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`pb-2.5 text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'library'
                  ? 'border-ink text-ink font-bold'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Asset Library ({images.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-2.5 text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-ink text-ink font-bold'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Direct GCS Upload</span>
            </button>
          </div>

          {activeTab === 'library' && (
            <button
              type="button"
              onClick={fetchLibraryImages}
              disabled={isLoadingImages}
              className="p-1 text-muted hover:text-ink cursor-pointer"
              title="Refresh Asset Library"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingImages ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Tab 1: Library Picker */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            {/* Folder Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
              {CATEGORY_FOLDERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFolderFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md border whitespace-nowrap cursor-pointer transition-colors ${
                    selectedFolderFilter === f.id
                      ? 'bg-ink text-surface border-ink font-bold'
                      : 'bg-bg text-muted border-border hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loadError && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{loadError}</span>
              </div>
            )}

            {isLoadingImages ? (
              <div className="py-16 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-muted" />
                <span>Loading bucket images...</span>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted border border-dashed border-border rounded-lg">
                No images found in this category. Switch to Direct Upload to add an asset.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                {filteredImages.map((img) => {
                  const isSelected = selectedObjectPath === img.objectPath;

                  return (
                    <div
                      key={img.objectPath}
                      onClick={() => {
                        setSelectedObjectPath(img.objectPath);
                        setSelectedPreviewUrl(img.url);
                      }}
                      className={`group p-2 rounded-lg border cursor-pointer transition-all flex flex-col justify-between relative bg-bg/40 hover:border-ink ${
                        isSelected
                          ? 'border-ink ring-2 ring-ink/20 bg-surface'
                          : 'border-border'
                      }`}
                    >
                      <div className="aspect-square w-full rounded border border-border/80 bg-white overflow-hidden flex items-center justify-center p-1 relative">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-ink text-surface p-1 rounded-full shadow-md">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="pt-2 text-left">
                        <p className="text-[11px] font-semibold text-ink truncate" title={img.name}>
                          {img.name}
                        </p>
                        <p className="text-[9px] font-mono text-muted truncate mt-0.5" title={img.objectPath}>
                          {img.folder}/{(img.size / 1024).toFixed(0)}KB
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Library Confirmation Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-muted truncate max-w-sm">
                {selectedObjectPath ? `Selected: ${selectedObjectPath}` : 'Click an asset to select'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-md border border-border text-xs font-mono text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLibrarySelection}
                  disabled={!selectedObjectPath}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-ink text-surface text-xs font-mono font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Use Selected Asset</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Direct GCS Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Destination Folder in GCS Bucket
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                >
                  <option value="vehicle_stickers">vehicle_stickers (Vehicle Stickers)</option>
                  <option value="keychain">keychain (Keychains)</option>
                  <option value="mini_stickers">mini_stickers (Mini Stickers)</option>
                  <option value="bundles">bundles (Curated Bundles &amp; Packs)</option>
                  <option value="general">general (General Products)</option>
                </select>
                <p className="text-[10px] text-muted font-mono mt-1">
                  Canonical Path: product_images/{uploadCategory}/[filename]
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Select Artwork File (PNG, JPG, WebP)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:text-xs file:font-mono file:bg-surface file:text-ink file:cursor-pointer cursor-pointer"
                />
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Upload Preview Box */}
            {uploadPreview && (
              <div className="p-4 rounded-lg border border-border bg-bg/50 flex items-center gap-4">
                <div className="w-24 h-24 rounded border border-border bg-white overflow-hidden flex items-center justify-center p-1 shrink-0">
                  <img
                    src={uploadPreview}
                    alt="Upload Preview"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold text-ink truncate">{uploadFile?.name}</p>
                  <p className="text-[11px] font-mono text-muted">
                    Size: {((uploadFile?.size || 0) / 1024).toFixed(1)} KB · Type: {uploadFile?.type}
                  </p>
                  <p className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    Streams directly from browser to Google Cloud Storage
                  </p>
                </div>
              </div>
            )}

            {/* Upload Action Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-3.5 py-1.5 rounded-md border border-border text-xs font-mono text-muted hover:text-ink cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDirectUpload}
                disabled={!uploadFile || isUploading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-ink text-surface text-xs font-mono font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                {isUploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isUploading ? 'Streaming to GCS...' : 'Upload & Use Image'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
