'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadCatalogChoices } from './catalogLookups';
import CategoryImageField from './CategoryImageField';
import {
  catalogRequest,
  Notice,
  inputClass,
  labelClass,
  cardClass,
  mainButton,
  secondaryButton,
  slugify,
} from './catalogApi';

const INITIAL_FORM = {
  name: '',
  slug: '',
  parent_id: '',
  sort_order: 0,
  emoji: '',
  image_url: '',
  logo_url: '',
  is_active: true,
};

export default function MasterForm({ entity, id }) {
  const router = useRouter();
  const isCategory = entity === 'categories';
  const title = isCategory ? 'Category' : 'Brand';
  const editing = Boolean(id);

  const [form, setForm] = useState(INITIAL_FORM);
  const [parents, setParents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!editing);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        if (isCategory) {
          const choices = await loadCatalogChoices('categories');
          if (mounted) setParents(choices);
        }

        if (editing) {
          const data = await catalogRequest(`/${entity}/${id}`);
          if (mounted) {
            setForm({
              ...INITIAL_FORM,
              ...data,
              parent_id: data.parent_id || '',
              emoji: data.emoji || '',
              image_url: data.image_url || '',
              logo_url: data.logo_url || '',
            });
          }
        }
      } catch (reason) {
        if (mounted) setError(reason.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [isCategory, editing, entity, id]);

  function update(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function updateName(name) {
    setForm((previous) => ({
      ...previous,
      name,
      slug: autoSlug ? slugify(name) : previous.slug,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        is_active: Boolean(form.is_active),
      };

      if (!isCategory) payload.logo_url = form.logo_url;
      if (isCategory) {
        Object.assign(payload, {
          parent_id: form.parent_id ? Number(form.parent_id) : null,
          sort_order: Number(form.sort_order),
          emoji: form.emoji,
          image_url: form.image_url,
        });
      }

      const result = await catalogRequest(
        editing ? `/${entity}/${id}` : `/${entity}`,
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        }
      );

      router.push(`/admin/${entity}/${result.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <Link href={`/admin/${entity}`} className="text-sm text-primary-deep hover:underline">
          ← Back to {entity}
        </Link>
        <h2 className="mt-2 text-xl">{editing ? 'Edit' : 'Add New'} {title}</h2>
        <p className="mt-1 text-sm text-taupe-600">
          {editing
            ? 'Update the record without deleting product references.'
            : 'Add a new catalog master record.'}
        </p>
      </div>

      <Notice error={error} />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className={`${cardClass} grid gap-5`}>
            <h3 className="text-lg">{title} Details</h3>

            <label className={labelClass}>
              Name *
              <input
                required
                className={inputClass}
                maxLength={120}
                value={form.name}
                onChange={(event) => updateName(event.target.value)}
              />
            </label>

            <label className={labelClass}>
              Slug *
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={140}
                className={inputClass}
                value={form.slug}
                onChange={(event) => {
                  setAutoSlug(false);
                  update('slug', slugify(event.target.value));
                }}
              />
            </label>

            {isCategory && (
              <>
                <label className={labelClass}>
                  Parent Category
                  <select
                    className={inputClass}
                    value={form.parent_id}
                    onChange={(event) => update('parent_id', event.target.value)}
                  >
                    <option value="">None (Top-level)</option>
                    {parents
                      .filter((category) => (
                        String(category.id) !== String(id) &&
                        (category.is_active || String(category.id) === String(form.parent_id))
                      ))
                      .map((category) => (
                        <option value={category.id} key={category.id}>{category.name}</option>
                      ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Emoji (Admin legacy, not used as store cover)
                    <input
                      className={inputClass}
                      maxLength={16}
                      value={form.emoji}
                      onChange={(event) => update('emoji', event.target.value)}
                    />
                  </label>
                  <label className={labelClass}>
                    Sort Order
                    <input
                      type="number"
                      min="-100000"
                      max="100000"
                      className={inputClass}
                      value={form.sort_order}
                      onChange={(event) => update('sort_order', event.target.value)}
                    />
                  </label>
                </div>

                <CategoryImageField
                  value={form.image_url}
                  onChange={(value) => update('image_url', value)}
                  disabled={saving}
                />
              </>
            )}
            {!isCategory && (
              <CategoryImageField
                label="Brand logo"
                id="brand-logo-file"
                fit="object-contain p-2"
                help="Shown in the brand row on the home page and on the Brands page. A square or wide logo on a white or transparent background works best (JPG, PNG or WebP, max 5 MB)."
                value={form.logo_url}
                onChange={(value) => update('logo_url', value)}
                disabled={saving}
              />
            )}
          </section>

          <aside className={`${cardClass} grid gap-4`}>
            <h3 className="text-lg">Visibility</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(event) => update('is_active', event.target.checked)}
              />
              Active
            </label>
            <p className="text-xs leading-relaxed text-taupe-600">
              Archived records remain stored so historical orders and product links stay intact.
            </p>
            <button className={mainButton} disabled={saving} type="submit">
              {saving ? 'Saving...' : editing ? 'Save Changes' : `Create ${title}`}
            </button>
            <Link className={secondaryButton} href={`/admin/${entity}`}>Cancel</Link>
          </aside>
        </form>
      )}
    </div>
  );
}
