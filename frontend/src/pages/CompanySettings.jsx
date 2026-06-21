import React, { useEffect, useState, useRef } from 'react';
import {
  Building2,
  Upload,
  Plus,
  Trash2,
  Save,
  CheckCircle,
} from 'lucide-react';
import api from '../services/api';

const EMPTY_BANK = { bankName: '', accountName: '', accountNumber: '', sortCode: '' };

const inputCls =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent';

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <Icon size={18} className="text-primary-900" />
      <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
    </div>
  );
}

function UploadCard({ label, fieldKey, value, onUpload, uploading }) {
  const ref = useRef();
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
      <div
        onClick={() => ref.current.click()}
        className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
      >
        {value ? (
          <>
            <img
              src={value}
              alt={label}
              className="max-h-20 object-contain"
            />
            <p className="text-xs text-gray-400">Click to replace</p>
          </>
        ) : (
          <>
            <Upload size={24} className="text-gray-300" />
            <p className="text-xs text-gray-400">Click to upload</p>
          </>
        )}
        {uploading === fieldKey && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-900" />
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files[0] && onUpload(fieldKey, e.target.files[0])}
      />
    </div>
  );
}

export default function CompanySettings() {
  const [form, setForm] = useState({
    companyName: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    cacNumber: '',
    tin: '',
    vat: '',
    paymentInstructions: '',
    bankDetails: [],
  });
  const [assets, setAssets] = useState({ logo: '', signature: '', stamp: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/company')
      .then(({ data }) => {
        const c = data.company;
        setForm({
          companyName: c.companyName ?? '',
          address: c.address ?? '',
          phone: c.phone ?? '',
          whatsapp: c.whatsapp ?? '',
          email: c.email ?? '',
          website: c.website ?? '',
          cacNumber: c.cacNumber ?? '',
          tin: c.tin ?? '',
          vat: c.vat ?? '',
          paymentInstructions: c.paymentInstructions ?? '',
          bankDetails: c.bankDetails ?? [],
        });
        setAssets({
          logo: c.logo ?? '',
          signature: c.signature ?? '',
          stamp: c.stamp ?? '',
        });
      })
      .catch((err) => {
        if (err.response?.status !== 404) {
          setError('Failed to load company settings');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put('/company', {
        ...form,
        bankDetails: JSON.stringify(form.bankDetails),
      });
      showToast('Company settings saved successfully');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (type, file) => {
    setUploading(type);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/company/upload/${type}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAssets((a) => ({ ...a, [type]: data.url }));
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded`);
    } catch {
      setError(`Failed to upload ${type}`);
    } finally {
      setUploading('');
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const addBank = () =>
    setForm((f) => ({ ...f, bankDetails: [...f.bankDetails, { ...EMPTY_BANK }] }));

  const updateBank = (i, key, val) =>
    setForm((f) => {
      const arr = [...f.bankDetails];
      arr[i] = { ...arr[i], [key]: val };
      return { ...f, bankDetails: arr };
    });

  const removeBank = (i) =>
    setForm((f) => ({ ...f, bankDetails: f.bankDetails.filter((_, idx) => idx !== i) }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 text-sm animate-fade-in">
          <CheckCircle size={18} />
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand Assets */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <SectionTitle icon={Building2} title="Brand Assets" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UploadCard label="Company Logo" fieldKey="logo" value={assets.logo} onUpload={handleUpload} uploading={uploading} />
            <UploadCard label="Signature" fieldKey="signature" value={assets.signature} onUpload={handleUpload} uploading={uploading} />
            <UploadCard label="Stamp / Seal" fieldKey="stamp" value={assets.stamp} onUpload={handleUpload} uploading={uploading} />
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <SectionTitle icon={Building2} title="Company Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={form.companyName} onChange={set('companyName')} className={inputCls} placeholder="Pico Bello Projekte Ltd" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Address</label>
              <textarea rows={2} value={form.address} onChange={set('address')} className={inputCls + ' resize-none'} placeholder="Full business address" />
            </div>
            {[
              { label: 'Phone', key: 'phone', placeholder: '+234 800 000 0000' },
              { label: 'WhatsApp', key: 'whatsapp', placeholder: '+234 800 000 0000' },
              { label: 'Email', key: 'email', placeholder: 'info@company.com', type: 'email' },
              { label: 'Website', key: 'website', placeholder: 'https://company.com', type: 'url' },
            ].map(({ label, key, placeholder, type = 'text' }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
                <input type={type} value={form[key]} onChange={set(key)} className={inputCls} placeholder={placeholder} />
              </div>
            ))}
          </div>
        </div>

        {/* Legal / Tax */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <SectionTitle icon={Building2} title="Legal & Tax Information" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'CAC Number', key: 'cacNumber', placeholder: 'RC 000000' },
              { label: 'TIN', key: 'tin', placeholder: '00000000-0001' },
              { label: 'VAT Number', key: 'vat', placeholder: '00000000-0001' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
                <input type="text" value={form[key]} onChange={set(key)} className={inputCls} placeholder={placeholder} />
              </div>
            ))}
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-primary-900" />
              <h3 className="font-semibold text-gray-800 text-sm">Bank Details</h3>
            </div>
            <button
              type="button"
              onClick={addBank}
              className="flex items-center gap-1.5 text-xs text-primary-900 hover:underline font-medium"
            >
              <Plus size={14} />
              Add Bank
            </button>
          </div>

          {form.bankDetails.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No bank accounts added.{' '}
              <button type="button" onClick={addBank} className="text-primary-900 hover:underline">
                Add one
              </button>
            </p>
          ) : (
            <div className="space-y-4">
              {form.bankDetails.map((bank, i) => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg relative">
                  <button
                    type="button"
                    onClick={() => removeBank(i)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Bank Name', key: 'bankName', placeholder: 'First Bank' },
                      { label: 'Account Name', key: 'accountName', placeholder: 'Pico Bello Ltd' },
                      { label: 'Account Number', key: 'accountNumber', placeholder: '0123456789' },
                      { label: 'Sort Code', key: 'sortCode', placeholder: '011' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                        <input
                          type="text"
                          value={bank[key]}
                          onChange={(e) => updateBank(i, key, e.target.value)}
                          className={inputCls}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Instructions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <SectionTitle icon={Building2} title="Payment Instructions" />
          <textarea
            rows={4}
            value={form.paymentInstructions}
            onChange={set('paymentInstructions')}
            className={inputCls + ' resize-none'}
            placeholder="Enter payment terms and instructions that will appear on invoices…"
          />
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary-900 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60 shadow-sm"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
