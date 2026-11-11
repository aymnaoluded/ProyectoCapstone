import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { PantallaAcceso } from "./ui/PantallaAcceso";

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
    } catch {
      /* el almacenamiento puede estar bloqueado */
    }
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <PantallaAcceso
          ceja="Algo salió mal"
          titulo={
            <>
              Se apagó una <em>ventana</em>
            </>
          }
          descripcion="Ocurrió un error al cargar esta vista. Puede deberse a datos guardados incompatibles o a un problema temporal de conexión."
          ilustracion={
            <span className="arco grid place-items-center w-11 h-12 bg-error-suave text-error mb-5">
              <AlertCircle size={22} />
            </span>
          }
        >
          <p className="text-[0.8125rem] font-mono text-error bg-error-suave/60 border border-error/20 rounded-xl px-3.5 py-2.5 break-all">
            {this.state.error?.message || "Error desconocido"}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <button type="button" onClick={this.handleReload} className="boton boton-primario flex-1">
              <RefreshCw size={15} />
              Recargar página
            </button>
            <button type="button" onClick={this.handleReset} className="boton boton-secundario flex-1">
              <Trash2 size={15} className="text-error" />
              Limpiar datos y reiniciar
            </button>
          </div>
        </PantallaAcceso>
      );
    }

    return this.props.children;
  }
}
