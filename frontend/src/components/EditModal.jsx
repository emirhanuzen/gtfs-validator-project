import { useState } from "react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import Alert from "./Alert.jsx";

function toText(value) {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Sadece değişen alanları içeren gövdeyi üretir (backend kısmi güncellemeyi destekliyor).
 * Backend null gelen alanları yok saydığı için sayısal alanlar boş bırakılamıyor.
 */
function buildPatch(fields, values, row) {
  const patch = {};
  const errors = {};

  for (const field of fields) {
    const raw = values[field.name] ?? "";
    if (raw === toText(row[field.name])) continue;

    if (field.type === "integer") {
      if (raw.trim() === "") {
        errors[field.name] = "Bu alan boş bırakılamaz.";
        continue;
      }
      if (!/^-?\d+$/.test(raw.trim())) {
        errors[field.name] = "Tam sayı girin.";
        continue;
      }
      patch[field.name] = Number.parseInt(raw.trim(), 10);
    } else if (field.type === "number") {
      if (raw.trim() === "") {
        errors[field.name] = "Bu alan boş bırakılamaz.";
        continue;
      }
      const parsed = Number.parseFloat(raw.trim().replace(",", "."));
      if (!Number.isFinite(parsed)) {
        errors[field.name] = "Geçerli bir sayı girin.";
        continue;
      }
      patch[field.name] = parsed;
    } else {
      patch[field.name] = raw;
    }
  }

  return { patch, errors };
}

export default function EditModal({ open, resource, row, onSubmit, onClose }) {
  const fields = resource.editableFields;
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((field) => [field.name, toText(row?.[field.name])]))
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (name, value) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const { patch, errors } = buildPatch(fields, values, row);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (Object.keys(patch).length === 0) {
      setFormError("Herhangi bir alanı değiştirmediniz.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(patch);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`${resource.label} kaydını düzenle`}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            Kaydet
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-slate-500">
          Kayıt no: <span className="font-mono">{row?.id}</span>
        </p>

        {fields.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={`field-${field.name}`}
              className="block text-xs font-semibold text-slate-600"
            >
              {field.label}
            </label>
            <input
              id={`field-${field.name}`}
              type="text"
              inputMode={field.type === "text" ? "text" : "decimal"}
              value={values[field.name]}
              onChange={(event) => handleChange(field.name, event.target.value)}
              className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                fieldErrors[field.name] ? "border-red-300" : "border-slate-300 hover:border-slate-400"
              }`}
            />
            {fieldErrors[field.name] && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors[field.name]}</p>
            )}
          </div>
        ))}

        {formError && <Alert tone="error">{formError}</Alert>}

        {/* Enter ile gönderebilmek için gizli submit düğmesi */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
