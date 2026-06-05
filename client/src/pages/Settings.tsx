import React, { useState } from "react";
import { request, RequestErr } from "../request";
import App from "../components/App";
import PinInput from "../components/PinInput";

function Settings({ firstNetId }: { firstNetId: string }) {
  // Password reset state
  const [oldPasswd, setOldPasswd] = useState("");
  const [newPasswd, setNewPasswd] = useState("");
  const [newPasswdRepeat, setNewPasswdRepeat] = useState("");
  const [passwdErrorMsg, setPasswdErrorMsg] = useState<string>();
  const [passwdSuccessMsg, setPasswdSuccessMsg] = useState<string>();

  // NetID reset state
  const [initialNetId, setInitialNetId] = useState(firstNetId);
  const [netId, setNetId] = useState("");
  const [netIdPasswd, setNetIdPasswd] = useState("");
  const [paymentPasswd, setPaymentPasswd] = useState("");
  const [currentPasswd, setCurrentPasswd] = useState("");
  const [netIdErrorMsg, setNetIdErrorMsg] = useState<string>();
  const [netIdSuccessMsg, setNetIdSuccessMsg] = useState<string>();

  // Validation & MFA states
  const [netIdValidation, setNetIdValidation] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [netIdValErrorMsg, setNetIdValErrorMsg] = useState<string>("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionId, setMfaSessionId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValidation, setOtpValidation] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [otpErrorMsg, setOtpErrorMsg] = useState<string>("");
  const [verificationId, setVerificationId] = useState("");

  const verifyNetId = async () => {
    if (!netId || !netIdPasswd) return;
    setNetIdValidation('pending');
    setNetIdValErrorMsg("");
    setMfaRequired(false);
    setOtpSent(false);
    setOtp("");
    setOtpValidation('idle');
    setOtpErrorMsg("");
    setVerificationId("");

    try {
      const response = await request("/signup/verify_netid", "POST", undefined, {
        NetId: netId,
        NetIdPasswd: netIdPasswd,
      }) as { mfaRequired: boolean, mfaSessionId: string, phone?: string };

      setMfaSessionId(response.mfaSessionId);
      if (response.mfaRequired && response.phone) {
        setPhone(response.phone);
        setMfaRequired(true);
      } else {
        setNetIdValidation('success');
        setVerificationId(response.mfaSessionId);
      }
    } catch (error) {
      setNetIdValidation('error');
      if (error instanceof RequestErr) {
        setNetIdValErrorMsg(error.message);
      } else {
        setNetIdValErrorMsg("Verification failed");
      }
    }
  };

  const handleSendOtp = async () => {
    setOtpErrorMsg("");
    try {
      await request("/signup/send_otp", "POST", undefined, {
        MfaSessionId: mfaSessionId,
      });
      setOtpSent(true);
    } catch (error) {
      if (error instanceof RequestErr) {
        setOtpErrorMsg(error.message);
      } else {
        setOtpErrorMsg("Failed to send OTP");
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setOtpValidation('pending');
    setOtpErrorMsg("");
    try {
      const response = await request("/signup/submit_otp", "POST", undefined, {
        MfaSessionId: mfaSessionId,
        Otp: otp,
      }) as { mfaSessionId: string };

      setOtpValidation('success');
      setNetIdValidation('success');
      setVerificationId(response.mfaSessionId);
    } catch (error) {
      setOtpValidation('error');
      if (error instanceof RequestErr) {
        setOtpErrorMsg(error.message);
      } else {
        setOtpErrorMsg("Invalid OTP code");
      }
    }
  };

  const handleChangePasswd = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswdErrorMsg(undefined);
    setPasswdSuccessMsg(undefined);

    if (newPasswd !== newPasswdRepeat) {
      setPasswdErrorMsg("New passwords do not match!");
      return;
    }

    try {
      await request("/passwd", "PUT", undefined, {
        OldPasswd: oldPasswd,
        NewPasswd: newPasswd,
      });
      setPasswdSuccessMsg("Password changed successfully.");
      setOldPasswd("");
      setNewPasswd("");
      setNewPasswdRepeat("");
    } catch (error) {
      if (error instanceof RequestErr) {
        setPasswdErrorMsg(error.message);
      } else {
        setPasswdErrorMsg("Failed to change password.");
      }
    }
  };

  const handleChangeIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setNetIdErrorMsg(undefined);
    setNetIdSuccessMsg(undefined);

    const isNetIdChanged = netId !== initialNetId || netIdPasswd !== "";
    if (isNetIdChanged && (netIdValidation !== 'success' || !verificationId)) {
      setNetIdErrorMsg("Please verify your NetID details first.");
      return;
    }
    if (!currentPasswd) {
      setNetIdErrorMsg("Current login password is required to save changes.");
      return;
    }

    try {
      await request("/netid_passwd", "PUT", undefined, {
        Passwd: currentPasswd,
        VerificationId: isNetIdChanged ? verificationId : null,
        PaymentPasswd: paymentPasswd.length === 6 ? paymentPasswd : null,
      });
      setNetIdSuccessMsg("Account details updated successfully.");
      // Reset validation states and cache
      setNetIdPasswd("");
      setPaymentPasswd("");
      setCurrentPasswd("");
      setNetIdValidation('idle');
      setVerificationId("");
      setMfaRequired(false);
      // Re-fetch initial state
      setInitialNetId(netId);
    } catch (error) {
      if (error instanceof RequestErr) {
        setNetIdErrorMsg(error.message);
      } else {
        setNetIdErrorMsg("Failed to update identity details.");
      }
    }
  };

  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const isNetIdChanged = netId !== initialNetId || netIdPasswd !== "";
  const isPaymentChanged = paymentPasswd.length === 6;
  const canSave = currentPasswd && (
    (isNetIdChanged && netIdValidation === 'success' && verificationId) ||
    (!isNetIdChanged && isPaymentChanged)
  );

  return (
    <div className="w-full">
      <h1 className="text-slate-900 dark:text-white text-2xl my-5">Account Settings</h1>
      <div className="flex flex-col px-6 py-3 box-border rounded-lg shadow-lg bg-white dark:bg-zinc-700">
        <div className="flex flex-col lg:flex-row lg:justify-between my-5 gap-16">
          {/* Left Column: Change Password */}
          <form onSubmit={handleChangePasswd} className="flex flex-col flex-1">
            <h3 className="text-slate-700 dark:text-gray-200 text-xl mb-8">Change Login Password</h3>

            <label htmlFor="old-passwd" className="uppercase text-sm tracking-wider">Current Password</label>
            <input
              required
              type="password"
              id="old-passwd"
              value={oldPasswd}
              onChange={(e) => setOldPasswd(e.target.value)}
              className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-6 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600"
            />

            <label htmlFor="new-passwd" className="uppercase text-sm tracking-wider">New Password</label>
            <input
              required
              type="password"
              id="new-passwd"
              maxLength={72}
              value={newPasswd}
              onChange={(e) => setNewPasswd(e.target.value)}
              className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-6 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600"
            />

            <label htmlFor="new-passwd-repeat" className="uppercase text-sm tracking-wider">Repeat New Password</label>
            <input
              required
              type="password"
              id="new-passwd-repeat"
              maxLength={72}
              pattern={escapeRegExp(newPasswd)}
              value={newPasswdRepeat}
              onChange={(e) => setNewPasswdRepeat(e.target.value)}
              className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-6 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600"
            />

            {passwdErrorMsg && <div className="text-red-600 dark:text-red-400 text-sm mb-4">{passwdErrorMsg}</div>}
            {passwdSuccessMsg && <div className="text-green-600 dark:text-green-400 text-sm mb-4">{passwdSuccessMsg}</div>}

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="py-2 px-8 cursor-pointer mb-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-colors"
              >
                Change Password
              </button>
            </div>
          </form>

          {/* Right Column: Update NetID & Payment */}
          <form onSubmit={handleChangeIdentity} className="flex flex-col flex-1">
            <h3 className="text-slate-700 dark:text-gray-200 text-xl mb-8">Update NetID Details</h3>

            <label htmlFor="netid" className="uppercase text-sm tracking-wider">NetID</label>
            <input
              type="text"
              required
              id="netid"
              value={netId}
              onChange={(e) => setNetId(e.target.value)}
              className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-6 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600"
            />

            <label htmlFor="netid-passwd" className="uppercase text-sm tracking-wider">NetID Password</label>
            <div className="relative flex flex-col mt-1">
              <input
                type="password"
                id="netid-passwd"
                value={netIdPasswd}
                onChange={(e) => setNetIdPasswd(e.target.value)}
                onBlur={() => {
                  if (netId && netIdPasswd) {
                    verifyNetId();
                  }
                }}
                placeholder="Leave empty if not changing"
                className={`p-1 pr-8 rounded-md outline-none border-2 mt-1 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600 transition-colors ${netIdValidation === 'success' ? 'border-green-500 focus:border-green-500' :
                  netIdValidation === 'error' ? 'border-red-500 focus:border-red-500' : 'border-transparent'
                  }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                {netIdValidation === 'pending' && (
                  <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {netIdValidation === 'success' && (
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {netIdValidation === 'error' && (
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {netIdValErrorMsg && <p className="text-red-500 text-xs mt-1 mb-4">{netIdValErrorMsg}</p>}

            {mfaRequired && (
              <div className="flex flex-col gap-3 mt-2 mb-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 transition-all">
                <p className="text-xs text-zinc-500">
                  MFA authentication required. Send a verification code to <strong>{phone}</strong>.
                </p>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="p-2 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
                  >
                    Send OTP
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          pattern="[0-9]+"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className={`p-2 w-full text-sm rounded-md outline-none border bg-white dark:bg-slate-600 ${otpValidation === 'success' ? 'border-green-500' :
                            otpValidation === 'error' ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {otpValidation === 'pending' && (
                            <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          {otpValidation === 'success' && (
                            <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {otpValidation === 'error' && (
                            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otp.length !== 6 || otpValidation === 'pending'}
                        className="p-2 text-sm font-semibold rounded-md bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        Verify OTP
                      </button>
                    </div>
                    {otpErrorMsg && <p className="text-red-500 text-xs mt-1">{otpErrorMsg}</p>}
                  </div>
                )}
              </div>
            )}

            <label htmlFor="payment" className="uppercase text-sm tracking-wider mt-4">Payment Password (6-digit PIN)</label>
            <div className="self-center my-3 flex gap-2">
              <PinInput show={false} value={paymentPasswd} onChange={(newVal) => { setPaymentPasswd(newVal) }} digitClassName="bg-gray-50 dark:bg-zinc-600" />
            </div>

            <label htmlFor="current-passwd" className="uppercase text-sm tracking-wider mt-4">Current Login Password<sup className="text-red-600 dark:text-red-400">*</sup></label>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-2">
              Required to decrypt and re-encrypt your sensitive parameters with your login credentials.
            </p>
            <input
              required
              type="password"
              id="current-passwd"
              value={currentPasswd}
              onChange={(e) => setCurrentPasswd(e.target.value)}
              className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-6 focus:border-blue-400 bg-gray-50 dark:bg-zinc-600"
            />

            {netIdErrorMsg && <div className="text-red-600 dark:text-red-400 text-sm mb-4">{netIdErrorMsg}</div>}
            {netIdSuccessMsg && <div className="text-green-600 dark:text-green-400 text-sm mb-4">{netIdSuccessMsg}</div>}

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={!canSave}
                className="py-2 px-8 cursor-pointer mb-4 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-300 disabled:dark:bg-zinc-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {isNetIdChanged
                  ? (netIdValidation === 'success' ? "Save NetID Changes" : netIdValidation === 'pending' ? "Verifying..." : "Verify NetID to Save")
                  : "Save Changes"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <App>{({ netid }) => <Settings firstNetId={netid} />}</App>
}