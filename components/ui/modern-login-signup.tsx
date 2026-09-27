'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  normalizeTheme,
} from '@/lib/theme';

interface ThreeLike {
  Vector2: new (x: number, y: number) => { set: (x: number, y: number) => void };
  Vector3: new (x: number, y: number, z: number) => unknown;
  Scene: new () => { add: (obj: unknown) => void };
  OrthographicCamera: new (left: number, right: number, top: number, bottom: number, near: number, far: number) => unknown;
  PlaneGeometry: new (width: number, height: number) => { dispose: () => void };
  ShaderMaterial: new (options: unknown) => { dispose: () => void };
  Mesh: new (geom: unknown, mat: unknown) => unknown;
  WebGLRenderer: new (options: unknown) => {
    setPixelRatio: (ratio: number) => void;
    setSize: (w: number, h: number) => void;
    render: (scene: unknown, camera: unknown) => void;
    dispose: () => void;
  };
  GLSL3?: unknown;
  NormalBlending?: unknown;
}

interface DisposableThreeObj {
  dispose: () => void;
}

function readCurrentTheme(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const storedColor = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedColor) return normalizeTheme(storedColor);
  } catch {
    /* storage unavailable */
  }
  const cssColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--erpfy-brand')
    .trim();
  return normalizeTheme(cssColor || DEFAULT_THEME);
}

