'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  scope?: string;
  section?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErpfyErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ERPFY Plugin Quarantine: ${this.props.scope || 'Component'}]`,
      error,
      errorInfo,
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[16px] border border-amber-200 bg-amber-50/70 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                {this.props.fallbackTitle ||
                  'Extension isolated due to an error'}
              </h3>
              <p className="mt-1 text-xs text-amber-700">
                {this.state.error?.message ||
                  'An unexpected error occurred in this extension. ERPFY core remains operational.'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100/50"
                >
                  <RefreshCw className="size-3.5" /> Retry
                </button>
                <span className="text-[11px] text-amber-600">
                  Quarantine active · Scope: {this.props.scope || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
