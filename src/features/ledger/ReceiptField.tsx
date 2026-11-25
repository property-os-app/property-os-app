import { Select } from "@/components/atoms";
import { FileDropzone, FormField } from "@/components/molecules";
import { acceptOf, checkFile, DOCUMENT_HINT, DOCUMENT_RULE } from "@/lib/files";
import { categoryOptions } from "@/features/documents/categories";
import { PickedFile } from "@/features/documents/DocumentUpload";
import { useDocumentCategories } from "@/features/documents/hooks";
import { receiptCategory, type ReceiptValue } from "@/features/ledger/paymentForm";

export interface ReceiptErrors {
  file?: string;
  category?: string;
}

export interface ReceiptFieldProps {
  value: ReceiptValue;
  onChange: (value: ReceiptValue) => void;
  errors: ReceiptErrors;
  onErrors: (errors: ReceiptErrors) => void;
  disabled?: boolean;
}

/**
 * "Attach receipt" of the Record Payment form: one optional file, then its type (the API's payment categories, Receipt by
 * default). The payment can be saved even when the types don't load: the API then uses Receipt.
 */
export function ReceiptField({ value, onChange, errors, onErrors, disabled }: ReceiptFieldProps) {
  const categories = useDocumentCategories();
  const options = categoryOptions(categories.data, "payments");
  const category = receiptCategory(value, options);

  const pick = (files: FileList) => {
    const next = files[0];
    if (!next) return;
    const problem = checkFile(next, DOCUMENT_RULE);
    onErrors({ file: problem ?? undefined });
    onChange({ ...value, file: problem ? null : next });
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-small text-text-secondary">Attach receipt</span>
      {value.file ? (
        <PickedFile
          file={value.file}
          disabled={disabled}
          onRemove={() => {
            onChange({ file: null, category: null });
            onErrors({});
          }}
        />
      ) : (
        <FileDropzone
          multiple={false}
          accept={acceptOf(DOCUMENT_RULE)}
          hint={`Optional. ${DOCUMENT_HINT}`}
          chooseLabel="Choose file"
          onFiles={pick}
          disabled={disabled}
        />
      )}
      {errors.file && (
        <p role="alert" className="m-0 text-small text-danger">
          {errors.file}
        </p>
      )}
      {value.file && (
        <FormField
          label="Type"
          htmlFor="pay-receipt-type"
          error={errors.category}
          help={categories.isError ? "The types couldn't load. The file will be saved as a receipt." : undefined}
        >
          <Select
            id="pay-receipt-type"
            value={category}
            disabled={disabled || options.length === 0}
            onChange={(e) => {
              onChange({ ...value, category: e.target.value });
              onErrors({ ...errors, category: undefined });
            }}
          >
            {category === "" && <option value="">{categories.isPending ? "Loading types…" : "Receipt"}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}
    </div>
  );
}
