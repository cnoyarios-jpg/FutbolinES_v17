import { useState } from 'react';
import { registerUser, loginUser, isNicknameAvailable, isDisplayNameAvailable, getCityFromPostalCode } from '@/data/mock';
import { Position, TableBrand } from '@/types';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: () => void;
}

const TABLE_BRANDS: TableBrand[] = ['Presas', 'Tsunami', 'Infinity', 'Val', 'Garlando', 'Leonhart', 'Tornado', 'Otro'];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [position, setPosition] = useState<Position>('portero');
  const [style, setStyle] = useState<'parado' | 'movimiento'>('parado');
  const [preferredTable, setPreferredTable] = useState<TableBrand>('Presas');
  const [nicknameError, setNicknameError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');

  const derivedCity = postalCode.length >= 2 ? getCityFromPostalCode(postalCode) : '';

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    if (value.trim().length >= 3) {
      if (!isNicknameAvailable(value.trim())) {
        setNicknameError('Este nickname ya está en uso');
      } else {
        setNicknameError('');
      }
    } else {
      setNicknameError('');
    }
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (value.trim().length >= 2) {
      if (!isDisplayNameAvailable(value.trim())) {
        setDisplayNameError('Este nombre completo ya está registrado');
      } else {
        setDisplayNameError('');
      }
    } else {
      setDisplayNameError('');
    }
  };

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Email y contraseña son obligatorios');
      return;
    }
    const result = loginUser(email, password);
    if (result.success) {
      toast.success('¡Bienvenido!');
      onLogin();
    } else {
      toast.error(result.error || 'Error al iniciar sesión');
    }
  };

  const handleRegister = () => {
    if (!nickname.trim() || nickname.trim().length < 3) {
      toast.error('El nickname debe tener al menos 3 caracteres');
      return;
    }
    if (!displayName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!email.trim()) {
      toast.error('El email es obligatorio');
      return;
    }
    if (!password.trim() || password.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (!postalCode.trim()) {
      toast.error('El código postal es obligatorio');
      return;
    }
    if (!/^\d{5}$/.test(postalCode.trim())) {
      toast.error('El código postal debe ser exactamente 5 números');
      return;
    }
    if (nicknameError) {
      toast.error(nicknameError);
      return;
    }
    if (displayNameError) {
      toast.error(displayNameError);
      return;
    }
    const result = registerUser({
      nickname: nickname.trim(),
      displayName: displayName.trim(),
      email: email.trim(),
      password,
      city: derivedCity,
      postalCode: postalCode.trim(),
      preferredPosition: position,
      preferredStyle: style,
      preferredTable,
    });
    if (result.success) {
      toast.success('¡Cuenta creada! Bienvenido.');
      onLogin();
    } else {
      toast.error(result.error || 'Error al registrarse');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Futbolín<span className="text-accent">ES</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Todo el futbolín español en una app</p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-elevated border border-border/30">
          <div className="flex gap-1 mb-6">
            <button onClick={() => setIsRegister(false)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${!isRegister ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
              Iniciar sesión
            </button>
            <button onClick={() => setIsRegister(true)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${isRegister ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
              Registrarse
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nickname *</label>
                  <input
                    className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${nicknameError ? 'border-destructive' : 'border-input'} bg-card`}
                    placeholder="Tu nickname único"
                    value={nickname}
                    onChange={e => handleNicknameChange(e.target.value)}
                  />
                  {nicknameError && <p className="mt-1 text-xs text-destructive">{nicknameError}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nombre completo *</label>
                  <input
                    className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${displayNameError ? 'border-destructive' : 'border-input'} bg-card`}
                    placeholder="Tu nombre"
                    value={displayName}
                    onChange={e => handleDisplayNameChange(e.target.value)}
                  />
                  {displayNameError && <p className="mt-1 text-xs text-destructive">{displayNameError}</p>}
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email *</label>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contraseña *</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Código Postal *</label>
                  <input
                    className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${postalCode.trim() && !/^\d{5}$/.test(postalCode.trim()) ? 'border-destructive' : 'border-input'} bg-card`}
                    placeholder="Ej: 28001"
                    value={postalCode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                      setPostalCode(val);
                    }}
                    maxLength={5}
                    inputMode="numeric"
                  />
                  {postalCode.trim() && !/^\d{5}$/.test(postalCode.trim()) && (
                    <p className="mt-1 text-xs text-destructive">Debe ser exactamente 5 dígitos</p>
                  )}
                  {derivedCity && postalCode.length === 5 && (
                    <p className="mt-1 text-xs text-success font-medium">📍 {derivedCity}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Posición preferida</label>
                  <div className="flex gap-2">
                    {(['portero', 'delantero'] as Position[]).map(p => (
                      <button key={p} onClick={() => setPosition(p)}
                        className={`flex-1 rounded-xl border p-2.5 text-center text-xs font-bold capitalize transition ${position === p ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Estilo de juego</label>
                  <div className="flex gap-2">
                    {(['parado', 'movimiento'] as const).map(s => (
                      <button key={s} onClick={() => setStyle(s)}
                        className={`flex-1 rounded-xl border p-2.5 text-center text-xs font-bold capitalize transition ${style === s ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Mesa preferida</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TABLE_BRANDS.map(brand => (
                      <button key={brand} onClick={() => setPreferredTable(brand)}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${preferredTable === brand ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>{brand}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={isRegister ? handleRegister : handleLogin}
              className="mt-2 w-full rounded-xl bg-primary py-3 text-center font-display font-bold text-primary-foreground shadow-md transition active:scale-[0.98]"
            >
              {isRegister ? 'Crear cuenta' : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
