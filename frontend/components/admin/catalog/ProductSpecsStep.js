import { inputClass, labelClass } from './catalogApi';
import { allowedValues } from './productWizardUtils';

function SpecificationInput({ assignment, value, onChange }) {
  const attribute = assignment.attribute;
  const fieldId = `attr-${attribute.id}`;

  if (attribute.data_type === 'textarea') {
    return (
      <textarea
        id={fieldId}
        rows={3}
        className={inputClass}
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
      />
    );
  }

  if (attribute.data_type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          id={fieldId}
          type="checkbox"
          checked={value === true}
          onChange={event => onChange(event.target.checked)}
        />
        Yes / True
      </label>
    );
  }

  if (attribute.data_type === 'select') {
    return (
      <select
        id={fieldId}
        className={inputClass}
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">Choose...</option>
        {allowedValues(attribute).map(choice => (
          <option key={choice} value={choice}>{choice}</option>
        ))}
      </select>
    );
  }

  if (attribute.data_type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];

    return (
      <div className="flex flex-wrap gap-3">
        {allowedValues(attribute).map(choice => (
          <label key={choice} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(choice)}
              onChange={event => onChange(
                event.target.checked
                  ? [...selected, choice]
                  : selected.filter(item => item !== choice)
              )}
            />
            {choice}
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      id={fieldId}
      className={inputClass}
      type={attribute.data_type === 'number'
        ? 'number'
        : attribute.data_type === 'date' ? 'date' : 'text'}
      step={attribute.data_type === 'number' ? 'any' : undefined}
      value={value ?? ''}
      onChange={event => onChange(event.target.value)}
    />
  );
}

export default function ProductSpecsStep({
  selectedType,
  assignments,
  specifications,
  onChange,
}) {
  const groups = {};

  for (const assignment of assignments) {
    const groupName = assignment.group_name || 'General';
    (groups[groupName] ??= []).push(assignment);
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg">Dynamic Specifications</h3>
        <p className="mt-1 text-sm text-taupe-600">
          Fields come from the selected Product Type. Add or edit fields
          under Catalog → Attributes.
        </p>
      </div>

      {!selectedType ? (
        <p className="rounded-xl bg-taupe-50 p-4 text-sm">
          Choose a Product Type in Step 1 first.
        </p>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-taupe-600">
          No attributes assigned to {selectedType.name}.
        </p>
      ) : (
        Object.entries(groups).map(([groupName, items]) => (
          <section
            key={groupName}
            className="grid gap-4 rounded-xl border border-taupe-200 p-4"
          >
            <h4 className="font-medium">{groupName}</h4>
            {items.filter(item => item.is_visible).map(assignment => (
              <div className={labelClass} key={assignment.attribute_id}>
                <label htmlFor={`attr-${assignment.attribute_id}`}>
                  {assignment.attribute.name}
                  {assignment.is_required ? ' *' : ''}
                  {assignment.attribute.unit ? ` (${assignment.attribute.unit})` : ''}
                </label>
                <SpecificationInput
                  assignment={assignment}
                  value={specifications[assignment.attribute_id]}
                  onChange={value => onChange(assignment.attribute_id, value)}
                />
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