export default function ModernLoginSignup() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [activeThemeHex, setActiveThemeHex] = useState(readCurrentTheme);

  // Form State
  const [loginEmail, setLoginEmail] = useState('developer@erpfy.test');
  const [loginPassword, setLoginPassword] = useState('erpfy-local-dev-password');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseHexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      return {
        r: parseInt(clean.slice(0, 2), 16) / 255,
        g: parseInt(clean.slice(2, 4), 16) / 255,
        b: parseInt(clean.slice(4, 6), 16) / 255,
      };
    }
    return { r: 0.12, g: 0.34, b: 0.19 };
  };

  const getThemePalette = (hex: string, THREE: ThreeLike) => {
    const baseRgb = parseHexToRgb(hex);
    const clamp = (val: number) => Math.min(1, Math.max(0, val));
    return [
      new THREE.Vector3(baseRgb.r, baseRgb.g, baseRgb.b),
      new THREE.Vector3(
        clamp(baseRgb.r * 1.35 + 0.05),
        clamp(baseRgb.g * 1.35 + 0.05),
        clamp(baseRgb.g * 1.35 + 0.05),
      ),
      new THREE.Vector3(
        clamp(baseRgb.r * 0.7),
        clamp(baseRgb.g * 0.7),
        clamp(baseRgb.g * 0.7),
      ),
      new THREE.Vector3(
        clamp(baseRgb.r * 1.15),
        clamp(baseRgb.g * 1.15),
        clamp(baseRgb.g * 1.15),
      ),
      new THREE.Vector3(
        clamp(baseRgb.r * 1.5 + 0.1),
        clamp(baseRgb.g * 1.5 + 0.1),
        clamp(baseRgb.g * 1.5 + 0.1),
      ),
      new THREE.Vector3(
        clamp(baseRgb.r * 0.85),
        clamp(baseRgb.g * 0.85),
        clamp(baseRgb.g * 0.85),
      ),
    ];
  };

  // 1. Sync theme on mount and listen to storage events
  useEffect(() => {
    applyTheme(activeThemeHex);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        const updated = readCurrentTheme();
        setActiveThemeHex(updated);
        applyTheme(updated);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [activeThemeHex]);

  // 2. Three.js Background canvas effect
  useEffect(() => {
    let active = true;
    let renderer: {
      setPixelRatio: (ratio: number) => void;
      setSize: (w: number, h: number) => void;
      render: (scene: unknown, camera: unknown) => void;
      dispose: () => void;
    } | null = null;
    let geometry: DisposableThreeObj | null = null;
    let material: DisposableThreeObj | null = null;
    let scene: { add: (obj: unknown) => void } | null = null;
    let camera: unknown = null;
    let animationId: number;

    const initThree = (THREE: ThreeLike) => {
      if (!canvasRef.current || !active) return;
      const canvas = canvasRef.current;
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const themeColors = getThemePalette(activeThemeHex, THREE);

      const uniforms = {
        u_time: { value: 0 },
        u_resolution: {
          value: new THREE.Vector2(
            window.innerWidth * 2,
            window.innerHeight * 2,
          ),
        },
        u_opacities: {
          value: [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1.0],
        },
        u_colors: { value: themeColors },
        u_total_size: { value: 24.0 },
        u_dot_size: { value: 5.0 },
        u_reverse: { value: 0 },
      };
      uniformsRef.current = uniforms;

      material = new THREE.ShaderMaterial({
        vertexShader: `
          precision mediump float;
          uniform vec2 u_resolution;
          out vec2 fragCoord;
          void main() {
            gl_Position = vec4(position, 1.0);
            fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
            fragCoord.y = u_resolution.y - fragCoord.y;
          }
        `,
        fragmentShader: `
          precision mediump float;
          in vec2 fragCoord;

          uniform float u_time;
          uniform float u_opacities[10];
          uniform vec3 u_colors[6];
          uniform float u_total_size;
          uniform float u_dot_size;
          uniform vec2 u_resolution;
          uniform int u_reverse;

          out vec4 fragColor;

          float PHI = 1.61803398874989484820459;
          float random(vec2 xy) {
              return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
          }

          void main() {
              vec2 st = fragCoord.xy;
              st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
              st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));

              float opacity = step(0.0, st.x) * step(0.0, st.y);

              vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

              float frequency = 4.5;
              float show_offset = random(st2);
              float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
              opacity *= u_opacities[int(rand * 10.0)];
              opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
              opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

              vec3 color = u_colors[int(show_offset * 6.0)];

              float animation_speed_factor = 2.5;
              vec2 center_grid = u_resolution / 2.0 / u_total_size;
              float dist_from_center = distance(center_grid, st2);

              float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

              float current_timing_offset = timing_offset_intro;
              opacity *= step(current_timing_offset, u_time * animation_speed_factor);
              opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);

              // High contrast colored dots on light background
              fragColor = vec4(color, opacity * 0.85);
          }
        `,
        uniforms: uniforms,
        glslVersion: THREE.GLSL3,
        blending: THREE.NormalBlending,
        transparent: true,
      });

      geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const startTime = performance.now();
      const animate = () => {
        if (!active) return;
        animationId = requestAnimationFrame(animate);
        uniforms.u_time.value = (performance.now() - startTime) / 1000.0;
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      animate();

      const handleResize = () => {
        if (!renderer) return;
        renderer.setSize(window.innerWidth, window.innerHeight);
        const resVal = uniforms.u_resolution.value as { set?: (x: number, y: number) => void } | null;
        if (resVal && typeof resVal.set === 'function') {
          resVal.set(
            window.innerWidth * 2,
            window.innerHeight * 2,
          );
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    const win = window as unknown as { THREE?: ThreeLike };
    if (win.THREE) {
      const cleanUp = initThree(win.THREE);
      return () => {
        active = false;
        if (cleanUp) cleanUp();
        if (animationId) cancelAnimationFrame(animationId);
        if (renderer) renderer.dispose();
        if (geometry) geometry.dispose();
        if (material) material.dispose();
      };
    } else {
      const script = document.createElement('script');
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = () => {
        const winOnLoad = window as unknown as { THREE?: ThreeLike };
        if (winOnLoad.THREE) {
          initThree(winOnLoad.THREE);
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      active = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) renderer.dispose();
      if (geometry) geometry.dispose();
      if (material) material.dispose();
    };
  }, [activeThemeHex]);

  // Update canvas shader palette whenever active theme color changes
  useEffect(() => {
    const win = window as unknown as { THREE?: ThreeLike };
    if (uniformsRef.current && win.THREE) {
      uniformsRef.current.u_colors.value = getThemePalette(
        activeThemeHex,
        win.THREE,
      );
    }
  }, [activeThemeHex]);

  // Handle Real Login
  async function handleLoginSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const payload = (await response.json()) as {
        signedIn?: boolean;
        secondFactorRequired?: boolean;
        challengeToken?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Could not sign you in.');
      }

      if (payload.signedIn) {
        router.push('/account');
        router.refresh();
      } else {
        throw new Error('Unexpected sign in state.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setBusy(false);
    }
  }

  // Handle Real Signup
  async function handleSignupSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      });

      const payload = (await response.json()) as {
        signedIn?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Could not create account.');
      }

      if (payload.signedIn) {
        router.push('/account');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating account.');
    } finally {
      setBusy(false);
    }
  }

  const socialBtn: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.625rem',
    marginBottom: '0.5rem',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    transition: 'all 0.15s ease-in-out',
  };

  const inputClass =
    'w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-hidden transition-all focus:border-[var(--erpfy-brand,#1e5631)] focus:ring-2 focus:ring-[var(--erpfy-brand-ring,rgba(30,86,49,0.25))]';

  const GoogleIcon = (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );

  const AppleIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="#111827"
      style={{ width: 16, height: 16, flexShrink: 0 }}
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.88.75 3.65 1.89-3.08 1.75-2.58 5.61.35 6.75-1.01 2.37-2.39 4.39-4.29 4.29zM12.03 7.25c-.15-2.23 1.66-4.07 3.72-4.25.36 2.38-1.92 4.34-3.72 4.25z" />
    </svg>
  );

  const Logo = (
    <Link
      href="/account"
      className="mb-3 flex items-center justify-center gap-2 group"
    >
      <div
        style={{
          background: 'var(--erpfy-brand, #1e5631)',
          width: 42,
          height: 42,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.2rem',
          color: 'var(--erpfy-brand-on, #ffffff)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          transition: 'background 0.2s ease',
        }}
      >
        E
      </div>
      <span className="text-xl font-bold tracking-tight text-[#111827]">
        ERPFY
      </span>
    </Link>
  );

  const Footer = (
    <div
      style={{
        marginTop: '1rem',
        fontSize: '0.75rem',
        color: '#6B7280',
        lineHeight: 1.5,
        textAlign: 'center',
      }}
    >
      By proceeding, you agree to ERPFY&apos;s Terms of Service and Privacy Policy.
    </div>
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#F8FAFC',
        color: '#111827',
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: '1.5rem',
      }}
    >
      {/* Dynamic WebGL Canvas powered by active Theme Color */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Light Soft Vignette Mask */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'radial-gradient(circle at center, rgba(255,255,255,0.45) 0%, rgba(248,250,252,0.92) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Clean Light Theme Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '2.25rem 2rem',
          width: '100%',
          maxWidth: 420,
          boxShadow:
            '0 20px 45px -12px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '1px solid #E5E7EB',
        }}
      >
        {/* Error Alert if any */}
        {error && (
          <div
            style={{
              width: '100%',
              marginBottom: '1rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 8,
              background: '#FEF2F2',
              border: '1px solid #F87171',
              color: '#991B1B',
              fontSize: '0.8rem',
              fontWeight: 500,
              textAlign: 'left',
            }}
          >
            {error}
          </div>
        )}

        {isLogin ? (
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {Logo}
            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                marginBottom: '0.25rem',
                letterSpacing: '-0.025em',
                color: '#111827',
              }}
            >
              Sign in to ERPFY
            </h1>
            <p
              style={{
                fontSize: '0.85rem',
                color: '#6B7280',
                marginBottom: '1.25rem',
                lineHeight: 1.5,
              }}
            >
              Welcome back! Please enter your details.
            </p>

            <form
              onSubmit={handleLoginSubmit}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <label
                  htmlFor="loginEmail"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: '#374151',
                  }}
                >
                  Email address
                </label>
                <input
                  id="loginEmail"
                  className={inputClass}
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@work-email.com"
                  required
                />
              </div>

              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.35rem',
                  }}
                >
                  <label
                    htmlFor="loginPassword"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setLoginPassword('erpfy-local-dev-password')}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--erpfy-brand, #1e5631)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                    className="hover:underline"
                    title="Fill default local dev password"
                  >
                    Reset default
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="loginPassword"
                    className={inputClass}
                    style={{ paddingRight: '2.5rem' }}
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B7280',
                      transition: 'color 0.15s ease',
                    }}
                    className="hover:text-[#111827] focus:outline-hidden"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="primary-button flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                style={{
                  background: 'var(--erpfy-brand, #1e5631)',
                  color: 'var(--erpfy-brand-on, #ffffff)',
                  marginTop: '0.25rem',
                }}
              >
                {busy ? 'Signing in…' : 'Sign in with Email'}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                margin: '1.25rem 0',
                color: '#9CA3AF',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              <span style={{ padding: '0 0.75rem', fontWeight: 500 }}>
                or continue with
              </span>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            </div>

            {/* Social Buttons */}
            <button
              type="button"
              onClick={() => {
                setLoginEmail('developer@erpfy.test');
                setLoginPassword('erpfy-local-dev-password');
              }}
              style={socialBtn}
            >
              {GoogleIcon}Continue with Google
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginEmail('developer@erpfy.test');
                setLoginPassword('erpfy-local-dev-password');
              }}
              style={{ ...socialBtn, marginBottom: 0 }}
            >
              {AppleIcon}Continue with Apple
            </button>

            <div
              style={{
                marginTop: '1.25rem',
                fontSize: '0.875rem',
                color: '#6B7280',
              }}
            >
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsLogin(false);
                }}
                style={{
                  color: 'var(--erpfy-brand, #1e5631)',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                }}
                className="hover:underline"
              >
                Sign Up
              </button>
            </div>
            {Footer}
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {Logo}
            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                marginBottom: '0.25rem',
                letterSpacing: '-0.025em',
                color: '#111827',
              }}
            >
              Create an ERPFY Account
            </h1>
            <p
              style={{
                fontSize: '0.85rem',
                color: '#6B7280',
                marginBottom: '1.25rem',
                lineHeight: 1.5,
              }}
            >
              Start your 14-day free trial. No credit card required.
            </p>

            <form
              onSubmit={handleSignupSubmit}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <label
                  htmlFor="signupName"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: '#374151',
                  }}
                >
                  Full name
                </label>
                <input
                  id="signupName"
                  className={inputClass}
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Asif Ali"
                  required
                />
              </div>

              <div style={{ textAlign: 'left' }}>
                <label
                  htmlFor="signupEmail"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: '#374151',
                  }}
                >
                  Work email
                </label>
                <input
                  id="signupEmail"
                  className={inputClass}
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@work-email.com"
                  required
                />
              </div>

              <div style={{ textAlign: 'left' }}>
                <label
                  htmlFor="signupPassword"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: '#374151',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="signupPassword"
                    className={inputClass}
                    style={{ paddingRight: '2.5rem' }}
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B7280',
                      transition: 'color 0.15s ease',
                    }}
                    className="hover:text-[#111827] focus:outline-hidden"
                  >
                    {showSignupPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="primary-button flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                style={{
                  background: 'var(--erpfy-brand, #1e5631)',
                  color: 'var(--erpfy-brand-on, #ffffff)',
                  marginTop: '0.25rem',
                }}
              >
                {busy ? 'Creating account…' : 'Sign Up with Email'}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                margin: '1.25rem 0',
                color: '#9CA3AF',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              <span style={{ padding: '0 0.75rem', fontWeight: 500 }}>
                or sign up with
              </span>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            </div>

            {/* Social Buttons */}
            <button
              type="button"
              onClick={() => {
                setLoginEmail('developer@erpfy.test');
                setLoginPassword('erpfy-local-dev-password');
                setIsLogin(true);
              }}
              style={socialBtn}
            >
              {GoogleIcon}Sign up with Google
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginEmail('developer@erpfy.test');
                setLoginPassword('erpfy-local-dev-password');
                setIsLogin(true);
              }}
              style={{ ...socialBtn, marginBottom: 0 }}
            >
              {AppleIcon}Sign up with Apple
            </button>

            <div
              style={{
                marginTop: '1.25rem',
                fontSize: '0.875rem',
                color: '#6B7280',
              }}
            >
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsLogin(true);
                }}
                style={{
                  color: 'var(--erpfy-brand, #1e5631)',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                }}
                className="hover:underline"
              >
                Sign In
              </button>
            </div>
            {Footer}
          </div>
        )}
      </div>
    </div>
  );
}
