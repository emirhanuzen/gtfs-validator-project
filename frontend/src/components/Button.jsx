import Spinner from "./Spinner.jsx";

const VARIANTS = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:hover:bg-white",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};

const SIZES = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export default function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
