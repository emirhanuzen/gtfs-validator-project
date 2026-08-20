import Button from "./Button.jsx";
import Modal from "./Modal.jsx";
import Alert from "./Alert.jsx";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Sil",
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={loading ? () => {} : onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Vazgeç
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
    </Modal>
  );
}
