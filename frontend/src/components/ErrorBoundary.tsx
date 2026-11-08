import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Trash2, Building2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary capturó un error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#F6F5F0] flex items-center justify-center p-4 font-sans select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(31,41,51,0.06)] border border-[#E7EAE7] space-y-6 text-center">
            <div className="space-y-2">
              <div className="w-13 h-13 bg-[#286D68] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Building2 size={26} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#1E5450]">
                Comunidad Clara Administraciones
              </h1>
              <p className="text-xs text-[#788583]">Plataforma Institucional</p>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-left">
              <AlertCircle size={22} className="shrink-0 text-red-600" />
              <div className="text-xs">
                <p className="font-semibold">Ocurrió un error al cargar la vista</p>
                <p className="font-mono text-[11px] text-red-700 mt-0.5 break-all">
                  {this.state.error?.message || "Error desconocido"}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#788583] leading-relaxed">
              Puede deberse a datos guardados previamente incompatibles o a un problema temporal de conexión.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 bg-[#286D68] hover:bg-[#1E5450] text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw size={15} />
                Recargar página
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 bg-[#F6F5F0] hover:bg-slate-200 border border-[#CDD4D3] text-[#293A3B] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer"
              >
                <Trash2 size={15} className="text-red-500" />
                Limpiar datos y reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
