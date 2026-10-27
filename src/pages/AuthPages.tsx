// Login y registro de la tripulación.

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toApiError } from '../api/client';

type RegisterField = 'teamName' | 'email' | 'password';
type FieldErrors = Partial<Record<RegisterField, string>>;

/** Mapea el error del servidor al campo que corresponde (409 o details de 400). */
function mapServerErrors(error: unknown): { fields: FieldErrors; general: string | null } {
  const apiError = toApiError(error);
  const fields: FieldErrors = {};

  // 409: el código dice qué campo está repetido.
  if (apiError.code === 'EMAIL_ALREADY_REGISTERED') fields.email = apiError.message;
  if (apiError.code === 'TEAM_NAME_TAKEN') fields.teamName = apiError.message;

  // 400 VALIDATION_ERROR: `details` trae { field, message } por cada campo inválido.
  for (const field of ['teamName', 'email', 'password'] as const) {
    const message = apiError.fieldErrors[field];
    if (message && !fields[field]) fields[field] = message;
  }

  const hasFieldErrors = Object.keys(fields).length > 0;
  return { fields, general: hasFieldErrors ? null : apiError.message };
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="paper-card w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <img src="/compass.svg" alt="" className="mx-auto mb-3 size-12" />
          <h1 className="font-display text-3xl text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: string;
  disabled: boolean;
  minLength?: number;
  maxLength?: number;
}

function Field({ id, label, type, value, onChange, error, autoComplete, disabled, minLength, maxLength }: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        required
        minLength={minLength}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`field-input ${error ? 'field-input-error' : ''}`}
      />
      {/* El error del servidor aparece JUNTO al campo correspondiente */}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-seal-700">
          {error}
        </p>
      )}
    </div>
  );
}

function GeneralError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-seal-600/40 bg-seal-600/10 px-3 py-2 text-sm text-seal-700">
      {message}
    </p>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      // No navegamos aquí: al cambiar el status a 'authenticated', PublicOnlyRoute
      // redirige a `state.from` (la ruta que el usuario quería) o al dashboard.
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.code === 'INVALID_CREDENTIALS' ? 'Email o contraseña incorrectos.' : apiError.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Zarpar" subtitle="Inicia sesión con la cuenta de tu tripulación">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" disabled={submitting} maxLength={120} />
        <Field
          id="password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={submitting}
          maxLength={120}
        />
        <GeneralError message={error} />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        ¿Tripulación nueva?{' '}
        {/* Conservamos state.from para que el registro también vuelva al destino pendiente */}
        <Link to="/register" state={location.state} className="font-semibold text-sea-700 underline">
          Registrar tripulación
        </Link>
      </p>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const location = useLocation();
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Al editar un campo, borramos su error para que el usuario vea que lo corrigió.
  function updateField(field: RegisterField, setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFieldErrors({});
    setGeneralError(null);
    try {
      // El registro devuelve la sesión: entramos directo a la app.
      await register({ teamName: teamName.trim(), email: email.trim(), password });
    } catch (err) {
      const { fields, general } = mapServerErrors(err);
      setFieldErrors(fields);
      setGeneralError(general);
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Nueva tripulación" subtitle="Registra la cuenta de tu equipo de cazarrecompensas">
      {/* noValidate: dejamos que el SERVIDOR valide y mostramos sus errores junto a cada campo */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          id="teamName"
          label="Nombre de la tripulación"
          type="text"
          value={teamName}
          onChange={updateField('teamName', setTeamName)}
          error={fieldErrors.teamName}
          autoComplete="organization"
          disabled={submitting}
          minLength={3}
          maxLength={40}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={updateField('email', setEmail)}
          error={fieldErrors.email}
          autoComplete="email"
          disabled={submitting}
          maxLength={120}
        />
        <Field
          id="password"
          label="Contraseña (8 a 72 caracteres)"
          type="password"
          value={password}
          onChange={updateField('password', setPassword)}
          error={fieldErrors.password}
          autoComplete="new-password"
          disabled={submitting}
          minLength={8}
          maxLength={72}
        />
        <GeneralError message={generalError} />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Registrando…' : 'Registrar y zarpar'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        ¿Ya tienen cuenta?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-sea-700 underline">
          Iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
