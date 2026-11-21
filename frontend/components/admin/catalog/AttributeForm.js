
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
    catalogRequest,
    Notice,
    inputClass,
    labelClass,
    cardClass,
    mainButton,
    secondaryButton,
    fieldCode,
} from './catalogApi';

// Supported attribute field types
const fieldTypes = [
    'text',
    'textarea',
    'number',
    'boolean',
    'date',
    'select',
    'multiselect',
];

// Default form values
const initialFormData = {
    name: '',
    code: '',
    data_type: 'text',
    unit: '',
    is_active: true,
    allowed_values_json: [],
};

export default function AttributeForm({ id }) {
    const router = useRouter();
    const editing = Boolean(id);

    // Form state
    const [form, setForm] = useState(initialFormData);
    const [options, setOptions] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [codeTouched, setCodeTouched] = useState(editing);

    // --------------------------------------------------
    // Load existing attribute for Edit mode
    // --------------------------------------------------

    useEffect(() => {
        if (!id) {
            return;
        }

        let cancelled = false;

        async function loadAttribute() {
            setLoading(true);
            setError('');

            try {
                const data = await catalogRequest(
                    `/attributes/${id}`
                );

                const allowedValues =
                    typeof data.allowed_values_json === 'string'
                        ? JSON.parse(data.allowed_values_json)
                        : data.allowed_values_json || [];

                if (!Array.isArray(allowedValues)) {
                    throw new Error(
                        'Invalid attribute options format.'
                    );
                }

                if (cancelled) {
                    return;
                }

                setForm(data);
                setOptions(allowedValues.join('\n'));
                setCodeTouched(true);
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadAttribute();

        return () => {
            cancelled = true;
        };
    }, [id]);

    // --------------------------------------------------
    // Form input handlers
    // --------------------------------------------------

    function handleNameChange(event) {
        const name = event.target.value;

        setForm((previous) => ({
            ...previous,
            name,
            code: codeTouched
                ? previous.code
                : fieldCode(name),
        }));
    }

    function handleCodeChange(event) {
        const code = event.target.value
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');

        setCodeTouched(true);

        setForm((previous) => ({
            ...previous,
            code,
        }));
    }

    function handleTypeChange(event) {
        setForm((previous) => ({
            ...previous,
            data_type: event.target.value,
        }));
    }

    function handleUnitChange(event) {
        setForm((previous) => ({
            ...previous,
            unit: event.target.value,
        }));
    }

    function handleStatusChange(event) {
        setForm((previous) => ({
            ...previous,
            is_active: event.target.checked,
        }));
    }

    // --------------------------------------------------
    // Create / Update attribute
    // --------------------------------------------------

    async function handleSubmit(event) {
        event.preventDefault();

        setError('');
        setSaving(true);

        try {
            const allowedValues = options
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean);

            const hasChoices = [
                'select',
                'multiselect',
            ].includes(form.data_type);

            const payload = {
                code: form.code,
                name: form.name,
                data_type: form.data_type,
                unit: form.unit || null,
                is_active: Boolean(form.is_active),
                allowed_values_json: hasChoices
                    ? allowedValues
                    : null,
            };

            const endpoint = editing
                ? `/attributes/${id}`
                : '/attributes';

            const method = editing
                ? 'PATCH'
                : 'POST';

            const result = await catalogRequest(endpoint, {
                method,
                body: JSON.stringify(payload),
            });

            router.push(`/admin/attributes/${result.id}`);
            router.refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    // --------------------------------------------------
    // Render
    // --------------------------------------------------

    return (
        <div className="grid gap-5">

            {/* Page Header */}
            <div>
                <Link
                    href="/admin/attributes"
                    className="text-sm text-primary-deep hover:underline"
                >
                    ← Back to Attributes
                </Link>

                <h2 className="mt-2 text-xl">
                    {editing
                        ? 'Edit Attribute'
                        : 'Create Attribute'}
                </h2>

                <p className="text-sm text-taupe-600">
                    Specify the field type once, then reuse it
                    across Product Types.
                </p>
            </div>

            {/* Error Message */}
            <Notice error={error} />

            {loading ? (
                <p>Loading...</p>
            ) : (
                <form
                    className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"
                    onSubmit={handleSubmit}
                >

                    {/* Main Form */}
                    <section
                        className={`${cardClass} grid gap-5`}
                    >
                        <h3 className="text-lg">
                            Attribute Definition
                        </h3>

                        {/* Field Name */}
                        <label className={labelClass}>
                            Field Name *

                            <input
                                required
                                maxLength="120"
                                className={inputClass}
                                value={form.name}
                                onChange={handleNameChange}
                            />
                        </label>

                        {/* Field Code */}
                        <label className={labelClass}>
                            Field Code *

                            <input
                                required
                                className={inputClass}
                                value={form.code}
                                onChange={handleCodeChange}
                            />

                            <span className="text-xs text-taupe-600">
                                Stable identifier, e.g.
                                battery_capacity or ingredients.
                            </span>
                        </label>

                        {/* Type and Unit */}
                        <div className="grid gap-4 sm:grid-cols-2">

                            <label className={labelClass}>
                                Data Type *

                                <select
                                    className={inputClass}
                                    value={form.data_type}
                                    onChange={handleTypeChange}
                                >
                                    {fieldTypes.map((type) => (
                                        <option
                                            key={type}
                                            value={type}
                                        >
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className={labelClass}>
                                Unit (optional)

                                <input
                                    className={inputClass}
                                    maxLength="32"
                                    value={form.unit || ''}
                                    placeholder="days, inch, mAh"
                                    onChange={handleUnitChange}
                                />
                            </label>
                        </div>

                        {/* Choices for Select Fields */}
                        {[
                            'select',
                            'multiselect',
                        ].includes(form.data_type) && (
                            <label className={labelClass}>
                                Allowed Choices * (one per line)

                                <textarea
                                    rows={6}
                                    className={inputClass}
                                    placeholder={
                                        'Cotton\nPolyester\nLinen'
                                    }
                                    value={options}
                                    onChange={(event) => {
                                        setOptions(event.target.value);
                                    }}
                                />
                            </label>
                        )}
                    </section>

                    {/* Availability Settings */}
                    <aside
                        className={`${cardClass} grid gap-4`}
                    >
                        <h3 className="text-lg">
                            Availability
                        </h3>

                        <label className="flex gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={Boolean(form.is_active)}
                                onChange={handleStatusChange}
                            />

                            Active for new templates
                        </label>

                        <p className="text-xs leading-relaxed text-taupe-600">
                            Required, Visible and Filterable
                            settings are assigned per Product
                            Type. Existing product values
                            are preserved.
                        </p>

                        {/* Submit Button */}
                        <button
                            className={mainButton}
                            type="submit"
                            disabled={saving}
                        >
                            {saving
                                ? 'Saving...'
                                : editing
                                    ? 'Save Attribute'
                                    : 'Create Attribute'}
                        </button>

                        {/* Cancel Button */}
                        <Link
                            className={secondaryButton}
                            href="/admin/attributes"
                        >
                            Cancel
                        </Link>
                    </aside>
                </form>
            )}
        </div>
    );
}
