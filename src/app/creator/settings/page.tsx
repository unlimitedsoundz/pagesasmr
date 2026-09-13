'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Landmark,
  CreditCard,
  Save,
  AlertCircle,
  Camera,
  Trash2,
  User,
  Globe,
  FileText,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { Profile, PaymentMethodType } from '@/types';
import { ALL_COUNTRIES } from '@/lib/countries';
import { NIGERIAN_BANKS } from '@/lib/nigerian-banks';
import { AFRICAN_MOBILE_MONEY_COUNTRIES, MOBILE_MONEY_PROVIDERS } from '@/lib/currency';
import { useToast } from '@/components/ToastProvider';

export default function CreatorSettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('WISE');
  const [wiseEmail, setWiseEmail] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [nigerianBankName, setNigerianBankName] = useState('Access Bank');
  const [nigerianAccountNumber, setNigerianAccountNumber] = useState('');
  const [nigerianAccountName, setNigerianAccountName] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [mobileMoneyAccountName, setMobileMoneyAccountName] = useState('');

  useEffect(() => {
    fetch('/api/creator/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const p: Profile = data.profile;
        if (p) {
          setProfile(p);
          setDisplayName(p.display_name || '');
          setCountry(p.country || '');
          setBio(p.bio || '');
          setAvatarUrl(p.avatar_url || '');
          if (p.payment_method) {
            setPaymentMethod(p.payment_method);
          } else if (p.country === 'Nigeria') {
            setPaymentMethod('NIGERIA_BANK');
          } else if (p.country && AFRICAN_MOBILE_MONEY_COUNTRIES.includes(p.country)) {
            setPaymentMethod('MOBILE_MONEY');
          }
          if (p.payment_details) {
            setWiseEmail(p.payment_details.wise_email || '');
            setPaypalEmail(p.payment_details.paypal_email || '');
            setBankName(p.payment_details.bank_name || '');
            setAccountNumber(p.payment_details.account_number || '');
            setRoutingNumber(p.payment_details.routing_number || '');
            setBeneficiaryName(p.payment_details.beneficiary_name || '');
            setNigerianBankName(p.payment_details.nigerian_bank_name || 'Access Bank');
            setNigerianAccountNumber(p.payment_details.nigerian_account_number || '');
            setNigerianAccountName(p.payment_details.nigerian_account_name || '');
            setMobileMoneyProvider(p.payment_details.mobile_money_provider || '');
            setMobileMoneyPhone(p.payment_details.mobile_money_phone || '');
            setMobileMoneyAccountName(p.payment_details.mobile_money_account_name || '');
          }
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error('Failed to load profile', e);
        setLoading(false);
      });
  }, []);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid JPG, PNG, or WebP image.', 'Invalid File');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('The selected image exceeds 10MB.', 'Image Too Large');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/creator/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload avatar');

      setAvatarUrl(data.avatarUrl);
      setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatarUrl } : null));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatarUrl: data.avatarUrl, user: data.profile } }));
      }

      toast.success('Your creator profile picture was saved.', 'Avatar Updated');
    } catch (err: any) {
      setAvatarPreview(null);
      toast.error(err.message || 'Could not upload avatar.', 'Upload Failed');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove avatar');

      setAvatarUrl('');
      setAvatarPreview(null);
      setProfile((prev) => (prev ? { ...prev, avatar_url: '' } : null));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatarUrl: '', user: data.profile } }));
      }

      toast.success('Your profile picture has been reset to initials.', 'Avatar Removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove avatar.', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          country,
          bio,
          avatarUrl,
          paymentMethod,
          paymentDetails: {
            wise_email: wiseEmail,
            paypal_email: paypalEmail,
            bank_name: bankName,
            account_number: accountNumber,
            routing_number: routingNumber,
            beneficiary_name: beneficiaryName,
            nigerian_bank_name: nigerianBankName,
            nigerian_account_number: nigerianAccountNumber,
            nigerian_account_name: nigerianAccountName,
            mobile_money_provider: mobileMoneyProvider || (MOBILE_MONEY_PROVIDERS[country] ? MOBILE_MONEY_PROVIDERS[country][0] : 'M-Pesa (Safaricom)'),
            mobile_money_phone: mobileMoneyPhone,
            mobile_money_account_name: mobileMoneyAccountName,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setProfile(data.profile);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: { profile: data.profile } }));
      }

      const msg = 'Profile and payout preferences saved successfully.';
      setSuccessMsg(msg);
      toast.success(msg, 'Changes Saved');
    } catch (err: any) {
      const msg = err.message || 'Error saving settings';
      setErrorMsg(msg);
      toast.error(msg, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'CR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-black">
        <div className="inline-block w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold">Loading creator settings...</p>
      </div>
    );
  }

  const currentAvatar = avatarPreview || avatarUrl;

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-4 lg:px-6 py-8 sm:py-12 space-y-8 text-black">
      {/* Page Title */}
      <div className="border-b border-neutral-200 pb-6">
        <h1 className="font-serif text-2xl sm:text-4xl font-bold text-black">
          Creator Profile & Payout Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-1">
          Manage your creator profile display, country, and payout account details.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-300 text-black text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Avatar Management Card */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 space-y-6">
        <div className="font-serif text-lg font-bold text-black flex items-center gap-2">
          <User className="w-4 h-4 text-black" />
          <span>Profile Picture & Avatar</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-neutral-300 flex items-center justify-center text-white shadow-sm">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={displayName || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-serif text-3xl font-bold text-white">
                  {getInitials(displayName)}
                </span>
              )}
            </div>

            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div>
              <div className="text-sm font-bold text-black">Upload a Profile Photo</div>
              <p className="text-xs text-neutral-600 font-medium">
                JPG, PNG, or WebP. Max 10MB. Displayed on your creator portal and header.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                <span>{uploadingAvatar ? 'Uploading...' : 'Choose Image'}</span>
              </button>

              {currentAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={saving}
                  className="inline-flex items-center px-3.5 py-2 rounded-lg border border-neutral-300 text-black hover:bg-neutral-100 text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Remove</span>
                </button>
              )}

              {/* Audition Benchmark Status Badge */}
              {profile?.sample_status && (
                <div className="sm:self-start inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FDF2F4] text-[#7B1E4B] border-0">
                  <span className="text-[#7B1E4B]/80 font-medium">Audition Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#7B1E4B] text-white border-0">
                    {profile.sample_status.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Creator Info Card */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 space-y-6">
          <div className="font-serif text-lg font-bold text-black flex items-center gap-2">
            <Globe className="w-4 h-4 text-black" />
            <span>Public Creator Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-black">
                Display Name / Creator Handle
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                placeholder="e.g. Quiet Pages ASMR"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-black">
                Country of Residence
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
              >
                <option value="">Select Country</option>
                {ALL_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-black">
              Short Creator Bio / Equipment Notes
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
              placeholder="e.g. Vintage book collector, recording paper turning with blue press nails and desktop stereo microphone..."
            />
          </div>
        </div>

        {/* Payout Details Card */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 space-y-6">
          <div className="font-serif text-lg font-bold text-black flex items-center gap-2">
            <Landmark className="w-4 h-4 text-black" />
            <span>Default Payout Method</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {[
              { id: 'WISE', label: 'Wise' },
              { id: 'PAYPAL', label: 'PayPal' },
              { id: 'MOBILE_MONEY', label: 'Mobile Money' },
              { id: 'NIGERIA_BANK', label: 'Nigerian Bank' },
              { id: 'ACH', label: 'Direct Deposit / ACH' },
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id as PaymentMethodType)}
                className={`p-2.5 sm:p-3 rounded-lg border text-xs font-bold text-center transition-all ${
                  paymentMethod === pm.id
                    ? 'border-black bg-black text-white shadow-sm'
                    : 'border-neutral-300 bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>

          {/* Conditional Fields based on method */}
          {paymentMethod === 'MOBILE_MONEY' && (
            <div className="space-y-4 p-4 sm:p-5 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <div className="font-serif font-bold text-sm sm:text-base text-black flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>African Mobile Money (M-Pesa / MTN MoMo / Airtel)</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  Instant Payout
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Mobile Money Provider / Network
                  </label>
                  <select
                    value={mobileMoneyProvider || (MOBILE_MONEY_PROVIDERS[country] ? MOBILE_MONEY_PROVIDERS[country][0] : 'M-Pesa (Safaricom)')}
                    onChange={(e) => setMobileMoneyProvider(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  >
                    {(MOBILE_MONEY_PROVIDERS[country] || MOBILE_MONEY_PROVIDERS['Other']).map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Mobile Money Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobileMoneyPhone}
                    onChange={(e) => setMobileMoneyPhone(e.target.value)}
                    placeholder="e.g. +254 712 345 678"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                  <p className="text-[10px] text-neutral-500">Include country code (+254 Kenya, +233 Ghana, +256 Uganda, etc.)</p>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Registered Mobile Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={mobileMoneyAccountName}
                    onChange={(e) => setMobileMoneyAccountName(e.target.value)}
                    placeholder="e.g. Ophelia Adeleke (Full name as registered on your SIM)"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>
          )}
          {paymentMethod === 'WISE' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-black">
                Wise Account Email
              </label>
              <input
                type="email"
                value={wiseEmail}
                onChange={(e) => setWiseEmail(e.target.value)}
                placeholder="e.g. creator@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
              />
            </div>
          )}

          {paymentMethod === 'PAYPAL' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-black">
                PayPal Email Address
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="e.g. paypal-creator@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
              />
            </div>
          )}

          {paymentMethod === 'NIGERIA_BANK' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-black">
                  Nigerian Commercial Bank
                </label>
                <select
                  value={nigerianBankName}
                  onChange={(e) => setNigerianBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                >
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    10-Digit NUBAN Account Number
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={nigerianAccountNumber}
                    onChange={(e) => setNigerianAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="0123456789"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Account Beneficiary Name
                  </label>
                  <input
                    type="text"
                    value={nigerianAccountName}
                    onChange={(e) => setNigerianAccountName(e.target.value)}
                    placeholder="e.g. Ophelia Adeleke"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>
          )}

          {(paymentMethod === 'ACH' || paymentMethod === 'WIRE') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Chase, Bank of America"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Routing Number (ABA / SWIFT)
                  </label>
                  <input
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    placeholder="9 digits"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Account number"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Beneficiary Legal Name
                  </label>
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="Legal name on bank account"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white font-medium text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-8 py-3.5 rounded-lg bg-black text-white font-bold hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 text-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
