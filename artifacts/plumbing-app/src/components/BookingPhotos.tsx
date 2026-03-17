import React, { useState, useRef } from "react";
import { useListBookingPhotos, useDeleteBookingPhoto, getListBookingPhotosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, X, Image } from "lucide-react";

interface Props {
  bookingId: number;
  onClose: () => void;
}

export default function BookingPhotos({ bookingId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: photos, isLoading } = useListBookingPhotos(bookingId);
  const deleteMutation = useDeleteBookingPhoto();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File, type: "before" | "after") => {
    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("type", type);

    try {
      await fetch(`/api/bookings/${bookingId}/photos`, {
        method: "POST",
        body: formData,
      });
      queryClient.invalidateQueries({ queryKey: getListBookingPhotosQueryKey(bookingId) });
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "before" | "after") => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, type);
    e.target.value = "";
  };

  const handleDelete = (photoId: number) => {
    if (!confirm("Delete this photo?")) return;
    deleteMutation.mutate(
      { id: bookingId, photoId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBookingPhotosQueryKey(bookingId) }) }
    );
  };

  const beforePhotos = photos?.filter((p: any) => p.type === "before") || [];
  const afterPhotos = photos?.filter((p: any) => p.type === "after") || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-3xl flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Before & After Photos</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Before Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                Before
              </h3>
              <button
                onClick={() => beforeRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors min-h-[44px]"
              >
                <Camera className="w-5 h-5" /> Take Photo
              </button>
              <input ref={beforeRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(e, "before")} />
            </div>
            {beforePhotos.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">No before photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {beforePhotos.map((photo: any) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={photo.filePath}
                      alt="Before"
                      className="w-full h-32 object-cover cursor-pointer"
                      onClick={() => setPreview(photo.filePath)}
                    />
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* After Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                After
              </h3>
              <button
                onClick={() => afterRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors min-h-[44px]"
              >
                <Camera className="w-5 h-5" /> Take Photo
              </button>
              <input ref={afterRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(e, "after")} />
            </div>
            {afterPhotos.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">No after photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {afterPhotos.map((photo: any) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={photo.filePath}
                      alt="After"
                      className="w-full h-32 object-cover cursor-pointer"
                      onClick={() => setPreview(photo.filePath)}
                    />
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div className="text-center py-4">
              <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-2">Uploading...</p>
            </div>
          )}
        </div>
      </div>

      {/* Full-size preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setPreview(null)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
