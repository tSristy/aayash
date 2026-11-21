'use strict';
const { ValidationError, validId } = require('./catalog-masters');
const TYPES = new Set(['text', 'textarea', 'number', 'boolean', 'date', 'select', 'multiselect']);
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const str = (v, max, name, required = false) => {
    if (v == null && !required)
        return null;
    if (typeof v !== 'string')
        throw new ValidationError(`${name} must be text.`);
    const s = v.trim();
    if ((required && !s) || s.length > max)
        throw new ValidationError(`${name} must contain ${required ? '1 to ' : 'at most '}${max} characters.`);
    return s || null;
};
const code = (v, name = 'Code') => {
    const s = str(v, 80, name, true)?.toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(s))
        throw new ValidationError(`${name} must start with a letter and contain only lowercase letters, numbers or underscores.`);
    return s;
};
const bool = (v, name) => {
    if (typeof v !== 'boolean')
        throw new ValidationError(`${name} must be true or false.`); return v;
};
const id = (v) => validId(String(v));
const integer = (v, name, min = 0, max = 1000000) => {
    const n = Number(v); if (!Number.isSafeInteger(n) || n < min || n > max || v === '' || v === null)
        throw new ValidationError(`${name} must be an integer between ${min} and ${max}.`); return n;
};
const money = (v, name = 'Amount', allowNull = false) => {
    if ((v === null || v === '' || v === undefined) && allowNull)
        return null;
    if (!/^(?:0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?$/.test(String(v)))
        throw new ValidationError(`${name} must be a valid positive amount with up to 2 decimals.`);
    return Number(v).toFixed(2);
};
const optionalKeys = (input, allowed) => {
    if (!plain(input))
        throw new ValidationError('Invalid request payload.'); let extra = Object.keys(input).filter(k => !allowed.includes(k)); if (extra.length)
        throw new ValidationError('Unknown or protected fields: ' + extra.join(', '));
};
function validateType(body, mode = 'create') {
    optionalKeys(body, ['code', 'name', 'description', 'is_active']);
    const v = {};
    if ('code' in body)
        v.code = code(body.code);
    else if (mode === 'create')
        throw new ValidationError('Code is required.');
    if ('name' in body)
        v.name = str(body.name, 120, 'Name', true);
    else if (mode === 'create')
        throw new ValidationError('Name is required.');
    if ('description' in body)
        v.description = str(body.description, 2000, 'Description');
    if ('is_active' in body)
        v.is_active = bool(body.is_active, 'Active');
    return v;
}
function validateAttribute(body, mode = 'create') {
    optionalKeys(body, ['code', 'name', 'data_type', 'unit', 'allowed_values_json', 'validation_json', 'is_active']);
    const v = {};
    if ('code' in body)
        v.code = code(body.code);
    else if (mode === 'create')
        throw new ValidationError('Code is required.');
    if ('name' in body)
        v.name = str(body.name, 120, 'Name', true);
    else if (mode === 'create')
        throw new ValidationError('Name is required.');
    if ('data_type' in body) {
        if (!TYPES.has(body.data_type))
            throw new ValidationError('Invalid attribute data type.');
        v.data_type = body.data_type;
    }
    else if (mode === 'create')
        throw new ValidationError('Data type required.');
    if ('unit' in body)
        v.unit = str(body.unit, 32, 'Unit');
    if ('allowed_values_json' in body) {
        const a = body.allowed_values_json;
        if (a !== null && (!Array.isArray(a) || a.length > 50 || a.some(x => typeof x !== 'string' || !x.trim() || x.trim().length > 100) || new Set(a.map(x => x.trim().toLowerCase())).size !== a.length))
            throw new ValidationError('Options must be at most 50 distinct non-empty strings.');
        v.allowed_values_json = a?.map(x => x.trim()) || null;
    }
    if ('validation_json' in body) {
        let a = body.validation_json;
        if (a !== null && (!plain(a) || Object.keys(a).some(k => !['min', 'max', 'min_length', 'max_length'].includes(k))))
            throw new ValidationError('Invalid validation rules.');
        v.validation_json = a;
    }
    if ('is_active' in body)
        v.is_active = bool(body.is_active, 'Active');
    const dataType = v.data_type;
    if (mode === 'create' && ['select', 'multiselect'].includes(dataType) && (!v.allowed_values_json || !v.allowed_values_json.length))
        throw new ValidationError('Select attributes require options.');
    return v;
}
function validateAssignments(body) {
    optionalKeys(body, ['attributes']);
    if (!Array.isArray(body.attributes) || body.attributes.length > 100)
        throw new ValidationError('Attributes must be an array (maximum 100).');
    const used = new Set();
    return body.attributes.map((a, i) => {
        optionalKeys(a, ['attribute_id', 'group_name', 'is_required', 'is_filterable', 'is_visible', 'sort_order']);
        const attribute_id = id(a.attribute_id);
        if (used.has(attribute_id))
            throw new ValidationError('Duplicate attribute assignment.');
        used.add(attribute_id);
        const item = { attribute_id, group_name: str(a.group_name ?? 'General', 100, 'Group', true), is_required: a.is_required === undefined ? false : bool(a.is_required, 'Required'), is_filterable: a.is_filterable === undefined ? false : bool(a.is_filterable, 'Filterable'), is_visible: a.is_visible === undefined ? true : bool(a.is_visible, 'Visible'), sort_order: integer(a.sort_order ?? i, 'Sort order', -10000, 10000) };
        if (item.is_required && !item.is_visible)
            throw new ValidationError('Required fields must remain visible.');
        return item;
    });
}
function checkAttributeValue(attribute, value) {
    const type = attribute.data_type;
    if (value === null || value === undefined || value === '')
        return null;
    const out = { value_text: null, value_number: null, value_boolean: null, value_date: null, value_json: null };
    const options = Array.isArray(attribute.allowed_values_json) ? attribute.allowed_values_json : typeof attribute.allowed_values_json === 'string' ? JSON.parse(attribute.allowed_values_json || 'null') : [];
    if (type === 'text' || type === 'textarea' || type === 'select') {
        if (typeof value !== 'string' || value.length > (type === 'textarea' ? 6000 : 500))
            throw new ValidationError(`${attribute.name}: invalid text.`);
        if (type === 'select' && !options.includes(value))
            throw new ValidationError(`${attribute.name}: choice is not allowed.`);
        out.value_text = value;
    }
    else if (type === 'number') {
        if (typeof value === 'boolean' || value === null || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 1e12)
            throw new ValidationError(`${attribute.name}: invalid number.`);
        out.value_number = Number(value);
    }
    else if (type === 'boolean') {
        if (typeof value !== 'boolean')
            throw new ValidationError(`${attribute.name}: expected yes/no.`);
        out.value_boolean = value;
    }
    else if (type === 'date') {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))
            throw new ValidationError(`${attribute.name}: invalid date.`);
        out.value_date = value;
    }
    else if (type === 'multiselect') {
        if (!Array.isArray(value) || value.length > 50 || value.some(x => !options.includes(x)) || new Set(value).size !== value.length)
            throw new ValidationError(`${attribute.name}: invalid multiple choices.`);
        out.value_json = value;
    }
    return out;
}
module.exports = { ValidationError, plain, str, code, bool, id, integer, money, optionalKeys, validateType, validateAttribute, validateAssignments, checkAttributeValue };
