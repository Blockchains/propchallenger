import { useId, useState } from 'react';
import type { FieldError, ScenarioInput } from '../engine';
import { FIELDS, GROUP_TITLES, type FieldDef } from './fields';

interface Props {
  value: ScenarioInput;
  onChange: (next: ScenarioInput) => void;
  errors: FieldError[];
  compact?: boolean;
  idPrefix?: string;
  lockedFields?: (keyof ScenarioInput)[];
}

function Field({ def, value, onChange, error, compact, locked }: { def: FieldDef; value: string; onChange: (v: string) => void; error?: string; compact?: boolean; locked?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const num = Number(value);
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <div className="field-head">
        <label htmlFor={id}>
          {def.label} <span className="unit">({def.unit})</span>
        </label>
        {!compact && (
          <button type="button" className="link-button" aria-expanded={open} aria-controls={`${id}-explain`} onClick={() => setOpen(!open)}>
            Explain this input
          </button>
        )}
      </div>
      <div className="field-controls">
        <input
          id={id}
          type="text"
          inputMode={def.inputMode}
          autoComplete="off"
          value={value}
          readOnly={locked}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {def.slider && !compact && (
          <input
            type="range"
            aria-label={`${def.label} slider`}
            min={def.slider.min}
            max={def.slider.max}
            step={def.slider.step}
            disabled={locked}
            value={Number.isFinite(num) ? Math.min(Math.max(num, def.slider.min), def.slider.max) : def.slider.min}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
      {locked && <p className="hint">Imported from the selected product record. Switch to a custom challenge to edit.</p>}
      {error && <p className="error" id={`${id}-err`} role="alert">{error}</p>}
      {open && !compact && <p className="explain" id={`${id}-explain`}>{def.explain}</p>}
    </div>
  );
}

export function ScenarioEditor({ value, onChange, errors, compact, lockedFields = [] }: Props) {
  const groups: FieldDef['group'][] = ['strategy', 'challenge', 'calendar'];
  const errFor = (k: keyof ScenarioInput) => errors.find((e) => e.field === k)?.message;
  return (
    <div className={`editor${compact ? ' compact' : ''}`}>
      {groups.map((g) => {
        const defs = FIELDS.filter((f) => f.group === g && (!compact || g !== 'calendar'));
        if (!defs.length) return null;
        return (
          <fieldset key={g}>
            <legend>{GROUP_TITLES[g]}</legend>
            {defs.map((d) => (
              <Field
                key={d.key}
                def={d}
                compact={compact}
                value={value[d.key] ?? ''}
                locked={lockedFields.includes(d.key)}
                error={errFor(d.key)}
                onChange={(v) => onChange({ ...value, [d.key]: v })}
              />
            ))}
          </fieldset>
        );
      })}
      {errors.filter((e) => e.field === 'scenario').map((e) => (
        <p key={e.message} className="error" role="alert">{e.message}</p>
      ))}
    </div>
  );
}
