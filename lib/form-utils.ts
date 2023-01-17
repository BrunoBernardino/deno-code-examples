import { html } from './utils.ts';

export interface FormField {
  name: string;
  label: string;
  value?: string | null;
  description?: string;
  placeholder?: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox' | 'hidden';
  step?: string;
  max?: string;
  min?: string;
  options?: {
    label: string;
    value: string;
  }[];
  checked?: boolean;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  extraAttributes?: string;
  extraClasses?: string;
}

export function getFormDataField(formData: FormData, field: string) {
  return ((formData.get(field) || '') as string).trim();
}

export function getFormDataFieldArray(formData: FormData, field: string) {
  return ((formData.getAll(field) || []) as string[]).map((value) => value.trim());
}

export function generateFieldHtml(
  field: FormField,
  formData: FormData,
) {
  const value =
    (field.multiple ? getFormDataFieldArray(formData, field.name) : getFormDataField(formData, field.name)) ||
    field.value;

  return html`
    <fieldset class="block mb-4 ${field.extraClasses || ''}" ${field.extraAttributes || ''}>
      <label class="text-slate-700 block pb-1" for="field_${field.name}">${field.label}</label>
      ${generateInputHtml(field, value)}
      ${
    field.description
      ? html`<aside class="text-sm p-2 ${field.type === 'checkbox' ? 'inline' : ''}">${field.description}</aside>`
      : ''
  }
    </fieldset>
  `;
}

function generateInputHtml(
  { name, placeholder, type, options, step, max, min, checked, multiple, disabled, required, readOnly }: FormField,
  value?: string | string[] | null,
) {
  const stepAttribute = step && `step="${step}"`;
  const maxAttribute = max && `max="${max}"`;
  const minAttribute = min && `min="${min}"`;
  const checkedAttribute = checked && type === 'checkbox' && value && 'checked';
  const multipleAttribute = multiple && 'multiple';
  const requiredAttritbute = required && 'required';
  const disabledAttribute = disabled && 'disabled';
  const readOnlyAttritubte = readOnly && 'readonly';

  const additionalAttributes = [
    stepAttribute,
    maxAttribute,
    minAttribute,
    checkedAttribute,
    multipleAttribute,
    requiredAttritbute,
    disabledAttribute,
    readOnlyAttritubte,
  ].filter(Boolean).join(' ');

  if (type === 'select') {
    return html`<select ${additionalAttributes} class="mt-1 input-field" id="field_${name}" name="${name}" type="${type}">
    ${
      options?.map((option) =>
        html`<option value="${option.value}" ${
          (option.value === value || (multiple && (value || [])?.includes(option.value))) ? 'selected' : ''
        }>${option.label}</option>`
      ).join('\n')
    }
  </select>`;
  }

  if (type === 'hidden') {
    return html`<input id="field_${name}" name="${name}" type="${type}" value="${(value as string) || ''}" readonly />`;
  }

  if (type === 'textarea') {
    return html`<textarea ${additionalAttributes} class="mt-1 input-field" id="field_${name}" name="${name}" rows="6" placeholder="${
      placeholder || ''
    }">${value || ''}</textarea>`;
  }

  if (type === 'checkbox') {
    return html`
      <input ${additionalAttributes} id="field_${name}" name="${name}" type="${type}" value="${
      (value as string) || ''
    }" />
    `;
  }

  return html`<input ${additionalAttributes} class="mt-1 input-field" id="field_${name}" name="${name}" type="${type}" placeholder="${
    placeholder || ''
  }" value="${(value as string) || ''}" />`;
}
