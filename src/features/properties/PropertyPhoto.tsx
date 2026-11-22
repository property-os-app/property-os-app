import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/atoms";
import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { errorText } from "@/lib/api";
import { acceptOf, checkFile, PHOTO_RULE } from "@/lib/files";
import { photoForm } from "@/features/documents/form";
import { uploadErrorText } from "@/features/documents/hooks";
import { PropertyImage } from "@/features/properties/PropertyCard";
import { usePropertyPhoto } from "@/features/properties/hooks";
import type { Property } from "@/types/property";

/**
 * The property page's cover photo, with "Change photo" (or "Add photo") and "Remove photo" under it for properties.edit.
 * A picked file is checked here first (JPEG, PNG or WebP, max 5 MB); "Uploading..." shows over the image while it saves.
 */
export function PropertyPhoto({ property, canEdit, className }: { property: Property; canEdit: boolean; className?: string }) {
  const photo = usePropertyPhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const uploading = photo.isPending && photo.variables?.form !== null;

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = checkFile(file, PHOTO_RULE);
    if (problem) {
      toast.error("Couldn't use this photo", { description: problem });
      return;
    }
    photo.mutate(
      { id: property.id, form: photoForm(file) },
      {
        onSuccess: () => toast.success(`Photo of ${property.name} updated`),
        onError: (err) => toast.error("Couldn't upload the photo", { description: uploadErrorText(err, PHOTO_RULE) }),
      },
    );
  };

  const remove = () => {
    setRemoveError(null);
    photo.mutate(
      { id: property.id, form: null },
      {
        onSuccess: () => {
          toast.success(`Photo of ${property.name} removed`);
          setRemoving(false);
        },
        onError: (err) => setRemoveError(errorText(err)),
      },
    );
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <PropertyImage property={property} className="h-[180px] w-full rounded-control">
        {uploading && (
          <span role="status" className="absolute inset-0 flex items-center justify-center bg-surface-1/80 text-small font-semibold text-text-primary">
            Uploading...
          </span>
        )}
      </PropertyImage>
      {canEdit && (
        <div className="flex gap-2">
          <Button
            size="sm"
            icon={<ImagePlus size={16} strokeWidth={1.5} />}
            disabled={photo.isPending}
            aria-busy={uploading || undefined}
            onClick={() => inputRef.current?.click()}
            className="flex-1 max-md:h-11"
          >
            {uploading ? "Uploading..." : property.photoUrl ? "Change photo" : "Add photo"}
          </Button>
          {property.photoUrl && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 size={16} strokeWidth={1.5} />}
              disabled={photo.isPending}
              onClick={() => {
                setRemoveError(null);
                setRemoving(true);
              }}
              className="max-md:h-11"
            >
              Remove photo
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={acceptOf(PHOTO_RULE)}
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}
      <ConfirmDialog
        open={removing}
        onOpenChange={(open) => !open && !photo.isPending && setRemoving(false)}
        title="Remove photo?"
        consequence={`The cover photo of ${property.name} is deleted. You can add a new one any time.`}
        confirmLabel="Remove photo"
        destructive
        onConfirm={remove}
        busy={photo.isPending}
        error={removeError}
      />
    </div>
  );
}
